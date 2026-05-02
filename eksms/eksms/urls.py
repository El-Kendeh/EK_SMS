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
    api_school_profile_full,
    api_students, api_student_detail, api_student_next_admission, api_student_check_duplicate,
    api_teachers, api_teacher_detail, api_teacher_assignments,
    api_parent_students,
    api_classes,  api_class_detail, api_classes_bulk_create,
    api_subjects, api_subject_detail,
    api_academic_years,
    # New school-admin modules
    api_terms, api_term_detail, api_academic_year_detail,
    api_grades,
    api_attendance, api_attendance_stats,
    api_finance_stats, api_finance_fees, api_finance_fee_detail, api_finance_expenses,
    api_school_messages,
    # Add-ons
    api_analytics,
    api_exams, api_exam_detail, api_exam_results,
    api_notifications, api_notification_read,
    api_timetable, api_timetable_generate, api_timetable_slot,
    api_parents,
    api_fee_receipt,
    api_finance_users, api_finance_user_toggle,
    api_principal_users, api_principal_user_toggle,
    api_staff_accounts, api_staff_account_detail,
    api_student_stats,
    api_teacher_stats,
    # Teacher portal
    api_teacher_me, api_teacher_classes, api_teacher_students,
    api_teacher_attendance, api_teacher_gradebook, api_teacher_change_password,
    api_teacher_analytics,
    # Teacher add-ons
    api_teacher_assignments_teacher, api_teacher_assignment_item,
    api_teacher_exam_list_teacher, api_teacher_exam_results_entry,
    api_teacher_announcements,
    api_teacher_attendance_status,
    api_teacher_student_grade_history, api_teacher_student_report_cards,
    # Student portal
    api_student_me, api_student_grades, api_student_attendance,
    api_student_timetable, api_student_notifications, api_student_change_password,
    # New: grade locking, audit, mod requests, parent portal, report cards, class subjects
    api_teacher_grade_lock, api_teacher_grade_history, api_student_grade_history,
    api_teacher_mod_requests, api_school_mod_requests, api_school_mod_review,
    api_parent_profile, api_parent_children, api_parent_child_grades,
    api_parent_child_report_cards, api_parent_notifications, api_parent_notification_prefs,
    api_student_report_cards, api_report_card_generate,
    api_student_grades_summary, api_report_card_download, api_student_2fa_setup,
    api_class_subjects,
    api_change_password_strong,
    api_logout_all,
    verify_grade_document,
    # New: rooms, grading scheme, grade oversight, student promotion, exam officers
    api_rooms, api_room_detail,
    api_grading_scheme,
    api_grade_entry_status,
    api_promote_student,
    api_exam_officers,
    # Global teacher assignments (school-wide)
    api_teacher_assignments_global,
    api_teacher_assignment_delete,
    # Close term, transcript, bulk import
    api_close_term,
    api_student_transcript,
    api_bulk_import,
    # Batch promotion, transcript download, academic year archive
    api_promote_students_batch,
    api_student_transcript_download,
    api_archive_academic_year,
    # Student ↔ Parent linking
    api_student_parents,
    api_student_parent_detail,
)
from .views_syllabus import api_syllabus_upload, api_syllabus_list
from .views_extras import (
    api_resend_credentials,
    api_student_change_username,
    api_live_classes, api_live_class_detail,
    api_ai_document_capture, api_ai_capture_list,
    api_principal_overview, api_principal_grade_approvals, api_principal_report_cards,
    api_teacher_credentials,
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
    path('api/school/info/',                    api_school_profile_full,      name='api_school_info'),
    path('api/school/update/',                  api_school_profile_full,      name='api_school_update'),
    path('api/school/students/next-admission-number/', api_student_next_admission,    name='api_student_next_admission'),
    path('api/school/students/check-duplicate/',       api_student_check_duplicate, name='api_student_check_duplicate'),
    path('api/school/students/',                api_students,         name='api_students'),
    path('api/school/students/<int:student_id>/', api_student_detail, name='api_student_detail'),
    path('api/school/students/<int:student_id>/parents/', api_student_parents, name='api_student_parents'),
    path('api/school/students/<int:student_id>/parents/<int:parent_id>/', api_student_parent_detail, name='api_student_parent_detail'),
    path('api/parent/students/',                 api_parent_students,  name='api_parent_students'),
    path('api/school/teachers/',                api_teachers,         name='api_teachers'),
    path('api/school/teachers/<int:teacher_id>/', api_teacher_detail, name='api_teacher_detail'),
    path('api/school/teachers/<int:teacher_id>/assignments/', api_teacher_assignments, name='api_teacher_assignments'),
    path('api/school/classes/',                 api_classes,          name='api_classes'),
    path('api/school/classes/bulk-create/',     api_classes_bulk_create, name='api_classes_bulk_create'),
    path('api/school/classes/<int:class_id>/',  api_class_detail,     name='api_class_detail'),
    path('api/school/subjects/',                api_subjects,         name='api_subjects'),
    path('api/school/subjects/<int:subject_id>/', api_subject_detail, name='api_subject_detail'),
    path('api/school/academic-years/',                    api_academic_years,        name='api_academic_years'),
    path('api/school/academic-years/<int:year_id>/',      api_academic_year_detail,  name='api_academic_year_detail'),
    path('api/school/syllabus/upload/', api_syllabus_upload, name='api_syllabus_upload'),
    path('api/school/syllabus/', api_syllabus_list, name='api_syllabus_list'),
    # Terms / Grades / Attendance
    path('api/school/terms/',                   api_terms,            name='api_terms'),
    path('api/school/terms/<int:term_id>/',     api_term_detail,      name='api_term_detail'),
    path('api/school/grades/',                  api_grades,           name='api_grades'),
    path('api/school/attendance/',              api_attendance,       name='api_attendance'),
    path('api/school/attendance/stats/',        api_attendance_stats, name='api_attendance_stats'),
    # Finance
    path('api/school/finance/stats/',           api_finance_stats,    name='api_finance_stats'),
    path('api/school/finance/fees/',            api_finance_fees,     name='api_finance_fees'),
    path('api/school/finance/fees/<int:fee_id>/', api_finance_fee_detail, name='api_finance_fee_detail'),
    path('api/school/finance/expenses/',        api_finance_expenses, name='api_finance_expenses'),
    # Messages
    path('api/school/messages/',                api_school_messages,  name='api_school_messages'),
    # Analytics
    path('api/school/analytics/',               api_analytics,        name='api_analytics'),
    # Exams
    path('api/school/exams/',                   api_exams,            name='api_exams'),
    path('api/school/exams/<int:exam_id>/',     api_exam_detail,      name='api_exam_detail'),
    path('api/school/exams/<int:exam_id>/results/', api_exam_results,  name='api_exam_results'),
    # Notifications
    path('api/school/notifications/',           api_notifications,    name='api_notifications'),
    path('api/school/notifications/<int:notif_id>/read/', api_notification_read, name='api_notification_read'),
    # Timetable
    path('api/school/timetable/',               api_timetable,        name='api_timetable'),
    path('api/school/timetable/generate/',      api_timetable_generate, name='api_timetable_generate'),
    path('api/school/timetable/<int:slot_id>/', api_timetable_slot,   name='api_timetable_slot'),
    # Parents
    path('api/school/parents/',                 api_parents,          name='api_parents'),
    # Fee receipt
    path('api/school/finance/fees/<int:fee_id>/receipt/', api_fee_receipt, name='api_fee_receipt'),
    # Finance users (school admin creates finance staff)
    path('api/school/finance-users/',           api_finance_users,        name='api_finance_users'),
    path('api/school/finance-users/<int:uid>/', api_finance_user_toggle,  name='api_finance_user_toggle'),
    # Principal users (school admin creates principal accounts)
    path('api/school/principal-users/',           api_principal_users,        name='api_principal_users'),
    path('api/school/principal-users/<int:uid>/', api_principal_user_toggle,  name='api_principal_user_toggle'),
    # Unified staff accounts (Registrar, Librarian, Counselor, Admin Staff, etc.)
    path('api/school/staff/',                     api_staff_accounts,       name='api_staff_accounts'),
    path('api/school/staff/<int:staff_id>/',      api_staff_account_detail, name='api_staff_account_detail'),
    # Student module stats
    path('api/school/student-stats/',             api_student_stats,          name='api_student_stats'),
    # Teacher module stats
    path('api/school/teacher-stats/',             api_teacher_stats,          name='api_teacher_stats'),
    # Teacher portal (teacher-facing endpoints)
    path('api/teacher/me/',              api_teacher_me,              name='api_teacher_me'),
    path('api/teacher/classes/',         api_teacher_classes,         name='api_teacher_classes'),
    path('api/teacher/students/',        api_teacher_students,        name='api_teacher_students'),
    path('api/teacher/attendance/',      api_teacher_attendance,      name='api_teacher_attendance'),
    path('api/teacher/attendance/status/', api_teacher_attendance_status, name='api_teacher_attendance_status'),
    path('api/teacher/gradebook/',       api_teacher_gradebook,       name='api_teacher_gradebook'),
    path('api/teacher/change-password/', api_teacher_change_password, name='api_teacher_change_password'),
    path('api/teacher/analytics/',       api_teacher_analytics,       name='api_teacher_analytics'),
    # Teacher add-on routes
    path('api/teacher/assignments/',                              api_teacher_assignments_teacher,  name='api_teacher_assignments_teacher'),
    path('api/teacher/assignments/<int:exam_id>/',                api_teacher_assignment_item,      name='api_teacher_assignment_item'),
    path('api/teacher/exam-list/',                                api_teacher_exam_list_teacher,    name='api_teacher_exam_list_teacher'),
    path('api/teacher/exams/<int:exam_id>/results/',              api_teacher_exam_results_entry,   name='api_teacher_exam_results_entry'),
    path('api/teacher/announcements/',                            api_teacher_announcements,         name='api_teacher_announcements'),
    path('api/teacher/students/<int:student_id>/grades/',         api_teacher_student_grade_history, name='api_teacher_student_grade_history'),
    path('api/teacher/students/<int:student_id>/report-cards/',   api_teacher_student_report_cards,  name='api_teacher_student_report_cards'),
    # Student portal
    path('api/student/me/',              api_student_me,              name='api_student_me'),
    path('api/student/grades/',          api_student_grades,          name='api_student_grades'),
    path('api/student/attendance/',      api_student_attendance,      name='api_student_attendance'),
    path('api/student/timetable/',       api_student_timetable,       name='api_student_timetable'),
    path('api/student/notifications/',   api_student_notifications,   name='api_student_notifications'),
    path('api/student/change-password/', api_student_change_password, name='api_student_change_password'),
    # Grade locking
    path('api/teacher/grades/lock/',                  api_teacher_grade_lock,   name='api_teacher_grade_lock'),
    path('api/teacher/grades/<int:grade_id>/history/', api_teacher_grade_history, name='api_teacher_grade_history'),
    path('api/student/grades/<int:grade_id>/history/', api_student_grade_history, name='api_student_grade_history'),
    # Grade modification requests
    path('api/teacher/modification-requests/',         api_teacher_mod_requests, name='api_teacher_mod_requests'),
    path('api/school/modification-requests/',          api_school_mod_requests,  name='api_school_mod_requests'),
    path('api/school/modification-requests/review/',   api_school_mod_review,    name='api_school_mod_review'),
    # Parent portal
    path('api/parent/profile/',                              api_parent_profile,           name='api_parent_profile'),
    path('api/parent/children/',                             api_parent_children,          name='api_parent_children'),
    path('api/parent/children/<int:student_id>/grades/',     api_parent_child_grades,      name='api_parent_child_grades'),
    path('api/parent/children/<int:student_id>/report-cards/', api_parent_child_report_cards, name='api_parent_child_report_cards'),
    path('api/parent/notifications/',                        api_parent_notifications,        name='api_parent_notifications'),
    path('api/parent/notification-preferences/',             api_parent_notification_prefs,   name='api_parent_notification_prefs'),
    # Student grades summary (classRank, average, subjectsPassed)
    path('api/student/grades/summary/',                      api_student_grades_summary,   name='api_student_grades_summary'),
    # Student report cards
    path('api/student/report-cards/',                        api_student_report_cards,     name='api_student_report_cards'),
    # Report card download (HTML + embedded QR)
    path('api/report-cards/<int:card_id>/download/',         api_report_card_download,     name='api_report_card_download'),
    # Report card generation (school admin)
    path('api/school/report-cards/generate/',                api_report_card_generate,     name='api_report_card_generate'),
    # Student 2FA setup
    path('api/student/2fa/setup/',                           api_student_2fa_setup,        name='api_student_2fa_setup'),
    # Class subjects (school admin)
    path('api/school/class-subjects/',                       api_class_subjects,           name='api_class_subjects'),
    # Shared strong password change
    path('api/change-password-strong/',                      api_change_password_strong,   name='api_change_password_strong'),
    # Logout all sessions
    path('api/logout-all/',                                  api_logout_all,               name='api_logout_all'),
    # Rooms
    path('api/school/rooms/',                               api_rooms,              name='api_rooms'),
    path('api/school/rooms/<int:room_id>/',                 api_room_detail,        name='api_room_detail'),
    # Grading scheme
    path('api/school/grading-scheme/',                      api_grading_scheme,     name='api_grading_scheme'),
    # Grade entry oversight
    path('api/school/grade-entry-status/',                  api_grade_entry_status, name='api_grade_entry_status'),
    # Student promotion / transfer
    path('api/school/students/<int:student_id>/promote/',   api_promote_student,    name='api_promote_student'),
    # Examination officer assignment
    path('api/school/exam-officers/',                       api_exam_officers,      name='api_exam_officers'),
    # Global teacher assignments
    path('api/school/teacher-assignments/',                            api_teacher_assignments_global, name='api_teacher_assignments_global'),
    path('api/school/teacher-assignments/<int:assignment_id>/',        api_teacher_assignment_delete,  name='api_teacher_assignment_delete'),
    # Close term / transcript / bulk import
    path('api/school/close-term/',                                      api_close_term,                    name='api_close_term'),
    path('api/student/transcript/',                                     api_student_transcript,             name='api_student_transcript'),
    path('api/student/transcript/download/',                            api_student_transcript_download,   name='api_student_transcript_download'),
    path('api/school/bulk-import/',                                     api_bulk_import,                   name='api_bulk_import'),
    path('api/school/students/promote-batch/',                          api_promote_students_batch,        name='api_promote_students_batch'),
    path('api/school/academic-years/<int:year_id>/archive/',            api_archive_academic_year,         name='api_archive_academic_year'),
    # Public document verification
    path('verify/<str:token>/',                              verify_grade_document,        name='verify_grade_document'),

    # ── New for testing-team feedback round ─────────────────────────────────
    # Credentials reset (school admin → user)
    path('api/school/users/resend-credentials/', api_resend_credentials,
         name='api_resend_credentials'),
    # Student username self-edit
    path('api/student/change-username/', api_student_change_username,
         name='api_student_change_username'),
    # Live classes
    path('api/live-classes/',                api_live_classes,        name='api_live_classes'),
    path('api/live-classes/<int:lc_id>/',    api_live_class_detail,   name='api_live_class_detail'),
    # AI document capture
    path('api/school/ai-capture/',           api_ai_document_capture, name='api_ai_document_capture'),
    path('api/school/ai-capture/list/',      api_ai_capture_list,     name='api_ai_capture_list'),
    # Principal dashboard
    path('api/principal/overview/',          api_principal_overview,        name='api_principal_overview'),
    path('api/principal/grade-approvals/',   api_principal_grade_approvals, name='api_principal_grade_approvals'),
    path('api/principal/report-cards/',      api_principal_report_cards,    name='api_principal_report_cards'),
    # Teacher extended credentials
    path('api/teacher/credentials/',         api_teacher_credentials, name='api_teacher_credentials'),

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

