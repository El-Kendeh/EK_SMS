# Testing the School Registration and Admin System

## Quick Setup Test

### 1. Verify Migrations Applied
```bash
python manage.py migrate eksms_core
# Output should show: OK for 0005_school_alter_academicyear_name_alter_classroom_code_and_more
```

### 2. Access Django Admin
```
URL: http://localhost:8000/admin/
Login with superuser credentials
```

### 3. Verify New Admin Pages Exist
Navigate to **Django Admin → EKSMS_CORE** section to see:
- ✓ **Schools** - For registering schools
- ✓ **School Admins** - For assigning admins to schools
- (Other existing models should now show "School" column)

## Test Scenario 1: Register a School (Super Admin)

### Steps
1. Log in as super admin
2. Go to **EKSMS_CORE → Schools**
3. Click **"Add School"**
4. Fill in:
   - Name: `Test School ABC`
   - Code: `TSA-001`
   - Email: `admin@testschoolabc.edu`
   - Phone: `+1-555-0100`
   - Address: `123 Education Road, City`
   - Principal Name: `Mr. John Principal`
   - Is Active: ✓ checked
5. Click **Save**
6. Verify school appears in the list

### Expected Behavior
- School is saved successfully
- "School Admin" column shows "Not assigned yet"
- Created By field shows current super admin username
- Registration Date shows current datetime

## Test Scenario 2: Create School Admin User

### Steps (using Django's built-in User admin)
1. Go to **Django Admin → Users**
2. Click **"Add User"**
3. Create user:
   - Username: `schooladmin1`
   - Password: Create a strong password
   - Click **Save and continue editing**
4. Check **Staff Status** ✓
5. Leave **Superuser Status** unchecked
6. Click **Save**

### Expected Behavior
- User created successfully
- User shows as active staff member
- Can be selected in SchoolAdmin form

## Test Scenario 3: Assign School Admin

### Steps
1. Go to **EKSMS_CORE → School Admins**
2. Click **"Add School Admin"**
3. Fill in:
   - User: Select `schooladmin1`
   - School: Select `Test School ABC`
   - Job Title: `School Administrator`
   - Permissions: Check all boxes
   - Is Active: ✓ checked
4. Click **Save**

### Expected Behavior
- SchoolAdmin created successfully
- School's "School Admin" field now shows admin's name
- Admin account is now active

## Test Scenario 4: Data Filtering (School Admin Access)

### Steps
1. **Log out** from super admin
2. **Log in** as school admin (schooladmin1)
3. Navigate to **EKSMS_CORE** section
4. Click on different models (AcademicYear, Class, Subject, etc.)

### Expected Behavior
- School admin enters Django admin interface (succeeds)
- Only sees data for their School
- All list views show "School" column with their school name
- Cannot add/edit data for other schools
- Cannot see the **Schools** or **School Admins** sections

### What They CAN Do
- ✓ Add Academic Years
- ✓ Add Terms, Classes, Subjects
- ✓ Register Teachers
- ✓ Register Students
- ✓ Add Grades
- ✓ View and manage data

### What They CANNOT Do
- ✗ Add/edit Schools
- ✗ Add/edit School Admins
- ✗ See other schools' data
- ✗ Register schools

## Test Scenario 5: Multi-School Isolation

### Step 1: Create Second School
(As super admin)
1. Register another school:
   - Name: `Second School XYZ`
   - Code: `SSX-001`
   - etc.
2. Create another staff user: `schooladmin2`
3. Create SchoolAdmin linking admin2 to this school

### Step 2: Test Isolation
1. Log in as `schooladmin1`
2. View Academic Years or Classes
3. Create an Academic Year named "2024-2025"
4. Add a Class named "Form 1A"
5. Log out

6. Log in as `schooladmin2`
7. Check Academic Years list
8. Should NOT see "2024-2025" from School 1
9. Can create their own "2024-2025" (different school)
10. Should NOT see "Form 1A"

### Expected Behavior
- Each admin sees ONLY their school's data
- Both admins can have identically named items (isolated per school)
- Unique constraints now include school (you can have "English" subject in both schools)

## Test Scenario 6: Super Admin Oversight

### Steps
1. Log in as super admin
2. Go to **AcademicYear** or other model
3. View list of items

### Expected Behavior
- Super admin sees data from ALL schools
- "School" column is visible and shows which school each item belongs to
- Can filter by school using the filter panel
- Can search across schools
- Can manage any school's data

## Test Scenario 7: Grade Audit Trail

### Setup
1. Create academic data in a school (as school admin)
2. Create students, subjects, grades
3. Enter some test grades

### Steps
1. (As school admin) Go to **Grades**
2. Enter/edit a grade value
3. Click **Save**
4. Go to **Grade Audit Logs**
5. Search for the grade you just edited

### Expected Behavior
- Audit log entry appears
- Shows: action (CREATE/UPDATE), actor (your username), old values, new values
- Timestamp shows when change was made
- Hash Status shows "✓ Valid"
- Cannot manually edit audit logs (read-only)

## Common Issues and Fixes

### Issue 1: "Permission Denied" When Logging in as School Admin
**Solution:**
1. Verify user has `is_staff = True` (check in Users)
2. Verify SchoolAdmin record exists for this user
3. Verify SchoolAdmin `is_active` is checked

### Issue 2: School Admin Sees All Data (Not Filtered)
**Solution:**
1. Check if user is superuser (should not be)
2. Verify school assignment in SchoolAdmin
3. Run `python manage.py migrate` to apply latest migrations

### Issue 3: Cannot Create School (Super Admin)
**Solution:**
1. Verify logged-in user has `is_superuser = True`
2. Check browser console for JavaScript errors
3. Verify all required fields are filled (name, code, email)

### Issue 4: "IntegrityError" When Creating Related Records
**Solution:**
1. Ensure parent (school) record exists
2. For unique constraints, verify each school can have same values
   - Example: Two schools can now have a subject named "English"
   - But within one school, subject codes must be unique

## Performance Testing

### Load Test: Multiple Schools
1. Create 5-10 test schools
2. Create 5-10 academic years per school
3. Create 20+ classes, subjects, teachers per school
4. Create 100+ students per school
5. Create 1000+ grades per school

### Expected Performance
- Django admin pages should load in < 2 seconds
- Searches should complete in < 1 second
- Filtering should be responsive

## Data Integrity Tests

### Test 1: Unique Constraints
```python
# This should FAIL (same code in same school)
School 1: Subject code "ENG", name "English"
School 1: Subject code "ENG", name "English Literature"
✗ FAILS (as expected)

# This should SUCCEED (same code in different school)
School 1: Subject code "ENG", name "English"
School 2: Subject code "ENG", name "English"
✓ SUCCEEDS (multi-tenancy working)
```

### Test 2: Foreign Key Constraints
1. Try to register a student without a school
   - Should fail or show error
2. Try to register a teacher without a school
   - Should fail or show error

### Test 3: Cascading Deletes
1. Delete a school
2. Verify all its data is deleted:
   - Academic years gone
   - Teachers gone
   - Students gone
   - Grades gone
3. SchoolAdmin for that school should be deleted

## Permissions Testing

### Test Disable Module Permission
1. Go to **School Admins**
2. Uncheck `can_manage_grades` for a school admin
3. Log in as that admin
4. Go to **Grades** section
5. Should not be able to create/edit grades

## Cleanup After Testing

### Remove Test Data
```bash
# Access Django shell
python manage.py shell

# Delete test schools and their data
from eksms_core.models import School, SchoolAdmin
School.objects.filter(code__startswith='TSA-').delete()
School.objects.filter(code__startswith='SSX-').delete()

# Or delete all test SchoolAdmins
from django.contrib.auth.models import User
User.objects.filter(username__startswith='schooladmin').delete()

exit()
```

## Verification Checklist

Before considering this feature complete, verify:

- [ ] Super admin can register schools
- [ ] Super admin can assign school admins
- [ ] School admin can log in to admin interface
- [ ] School admin sees only their school's data
- [ ] School admin can add/edit academic data
- [ ] Multiple school admins cannot see each other's data
- [ ] Super admin can see all schools' data
- [ ] Grade audit logs are created and immutable
- [ ] School admin permissions are enforced
- [ ] Unique constraints work across multiple schools
- [ ] No data leakage between schools
- [ ] Deleting a school cascades to all related data

## Notes

- Test data is saved to SQLite in `db.sqlite3`
- Each test run creates permanent records unless cleaned up
- Super admin credentials needed for initial setup
- School admins must have `is_staff = True` and a SchoolAdmin profile

---

**Date:** February 23, 2026
