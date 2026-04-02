"""
URL configuration for eksms project with security considerations.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path
from django.views.generic import RedirectView, TemplateView
from django.views.defaults import page_not_found, server_error
from .views import (
    favicon_view, api_login, api_logout, api_register, api_get_schools,
    api_approve_school, api_waitlist, api_send_otp, api_resend_otp,
    api_verify_otp, api_check_school_name, api_get_users, api_get_security_logs,
    api_system_health, api_get_grade_alerts, api_receive_logs, api_csp_report,
    # New endpoints
    api_school_events, api_grade_stats, api_school_stats,
    api_forensic_events, api_broadcast_alerts, api_permissions,
    api_profile, api_change_password, api_admin_settings, api_security_counters,
    api_impersonate,
    api_sa_stats,
    api_system_alerts,
    # School-admin CRUD
    api_school_info,
    api_students, api_student_detail,
    api_teachers, api_teacher_detail,
    api_classes,  api_class_detail,
    api_subjects, api_subject_detail,
    api_academic_years,
)
from .secure_views import csrf_token_view
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Favicon & SEO
    path('favicon.jpeg', favicon_view, name='favicon'),
    path('favicon.ico',  favicon_view), # Fallback for browsers
    path('robots.txt',   TemplateView.as_view(template_name="robots.txt", content_type="text/plain")),
    
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
    # New endpoints
    path('api/school-events/',      api_school_events,      name='api_school_events'),
    path('api/grade-stats/',        api_grade_stats,        name='api_grade_stats'),
    path('api/school-stats/',       api_school_stats,       name='api_school_stats'),
    path('api/forensic-events/',    api_forensic_events,    name='api_forensic_events'),
    path('api/broadcast-alerts/',   api_broadcast_alerts,   name='api_broadcast_alerts'),
    path('api/permissions/',        api_permissions,        name='api_permissions'),
    path('api/profile/',            api_profile,            name='api_profile'),
    path('api/change-password/',    api_change_password,    name='api_change_password'),
    path('api/admin-settings/',     api_admin_settings,     name='api_admin_settings'),
    path('api/security-counters/',  api_security_counters,  name='api_security_counters'),
    path('api/impersonate/',        api_impersonate,        name='api_impersonate'),
    path('api/sa-stats/',          api_sa_stats,           name='api_sa_stats'),
    path('api/system-alerts/',     api_system_alerts,      name='api_system_alerts'),
    # School-admin CRUD
    path('api/school/info/',                    api_school_info,      name='api_school_info'),
    path('api/school/update/',                  api_school_info,      name='api_school_update'),
    path('api/school/students/',                api_students,         name='api_students'),
    path('api/school/students/<int:student_id>/', api_student_detail, name='api_student_detail'),
    path('api/school/teachers/',                api_teachers,         name='api_teachers'),
    path('api/school/teachers/<int:teacher_id>/', api_teacher_detail, name='api_teacher_detail'),
    path('api/school/classes/',                 api_classes,          name='api_classes'),
    path('api/school/classes/<int:class_id>/',  api_class_detail,     name='api_class_detail'),
    path('api/school/subjects/',                api_subjects,         name='api_subjects'),
    path('api/school/subjects/<int:subject_id>/', api_subject_detail, name='api_subject_detail'),
    path('api/school/academic-years/',          api_academic_years,   name='api_academic_years'),

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

# Serve media files
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

