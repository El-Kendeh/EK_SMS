# School Multi-Tenancy Implementation Technical Guide

## Architecture Overview

This document provides a technical overview of the multi-tenancy implementation for the EK-SMS system.

## Database Schema

### Core Models

```sql
-- School table (new)
CREATE TABLE eksms_core_school (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(254) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    principal_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    registration_date DATETIME AUTO_NOW_ADD,
    created_by_id INTEGER FOREIGN KEY,
    created_at DATETIME AUTO_NOW_ADD,
    updated_at DATETIME AUTO_NOW,
    FOREIGN KEY (created_by_id) REFERENCES auth_user(id)
);

-- SchoolAdmin table (new)
CREATE TABLE eksms_core_schooladmin (
    id INTEGER PRIMARY KEY,
    user_id INTEGER UNIQUE FOREIGN KEY,
    school_id INTEGER UNIQUE FOREIGN KEY,
    job_title VARCHAR(100),
    can_manage_academics BOOLEAN DEFAULT TRUE,
    can_manage_teachers BOOLEAN DEFAULT TRUE,
    can_manage_students BOOLEAN DEFAULT TRUE,
    can_manage_grades BOOLEAN DEFAULT TRUE,
    can_manage_reports BOOLEAN DEFAULT TRUE,
    can_view_audit_logs BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    appointed_date DATETIME AUTO_NOW_ADD,
    updated_at DATETIME AUTO_NOW,
    FOREIGN KEY (user_id) REFERENCES auth_user(id),
    FOREIGN KEY (school_id) REFERENCES eksms_core_school(id)
);

-- Updated models include school_id foreign key
ALTER TABLE eksms_core_academicyear ADD COLUMN school_id INTEGER NULL FOREIGN KEY;
ALTER TABLE eksms_core_subject ADD COLUMN school_id INTEGER NULL FOREIGN KEY;
ALTER TABLE eksms_core_classroom ADD COLUMN school_id INTEGER NULL FOREIGN KEY;
ALTER TABLE eksms_core_teacher ADD COLUMN school_id INTEGER NULL FOREIGN KEY;
ALTER TABLE eksms_core_student ADD COLUMN school_id INTEGER NULL FOREIGN KEY;
ALTER TABLE eksms_core_parent ADD COLUMN school_id INTEGER NULL FOREIGN KEY;

-- Unique constraints updated to include school
ALTER TABLE eksms_core_academicyear ADD UNIQUE (school_id, name);
ALTER TABLE eksms_core_subject ADD UNIQUE (school_id, code);
ALTER TABLE eksms_core_classroom ADD UNIQUE (school_id, code);
ALTER TABLE eksms_core_teacher ADD UNIQUE (school_id, employee_id);
ALTER TABLE eksms_core_student ADD UNIQUE (school_id, admission_number);
```

## Admin Interface Implementation

### Mixin Classes

#### SuperAdminRequiredMixin
Restricts access to super admin users only. Used for School and SchoolAdmin management.

```python
class SuperAdminRequiredMixin:
    """Mixin to ensure only super admins can access this admin"""
    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def has_add_permission(self, request):
        return request.user.is_superuser
    
    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
```

#### SchoolFilterMixin
Automatically filters data by school for non-super-admin users.

```python
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
```

### Admin Class Registration

All academic data admin classes use the `SchoolFilterMixin`:

```python
@admin.register(AcademicYear)
class AcademicYearAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['school', 'name', 'start_date', 'end_date', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at', 'school']
    search_fields = ['name', 'school__name']
    # ...
```

## Authorization Flow

### Step 1: User Authentication
```
User Login
  → Django checks credentials
  → Generates session/token
  → Loads user object
```

### Step 2: Admin Access Check
```
Admin Page Request (user authenticated)
  → Django checks is_staff = True
  → Check SuperAdminRequiredMixin or SchoolFilterMixin
  → Allow/Deny access
```

### Step 3: Data Filtering
```
When loading list view:
  → SchoolFilterMixin.get_queryset(request)
  → If NOT superuser:
      → Get user.school_admin_profile.school
      → Filter: Model.objects.filter(school=school)
  → Display filtered results
```

### Step 4: Foreign Key Form Filtering
```
When editing related records:
  → formfield_for_foreignkey() checks user type
  → If NOT superuser:
      → Get user's school
      → Limit queryset to only that school's related objects
      → Only users can select from their school's data
```

## Data Flow Example

### Scenario: School Admin Creates a Student

```
1. School Admin clicks "Add Student"
   └─ StudentAdmin.add_view() called
   
2. Django renders form with foreign keys
   └─ formfield_for_foreignkey('classroom', request)
   └─ Checks: not superuser + has school_admin_profile
   └─ Gets: scheme = user.school_admin_profile.school
   └─ Filters: ClassRoom.objects.filter(school=school)
   └─ Only that school's classrooms appear in dropdown
   
3. Admin selects classroom and fills data
   └─ Form submitted
   
4. Django calls save_model()
   └─ Validates data
   └─ Ensures school_id matches user's school
   └─ Saves to database
   
5. Django redirects to list view
   └─ get_queryset() filters by school
   └─ New student appears in their school's list only
```

## Query Optimization

### Filtering at Database Level
Queries are generated at the database level for efficiency:

```python
# Before: (no filtering)
SELECT * FROM eksms_core_academicyear

# After: (with school filtering)
SELECT * FROM eksms_core_academicyear 
WHERE school_id = 5
```

### Prefetch and Select Related
For performance, use select_related and prefetch_related:

```python
class AcademicYearAdmin(SchoolFilterMixin, admin.ModelAdmin):
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        # Reduce database queries
        return qs.select_related('school', 'created_by')
```

## Security Considerations

### 1. Query Parameter Injection Prevention

Django ORM automatically escapes parameters:
```python
# Safe: Django safely converts 5 to SQL parameter
queryset.filter(school=school)  # ✓ Safe

# Not allowed: Don't use string concatenation
queryset.filter(f"school_id = {school_id}")  # ✗ Unsafe
```

### 2. Permission Escalation Prevention

```python
# Admin views check is_superuser
def has_delete_permission(self, request, obj=None):
    return request.user.is_superuser  # Only superuser can delete

# Form field filtering prevents selection of other schools' data
# Even if user manually crafts URL, ORM filtering applies
queryset = queryset.filter(school=user_school)  # Always filtered
```

### 3. Audit Trail (Immutable Logs)

All grade changes logged automatically:
```python
class Grade(models.Model):
    # ... fields ...
    
    def save(self, *args, **kwargs):
        # Calculate before save
        self.calculate_total()
        
        # Call parent save
        super().save(*args, **kwargs)
        
        # Log after save (via signals or views)
        GradeAuditLog.objects.create(
            grade=self,
            action='UPDATE' if hasattr(self, 'pk') else 'CREATE',
            actor=request.user,
            old_values={...},
            new_values={...},
            record_hash=compute_hash()
        )
```

## Frontend Integration

### Accessing School Context from Django Templates

```python
# In a view
@login_required
def my_view(request):
    if hasattr(request.user, 'school_admin_profile'):
        school = request.user.school_admin_profile.school
        context = {'school': school}
    else:
        # Super admin or regular user
        context = {}
    return render(request, 'template.html', context)
```

### React/Frontend Integration

```javascript
// Get current user's school (via API)
async function getUserSchool() {
    const response = await fetch('/api/user-school/');
    const data = await response.json();
    return data.school;  // School object or null for superuser
}

// Filter displayed data to current school
const students = allStudents.filter(s => s.school_id === currentSchool.id);
```

## API Considerations (Future)

### DRF (Django Rest Framework) Integration

```python
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

class AcademicYearViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filter by user's school"""
        user = self.request.user
        if user.is_superuser:
            return AcademicYear.objects.all()
        
        school = user.school_admin_profile.school
        return AcademicYear.objects.filter(school=school)
```

## Testing Strategy

### Unit Tests

```python
from django.test import TestCase
from django.contrib.auth.models import User

class SchoolAdminFilteringTest(TestCase):
    
    def setUp(self):
        # Create schools
        self.school1 = School.objects.create(name="School 1", code="S1")
        self.school2 = School.objects.create(name="School 2", code="S2")
        
        # Create school admins
        self.admin_user = User.objects.create_user(
            username='admin1', is_staff=True
        )
        self.school_admin1 = SchoolAdmin.objects.create(
            user=self.admin_user,
            school=self.school1
        )
        
        # Create data
        self.year1 = AcademicYear.objects.create(
            school=self.school1,
            name="2024-2025"
        )
        self.year2 = AcademicYear.objects.create(
            school=self.school2,
            name="2024-2025"
        )
    
    def test_school_admin_sees_only_own_school_data(self):
        # Simulate admin request
        factory = RequestFactory()
        request = factory.get('/')
        request.user = self.admin_user
        
        # Get filtered queryset
        admin = AcademicYearAdmin(AcademicYear, AdminSite())
        qs = admin.get_queryset(request)
        
        # Assert only sees school1 data
        self.assertEqual(list(qs), [self.year1])
        self.assertNotIn(self.year2, qs)
```

### Integration Tests

```python
class MultiSchoolIntegrationTest(TestCase):
    
    def test_complete_workflow(self):
        # 1. Super admin registers schools
        school1 = self._register_school("School A", "SA-001")
        school2 = self._register_school("School B", "SB-001")
        
        # 2. Assign admins
        admin1 = self._create_and_assign_admin("admin1", school1)
        admin2 = self._create_and_assign_admin("admin2", school2)
        
        # 3. Each admin adds data
        year1 = self._add_academic_year(admin1, "2024-2025", school1)
        year2 = self._add_academic_year(admin2, "2024-2025", school2)
        
        # 4. Verify isolation
        admin1_years = AcademicYear.objects.filter(school=school1)
        admin2_years = AcademicYear.objects.filter(school=school2)
        
        self.assertEqual(len(admin1_years), 1)
        self.assertEqual(len(admin2_years), 1)
        self.assertNotEqual(admin1_years[0].id, admin2_years[0].id)
```

## Migrations Management

### Migration Files Structure

```
eksms_core/migrations/
├── 0001_initial.py           # Original models
├── 0002_student_passport_picture.py
├── 0003_reportcard_grade_classranking.py
├── 0004_gradeverification_gradechangealert_gradeauditlog.py
└── 0005_school_alter_academicyear_name_...py  # NEW: School implementation
    ├── - Create model School
    ├── - Create model SchoolAdmin
    ├── - Add field school to AcademicYear
    ├── - Add field school to Term
    ├── - Add field school to Subject
    ├── - Add field school to ClassRoom
    ├── - Add field school to Teacher
    ├── - Add field school to Student
    ├── - Add field school to Parent
    ├── - Update unique_together constraints
    └── - Alter existing unique constraints
```

### Running Migrations

```bash
# Create migration (automatically detects changes)
python manage.py makemigrations eksms_core

# Apply migration
python manage.py migrate eksms_core

# Check migration status
python manage.py showmigrations eksms_core

# Reverse to previous migration (if needed)
python manage.py migrate eksms_core 0004_gradeverification_gradechangealert_gradeauditlog
```

## Performance Tuning

### Database Indexes

Add indexes for frequently filtered/searched fields:

```python
class School(models.Model):
    # ... fields ...
    
    class Meta:
        indexes = [
            models.Index(fields=['code']),  # Frequently searched
            models.Index(fields=['is_active', 'created_at']),
            models.Index(fields=['code', 'is_active']),
        ]
```

### Query Optimization

```python
# BAD: N+1 queries
for year in AcademicYear.objects.all():
    print(year.school.name)  # Separate query for each year

# GOOD: Prefetch related
years = AcademicYear.objects.select_related('school')
for year in years:
    print(year.school.name)  # No additional queries
```

## Deployment Considerations

### Environment Setup
```bash
# .env or settings
SHOULD_FILTER_BY_SCHOOL=True  # Feature flag
SCHOOL_LOGO_UPLOAD_DIR=/var/uploads/schools/
```

### Data Migration from Single-School to Multi-School
```bash
# Step 1: Create default school
python manage.py shell
>>> from eksms_core.models import School
>>> default = School.objects.create(
...     name="Default School",
...     code="DEFAULT"
... )

# Step 2: Assign all existing data to default school
python manage.py shell
>>> from eksms_core.models import *
>>> AcademicYear.objects.all().update(school=default)
>>> Teacher.objects.all().update(school=default)
>>> Student.objects.all().update(school=default)
# ... repeat for all models
```

## Troubleshooting Guide

### Common Issues

#### Issue 1: "Cannot add non-nullable field" during migration
**Cause:** School field added without null=True/blank=True  
**Solution:** 
```python
school = models.ForeignKey(
    School, 
    on_delete=models.CASCADE, 
    null=True,  # Add this
    blank=True  # Add this
)
```

#### Issue 2: School admin sees all data
**Cause:** get_queryset() not properly filtering  
**Solution:**
```python
def get_queryset(self, request):
    qs = super().get_queryset(request)
    if not request.user.is_superuser:
        school = self.get_school_for_user(request.user)
        return qs.filter(school=school)
    return qs
```

#### Issue 3: Permission denied for school admin
**Cause:** User doesn't have is_staff=True or SchoolAdmin profile  
**Solution:**
1. Ensure user.is_staff = True
2. Ensure SchoolAdmin record exists
3. Ensure SchoolAdmin.is_active = True

## Version History

- **v1.0** (Feb 23, 2026): Initial multi-tenancy implementation
  - School registration
  - SchoolAdmin assignment
  - Data filtering
  - Audit logging

## Related Documentation

- [School Admin Guide](./SCHOOL_ADMIN_GUIDE.md)
- [Testing Guide](./SCHOOL_ADMIN_TESTING.md)
- Django Multi-tenancy patterns: [Link]
- Django Admin Customization: [Link]

---

**Documentation Version:** 1.0  
**Last Updated:** February 23, 2026
