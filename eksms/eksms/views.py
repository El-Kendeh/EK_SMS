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
from eksms_core.models import School, SchoolAdmin, GradeChangeAlert
import json
import logging
import os
import shutil
import psutil
from pathlib import Path


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

        if not school_id or not action:
            return JsonResponse({'success': False, 'message': 'Missing data'}, status=400)

        school = School.objects.get(id=school_id)
        
        if action == 'approve':
            school.is_approved = True
            school.is_active = True
            school.changes_requested = False
            msg = f"School '{school.name}' approved successfully."
        elif action == 'reject':
            school.is_approved = False
            school.is_active = False
            school.changes_requested = False
            msg = f"School '{school.name}' rejected."
        elif action == 'request_changes':
            school.is_approved = False
            school.changes_requested = True
            msg = f"Changes requested for '{school.name}'."
        else:
            return JsonResponse({'success': False, 'message': 'Invalid action'}, status=400)

        school.save()
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
    return JsonResponse({'success': True, 'message': 'OTP sent (placeholder demo)'}, status=200)

@require_http_methods(["POST"])
@csrf_exempt
def api_verify_otp(request):
    return JsonResponse({'success': True, 'message': 'OTP verified (placeholder demo)'}, status=200)

def api_check_school_name(request):
    name = request.GET.get('name', '')
    exists = School.objects.filter(name__iexact=name).exists()
    return JsonResponse({'available': not exists}, status=200)

def api_get_users(request):
    """Fetch user summary for superadmin with detailed role/school mapping"""
    try:
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

            # Mock data for dashboard visualization
            user_list.append({
                'id': u.id,
                'username': u.username,
                'name': f"{u.first_name} {u.last_name}".strip() or u.username,
                'email': u.email,
                'role': role,
                'school': school_name,
                'status': 'active' if u.is_active else 'suspended',
                'riskLevel': 'low' if u.id % 5 != 0 else 'medium',
                'riskScore': (u.id * 13) % 40 + 5,
                'failedAttempts': (u.id * 7) % 4,
                'successLogins': (u.id * 23) % 200 + 10,
                'twoFAEnabled': u.id % 3 != 0,
                'last_login': u.last_login.isoformat() if u.last_login else None,
                'date_joined': u.date_joined.isoformat(),
            })
        return JsonResponse({'success': True, 'users': user_list}, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

def api_get_security_logs(request):
    """Fetch mock security logs for dashboard visualization"""
    # In a real app, this might pull from a model or a specialized log aggregator
    logs = [
        {'id': 1, 'event': 'Failed Login Attempt', 'user': 'admin_test', 'ip': '192.168.1.45', 'time': timezone.now().isoformat(), 'severity': 'high'},
        {'id': 2, 'event': 'Successful Superadmin Login', 'user': 'superadmin', 'ip': '10.0.0.5', 'time': timezone.now().isoformat(), 'severity': 'low'},
        {'id': 3, 'event': 'School Approval', 'user': 'superadmin', 'ip': '10.0.0.5', 'time': timezone.now().isoformat(), 'severity': 'info'},
    ]
    return JsonResponse({'success': True, 'logs': logs}, status=200)

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
    """Fetch grade alerts from database"""
    try:
        alerts = GradeChangeAlert.objects.all()[:50] # Limit to 50
        alert_list = []
        for a in alerts:
            alert_list.append({
                'id': a.id,
                'severity': a.severity,
                'alert_type': a.alert_type,
                'description': a.description,
                'status': a.status,
                'triggered_at': a.triggered_at.isoformat(),
            })
        return JsonResponse({'success': True, 'alerts': alert_list}, status=200)
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)
