# School Registration and Admin Management Guide

## Overview

This guide explains how to implement the school registration system where super admins can register schools and assign school admins who manage their own school's academic operations.

## System Architecture

### Models

#### 1. **School Model**
Represents a school in the system. Only super admins can create, edit, or delete schools.

**Fields:**
- `name` - School name (unique)
- `code` - School identification code (unique)
- `email` - School contact email
- `phone` - School contact phone number
- `address` - School physical address
- `principal_name` - Name of the school principal/headmaster
- `is_active` - Whether school is active
- `created_by` - Super admin user who registered the school
- `registration_date` - When school was registered

#### 2. **SchoolAdmin Model**
Links a user account to a school as an administrator with specific permissions.

**Fields:**
- `user` - OneToOne link to Django User (must be staff user)
- `school` - OneToOne link to School
- `job_title` - Position title (e.g., "School Administrator")
- `is_active` - Whether admin account is active

**Permissions (Boolean Flags):**
- `can_manage_academics` - Manage academic years, terms, and classes
- `can_manage_teachers` - Add/edit teacher accounts and assignments
- `can_manage_students` - Register and manage student records
- `can_manage_grades` - Enter and manage student grades
- `can_manage_reports` - Generate and publish report cards
- `can_view_audit_logs` - View grade audit logs

### Data Isolation

All academic data models now include a `school` foreign key:
- `AcademicYear`
- `Term`
- `Subject`
- `ClassRoom`
- `Teacher`
- `Student`
- `Parent`
- `Grade`
- `ClassRanking`
- `ReportCard`

This ensures complete data isolation between schools - school admins can only see and manage data for their assigned school.

## Admin Interface Workflow

### Step 1: Super Admin Registers a School

1. Log in to Django admin with a super admin account
2. Navigate to **Schools** section
3. Click **"Add School"**
4. Fill in the required fields:
   - **Name**: School name (e.g., "ABC Secondary School")
   - **Code**: Unique identifier (e.g., "ABC-001")
   - **Email**: school@example.com
   - **Phone**: +1-555-0123
   - **Address**: School physical address
   - **Principal Name**: Name of school principal
   - **Is Active**: Check to activate
5. Click **Save**

**Permissions:** Only users with `is_superuser=True` can access this section.

### Step 2: Create Staff User for School Admin

1. Go to **Users** in Django admin (Django's built-in admin)
2. Click **"Add User"**
3. Create a new user account
4. Set **Staff Status** to checked (required for school admin access)
5. Click **Save**

### Step 3: Assign School Admin via SchoolAdmin

1. In Django admin, navigate to **School Admins** section
2. Click **"Add School Admin"**
3. Fill in the fields:
   - **User**: Select the staff user created in Step 2
   - **School**: Select the school created in Step 1
   - **Job Title**: e.g., "School Administrator" or "Academic Coordinator"
   - **Permissions**: Select which modules this admin can manage:
     - ✓ Can manage academics
     - ✓ Can manage teachers
     - ✓ Can manage students
     - ✓ Can manage grades
     - ✓ Can manage reports
     - ✓ Can view audit logs
   - **Is Active**: Check to activate
4. Click **Save**

**Note:** The same staff user can manage only ONE school. Each school has exactly ONE admin.

### Step 4: School Admin Uses Django Admin

Once assigned, the school admin can:

1. **Log in** to Django admin using their username/password
2. **Access only their school's data** - all data is automatically filtered
3. **Manage academic structure:**
   - Create/edit Academic Years
   - Create/edit Terms for each academic year
   - Create/edit Classes
   - Create/edit Subjects
4. **Manage people:**
   - Register teachers and assign them to subjects/classes
   - Register students and assign them to classes and link to parents
   - Register and manage parents/guardians
5. **Manage grades:** (if has permission)
   - Enter and edit student grades (if not locked)
   - Lock/unlock grades for final submission
   - View grade change audit logs
6. **Generate reports:** (if has permission)
   - Generate report cards
   - Publish report cards for parents to view

## Data Filtering Mechanism

### How It Works

The system uses a **SchoolFilterMixin** that automatically filters querysets based on user type:

```python
def get_queryset(self, request):
    qs = super().get_queryset(request)
    
    if request.user.is_superuser:
        return qs  # Super admins see all data
    
    # Get school admin's school
    school = self.get_school_for_user(request.user)
    if school:
        # Filter to only this school's data
        if hasattr(qs.model, 'school'):
            return qs.filter(school=school)
    
    return qs
```

### User-Specific Views

**Super Admin sees:**
- Multiple schools
- All academic data from all schools
- All users and grades across all schools
- Can see "School" column in all admin lists for context

**School Admin sees:**
- Only their assigned school's data
- Only their school's teachers, students, and parents
- Only their school's grades and reports
- Cannot modify school information or other admins
- Cannot access data from other schools (even if they try to directly access URLs)

## Permission Model

### Role Hierarchy

1. **Super Admin** (is_superuser=True)
   - Full access to all system functions
   - Can register/delete schools
   - Can create/modify/delete school admins
   - Can see all audit logs
   - Can see all schools' data

2. **School Admin** (has SchoolAdmin profile + is_staff=True)
   - Limited to their assigned school
   - Can manage academics/teachers/students/grades based on permissions
   - Cannot see other schools' data

3. **Other Staff Users** (is_staff=True, no SchoolAdmin profile)
   - Not automatic admin access
   - Must be specifically assigned as school admin

4. **Regular Users** (no special permissions)
   - Frontend-only users (teachers, students, parents)
   - Cannot access Django admin

## Best Practices

### For System Administrators

1. **Create exactly ONE SchoolAdmin per school**
   - One school = one admin account
   - Each admin manages their entire school

2. **Use meaningful codes**
   - School code should be unique and recognizable
   - Example: "PS-KAB-001" for Primary School in Kabare

3. **Set permissions carefully**
   - Don't give audit log access unless needed
   - Give grade management only to trusted admins
   - Enable report generation for authorized staff

4. **Regularly audit access**
   - Check who has access to what
   - Review Grade Audit Logs for suspicious changes
   - Disable inactive school admins

### For School Admins

1. **Maintain data accuracy**
   - Use consistent formatting for codes and IDs
   - Verify student/teacher information before saving
   - Lock grades when review is complete

2. **Manage academic structure first**
   - Create Academic Year
   - Create Terms within the year
   - Create Classes/Forms
   - Create Subjects
   - Then assign teachers and students

3. **Secure access**
   - Change default password on first login
   - Keep credentials secure
   - Don't share login credentials

4. **Regular backups strategy**
   - Django handles database backups
   - Export critical reports regularly
   - Keep audit logs as reference

## Security Features

### Data Isolation
- School admins physically cannot see other schools' data
- Database queries are automatically filtered
- Admin interface restricts access at the form level

### Audit Trail
- All grade changes are logged with:
  - Who made the change
  - When (timestamp)
  - Old and new values
  - IP address and browser info
  - Cryptographic hash for tamper detection

### Permission Control
- Fine-grained permissions for each admin
- Can be modified after assignment
- Disable admins without deleting accounts

### Super Admin Oversight
- Super admins can view all data
- Can see which school admin made what changes
- Can investigate audit logs across all schools

## Troubleshooting

### School Admin Can't See Data

1. Check if SchoolAdmin profile exists:
   ```
   Go to School Admins → Check if user is listed
   ```
2. Verify the link is to the correct school
3. Ensure `is_active` is checked on both School and SchoolAdmin

### Incorrect Data Showing

1. Verify user's school assignment
2. Check if data has school field populated correctly
3. Run migrate to ensure database is updated

### Permission Denied Errors

1. Ensure user has `is_staff = True`
2. Ensure SchoolAdmin record exists for this user
3. Check specific module permissions in SchoolAdmin record

## Database Schema

```
User (Django built-in)
├── is_staff: boolean
├── is_superuser: boolean
└── (one-to-one) SchoolAdmin
    ├── school: (foreign key) School
    ├── can_manage_academics: boolean
    ├── can_manage_teachers: boolean
    ├── can_manage_students: boolean
    ├── can_manage_grades: boolean
    ├── can_manage_reports: boolean
    └── can_view_audit_logs: boolean

School
├── name
├── code
├── email
├── phone
├── address
├── principal_name
├── is_active
├── (one-to-one reverse) SchoolAdmin
├── (one-to-many) AcademicYear
├── (one-to-many) Subject
├── (one-to-many) ClassRoom
├── (one-to-many) Teacher
├── (one-to-many) Student
├── (one-to-many) Parent
└── created_by: (foreign key) User

AcademicYear
├── school: (foreign key) School
├── name
├── start_date
├── end_date
├── is_active
└── (one-to-many) Term

(And other models similarly linked to School)
```

## Migration Notes

### What Changed

1. **New Models:**
   - `School` - Multi-tenancy support
   - `SchoolAdmin` - School administrator role

2. **Model Updates:**
   - All academic models now have `school` foreign key
   - Unique constraints updated to include school (e.g., admissions per school, subject codes per school)

3. **Admin Updates:**
   - New admin pages for School and SchoolAdmin
   - All existing admin pages now filter by school
   - Super admins see "school" column in all lists

### Database Migration

Run these commands in order:
```bash
python manage.py makemigrations eksms_core
python manage.py migrate eksms_core
```

### Existing Data

After migration, all existing data:
- Remains intact in the database
- Has `school = NULL` (null foreign key)
- Needs to be assigned to a school by a super admin

**Next steps after migration:**
1. Register your school(s)
2. Assign school admins
3. Update null school references (or data will be invisible to school admins)

## Admin Classes Reference

### SuperAdminRequiredMixin
Only allows access to `is_superuser` users. Used for:
- School registration
- School admin assignment

### SchoolFilterMixin
Automatically filters data by school. Used for:
- All academic management (years, terms, classes, subjects)
- All personnel management (teachers, students, parents)
- All grading operations (grades, rankings, reports)
- All audit logs (grade audits, alerts)

Example usage:
```python
@admin.register(AcademicYear)
class AcademicYearAdmin(SchoolFilterMixin, admin.ModelAdmin):
    list_display = ['school', 'name', 'start_date', 'end_date', 'is_active']
    # Automatically filters to user's school
```

## Next Steps

1. **Customize permissions** - Modify SchoolAdmin permission fields based on your needs
2. **Add frontend** - Create React/frontend views for school-specific operations
3. **Reporting** - Add school-specific dashboards and reports
4. **Integration** - Connect with fee management, attendance, and other modules

## Example Workflow

### Day 1: Setup
```
Super Admin:
1. Registers School A, School B
2. Creates staff users for Admin A, Admin B
3. Creates SchoolAdmin records linking each to their school
```

### Day 2: School Admin Access
```
Admin A (School A):
1. Logs in, sees only School A data
2. Creates Academic Year 2024-2025
3. Creates Terms (1, 2, 3)
4. Creates Classes (Form 1A, 1B, 2A, etc.)
5. Creates Subjects (English, Math, etc.)
6. Registers teachers and assigns to subjects
7. Registers students and assigns to classes

Admin B (School B):
- Does the same for School B
- Never sees School A data
- Works independently

Super Admin:
- Can review both schools
- Can see audit changes from both
- Can manage both if needed
```

---

**Last Updated:** February 23, 2026  
**Version:** 1.0
