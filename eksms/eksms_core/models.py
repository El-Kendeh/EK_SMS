from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator
from django.utils import timezone


class AcademicYear(models.Model):
    """Represents an academic year (e.g., 2024-2025)"""
    name = models.CharField(max_length=100, unique=True, help_text="e.g., 2024-2025")
    start_date = models.DateField(help_text="Academic year start date")
    end_date = models.DateField(help_text="Academic year end date")
    is_active = models.BooleanField(default=False, help_text="Only one year should be active at a time")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-start_date']
        verbose_name_plural = "Academic Years"

    def __str__(self):
        return self.name


class Term(models.Model):
    """Represents a term within an academic year"""
    TERM_CHOICES = [
        ('TERM1', 'Term 1'),
        ('TERM2', 'Term 2'),
        ('TERM3', 'Term 3'),
    ]
    
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='terms')
    name = models.CharField(max_length=20, choices=TERM_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('academic_year', 'name')
        ordering = ['academic_year', 'name']

    def __str__(self):
        return f"{self.academic_year.name} - {self.get_name_display()}"


class Subject(models.Model):
    """Represents a school subject"""
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.code})"


class ClassRoom(models.Model):
    """Represents a class/form (e.g., Grade 10A, Grade 10B)"""
    name = models.CharField(max_length=50, help_text="e.g., Grade 10A")
    code = models.CharField(max_length=20, unique=True)
    form_number = models.IntegerField(validators=[MinValueValidator(1)], help_text="Form/Grade number (e.g., 10)")
    capacity = models.IntegerField(default=50)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['form_number', 'name']
        verbose_name = "Class"
        verbose_name_plural = "Classes"

    def __str__(self):
        return self.name


class Teacher(models.Model):
    """Represents a teacher"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='teacher_profile')
    employee_id = models.CharField(max_length=50, unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    qualification = models.CharField(max_length=255, blank=True)
    hire_date = models.DateField(default=timezone.now)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['user__last_name', 'user__first_name']

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
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile')
    admission_number = models.CharField(max_length=50, unique=True)
    classroom = models.ForeignKey(ClassRoom, on_delete=models.SET_NULL, null=True, related_name='students')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True)
    admission_date = models.DateField(default=timezone.now)
    date_of_birth = models.DateField(blank=True, null=True)
    phone_number = models.CharField(max_length=20, blank=True)
    passport_picture = models.ImageField(upload_to='student_passports/', blank=True, null=True, help_text="Student passport/ID photo")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['classroom', 'user__last_name', 'user__first_name']

    def __str__(self):
        return f"{self.user.get_full_name()} ({self.admission_number})"


class Parent(models.Model):
    """Represents a parent/guardian"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='parent_profile')
    phone_number = models.CharField(max_length=20)
    relationship = models.CharField(max_length=50, help_text="e.g., Father, Mother, Guardian")
    occupation = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
        ('A', 'A (90-100)'),
        ('B', 'B (80-89)'),
        ('C', 'C (70-79)'),
        ('D', 'D (60-69)'),
        ('E', 'E (0-59)'),
        ('I', 'Incomplete'),
    ]
    
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='grades')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='grades')
    teacher = models.ForeignKey(Teacher, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Score breakdown (raw marks)
    continuous_assessment = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
        help_text="Continuous Assessment / Class Work (0-20)"
    )
    mid_term_exam = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
        help_text="Mid-term Exam Score (0-30)"
    )
    final_exam = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        validators=[MinValueValidator(0)],
        help_text="Final Exam Score (0-50)"
    )
    
    # Calculated fields
    total_score = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Auto-calculated: CA + Mid-term + Final (max 100)"
    )
    grade_letter = models.CharField(
        max_length=1, choices=GRADE_SCALE, default='I',
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
        """Convert score to letter grade"""
        if self.total_score >= 90:
            self.grade_letter = 'A'
        elif self.total_score >= 80:
            self.grade_letter = 'B'
        elif self.total_score >= 70:
            self.grade_letter = 'C'
        elif self.total_score >= 60:
            self.grade_letter = 'D'
        elif self.total_score > 0:
            self.grade_letter = 'E'
        else:
            self.grade_letter = 'I'

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
        ('CREATE', 'Grade Created'),
        ('UPDATE', 'Grade Updated'),
        ('LOCK', 'Grade Locked'),
        ('UNLOCK', 'Grade Unlocked'),
        ('VIEW', 'Grade Viewed'),
        ('DELETE_ATTEMPT', 'Delete Attempt'),
        ('ARCHIVE', 'Grade Archived'),
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
    pdf_file = models.FileField(upload_to='report_cards/', null=True, blank=True)
    qr_code = models.CharField(max_length=255, null=True, blank=True, help_text="QR code for verification")
    
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
