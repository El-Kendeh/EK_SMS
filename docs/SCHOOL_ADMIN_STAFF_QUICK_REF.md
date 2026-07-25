# School Admin Quick Reference - Staff Management

**One-Page Guide for Managing School Staff**

---

## What Changed?

School admins can now **create and manage all staff accounts** for their school without needing super admin help!

| What | Before | After |
|------|--------|-------|
| **Create teacher account** | Ask super admin | Create yourself ✅ |
| **Create parent account** | Ask super admin | Create yourself ✅ |
| **Create student account** | Ask super admin | Create yourself ✅ |
| **Manage permissions** | Ask super admin | Manage yourself ✅ |
| **Suspend account** | Ask super admin | Suspend yourself ✅ |
| **Reactivate account** | Ask super admin | Reactivate yourself ✅ |
| **View audit trail** | Ask super admin | View yourself ✅ |

---

## Where Is It?

After logging into Django Admin as School Admin:

1. **Top left**: You'll see **EKSMS_CORE** section
2. **Under EKSMS_CORE**: New page called **"School Staff Accounts"**
3. Click to see all your school's staff
4. Click **"+ ADD SCHOOL STAFF ACCOUNT"** to create new staff

---

## Creating Staff in 60 Seconds

### Quick Steps:

```
1. Go to: EKSMS_CORE → School Staff Accounts
2. Click: "+ ADD SCHOOL STAFF ACCOUNT"
3. Pick: Select existing Django User (or create new)
4. Fill:
   - Role: Teacher/Parent/Student/Staff/etc
   - Job Title: "Grade 10 Math Teacher"
   - School: Auto-filled to your school
5. Activate: Leave as PENDING for now
6. Save: Click SAVE button
7. Share: Give user temporary password
8. User logs in and can work
```

---

## Permission Cheat Sheet

### What Each Role Can Do

```
🏫 TEACHER
   ├─ Enter student grades
   ├─ Create classes
   ├─ Post announcements
   └─ View student work

👨‍🎓 STUDENT  
   ├─ View their grades
   ├─ Submit assignments
   ├─ See report card
   └─ View announcements

👨‍👩‍👦 PARENT
   ├─ See child's grades
   ├─ View report card
   ├─ Get notifications
   └─ Message teachers

👔 STAFF
   ├─ Handle general tasks
   ├─ View reports
   ├─ Post announcements
   └─ Edit content

💰 ACCOUNTANT
   ├─ Manage fees
   ├─ Process payments
   ├─ Generate reports
   └─ Handle refunds

📋 REGISTRAR
   ├─ Process admissions
   ├─ Manage enrollments
   ├─ Generate transcripts
   └─ Update records
```

---

## Common Tasks

### I Want To Create a Teacher Account

```
1. Click: "+ ADD SCHOOL STAFF ACCOUNT"
2. Select: Existing Django User (or create)
3. Set Role: TEACHER
4. Set Job Title: "Grade 10 Mathematics"
5. Choose Teacher records to link (if exists)
6. Enable Permissions:
   ☑ Can create announcements
   ☑ Can edit content
   ☐ Can submit assignments (no)
   ✓ Can view results (yes)
7. Status: PENDING
8. Save
9. Change Status to ACTIVE
10. Tell teacher their password
```

### I Want To Create a Parent Account

```
1. Click: "+ ADD SCHOOL STAFF ACCOUNT"  
2. Select existing User (or create new)
3. Set Role: PARENT
4. Job Title: "Parent of [Student Name]"
5. Link to Parent record
6. Enable Permission:
   ☑ Can view results (important!)
   ☐ Other permissions (leave unchecked)
7. Save & Activate
8. Parent can now see child's grades
```

### I Want To Create Multiple Student Accounts

```
1. Click: "+ ADD SCHOOL STAFF ACCOUNT"
2. Create first-time: 
   - User: [Student name]
   - Role: STUDENT
   - Link to Student record
   - Save
3. For next student: Repeat step 1
4. Once all created:
   - Check boxes next to all pending accounts
   - Select: "Activate selected..."
   - All students activate at once
5. Mass email login credentials
```

### I Want To Suspend a Staff Member

```
1. Go to: School Staff Accounts
2. Find staff member
3. Click: Checkbox next to their name  
4. Select action: "Suspend selected staff accounts"
5. Click: "Go"
6. Their account STOPS working immediately
7. Audit log records it
```

### I Want To See Who Made What Changes

```
1. Go to: EKSMS_CORE → Staff Account Audit Logs
2. See list of all changes
3. Filter by: Action, Date, Staff member, School
4. Click on entry to see details:
   - Who made the change
   - What changed
   - When it happened
   - Where (IP address)
5. Export for compliance if needed
```

### I Want To Change A Teacher's Permissions

```
1. Go to: School Staff Accounts
2. Click on teacher name
3. Scroll to: "Role-Based Permissions"
4. Check/Uncheck boxes:
   ☑ Can create announcements
   ☑ Can edit content
   ☑ Can view results
   ☑ Can submit assignments
5. Click: SAVE
6. Change takes effect immediately
7. Audit log records it
```

---

## Permission Checkboxes

When creating/editing staff, you'll see these permission checkboxes:

```
☑ Can create announcements
   → Staff can post updates, notices
   → Good for: Teachers, Admin, Registrar

☑ Can submit assignments  
   → Staff can upload work
   → Good for: Students

☑ Can view results
   → Staff can see grades and reports
   → Good for: Teachers, Parents, Registrar

☑ Can edit content
   → Staff can modify content, lessons
   → Good for: Teachers, Admin, Registrar
```

**Default Settings by Role:**

| Role | Create | Submit | View | Edit |
|------|--------|--------|------|------|
| TEACHER | ✅ | ❌ | ✅ | ✅ |
| STUDENT | ❌ | ✅ | ✅ | ❌ |
| PARENT | ❌ | ❌ | ✅ | ❌ |
| REGISTRAR | ✅ | ❌ | ✅ | ✅ |
| ACCOUNTANT | ✅ | ❌ | ✅ | ✅ |

---

## Account Statuses

```
Status      | What It Means              | When To Use
-----------|---------------------------|--------------------
PENDING    | Created but not ready     | Initial creation
ACTIVE     | Working, can log in       | After verification
SUSPENDED  | Temporarily disabled       | Leave, discipline
TERMINATED | Permanently closed        | Fired, left job
```

**Status Workflow:**
```
CREATE (PENDING)
  ↓
VERIFY INFO
  ↓
ACTIVATE (ACTIVE) ← Can also SUSPEND from here
  ↓
USER LOGS IN & WORKS
  ↓
If issues: SUSPEND → Can REACTIVATE
If done: TERMINATE (final)
```

---

## Bulk Actions Reference

### Multiple Users at Once

1. **Go to** Staff Accounts page
2. **Check boxes** next to staff members (can check multiple)
3. **Select action** from dropdown:
   - Activate selected staff accounts
   - Suspend selected staff accounts  
   - Terminate selected staff accounts
4. **Click** "Go" button
5. **Confirm** if prompted
6. **Done!** All affected immediately

### Example: Activate 25 New Teachers

```
1. Go to School Staff Accounts
2. Look for Status = PENDING
3. Create first teacher, second teacher, ... 25th teacher
4. Check boxes on ALL 25 accounts
5. Select: "Activate selected staff accounts"
6. Click: "Go"
7. All 25 teachers now ACTIVE in one go!
```

---

## Fields You'll See

When creating staff account, these fields appear:

```
USER ACCOUNT SECTION
├─ User *              ← Select Django user (must exist)
└─ School *            ← Auto-set to your school

ROLE & POSITION SECTION  
├─ Role * (Required)   ← Teacher/Student/Parent/Staff/etc
├─ Job Title           ← "Grade 10 Math Teacher"
└─ Department          ← "Science" or "Administration"

RELATED ENTITIES SECTION (Optional)
├─ Teacher link        ← For TEACHER role
├─ Student link        ← For STUDENT role  
└─ Parent link         ← For PARENT role

PERMISSIONS SECTION
├─ ☑ Can create announcements
├─ ☑ Can submit assignments
├─ ☑ Can view results
└─ ☑ Can edit content

STATUS SECTION
└─ Account Status      ← PENDING/ACTIVE/SUSPENDED/TERMINATED

CONTACT SECTION
├─ Phone Number        ← "+254712345678"
└─ Alternate Email     ← Personal email

SYSTEM SECTION (Auto-filled, read-only)
├─ Created By          ← Your name
├─ Created At          ← Date/time
└─ Activated At        ← When activated
```

---

## Helpful Tips

### ✅ Best Practices

- **Start PENDING**: Create accounts in PENDING status, verify, then ACTIVATE
- **Link to records**: For teachers/students/parents, link to existing records
- **Sensible permissions**: Only give permissions the role actually needs
- **Document changes**: Audit logs auto-document everything
- **Password security**: Temporary passwords are auto-generated (don't share plaintext)
- **Bulk actions**: Use bulk actions for efficiency with many accounts
- **Regular reviews**: Check Staff Accounts page monthly to verify

### ❌ Avoid

- Don't create duplicate accounts for same person/role
- Don't leave accounts PENDING too long
- Don't share passwords over email (insecure)
- Don't forget to deactivate when staff leaves
- Don't modify system fields (read-only ones)
- Don't delete accounts if you need audit trail (TERMINATE instead)

---

## Troubleshooting Quick Fixes

| Problem | Fix |
|---------|-----|
| **Can't see Staff Accounts page** | Check: Do you have "can_create_staff_accounts" permission? Ask super admin |
| **Can't create new staff** | Create Django User first (Under Users in Admin) |
| **Duplicate accounts for same person** | Check school + role combination. Same user can't have 2 TEACHER accounts in same school |
| **Can't suspend account** | Check: Do you have "can_activate_deactivate_staff" permission? |
| **Staff says wrong school** | Other school's staff won't appear. Staff account only shows own school |
| **Can't find audit logs** | Go to: EKSMS_CORE → Staff Account Audit Logs |
| **Password not working** | Check account status = ACTIVE. Check user is_active = yes |

---

## Permission Matrix: Who Can Do What

| Action | School Admin | Super Admin |
|--------|-------------|-----------| 
| Create staff for own school | ✅ Can | ✅ Can |
| Create staff for other school | ❌ Cannot | ✅ Can |
| View own school's staff | ✅ Can | ✅ Can |
| View other school's staff | ❌ Cannot | ✅ Can |
| Activate/Suspend own school staff | ✅ Can | ✅ Can |
| Activate/Suspend other school staff | ❌ Cannot | ✅ Can |
| View own school's audit logs | ✅ Can | ✅ Can |
| View all audit logs | ❌ Cannot | ✅ Can |
| Change staff permissions | ✅ Can (if enabled) | ✅ Can |
| Grant staff creation permission | ❌ Cannot | ✅ Can |

---

## Step-by-Step: First Time Setup

### Complete Workflow for New School

**Day 1: Super Admin Prep**
```
1. Register your school (School page)
2. Create staff user for school admin
3. Assign school admin role
4. Enable "can_create_staff_accounts"
5. Tell school admin their login
```

**Day 2: School Admin Starts**
```
1. Log in with provided credentials
2. Navigate to EKSMS_CORE
3. Verify you see "School Staff Accounts"
4. Create first teacher:
   - Go to Staff Accounts
   - Click "+ ADD..."
   - Fill form
   - Save
   - Verify created
5. Create second teacher (now you know how)
6. Create multiple students
7. Create parents with view_results permission
```

**Day 3: Verification**
```
1. Verify all staff accounts created
2. Activate pending accounts
3. Check audit logs show all changes
4. Let each person log in once
5. Done!
```

---

## Quick Links

| What You Need | Where To Go |
|---------------|-----------| 
| Create staff account | EKSMS_CORE → + ADD SCHOOL STAFF ACCOUNT |
| Edit staff account | EKSMS_CORE → School Staff Accounts → [Click name] |
| View all staff | EKSMS_CORE → School Staff Accounts |
| Suspend staff | EKSMS_CORE → Staff Accounts → [Check box] → "Suspend..." |
| See changes made | EKSMS_CORE → Staff Account Audit Logs |
| Create Django user | Users → + ADD USER (only if needed) |

---

## Password Management

### Temporary Passwords
- Auto-generated when account created
- Secure and randomized
- Share with user ONE TIME only
- User changes on first login
- Not visible in admin (for security)

### Reset Password If Forgotten
```
1. Go to: Django Admin → Users
2. Find user: [Search name]
3. Click: "Change password" link
4. Set new password
5. Share with user
6. They can change again after login
```

---

## Audit Trail

**Every change is logged:**
- ✅ When staff account created
- ✅ When status changed
- ✅ When permissions modified
- ✅ When account suspended/terminated
- ✅ Who made the change
- ✅ When it happened
- ✅ From which IP address

**View it anytime:**
- Go to: EKSMS_CORE → Staff Account Audit Logs
- Filter by date, action, staff member
- Export for compliance/reports

---

## Support

### Can't do something?
1. Read this guide (you probablyfound the answer!)
2. Check audit logs for clues
3. Ask another school admin
4. Contact super admin if still stuck

### Want to report a bug?
1. Take screenshot
2. Note what you were trying to do
3. Save relevant audit log entries
4. Send to development team

---

**Version:** 1.0  
**Last Updated:** February 23, 2026  
**Questions?** Contact your super admin!
