from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class School(models.Model):
    """Represents a school in the system"""
    name = models.CharField(max_length=255, unique=True, help_text="School name")
    code = models.CharField(max_length=50, unique=True, help_text="School code/ID")
    email = models.EmailField(help_text="School contact email")
    phone = models.CharField(max_length=20, blank=True, help_text="School contact phone")
    address = models.TextField(blank=True, help_text="School physical address")
    principal_name = models.CharField(max_length=255, blank=True, help_text="Principal/Head of School name")
    badge = models.ImageField(upload_to='school_badges/', blank=True, null=True, help_text="Institution logo/badge")
    
    # Extended registration fields (saved from registration wizard)
    city             = models.CharField(max_length=100, blank=True, default='')
    region           = models.CharField(max_length=100, blank=True, default='')
    country          = models.CharField(max_length=100, blank=True, default='')
    institution_type = models.CharField(max_length=100, blank=True, default='')
    website          = models.URLField(max_length=200, blank=True, default='')
    motto            = models.CharField(max_length=300, blank=True, default='')
    capacity         = models.IntegerField(null=True, blank=True)
    academic_system  = models.CharField(max_length=50, blank=True, default='')
    grading_system   = models.CharField(max_length=50, blank=True, default='')
    language         = models.CharField(max_length=50, blank=True, default='English')
    
    registration_number = models.CharField(max_length=100, blank=True, default='')
    estimated_teachers  = models.CharField(max_length=50, blank=True, default='')
    brand_colors        = models.CharField(max_length=255, blank=True, default='')
    established         = models.CharField(max_length=50, blank=True, default='')
    admin_email         = models.EmailField(blank=True, default='')
    admin_phone         = models.CharField(max_length=50, blank=True, default='')
    
    changes_requested = models.BooleanField(default=False)
    rejection_reason = models.TextField(blank=True, default='', help_text="Reason provided when rejecting a school application")
    approval_date = models.DateTimeField(null=True, blank=True, help_text="When the school was approved by a superadmin")

    # Registration details
    registration_date = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True, help_text="Is this school active in the system?")
    is_approved = models.BooleanField(default=False, help_text="Has this school been reviewed and approved by a super admin?")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                   related_name='created_schools', help_text="Super admin who registered this school")

    class Meta:
        ordering = ['name']
        verbose_name_plural = "Schools"

    def __str__(self):
        return f"{self.name} ({self.code})"


class SchoolAdmin(models.Model):
    """Links a user to a school as an admin who manages that school"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='school_admin_profile')
    school = models.OneToOneField(School, on_delete=models.CASCADE, related_name='admin')
    
    # Role details
    job_title = models.CharField(max_length=100, blank=True, help_text="e.g., School Administrator, Headmaster")
    
    # Access control - Academic Management
    can_manage_academics = models.BooleanField(default=True, help_text="Can manage academic years, terms, and classes")
    
    # Access control - Staff Management
    can_create_staff_accounts = models.BooleanField(default=True, help_text="Can create and manage staff accounts (teachers, etc.)")
    can_manage_staff_roles = models.BooleanField(default=True, help_text="Can assign and modify staff member roles")
    can_activate_deactivate_staff = models.BooleanField(default=True, help_text="Can activate/deactivate staff accounts")
    
    # Access control - Data Management
    can_manage_teachers = models.BooleanField(default=True, help_text="Can manage teacher records and assignments")
    can_manage_students = models.BooleanField(default=True, help_text="Can manage student registrations and enrollments")
    can_manage_parents = models.BooleanField(default=True, help_text="Can manage parent/guardian accounts and links")
    can_manage_grades = models.BooleanField(default=True, help_text="Can manage grading system and enter grades")
    can_manage_reports = models.BooleanField(default=True, help_text="Can generate and publish reports")
    can_view_audit_logs = models.BooleanField(default=False, help_text="Can view audit logs")
    
    # Status
    is_active            = models.BooleanField(default=True)
    must_change_password = models.BooleanField(default=False, help_text="Force password change on next login")

    # Metadata
    appointed_date = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "School Admin"
        verbose_name_plural = "School Admins"

    def __str__(self):
        return f"{self.user.get_full_name()} - Admin of {self.school.name}"


class AcademicYear(models.Model):
    """Represents an academic year (e.g., 2024-2025)"""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='academic_years', null=True, blank=True)
    name = models.CharField(max_length=100, help_text="e.g., 2024-2025")
    start_date = models.DateField(help_text="Academic year start date")
    end_date = models.DateField(help_text="Academic year end date")
    is_active = models.BooleanField(default=False, help_text="Only one year should be active at a time")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']
        verbose_name_plural = "Academic Years"
        unique_together = ('school', 'name')

    def __str__(self):
        return self.name


class Term(models.Model):
    """Represents a term within an academic year"""
    TERM_CHOICES = [
        ('TERM1', 'Term 1'),
        ('TERM2', 'Term 2'),
        ('TERM3', 'Term 3'),
    ]
    STATUS_CHOICES = [
        ('draft',    'Draft'),
        ('open',     'Open'),
        ('closed',   'Closed'),
        ('archived', 'Archived'),
    ]

    academic_year        = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='terms')
    name                 = models.CharField(max_length=20, choices=TERM_CHOICES)
    start_date           = models.DateField()
    end_date             = models.DateField()
    is_active            = models.BooleanField(default=False)
    status               = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    grade_entry_open     = models.BooleanField(default=False, help_text="Teachers can enter grades when True")
    grade_entry_deadline = models.DateTimeField(null=True, blank=True, help_text="Hard deadline for grade entry")
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('academic_year', 'name')
        ordering = ['academic_year', 'name']

    def __str__(self):
        return f"{self.academic_year.name} - {self.get_name_display()}"


class Subject(models.Model):
    """Represents a school subject"""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='subjects', null=True, blank=True)
    name = models.CharField(max_length=100, help_text="Subject name")
    code = models.CharField(max_length=20, help_text="Subject code")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        unique_together = ('school', 'code')

    def __str__(self):
        return f"{self.name} ({self.code})"


class ClassRoom(models.Model):
    """Represents a class/form (e.g., Grade 10A, Grade 10B)"""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='classrooms', null=True, blank=True)
    name = models.CharField(max_length=50, help_text="e.g., Grade 10A")
    code = models.CharField(max_length=20, help_text="Unique code within school")
    form_number = models.IntegerField(validators=[MinValueValidator(1)], help_text="Form/Grade number (e.g., 10)")
    capacity = models.IntegerField(default=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['form_number', 'name']
        verbose_name = "Class"
        verbose_name_plural = "Classes"
        unique_together = ('school', 'code')

    def __str__(self):
        return self.name


class Teacher(models.Model):
    """Represents a teacher"""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='teachers', null=True, blank=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    employee_id = models.CharField(max_length=50, help_text="Must be unique per school")
    phone_number = models.CharField(max_length=20, blank=True)
    qualification = models.CharField(max_length=255, blank=True)
    profile_picture = models.ImageField(upload_to='teacher_photos/', blank=True, null=True, help_text="Teacher profile photo")
    hire_date            = models.DateField(default=timezone.now)
    is_active            = models.BooleanField(default=True)
    must_change_password    = models.BooleanField(default=False)
    is_examination_officer  = models.BooleanField(default=False, help_text="Can generate and publish report cards")
    created_at              = models.DateTimeField(auto_now_add=True)
    updated_at              = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['user__last_name', 'user__first_name']
        unique_together = ('school', 'employee_id')

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.employee_id})"


class TeacherSubjectClass(models.Model):
    """Assignment of teachers to subjects and classes"""
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='subject_classes')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('teacher', 'subject', 'classroom', 'academic_year')
        ordering = ['classroom', 'subject']
        verbose_name = "Teacher Subject Class"
        verbose_name_plural = "Teacher Subject Classes"

    def __str__(self):
        return f"{self.teacher} - {self.subject} ({self.classroom}, {self.academic_year})"


class Student(models.Model):
    """Represents a student"""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='students', null=True, blank=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    admission_number = models.CharField(max_length=50, help_text="Must be unique per school")
    classroom = models.ForeignKey(ClassRoom, on_delete=models.SET_NULL, null=True, related_name='students')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True)
    admission_date = models.DateField(default=timezone.now)
    date_of_birth = models.DateField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True)
    gender = models.CharField(max_length=1, choices=[('M', 'Male'), ('F', 'Female')], blank=True)
    passport_picture     = models.ImageField(upload_to='student_passports/', blank=True, null=True)
    is_active            = models.BooleanField(default=True)
    must_change_password = models.BooleanField(default=False)
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['classroom', 'user__last_name', 'user__first_name']
        unique_together = ('school', 'admission_number')

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.admission_number})"


class Parent(models.Model):
    """Represents a parent/guardian"""
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='parents', null=True, blank=True)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='parent_profile')
    phone_number         = models.CharField(max_length=20)
    relationship         = models.CharField(max_length=50, help_text="e.g., Father, Mother, Guardian")
    occupation           = models.CharField(max_length=100, blank=True)
    is_active            = models.BooleanField(default=True)
    must_change_password = models.BooleanField(default=False)
    created_at           = models.DateTimeField(auto_now_add=True)
    updated_at           = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['user__last_name', 'user__first_name']
        verbose_name_plural = "Parents"

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.relationship})"


class ParentStudent(models.Model):
    """Links parents/guardians to students"""
    parent = models.ForeignKey(Parent, on_delete=models.CASCADE, related_name='student_links')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='parent_links')
    is_primary_contact = models.BooleanField(default=False, help_text="Primary contact for emergencies")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('parent', 'student')
        verbose_name = "Parent Student Link"
        verbose_name_plural = "Parent Student Links"

    def __str__(self):
        return f"{self.student} - {self.parent}"


class Grade(models.Model):
    """Student grades for subjects"""
    GRADE_SCALE = [
        ('A+', 'A+ (90-100)'),
        ('A',  'A  (80-89)'),
        ('B',  'B  (70-79)'),
        ('C',  'C  (60-69)'),
        ('D',  'D  (50-59)'),
        ('F',  'F  (0-49)'),
        ('I',  'Incomplete'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='grades')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='grades')
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Score breakdown (raw marks)
    continuous_assessment = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(20)],
        help_text="Continuous Assessment / Class Work (0-20)"
    )
    mid_term_exam = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(30)],
        help_text="Mid-term Exam Score (0-30)"
    )
    final_exam = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        validators=[MinValueValidator(0), MaxValueValidator(50)],
        help_text="Final Exam Score (0-50)"
    )
    
    # Calculated fields
    total_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Auto-calculated: CA + Mid-term + Final (max 100)"
    )
    grade_letter = models.CharField(
        max_length=2, choices=GRADE_SCALE, default='I',
        help_text="Auto-calculated letter grade"
    )
    
    # Status
    is_locked = models.BooleanField(
        default=False, 
        help_text="Locked grades cannot be edited"
    )
    locked_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='locked_grades'
    )
    locked_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'subject', 'term')
        ordering = ['student', 'subject']
        verbose_name_plural = "Grades"
        indexes = [
            models.Index(fields=['student', 'term']),
            models.Index(fields=['subject', 'term']),
        ]

    def __str__(self):
        return f"{self.student} - {self.subject} ({self.term}): {self.grade_letter}"

    def calculate_total(self):
        """Calculate total score from components"""
        self.total_score = min(
            self.continuous_assessment + self.mid_term_exam + self.final_exam,
            100
        )
        self.calculate_grade_letter()
        return self.total_score

    def calculate_grade_letter(self):
        """Convert score to letter grade using the school's GradingScheme when available."""
        # Caller may pre-set _boundaries to avoid extra DB queries in batch saves
        boundaries = getattr(self, '_boundaries', None)
        if boundaries is None:
            try:
                boundaries = sorted(
                    self.student.school.grading_scheme.boundaries,
                    key=lambda b: -b['min'],
                )
            except Exception:
                boundaries = None

        s = float(self.total_score)
        if boundaries:
            for b in boundaries:
                if s >= b['min']:
                    self.grade_letter = b['letter']
                    return
            self.grade_letter = boundaries[-1]['letter'] if boundaries else 'I'
            return

        # Hardcoded fallback (used when no GradingScheme exists yet)
        if s >= 90:   self.grade_letter = 'A+'
        elif s >= 80: self.grade_letter = 'A'
        elif s >= 70: self.grade_letter = 'B'
        elif s >= 60: self.grade_letter = 'C'
        elif s >= 50: self.grade_letter = 'D'
        elif s > 0:   self.grade_letter = 'F'
        else:         self.grade_letter = 'I'

    def save(self, *args, **kwargs):
        if not self.is_locked:
            self.calculate_total()
        super().save(*args, **kwargs)

    def lock(self, user):
        """Lock grade to prevent further edits"""
        if not self.is_locked:
            self.is_locked = True
            self.locked_by = user
            self.locked_at = timezone.now()
            self.save()

    def unlock(self):
        """Unlock grade for editing"""
        if self.is_locked:
            self.is_locked = False
            self.locked_by = None
            self.locked_at = None
            self.save()


class ClassRanking(models.Model):
    """Ranking of students in a class for a term"""
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name='rankings')
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    
    rank = models.IntegerField(help_text="Rank in class (1 is top)")
    total_points = models.DecimalField(
        max_digits=7, decimal_places=2,
        help_text="Sum of all subject grades"
    )
    average_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        help_text="Average across all subjects"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('classroom', 'student', 'term')
        ordering = ['term', 'rank']
        verbose_name_plural = "Class Rankings"

    def __str__(self):
        return f"{self.student} - Rank {self.rank} in {self.classroom} ({self.term})"


class GradeAuditLog(models.Model):
    """Immutable audit trail for all grade changes - Event Sourcing"""
    ACTION_CHOICES = [
        ('CREATE',               'Grade Created'),
        ('UPDATE',               'Grade Updated'),
        ('SUBMIT',               'Submitted for Locking'),
        ('LOCK',                 'Grade Locked'),
        ('UNLOCK',               'Grade Unlocked'),
        ('VIEW',                 'Grade Viewed'),
        ('MODIFICATION_ATTEMPT', 'Unauthorised Modification Attempt'),
        ('MOD_REQUEST',          'Modification Request Submitted'),
        ('MOD_APPROVED',         'Modification Request Approved'),
        ('MOD_REJECTED',         'Modification Request Rejected'),
        ('DELETE_ATTEMPT',       'Delete Attempt'),
        ('ARCHIVE',              'Grade Archived'),
    ]
    
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                            related_name='grade_audit_actions')
    
    # Before and after snapshots
    old_values = models.JSONField(default=dict, null=True, blank=True, 
                                 help_text="Previous values before this change")
    new_values = models.JSONField(default=dict, null=True, blank=True, 
                                 help_text="New values after this change")
    
    # Context
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, help_text="Browser/client info")
    change_reason = models.TextField(blank=True, help_text="Why was this change made?")
    
    # Cryptographic Hash for tamper detection
    record_hash = models.CharField(max_length=256, db_index=True, 
                                  help_text="SHA256 hash of record for integrity")
    merkle_hash = models.CharField(max_length=256, db_index=True, 
                                  help_text="Merkle tree hash including all previous records")
    
    # Immutable record timestamp
    logged_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['grade', '-logged_at']
        indexes = [
            models.Index(fields=['grade', '-logged_at']),
            models.Index(fields=['actor', '-logged_at']),
            models.Index(fields=['action', '-logged_at']),
            models.Index(fields=['record_hash']),
        ]
        verbose_name_plural = "Grade Audit Logs"

    def __str__(self):
        return f"{self.get_action_display()} - {self.grade} by {self.actor} at {self.logged_at}"

    def is_hash_valid(self):
        """Verify the record hasn't been tampered with"""
        import hashlib
        import json
        
        snapshot = {
            'grade_id': self.grade_id,
            'action': self.action,
            'actor': self.actor_id,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'logged_at': str(self.logged_at),
        }
        computed_hash = hashlib.sha256(json.dumps(snapshot, sort_keys=True).encode()).hexdigest()
        return computed_hash == self.record_hash


class GradeChangeAlert(models.Model):
    """Alert system for suspicious grade change attempts"""
    SEVERITY_CHOICES = [
        ('LOW', 'Low - Minor edit'),
        ('MEDIUM', 'Medium - Significant change'),
        ('HIGH', 'High - Major alteration'),
        ('CRITICAL', 'Critical - Locked grade modified'),
    ]
    
    STATUS_CHOICES = [
        ('NEW', 'New Alert'),
        ('ACKNOWLEDGED', 'Acknowledged'),
        ('INVESTIGATED', 'Investigated'),
        ('RESOLVED', 'Resolved'),
        ('FALSE_ALARM', 'False Alarm'),
    ]
    
    grade = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name='change_alerts')
    
    # What happened
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    alert_type = models.CharField(max_length=100, db_index=True)  # e.g., "locked_grade_edit_attempt"
    description = models.TextField()
    
    # Who triggered it
    triggered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, 
                                    related_name='triggered_alerts')
    triggered_at = models.DateTimeField(auto_now_add=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # Old and new values
    old_value = models.JSONField(default=dict, blank=True)
    new_value = models.JSONField(default=dict, blank=True)
    
    # Response
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NEW', db_index=True)
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name='acknowledged_alerts')
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    investigation_notes = models.TextField(blank=True)
    
    # Email notification tracking
    email_sent = models.BooleanField(default=False)
    email_sent_to = models.EmailField(blank=True)
    email_sent_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-triggered_at']
        indexes = [
            models.Index(fields=['grade', '-triggered_at']),
            models.Index(fields=['severity', '-triggered_at']),
            models.Index(fields=['status']),
            models.Index(fields=['triggered_by', '-triggered_at']),
        ]
        verbose_name_plural = "Grade Change Alerts"

    def __str__(self):
        return f"{self.get_severity_display()} - {self.alert_type} on {self.grade}"

    def acknowledge(self, user, notes=""):
        """Mark alert as acknowledged"""
        self.status = 'ACKNOWLEDGED'
        self.acknowledged_by = user
        self.acknowledged_at = timezone.now()
        self.investigation_notes = notes
        self.save()

    def resolve(self):
        """Mark alert as resolved"""
        self.status = 'RESOLVED'
        self.save()


class SystemWideAlert(models.Model):
    """Real-time alerts for significant system-wide change events."""

    TRIGGER_CHOICES = [
        ('grade_lock_attempt', 'Grade Modification on Locked Record'),
        ('enrollment_change',  'Student Enrollment Status Change'),
        ('fee_payment',        'Fee Payment Recorded'),
        ('attendance_anomaly', 'Attendance Anomaly Detected'),
        ('permission_change',  'User Permission Change'),
    ]
    SEVERITY_CHOICES = [
        ('low',      'Low'),
        ('medium',   'Medium'),
        ('high',     'High'),
        ('critical', 'Critical'),
    ]
    STATUS_CHOICES = [
        ('new',          'New'),
        ('acknowledged', 'Acknowledged'),
        ('resolved',     'Resolved'),
    ]

    trigger_type    = models.CharField(max_length=50, choices=TRIGGER_CHOICES, db_index=True)
    title           = models.CharField(max_length=255)
    description     = models.TextField()
    severity        = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    school          = models.ForeignKey('School', on_delete=models.SET_NULL, null=True, blank=True,
                                        related_name='system_alerts')
    triggered_by    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                        related_name='triggered_system_alerts')
    triggered_at    = models.DateTimeField(auto_now_add=True, db_index=True)
    metadata        = models.JSONField(default=dict, blank=True)

    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new', db_index=True)
    acknowledged_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                        related_name='acknowledged_system_alerts')
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    notes           = models.TextField(blank=True)

    # Notification channels
    notif_in_app        = models.BooleanField(default=True)   # always created; this IS the in-app notif
    notif_email         = models.BooleanField(default=False)
    notif_email_sent_at = models.DateTimeField(null=True, blank=True)
    notif_sms           = models.BooleanField(default=False)  # critical only
    notif_sms_sent_at   = models.DateTimeField(null=True, blank=True)
    notif_push          = models.BooleanField(default=False)
    notif_push_sent_at  = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-triggered_at']
        indexes = [
            models.Index(fields=['trigger_type', '-triggered_at']),
            models.Index(fields=['severity', '-triggered_at']),
            models.Index(fields=['status']),
        ]
        verbose_name        = 'System Wide Alert'
        verbose_name_plural = 'System Wide Alerts'

    def __str__(self):
        return f"[{self.severity.upper()}] {self.title} ({self.triggered_at:%Y-%m-%d %H:%M})"

    def acknowledge(self, user, notes=''):
        self.status = 'acknowledged'
        self.acknowledged_by = user
        self.acknowledged_at = timezone.now()
        self.notes = notes
        self.save()

    def resolve(self, user=None, notes=''):
        self.status = 'resolved'
        if user:
            self.acknowledged_by = user
            self.acknowledged_at = timezone.now()
        if notes:
            self.notes = notes
        self.save()


class GradeVerification(models.Model):
    """QR Code and cryptographic verification for grades"""
    grade = models.OneToOneField(Grade, on_delete=models.CASCADE, related_name='verification')
    
    # Verification codes
    verification_token = models.CharField(max_length=256, unique=True, db_index=True,
                                         help_text="Unique token for verification")
    qr_code_data = models.TextField(help_text="Encoded data in QR code")
    
    # Cryptographic signatures
    sha256_hash = models.CharField(max_length=64, db_index=True)  # SHA256 of grade data
    merkle_leaf = models.CharField(max_length=64, help_text="This record's Merkle tree leaf")
    merkle_root = models.CharField(max_length=64, db_index=True, 
                                  help_text="Merkle root of all grades up to this point")
    
    # Chain of custody
    issued_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True,
                                 related_name='issued_verifications')
    issued_at = models.DateTimeField(auto_now_add=True, db_index=True)
    expires_at = models.DateTimeField(help_text="Verification expires after this date")
    
    # Verification attempts
    verification_attempts = models.IntegerField(default=0)
    last_verification_at = models.DateTimeField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = "Grade Verifications"

    def __str__(self):
        return f"Verification for {self.grade}"

    def generate_verification_token(self):
        """Generate unique verification token"""
        import hashlib
        import json
        from django.utils import timezone as tz
        
        data = {
            'grade_id': self.grade_id,
            'student': str(self.grade.student),
            'subject': str(self.grade.subject),
            'total_score': float(self.grade.total_score),
            'grade_letter': self.grade.grade_letter,
            'term': str(self.grade.term),
            'issued_at': str(tz.now()),
        }
        
        token = hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()
        self.verification_token = token
        self.qr_code_data = f"GRADE-{token}"
        return token

    def verify_qr_code(self, token):
        """Verify a QR code token"""
        self.verification_attempts += 1
        if self.verification_token == token:
            self.is_verified = True
            self.last_verification_at = timezone.now()
            self.save()
            return True
        self.save()
        return False

    def is_valid(self):
        """Check if verification is still valid"""
        from django.utils import timezone as tz
        return self.expires_at > tz.now()


class ReportCard(models.Model):
    """Generated report card for a student"""
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='report_cards')
    term = models.ForeignKey(Term, on_delete=models.CASCADE)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    classroom = models.ForeignKey(ClassRoom, on_delete=models.CASCADE)
    
    # Summary data
    total_subjects = models.IntegerField(default=0)
    average_score = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    class_rank = models.IntegerField(null=True, blank=True)
    class_size = models.IntegerField(default=0)
    
    # PDF generation
    pdf_file          = models.FileField(upload_to='report_cards/', null=True, blank=True)
    qr_code           = models.CharField(max_length=255, null=True, blank=True)
    verification_hash = models.CharField(max_length=64, blank=True, help_text="SHA256 of report card data")
    
    # Status
    generated_at = models.DateTimeField(auto_now_add=True)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    is_published = models.BooleanField(default=False, help_text="Can parents view this report card?")
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('student', 'term', 'academic_year')
        ordering = ['-academic_year', '-term']
        verbose_name_plural = "Report Cards"

    def __str__(self):
        return f"Report Card - {self.student} ({self.term}: {self.academic_year})"

    def mark_published(self, user=None):
        """Publish report card for parent viewing"""
        self.is_published = True
        self.published_at = timezone.now()
        self.save()

class SchoolStaffAccount(models.Model):
    """Manages staff accounts created by school admins for various roles"""
    
    ROLE_CHOICES = [
        ('TEACHER', 'Teacher'),
        ('STUDENT', 'Student'),
        ('PARENT', 'Parent/Guardian'),
        ('STAFF', 'Administrative Staff'),
        ('ACCOUNTANT', 'Accountant'),
        ('PRINCIPAL', 'Principal'),
        ('REGISTRAR', 'Registrar'),
        ('LIBRARIAN', 'Librarian'),
        ('COUNSELOR', 'Counselor'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='school_staff_account')
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='staff_accounts')
    
    # Role and assignment
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, help_text="Staff member role/position")
    job_title = models.CharField(max_length=150, blank=True, help_text="Job title/position (e.g., Mathematics Teacher)")
    department = models.CharField(max_length=100, blank=True, help_text="Department (e.g., Science, Administration)")
    
    # Related entities (optional - for linking to specific roles)
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_account')
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_account')
    parent = models.ForeignKey(Parent, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_account')
    
    # Permissions management by role
    can_create_announcements = models.BooleanField(default=False, help_text="Can post announcements")
    can_submit_assignments = models.BooleanField(default=False, help_text="Can submit assignments")
    can_view_results = models.BooleanField(default=False, help_text="Can view grades/results")
    can_edit_content = models.BooleanField(default=False, help_text="Can modify educational content")
    
    # Status tracking
    is_active = models.BooleanField(default=True, help_text="Is this staff account active?")
    account_status = models.CharField(
        max_length=20,
        choices=[
            ('PENDING', 'Pending Activation'),
            ('ACTIVE', 'Active'),
            ('SUSPENDED', 'Suspended'),
            ('TERMINATED', 'Terminated'),
        ],
        default='PENDING',
        help_text="Current status of the staff account"
    )
    
    # Contact details
    phone_number = models.CharField(max_length=20, blank=True)
    alternate_email = models.EmailField(blank=True)
    
    # Metadata
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_staff_accounts')
    created_at = models.DateTimeField(auto_now_add=True)
    activated_at = models.DateTimeField(null=True, blank=True, help_text="When was this account activated?")
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ('user', 'school')  # One staff account per user per school
        verbose_name = "School Staff Account"
        verbose_name_plural = "School Staff Accounts"
        permissions = [
            ('can_approve_staff_accounts', 'Can approve pending staff accounts'),
            ('can_suspend_staff', 'Can suspend staff accounts'),
        ]
    
    def __str__(self):
        return f"{self.user.get_full_name()} - {self.get_role_display()} ({self.school.name})"
    
    def activate_account(self):
        """Activate the staff account"""
        self.is_active = True
        self.account_status = 'ACTIVE'
        self.activated_at = timezone.now()
        self.user.is_active = True
        self.save()
        self.user.save()
    
    def suspend_account(self):
        """Suspend the staff account"""
        self.is_active = False
        self.account_status = 'SUSPENDED'
        self.user.is_active = False
        self.save()
        self.user.save()
    
    def terminate_account(self):
        """Terminate the staff account"""
        self.is_active = False
        self.account_status = 'TERMINATED'
        self.user.is_active = False
        self.save()
        self.user.save()


class StaffAccountAuditLog(models.Model):
    """Tracks all changes to staff accounts for audit purposes"""
    
    ACTION_CHOICES = [
        ('CREATED', 'Account Created'),
        ('ACTIVATED', 'Account Activated'),
        ('UPDATED', 'Account Updated'),
        ('SUSPENDED', 'Account Suspended'),
        ('TERMINATED', 'Account Terminated'),
        ('ROLE_CHANGED', 'Role Changed'),
        ('PERMISSIONS_CHANGED', 'Permissions Changed'),
    ]
    
    staff_account = models.ForeignKey(SchoolStaffAccount, on_delete=models.CASCADE, related_name='audit_logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.TextField(blank=True, help_text="Details of the change")
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='staff_audit_changes')
    old_values = models.JSONField(null=True, blank=True, help_text="Previous values before change")
    new_values = models.JSONField(null=True, blank=True, help_text="New values after change")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Staff Account Audit Log"
        verbose_name_plural = "Staff Account Audit Logs"
    
    def __str__(self):
        return f"{self.staff_account} - {self.get_action_display()} - {self.created_at}"


# ---------------------------------------------------------------------------
# Waitlist — landing page email capture
# ---------------------------------------------------------------------------
class WaitlistEmail(models.Model):
    email      = models.EmailField(unique=True)
    country    = models.CharField(max_length=100, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name        = 'Waitlist Email'
        verbose_name_plural = 'Waitlist Emails'

    def __str__(self):
        return self.email


# ---------------------------------------------------------------------------
# OTP Records — stores one-time passwords for email verification
# ---------------------------------------------------------------------------
class OTPRecord(models.Model):
    """Stores a hashed OTP code sent to a user's email for identity verification."""
    email       = models.EmailField(db_index=True, help_text="Recipient email address")
    code_hash   = models.CharField(max_length=64, help_text="SHA-256 hash of the 6-digit OTP")
    expires_at  = models.DateTimeField(help_text="When this OTP stops being valid")
    is_used     = models.BooleanField(default=False, help_text="True once the OTP has been verified")
    attempts    = models.IntegerField(default=0, help_text="Number of failed verification attempts")
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering            = ['-created_at']
        verbose_name        = 'OTP Record'
        verbose_name_plural = 'OTP Records'

    def __str__(self):
        return f"OTP for {self.email} ({'used' if self.is_used else 'active'})"

    def is_valid(self):
        """Returns True if the OTP has not expired and has not been used."""
        return not self.is_used and timezone.now() < self.expires_at


# ---------------------------------------------------------------------------
# School Application Events — audit trail for the approval workflow
# ---------------------------------------------------------------------------
class SchoolApplicationEvent(models.Model):
    EVENT_CHOICES = [
        ('SUBMITTED', 'Application Submitted'),
        ('UNDER_REVIEW', 'Under Review'),
        ('APPROVED', 'Application Approved'),
        ('REJECTED', 'Application Rejected'),
        ('CHANGES_REQUESTED', 'Changes Requested'),
        ('RESUBMITTED', 'Application Resubmitted'),
        ('NOTE', 'Admin Note'),
    ]
    school = models.ForeignKey(School, on_delete=models.CASCADE, related_name='application_events')
    event_type = models.CharField(max_length=30, choices=EVENT_CHOICES, db_index=True)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='school_application_events')
    actor_label = models.CharField(max_length=255, blank=True, help_text='Display label for the actor')
    note = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'School Application Event'
        verbose_name_plural = 'School Application Events'

    def __str__(self):
        return f"{self.school.name} — {self.get_event_type_display()} at {self.created_at}"


# ---------------------------------------------------------------------------
# Forensic Events — real security incident records
# ---------------------------------------------------------------------------
class ForensicEvent(models.Model):
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    TYPE_CHOICES = [
        ('auth_failure', 'Auth Failure'),
        ('brute_force', 'Brute Force'),
        ('suspicious_access', 'Suspicious Access'),
        ('data_export', 'Data Export'),
        ('privilege_escalation', 'Privilege Escalation'),
        ('grade_tampering', 'Grade Tampering'),
        ('unauthorized_api', 'Unauthorized API Call'),
        ('other', 'Other'),
    ]
    event_type = models.CharField(max_length=50, choices=TYPE_CHOICES, db_index=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, db_index=True)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='forensic_events')
    actor_label = models.CharField(max_length=255, blank=True,
                                   help_text='Display label when actor is anonymous/unknown')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True,
                               related_name='forensic_events')
    resolved = models.BooleanField(default=False, db_index=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='resolved_forensic_events')
    resolved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Forensic Event'
        verbose_name_plural = 'Forensic Events'

    def __str__(self):
        return f"{self.get_event_type_display()} ({self.severity}) at {self.created_at}"


# ---------------------------------------------------------------------------
# Alert Broadcasts — superadmin-sent system-wide notifications
# ---------------------------------------------------------------------------
class AlertBroadcast(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('scheduled', 'Scheduled'),
    ]
    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]
    AUDIENCE_CHOICES = [
        ('all', 'All Users'),
        ('school_admins', 'School Admins'),
        ('superadmins', 'Super Admins'),
        ('specific_school', 'Specific School'),
    ]
    title = models.CharField(max_length=255)
    message = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info')
    audience = models.CharField(max_length=30, choices=AUDIENCE_CHOICES, default='all')
    target_school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True,
                                      related_name='broadcasts')
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='sent_broadcasts')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Alert Broadcast'
        verbose_name_plural = 'Alert Broadcasts'

    def __str__(self):
        return f"{self.title} ({self.status})"


# ---------------------------------------------------------------------------
# Admin Settings — per-user key-value store for preferences
# ---------------------------------------------------------------------------
class AdminSetting(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='admin_settings')
    key = models.CharField(max_length=100)
    value = models.JSONField(default=None, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'key')
        ordering = ['user', 'key']
        verbose_name = 'Admin Setting'
        verbose_name_plural = 'Admin Settings'

    def __str__(self):
        return f"{self.user.username} — {self.key}"


# ---------------------------------------------------------------------------
# Security Log Entries — real aggregated security event log
# ---------------------------------------------------------------------------
class SecurityLogEntry(models.Model):
    TYPE_CHOICES = [
        ('login_success', 'Login Success'),
        ('login_failure', 'Login Failure'),
        ('logout', 'Logout'),
        ('password_changed', 'Password Changed'),
        ('permission_changed', 'Permission Changed'),
        ('school_approved', 'School Approved'),
        ('school_rejected', 'School Rejected'),
        ('broadcast_sent', 'Broadcast Sent'),
        ('suspicious_activity', 'Suspicious Activity'),
        ('api_rate_limited', 'API Rate Limited'),
        ('profile_updated', 'Profile Updated'),
    ]
    SEVERITY_CHOICES = [
        ('info', 'Info'),
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    ]
    event_type = models.CharField(max_length=50, choices=TYPE_CHOICES, db_index=True)
    actor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='security_log_entries')
    actor_label = models.CharField(max_length=255, blank=True,
                                   help_text='Display label (email/username) for audit display')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    description = models.TextField(blank=True)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='info', db_index=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Security Log Entry'
        verbose_name_plural = 'Security Log Entries'

    def __str__(self):
        label = self.actor_label or (self.actor.username if self.actor else 'anonymous')
        return f"{self.get_event_type_display()} by {label} at {self.created_at}"


# ─────────────────────────────────────────────────────────────────
# ATTENDANCE
# ─────────────────────────────────────────────────────────────────

class Attendance(models.Model):
    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent',  'Absent'),
        ('late',    'Late'),
        ('excused', 'Excused'),
    ]
    school      = models.ForeignKey(School, on_delete=models.CASCADE, related_name='attendance_records')
    student     = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance')
    classroom   = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name='attendance_records')
    date        = models.DateField()
    status      = models.CharField(max_length=10, choices=STATUS_CHOICES, default='present')
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='recorded_attendance')
    notes       = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'date')
        ordering = ['-date', 'classroom', 'student']
        indexes = [
            models.Index(fields=['school', 'date']),
            models.Index(fields=['classroom', 'date']),
        ]

    def __str__(self):
        return f"{self.student} — {self.date} — {self.status}"


# ─────────────────────────────────────────────────────────────────
# FINANCE
# ─────────────────────────────────────────────────────────────────

class FeeRecord(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('partial', 'Partial'),
        ('paid',    'Paid'),
        ('overdue', 'Overdue'),
        ('waived',  'Waived'),
    ]
    school       = models.ForeignKey(School, on_delete=models.CASCADE, related_name='fee_records')
    student      = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='fees')
    term         = models.ForeignKey(Term, on_delete=models.SET_NULL, null=True, blank=True)
    description  = models.CharField(max_length=200, default='School Fees')
    amount       = models.DecimalField(max_digits=10, decimal_places=2)
    amount_paid  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    due_date     = models.DateField(null=True, blank=True)
    paid_date    = models.DateField(null=True, blank=True)
    status       = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    notes        = models.TextField(blank=True)
    recorded_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='recorded_fees')
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes  = [models.Index(fields=['school', 'status'])]

    def __str__(self):
        return f"{self.student} — {self.description} ({self.status})"

    @property
    def balance(self):
        return self.amount - self.amount_paid


class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('salaries',    'Salaries'),
        ('utilities',   'Utilities'),
        ('supplies',    'Supplies'),
        ('maintenance', 'Maintenance'),
        ('events',      'Events'),
        ('technology',  'Technology'),
        ('other',       'Other'),
    ]
    school       = models.ForeignKey(School, on_delete=models.CASCADE, related_name='expenses')
    title        = models.CharField(max_length=200)
    amount       = models.DecimalField(max_digits=10, decimal_places=2)
    category     = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='other')
    date         = models.DateField()
    description  = models.TextField(blank=True)
    recorded_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='recorded_expenses')
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        indexes  = [models.Index(fields=['school', 'date'])]

    def __str__(self):
        return f"{self.school} — {self.title} ({self.amount})"


# ─────────────────────────────────────────────────────────────────
# MESSAGING
# ─────────────────────────────────────────────────────────────────

class Message(models.Model):
    school         = models.ForeignKey(School, on_delete=models.CASCADE, related_name='messages')
    sender         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_school_messages')
    recipient_role = models.CharField(max_length=20, default='all',
                                      help_text='all | staff | students | parents')
    subject        = models.CharField(max_length=200, blank=True)
    body           = models.TextField()
    is_broadcast   = models.BooleanField(default=True)
    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes  = [models.Index(fields=['school', '-created_at'])]

    def __str__(self):
        return f"[{self.recipient_role}] {self.subject or 'No Subject'} — {self.sender}"

# ─────────────────────────────────────────────────────────────────
# EXAM SYSTEM
# ─────────────────────────────────────────────────────────────────

class Exam(models.Model):
    EXAM_TYPES = [
        ('ca',      'Continuous Assessment'),
        ('midterm', 'Mid-Term'),
        ('final',   'Final Exam'),
        ('mock',    'Mock Exam'),
        ('quiz',    'Quiz'),
    ]
    school      = models.ForeignKey(School, on_delete=models.CASCADE, related_name='exams')
    classroom   = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name='exams')
    subject     = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='exams')
    term        = models.ForeignKey(Term, on_delete=models.SET_NULL, null=True, blank=True, related_name='exams')
    name        = models.CharField(max_length=200)
    exam_type   = models.CharField(max_length=10, choices=EXAM_TYPES, default='final')
    total_marks = models.DecimalField(max_digits=6, decimal_places=2, default=100)
    date        = models.DateField()
    is_active   = models.BooleanField(default=True)
    created_by  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_exams')
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date']
        indexes  = [models.Index(fields=['school', '-date'])]

    def __str__(self):
        return f"{self.name} — {self.classroom} ({self.subject})"


class ExamResult(models.Model):
    exam            = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='results')
    student         = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='exam_results')
    marks_obtained  = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    grade_letter    = models.CharField(max_length=2, blank=True)
    remarks         = models.TextField(blank=True)
    graded_by       = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='graded_results')
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('exam', 'student')
        ordering        = ['student']

    def save(self, *args, **kwargs):
        if self.exam_id and self.exam.total_marks:
            pct = float(self.marks_obtained) / float(self.exam.total_marks) * 100
            self.grade_letter = ('A' if pct >= 80 else 'B' if pct >= 65 else
                                 'C' if pct >= 50 else 'D' if pct >= 40 else 'F')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.student} — {self.exam.name}: {self.marks_obtained}/{self.exam.total_marks}"


# ─────────────────────────────────────────────────────────────────
# NOTIFICATION SYSTEM
# ─────────────────────────────────────────────────────────────────

class Notification(models.Model):
    TYPE_CHOICES = [
        ('info',    'Info'),
        ('success', 'Success'),
        ('warning', 'Warning'),
        ('alert',   'Alert'),
    ]
    school          = models.ForeignKey(School, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    title           = models.CharField(max_length=200)
    body            = models.TextField()
    notif_type      = models.CharField(max_length=10, choices=TYPE_CHOICES, default='info')
    recipient_role  = models.CharField(max_length=20, default='all',
                                       help_text='all | staff | students | parents')
    recipient_user  = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                        related_name='personal_notifications',
                                        help_text='If set, only this user sees the notification')
    sender          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='sent_notifications')
    is_active       = models.BooleanField(default=True)
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes  = [models.Index(fields=['school', '-created_at'])]

    def __str__(self):
        return f"[{self.notif_type.upper()}] {self.title}"


class NotificationRead(models.Model):
    notification = models.ForeignKey(Notification, on_delete=models.CASCADE, related_name='reads')
    user         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notification_reads')
    read_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('notification', 'user')

    def __str__(self):
        return f"{self.user} read {self.notification}"


# ─────────────────────────────────────────────────────────────────
# TIMETABLE
# ─────────────────────────────────────────────────────────────────

class TimetableSlot(models.Model):
    DAY_CHOICES = [
        (0, 'Monday'), (1, 'Tuesday'), (2, 'Wednesday'),
        (3, 'Thursday'), (4, 'Friday'),
    ]
    school        = models.ForeignKey(School, on_delete=models.CASCADE, related_name='timetable_slots')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True, blank=True, related_name='timetable_slots')
    classroom     = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name='timetable_slots')
    subject       = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='timetable_slots')
    teacher       = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True, related_name='timetable_slots')
    day_of_week   = models.IntegerField(choices=DAY_CHOICES)
    period_number = models.IntegerField(help_text='Period 1–8')
    start_time    = models.TimeField(null=True, blank=True)
    end_time      = models.TimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('classroom', 'day_of_week', 'period_number')
        ordering        = ['classroom', 'day_of_week', 'period_number']

    def __str__(self):
        return f"{self.classroom} | Day {self.day_of_week} P{self.period_number} — {self.subject}"


# ─────────────────────────────────────────────────────────────────
# CLASS-SUBJECT ALLOCATION
# ─────────────────────────────────────────────────────────────────

class ClassSubject(models.Model):
    """Which subjects a class offers in a given academic year (independent of teacher assignment)."""
    classroom     = models.ForeignKey(ClassRoom, on_delete=models.CASCADE, related_name='class_subjects')
    subject       = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='class_allocations')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='class_subjects')
    is_active     = models.BooleanField(default=True)
    created_at    = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('classroom', 'subject', 'academic_year')
        ordering        = ['classroom', 'subject__name']
        verbose_name        = 'Class Subject'
        verbose_name_plural = 'Class Subjects'

    def __str__(self):
        return f"{self.classroom.name} — {self.subject.name} ({self.academic_year.name})"


# ─────────────────────────────────────────────────────────────────
# GRADE MODIFICATION REQUESTS
# ─────────────────────────────────────────────────────────────────

class GradeModificationRequest(models.Model):
    STATUS_CHOICES = [
        ('pending',   'Pending Admin Review'),
        ('approved',  'Approved'),
        ('rejected',  'Rejected'),
        ('withdrawn', 'Withdrawn'),
    ]
    grade          = models.ForeignKey(Grade, on_delete=models.CASCADE, related_name='modification_requests')
    requested_by   = models.ForeignKey(User, on_delete=models.CASCADE, related_name='grade_mod_requests')
    current_score  = models.DecimalField(max_digits=5, decimal_places=2)
    proposed_score = models.DecimalField(max_digits=5, decimal_places=2)
    reason         = models.TextField(help_text="Detailed reason for the modification request")
    evidence_file  = models.FileField(upload_to='mod_evidence/', null=True, blank=True)
    status         = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending', db_index=True)
    reviewed_by    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name='grade_mod_reviews')
    review_reason  = models.TextField(blank=True)
    created_at     = models.DateTimeField(auto_now_add=True, db_index=True)
    reviewed_at    = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering            = ['-created_at']
        verbose_name        = 'Grade Modification Request'
        verbose_name_plural = 'Grade Modification Requests'

    def __str__(self):
        return f"ModRequest #{self.id} — {self.grade} [{self.status}]"


# ─────────────────────────────────────────────────────────────────
# USER SESSION TOKENS  (for logout-all-sessions)
# ─────────────────────────────────────────────────────────────────

class UserToken(models.Model):
    """Tracks active login tokens so we can invalidate all sessions for a user."""
    user       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='active_tokens')
    token      = models.CharField(max_length=200, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used  = models.DateTimeField(auto_now=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering            = ['-created_at']
        verbose_name        = 'User Token'
        verbose_name_plural = 'User Tokens'

    def __str__(self):
        return f"{self.user.username} — token …{self.token[-8:]}"


# ─────────────────────────────────────────────────────────────────
# ROOMS  (physical spaces for timetabling)
# ─────────────────────────────────────────────────────────────────

class Room(models.Model):
    ROOM_TYPES = [
        ('classroom',   'Classroom'),
        ('laboratory',  'Laboratory'),
        ('library',     'Library'),
        ('hall',        'Assembly Hall'),
        ('gymnasium',   'Gymnasium'),
        ('other',       'Other'),
    ]
    school      = models.ForeignKey(School, on_delete=models.CASCADE, related_name='rooms')
    name        = models.CharField(max_length=100)
    code        = models.CharField(max_length=20, blank=True)
    room_type   = models.CharField(max_length=20, choices=ROOM_TYPES, default='classroom')
    capacity    = models.PositiveIntegerField(default=30)
    is_active   = models.BooleanField(default=True)
    notes       = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('school', 'name')
        ordering = ['name']
        verbose_name = 'Room'
        verbose_name_plural = 'Rooms'

    def __str__(self):
        return f"{self.name} ({self.school.name})"


# ─────────────────────────────────────────────────────────────────
# GRADING SCHEME  (configurable grade boundaries per school)
# ─────────────────────────────────────────────────────────────────

class GradingScheme(models.Model):
    school      = models.OneToOneField(School, on_delete=models.CASCADE, related_name='grading_scheme')
    pass_mark   = models.PositiveSmallIntegerField(default=50, help_text="Minimum score to pass (out of 100)")
    # JSON list of {letter, min, max, color, gpa} objects, ordered highest→lowest
    boundaries  = models.JSONField(default=list, help_text="Grade boundary definitions")
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Grading Scheme'
        verbose_name_plural = 'Grading Schemes'

    def __str__(self):
        return f"Grading scheme — {self.school.name}"

    @classmethod
    def default_boundaries(cls):
        return [
            {'letter': 'A+', 'min': 90, 'max': 100, 'color': '#22c55e', 'gpa': 4.0},
            {'letter': 'A',  'min': 80, 'max': 89,  'color': '#4ade80', 'gpa': 4.0},
            {'letter': 'B',  'min': 65, 'max': 79,  'color': '#3b82f6', 'gpa': 3.0},
            {'letter': 'C',  'min': 50, 'max': 64,  'color': '#f59e0b', 'gpa': 2.0},
            {'letter': 'D',  'min': 40, 'max': 49,  'color': '#f97316', 'gpa': 1.0},
            {'letter': 'F',  'min': 0,  'max': 39,  'color': '#ef4444', 'gpa': 0.0},
        ]
