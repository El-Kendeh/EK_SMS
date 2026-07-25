# School Staff Account Management

**Complete Guide for Managing Staff Users in EK-SMS**

---

## Table of Contents

1. [Overview](#overview)
2. [New Permissions](#new-permissions)
3. [Staff Account Types](#staff-account-types)
4. [Creating Staff Accounts](#creating-staff-accounts)
5. [Managing Staff Roles](#managing-staff-roles)
6. [Account Status Management](#account-status-management)
7. [Permissions per Role](#permissions-per-role)
8. [Audit Logs](#audit-logs)
9. [Workflows & Use Cases](#workflows--use-cases)
10. [Troubleshooting](#troubleshooting)

---

## Overview

### What's New?

School admins can now **create and manage staff accounts** for teachers, students, parents, and other school personnel directly from the Django admin interface. This feature enables:

- **Create staff accounts** - No need for super admin to manually create each user
- **Assign roles** - Specify what type of user (teacher, student, parent, etc.)
- **Control permissions** - Set specific permissions per staff member
- **Manage access** - Activate, suspend, or terminate accounts
- **Audit trail** - Track all changes to staff accounts
- **Temporary passwords** - Auto-generate secure temporary passwords

### Who Can Use This?

- **Super Admins**: Can create/manage staff for any school
- **School Admins**: Can manage staff for their own school (if permission is enabled)
- **Delegated Staff**: Can manage subordinate staff (if given permission)

### Key Benefits

✅ **Self-Service**: School admins don't need super admin help for staff management  
✅ **Control**: Set fine-grained permissions per staff member  
✅ **Security**: Temporary passwords and activation workflow  
✅ **Auditability**: Complete audit trail of all staff account changes  
✅ **Efficiency**: Bulk actions to activate/suspend/terminate accounts  
✅ **Flexibility**: Link accounts to teachers, students, parents, or general staff  

---

## New Permissions

### School Admin Permission Flags

The `SchoolAdmin` model has been enhanced with four new permission flags:

| Permission | Default | Purpose |
|-----------|---------|---------|
| `can_create_staff_accounts` | ✅ ON | Create new staff accounts for the school |
| `can_manage_staff_roles` | ✅ ON | Modify staff roles and permissions |
| `can_activate_deactivate_staff` | ✅ ON | Activate or suspend staff accounts |
| `can_manage_parents` | ✅ ON | Manage parent/guardian accounts and links |

**Example Grant Workflow:**
```
Super Admin: Go to School Admins → Select a school admin
            → Check/Uncheck the permission boxes
            → Save
School Admin: Gets access to Staff Accounts page immediately
```

### Staff Account Specific Permissions

Each staff account can have role-based permissions:

| Permission | Default | Use Case |
|-----------|---------|----------|
| `can_create_announcements` | ❌ OFF | Post school announcements |
| `can_submit_assignments` | ❌ OFF | Submit/upload assignments |
| `can_view_results` | ❌ OFF | View grades and academic results |
| `can_edit_content` | ❌ OFF | Modify educational content |

---

## Staff Account Types

### Supported Roles

```
Role             | Use Case
-----------------+------------------------------------------------
TEACHER          | Teachers managing courses and grades
STUDENT          | Students accessing online portal
PARENT           | Parents/guardians viewing child's progress
ADMINISTRATIVE   | Admin staff managing school operations
ACCOUNTANT       | Finance staff managing fees and payments
REGISTRAR        | Registration and records management
LIBRARIAN        | Library staff managing resources
COUNSELOR        | School counselor managing student welfare
```

### When to Use Each

**TEACHER**: 
- Teachers who need to enter grades
- Teachers who manage classes
- Teachers with lesson preparation duties

**STUDENT**:
- Students accessing online learning
- Students viewing their grades
- Students submitting assignments

**PARENT**:
- Parents viewing child's report card
- Guardians receiving notifications
- Parents communicating with teachers

**ADMINISTRATIVE**:
- General admin staff
- Support personnel
- Staff with miscellaneous duties

**ACCOUNTANT**:
- Finance team members
- Fee managers
- Budget administrators

**REGISTRAR**:
- Records and registration staff
- Enrollment processors
- Administrative officers

**LIBRARIAN**:
- Library staff
- Resource managers
- Cataloguers

**COUNSELOR**:
- Guidance counselors
- Student welfare officers
- Mental health support staff

---

## Creating Staff Accounts

### Step 1: Navigate to Staff Accounts Page

1. Log in as school admin
2. Go to: **EKSMS_CORE** → **School Staff Accounts**
3. Click **"+ ADD SCHOOL STAFF ACCOUNT"** button

### Step 2: Select the User

1. Click on the **User** dropdown
2. Select existing Django user OR create new by clicking **"+"**
3. If creating new:
   - Enter **Username** (e.g., `teacher_john_2026`)
   - Enter **Email** (e.g., `john@school.com`)
   - First name and last name (auto-filled in next step)
   - Password will be auto-generated

### Step 3: Fill Staff Information

```
Field                | Example Value         | Notes
---------------------|----------------------|------------------
School               | Nairobi High School  | Auto-filled to your school
Role                 | TEACHER              | Select from dropdown
Job Title            | Grade 10 Math Teacher| Optional, descriptive
Department           | Science Department   | Optional, for organization
Phone Number         | +254712345678        | Contact number
Alternate Email      | john.doe@gmail.com   | Personal email (optional)
```

### Step 4: Link to Related Entity (If Applicable)

**When Teacher Role:**
```
→ Teacher dropdown appears
→ Select the Teacher record
→ Auto-links account to teacher profile
```

**When Student Role:**
```
→ Student dropdown appears
→ Select the Student record
→ Auto-links account to student profile
```

**When Parent Role:**
```
→ Parent dropdown appears
→ Select the Parent record
→ Auto-links account to parent profile
```

**When Other Roles:**
```
→ Leave these fields empty
→ Account still created successfully
```

### Step 5: Configure Permissions

Check boxes for allowed permissions:
- ☑️ Can create announcements
- ☑️ Can submit assignments
- ☑️ Can view results
- ☑️ Can edit content

*Recommendation*: Start minimal, add as needed

### Step 6: Set Account Status

```
Status Options:
- PENDING (default)      → Account created but not yet active
- ACTIVE                → Account ready to use
- SUSPENDED             → Account temporarily disabled
- TERMINATED            → Account permanently closed
```

**Best Practice**: Leave as PENDING initially, then activate after verification

### Step 7: Save

1. Click **"SAVE"** button
2. Confirmation message appears
3. Account is created with:
   - **Temporary Password**: Generated automatically
   - **Status**: PENDING (activation required)
   - **Created By**: Your admin account
   - **Created At**: Current timestamp

### Step 8: Communicate Password

Share the temporary password with the user via:
1. Secure email
2. In-person at school
3. Via secure messaging system

**⚠️ Security**: The password is visible only in the database. It's not shown in admin interface for security.

---

## Managing Staff Roles

### Viewing Staff Accounts

**Filter by:**
- Role (Teacher, Student, Parent, etc.)
- Status (Active, Suspended, Pending, Terminated)
- School (Super admins only)
- Date created

**Search by:**
- Staff member name
- Email address
- Job title
- School name

### Updating Staff Information

1. Navigate to **School Staff Accounts**
2. Click on staff member's name
3. Modify fields:
   - Job title
   - Department
   - Permissions (checkboxes)
   - Contact information
   - Role (if needed)
4. Click **"SAVE"**
5. Change is logged to audit trail

### Bulk Actions

**Activate Multiple Accounts:**
1. Check boxes next to staff members
2. Select "Activate selected staff accounts" from action dropdown
3. Click "Go"
4. All selected accounts activated immediately

**Suspend Multiple Accounts:**
1. Check boxes next to staff members
2. Select "Suspend selected staff accounts" from action dropdown
3. Click "Go"
4. All users lose access immediately

**Terminate Multiple Accounts:**
1. Check boxes next to staff members
2. Select "Terminate selected staff accounts" from action dropdown
3. Click "Go"
4. Account permanently closed

---

## Account Status Management

### Status Workflow

```
CREATE
  ↓
PENDING (Initial status after creation)
  ├→ ACTIVATE → ACTIVE (User can log in)
  ├→ SUSPEND  → SUSPENDED (User cannot log in)
  └→ TERMINATE → TERMINATED (Account closed)

FROM ACTIVE
  ├→ SUSPEND → SUSPENDED (Temporary lock)
  └→ TERMINATE → TERMINATED (Permanent?)

FROM SUSPENDED
  ├→ ACTIVATE → ACTIVE (Restore access)
  └→ TERMINATE → TERMINATED (Close permanently)

FROM TERMINATED
  └→ Cannot change (Terminal state)
```

### Activating an Account

**Prerequisites:**
- Account status is PENDING or SUSPENDED
- Super admin or authorized school admin

**Steps:**
1. Go to Staff Accounts
2. Click on staff member
3. Change Status to ACTIVE
4. Click Save
5. User receives notification (optional)
6. User can now log in

### Suspending an Account

**When to Use:**
- Temporary absence
- Discipline issue
- Leave of absence
- During investigation

**Steps:**
1. Go to Staff Accounts
2. Click on staff member
3. Select "Suspend selected staff accounts" action
4. User immediately loses access
5. All sessions terminated
6. Audit log created

### Terminating an Account

**When to Use:**
- Permanent removal
- End of employment
- Account no longer needed
- Policy violation

**Steps:**
1. Go to Staff Accounts
2. Click on staff member
3. Select "Terminate selected staff accounts" action
4. Account permanently closed
5. Django user account disabled
6. Audit log created

**⚠️ Warning**: This action is permanent. Consider archiving data first.

---

## Permissions per Role

### TEACHER Role

**Recommended Permissions:**
- ✅ Can create announcements (share class updates)
- ✅ Can edit content (prepare lessons)
- ✅ Can view results (check student grades)
- ❌ Can submit assignments (teachers don't submit)

**Features Unlocked:**
- Enter student grades
- Create classes and assignments
- Publish announcements
- View student profiles
- Generate class reports

### STUDENT Role

**Recommended Permissions:**
- ❌ Can create announcements (students don't post)
- ✅ Can submit assignments (core feature)
- ✅ Can view results (see their grades)
- ❌ Can edit content (students don't modify)

**Features Unlocked:**
- View dashboard
- Submit homework
- View grades
- Download report cards
- Check announcements

### PARENT Role

**Recommended Permissions:**
- ❌ Can create announcements
- ❌ Can submit assignments
- ✅ Can view results (ONLY for their child)
- ❌ Can edit content

**Features Unlocked:**
- View child's grades
- View report cards
- Receive notifications
- Communicate with teachers
- View attendance

### ADMINISTRATIVE Role

**Recommended Permissions:**
- ✅ Can create announcements
- ❌ Can submit assignments
- ✅ Can view results
- ✅ Can edit content

**Features Unlocked:**
- Manage schedules
- Process admissions
- Handle general tasks
- Administrative reports

### ACCOUNTANT Role

**Recommended Permissions:**
- ✅ Can create announcements (fee notices)
- ❌ Can submit assignments
- ✅ Can view results (financial reports)
- ✅ Can edit content (update fee structures)

**Features Unlocked:**
- Manage fees and payments
- Generate financial reports
- Process refunds
- Track payment status

### REGISTRAR Role

**Recommended Permissions:**
- ✅ Can create announcements (enrollment alerts)
- ❌ Can submit assignments
- ✅ Can view results (enrollment reports)
- ✅ Can edit content (update records)

**Features Unlocked:**
- Manage enrollments
- Process applications
- Generate transcripts
- Update student records
- Manage documentation

### COUNSELOR Role

**Recommended Permissions:**
- ✅ Can create announcements (counseling tips)
- ❌ Can submit assignments
- ✅ Can view results (academic performance)
- ✅ Can edit content (update resources)

**Features Unlocked:**
- Student counseling records
- Performance tracking
- Referral management
- Wellness programs
- Private student notes

### LIBRARIAN Role

**Recommended Permissions:**
- ✅ Can create announcements (library news)
- ❌ Can submit assignments
- ❌ Can view results
- ✅ Can edit content (catalog updates)

**Features Unlocked:**
- Book management
- Student library records
- Resource tracking
- Borrowing management
- Reading recommendations

---

## Audit Logs

### Viewing Audit Logs

1. Go to **EKSMS_CORE** → **Staff Account Audit Logs**
2. See chronological list of all staff account changes
3. Filter by:
   - Action (Created, Updated, Activated, etc.)
   - Staff member
   - School
   - Date range

### Information Logged

Each entry captures:

```
Staff Member:      John Doe
Action:            Account Activated
Changed By:        Principal Sarah
Date/Time:         Feb 23, 2026 10:30:45 AM
IP Address:        192.168.1.100
Description:       Account activated via bulk action
Previous Values:   {"account_status": "PENDING"}
New Values:        {"account_status": "ACTIVE"}
```

### Audit Actions

| Action | Meaning |
|--------|---------|
| CREATED | New staff account was created |
| ACTIVATED | Account was activated for use |
| UPDATED | Account information was modified |
| SUSPENDED | Account was suspended |
| TERMINATED | Account was terminated |
| ROLE_CHANGED | Staff role was modified |
| PERMISSIONS_CHANGED | Staff permissions were updated |

### Compliance Uses

✅ **Compliance Reporting**: Show who created/modified accounts  
✅ **Security Audits**: Track unauthorized access attempts  
✅ **Accountability**: Identify who made what changes when  
✅ **Troubleshooting**: Understand what happened to an account  
✅ **Data Protection**: Demonstrate audit controls for GDPR/privacy laws  

### Accessing Audit Logs

**As School Admin:**
- See only audit logs for your school's staff
- View all actions on your staff members

**As Super Admin:**
- See all audit logs across all schools
- Use for oversight and investigation

---

## Workflows & Use Cases

### Use Case 1: Onboarding New Teacher

**Scenario**: New teacher joins mid-academic year

**Steps:**

1. **Create User Account**
   - Go to Django Admin → Users → Add User
   - Username: `teacher_jane_2026`
   - Email: `jane@school.com`
   - Set temporary password

2. **Create Staff Account**
   - Go to School Staff Accounts → Add Account
   - Select User: Jane's account
   - Role: TEACHER
   - Job Title: "Grade 8 English Teacher"
   - Department: "English/Languages"
   - Link to Teacher record if exists
   - Permissions: Can create announcements ✅, Can edit content ✅
   - Status: PENDING

3. **Verify & Activate**
   - Verify teacher details are complete
   - Change status to ACTIVE
   - Send login credentials
   - Teacher can now log in

4. **Configure Access**
   - Teacher creates classes
   - Teacher adds students to classes
   - Teacher starts entering grades

5. **Monitor**
   - Check audit logs monthly
   - Review activity reports
   - Update permissions as needed

### Use Case 2: Multi-Role Staff Member

**Scenario**: Person is both teacher AND registrar

**Solution**: Create two separate staff accounts

```
Account 1:
- User: John Smith
- Role: TEACHER
- Permissions: Teach classes, enter grades

Account 2:
- User: John Smith (same user)
- Role: REGISTRAR
- Permissions: Process admissions, manage records
```

**Note**: Same Django user can have multiple staff accounts for different roles in same school

### Use Case 3: Temporary Staff

**Scenario**: Contract teacher for one term

**Process:**

1. Create staff account with same process
2. Set Status: ACTIVE
3. Set Job Title: "Contract Mathematics Teacher (Term 2 2026)"
4. Set Department: "Mathematics"
5. When contract ends:
   - Select Terminate action
   - Document in notes
   - Archive if needed for records

### Use Case 4: Staff Promotion

**Scenario**: Teacher becomes head of department

**Process:**

1. Go to Staff Accounts
2. Find staff member
3. Update fields:
   - Job Title: "Head of Mathematics Department"
   - Department: "Mathematics (Head)"
4. Update Permissions:
   - Add: Can create announcements ✅
   - Add: Can edit content ✅
5. Save changes
6. Audit log records promotion

### Use Case 5: Bulk Onboarding

**Scenario**: School year starts, 30 new teachers needed

**Process:**

1. **Phase 1 - Preparation**
   - Create all teacher records first
   - Create all Django user accounts
   - Prepare staff account templates

2. **Phase 2 - Bulk Create**
   - Create all 30 staff accounts in admin
   - Select same role, permissions template
   - Set status to PENDING for all

3. **Phase 3 - Verification**
   - Verify each account before activation
   - Check spelling, emails, phone numbers
   - Link to correct teacher records

4. **Phase 4 - Activation**
   - Use bulk action to activate all approved accounts
   - Send login details to teachers
   - Teachers reset passwords on first login

---

## Troubleshooting

### Problem: Can't See Staff Accounts Page

**Causes:**
1. Not a school admin
2. School admin but permission disabled
3. Not logged in

**Solution:**
```
1. Check: Are you logged in?
2. Check: Is your account a school admin? 
   (Contact super admin if not)
3. Check: Does your account have 
   "can_create_staff_accounts" permission?
   (Contact school admin if not)
4. Try: Refresh page (Ctrl+F5)
5. Try: Log out and back in
```

### Problem: Can't Create New Staff Account

**Causes:**
1. Permission not granted
2. Django user doesn't exist
3. Account already exists for that user/school combo

**Solution:**
```
1. Check permission: "can_create_staff_accounts" = ✅
2. Check user exists: Go to Django Users first
3. Verify combination: Same user can't have 
   two TEACHER accounts in same school
   (but can have TEACHER + REGISTRAR)
4. Try using different role
```

### Problem: Temporary Password Not Working

**Causes:**
1. Wrong temporary password used twice (locked)
2. Account status not ACTIVE
3. User account disabled

**Solution:**
```
1. Check account status = ACTIVE
2. Check user is_active = checked
3. Go to Django Users → Find user
4. Verify: is_active checkbox is checked
5. Reset password via Django Users
6. Share new password with user
```

### Problem: Staff Can't Access Their Data

**Causes:**
1. School filter restricting access
2. Permissions not set
3. Related entity links incorrect

**Solution:**
```
1. Verify staff account school = user's school
2. Check permissions match role needs
3. For teachers: Verify linked to Teacher record
4. For parents: Verify parent linked to student
5. Clear browser cache and retry
6. Check audit logs for any suspensions
```

### Problem: Need to Change Staff Role

**Causes:**
1. Wrong role selected initially
2. Staff promotion/change

**Solution:**
```
1. Go to Staff Accounts
2. Click on staff member
3. Change Role dropdown
4. If had related entity (teacher/student/parent):
   - Check if link is still valid
   - Remove if not applicable
5. Update permissions if needed
6. Click SAVE
7. Audit log records change
```

### Problem: Can't Suspend/Terminate Account

**Causes:**
1. Permission issue ("can_activate_deactivate_staff")
2. Wrong account status
3. Bug or system issue

**Solution:**
```
1. Check you have "can_activate_deactivate_staff" = ✅
2. Verify account status is ACTIVE/PENDING/SUSPENDED
   (not already TERMINATED)
3. Try using Edit page instead of Bulk action
4. Check browser console for JavaScript errors
5. Contact super admin if still stuck
```

### Problem: Audit Logs Show Wrong Information

**Causes:**
1. Displaying system time (not local)
2. Displaying wrong staff member
3. Time zone mismatch

**Solution:**
```
1. Verify timestamp format (should be clear)
2. Check staff member name matches
3. Contact system admin for timezone config
4. Screenshot and report if data is incorrect
```

### Problem: Lost Staff Account Password

**Causes:**
1. User forgot password
2. Temporary password expired
3. Account compromised

**Solution:**
```
1. Go to Staff Accounts
2. Click on user
3. Can't reset directly from this page
4. Go to Django Admin → Users
5. Find user and click
6. Scroll to "Password" section
7. Click "Change Password" link
8. Enter new password
9. User gets new login credentials
10. Share securely with user
```

### Problem: Audit Trail Not Recording

**Causes:**
1. Logging disabled
2. Database permission issue
3. Network issue

**Solution:**
```
1. Check audit logs page loads
2. Check school_staff_account_auditlog table exists
   (Contact admin)
3. Verify at least one log entry exists
4. If none: Contact super admin to check settings
5. Try creating new staff account and check if logged
```

---

## Quick Reference

### Admin Pages & URLs

```
Path                          | Access              | Function
------------------------------|-------------------|---------------------------
EKSMS_CORE →                | School Admin       | Create staff accounts
School Staff Accounts        |                    | 
                             |                    |
EKSMS_CORE →                | School Admin       | View all staff changes
Staff Account Audit Logs     | (if can_view)     | 
                             |                    |
Django Admin → Users         | Super Admin Only   | Create/edit Django users
                             |                    |
Django Admin →               | Super Admin Only   | Assign staff permissions
School Admins               |                    |
```

### Permission Checklist for New School Admin

Before a school admin can manage staff:

```
[ ] Super admin created school in Schools page
[ ] Super admin created school admin user in Django Users
[ ] Super admin linked user to school in School Admins page
[ ] Super admin checked "can_create_staff_accounts" ✅
[ ] Super admin checked "can_manage_staff_roles" ✅
[ ] School admin logged out and back in
[ ] School admin can see EKSMS_CORE → School Staff Accounts
```

### Common Commands

```bash
# View all staff accounts in database
python manage.py shell
>>> from eksms_core.models import SchoolStaffAccount
>>> list(SchoolStaffAccount.objects.all())

# Activate all pending accounts for a school
>>> SchoolStaffAccount.objects.filter(
...   account_status='PENDING',
...   school__name='Nairobi High'
... ).update(account_status='ACTIVE')

# Export staff audit logs for reporting
>>> from eksms_core.models import StaffAccountAuditLog
>>> logs = StaffAccountAuditLog.objects.all()
>>> # Export to CSV, Excel, etc.
```

### Key Fields Reference

```
SchoolStaffAccount Fields:
├─ user (User) ........................ Django user account
├─ school (School) ................... School this staff belongs to
├─ role (Choice)  .................... Teacher/Student/Parent/etc
├─ account_status (Choice) ........... Pending/Active/Suspended/Terminated
├─ is_active (Boolean) ............... Soft delete flag
├─ created_by (User) ................. Who created this account
├─ created_at (DateTime) ............ When created
├─ activated_at (DateTime) .......... When activated
└─ permissions (Booleans) ........... Custom role permissions

StaffAccountAuditLog Fields:
├─ staff_account (FK) ............... Which staff member
├─ action (Choice) .................. What changed
├─ description (Text) ............... Details of change
├─ changed_by (User) ................ Who made change
├─ old_values (JSON) ................ Previous values
├─ new_values (JSON) ................ New values
├─ ip_address (IP) .................. Where change was made from
└─ created_at (DateTime) ............ When change occurred
```

---

## Support & Contact

**Quick Issues:**
- Read the Troubleshooting section above
- Check audit logs for clues

**Complex Issues:**
- Contact system super admin
- Provide screenshot + details
- Save audit log entries as evidence

**Feature Requests:**
- Document the workflow you need
- Explain the use case
- Submit to development team

---

## Summary

You now have complete control to:

✅ **Create** staff accounts for teachers, students, parents, etc.  
✅ **Manage** staff roles and permissions  
✅ **Control** account activation and suspension  
✅ **Track** all changes in immutable audit logs  
✅ **Bulk Action** on multiple accounts  
✅ **Link** accounts to existing entities  
✅ **Delegate** to other admins via permissions  

This significantly reduces dependency on super admin support while maintaining security and auditability!

---

**Last Updated:** February 23, 2026  
**Version:** 1.0 - Initial Release
