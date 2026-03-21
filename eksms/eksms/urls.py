"""
URL configuration for eksms project with security considerations.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path
from django.views.generic import RedirectView
from django.views.defaults import page_not_found, server_error
from .views import (
    favicon_view, api_login, api_register, api_get_schools, 
    api_approve_school, api_waitlist, api_send_otp, api_resend_otp,
    api_verify_otp, api_check_school_name, api_get_users, api_get_security_logs,
    api_system_health, api_get_grade_alerts, api_receive_logs, api_csp_report
)
from .secure_views import csrf_token_view
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Favicon
    path('favicon.jpeg', favicon_view, name='favicon'),
    
    # API endpoints
    path('api/login/',    api_login,    name='api_login'),
    path('api/logout/',   api_logout,   name='api_logout'),
    path('api/register/', api_register, name='api_register'),
    path('api/schools/', api_get_schools, name='api_get_schools'),
    path('api/schools/approve/', api_approve_school, name='api_approve_school'),
    path('api/users/',           api_get_users,         name='api_get_users'),
    path('api/security-logs/',   api_get_security_logs, name='api_get_security_logs'),
    path('api/system-health/',   api_system_health,     name='api_system_health'),
    path('api/grade-alerts/',    api_get_grade_alerts,  name='api_get_grade_alerts'),
    path('api/waitlist/',        api_waitlist,        name='api_waitlist'),
    path('api/send-otp/',        api_send_otp,        name='api_send_otp'),
    path('api/resend-otp/',      api_resend_otp,      name='api_resend_otp'),
    path('api/verify-otp/',      api_verify_otp,      name='api_verify_otp'),
    path('api/check-school-name/', api_check_school_name, name='api_check_school_name'),
    path('api/logs/',            api_receive_logs,      name='api_receive_logs'),
    path('api/csp-report/',      api_csp_report,        name='api_csp_report'),
    path('api/csrf-token/',      csrf_token_view,       name='csrf_token_view'),
    
    # Root URL redirects to admin
    path('', RedirectView.as_view(url='admin/', permanent=False)),
    
    # Admin interface
    path('admin/', admin.site.urls),
]

# Custom error handlers for better security (don't expose stack traces in production)
handler404 = page_not_found
handler500 = server_error

# Security configuration for admin site
admin.site.site_header = "SMS Administration"
admin.site.site_title = "SMS Admin"
admin.site.index_title = "Welcome to SMS Administration"

# Serve media files (student passport uploads) during development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

