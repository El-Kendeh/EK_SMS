#!/usr/bin/env python
"""Test all Student fields to verify database alignment."""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings')
django.setup()

from django.contrib.auth.models import User
from eksms_core.models import School, Student, AcademicYear, ClassRoom
from datetime import date

# Get or create a school
schools = School.objects.all()
if not schools.exists():
    print("ERROR: No schools found in database")
    exit(1)

school = schools.first()
print(f"✓ Using school: {school.name}")

# Check if active academic year exists
active_year = AcademicYear.objects.filter(school=school, is_active=True).first()
if not active_year:
    print("ERROR: No active academic year for this school")
    exit(1)

print(f"✓ Active academic year: {active_year.name}")

# Get a classroom
classroom = ClassRoom.objects.filter(school=school).first()
if not classroom:
    print("ERROR: No classrooms found")
    exit(1)

print(f"✓ Using classroom: {classroom.name}")

# Try to create a test student
try:
    # Create a user
    test_user = User.objects.create_user(
        username='test_stu_001',
        email='test@example.com',
        first_name='Test',
        last_name='Student',
        password='testpass123'
    )
    print(f"✓ Created user: {test_user.username}")
    
    # Create a student with all the new fields
    student = Student.objects.create(
        school=school,
        user=test_user,
        admission_number='TST/2026/0001',
        classroom=classroom,
        academic_year=active_year,
        date_of_birth=date(2010, 5, 15),
        gender='M',
        place_of_birth='Freetown',
        nationality='Sierra Leonean',
        religion='Christianity',
        home_address='123 Main St',
        city='Freetown',
        phone_number='+23276123456',
        blood_type='O+',
        allergies='Peanuts',
        medical_notes='Asthma',
        is_critical_medical=True,
        vaccinations={'bcg': '2010-06-01', 'opv': '2010-07-01'},
        sen_tier='mild',
        disciplinary_history=False,
        student_type='day',
        fee_category='full_paying',
        status='active',
        documents_birth_certificate=True,
        documents_passport_photo=True,
    )
    print(f"✓ Created student: {student.user.get_full_name()}")
    print(f"  - Admission Number: {student.admission_number}")
    print(f"  - Place of Birth: {student.place_of_birth}")
    print(f"  - Nationality: {student.nationality}")
    print(f"  - SEN Tier: {student.sen_tier}")
    print(f"  - Is Critical Medical: {student.is_critical_medical}")
    print(f"  - Vaccinations: {student.vaccinations}")
    print(f"\n✓ All fields saved successfully!")
    
except Exception as e:
    print(f"ERROR creating student: {e}")
    import traceback
    traceback.print_exc()
    exit(1)
