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
    Expects JSON payload with 'username' and 'password'.
    Returns user token and role if successful.
    """
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return JsonResponse({
                'success': False,
                'message': 'Username and password are required.'
            }, status=400)
        
        # Authenticate user
        user = authenticate(username=username, password=password)
        
        if user is None:
            return JsonResponse({
                'success': False,
                'message': 'Invalid username or password.'
            }, status=401)
        
        # Check if user is superuser/staff
        if not user.is_staff and not user.is_superuser:
            return JsonResponse({
                'success': False,
                'message': 'Only admin users can login.'
            }, status=403)
        
        # Generate a simple token (in production, use Django REST Framework Token or JWT)
        from django.contrib.auth.models import User
        token = f"token_{user.id}_{user.username}"
        
        return JsonResponse({
            'success': True,
            'message': 'Login successful.',
            'token': token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_superuser': user.is_superuser,
                'is_staff': user.is_staff
            },
            'redirect': '/dashboard' if user.is_superuser else '/admin/'
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


# Placeholders for missing views to prevent import errors in urls.py
@csrf_exempt
def api_register(request):
    return JsonResponse({'success': False, 'message': 'Register endpoint placeholder'}, status=501)

def api_get_schools(request):
    return JsonResponse({'success': True, 'schools': []}, status=200)

@csrf_exempt
def api_approve_school(request):
    return JsonResponse({'success': False, 'message': 'Approve endpoint placeholder'}, status=501)

@csrf_exempt
def api_waitlist(request):
    return JsonResponse({'success': False, 'message': 'Waitlist endpoint placeholder'}, status=501)

@csrf_exempt
def api_send_otp(request):
    return JsonResponse({'success': True, 'message': 'OTP sent (placeholder)'}, status=200)

@csrf_exempt
def api_verify_otp(request):
    return JsonResponse({'success': False, 'message': 'OTP verification placeholder'}, status=501)

def api_check_school_name(request):
    return JsonResponse({'available': True}, status=200)

def api_get_users(request):
    return JsonResponse({'success': True, 'users': []}, status=200)

def api_get_security_logs(request):
    return JsonResponse({'success': True, 'logs': []}, status=200)

def api_system_health(request):
    return JsonResponse({'status': 'healthy', 'version': '1.0.0'}, status=200)

def api_get_grade_alerts(request):
    return JsonResponse({'success': True, 'alerts': []}, status=200)
