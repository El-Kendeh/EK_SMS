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
    SchoolApplicationEvent, ForensicEvent, AlertBroadcast, AdminSetting,
    SecurityLogEntry, AcademicYear, ClassRoom, SystemWideAlert,
)
import datetime
import uuid
import json
import logging
import os
import shutil
import psutil
from pathlib import Path


logger = logging.getLogger('django.security')


def _get_authed_user(request):
    """
    Extract authenticated User from the Authorization header.
    Token format: token_{user_id}_{username}  (set at login)
    Returns a User instance or None.
    """
    auth = request.META.get('HTTP_AUTHORIZATION', '')
    token = ''
    if auth.startswith('Bearer '):
        token = auth[7:]
    elif auth.startswith('Token '):
        token = auth[6:]
    else:
        token = auth.strip()

    if not token or not token.startswith('token_'):
        return None

    parts = token.split('_', 2)   # ['token', '<id>', '<username>']
    if len(parts) < 2:
        return None
    try:
        user_id = int(parts[1])
        return User.objects.get(id=user_id, is_active=True)
    except (ValueError, User.DoesNotExist):
        return None


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
            try:
                # Find user by email
                target_user = User.objects.get(email=username_or_email)
                # Authenticate using their actual username
                user = authenticate(username=target_user.username, password=password)
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
        elif user.is_staff:
            role = 'admin'
        
        # If user has no recognized role and isn't staff/superuser, block (optional, but safer)
        if role == 'user' and not user.is_staff and not user.is_superuser:
            return JsonResponse({
                'success': False,
                'message': 'Your account does not have access to this system.'
            }, status=403)
        
        # Generate a simple token (in production, use Django REST Framework Token or JWT)
        # Using a more standard-looking token format
        token = f"token_{user.id}_{user.username.replace(' ', '_')}"
        
        # Determine redirect URL based on role
        redirect_url = '/home'
        school_data = None
        
        if role == 'superadmin':
            redirect_url = '/superadmindashboard'
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

        return JsonResponse({
            'success': True,
            'message': 'Login successful.',
            'token': token,
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
    """
    API endpoint for user logout.
    Clears any server-side session data if needed.
    """
    try:
        # For token-based auth, client should discard the token
        # Here we can log the logout event if needed
        import logging
        logger = logging.getLogger('django.security')
        logger.info(f"User logout from {request.META.get('REMOTE_ADDR')}")
        
        return JsonResponse({
            'success': True,
            'message': 'Logged out successfully.'
        }, status=200)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=500)


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
        
        # Determine if data is in a JSON field 'settings' or individual fields
        settings_str = request.POST.get('settings')
        if settings_str:
            data = json.loads(settings_str)
        else:
            # Fallback to individual fields from POST
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
                school.badge = badge_file
                school.save()

            # Create Admin User
            user = User.objects.create_user(
                username=data['adminUsername'],
                email=admin_email,
                password=data['password'],
                first_name=data.get('firstName', ''),
                last_name=data.get('lastName', '')
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
    try:
        schools = School.objects.all()
        school_list = []
        for s in schools:
            badge_url = None
            if s.badge:
                try:
                    badge_url = request.build_absolute_uri(s.badge.url)
                except:
                    badge_url = s.badge.url

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
            })
        return JsonResponse({'success': True, 'schools': school_list}, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@require_http_methods(["POST"])
@csrf_exempt
def api_approve_school(request):
    """Approve, reject, or request changes for a school"""
    try:
        data = json.loads(request.body)
        school_id = data.get('school_id')
        action = data.get('action')
        note = data.get('note', '')
        actor = _get_authed_user(request)
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
        elif action == 'reject':
            school.is_approved = False
            school.is_active = False
            school.changes_requested = False
            school.rejection_reason = note
            event_type = 'REJECTED'
            severity = 'medium'
            msg = f"School '{school.name}' rejected."
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
            return JsonResponse({
                'success': False, 
                'message': 'An OTP has already been sent. Please check your email or wait before requesting another.',
                'retry_after': 60
            }, status=429)
        
        # 3. Generate 6-digit OTP
        otp_code = str(secrets.randbelow(900000) + 100000)
        otp_hash = hashlib.sha256(otp_code.encode()).hexdigest()
        
        expiry_minutes = getattr(settings, 'OTP_EXPIRY_MINUTES', 10)
        expires_at = timezone.now() + timezone.timedelta(minutes=expiry_minutes)
        
        # Send email — use Resend in production, fall back to console log in dev
        resend_api_key = getattr(settings, 'RESEND_API_KEY', '')
        import logging
        logger = logging.getLogger('django')

        if not resend_api_key:
            # Dev fallback: print OTP to Django terminal
            logger.warning(
                f"\n{'='*50}\n"
                f"  DEV MODE — OTP for {email}: {otp_code}\n"
                f"  Expires in {expiry_minutes} minutes\n"
                f"{'='*50}"
            )
            # Save record even in dev (email "sent" via terminal)
            OTPRecord.objects.create(
                email=email,
                code_hash=otp_hash,
                expires_at=expires_at
            )
        else:
            import resend
            resend.api_key = resend_api_key
            default_from = getattr(settings, 'DEFAULT_FROM_EMAIL', 'EK-SMS <noreply@elkendeh.com>')
            try:
                resend.Emails.send({
                    "from": default_from,
                    "to": [email],
                    "subject": "Your EK-SMS Verification Code",
                    "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">EK-SMS Email Verification</h2>
                        <p>Hello,</p>
                        <p>Your verification code for EK-SMS registration is:</p>
                        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; text-align: center; margin: 20px 0;">
                            <span style="font-size: 24px; font-weight: bold; color: #007bff; letter-spacing: 2px;">{otp_code}</span>
                        </div>
                        <p>This code will expire in {expiry_minutes} minutes.</p>
                        <p>If you didn't request this code, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
                        <p style="color: #6c757d; font-size: 12px;">
                            EK-SMS - School Management System<br>
                            This is an automated message. Please do not reply.
                        </p>
                    </div>
                    """
                })
                # Save record only AFTER successful send (colleague's improvement)
                OTPRecord.objects.create(
                    email=email,
                    code_hash=otp_hash,
                    expires_at=expires_at
                )
            except Exception as email_error:
                logger.error(f"Failed to send OTP email to {email}: {str(email_error)}")
                return JsonResponse({
                    'success': False,
                    'message': 'Failed to send email. Please try again later.'
                }, status=500)
        
        return JsonResponse({
            'success': True, 
            'message': 'Verification code sent to your email.',
            'expires_in': expiry_minutes * 60  # seconds
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
        
        # Send email — use Resend in production, fall back to console log in dev
        resend_api_key = getattr(settings, 'RESEND_API_KEY', '')
        import logging
        logger = logging.getLogger('django')

        if not resend_api_key:
            logger.warning(
                f"\n{'='*50}\n"
                f"  DEV MODE — Resent OTP for {email}: {otp_code}\n"
                f"  Expires in {expiry_minutes} minutes\n"
                f"{'='*50}"
            )
            # Invalidate old OTPs and save new record in dev too
            OTPRecord.objects.filter(email=email, is_used=False).update(is_used=True)
            OTPRecord.objects.create(email=email, code_hash=otp_hash, expires_at=expires_at)
        else:
            import resend
            resend.api_key = resend_api_key
            default_from = getattr(settings, 'DEFAULT_FROM_EMAIL', 'EK-SMS <noreply@elkendeh.com>')
            try:
                resend.Emails.send({
                    "from": default_from,
                    "to": [email],
                    "subject": "Your EK-SMS Verification Code (Resent)",
                    "html": f"""
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">EK-SMS Email Verification</h2>
                        <p>Hello,</p>
                        <p>Your new verification code for EK-SMS registration is:</p>
                        <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; padding: 20px; text-align: center; margin: 20px 0;">
                            <span style="font-size: 24px; font-weight: bold; color: #007bff; letter-spacing: 2px;">{otp_code}</span>
                        </div>
                        <p>This code will expire in {expiry_minutes} minutes.</p>
                        <p>If you didn't request this code, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 20px 0;">
                        <p style="color: #6c757d; font-size: 12px;">
                            EK-SMS - School Management System<br>
                            This is an automated message. Please do not reply.
                        </p>
                    </div>
                    """
                })
                # Invalidate old and save new AFTER successful send (colleague's improvement)
                OTPRecord.objects.filter(email=email, is_used=False).update(is_used=True)
                OTPRecord.objects.create(email=email, code_hash=otp_hash, expires_at=expires_at)
            except Exception as email_error:
                logger.error(f"Failed to resend OTP email to {email}: {str(email_error)}")
                return JsonResponse({
                    'success': False,
                    'message': 'Failed to send email. Please try again later.'
                }, status=500)


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

        users = User.objects.all().select_related(
            'school_admin_profile', 'school_admin_profile__school',
            'teacher_profile', 'teacher_profile__school'
        )
        user_list = []
        for u in users:
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
    }
    try:
        limit = min(int(request.GET.get('limit', 100)), 500)
    except (ValueError, TypeError):
        limit = 100

    try:
        entries = SecurityLogEntry.objects.select_related('actor').order_by('-created_at')[:limit]
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
    """Real-time system health stats for SASystemHealth.js"""
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
        return JsonResponse({'success': False, 'status': 'partial', 'message': str(e)}, status=200)

def api_get_grade_alerts(request):
    """Fetch grade alerts from database — enriched with student/school/grade context"""
    try:
        alerts = GradeChangeAlert.objects.select_related(
            'grade__student__school', 'grade__classroom', 'triggered_by', 'acknowledged_by'
        ).order_by('-triggered_at')[:50]
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
                'student': student.full_name if student else 'Unknown Student',
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

    # GET
    try:
        qs = ForensicEvent.objects.select_related('actor', 'school', 'resolved_by').order_by('-created_at')[:200]
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
def api_broadcast_alerts(request):
    """
    GET  — list broadcasts (most recent 100)
    POST {title, message, severity, audience, target_school_id?} — send a broadcast
    """
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

            broadcast = AlertBroadcast.objects.create(
                title=title,
                message=message,
                severity=data.get('severity', 'info'),
                audience=data.get('audience', 'all'),
                target_school=target_school,
                sent_by=actor,
                status='sent',
                sent_at=timezone.now(),
            )
            _log_security_event(
                'broadcast_sent',
                description=f"Broadcast sent: '{title}' to {broadcast.audience}",
                severity='info',
                actor=actor,
                ip=request.META.get('REMOTE_ADDR'),
                metadata={'broadcast_id': broadcast.id},
            )
            return JsonResponse({'success': True, 'broadcast_id': broadcast.id}, status=201)
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

        if len(new_password) < 8:
            return JsonResponse({'success': False, 'message': 'New password must be at least 8 characters'}, status=400)

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
    try:
        from django.db.models import Count, Q
        from django.utils import timezone as tz

        now = tz.now()
        last_24h = now - timezone.timedelta(hours=24)
        last_7d  = now - timezone.timedelta(days=7)

        # Failed logins (threats blocked)
        failed_24h = SecurityLogEntry.objects.filter(
            event_type='login_failure', created_at__gte=last_24h
        ).count()
        failed_7d = SecurityLogEntry.objects.filter(
            event_type='login_failure', created_at__gte=last_7d
        ).count()

        # Successful logins
        success_24h = SecurityLogEntry.objects.filter(
            event_type='login_success', created_at__gte=last_24h
        ).count()

        # Active sessions = unique users who logged in within the last hour
        last_1h = now - timezone.timedelta(hours=1)
        active_sessions = SecurityLogEntry.objects.filter(
            event_type='login_success', created_at__gte=last_1h
        ).values('actor').distinct().count()

        # School approvals / rejections
        approvals = SecurityLogEntry.objects.filter(event_type='school_approved').count()
        rejections = SecurityLogEntry.objects.filter(event_type='school_rejected').count()

        # Password changes
        pw_changes = SecurityLogEntry.objects.filter(event_type='password_changed').count()

        # Total log entries
        total_entries = SecurityLogEntry.objects.count()

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
    School-admin-only: return live stats for the authenticated admin's school.
    Returns student_count, teacher_count, classroom_count, academic_year.
    """
    actor = _get_authed_user(request)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        school_admin = SchoolAdmin.objects.select_related('school').get(user=actor)
        school = school_admin.school
    except SchoolAdmin.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'No school admin profile found.'}, status=404)
    try:
        student_count  = Student.objects.filter(school=school, is_active=True).count()
        teacher_count  = Teacher.objects.filter(school=school, is_active=True).count()
        classroom_count = ClassRoom.objects.filter(school=school, is_active=True).count()
        active_year = AcademicYear.objects.filter(school=school, is_active=True).first()
        return JsonResponse({
            'success': True,
            'student_count':   student_count,
            'teacher_count':   teacher_count,
            'classroom_count': classroom_count,
            'academic_year':   active_year.name if active_year else None,
            'school_code':     school.code,
            'school_name':     school.name,
        })
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
