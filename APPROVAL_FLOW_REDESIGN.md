# School Admin Registration & Approval Flow Redesign

## Overview
Complete rework of the registration, approval, and dashboard access flow for school administrators.

---

## Database Schema Updates

### 1. School Model Updates
```javascript
// Add/Update columns in School table:
{
  is_approved: BOOLEAN (default: false),        // Superadmin approval status
  approval_status: STRING (default: 'pending'), // pending | approved | rejected
  approved_by: BIGINT (FK to User.id),          // Superadmin who approved
  approved_at: DATE,                            // Approval timestamp
  rejection_reason: TEXT,                       // If rejected
  is_active: BOOLEAN (default: true),           // Can login?
}
```

### 2. User Model Updates
```javascript
// Columns already present, but clarify:
{
  is_active: BOOLEAN,  // Set to TRUE when school approved by superadmin
  email: STRING,
  first_name: STRING,
  last_name: STRING,
}
```

### 3. SchoolAdmin Model
```javascript
// Already exists, no changes needed
{
  user_id: BIGINT (FK),
  school_id: BIGINT (FK),
}
```

---

## Backend Endpoints (New Architecture)

### Auth Endpoints

#### 1. Register School Admin
```
POST /api/auth/register/school-admin
Content-Type: multipart/form-data

Request Body:
{
  // School Info
  institutionName: string (required)
  institutionType: string (required)
  address: string
  city: string
  country: string
  phone: string
  email: string
  capacity: number
  brandColors: array[string] | string
  schoolBadge: file
  
  // Admin Info
  firstName: string (required)
  lastName: string (required)
  adminUsername: string (required, unique)
  adminEmail: string (required, unique)
  adminPhone: string
  password: string (required, min 8 chars)
}

Response (201 Created):
{
  success: true,
  message: "Registration submitted successfully. Awaiting approval.",
  data: {
    school_id: number,
    user_id: number,
    status: "pending"
  }
}

Error (400):
{
  success: false,
  message: "Username already exists" | "Email already registered" | etc
}
```

#### 2. Check Registration Status
```
GET /api/auth/registration-status/:school_id
Headers: { Authorization: Bearer <token> }

Response (200):
{
  success: true,
  data: {
    status: "pending" | "approved" | "rejected",
    school_id: number,
    school_name: string,
    submitted_at: date,
    approved_at: date | null,
    rejection_reason: string | null
  }
}
```

---

### Superadmin Endpoints

#### 1. List Pending Approvals
```
GET /api/superadmin/pending-schools
Headers: { Authorization: Bearer <token> }

Response (200):
{
  success: true,
  data: {
    schools: [
      {
        id: number,
        name: string,
        email: string,
        admin_name: string,
        admin_email: string,
        submitted_at: date,
        phone: string,
        institution_type: string,
        city: string,
        country: string,
        status: "pending"
      }
    ]
  }
}
```

#### 2. Approve School
```
POST /api/superadmin/approve-school
Headers: { Authorization: Bearer <token> }
Content-Type: application/json

Request Body:
{
  school_id: number (required),
  note: string (optional, default message)
}

Response (200):
{
  success: true,
  message: "School approved successfully.",
  data: {
    school_id: number,
    status: "approved",
    approved_at: date
  }
}

Effects:
- Set School.is_approved = true
- Set School.approval_status = "approved"
- Set School.approved_at = now
- Set User.is_active = true (for all school admins)
- Send approval email to admin
```

#### 3. Reject School
```
POST /api/superadmin/reject-school
Headers: { Authorization: Bearer <token> }
Content-Type: application/json

Request Body:
{
  school_id: number (required),
  reason: string (required, user-visible reason)
}

Response (200):
{
  success: true,
  message: "School rejected.",
  data: {
    school_id: number,
    status: "rejected"
  }
}

Effects:
- Set School.is_approved = false
- Set School.approval_status = "rejected"
- Set School.rejection_reason = reason
- Set User.is_active = false (block login)
- Send rejection email to admin with reason
```

#### 4. Get School Details (for review)
```
GET /api/superadmin/school/:school_id
Headers: { Authorization: Bearer <token> }

Response (200):
{
  success: true,
  data: {
    id: number,
    name: string,
    institution_type: string,
    address: string,
    city: string,
    country: string,
    phone: string,
    email: string,
    capacity: number,
    badge: url,
    admin: {
      id: number,
      username: string,
      first_name: string,
      last_name: string,
      email: string,
      phone: string
    },
    submitted_at: date,
    status: "pending" | "approved" | "rejected",
    rejection_reason: string | null
  }
}
```

---

### School Admin Endpoints

#### 1. Get School Approval Status
```
GET /api/school/approval-status
Headers: { Authorization: Bearer <token> }

Response (200):
{
  success: true,
  data: {
    is_approved: boolean,
    status: "pending" | "approved" | "rejected",
    school_id: number,
    school_name: string,
    submitted_at: date,
    approved_at: date | null,
    rejection_reason: string | null,
    can_access_dashboard: boolean  // true if approved and user.is_active
  }
}
```

#### 2. Dashboard Access
```
GET /api/school/dashboard
Headers: { Authorization: Bearer <token> }

Response (200) if approved:
{
  success: true,
  data: { /* dashboard stats */ }
}

Response (403) if pending or rejected:
{
  success: false,
  message: "Your school is awaiting approval. Access granted once approved."
  OR
  "Your school registration was rejected: <reason>. Contact support."
}
```

---

## Frontend Components

### 1. Register Page (New/Updated)
- Simple form for school + admin info
- File upload for badge
- Validates on submit
- Shows success: "Registration submitted. Check email for updates."
- Stores nothing in localStorage until approved

### 2. Login Page (Unchanged)
- Same flow
- Backend returns 403 if user.is_active = false with message "pending approval"

### 3. Approval Status Modal
- Replaces "PendingApprovalPage"
- Shows:
  - Status icon (pending/approved/rejected)
  - School name
  - Submission date
  - If pending: "Awaiting review. You'll receive email when decision is made."
  - If rejected: Shows rejection reason + support contact
- Logout button

### 4. Dashboard Access Gate
- Check `/api/school/approval-status` on mount
- If approved: Show dashboard
- If pending: Show "Awaiting Approval" modal
- If rejected: Show "Registration Rejected" modal + logout

---

## Flow Diagrams

### Registration Flow
```
User fills form
  ↓
POST /api/auth/register/school-admin
  ↓
Validate data
  ↓
Create User (is_active=false)
Create School (approval_status="pending")
Create SchoolAdmin link
  ↓
Send confirmation email
Return success
  ↓
Frontend shows "Check email for updates"
```

### Login Flow (After Registration)
```
User enters credentials
  ↓
POST /api/login
  ↓
Check if user exists
  ↓
If user.is_active = false:
  Return 403 "Your account is pending approval"
  ↓
Frontend shows modal:
  "Registration Under Review"
  ↓
User logs out (can't proceed)
```

### Approval Flow (Superadmin)
```
Superadmin navigates to Pending Schools list
  ↓
GET /api/superadmin/pending-schools
  ↓
Clicks school → views details
  ↓
GET /api/superadmin/school/:id
  ↓
Clicks "Approve" or "Reject"
  ↓
POST /api/superadmin/approve-school (or reject)
  ↓
Update School & User records
Send email to admin
Return success
  ↓
Refresh pending list
```

### Dashboard Access Flow (After Approval)
```
User logs in
  ↓
POST /api/login (now succeeds because user.is_active=true)
  ↓
Frontend stores token + user in localStorage
  ↓
Navigate to dashboard
  ↓
GET /api/school/approval-status
  ↓
If is_approved && can_access_dashboard:
  Show dashboard
Else:
  Show "Awaiting Approval" modal
```

---

## Email Notifications

### 1. Registration Confirmation
- To: admin email
- Subject: "EK-SMS Registration Submitted"
- Body: "Thank you for registering [School Name]. Your application is under review."

### 2. School Approved
- To: admin email
- Subject: "Your School Has Been Approved"
- Body: "Congratulations! [School Name] has been approved. You can now sign in."

### 3. School Rejected
- To: admin email
- Subject: "Your School Registration - Update Required"
- Body: "Your application was reviewed. Reason: [rejection_reason]. Contact support for next steps."

---

## State Management Changes

### localStorage (after login)
```javascript
{
  token: "jwt_token",
  user: {
    id: number,
    username: string,
    email: string,
    first_name: string,
    last_name: string,
    role: "school_admin",
    is_active: boolean,      // NEW: use to check dashboard access
    school_id: number,
    school_name: string      // NEW: optional
  }
}
```

---

## Implementation Checklist

### Backend
- [ ] Create/update School model columns
- [ ] Create ApprovalAudit model (track all approval actions)
- [ ] Update authController: `registerSchoolAdmin()`
- [ ] Update loginController: check `is_active` properly
- [ ] Create superadminController endpoints
- [ ] Create schoolController: approval status endpoint
- [ ] Update email service with new templates
- [ ] Create routes for all new endpoints
- [ ] Add validation middleware

### Frontend
- [ ] Create SchoolRegistration component (new form)
- [ ] Update Login component (handle 403 pending message)
- [ ] Create ApprovalStatus component (replaces PendingApprovalPage)
- [ ] Update Dashboard gate logic
- [ ] Add `/api/school/approval-status` check
- [ ] Update API client to handle new endpoints

### Testing
- [ ] Register new school → should have is_active=false
- [ ] Try login with pending school → 403 response
- [ ] Superadmin approves → is_active=true
- [ ] Login after approval → access dashboard
- [ ] Reject flow → proper error message

---

## Key Changes from Current System

| Current | New |
|---------|-----|
| Generic "Under Review" modal | Specific status with rejection reason |
| Pending check on `school.is_approved` | Pending check on `user.is_active` + explicit approval endpoint |
| No audit trail | ApprovalAudit model tracks all decisions |
| Email sent optionally | Emails always sent for registration/approval/rejection |
| No rejection workflow | Clear rejection with reason |
| Confusing 401 errors | Clear 403 "pending approval" messages |
