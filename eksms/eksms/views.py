"""
Django views for the eksms project.
"""

from django.http import FileResponse, JsonResponse
from django.views.decorators.cache import cache_page
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
import json
import os
import re
import uuid
from pathlib import Path


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
                'id':   sa.school.id,
                'name': sa.school.name,
                'code': sa.school.code,
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

        # ── Create Django user ────────────────────────────────────────────────
        base_username = re.sub(r'[^a-z0-9]', '', admin_email.split('@')[0].lower()) or 'admin'
        username      = base_username

        if User.objects.filter(username=username).exists():
            username = base_username + uuid.uuid4().hex[:6]

        user = User.objects.create_user(
            username=username,
            email=admin_email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            is_staff=True,
            is_active=True,
        )

        # ── Create School record ──────────────────────────────────────────────
        school = School.objects.create(
            name=institution_name,
            code=school_code,
            email=email,
            phone=phone,
            address=full_address,
            principal_name=f"{first_name} {last_name}",
            is_active=True,
            created_by=user,
        )

        # ── Create SchoolAdmin profile ────────────────────────────────────────
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
