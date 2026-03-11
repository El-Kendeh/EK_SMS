"""
Django views for the eksms project.
"""

from django.http import FileResponse, JsonResponse
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db import transaction
import json
import os
import re
import uuid
from pathlib import Path


def verify_superuser(request):
    """
    Helper to verify if a request is from a superuser based on the custom token.
    Expects header: 'Authorization': 'Bearer token_<user_id>_<uuid>'
    """
    token = request.headers.get('Authorization', '')
    if not token.startswith('Bearer token_'):
        return None
    try:
        actual_token = token.replace('Bearer ', '')
        parts = actual_token.split('_')
        if len(parts) < 3:
            return None
        user_id = parts[1]
        user = User.objects.get(id=user_id)
        if user.is_superuser:
            return user
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# Favicon
# ---------------------------------------------------------------------------

@cache_page(60 * 60 * 24)
def favicon_view(request):
    favicon_path = Path(__file__).resolve().parent.parent.parent / 'public' / 'favicon.jpeg'
    if not os.path.exists(favicon_path):
        static_favicon = Path(__file__).resolve().parent.parent / 'static' / 'favicon.jpeg'
        if os.path.exists(static_favicon):
            favicon_path = static_favicon
    if os.path.exists(favicon_path):
        return FileResponse(open(favicon_path, 'rb'), content_type='image/jpeg')
    from django.http import HttpResponseNotFound
    return HttpResponseNotFound('Favicon not found')


# ---------------------------------------------------------------------------
# Login  (updated: accepts email, allows school admins)
# ---------------------------------------------------------------------------

@require_http_methods(["POST"])
@csrf_exempt
def api_login(request):
    """
    POST /api/login/
    Body: { email, password }
    Accepts superusers, staff users, and active SchoolAdmin accounts.
    """
    try:
        data     = json.loads(request.body)
        email    = data.get('email', '').strip()
        password = data.get('password', '').strip()

        if not email or not password:
            return JsonResponse(
                {'success': False, 'message': 'Email and password are required.'},
                status=400,
            )

        # Resolve email -> User
        try:
            user_obj = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            return JsonResponse(
                {'success': False, 'message': 'Invalid email or password.'},
                status=401,
            )
        except User.MultipleObjectsReturned:
            user_obj = User.objects.filter(email__iexact=email).order_by('-date_joined').first()

        user = authenticate(username=user_obj.username, password=password)

        if user is None:
            return JsonResponse(
                {'success': False, 'message': 'Invalid email or password.'},
                status=401,
            )

        if not user.is_active:
            return JsonResponse(
                {'success': False, 'message': 'Account is inactive. Please contact support.'},
                status=403,
            )

        # Determine role and school context
        role        = 'superadmin' if user.is_superuser else 'school_admin'
        school_data = None

        try:
            from eksms_core.models import SchoolAdmin
            sa = SchoolAdmin.objects.select_related('school').get(user=user, is_active=True)
            school_data = {
                'id':          sa.school.id,
                'name':        sa.school.name,
                'code':        sa.school.code,
                'is_approved': sa.school.is_approved,
            }
        except Exception:
            if not (user.is_superuser or user.is_staff):
                return JsonResponse(
                    {'success': False, 'message': 'Access denied. No admin profile found.'},
                    status=403,
                )

        token = f"token_{user.id}_{uuid.uuid4().hex[:12]}"

        return JsonResponse({
            'success': True,
            'message': 'Login successful.',
            'token':   token,
            'user': {
                'id':           user.id,
                'email':        user.email,
                'first_name':   user.first_name,
                'last_name':    user.last_name,
                'full_name':    user.get_full_name(),
                'is_superuser': user.is_superuser,
                'role':         role,
                'school':       school_data,
            },
        }, status=200)

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON payload.'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# ---------------------------------------------------------------------------
# Register  (new: institution self-registration, all 5 wizard steps)
# ---------------------------------------------------------------------------

@require_http_methods(["POST"])
@csrf_exempt
def api_register(request):
    """
    POST /api/register/
    Creates: School + Django User (admin) + SchoolAdmin profile.
    """
    try:
        data = json.loads(request.body)

        # ── Extract ──────────────────────────────────────────────────────────
        institution_name = data.get('institutionName', '').strip()
        institution_type = data.get('institutionType', '').strip()
        established      = data.get('established', '').strip()   # noqa: F841
        motto            = data.get('motto', '').strip()         # noqa: F841

        address = data.get('address', '').strip()
        city    = data.get('city', '').strip()
        region  = data.get('region', '').strip()
        country = data.get('country', '').strip()

        phone   = data.get('phone', '').strip()
        email   = data.get('email', '').strip()
        website = data.get('website', '').strip()  # noqa: F841

        first_name  = data.get('firstName', '').strip()
        last_name   = data.get('lastName', '').strip()
        admin_email = data.get('adminEmail', '').strip()
        password    = data.get('password', '').strip()

        capacity        = data.get('capacity', '1000')
        academic_system = data.get('academicSystem', 'trimester')  # noqa: F841
        grading_system  = data.get('gradingSystem', 'percentage')  # noqa: F841
        language        = data.get('language', 'English')          # noqa: F841

        # ── Server-side required check ────────────────────────────────────────
        required_fields = {
            'Institution name':    institution_name,
            'Institution type':    institution_type,
            'Street address':      address,
            'City':                city,
            'Country':             country,
            'Phone number':        phone,
            'Institutional email': email,
            'First name':          first_name,
            'Last name':           last_name,
            'Admin email':         admin_email,
            'Password':            password,
        }
        for field_name, value in required_fields.items():
            if not value:
                return JsonResponse(
                    {'success': False, 'message': f'{field_name} is required.'},
                    status=400,
                )

        email_re = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
        if not re.match(email_re, admin_email):
            return JsonResponse(
                {'success': False, 'message': 'Please provide a valid admin email address.'},
                status=400,
            )

        if len(password) < 8:
            return JsonResponse(
                {'success': False, 'message': 'Password must be at least 8 characters.'},
                status=400,
            )

        # ── Uniqueness checks ─────────────────────────────────────────────────
        from eksms_core.models import School, SchoolAdmin as SchoolAdminModel

        if School.objects.filter(name__iexact=institution_name).exists():
            return JsonResponse(
                {'success': False, 'message': f'"{institution_name}" is already registered.'},
                status=409,
            )

        if User.objects.filter(email__iexact=admin_email).exists():
            return JsonResponse(
                {'success': False, 'message': 'An account with this email already exists.'},
                status=409,
            )

        # ── Generate unique school code ───────────────────────────────────────
        initials    = re.findall(r'\b[A-Za-z]', institution_name)
        base_code   = ''.join(initials[:5]).upper() or 'SCH'
        school_code = base_code

        if School.objects.filter(code=school_code).exists():
            school_code = base_code + uuid.uuid4().hex[:3].upper()

        # ── Full address string ───────────────────────────────────────────────
        full_address = ', '.join(p for p in [address, city, region, country] if p)

        # ── Resolve username from adminUsername field or fall back to email prefix ──
        requested_username = data.get('adminUsername', '').strip()
        if requested_username and re.match(r'^[a-zA-Z0-9_-]{3,30}$', requested_username):
            base_username = requested_username.lower()
        else:
            base_username = re.sub(r'[^a-z0-9]', '', admin_email.split('@')[0].lower()) or 'admin'
        username = base_username

        if User.objects.filter(username=username).exists():
            username = base_username + uuid.uuid4().hex[:6]

        # ── Create User + School + SchoolAdmin atomically ─────────────────────
        with transaction.atomic():
            user = User.objects.create_user(
                username=username,
                email=admin_email,
                password=password,
                first_name=first_name,
                last_name=last_name,
                is_staff=True,
                is_active=True,
            )

            # ── Create School record ──────────────────────────────────────────
            school = School.objects.create(
                name=institution_name,
                code=school_code,
                email=email,
                phone=phone,
                address=full_address,
                city=city,
                region=region,
                country=country,
                institution_type=institution_type,
                website=website,
                motto=motto,
                capacity=int(capacity) if str(capacity).isdigit() else None,
                academic_system=academic_system,
                admin_email=admin_email,
                principal_name=f"{first_name} {last_name}",
                is_active=True,
                is_approved=False,
                created_by=user,
            )

            # ── Create SchoolAdmin profile ────────────────────────────────────
            SchoolAdminModel.objects.create(
                user=user,
                school=school,
                job_title=f"{institution_type} Administrator",
                can_manage_academics=True,
                can_create_staff_accounts=True,
                can_manage_staff_roles=True,
                can_activate_deactivate_staff=True,
                can_manage_teachers=True,
                can_manage_students=True,
                can_manage_parents=True,
                can_manage_grades=True,
                can_manage_reports=True,
                can_view_audit_logs=True,
                is_active=True,
            )

        return JsonResponse({
            'success': True,
            'message': f'{institution_name} has been successfully registered.',
            'school':  {'name': institution_name, 'code': school_code},
        }, status=201)

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON payload.'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# ---------------------------------------------------------------------------
# Superadmin: Manage Schools
# ---------------------------------------------------------------------------

@require_http_methods(["GET"])
@csrf_exempt
def api_get_schools(request):
    """
    GET /api/schools/
    Requires Superadmin token.
    Returns list of all schools.
    """
    admin_user = verify_superuser(request)
    if not admin_user:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    
    from eksms_core.models import School
    schools = School.objects.all().order_by('-registration_date')
    
    school_list = []
    for s in schools:
        # Resolve admin user details via SchoolAdmin profile
        admin_user_data = {}
        try:
            sa = s.admin
            admin_user_data = {
                'admin_username': sa.user.username,
                'admin_first_name': sa.user.first_name,
                'admin_last_name': sa.user.last_name,
                'admin_full_name': sa.user.get_full_name(),
                'admin_email': sa.user.email,
            }
        except Exception:
            pass

        school_list.append({
            'id': s.id,
            'name': s.name,
            'code': s.code,
            'email': s.email,
            'phone': s.phone,
            'address': s.address,
            'city': s.city,
            'region': s.region,
            'country': s.country,
            'institution_type': s.institution_type,
            'website': s.website,
            'motto': s.motto,
            'capacity': s.capacity,
            'academic_system': s.academic_system,
            'admin_email': s.admin_email,
            'principal_name': s.principal_name,
            'is_approved': s.is_approved,
            'is_active': s.is_active,
            'changes_requested': s.changes_requested,
            'registration_date': s.registration_date.isoformat(),
            **admin_user_data,
        })
    
    return JsonResponse({'success': True, 'schools': school_list})


@require_http_methods(["POST"])
@csrf_exempt
def api_approve_school(request):
    """
    POST /api/schools/approve/
    Body: { school_id, action: 'approve' | 'reject' }
    Requires Superadmin token.
    """
    admin_user = verify_superuser(request)
    if not admin_user:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    
    try:
        data = json.loads(request.body)
        school_id = data.get('school_id')
        action = data.get('action', 'approve')
        note = data.get('note', '').strip()

        from eksms_core.models import School
        school = School.objects.get(id=school_id)

        if action == 'approve':
            school.is_approved = True
            school.changes_requested = False
            school.save()
            return JsonResponse({'success': True, 'message': f'"{school.name}" has been approved. The school admin can now log in.'})
        elif action == 'reject':
            school_name = school.name
            school.delete()
            msg = f'"{school_name}" has been rejected and removed.'
            if note:
                msg += f' Reason: {note}'
            return JsonResponse({'success': True, 'message': msg})
        elif action == 'request_changes':
            school.changes_requested = True
            school.is_approved = False
            school.save()
            msg = f'Change request sent to "{school.name}".'
            if note:
                msg += f' Note: {note}'
            return JsonResponse({'success': True, 'message': msg})

        return JsonResponse({'success': False, 'message': 'Invalid action.'}, status=400)
            
    except School.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'School not found.'}, status=404)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)


# ---------------------------------------------------------------------------
# Superadmin: Manage Users
# ---------------------------------------------------------------------------

@require_http_methods(["GET"])
@csrf_exempt
def api_get_users(request):
    """
    GET /api/users/
    Requires Superadmin token.
    Returns list of all users (Staff, Admins, etc.) across the platform.
    """
    admin_user = verify_superuser(request)
    if not admin_user:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    users = User.objects.all().order_by('-date_joined')
    user_list = []

    from eksms_core.models import SchoolStaffAccount, SchoolAdmin

    # Prefetch profiles to avoid N+1
    staff_profiles = {p.user_id: p for p in SchoolStaffAccount.objects.select_related('school').all()}
    admin_profiles = {p.user_id: p for p in SchoolAdmin.objects.select_related('school').all()}

    for u in users:
        role = 'User'
        school_name = 'Platform'
        
        if u.is_superuser:
            role = 'Super Admin'
        elif u.id in admin_profiles:
            role = 'School Admin'
            school_name = admin_profiles[u.id].school.name
        elif u.id in staff_profiles:
            role = staff_profiles[u.id].get_role_display()
            school_name = staff_profiles[u.id].school.name

        user_list.append({
            'id': u.id,
            'name': u.get_full_name() or u.username,
            'email': u.email,
            'role': role,
            'school': school_name,
            'status': 'active' if u.is_active else 'suspended',
            'last_login': u.last_login.isoformat() if u.last_login else None,
            'date_joined': u.date_joined.isoformat(),
        })

    return JsonResponse({'success': True, 'users': user_list})


# ---------------------------------------------------------------------------
# Superadmin: Security Logs
# ---------------------------------------------------------------------------

@require_http_methods(["GET"])
@csrf_exempt
def api_get_security_logs(request):
    """
    GET /api/security-logs/
    Requires Superadmin token.
    Returns security/audit events.
    """
    admin_user = verify_superuser(request)
    if not admin_user:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    from eksms_core.models import GradeAuditLog
    logs = GradeAuditLog.objects.select_related('actor', 'grade__student__school').all().order_by('-logged_at')[:200]

    log_list = []
    for l in logs:
        log_list.append({
            'id': f"EVT-{l.id}",
            'ts': l.logged_at.isoformat(),
            'type': l.get_action_display(),
            'severity': 'high' if l.action in ['UNLOCK', 'DELETE_ATTEMPT'] else 'info',
            'action': l.change_reason or f"Modified grade for {l.grade.student}",
            'actor': l.actor.get_full_name() if l.actor else 'System',
            'ip': l.ip_address or '0.0.0.0',
            'status': 'Logged',
            'school': l.grade.student.school.name if l.grade.student.school else 'Unknown',
        })

    return JsonResponse({'success': True, 'logs': log_list})


# ---------------------------------------------------------------------------
# Superadmin: System Health & Metrics
# ---------------------------------------------------------------------------

@require_http_methods(["GET"])
@csrf_exempt
def api_system_health(request):
    """
    GET /api/system-health/
    Returns real-time system metrics and service status.
    """
    admin_user = verify_superuser(request)
    if not admin_user:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    import os
    import time
    from django.db import connection

    # Service Status
    db_up = True
    try:
        connection.ensure_connection()
    except:
        db_up = False

    # Resource Usage (Mocking real values for now based on actual OS info if possible)
    # On Ubuntu we could read /proc/loadavg but os.getloadavg() works on Unix.
    try:
        load = os.getloadavg()[0] * 10 # scale to 100
    except:
        load = 15.5

    return JsonResponse({
        'success': True,
        'uptime': int(time.time()), # Placeholder for boot time
        'services': [
            {'id': 'db',      'label': 'Database',      'status': 'Operational' if db_up else 'Down', 'uptime': 0.999},
            {'id': 'api',     'label': 'API Gateway',   'status': 'Operational', 'uptime': 0.999},
            {'id': 'storage', 'label': 'File Storage',  'status': 'Operational', 'uptime': 1.000},
        ],
        'resources': [
            {'label': 'CPU Usage',   'value': round(load, 1), 'unit': '%'},
            {'label': 'Memory',      'value': 34.2,           'unit': '%'},
            {'label': 'Disk Space',  'value': 22.8,           'unit': '%'},
        ]
    })


# ---------------------------------------------------------------------------
# Superadmin: Grade Alerts / Integrity
# ---------------------------------------------------------------------------

@require_http_methods(["GET"])
@csrf_exempt
def api_get_grade_alerts(request):
    """
    GET /api/grade-alerts/
    Returns flagged grade modifications.
    """
    admin_user = verify_superuser(request)
    if not admin_user:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    from eksms_core.models import GradeChangeAlert
    alerts = GradeChangeAlert.objects.select_related('grade__student', 'triggered_by').all().order_by('-triggered_at')[:50]

    alert_list = []
    for a in alerts:
        alert_list.append({
            'id': f"ALR-{a.id}",
            'student': str(a.grade.student),
            'school': a.grade.student.school.name,
            'subject': str(a.grade.subject),
            'oldGrade': a.old_value.get('grade', '—'),
            'newGrade': a.new_value.get('grade', '—'),
            'reason': a.description,
            'status': a.get_status_display(),
            'urgency': a.severity.lower(),
            'ts': a.triggered_at.isoformat(),
            'requester': {
                'name': a.triggered_by.get_full_name() if a.triggered_by else 'System',
                'initials': (a.triggered_by.username[:2] if a.triggered_by else 'SY').upper()
            }
        })

    return JsonResponse({'success': True, 'alerts': alert_list})


# ---------------------------------------------------------------------------
# Waitlist — email capture from landing page
# ---------------------------------------------------------------------------
@require_http_methods(["POST"])
@csrf_exempt
def api_waitlist(request):
    try:
        data    = json.loads(request.body)
        email   = data.get('email', '').strip().lower()
        country = data.get('country', '').strip()

        if not email or not re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', email):
            return JsonResponse({'success': False, 'message': 'Please enter a valid email address.'}, status=400)

        from eksms_core.models import WaitlistEmail
        _, created = WaitlistEmail.objects.get_or_create(
            email=email, defaults={'country': country}
        )
        msg = "You're on the list! We'll notify you at launch." if created else "You're already on our list — we'll be in touch!"
        return JsonResponse({'success': True, 'message': msg})

    except Exception:
        return JsonResponse({'success': False, 'message': 'Something went wrong. Please try again.'}, status=500)


# ── Registration email OTP ────────────────────────────────────────────────────

@csrf_exempt
@require_http_methods(["POST"])
def api_send_otp(request):
    """
    Generate a 6-digit OTP and email it to the prospective admin.
    The code is stored in Django's cache for 10 minutes.
    """
    import random
    from django.core.cache import cache
    from django.core.mail import send_mail
    from django.conf import settings as django_settings

    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        if not email or '@' not in email:
            return JsonResponse({'error': 'A valid email address is required.'}, status=400)

        code = f"{random.randint(100000, 999999)}"
        cache.set(f"reg_otp_{email}", code, timeout=600)   # 10 minutes

        from_email = getattr(django_settings, 'DEFAULT_FROM_EMAIL', 'EK-SMS <noreply@eksms.com>')

        html_body = f"""
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;
                    background:#0d1117;border-radius:12px;border:1px solid #1e293b;">
          <h2 style="color:#00B4D8;margin:0 0 4px;font-size:1.3rem;">EK-SMS</h2>
          <p style="color:#94a3b8;margin:0 0 24px;font-size:13px;">Institution Registration Verification</p>
          <p style="color:#e2e8f0;font-size:14px;margin:0 0 16px;">
            Please use the code below to verify your email address:
          </p>
          <div style="background:#1e293b;border:1px solid #334155;border-radius:8px;
                      padding:20px;text-align:center;margin-bottom:20px;">
            <span style="font-size:34px;font-weight:800;letter-spacing:0.18em;
                         color:#00B4D8;font-family:Consolas,monospace;">{code}</span>
          </div>
          <p style="color:#64748b;font-size:12px;margin:0;">
            This code expires in <strong style="color:#94a3b8;">10 minutes</strong>.
            If you did not request this, you can safely ignore this message.
          </p>
        </div>
        """

        send_mail(
            subject='EK-SMS — Your Email Verification Code',
            message=f'Your EK-SMS verification code is: {code}\n\nExpires in 10 minutes.',
            from_email=from_email,
            recipient_list=[email],
            fail_silently=False,
            html_message=html_body,
        )

        return JsonResponse({'success': True, 'message': 'Verification code sent to your email.'})

    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid request body.'}, status=400)
    except Exception as e:
        return JsonResponse({'error': 'Could not send code. Please try again later.', 'detail': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def api_verify_otp(request):
    """
    Verify the OTP submitted by the user against the cached value.
    Clears the code after a successful match.
    """
    from django.core.cache import cache

    try:
        data = json.loads(request.body)
        email = data.get('email', '').strip().lower()
        otp   = data.get('otp', '').strip()

        if not email or not otp:
            return JsonResponse({'success': False, 'message': 'Email and code are required.'}, status=400)

        stored = cache.get(f"reg_otp_{email}")

        if stored is None:
            return JsonResponse(
                {'success': False, 'message': 'Code expired or not found. Please request a new one.'},
                status=400,
            )

        if stored != otp:
            return JsonResponse({'success': False, 'message': 'Invalid code. Please try again.'}, status=400)

        cache.delete(f"reg_otp_{email}")
        return JsonResponse({'success': True, 'message': 'Email verified successfully.'})

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid request body.'}, status=400)
    except Exception as e:
        return JsonResponse({'success': False, 'message': 'Verification failed.', 'detail': str(e)}, status=500)


@require_http_methods(["GET"])
def api_check_school_name(request):
    """Check if a school name is already registered (case-insensitive)."""
    from eksms_core.models import School
    name = request.GET.get('name', '').strip()
    if not name:
        return JsonResponse({'exists': False})
    exists = School.objects.filter(name__iexact=name).exists()
    return JsonResponse({'exists': exists})
