# Frontend Implementation Guide - School Admin Registration & Approval Flow

## Overview
Complete frontend rebuild with new registration form, approval status checks, and email notifications.

---

## Components to Create/Update

### 1. **SchoolRegistration.js** (NEW)
Location: `src/components/SchoolRegistration.js`

**Purpose:** Replaces existing registration form with clean, clear registration process.

**Features:**
- Two-step form: School Info → Admin Info
- File upload for school badge
- Real-time validation
- Success modal with next steps
- Error handling with clear messages

**Key States:**
```javascript
const [step, setStep] = useState(1);
const [formData, setFormData] = useState({
  // School Info
  institutionName: '',
  institutionType: '',
  address: '',
  city: '',
  country: '',
  phone: '',
  email: '',
  capacity: '',
  website: '',
  region: '',
  academicSystem: '',
  
  // Admin Info
  firstName: '',
  lastName: '',
  adminUsername: '',
  adminEmail: '',
  adminPhone: '',
  password: '',
  confirmPassword: '',
});
const [badge, setBadge] = useState(null);
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState('');
const [success, setSuccess] = useState(false);
```

**API Call:**
```javascript
const handleSubmit = async () => {
  const formDataObj = new FormData();
  
  // School fields
  formDataObj.append('institutionName', formData.institutionName);
  formDataObj.append('institutionType', formData.institutionType);
  // ... other fields
  
  // Admin fields
  formDataObj.append('firstName', formData.firstName);
  formDataObj.append('lastName', formData.lastName);
  formDataObj.append('adminUsername', formData.adminUsername);
  formDataObj.append('adminEmail', formData.adminEmail);
  formDataObj.append('adminPhone', formData.adminPhone);
  formDataObj.append('password', formData.password);
  
  if (badge) {
    formDataObj.append('schoolBadge', badge);
  }
  
  try {
    const response = await ApiClient.post('/registration/register-school-admin', formDataObj, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setSuccess(true);
  } catch (err) {
    setError(err.message);
  }
};
```

---

### 2. **ApprovalStatusModal.js** (NEW)
Location: `src/components/ApprovalStatusModal.js`

**Purpose:** Show current approval status to user. Replaces PendingApprovalPage.

**Props:**
```javascript
{
  status: 'pending' | 'approved' | 'rejected',
  schoolName: string,
  submittedAt: date,
  rejectionReason?: string,
  onLogout: () => void,
  canAccessDashboard: boolean
}
```

**Renders:**
- If `status === 'pending'`: "Awaiting Approval" with hourglass icon
- If `status === 'approved'`: "School Approved" with checkmark
- If `status === 'rejected'`: "Registration Not Approved" with reason

---

### 3. **DashboardGate.js** (NEW)
Location: `src/components/DashboardGate.js`

**Purpose:** Protects dashboard access - checks approval status before rendering dashboard.

**Logic:**
```javascript
useEffect(() => {
  const checkApprovalStatus = async () => {
    try {
      const response = await ApiClient.get('/registration/check-status');
      const { status, is_approved, can_access_dashboard, rejection_reason } = response;
      
      setApprovalStatus(status);
      
      if (!can_access_dashboard) {
        if (status === 'pending') {
          setShowModal('pending');
        } else if (status === 'rejected') {
          setShowModal('rejected');
          setRejectionReason(rejection_reason);
        }
      } else {
        // Render dashboard
        setShowModal(null);
      }
    } catch (err) {
      // Handle error
    }
  };
  
  checkApprovalStatus();
}, []);

if (showModal === 'pending') return <ApprovalStatusModal status="pending" ... />;
if (showModal === 'rejected') return <ApprovalStatusModal status="rejected" ... />;
return <SchoolAdminDashboard {...props} />;
```

---

### 4. **Updated Login.js**
Location: `src/components/login.js`

**Changes:**
- Remove old UnderReviewModal
- Handle 403 response with message "Your account is pending approval by the Superadmin."
- Show new ApprovalStatusModal or direct user to home

**Key Logic:**
```javascript
const handleLoginResponse = (response) => {
  if (response.status === 403 && response.message.includes('pending approval')) {
    // Don't store token
    setShowPendingModal(true);
  } else if (response.success) {
    // Store token and user
    localStorage.setItem('token', response.token);
    localStorage.setItem('user', JSON.stringify(response.user));
    
    // Route based on role
    if (response.user.role === 'school_admin') {
      onNavigate('sa-dashboard');
    }
  }
};
```

---

### 5. **SuperadminPendingApprovals.js** (NEW)
Location: `src/components/superadmin/PendingApprovals.js`

**Purpose:** Superadmin panel to review and approve/reject schools.

**Features:**
- List all pending schools
- Click to view details
- Approve button → send email
- Reject button → modal for rejection reason

**API Calls:**
```javascript
// Get pending schools
const fetchPending = async () => {
  const data = await ApiClient.get('/approval/pending-schools');
  setPendingSchools(data.schools);
};

// Get school details
const fetchSchoolDetails = async (schoolId) => {
  const data = await ApiClient.get(`/approval/school/${schoolId}`);
  setSelectedSchool(data);
};

// Approve school
const handleApprove = async (schoolId) => {
  await ApiClient.post('/approval/approve-school', {
    school_id: schoolId,
    note: 'Approved'
  });
  // Refresh list + show success
};

// Reject school
const handleReject = async (schoolId, reason) => {
  await ApiClient.post('/approval/reject-school', {
    school_id: schoolId,
    reason: reason
  });
  // Refresh list + show success
};
```

---

## Flow Diagrams

### Registration Flow
```
User clicks "Register"
  ↓
SchoolRegistration component opens
  ↓
Step 1: Enter school info + validate
  ↓
Step 2: Enter admin info + password
  ↓
Upload school badge (optional)
  ↓
Submit form to POST /api/registration/register-school-admin
  ↓
Success modal: "Registration submitted! Check email for updates."
  ↓
Redirect to login after 3 seconds
  ↓
Email received: "Your application is under review"
```

### Login → Pending Approval
```
User logs in with registered credentials
  ↓
POST /api/login
  ↓
User exists but user.is_active = false
  ↓
Return 403 "Your account is pending approval by the Superadmin."
  ↓
Frontend shows ApprovalStatusModal
  ↓
User can only logout
```

### Superadmin Approval Flow
```
Superadmin navigates to "Pending Approvals"
  ↓
GET /api/approval/pending-schools
  ↓
Display list of schools with admin names
  ↓
Superadmin clicks school → GET /api/approval/school/:id
  ↓
View full details (school + admin info)
  ↓
Click "Approve" → POST /api/approval/approve-school
  ↓
School approved! Email sent to admin.
  ↓
List refreshes, school removed from pending
```

### After Approval → Dashboard Access
```
School admin gets approval email
  ↓
Email contains: "School Approved - Sign in at [URL]"
  ↓
Admin logs in again
  ↓
POST /api/login now succeeds (user.is_active = true)
  ↓
Frontend stores token + user in localStorage
  ↓
Navigate to dashboard
  ↓
DashboardGate checks GET /api/registration/check-status
  ↓
can_access_dashboard = true
  ↓
Show dashboard immediately ✅
```

---

## State Management (localStorage)

**After Login (Unapproved):**
```javascript
// NOT stored if login fails with 403
localStorage.token = null
localStorage.user = null
```

**After Login (Approved):**
```javascript
localStorage.token = "eyJhbGciOiJIUzI1NiIs..."
localStorage.user = {
  id: 1,
  username: "admin@school.com",
  email: "admin@school.com",
  first_name: "John",
  last_name: "Doe",
  role: "school_admin",
  is_active: true,      // ← KEY: now true
  school_id: 1,
  school_name: "Springfield High"
}
```

---

## API Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/registration/register-school-admin` | POST | ❌ | Register new school |
| `/api/registration/status/:schoolId` | GET | ❌ | Check approval status (public) |
| `/api/registration/check-status` | GET | ✅ | Get current user's school status |
| `/api/approval/pending-schools` | GET | ✅ SA | List pending schools |
| `/api/approval/school/:schoolId` | GET | ✅ SA | Get school details for review |
| `/api/approval/approve-school` | POST | ✅ SA | Approve school |
| `/api/approval/reject-school` | POST | ✅ SA | Reject school with reason |
| `/api/approval/approved-schools` | GET | ✅ SA | List approved schools |

---

## Email Notifications

### 1. Registration Confirmation
- **Trigger:** After successful registration
- **To:** Admin email
- **Subject:** "Registration Received: [School Name]"
- **Content:** "Thank you for registering. Your application is under review."

### 2. School Approved
- **Trigger:** Superadmin clicks "Approve"
- **To:** All school admins
- **Subject:** "✅ Approved: [School Name] — PruhSMS Access Ready"
- **Content:** "Congratulations! Your school is approved. Sign in here: [Link]"

### 3. School Rejected
- **Trigger:** Superadmin clicks "Reject"
- **To:** All school admins
- **Subject:** "Registration Update: [School Name]"
- **Content:** "Your application was reviewed. Reason: [Rejection Reason]. Contact support."

---

## Implementation Checklist

Frontend:
- [ ] Create `SchoolRegistration.js` (2-step form)
- [ ] Create `ApprovalStatusModal.js` (status display)
- [ ] Create `DashboardGate.js` (approval check)
- [ ] Create `SuperadminPendingApprovals.js` (superadmin review panel)
- [ ] Update `login.js` to handle 403 pending approval
- [ ] Update `App.js` to integrate DashboardGate
- [ ] Update API client headers for registration multipart
- [ ] Test complete flow: register → login → approval → dashboard

Database Cleanup:
- [ ] Run `scripts/clean-schools-data.sh` to delete existing schools
- [ ] Verify School and SchoolAdmin tables are empty
- [ ] Verify User table has no school admins (except staff/superadmin)

Backend Testing:
- [ ] POST /api/registration/register-school-admin → creates user + school
- [ ] GET /api/approval/pending-schools → shows new school
- [ ] POST /api/approval/approve-school → activates admin + sends email
- [ ] User login attempt after approval → succeeds

---

## Error Handling

### Registration Errors
- "Username already exists" → User entered duplicate username
- "Email already registered" → User email already used
- "School email already registered" → School email already used
- "Password must be at least 8 characters" → Password too short

### Login Errors
- "Your account is pending approval by the Superadmin." (403) → Show pending modal
- "Invalid credentials" (401) → Show error message

### Approval Errors
- "School not found" (404) → Redirect to pending list
- "School already approved/rejected" (400) → Refresh list

---

## Next Steps

1. Implement backend database cleanup script
2. Create frontend components in order:
   - SchoolRegistration
   - ApprovalStatusModal
   - DashboardGate
   - SuperadminPendingApprovals
3. Update login.js and App.js routing
4. Test complete flow end-to-end
5. Deploy to staging for UAT
