from django.contrib import admin
from django.contrib.auth.models import User
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
    list_display = ['get_full_name', 'admission_number', 'classroom', 'academic_year', 'is_active', 'admission_date']
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
            'fields': ('date_of_birth', 'phone_number')
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


class StudentLinkInline(admin.TabularInline):
    """Inline admin for Student Links within Parent"""
    model = ParentStudent
    extra = 1
    fields = ['student', 'is_primary_contact']
    autocomplete_fields = ['student']


@admin.register(Parent)
class ParentAdmin(admin.ModelAdmin):
    list_display = ['get_full_name', 'phone_number', 'relationship', 'occupation', 'get_student_count', 'is_active']
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

    def get_full_name(self, obj):
        return obj.user.get_full_name()
    get_full_name.short_description = 'Full Name'

    def get_student_count(self, obj):
        return obj.student_links.count()
    get_student_count.short_description = 'Linked Students'


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
