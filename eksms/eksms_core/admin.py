from django.contrib import admin
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from django.utils.html import format_html
from django.urls import reverse
from django.db.models import Count, Avg, Sum
from django.http import HttpResponseForbidden
import secrets
import string
from .models import (
    School,
    SchoolAdmin,
    SchoolStaffAccount,
    StaffAccountAuditLog,
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


class SuperAdminRequiredMixin:
    """Mixin to ensure only super admins can access this admin"""
    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser and super().has_view_permission(request, obj)
    
    def has_add_permission(self, request):
        return request.user.is_superuser and super().has_add_permission(request)
    
    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser and super().has_change_permission(request, obj)
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser and super().has_delete_permission(request, obj)


class SchoolFilterMixin:
    """Mixin to filter data by school for school admins"""
    
    def get_school_for_user(self, user):
        """Get the school associated with a school admin user"""
        if user.is_superuser:
            return None  # Super admins see all schools
        
        try:
            school_admin = user.school_admin_profile
            return school_admin.school
        except:
            return None
    
    def get_queryset(self, request):
        """Filter queryset based on user's school"""
        qs = super().get_queryset(request)
        
        if request.user.is_superuser:
            return qs
        
        # Get school admin's school
        school = self.get_school_for_user(request.user)
        if school:
            # Filter by school
            if hasattr(qs.model, 'school'):
                return qs.filter(school=school)
        
        return qs
    
    def get_list_display(self, request):
        """Include school in list display for super admins"""
        list_display = list(super().get_list_display(request) if hasattr(super(), 'get_list_display') else self.list_display)
        if request.user.is_superuser and 'school' not in list_display and hasattr(self.model, '_meta') and 'school' in [f.name for f in self.model._meta.get_fields()]:
            list_display.insert(0, 'school')
        return list_display
    
    def get_search_fields(self, request):
        """Add school to search fields for super admins"""
        search_fields = list(super().get_search_fields(request) if hasattr(super(), 'get_search_fields') else self.search_fields)
        if request.user.is_superuser and 'school__name' not in search_fields and hasattr(self.model, '_meta') and 'school' in [f.name for f in self.model._meta.get_fields()]:
            search_fields.append('school__name')
        return search_fields


@admin.register(School)
class SchoolModelAdmin(SuperAdminRequiredMixin, admin.ModelAdmin):
    """Admin for School registration - Only Super Admins"""
    list_display = ['name', 'code', 'email', 'phone', 'principal_name', 'is_active', 'is_approved', 'get_admin_name', 'registration_date']
    list_filter = ['is_active', 'is_approved', 'registration_date', 'created_at']
    search_fields = ['name', 'code', 'email', 'principal_name']
    readonly_fields = ['registration_date', 'created_at', 'updated_at', 'created_by']
    
    fieldsets = (
        ('School Information', {
            'fields': ('name', 'code')
        }),
        ('Contact Details', {
            'fields': ('email', 'phone', 'address')
        }),
        ('Leadership', {
            'fields': ('principal_name',)
        }),
        ('Status', {
            'fields': ('is_active', 'is_approved')
        }),
        ('Audit Information', {
            'fields': ('registration_date', 'created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def save_model(self, request, obj, form, change):
        """Set created_by to current super admin"""
        if not change:  # Only for new schools
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
    
    def get_admin_name(self, obj):
        """Display the school admin assigned to this school"""
        if hasattr(obj, 'admin') and obj.admin:
            return obj.admin.user.get_full_name()
        return format_html('<span style="color: orange;">Not assigned yet</span>')
    get_admin_name.short_description = 'School Admin'


@admin.register(SchoolAdmin)
class SchoolAdminModelAdmin(SuperAdminRequiredMixin, admin.ModelAdmin):
    """Admin for assigning School Admins - Only Super Admins"""
    list_display = ['get_full_name', 'school', 'job_title', 'is_active', 'appointed_date', 'get_permissions_summary']
    list_filter = ['is_active', 'school', 'appointed_date', 'can_manage_teachers', 'can_manage_students', 'can_manage_grades']
    search_fields = ['user__first_name', 'user__last_name', 'school__name', 'job_title']
    readonly_fields = ['appointed_date', 'updated_at']
    
    fieldsets = (
        ('User Account', {
            'fields': ('user', 'school')
        }),
        ('Position Details', {
            'fields': ('job_title',)
        }),
        ('Permissions', {
            'fields': (
                'can_manage_academics',
                'can_manage_teachers',
                'can_manage_students',
                'can_manage_grades',
                'can_manage_reports',
                'can_view_audit_logs'
            ),
            'description': 'Select which modules this school admin can manage'
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Metadata', {
            'fields': ('appointed_date', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    filter_horizontal = ()
    
    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = 'Name'
    
    def get_permissions_summary(self, obj):
        """Show a summary of permissions granted"""
        permissions = []
        if obj.can_manage_academics:
            permissions.append('Academics')
        if obj.can_manage_teachers:
            permissions.append('Teachers')
        if obj.can_manage_students:
            permissions.append('Students')
        if obj.can_manage_grades:
            permissions.append('Grades')
        if obj.can_manage_reports:
            permissions.append('Reports')
        if obj.can_view_audit_logs:
            permissions.append('Audit')
        return ', '.join(permissions) if permissions else 'None'
    get_permissions_summary.short_description = 'Permissions'
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Allow super admins to select any user"""
        if db_field.name == 'user':
            # Filter to only staff users
            kwargs['queryset'] = User.objects.filter(is_staff=True)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class TermInline(admin.TabularInline):
    """Inline admin for Terms within Academic Year"""
    model = Term
    extra = 1
    fields = ['name', 'start_date', 'end_date', 'is_active']


@admin.register(AcademicYear)
class AcademicYearAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['school', 'name', 'start_date', 'end_date', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at', 'school']
    search_fields = ['name', 'school__name']
    date_hierarchy = 'start_date'
    inlines = [TermInline]
    fieldsets = (
        ('School', {
            'fields': ('school',)
        }),
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
        # Check if user has permission
        school = self.get_school_for_user(request.user)
        if not request.user.is_superuser:
            if not hasattr(request.user, 'school_admin_profile') or not request.user.school_admin_profile.can_manage_academics:
                return
            queryset = queryset.filter(school=school)
        
        queryset.update(is_active=True)
        self.message_user(request, "Selected academic year is now active.")
    make_active.short_description = "Set selected year as active"
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter schools for school admins"""
        if db_field.name == 'school' and not request.user.is_superuser:
            school = self.get_school_for_user(request.user)
            if school:
                kwargs['queryset'] = School.objects.filter(id=school.id)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Term)
class TermAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['academic_year', 'get_term_name', 'start_date', 'end_date', 'is_active', 'school']
    list_filter = ['academic_year', 'name', 'is_active', 'academic_year__school']
    search_fields = ['academic_year__name', 'academic_year__school__name']
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
    
    def school(self, obj):
        return obj.academic_year.school
    school.short_description = 'School'
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter academic years by school for school admins"""
        if db_field.name == 'academic_year' and not request.user.is_superuser:
            school = self.get_school_for_user(request.user)
            if school:
                kwargs['queryset'] = AcademicYear.objects.filter(school=school)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Subject)
class SubjectAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['school', 'name', 'code', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at', 'school']
    search_fields = ['name', 'code', 'school__name']
    fieldsets = (
        ('School', {
            'fields': ('school',)
        }),
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
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter schools for school admins"""
        if db_field.name == 'school' and not request.user.is_superuser:
            school = self.get_school_for_user(request.user)
            if school:
                kwargs['queryset'] = School.objects.filter(id=school.id)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(ClassRoom)
class ClassRoomAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['school', 'name', 'code', 'form_number', 'capacity', 'get_student_count', 'is_active']
    list_filter = ['form_number', 'is_active', 'created_at', 'school']
    search_fields = ['name', 'code', 'school__name']
    fieldsets = (
        ('School', {
            'fields': ('school',)
        }),
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
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter schools for school admins"""
        if db_field.name == 'school' and not request.user.is_superuser:
            school = self.get_school_for_user(request.user)
            if school:
                kwargs['queryset'] = School.objects.filter(id=school.id)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class TeacherSubjectClassInline(admin.TabularInline):
    """Inline admin for Teacher Subject Class assignments"""
    model = TeacherSubjectClass
    extra = 1
    fields = ['subject', 'classroom', 'academic_year', 'is_active']
    autocomplete_fields = ['subject', 'classroom', 'academic_year']


@admin.register(Teacher)
class TeacherAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['school', 'get_full_name', 'employee_id', 'phone_number', 'qualification', 'hire_date', 'is_active']
    list_filter = ['is_active', 'hire_date', 'created_at', 'school']
    search_fields = ['user__first_name', 'user__last_name', 'employee_id', 'phone_number', 'school__name']
    fieldsets = (
        ('School', {
            'fields': ('school',)
        }),
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
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter schools for school admins"""
        if db_field.name == 'school' and not request.user.is_superuser:
            school = self.get_school_for_user(request.user)
            if school:
                kwargs['queryset'] = School.objects.filter(id=school.id)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(TeacherSubjectClass)
class TeacherSubjectClassAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['teacher', 'subject', 'classroom', 'academic_year', 'is_active', 'school']
    list_filter = ['academic_year', 'classroom', 'subject', 'is_active', 'teacher__school']
    search_fields = ['teacher__user__first_name', 'teacher__user__last_name', 'subject__name', 'classroom__name', 'teacher__school__name']
    fieldsets = (
        ('Teacher Assignment', {
            'fields': ('teacher', 'subject', 'classroom', 'academic_year')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
    autocomplete_fields = ['teacher', 'subject', 'classroom', 'academic_year']
    
    def school(self, obj):
        return obj.teacher.school
    school.short_description = 'School'
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter by school for school admins"""
        school = self.get_school_for_user(request.user)
        
        if db_field.name == 'teacher' and not request.user.is_superuser and school:
            kwargs['queryset'] = Teacher.objects.filter(school=school)
        elif db_field.name == 'subject' and not request.user.is_superuser and school:
            kwargs['queryset'] = Subject.objects.filter(school=school)
        elif db_field.name == 'classroom' and not request.user.is_superuser and school:
            kwargs['queryset'] = ClassRoom.objects.filter(school=school)
        elif db_field.name == 'academic_year' and not request.user.is_superuser and school:
            kwargs['queryset'] = AcademicYear.objects.filter(school=school)
        
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class ParentStudentInline(admin.TabularInline):
    """Inline admin for Parent Student Links"""
    model = ParentStudent
    extra = 1
    fields = ['parent', 'is_primary_contact']
    autocomplete_fields = ['parent']


@admin.register(Student)
class StudentAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['school', 'get_full_name', 'admission_number', 'classroom', 'academic_year', 'is_active', 'admission_date', 'has_passport_pic']
    list_filter = ['classroom', 'academic_year', 'is_active', 'admission_date', 'created_at', 'school']
    search_fields = ['user__first_name', 'user__last_name', 'admission_number', 'phone_number', 'school__name']
    fieldsets = (
        ('School', {
            'fields': ('school',)
        }),
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
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter by school for school admins"""
        school = self.get_school_for_user(request.user)
        
        if db_field.name == 'school' and not request.user.is_superuser and school:
            kwargs['queryset'] = School.objects.filter(id=school.id)
        elif db_field.name == 'classroom' and not request.user.is_superuser and school:
            kwargs['queryset'] = ClassRoom.objects.filter(school=school)
        elif db_field.name == 'academic_year' and not request.user.is_superuser and school:
            kwargs['queryset'] = AcademicYear.objects.filter(school=school)
        
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


class StudentLinkInline(admin.TabularInline):
    """Inline admin for Student Links within Parent"""
    model = ParentStudent
    extra = 1
    fields = ['student', 'is_primary_contact']
    autocomplete_fields = ['student']


@admin.register(Parent)
class ParentAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['school', 'get_full_name', 'phone_number', 'relationship', 'occupation', 'get_student_count', 'is_active', 'last_login_display']
    list_filter = ['relationship', 'is_active', 'created_at', 'school']
    search_fields = ['user__first_name', 'user__last_name', 'phone_number', 'occupation', 'school__name']
    fieldsets = (
        ('School', {
            'fields': ('school',)
        }),
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
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter schools for school admins"""
        if db_field.name == 'school' and not request.user.is_superuser:
            school = self.get_school_for_user(request.user)
            if school:
                kwargs['queryset'] = School.objects.filter(id=school.id)
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(ParentStudent)
class ParentStudentAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['student', 'parent', 'is_primary_contact', 'school', 'created_at']
    list_filter = ['is_primary_contact', 'created_at', 'student__school']
    search_fields = ['student__admission_number', 'student__user__first_name', 'student__user__last_name',
                     'parent__user__first_name', 'parent__user__last_name', 'student__school__name']
    fieldsets = (
        ('Relationship', {
            'fields': ('student', 'parent')
        }),
        ('Contact Status', {
            'fields': ('is_primary_contact',)
        }),
    )
    autocomplete_fields = ['student', 'parent']
    
    def school(self, obj):
        return obj.student.school
    school.short_description = 'School'
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter by school for school admins"""
        school = self.get_school_for_user(request.user)
        
        if db_field.name == 'student' and not request.user.is_superuser and school:
            kwargs['queryset'] = Student.objects.filter(school=school)
        elif db_field.name == 'parent' and not request.user.is_superuser and school:
            kwargs['queryset'] = Parent.objects.filter(school=school)
        
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(Grade)
class GradeAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['school', 'student', 'subject', 'term', 'total_score', 'grade_letter', 'is_locked_display', 'teacher']
    list_filter = ['term', 'subject', 'is_locked', 'grade_letter', 'created_at', 'student__school']
    search_fields = ['student__user__first_name', 'student__user__last_name', 'subject__name', 'student__school__name']
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
    
    def school(self, obj):
        return obj.student.school
    school.short_description = 'School'
    
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
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter by school for school admins"""
        school = self.get_school_for_user(request.user)
        
        if db_field.name == 'student' and not request.user.is_superuser and school:
            kwargs['queryset'] = Student.objects.filter(school=school)
        elif db_field.name == 'teacher' and not request.user.is_superuser and school:
            kwargs['queryset'] = Teacher.objects.filter(school=school)
        elif db_field.name == 'subject' and not request.user.is_superuser and school:
            kwargs['queryset'] = Subject.objects.filter(school=school)
        elif db_field.name == 'term' and not request.user.is_superuser and school:
            kwargs['queryset'] = Term.objects.filter(academic_year__school=school)
        
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(ClassRanking)
class ClassRankingAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['school', 'student', 'classroom', 'term', 'rank', 'total_points', 'average_score']
    list_filter = ['classroom', 'term', 'created_at', 'classroom__school']
    search_fields = ['student__user__first_name', 'student__user__last_name', 'classroom__name', 'classroom__school__name']
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
    
    def school(self, obj):
        return obj.classroom.school
    school.short_description = 'School'
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter by school for school admins"""
        school = self.get_school_for_user(request.user)
        
        if db_field.name == 'student' and not request.user.is_superuser and school:
            kwargs['queryset'] = Student.objects.filter(school=school)
        elif db_field.name == 'classroom' and not request.user.is_superuser and school:
            kwargs['queryset'] = ClassRoom.objects.filter(school=school)
        elif db_field.name == 'term' and not request.user.is_superuser and school:
            kwargs['queryset'] = Term.objects.filter(academic_year__school=school)
        
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(ReportCard)
class ReportCardAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['school', 'student', 'term', 'academic_year', 'class_rank', 'average_score', 'is_published_display', 'generated_at']
    list_filter = ['term', 'academic_year', 'is_published', 'generated_at', 'student__school']
    search_fields = ['student__user__first_name', 'student__user__last_name', 'student__admission_number', 'student__school__name']
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
    
    def school(self, obj):
        return obj.student.school
    school.short_description = 'School'
    
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
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter by school for school admins"""
        school = self.get_school_for_user(request.user)
        
        if db_field.name == 'student' and not request.user.is_superuser and school:
            kwargs['queryset'] = Student.objects.filter(school=school)
        elif db_field.name == 'term' and not request.user.is_superuser and school:
            kwargs['queryset'] = Term.objects.filter(academic_year__school=school)
        elif db_field.name == 'academic_year' and not request.user.is_superuser and school:
            kwargs['queryset'] = AcademicYear.objects.filter(school=school)
        elif db_field.name == 'classroom' and not request.user.is_superuser and school:
            kwargs['queryset'] = ClassRoom.objects.filter(school=school)
        
        return super().formfield_for_foreignkey(db_field, request, **kwargs)


@admin.register(GradeAuditLog)
class GradeAuditLogAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['school', 'grade', 'action', 'actor', 'logged_at', 'hash_status', 'is_tampered']
    list_filter = ['action', 'logged_at', 'grade__term', 'grade__subject', 'grade__student__school']
    search_fields = ['grade__student__user__first_name', 'grade__student__user__last_name', 
                     'grade__subject__name', 'actor__username', 'grade__student__school__name']
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
    
    def school(self, obj):
        return obj.grade.student.school
    school.short_description = 'School'
    
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
class GradeChangeAlertAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['school', 'grade', 'severity_badge', 'alert_type', 'status_badge', 'triggered_at', 'email_status']
    list_filter = ['severity', 'status', 'triggered_at', 'alert_type', 'email_sent', 'grade__student__school']
    search_fields = ['grade__student__user__first_name', 'grade__student__user__last_name',
                     'grade__subject__name', 'triggered_by__username', 'description', 'grade__student__school__name']
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
    
    def school(self, obj):
        return obj.grade.student.school
    school.short_description = 'School'
    
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
class GradeVerificationAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['school', 'grade', 'verification_status', 'issued_at', 'expires_at', 'verification_count', 'validity']
    list_filter = ['issued_at', 'is_verified', 'expires_at', 'grade__student__school']
    search_fields = ['grade__student__user__first_name', 'grade__student__user__last_name',
                     'verification_token', 'grade__student__school__name']
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
    
    def school(self, obj):
        return obj.grade.student.school
    school.short_description = 'School'
    
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

# ==================== STAFF ACCOUNT MANAGEMENT ====================

class SchoolStaffAccountAccessMixin(SchoolFilterMixin):
    """Mixin to restrict staff account access to school admins"""
    
    def has_view_permission(self, request, obj=None):
        """Only school admins can view staff accounts for their school"""
        if request.user.is_superuser:
            return True
        
        try:
            school_admin = request.user.school_admin_profile
            # Check if can_create_staff_accounts permission is enabled
            if school_admin.can_create_staff_accounts:
                return True
        except:
            pass
        
        return False
    
    def has_add_permission(self, request):
        """Only school admins with permission can create staff accounts"""
        if request.user.is_superuser:
            return True
        
        try:
            school_admin = request.user.school_admin_profile
            if school_admin.is_active and school_admin.can_create_staff_accounts:
                return True
        except:
            pass
        
        return False
    
    def has_change_permission(self, request, obj=None):
        """Only school admins can modify staff accounts in their school"""
        if request.user.is_superuser:
            return True
        
        try:
            school_admin = request.user.school_admin_profile
            if not school_admin.is_active:
                return False
            
            # If modifying a specific object, check if it belongs to their school
            if obj and hasattr(obj, 'school'):
                if obj.school == school_admin.school and school_admin.can_manage_staff_roles:
                    return True
            elif school_admin.can_manage_staff_roles:
                return True
        except:
            pass
        
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Only super admins can delete staff accounts"""
        return request.user.is_superuser


@admin.register(SchoolStaffAccount)
class SchoolStaffAccountAdmin(SchoolStaffAccountAccessMixin, admin.ModelAdmin):
    """Admin interface for managing school staff accounts"""
    
    list_display = ['get_full_name', 'school', 'role', 'account_status', 'is_active', 
                    'created_at', 'get_created_by', 'get_action_buttons']
    list_filter = ['role', 'account_status', 'is_active', 'school', 'created_at']
    search_fields = ['user__first_name', 'user__last_name', 'user__email', 'job_title', 'school__name']
    readonly_fields = ['created_by', 'created_at', 'activated_at', 'updated_at', 'get_staff_info']
    
    fieldsets = (
        ('User Account', {
            'fields': ('user', 'school')
        }),
        ('Role & Position', {
            'fields': ('role', 'job_title', 'department')
        }),
        ('Related Entities', {
            'fields': ('teacher', 'student', 'parent'),
            'classes': ('collapse',),
            'description': 'Link this staff account to a specific entity if applicable'
        }),
        ('Role-Based Permissions', {
            'fields': ('can_create_announcements', 'can_submit_assignments', 'can_view_results', 'can_edit_content'),
            'description': 'Permissions specific to this staff member role'
        }),
        ('Contact Information', {
            'fields': ('phone_number', 'alternate_email'),
            'classes': ('collapse',)
        }),
        ('Account Status', {
            'fields': ('is_active', 'account_status')
        }),
        ('Audit Information', {
            'fields': ('created_by', 'created_at', 'activated_at', 'updated_at'),
            'classes': ('collapse',),
        }),
        ('Staff Information', {
            'fields': ('get_staff_info',),
            'classes': ('collapse',),
        }),
    )
    
    actions = ['activate_accounts', 'suspend_accounts', 'terminate_accounts']
    
    def save_model(self, request, obj, form, change):
        """Set created_by when creating new staff account"""
        if not change:  # New object
            obj.created_by = request.user
            # Set initial password
            if not obj.user.has_usable_password():
                temp_password = self.generate_temporary_password()
                obj.user.set_password(temp_password)
                obj.user.is_staff = True
                obj.user.save()
        
        super().save_model(request, obj, form, change)
        
        # Log the action
        self.log_staff_account_action(
            request, obj, 'CREATED' if not change else 'UPDATED', 
            f"Staff account {'created' if not change else 'updated'}"
        )
    
    def get_queryset(self, request):
        """Filter staff accounts by school for school admins"""
        qs = super().get_queryset(request)
        
        if request.user.is_superuser:
            return qs
        
        try:
            school = self.get_school_for_user(request.user)
            if school:
                return qs.filter(school=school)
        except:
            pass
        
        return qs.none()
    
    def get_full_name(self, obj):
        """Display staff member's full name"""
        return obj.user.get_full_name() or obj.user.username
    get_full_name.short_description = 'Staff Member'
    
    def get_created_by(self, obj):
        """Display who created this account"""
        return obj.created_by.get_full_name() if obj.created_by else 'System'
    get_created_by.short_description = 'Created By'
    
    def get_action_buttons(self, obj):
        """Display action buttons for quick status changes"""
        buttons = []
        if obj.account_status != 'ACTIVE':
            buttons.append(format_html(
                '<a class="button" href="#" style="background-color: #417690; color: white; padding: 5px 10px; text-decoration: none; border-radius: 3px;">Activate</a>'
            ))
        if obj.account_status == 'ACTIVE':
            buttons.append(format_html(
                '<a class="button" href="#" style="background-color: #f37726; color: white; padding: 5px 10px; text-decoration: none; border-radius: 3px; margin-left: 5px;">Suspend</a>'
            ))
        return format_html('&nbsp;'.join(buttons))
    get_action_buttons.short_description = 'Actions'
    
    def get_staff_info(self, obj):
        """Display detailed staff information"""
        info = f"""
        <b>Email:</b> {obj.user.email}<br>
        <b>Username:</b> {obj.user.username}<br>
        <b>Phone:</b> {obj.phone_number or 'N/A'}<br>
        <b>Alternate Email:</b> {obj.alternate_email or 'N/A'}<br>
        <b>School:</b> {obj.school.name}<br>
        """
        
        if obj.teacher:
            info += f"<b>Teacher ID:</b> {obj.teacher.employee_id}<br>"
        if obj.student:
            info += f"<b>Student ID:</b> {obj.student.admission_number}<br>"
        if obj.parent:
            info += f"<b>Parent:</b> {obj.parent.relationship}<br>"
        
        return format_html(info)
    get_staff_info.short_description = 'Staff Information'
    
    def activate_accounts(self, request, queryset):
        """Bulk action to activate staff accounts"""
        count = 0
        for account in queryset:
            if account.account_status != 'ACTIVE':
                account.activate_account()
                self.log_staff_account_action(request, account, 'ACTIVATED', 'Account activated via bulk action')
                count += 1
        
        self.message_user(request, f'{count} staff account(s) activated successfully.')
    activate_accounts.short_description = 'Activate selected staff accounts'
    
    def suspend_accounts(self, request, queryset):
        """Bulk action to suspend staff accounts"""
        count = 0
        for account in queryset:
            if account.account_status != 'SUSPENDED':
                account.suspend_account()
                self.log_staff_account_action(request, account, 'SUSPENDED', 'Account suspended via bulk action')
                count += 1
        
        self.message_user(request, f'{count} staff account(s) suspended.')
    suspend_accounts.short_description = 'Suspend selected staff accounts'
    
    def terminate_accounts(self, request, queryset):
        """Bulk action to terminate staff accounts"""
        count = 0
        for account in queryset:
            if account.account_status != 'TERMINATED':
                account.terminate_account()
                self.log_staff_account_action(request, account, 'TERMINATED', 'Account terminated via bulk action')
                count += 1
        
        self.message_user(request, f'{count} staff account(s) terminated.')
    terminate_accounts.short_description = 'Terminate selected staff accounts'
    
    @staticmethod
    def generate_temporary_password(length=12):
        """Generate a secure temporary password"""
        characters = string.ascii_letters + string.digits + string.punctuation
        return ''.join(secrets.choice(characters) for _ in range(length))
    
    @staticmethod
    def log_staff_account_action(request, account, action, description):
        """Log staff account actions for audit trail"""
        from .models import StaffAccountAuditLog
        try:
            StaffAccountAuditLog.objects.create(
                staff_account=account,
                action=action,
                description=description,
                changed_by=request.user,
                ip_address=get_client_ip(request)
            )
        except Exception as e:
            print(f"Error logging staff account action: {e}")


@admin.register(StaffAccountAuditLog)
class StaffAccountAuditLogAdmin(SchoolStaffAccountAccessMixin, admin.ModelAdmin):
    """Admin interface for viewing staff account audit logs"""
    
    list_display = ['staff_account', 'action', 'changed_by', 'created_at', 'get_description_short']
    list_filter = ['action', 'created_at', 'staff_account__school', 'staff_account__role']
    search_fields = ['staff_account__user__first_name', 'staff_account__user__last_name', 
                     'staff_account__school__name', 'description']
    readonly_fields = ['staff_account', 'action', 'description', 'changed_by', 'old_values', 
                       'new_values', 'ip_address', 'created_at', 'get_formatted_changes']
    
    fieldsets = (
        ('Change Information', {
            'fields': ('staff_account', 'action', 'description', 'changed_by', 'created_at')
        }),
        ('Change Details', {
            'fields': ('get_formatted_changes',),
        }),
        ('System Information', {
            'fields': ('ip_address',),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Filter audit logs by school for school admins"""
        qs = super().get_queryset(request)
        
        if request.user.is_superuser:
            return qs
        
        try:
            school = self.get_school_for_user(request.user)
            if school:
                return qs.filter(staff_account__school=school)
        except:
            pass
        
        return qs.none()
    
    def get_description_short(self, obj):
        """Show truncated description"""
        if obj.description:
            return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
        return '—'
    get_description_short.short_description = 'Description'
    
    def get_formatted_changes(self, obj):
        """Display old and new values in a readable format"""
        import json
        output = '<table style="width: 100%; border-collapse: collapse;">'
        
        if obj.old_values:
            output += '<tr><td style="border: 1px solid #ddd; padding: 8px;"><b>Previous Values:</b></td></tr>'
            try:
                old_data = json.dumps(obj.old_values, indent=2)
                output += f'<tr><td style="border: 1px solid #ddd; padding: 8px;"><pre>{old_data}</pre></td></tr>'
            except:
                output += f'<tr><td style="border: 1px solid #ddd; padding: 8px;">{obj.old_values}</td></tr>'
        
        if obj.new_values:
            output += '<tr><td style="border: 1px solid #ddd; padding: 8px;"><b>New Values:</b></td></tr>'
            try:
                new_data = json.dumps(obj.new_values, indent=2)
                output += f'<tr><td style="border: 1px solid #ddd; padding: 8px;"><pre>{new_data}</pre></td></tr>'
            except:
                output += f'<tr><td style="border: 1px solid #ddd; padding: 8px;">{obj.new_values}</td></tr>'
        
        output += '</table>'
        return format_html(output)
    get_formatted_changes.short_description = 'Changes'
    
    def has_add_permission(self, request):
        """Audit logs are auto-created"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Audit logs cannot be modified"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Audit logs cannot be deleted"""
        return False


def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip