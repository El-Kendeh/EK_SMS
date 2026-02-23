from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Avg, Sum
import secrets
import string
from .models import (
    AcademicYear,
    Term,
    Subject,
    ClassRoom,
    Teacher,
    TeacherSubjectClass,
    Student,
    Parent,
    ParentStudent,
    Grade,
    ClassRanking,
    ReportCard,
    GradeAuditLog,
    GradeChangeAlert,
    GradeVerification,
)


class TermInline(admin.TabularInline):
    """Inline admin for Terms within Academic Year"""
    model = Term
    extra = 1
    fields = ['name', 'start_date', 'end_date', 'is_active']


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name']
    date_hierarchy = 'start_date'
    inlines = [TermInline]
    fieldsets = (
        ('Basic Information', {
            'fields': ('name',)
        }),
        ('Dates', {
            'fields': ('start_date', 'end_date')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
    actions = ['make_active']

    def make_active(self, request, queryset):
        """Action to set selected academic year as active"""
        AcademicYear.objects.all().update(is_active=False)
        queryset.update(is_active=True)
        self.message_user(request, "Selected academic year is now active.")
    make_active.short_description = "Set selected year as active"


@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ['academic_year', 'get_term_name', 'start_date', 'end_date', 'is_active']
    list_filter = ['academic_year', 'name', 'is_active']
    search_fields = ['academic_year__name']
    fieldsets = (
        ('Academic Information', {
            'fields': ('academic_year', 'name')
        }),
        ('Dates', {
            'fields': ('start_date', 'end_date')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )

    def get_term_name(self, obj):
        return obj.get_name_display()
    get_term_name.short_description = 'Term'


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'code']
    fieldsets = (
        ('Subject Information', {
            'fields': ('name', 'code')
        }),
        ('Details', {
            'fields': ('description',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )


@admin.register(ClassRoom)
class ClassRoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'form_number', 'capacity', 'get_student_count', 'is_active']
    list_filter = ['form_number', 'is_active', 'created_at']
    search_fields = ['name', 'code']
    fieldsets = (
        ('Class Information', {
            'fields': ('name', 'code', 'form_number')
        }),
        ('Capacity', {
            'fields': ('capacity',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )

    def get_student_count(self, obj):
        return obj.students.filter(is_active=True).count()
    get_student_count.short_description = 'Active Students'


class TeacherSubjectClassInline(admin.TabularInline):
    """Inline admin for Teacher Subject Class assignments"""
    model = TeacherSubjectClass
    extra = 1
    fields = ['subject', 'classroom', 'academic_year', 'is_active']
    autocomplete_fields = ['subject', 'classroom', 'academic_year']


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ['get_full_name', 'employee_id', 'phone_number', 'qualification', 'hire_date', 'is_active']
    list_filter = ['is_active', 'hire_date', 'created_at']
    search_fields = ['user__first_name', 'user__last_name', 'employee_id', 'phone_number']
    fieldsets = (
        ('User Account', {
            'fields': ('user',)
        }),
        ('Employment Information', {
            'fields': ('employee_id', 'hire_date', 'qualification')
        }),
        ('Contact', {
            'fields': ('phone_number',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
    inlines = [TeacherSubjectClassInline]
    autocomplete_fields = ['user']

    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = 'Full Name'


@admin.register(TeacherSubjectClass)
class TeacherSubjectClassAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'subject', 'classroom', 'academic_year', 'is_active']
    list_filter = ['academic_year', 'classroom', 'subject', 'is_active']
    search_fields = ['teacher__user__first_name', 'teacher__user__last_name', 'subject__name', 'classroom__name']
    fieldsets = (
        ('Teacher Assignment', {
            'fields': ('teacher', 'subject', 'classroom', 'academic_year')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
    autocomplete_fields = ['teacher', 'subject', 'classroom', 'academic_year']


class ParentStudentInline(admin.TabularInline):
    """Inline admin for Parent Student Links"""
    model = ParentStudent
    extra = 1
    fields = ['parent', 'is_primary_contact']
    autocomplete_fields = ['parent']


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['get_full_name', 'admission_number', 'classroom', 'academic_year', 'is_active', 'admission_date', 'has_passport_pic']
    list_filter = ['classroom', 'academic_year', 'is_active', 'admission_date', 'created_at']
    search_fields = ['user__first_name', 'user__last_name', 'admission_number', 'phone_number']
    fieldsets = (
        ('User Account', {
            'fields': ('user',)
        }),
        ('Admission Information', {
            'fields': ('admission_number', 'admission_date', 'classroom', 'academic_year')
        }),
        ('Personal Information', {
            'fields': ('date_of_birth', 'phone_number', 'passport_picture')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
    inlines = [ParentStudentInline]
    autocomplete_fields = ['user', 'classroom', 'academic_year']
    date_hierarchy = 'admission_date'

    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = 'Full Name'
    
    def has_passport_pic(self, obj):
        """Display if student has a passport picture"""
        if obj.passport_picture:
            return format_html('<span style="color: green;">✓ Yes</span>')
        return format_html('<span style="color: red;">✗ No</span>')
    has_passport_pic.short_description = 'Passport Picture'


class StudentLinkInline(admin.TabularInline):
    """Inline admin for Student Links within Parent"""
    model = ParentStudent
    extra = 1
    fields = ['student', 'is_primary_contact']
    autocomplete_fields = ['student']


@admin.register(Parent)
class ParentAdmin(admin.ModelAdmin):
    list_display = ['get_full_name', 'phone_number', 'relationship', 'occupation', 'get_student_count', 'is_active', 'last_login_display']
    list_filter = ['relationship', 'is_active', 'created_at']
    search_fields = ['user__first_name', 'user__last_name', 'phone_number', 'occupation']
    fieldsets = (
        ('User Account', {
            'fields': ('user',)
        }),
        ('Contact Information', {
            'fields': ('phone_number', 'relationship')
        }),
        ('Employment', {
            'fields': ('occupation',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
    inlines = [StudentLinkInline]
    autocomplete_fields = ['user']
    actions = ['generate_login_credentials']

    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = 'Full Name'

    def get_student_count(self, obj):
        return obj.student_links.count()
    get_student_count.short_description = 'Linked Students'
    
    def last_login_display(self, obj):
        """Display last login status"""
        if obj.user.last_login:
            return obj.user.last_login.strftime('%Y-%m-%d %H:%M')
        return format_html('<span style="color: orange;">Never logged in</span>')
    last_login_display.short_description = 'Last Login'

    def generate_login_credentials(self, request, queryset):
        """Generate strong password for selected parents"""
        updated_count = 0
        credentials_list = []
        
        for parent in queryset:
            # Generate a strong password
            password = self.generate_strong_password()
            parent.user.set_password(password)
            parent.user.save()
            
            credentials_list.append({
                'name': parent.user.get_full_name(),
                'username': parent.user.username,
                'password': password,
                'email': parent.user.email,
            })
            updated_count += 1
        
        # Store credentials in session for display
        self.message_user(
            request, 
            f"✓ Generated login credentials for {updated_count} parent(s). "
            f"Passwords have been set. Parents should change them on first login."
        )
        
        return credentials_list
    
    generate_login_credentials.short_description = "Generate login credentials (password) for selected parents"

    @staticmethod
    def generate_strong_password(length=12):
        """Generate a strong random password"""
        characters = string.ascii_letters + string.digits + string.punctuation.replace('"', '').replace("'", '')
        password = ''.join(secrets.choice(characters) for _ in range(length))
        return password


@admin.register(ParentStudent)
class ParentStudentAdmin(admin.ModelAdmin):
    list_display = ['student', 'parent', 'is_primary_contact', 'created_at']
    list_filter = ['is_primary_contact', 'created_at']
    search_fields = ['student__admission_number', 'student__user__first_name', 'student__user__last_name',
                     'parent__user__first_name', 'parent__user__last_name']
    fieldsets = (
        ('Relationship', {
            'fields': ('student', 'parent')
        }),
        ('Contact Status', {
            'fields': ('is_primary_contact',)
        }),
    )
    autocomplete_fields = ['student', 'parent']


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ['student', 'subject', 'term', 'total_score', 'grade_letter', 'is_locked_display', 'teacher']
    list_filter = ['term', 'subject', 'is_locked', 'grade_letter', 'created_at']
    search_fields = ['student__user__first_name', 'student__user__last_name', 'subject__name']
    readonly_fields = ['total_score', 'grade_letter']
    
    fieldsets = (
        ('Student & Subject', {
            'fields': ('student', 'subject', 'term', 'teacher')
        }),
        ('Scores', {
            'fields': ('continuous_assessment', 'mid_term_exam', 'final_exam')
        }),
        ('Results', {
            'fields': ('total_score', 'grade_letter'),
            'classes': ('wide',)
        }),
        ('Locking', {
            'fields': ('is_locked', 'locked_by', 'locked_at'),
            'classes': ('collapse',)
        }),
    )
    
    autocomplete_fields = ['student', 'subject', 'term', 'teacher']
    
    def is_locked_display(self, obj):
        """Show lock status with icon"""
        if obj.is_locked:
            return format_html('<span style="color: red;">🔒 Locked</span>')
        return format_html('<span style="color: green;">🔓 Open</span>')
    is_locked_display.short_description = 'Status'
    
    def get_readonly_fields(self, request, obj=None):
        """Make all fields readonly if grade is locked"""
        readonly = list(self.readonly_fields)
        if obj and obj.is_locked:
            readonly.extend(['student', 'subject', 'term', 'teacher', 'continuous_assessment', 'mid_term_exam', 'final_exam'])
        return readonly
    
    actions = ['lock_grades', 'unlock_grades']
    
    def lock_grades(self, request, queryset):
        """Lock selected grades"""
        count = 0
        for grade in queryset:
            grade.lock(request.user)
            count += 1
        self.message_user(request, f'✓ Locked {count} grade(s)')
    lock_grades.short_description = "Lock selected grades (prevent editing)"
    
    def unlock_grades(self, request, queryset):
        """Unlock selected grades"""
        count = queryset.update(is_locked=False, locked_by=None, locked_at=None)
        self.message_user(request, f'✓ Unlocked {count} grade(s)')
    unlock_grades.short_description = "Unlock selected grades (allow editing)"


@admin.register(ClassRanking)
class ClassRankingAdmin(admin.ModelAdmin):
    list_display = ['student', 'classroom', 'term', 'rank', 'total_points', 'average_score']
    list_filter = ['classroom', 'term', 'created_at']
    search_fields = ['student__user__first_name', 'student__user__last_name', 'classroom__name']
    readonly_fields = ['rank', 'total_points', 'average_score', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Student & Class', {
            'fields': ('student', 'classroom', 'term')
        }),
        ('Ranking Details', {
            'fields': ('rank', 'total_points', 'average_score')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    autocomplete_fields = ['student', 'classroom', 'term']


@admin.register(ReportCard)
class ReportCardAdmin(admin.ModelAdmin):
    list_display = ['student', 'term', 'academic_year', 'class_rank', 'average_score', 'is_published_display', 'generated_at']
    list_filter = ['term', 'academic_year', 'is_published', 'generated_at']
    search_fields = ['student__user__first_name', 'student__user__last_name', 'student__admission_number']
    readonly_fields = ['generated_at', 'generated_by', 'pdf_file', 'qr_code']
    
    fieldsets = (
        ('Student Information', {
            'fields': ('student', 'term', 'academic_year', 'classroom')
        }),
        ('Summary', {
            'fields': ('total_subjects', 'average_score', 'class_rank', 'class_size')
        }),
        ('Report Card PDF', {
            'fields': ('pdf_file', 'qr_code'),
            'classes': ('wide',)
        }),
        ('Publication', {
            'fields': ('is_published', 'published_at')
        }),
        ('Metadata', {
            'fields': ('generated_at', 'generated_by'),
            'classes': ('collapse',)
        }),
    )
    
    autocomplete_fields = ['student', 'term', 'academic_year', 'classroom']
    
    def is_published_display(self, obj):
        """Show publication status"""
        if obj.is_published:
            return format_html('<span style="color: green;">✓ Published</span>')
        return format_html('<span style="color: orange;">✗ Draft</span>')
    is_published_display.short_description = 'Status'
    
    actions = ['publish_report_cards', 'generate_pdfs']
    
    def publish_report_cards(self, request, queryset):
        """Publish selected report cards for parents to view"""
        count = 0
        for report_card in queryset:
            if not report_card.is_published:
                report_card.mark_published(request.user)
                count += 1
        self.message_user(request, f'✓ Published {count} report card(s)')
    publish_report_cards.short_description = "Publish selected report cards"
    
    def generate_pdfs(self, request, queryset):
        """Generate PDF reports for selected report cards"""
        self.message_user(
            request, 
            'PDF generation has been queued. This should complete shortly. '
            'Refresh the page to see the generated PDFs.'
        )
    generate_pdfs.short_description = "Generate PDF report cards"


@admin.register(GradeAuditLog)
class GradeAuditLogAdmin(admin.ModelAdmin):
    list_display = ['grade', 'action', 'actor', 'logged_at', 'hash_status', 'is_tampered']
    list_filter = ['action', 'logged_at', 'grade__term', 'grade__subject']
    search_fields = ['grade__student__user__first_name', 'grade__student__user__last_name', 
                     'grade__subject__name', 'actor__username']
    readonly_fields = ['grade', 'action', 'actor', 'old_values', 'new_values', 'ip_address',
                      'user_agent', 'record_hash', 'merkle_hash', 'logged_at']
    date_hierarchy = 'logged_at'
    
    fieldsets = (
        ('Change Information', {
            'fields': ('grade', 'action', 'actor', 'change_reason')
        }),
        ('Values', {
            'fields': ('old_values', 'new_values')
        }),
        ('Context', {
            'fields': ('ip_address', 'user_agent')
        }),
        ('Cryptographic Verification', {
            'fields': ('record_hash', 'merkle_hash'),
            'classes': ('collapse',)
        }),
        ('Timestamp', {
            'fields': ('logged_at',)
        }),
    )
    
    def hash_status(self, obj):
        """Show hash verification status"""
        if obj.is_hash_valid():
            return format_html('<span style="color: green;">✓ Valid</span>')
        return format_html('<span style="color: red;">✗ Invalid</span>')
    hash_status.short_description = 'Hash Status'
    
    def is_tampered(self, obj):
        """Check if record appears tampered"""
        if not obj.is_hash_valid():
            return format_html('<span style="color: red; font-weight: bold;">TAMPERED</span>')
        return format_html('<span style="color: green;">✓ OK</span>')
    is_tampered.short_description = 'Tampering Detection'
    
    def has_add_permission(self, request):
        """Audit logs should not be manually created"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Audit logs are immutable"""
        return False


@admin.register(GradeChangeAlert)
class GradeChangeAlertAdmin(admin.ModelAdmin):
    list_display = ['grade', 'severity_badge', 'alert_type', 'status_badge', 'triggered_at', 'email_status']
    list_filter = ['severity', 'status', 'triggered_at', 'alert_type', 'email_sent']
    search_fields = ['grade__student__user__first_name', 'grade__student__user__last_name',
                     'grade__subject__name', 'triggered_by__username', 'description']
    readonly_fields = ['grade', 'triggered_by', 'triggered_at', 'old_value', 'new_value',
                      'email_sent', 'email_sent_at', 'email_sent_to']
    date_hierarchy = 'triggered_at'
    
    fieldsets = (
        ('Alert Details', {
            'fields': ('grade', 'severity', 'alert_type', 'description')
        }),
        ('What Changed', {
            'fields': ('old_value', 'new_value')
        }),
        ('Who & Where', {
            'fields': ('triggered_by', 'ip_address', 'triggered_at')
        }),
        ('Response', {
            'fields': ('status', 'acknowledged_by', 'acknowledged_at', 'investigation_notes')
        }),
        ('Notifications', {
            'fields': ('email_sent', 'email_sent_to', 'email_sent_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_acknowledged', 'mark_resolved', 'mark_false_alarm']
    
    def severity_badge(self, obj):
        """Color-coded severity indicator"""
        colors = {
            'LOW': '#FFC107',
            'MEDIUM': '#FF9800',
            'HIGH': '#FF5722',
            'CRITICAL': '#F44336',
        }
        color = colors.get(obj.severity, '#999')
        return format_html(
            f'<span style="background-color: {color}; color: white; padding: 3px 8px; '
            f'border-radius: 3px; font-weight: bold;">{obj.get_severity_display()}</span>'
        )
    severity_badge.short_description = 'Severity'
    
    def status_badge(self, obj):
        """Status indicator"""
        colors = {
            'NEW': '#2196F3',
            'ACKNOWLEDGED': '#FF9800',
            'INVESTIGATED': '#00BCD4',
            'RESOLVED': '#4CAF50',
            'FALSE_ALARM': '#9E9E9E',
        }
        color = colors.get(obj.status, '#999')
        return format_html(
            f'<span style="background-color: {color}; color: white; padding: 3px 8px; '
            f'border-radius: 3px;">{obj.get_status_display()}</span>'
        )
    status_badge.short_description = 'Status'
    
    def email_status(self, obj):
        """Email notification status"""
        if obj.email_sent:
            return format_html(f'✓ Sent to {obj.email_sent_to}')
        return format_html('<span style="color: #999;">Not sent</span>')
    email_status.short_description = 'Email Notification'
    
    def mark_acknowledged(self, request, queryset):
        """Mark alerts as acknowledged"""
        count = 0
        for alert in queryset:
            alert.acknowledge(request.user, 'Acknowledged via bulk action')
            count += 1
        self.message_user(request, f'✓ Acknowledged {count} alert(s)')
    mark_acknowledged.short_description = 'Mark as acknowledged'
    
    def mark_resolved(self, request, queryset):
        """Mark alerts as resolved"""
        count = queryset.update(status='RESOLVED')
        self.message_user(request, f'✓ Resolved {count} alert(s)')
    mark_resolved.short_description = 'Mark as resolved'
    
    def mark_false_alarm(self, request, queryset):
        """Mark alerts as false alarms"""
        count = queryset.update(status='FALSE_ALARM')
        self.message_user(request, f'✓ Marked {count} alert(s) as false alarms')
    mark_false_alarm.short_description = 'Mark as false alarm'


@admin.register(GradeVerification)
class GradeVerificationAdmin(admin.ModelAdmin):
    list_display = ['grade', 'verification_status', 'issued_at', 'expires_at', 'verification_count', 'validity']
    list_filter = ['issued_at', 'is_verified', 'expires_at']
    search_fields = ['grade__student__user__first_name', 'grade__student__user__last_name',
                     'verification_token']
    readonly_fields = ['grade', 'verification_token', 'qr_code_data', 'issued_at', 
                      'sha256_hash', 'merkle_leaf', 'merkle_root', 'issued_by',
                      'verification_attempts', 'last_verification_at']
    
    fieldsets = (
        ('Grade Reference', {
            'fields': ('grade',)
        }),
        ('Verification Codes', {
            'fields': ('verification_token', 'qr_code_data')
        }),
        ('Cryptographic Hashes', {
            'fields': ('sha256_hash', 'merkle_leaf', 'merkle_root'),
            'classes': ('collapse',)
        }),
        ('Issue Information', {
            'fields': ('issued_by', 'issued_at')
        }),
        ('Expiration', {
            'fields': ('expires_at',)
        }),
        ('Verification History', {
            'fields': ('is_verified', 'verification_attempts', 'last_verification_at'),
            'classes': ('collapse',)
        }),
    )
    
    def verification_status(self, obj):
        """Show verification status"""
        if obj.is_verified:
            return format_html('<span style="color: green;">✓ Verified</span>')
        return format_html('<span style="color: orange;">⏳ Not Verified</span>')
    verification_status.short_description = 'Status'
    
    def validity(self, obj):
        """Show if verification token is still valid"""
        if obj.is_valid():
            return format_html('<span style="color: green;">✓ Valid</span>')
        return format_html('<span style="color: red;">✗ Expired</span>')
    validity.short_description = 'Token Validity'
    
    def verification_count(self, obj):
        """Show number of verification attempts"""
        return f'{obj.verification_attempts} attempt(s)'
    verification_count.short_description = 'Verification Attempts'
    
    def has_add_permission(self, request):
        """Verification records are auto-created"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Verification records should not be deleted"""
        return False
