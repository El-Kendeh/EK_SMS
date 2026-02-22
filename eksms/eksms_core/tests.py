from django.test import TestCase
from django.contrib.auth.models import User
from .models import (
    AcademicYear,
    Term,
    Subject,
    ClassRoom,
    Teacher,
    Student,
    Parent,
    ParentStudent,
    TeacherSubjectClass,
)
from datetime import date


class AcademicYearTestCase(TestCase):
    """Test cases for AcademicYear model"""

    def setUp(self):
        self.year = AcademicYear.objects.create(
            name="2024-2025",
            start_date=date(2024, 1, 10),
            end_date=date(2024, 12, 20),
            is_active=True,
        )

    def test_academic_year_creation(self):
        """Test AcademicYear model creation"""
        self.assertEqual(self.year.name, "2024-2025")
        self.assertTrue(self.year.is_active)

    def test_academic_year_str(self):
        """Test AcademicYear string representation"""
        self.assertEqual(str(self.year), "2024-2025")


class TermTestCase(TestCase):
    """Test cases for Term model"""

    def setUp(self):
        self.year = AcademicYear.objects.create(
            name="2024-2025",
            start_date=date(2024, 1, 10),
            end_date=date(2024, 12, 20),
        )
        self.term = Term.objects.create(
            academic_year=self.year,
            name='TERM1',
            start_date=date(2024, 1, 10),
            end_date=date(2024, 4, 20),
            is_active=True,
        )

    def test_term_creation(self):
        """Test Term model creation"""
        self.assertEqual(self.term.name, 'TERM1')
        self.assertEqual(self.term.academic_year, self.year)

    def test_term_unique_together(self):
        """Test unique_together constraint"""
        with self.assertRaises(Exception):
            Term.objects.create(
                academic_year=self.year,
                name='TERM1',  # Duplicate
                start_date=date(2024, 5, 10),
                end_date=date(2024, 8, 20),
            )


class SubjectTestCase(TestCase):
    """Test cases for Subject model"""

    def setUp(self):
        self.subject = Subject.objects.create(
            name="Mathematics",
            code="MATH",
            description="Basic mathematics",
            is_active=True,
        )

    def test_subject_creation(self):
        """Test Subject model creation"""
        self.assertEqual(self.subject.name, "Mathematics")
        self.assertEqual(self.subject.code, "MATH")
        self.assertTrue(self.subject.is_active)


class ClassRoomTestCase(TestCase):
    """Test cases for ClassRoom model"""

    def setUp(self):
        self.classroom = ClassRoom.objects.create(
            name="Grade 10A",
            code="G10A",
            form_number=10,
            capacity=50,
            is_active=True,
        )

    def test_classroom_creation(self):
        """Test ClassRoom model creation"""
        self.assertEqual(self.classroom.name, "Grade 10A")
        self.assertEqual(self.classroom.form_number, 10)

    def test_classroom_str(self):
        """Test ClassRoom string representation"""
        self.assertEqual(str(self.classroom), "Grade 10A")


class TeacherTestCase(TestCase):
    """Test cases for Teacher model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='johndoe',
            first_name='John',
            last_name='Doe',
        )
        self.teacher = Teacher.objects.create(
            user=self.user,
            employee_id="EMP001",
            phone_number="555-1234",
            qualification="B.Sc Education",
            is_active=True,
        )

    def test_teacher_creation(self):
        """Test Teacher model creation"""
        self.assertEqual(self.teacher.employee_id, "EMP001")
        self.assertEqual(self.teacher.user, self.user)


class StudentTestCase(TestCase):
    """Test cases for Student model"""

    def setUp(self):
        self.year = AcademicYear.objects.create(
            name="2024-2025",
            start_date=date(2024, 1, 10),
            end_date=date(2024, 12, 20),
        )
        self.classroom = ClassRoom.objects.create(
            name="Grade 10A",
            code="G10A",
            form_number=10,
            capacity=50,
        )
        self.user = User.objects.create_user(
            username='janedoe',
            first_name='Jane',
            last_name='Doe',
        )
        self.student = Student.objects.create(
            user=self.user,
            admission_number="ADM001",
            classroom=self.classroom,
            academic_year=self.year,
            is_active=True,
        )

    def test_student_creation(self):
        """Test Student model creation"""
        self.assertEqual(self.student.admission_number, "ADM001")
        self.assertEqual(self.student.classroom, self.classroom)

    def test_student_passport_picture(self):
        """Test Student can have passport picture"""
        self.assertFalse(self.student.passport_picture)
        # Passport picture is optional
        self.student.passport_picture = None
        self.student.save()
        self.assertFalse(self.student.passport_picture)


class ParentTestCase(TestCase):
    """Test cases for Parent model"""

    def setUp(self):
        self.user = User.objects.create_user(
            username='parentuser',
            first_name='Parent',
            last_name='User',
            email='parent@example.com'
        )
        self.parent = Parent.objects.create(
            user=self.user,
            phone_number="555-5678",
            relationship="Father",
            occupation="Engineer",
            is_active=True,
        )

    def test_parent_creation(self):
        """Test Parent model creation"""
        self.assertEqual(self.parent.phone_number, "555-5678")
        self.assertEqual(self.parent.relationship, "Father")

    def test_parent_password_management(self):
        """Test parent password can be set for login"""
        original_password = self.user.password
        new_password = "NewSecurePassword123!"
        self.user.set_password(new_password)
        self.user.save()
        
        # Verify password was changed
        self.assertNotEqual(self.user.password, original_password)
        # Verify user can authenticate with new password
        self.assertTrue(self.user.check_password(new_password))

    def test_parent_has_linked_students(self):
        """Test parent can be linked to students"""
        year = AcademicYear.objects.create(
            name="2024-2025",
            start_date=date(2024, 1, 10),
            end_date=date(2024, 12, 20),
        )
        classroom = ClassRoom.objects.create(
            name="Grade 10A",
            code="G10A",
            form_number=10,
            capacity=50,
        )
        student_user = User.objects.create_user(
            username='student1',
            first_name='John',
            last_name='Doe',
        )
        student = Student.objects.create(
            user=student_user,
            admission_number="ADM002",
            classroom=classroom,
            academic_year=year,
        )
        
        # Link parent to student
        link = ParentStudent.objects.create(
            parent=self.parent,
            student=student,
            is_primary_contact=True,
        )
        
        # Verify link exists
        self.assertEqual(self.parent.student_links.count(), 1)
        self.assertEqual(link.parent, self.parent)
        self.assertEqual(link.student, student)
