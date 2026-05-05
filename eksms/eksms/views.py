"""
Django views for the eksms project.
"""

from django.http import FileResponse, JsonResponse
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.utils import timezone
from eksms_core.models import (
    School, SchoolAdmin, GradeChangeAlert, Grade, Student, Teacher,
    Parent, ParentStudent, StudentDocument, SchoolApplicationEvent, ForensicEvent, AlertBroadcast, AdminSetting,
    SecurityLogEntry, AcademicYear, ClassRoom, SystemWideAlert,
    Subject, Term, Attendance, FeeRecord, Expense, Message,
    TeacherSubjectClass, GradeAuditLog, GradeVerification, ReportCard, ClassRanking,
    Exam, ExamResult, Notification, NotificationRead, TimetableSlot,
    SchoolStaffAccount, GradeModificationRequest, ClassSubject, UserToken,
    Room, GradingScheme, ParentNotificationPreference,
    GradeFeedbackMessage, AssignmentSubmission, StudentTeacherMessage, RemedialRequest,
)
import datetime
import re
import uuid
import json
import logging
import os
import shutil
import psutil
from pathlib import Path


logger = logging.getLogger('django.security')

import hashlib
import secrets as _secrets


# ─────────────────────────────────────────────────────────────────
# CRYPTO / AUDIT UTILITIES
# ─────────────────────────────────────────────────────────────────

def _compute_grade_hash(grade):
    """SHA-256 fingerprint of a grade's core data. Stable across re-reads."""
    payload = json.dumps({
        'grade_id':   grade.id,
        'student_id': grade.student_id,
        'subject_id': grade.subject_id,
        'term_id':    grade.term_id,
        'ca':         str(grade.continuous_assessment),
        'midterm':    str(grade.mid_term_exam),
        'final':      str(grade.final_exam),
        'total':      str(grade.total_score),
        'is_locked':  grade.is_locked,
        'locked_at':  str(grade.locked_at),
    }, sort_keys=True)
    return hashlib.sha256(payload.encode()).hexdigest()


def _safe_evidence_url(request, mod_request):
    """Return absolute URL for evidence_file, or None if missing/unreadable."""
    try:
        if mod_request.evidence_file:
            return request.build_absolute_uri(mod_request.evidence_file.url)
    except Exception:
        pass
    return None


def _write_grade_audit(grade, action, actor, request=None, old_values=None, new_values=None, reason=''):
    """Create an immutable GradeAuditLog entry with hash chaining."""
    record_hash = _compute_grade_hash(grade)
    prev = GradeAuditLog.objects.filter(grade=grade).order_by('-logged_at').first()
    chain_input = (prev.merkle_hash if prev else '') + record_hash
    merkle_hash = hashlib.sha256(chain_input.encode()).hexdigest()
    GradeAuditLog.objects.create(
        grade=grade,
        action=action,
        actor=actor,
        old_values=old_values or {},
        new_values=new_values or {},
        ip_address=request.META.get('REMOTE_ADDR') if request else None,
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500] if request else '',
        change_reason=reason,
        record_hash=record_hash,
        merkle_hash=merkle_hash,
    )


def _create_notification(school, title, body, notif_type='info', recipient_role='all', recipient_user=None, sender=None):
    """Create a Notification record. If recipient_user is set it's a personal notification."""
    return Notification.objects.create(
        school=school,
        title=title,
        body=body,
        notif_type=notif_type,
        recipient_role=recipient_role,
        recipient_user=recipient_user,
        sender=sender,
    )


def _dispatch_grade_lock_notifications(grade, school, request):
    """Fire notifications to student + parent(s) + teacher after a grade is locked."""
    student  = grade.student
    subject  = grade.subject.name
    score    = float(grade.total_score)
    letter   = grade.grade_letter
    s_user   = student.user

    _create_notification(
        school, f'{subject} grade locked',
        f'Your {subject} grade has been confirmed: {score} ({letter}). Your record is now cryptographically secured.',
        notif_type='success', recipient_user=s_user,
    )
    for link in student.parent_links.select_related('parent__user').all():
        _create_notification(
            school, f"{student.user.get_full_name()}'s {subject} grade locked",
            f"{student.user.get_full_name()}'s {subject} grade: {score} ({letter}). Secured and verified.",
            notif_type='success', recipient_user=link.parent.user,
        )
    if grade.teacher:
        _create_notification(
            school, f'Grade submission confirmed',
            f'{student.user.get_full_name()} — {subject}: {score} ({letter}) locked successfully.',
            notif_type='success', recipient_user=grade.teacher.user,
        )


def _dispatch_tamper_alerts(grade, actor, request, school):
    """Fire CRITICAL tamper alerts to parent, student, admin, teacher."""
    student = grade.student
    subject = grade.subject.name
    s_user  = student.user
    ip      = request.META.get('REMOTE_ADDR', 'unknown') if request else 'unknown'

    alert_body_student = (
        f'An attempt was made to modify your {subject} grade. '
        f'The attempt was BLOCKED. Your grade is safe and unchanged. '
        f'This event is permanently logged.'
    )
    alert_body_parent = (
        f'An attempt was made to alter {student.user.get_full_name()}\'s {subject} grade. '
        f'The attempt was BLOCKED. The original grade is preserved. '
        f'This event has been logged and the administrator has been notified.'
    )
    alert_body_admin = (
        f'SECURITY: Locked grade modification attempt on {student.user.get_full_name()}\'s {subject} grade. '
        f'Attempted by user "{actor.username if actor else "unknown"}" from IP {ip}. '
        f'Attack blocked. Immediate investigation recommended.'
    )

    _create_notification(school, f'Grade Modification Attempt — {subject}',
                         alert_body_student, notif_type='alert', recipient_user=s_user)

    for link in student.parent_links.select_related('parent__user').all():
        _create_notification(school, f'SECURITY ALERT — {student.user.get_full_name()}\'s {subject} Grade',
                             alert_body_parent, notif_type='alert', recipient_user=link.parent.user)
        try:
            _send_notification_email(
                f'[SECURITY ALERT] Grade Tampering Attempt Detected',
                link.parent.user.email,
                f'<p style="color:#dc2626;font-weight:bold">SECURITY ALERT</p><p>{alert_body_parent}</p>',
            )
        except Exception:
            pass

    if grade.teacher:
        _create_notification(school, f'Your grade was protected — {subject}',
                             f'{student.user.get_full_name()}\'s {subject} grade was targeted but the system blocked the attempt.',
                             notif_type='warning', recipient_user=grade.teacher.user)

    # Notify all school admins
    for sa in SchoolAdmin.objects.filter(school=school, is_active=True).select_related('user'):
        _create_notification(school, f'SECURITY: Modification Attempt Blocked',
                             alert_body_admin, notif_type='alert', recipient_user=sa.user)
        try:
            _send_notification_email('[SECURITY] Grade Tampering Attempt', sa.user.email,
                                     f'<p style="color:#dc2626"><strong>CRITICAL SECURITY EVENT</strong></p><p>{alert_body_admin}</p>')
        except Exception:
            pass


def _password_strength_ok(password):
    """Returns (ok, error_message). Requires 12 chars, upper, digit, special."""
    if len(password) < 12:
        return False, 'Password must be at least 12 characters.'
    if not re.search(r'[A-Z]', password):
        return False, 'Password must contain at least one uppercase letter.'
    if not re.search(r'[0-9]', password):
        return False, 'Password must contain at least one digit.'
    if not re.search(r'[^A-Za-z0-9]', password):
        return False, 'Password must contain at least one special character.'
    return True, ''


def _issue_token(user, request):
    """Create and store a login token, returning the token string."""
    token = f"token_{user.id}_{user.username.replace(' ', '_')}_{_secrets.token_hex(4)}"
    UserToken.objects.create(
        user=user, token=token,
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:500],
    )
    # Prune old tokens beyond 10 per user
    old_ids = list(UserToken.objects.filter(user=user).order_by('-created_at').values_list('id', flat=True)[10:])
    if old_ids:
        UserToken.objects.filter(id__in=old_ids).delete()
    return token


def _validate_token(token_string):
    """Returns User if token_string is in UserToken table, else None.
    Falls back to legacy token_{id}_{username} format for backward compat."""
    if not token_string or not token_string.startswith('token_'):
        return None
    try:
        ut = UserToken.objects.select_related('user').get(token=token_string)
        return ut.user
    except UserToken.DoesNotExist:
        pass
    # Legacy fallback (tokens issued before UserToken was introduced)
    parts = token_string.split('_', 2)
    if len(parts) < 2:
        return None
    try:
        uid = int(parts[1])
        return User.objects.get(id=uid, is_active=True)
    except (ValueError, User.DoesNotExist, User.MultipleObjectsReturned):
        return None


def _get_authed_user(request):
    """Extract authenticated User from Authorization header. Uses UserToken table with legacy fallback."""
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    if auth.startswith('Bearer '):
        token = auth[7:]
    elif auth.startswith('Token '):
        token = auth[6:]
    else:
        token = auth.strip()
    return _validate_token(token)


def _parse_hhmm(value):
    """Parse 'HH:MM' (or 'HH:MM:SS') into a datetime.time. Returns None on
    blank / invalid input."""
    if not value:
        return None
    try:
        parts = str(value).split(':')
        h = int(parts[0]); m = int(parts[1]) if len(parts) > 1 else 0
        s = int(parts[2]) if len(parts) > 2 else 0
        if not (0 <= h < 24 and 0 <= m < 60 and 0 <= s < 60):
            return None
        from datetime import time as _time
        return _time(h, m, s)
    except (ValueError, IndexError, TypeError):
        return None


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value).strip().lower()
    return text in ('1', 'true', 'yes', 'on')


def _get_request_data(request):
    if request.content_type and request.content_type.startswith('multipart/form-data'):
        return {key: request.POST.get(key) for key in request.POST}
    try:
        return json.loads(request.body)
    except json.JSONDecodeError:
        return {}


def _is_valid_document_file(uploaded_file):
    if uploaded_file is None:
        return False
    name = uploaded_file.name.lower()
    return name.endswith('.pdf') or name.endswith('.doc') or name.endswith('.docx')


def _log_security_event(event_type, description, severity='info',
                        actor=None, actor_label='', ip=None, metadata=None):
    """Convenience helper to write a SecurityLogEntry row."""
    try:
        SecurityLogEntry.objects.create(
            event_type=event_type,
            actor=actor,
            actor_label=actor_label or (actor.username if actor else ''),
            ip_address=ip,
            description=description,
            severity=severity,
            metadata=metadata or {},
        )
    except Exception:
        pass  # Never let audit logging crash the main request


def _send_notification_email(subject, to_email, html_content, text_content=None):
    """
    Unified helper to send emails via Resend API or SMTP fallback.
    Returns (success, info_string)
    """
    from django.conf import settings
    from django.core.mail import send_mail
    import logging
    logger = logging.getLogger('django')

    resend_api_key = getattr(settings, 'RESEND_API_KEY', None)
    default_from = getattr(settings, 'DEFAULT_FROM_EMAIL', 'EK-SMS <noreply@elkendeh.com>')

    if resend_api_key:
        try:
            import resend
            resend.api_key = resend_api_key
            logger.info(f"Sending email to {to_email} via Resend...")
            resend.Emails.send({
                "from": default_from,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            })
            return True, "Email sent via Resend"
        except Exception as e:
            logger.error(f"Resend error: {str(e)}")
            logger.warning("Resend email failed; falling back to SMTP.")

    # Path 2: SMTP fallback
    try:
        logger.info(f"Sending email to {to_email} via SMTP...")
        send_mail(
            subject=subject,
            message=text_content or "Please use an HTML-capable email client to view this message.",
            from_email=default_from,
            recipient_list=[to_email],
            html_message=html_content,
            fail_silently=False,
        )
        return True, "Email sent via SMTP"
    except Exception as e:
        logger.error(f"SMTP error: {str(e)}")
        # Path 3: Fallback log
        logger.warning(
            f"\n{'='*55}\n"
            f"  EMAIL FALLBACK: {subject}\n"
            f"  TO: {to_email}\n"
            f"  CONTENT: {html_content[:200]}...\n"
            f"{'='*55}"
        )
        return False, str(e)


def _send_sms(to_phone, message):
    """
    Send SMS via Africa's Talking gateway.
    Returns (success: bool, info: str).
    Falls back to logging if credentials are not configured.
    """
    from django.conf import settings
    import logging as _logging
    _sms_logger = _logging.getLogger('django')

    api_key  = getattr(settings, 'AFRICAS_TALKING_API_KEY', None)
    username = getattr(settings, 'AFRICAS_TALKING_USERNAME', None)

    if api_key and username:
        try:
            import africastalking
            africastalking.initialize(username, api_key)
            sms = africastalking.SMS
            response = sms.send(message, [to_phone])
            _sms_logger.info(f'SMS sent to {to_phone}: {response}')
            return True, 'SMS sent via Africa\'s Talking'
        except Exception as exc:
            _sms_logger.error(f'Africa\'s Talking SMS error to {to_phone}: {exc}')
            return False, str(exc)

    _sms_logger.info(f'SMS (no gateway configured) → {to_phone}: {message[:80]}')
    return False, 'SMS gateway not configured'


# Serve favicon.jpeg from the public folder
@cache_page(60 * 60 * 24)  # Cache for 24 hours
def favicon_view(request):
    """
    Serve the favicon.jpeg file.
    Cached for 24 hours to reduce server load.
    """
    # Path to favicon in public folder (relative to this file)
    favicon_path = Path(__file__).resolve().parent.parent.parent / 'public' / 'favicon.jpeg'
    
    # Fallback to static folder if public folder doesn't exist
    if not os.path.exists(favicon_path):
        static_favicon = Path(__file__).resolve().parent.parent / 'static' / 'favicon.jpeg'
        if os.path.exists(static_favicon):
            favicon_path = static_favicon
    
    if os.path.exists(favicon_path):
        return FileResponse(open(favicon_path, 'rb'), content_type='image/jpeg')
    
    # Return 404 if favicon not found
    from django.http import HttpResponseNotFound
    return HttpResponseNotFound('Favicon not found')


@require_http_methods(["POST"])
@csrf_exempt  # Frontend will handle CSRF on login
def api_login(request):
    """
    API endpoint for user login.
    Expects JSON payload with 'username' (can be email) and 'password'.
    Returns user token and role if successful.
    """
    try:
        data = json.loads(request.body)
        username_or_email = data.get('username')
        password = data.get('password')
        
        if not username_or_email or not password:
            return JsonResponse({
                'success': False,
                'message': 'Username/email and password are required.'
            }, status=400)
        
        # Authenticate user
        # 1. Try standard username authentication
        user = authenticate(username=username_or_email, password=password)
        
        # 2. If it fails and looks like an email, try authenticating with email
        if user is None and '@' in username_or_email:
            target_user = User.objects.filter(
                email__iexact=username_or_email
            ).exclude(email='').first()
            if target_user:
                user = authenticate(username=target_user.username, password=password)
        
        if user is None:
            # CHECK if login failed only because user is inactive (pending school admin)
            try:
                u = None
                if '@' in username_or_email:
                    u = User.objects.get(email=username_or_email)
                else:
                    u = User.objects.get(username=username_or_email)
                
                # If password is correct AND they are a school admin waiting for approval
                if u.check_password(password) and hasattr(u, 'school_admin_profile'):
                    # Only allow login for inactive admins IF their school isn't approved yet
                    if not u.school_admin_profile.school.is_approved:
                        user = u
                    else:
                        # Otherwise, user is inactive for other reasons (e.g. suspended)
                        pass
            except (User.DoesNotExist, User.MultipleObjectsReturned):
                pass

        if user is None:
            _log_security_event(
                'login_failure',
                description=f"Failed login attempt for: {username_or_email}",
                severity='medium',
                actor_label=username_or_email,
                ip=request.META.get('REMOTE_ADDR'),
            )
            return JsonResponse({
                'success': False,
                'message': 'Invalid username/email or password.'
            }, status=401)
        
        # Determine user role
        role = 'user'
        if user.is_superuser:
            role = 'superadmin'
        elif hasattr(user, 'school_admin_profile'):
            role = 'school_admin'
        elif hasattr(user, 'teacher_profile'):
            role = 'teacher'
        elif hasattr(user, 'student_profile'):
            role = 'student'
        elif hasattr(user, 'parent_profile'):
            role = 'parent'
        elif (hasattr(user, 'school_staff_account')
              and getattr(user.school_staff_account, 'role', '') == 'PRINCIPAL'
              and user.school_staff_account.is_active):
            role = 'principal'
        elif user.is_staff:
            role = 'admin'
        
        # If user has no recognized role and isn't staff/superuser, block
        if role == 'user' and not user.is_staff and not user.is_superuser:
            return JsonResponse({
                'success': False,
                'message': 'Your account does not have access to this system.'
            }, status=403)

        # School admin: explicitly verify school approval status
        if role == 'school_admin':
            try:
                school = user.school_admin_profile.school
                if not school.is_approved or not school.is_active:
                    return JsonResponse({
                        'success': False,
                        'message': 'Your school application has not been approved yet. You will receive access once a superadmin reviews your application.'
                    }, status=403)
            except Exception:
                return JsonResponse({
                    'success': False,
                    'message': 'School profile not found. Please contact support.'
                }, status=403)

        # 2FA check for school_admin role
        if role == 'school_admin':
            try:
                from django_otp import devices_for_user as _otp_devices
                confirmed_devices = [d for d in _otp_devices(user) if d.confirmed]
                if confirmed_devices:
                    pending = f"pending_{_secrets.token_hex(16)}"
                    from django.core.cache import cache
                    cache.set(f"2fa_pending_{pending}", user.id, timeout=300)
                    return JsonResponse({'success': True, 'requires_2fa': True, 'pending_token': pending})
            except Exception:
                pass  # django_otp not available or no device — let through

        # Generate token and store it
        token = _issue_token(user, request)

        # Determine redirect URL based on role
        redirect_url = '/home'
        school_data = None
        
        if role == 'superadmin':
            redirect_url = '/superadmindashboard'
        elif role == 'principal':
            redirect_url = '/principal'
            try:
                s = user.school_staff_account.school
                badge_url = None
                if s and s.badge:
                    try:
                        badge_url = request.build_absolute_uri(s.badge.url)
                    except Exception:
                        badge_url = None
                school_data = {'id': s.id, 'name': s.name, 'badge': badge_url} if s else None
            except Exception:
                school_data = None
        elif role == 'school_admin':
            redirect_url = '/sa-dashboard'
            s = user.school_admin_profile.school
            badge_url = None
            if s.badge:
                try:
                    badge_url = request.build_absolute_uri(s.badge.url)
                except:
                    badge_url = s.badge.url
            
            school_data = {
                'id': s.id,
                'name': s.name,
                'badge': badge_url,
                'brand_colors': s.brand_colors,
                'is_approved': s.is_approved
            }
        elif role == 'student':
            redirect_url = '/dashboard/student'
            try:
                s = user.student_profile.school
                badge_url = None
                if s and s.badge:
                    try:
                        badge_url = request.build_absolute_uri(s.badge.url)
                    except Exception:
                        badge_url = None
                school_data = {
                    'id': s.id,
                    'name': s.name,
                    'badge': badge_url,
                } if s else None
            except Exception:
                school_data = None

        elif role == 'teacher':
            redirect_url = '/teacher/dashboard'
            s = user.teacher_profile.school
            badge_url = None
            if s.badge:
                try:
                    badge_url = request.build_absolute_uri(s.badge.url)
                except:
                    badge_url = s.badge.url

            school_data = {
                'id': s.id,
                'name': s.name,
                'badge': badge_url,
                'brand_colors': s.brand_colors
            }
        
        _log_security_event(
            'login_success',
            description=f"Successful login: {user.username} ({role})",
            severity='info',
            actor=user,
            ip=request.META.get('REMOTE_ADDR'),
            metadata={'role': role},
        )

        # Determine must_change_password flag
        mcp = False
        if role == 'school_admin' and hasattr(user, 'school_admin_profile'):
            mcp = user.school_admin_profile.must_change_password
        elif role == 'teacher' and hasattr(user, 'teacher_profile'):
            mcp = user.teacher_profile.must_change_password
        elif role == 'student' and hasattr(user, 'student_profile'):
            mcp = user.student_profile.must_change_password
        elif role == 'parent' and hasattr(user, 'parent_profile'):
            mcp = user.parent_profile.must_change_password

        return JsonResponse({
            'success': True,
            'message': 'Login successful.',
            'token': token,
            'must_change_password': mcp,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'is_superuser': user.is_superuser,
                'is_staff': user.is_staff,
                'role': role,
                'full_name': f"{user.first_name} {user.last_name}".strip() or user.username,
                'school': school_data
            },
            'redirect': redirect_url
        }, status=200)
    
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Invalid JSON payload.'
        }, status=400)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


@require_http_methods(["POST"])
@csrf_exempt
def api_logout(request):
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    token = auth[7:] if auth.startswith('Bearer ') else auth[6:] if auth.startswith('Token ') else auth.strip()
    if token:
        UserToken.objects.filter(token=token).delete()
    return JsonResponse({'success': True, 'message': 'Logged out successfully.'}, status=200)


@require_http_methods(["POST"])
@csrf_exempt
def api_logout_all(request):
    """Invalidate ALL active sessions for the authenticated user."""
    user = _get_authed_user(request)
    if not user:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    deleted, _ = UserToken.objects.filter(user=user).delete()
    _log_security_event('logout', description=f'All sessions invalidated for {user.username}',
                        severity='info', actor=user, ip=request.META.get('REMOTE_ADDR'))
    return JsonResponse({'success': True, 'message': f'{deleted} session(s) invalidated.'})


@require_http_methods(["POST"])
@csrf_exempt
def api_verify_2fa(request):
    """Complete 2FA login. Body: {pending_token, otp_code}."""
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
    pending = body.get('pending_token', '')
    otp_code = str(body.get('otp_code', '')).strip()
    if not pending or not otp_code:
        return JsonResponse({'success': False, 'message': 'pending_token and otp_code required.'}, status=400)
    from django.core.cache import cache
    uid = cache.get(f"2fa_pending_{pending}")
    if not uid:
        return JsonResponse({'success': False, 'message': 'Session expired or invalid. Please log in again.'}, status=401)
    try:
        user = User.objects.get(id=uid)
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'User not found.'}, status=404)
    try:
        from django_otp import devices_for_user as _otp_devices
        verified = any(d.verify_token(otp_code) for d in _otp_devices(user, confirmed=True))
    except Exception:
        verified = False
    if not verified:
        return JsonResponse({'success': False, 'message': 'Invalid or expired OTP code.'}, status=401)
    cache.delete(f"2fa_pending_{pending}")
    token = _issue_token(user, request)
    sa_profile = getattr(user, 'school_admin_profile', None)
    mcp = sa_profile.must_change_password if sa_profile else False
    return JsonResponse({'success': True, 'token': token, 'must_change_password': mcp,
                         'user': {'id': user.id, 'email': user.email, 'role': 'school_admin',
                                  'full_name': user.get_full_name()}})


@csrf_exempt
def verify_grade_document(request, token):
    """
    Public endpoint — anyone can verify a grade or report card by token.
    Returns HTML for browser / QR-code scans; JSON for API calls (Accept: application/json).
    """
    from django.http import HttpResponse
    wants_html = 'application/json' not in request.META.get('HTTP_ACCEPT', '')

    def _html(authentic, doc_type, fields, school_name=''):
        colour   = '#16a34a' if authentic else '#dc2626'
        icon     = '✔' if authentic else '✘'
        status   = 'AUTHENTIC' if authentic else 'NOT VERIFIED'
        rows     = ''.join(
            f'<tr><td style="padding:8px 16px;background:#f8fafc;font-weight:600;white-space:nowrap">{k}</td>'
            f'<td style="padding:8px 16px">{v}</td></tr>'
            for k, v in fields.items()
        )
        return HttpResponse(f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>EK-SMS — Document Verification</title>
<style>
  body{{font-family:system-ui,sans-serif;background:#f1f5f9;margin:0;padding:20px;display:flex;justify-content:center}}
  .card{{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,.12);max-width:480px;width:100%;overflow:hidden}}
  .banner{{background:{colour};color:#fff;padding:24px 28px;text-align:center}}
  .icon{{font-size:3rem;display:block;margin-bottom:8px}}
  .status{{font-size:1.25rem;font-weight:800;letter-spacing:.04em}}
  .doc-type{{font-size:.875rem;opacity:.85;margin-top:4px}}
  table{{width:100%;border-collapse:collapse;font-size:.9rem}}
  tr+tr td{{border-top:1px solid #e2e8f0}}
  .footer{{padding:16px 28px;font-size:.75rem;color:#94a3b8;text-align:center;border-top:1px solid #e2e8f0}}
  .school{{font-weight:700;color:#1e293b}}
</style></head><body>
<div class="card">
  <div class="banner">
    <span class="icon">{icon}</span>
    <div class="status">{status}</div>
    <div class="doc-type">{doc_type.replace("_"," ").title()}</div>
  </div>
  <table>{rows}</table>
  <div class="footer">
    {'<span class="school">'+school_name+'</span> &nbsp;|&nbsp; ' if school_name else ''}
    Verified by <strong>EK-SMS</strong> &nbsp;&middot;&nbsp; {timezone.now().strftime("%d %b %Y, %H:%M")} UTC
  </div>
</div></body></html>''', content_type='text/html')

    # ── Lookup ─────────────────────────────────────────────────────
    try:
        gv = GradeVerification.objects.select_related(
            'grade__student__user', 'grade__subject', 'grade__term__academic_year',
            'grade__student__school',
        ).get(verification_token=token)
        gv.verification_attempts += 1
        gv.last_verification_at  = timezone.now()
        gv.save(update_fields=['verification_attempts', 'last_verification_at'])
        grade  = gv.grade
        fields = {
            'Student':   grade.student.user.get_full_name(),
            'Subject':   grade.subject.name,
            'Score':     f"{float(grade.total_score):.1f}",
            'Grade':     grade.grade_letter,
            'Term':      grade.term.get_name_display(),
            'Locked':    grade.locked_at.strftime('%d %b %Y') if grade.locked_at else '—',
            'Token':     token[:16] + '…',
        }
        data = {'success': True, 'authentic': True, 'type': 'grade',
                'student_name': grade.student.user.get_full_name(),
                'subject': grade.subject.name, 'grade_letter': grade.grade_letter,
                'total_score': float(grade.total_score),
                'term': grade.term.get_name_display(), 'issued_at': str(gv.issued_at)}
        school_name = grade.student.school.name if grade.student.school else ''
        if wants_html:
            return _html(True, 'grade', fields, school_name)
        return JsonResponse(data)

    except GradeVerification.DoesNotExist:
        pass

    try:
        rc = ReportCard.objects.select_related(
            'student__user', 'term', 'academic_year', 'student__school'
        ).get(verification_hash=token)
        fields = {
            'Student':       rc.student.user.get_full_name(),
            'Term':          rc.term.get_name_display(),
            'Academic Year': rc.academic_year.name,
            'Average Score': f"{float(rc.average_score):.1f}",
            'Class Rank':    str(rc.class_rank) if rc.class_rank else '—',
            'Generated':     rc.generated_at.strftime('%d %b %Y') if rc.generated_at else '—',
            'Hash':          token[:16] + '…',
        }
        data = {'success': True, 'authentic': True, 'type': 'report_card',
                'student_name': rc.student.user.get_full_name(),
                'term': rc.term.get_name_display(), 'academic_year': rc.academic_year.name,
                'average_score': float(rc.average_score), 'class_rank': rc.class_rank,
                'generated_at': str(rc.generated_at)}
        school_name = rc.student.school.name if rc.student.school else ''
        if wants_html:
            return _html(True, 'report_card', fields, school_name)
        return JsonResponse(data)

    except ReportCard.DoesNotExist:
        pass

    # ── Not found ──────────────────────────────────────────────────
    if wants_html:
        return _html(False, 'unknown', {'Token': token[:16] + '…', 'Error': 'No matching document found.'})
    return JsonResponse({'success': False, 'authentic': False,
                         'message': 'Document not found or token invalid.'}, status=404)


@require_http_methods(["POST"])
@csrf_exempt
def api_receive_logs(request):
    """
    API endpoint to receive logs from the frontend.
    """
    try:
        data = json.loads(request.body)
        # Log to Django logs
        import logging
        logger = logging.getLogger('django.security')
        logger.warning(f"Frontend Log: {json.dumps(data)}")
        
        return JsonResponse({
            'success': True,
            'message': 'Log received successfully.'
        }, status=200)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def api_csp_report(request):
    """
    API endpoint to receive CSP violation reports.
    """
    try:
        data = json.loads(request.body)
        import logging
        logger = logging.getLogger('django.security')
        logger.error(f"CSP Violation: {json.dumps(data)}")
        return JsonResponse({'status': 'ok'}, status=200)
    except:
        return JsonResponse({'status': 'error'}, status=400)


@require_http_methods(["POST"])
@csrf_exempt
def api_register(request):
    """
    Handles institution registration from the wizard.
    Expects individual fields or 'settings' JSON blob in POST data.
    """
    try:
        from django.db import transaction
        import uuid
        
        # Determine payload source:
        # 1. Multipart with a 'settings' JSON blob
        # 2. Multipart with individual fields (badge file present)
        # 3. application/json body (no badge file — frontend sends raw JSON)
        content_type = request.content_type or ''
        settings_str = request.POST.get('settings')
        if settings_str:
            data = json.loads(settings_str)
        elif 'application/json' in content_type:
            data = json.loads(request.body)
        else:
            # Fallback: multipart individual fields
            data = request.POST.dict()

        # Handle brand colors (might be JSON string or comma-separated)
        brand_colors = data.get('brandColors', '')
        if isinstance(brand_colors, str) and brand_colors.startswith('['):
            try:
                brand_colors = ','.join(json.loads(brand_colors))
            except:
                pass
        
        # Basic validation (using frontend field names)
        required = ['institutionName', 'adminUsername', 'password', 'email']
        for field in required:
            if not data.get(field):
                return JsonResponse({'success': False, 'message': f'Missing field: {field}'}, status=400)
        
        # Check if user already exists
        admin_email = data.get('adminEmail') or data.get('email')
        if User.objects.filter(username=data['adminUsername']).exists() or User.objects.filter(email=admin_email).exists():
            return JsonResponse({'success': False, 'message': 'Username or email already in use.'}, status=400)

        with transaction.atomic():
            # Create School
            school_code = f"SCH-{uuid.uuid4().hex[:6].upper()}"
            school = School.objects.create(
                name=data['institutionName'],
                code=school_code,
                email=data['email'],
                phone=data.get('phone', f"{data.get('phoneCode', '')}{data.get('phoneNumber', '')}"),
                address=data.get('address', ''),
                city=data.get('city', ''),
                region=data.get('region', ''),
                country=data.get('country', ''),
                institution_type=data.get('institutionType', ''),
                website=data.get('website', ''),
                motto=data.get('motto', ''),
                capacity=int(data.get('capacity', 0)) if data.get('capacity') and str(data['capacity']).isdigit() else None,
                academic_system=data.get('academicSystem', ''),
                grading_system=data.get('gradingSystem', ''),
                language=data.get('language', 'English'),
                registration_number=data.get('registrationNumber', ''),
                estimated_teachers=data.get('estimatedTeachers', ''),
                brand_colors=brand_colors or data.get('brandColor', ''),
                established=data.get('established', ''),
                admin_email=admin_email,
                admin_phone=data.get('adminPhone', f"{data.get('adminPhoneCode', '')}{data.get('adminPhoneNumber', '')}"),
            )

            # Handle badge upload (frontend sends 'schoolBadge')
            badge_file = request.FILES.get('schoolBadge') or request.FILES.get('badge')
            if badge_file:
                try:
                    school.badge = badge_file
                    school.save()
                except Exception as exc:
                    # Don't fail the whole registration on a badge upload error —
                    # log it so we can find storage/permission issues in production.
                    import logging
                    logging.getLogger('django').error(
                        f'School badge upload failed during registration of '
                        f'school={school.code}: {exc}'
                    )

            # Create Admin User — inactive until superadmin approves the school
            user = User.objects.create_user(
                username=data['adminUsername'],
                email=admin_email,
                password=data['password'],
                first_name=data.get('firstName', ''),
                last_name=data.get('lastName', ''),
                is_active=False,   # activated only upon approval
            )

            # Create SchoolAdmin profile
            SchoolAdmin.objects.create(
                user=user,
                school=school,
                job_title='School Administrator'
            )

        return JsonResponse({
            'success': True, 
            'message': 'Registration successful. Waiting for superadmin approval.',
            'school_code': school_code
        }, status=201)

    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

def api_get_schools(request):
    """Fetch all schools for superadmin dashboard"""
    actor = _get_authed_user(request)
    if not actor or not actor.is_superuser:
        return JsonResponse({'success': False, 'message': 'Superadmin access required.'}, status=403)
    try:
        schools = School.objects.select_related('admin__user').all()
        school_list = []
        for s in schools:
            badge_url = None
            if s.badge:
                try:
                    badge_url = request.build_absolute_uri(s.badge.url)
                except:
                    badge_url = s.badge.url

            # Pull admin user info from linked SchoolAdmin (OneToOne)
            try:
                sa = s.admin
                sa_user = sa.user if sa else None
            except Exception:
                sa = None
                sa_user = None
            admin_full_name = (
                f"{sa_user.first_name} {sa_user.last_name}".strip()
                if sa_user and (sa_user.first_name or sa_user.last_name)
                else (sa_user.username if sa_user else s.principal_name or '')
            )

            school_list.append({
                'id': s.id,
                'name': s.name,
                'code': s.code,
                'email': s.email,
                'phone': s.phone,
                'address': s.address,
                'principal': s.principal_name,
                'city': s.city,
                'region': s.region,
                'country': s.country,
                'badge': badge_url,
                'brand_colors': s.brand_colors,
                'is_approved': s.is_approved,
                'is_active': s.is_active,
                'changes_requested': s.changes_requested,
                'rejection_reason': s.rejection_reason,
                'approval_date': s.approval_date.isoformat() if s.approval_date else None,
                'registration_date': s.registration_date.isoformat(),
                # Admin credentials info (from registration)
                'admin_username':   sa_user.username   if sa_user else '',
                'admin_email':      sa_user.email      if sa_user else s.admin_email or '',
                'admin_full_name':  admin_full_name,
                'admin_is_active':  sa_user.is_active  if sa_user else False,
                # Missing fields for review dashboard
                'institution_type': s.institution_type,
                'academic_system':  s.academic_system,
                'capacity':         s.capacity,
                'website':          s.website,
                'motto':            s.motto,
                'grading_system':   s.grading_system,
                'established':      s.established,
            })
        return JsonResponse({'success': True, 'schools': school_list}, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@require_http_methods(["POST"])
@csrf_exempt
def api_approve_school(request):
    """Approve, reject, or request changes for a school"""
    actor = _get_authed_user(request)
    if not actor or not actor.is_superuser:
        return JsonResponse({'success': False, 'message': 'Superadmin access required.'}, status=403)
    try:
        data = json.loads(request.body)
        school_id = data.get('school_id')
        action = data.get('action')
        note = data.get('note', '')
        ip = request.META.get('REMOTE_ADDR')

        if not school_id or not action:
            return JsonResponse({'success': False, 'message': 'Missing data'}, status=400)

        school = School.objects.get(id=school_id)

        if action == 'approve':
            school.is_approved = True
            school.is_active = True
            school.changes_requested = False
            school.rejection_reason = ''
            school.approval_date = timezone.now()
            event_type = 'APPROVED'
            severity = 'info'
            msg = f"School '{school.name}' approved successfully."
            # Activate the school admin user so they can log in
            try:
                sa = school.admin
                if sa and sa.user:
                    sa.user.is_active = True
                    sa.user.save(update_fields=['is_active'])
                    
                    # ── Send Approval Email ──────────────────────────────────────
                    admin_email = sa.user.email or school.email
                    site_url = "https://ek-sms-one.vercel.app/login"
                    
                    email_html = f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                        <div style="background: linear-gradient(90deg, #1e3a8a, #3b82f6); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">School Approved!</h1>
                        </div>
                        <div style="padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; background: #ffffff;">
                            <h2 style="color: #1e3a8a; margin-top: 0;">Congratulations, {school.name}!</h2>
                            <p>Your institution registration for <strong>EK-SMS</strong> has been reviewed and successfully approved by our system administrator.</p>
                            
                            <p>You can now log in to your School Dashboard to begin setting up your institution, managing staff, and enrolling students.</p>
                            
                            <div style="text-align: center; margin: 40px 0;">
                                <a href="{site_url}" style="background-color: #3b82f6; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                                    Access Your Dashboard
                                </a>
                            </div>
                            
                            <p style="font-size: 14px; color: #6b7280;">Your dedicated school code is: <strong>{school.code}</strong></p>
                            
                            <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 30px 0;">
                            
                            <p style="font-size: 13px; color: #9ca3af;">
                                Need help getting started? Visit our support portal or reply to this email.<br>
                                © {datetime.datetime.now().year} EK-SMS - School Management System
                            </p>
                        </div>
                    </div>
                    """
                    
                    _send_notification_email(
                        subject=f"Approved: Welcome {school.name} to EK-SMS",
                        to_email=admin_email,
                        html_content=email_html
                    )
            except Exception as e:
                logger.error(f"Failed to send approval email: {str(e)}")
        elif action == 'reject':
            school.is_approved = False
            school.is_active = False
            school.changes_requested = False
            school.rejection_reason = note
            event_type = 'REJECTED'
            severity = 'medium'
            msg = f"School '{school.name}' rejected."
            # Keep admin user inactive on rejection
            try:
                sa = school.admin
                if sa and sa.user:
                    sa.user.is_active = False
                    sa.user.save(update_fields=['is_active'])
            except Exception:
                pass
        elif action == 'request_changes':
            school.is_approved = False
            school.changes_requested = True
            school.rejection_reason = note
            event_type = 'CHANGES_REQUESTED'
            severity = 'low'
            msg = f"Changes requested for '{school.name}'."
        else:
            return JsonResponse({'success': False, 'message': 'Invalid action'}, status=400)

        school.save()

        # Audit trail
        SchoolApplicationEvent.objects.create(
            school=school,
            event_type=event_type,
            actor=actor,
            actor_label=actor.username if actor else 'superadmin',
            note=note,
        )
        _log_security_event(
            f'school_{action}d' if action != 'request_changes' else 'school_changes_requested',
            description=f"{action.replace('_', ' ').title()}: {school.name}. Note: {note}",
            severity=severity,
            actor=actor,
            ip=ip,
            metadata={'school_id': school.id, 'school_name': school.name},
        )

        return JsonResponse({'success': True, 'message': msg}, status=200)
    except School.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'School not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@require_http_methods(["POST"])
@csrf_exempt
def api_waitlist(request):
    return JsonResponse({'success': False, 'message': 'Waitlist not yet implemented'}, status=501)

@require_http_methods(["POST"])
@csrf_exempt
def api_send_otp(request):
    """
    Send OTP to user's email using Resend service.
    Expects JSON payload with 'email'.
    """
    try:
        import hashlib
        import secrets
        from eksms_core.models import OTPRecord
        from django.conf import settings

        data = json.loads(request.body)
        email = data.get('email', '').strip()

        if not email:
            return JsonResponse({'success': False, 'message': 'Email is required.'}, status=400)

        # Validate email format
        from django.core.validators import validate_email
        try:
            validate_email(email)
        except:
            return JsonResponse({'success': False, 'message': 'Invalid email format.'}, status=400)


        # Check if there's already a valid OTP for this email
        from eksms_core.models import OTPRecord
        existing_otp = OTPRecord.objects.filter(
            email=email,
            is_used=False,
            expires_at__gt=timezone.now()
        ).first()
        
        if existing_otp:
            # OTP already sent and still valid — treat as success so the input box shows
            return JsonResponse({
                'success': True,
                'message': 'A verification code was already sent. Please check your email.',
                'already_sent': True,
            }, status=200)
        
        # 3. Generate 6-digit OTP
        otp_code = str(secrets.randbelow(900000) + 100000)
        otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()
        
        expiry_minutes = getattr(settings, 'OTP_EXPIRY_MINUTES', 10)
        expires_at = timezone.now() + timezone.timedelta(minutes=expiry_minutes)
        
        # Send email — use Resend in production, fall back to console log in dev
        resend_api_key = getattr(settings, 'RESEND_API_KEY', '')
        default_from = getattr(settings, 'DEFAULT_FROM_EMAIL', 'EK-SMS <noreply@elkendeh.com>')
        
        import logging
        logger = logging.getLogger('django')

        if resend_api_key:
            # ── Path 1: Resend API ──────────────────────────────────────────
            try:
                import resend
                resend.api_key = resend_api_key
                
                logger.info(f"Attempting to send OTP to {email} via Resend API...")
                
                resend_response = resend.Emails.send({
                    "from": default_from,
                    "to": [email],
                    "subject": f"Your PRUH-SMS Verification Code: {otp_code}",
                    "html": f"""
                    <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #f0f0f0;">
                      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 40px 30px; text-align: center;">
                        <h1 style="color: #6366f1; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.01em;">PRUH-SMS</h1>
                        <p style="color: #94a3b8; margin: 8px 0 0; font-size: 14px; font-weight: 500;">Elkendeh School Management System</p>
                      </div>
                      <div style="padding: 40px 35px; text-align: center;">
                        <h2 style="color: #1e293b; font-size: 20px; font-weight: 700; margin: 0 0 16px;">Verify Your Email</h2>
                        <p style="color: #64748b; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
                          Use the secure verification code below to complete your registration on the <strong>Elkendeh School Management System</strong>. This code is valid for <strong>{expiry_minutes} minutes</strong>.
                        </p>
                        <div style="background-color: #f8fafc; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 32px;">
                          <span style="font-size: 42px; font-weight: 800; color: #4f46e5; letter-spacing: 12px; font-family: 'Courier New', Courier, monospace; display: block;">{otp_code}</span>
                        </div>
                        <p style="color: #94a3b8; font-size: 13px; margin: 0;">
                          If you did not request this, please safely ignore this email.
                        </p>
                      </div>
                      <div style="background-color: #f8fafc; padding: 24px 30px; text-align: center; border-top: 1px solid #f1f5f9;">
                        <p style="color: #64748b; font-size: 12px; margin: 0; font-weight: 500;">
                          &copy; 2026 PRUH-SMS · Elkendeh School Management System
                        </p>
                      </div>
                    </div>
                    """,
                    "headers": {
                        "X-Entity-Ref-ID": str(uuid.uuid4())
                    }
                })
                
                logger.info(f"Resend API successfully accepted email for {email}. Response: {resend_response}")

                # Save record only AFTER successful send
                OTPRecord.objects.create(
                    email=email,
                    code_hash=otp_hash,
                    expires_at=expires_at
                )
            except Exception as email_error:
                logger.error(f"Failed to send OTP via Resend to {email}: {str(email_error)}", exc_info=True)
                return JsonResponse({
                    'success': False,
                    'message': f'Failed to send email: {str(email_error)}'
                }, status=500)

        else:
            # ── Path 2: Django SMTP backend (configured via .env) ───────────
            from django.core.mail import send_mail as django_send_mail
            from django.conf import settings as djsettings

            smtp_user = getattr(djsettings, 'EMAIL_HOST_USER', '')
            html_body = f"""
            <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #f0f0f0;">
              <div style="background: linear-gradient(135deg, #0b1326 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #adc6ff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.01em;">PRUH-SMS</h1>
                <p style="color: #4cd7f6; margin: 4px 0 0; font-size: 14px; font-weight: 500;">Elkendeh School Management System</p>
              </div>
              <div style="padding: 40px 35px; text-align: center;">
                <h2 style="color: #1a1a2e; font-size: 20px; font-weight: 700; margin: 0 0 16px;">Email Verification</h2>
                <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
                  Use the secure verification code below to verify your email address on the <strong>Elkendeh School Management System</strong>. This code is valid for <strong>{expiry_minutes} minutes</strong>.
                </p>
                <div style="background-color: #f0f7ff; border: 2px solid #adc6ff; border-radius: 12px; padding: 25px; margin-bottom: 32px;">
                  <span style="font-size: 42px; font-weight: 900; color: #0b1326; letter-spacing: 12px; font-family: 'Courier New', Courier, monospace; display: block;">{otp_code}</span>
                </div>
                <p style="color: #888; font-size: 13px; margin: 0;">
                  If you did not request this, please safely ignore this email.
                </p>
              </div>
              <div style="background-color: #f9f9f9; padding: 24px 30px; text-align: center; border-top: 1px solid #f1f1f1;">
                <p style="color: #aaa; font-size: 12px; margin: 0; font-weight: 500;">
                  &copy; 2026 PRUH-SMS · Elkendeh School Management System
                </p>
              </div>
            </div>
            """
            text_body = f"Your PRUH-SMS verification code is: {otp_code}\nExpires in {expiry_minutes} minutes."

            if smtp_user:
                try:
                    logger.info(f"Attempting to send OTP to {email} via SMTP ({getattr(settings, 'EMAIL_HOST', 'unknown')})...")
                    django_send_mail(
                        subject='Your PRUH-SMS Verification Code',
                        message=text_body,
                        from_email=default_from,
                        recipient_list=[email],
                        html_message=html_body,
                        fail_silently=False,
                    )
                    logger.info(f"SMTP successfully sent email to {email}")
                    OTPRecord.objects.create(
                        email=email,
                        code_hash=otp_hash,
                        expires_at=expires_at
                    )
                except Exception as smtp_error:
                    logger.error(f"SMTP OTP send failed for {email}: {smtp_error}", exc_info=True)
                    return JsonResponse({
                        'success': False,
                        'message': f'Failed to send verification email (SMTP): {str(smtp_error)}'
                    }, status=500)
            else:
                # ── Path 3: Dev console fallback (no SMTP configured) ───────
                logger.warning(
                    f"\n{'='*55}\n"
                    f"  [DEV ONLY] OTP for {email}: {otp_code}\n"
                    f"  Expires in {expiry_minutes} minutes\n"
                    f"  (Configure RESEND_API_KEY or EMAIL_HOST_USER for real mail)\n"
                    f"{'='*55}"
                )
                OTPRecord.objects.create(
                    email=email,
                    code_hash=otp_hash,
                    expires_at=expires_at
                )

        return JsonResponse({
            'success': True,
            'message': 'Verification code sent to your email.',
            'expires_in': expiry_minutes * 60
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON payload.'}, status=400)
    except Exception as e:
        import logging
        logger = logging.getLogger('django')
        logger.error(f"OTP send error: {str(e)}")
        return JsonResponse({'success': False, 'message': 'An error occurred. Please try again.'}, status=500)

@require_http_methods(["POST"])
@csrf_exempt
def api_resend_otp(request):
    """
    Resend OTP to user's email with cooldown protection.
    Expects JSON payload with 'email'.
    """
    try:
        import hashlib
        import secrets
        from eksms_core.models import OTPRecord
        from django.conf import settings
        from django.core.cache import cache

        data = json.loads(request.body)
        email = data.get('email', '').strip()

        if not email:
            return JsonResponse({'success': False, 'message': 'Email is required.'}, status=400)


        # Check cooldown (60 seconds between resend requests)
        cache_key = f"otp_resend_cooldown_{email}"
        last_resend = cache.get(cache_key)
        if last_resend:
            time_since_last = timezone.now().timestamp() - last_resend
            if time_since_last < 60:
                remaining = int(60 - time_since_last)
                return JsonResponse({
                    'success': False, 
                    'message': f'Please wait {remaining} seconds before requesting another code.',
                    'retry_after': remaining
                }, status=429)
        
        # 3. Generate new 6-digit OTP
        otp_code = str(secrets.randbelow(900000) + 100000)
        otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()
        
        expiry_minutes = getattr(settings, 'OTP_EXPIRY_MINUTES', 10)
        expires_at = timezone.now() + timezone.timedelta(minutes=expiry_minutes)
        
        # Send email — use Resend in production, SMTP from .env, or dev console fallback
        resend_api_key = getattr(settings, 'RESEND_API_KEY', '')
        default_from = getattr(settings, 'DEFAULT_FROM_EMAIL', 'EK-SMS <noreply@elkendeh.com>')
        import logging
        logger = logging.getLogger('django')

        html_body = f"""
        <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #f0f0f0;">
          <div style="background: linear-gradient(135deg, #0b1326 0%, #16213e 100%); padding: 40px 30px; text-align: center;">
            <h1 style="color: #adc6ff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.01em;">PRUH-SMS</h1>
            <p style="color: #4cd7f6; margin: 4px 0 0; font-size: 14px; font-weight: 500;">Elkendeh School Management System</p>
          </div>
          <div style="padding: 40px 35px; text-align: center;">
            <h2 style="color: #1a1a2e; font-size: 20px; font-weight: 700; margin: 0 0 16px;">New Verification Code</h2>
            <p style="color: #444; font-size: 15px; line-height: 1.6; margin: 0 0 32px;">
              A new code was requested for your account on the <strong>Elkendeh School Management System</strong>. Use the secure verification code below. This code is valid for <strong>{expiry_minutes} minutes</strong>.
            </p>
            <div style="background-color: #f0f7ff; border: 2px solid #adc6ff; border-radius: 12px; padding: 25px; margin-bottom: 32px;">
              <span style="font-size: 42px; font-weight: 900; color: #0b1326; letter-spacing: 12px; font-family: 'Courier New', Courier, monospace; display: block;">{otp_code}</span>
            </div>
            <p style="color: #888; font-size: 13px; margin: 0;">
              If you did not request this, please safely ignore this email.
            </p>
          </div>
          <div style="background-color: #f9f9f9; padding: 24px 30px; text-align: center; border-top: 1px solid #f1f1f1;">
            <p style="color: #aaa; font-size: 12px; margin: 0; font-weight: 500;">
              &copy; 2026 PRUH-SMS · Elkendeh School Management System
            </p>
          </div>
        </div>
        """
        text_body = f"Your new PRUH-SMS verification code is: {otp_code}\nExpires in {expiry_minutes} minutes."

        if resend_api_key:
            # ── Path 1: Resend API ─────────────────────────────────────────
            try:
                import resend
                resend.api_key = resend_api_key
                logger.info(f"Attempting to resend OTP to {email} via Resend...")
                
                resend_response = resend.Emails.send({
                    "from": default_from,
                    "to": [email],
                    "subject": "Your PRUH-SMS Verification Code (Resent)",
                    "html": html_body,
                })
                logger.info(f"Resend successfully accepted resend-email for {email}: {resend_response}")
                
                OTPRecord.objects.filter(email=email, is_used=False).update(is_used=True)
                OTPRecord.objects.create(email=email, code_hash=otp_hash, expires_at=expires_at)
            except Exception as email_error:
                logger.error(f"Failed to resend OTP via Resend to {email}: {str(email_error)}", exc_info=True)
                return JsonResponse({
                    'success': False,
                    'message': f'Failed to resend email: {str(email_error)}'
                }, status=500)
        else:
            # ── Path 2: Django SMTP backend (configured via .env) ──────────
            from django.core.mail import send_mail as django_send_mail
            smtp_user = getattr(settings, 'EMAIL_HOST_USER', '')

            if smtp_user:
                try:
                    django_send_mail(
                        subject='Your PRUH-SMS Verification Code (Resent)',
                        message=text_body,
                        from_email=default_from,
                        recipient_list=[email],
                        html_message=html_body,
                        fail_silently=False,
                    )
                    OTPRecord.objects.filter(email=email, is_used=False).update(is_used=True)
                    OTPRecord.objects.create(email=email, code_hash=otp_hash, expires_at=expires_at)
                except Exception as smtp_error:
                    logger.error(f"SMTP resend OTP failed for {email}: {smtp_error}")
                    return JsonResponse({
                        'success': False,
                        'message': 'Failed to send verification email. Check email configuration.'
                    }, status=500)
            else:
                # ── Path 3: Dev console fallback ───────────────────────────
                logger.warning(
                    f"\n{'='*55}\n"
                    f"  RESENT OTP for {email}: {otp_code}\n"
                    f"  Expires in {expiry_minutes} minutes\n"
                    f"  (Configure EMAIL_HOST_USER in .env to send real emails)\n"
                    f"{'='*55}"
                )
                OTPRecord.objects.filter(email=email, is_used=False).update(is_used=True)
                OTPRecord.objects.create(email=email, code_hash=otp_hash, expires_at=expires_at)


        # Set cooldown
        cache.set(cache_key, timezone.now().timestamp(), 60)
        
        return JsonResponse({
            'success': True, 
            'message': 'Verification code resent to your email.',
            'expires_in': expiry_minutes * 60
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON payload.'}, status=400)
    except Exception as e:
        import logging
        logger = logging.getLogger('django')
        logger.error(f"OTP resend error: {str(e)}")
        return JsonResponse({'success': False, 'message': 'An error occurred. Please try again.'}, status=500)

@require_http_methods(["POST"])
@csrf_exempt
def api_verify_otp(request):
    """
    Verify OTP code entered by user.
    Expects JSON payload with 'email' and 'otp'.
    """
    try:
        import hashlib
        from eksms_core.models import OTPRecord
        
        data = json.loads(request.body)
        email = data.get('email', '').strip()
        otp_code = data.get('otp', '').strip()
        
        if not email or not otp_code:
            return JsonResponse({
                'success': False, 
                'message': 'Email and OTP code are required.'
            }, status=400)
        
        if len(otp_code) != 6 or not otp_code.isdigit():
            return JsonResponse({
                'success': False, 
                'message': 'Please enter a valid 6-digit code.'
            }, status=400)
        
        # Hash the provided OTP
        otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()
        
        # Find valid OTP record
        otp_record = OTPRecord.objects.filter(
            email=email,
            code_hash=otp_hash,
            is_used=False,
            expires_at__gt=timezone.now(),
            attempts__lt=5  # Max 5 attempts
        ).first()
        
        if not otp_record:
            # Check if there's an expired OTP to give better error message
            expired_otp = OTPRecord.objects.filter(
                email=email,
                code_hash=otp_hash,
                is_used=False
            ).first()
            
            if expired_otp and expired_otp.expires_at <= timezone.now():
                return JsonResponse({
                    'success': False, 
                    'message': 'Code has expired. Please request a new one.'
                }, status=400)
            else:
                # Increment attempts for wrong code
                wrong_otp = OTPRecord.objects.filter(
                    email=email,
                    is_used=False,
                    expires_at__gt=timezone.now()
                ).first()
                if wrong_otp:
                    wrong_otp.attempts += 1
                    wrong_otp.save()
                
                return JsonResponse({
                    'success': False, 
                    'message': 'Invalid verification code. Please check and try again.'
                }, status=400)
        
        # Mark OTP as used
        otp_record.is_used = True
        otp_record.save()
        
        return JsonResponse({
            'success': True, 
            'message': 'Email verified successfully.'
        }, status=200)
        
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON payload.'}, status=400)
    except Exception as e:
        import logging
        logger = logging.getLogger('django')
        logger.error(f"OTP verify error: {str(e)}")
        return JsonResponse({'success': False, 'message': 'An error occurred. Please try again.'}, status=500)

def api_check_school_name(request):
    name = request.GET.get('name', '')
    exists = School.objects.filter(name__iexact=name).exists()
    return JsonResponse({'available': not exists}, status=200)

@require_http_methods(["GET", "POST"])
@csrf_exempt
def api_get_users(request):
    """GET: Fetch user summary. POST: Create a new user (superadmin only)."""
    if request.method == 'POST':
        actor = _get_authed_user(request)
        if not actor or not actor.is_superuser:
            return JsonResponse({'success': False, 'message': 'Superadmin access required.'}, status=403)
        try:
            data = json.loads(request.body)
            name       = data.get('name', '').strip()
            email      = data.get('email', '').strip().lower()
            role       = data.get('role', 'Teacher')
            school_name = data.get('school', '').strip()

            if not name or not email:
                return JsonResponse({'success': False, 'message': 'Name and email are required.'}, status=400)
            if User.objects.filter(email=email).exists():
                return JsonResponse({'success': False, 'message': 'A user with this email already exists.'}, status=409)

            # Derive unique username from email local part
            base_username = email.split('@')[0].replace('.', '_').replace('-', '_').lower()
            username = base_username
            n = 1
            while User.objects.filter(username=username).exists():
                username = f'{base_username}_{n}'
                n += 1

            parts = name.split(' ', 1)
            first_name = parts[0]
            last_name  = parts[1] if len(parts) > 1 else ''
            temp_password = f'EK@{uuid.uuid4().hex[:8].upper()}!'

            new_user = User.objects.create_user(
                username=username, email=email,
                first_name=first_name, last_name=last_name,
                password=temp_password, is_active=True,
            )
            if role == 'School Admin' and school_name:
                try:
                    school = School.objects.get(name__iexact=school_name)
                    SchoolAdmin.objects.get_or_create(user=new_user, school=school)
                except School.DoesNotExist:
                    pass

            _log_security_event('profile_updated',
                description=f"Superadmin {actor.username} created user account: {email} ({role})",
                severity='info', actor=actor, ip=request.META.get('REMOTE_ADDR', ''))

            return JsonResponse({'success': True, 'user': {
                'id': new_user.id, 'username': username,
                'email': email, 'name': name, 'role': role,
            }}, status=201)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    # GET — list all users with real risk scores derived from SecurityLogEntry
    try:
        thirty_days_ago = timezone.now() - datetime.timedelta(days=30)
        from django.db.models import Count as DjCount
        try:
            from django_otp.plugins.otp_totp.models import TOTPDevice
            totp_users = set(TOTPDevice.objects.filter(confirmed=True).values_list('user_id', flat=True))
        except Exception:
            totp_users = set()

        failed_map = dict(
            SecurityLogEntry.objects.filter(
                event_type='login_failure', created_at__gte=thirty_days_ago, actor__isnull=False,
            ).values('actor').annotate(n=DjCount('id')).values_list('actor', 'n')
        )
        success_map = dict(
            SecurityLogEntry.objects.filter(
                event_type='login_success', created_at__gte=thirty_days_ago, actor__isnull=False,
            ).values('actor').annotate(n=DjCount('id')).values_list('actor', 'n')
        )
        alerts_map = dict(
            GradeChangeAlert.objects.filter(triggered_by__isnull=False)
            .values('triggered_by').annotate(n=DjCount('id')).values_list('triggered_by', 'n')
        )

        # Determine requester role and school
        actor = _get_authed_user(request)
        if not actor:
            return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
            
        is_super = actor.is_superuser
        school = None
        if not is_super:
            try:
                sa = SchoolAdmin.objects.get(user=actor)
                school = sa.school
            except SchoolAdmin.DoesNotExist:
                return JsonResponse({'success': False, 'message': 'Forbidden'}, status=403)

        from django.db.models import Q
        users_qs = User.objects.all().select_related(
            'school_admin_profile', 'school_admin_profile__school',
            'teacher_profile', 'teacher_profile__school',
            'student_profile', 'student_profile__school',
            'parent_profile', 'parent_profile__school',
            'school_staff_account', 'school_staff_account__school'
        )
        
        if not is_super:
            # Only show users belonging to the admin's school
            users_qs = users_qs.filter(
                Q(school_admin_profile__school=school) |
                Q(teacher_profile__school=school) |
                Q(student_profile__school=school) |
                Q(parent_profile__school=school) |
                Q(school_staff_account__school=school)
            ).exclude(is_superuser=True)

        user_list = []
        for u in users_qs:
            role = 'User'
            school_name = 'EK-SMS Platform'
            if u.is_superuser:
                role = 'Super Admin'
            elif hasattr(u, 'school_admin_profile'):
                role = 'School Admin'
                school_name = u.school_admin_profile.school.name
            elif hasattr(u, 'teacher_profile'):
                role = 'Teacher'
                school_name = u.teacher_profile.school.name
            elif u.is_staff:
                role = 'Staff Admin'

            failed  = failed_map.get(u.id, 0)
            success = success_map.get(u.id, 0)
            risk_score = min(100, failed * 25)
            risk_level = 'high' if risk_score >= 60 else 'medium' if risk_score >= 25 else 'low'

            user_list.append({
                'id': u.id,
                'username': u.username,
                'name': f"{u.first_name} {u.last_name}".strip() or u.username,
                'email': u.email,
                'role': role,
                'school': school_name,
                'status': 'active' if u.is_active else 'suspended',
                'riskLevel': risk_level,
                'riskScore': risk_score,
                'failedAttempts': failed,
                'successLogins': success,
                'alertsTriggered': alerts_map.get(u.id, 0),
                'twoFAEnabled': u.id in totp_users,
                'last_login': u.last_login.isoformat() if u.last_login else None,
                'date_joined': u.date_joined.isoformat(),
            })
        return JsonResponse({'success': True, 'users': user_list}, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

def api_get_security_logs(request):
    """Fetch real security log entries from DB. Supports ?limit=N (default 100, max 500)."""
    actor = _get_authed_user(request)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    is_super = actor.is_superuser
    school = None
    if not is_super:
        try:
            sa = SchoolAdmin.objects.get(user=actor)
            school = sa.school
        except SchoolAdmin.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Forbidden: School Admin access required.'}, status=403)

    _STATUS_MAP = {
        'login_failure':       'Blocked',
        'api_rate_limited':    'Throttled',
        'suspicious_activity': 'Flagged',
        'school_rejected':     'Flagged',
        'permission_changed':  'Flagged',
        'login_success':       'Allowed',
        'logout':              'Allowed',
        'password_changed':    'Allowed',
        'school_approved':     'Allowed',
        'broadcast_sent':      'Allowed',
        'profile_updated':     'Allowed',
        'student_transfer':    'Allowed',
        'academic_year_archived': 'Allowed',
    }
    try:
        limit = min(int(request.GET.get('limit', 100)), 500)
    except (ValueError, TypeError):
        limit = 100

    try:
        from django.db.models import Q
        qs = SecurityLogEntry.objects.select_related('actor').order_by('-created_at')
        
        if not is_super:
            # School admins only see logs for their school's users and never superadmins
            qs = qs.filter(
                Q(actor__school_admin_profile__school=school) |
                Q(actor__teacher_profile__school=school) |
                Q(actor__student_profile__school=school) |
                Q(actor__parent_profile__school=school) |
                Q(actor__school_staff_account__school=school)
            ).exclude(actor__is_superuser=True)

        entries = qs[:limit]
        logs = []
        for e in entries:
            actor_name = e.actor_label or (e.actor.username if e.actor else 'system')
            # Derive status: severity overrides type for high/critical unrecognised events
            status = _STATUS_MAP.get(e.event_type)
            if not status:
                status = 'Flagged' if e.severity in ('high', 'critical') else 'Allowed'
            logs.append({
                'id': e.id,
                'type': e.event_type,
                'actor': actor_name,
                'ip': e.ip_address or '—',
                'ts': e.created_at.isoformat(),
                'action': e.description or e.get_event_type_display(),
                'severity': e.severity,
                'status': status,
            })

        return JsonResponse({'success': True, 'logs': logs}, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

def api_system_health(request):
    """Real-time system health stats (superadmin only)."""
    actor = _get_authed_user(request)
    if not actor or not actor.is_superuser:
        return JsonResponse({'success': False, 'message': 'Forbidden'}, status=403)
    try:
        cpu_usage = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        disk = shutil.disk_usage('/')
        
        # Calculate mock uptime for demo/visualization
        # In a real app, this would be computed from boot time
        import time
        boot_time = getattr(request.resolver_match, '_boot_time', time.time() - 3600*24*4) 
        uptime_seconds = int(time.time() - boot_time)

        resources = [
            {'label': 'CPU Usage', 'value': cpu_usage, 'unit': '%'},
            {'label': 'Memory Usage', 'value': memory.percent, 'unit': '%'},
            {'label': 'Disk Usage', 'value': round((disk.used / disk.total) * 100, 1), 'unit': '%'},
            {'label': 'Database Load', 'value': 12, 'unit': '%'},
        ]

        services = [
            {'id': 1, 'label': 'Core API Gateway', 'status': 'Operational', 'uptime': 0.9998},
            {'id': 2, 'label': 'Auth Service', 'status': 'Operational', 'uptime': 0.9999},
            {'id': 3, 'label': 'Database Cluster', 'status': 'Operational', 'uptime': 0.9995},
            {'id': 4, 'label': 'Storage Engine', 'status': 'Operational', 'uptime': 1.0},
            {'id': 5, 'label': 'SMS Gateway', 'status': 'Operational', 'uptime': 0.985},
        ]
        
        return JsonResponse({
            'success': True,
            'status': 'healthy',
            'uptime': uptime_seconds,
            'resources': resources,
            'services': services,
            'version': '1.0.5',
            'database': 'connected'
        }, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'status': 'partial', 'message': str(e)}, status=500)

def api_get_grade_alerts(request):
    """Fetch grade alerts from database — enriched with student/school/grade context"""
    actor = _get_authed_user(request)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    
    is_super = actor.is_superuser
    school = None
    if not is_super:
        try:
            sa = SchoolAdmin.objects.get(user=actor)
            school = sa.school
        except SchoolAdmin.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Forbidden'}, status=403)

    try:
        from django.db.models import Q
        qs = GradeChangeAlert.objects.select_related(
            'grade__student__school', 'triggered_by', 'acknowledged_by'
        ).order_by('-triggered_at')
        
        if not is_super:
            qs = qs.filter(grade__student__school=school)
            
        alerts = qs[:100]
        alert_list = []
        for a in alerts:
            grade = a.grade
            student = grade.student if grade else None
            school = student.school if student else None
            requester_user = a.triggered_by
            requester_name = requester_user.get_full_name() or requester_user.username if requester_user else 'Unknown'
            requester_initials = ''.join(w[0] for w in requester_name.split()[:2]).upper() or 'UN'

            alert_list.append({
                'id': f'REQ-{a.id:04d}',
                'severity': a.severity.lower() if a.severity else 'low',
                'alert_type': a.alert_type,
                'description': a.description,
                'status': {
                    'NEW': 'Pending', 'ACKNOWLEDGED': 'Pending',
                    'INVESTIGATED': 'Flagged', 'RESOLVED': 'Approved', 'FALSE_ALARM': 'Rejected'
                }.get(a.status, 'Pending'),
                'triggered_at': a.triggered_at.isoformat(),
                # Frontend RequestCard fields
                'student': student.user.get_full_name() if student else 'Unknown Student',
                'school': school.name if school else 'Unknown School',
                'term': str(grade.term) if grade and grade.term else '—',
                'subject': str(grade.subject) if grade and grade.subject else '—',
                'oldGrade': a.old_value.get('grade_letter', '—') if a.old_value else '—',
                'oldScore': a.old_value.get('total_score', 0) if a.old_value else 0,
                'newGrade': a.new_value.get('grade_letter', '—') if a.new_value else '—',
                'newScore': a.new_value.get('total_score', 0) if a.new_value else 0,
                'reason': a.description,
                'urgency': {
                    'critical': 'critical', 'high': 'medium', 'medium': 'medium', 'low': 'low'
                }.get(a.severity.lower() if a.severity else 'low', 'low'),
                'hashMatch': True,
                'verified': True,
                'ts': a.triggered_at.isoformat(),
                'requester': {
                    'name': requester_name,
                    'role': 'System',
                    'initials': requester_initials,
                    'ip': a.ip_address or '—',
                    'device': '—',
                    'location': '—',
                },
                'approver': None,
                'blockHash': None,
                'prevHash': None,
                'blockNum': None,
            })
        return JsonResponse({'success': True, 'alerts': alert_list}, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# ---------------------------------------------------------------------------
# System-Wide Change Alerts
# ---------------------------------------------------------------------------
TRIGGER_LABELS = dict(SystemWideAlert.TRIGGER_CHOICES)

@csrf_exempt
def api_system_alerts(request):
    """
    GET  — list system-wide alerts (last 100).
    POST — acknowledge or resolve an alert.
         body: { id, action: 'acknowledge'|'resolve', notes: '' }
    """
    actor = _get_authed_user(request)
    if not actor or not actor.is_superuser:
        return JsonResponse({'success': False, 'message': 'Superadmin access required.'}, status=403)

    if request.method == 'GET':
        try:
            alerts = SystemWideAlert.objects.select_related(
                'school', 'triggered_by', 'acknowledged_by'
            ).order_by('-triggered_at')[:100]

            result = []
            for a in alerts:
                result.append({
                    'id': a.id,
                    'trigger_type':  a.trigger_type,
                    'trigger_label': TRIGGER_LABELS.get(a.trigger_type, a.trigger_type),
                    'title':         a.title,
                    'description':   a.description,
                    'severity':      a.severity,
                    'status':        a.status,
                    'school':        a.school.name if a.school else None,
                    'triggered_by':  (a.triggered_by.get_full_name() or a.triggered_by.username)
                                     if a.triggered_by else None,
                    'triggered_at':  a.triggered_at.isoformat(),
                    'metadata':      a.metadata,
                    'acknowledged_by': (a.acknowledged_by.get_full_name() or a.acknowledged_by.username)
                                       if a.acknowledged_by else None,
                    'acknowledged_at': a.acknowledged_at.isoformat() if a.acknowledged_at else None,
                    'notes': a.notes,
                    'channels': {
                        'in_app':        a.notif_in_app,
                        'email':         a.notif_email,
                        'email_sent_at': a.notif_email_sent_at.isoformat() if a.notif_email_sent_at else None,
                        'sms':           a.notif_sms,
                        'sms_sent_at':   a.notif_sms_sent_at.isoformat() if a.notif_sms_sent_at else None,
                        'push':          a.notif_push,
                        'push_sent_at':  a.notif_push_sent_at.isoformat() if a.notif_push_sent_at else None,
                    },
                })
            return JsonResponse({'success': True, 'alerts': result})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    if request.method == 'POST':
        try:
            data   = json.loads(request.body)
            actor  = _get_authed_user(request)
            action = data.get('action', 'acknowledge')
            notes  = data.get('notes', '')
            alert  = SystemWideAlert.objects.get(id=data.get('id'))
            if action == 'resolve':
                alert.resolve(user=actor, notes=notes)
            else:
                alert.acknowledge(actor, notes)
            return JsonResponse({'success': True})
        except SystemWideAlert.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Alert not found'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


# ---------------------------------------------------------------------------
# 1. School Application Events
# ---------------------------------------------------------------------------
def api_school_events(request):
    """
    GET  ?school_id=X  — list events for a school
    POST {school_id, event_type, note} — create a new event (superadmin only)
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            actor = _get_authed_user(request)
            school_id = data.get('school_id')
            event_type = data.get('event_type', 'NOTE')
            note = data.get('note', '')
            if not school_id:
                return JsonResponse({'success': False, 'message': 'school_id required'}, status=400)
            school = School.objects.get(id=school_id)
            ev = SchoolApplicationEvent.objects.create(
                school=school,
                event_type=event_type,
                actor=actor,
                actor_label=actor.username if actor else 'system',
                note=note,
            )
            return JsonResponse({'success': True, 'event_id': ev.id}, status=201)
        except School.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'School not found'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    # GET
    try:
        school_id = request.GET.get('school_id')
        qs = SchoolApplicationEvent.objects.select_related('actor', 'school')
        if school_id:
            qs = qs.filter(school_id=school_id)
        qs = qs.order_by('-created_at')[:200]
        events = []
        for e in qs:
            events.append({
                'id': e.id,
                'school_id': e.school_id,
                'school_name': e.school.name,
                'event_type': e.event_type,
                'event_label': e.get_event_type_display(),
                'actor': e.actor_label or (e.actor.username if e.actor else 'system'),
                'note': e.note,
                'created_at': e.created_at.isoformat(),
            })
        return JsonResponse({'success': True, 'events': events}, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# ---------------------------------------------------------------------------
# 2. Grade Report Stats
# ---------------------------------------------------------------------------
def api_grade_stats(request):
    """
    Real grade statistics aggregated from the DB.
    Optional ?school_id=X to scope to one school.
    """
    try:
        from django.db.models import Count, Avg, Q

        school_id = request.GET.get('school_id')
        qs = Grade.objects.all()
        if school_id:
            qs = qs.filter(student__school_id=school_id)

        total = qs.count()
        locked = qs.filter(is_locked=True).count()
        avg_score = qs.aggregate(avg=Avg('total_score'))['avg'] or 0

        # Grade letter distribution
        dist_qs = qs.values('grade_letter').annotate(count=Count('id'))
        distribution = {row['grade_letter']: row['count'] for row in dist_qs}

        # Ensure all grade letters present
        for letter in ['A', 'B', 'C', 'D', 'E', 'I']:
            distribution.setdefault(letter, 0)

        # Pass/fail (A-D = pass, E/I = fail by convention)
        passed = sum(distribution.get(l, 0) for l in ['A', 'B', 'C', 'D'])
        failed = sum(distribution.get(l, 0) for l in ['E', 'I'])

        return JsonResponse({
            'success': True,
            'total_grades': total,
            'locked_grades': locked,
            'unlocked_grades': total - locked,
            'average_score': round(float(avg_score), 2),
            'passed': passed,
            'failed': failed,
            'distribution': distribution,
        }, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# ---------------------------------------------------------------------------
# 3. School Stats (students + teachers per school)
# ---------------------------------------------------------------------------
def api_school_stats(request):
    """
    Per-school headcounts: students, teachers.
    Optional ?school_id=X for a single school.
    """
    actor = _get_authed_user(request)
    if not actor or not actor.is_superuser:
        return JsonResponse({'success': False, 'message': 'Superadmin access required.'}, status=403)
    try:
        school_id = request.GET.get('school_id')
        qs = School.objects.all()
        if school_id:
            qs = qs.filter(id=school_id)

        stats = []
        for s in qs:
            stats.append({
                'school_id': s.id,
                'school_name': s.name,
                'school_code': s.code,
                'student_count': s.students.filter(is_active=True).count(),
                'teacher_count': s.teachers.filter(is_active=True).count(),
                'is_approved': s.is_approved,
                'is_active': s.is_active,
            })

        return JsonResponse({'success': True, 'stats': stats}, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# ---------------------------------------------------------------------------
# 4. Forensic Events
# ---------------------------------------------------------------------------
def api_forensic_events(request):
    """
    GET  — list forensic events (most recent 200)
    POST {event_type, severity, description, ip_address?, school_id?, metadata?}
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            actor = _get_authed_user(request)
            school_id = data.get('school_id')
            school = School.objects.get(id=school_id) if school_id else None
            ev = ForensicEvent.objects.create(
                event_type=data.get('event_type', 'other'),
                severity=data.get('severity', 'low'),
                actor=actor,
                actor_label=data.get('actor_label', actor.username if actor else ''),
                ip_address=data.get('ip_address') or request.META.get('REMOTE_ADDR'),
                description=data.get('description', ''),
                metadata=data.get('metadata', {}),
                school=school,
            )
            return JsonResponse({'success': True, 'event_id': ev.id}, status=201)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    actor = _get_authed_user(request)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
        
    is_super = actor.is_superuser
    school = None
    if not is_super:
        try:
            sa = SchoolAdmin.objects.get(user=actor)
            school = sa.school
        except SchoolAdmin.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Forbidden'}, status=403)

    try:
        qs = ForensicEvent.objects.select_related('actor', 'school', 'resolved_by').order_by('-created_at')
        if not is_super:
            qs = qs.filter(school=school)
        
        entries = qs[:200]
        events = []
        for e in qs:
            events.append({
                'id': e.id,
                'event_type': e.event_type,
                'event_label': e.get_event_type_display(),
                'severity': e.severity,
                'actor': e.actor_label or (e.actor.username if e.actor else 'anonymous'),
                'ip': e.ip_address or '—',
                'description': e.description,
                'school': e.school.name if e.school else None,
                'resolved': e.resolved,
                'resolved_by': e.resolved_by.username if e.resolved_by else None,
                'resolved_at': e.resolved_at.isoformat() if e.resolved_at else None,
                'created_at': e.created_at.isoformat(),
                'metadata': e.metadata,
            })
        return JsonResponse({'success': True, 'events': events}, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# ---------------------------------------------------------------------------
# 5. Alert Broadcasts
# ---------------------------------------------------------------------------
@csrf_exempt
def api_broadcast_alerts(request):
    """
    GET  — list broadcasts (most recent 100)
    POST {title, message, severity, audience, target_school_id?} — send a broadcast
    """
    actor = _get_authed_user(request)
    if not actor or not actor.is_superuser:
        return JsonResponse({'success': False, 'message': 'Superadmin access required.'}, status=403)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            actor = _get_authed_user(request)
            target_school_id = data.get('target_school_id')
            target_school = School.objects.get(id=target_school_id) if target_school_id else None
            title = data.get('title', '').strip()
            message = data.get('message', '').strip()
            if not title or not message:
                return JsonResponse({'success': False, 'message': 'title and message are required'}, status=400)

            # Audience may be a model code or a free-form label coming from
            # the SuperAdmin compose UI. Normalize so model.choices accept it.
            raw_audience = (data.get('audience') or 'all')
            audience_norm = str(raw_audience).strip().lower()
            audience_map = {
                'all schools': 'all', 'all': 'all',
                'school admins': 'school_admins', 'school_admins': 'school_admins',
                'super admins': 'superadmins',  'superadmins': 'superadmins',
            }
            audience = audience_map.get(audience_norm, 'all')
            severity = (data.get('severity') or 'info').lower()
            if severity == 'medium': severity = 'warning'
            if severity == 'low':    severity = 'info'
            if severity not in ('info', 'warning', 'critical'):
                severity = 'info'

            broadcast = AlertBroadcast.objects.create(
                title=title,
                message=message,
                severity=severity,
                audience=audience,
                target_school=target_school,
                sent_by=actor,
                status='sent',
                sent_at=timezone.now(),
            )

            # Fan-out: turn the broadcast into in-app Notifications so the
            # message is actually visible in school admin dashboards. This is
            # the "actually broadcast" behaviour the testing team flagged.
            notif_type = 'alert' if severity == 'critical' else ('warning' if severity == 'warning' else 'info')
            try:
                if audience == 'all':
                    target_admins = SchoolAdmin.objects.filter(is_active=True).select_related('user', 'school')
                elif audience == 'school_admins':
                    target_admins = SchoolAdmin.objects.filter(is_active=True).select_related('user', 'school')
                elif audience == 'superadmins':
                    target_admins = []
                    for su in User.objects.filter(is_superuser=True, is_active=True):
                        Notification.objects.create(
                            school=None, title=title, body=message,
                            notif_type=notif_type, recipient_role='all',
                            recipient_user=su, sender=actor,
                        )
                else:
                    target_admins = []
                    if target_school:
                        target_admins = SchoolAdmin.objects.filter(
                            school=target_school, is_active=True
                        ).select_related('user', 'school')
                for sa_obj in target_admins:
                    Notification.objects.create(
                        school=sa_obj.school, title=title, body=message,
                        notif_type=notif_type, recipient_role='all',
                        recipient_user=sa_obj.user, sender=actor,
                    )
            except Exception as fan_exc:
                logging.getLogger('django').warning(
                    f'Broadcast fan-out partial failure: {fan_exc}'
                )

            _log_security_event(
                'broadcast_sent',
                description=f"Broadcast sent: '{title}' to {broadcast.audience}",
                severity='info',
                actor=actor,
                ip=request.META.get('REMOTE_ADDR'),
                metadata={'broadcast_id': broadcast.id},
            )
            return JsonResponse({
                'success': True, 'broadcast_id': broadcast.id,
                'audience': audience, 'severity': severity,
            }, status=201)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    # GET
    try:
        qs = AlertBroadcast.objects.select_related('sent_by', 'target_school').order_by('-created_at')[:100]
        broadcasts = []
        for b in qs:
            broadcasts.append({
                'id': b.id,
                'title': b.title,
                'message': b.message,
                'severity': b.severity,
                'audience': b.audience,
                'target_school': b.target_school.name if b.target_school else None,
                'sent_by': b.sent_by.username if b.sent_by else 'system',
                'status': b.status,
                'sent_at': b.sent_at.isoformat() if b.sent_at else None,
                'created_at': b.created_at.isoformat(),
            })
        return JsonResponse({'success': True, 'broadcasts': broadcasts}, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# ---------------------------------------------------------------------------
# 6. Permissions API (RBAC — SchoolAdmin permission flags)
# ---------------------------------------------------------------------------
def api_permissions(request):
    """
    GET  ?school_id=X  — return SchoolAdmin permission flags for a school
    PATCH {school_id, permissions: {can_manage_academics: bool, ...}}
    """
    PERM_FIELDS = [
        'can_manage_academics',
        'can_create_staff_accounts',
        'can_manage_staff_roles',
        'can_activate_deactivate_staff',
        'can_manage_teachers',
        'can_manage_students',
        'can_manage_parents',
        'can_manage_grades',
        'can_manage_reports',
        'can_view_audit_logs',
    ]

    if request.method == 'PATCH':
        try:
            data = json.loads(request.body)
            school_id = data.get('school_id')
            perms = data.get('permissions', {})
            if not school_id:
                return JsonResponse({'success': False, 'message': 'school_id required'}, status=400)

            admin = SchoolAdmin.objects.get(school_id=school_id)
            actor = _get_authed_user(request)
            updated = {}
            for field in PERM_FIELDS:
                if field in perms:
                    setattr(admin, field, bool(perms[field]))
                    updated[field] = bool(perms[field])
            admin.save()

            _log_security_event(
                'permission_changed',
                description=f"Permissions updated for school {admin.school.name}: {list(updated.keys())}",
                severity='medium',
                actor=actor,
                ip=request.META.get('REMOTE_ADDR'),
                metadata={'school_id': school_id, 'updated': updated},
            )
            return JsonResponse({'success': True, 'updated': updated}, status=200)
        except SchoolAdmin.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'School admin not found'}, status=404)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    # GET
    try:
        school_id = request.GET.get('school_id')
        if not school_id:
            return JsonResponse({'success': False, 'message': 'school_id required'}, status=400)
        admin = SchoolAdmin.objects.get(school_id=school_id)
        perms = {field: getattr(admin, field) for field in PERM_FIELDS}
        return JsonResponse({'success': True, 'school_id': int(school_id), 'permissions': perms}, status=200)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'School admin not found'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# ---------------------------------------------------------------------------
# 7. Profile — GET / PATCH
# ---------------------------------------------------------------------------
def api_profile(request):
    """
    GET  — return current user's profile
    PATCH {first_name?, last_name?, email?} — update profile fields
    """
    actor = _get_authed_user(request)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Authentication required'}, status=401)

    if request.method == 'PATCH':
        try:
            data = json.loads(request.body)
            changed = []
            if 'first_name' in data:
                actor.first_name = data['first_name'].strip()
                changed.append('first_name')
            if 'last_name' in data:
                actor.last_name = data['last_name'].strip()
                changed.append('last_name')
            if 'email' in data:
                new_email = data['email'].strip()
                if new_email and new_email != actor.email:
                    if User.objects.filter(email=new_email).exclude(id=actor.id).exists():
                        return JsonResponse({'success': False, 'message': 'Email already in use'}, status=400)
                    actor.email = new_email
                    changed.append('email')
            actor.save()
            _log_security_event(
                'profile_updated',
                description=f"Profile updated: {changed}",
                severity='info',
                actor=actor,
                ip=request.META.get('REMOTE_ADDR'),
                metadata={'fields_changed': changed},
            )
            return JsonResponse({'success': True, 'message': 'Profile updated', 'fields_updated': changed}, status=200)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    # GET
    return JsonResponse({
        'success': True,
        'profile': {
            'id': actor.id,
            'username': actor.username,
            'email': actor.email,
            'first_name': actor.first_name,
            'last_name': actor.last_name,
            'full_name': actor.get_full_name() or actor.username,
            'is_superuser': actor.is_superuser,
            'date_joined': actor.date_joined.isoformat(),
            'last_login': actor.last_login.isoformat() if actor.last_login else None,
        }
    }, status=200)


# ---------------------------------------------------------------------------
# 8. Change Password
# ---------------------------------------------------------------------------
@require_http_methods(["POST"])
@csrf_exempt
def api_change_password(request):
    """
    POST {current_password, new_password}
    Verifies current password then sets the new one.
    """
    try:
        actor = _get_authed_user(request)
        if not actor:
            return JsonResponse({'success': False, 'message': 'Authentication required'}, status=401)

        data = json.loads(request.body)
        current_password = data.get('current_password', '')
        new_password = data.get('new_password', '')

        if not current_password or not new_password:
            return JsonResponse({'success': False, 'message': 'current_password and new_password are required'}, status=400)

        ok, err = _password_strength_ok(new_password)
        if not ok:
            return JsonResponse({'success': False, 'message': err}, status=400)

        # Verify current password
        if not actor.check_password(current_password):
            _log_security_event(
                'login_failure',
                description=f"Failed password change attempt for {actor.username} (wrong current password)",
                severity='high',
                actor=actor,
                ip=request.META.get('REMOTE_ADDR'),
            )
            return JsonResponse({'success': False, 'message': 'Current password is incorrect'}, status=400)

        actor.set_password(new_password)
        actor.save()
        sa_profile = getattr(actor, 'school_admin_profile', None)
        if sa_profile and sa_profile.must_change_password:
            sa_profile.must_change_password = False
            sa_profile.save(update_fields=['must_change_password'])

        _log_security_event(
            'password_changed',
            description=f"Password changed for {actor.username}",
            severity='medium',
            actor=actor,
            ip=request.META.get('REMOTE_ADDR'),
        )
        return JsonResponse({'success': True, 'message': 'Password changed successfully'}, status=200)

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# ---------------------------------------------------------------------------
# 9. Admin Settings Persistence
# ---------------------------------------------------------------------------
def api_admin_settings(request):
    """
    GET  — return all settings for the authenticated user as {key: value, ...}
    PATCH {settings: {key: value, ...}} — upsert multiple settings at once
    """
    actor = _get_authed_user(request)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Authentication required'}, status=401)

    if request.method == 'PATCH':
        try:
            data = json.loads(request.body)
            settings_map = data.get('settings', {})
            if not isinstance(settings_map, dict):
                return JsonResponse({'success': False, 'message': 'settings must be an object'}, status=400)
            for key, value in settings_map.items():
                AdminSetting.objects.update_or_create(
                    user=actor, key=key,
                    defaults={'value': value},
                )
            return JsonResponse({'success': True, 'message': f'{len(settings_map)} setting(s) saved'}, status=200)
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    # GET
    try:
        rows = AdminSetting.objects.filter(user=actor)
        settings_map = {row.key: row.value for row in rows}
        return JsonResponse({'success': True, 'settings': settings_map}, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# ---------------------------------------------------------------------------
# 10. Security Counters (real aggregates)
# ---------------------------------------------------------------------------
def api_security_counters(request):
    """
    Real aggregated security counters from the DB.
    Used by the Security dashboard to show threats blocked, sessions, login stats.
    """
    actor = _get_authed_user(request)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
        
    is_super = actor.is_superuser
    school = None
    if not is_super:
        try:
            sa = SchoolAdmin.objects.get(user=actor)
            school = sa.school
        except SchoolAdmin.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Forbidden'}, status=403)

    try:
        from django.db.models import Count, Q
        from django.utils import timezone as tz

        now = tz.now()
        last_24h = now - timezone.timedelta(hours=24)
        last_7d  = now - timezone.timedelta(days=7)

        # Base filter for SecurityLogEntry
        log_qs = SecurityLogEntry.objects.all()
        if not is_super:
            log_qs = log_qs.filter(
                Q(actor__school_admin_profile__school=school) |
                Q(actor__teacher_profile__school=school) |
                Q(actor__student_profile__school=school) |
                Q(actor__parent_profile__school=school) |
                Q(actor__school_staff_account__school=school)
            ).exclude(actor__is_superuser=True)

        # Failed logins (threats blocked)
        failed_24h = log_qs.filter(
            event_type='login_failure', created_at__gte=last_24h
        ).count()
        failed_7d = log_qs.filter(
            event_type='login_failure', created_at__gte=last_7d
        ).count()

        # Successful logins
        success_24h = log_qs.filter(
            event_type='login_success', created_at__gte=last_24h
        ).count()

        # Active sessions = unique users who logged in within the last hour
        last_1h = now - timezone.timedelta(hours=1)
        active_sessions = log_qs.filter(
            event_type='login_success', created_at__gte=last_1h
        ).values('actor').distinct().count()

        # School approvals / rejections (usually only superadmin sees these globally)
        if is_super:
            approvals = SecurityLogEntry.objects.filter(event_type='school_approved').count()
            rejections = SecurityLogEntry.objects.filter(event_type='school_rejected').count()
        else:
            # School admins don't see system-wide school approvals
            approvals = 0
            rejections = 0

        # Password changes
        pw_changes = log_qs.filter(event_type='password_changed').count()

        # Total log entries
        total_entries = log_qs.count()

        return JsonResponse({
            'success': True,
            'failed_logins_24h': failed_24h,
            'failed_logins_7d': failed_7d,
            'successful_logins_24h': success_24h,
            'active_sessions': active_sessions,
            'threats_blocked': failed_24h,       # alias used by frontend
            'school_approvals_total': approvals,
            'school_rejections_total': rejections,
            'password_changes_total': pw_changes,
            'total_log_entries': total_entries,
        }, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


@require_http_methods(["POST"])
@csrf_exempt
def api_impersonate(request):
    """
    Superadmin-only: generate a session token for a school's admin user.
    Logs the impersonation as a high-severity security event.
    Expects JSON: { school_id: <int> }
    """
    actor = _get_authed_user(request)
    if not actor or not actor.is_superuser:
        return JsonResponse({'success': False, 'message': 'Superadmin access required.'}, status=403)
    try:
        data = json.loads(request.body)
        school_id = data.get('school_id')
        if not school_id:
            return JsonResponse({'success': False, 'message': 'school_id is required.'}, status=400)

        try:
            school_admin = SchoolAdmin.objects.select_related('user', 'school').get(school_id=int(school_id))
        except SchoolAdmin.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'No school admin found for this school.'}, status=404)

        target = school_admin.user
        token = f"token_{target.id}_{target.username.replace(' ', '_')}"

        _log_security_event(
            'impersonation',
            description=f"Superadmin {actor.username} impersonated {target.username} ({school_admin.school.name})",
            severity='high',
            actor=actor,
            ip=request.META.get('REMOTE_ADDR', ''),
        )

        s = school_admin.school
        badge_url = None
        if s.badge:
            try:
                badge_url = request.build_absolute_uri(s.badge.url)
            except Exception:
                badge_url = None

        return JsonResponse({
            'success': True,
            'token': token,
            'user': {
                'id': target.id,
                'username': target.username,
                'email': target.email,
                'role': 'school_admin',
                'is_superuser': False,
                'school': {
                    'id': s.id,
                    'name': s.name,
                    'badge': badge_url,
                },
            },
        })
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
    except Exception as e:
        logger.error(f"Impersonation error: {e}")
        return JsonResponse({'success': False, 'message': 'Server error during impersonation.'}, status=500)


@require_http_methods(["GET"])
@csrf_exempt
def api_sa_stats(request):
    """
    Returns live stats. 
    If Superadmin: returns global platform stats.
    If School Admin: returns stats for their specific school.
    """
    actor = _get_authed_user(request)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    is_super = actor.is_superuser
    
    try:
        if is_super:
            # Global Platform Stats
            total_schools = School.objects.count()
            pending_schools = School.objects.filter(is_approved=False).count()
            total_students = Student.objects.filter(is_active=True).count()
            total_teachers = Teacher.objects.filter(is_active=True).count()
            total_users = User.objects.count()
            
            # Simple finance aggregate for superadmin
            from django.db.models import Sum
            total_revenue = FeeRecord.objects.filter(status='paid').aggregate(total=Sum('amount_paid'))['total'] or 0
            
            return JsonResponse({
                'success': True,
                'is_global': True,
                'total_schools': total_schools,
                'pending_approvals': pending_schools,
                'total_students': total_students,
                'total_teachers': total_teachers,
                'total_users': total_users,
                'total_revenue': float(total_revenue),
                'platform_version': '1.0.5',
            })
        else:
            # School Admin Specific Stats
            try:
                sa = SchoolAdmin.objects.select_related('school').get(user=actor)
                school = sa.school
            except SchoolAdmin.DoesNotExist:
                return JsonResponse({'success': False, 'message': 'No school admin profile found.'}, status=404)

            student_count  = Student.objects.filter(school=school, is_active=True).count()
            teacher_count  = Teacher.objects.filter(school=school, is_active=True).count()
            classroom_count = ClassRoom.objects.filter(school=school, is_active=True).count()
            active_year = AcademicYear.objects.filter(school=school, is_active=True).first()
            
            return JsonResponse({
                'success': True,
                'is_global': False,
                'student_count':   student_count,
                'teacher_count':   teacher_count,
                'classroom_count': classroom_count,
                'academic_year':   active_year.name if active_year else None,
                'school_code':     school.code,
                'school_name':     school.name,
            })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# ─────────────────────────────────────────────────────────────────
# SCHOOL-ADMIN CRUD helpers
# ─────────────────────────────────────────────────────────────────

def _get_school_for_admin(request):
    actor = _get_authed_user(request)
    if not actor:
        return None, None, None
    sa = SchoolAdmin.objects.select_related('school').get(user=actor)
    return actor, sa, sa.school


def _get_user_school(user):
    """Returns the School object associated with any user (Admin, Teacher, Student, Parent)."""
    if hasattr(user, 'school_admin_profile'):
        return user.school_admin_profile.school
    if hasattr(user, 'teacher_profile'):
        return user.teacher_profile.school
    if hasattr(user, 'student_profile'):
        return user.student_profile.school
    if hasattr(user, 'parent_profile'):
        return user.parent_profile.school
    return None


def _require_exam_officer(request, school):
    """
    Returns (teacher, error_response).
    Checks that the authed user is a Teacher with is_examination_officer=True.
    School admins bypass this check (they have full access).
    """
    actor = _get_authed_user(request)
    if not actor:
        return None, JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    # School admins always have access
    if SchoolAdmin.objects.filter(user=actor, school=school).exists():
        return None, None
    try:
        teacher = Teacher.objects.get(user=actor, school=school, is_active=True)
    except Teacher.DoesNotExist:
        return None, JsonResponse({'success': False, 'message': 'Exam officer role required.'}, status=403)
    if not teacher.is_examination_officer:
        return None, JsonResponse({'success': False, 'message': 'Exam officer role required.'}, status=403)
    return teacher, None


# ── School info ──────────────────────────────────────────────────

@csrf_exempt
def api_school_profile_full(request):
    print(f"[DEBUG] api_school_profile_full called with method: {request.method}")
    if request.method == 'OPTIONS':
        res = JsonResponse({'status': 'ok'})
        origin = request.headers.get('Origin', '*')
        res['Access-Control-Allow-Origin'] = origin
        res['Access-Control-Allow-Methods'] = 'GET, POST, PATCH, OPTIONS'
        res['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, X-CSRFToken, X-Requested-With'
        res['Access-Control-Allow-Credentials'] = 'true'
        return res
    if request.method not in ['GET', 'POST', 'PATCH']:
        return JsonResponse({'message': f'Method {request.method} not allowed'}, status=405)
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Account Error: No school admin profile found for this user.'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'Server Error: {str(e)}'}, status=500)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method in ['POST', 'PATCH']:
        # Support both FormData and JSON
        data = request.POST if request.POST else {}
        if not data and request.body:
             try: data = json.loads(request.body)
             except: data = {}

        # Profile fields
        school.phone = data.get('phone', school.phone)
        school.address = data.get('address', school.address)
        school.city = data.get('city', school.city)
        school.country = data.get('country', school.country)
        school.brand_colors = data.get('brand_colors', school.brand_colors)

        # File uploads
        badge = request.FILES.get('badge')
        if badge:
            school.badge = badge
        elif data.get('remove_badge') == 'true':
            school.badge = None

        school.save()
        return JsonResponse({
            'success': True,
            'message': 'School profile updated successfully.',
            'school': {
                'id': school.id,
                'name': school.name,
                'brand_colors': school.brand_colors,
                'badge': request.build_absolute_uri(school.badge.url) if school.badge else None,
            }
        })

    student_count = Student.objects.filter(school=school, is_active=True).count()
    teacher_count = Teacher.objects.filter(school=school, is_active=True).count()
    class_count   = ClassRoom.objects.filter(school=school, is_active=True).count()
    subject_count = Subject.objects.filter(school=school, is_active=True).count()
    active_year   = AcademicYear.objects.filter(school=school, is_active=True).first()

    # Live attendance rate — today's records for this school
    today = timezone.now().date()
    today_att = Attendance.objects.filter(school=school, date=today)
    total_att = today_att.count()
    present_att = today_att.filter(status__in=['present', 'late']).count()
    attendance_rate = round(present_att / total_att * 100) if total_att else 0

    # Average grade performance across all grades in the school
    from django.db.models import Avg
    avg_perf_qs = Grade.objects.filter(student__school=school).aggregate(avg=Avg('total_score'))
    avg_performance = round(float(avg_perf_qs['avg'] or 0), 1)

    # Finance stats
    from django.db.models import Sum
    fees_collected  = float(FeeRecord.objects.filter(school=school, status__in=['paid','partial']).aggregate(s=Sum('amount_paid'))['s'] or 0)
    fees_outstanding = float(FeeRecord.objects.filter(school=school, status__in=['pending','partial','overdue']).aggregate(s=Sum('amount') - Sum('amount_paid'))['s'] or 0)

    # Verify the badge file actually exists on disk before exposing a URL.
    # On ephemeral storage (Render free tier, etc.) uploaded files can vanish
    # across restarts; we don't want the dashboard to render a 404 image.
    badge_url = ''
    badge_missing = False
    if school.badge:
        try:
            try:
                exists = school.badge.storage.exists(school.badge.name)
            except Exception:
                exists = True  # fall back to optimistic
            if exists:
                badge_url = request.build_absolute_uri(school.badge.url)
            else:
                badge_missing = True
                import logging
                logging.getLogger('django').warning(
                    f'School badge file missing on disk for school={school.code} '
                    f'(name={school.badge.name}); returning empty URL.'
                )
        except Exception:
            badge_url = ''

    return JsonResponse({
        'success': True,
        'id': school.id,
        'name': school.name,
        'code': school.code,
        'email': school.email,
        'phone': school.phone or '',
        'address': school.address or '',
        'city': school.city or '',
        'country': school.country or '',
        'badge': badge_url,
        'badge_missing': badge_missing,
        'is_approved': school.is_approved,
        'total_students': student_count,
        'total_teachers': teacher_count,
        'active_classes': class_count,
        'subject_count': subject_count,
        'attendance_rate': attendance_rate,
        'avg_performance': avg_performance,
        'pending_actions': 0,
        'fees_collected': fees_collected,
        'fees_outstanding': max(fees_outstanding, 0),
        'academic_year': active_year.name if active_year else None,
        'brand_colors': school.brand_colors,
    })


# ── Students ─────────────────────────────────────────────────────

def _generate_admission_number(school):
    """
    Returns the next available admission number for the school.
    Format: {SCHOOL_CODE}/{YEAR}/{SEQ:04d}   e.g. GBHS/2026/0042
    Seq is 1-indexed from the total number of students ever registered.
    """
    year = timezone.now().year
    seq  = Student.objects.filter(school=school).count() + 1
    adm  = f"{school.code.upper()}/{year}/{seq:04d}"
    while Student.objects.filter(school=school, admission_number=adm).exists():
        seq += 1
        adm  = f"{school.code.upper()}/{year}/{seq:04d}"
    return adm


@csrf_exempt
def api_student_next_admission(request):
    """GET: return the next auto-generated admission number for the school."""
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    return JsonResponse({'success': True, 'admission_number': _generate_admission_number(school)})


@csrf_exempt
def api_student_check_duplicate(request):
    """GET ?first_name=&last_name=&date_of_birth= — returns {exists, student?} for duplicate detection."""
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    first_name    = request.GET.get('first_name', '').strip()
    last_name     = request.GET.get('last_name', '').strip()
    date_of_birth = request.GET.get('date_of_birth', '').strip()

    if not first_name or not last_name:
        return JsonResponse({'success': True, 'exists': False})

    qs = Student.objects.filter(
        school=school,
        user__first_name__iexact=first_name,
        user__last_name__iexact=last_name,
    ).select_related('user')

    if date_of_birth:
        try:
            qs = qs.filter(date_of_birth=date_of_birth)
        except Exception:
            pass

    student = qs.first()
    if student:
        return JsonResponse({
            'success': True, 'exists': True,
            'student': {
                'id':               student.id,
                'full_name':        student.user.get_full_name(),
                'date_of_birth':    str(student.date_of_birth) if student.date_of_birth else None,
                'admission_number': student.admission_number,
            },
        })
    return JsonResponse({'success': True, 'exists': False})


@csrf_exempt
def api_students(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    except SchoolAdmin.MultipleObjectsReturned:
        return JsonResponse({'success': False,
                             'message': 'Account error: this user is linked to multiple schools. Contact support.'},
                            status=409)
    except Exception as exc:
        import logging, traceback
        logging.getLogger('django').error(
            f'api_students resolver failed: {exc}\n{traceback.format_exc()}'
        )
        return JsonResponse({'success': False,
                             'message': f'Account lookup failed: {type(exc).__name__}: {exc}'},
                            status=500)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    if not school:
        return JsonResponse({'success': False,
                             'message': 'Your account has no school assigned. Contact support.'},
                            status=403)

    if request.method == 'GET':
        # Wrap the entire GET path so any exception (DB / serializer /
        # missing migration) returns a real error message instead of a
        # generic 500. Also logs the traceback to the django logger so
        # we can find it in Render's logs.
        try:
            from django.db.models import Q as _Q
            qs = Student.objects.filter(school=school, is_active=True)\
                .select_related('user', 'classroom')\
                .prefetch_related('attendance', 'grades', 'parent_links')
            q            = request.GET.get('q', '').strip()
            at_risk      = request.GET.get('at_risk', '')
            classroom_id = request.GET.get('classroom_id', '')
            if q:
                qs = qs.filter(
                    _Q(user__first_name__icontains=q) |
                    _Q(user__last_name__icontains=q) |
                    _Q(admission_number__icontains=q)
                )
            if classroom_id:
                try:
                    qs = qs.filter(classroom_id=int(classroom_id))
                except (ValueError, TypeError):
                    pass

            data = []
            for s in qs:
                # Per-row defensive: a single broken Student record (e.g. NULL
                # user FK from bad data) shouldn't kill the whole list.
                try:
                    att_all   = list(s.attendance.all())
                    total_att = len(att_all)
                    present_c = sum(1 for a in att_all if a.status in ('present', 'late', 'excused'))
                    att_rate  = round((present_c / total_att) * 100, 1) if total_att > 0 else None
                    scores    = [float(g.total_score) for g in s.grades.all()]
                    avg_grade = round(sum(scores) / len(scores), 1) if scores else None
                    is_flagged = (att_rate is not None and att_rate < 70) or (avg_grade is not None and avg_grade < 50)
                    # passport_picture URL building can fail when storage backend
                    # returns a value but the underlying file is missing (broken
                    # symlink, S3 bucket unreachable, etc.). Don't 500 the whole
                    # list because of a missing image.
                    try:
                        stu_pic = request.build_absolute_uri(s.passport_picture.url) if s.passport_picture else ''
                    except (ValueError, OSError, Exception):
                        stu_pic = ''

                    data.append({
                        'id':               s.id,
                        'user_id':          s.user_id,
                        'username':         s.user.username if s.user_id else '',
                        'admission_number': s.admission_number,
                        'first_name':       s.user.first_name if s.user_id else '',
                        'last_name':        s.user.last_name if s.user_id else '',
                        'full_name':        s.user.get_full_name() if s.user_id else '',
                        'passport_picture': stu_pic,
                        'gender':           s.gender,
                        'email':            s.user.email if s.user_id else '',
                        'classroom':        s.classroom.name if s.classroom_id else None,
                        'classroom_id':     s.classroom_id,
                        'date_of_birth':    str(s.date_of_birth) if s.date_of_birth else None,
                        'phone_number':     s.phone_number,
                        'admission_date':   str(s.admission_date) if s.admission_date else None,
                        'attendance_rate':  att_rate,
                        'avg_grade':        avg_grade,
                        'parent_count':     s.parent_links.count(),
                        'is_flagged':       is_flagged,
                        'disciplinary_history': s.disciplinary_history,
                        'disciplinary_notes': s.disciplinary_notes,
                    })
                except Exception as row_exc:
                    import logging
                    logging.getLogger('django').error(
                        f'Skipping broken Student row id={s.id}: {row_exc}'
                    )
                    continue

            if at_risk:
                data = [d for d in data if d['is_flagged']]

            return JsonResponse({'success': True, 'students': data, 'count': len(data)})
        except Exception as exc:
            import logging, traceback
            logging.getLogger('django').error(
                f'api_students GET failed for school={school.id}: {exc}\n{traceback.format_exc()}'
            )
            return JsonResponse({
                'success': False,
                'message': f'Failed to load students: {type(exc).__name__}: {exc}',
            }, status=500)

    if request.method == 'POST':
        body = _get_request_data(request)

        first_name       = body.get('first_name', '').strip()
        last_name        = body.get('last_name', '').strip()
        email            = body.get('email', '').strip()
        admission_number = body.get('admission_number', '').strip()
        classroom_id     = body.get('classroom_id')
        date_of_birth    = body.get('date_of_birth') or None
        phone_number     = body.get('phone_number', '')
        gender           = body.get('gender', '')
        # Normalize: frontend sends 'Male'/'Female'/'Other', model expects 'M'/'F'/'O'
        if gender.lower() == 'male':
            gender = 'M'
        elif gender.lower() == 'female':
            gender = 'F'
        elif gender.lower() == 'other':
            gender = 'O'
        elif gender not in ('M', 'F', 'O', ''):
            gender = ''
        passport_picture     = request.FILES.get('passport_picture') or request.FILES.get('profile_photo')
        document_type        = body.get('document_type', '').strip()
        document_file        = request.FILES.get('document_file')
        disciplinary_history = _parse_bool(body.get('disciplinary_history', False))
        disciplinary_notes   = body.get('disciplinary_notes', '').strip()

        blood_type    = (body.get('blood_group') or body.get('blood_type') or '').strip()
        allergies     = body.get('allergies', '').strip()
        medical_notes = (body.get('medical_conditions') or body.get('medical_notes') or '').strip()
        status        = body.get('status', 'active').strip()
        if status not in ('active', 'suspended', 'transferred', 'graduated'):
            status = 'active'

        student_type  = body.get('student_type', 'day').strip().lower()
        if student_type not in ('day', 'boarding'):
            student_type = 'day'
        fee_category  = body.get('fee_category', '').strip()
        if fee_category not in ('full_paying', 'partial_scholarship', 'full_scholarship', 'government_sponsored', 'bursary', ''):
            fee_category = ''
        home_language     = body.get('home_language', '').strip()
        enrollment_date_str = body.get('enrollment_date', '').strip() or None
        intake_term = body.get('intake_term', '').strip()
        if intake_term not in ('TERM1', 'TERM2', 'TERM3', ''):
            intake_term = ''
        is_repeater        = _parse_bool(body.get('is_repeater', 'false'))
        father_whatsapp    = body.get('father_whatsapp', '').strip()
        mother_whatsapp    = body.get('mother_whatsapp', '').strip()
        father_existing_id = body.get('father_existing_id', '').strip()
        mother_existing_id  = body.get('mother_existing_id', '').strip()
        middle_name         = body.get('middle_name', '').strip()
        hostel_house        = body.get('hostel_house', '').strip()
        transport_route     = body.get('transport_route', '').strip()
        sen_notes           = body.get('sen_notes', '').strip()
        sen_iep             = _parse_bool(body.get('sen_iep', 'false'))
        place_of_birth       = body.get('place_of_birth', '').strip()
        nationality          = body.get('nationality', '').strip()
        religion             = body.get('religion', '').strip()
        home_address         = body.get('home_address', '').strip()
        city                 = body.get('city', '').strip()
        previous_school      = body.get('previous_school', '').strip()
        last_class_completed = body.get('last_class_completed', '').strip()
        leaving_reason       = body.get('leaving_reason', '').strip()
        emergency_name         = body.get('emergency_name', '').strip()
        emergency_relationship = body.get('emergency_relationship', '').strip()
        emergency_phone        = body.get('emergency_phone', '').strip()
        emergency_address      = body.get('emergency_address', '').strip()
        doctor_name          = body.get('doctor_name', '').strip()
        doctor_phone         = body.get('doctor_phone', '').strip()
        documents_birth_certificate      = _parse_bool(body.get('documents_birth_certificate', False))
        documents_passport_photo         = _parse_bool(body.get('documents_passport_photo', False))
        documents_previous_school_report = _parse_bool(body.get('documents_previous_school_report', False))
        documents_transfer_letter        = _parse_bool(body.get('documents_transfer_letter', False))
        documents_medical_report         = _parse_bool(body.get('documents_medical_report', False))
        documents_other                  = _parse_bool(body.get('documents_other', False))
        father_relationship = body.get('father_relationship', 'Father').strip()
        mother_relationship = body.get('mother_relationship', 'Mother').strip()
        _valid_rels = (
            'Father', 'Mother', 'Guardian', 'Stepfather', 'Stepmother',
            'Grandfather', 'Grandmother', 'Uncle', 'Aunt', 'Sibling',
            'Grandparent', 'Legal Guardian', 'Other',
        )
        if father_relationship not in _valid_rels:
            father_relationship = 'Father'
        if mother_relationship not in _valid_rels:
            mother_relationship = 'Mother'

        father_name      = body.get('father_name', '').strip()
        father_email     = body.get('father_email', '').strip()
        father_phone     = body.get('father_phone', '').strip()
        father_occupation = body.get('father_occupation', '').strip()
        father_username  = body.get('father_username', '').strip()
        father_password  = body.get('father_password', '').strip()

        mother_name      = body.get('mother_name', '').strip()
        mother_email     = body.get('mother_email', '').strip()
        mother_phone     = body.get('mother_phone', '').strip()
        mother_occupation = body.get('mother_occupation', '').strip()
        mother_username  = body.get('mother_username', '').strip()
        mother_password  = body.get('mother_password', '').strip()

        parent_primary_contact = body.get('parent_primary_contact')
        try:
            primary_contact = _parse_bool(parent_primary_contact)
        except Exception:
            primary_contact = False

        if not first_name or not last_name:
            return JsonResponse({'success': False, 'message': 'first_name and last_name are required.'}, status=400)

        # Always guarantee a unique admission number server-side.
        # If the client-supplied one is already taken (race condition / orphaned record),
        # silently generate the next available one rather than returning a 400.
        if not admission_number or Student.objects.filter(school=school, admission_number=admission_number).exists():
            admission_number = _generate_admission_number(school)

        # Accept a custom student password; default to admission number
        student_password = body.get('student_password', '').strip() or admission_number

        # Build a clean slug username from the admission number (strip all non-alnum)
        adm_slug         = re.sub(r'[^a-z0-9]', '', admission_number.lower())
        student_username = f"stu_{adm_slug}"[:148]
        base_uname       = student_username
        counter          = 0
        while User.objects.filter(username=student_username).exists():
            counter       += 1
            student_username = f"{base_uname}_{uuid.uuid4().hex[:4]}"

        student_user = User.objects.create_user(
            username=student_username, email=email,
            first_name=first_name, last_name=last_name,
            password=student_password,
        )

        classroom = None
        if classroom_id:
            try:
                classroom = ClassRoom.objects.get(id=classroom_id, school=school)
            except ClassRoom.DoesNotExist:
                pass

        active_year = AcademicYear.objects.filter(school=school, is_active=True).first()
        student = Student.objects.create(
            school=school, user=student_user, admission_number=admission_number,
            classroom=classroom, academic_year=active_year,
            date_of_birth=date_of_birth, phone_number=phone_number,
            gender=gender,
            passport_picture=passport_picture if passport_picture else None,
            disciplinary_history=disciplinary_history,
            disciplinary_notes=disciplinary_notes if disciplinary_history else '',
            blood_type=blood_type, allergies=allergies, medical_notes=medical_notes,
            status=status,
            student_type=student_type, fee_category=fee_category, home_language=home_language,
            intake_term=intake_term, is_repeater=is_repeater,
            middle_name=middle_name, hostel_house=hostel_house,
            transport_route=transport_route, sen_notes=sen_notes, sen_iep=sen_iep,
            place_of_birth=place_of_birth, nationality=nationality, religion=religion,
            home_address=home_address, city=city,
            previous_school=previous_school, last_class_completed=last_class_completed,
            leaving_reason=leaving_reason,
            emergency_name=emergency_name, emergency_relationship=emergency_relationship,
            emergency_phone=emergency_phone, emergency_address=emergency_address,
            doctor_name=doctor_name, doctor_phone=doctor_phone,
            documents_birth_certificate=documents_birth_certificate,
            documents_passport_photo=documents_passport_photo,
            documents_previous_school_report=documents_previous_school_report,
            documents_transfer_letter=documents_transfer_letter,
            documents_medical_report=documents_medical_report,
            documents_other=documents_other,
            **(dict(admission_date=enrollment_date_str) if enrollment_date_str else {}),
        )

        if document_file:
            if not document_type:
                return JsonResponse({'success': False, 'message': 'Document type is required when uploading a document.'}, status=400)
            if not _is_valid_document_file(document_file):
                return JsonResponse({'success': False, 'message': 'Only PDF and DOC/DOCX documents are allowed.'}, status=400)
            doc, created = StudentDocument.objects.get_or_create(
                student=student,
                document_type=document_type,
                defaults={'file': document_file}
            )
            if not created:
                doc.file = document_file
                doc.save(update_fields=['file'])

        def _create_parent(name, email, phone, occupation, username, password, relationship, is_primary, existing_id='', whatsapp=''):
            if existing_id:
                try:
                    parent = Parent.objects.get(id=int(existing_id), school=school)
                    ParentStudent.objects.get_or_create(
                        parent=parent, student=student,
                        defaults={'is_primary_contact': is_primary, 'relationship_type': relationship},
                    )
                    if whatsapp and not parent.whatsapp_number:
                        parent.whatsapp_number = whatsapp
                        parent.save(update_fields=['whatsapp_number'])
                    return {'username': parent.user.username, 'email': parent.user.email, 'password': None}
                except (Parent.DoesNotExist, ValueError):
                    pass
            if not name and not email and not phone and not username:
                return None

            full_name = name.strip() if name else ''
            first, last = '', ''
            if full_name:
                parts = full_name.split()
                first = parts[0]
                last = ' '.join(parts[1:]) if len(parts) > 1 else ''

            if username:
                username = re.sub(r'[^a-z0-9_]', '_', username.strip().lower())
            if not username and email:
                username = re.sub(r'[^a-z0-9_]', '_', email.split('@')[0].strip().lower())
            if not username:
                username = f"parent_{school.code}_{admission_number}_{relationship[:3]}".lower()
                username = re.sub(r'[^a-z0-9_]', '_', username)

            original_username = username
            counter = 0
            while User.objects.filter(username=username).exists():
                counter += 1
                username = f"{original_username}_{uuid.uuid4().hex[:4]}"

            parent = None
            if email:
                existing_user = User.objects.filter(email=email).first()
                if existing_user and not hasattr(existing_user, 'parent_profile'):
                    return {'error': f'Email {email} is already used by another account.'}
                if existing_user and hasattr(existing_user, 'parent_profile'):
                    user = existing_user
                    parent = existing_user.parent_profile
                else:
                    if not password:
                        password = uuid.uuid4().hex[:10]
                    user = User.objects.create_user(
                        username=username, email=email,
                        first_name=first, last_name=last,
                        password=password,
                    )
            else:
                if not password:
                    password = uuid.uuid4().hex[:10]
                user = User.objects.create_user(
                    username=username, email=email or '',
                    first_name=first, last_name=last,
                    password=password,
                )

            if not parent:
                parent = Parent.objects.create(
                    school=school,
                    user=user,
                    phone_number=phone or '',
                    whatsapp_number=whatsapp or '',
                    relationship=relationship,
                    occupation=occupation or '',
                )
            ParentStudent.objects.create(parent=parent, student=student, is_primary_contact=is_primary, relationship_type=relationship)

            if email:
                subject = 'Your parent login for EK-SMS'
                html_content = (
                    f'<p>Hello {user.get_full_name() or "Parent"},</p>'
                    f'<p>Your child <strong>{student_user.get_full_name()}</strong> has been registered at <strong>{school.name}</strong>.</p>'
                    f'<p>Use the credentials below to log in to the parent portal:</p>'
                    f'<ul><li><strong>Username</strong>: {user.username}</li>'
                    f'<li><strong>Password</strong>: {password}</li></ul>'
                    f'<p>Login here: <a href="{request.build_absolute_uri("/login")}">{request.build_absolute_uri("/login")}</a></p>'
                    '<p>Please change your password after first login.</p>'
                )
                _send_notification_email(subject, email, html_content)

            return {'username': user.username, 'email': user.email, 'password': password if email else None}

        created_parents = []
        parent_warnings = []

        try:
            father_result = _create_parent(
                father_name, father_email, father_phone, father_occupation,
                father_username, father_password, father_relationship, bool(primary_contact or not mother_name),
                existing_id=father_existing_id, whatsapp=father_whatsapp,
            )
            if father_result:
                if isinstance(father_result, dict) and father_result.get('error'):
                    parent_warnings.append(father_result['error'])
                else:
                    created_parents.append({'relationship': 'Father', **father_result})
        except Exception as exc:
            parent_warnings.append(f'Guardian 1 could not be created: {exc}')

        try:
            mother_result = _create_parent(
                mother_name, mother_email, mother_phone, mother_occupation,
                mother_username, mother_password, mother_relationship, False if created_parents else True,
                existing_id=mother_existing_id, whatsapp=mother_whatsapp,
            )
            if mother_result:
                if isinstance(mother_result, dict) and mother_result.get('error'):
                    parent_warnings.append(mother_result['error'])
                else:
                    created_parents.append({'relationship': 'Mother', **mother_result})
        except Exception as exc:
            parent_warnings.append(f'Guardian 2 could not be created: {exc}')

        # Email the student their login credentials if email was provided
        if email:
            _send_notification_email(
                f'Welcome to {school.name} — Your Student Portal Credentials',
                email,
                (
                    f'<p>Hello <strong>{first_name}</strong>,</p>'
                    f'<p>Your student account has been created at <strong>{school.name}</strong>.</p>'
                    f'<p>Use the details below to access the <strong>Student Portal</strong>:</p>'
                    f'<table style="border-collapse:collapse;margin:12px 0">'
                    f'<tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600">Admission No.</td>'
                    f'<td style="padding:6px 12px">{admission_number}</td></tr>'
                    f'<tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600">Username</td>'
                    f'<td style="padding:6px 12px">{student_username}</td></tr>'
                    f'<tr><td style="padding:6px 12px;background:#f3f4f6;font-weight:600">Password</td>'
                    f'<td style="padding:6px 12px">{student_password}</td></tr>'
                    f'</table>'
                    f'<p style="color:#dc2626"><strong>Please change your password after your first login.</strong></p>'
                ),
            )

        _log_security_event(
            'student_created',
            f'{actor.username} enrolled student {student.admission_number} ({student_user.get_full_name()})',
            severity='info', actor=actor,
            ip=request.META.get('REMOTE_ADDR'),
            metadata={'student_id': student.id, 'classroom_id': student.classroom_id},
        )
        response_data = {
            'success': True,
            'message': 'Student added.',
            'id':                    student.id,
            'full_name':             student_user.get_full_name(),
            'admission_number':      student.admission_number,
            'student_username':      student_username,
            'student_initial_password': student_password,
            'parents':               created_parents,
            'parent_warnings':       parent_warnings,
        }
        return JsonResponse(response_data, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_student_detail(request, student_id):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        student = Student.objects.select_related('user', 'classroom').get(id=student_id, school=school)
    except Student.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Student not found.'}, status=404)

    if request.method == 'GET':
        # Attendance rate
        att_all   = list(student.attendance.all())
        total_att = len(att_all)
        present_c = sum(1 for a in att_all if a.status in ('present', 'late', 'excused'))
        att_rate  = round((present_c / total_att) * 100, 1) if total_att > 0 else None
        # Grades with subject + term
        grades_data = [{
            'subject':      g.subject.name,
            'grade_letter': g.grade_letter,
            'total_score':  float(g.total_score),
            'term':         g.term.name,
        } for g in student.grades.select_related('subject', 'term').order_by('-term__start_date', 'subject__name')]
        scores    = [g['total_score'] for g in grades_data]
        avg_grade = round(sum(scores) / len(scores), 1) if scores else None
        # Parents
        parents_data = [{
            'id':           link.parent.id,
            'full_name':    link.parent.user.get_full_name(),
            'relationship': link.parent.relationship,
            'phone':        link.parent.phone_number,
            'email':        link.parent.user.email,
            'is_primary':   link.is_primary_contact,
        } for link in student.parent_links.select_related('parent__user').order_by('-is_primary_contact')]
        is_flagged = (att_rate is not None and att_rate < 70) or (avg_grade is not None and avg_grade < 50)
        stu_pic_url = request.build_absolute_uri(student.passport_picture.url) if student.passport_picture else ''
        return JsonResponse({
            'success':          True,
            'id':               student.id,
            'admission_number': student.admission_number,
            'first_name':       student.user.first_name,
            'last_name':        student.user.last_name,
            'full_name':        student.user.get_full_name(),
            'email':            student.user.email,
            'classroom':        student.classroom.name if student.classroom else None,
            'classroom_id':     student.classroom_id,
            'date_of_birth':    str(student.date_of_birth) if student.date_of_birth else None,
            'phone_number':     student.phone_number,
            'gender':           student.gender,
            'blood_type':       student.blood_type,
            'allergies':        student.allergies,
            'medical_notes':    student.medical_notes,
            'passport_picture': stu_pic_url,
            'admission_date':   str(student.admission_date),
            'attendance_rate':  att_rate,
            'avg_grade':        avg_grade,
            'is_flagged':       is_flagged,
            'disciplinary_history': student.disciplinary_history,
            'disciplinary_notes': student.disciplinary_notes,
            'middle_name':       student.middle_name,
            'place_of_birth':    student.place_of_birth,
            'nationality':       student.nationality,
            'religion':          student.religion,
            'home_address':      student.home_address,
            'city':              student.city,
            'student_type':      student.student_type,
            'hostel_house':      student.hostel_house,
            'transport_route':   student.transport_route,
            'previous_school':   student.previous_school,
            'last_class_completed': student.last_class_completed,
            'leaving_reason':    student.leaving_reason,
            'status':            student.status,
            'fee_category':      student.fee_category,
            'home_language':     student.home_language,
            'intake_term':       student.intake_term,
            'is_repeater':       student.is_repeater,
            'emergency_name':    student.emergency_name,
            'emergency_relationship': student.emergency_relationship,
            'emergency_phone':   student.emergency_phone,
            'emergency_address': student.emergency_address,
            'doctor_name':       student.doctor_name,
            'doctor_phone':      student.doctor_phone,
            'sen_notes':         student.sen_notes,
            'sen_iep':           student.sen_iep,
            'documents_birth_certificate':      student.documents_birth_certificate,
            'documents_passport_photo':         student.documents_passport_photo,
            'documents_previous_school_report': student.documents_previous_school_report,
            'documents_transfer_letter':        student.documents_transfer_letter,
            'documents_medical_report':         student.documents_medical_report,
            'documents_other':                  student.documents_other,
            'grades':           grades_data,
            'parents':          parents_data,
            'documents': [
                {
                    'id': doc.id,
                    'document_type': doc.document_type,
                    'file_url': request.build_absolute_uri(doc.file.url) if doc.file else None,
                    'uploaded_at': str(doc.uploaded_at),
                } for doc in student.documents.all()
            ],
        })

    if request.method == 'PUT':
        # Accept both multipart (with file) and JSON (without file)
        if request.content_type and 'multipart' in request.content_type:
            data = request.POST
            passport_picture = request.FILES.get('passport_picture') or request.FILES.get('profile_photo')
        else:
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
            passport_picture = None

        u = student.user
        u.first_name = data.get('first_name', u.first_name)
        u.last_name  = data.get('last_name', u.last_name)
        u.email      = data.get('email', u.email)
        u.save(update_fields=['first_name', 'last_name', 'email'])

        if 'classroom_id' in data:
            cid = data['classroom_id']
            try:
                student.classroom = ClassRoom.objects.get(id=cid, school=school) if cid else None
            except ClassRoom.DoesNotExist:
                pass

        if 'date_of_birth' in data:
            student.date_of_birth = data['date_of_birth'] or None
        if 'phone_number' in data:
            student.phone_number = data['phone_number']
        if 'gender' in data:
            g = data['gender']
            if g.lower() == 'male':
                g = 'M'
            elif g.lower() == 'female':
                g = 'F'
            elif g.lower() == 'other':
                g = 'O'
            elif g not in ('M', 'F', 'O', ''):
                g = ''
            student.gender = g
        if 'blood_type' in data or 'blood_group' in data:
            student.blood_type = (data.get('blood_type') or data.get('blood_group') or '').strip()
        if 'allergies' in data:
            student.allergies = data['allergies']
        if 'medical_notes' in data or 'medical_conditions' in data:
            student.medical_notes = (data.get('medical_notes') or data.get('medical_conditions') or '').strip()
        if 'disciplinary_history' in data:
            student.disciplinary_history = _parse_bool(data['disciplinary_history'])
            if not student.disciplinary_history:
                student.disciplinary_notes = ''
        if 'disciplinary_notes' in data:
            student.disciplinary_notes = data['disciplinary_notes'].strip()
        if 'status' in data:
            _st = str(data['status']).strip()
            if _st in ('active', 'suspended', 'transferred', 'graduated'):
                student.status = _st
                student.is_active = _st in ('active', 'suspended')
        if 'student_type' in data:
            _stype = str(data['student_type']).strip().lower()
            if _stype in ('day', 'boarding', ''):
                student.student_type = _stype
        if 'is_repeater' in data:
            student.is_repeater = _parse_bool(data['is_repeater'])
        if 'fee_category' in data:
            _fc = str(data['fee_category']).strip()
            if _fc in ('full_paying', 'partial_scholarship', 'full_scholarship', 'government_sponsored', 'bursary', ''):
                student.fee_category = _fc
        if 'intake_term' in data:
            _it = str(data['intake_term']).strip()
            if _it in ('TERM1', 'TERM2', 'TERM3', ''):
                student.intake_term = _it
        _enroll = (data.get('enrollment_date') or data.get('admission_date') or '').strip() if hasattr(data, 'get') else ''
        if _enroll:
            try:
                student.admission_date = _enroll
            except Exception:
                pass
        for _f in ('place_of_birth', 'nationality', 'religion', 'home_address', 'city',
                   'previous_school', 'last_class_completed', 'leaving_reason',
                   'emergency_name', 'emergency_relationship', 'emergency_phone', 'emergency_address',
                   'doctor_name', 'doctor_phone',
                   'middle_name', 'hostel_house', 'transport_route', 'sen_notes',
                   'home_language'):
            if _f in data:
                setattr(student, _f, str(data[_f]).strip())
        if 'sen_iep' in data:
            student.sen_iep = _parse_bool(data['sen_iep'])
        for _doc in ('documents_birth_certificate', 'documents_passport_photo',
                     'documents_previous_school_report', 'documents_transfer_letter',
                     'documents_medical_report', 'documents_other'):
            if _doc in data:
                setattr(student, _doc, _parse_bool(data[_doc]))
        if passport_picture:
            student.passport_picture = passport_picture

        document_type    = data.get('document_type', '').strip()
        document_file    = request.FILES.get('document_file')
        if document_file:
            if not document_type:
                return JsonResponse({'success': False, 'message': 'Document type is required when uploading a document.'}, status=400)
            if not _is_valid_document_file(document_file):
                return JsonResponse({'success': False, 'message': 'Only PDF and DOC/DOCX documents are allowed.'}, status=400)
            doc, created = StudentDocument.objects.get_or_create(
                student=student,
                document_type=document_type,
                defaults={'file': document_file}
            )
            if not created:
                doc.file = document_file
                doc.save(update_fields=['file'])

        student.save()
        return JsonResponse({'success': True, 'message': 'Student updated.'})

    if request.method == 'DELETE':
        student.is_active = False
        student.save(update_fields=['is_active'])
        return JsonResponse({'success': True, 'message': 'Student removed.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_parent_students(request):
    actor = _get_authed_user(request)
    if not actor or not hasattr(actor, 'parent_profile'):
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    parent = actor.parent_profile
    links = ParentStudent.objects.filter(parent=parent, student__is_active=True).select_related('student__user', 'student__classroom')

    children = []
    for link in links:
        student = link.student
        children.append({
            'id': student.id,
            'full_name': student.user.get_full_name(),
            'admission_number': student.admission_number,
            'classroom': student.classroom.name if student.classroom else None,
            'date_of_birth': str(student.date_of_birth) if student.date_of_birth else None,
            'phone_number': student.phone_number,
            'email': student.user.email,
            'is_primary_contact': link.is_primary_contact,
            'relationship_type':  link.relationship_type,
        })

    return JsonResponse({'success': True, 'children': children}, status=200)


# ── Teachers ─────────────────────────────────────────────────────

@csrf_exempt
def api_teachers(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        from django.db.models import Q, Count
        qs = Teacher.objects.filter(school=school, is_active=True)\
            .select_related('user')\
            .prefetch_related(
                'subject_classes__subject',
                'subject_classes__classroom',
                'subject_classes__classroom__students',
            )
        q = request.GET.get('q', '').strip()
        if q:
            qs = qs.filter(
                Q(user__first_name__icontains=q) |
                Q(user__last_name__icontains=q) |
                Q(employee_id__icontains=q)
            )
        overloaded_filter = request.GET.get('overloaded', '')
        data = []
        for t in qs:
            active_tscs = [tsc for tsc in t.subject_classes.all() if tsc.is_active]
            periods     = len(active_tscs)
            subjects    = list({tsc.subject.name for tsc in active_tscs})
            classes     = list({tsc.classroom.name for tsc in active_tscs})
            student_cnt = sum(
                tsc.classroom.students.filter(is_active=True).count()
                for tsc in active_tscs
            )
            is_overloaded = periods > 20
            if overloaded_filter == '1' and not is_overloaded:
                continue
            pic_url = request.build_absolute_uri(t.profile_picture.url) if t.profile_picture else ''
            data.append({
                'id': t.id,
                'user_id':   t.user_id,
                'username':  t.user.username,
                'employee_id': t.employee_id,
                'first_name': t.user.first_name, 'last_name': t.user.last_name,
                'full_name': t.user.get_full_name(), 'email': t.user.email,
                'phone_number': t.phone_number, 'qualification': t.qualification,
                'hire_date': str(t.hire_date),
                'profile_picture': pic_url,
                'subjects': subjects, 'classes': classes,
                'periods_per_week': periods, 'student_count': student_cnt,
                'is_overloaded': is_overloaded,
                'years_experience': t.years_experience,
                'degrees':        t.degrees or [],
                'certifications': t.certifications or [],
            })
        return JsonResponse({'success': True, 'teachers': data, 'count': len(data)})

    if request.method == 'POST':
        first_name      = request.POST.get('first_name', '').strip()
        last_name       = request.POST.get('last_name', '').strip()
        email           = request.POST.get('email', '').strip()
        employee_id     = request.POST.get('employee_id', '').strip()
        phone_number    = request.POST.get('phone_number', '')
        qualification   = request.POST.get('qualification', '')
        password        = request.POST.get('password', '').strip()
        profile_picture = request.FILES.get('profile_picture')
        
        # Parse class assignments from POST data
        import json
        assignments_json = request.POST.get('class_assignments', '[]')
        try:
            class_assignments = json.loads(assignments_json) if assignments_json else []
        except json.JSONDecodeError:
            class_assignments = []
        
        if not first_name or not last_name or not employee_id:
            return JsonResponse({'success': False, 'message': 'first_name, last_name, and employee_id are required.'}, status=400)
        if not password:
            return JsonResponse({'success': False, 'message': 'password is required so the teacher can log in.'}, status=400)
        if Teacher.objects.filter(school=school, employee_id=employee_id).exists():
            return JsonResponse({'success': False, 'message': 'Employee ID already exists.'}, status=400)
        username = f"tch_{school.code}_{employee_id}".lower().replace(' ', '_')[:150]
        if User.objects.filter(username=username).exists():
            username = f"{username}_{uuid.uuid4().hex[:4]}"
        user = User.objects.create_user(
            username=username, email=email,
            first_name=first_name, last_name=last_name,
            password=password,
        )
        teacher = Teacher.objects.create(
            school=school, user=user, employee_id=employee_id,
            phone_number=phone_number, qualification=qualification,
            must_change_password=True,
            **(({'profile_picture': profile_picture}) if profile_picture else {}),
        )
        
        # Create class/subject assignments if provided
        created_assignments = []
        if class_assignments:
            # Get the current academic year
            current_year = AcademicYear.objects.filter(school=school, is_active=True).first()
            
            for assignment in class_assignments:
                subject_id = assignment.get('subject_id')
                classroom_id = assignment.get('classroom_id')
                
                if subject_id and classroom_id and current_year:
                    try:
                        subject = Subject.objects.get(id=subject_id, school=school)
                        classroom = ClassRoom.objects.get(id=classroom_id, school=school)
                        tsc = TeacherSubjectClass.objects.create(
                            teacher=teacher,
                            subject=subject,
                            classroom=classroom,
                            academic_year=current_year,
                            is_active=True
                        )
                        created_assignments.append({
                            'subject_name': subject.name,
                            'class_name': classroom.name
                        })
                    except (Subject.DoesNotExist, ClassRoom.DoesNotExist) as e:
                        # Skip invalid assignments
                        pass
        
        email_sent = False
        if email:
            html_content = (
                f'<p>Hello {user.get_full_name()},</p>'
                f'<p>Your teacher account has been created at <strong>{school.name}</strong>.</p>'
                f'<p>Login credentials:</p>'
                f'<ul><li><strong>Username:</strong> {username}</li>'
                f'<li><strong>Password:</strong> {password}</li></ul>'
                f'<p>You will be required to change your password on first login.</p>'
            )
            try:
                _send_notification_email(
                    subject=f'Your teacher account at {school.name}',
                    to_email=email,
                    html_content=html_content,
                )
                email_sent = True
            except Exception:
                email_sent = False
        _log_security_event(
            'teacher_created',
            f'{actor.username} created teacher {teacher.employee_id} ({user.get_full_name()})',
            severity='info', actor=actor,
            ip=request.META.get('REMOTE_ADDR'),
            metadata={'teacher_id': teacher.id, 'assignments': len(created_assignments)},
        )
        return JsonResponse({
            'success': True, 'message': 'Teacher added.',
            'id': teacher.id, 'full_name': user.get_full_name(),
            'employee_id': teacher.employee_id,
            'login_email': email or username,
            'login_username': username,
            'email_sent': email_sent,
            'email_warning': None if email_sent else 'Credentials email could not be delivered. Please share login details manually.',
            'assignments': created_assignments,
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_teacher_detail(request, teacher_id):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        teacher = Teacher.objects.select_related('user').get(id=teacher_id, school=school)
    except Teacher.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Teacher not found.'}, status=404)

    if request.method == 'GET':
        tscs = teacher.subject_classes.select_related('subject', 'classroom').filter(is_active=True)
        periods   = tscs.count()
        subjects  = list({tsc.subject.name for tsc in tscs})
        classes   = [{'name': tsc.classroom.name, 'subject': tsc.subject.name,
                       'student_count': tsc.classroom.students.filter(is_active=True).count()}
                     for tsc in tscs]
        student_count = sum(c['student_count'] for c in classes)
        pic_url = request.build_absolute_uri(teacher.profile_picture.url) if teacher.profile_picture else ''
        return JsonResponse({'success': True, 'id': teacher.id,
            'employee_id': teacher.employee_id,
            'first_name': teacher.user.first_name, 'last_name': teacher.user.last_name,
            'full_name': teacher.user.get_full_name(),
            'email': teacher.user.email, 'phone_number': teacher.phone_number,
            'qualification': teacher.qualification, 'hire_date': str(teacher.hire_date),
            'profile_picture': pic_url,
            'subjects': subjects, 'classes': classes,
            'periods_per_week': periods, 'student_count': student_count,
            'is_overloaded': periods > 20,
        })

    if request.method == 'PUT':
        # Accept both multipart (with file) and JSON (without file)
        if request.content_type and 'multipart' in request.content_type:
            data = request.POST
            profile_picture = request.FILES.get('profile_picture')
        else:
            try:
                data = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
            profile_picture = None
        u = teacher.user
        u.first_name = data.get('first_name', u.first_name)
        u.last_name  = data.get('last_name', u.last_name)
        u.email      = data.get('email', u.email)
        u.save(update_fields=['first_name', 'last_name', 'email'])
        teacher.phone_number  = data.get('phone_number', teacher.phone_number)
        teacher.qualification = data.get('qualification', teacher.qualification)
        if profile_picture:
            teacher.profile_picture = profile_picture
        teacher.save()
        return JsonResponse({'success': True, 'message': 'Teacher updated.'})

    if request.method == 'DELETE':
        teacher.is_active = False
        teacher.save(update_fields=['is_active'])
        return JsonResponse({'success': True, 'message': 'Teacher removed.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# ── Teacher-Subject-Class Assignments ────────────────────────────

@csrf_exempt
def api_teacher_assignments(request, teacher_id):
    """GET/POST/DELETE assignments linking a teacher to subject+class+year."""
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        teacher = Teacher.objects.get(id=teacher_id, school=school)
    except Teacher.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Teacher not found.'}, status=404)

    if request.method == 'GET':
        tscs = TeacherSubjectClass.objects.filter(
            teacher=teacher, is_active=True
        ).select_related('subject', 'classroom', 'academic_year').order_by('classroom__name', 'subject__name')
        data = [{
            'id': tsc.id,
            'subject_id': tsc.subject_id,
            'subject_name': tsc.subject.name,
            'subject_code': tsc.subject.code,
            'class_id': tsc.classroom_id,
            'class_name': tsc.classroom.name,
            'academic_year_id': tsc.academic_year_id,
            'academic_year_name': tsc.academic_year.name,
            'student_count': tsc.classroom.students.filter(is_active=True).count(),
        } for tsc in tscs]
        return JsonResponse({'success': True, 'assignments': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        subject_id  = body.get('subject_id')
        class_id    = body.get('class_id')
        year_id     = body.get('academic_year_id')
        if not all([subject_id, class_id, year_id]):
            return JsonResponse({'success': False, 'message': 'subject_id, class_id, academic_year_id required.'}, status=400)
        try:
            subject  = Subject.objects.get(id=subject_id, school=school)
            classroom = ClassRoom.objects.get(id=class_id, school=school)
            year     = AcademicYear.objects.get(id=year_id, school=school)
        except (Subject.DoesNotExist, ClassRoom.DoesNotExist, AcademicYear.DoesNotExist) as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=404)
        tsc, created = TeacherSubjectClass.objects.get_or_create(
            teacher=teacher, subject=subject, classroom=classroom, academic_year=year,
            defaults={'is_active': True},
        )
        if not created and not tsc.is_active:
            tsc.is_active = True
            tsc.save(update_fields=['is_active'])
        if not created and tsc.is_active:
            return JsonResponse({'success': False, 'message': 'Assignment already exists.'}, status=400)
        return JsonResponse({'success': True, 'message': 'Assignment created.', 'id': tsc.id}, status=201)

    if request.method == 'DELETE':
        assignment_id = request.GET.get('assignment_id')
        if not assignment_id:
            try:
                body = json.loads(request.body)
                assignment_id = body.get('assignment_id')
            except Exception:
                pass
        if not assignment_id:
            return JsonResponse({'success': False, 'message': 'assignment_id required.'}, status=400)
        try:
            tsc = TeacherSubjectClass.objects.get(id=assignment_id, teacher=teacher)
        except TeacherSubjectClass.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Assignment not found.'}, status=404)
        tsc.delete()
        return JsonResponse({'success': True, 'message': 'Assignment removed.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# ── Classes ──────────────────────────────────────────────────────

@csrf_exempt
def api_classes(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        qs = ClassRoom.objects.filter(school=school, is_active=True)\
            .select_related('class_teacher__user')\
            .prefetch_related('assistant_teachers__user', 'subjects')
        data = []
        for c in qs:
            enrolled = c.students.filter(is_active=True).count()
            density_pct = round((enrolled / c.capacity) * 100, 1) if c.capacity else 0
            ct = None
            if c.class_teacher_id:
                ct = {
                    'id': c.class_teacher_id,
                    'name': c.class_teacher.user.get_full_name() or c.class_teacher.user.username,
                }
            data.append({
                'id': c.id, 'name': c.name, 'code': c.code,
                'form_number': c.form_number, 'capacity': c.capacity,
                'stream': c.stream, 'colour_tag': c.colour_tag, 'room': c.room,
                'notes': c.notes,
                'class_teacher': ct,
                'class_teacher_id': c.class_teacher_id,
                'assistant_teachers': [{
                    'id': t.id,
                    'name': t.user.get_full_name() or t.user.username,
                } for t in c.assistant_teachers.all()],
                'subjects': [{'id': s.id, 'name': s.name, 'code': s.code}
                             for s in c.subjects.all()],
                'student_count': enrolled,
                'enrolled': enrolled,
                'density_pct': density_pct,
                'is_full':   density_pct >= 100,
                'is_at_risk': (density_pct >= 95 or c.class_teacher_id is None
                               or not c.subjects.exists()),
                # Curriculum & schedule
                'education_level': c.education_level,
                'education_level_display': c.get_education_level_display() if c.education_level else '',
                'track': c.track,
                'track_display': c.get_track_display() if c.track else '',
                'start_time': c.start_time.strftime('%H:%M') if c.start_time else None,
                'end_time':   c.end_time.strftime('%H:%M')   if c.end_time   else None,
                'auto_promotion_target_id': c.auto_promotion_target_id,
            })
        return JsonResponse({'success': True, 'classes': data, 'count': len(data)})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        name        = body.get('name', '').strip()
        code        = body.get('code', '').strip()
        form_number = body.get('form_number', 1)
        capacity    = body.get('capacity', 50)
        if not name or not code:
            return JsonResponse({'success': False, 'message': 'name and code are required.'}, status=400)
        if ClassRoom.objects.filter(school=school, code=code).exists():
            return JsonResponse({'success': False, 'message': 'Class code already exists.'}, status=400)
        cls = ClassRoom.objects.create(
            school=school, name=name, code=code,
            form_number=form_number, capacity=capacity,
            stream=(body.get('stream') or '')[:10],
            colour_tag=(body.get('colour_tag') or '#3B82F6')[:7],
            room=(body.get('room') or '')[:100],
            notes=(body.get('notes') or '')[:5000],
            education_level=(body.get('education_level') or '')[:10],
            track=(body.get('track') or '')[:12],
            start_time=_parse_hhmm(body.get('start_time')),
            end_time=_parse_hhmm(body.get('end_time')),
        )
        # auto promotion target (must reference an existing class in same school)
        apt_id = body.get('auto_promotion_target_id')
        if apt_id:
            try:
                cls.auto_promotion_target = ClassRoom.objects.get(id=apt_id, school=school)
                cls.save(update_fields=['auto_promotion_target'])
            except ClassRoom.DoesNotExist:
                pass
        # class teacher
        ct_id = body.get('class_teacher_id') or body.get('teacher_id')
        if ct_id:
            try:
                cls.class_teacher = Teacher.objects.get(id=ct_id, school=school)
                cls.save(update_fields=['class_teacher'])
            except Teacher.DoesNotExist:
                pass
        # assistants
        ast_ids = body.get('assistant_teacher_ids') or []
        if isinstance(ast_ids, list) and ast_ids:
            cls.assistant_teachers.set(
                Teacher.objects.filter(id__in=ast_ids, school=school))
        # subjects
        subj_ids = body.get('subject_ids') or []
        if isinstance(subj_ids, list) and subj_ids:
            cls.subjects.set(
                Subject.objects.filter(id__in=subj_ids, school=school))
        _log_security_event(
            'class_created',
            f'{actor.username} created class {cls.code} ({cls.name})',
            severity='info', actor=actor,
            ip=request.META.get('REMOTE_ADDR'),
            metadata={'class_id': cls.id},
        )
        return JsonResponse({'success': True, 'message': 'Class created.', 'id': cls.id}, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_class_detail(request, class_id):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        cls = ClassRoom.objects.get(id=class_id, school=school)
    except ClassRoom.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Class not found.'}, status=404)

    if request.method == 'GET':
        enrolled = cls.students.filter(is_active=True).count()
        density_pct = round((enrolled / cls.capacity) * 100, 1) if cls.capacity else 0
        ct = None
        if cls.class_teacher_id:
            ct = {
                'id': cls.class_teacher_id,
                'name': cls.class_teacher.user.get_full_name() or cls.class_teacher.user.username,
                'email': cls.class_teacher.user.email,
            }
        return JsonResponse({
            'success': True,
            'id': cls.id, 'name': cls.name, 'code': cls.code,
            'form_number': cls.form_number, 'capacity': cls.capacity,
            'stream': cls.stream, 'colour_tag': cls.colour_tag,
            'room': cls.room, 'notes': cls.notes,
            'class_teacher': ct, 'class_teacher_id': cls.class_teacher_id,
            'assistant_teachers': [{
                'id': t.id,
                'name': t.user.get_full_name() or t.user.username,
            } for t in cls.assistant_teachers.all()],
            'subjects': [{'id': s.id, 'name': s.name, 'code': s.code}
                         for s in cls.subjects.all()],
            'student_count': enrolled,
            'enrolled': enrolled,
            'density_pct': density_pct,
            'education_level': cls.education_level,
            'education_level_display': cls.get_education_level_display() if cls.education_level else '',
            'track': cls.track,
            'track_display': cls.get_track_display() if cls.track else '',
            'start_time': cls.start_time.strftime('%H:%M') if cls.start_time else None,
            'end_time':   cls.end_time.strftime('%H:%M')   if cls.end_time   else None,
            'auto_promotion_target_id': cls.auto_promotion_target_id,
            'auto_promotion_target_name': (cls.auto_promotion_target.name
                                           if cls.auto_promotion_target_id else None),
        })

    if request.method == 'PUT':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        for field in ('name', 'form_number', 'capacity'):
            if field in body:
                setattr(cls, field, body[field])
        if 'stream' in body:
            cls.stream = (body.get('stream') or '')[:10]
        if 'colour_tag' in body:
            cls.colour_tag = (body.get('colour_tag') or '#3B82F6')[:7]
        if 'room' in body:
            cls.room = (body.get('room') or '')[:100]
        if 'notes' in body:
            cls.notes = (body.get('notes') or '')[:5000]
        # Curriculum & schedule
        if 'education_level' in body:
            cls.education_level = (body.get('education_level') or '')[:10]
        if 'track' in body:
            cls.track = (body.get('track') or '')[:12]
        if 'start_time' in body:
            cls.start_time = _parse_hhmm(body.get('start_time'))
        if 'end_time' in body:
            cls.end_time = _parse_hhmm(body.get('end_time'))
        if 'auto_promotion_target_id' in body:
            apt_id = body.get('auto_promotion_target_id')
            if apt_id and apt_id != cls.id:
                try:
                    cls.auto_promotion_target = ClassRoom.objects.get(id=apt_id, school=school)
                except ClassRoom.DoesNotExist:
                    pass
            else:
                cls.auto_promotion_target = None
        # class teacher
        if 'class_teacher_id' in body or 'teacher_id' in body:
            ct_id = body.get('class_teacher_id') or body.get('teacher_id')
            if ct_id:
                try:
                    cls.class_teacher = Teacher.objects.get(id=ct_id, school=school)
                except Teacher.DoesNotExist:
                    pass
            else:
                cls.class_teacher = None
        cls.save()
        # assistants + subjects via M2M .set
        if 'assistant_teacher_ids' in body and isinstance(body['assistant_teacher_ids'], list):
            cls.assistant_teachers.set(
                Teacher.objects.filter(id__in=body['assistant_teacher_ids'], school=school))
        if 'subject_ids' in body and isinstance(body['subject_ids'], list):
            cls.subjects.set(
                Subject.objects.filter(id__in=body['subject_ids'], school=school))
        return JsonResponse({'success': True, 'message': 'Class updated.'})

    if request.method == 'DELETE':
        cls.is_active = False
        cls.save(update_fields=['is_active'])
        return JsonResponse({'success': True, 'message': 'Class removed.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
@require_http_methods(['POST'])
def api_classes_bulk_create(request):
    """Create N variants of a class in one request.

    Body:
      { name_template: "Grade 10",  -> creates "Grade 10A", "Grade 10B", ...
        code_template: "G10",        -> creates "G10A", "G10B", ...
        form_number, capacity, education_level, track, colour_tag,
        start_time, end_time,
        streams: ["A","B","C"]       -> required, the section letters/labels
        ...other shared fields like room template, notes, class_teacher_id }

    Returns: { success, created: [{id, name, code}, ...], skipped: [...] }
    """
    actor, sa, school = _get_school_for_admin(request)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)

    name_template = (body.get('name_template') or '').strip()
    code_template = (body.get('code_template') or '').strip().upper()
    streams       = body.get('streams') or []
    if not name_template or not isinstance(streams, list) or not streams:
        return JsonResponse({'success': False,
                             'message': 'name_template and streams[] required.'}, status=400)
    streams = [str(s).strip()[:10] for s in streams if str(s).strip()][:20]
    if not streams:
        return JsonResponse({'success': False, 'message': 'No valid streams.'}, status=400)

    form_number = int(body.get('form_number') or 1)
    capacity    = int(body.get('capacity') or 50)
    colour_tag  = (body.get('colour_tag') or '#3B82F6')[:7]
    edu         = (body.get('education_level') or '')[:10]
    track       = (body.get('track') or '')[:12]
    start_time  = _parse_hhmm(body.get('start_time'))
    end_time    = _parse_hhmm(body.get('end_time'))
    room        = (body.get('room') or '')[:100]
    notes       = (body.get('notes') or '')[:5000]
    teacher_id  = body.get('class_teacher_id') or body.get('teacher_id')

    created, skipped = [], []
    for stream in streams:
        # Class name e.g. "Grade 10" + "A" → "Grade 10A"  (no space if stream is short letter)
        suffix = stream if len(stream) <= 2 else f' {stream}'
        cls_name = f'{name_template}{suffix}'.strip()
        cls_code = (code_template + stream.upper()) if code_template else \
                   (cls_name.replace(' ', '').upper()[:20])
        if ClassRoom.objects.filter(school=school, code=cls_code).exists():
            skipped.append({'code': cls_code, 'reason': 'code already exists'})
            continue
        cls = ClassRoom.objects.create(
            school=school,
            name=cls_name, code=cls_code,
            form_number=form_number, capacity=capacity,
            stream=stream, colour_tag=colour_tag,
            education_level=edu, track=track,
            start_time=start_time, end_time=end_time,
            room=room, notes=notes,
        )
        if teacher_id:
            try:
                cls.class_teacher = Teacher.objects.get(id=teacher_id, school=school)
                cls.save(update_fields=['class_teacher'])
            except Teacher.DoesNotExist:
                pass
        created.append({'id': cls.id, 'name': cls.name, 'code': cls.code, 'stream': stream})

    _log_security_event(
        'class_bulk_created',
        f'{actor.username} bulk-created {len(created)} class(es) from "{name_template}"',
        severity='info', actor=actor,
        ip=request.META.get('REMOTE_ADDR'),
        metadata={'created_ids': [c['id'] for c in created]},
    )
    return JsonResponse({
        'success': True,
        'created': created,
        'skipped': skipped,
        'message': f'Created {len(created)} class(es)' +
                   (f', skipped {len(skipped)}' if skipped else ''),
    })


# ── Subjects ─────────────────────────────────────────────────────

@csrf_exempt
def api_subjects(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        qs = Subject.objects.filter(school=school, is_active=True)
        data = [{'id': s.id, 'name': s.name, 'code': s.code, 'description': s.description} for s in qs]
        return JsonResponse({'success': True, 'subjects': data, 'count': len(data)})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        name        = body.get('name', '').strip()
        code        = body.get('code', '').strip()
        description = body.get('description', '')
        if not name or not code:
            return JsonResponse({'success': False, 'message': 'name and code are required.'}, status=400)
        if Subject.objects.filter(school=school, code=code).exists():
            return JsonResponse({'success': False, 'message': 'Subject code already exists.'}, status=400)
        subj = Subject.objects.create(school=school, name=name, code=code, description=description)
        return JsonResponse({'success': True, 'message': 'Subject created.', 'id': subj.id}, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_subject_detail(request, subject_id):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        subj = Subject.objects.get(id=subject_id, school=school)
    except Subject.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Subject not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'success': True, 'id': subj.id, 'name': subj.name,
            'code': subj.code, 'description': subj.description})

    if request.method == 'PUT':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        subj.name        = body.get('name', subj.name)
        subj.description = body.get('description', subj.description)
        subj.save()
        return JsonResponse({'success': True, 'message': 'Subject updated.'})

    if request.method == 'DELETE':
        subj.is_active = False
        subj.save(update_fields=['is_active'])
        return JsonResponse({'success': True, 'message': 'Subject removed.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# ── Academic Years ────────────────────────────────────────────────

@csrf_exempt
def api_academic_years(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        qs = AcademicYear.objects.filter(school=school)
        data = [{'id': y.id, 'name': y.name, 'start_date': str(y.start_date),
                 'end_date': str(y.end_date), 'is_active': y.is_active} for y in qs]
        return JsonResponse({'success': True, 'academic_years': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        name       = body.get('name', '').strip()
        start_date = body.get('start_date', '')
        end_date   = body.get('end_date', '')
        if not name:
            return JsonResponse({'success': False, 'message': 'name is required.'}, status=400)
        yr = AcademicYear.objects.create(
            school=school, name=name,
            start_date=start_date or datetime.date.today(),
            end_date=end_date or datetime.date.today(),
        )
        return JsonResponse({'success': True, 'message': 'Academic year created.', 'id': yr.id}, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_academic_year_detail(request, year_id):
    """PUT/PATCH a single academic year — supports activating (deactivates all others in school)."""
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    try:
        year = AcademicYear.objects.get(id=year_id, school=school)
    except AcademicYear.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Academic year not found.'}, status=404)

    if request.method in ('PUT', 'PATCH'):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        if 'name' in body:
            year.name = body['name'].strip()
        if 'start_date' in body:
            year.start_date = body['start_date']
        if 'end_date' in body:
            year.end_date = body['end_date']
        if body.get('is_active'):
            AcademicYear.objects.filter(school=school).exclude(id=year.id).update(is_active=False)
            year.is_active = True
        year.save()
        return JsonResponse({'success': True, 'message': 'Academic year updated.',
                             'year': {'id': year.id, 'name': year.name,
                                      'start_date': str(year.start_date),
                                      'end_date': str(year.end_date),
                                      'is_active': year.is_active}})

    if request.method == 'DELETE':
        year.delete()
        return JsonResponse({'success': True, 'message': 'Academic year deleted.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# ─────────────────────────────────────────────────────────────────
# TERMS  (full CRUD)
# ─────────────────────────────────────────────────────────────────

def _term_to_dict(t):
    return {
        'id': t.id,
        'name': t.name,
        'name_display': t.get_name_display(),
        'academic_year_id': t.academic_year_id,
        'academic_year_name': t.academic_year.name,
        'start_date': str(t.start_date),
        'end_date': str(t.end_date),
        'is_active': t.is_active,
        'grade_entry_open': t.grade_entry_open,
        'grade_entry_deadline': t.grade_entry_deadline.isoformat() if t.grade_entry_deadline else None,
    }


@csrf_exempt
def api_terms(request):
    actor = _get_authed_user(request)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        school = _get_user_school(actor)
        if not school:
            return JsonResponse({'success': False, 'message': 'No school context.'}, status=404)
        year_id = request.GET.get('academic_year_id')
        if year_id:
            qs = Term.objects.filter(academic_year_id=year_id, academic_year__school=school)
        else:
            active_year = AcademicYear.objects.filter(school=school, is_active=True).first()
            if not active_year:
                return JsonResponse({'success': True, 'terms': []})
            qs = Term.objects.filter(academic_year=active_year)
        terms = qs.select_related('academic_year').order_by('name')
        return JsonResponse({'success': True, 'terms': [_term_to_dict(t) for t in terms]})

    if request.method == 'POST':
        try:
            _, sa, school = _get_school_for_admin(request)
        except SchoolAdmin.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Admin access required.'}, status=403)
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        year_id    = body.get('academic_year_id')
        name       = body.get('name', '').upper()
        start_date = body.get('start_date')
        end_date   = body.get('end_date')
        if not all([year_id, name, start_date, end_date]):
            return JsonResponse({'success': False, 'message': 'academic_year_id, name, start_date, end_date required.'}, status=400)
        valid_names = [c[0] for c in Term.TERM_CHOICES]
        if name not in valid_names:
            return JsonResponse({'success': False, 'message': f'name must be one of: {", ".join(valid_names)}'}, status=400)
        try:
            year = AcademicYear.objects.get(id=year_id, school=school)
        except AcademicYear.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Academic year not found.'}, status=404)
        if Term.objects.filter(academic_year=year, name=name).exists():
            return JsonResponse({'success': False, 'message': 'This term already exists for that academic year.'}, status=400)
        term = Term.objects.create(
            academic_year=year, name=name,
            start_date=start_date, end_date=end_date,
        )
        return JsonResponse({'success': True, 'message': 'Term created.', 'term': _term_to_dict(term)}, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_term_detail(request, term_id):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        term = Term.objects.select_related('academic_year').get(id=term_id, academic_year__school=school)
    except Term.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Term not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'success': True, 'term': _term_to_dict(term)})

    if request.method == 'PUT':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        if 'start_date' in body:
            term.start_date = body['start_date']
        if 'end_date' in body:
            term.end_date = body['end_date']
        if 'is_active' in body:
            if body['is_active']:
                Term.objects.filter(academic_year=term.academic_year).exclude(id=term.id).update(is_active=False)
            term.is_active = bool(body['is_active'])
        if 'grade_entry_open' in body:
            term.grade_entry_open = bool(body['grade_entry_open'])
        if 'grade_entry_deadline' in body:
            term.grade_entry_deadline = body['grade_entry_deadline'] or None
        term.save()
        return JsonResponse({'success': True, 'message': 'Term updated.', 'term': _term_to_dict(term)})

    if request.method == 'DELETE':
        term.delete()
        return JsonResponse({'success': True, 'message': 'Term deleted.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# ─────────────────────────────────────────────────────────────────
# GRADES CRUD  (bulk upsert per class + subject + term)
# ─────────────────────────────────────────────────────────────────

@csrf_exempt
def api_grades(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        class_id   = request.GET.get('class_id')
        subject_id = request.GET.get('subject_id')
        term_id    = request.GET.get('term_id')
        if not class_id or not subject_id or not term_id:
            return JsonResponse({'success': False, 'message': 'class_id, subject_id, term_id required.'}, status=400)
        qs = Grade.objects.filter(
            student__school=school, student__classroom_id=class_id,
            subject_id=subject_id, term_id=term_id,
        ).select_related('student__user')
        data = [{
            'student_id': g.student_id,
            'ca':         float(g.continuous_assessment),
            'midterm':    float(g.mid_term_exam),
            'final':      float(g.final_exam),
            'total':      float(g.total_score),
            'letter':     g.grade_letter,
            'is_locked':  g.is_locked,
        } for g in qs]
        return JsonResponse({'success': True, 'grades': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        subject_id = body.get('subject_id')
        term_id    = body.get('term_id')
        entries    = body.get('grades', [])   # [{student_id, ca, midterm, final}]
        if not subject_id or not term_id:
            return JsonResponse({'success': False, 'message': 'subject_id and term_id required.'}, status=400)
        try:
            subject = Subject.objects.get(id=subject_id, school=school)
            term    = Term.objects.get(id=term_id)
        except (Subject.DoesNotExist, Term.DoesNotExist):
            return JsonResponse({'success': False, 'message': 'Subject or term not found.'}, status=404)
        saved = 0
        blocked = 0
        # Pre-fetch the school's grading scheme once for the whole batch
        _scheme_boundaries = None
        try:
            gs = GradingScheme.objects.get(school=school)
            _scheme_boundaries = sorted(gs.boundaries, key=lambda b: -b['min'])
        except GradingScheme.DoesNotExist:
            pass
        for entry in entries:
            sid = entry.get('student_id')
            try:
                student = Student.objects.get(id=sid, school=school)
            except Student.DoesNotExist:
                continue
            assigned_teacher = None
            try:
                tsc = TeacherSubjectClass.objects.select_related('teacher').filter(
                    subject=subject, classroom=student.classroom, is_active=True
                ).first()
                if tsc:
                    assigned_teacher = tsc.teacher
            except Exception:
                pass
            grade, created = Grade.objects.get_or_create(
                student=student, subject=subject, term=term,
                defaults={'teacher': assigned_teacher},
            )
            if grade.is_locked:
                GradeChangeAlert.objects.create(
                    grade=grade, severity='CRITICAL',
                    alert_type='locked_grade_edit_attempt',
                    description=f'School admin {actor.get_full_name()} attempted to modify locked grade',
                    triggered_by=actor,
                    ip_address=request.META.get('REMOTE_ADDR'),
                    old_value={'total_score': float(grade.total_score)},
                    new_value={'ca': entry.get('ca'), 'midterm': entry.get('midterm'), 'final': entry.get('final')},
                )
                _write_grade_audit(grade, 'MODIFICATION_ATTEMPT', actor, request,
                                   old_values={'total_score': float(grade.total_score)},
                                   new_values={'ca': entry.get('ca')})
                _dispatch_tamper_alerts(grade, actor, request, school)
                blocked += 1
                continue
            old_vals = {'ca': float(grade.continuous_assessment), 'midterm': float(grade.mid_term_exam), 'final': float(grade.final_exam)}
            grade.continuous_assessment = min(float(entry.get('ca') or 0), 20)
            grade.mid_term_exam         = min(float(entry.get('midterm') or 0), 30)
            grade.final_exam            = min(float(entry.get('final') or 0), 50)
            if _scheme_boundaries:
                grade._boundaries = _scheme_boundaries
            grade.save()
            _write_grade_audit(grade, 'CREATE' if created else 'UPDATE', actor, request,
                               old_values=old_vals if not created else {},
                               new_values={'ca': entry.get('ca'), 'midterm': entry.get('midterm'), 'final': entry.get('final')})
            saved += 1
        return JsonResponse({'success': True, 'message': f'{saved} grade(s) saved.', 'blocked': blocked})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# ─────────────────────────────────────────────────────────────────
# ATTENDANCE
# ─────────────────────────────────────────────────────────────────

@csrf_exempt
def api_attendance(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        class_id = request.GET.get('class_id')
        date_str = request.GET.get('date')
        if not class_id or not date_str:
            return JsonResponse({'success': False, 'message': 'class_id and date required.'}, status=400)
        qs = Attendance.objects.filter(school=school, classroom_id=class_id, date=date_str)
        data = {str(a.student_id): a.status for a in qs}
        return JsonResponse({'success': True, 'attendance': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        class_id = body.get('class_id')
        date_str = body.get('date')
        records  = body.get('records', {})  # {student_id: status}
        if not class_id or not date_str:
            return JsonResponse({'success': False, 'message': 'class_id and date required.'}, status=400)
        try:
            classroom = ClassRoom.objects.get(id=class_id, school=school)
        except ClassRoom.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Class not found.'}, status=404)
        saved = 0
        for sid, status in records.items():
            if status not in ('present', 'absent', 'late', 'excused'):
                continue
            try:
                student = Student.objects.get(id=int(sid), school=school)
            except (Student.DoesNotExist, ValueError):
                continue
            Attendance.objects.update_or_create(
                student=student, date=date_str,
                defaults={'school': school, 'classroom': classroom, 'status': status, 'recorded_by': actor},
            )
            saved += 1
        return JsonResponse({'success': True, 'message': f'{saved} record(s) saved.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@require_http_methods(["GET"])
@csrf_exempt
def api_attendance_stats(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    today = datetime.date.today()
    total_students = Student.objects.filter(school=school, is_active=True).count()
    today_records  = Attendance.objects.filter(school=school, date=today)
    present_count  = today_records.filter(status='present').count()
    absent_count   = today_records.filter(status='absent').count()
    late_count     = today_records.filter(status='late').count()

    classes = ClassRoom.objects.filter(school=school)
    class_stats = []
    for cls in classes:
        cls_students = Student.objects.filter(school=school, classroom=cls, is_active=True).count()
        cls_present  = today_records.filter(classroom=cls, status='present').count()
        class_stats.append({
            'class_id':   cls.id,
            'class_name': cls.name,
            'total':      cls_students,
            'present':    cls_present,
            'absent':     max(cls_students - cls_present, 0),
        })

    rate = round((present_count / total_students * 100), 1) if total_students else 0
    return JsonResponse({
        'success': True,
        'date':    str(today),
        'total':   total_students,
        'present': present_count,
        'absent':  absent_count,
        'late':    late_count,
        'rate':    rate,
        'classes': class_stats,
    })


# ─────────────────────────────────────────────────────────────────
# FINANCE
# ─────────────────────────────────────────────────────────────────

@csrf_exempt
def api_finance_stats(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    from django.db.models import Sum
    fee_qs = FeeRecord.objects.filter(school=school)
    total_fees   = fee_qs.aggregate(t=Sum('amount'))['t'] or 0
    collected    = fee_qs.aggregate(c=Sum('amount_paid'))['c'] or 0
    outstanding  = total_fees - collected
    collection_rate = round((float(collected) / float(total_fees) * 100), 1) if total_fees else 0

    expense_qs     = Expense.objects.filter(school=school)
    total_expenses = expense_qs.aggregate(t=Sum('amount'))['t'] or 0

    classes = ClassRoom.objects.filter(school=school)
    class_fees = []
    for cls in classes:
        cls_student_ids = Student.objects.filter(school=school, classroom=cls).values_list('id', flat=True)
        cls_fees_qs = fee_qs.filter(student_id__in=cls_student_ids)
        cls_total   = cls_fees_qs.aggregate(t=Sum('amount'))['t'] or 0
        cls_paid    = cls_fees_qs.aggregate(c=Sum('amount_paid'))['c'] or 0
        class_fees.append({
            'class_name':  cls.name,
            'total':       float(cls_total),
            'collected':   float(cls_paid),
            'outstanding': float(cls_total - cls_paid),
        })

    expense_dist = list(
        expense_qs.values('category').annotate(total=Sum('amount')).order_by('-total')
    )

    return JsonResponse({
        'success':         True,
        'collected':       float(collected),
        'outstanding':     float(outstanding),
        'total_expenses':  float(total_expenses),
        'collection_rate': collection_rate,
        'class_fees':      class_fees,
        'expense_distribution': [
            {'category': e['category'], 'amount': float(e['total'])}
            for e in expense_dist
        ],
    })


@csrf_exempt
def api_finance_fees(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        status_filter = request.GET.get('status')
        qs = FeeRecord.objects.filter(school=school).select_related('student', 'term')
        if status_filter:
            qs = qs.filter(status=status_filter)
        data = [{
            'id':           f.id,
            'student_id':   f.student_id,
            'student_name': f.student.user.get_full_name() if f.student else '',
            'term':         f.term.name if f.term else '',
            'description':  f.description,
            'amount':       float(f.amount),
            'amount_paid':  float(f.amount_paid),
            'balance':      float(f.balance),
            'status':       f.status,
            'due_date':     str(f.due_date) if f.due_date else None,
        } for f in qs.order_by('-id')[:200]]
        return JsonResponse({'success': True, 'fees': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        try:
            student = Student.objects.get(id=body.get('student_id'), school=school)
        except Student.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Student not found.'}, status=404)
        term = None
        if body.get('term_id'):
            try:
                term = Term.objects.get(id=body['term_id'])
            except Term.DoesNotExist:
                pass
        fee = FeeRecord.objects.create(
            school=school,
            student=student,
            term=term,
            description=body.get('description', 'School Fee'),
            amount=float(body.get('amount', 0)),
            amount_paid=float(body.get('amount_paid', 0)),
            due_date=body.get('due_date') or None,
        )
        return JsonResponse({'success': True, 'id': fee.id, 'message': 'Fee record created.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_finance_fee_detail(request, fee_id):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    try:
        fee = FeeRecord.objects.get(id=fee_id, school=school)
    except FeeRecord.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Fee record not found.'}, status=404)

    if request.method == 'PUT':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        if 'amount_paid' in body:
            fee.amount_paid = min(float(body['amount_paid']), float(fee.amount))
            if fee.amount_paid >= float(fee.amount):
                fee.status    = 'paid'
                fee.paid_date = datetime.date.today()
            elif fee.amount_paid > 0:
                fee.status = 'partial'
            else:
                fee.status = 'unpaid'
            fee.save()
        return JsonResponse({
            'success': True,
            'message': 'Fee updated.',
            'balance': float(fee.balance),
            'status':  fee.status,
        })

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_finance_expenses(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        qs = Expense.objects.filter(school=school).order_by('-date')[:200]
        data = [{
            'id':       e.id,
            'title':    e.title,
            'amount':   float(e.amount),
            'category': e.category,
            'date':     str(e.date),
        } for e in qs]
        return JsonResponse({'success': True, 'expenses': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        title = (body.get('title') or '').strip()
        amount_raw = body.get('amount')
        try:
            amount = float(amount_raw) if amount_raw not in (None, '') else 0.0
        except (TypeError, ValueError):
            return JsonResponse({'success': False, 'message': 'Amount must be a number.'}, status=400)
        if not title:
            return JsonResponse({'success': False, 'message': 'Title is required.'}, status=400)
        if amount <= 0:
            return JsonResponse({'success': False, 'message': 'Amount must be greater than zero.'}, status=400)
        exp = Expense.objects.create(
            school=school,
            title=title,
            amount=amount,
            category=body.get('category', 'other'),
            date=body.get('date') or datetime.date.today(),
        )
        _log_security_event(
            'expense_recorded',
            f'{actor.username} recorded expense "{exp.title}" ({exp.amount} {exp.category})',
            severity='info', actor=actor,
            ip=request.META.get('REMOTE_ADDR'),
            metadata={'expense_id': exp.id},
        )
        return JsonResponse({'success': True, 'id': exp.id, 'message': 'Expense recorded.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# ─────────────────────────────────────────────────────────────────
# MESSAGES
# ─────────────────────────────────────────────────────────────────

@csrf_exempt
def api_school_messages(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        role_filter = request.GET.get('role')
        qs = Message.objects.filter(school=school).select_related('sender')
        if role_filter:
            qs = qs.filter(recipient_role=role_filter)
        data = [{
            'id':             m.id,
            'sender_name':    (m.sender.get_full_name() or m.sender.username) if m.sender else 'System',
            'recipient_role': m.recipient_role,
            'subject':        m.subject,
            'body':           m.body,
            'created_at':     m.created_at.isoformat(),
            'is_broadcast':   m.is_broadcast,
        } for m in qs.order_by('-id')[:100]]
        return JsonResponse({'success': True, 'messages': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        msg = Message.objects.create(
            school=school,
            sender=actor,
            recipient_role=body.get('recipient_role', 'all'),
            subject=body.get('subject', ''),
            body=body.get('body', ''),
            is_broadcast=body.get('is_broadcast', True),
        )
        return JsonResponse({'success': True, 'id': msg.id, 'message': 'Message sent.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# =================================================================
# ANALYTICS
# =================================================================

@csrf_exempt
def api_analytics(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    from django.db.models import Avg
    from datetime import timedelta

    total_students = Student.objects.filter(school=school, is_active=True).count()
    total_teachers = Teacher.objects.filter(school=school, is_active=True).count()
    total_classes  = ClassRoom.objects.filter(school=school, is_active=True).count()
    avg_grade_val  = Grade.objects.filter(student__school=school).aggregate(a=Avg('total_score'))['a']
    avg_grade      = round(float(avg_grade_val), 1) if avg_grade_val else 0

    today         = datetime.date.today()
    today_present = Attendance.objects.filter(school=school, date=today, status='present').count()
    att_rate      = round(today_present / total_students * 100, 1) if total_students else 0

    att_trend = []
    for i in range(7):
        d    = today - timedelta(days=6 - i)
        pres = Attendance.objects.filter(school=school, date=d, status='present').count()
        rate = round(pres / total_students * 100, 1) if total_students else 0
        att_trend.append({'date': str(d), 'present': pres, 'rate': rate})

    grade_by_class = []
    for cls in ClassRoom.objects.filter(school=school, is_active=True):
        avg = Grade.objects.filter(student__school=school, student__classroom=cls).aggregate(a=Avg('total_score'))['a']
        grade_by_class.append({'class_name': cls.name, 'avg': round(float(avg), 1) if avg else 0})

    at_risk = []
    for stu in Student.objects.filter(school=school, is_active=True).select_related('user', 'classroom')[:100]:
        avg_val    = Grade.objects.filter(student=stu).aggregate(a=Avg('total_score'))['a']
        avg_val    = round(float(avg_val), 1) if avg_val else None
        att_total  = Attendance.objects.filter(student=stu).count()
        att_pres   = Attendance.objects.filter(student=stu, status='present').count()
        att_r      = round(att_pres / att_total * 100, 1) if att_total else 100
        reasons    = []
        if avg_val is not None and avg_val < 50:
            reasons.append('Low grade avg (%s)' % avg_val)
        if att_total > 0 and att_r < 75:
            reasons.append('Low attendance (%s%%)' % att_r)
        if reasons:
            at_risk.append({
                'id':        stu.id,
                'name':      stu.user.get_full_name(),
                'class':     stu.classroom.name if stu.classroom else '-',
                'avg_grade': avg_val,
                'att_rate':  att_r,
                'reasons':   reasons,
            })

    return JsonResponse({
        'success': True,
        'overview': {
            'total_students': total_students,
            'total_teachers': total_teachers,
            'total_classes':  total_classes,
            'avg_grade':      avg_grade,
            'att_rate':       att_rate,
        },
        'att_trend':      att_trend,
        'grade_by_class': grade_by_class,
        'at_risk':        at_risk[:20],
    })


# =================================================================
# EXAMS
# =================================================================

@csrf_exempt
def api_exams(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        qs = Exam.objects.filter(school=school, is_active=True).select_related('classroom', 'subject', 'term')
        data = [{
            'id':           e.id,
            'name':         e.name,
            'exam_type':    e.exam_type,
            'classroom':    e.classroom.name,
            'classroom_id': e.classroom.id,
            'subject':      e.subject.name,
            'subject_id':   e.subject.id,
            'term':         e.term.name if e.term else None,
            'term_id':      e.term.id   if e.term else None,
            'total_marks':  float(e.total_marks),
            'date':         str(e.date),
            'result_count': e.results.count(),
        } for e in qs.order_by('-date')[:200]]
        return JsonResponse({'success': True, 'exams': data})

    if request.method == 'POST':
        _, err = _require_exam_officer(request, school)
        if err:
            return err
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        try:
            classroom = ClassRoom.objects.get(id=body.get('classroom_id'), school=school)
            subject   = Subject.objects.get(id=body.get('subject_id'), school=school)
        except (ClassRoom.DoesNotExist, Subject.DoesNotExist):
            return JsonResponse({'success': False, 'message': 'Class or subject not found.'}, status=404)
        term = None
        if body.get('term_id'):
            try:
                term = Term.objects.get(id=body['term_id'])
            except Term.DoesNotExist:
                pass
        exam = Exam.objects.create(
            school=school, classroom=classroom, subject=subject, term=term,
            name=body.get('name', 'Exam'),
            exam_type=body.get('exam_type', 'final'),
            total_marks=float(body.get('total_marks', 100)),
            date=body.get('date') or datetime.date.today(),
            created_by=actor,
        )
        return JsonResponse({'success': True, 'id': exam.id, 'message': 'Exam created.'}, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_exam_detail(request, exam_id):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        exam = Exam.objects.get(id=exam_id, school=school)
    except Exam.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Exam not found.'}, status=404)

    if request.method == 'DELETE':
        exam.is_active = False
        exam.save()
        return JsonResponse({'success': True, 'message': 'Exam deleted.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_exam_results(request, exam_id):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        exam = Exam.objects.get(id=exam_id, school=school)
    except Exam.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Exam not found.'}, status=404)

    if request.method == 'GET':
        students    = Student.objects.filter(school=school, classroom=exam.classroom, is_active=True)
        results_map = {r.student_id: r for r in ExamResult.objects.filter(exam=exam)}
        data = [{
            'student_id':   s.id,
            'student_name': s.user.get_full_name(),
            'marks':        float(results_map[s.id].marks_obtained) if s.id in results_map else None,
            'grade_letter': results_map[s.id].grade_letter if s.id in results_map else None,
            'remarks':      results_map[s.id].remarks      if s.id in results_map else '',
        } for s in students]
        return JsonResponse({'success': True, 'exam': {
            'id': exam.id, 'name': exam.name,
            'total_marks': float(exam.total_marks),
            'subject':     exam.subject.name,
            'classroom':   exam.classroom.name,
        }, 'results': data})

    if request.method == 'POST':
        _, err = _require_exam_officer(request, school)
        if err:
            return err
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        entries = body.get('results', [])
        saved = 0
        for entry in entries:
            sid   = entry.get('student_id')
            marks = entry.get('marks')
            if marks is None:
                continue
            try:
                student = Student.objects.get(id=sid, school=school)
            except Student.DoesNotExist:
                continue
            ExamResult.objects.update_or_create(
                exam=exam, student=student,
                defaults={
                    'marks_obtained': float(marks),
                    'remarks':        entry.get('remarks', ''),
                    'graded_by':      actor,
                },
            )
            saved += 1
        return JsonResponse({'success': True, 'message': '%d result(s) saved.' % saved})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# =================================================================
# NOTIFICATIONS
# =================================================================

@csrf_exempt
def api_notifications(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        qs = Notification.objects.filter(school=school, is_active=True).order_by('-created_at')[:100]
        read_ids = set(NotificationRead.objects.filter(
            notification__in=qs, user=actor
        ).values_list('notification_id', flat=True))
        data = [{
            'id':             n.id,
            'title':          n.title,
            'body':           n.body,
            'notif_type':     n.notif_type,
            'recipient_role': n.recipient_role,
            'sender_name':    (n.sender.get_full_name() or n.sender.username) if n.sender else 'System',
            'created_at':     n.created_at.isoformat(),
            'is_read':        n.id in read_ids,
        } for n in qs]
        return JsonResponse({'success': True, 'notifications': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        notif = Notification.objects.create(
            school=school,
            title=body.get('title', ''),
            body=body.get('body', ''),
            notif_type=body.get('notif_type', 'info'),
            recipient_role=body.get('recipient_role', 'all'),
            sender=actor,
        )
        return JsonResponse({'success': True, 'id': notif.id, 'message': 'Notification sent.'}, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_notification_read(request, notif_id):
    actor = _get_authed_user(request)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        notif = Notification.objects.get(id=notif_id)
    except Notification.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Not found.'}, status=404)
    NotificationRead.objects.get_or_create(notification=notif, user=actor)
    return JsonResponse({'success': True, 'message': 'Marked as read.'})


# =================================================================
# TIMETABLE
# =================================================================

@csrf_exempt
def api_timetable(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

    if request.method == 'GET':
        class_id   = request.GET.get('class_id')
        teacher_id = request.GET.get('teacher_id')
        qs = TimetableSlot.objects.filter(school=school).select_related(
            'classroom', 'subject', 'teacher__user'
        )
        if class_id:
            qs = qs.filter(classroom_id=class_id)
        if teacher_id:
            qs = qs.filter(teacher_id=teacher_id)
        data = [{
            'id':           s.id,
            'classroom':    s.classroom.name,
            'classroom_id': s.classroom.id,
            'subject':      s.subject.name,
            'subject_id':   s.subject.id,
            'teacher':      s.teacher.user.get_full_name() if s.teacher else None,
            'teacher_id':   s.teacher.id if s.teacher else None,
            'day':          s.day_of_week,
            'day_name':     DAY_NAMES[s.day_of_week],
            'period':       s.period_number,
        } for s in qs.order_by('classroom', 'day_of_week', 'period_number')]
        return JsonResponse({'success': True, 'slots': data})

    if request.method == 'DELETE':
        deleted, _ = TimetableSlot.objects.filter(school=school).delete()
        return JsonResponse({'success': True, 'message': '%d slot(s) cleared.' % deleted})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_timetable_generate(request):
    """
    Optimized hybrid timetable generator.

    Algorithm (3 phases):
      1. Sort sessions by constraint difficulty (busiest teacher first).
      2. Greedy placement using period-major slot order (spreads sessions
         evenly across days rather than bunching on Monday).
      3. Repair phase: for each session the greedy couldn't place, attempt
         a single-step swap — unplace a blocking session, check if the
         target slot is now free, find a new home for the blocker; if
         successful both sessions get placed, otherwise restore state.

    Constraints enforced:
      - No class double-booked in any slot
      - No teacher double-booked in any slot
      - Teacher daily load cap (configurable, default 5)
      - Same subject may not appear twice in the same class on the same day
      - Nominated break periods are left empty

    Request body (all optional):
      periods_per_day     int  (1-12, default 8)
      max_teacher_per_day int  (1-periods_per_day, default 5)
      break_periods       list of 1-indexed period numbers to leave empty
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)

    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        body = {}

    from collections import Counter, defaultdict

    periods_per_day          = max(1, min(int(body.get('periods_per_day', 8)), 12))
    max_teacher_per_day      = max(1, min(int(body.get('max_teacher_per_day', 5)), periods_per_day))
    period_duration_minutes  = max(15, min(int(body.get('period_duration_minutes', 45)), 120))
    _raw_start               = body.get('school_start_time', '08:00')
    try:
        _sh, _sm = [int(x) for x in str(_raw_start).split(':')[:2]]
    except Exception:
        _sh, _sm = 8, 0
    _bp_raw             = body.get('break_periods') or []
    break_periods       = set(
        int(b) for b in _bp_raw
        if str(b).lstrip('-').isdigit() and 1 <= int(b) <= periods_per_day
    )
    DAYS    = 5
    PERIODS = [p for p in range(1, periods_per_day + 1) if p not in break_periods]

    # ── 1. Clear existing timetable ───────────────────────────────
    TimetableSlot.objects.filter(school=school).delete()

    # ── 2. Build raw assignment list ──────────────────────────────
    tsc_qs = TeacherSubjectClass.objects.filter(
        classroom__school=school, is_active=True
    ).select_related('teacher__user', 'subject', 'classroom')

    raw = list(tsc_qs)

    if not raw:
        # Fallback: all subjects × all classes, teachers distributed round-robin
        classes  = list(ClassRoom.objects.filter(school=school, is_active=True))
        subjects = list(Subject.objects.filter(school=school, is_active=True))
        teachers = list(Teacher.objects.filter(school=school, is_active=True))

        class _Assign:
            __slots__ = ('teacher', 'subject', 'classroom')
            def __init__(self, t, s, c):
                self.teacher   = t
                self.subject   = s
                self.classroom = c

        for cls in classes:
            for idx, subj in enumerate(subjects):
                t = teachers[idx % len(teachers)] if teachers else None
                raw.append(_Assign(t, subj, cls))

    # ── 3. Expand into sessions (distribute periods-per-week) ─────
    cls_assignments = defaultdict(list)
    for ta in raw:
        cls_assignments[ta.classroom.id].append(ta)

    active_per_week = DAYS * len(PERIODS)   # total non-break slots per class/week
    sessions = []
    for cls_id, tas in cls_assignments.items():
        n    = len(tas)
        each = max(1, active_per_week // n)
        for ta in tas:
            for _ in range(each):
                tid = ta.teacher.id if ta.teacher else None
                sessions.append({
                    'classroom':  ta.classroom,
                    'subject':    ta.subject,
                    'teacher':    ta.teacher,
                    'cls_id':     ta.classroom.id,
                    'subj_id':    ta.subject.id,
                    'teacher_id': tid,
                })

    # ── 4. Sort: most-constrained (busiest) teacher first ─────────
    # A teacher appearing in the most sessions is the hardest to schedule;
    # placing those sessions first reduces downstream conflicts.
    teacher_session_count = Counter(
        s['teacher_id'] for s in sessions if s['teacher_id'] is not None
    )
    sessions.sort(
        key=lambda s: -(teacher_session_count.get(s['teacher_id'], 0)
                        if s['teacher_id'] is not None else 0)
    )

    # ── 5. Slot order: period-major ────────────────────────────────
    # (P1,Mon)(P1,Tue)…(P1,Fri)(P2,Mon)… ensures sessions are spread
    # across all five days before a second period on any day is used.
    SLOT_ORDER = [(day, period) for period in PERIODS for day in range(DAYS)]

    # ── 6. Mutable state ─────────────────────────────────────────
    grid            = {}   # (cls_id, day, period)    → session dict
    teacher_grid    = {}   # (teacher_id, day, period) → True
    teacher_slot_map = {}  # (teacher_id, day, period) → (cls_id, day, period)
    teacher_day_ct  = {}   # (teacher_id, day)         → int
    subj_day_set    = {}   # (cls_id, day)             → set of subj_ids

    def _is_free(s, day, period):
        cid = s['cls_id']
        tid = s['teacher_id']
        sid = s['subj_id']
        if (cid, day, period) in grid:
            return False
        if tid is not None and (tid, day, period) in teacher_grid:
            return False
        if tid is not None and teacher_day_ct.get((tid, day), 0) >= max_teacher_per_day:
            return False
        if sid in subj_day_set.get((cid, day), set()):
            return False
        return True

    def _place(s, day, period):
        cid = s['cls_id']
        tid = s['teacher_id']
        sid = s['subj_id']
        grid[(cid, day, period)] = s
        if tid is not None:
            teacher_grid[(tid, day, period)]   = True
            teacher_slot_map[(tid, day, period)] = (cid, day, period)
            teacher_day_ct[(tid, day)]           = teacher_day_ct.get((tid, day), 0) + 1
        subj_day_set.setdefault((cid, day), set()).add(sid)

    def _unplace(s, day, period):
        cid = s['cls_id']
        tid = s['teacher_id']
        sid = s['subj_id']
        grid.pop((cid, day, period), None)
        if tid is not None:
            teacher_grid.pop((tid, day, period), None)
            teacher_slot_map.pop((tid, day, period), None)
            key = (tid, day)
            teacher_day_ct[key] = max(0, teacher_day_ct.get(key, 0) - 1)
        if (cid, day) in subj_day_set:
            subj_day_set[(cid, day)].discard(sid)

    # ── 7. Phase 1: Greedy placement ─────────────────────────────
    unplaced = []
    for s in sessions:
        placed = False
        for day, period in SLOT_ORDER:
            if _is_free(s, day, period):
                _place(s, day, period)
                placed = True
                break
        if not placed:
            unplaced.append(s)

    # ── 8. Phase 2: Swap-based repair ────────────────────────────
    # For each unplaced session, look for a slot occupied by a single
    # blocking session that can itself be moved to a different slot.
    repaired = 0
    for s in unplaced:
        cid = s['cls_id']
        tid = s['teacher_id']
        placed = False

        for day, period in SLOT_ORDER:
            # Identify the blocker (class-occupancy has priority; teacher second)
            blocker = None
            if (cid, day, period) in grid:
                blocker = grid[(cid, day, period)]
            elif tid is not None and (tid, day, period) in teacher_grid:
                gkey = teacher_slot_map.get((tid, day, period))
                if gkey:
                    blocker = grid.get(gkey)

            if blocker is None:
                continue

            # Temporarily remove the blocker and check if s can now go here
            _unplace(blocker, day, period)
            if _is_free(s, day, period):
                # Place s FIRST so its teacher's daily count is already
                # reflected when we search for a new slot for the blocker.
                # This prevents a shared teacher being placed twice on the
                # same day if the blocker's new slot happens to be that day.
                _place(s, day, period)
                moved = False
                for d2, p2 in SLOT_ORDER:
                    if (d2, p2) != (day, period) and _is_free(blocker, d2, p2):
                        _place(blocker, d2, p2)
                        repaired += 1
                        moved = True
                        break
                if moved:
                    placed = True
                    break
                else:
                    # Couldn't relocate blocker — undo s and restore blocker
                    _unplace(s, day, period)
                    _place(blocker, day, period)
            else:
                # Even without the blocker s still can't go here (teacher limit
                # or another conflict) — restore blocker and try next slot
                _place(blocker, day, period)

    # ── 9. Persist results ────────────────────────────────────────
    import datetime as _dt
    _school_start = _dt.time(_sh, _sm)

    def _slot_times(period_num):
        total_start_minutes = _sh * 60 + _sm + (period_num - 1) * period_duration_minutes
        s_h, s_m = divmod(total_start_minutes, 60)
        e_total  = total_start_minutes + period_duration_minutes
        e_h, e_m = divmod(e_total, 60)
        return _dt.time(s_h % 24, s_m), _dt.time(e_h % 24, e_m)

    slots_to_create = []
    for (_cls_id, day, period), s in grid.items():
        t_start, t_end = _slot_times(period)
        slots_to_create.append(TimetableSlot(
            school=school,
            classroom=s['classroom'],
            subject=s['subject'],
            teacher=s['teacher'],
            day_of_week=day,
            period_number=period,
            start_time=t_start,
            end_time=t_end,
        ))

    TimetableSlot.objects.bulk_create(slots_to_create, ignore_conflicts=True)
    actual    = TimetableSlot.objects.filter(school=school).count()
    attempted = len(sessions)
    skipped   = max(0, len(unplaced) - repaired)

    return JsonResponse({
        'success':     True,
        'message':     '%d slot(s) placed, %d repaired by swap, %d skipped.' % (
                           actual, repaired, skipped),
        'total_slots': actual,
        'attempted':   attempted,
        'repaired':    repaired,
        'skipped':     skipped,
    })


@csrf_exempt
def api_timetable_slot(request, slot_id):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        slot = TimetableSlot.objects.get(id=slot_id, school=school)
    except TimetableSlot.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Slot not found.'}, status=404)

    if request.method == 'PUT':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        if body.get('teacher_id'):
            try:
                slot.teacher = Teacher.objects.get(id=body['teacher_id'], school=school)
            except Teacher.DoesNotExist:
                pass
        if body.get('subject_id'):
            try:
                slot.subject = Subject.objects.get(id=body['subject_id'], school=school)
            except Subject.DoesNotExist:
                pass
        slot.save()
        return JsonResponse({'success': True, 'message': 'Slot updated.'})

    if request.method == 'DELETE':
        slot.delete()
        return JsonResponse({'success': True, 'message': 'Slot deleted.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# =================================================================
# PARENT MANAGEMENT (school-admin view)
# =================================================================

@csrf_exempt
def api_parents(request):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        from django.db.models import Q as _Q
        qs = Parent.objects.filter(school=school).select_related('user')
        q = request.GET.get('q', '').strip()
        if q:
            qs = qs.filter(
                _Q(user__first_name__icontains=q) |
                _Q(user__last_name__icontains=q) |
                _Q(user__email__icontains=q) |
                _Q(phone_number__icontains=q)
            )
        data = []
        for p in qs.order_by('user__last_name')[:100]:
            children = ParentStudent.objects.filter(parent=p).select_related(
                'student__user', 'student__classroom'
            )
            data.append({
                'id':           p.id,
                'name':         p.user.get_full_name() or p.user.username,
                'email':        p.user.email,
                'phone':        p.phone_number,
                'relationship': p.relationship,
                'children': [{
                    'id':        ps.student.id,
                    'name':      ps.student.user.get_full_name(),
                    'class':     ps.student.classroom.name if ps.student.classroom else '-',
                    'admission': ps.student.admission_number,
                } for ps in children],
            })
        return JsonResponse({'success': True, 'parents': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

        first_name   = (body.get('first_name')   or '').strip()
        last_name    = (body.get('last_name')    or '').strip()
        email        = (body.get('email')        or '').strip().lower()
        phone        = (body.get('phone')        or body.get('phone_number') or '').strip()
        relationship = (body.get('relationship') or 'Guardian').strip()
        occupation   = (body.get('occupation')   or '').strip()
        password     = (body.get('password')     or '').strip()

        if not first_name or not last_name:
            return JsonResponse({'success': False, 'message': 'first_name and last_name are required.'}, status=400)
        if not email:
            return JsonResponse({'success': False, 'message': 'email is required.'}, status=400)
        if not password or len(password) < 8:
            return JsonResponse({'success': False, 'message': 'password must be at least 8 characters.'}, status=400)
        if User.objects.filter(email=email).exists():
            return JsonResponse({'success': False, 'message': 'A user with that email already exists.'}, status=409)

        base_username = re.sub(r'[^a-z0-9_]', '', f"par_{school.code}_{last_name}".lower())[:50]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1

        try:
            user = User.objects.create_user(
                username=username, email=email,
                first_name=first_name, last_name=last_name,
                password=password,
            )
            parent = Parent.objects.create(
                school=school, user=user,
                phone_number=phone, relationship=relationship,
                occupation=occupation,
            )
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

        # Send credential email
        html_content = (
            f'<p>Hello {user.get_full_name()},</p>'
            f'<p>A parent account has been created for you at <strong>{school.name}</strong>.</p>'
            f'<p>Use the credentials below to access the parent portal:</p>'
            f'<ul>'
            f'<li><strong>Email:</strong> {email}</li>'
            f'<li><strong>Password:</strong> {password}</li>'
            f'</ul>'
            f'<p>Please change your password after first login.</p>'
        )
        _send_notification_email(
            subject=f'Your parent portal account at {school.name}',
            to_email=email,
            html_content=html_content,
        )

        return JsonResponse({
            'success':        True,
            'message':        'Parent account created successfully.',
            'id':             parent.id,
            'full_name':      user.get_full_name(),
            'login_email':    email,
            'login_username': username,
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# =================================================================
# STUDENT ↔ PARENT LINKING  (school-admin)
# =================================================================

@csrf_exempt
def api_student_parents(request, student_id):
    """
    GET  — list parents linked to a student
    POST — link an existing parent to a student
    """
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        student = Student.objects.get(id=student_id, school=school)
    except Student.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Student not found.'}, status=404)

    if request.method == 'GET':
        links = ParentStudent.objects.filter(student=student).select_related('parent__user')
        data = [{
            'parent_id':        link.parent.id,
            'full_name':        link.parent.user.get_full_name(),
            'email':            link.parent.user.email,
            'phone':            link.parent.phone_number,
            'relationship':     link.parent.relationship,
            'relationship_type': link.relationship_type,
            'is_primary':       link.is_primary_contact,
        } for link in links.order_by('-is_primary_contact', 'parent__user__last_name')]
        return JsonResponse({'success': True, 'parents': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

        parent_id         = body.get('parent_id')
        relationship_type = (body.get('relationship_type') or '').strip()
        is_primary        = bool(body.get('is_primary_contact', False))

        if not parent_id:
            return JsonResponse({'success': False, 'message': 'parent_id is required.'}, status=400)
        try:
            parent = Parent.objects.get(id=parent_id, school=school)
        except Parent.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Parent not found in this school.'}, status=404)

        if ParentStudent.objects.filter(parent=parent, student=student).exists():
            return JsonResponse({'success': False, 'message': 'This parent is already linked to this student.'}, status=409)

        # If marking as primary, clear existing primary flag
        if is_primary:
            ParentStudent.objects.filter(student=student, is_primary_contact=True).update(is_primary_contact=False)

        ParentStudent.objects.create(
            parent=parent, student=student,
            relationship_type=relationship_type,
            is_primary_contact=is_primary,
        )
        return JsonResponse({'success': True, 'message': f'{parent.user.get_full_name()} linked to {student.user.get_full_name()}.'}, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_student_parent_detail(request, student_id, parent_id):
    """
    PATCH  — update link (relationship_type, is_primary_contact)
    DELETE — unlink parent from student
    """
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        student = Student.objects.get(id=student_id, school=school)
        parent  = Parent.objects.get(id=parent_id, school=school)
        link    = ParentStudent.objects.get(student=student, parent=parent)
    except (Student.DoesNotExist, Parent.DoesNotExist, ParentStudent.DoesNotExist):
        return JsonResponse({'success': False, 'message': 'Link not found.'}, status=404)

    if request.method in ('PATCH', 'PUT'):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        if 'relationship_type' in body:
            link.relationship_type = body['relationship_type']
        if 'is_primary_contact' in body:
            make_primary = bool(body['is_primary_contact'])
            if make_primary:
                ParentStudent.objects.filter(student=student, is_primary_contact=True).exclude(id=link.id).update(is_primary_contact=False)
            link.is_primary_contact = make_primary
        link.save()
        return JsonResponse({'success': True, 'message': 'Link updated.'})

    if request.method == 'DELETE':
        link.delete()
        return JsonResponse({'success': True, 'message': f'{parent.user.get_full_name()} unlinked from {student.user.get_full_name()}.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# =================================================================
# FEE RECEIPT
# =================================================================

@csrf_exempt
def api_fee_receipt(request, fee_id):
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        fee = FeeRecord.objects.get(id=fee_id, school=school)
    except FeeRecord.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Fee record not found.'}, status=404)

    receipt_number = 'RCP-%04d-%06d' % (school.id, fee.id)
    return JsonResponse({
        'success': True,
        'receipt': {
            'receipt_number': receipt_number,
            'school_name':    school.name,
            'student_name':   fee.student.user.get_full_name(),
            'description':    fee.description,
            'amount':         float(fee.amount),
            'amount_paid':    float(fee.amount_paid),
            'balance':        float(fee.balance),
            'status':         fee.status,
            'term':           fee.term.name if fee.term else None,
            'due_date':       str(fee.due_date) if fee.due_date else None,
            'paid_date':      str(fee.paid_date) if fee.paid_date else None,
            'generated_at':   datetime.datetime.now().strftime('%Y-%m-%d %H:%M'),
        },
    })


# =================================================================
# FINANCE USERS (School-admin creates/manages ACCOUNTANT staff)
# =================================================================

@csrf_exempt
def api_finance_users(request):
    """
    GET  → list all finance staff (role=ACCOUNTANT) for this school
    POST → create a new finance user (User + SchoolStaffAccount)
    """
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        accounts = SchoolStaffAccount.objects.filter(
            school=school, role='ACCOUNTANT'
        ).select_related('user').order_by('-created_at')
        data = [{
            'id':         a.id,
            'full_name':  a.user.get_full_name() or a.user.username,
            'email':      a.user.email,
            'phone':      a.phone_number,
            'status':     a.account_status,
            'is_active':  a.is_active,
            'created_at': a.created_at.strftime('%Y-%m-%d'),
        } for a in accounts]
        return JsonResponse({'success': True, 'finance_users': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

        email      = (body.get('email') or '').strip().lower()
        first_name = (body.get('first_name') or '').strip()
        last_name  = (body.get('last_name') or '').strip()
        phone      = (body.get('phone') or '').strip()
        password   = body.get('password') or ''

        if not email or not password:
            return JsonResponse({'success': False, 'message': 'Email and password are required.'}, status=400)
        if len(password) < 8:
            return JsonResponse({'success': False, 'message': 'Password must be at least 8 characters.'}, status=400)
        if User.objects.filter(email=email).exists():
            return JsonResponse({'success': False, 'message': 'A user with that email already exists.'}, status=409)

        # Use email as username; ensure username uniqueness
        username = email
        if User.objects.filter(username=username).exists():
            username = email.split('@')[0] + '_' + str(school.id)

        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
            )
            account = SchoolStaffAccount.objects.create(
                user=user,
                school=school,
                role='ACCOUNTANT',
                job_title='Finance Officer',
                phone_number=phone,
                is_active=True,
                account_status='ACTIVE',
                created_by=actor,
            )
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

        return JsonResponse({
            'success': True,
            'id':      account.id,
            'message': 'Finance user created successfully.',
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_finance_user_toggle(request, uid):
    """
    PUT /api/school/finance-users/<uid>/
    Toggles the finance user's active/suspended status.
    """
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method != 'PUT':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)

    try:
        account = SchoolStaffAccount.objects.get(id=uid, school=school, role='ACCOUNTANT')
    except SchoolStaffAccount.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Finance user not found.'}, status=404)

    account.is_active      = not account.is_active
    account.account_status = 'ACTIVE' if account.is_active else 'SUSPENDED'
    account.user.is_active = account.is_active
    account.user.save(update_fields=['is_active'])
    account.save(update_fields=['is_active', 'account_status'])

    action = 'activated' if account.is_active else 'suspended'
    return JsonResponse({
        'success':   True,
        'is_active': account.is_active,
        'status':    account.account_status,
        'message':   'Finance user %s.' % action,
    })


@csrf_exempt
def api_principal_users(request):
    """
    GET  → list all principal accounts (role=PRINCIPAL) for this school
    POST → create a new principal (User + SchoolStaffAccount)
    """
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        accounts = SchoolStaffAccount.objects.filter(
            school=school, role='PRINCIPAL'
        ).select_related('user').order_by('-created_at')
        data = [{
            'id':         a.id,
            'full_name':  a.user.get_full_name() or a.user.username,
            'email':      a.user.email,
            'phone':      a.phone_number,
            'status':     a.account_status,
            'is_active':  a.is_active,
            'created_at': a.created_at.strftime('%Y-%m-%d'),
        } for a in accounts]
        return JsonResponse({'success': True, 'principal_users': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

        email      = (body.get('email') or '').strip().lower()
        first_name = (body.get('first_name') or '').strip()
        last_name  = (body.get('last_name') or '').strip()
        phone      = (body.get('phone') or '').strip()
        password   = body.get('password') or ''

        if not email or not password:
            return JsonResponse({'success': False, 'message': 'Email and password are required.'}, status=400)
        if len(password) < 8:
            return JsonResponse({'success': False, 'message': 'Password must be at least 8 characters.'}, status=400)
        if User.objects.filter(email=email).exists():
            return JsonResponse({'success': False, 'message': 'A user with that email already exists.'}, status=409)

        username = email
        if User.objects.filter(username=username).exists():
            username = email.split('@')[0] + '_' + str(school.id)

        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
            )
            account = SchoolStaffAccount.objects.create(
                user=user,
                school=school,
                role='PRINCIPAL',
                job_title='Principal',
                phone_number=phone,
                is_active=True,
                account_status='ACTIVE',
                created_by=actor,
            )
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

        return JsonResponse({
            'success': True,
            'id':      account.id,
            'message': 'Principal created successfully.',
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_principal_user_toggle(request, uid):
    """
    PUT /api/school/principal-users/<uid>/
    Toggles the principal's active/suspended status.
    """
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method != 'PUT':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)

    try:
        account = SchoolStaffAccount.objects.get(id=uid, school=school, role='PRINCIPAL')
    except SchoolStaffAccount.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Principal not found.'}, status=404)

    account.is_active      = not account.is_active
    account.account_status = 'ACTIVE' if account.is_active else 'SUSPENDED'
    account.user.is_active = account.is_active
    account.user.save(update_fields=['is_active'])
    account.save(update_fields=['is_active', 'account_status'])

    action = 'activated' if account.is_active else 'suspended'
    return JsonResponse({
        'success':   True,
        'is_active': account.is_active,
        'status':    account.account_status,
        'message':   'Principal %s.' % action,
    })


# =================================================================
# UNIFIED STAFF ACCOUNTS  (Registrar, Librarian, Counselor, etc.)
# GET/POST  /api/school/staff/
# GET/PUT/DELETE  /api/school/staff/<id>/
# =================================================================

STAFF_ROLES = {
    'ACCOUNTANT': 'Finance Officer',
    'PRINCIPAL':  'Principal',
    'REGISTRAR':  'Registrar',
    'LIBRARIAN':  'Librarian',
    'COUNSELOR':  'Counselor',
    'STAFF':      'Administrative Staff',
}


def _staff_account_to_dict(a):
    return {
        'id':          a.id,
        'full_name':   a.user.get_full_name() or a.user.username,
        'first_name':  a.user.first_name,
        'last_name':   a.user.last_name,
        'email':       a.user.email,
        'username':    a.user.username,
        'phone':       a.phone_number,
        'role':        a.role,
        'role_label':  a.get_role_display(),
        'job_title':   a.job_title,
        'department':  a.department,
        'status':      a.account_status,
        'is_active':   a.is_active,
        'created_at':  a.created_at.strftime('%Y-%m-%d'),
        'activated_at': a.activated_at.strftime('%Y-%m-%d %H:%M') if a.activated_at else None,
    }


@csrf_exempt
def api_staff_accounts(request):
    """
    GET  /api/school/staff/?role=REGISTRAR   — list staff, optionally filtered by role
    POST /api/school/staff/                  — create a new staff account
    """
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    if request.method == 'GET':
        qs = SchoolStaffAccount.objects.filter(school=school).select_related('user').order_by('-created_at')
        role_filter = request.GET.get('role', '').strip().upper()
        if role_filter and role_filter in STAFF_ROLES:
            qs = qs.filter(role=role_filter)
        return JsonResponse({
            'success': True,
            'staff':   [_staff_account_to_dict(a) for a in qs],
            'count':   qs.count(),
            'roles':   [{'value': k, 'label': v} for k, v in STAFF_ROLES.items()],
        })

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

        first_name = (body.get('first_name') or '').strip()
        last_name  = (body.get('last_name')  or '').strip()
        email      = (body.get('email')      or '').strip().lower()
        phone      = (body.get('phone')      or '').strip()
        role       = (body.get('role')       or '').strip().upper()
        job_title  = (body.get('job_title')  or '').strip()
        department = (body.get('department') or '').strip()
        password   = (body.get('password')   or '').strip()

        if not first_name or not last_name:
            return JsonResponse({'success': False, 'message': 'first_name and last_name are required.'}, status=400)
        if not email:
            return JsonResponse({'success': False, 'message': 'email is required.'}, status=400)
        if not role or role not in STAFF_ROLES:
            return JsonResponse({
                'success': False,
                'message': f'role is required. Valid roles: {", ".join(STAFF_ROLES.keys())}',
            }, status=400)
        if not password or len(password) < 8:
            return JsonResponse({'success': False, 'message': 'password must be at least 8 characters.'}, status=400)
        if User.objects.filter(email=email).exists():
            return JsonResponse({'success': False, 'message': 'A user with that email already exists.'}, status=409)

        # Generate unique username: role_prefix + school_code + last_name
        role_prefix = role[:3].lower()
        base_username = re.sub(r'[^a-z0-9_]', '', f"{role_prefix}_{school.code}_{last_name}".lower())[:50]
        username = base_username
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f"{base_username}_{counter}"
            counter += 1

        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name,
            )
            account = SchoolStaffAccount.objects.create(
                user=user,
                school=school,
                role=role,
                job_title=job_title or STAFF_ROLES[role],
                department=department,
                phone_number=phone,
                is_active=True,
                account_status='ACTIVE',
                activated_at=timezone.now(),
                created_by=actor,
            )
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=400)

        # Send credential email
        if email:
            html_content = (
                f'<p>Hello {user.get_full_name()},</p>'
                f'<p>Your staff account has been created at <strong>{school.name}</strong> '
                f'with the role of <strong>{account.get_role_display()}</strong>.</p>'
                f'<p>Use the credentials below to log in:</p>'
                f'<ul>'
                f'<li><strong>Email / Username:</strong> {email}</li>'
                f'<li><strong>Password:</strong> {password}</li>'
                f'</ul>'
                f'<p>Please change your password after first login.</p>'
                f'<p>© {datetime.datetime.now().year} EK-SMS</p>'
            )
            _send_notification_email(
                subject=f'Your {account.get_role_display()} account at {school.name}',
                to_email=email,
                html_content=html_content,
            )

        return JsonResponse({
            'success':  True,
            'message':  f'{account.get_role_display()} account created successfully.',
            'staff':    _staff_account_to_dict(account),
            'login_email':    email,
            'login_username': username,
        }, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_staff_account_detail(request, staff_id):
    """
    GET    /api/school/staff/<id>/  — retrieve single staff account
    PUT    /api/school/staff/<id>/  — update details or change status (activate/suspend/terminate)
    DELETE /api/school/staff/<id>/  — soft-delete (terminate) the account
    """
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    try:
        account = SchoolStaffAccount.objects.select_related('user').get(id=staff_id, school=school)
    except SchoolStaffAccount.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Staff account not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'success': True, 'staff': _staff_account_to_dict(account)})

    if request.method == 'PUT':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

        # Update user fields
        u = account.user
        u.first_name = body.get('first_name', u.first_name).strip()
        u.last_name  = body.get('last_name',  u.last_name).strip()
        if body.get('email') and body['email'].strip().lower() != u.email:
            new_email = body['email'].strip().lower()
            if User.objects.exclude(id=u.id).filter(email=new_email).exists():
                return JsonResponse({'success': False, 'message': 'That email is already in use.'}, status=409)
            u.email = new_email
        u.save(update_fields=['first_name', 'last_name', 'email'])

        # Update account fields
        if body.get('phone'):       account.phone_number = body['phone'].strip()
        if body.get('job_title'):   account.job_title    = body['job_title'].strip()
        if body.get('department'):  account.department   = body['department'].strip()

        # Status change
        new_status = (body.get('status') or '').upper()
        if new_status == 'ACTIVE':
            account.activate_account()
        elif new_status == 'SUSPENDED':
            account.suspend_account()
        elif new_status == 'TERMINATED':
            account.terminate_account()
        else:
            account.save()

        return JsonResponse({'success': True, 'message': 'Staff account updated.', 'staff': _staff_account_to_dict(account)})

    if request.method == 'DELETE':
        account.terminate_account()
        return JsonResponse({'success': True, 'message': 'Staff account terminated.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_student_stats(request):
    """
    GET /api/school/student-stats/
    Returns student module metrics: totals, flagged count, avg attendance, 8-month enrollment trend.
    """
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)

    qs = Student.objects.filter(school=school, is_active=True).prefetch_related('attendance')
    total = qs.count()

    # Attendance + flagged
    flagged_count = 0
    att_rates = []
    for s in qs:
        att_all   = list(s.attendance.all())
        total_att = len(att_all)
        if total_att > 0:
            present_c = sum(1 for a in att_all if a.status in ('present', 'late', 'excused'))
            rate = round((present_c / total_att) * 100, 1)
            att_rates.append(rate)
            if rate < 70:
                flagged_count += 1

    avg_attendance = round(sum(att_rates) / len(att_rates), 1) if att_rates else None

    # New this term: admitted in last 30 days
    thirty_days_ago = timezone.now().date() - datetime.timedelta(days=30)
    new_this_term   = qs.filter(admission_date__gte=thirty_days_ago).count()

    # Monthly enrollment trend: last 8 months
    today = timezone.now().date()
    monthly_trend = []
    for i in range(7, -1, -1):
        pivot       = today.replace(day=1) - datetime.timedelta(days=(i * 28))
        month_start = pivot.replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1, day=1)
        count = Student.objects.filter(
            school=school,
            admission_date__gte=month_start,
            admission_date__lt=month_end
        ).count()
        monthly_trend.append({'month': month_start.strftime('%b'), 'count': count})

    return JsonResponse({
        'success':       True,
        'total':         total,
        'active':        total,
        'new_this_term': new_this_term,
        'flagged':       flagged_count,
        'avg_attendance': avg_attendance,
        'monthly_trend': monthly_trend,
    })


# ── Teacher Stats ─────────────────────────────────────────────────────

@csrf_exempt
def api_teacher_stats(request):
    """Workforce analytics header stats + overloaded list."""
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)

    teachers = Teacher.objects.filter(school=school, is_active=True)\
        .select_related('user')\
        .prefetch_related('subject_classes')

    total   = teachers.count()
    periods_list = []
    overloaded_list = []
    for t in teachers:
        p = t.subject_classes.filter(is_active=True).count()
        periods_list.append(p)
        if p > 20:
            overloaded_list.append({
                'id': t.id,
                'full_name': t.user.get_full_name(),
                'periods': p,
            })

    avg_periods  = round(sum(periods_list) / len(periods_list), 1) if periods_list else 0
    overloaded   = len(overloaded_list)

    # Monthly hire trend: last 6 months
    today = timezone.now().date()
    monthly_trend = []
    for i in range(5, -1, -1):
        pivot = today.replace(day=1) - datetime.timedelta(days=(i * 28))
        month_start = pivot.replace(day=1)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1, day=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1, day=1)
        count = Teacher.objects.filter(
            school=school, hire_date__gte=month_start, hire_date__lt=month_end
        ).count()
        monthly_trend.append({'month': month_start.strftime('%b'), 'count': count})

    return JsonResponse({
        'success': True,
        'total': total,
        'active': total,
        'overloaded': overloaded,
        'avg_periods': avg_periods,
        'overloaded_list': overloaded_list,
        'monthly_trend': monthly_trend,
    })


# ══════════════════════════════════════════════════════════════
# TEACHER PORTAL ENDPOINTS
# ══════════════════════════════════════════════════════════════

def _get_teacher_profile(request):
    """Returns (user, teacher) for authenticated teacher requests, or (None, None)."""
    user = _get_authed_user(request)
    if not user:
        return None, None
    try:
        return user, user.teacher_profile
    except Exception:
        return None, None


@csrf_exempt
def api_teacher_me(request):
    """Teacher profile + school + assigned classes/subjects."""
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    school = teacher.school
    tscs = teacher.subject_classes.select_related('subject', 'classroom').filter(is_active=True)
    classes = [{
        'id': tsc.classroom.id,
        'name': tsc.classroom.name,
        'subject': {
            'id': tsc.subject.id,
            'name': tsc.subject.name,
        },
        'room': tsc.classroom.code, # Using code as room name for now
        'student_count': tsc.classroom.students.filter(is_active=True).count(),
    } for tsc in tscs]
    subjects = list({tsc.subject.name for tsc in tscs})

    badge_url = None
    if school and school.badge:
        try:
            badge_url = request.build_absolute_uri(school.badge.url)
        except Exception:
            badge_url = None

    try:
        from django_otp import devices_for_user as _otp_devices
        has_2fa = any(d.confirmed for d in _otp_devices(user))
    except Exception:
        has_2fa = False

    # Session count
    from eksms_core.models import UserToken
    session_count = UserToken.objects.filter(user=user).count()

    return JsonResponse({
        'success': True,
        'teacher': {
            'id': teacher.id,
            'firstName': user.first_name,
            'lastName': user.last_name,
            'fullName': user.get_full_name(),
            'initials': (user.first_name[0] if user.first_name else '') + (user.last_name[0] if user.last_name else ''),
            'email': user.email,
            'phone': teacher.phone_number,
            'qualification': teacher.qualification or 'Teacher',
            'employeeNumber': teacher.employee_id,
            'school': school.name if school else 'N/A',
            'joinedDate': str(teacher.hire_date) if teacher.hire_date else None,
            'status': 'active' if user.is_active else 'inactive',
            'lastLogin': user.last_login.isoformat() if user.last_login else None,
            'activeSessions': session_count,
            'twoFactorEnabled': has_2fa,
            'specializations': subjects,
            'subjects': subjects,
            'classes': classes,
            'periods_per_week': len(classes),
            'student_count': sum(c['student_count'] for c in classes),
            'has_2fa': has_2fa,
        }
    })


@csrf_exempt
def api_teacher_classes(request):
    """List all classes + subjects assigned to this teacher with grade stats."""
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    from eksms_core.models import Term, Grade
    from django.db.models import Q
    
    # Get current active term for this school
    term = Term.objects.filter(academic_year__school=teacher.school, is_active=True).first()
    
    tscs = teacher.subject_classes.select_related('subject', 'classroom').filter(is_active=True)
    classes_out = []
    seen = set()
    for tsc in tscs:
        key = (tsc.classroom.id, tsc.subject.id)
        if key in seen:
            continue
        seen.add(key)
        
        # Calculate grade stats
        total_students = tsc.classroom.students.filter(is_active=True).count()
        if term:
            grades_qs = Grade.objects.filter(student__classroom=tsc.classroom, subject=tsc.subject, term=term)
            locked = grades_qs.filter(is_locked=True).count()
            draft  = grades_qs.filter(is_locked=False).filter(
                Q(continuous_assessment__gt=0) | Q(mid_term_exam__gt=0) | Q(final_exam__gt=0)
            ).count()
            pending = total_students - (locked + draft)
        else:
            locked = 0
            draft = 0
            pending = total_students
            
        classes_out.append({
            'id': tsc.classroom.id,
            'name': tsc.classroom.name,
            'subject': {
                'id': tsc.subject.id,
                'name': tsc.subject.name,
            },
            'room': tsc.classroom.code,
            'student_count': total_students,
            'gradeStats': {
                'total': total_students,
                'locked': locked,
                'draft': draft,
                'pending': pending,
            }
        })
    return JsonResponse({'success': True, 'classes': classes_out})


@csrf_exempt
def api_teacher_students(request):
    """All students in this teacher's classes, optionally filtered by classroom."""
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    classroom_id = request.GET.get('classroom_id')
    tscs = teacher.subject_classes.select_related('subject', 'classroom').filter(is_active=True)
    if classroom_id:
        tscs = tscs.filter(classroom__id=classroom_id)

    seen_students = set()
    students_out = []
    for tsc in tscs:
        for s in tsc.classroom.students.filter(is_active=True).select_related('user'):
            if s.id in seen_students:
                continue
            seen_students.add(s.id)
            students_out.append({
                'id':               s.id,
                'first_name':       s.user.first_name,
                'last_name':        s.user.last_name,
                'full_name':        s.user.get_full_name(),
                'student_id':       s.admission_number,
                'admission_number': s.admission_number,
                'classroom':        tsc.classroom.name,
                'classroom_id':     tsc.classroom.id,
                'email':            s.user.email,
            })

    students_out.sort(key=lambda x: x['full_name'])
    return JsonResponse({'success': True, 'students': students_out, 'count': len(students_out)})


@csrf_exempt
def api_teacher_attendance(request):
    """GET: fetch attendance for a class+date. POST: bulk save attendance records."""
    from eksms_core.models import Attendance
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    if request.method == 'GET':
        classroom_id = request.GET.get('classroom_id')
        date_str     = request.GET.get('date', str(timezone.now().date()))
        if not classroom_id:
            return JsonResponse({'success': False, 'message': 'classroom_id required.'}, status=400)
        records = Attendance.objects.filter(
            classroom_id=classroom_id, date=date_str
        ).select_related('student__user')
        data = [{
            'student_id': r.student.id,
            'full_name':  r.student.user.get_full_name(),
            'status': r.status,
            'notes': r.notes,
        } for r in records]
        return JsonResponse({'success': True, 'date': date_str, 'records': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        classroom_id = body.get('classroom_id')
        date_str     = body.get('date', str(timezone.now().date()))
        records      = body.get('records', [])
        if not classroom_id or not records:
            return JsonResponse({'success': False, 'message': 'classroom_id and records required.'}, status=400)

        # Verify teacher is assigned to this classroom
        if not teacher.subject_classes.filter(classroom_id=classroom_id, is_active=True).exists():
            return JsonResponse({'success': False, 'message': 'Not assigned to this classroom.'}, status=403)

        try:
            classroom = ClassRoom.objects.get(id=classroom_id)
        except ClassRoom.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Classroom not found.'}, status=404)

        saved = 0
        for rec in records:
            student_id = rec.get('student_id')
            status     = rec.get('status', 'present')
            notes      = rec.get('notes', '')
            if status not in ('present', 'absent', 'late', 'excused'):
                continue
            try:
                from eksms_core.models import Student as StudentModel
                student = StudentModel.objects.get(id=student_id, classroom=classroom)
                Attendance.objects.update_or_create(
                    student=student, date=date_str,
                    defaults={
                        'classroom': classroom,
                        'school': teacher.school,
                        'status': status,
                        'notes': notes,
                        'recorded_by': user,
                    }
                )
                saved += 1
            except Exception:
                continue
        return JsonResponse({'success': True, 'saved': saved})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_teacher_gradebook(request):
    """GET: list students + their grades for a class+subject. POST: save/update a grade."""
    from eksms_core.models import Grade, Term, AcademicYear
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    if request.method == 'GET':
        classroom_id = request.GET.get('classroom_id')
        subject_id   = request.GET.get('subject_id')
        if not classroom_id or not subject_id:
            return JsonResponse({'success': False, 'message': 'classroom_id and subject_id required.'}, status=400)

        # Verify assignment
        if not teacher.subject_classes.filter(classroom_id=classroom_id, subject_id=subject_id, is_active=True).exists():
            return JsonResponse({'success': False, 'message': 'Not assigned to this class/subject.'}, status=403)

        students = list(
            ClassRoom.objects.get(id=classroom_id).students.filter(is_active=True).select_related('user')
        )
        # Get latest active term
        active_term = Term.objects.filter(
            academic_year__school=teacher.school, is_active=True
        ).order_by('-start_date').first()

        out_students = []
        out_entries  = []
        for s in students:
            grade = None
            if active_term:
                grade = Grade.objects.filter(
                    student=s, subject_id=subject_id, term=active_term
                ).first()
            out_students.append({
                'id':         s.id,
                'first_name': s.user.first_name,
                'last_name':  s.user.last_name,
                'student_id': s.admission_number,
            })
            out_entries.append({
                'student_id': s.id,
                'ca':         float(grade.continuous_assessment) if grade else '',
                'midterm':    float(grade.mid_term_exam)         if grade else '',
                'final_exam': float(grade.final_exam)            if grade else '',
                'is_locked':  grade.is_locked if grade else False,
            })
        out_students.sort(key=lambda x: (x['last_name'], x['first_name']))
        out_entries.sort(key=lambda x: x['student_id'])
        return JsonResponse({'success': True, 'students': out_students,
                             'entries': out_entries,
                             'term': active_term.name if active_term else None})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

        subject_id   = body.get('subject_id')
        classroom_id = body.get('classroom_id')

        if not teacher.subject_classes.filter(classroom_id=classroom_id, subject_id=subject_id, is_active=True).exists():
            return JsonResponse({'success': False, 'message': 'Not assigned to this class/subject.'}, status=403)

        active_term = Term.objects.filter(
            academic_year__school=teacher.school, is_active=True
        ).order_by('-start_date').first()
        if not active_term:
            return JsonResponse({'success': False, 'message': 'No active term found.'}, status=400)

        # Grade entry window enforcement
        if not active_term.grade_entry_open:
            return JsonResponse({'success': False, 'message': 'Grade entry is not open for this term. Contact your administrator.'}, status=403)
        if active_term.grade_entry_deadline and timezone.now() > active_term.grade_entry_deadline:
            return JsonResponse({'success': False, 'message': 'Grade entry deadline has passed for this term.'}, status=403)

        entries = body.get('entries', [])
        if not entries:
            return JsonResponse({'success': False, 'message': 'entries list is required.'}, status=400)

        saved = 0
        blocked = 0
        # Pre-fetch grading scheme once for the whole batch
        _scheme_boundaries = None
        try:
            gs = GradingScheme.objects.get(school=teacher.school)
            _scheme_boundaries = sorted(gs.boundaries, key=lambda b: -b['min'])
        except GradingScheme.DoesNotExist:
            pass
        for entry in entries:
            student_id = entry.get('student_id')
            ca       = float(entry.get('ca')         or 0)
            mid_term = float(entry.get('midterm')     or 0)
            final    = float(entry.get('final_exam')  or 0)
            try:
                student = Student.objects.get(id=student_id, school=teacher.school)
                grade, created = Grade.objects.get_or_create(
                    student=student, subject_id=subject_id, term=active_term,
                    defaults={'teacher': teacher,
                              'continuous_assessment': 0, 'mid_term_exam': 0, 'final_exam': 0},
                )
                if grade.is_locked:
                    # Tamper attempt — alert all parties
                    GradeChangeAlert.objects.create(
                        grade=grade, severity='CRITICAL',
                        alert_type='locked_grade_edit_attempt',
                        description=f'Teacher {user.get_full_name()} attempted to modify locked grade for {student.user.get_full_name()}',
                        triggered_by=user,
                        ip_address=request.META.get('REMOTE_ADDR'),
                        old_value={'total_score': float(grade.total_score)},
                        new_value={'ca': ca, 'midterm': mid_term, 'final': final},
                    )
                    _write_grade_audit(grade, 'MODIFICATION_ATTEMPT', user, request,
                                       old_values={'total_score': float(grade.total_score)},
                                       new_values={'ca': ca, 'midterm': mid_term, 'final': final})
                    _dispatch_tamper_alerts(grade, user, request, teacher.school)
                    blocked += 1
                    continue
                old_vals = {'ca': float(grade.continuous_assessment), 'midterm': float(grade.mid_term_exam), 'final': float(grade.final_exam)}
                grade.teacher = teacher
                grade.continuous_assessment = min(max(ca, 0), 20)
                grade.mid_term_exam         = min(max(mid_term, 0), 30)
                grade.final_exam            = min(max(final, 0), 50)
                if _scheme_boundaries:
                    grade._boundaries = _scheme_boundaries
                grade.save()
                _write_grade_audit(grade, 'CREATE' if created else 'UPDATE', user, request,
                                   old_values=old_vals if not created else {},
                                   new_values={'ca': ca, 'midterm': mid_term, 'final': final})
                saved += 1
            except Exception:
                continue
        return JsonResponse({'success': True, 'saved': saved, 'blocked': blocked})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_teacher_change_password(request):
    """POST: teacher changes their own password."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
    current  = body.get('current_password', '')
    new_pass = body.get('new_password', '').strip()
    if not user.check_password(current):
        return JsonResponse({'success': False, 'message': 'Current password is incorrect.'}, status=400)
    ok, err = _password_strength_ok(new_pass)
    if not ok:
        return JsonResponse({'success': False, 'message': err}, status=400)
    user.set_password(new_pass)
    teacher.must_change_password = False
    teacher.save(update_fields=['must_change_password'])
    user.save()
    return JsonResponse({'success': True, 'message': 'Password updated successfully.'})


# ── Student portal ────────────────────────────────────────────────

def _get_student_profile(request):
    user = _get_authed_user(request)
    if not user:
        return None, None
    try:
        return user, user.student_profile
    except Exception:
        return None, None


@csrf_exempt
def api_student_me(request):
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    school = student.school
    att_all   = list(student.attendance.all())
    total_att = len(att_all)
    present_c = sum(1 for a in att_all if a.status in ('present', 'late', 'excused'))
    absent_c  = sum(1 for a in att_all if a.status == 'absent')
    late_c    = sum(1 for a in att_all if a.status == 'late')
    att_rate  = round((present_c / total_att) * 100, 1) if total_att > 0 else None

    grades_qs   = list(student.grades.select_related('subject', 'term').all())
    scores      = [float(g.total_score) for g in grades_qs]
    avg_score   = round(sum(scores) / len(scores), 1) if scores else None
    subjects_ct = len(set(g.subject_id for g in grades_qs))

    # upcoming exams (from Exam model, future dates, student's classroom)
    upcoming_exams = 0
    try:
        upcoming_exams = Exam.objects.filter(
            school=school,
            date__gte=datetime.date.today(),
            classroom=student.classroom,
        ).count()
    except Exception:
        pass

    pic_url = ''
    if student.passport_picture:
        try:
            pic_url = request.build_absolute_uri(student.passport_picture.url)
        except Exception:
            pass

    badge_url = ''
    if school and school.badge:
        try:
            badge_url = request.build_absolute_uri(school.badge.url)
        except Exception:
            pass

    # recent grades (last 5)
    recent_grades = [{
        'subject':      g.subject.name,
        'term':         g.term.name,
        'grade_letter': g.grade_letter,
        'total_score':  float(g.total_score),
        'is_locked':    g.is_locked,
    } for g in grades_qs[-5:]]

    # class rank from latest ClassRanking
    class_rank = None
    class_size = None
    try:
        latest_ranking = ClassRanking.objects.filter(student=student).order_by('-created_at').first()
        if latest_ranking:
            class_rank = latest_ranking.rank
            class_size = ClassRanking.objects.filter(
                term=latest_ranking.term,
                student__classroom=student.classroom,
            ).count()
    except Exception:
        pass

    must_change = getattr(getattr(user, 'student_profile', None), 'must_change_password', False)

    return JsonResponse({
        'success': True,
        'student': {
            'id':               student.id,
            'admission_number': student.admission_number,
            'full_name':        user.get_full_name(),
            'first_name':       user.first_name,
            'last_name':        user.last_name,
            'email':            user.email,
            'phone_number':     student.phone_number,
            'date_of_birth':    str(student.date_of_birth) if student.date_of_birth else None,
            'gender':           student.gender,
            'passport_picture': pic_url,
            'classroom':        student.classroom.name if student.classroom else None,
            'classroom_id':     student.classroom_id,
            'academic_year':    student.academic_year.name if student.academic_year else None,
            'school_name':      school.name if school else '',
            'school_badge':     badge_url,
            'admission_date':   str(student.admission_date),
            'must_change_password': must_change,
        },
        'stats': {
            'attendance_rate': att_rate,
            'present_days':    present_c,
            'absent_days':     absent_c,
            'late_days':       late_c,
            'total_days':      total_att,
            'avg_score':       avg_score,
            'subjects_count':  subjects_ct,
            'upcoming_exams':  upcoming_exams,
            'class_rank':      class_rank,
            'class_size':      class_size,
        },
        'recent_grades': recent_grades,
    })


@csrf_exempt
def api_student_grades(request):
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    term_id = request.GET.get('term_id')
    qs = student.grades.select_related('subject', 'term', 'teacher__user').order_by('subject__name')
    if term_id:
        try:
            qs = qs.filter(term_id=int(term_id))
        except (ValueError, TypeError):
            pass

    grades = [{
        'id':           g.id,
        'subject':      g.subject.name,
        'subject_id':   g.subject_id,
        'term':         g.term.name,
        'term_id':      g.term_id,
        'ca':           float(g.continuous_assessment),
        'midterm':      float(g.mid_term_exam),
        'final':        float(g.final_exam),
        'total_score':  float(g.total_score),
        'grade_letter': g.grade_letter,
        'is_locked':    g.is_locked,
        'teacher_name': g.teacher.user.get_full_name() if g.teacher and g.teacher.user else None,
    } for g in qs]

    terms = list(Term.objects.filter(school=student.school).values('id', 'name').order_by('-start_date'))

    scores = [g['total_score'] for g in grades]
    avg    = round(sum(scores) / len(scores), 1) if scores else None

    return JsonResponse({'success': True, 'grades': grades, 'terms': terms, 'avg_score': avg})


@csrf_exempt
def api_student_attendance(request):
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    att_qs  = list(student.attendance.order_by('-date')[:120])
    records = [{
        'id':     a.id,
        'date':   str(a.date),
        'status': a.status,
        'notes':  a.notes or '',
    } for a in att_qs]

    total   = len(records)
    present = sum(1 for r in records if r['status'] in ('present', 'late', 'excused'))
    absent  = sum(1 for r in records if r['status'] == 'absent')
    late    = sum(1 for r in records if r['status'] == 'late')
    rate    = round((present / total) * 100, 1) if total > 0 else None

    from collections import defaultdict
    monthly = defaultdict(lambda: {'present': 0, 'total': 0})
    for r in records:
        if r['date']:
            mk = r['date'][:7]
            monthly[mk]['total'] += 1
            if r['status'] in ('present', 'late', 'excused'):
                monthly[mk]['present'] += 1
    monthly_trend = [
        {'month': k, 'rate': round((v['present'] / v['total']) * 100, 1) if v['total'] > 0 else 0}
        for k, v in sorted(monthly.items())[-6:]
    ]

    return JsonResponse({
        'success':       True,
        'records':       records[:50],
        'stats':         {'total': total, 'present': present, 'absent': absent, 'late': late, 'rate': rate},
        'monthly_trend': monthly_trend,
    })


@csrf_exempt
def api_student_timetable(request):
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    if not student.classroom_id:
        return JsonResponse({'success': True, 'slots': []})

    slots = TimetableSlot.objects.filter(
        classroom_id=student.classroom_id
    ).select_related('subject', 'teacher__user').order_by('day_of_week', 'period_number')

    data = [{
        'id':           s.id,
        'day':          s.day_of_week,
        'period':       s.period_number,
        'start_time':   str(s.start_time) if s.start_time else '',
        'end_time':     str(s.end_time)   if s.end_time   else '',
        'subject':      s.subject.name    if s.subject    else '',
        'teacher':      s.teacher.user.get_full_name() if (s.teacher and s.teacher.user) else '',
    } for s in slots]

    return JsonResponse({'success': True, 'slots': data})


@csrf_exempt
def api_student_notifications(request):
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        # Mark-all path: { "mark_all": true } from the bell-clear flow
        if data.get('mark_all'):
            visible_ids = list(Notification.objects.filter(
                school=student.school, is_active=True,
                recipient_role__in=['all', 'students'],
            ).values_list('id', flat=True))
            for nid in visible_ids:
                NotificationRead.objects.get_or_create(notification_id=nid, user=user)
            return JsonResponse({'success': True, 'count': len(visible_ids)})
        notif_id = data.get('notification_id')
        if not notif_id:
            return JsonResponse({'success': False, 'message': 'notification_id required.'}, status=400)
        NotificationRead.objects.get_or_create(notification_id=notif_id, user=user)
        return JsonResponse({'success': True})

    if request.method == 'GET':
        notifs = Notification.objects.filter(
            school=student.school, is_active=True,
        ).filter(recipient_role__in=['all', 'students']).order_by('-created_at')[:50]

        read_ids = set(NotificationRead.objects.filter(user=user).values_list('notification_id', flat=True))
        data = [{
            'id':         n.id,
            'title':      n.title,
            'body':       n.body,
            'type':       n.notif_type,
            'created_at': str(n.created_at),
            'is_read':    n.id in read_ids,
        } for n in notifs]
        unread = sum(1 for d in data if not d['is_read'])
        return JsonResponse({'success': True, 'notifications': data, 'unread_count': unread})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_student_change_password(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    try:
        data         = json.loads(request.body)
        old_password = data.get('old_password', '')
        new_password = data.get('new_password', '').strip()
        if not old_password or not new_password:
            return JsonResponse({'success': False, 'message': 'Both old and new password required.'}, status=400)
        ok, err = _password_strength_ok(new_password)
        if not ok:
            return JsonResponse({'success': False, 'message': err}, status=400)
        if not user.check_password(old_password):
            return JsonResponse({'success': False, 'message': 'Old password is incorrect.'}, status=400)
        user.set_password(new_password)
        student.must_change_password = False
        student.save(update_fields=['must_change_password'])
        user.save()
        return JsonResponse({'success': True, 'message': 'Password changed successfully.'})
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)


# =============================================================================
# GRADE LOCKING
# =============================================================================

@csrf_exempt
def api_teacher_grade_lock(request):
    """POST: Lock grades for a class+subject in active term.
    Accepts: { student_ids:[...], subject_id, term_id }
             OR { grade_id }
             OR { lock_all:true, class_id, subject_id, term_id }
    Uses Grade.lock(user) so locked_by and locked_at are always set.
    """
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    try:
        data        = json.loads(request.body)
        grade_id    = data.get('grade_id')
        student_ids = data.get('student_ids')          # primary format from frontend
        lock_all    = data.get('lock_all', False)
        class_id    = data.get('class_id')
        subject_id  = data.get('subject_id')
        term_id     = data.get('term_id')
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

    school = teacher.school

    def _lock_one(grade):
        if grade.is_locked:
            return False
        grade.lock(user)  # sets is_locked, locked_by, locked_at and saves
        _write_grade_audit(grade, 'LOCK', user, request, {}, {
            'total_score': str(grade.total_score),
            'grade_letter': grade.grade_letter,
        }, 'Grade locked by teacher')
        new_hash = _compute_grade_hash(grade)
        gv, created = GradeVerification.objects.get_or_create(
            grade=grade,
            defaults={
                'verification_token': _secrets.token_urlsafe(32),
                'sha256_hash': new_hash,
                'issued_by': user,
            }
        )
        if not created:
            # Re-lock after a mod approval — refresh hash; keep token so printed QR codes remain valid
            gv.sha256_hash = new_hash
            gv.issued_by = user
            gv.save(update_fields=['sha256_hash', 'issued_by'])
        _dispatch_grade_lock_notifications(grade, school, request)
        return True

    # Mode 1: lock by explicit grade_id
    if grade_id:
        try:
            grade = Grade.objects.get(id=grade_id, teacher=teacher)
        except Grade.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Grade not found.'}, status=404)
        if not _lock_one(grade):
            return JsonResponse({'success': False, 'message': 'Grade already locked.'}, status=400)
        return JsonResponse({'success': True, 'message': 'Grade locked.', 'locked': 1})

    # Mode 2: lock by student_ids + subject_id + term_id (frontend SubmitConfirmModal)
    if student_ids and subject_id and term_id:
        if not isinstance(student_ids, list) or not student_ids:
            return JsonResponse({'success': False, 'message': 'student_ids must be a non-empty list.'}, status=400)
        grades = Grade.objects.filter(
            teacher=teacher,
            student_id__in=student_ids,
            subject_id=subject_id,
            term_id=term_id,
        )
        locked, already, not_found = 0, 0, 0
        found_ids = set(grades.values_list('student_id', flat=True))
        for sid in student_ids:
            if sid not in found_ids:
                not_found += 1
        for grade in grades:
            if _lock_one(grade):
                locked += 1
            else:
                already += 1
        return JsonResponse({
            'success': True,
            'message': f'{locked} grade(s) locked.',
            'locked': locked,
            'already_locked': already,
            'not_found': not_found,
        })

    # Mode 3: lock_all for a full class+subject+term
    if lock_all and (class_id or True) and subject_id and term_id:
        qs = Grade.objects.filter(teacher=teacher, subject_id=subject_id, term_id=term_id, is_locked=False)
        if class_id:
            qs = qs.filter(student__classroom_id=class_id)
        locked = sum(1 for grade in qs if _lock_one(grade))
        return JsonResponse({'success': True, 'message': f'{locked} grades locked.', 'locked': locked})

    return JsonResponse({
        'success': False,
        'message': 'Provide student_ids+subject_id+term_id, grade_id, or lock_all+subject_id+term_id.',
    }, status=400)


# =============================================================================
# GRADE HISTORY / AUDIT TRAIL
# =============================================================================

@csrf_exempt
def api_teacher_grade_history(request, grade_id):
    """GET: Audit trail for a specific grade (teacher view)."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    try:
        grade = Grade.objects.get(id=grade_id, teacher=teacher)
    except Grade.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Grade not found.'}, status=404)
    logs = GradeAuditLog.objects.filter(grade=grade).order_by('logged_at')
    data = [{
        'id':        l.id,
        'action':    l.action,
        'actor':     l.actor.get_full_name() or l.actor.username if l.actor else 'System',
        'old':       l.old_values,
        'new':       l.new_values,
        'reason':    l.change_reason,
        'timestamp': str(l.logged_at),
        'ip':        l.ip_address,
    } for l in logs]
    return JsonResponse({'success': True, 'history': data})


@csrf_exempt
def api_student_grade_history(request, grade_id):
    """GET: Audit trail for a grade (student view — IP redacted)."""
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    try:
        grade = Grade.objects.get(id=grade_id, student=student)
    except Grade.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Grade not found.'}, status=404)
    logs = GradeAuditLog.objects.filter(grade=grade).order_by('logged_at')
    data = [{
        'id':        l.id,
        'action':    l.action,
        'actor':     l.actor.get_full_name() or l.actor.username if l.actor else 'System',
        'old':       l.old_values,
        'new':       l.new_values,
        'reason':    l.change_reason,
        'timestamp': str(l.logged_at),
    } for l in logs]
    return JsonResponse({'success': True, 'history': data})


@csrf_exempt
def api_teacher_analytics(request):
    """GET term-over-term class average trend for teacher's classes."""
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    class_id   = request.GET.get('class_id')
    subject_id = request.GET.get('subject_id')
    school     = teacher.school
    terms = Term.objects.filter(academic_year__school=school).select_related('academic_year').order_by(
        'academic_year__start_date', 'name'
    )
    trend = []
    for term in terms:
        filters = {'term': term, 'teacher': teacher, 'is_locked': True}
        if class_id:
            filters['student__classroom_id'] = class_id
        if subject_id:
            filters['subject_id'] = subject_id
        from django.db.models import Avg, Count
        agg = Grade.objects.filter(**filters).aggregate(avg=Avg('total_score'), count=Count('id'))
        if agg['count']:
            trend.append({
                'term_id':   term.id,
                'term_name': term.get_name_display(),
                'year':      term.academic_year.name,
                'label':     f"{term.get_name_display()} {term.academic_year.name}",
                'average':   round(float(agg['avg'] or 0), 1),
                'count':     agg['count'],
            })
    return JsonResponse({'success': True, 'trend': trend})


# =============================================================================
# GRADE MODIFICATION REQUESTS
# =============================================================================

@csrf_exempt
def api_teacher_mod_requests(request):
    """GET: list own requests. POST: submit new request."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    if request.method == 'GET':
        reqs = GradeModificationRequest.objects.filter(
            requested_by=user
        ).select_related('grade__student__user', 'grade__subject').order_by('-created_at')
        def _evidence_url(r):
            if r.evidence_file:
                try:
                    return request.build_absolute_uri(r.evidence_file.url)
                except Exception:
                    return None
            return None
        data = [{
            'id':             r.id,
            'grade_id':       r.grade_id,
            'student_name':   r.grade.student.user.get_full_name(),
            'student':        r.grade.student.user.get_full_name(),
            'subject':        r.grade.subject.name,
            'current_score':  str(r.current_score),
            'proposed_score': str(r.proposed_score),
            'reason':         r.reason,
            'status':         r.status,
            'review_reason':  r.review_reason,
            'evidence_url':   _evidence_url(r),
            'created_at':     str(r.created_at),
            'reviewed_at':    str(r.reviewed_at) if r.reviewed_at else None,
        } for r in reqs]
        return JsonResponse({'success': True, 'requests': data})

    if request.method == 'POST':
        content_type = request.content_type or ''
        if 'multipart' in content_type or 'form-data' in content_type:
            post_data = request.POST
            evidence_file = request.FILES.get('evidence_file')
        else:
            try:
                post_data = json.loads(request.body)
            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'message': 'Invalid JSON (mod request).'}, status=400)
            evidence_file = None

        action = post_data.get('action', '')

        # Withdrawal action
        if action == 'withdraw':
            req_id = post_data.get('request_id')
            try:
                mod = GradeModificationRequest.objects.get(id=req_id, requested_by=user, status='pending')
            except GradeModificationRequest.DoesNotExist:
                return JsonResponse({'success': False, 'message': 'Pending request not found.'}, status=404)
            mod.status = 'withdrawn'
            mod.save(update_fields=['status'])
            return JsonResponse({'success': True, 'message': 'Request withdrawn.'})

        grade_id       = post_data.get('grade_id')
        proposed_score = post_data.get('proposed_score')
        reason         = post_data.get('reason', '').strip()
        if not grade_id or proposed_score is None or not reason:
            return JsonResponse({'success': False, 'message': 'grade_id, proposed_score and reason required.'}, status=400)
        try:
            grade = Grade.objects.get(id=grade_id, teacher=teacher)
        except Grade.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Grade not found.'}, status=404)
        if not grade.is_locked:
            return JsonResponse({'success': False, 'message': 'Grade is not locked — edit directly.'}, status=400)
        if GradeModificationRequest.objects.filter(grade=grade, status='pending').exists():
            return JsonResponse({'success': False, 'message': 'A pending request already exists for this grade.'}, status=400)
        mod = GradeModificationRequest.objects.create(
            grade=grade,
            requested_by=user,
            current_score=grade.total_score,
            proposed_score=proposed_score,
            reason=reason,
        )
        if evidence_file:
            # Validate size (5 MB)
            if evidence_file.size > 5 * 1024 * 1024:
                mod.delete()
                return JsonResponse({'success': False, 'message': 'Evidence file must be under 5 MB.'}, status=400)
            mod.evidence_file = evidence_file
            mod.save(update_fields=['evidence_file'])
        _write_grade_audit(grade, 'MOD_REQUEST', user, request, {}, {'proposed': str(proposed_score)}, reason)
        # Notify all school admins that a new request needs review
        for sa_obj in SchoolAdmin.objects.filter(school=teacher.school, is_active=True).select_related('user'):
            _create_notification(
                teacher.school,
                f'Grade Modification Request — {grade.subject.name}',
                f'{user.get_full_name()} has requested a correction for '
                f'{grade.student.user.get_full_name()}\'s {grade.subject.name} grade '
                f'(current: {grade.total_score} → proposed: {proposed_score}). '
                f'Review required.',
                notif_type='warning', recipient_user=sa_obj.user,
            )
        return JsonResponse({'success': True, 'message': 'Modification request submitted.', 'id': mod.id})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_teacher_assignments_teacher(request):
    """GET: list exams/assignments for teacher's classes. POST: create assignment."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    school = teacher.school
    teacher_classroom_ids = list(
        teacher.subject_classes.filter(is_active=True).values_list('classroom_id', flat=True)
    )

    if request.method == 'GET':
        class_id = request.GET.get('class_id')
        qs = Exam.objects.filter(school=school, is_active=True, classroom_id__in=teacher_classroom_ids)
        if class_id:
            qs = qs.filter(classroom_id=class_id)
        today = datetime.date.today()
        data = [{
            'id':          e.id,
            'title':       e.name,
            'type':        e.exam_type,
            'dueDate':     str(e.date),
            'classId':     e.classroom.id,
            'className':   e.classroom.name,
            'subjectName': e.subject.name,
            'subjectId':   e.subject.id,
            'status':      'completed' if e.date < today else 'active',
            'description': '',
            'totalMarks':  float(e.total_marks),
            'resultCount': e.results.count(),
            'createdAt':   e.created_at.isoformat(),
        } for e in qs.select_related('classroom', 'subject').order_by('-date')[:200]]
        return JsonResponse({'success': True, 'assignments': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        class_id   = body.get('classId') or body.get('classroom_id')
        subject_id = body.get('subjectId') or body.get('subject_id')
        if not class_id:
            return JsonResponse({'success': False, 'message': 'classId required.'}, status=400)
        if not teacher.subject_classes.filter(classroom_id=class_id, is_active=True).exists():
            return JsonResponse({'success': False, 'message': 'Not assigned to this classroom.'}, status=403)
        try:
            classroom = ClassRoom.objects.get(id=class_id, school=school)
        except ClassRoom.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Classroom not found.'}, status=404)
        if not subject_id:
            tsc = teacher.subject_classes.filter(classroom_id=class_id, is_active=True).first()
            subject_id = tsc.subject_id if tsc else None
        if not subject_id:
            return JsonResponse({'success': False, 'message': 'subjectId required.'}, status=400)
        try:
            subject = Subject.objects.get(id=subject_id, school=school)
        except Subject.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Subject not found.'}, status=404)
        term = Term.objects.filter(academic_year__school=school, is_active=True).first()
        exam_type = body.get('type', 'quiz')
        try:
            due_date = datetime.date.fromisoformat(body.get('dueDate') or str(datetime.date.today()))
        except (ValueError, TypeError):
            due_date = datetime.date.today()
        exam = Exam.objects.create(
            school=school, classroom=classroom, subject=subject, term=term,
            name=body.get('title', 'Assignment'),
            exam_type=exam_type,
            total_marks=float(body.get('totalMarks', 100)),
            date=due_date,
            created_by=user,
        )
        return JsonResponse({'success': True, 'id': exam.id, 'message': 'Assignment created.'}, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_teacher_assignment_item(request, exam_id):
    """DELETE a teacher's assignment."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    teacher_classroom_ids = list(
        teacher.subject_classes.filter(is_active=True).values_list('classroom_id', flat=True)
    )
    try:
        exam = Exam.objects.get(id=exam_id, school=teacher.school, classroom_id__in=teacher_classroom_ids)
    except Exam.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Assignment not found.'}, status=404)
    if request.method == 'DELETE':
        exam.is_active = False
        exam.save(update_fields=['is_active'])
        return JsonResponse({'success': True, 'message': 'Assignment deleted.'})
    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_teacher_exam_list_teacher(request):
    """GET: exams for teacher's classes for results-entry screen."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    teacher_classroom_ids = list(
        teacher.subject_classes.filter(is_active=True).values_list('classroom_id', flat=True)
    )
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    class_id = request.GET.get('class_id')
    qs = Exam.objects.filter(school=teacher.school, is_active=True, classroom_id__in=teacher_classroom_ids)
    if class_id:
        qs = qs.filter(classroom_id=class_id)
    data = [{
        'id':          e.id,
        'name':        e.name,
        'exam_type':   e.exam_type,
        'classroom':   e.classroom.name,
        'classroom_id':e.classroom.id,
        'subject':     e.subject.name,
        'subject_id':  e.subject.id,
        'total_marks': float(e.total_marks),
        'date':        str(e.date),
        'result_count':e.results.count(),
    } for e in qs.select_related('classroom', 'subject').order_by('-date')[:200]]
    return JsonResponse({'success': True, 'exams': data})


@csrf_exempt
def api_teacher_exam_results_entry(request, exam_id):
    """GET: exam + student results for a teacher's exam. POST: save results."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    teacher_classroom_ids = list(
        teacher.subject_classes.filter(is_active=True).values_list('classroom_id', flat=True)
    )
    try:
        exam = Exam.objects.get(id=exam_id, school=teacher.school, classroom_id__in=teacher_classroom_ids)
    except Exam.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Exam not found.'}, status=404)

    if request.method == 'GET':
        students = Student.objects.filter(
            school=teacher.school, classroom=exam.classroom, is_active=True
        ).select_related('user').order_by('user__last_name', 'user__first_name')
        results_map = {r.student_id: r for r in ExamResult.objects.filter(exam=exam)}
        data = [{
            'student_id':   s.id,
            'student_name': s.user.get_full_name(),
            'marks':        float(results_map[s.id].marks_obtained) if s.id in results_map else None,
            'grade_letter': results_map[s.id].grade_letter if s.id in results_map else None,
            'remarks':      results_map[s.id].remarks if s.id in results_map else '',
        } for s in students]
        return JsonResponse({'success': True, 'exam': {
            'id': exam.id, 'name': exam.name,
            'total_marks': float(exam.total_marks),
            'subject': exam.subject.name,
            'classroom': exam.classroom.name,
            'date': str(exam.date),
        }, 'results': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        entries = body.get('results', [])
        saved = 0
        for entry in entries:
            student_id = entry.get('student_id')
            marks = entry.get('marks')
            if student_id is None or marks is None:
                continue
            try:
                student = Student.objects.get(id=student_id, school=teacher.school)
                ExamResult.objects.update_or_create(
                    exam=exam, student=student,
                    defaults={
                        'marks_obtained': float(marks),
                        'remarks': entry.get('remarks', ''),
                        'graded_by': user,
                    }
                )
                saved += 1
            except Exception:
                continue
        return JsonResponse({'success': True, 'saved': saved})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_teacher_announcements(request):
    """GET: announcements sent by this teacher. POST: send broadcast announcement."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    school = teacher.school

    if request.method == 'GET':
        msgs = Message.objects.filter(school=school, sender=user).order_by('-id')[:100]
        data = [{
            'id':             m.id,
            'recipient_role': m.recipient_role,
            'subject':        m.subject,
            'body':           m.body,
            'created_at':     m.created_at.isoformat(),
            'is_broadcast':   m.is_broadcast,
        } for m in msgs]
        return JsonResponse({'success': True, 'announcements': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        recipient_role = body.get('recipient_role', 'parents')
        if recipient_role not in ('all', 'staff', 'students', 'parents'):
            recipient_role = 'parents'
        msg = Message.objects.create(
            school=school,
            sender=user,
            recipient_role=recipient_role,
            subject=body.get('subject', ''),
            body=body.get('body', ''),
            is_broadcast=True,
        )
        return JsonResponse({'success': True, 'id': msg.id, 'message': 'Announcement sent.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_teacher_attendance_status(request):
    """GET: today's per-class attendance status + at-risk students (<75% rate)."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    today = datetime.date.today()
    tscs = teacher.subject_classes.filter(is_active=True).select_related('classroom', 'subject')
    seen_classrooms = set()
    classes_status = []
    for tsc in tscs:
        if tsc.classroom_id in seen_classrooms:
            continue
        seen_classrooms.add(tsc.classroom_id)
        total_students = tsc.classroom.students.filter(is_active=True).count()
        today_records  = Attendance.objects.filter(classroom=tsc.classroom, date=today).count()
        present_count  = Attendance.objects.filter(classroom=tsc.classroom, date=today, status='present').count()
        classes_status.append({
            'classroom_id':   tsc.classroom.id,
            'classroom_name': tsc.classroom.name,
            'subject_name':   tsc.subject.name,
            'taken':          today_records >= total_students > 0,
            'total_students': total_students,
            'present_count':  present_count,
            'absent_count':   today_records - present_count,
        })
    at_risk = []
    classroom_ids = list(seen_classrooms)
    for s in Student.objects.filter(
        school=teacher.school, is_active=True, classroom_id__in=classroom_ids
    ).select_related('user', 'classroom')[:300]:
        total_att = Attendance.objects.filter(student=s).count()
        present   = Attendance.objects.filter(student=s, status__in=('present', 'late', 'excused')).count()
        rate = round((present / total_att) * 100, 1) if total_att > 0 else 100
        if total_att > 0 and rate < 75:
            at_risk.append({
                'id':           s.id,
                'name':         s.user.get_full_name(),
                'classroom':    s.classroom.name if s.classroom else '',
                'att_rate':     rate,
                'total_days':   total_att,
                'present_days': present,
            })
    return JsonResponse({'success': True, 'classes': classes_status, 'at_risk': at_risk})


@csrf_exempt
def api_teacher_student_grade_history(request, student_id):
    """GET: full multi-term grade history for a student in teacher's classes."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    teacher_classroom_ids = list(
        teacher.subject_classes.filter(is_active=True).values_list('classroom_id', flat=True)
    )
    try:
        student = Student.objects.get(
            id=student_id, school=teacher.school, classroom_id__in=teacher_classroom_ids
        )
    except Student.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Student not found or not in your classes.'}, status=404)
    grades_qs = Grade.objects.filter(student=student).select_related(
        'subject', 'term__academic_year'
    ).order_by('-term__start_date', 'subject__name')
    term_map = {}
    for g in grades_qs:
        year_name = g.term.academic_year.name if (g.term and g.term.academic_year) else ''
        key = (g.term.id, g.term.name, year_name)
        term_map.setdefault(key, []).append({
            'subject':      g.subject.name,
            'ca':           float(g.continuous_assessment),
            'midterm':      float(g.mid_term_exam),
            'final':        float(g.final_exam),
            'total':        float(g.total_score),
            'grade_letter': g.grade_letter,
            'is_locked':    g.is_locked,
        })
    history = [{
        'term_id':       k[0],
        'term_name':     k[1],
        'academic_year': k[2],
        'grades':        term_map[k],
        'average':       round(sum(g['total'] for g in term_map[k]) / len(term_map[k]), 1),
    } for k in term_map]
    return JsonResponse({'success': True, 'student': {
        'id': student.id,
        'name': student.user.get_full_name(),
        'admission_number': student.admission_number,
    }, 'history': history})


@csrf_exempt
def api_teacher_student_report_cards(request, student_id):
    """GET: published report cards for a student in teacher's classes."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    teacher_classroom_ids = list(
        teacher.subject_classes.filter(is_active=True).values_list('classroom_id', flat=True)
    )
    try:
        student = Student.objects.get(
            id=student_id, school=teacher.school, classroom_id__in=teacher_classroom_ids
        )
    except Student.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Student not found or not in your classes.'}, status=404)
    cards = ReportCard.objects.filter(student=student).select_related(
        'term__academic_year'
    ).order_by('-term__start_date')
    def _pdf_url(card):
        if card.pdf_file:
            try:
                return request.build_absolute_uri(card.pdf_file.url)
            except Exception:
                return None
        return None
    data = [{
        'id':            c.id,
        'term':          c.term.name if c.term else '',
        'academic_year': c.term.academic_year.name if (c.term and c.term.academic_year) else '',
        'average_score': float(c.average_score) if c.average_score else None,
        'class_rank':    c.class_rank,
        'class_size':    c.class_size,
        'is_published':  c.is_published,
        'published_at':  c.published_at.isoformat() if c.published_at else None,
        'pdf_url':       _pdf_url(c),
        'qr_code':       c.qr_code,
        'download_url':  f'/api/report-cards/{c.id}/download/',
    } for c in cards]
    return JsonResponse({'success': True, 'report_cards': data})


# ── #1 Grade Feedback Inbox ─────────────────────────────────────────────────

@csrf_exempt
def api_teacher_feedback_inbox(request):
    """GET: all feedback threads for teacher's grades. Returns threads grouped by grade."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    teacher_classroom_ids = list(
        teacher.subject_classes.filter(is_active=True).values_list('classroom_id', flat=True)
    )
    # Grades owned by teacher where feedback messages exist
    grades_with_feedback = Grade.objects.filter(
        teacher=teacher,
        feedback_messages__isnull=False,
    ).select_related('student__user', 'subject').distinct()
    threads = []
    for grade in grades_with_feedback:
        msgs = GradeFeedbackMessage.objects.filter(grade=grade).order_by('created_at')
        unread = msgs.filter(is_read=False, sender_role='student').count()
        last = msgs.last()
        threads.append({
            'grade_id':      grade.id,
            'student_id':    grade.student.id,
            'student_name':  grade.student.user.get_full_name(),
            'subject_name':  grade.subject.name,
            'score':         float(grade.total_score),
            'grade_letter':  grade.grade_letter,
            'is_locked':     grade.is_locked,
            'unread':        unread,
            'last_message':  last.message[:80] if last else '',
            'last_at':       last.created_at.isoformat() if last else None,
            'message_count': msgs.count(),
        })
    threads.sort(key=lambda t: t['last_at'] or '', reverse=True)
    return JsonResponse({'success': True, 'threads': threads})


@csrf_exempt
def api_teacher_feedback_thread(request, grade_id):
    """GET: messages for a grade's thread. POST: send teacher reply."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    try:
        grade = Grade.objects.get(id=grade_id, teacher=teacher)
    except Grade.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Grade not found.'}, status=404)

    if request.method == 'GET':
        msgs = GradeFeedbackMessage.objects.filter(grade=grade).order_by('created_at')
        # Mark student messages as read
        msgs.filter(sender_role='student', is_read=False).update(is_read=True)
        data = [{
            'id':          m.id,
            'sender_role': m.sender_role,
            'message':     m.message,
            'is_read':     m.is_read,
            'created_at':  m.created_at.isoformat(),
        } for m in msgs]
        return JsonResponse({'success': True, 'messages': data, 'grade': {
            'id': grade.id,
            'subject': grade.subject.name,
            'student': grade.student.user.get_full_name(),
            'score': float(grade.total_score),
            'grade_letter': grade.grade_letter,
        }})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        text = body.get('message', '').strip()
        if not text:
            return JsonResponse({'success': False, 'message': 'Message required.'}, status=400)
        msg = GradeFeedbackMessage.objects.create(
            grade=grade, sender=user, sender_role='teacher', message=text,
        )
        # Notify student
        _create_notification(
            grade.student.school,
            f'Teacher replied on {grade.subject.name}',
            f'{user.get_full_name()} replied to your feedback: "{text[:100]}"',
            notif_type='info', recipient_user=grade.student.user,
        )
        return JsonResponse({'success': True, 'id': msg.id, 'created_at': msg.created_at.isoformat()})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# Student-side feedback (connects to teacher inbox)
@csrf_exempt
def api_student_grade_feedback(request, grade_id):
    """GET/POST grade feedback thread for a student."""
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    try:
        grade = Grade.objects.get(id=grade_id, student=student)
    except Grade.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Grade not found.'}, status=404)

    if request.method == 'GET':
        msgs = GradeFeedbackMessage.objects.filter(grade=grade).order_by('created_at')
        msgs.filter(sender_role='teacher', is_read=False).update(is_read=True)
        data = [{
            'id': m.id, 'sender': m.sender_role,
            'text': m.message, 'sentAt': m.created_at.isoformat(),
            'isRead': m.is_read,
        } for m in msgs]
        return JsonResponse({'success': True, 'messages': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        text = (body.get('message') or '').strip()
        if not text:
            return JsonResponse({'success': False, 'message': 'Message required.'}, status=400)
        msg = GradeFeedbackMessage.objects.create(
            grade=grade, sender=user, sender_role='student', message=text,
        )
        # Notify teacher
        if grade.teacher:
            _create_notification(
                student.school,
                f'Student feedback on {grade.subject.name}',
                f'{user.get_full_name()} left feedback on their {grade.subject.name} grade.',
                notif_type='info', recipient_user=grade.teacher.user,
            )
        return JsonResponse({'success': True, 'id': msg.id})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# ── #2 Assignment Submissions ───────────────────────────────────────────────

@csrf_exempt
def api_teacher_assignment_submissions(request, exam_id):
    """GET: submission roster for an assignment. POST: grade a student's submission."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    teacher_classroom_ids = list(
        teacher.subject_classes.filter(is_active=True).values_list('classroom_id', flat=True)
    )
    try:
        exam = Exam.objects.get(id=exam_id, school=teacher.school, classroom_id__in=teacher_classroom_ids)
    except Exam.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Assignment not found.'}, status=404)

    if request.method == 'GET':
        students = Student.objects.filter(
            school=teacher.school, classroom=exam.classroom, is_active=True
        ).select_related('user').order_by('user__last_name', 'user__first_name')
        sub_map = {s.student_id: s for s in AssignmentSubmission.objects.filter(exam=exam)}
        data = []
        for s in students:
            sub = sub_map.get(s.id)
            data.append({
                'student_id':    s.id,
                'student_name':  s.user.get_full_name(),
                'status':        sub.status if sub else 'pending',
                'submitted_at':  sub.submitted_at.isoformat() if (sub and sub.submitted_at) else None,
                'marks':         float(sub.marks) if (sub and sub.marks is not None) else None,
                'feedback':      sub.feedback if sub else '',
                'graded_at':     sub.graded_at.isoformat() if (sub and sub.graded_at) else None,
            })
        counts = {
            'total':     len(data),
            'pending':   sum(1 for d in data if d['status'] == 'pending'),
            'submitted': sum(1 for d in data if d['status'] == 'submitted'),
            'graded':    sum(1 for d in data if d['status'] == 'graded'),
        }
        return JsonResponse({'success': True, 'assignment': {
            'id': exam.id, 'name': exam.name,
            'total_marks': float(exam.total_marks), 'date': str(exam.date),
        }, 'submissions': data, 'counts': counts})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        entries = body.get('grades', [])
        saved = 0
        for entry in entries:
            sid = entry.get('student_id')
            try:
                student = Student.objects.get(id=sid, school=teacher.school)
                defaults = {'graded_by': user, 'status': 'graded'}
                if entry.get('marks') is not None:
                    defaults['marks'] = float(entry['marks'])
                if entry.get('feedback') is not None:
                    defaults['feedback'] = entry['feedback']
                import django.utils.timezone as tz
                defaults['graded_at'] = tz.now()
                AssignmentSubmission.objects.update_or_create(
                    exam=exam, student=student, defaults=defaults,
                )
                saved += 1
            except Exception:
                continue
        return JsonResponse({'success': True, 'saved': saved})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# Student-side assignment submission
@csrf_exempt
def api_student_assignment_submit(request, exam_id):
    """POST: student marks an assignment as submitted."""
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    try:
        exam = Exam.objects.get(id=exam_id, school=student.school, classroom=student.classroom)
    except Exam.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Assignment not found.'}, status=404)
    import django.utils.timezone as tz
    sub, _ = AssignmentSubmission.objects.update_or_create(
        exam=exam, student=student,
        defaults={'status': 'submitted', 'submitted_at': tz.now()},
    )
    return JsonResponse({'success': True, 'status': sub.status})


# Student: list assignments with submission status
@csrf_exempt
def api_student_assignments(request):
    """GET: all active assignments for student's class with submission status."""
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    today = datetime.date.today()
    exams = Exam.objects.filter(
        school=student.school, classroom=student.classroom, is_active=True
    ).select_related('subject', 'term').order_by('date')
    sub_map = {s.exam_id: s for s in AssignmentSubmission.objects.filter(
        exam__in=exams, student=student
    )}
    def _subject_color(name):
        colors = ['#10B981','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#14B8A6','#EC4899']
        h = sum(ord(c) for c in (name or ''))
        return colors[h % len(colors)]
    data = []
    for e in exams:
        sub = sub_map.get(e.id)
        status = sub.status if sub else 'pending'
        data.append({
            'id':           e.id,
            'title':        e.name,
            'subject':      e.subject.name,
            'subjectColor': _subject_color(e.subject.name),
            'subjectIcon':  'school',
            'teacher':      '',
            'dueDate':      str(e.date),
            'maxScore':     float(e.total_marks),
            'status':       status,
            'submittedAt':  sub.submitted_at.isoformat() if (sub and sub.submitted_at) else None,
            'score':        float(sub.marks) if (sub and sub.marks is not None) else None,
            'feedback':     sub.feedback if sub else '',
        })
    return JsonResponse(data, safe=False)


# ── #3 Direct Student-Teacher Messages ─────────────────────────────────────

@csrf_exempt
def api_teacher_direct_messages(request):
    """GET: conversation list for teacher (one per student). POST: send message."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    school = teacher.school
    teacher_classroom_ids = list(
        teacher.subject_classes.filter(is_active=True).values_list('classroom_id', flat=True)
    )

    if request.method == 'GET':
        msgs = StudentTeacherMessage.objects.filter(
            teacher=teacher
        ).select_related('student__user').order_by('student_id', 'created_at')
        # Group by student
        conv_map = {}
        for m in msgs:
            sid = m.student_id
            if sid not in conv_map:
                sn = m.student.user.get_full_name()
                tsc = teacher.subject_classes.filter(
                    classroom=m.student.classroom, is_active=True
                ).select_related('subject').first()
                conv_map[sid] = {
                    'id':         sid,
                    'student_id': sid,
                    'student':    {'name': sn, 'initials': ''.join(w[0] for w in sn.split()[:2]).upper(), 'subject': tsc.subject.name if tsc else ''},
                    'messages':   [],
                    'unread':     0,
                }
            conv_map[sid]['messages'].append({
                'id': m.id, 'sender': m.sender_role,
                'text': m.message, 'sentAt': m.created_at.isoformat(),
            })
            if m.sender_role == 'student' and not m.is_read:
                conv_map[sid]['unread'] += 1
        convs = sorted(conv_map.values(), key=lambda c: c['messages'][-1]['sentAt'] if c['messages'] else '', reverse=True)
        return JsonResponse({'success': True, 'conversations': convs})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        student_id = body.get('student_id')
        text = (body.get('text') or '').strip()
        if not student_id or not text:
            return JsonResponse({'success': False, 'message': 'student_id and text required.'}, status=400)
        try:
            student = Student.objects.get(id=student_id, school=school, classroom_id__in=teacher_classroom_ids)
        except Student.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Student not found.'}, status=404)
        msg = StudentTeacherMessage.objects.create(
            school=school, student=student, teacher=teacher,
            sender_role='teacher', message=text,
        )
        _create_notification(
            school, f'Message from {user.get_full_name()}',
            text[:100], notif_type='info', recipient_user=student.user,
        )
        return JsonResponse({'success': True, 'id': msg.id})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_teacher_direct_message_thread(request, student_id):
    """GET: full thread. POST: send message. PATCH: mark all read."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    try:
        student = Student.objects.get(id=student_id, school=teacher.school)
    except Student.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Student not found.'}, status=404)

    if request.method == 'GET':
        msgs = StudentTeacherMessage.objects.filter(
            student=student, teacher=teacher
        ).order_by('created_at')
        msgs.filter(sender_role='student', is_read=False).update(is_read=True)
        data = [{'id': m.id, 'sender': m.sender_role, 'text': m.message, 'sentAt': m.created_at.isoformat()} for m in msgs]
        return JsonResponse({'success': True, 'messages': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        text = (body.get('text') or '').strip()
        if not text:
            return JsonResponse({'success': False, 'message': 'text required.'}, status=400)
        msg = StudentTeacherMessage.objects.create(
            school=teacher.school, student=student, teacher=teacher,
            sender_role='teacher', message=text,
        )
        _create_notification(
            teacher.school, f'Message from {user.get_full_name()}',
            text[:100], notif_type='info', recipient_user=student.user,
        )
        return JsonResponse({'success': True, 'id': msg.id, 'sentAt': msg.created_at.isoformat()})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# Student-side direct messages
@csrf_exempt
def api_student_direct_messages(request):
    """GET: student's conversation list with teachers."""
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method == 'GET':
        msgs = StudentTeacherMessage.objects.filter(
            student=student
        ).select_related('teacher__user').order_by('teacher_id', 'created_at')
        conv_map = {}
        for m in msgs:
            tid = m.teacher_id
            if tid not in conv_map:
                tname = m.teacher.user.get_full_name()
                tsc = m.teacher.subject_classes.filter(
                    classroom=student.classroom, is_active=True
                ).select_related('subject').first()
                colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6']
                col = colors[tid % len(colors)]
                conv_map[tid] = {
                    'id': tid,
                    'teacher': {
                        'name': tname,
                        'initials': ''.join(w[0] for w in tname.split()[:2]).upper(),
                        'subject': tsc.subject.name if tsc else '',
                        'color': col,
                    },
                    'messages': [],
                    'unread': 0,
                }
            conv_map[tid]['messages'].append({
                'id': m.id, 'sender': m.sender_role, 'text': m.message, 'sentAt': m.created_at.isoformat(),
            })
            if m.sender_role == 'teacher' and not m.is_read:
                conv_map[tid]['unread'] += 1
        convs = sorted(conv_map.values(), key=lambda c: c['messages'][-1]['sentAt'] if c['messages'] else '', reverse=True)
        return JsonResponse(convs, safe=False)
    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_student_direct_message_send(request, teacher_id):
    """POST: student sends a message to a teacher."""
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    try:
        teacher = Teacher.objects.get(id=teacher_id, school=student.school)
    except Teacher.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Teacher not found.'}, status=404)
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
    text = (body.get('text') or '').strip()
    if not text:
        return JsonResponse({'success': False, 'message': 'text required.'}, status=400)
    msg = StudentTeacherMessage.objects.create(
        school=student.school, student=student, teacher=teacher,
        sender_role='student', message=text,
    )
    _create_notification(
        student.school, f'Message from {user.get_full_name()}',
        text[:100], notif_type='info', recipient_user=teacher.user,
    )
    return JsonResponse({'success': True, 'id': msg.id, 'sentAt': msg.created_at.isoformat()})


# ── #5 Remedial Requests ────────────────────────────────────────────────────

@csrf_exempt
def api_teacher_remedial_requests(request):
    """GET: remedial requests from students in teacher's classes. POST: update status."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    teacher_classroom_ids = list(
        teacher.subject_classes.filter(is_active=True).values_list('classroom_id', flat=True)
    )

    if request.method == 'GET':
        reqs = RemedialRequest.objects.filter(
            student__classroom_id__in=teacher_classroom_ids,
        ).select_related('student__user', 'subject').order_by('-created_at')
        data = [{
            'id':           r.id,
            'student_id':   r.student.id,
            'student_name': r.student.user.get_full_name(),
            'subject':      r.subject.name,
            'reason':       r.reason,
            'status':       r.status,
            'created_at':   r.created_at.isoformat(),
            'teacher_notes': r.teacher_notes,
            'addressed_at': r.addressed_at.isoformat() if r.addressed_at else None,
        } for r in reqs]
        return JsonResponse({'success': True, 'requests': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        req_id = body.get('id')
        new_status = body.get('status')
        notes = body.get('notes', '')
        if not req_id or not new_status:
            return JsonResponse({'success': False, 'message': 'id and status required.'}, status=400)
        try:
            req = RemedialRequest.objects.get(
                id=req_id, student__classroom_id__in=teacher_classroom_ids
            )
        except RemedialRequest.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Request not found.'}, status=404)
        req.status = new_status
        req.teacher_notes = notes
        if new_status in ('addressed', 'dismissed'):
            import django.utils.timezone as tz
            req.addressed_by = user
            req.addressed_at = tz.now()
        req.save()
        return JsonResponse({'success': True, 'message': 'Status updated.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# Student: submit remedial request
@csrf_exempt
def api_student_remedial_request(request, grade_id):
    """POST: student submits a remedial support request for a grade's subject."""
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    try:
        grade = Grade.objects.get(id=grade_id, student=student)
    except Grade.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Grade not found.'}, status=404)
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
    reason = (body.get('reason') or '').strip()
    if not reason:
        return JsonResponse({'success': False, 'message': 'Reason required.'}, status=400)
    req, created = RemedialRequest.objects.get_or_create(
        student=student, subject=grade.subject, status='open',
        defaults={'grade': grade, 'reason': reason},
    )
    if not created:
        req.reason = reason
        req.save(update_fields=['reason'])
    return JsonResponse({'success': True, 'id': req.id, 'created': created})


# ── #8 Parent Coverage ──────────────────────────────────────────────────────

@csrf_exempt
def api_teacher_parent_coverage(request):
    """GET: per-classroom count of students with/without linked parent accounts."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    tscs = teacher.subject_classes.filter(is_active=True).select_related('classroom', 'subject')
    seen = set()
    result = []
    for tsc in tscs:
        if tsc.classroom_id in seen:
            continue
        seen.add(tsc.classroom_id)
        students = list(Student.objects.filter(classroom=tsc.classroom, is_active=True).values_list('id', flat=True))
        total = len(students)
        with_parents = ParentStudent.objects.filter(student_id__in=students).values('student_id').distinct().count()
        without = [
            {'id': s.id, 'name': s.user.get_full_name()}
            for s in Student.objects.filter(
                id__in=students, is_active=True
            ).exclude(
                id__in=ParentStudent.objects.filter(student_id__in=students).values('student_id')
            ).select_related('user')[:20]
        ]
        result.append({
            'classroom_id':   tsc.classroom.id,
            'classroom_name': tsc.classroom.name,
            'total_students': total,
            'with_parents':   with_parents,
            'without_parents': total - with_parents,
            'coverage_pct':   round((with_parents / total) * 100) if total > 0 else 0,
            'missing_sample': without,
        })
    return JsonResponse({'success': True, 'coverage': result})


# ── #9 School Broadcasts (teacher view) ────────────────────────────────────

@csrf_exempt
def api_teacher_school_broadcasts(request):
    """GET: recent school-wide messages/broadcasts sent by admin to any audience."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    msgs = Message.objects.filter(
        school=teacher.school, is_broadcast=True
    ).select_related('sender').exclude(sender=user).order_by('-id')[:100]
    data = [{
        'id':             m.id,
        'sender_name':    m.sender.get_full_name() if m.sender else 'System',
        'recipient_role': m.recipient_role,
        'subject':        m.subject,
        'body':           m.body,
        'created_at':     m.created_at.isoformat(),
    } for m in msgs]
    return JsonResponse({'success': True, 'broadcasts': data})


# ── #7 Teacher Events / Exam Calendar ──────────────────────────────────────

@csrf_exempt
def api_teacher_calendar_events(request):
    """GET: upcoming exams + timetable events for the teacher's classes."""
    user, teacher = _get_teacher_profile(request)
    if not teacher:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    teacher_classroom_ids = list(
        teacher.subject_classes.filter(is_active=True).values_list('classroom_id', flat=True)
    )
    today = datetime.date.today()
    # Upcoming exams (next 60 days)
    exams = Exam.objects.filter(
        school=teacher.school, is_active=True,
        classroom_id__in=teacher_classroom_ids,
        date__gte=today,
    ).select_related('classroom', 'subject').order_by('date')[:50]
    events = []
    for e in exams:
        events.append({
            'id':       f'exam-{e.id}',
            'type':     'exam',
            'title':    e.name,
            'date':     str(e.date),
            'class':    e.classroom.name,
            'subject':  e.subject.name,
            'detail':   f'{e.total_marks} marks',
            'exam_id':  e.id,
        })
    # Teacher's own assignments (due in next 60 days)
    assignments = Exam.objects.filter(
        school=teacher.school, is_active=True,
        classroom_id__in=teacher_classroom_ids,
        date__gte=today,
    ).select_related('classroom', 'subject').exclude(
        exam_type__in=['ca', 'midterm', 'final']
    ).order_by('date')[:30]
    seen_ids = {e.id for e in exams}
    for a in assignments:
        if a.id not in seen_ids:
            events.append({
                'id':      f'assign-{a.id}',
                'type':    'assignment',
                'title':   a.name,
                'date':    str(a.date),
                'class':   a.classroom.name,
                'subject': a.subject.name,
                'detail':  a.exam_type,
            })
    events.sort(key=lambda e: e['date'])
    # Current term info
    term = Term.objects.filter(
        academic_year__school=teacher.school, is_active=True
    ).select_related('academic_year').first()
    term_info = None
    if term:
        term_info = {
            'name': term.name,
            'start': str(term.start_date),
            'end':   str(term.end_date),
            'academic_year': term.academic_year.name if term.academic_year else '',
        }
    return JsonResponse({'success': True, 'events': events, 'term': term_info})


@csrf_exempt
def api_school_mod_requests(request):
    """GET: list all mod requests for this school (school admin)."""
    try:
        user, sa, school = _get_school_for_admin(request)
    except Exception:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if not user:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    reqs = GradeModificationRequest.objects.filter(
        grade__student__school=school
    ).select_related('grade__student__user', 'grade__subject', 'requested_by').order_by('-created_at')
    status_filter = request.GET.get('status', '')
    if status_filter:
        reqs = reqs.filter(status=status_filter)
    data = [{
        'id':             r.id,
        'grade_id':       r.grade_id,
        'student_name':   r.grade.student.user.get_full_name(),
        'student':        r.grade.student.user.get_full_name(),
        'subject':        r.grade.subject.name,
        'teacher_name':   r.requested_by.get_full_name(),
        'requested_by':   r.requested_by.get_full_name(),
        'current_score':  str(r.current_score),
        'proposed_score': str(r.proposed_score),
        'reason':         r.reason,
        'status':         r.status,
        'review_reason':  r.review_reason,
        'created_at':     str(r.created_at),
        'reviewed_at':    str(r.reviewed_at) if r.reviewed_at else None,
        'evidence_url':   _safe_evidence_url(request, r),
    } for r in reqs]
    return JsonResponse({'success': True, 'requests': data})


@csrf_exempt
def api_school_mod_review(request):
    """POST: approve or reject a grade modification request (school admin)."""
    try:
        user, sa, school = _get_school_for_admin(request)
    except Exception:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if not user:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    try:
        data   = json.loads(request.body)
        req_id = data.get('request_id')
        action = data.get('action')
        reason = data.get('reason', '').strip()
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON (mod review).'}, status=400)
    if not req_id or action not in ('approve', 'reject'):
        return JsonResponse({'success': False, 'message': 'request_id and action (approve/reject) required.'}, status=400)
    try:
        mod = GradeModificationRequest.objects.select_related('grade').get(
            id=req_id, grade__student__school=school, status='pending'
        )
    except GradeModificationRequest.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Request not found or not pending.'}, status=404)
    mod.reviewed_by   = user
    mod.review_reason = reason
    mod.reviewed_at   = timezone.now()
    if action == 'approve':
        grade     = mod.grade
        old_score = grade.total_score
        # Apply the corrected score
        grade.total_score = mod.proposed_score
        grade.calculate_grade_letter()
        grade.save(update_fields=['total_score', 'grade_letter'])
        # Re-lock immediately with new hash — unlocking after approval would leave grade vulnerable
        grade.is_locked = True
        grade.locked_by = user
        grade.locked_at = timezone.now()
        grade.save(update_fields=['is_locked', 'locked_by', 'locked_at'])
        # Refresh the GradeVerification hash (keep same token so existing QR codes remain valid)
        new_hash = _compute_grade_hash(grade)
        gv_qs = GradeVerification.objects.filter(grade=grade)
        if gv_qs.exists():
            gv_qs.update(sha256_hash=new_hash)
        else:
            GradeVerification.objects.create(
                grade=grade,
                verification_token=_secrets.token_urlsafe(32),
                sha256_hash=new_hash,
                issued_by=user,
            )
        mod.status = 'approved'
        _write_grade_audit(grade, 'MOD_APPROVED', user, request,
                           {'total_score': str(old_score)},
                           {'total_score': str(mod.proposed_score)}, reason)
        # Notify teacher, student, parents
        student     = grade.student
        subject     = grade.subject.name
        new_letter  = grade.grade_letter
        teacher_user = mod.requested_by
        _create_notification(school,
            f'Grade Correction Approved — {subject}',
            f'Your modification request for {student.user.get_full_name()}\'s {subject} grade '
            f'has been approved. Score updated from {old_score} to {mod.proposed_score} ({new_letter}).',
            notif_type='success', recipient_user=teacher_user)
        _create_notification(school,
            f'Your {subject} grade has been corrected',
            f'Your {subject} grade has been updated to {float(mod.proposed_score):.1f} ({new_letter}) '
            f'following a teacher correction approved by your school admin.',
            notif_type='success', recipient_user=student.user)
        for link in student.parent_links.select_related('parent__user').all():
            _create_notification(school,
                f'{student.user.get_full_name()}\'s {subject} grade corrected',
                f'A formally approved correction has been applied to {student.user.get_full_name()}\'s '
                f'{subject} grade: now {float(mod.proposed_score):.1f} ({new_letter}).',
                notif_type='success', recipient_user=link.parent.user)
    else:
        mod.status = 'rejected'
        _write_grade_audit(mod.grade, 'MOD_REJECTED', user, request, {}, {}, reason)
        # Notify teacher of rejection
        _create_notification(school,
            f'Grade Modification Request Rejected — {mod.grade.subject.name}',
            f'Your modification request for {mod.grade.student.user.get_full_name()}\'s '
            f'{mod.grade.subject.name} grade has been rejected. '
            + (f'Reason: {reason}' if reason else 'No reason provided.'),
            notif_type='warning', recipient_user=mod.requested_by)
    mod.save()
    return JsonResponse({'success': True, 'message': f'Request {action}d.'})


# =============================================================================
# PARENT PORTAL ENDPOINTS
# =============================================================================

def _get_parent_profile(request):
    user = _get_authed_user(request)
    if not user:
        return None, None
    try:
        parent = Parent.objects.select_related('school').get(user=user)
        return user, parent
    except Parent.DoesNotExist:
        return user, None


@csrf_exempt
def api_parent_profile(request):
    """GET: parent profile info."""
    user, parent = _get_parent_profile(request)
    if not parent:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    data = {
        'id':                    parent.id,
        'name':                  user.get_full_name(),
        'email':                 user.email,
        'phone':                 parent.phone_number,
        'school':                parent.school.name if parent.school else None,
        'must_change_password':  getattr(parent, 'must_change_password', False),
    }
    return JsonResponse({'success': True, 'profile': data})


@csrf_exempt
def api_parent_children(request):
    """GET: list of children linked to this parent."""
    user, parent = _get_parent_profile(request)
    if not parent:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    links = ParentStudent.objects.filter(parent=parent).select_related(
        'student__user', 'student__classroom'
    )
    data = [{
        'student_id':       ps.student.id,
        'name':             ps.student.user.get_full_name(),
        'admission_number': ps.student.admission_number,
        'classroom':        ps.student.classroom.name if ps.student.classroom else None,
        'is_primary':       ps.is_primary_contact,
    } for ps in links]
    return JsonResponse({'success': True, 'children': data})


@csrf_exempt
def api_parent_child_grades(request, student_id):
    """GET: grades for a specific child of this parent."""
    user, parent = _get_parent_profile(request)
    if not parent:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if not ParentStudent.objects.filter(parent=parent, student_id=student_id).exists():
        return JsonResponse({'success': False, 'message': 'Child not linked to this account.'}, status=403)
    term_id   = request.GET.get('term_id')
    grades_qs = Grade.objects.filter(student_id=student_id).select_related('subject', 'term')
    if term_id:
        grades_qs = grades_qs.filter(term_id=term_id)
    data = [{
        'id':           g.id,
        'subject':      g.subject.name,
        'term':         g.term.name if g.term else None,
        'ca':           str(g.continuous_assessment) if g.continuous_assessment is not None else None,
        'midterm':      str(g.mid_term_exam) if g.mid_term_exam is not None else None,
        'final':        str(g.final_exam) if g.final_exam is not None else None,
        'total':        str(g.total_score) if g.total_score is not None else None,
        'grade_letter': g.grade_letter,
        'is_locked':    g.is_locked,
    } for g in grades_qs.order_by('subject__name')]
    return JsonResponse({'success': True, 'grades': data})


@csrf_exempt
def api_parent_child_report_cards(request, student_id):
    """GET: report cards for a specific child."""
    user, parent = _get_parent_profile(request)
    if not parent:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if not ParentStudent.objects.filter(parent=parent, student_id=student_id).exists():
        return JsonResponse({'success': False, 'message': 'Child not linked to this account.'}, status=403)
    cards = ReportCard.objects.filter(student_id=student_id).select_related('term', 'academic_year').order_by('-generated_at')
    data = [{
        'id':                c.id,
        'term':              c.term.name if c.term else None,
        'academic_year':     c.academic_year.name if c.academic_year else None,
        'average_score':     str(c.average_score) if c.average_score is not None else None,
        'class_rank':        c.class_rank,
        'class_size':        c.class_size,
        'pdf_url':           c.pdf_file.url if c.pdf_file else None,
        'verification_hash': c.verification_hash,
        'generated_at':      str(c.generated_at),
    } for c in cards]
    return JsonResponse({'success': True, 'report_cards': data})


@csrf_exempt
def api_parent_notifications(request):
    """GET: notifications for this parent. POST: mark as read."""
    from django.db.models import Q
    user, parent = _get_parent_profile(request)
    if not parent:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    if request.method == 'GET':
        notifs = Notification.objects.filter(
            Q(recipient_user=user) | Q(school=parent.school, recipient_role='parent')
        ).order_by('-created_at')[:50]
        read_ids = set(NotificationRead.objects.filter(user=user)
                                              .values_list('notification_id', flat=True))
        data = [{
            'id':         n.id,
            'title':      n.title,
            'body':       n.body,
            'type':       n.notif_type,
            'created_at': str(n.created_at),
            'is_read':    n.id in read_ids,
        } for n in notifs]
        unread = sum(1 for d in data if not d['is_read'])
        return JsonResponse({'success': True, 'notifications': data, 'unread_count': unread})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON (parent notif).'}, status=400)
        if body.get('mark_all'):
            visible_ids = list(Notification.objects.filter(
                Q(recipient_user=user) | Q(school=parent.school, recipient_role='parent')
            ).values_list('id', flat=True))
            for nid in visible_ids:
                NotificationRead.objects.get_or_create(notification_id=nid, user=user)
            return JsonResponse({'success': True, 'count': len(visible_ids)})
        nid = body.get('notification_id')
        if not nid:
            return JsonResponse({'success': False, 'message': 'notification_id required.'}, status=400)
        NotificationRead.objects.get_or_create(notification_id=nid, user=user)
        return JsonResponse({'success': True, 'message': 'Marked as read.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_parent_notification_prefs(request):
    """GET/POST: parent notification channel + category preferences."""
    user, parent = _get_parent_profile(request)
    if not parent:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    prefs, _ = ParentNotificationPreference.objects.get_or_create(parent=parent)

    if request.method == 'GET':
        return JsonResponse({'success': True, 'preferences': {
            'email_enabled':    prefs.email_enabled,
            'sms_enabled':      prefs.sms_enabled,
            'push_enabled':     prefs.push_enabled,
            'grade_alerts':     prefs.grade_alerts,
            'attendance_alerts': prefs.attendance_alerts,
            'fee_alerts':       prefs.fee_alerts,
        }})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        for field in ('email_enabled', 'sms_enabled', 'push_enabled',
                      'grade_alerts', 'attendance_alerts', 'fee_alerts'):
            if field in body:
                setattr(prefs, field, bool(body[field]))
        prefs.save()
        return JsonResponse({'success': True, 'message': 'Preferences saved.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# =============================================================================
# STUDENT REPORT CARDS
# =============================================================================

@csrf_exempt
def api_student_report_cards(request):
    """GET: report cards for the logged-in student."""
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    cards = ReportCard.objects.filter(student=student).select_related('term', 'academic_year').order_by('-generated_at')
    data = [{
        'id':                c.id,
        'term':              c.term.name if c.term else None,
        'academic_year':     c.academic_year.name if c.academic_year else None,
        'average_score':     str(c.average_score) if c.average_score is not None else None,
        'class_rank':        c.class_rank,
        'class_size':        c.class_size,
        'pdf_url':           c.pdf_file.url if c.pdf_file else None,
        'verification_hash': c.verification_hash,
        'teacher_comment':   c.teacher_comment,
        'principal_comment': c.principal_comment,
        'generated_at':      str(c.generated_at),
    } for c in cards]
    return JsonResponse({'success': True, 'report_cards': data})


@csrf_exempt
def api_report_card_generate(request):
    """POST: generate/regenerate a report card for a student+term (school admin)."""
    try:
        user, sa, school = _get_school_for_admin(request)
    except Exception:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if not user:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    _, err = _require_exam_officer(request, school)
    if err:
        return err
    try:
        data              = json.loads(request.body)
        student_id        = data.get('student_id')
        term_id           = data.get('term_id')
        teacher_comment   = data.get('teacher_comment', '')
        principal_comment = data.get('principal_comment', '')
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON (report card).'}, status=400)
    if not student_id or not term_id:
        return JsonResponse({'success': False, 'message': 'student_id and term_id required.'}, status=400)
    try:
        student = Student.objects.get(id=student_id, school=school)
        term    = Term.objects.get(id=term_id, academic_year__school=school)
    except (Student.DoesNotExist, Term.DoesNotExist):
        return JsonResponse({'success': False, 'message': 'Student or term not found.'}, status=404)
    grades = Grade.objects.filter(student=student, term=term)
    if not grades.exists():
        return JsonResponse({'success': False, 'message': 'No grades found for this student/term.'}, status=400)
    total   = sum(float(g.total_score) for g in grades if g.total_score is not None)
    avg     = total / grades.count() if grades.count() else 0
    ranking = ClassRanking.objects.filter(student=student, term=term).first()
    rank    = ranking.rank if ranking else None
    raw     = f"{student.id}-{term.id}-{total:.2f}-{avg:.2f}"
    v_hash  = hashlib.sha256(raw.encode()).hexdigest()
    if avg >= 90:   overall = 'A+'
    elif avg >= 80: overall = 'A'
    elif avg >= 70: overall = 'B'
    elif avg >= 60: overall = 'C'
    elif avg >= 50: overall = 'D'
    else:           overall = 'F'
    card, created = ReportCard.objects.update_or_create(
        student=student, term=term,
        defaults={
            'academic_year':     term.academic_year,
            'classroom':         student.classroom,
            'average_score':     avg,
            'class_rank':        rank,
            'total_subjects':    grades.count(),
            'verification_hash': v_hash,
            'generated_by':      user,
            'teacher_comment':   teacher_comment,
            'principal_comment': principal_comment,
        }
    )
    return JsonResponse({
        'success': True,
        'message': 'Report card generated.' if created else 'Report card updated.',
        'id':      card.id,
        'avg':     round(avg, 2),
        'overall': overall,
        'rank':    rank,
        'hash':    v_hash,
    })


# =============================================================================
# CLASS SUBJECTS
# =============================================================================

@csrf_exempt
def api_class_subjects(request):
    """GET: list. POST: add. DELETE: remove (?id=<id>)."""
    try:
        user, sa, school = _get_school_for_admin(request)
    except Exception:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if not user:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    if request.method == 'GET':
        class_id = request.GET.get('class_id')
        year_id  = request.GET.get('year_id')
        qs = ClassSubject.objects.filter(
            classroom__school=school
        ).select_related('classroom', 'subject', 'academic_year')
        if class_id:
            qs = qs.filter(classroom_id=class_id)
        if year_id:
            qs = qs.filter(academic_year_id=year_id)
        data = [{
            'id':            cs.id,
            'classroom':     cs.classroom.name,
            'classroom_id':  cs.classroom_id,
            'subject':       cs.subject.name,
            'subject_id':    cs.subject_id,
            'academic_year': cs.academic_year.name,
            'is_active':     cs.is_active,
        } for cs in qs]
        return JsonResponse({'success': True, 'class_subjects': data})

    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON (class subjects).'}, status=400)
        class_id = data.get('class_id')
        subj_id  = data.get('subject_id')
        year_id  = data.get('year_id')
        if not class_id or not subj_id or not year_id:
            return JsonResponse({'success': False, 'message': 'class_id, subject_id, year_id required.'}, status=400)
        try:
            classroom = ClassRoom.objects.get(id=class_id, school=school)
            subject   = Subject.objects.get(id=subj_id, school=school)
            year      = AcademicYear.objects.get(id=year_id, school=school)
        except (ClassRoom.DoesNotExist, Subject.DoesNotExist, AcademicYear.DoesNotExist):
            return JsonResponse({'success': False, 'message': 'Class, subject or year not found.'}, status=404)
        cs, created = ClassSubject.objects.get_or_create(
            classroom=classroom, subject=subject, academic_year=year,
            defaults={'is_active': True}
        )
        if not created:
            cs.is_active = True
            cs.save(update_fields=['is_active'])
        return JsonResponse({'success': True, 'message': 'Class-subject added.', 'id': cs.id})

    if request.method == 'DELETE':
        cs_id = request.GET.get('id')
        if not cs_id:
            return JsonResponse({'success': False, 'message': 'id required.'}, status=400)
        deleted, _ = ClassSubject.objects.filter(id=cs_id, classroom__school=school).delete()
        if not deleted:
            return JsonResponse({'success': False, 'message': 'Not found.'}, status=404)
        return JsonResponse({'success': True, 'message': 'Removed.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# =============================================================================
# STRONG PASSWORD CHANGE (all roles)
# =============================================================================

@csrf_exempt
def api_change_password_strong(request):
    """POST: change password with 12-char strength requirement."""
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    user = _get_authed_user(request)
    if not user:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    try:
        data         = json.loads(request.body)
        old_password = data.get('old_password', '')
        new_password = data.get('new_password', '').strip()
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON (password change).'}, status=400)
    if not old_password or not new_password:
        return JsonResponse({'success': False, 'message': 'Both old and new password required.'}, status=400)
    if not user.check_password(old_password):
        return JsonResponse({'success': False, 'message': 'Old password is incorrect.'}, status=400)
    ok, err = _password_strength_ok(new_password)
    if not ok:
        return JsonResponse({'success': False, 'message': err}, status=400)
    user.set_password(new_password)
    user.save()
    for attr in ('school_admin_profile', 'teacher_profile', 'student_profile', 'parent_profile'):
        profile = getattr(user, attr, None)
        if profile and getattr(profile, 'must_change_password', False):
            profile.must_change_password = False
            profile.save(update_fields=['must_change_password'])
            break
    return JsonResponse({'success': True, 'message': 'Password changed successfully.'})


# =============================================================================
# ROOMS — CRUD
# =============================================================================

@csrf_exempt
def api_rooms(request):
    """GET list / POST create rooms for the school."""
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    if request.method == 'GET':
        qs = Room.objects.filter(school=school).order_by('name')
        data = [{'id': r.id, 'name': r.name, 'code': r.code,
                 'room_type': r.room_type, 'capacity': r.capacity,
                 'is_active': r.is_active, 'notes': r.notes} for r in qs]
        return JsonResponse({'success': True, 'rooms': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        name = body.get('name', '').strip()
        if not name:
            return JsonResponse({'success': False, 'message': 'name is required.'}, status=400)
        if Room.objects.filter(school=school, name=name).exists():
            return JsonResponse({'success': False, 'message': 'Room name already exists.'}, status=409)
        room = Room.objects.create(
            school=school, name=name,
            code=body.get('code', '').strip(),
            room_type=body.get('room_type', 'classroom'),
            capacity=int(body.get('capacity', 30)),
            notes=body.get('notes', '').strip(),
        )
        return JsonResponse({'success': True, 'message': 'Room created.', 'id': room.id}, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_room_detail(request, room_id):
    """GET / PUT / DELETE a single room."""
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    try:
        room = Room.objects.get(id=room_id, school=school)
    except Room.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Room not found.'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'success': True, 'room': {
            'id': room.id, 'name': room.name, 'code': room.code,
            'room_type': room.room_type, 'capacity': room.capacity,
            'is_active': room.is_active, 'notes': room.notes,
        }})

    if request.method in ('PUT', 'PATCH'):
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        for field in ('name', 'code', 'room_type', 'notes'):
            if field in body:
                setattr(room, field, body[field])
        if 'capacity' in body:
            room.capacity = int(body['capacity'])
        if 'is_active' in body:
            room.is_active = bool(body['is_active'])
        room.save()
        return JsonResponse({'success': True, 'message': 'Room updated.'})

    if request.method == 'DELETE':
        room.delete()
        return JsonResponse({'success': True, 'message': 'Room deleted.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# =============================================================================
# GRADING SCHEME — GET / PUT
# =============================================================================

@csrf_exempt
def api_grading_scheme(request):
    """GET or PUT the school's grading scheme (grade boundaries + pass mark)."""
    actor = _get_authed_user(request)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    if request.method == 'GET':
        school = _get_user_school(actor)
        if not school:
            return JsonResponse({'success': False, 'message': 'No school context.'}, status=404)
        scheme, _ = GradingScheme.objects.get_or_create(
            school=school,
            defaults={'boundaries': GradingScheme.default_boundaries(), 'pass_mark': 50},
        )
        return JsonResponse({'success': True, 'scheme': {
            'id': scheme.id,
            'pass_mark': scheme.pass_mark,
            'boundaries': scheme.boundaries,
            'updated_at': scheme.updated_at.isoformat(),
        }})

    if request.method in ('PUT', 'POST'):
        try:
            _, sa, school = _get_school_for_admin(request)
        except SchoolAdmin.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Admin access required.'}, status=403)
        
        scheme, _ = GradingScheme.objects.get_or_create(school=school)
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        
        if 'pass_mark' in body:
            pm = int(body['pass_mark'])
            if not (0 <= pm <= 100):
                return JsonResponse({'success': False, 'message': 'pass_mark must be 0–100.'}, status=400)
            scheme.pass_mark = pm
            
        if 'boundaries' in body:
            boundaries = body['boundaries']
            if not isinstance(boundaries, list) or len(boundaries) < 2:
                return JsonResponse({'success': False, 'message': 'boundaries must be a list with at least 2 entries.'}, status=400)
            for b in boundaries:
                if not all(k in b for k in ('letter', 'min', 'max')):
                    return JsonResponse({'success': False, 'message': 'Each boundary needs letter, min, max.'}, status=400)
            scheme.boundaries = boundaries
            
        scheme.save()
        return JsonResponse({'success': True, 'message': 'Grading scheme updated.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# =============================================================================
# GRADE ENTRY OVERSIGHT — which teachers submitted for each class/subject/term
# =============================================================================

@csrf_exempt
def api_grade_entry_status(request):
    """GET submission overview: for each teacher → class → subject, count submitted vs. total."""
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    term_id = request.GET.get('term_id')
    if not term_id:
        active_term = Term.objects.filter(academic_year__school=school, is_active=True).first()
        if not active_term:
            return JsonResponse({'success': True, 'rows': [], 'term': None})
        term_id = active_term.id
    else:
        try:
            active_term = Term.objects.get(id=term_id, academic_year__school=school)
        except Term.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Term not found.'}, status=404)

    tscs = TeacherSubjectClass.objects.filter(
        teacher__school=school, is_active=True
    ).select_related('teacher__user', 'subject', 'classroom')

    rows = []
    for tsc in tscs:
        student_count = tsc.classroom.students.filter(is_active=True).count()
        submitted = Grade.objects.filter(
            student__classroom=tsc.classroom,
            subject=tsc.subject,
            term=active_term,
            teacher=tsc.teacher,
        ).count()
        locked = Grade.objects.filter(
            student__classroom=tsc.classroom,
            subject=tsc.subject,
            term=active_term,
            teacher=tsc.teacher,
            is_locked=True,
        ).count()
        rows.append({
            'teacher_id':    tsc.teacher.id,
            'teacher_name':  tsc.teacher.user.get_full_name(),
            'employee_id':   tsc.teacher.employee_id,
            'subject':       tsc.subject.name,
            'subject_id':    tsc.subject.id,
            'classroom':     tsc.classroom.name,
            'classroom_id':  tsc.classroom.id,
            'total_students': student_count,
            'submitted':     submitted,
            'locked':        locked,
            'pending':       max(0, student_count - submitted),
            'complete':      student_count > 0 and submitted >= student_count,
        })

    rows.sort(key=lambda r: (r['complete'], r['teacher_name']))
    return JsonResponse({
        'success': True,
        'rows': rows,
        'term': {'id': active_term.id, 'name': str(active_term)},
        'summary': {
            'total': len(rows),
            'complete': sum(1 for r in rows if r['complete']),
            'pending': sum(1 for r in rows if not r['complete']),
        },
    })


# =============================================================================
# STUDENT PROMOTION / TRANSFER
# =============================================================================

@csrf_exempt
def api_promote_student(request, student_id):
    """POST: move student to a different classroom. Preserves existing grades."""
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)

    try:
        student = Student.objects.select_related('classroom').get(id=student_id, school=school)
    except Student.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Student not found.'}, status=404)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

    new_class_id = body.get('classroom_id')
    if not new_class_id:
        return JsonResponse({'success': False, 'message': 'classroom_id is required.'}, status=400)

    try:
        new_class = ClassRoom.objects.get(id=new_class_id, school=school)
    except ClassRoom.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Destination class not found.'}, status=404)

    old_class_name = student.classroom.name if student.classroom else '(none)'
    student.classroom = new_class
    student.save(update_fields=['classroom'])

    # Log the transfer
    _log_security_event(
        event_type='student_transfer',
        description=f'Student {student.user.get_full_name()} moved from {old_class_name} to {new_class.name}',
        severity='low',
        actor=actor,
        ip=request.META.get('REMOTE_ADDR'),
    )

    return JsonResponse({
        'success': True,
        'message': f'Student moved to {new_class.name}.',
        'old_class': old_class_name,
        'new_class': new_class.name,
    })


# =============================================================================
# EXAMINATION OFFICER ASSIGNMENT
# =============================================================================

@csrf_exempt
def api_exam_officers(request):
    """GET list of teachers + their exam officer status. POST to toggle."""
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    if request.method == 'GET':
        teachers = Teacher.objects.filter(school=school, is_active=True).select_related('user')
        data = [{
            'id': t.id,
            'name': t.user.get_full_name(),
            'employee_id': t.employee_id,
            'email': t.user.email,
            'is_examination_officer': t.is_examination_officer,
        } for t in teachers]
        return JsonResponse({'success': True, 'teachers': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        teacher_id = body.get('teacher_id')
        assign = bool(body.get('assign', True))
        try:
            teacher = Teacher.objects.get(id=teacher_id, school=school)
        except Teacher.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Teacher not found.'}, status=404)
        teacher.is_examination_officer = assign
        teacher.save(update_fields=['is_examination_officer'])
        action = 'assigned' if assign else 'removed'
        return JsonResponse({'success': True, 'message': f'Examination officer role {action}.'})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# =============================================================================
# GLOBAL TEACHER ASSIGNMENTS  (school-wide list + create + delete by id)
# /api/school/teacher-assignments/          → GET list, POST create
# /api/school/teacher-assignments/<id>/     → DELETE
# =============================================================================

@csrf_exempt
def api_teacher_assignments_global(request):
    """GET all active assignments for the school. POST creates a new one (auto-resolves active year)."""
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    if request.method == 'GET':
        tscs = TeacherSubjectClass.objects.filter(
            teacher__school=school, is_active=True,
        ).select_related('teacher__user', 'subject', 'classroom', 'academic_year').order_by(
            'classroom__name', 'subject__name', 'teacher__user__first_name',
        )
        data = [{
            'id':             tsc.id,
            'teacher_id':     tsc.teacher.id,
            'teacher_name':   tsc.teacher.user.get_full_name(),
            'employee_id':    tsc.teacher.employee_id,
            'subject_id':     tsc.subject.id,
            'subject_name':   tsc.subject.name,
            'class_id':       tsc.classroom.id,
            'class_name':     tsc.classroom.name,
            'academic_year':  tsc.academic_year.name if tsc.academic_year else '',
            'student_count':  tsc.classroom.students.filter(is_active=True).count(),
        } for tsc in tscs]
        return JsonResponse({'success': True, 'assignments': data})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        teacher_id  = body.get('teacher_id')
        class_id    = body.get('class_id')
        subject_id  = body.get('subject_id')
        year_id     = body.get('academic_year_id')
        if not all([teacher_id, class_id, subject_id]):
            return JsonResponse({'success': False, 'message': 'teacher_id, class_id, subject_id required.'}, status=400)
        try:
            teacher   = Teacher.objects.get(id=teacher_id, school=school)
            classroom = ClassRoom.objects.get(id=class_id, school=school)
            subject   = Subject.objects.get(id=subject_id, school=school)
        except (Teacher.DoesNotExist, ClassRoom.DoesNotExist, Subject.DoesNotExist) as exc:
            return JsonResponse({'success': False, 'message': str(exc)}, status=404)
        if year_id:
            try:
                year = AcademicYear.objects.get(id=year_id, school=school)
            except AcademicYear.DoesNotExist:
                return JsonResponse({'success': False, 'message': 'Academic year not found.'}, status=404)
        else:
            year = AcademicYear.objects.filter(school=school, is_active=True).first()
            if not year:
                year = AcademicYear.objects.filter(school=school).order_by('-start_date').first()
            if not year:
                return JsonResponse({'success': False, 'message': 'No academic year found. Create one first.'}, status=400)
        tsc, created = TeacherSubjectClass.objects.get_or_create(
            teacher=teacher, subject=subject, classroom=classroom, academic_year=year,
            defaults={'is_active': True},
        )
        if not created:
            if tsc.is_active:
                return JsonResponse({'success': False, 'message': 'This assignment already exists.'}, status=409)
            tsc.is_active = True
            tsc.save(update_fields=['is_active'])
        return JsonResponse({'success': True, 'message': 'Assignment created.', 'id': tsc.id}, status=201)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


@csrf_exempt
def api_teacher_assignment_delete(request, assignment_id):
    """DELETE a single TeacherSubjectClass by ID (soft-delete: sets is_active=False)."""
    try:
        actor, sa, school = _get_school_for_admin(request)
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile.'}, status=404)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'DELETE':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    try:
        tsc = TeacherSubjectClass.objects.get(id=assignment_id, teacher__school=school)
    except TeacherSubjectClass.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Assignment not found.'}, status=404)
    tsc.is_active = False
    tsc.save(update_fields=['is_active'])
    return JsonResponse({'success': True, 'message': 'Assignment removed.'})


# =============================================================================
# STUDENT GRADES SUMMARY (classRank, overallAverage, subjectsPassed)
# =============================================================================

@csrf_exempt
def api_student_grades_summary(request):
    """GET: grade summary for a student for a given term."""
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    term_id = request.GET.get('term_id')
    qs = student.grades.select_related('subject', 'term')
    if term_id:
        try:
            qs = qs.filter(term_id=int(term_id))
        except (ValueError, TypeError):
            pass

    grades = list(qs)
    scores = [float(g.total_score) for g in grades if g.total_score is not None]
    overall_average = round(sum(scores) / len(scores), 1) if scores else 0
    subjects_passed = sum(1 for s in scores if s >= 50)
    total_subjects  = len(scores)

    # Class rank from ClassRanking model
    class_rank = None
    class_size = None
    ranking_pending = True
    try:
        if term_id:
            ranking = ClassRanking.objects.filter(student=student, term_id=int(term_id)).first()
        else:
            ranking = ClassRanking.objects.filter(student=student).order_by('-created_at').first()
        if ranking:
            class_rank = ranking.rank
            class_size = ClassRanking.objects.filter(
                term=ranking.term,
                classroom=student.classroom,
            ).count() or None
            ranking_pending = False
    except Exception:
        pass

    return JsonResponse({
        'success':             True,
        'overallAverage':      overall_average,
        'classRank':           class_rank,
        'totalStudentsInClass': class_size,
        'subjectsPassed':      subjects_passed,
        'totalSubjects':       total_subjects,
        'rankingPending':      ranking_pending,
    })


# =============================================================================
# REPORT CARD DOWNLOAD (HTML with embedded QR code)
# =============================================================================

@csrf_exempt
def api_report_card_download(request, card_id):
    """GET: download a report card as a print-ready HTML page with QR code."""
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
    try:
        card = ReportCard.objects.select_related('term', 'academic_year', 'classroom').get(
            id=card_id, student=student
        )
    except ReportCard.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Report card not found.'}, status=404)

    grades = Grade.objects.filter(student=student, term=card.term).select_related('subject')

    # Generate QR code as base64 PNG
    qr_data_uri = ''
    try:
        import qrcode, io, base64
        verify_url = f"{request.scheme}://{request.get_host()}/verify/{card.verification_hash}/"
        qr = qrcode.QRCode(version=2, box_size=6, border=2)
        qr.add_data(verify_url)
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')
        buf = io.BytesIO()
        img.save(buf, format='PNG')
        qr_data_uri = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
    except Exception:
        pass

    grade_rows = ''.join(
        f'<tr><td>{g.subject.name}</td>'
        f'<td style="text-align:center">{float(g.continuous_assessment)}</td>'
        f'<td style="text-align:center">{float(g.mid_term_exam)}</td>'
        f'<td style="text-align:center">{float(g.final_exam)}</td>'
        f'<td style="text-align:center;font-weight:700">{float(g.total_score)}</td>'
        f'<td style="text-align:center">{g.grade_letter}</td></tr>'
        for g in grades
    )
    avg_display = f"{float(card.average_score):.1f}" if card.average_score else '—'
    rank_display = f"{card.class_rank} / {card.class_size}" if card.class_rank else 'Ranking pending'
    hash_short   = card.verification_hash[:16] + '…' if card.verification_hash else '—'

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Report Card — {student.user.get_full_name()}</title>
<style>
  @media print {{ .no-print {{ display:none }} }}
  body {{ font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111; }}
  h1   {{ margin: 0 0 4px; font-size: 1.4rem; }}
  .header {{ display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #1B3FAF; padding-bottom:12px; margin-bottom:16px; }}
  .school-info h2 {{ margin:0 0 4px; font-size:1rem; color:#1B3FAF; }}
  .school-info p  {{ margin:0; font-size:0.8rem; color:#555; }}
  .student-info {{ margin-bottom:16px; display:grid; grid-template-columns:1fr 1fr; gap:6px 24px; font-size:0.85rem; }}
  .student-info span {{ color:#555; }}
  table {{ width:100%; border-collapse:collapse; font-size:0.85rem; margin-bottom:16px; }}
  th    {{ background:#1B3FAF; color:#fff; padding:8px 10px; text-align:left; }}
  td    {{ border-bottom:1px solid #e5e7eb; padding:7px 10px; }}
  tr:nth-child(even) td {{ background:#f8f9ff; }}
  .summary-row {{ display:flex; gap:24px; font-size:0.9rem; margin-bottom:16px; }}
  .summary-box {{ background:#f0f4ff; border-radius:8px; padding:10px 18px; }}
  .summary-box label {{ display:block; font-size:0.7rem; color:#555; text-transform:uppercase; letter-spacing:.05em; }}
  .summary-box strong {{ font-size:1.3rem; color:#1B3FAF; }}
  .footer {{ font-size:0.7rem; color:#888; border-top:1px solid #e5e7eb; padding-top:10px; margin-top:8px; }}
  .qr-section {{ text-align:right; }}
  .qr-section img {{ width:90px; height:90px; }}
  .qr-section p {{ margin:4px 0 0; font-size:0.65rem; color:#888; font-family:monospace; }}
  .print-btn {{ background:#1B3FAF; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer; font-size:0.9rem; margin-bottom:16px; }}
</style>
</head>
<body>
<button class="print-btn no-print" onclick="window.print()">⬇ Print / Save as PDF</button>
<div class="header">
  <div class="school-info">
    <h2>{getattr(student.school, 'name', 'School Name')}</h2>
    <p>Academic Year: {card.academic_year.name if card.academic_year else '—'} &nbsp;|&nbsp; Term: {card.term.name if card.term else '—'}</p>
  </div>
  {'<div class="qr-section"><img src="' + qr_data_uri + '" alt="QR"/><p>' + hash_short + '</p></div>' if qr_data_uri else ''}
</div>
<h1>Official Academic Report</h1>
<div class="student-info">
  <div><span>Student Name</span><br/><strong>{student.user.get_full_name()}</strong></div>
  <div><span>Admission No.</span><br/><strong>{student.admission_number}</strong></div>
  <div><span>Class</span><br/><strong>{card.classroom.name if card.classroom else '—'}</strong></div>
  <div><span>Generated</span><br/><strong>{card.generated_at.strftime('%d %b %Y') if card.generated_at else '—'}</strong></div>
</div>
<table>
  <thead><tr><th>Subject</th><th style="text-align:center">CA</th><th style="text-align:center">Mid-Term</th><th style="text-align:center">Final</th><th style="text-align:center">Total</th><th style="text-align:center">Grade</th></tr></thead>
  <tbody>{grade_rows}</tbody>
</table>
<div class="summary-row">
  <div class="summary-box"><label>Term Average</label><strong>{avg_display}%</strong></div>
  <div class="summary-box"><label>Class Rank</label><strong>{rank_display}</strong></div>
  <div class="summary-box"><label>Subjects</label><strong>{card.total_subjects}</strong></div>
</div>
<div class="footer">
  Verification Hash: <code>{card.verification_hash or '—'}</code><br/>
  This document can be verified at <strong>/verify/&lt;hash&gt;/</strong>
</div>
</body>
</html>"""

    from django.http import HttpResponse
    response = HttpResponse(html, content_type='text/html; charset=utf-8')
    fname = f"report_card_{student.admission_number}_{card.term.name.replace(' ', '_') if card.term else 'term'}.html"
    response['Content-Disposition'] = f'attachment; filename="{fname}"'
    return response


# =============================================================================
# STUDENT 2FA SETUP
# =============================================================================

@csrf_exempt
def api_student_2fa_setup(request):
    """GET: get 2FA status + setup QR. POST: enable or disable 2FA."""
    user, student = _get_student_profile(request)
    if not student:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    try:
        from django_otp.plugins.otp_totp.models import TOTPDevice
    except ImportError:
        return JsonResponse({'success': False, 'message': '2FA not available on this server.'}, status=503)

    if request.method == 'GET':
        device = TOTPDevice.objects.filter(user=user, confirmed=True).first()
        pending = TOTPDevice.objects.filter(user=user, confirmed=False).first()
        if not pending and not device:
            pending = TOTPDevice.objects.create(user=user, name='Student 2FA', confirmed=False)

        setup_uri = ''
        qr_data_uri = ''
        if not device and pending:
            try:
                import qrcode, io, base64
                setup_uri = pending.config_url
                qr = qrcode.QRCode(version=2, box_size=6, border=2)
                qr.add_data(setup_uri)
                qr.make(fit=True)
                img = qr.make_image(fill_color='black', back_color='white')
                buf = io.BytesIO()
                img.save(buf, format='PNG')
                qr_data_uri = 'data:image/png;base64,' + base64.b64encode(buf.getvalue()).decode()
            except Exception:
                pass

        return JsonResponse({
            'success':        True,
            'enabled':        device is not None,
            'setup_required': device is None,
            'qr_code':        qr_data_uri,
            'setup_uri':      setup_uri,
        })

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

        action = body.get('action')

        if action == 'enable':
            otp_code = str(body.get('otp_code', '')).strip()
            pending  = TOTPDevice.objects.filter(user=user, confirmed=False).first()
            if not pending:
                return JsonResponse({'success': False, 'message': 'No pending 2FA setup found.'}, status=400)
            if pending.verify_token(otp_code):
                pending.confirmed = True
                pending.save(update_fields=['confirmed'])
                return JsonResponse({'success': True, 'message': '2FA enabled successfully.'})
            return JsonResponse({'success': False, 'message': 'Invalid OTP code. Please try again.'}, status=400)

        if action == 'disable':
            deleted, _ = TOTPDevice.objects.filter(user=user).delete()
            return JsonResponse({'success': True, 'message': '2FA disabled.' if deleted else 'No 2FA device found.'})

        return JsonResponse({'success': False, 'message': 'action must be enable or disable.'}, status=400)

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)


# ─────────────────────────────────────────────────────────────────────────────
# Close Term
# POST /api/school/close-term/
# Body: { "term_id": <int> }
# Locks all unlocked grades for the term, closes grade entry, sets status=closed
# ─────────────────────────────────────────────────────────────────────────────
@csrf_exempt
def api_close_term(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'POST required.'}, status=405)

    try:
        user, sa, school = _get_school_for_admin(request)
    except Exception:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if not user or not school:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    try:
        body    = json.loads(request.body)
        term_id = int(body.get('term_id', 0))
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'success': False, 'message': 'Invalid request body.'}, status=400)

    try:
        term = Term.objects.get(id=term_id, academic_year__school=school)
    except Term.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Term not found.'}, status=404)

    if term.status == 'closed':
        return JsonResponse({'success': False, 'message': 'Term is already closed.'}, status=400)

    unlocked = Grade.objects.filter(term=term, is_locked=False)
    locked_count = unlocked.count()
    unlocked.update(is_locked=True)

    term.grade_entry_open = False
    term.status = 'closed'
    term.save(update_fields=['grade_entry_open', 'status'])

    return JsonResponse({
        'success':      True,
        'message':      f'Term "{term.name}" closed. {locked_count} grade(s) locked.',
        'term_id':      term.id,
        'term_name':    term.name,
        'locked_count': locked_count,
    })


# ─────────────────────────────────────────────────────────────────────────────
# Student Transcript
# GET /api/student/transcript/
# Returns cumulative grade data across all terms for the authenticated student
# ─────────────────────────────────────────────────────────────────────────────
@csrf_exempt
def api_student_transcript(request):
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'GET required.'}, status=405)

    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    user  = _validate_token(token)
    if not user:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    try:
        student = Student.objects.select_related('user', 'school', 'classroom').get(user=user)
    except Student.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Student record not found.'}, status=404)

    grades_qs = (
        Grade.objects
        .filter(student=student)
        .select_related('subject', 'teacher__user', 'term', 'term__academic_year')
        .order_by('term__academic_year__start_date', 'term__start_date', 'subject__name')
    )

    from collections import defaultdict
    years = defaultdict(lambda: defaultdict(list))
    for g in grades_qs:
        ay  = g.term.academic_year
        ay_key   = f"{ay.start_date.year}/{ay.end_date.year}"
        term_key = g.term.name
        years[ay_key][term_key].append({
            'subject':     g.subject.name if g.subject else '',
            'ca':          float(g.continuous_assessment),
            'midterm':     float(g.mid_term_exam),
            'final':       float(g.final_exam),
            'total':       float(g.total_score),
            'gradeLetter': g.grade_letter,
            'status':      'Locked' if g.is_locked else 'Draft',
        })

    transcript = []
    for ay_label, terms_dict in years.items():
        term_list = []
        for term_name, subject_grades in terms_dict.items():
            scores   = [s['total'] for s in subject_grades if s['total'] is not None]
            term_avg = round(sum(scores) / len(scores), 1) if scores else None
            term_list.append({'term': term_name, 'subjects': subject_grades, 'average': term_avg})
        transcript.append({'academicYear': ay_label, 'terms': term_list})

    return JsonResponse({
        'success':    True,
        'student':    student.user.get_full_name(),
        'studentId':  getattr(student, 'admission_number', ''),
        'transcript': transcript,
    })


# ─────────────────────────────────────────────────────────────────────────────
# Bulk Import
# POST /api/school/bulk-import/?type=students|teachers|subjects|classrooms
# Accepts multipart CSV file upload or JSON array body
# ─────────────────────────────────────────────────────────────────────────────
@csrf_exempt
def api_bulk_import(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'POST required.'}, status=405)

    try:
        user, sa, school = _get_school_for_admin(request)
    except Exception:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if not user or not school:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    import_type = request.GET.get('type', '').lower()
    if import_type not in ('students', 'teachers', 'subjects', 'classrooms'):
        return JsonResponse({'success': False, 'message': 'type must be students, teachers, subjects, or classrooms.'}, status=400)

    rows = []
    if request.FILES.get('file'):
        import csv, io
        raw    = request.FILES['file'].read().decode('utf-8-sig')
        reader = csv.DictReader(io.StringIO(raw))
        rows   = [dict(r) for r in reader]
    else:
        try:
            body = json.loads(request.body)
            rows = body if isinstance(body, list) else body.get('rows', [])
        except (json.JSONDecodeError, TypeError):
            return JsonResponse({'success': False, 'message': 'Provide a CSV file or a JSON array.'}, status=400)

    if not rows:
        return JsonResponse({'success': False, 'message': 'No rows provided.'}, status=400)

    created = 0
    errors  = []

    if import_type == 'subjects':
        for i, row in enumerate(rows, 1):
            name = (row.get('name') or row.get('subject_name') or '').strip()
            if not name:
                errors.append({'row': i, 'error': 'Missing subject name.'})
                continue
            _, was_created = Subject.objects.get_or_create(school=school, name=name)
            if was_created:
                created += 1

    elif import_type == 'classrooms':
        for i, row in enumerate(rows, 1):
            name        = (row.get('name') or row.get('class_name') or '').strip()
            code        = (row.get('code') or '').strip()
            form_number = (row.get('form_number') or row.get('grade') or '').strip()
            if not name:
                errors.append({'row': i, 'error': 'Missing classroom name.'})
                continue
            if not code:
                import re
                code = re.sub(r'\s+', '', name.upper())[:20]
            try:
                form_int = int(form_number) if form_number else 1
            except ValueError:
                form_int = 1
            if ClassRoom.objects.filter(school=school, code=code).exists():
                errors.append({'row': i, 'error': f'Classroom code "{code}" already exists.'})
                continue
            try:
                ClassRoom.objects.create(
                    school=school, name=name, code=code,
                    form_number=form_int, is_active=True,
                )
                created += 1
            except Exception as exc:
                errors.append({'row': i, 'error': str(exc)})

    elif import_type == 'students':
        from django.contrib.auth import get_user_model
        from django.utils.crypto import get_random_string
        User = get_user_model()
        active_year = AcademicYear.objects.filter(school=school, is_active=True).first()
        for i, row in enumerate(rows, 1):
            first = (row.get('first_name') or '').strip()
            last  = (row.get('last_name')  or '').strip()
            email = (row.get('email') or '').strip().lower()
            if not first or not last:
                errors.append({'row': i, 'error': 'first_name and last_name required.'})
                continue
            if not email:
                slug  = get_random_string(4)
                email = f"{first.lower()}.{last.lower()}.{slug}@student.{school.code.lower()}.eksms.edu.sl"
            if User.objects.filter(email=email).exists():
                errors.append({'row': i, 'error': f'Email {email} already in use.'})
                continue
            try:
                # Use provided admission_number or generate a unique one
                adm_no = (row.get('admission_number') or row.get('adm_no') or '').strip()
                if not adm_no:
                    adm_no = f"STU-{school.code.upper()}-{get_random_string(6).upper()}"
                # Ensure uniqueness within school
                while Student.objects.filter(school=school, admission_number=adm_no).exists():
                    adm_no = f"STU-{school.code.upper()}-{get_random_string(6).upper()}"
                pwd = get_random_string(10)
                u   = User.objects.create_user(
                    username=email, email=email,
                    first_name=first, last_name=last, password=pwd,
                )
                classroom_name = (row.get('classroom') or row.get('class') or '').strip()
                classroom = ClassRoom.objects.filter(school=school, name__iexact=classroom_name).first() if classroom_name else None
                Student.objects.create(
                    user=u, school=school, classroom=classroom,
                    academic_year=active_year, admission_number=adm_no,
                    must_change_password=True,
                )
                created += 1
            except Exception as exc:
                errors.append({'row': i, 'error': str(exc)})

    elif import_type == 'teachers':
        from django.contrib.auth import get_user_model
        from django.utils.crypto import get_random_string
        User = get_user_model()
        for i, row in enumerate(rows, 1):
            first = (row.get('first_name') or '').strip()
            last  = (row.get('last_name')  or '').strip()
            email = (row.get('email') or '').strip().lower()
            if not first or not last:
                errors.append({'row': i, 'error': 'first_name and last_name required.'})
                continue
            if not email:
                slug  = get_random_string(4)
                email = f"{first.lower()}.{last.lower()}.{slug}@teacher.{school.code.lower()}.eksms.edu.sl"
            if User.objects.filter(email=email).exists():
                errors.append({'row': i, 'error': f'Email {email} already in use.'})
                continue
            try:
                # Use provided employee_id or generate a unique one
                emp_id = (row.get('employee_id') or row.get('emp_id') or '').strip()
                if not emp_id:
                    emp_id = f"TCH-{school.code.upper()}-{get_random_string(6).upper()}"
                while Teacher.objects.filter(school=school, employee_id=emp_id).exists():
                    emp_id = f"TCH-{school.code.upper()}-{get_random_string(6).upper()}"
                pwd = get_random_string(10)
                u   = User.objects.create_user(
                    username=email, email=email,
                    first_name=first, last_name=last, password=pwd,
                )
                Teacher.objects.create(user=u, school=school, employee_id=emp_id)
                created += 1
            except Exception as exc:
                errors.append({'row': i, 'error': str(exc)})

    return JsonResponse({
        'success':    True,
        'type':       import_type,
        'total_rows': len(rows),
        'created':    created,
        'skipped':    len(rows) - created - len(errors),
        'errors':     errors,
    })


# ─────────────────────────────────────────────────────────────────────────────
# Batch Student Promotion
# POST /api/school/students/promote-batch/
# Body: { "student_ids": [1,2,3,...], "target_classroom_id": <int> }
# Moves all listed students to the target classroom in one call.
# ─────────────────────────────────────────────────────────────────────────────
@csrf_exempt
def api_promote_students_batch(request):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'POST required.'}, status=405)

    try:
        actor, sa, school = _get_school_for_admin(request)
    except Exception:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if not actor or not school:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

    student_ids      = body.get('student_ids', [])
    target_class_id  = body.get('target_classroom_id')

    if not student_ids or not target_class_id:
        return JsonResponse({'success': False, 'message': 'student_ids and target_classroom_id are required.'}, status=400)

    try:
        target_class = ClassRoom.objects.get(id=target_class_id, school=school)
    except ClassRoom.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Target classroom not found.'}, status=404)

    moved   = 0
    skipped = []
    for sid in student_ids:
        try:
            student = Student.objects.select_related('classroom').get(id=sid, school=school)
        except Student.DoesNotExist:
            skipped.append({'id': sid, 'reason': 'Not found'})
            continue
        old_name = student.classroom.name if student.classroom else '(none)'
        student.classroom = target_class
        student.save(update_fields=['classroom'])
        moved += 1
        _log_security_event(
            event_type='student_transfer',
            description=f'Batch: {student.user.get_full_name()} moved from {old_name} to {target_class.name}',
            severity='low',
            actor=actor,
            ip=request.META.get('REMOTE_ADDR'),
        )

    return JsonResponse({
        'success':           True,
        'moved':             moved,
        'skipped':           skipped,
        'target_classroom':  target_class.name,
    })


# ─────────────────────────────────────────────────────────────────────────────
# Transcript Download (printable HTML)
# GET /api/student/transcript/download/
# Generates a print-ready HTML transcript for the authenticated student.
# ─────────────────────────────────────────────────────────────────────────────
@csrf_exempt
def api_student_transcript_download(request):
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'GET required.'}, status=405)

    token = request.headers.get('Authorization', '').replace('Bearer ', '').strip()
    user  = _validate_token(token)
    if not user:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    try:
        student = Student.objects.select_related('user', 'school', 'classroom').get(user=user)
    except Student.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Student record not found.'}, status=404)

    grades_qs = (
        Grade.objects
        .filter(student=student)
        .select_related('subject', 'term', 'term__academic_year')
        .order_by('term__academic_year__start_date', 'term__start_date', 'subject__name')
    )

    from collections import defaultdict
    years = defaultdict(lambda: defaultdict(list))
    for g in grades_qs:
        ay       = g.term.academic_year
        ay_key   = f"{ay.start_date.year}/{ay.end_date.year}"
        term_key = g.term.name
        years[ay_key][term_key].append(g)

    school_name = student.school.name if student.school else 'EK School Management System'
    student_name = student.user.get_full_name()
    adm_no = student.admission_number

    rows_html = ''
    for ay_label, terms_dict in years.items():
        for term_name, grades in terms_dict.items():
            scores = [float(g.total_score) for g in grades]
            avg    = round(sum(scores) / len(scores), 1) if scores else 0
            for g in grades:
                rows_html += (
                    f'<tr><td>{ay_label}</td><td>{term_name}</td>'
                    f'<td>{g.subject.name if g.subject else "—"}</td>'
                    f'<td style="text-align:center">{float(g.continuous_assessment):.1f}</td>'
                    f'<td style="text-align:center">{float(g.mid_term_exam):.1f}</td>'
                    f'<td style="text-align:center">{float(g.final_exam):.1f}</td>'
                    f'<td style="text-align:center;font-weight:700">{float(g.total_score):.1f}</td>'
                    f'<td style="text-align:center;font-weight:700">{g.grade_letter}</td>'
                    f'<td style="text-align:center">{"🔒 Locked" if g.is_locked else "Draft"}</td></tr>'
                )
            rows_html += (
                f'<tr style="background:#f3f4f6"><td colspan="6" style="text-align:right;font-style:italic">'
                f'Term average</td>'
                f'<td style="text-align:center;font-weight:800">{avg}</td>'
                f'<td colspan="2"></td></tr>'
            )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Official Transcript — {student_name}</title>
<style>
  body {{font-family:Arial,sans-serif;color:#111;margin:40px;font-size:13px}}
  h1 {{font-size:20px;margin:0 0 4px}}
  .school {{font-size:15px;color:#555;margin-bottom:20px}}
  .meta {{display:flex;gap:40px;margin-bottom:24px;font-size:12px}}
  .meta b {{display:block;font-size:11px;color:#888;margin-bottom:2px}}
  table {{width:100%;border-collapse:collapse;font-size:12px}}
  th {{background:#1e3a8a;color:#fff;padding:7px 10px;text-align:left}}
  td {{padding:6px 10px;border-bottom:1px solid #e5e7eb}}
  tr:hover td {{background:#f9fafb}}
  .footer {{margin-top:32px;font-size:11px;color:#888;text-align:center}}
  @media print {{body{{margin:20px}} .no-print{{display:none}}}}
</style>
</head>
<body>
<h1>Official Academic Transcript</h1>
<div class="school">{school_name}</div>
<div class="meta">
  <div><b>Student Name</b>{student_name}</div>
  <div><b>Admission Number</b>{adm_no}</div>
  <div><b>Generated</b>{timezone.now().strftime('%d %B %Y at %H:%M')}</div>
</div>
<table>
  <thead>
    <tr>
      <th>Academic Year</th><th>Term</th><th>Subject</th>
      <th>CA (/20)</th><th>Mid-Term (/30)</th><th>Final (/50)</th>
      <th>Total (/100)</th><th>Grade</th><th>Status</th>
    </tr>
  </thead>
  <tbody>{rows_html}</tbody>
</table>
<div class="footer">
  This transcript was generated by EK School Management System and is only valid with an official school stamp.
</div>
<div class="no-print" style="margin-top:20px;text-align:center">
  <button onclick="window.print()" style="padding:10px 24px;background:#1e3a8a;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">Print / Save as PDF</button>
</div>
</body>
</html>"""

    from django.http import HttpResponse
    return HttpResponse(html, content_type='text/html')


# ─────────────────────────────────────────────────────────────────────────────
# Academic Year Archive
# POST /api/school/academic-years/<id>/archive/
# Marks an academic year as archived (read-only historical record):
#   - sets is_archived=True, is_active=False, archived_at=now
#   - closes all open terms in the year (sets status=closed, grade_entry_open=False)
#   - locks all remaining unlocked grades for those terms
# ─────────────────────────────────────────────────────────────────────────────
@csrf_exempt
def api_archive_academic_year(request, year_id):
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'POST required.'}, status=405)

    try:
        actor, sa, school = _get_school_for_admin(request)
    except Exception:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)
    if not actor or not school:
        return JsonResponse({'success': False, 'message': 'Unauthorized.'}, status=401)

    try:
        ay = AcademicYear.objects.get(id=year_id, school=school)
    except AcademicYear.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Academic year not found.'}, status=404)

    if ay.is_archived:
        return JsonResponse({'success': False, 'message': 'Academic year is already archived.'}, status=400)

    # Close all open/draft terms and lock their grades
    terms_closed  = 0
    grades_locked = 0
    for term in ay.terms.exclude(status='closed'):
        unlocked = Grade.objects.filter(term=term, is_locked=False)
        grades_locked += unlocked.count()
        unlocked.update(is_locked=True)
        term.grade_entry_open = False
        term.status = 'closed'
        term.save(update_fields=['grade_entry_open', 'status'])
        terms_closed += 1

    ay.is_active  = False
    ay.is_archived = True
    ay.archived_at = timezone.now()
    ay.save(update_fields=['is_active', 'is_archived', 'archived_at'])

    _log_security_event(
        event_type='academic_year_archived',
        description=f'Academic year "{ay.name}" archived by {actor.get_full_name()}. '
                    f'{terms_closed} term(s) closed, {grades_locked} grade(s) locked.',
        severity='low',
        actor=actor,
        ip=request.META.get('REMOTE_ADDR'),
    )

    return JsonResponse({
        'success':       True,
        'message':       f'Academic year "{ay.name}" has been archived.',
        'year_id':       ay.id,
        'year_name':     ay.name,
        'terms_closed':  terms_closed,
        'grades_locked': grades_locked,
    })


# =================================================================
# SUPERADMIN — Branding upload, manual backup, bulk export, lockdown
# =================================================================

@csrf_exempt
def api_branding_upload(request):
    """
    POST multipart/form-data with `kind` ('logo'|'favicon') and `file`.
    Stores the file under MEDIA_ROOT/branding/ and persists the URL into
    AdminSetting so the frontend can read it on next load.
    """
    actor = _get_authed_user(request)
    if not actor or not actor.is_superuser:
        return JsonResponse({'success': False, 'message': 'Superadmin access required.'}, status=403)
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)

    kind = (request.POST.get('kind') or '').strip().lower()
    if kind not in ('logo', 'favicon'):
        return JsonResponse({'success': False, 'message': "kind must be 'logo' or 'favicon'."}, status=400)

    f = request.FILES.get('file')
    if not f:
        return JsonResponse({'success': False, 'message': 'No file provided.'}, status=400)

    # Size & type guards
    max_bytes = 2 * 1024 * 1024
    if f.size > max_bytes:
        return JsonResponse({'success': False, 'message': 'File too large (max 2MB).'}, status=400)
    name_low = f.name.lower()
    allowed_logo    = ('.png', '.svg', '.jpg', '.jpeg', '.webp')
    allowed_favicon = ('.ico', '.png', '.svg', '.jpg', '.jpeg')
    allowed = allowed_logo if kind == 'logo' else allowed_favicon
    if not name_low.endswith(allowed):
        return JsonResponse({
            'success': False,
            'message': f'Unsupported file type. Allowed: {", ".join(allowed)}'
        }, status=400)

    from django.conf import settings as dj_settings
    from django.core.files.storage import default_storage
    from django.core.files.base import ContentFile
    safe_name = f"branding/{kind}_{int(timezone.now().timestamp())}{Path(f.name).suffix.lower()}"
    saved_path = default_storage.save(safe_name, ContentFile(f.read()))
    file_url = default_storage.url(saved_path)
    abs_url  = request.build_absolute_uri(file_url)

    AdminSetting.objects.update_or_create(
        user=actor, key=f'branding_{kind}',
        defaults={'value': {'url': abs_url, 'path': saved_path, 'uploaded_at': timezone.now().isoformat()}},
    )
    _log_security_event(
        'profile_updated',
        description=f'Superadmin uploaded {kind} ({f.name})',
        severity='info', actor=actor, ip=request.META.get('REMOTE_ADDR'),
    )
    return JsonResponse({'success': True, 'kind': kind, 'url': abs_url, 'path': saved_path}, status=201)


@csrf_exempt
def api_manual_backup(request):
    """
    POST — Snapshot the SQLite DB and (optionally) the media directory into
    BACKUPS_DIR. Returns the resulting filename and size. Records the result
    into AdminSetting so the UI's 'Last Backup' timestamp is always in sync.
    """
    actor = _get_authed_user(request)
    if not actor or not actor.is_superuser:
        return JsonResponse({'success': False, 'message': 'Superadmin access required.'}, status=403)
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)

    from django.conf import settings as dj_settings
    backups_dir = Path(dj_settings.BASE_DIR) / 'backups'
    backups_dir.mkdir(parents=True, exist_ok=True)

    try:
        ts = timezone.now().strftime('%Y%m%d_%H%M%S')
        # Use Django's default DB connection — safest for sqlite + most prod backends
        db_path = dj_settings.DATABASES['default'].get('NAME')
        out_path = backups_dir / f'eksms_backup_{ts}.sqlite3'

        # SQLite live backup using sqlite3 .backup API (atomic, no lockout)
        if db_path and str(db_path).endswith(('.sqlite3', '.db')) and Path(db_path).exists():
            import sqlite3
            src = sqlite3.connect(str(db_path))
            dst = sqlite3.connect(str(out_path))
            with dst:
                src.backup(dst)
            src.close(); dst.close()
        else:
            # Non-sqlite engines: use management command
            from django.core.management import call_command
            out_path = backups_dir / f'eksms_backup_{ts}.json'
            with open(out_path, 'w', encoding='utf-8') as fp:
                call_command('dumpdata', '--natural-foreign', '--natural-primary',
                             '--exclude=contenttypes', '--exclude=auth.permission',
                             '--exclude=sessions.session', stdout=fp)

        size_bytes = out_path.stat().st_size
        AdminSetting.objects.update_or_create(
            user=actor, key='last_backup_at',
            defaults={'value': timezone.now().isoformat()},
        )
        AdminSetting.objects.update_or_create(
            user=actor, key='last_backup_meta',
            defaults={'value': {
                'filename':   out_path.name,
                'size_bytes': size_bytes,
                'created_at': timezone.now().isoformat(),
                'path':       str(out_path),
            }},
        )
        _log_security_event(
            'profile_updated',
            description=f'Manual backup created: {out_path.name} ({size_bytes} bytes)',
            severity='info', actor=actor, ip=request.META.get('REMOTE_ADDR'),
        )
        return JsonResponse({
            'success': True,
            'filename': out_path.name,
            'size_bytes': size_bytes,
            'created_at': timezone.now().isoformat(),
        }, status=201)
    except Exception as exc:
        import traceback
        logging.getLogger('django').error(
            f'Manual backup failed: {exc}\n{traceback.format_exc()}'
        )
        return JsonResponse({
            'success': False,
            'message': f'Backup failed: {type(exc).__name__}: {exc}'
        }, status=500)


@csrf_exempt
def api_bulk_export(request):
    """
    GET ?datasets=schools,grades,audit,users&format=csv|json|pdf
        — streams a real downloadable file. CSV/JSON only by default; PDF
          falls back to a structured plain-text PDF if reportlab is present,
          else returns a 415 with a useful message so the frontend can switch
          format gracefully.
    """
    actor = _get_authed_user(request)
    if not actor or not actor.is_superuser:
        return JsonResponse({'success': False, 'message': 'Superadmin access required.'}, status=403)
    if request.method != 'GET':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)

    datasets_raw = (request.GET.get('datasets') or '').strip()
    fmt = (request.GET.get('format') or 'csv').strip().lower()
    if fmt not in ('csv', 'json', 'pdf'):
        return JsonResponse({'success': False, 'message': 'format must be csv, json, or pdf.'}, status=400)
    requested = [d.strip() for d in datasets_raw.split(',') if d.strip()]
    if not requested:
        return JsonResponse({'success': False, 'message': 'No datasets selected.'}, status=400)

    valid = {'schools', 'grades', 'audit', 'users'}
    bad = [d for d in requested if d not in valid]
    if bad:
        return JsonResponse({'success': False, 'message': f'Unknown dataset(s): {", ".join(bad)}'}, status=400)

    def _schools_rows():
        rows = []
        for s in School.objects.all().order_by('id'):
            rows.append({
                'id': s.id, 'name': s.name, 'code': getattr(s, 'code', '') or '',
                'email': getattr(s, 'email', '') or '',
                'is_active': bool(getattr(s, 'is_active', False)),
                'is_approved': bool(getattr(s, 'is_approved', False)),
                'region': getattr(s, 'region', '') or '',
                'created_at': s.registration_date.isoformat() if getattr(s, 'registration_date', None) else '',
            })
        return rows

    def _users_rows():
        rows = []
        for u in User.objects.all().order_by('id'):
            role = 'User'
            if u.is_superuser: role = 'Super Admin'
            elif hasattr(u, 'school_admin_profile'): role = 'School Admin'
            elif hasattr(u, 'teacher_profile'): role = 'Teacher'
            elif hasattr(u, 'student_profile'): role = 'Student'
            elif hasattr(u, 'parent_profile'): role = 'Parent'
            rows.append({
                'id': u.id, 'username': u.username, 'email': u.email or '',
                'first_name': u.first_name or '', 'last_name': u.last_name or '',
                'role': role, 'is_active': bool(u.is_active),
                'date_joined': u.date_joined.isoformat() if u.date_joined else '',
                'last_login':  u.last_login.isoformat()  if u.last_login  else '',
            })
        return rows

    def _grades_rows():
        rows = []
        for g in Grade.objects.select_related('student__user', 'subject', 'term', 'student__school').iterator():
            rows.append({
                'id': g.id,
                'student_id': g.student_id,
                'student_name': g.student.user.get_full_name() if g.student and g.student.user_id else '',
                'school': g.student.school.name if g.student and g.student.school_id else '',
                'subject': g.subject.name if g.subject_id else '',
                'term': g.term.name if g.term_id else '',
                'continuous_assessment': float(g.continuous_assessment),
                'mid_term_exam': float(g.mid_term_exam),
                'final_exam': float(g.final_exam),
                'total_score': float(g.total_score),
                'grade_letter': g.grade_letter,
                'is_locked': bool(g.is_locked),
            })
        return rows

    def _audit_rows():
        rows = []
        qs = SecurityLogEntry.objects.select_related('actor').order_by('-created_at')[:5000]
        for e in qs:
            rows.append({
                'id': e.id, 'event_type': e.event_type,
                'severity': e.severity, 'description': e.description,
                'actor': e.actor.username if e.actor_id else (e.actor_label or ''),
                'ip_address': e.ip_address or '',
                'created_at': e.created_at.isoformat(),
            })
        return rows

    builders = {
        'schools': _schools_rows, 'grades': _grades_rows,
        'audit':   _audit_rows,   'users':  _users_rows,
    }
    bundle = {ds: builders[ds]() for ds in requested}
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    base_name = f'eksms_export_{timestamp}'

    from django.http import HttpResponse, StreamingHttpResponse
    if fmt == 'json':
        resp = HttpResponse(
            json.dumps(bundle, indent=2, default=str),
            content_type='application/json; charset=utf-8',
        )
        resp['Content-Disposition'] = f'attachment; filename="{base_name}.json"'
        return resp

    if fmt == 'csv':
        # If only one dataset, plain CSV. Otherwise produce a ZIP of CSVs.
        import csv, io
        if len(requested) == 1:
            ds = requested[0]; rows = bundle[ds]
            buf = io.StringIO()
            if rows:
                writer = csv.DictWriter(buf, fieldnames=list(rows[0].keys()))
                writer.writeheader(); writer.writerows(rows)
            else:
                buf.write('# No rows for dataset: %s\n' % ds)
            resp = HttpResponse(buf.getvalue(), content_type='text/csv; charset=utf-8')
            resp['Content-Disposition'] = f'attachment; filename="{base_name}_{ds}.csv"'
            return resp

        import zipfile
        zbuf = io.BytesIO()
        with zipfile.ZipFile(zbuf, 'w', zipfile.ZIP_DEFLATED) as z:
            for ds, rows in bundle.items():
                cbuf = io.StringIO()
                if rows:
                    w = csv.DictWriter(cbuf, fieldnames=list(rows[0].keys()))
                    w.writeheader(); w.writerows(rows)
                else:
                    cbuf.write('# No rows\n')
                z.writestr(f'{ds}.csv', cbuf.getvalue())
        zbuf.seek(0)
        resp = HttpResponse(zbuf.getvalue(), content_type='application/zip')
        resp['Content-Disposition'] = f'attachment; filename="{base_name}.zip"'
        return resp

    # PDF — use reportlab if installed, else fall back to JSON-with-pdf-name
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.units import inch
        import io as _io
        pdf_buf = _io.BytesIO()
        pdf = canvas.Canvas(pdf_buf, pagesize=letter)
        width, height = letter
        y = height - 0.75 * inch
        pdf.setFont('Helvetica-Bold', 16)
        pdf.drawString(0.75 * inch, y, 'EK-SMS Compliance Export')
        y -= 0.3 * inch
        pdf.setFont('Helvetica', 10)
        pdf.drawString(0.75 * inch, y, f'Generated: {timezone.now().isoformat()}')
        y -= 0.4 * inch

        for ds, rows in bundle.items():
            if y < 1 * inch:
                pdf.showPage(); y = height - 0.75 * inch
            pdf.setFont('Helvetica-Bold', 12)
            pdf.drawString(0.75 * inch, y, f'{ds.upper()} ({len(rows)} rows)')
            y -= 0.25 * inch
            pdf.setFont('Helvetica', 9)
            for r in rows[:200]:  # cap per-page so we don't blow up the PDF
                line = ', '.join(f'{k}={v}' for k, v in r.items())
                if len(line) > 130:
                    line = line[:127] + '…'
                pdf.drawString(0.75 * inch, y, line)
                y -= 0.18 * inch
                if y < 0.75 * inch:
                    pdf.showPage(); y = height - 0.75 * inch
                    pdf.setFont('Helvetica', 9)
            y -= 0.2 * inch
        pdf.save()
        pdf_buf.seek(0)
        resp = HttpResponse(pdf_buf.getvalue(), content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="{base_name}.pdf"'
        return resp
    except ImportError:
        # Graceful fallback — frontend should retry with json/csv
        return JsonResponse({
            'success': False,
            'message': 'PDF export requires reportlab on the server. Use CSV or JSON.',
        }, status=415)


@csrf_exempt
def api_lockdown(request):
    """
    GET  — return current lockdown state (read from AdminSetting).
    POST — activate/deactivate lockdown.
        body: { protocol: 'grade-lock'|'login-suspend'|'full-blackout',
                action:   'activate'|'deactivate',
                reason:   'optional text' }
    Side-effects:
      - Writes platform-wide lockdown state to AdminSetting (key='platform_lockdown')
      - On 'grade-lock' activation: locks every unlocked Grade
      - On 'login-suspend' / 'full-blackout' activation: deletes all UserToken
        rows EXCEPT the calling superadmin's, terminating active sessions
    """
    actor = _get_authed_user(request)
    if not actor or not actor.is_superuser:
        return JsonResponse({'success': False, 'message': 'Superadmin access required.'}, status=403)

    if request.method == 'GET':
        try:
            row = AdminSetting.objects.filter(key='platform_lockdown').order_by('-updated_at').first()
            return JsonResponse({'success': True, 'state': row.value if row else None})
        except Exception as e:
            return JsonResponse({'success': False, 'message': str(e)}, status=500)

    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)

    protocol = (body.get('protocol') or '').strip()
    action   = (body.get('action')   or 'activate').strip().lower()
    reason   = (body.get('reason')   or '').strip()
    valid    = ('grade-lock', 'login-suspend', 'full-blackout')

    if action not in ('activate', 'deactivate'):
        return JsonResponse({'success': False, 'message': "action must be 'activate' or 'deactivate'."}, status=400)

    if action == 'activate' and protocol not in valid:
        return JsonResponse({'success': False, 'message': f'protocol must be one of: {", ".join(valid)}'}, status=400)

    affected = {'grades_locked': 0, 'sessions_terminated': 0}

    if action == 'activate':
        if protocol == 'grade-lock':
            unlocked = Grade.objects.filter(is_locked=False)
            affected['grades_locked'] = unlocked.count()
            unlocked.update(is_locked=True, locked_at=timezone.now(), locked_by=actor)
        if protocol in ('login-suspend', 'full-blackout'):
            # Keep the activating superadmin authenticated so they can deactivate later
            qs = UserToken.objects.exclude(user=actor)
            affected['sessions_terminated'] = qs.count()
            qs.delete()

        state = {
            'active': True, 'protocol': protocol, 'reason': reason,
            'activated_at': timezone.now().isoformat(),
            'activated_by': actor.username,
        }
    else:
        state = {
            'active': False, 'deactivated_at': timezone.now().isoformat(),
            'deactivated_by': actor.username,
        }

    AdminSetting.objects.update_or_create(
        user=actor, key='platform_lockdown',
        defaults={'value': state},
    )
    _log_security_event(
        'permission_changed' if action == 'activate' else 'profile_updated',
        description=f'Lockdown {action} (protocol={protocol or "n/a"}, reason="{reason}")',
        severity='high' if action == 'activate' else 'medium',
        actor=actor, ip=request.META.get('REMOTE_ADDR'),
        metadata={**state, 'affected': affected},
    )
    return JsonResponse({'success': True, 'state': state, 'affected': affected})


@csrf_exempt
def api_rbac_custom_roles(request):
    """
    GET  — list custom roles defined by the calling superadmin.
    POST — create a new custom role.
        body: { id, name, description, permissions: { ... } }
    DELETE ?id=<id> — remove a custom role.
    Custom roles live as a single AdminSetting row keyed 'rbac_custom_roles'
    so we don't need a new model just for this UI feature.
    """
    actor = _get_authed_user(request)
    if not actor or not actor.is_superuser:
        return JsonResponse({'success': False, 'message': 'Superadmin access required.'}, status=403)

    setting, _ = AdminSetting.objects.get_or_create(
        user=actor, key='rbac_custom_roles',
        defaults={'value': []},
    )
    roles = setting.value if isinstance(setting.value, list) else []

    if request.method == 'GET':
        return JsonResponse({'success': True, 'roles': roles})

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON.'}, status=400)
        name = (body.get('name') or '').strip()
        if not name:
            return JsonResponse({'success': False, 'message': 'name is required.'}, status=400)
        new_id = (body.get('id') or '').strip() or f"custom_{int(timezone.now().timestamp())}"
        if any(r.get('id') == new_id for r in roles):
            return JsonResponse({'success': False, 'message': 'A role with this id already exists.'}, status=409)
        new_role = {
            'id': new_id, 'name': name,
            'description': (body.get('description') or '').strip(),
            'permissions': body.get('permissions') or {},
            'isCustom': True, 'isProtected': False,
            'created_at': timezone.now().isoformat(),
            'created_by': actor.username,
        }
        roles.append(new_role)
        setting.value = roles
        setting.save(update_fields=['value', 'updated_at'])
        return JsonResponse({'success': True, 'role': new_role}, status=201)

    if request.method == 'DELETE':
        rid = request.GET.get('id') or ''
        if not rid:
            return JsonResponse({'success': False, 'message': 'id query parameter required.'}, status=400)
        before = len(roles)
        roles = [r for r in roles if r.get('id') != rid]
        if len(roles) == before:
            return JsonResponse({'success': False, 'message': 'Role not found.'}, status=404)
        setting.value = roles
        setting.save(update_fields=['value', 'updated_at'])
        return JsonResponse({'success': True, 'remaining': len(roles)})

    return JsonResponse({'success': False, 'message': 'Method not allowed.'}, status=405)
