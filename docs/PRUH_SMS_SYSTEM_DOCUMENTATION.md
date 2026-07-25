# PRUH SMS — Complete System Documentation

**Platform:** PRUH School Management System (PRUH SMS)
**Version:** 1.0.0
**Frontend:** React 19 (Create React App)
**Backend:** Node.js + Express 4 + Sequelize 6
**Database:** MySQL (pruh_db)
**Deployment:** Vercel (frontend) + Ubuntu/Nginx (backend)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Frontend Application](#3-frontend-application)
4. [Backend Application](#4-backend-application)
5. [Database Schema](#5-database-schema)
6. [Model Associations](#6-model-associations)
7. [API Reference](#7-api-reference)
8. [Authentication & Authorization](#8-authentication--authorization)
9. [Deployment Guide](#9-deployment-guide)
10. [Security](#10-security)
11. [Environment Configuration](#11-environment-configuration)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. System Overview

PRUH SMS is a multi-tenant school management platform serving six user roles:

| Role | Dashboard | Description |
|------|-----------|-------------|
| **Superadmin** | `/superadmin` | Platform-wide oversight, school approval, system health, security logs |
| **School Admin** | `/dashboard/school-admin` | School-level management: students, teachers, classes, subjects, academics, finance |
| **Teacher** | `/dashboard/teacher` | Grade entry, attendance, assignments, lesson plans, messaging, analytics |
| **Student** | `/dashboard/student` | Grades, timetable, assignments, resources, report cards, study groups |
| **Parent** | `/parent` | Multi-child view: grades, attendance, behaviour, fees, conferences, donations |
| **Principal** | `/principal` | Grade approvals, report card publishing, syllabus progress, performance overview |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (User)                           │
│  pruhsms.africa (Vercel)                                    │
│  React SPA (CRA)                                            │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS /api/*
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Nginx Reverse Proxy (Ubuntu)                   │
│  backend.pruhsms.africa:443 → localhost:3006               │
│  /api/* → http://127.0.0.1:3006                             │
└────────────────────────┬────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│           Node.js + Express Backend (PM2)                   │
│  Port 3006                                                  │
│  Middleware: CORS, JWT Auth, BodyParser, Multer             │
│  12 Route Modules → 15 Controller Files                     │
│  60+ Sequelize Models → MySQL                               │
└────────────────────────┬────────────────────────────────────┘
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    MySQL Database                            │
│  pruh_db                                                    │
│  60+ tables (pruh_core_*, pruh_finance_*, sa_*)            │
└─────────────────────────────────────────────────────────────┘
```

### 2.1 Technology Stack

**Frontend:**
- React 19, Create React App 5
- Three.js (landing page animations)
- Framer Motion (UI animations)
- GSAP (scroll animations)
- Pure CSS with CSS custom properties (no UI framework)
- Custom state-based routing (no React Router)

**Backend:**
- Node.js, Express 4
- Sequelize 6 ORM + mysql2
- JWT (jsonwebtoken) authentication
- Multer file uploads
- Resend (email/OTP)
- Google Gemini AI (syllabus generation)
- bcryptjs password hashing

**Database:**
- MySQL 8+
- 60+ tables across namespaces:
  - `pruh_core_*` — Core domain (users, schools, students, grades, etc.)
  - `pruh_finance_*` — Financial (fees, payments, expenses)
  - `sa_*` — Superadmin/system (audit logs, forensic events, settings)

---

## 3. Frontend Application

### 3.1 Project Structure

```
src/
├── api/                    # API client modules
│   ├── client.js           # Core ApiClient class (auth headers, retry, error handling)
│   ├── teacherApi.js       # ~70 teacher API methods
│   ├── studentApi.js       # ~55 student API methods
│   ├── parentApi.js        # ~35 parent API methods
│   └── adminApi.js         # School admin + principal API methods
├── components/
│   ├── common/             # Shared components (ErrorBoundary, QRCode, Skeleton, etc.)
│   ├── shared/             # Shared form components (PhoneInput)
│   ├── teacher/            # 50+ teacher dashboard components
│   ├── student/            # 35+ student dashboard components
│   ├── parent/             # 30+ parent dashboard components
│   ├── schooladmin/        # School admin dashboard + sub-modules
│   │   ├── FinanceUsers/   # Finance user management (13 files)
│   │   ├── Parents/        # Parent management (9 files)
│   │   ├── Principal/      # Principal management (17 files)
│   │   ├── Students/       # Student CRUD with wizard (15 files)
│   │   └── Teachers/       # Teacher CRUD with wizard (17 files)
│   ├── superadmin/         # 20+ superadmin dashboard components
│   └── principal/          # Principal dashboard
├── context/                # React Context providers
│   ├── ThemeContext.js      # Dark/light/high-contrast/color-blind themes
│   ├── TeacherContext.js    # Teacher state management
│   ├── ChildContext.js      # Active child selection (parents)
│   ├── NotificationContext.js / TeacherNotificationContext.js / ParentNotificationContext.js
│   ├── I18nContext.js       # Internationalization
│   └── LowDataContext.js    # Low-bandwidth mode
├── hooks/                  # Custom React hooks
│   ├── useSchoolContext.js  # Academic year/term/school info with caching
│   ├── useGradeEntry.js     # Grade table with auto-save, letter calculation
│   ├── useStudentData.js    # SWR-lite stale-while-revalidate cache
│   ├── useAutoSave.js       # Debounced localStorage auto-save
│   ├── useGradeAutoSave.js  # Grade-specific auto-save with recovery
│   ├── useTicker.js         # Interval re-render with tab visibility
│   └── 15+ more hooks       # Per-role data fetching hooks
├── utils/                  # Utility modules
│   ├── gradeUtils.js        # Grade letter calc, validation, color coding
│   ├── teacherUtils.js      # Timetable scheduling, workload, notifications
│   ├── studentUtils.js      # Formatting, masking, grade colors
│   ├── parentUtils.js       # Grade colors, notification metadata
│   ├── security.js          # XSS sanitization, CSRF, validation
│   ├── securityMonitoring.js # Rate limiter, session timeout, suspicious activity
│   ├── csp.js               # CSP header generation
│   └── qr.js                # Pure-JS QR encoder (byte mode, ECC M)
├── config/
│   └── security.js          # API URL, CSP directives, rate limits, password rules
├── i18n/                   # Internationalization
│   ├── en.json              # English translations
│   └── translations.js      # Translation loader
└── App.js                  # Root component with routing
```

### 3.2 Navigation & Routing

The app uses **custom state-based routing** (no React Router):

| Path | Page Component | Auth Required |
|------|---------------|---------------|
| `/` | Landing page | No |
| `/login` | Login form | No |
| `/register` | Multi-step school registration | No |
| `/verify/<hash>` | Public QR verification | No |
| `/superadmin` | Superadmin dashboard | Yes (superadmin) |
| `/dashboard/school-admin` | School admin dashboard | Yes (school_admin) |
| `/dashboard/teacher` | Teacher dashboard | Yes (teacher) |
| `/dashboard/student` | Student dashboard | Yes (student) |
| `/parent` | Parent dashboard | Yes (parent) |
| `/parent/*` | Parent sub-pages | Yes (parent) |
| `/principal` | Principal dashboard | Yes (principal) |
| `/teacher/*` | Teacher sub-pages | Yes (teacher) |

**Auto-redirect on login:** Role-based redirect immediately after successful authentication.

### 3.3 State Management

- **React Context** for cross-cutting concerns (theme, notifications, active child)
- **Custom hooks with SWR-lite pattern** (`useStudentData.js`) for API data caching
- **localStorage** for auth tokens, user profile, theme preferences, grade drafts
- **Component-local state** for form inputs and UI state
- **No Redux or external state library**

### 3.4 Styling System

- **Pure CSS** with BEM-like naming conventions:
  - `lp-*` = Landing page
  - `tch-*` = Teacher dashboard
  - `stu-*` = Student dashboard
  - `par-*` = Parent dashboard
  - `ska-*` = School admin
  - `sa-*` = Superadmin
  - `ek-*` = App-wide
  - `a11y-*` = Accessibility
- **CSS Custom Properties** per role for theming (primary colors, surfaces, text)
- **Theme switching** via `data-theme="dark|light"`, `data-contrast="normal|high"`, `data-cblind="off|on"` on `<html>`
- **Icon system:** Material Symbols (`material-symbols-outlined`) + inline SVGs

---

## 4. Backend Application

### 4.1 Project Structure

```
backend_node/
├── src/
│   ├── index.js                 # Express app entry point
│   ├── config/
│   │   └── db.js                # Sequelize + MySQL connection
│   ├── middleware/
│   │   └── auth.js              # JWT verification middleware
│   ├── models/
│   │   ├── index.js             # Model loader (loads all models → associations)
│   │   ├── associations.js      # ALL cross-model relationships (centralized)
│   │   └── *.js                 # 60+ individual model definitions
│   ├── controllers/
│   │   ├── authController.js        # Login, register, OTP
│   │   ├── schoolController.js      # School CRUD, students, teachers, classes (76 fns)
│   │   ├── teacherController.js     # Gradebook, attendance, messages (77 fns)
│   │   ├── studentController.js     # Grades, timetable, assignments (57 fns)
│   │   ├── parentController.js      # Children, grades, fees, messaging (34 fns)
│   │   ├── financeController.js     # Fees, payments, expenses, reports (29 fns)
│   │   ├── principalController.js   # Grade approvals, report cards
│   │   ├── superadminController.js  # School approval, impersonation, system health
│   │   ├── superadminDataController.js # Superadmin data queries
│   │   ├── approvalController.js    # School registration approval workflow
│   │   ├── registrationController.js # School admin registration
│   │   ├── whistleblowerController.js # Anonymous reporting
│   │   ├── syllabusGenerator.js     # AI-powered syllabus generation (Gemini)
│   │   ├── loggingController.js     # Frontend event logging
│   │   └── testController.js        # Email test endpoint
│   ├── routes/
│   │   ├── auth.js              # /api/login/, /api/register/, /api/send-otp/
│   │   ├── school.js            # /api/school/* (282 lines, 70+ endpoints)
│   │   ├── teacher.js           # /api/teacher/*
│   │   ├── student.js           # /api/student/*
│   │   ├── parent.js            # /api/parent/*
│   │   ├── principal.js         # /api/principal/*
│   │   ├── finance.js           # /api/finance/*
│   │   ├── superadmin.js        # /api/schools/*, /api/impersonate/
│   │   ├── registration.js      # /api/registration/*
│   │   ├── approval.js          # /api/approval/*
│   │   ├── whistleblower.js     # /api/whistleblower/*
│   │   └── live-classes.js      # /api/live-classes/*
│   └── utils/
│       ├── jwt.js               # JWT sign/verify (24h expiry)
│       ├── auditLog.js          # Security audit logging
│       ├── roleIds.js           # Role code → ID resolution
│       ├── password.js          # Django PBKDF2 compat
│       └── email.js             # Resend email integration
├── migrations/
│   ├── run-all-tables.js        # Creates 30 new tables
│   └── 2026-05-18-all-new-tables.sql
├── scripts/
│   ├── seedSuperAdmin.js        # Creates initial superadmin
│   └── seedRoles.js             # Seeds role table
└── .env                         # Environment configuration
```

### 4.2 Middleware Stack (in order)

| Middleware | Purpose |
|-----------|---------|
| `cors()` | CORS with 4 allowed origins |
| `bodyParser.json({ limit: '50mb' })` | JSON body parsing |
| `bodyParser.urlencoded({ extended: true })` | URL-encoded body parsing |
| `express.static('/uploads')` | Static file serving |
| `authenticateToken` (per-route) | JWT Bearer/Token verification |
| `isSuperadmin` (superadmin routes) | Role-based access control |

### 4.3 Server Configuration

| Setting | Value |
|---------|-------|
| Port | `3006` (production) / `3000` (default) |
| CORS Origins | `backend.pruhsms.africa`, `pruhsms.africa`, `www.pruhsms.africa`, `ek-sms-one.vercel.app` |
| Body Limit | 50MB |
| Upload Limit | 50MB (badges), 5MB (branding), 20MB (syllabus docs) |
| JWT Expiry | 24 hours |
| DB Sync | `alter: true` only in non-production |

### 4.4 Upload Directories

| Directory | Purpose |
|-----------|---------|
| `uploads/badges/` | School badge/logo images |
| `uploads/branding/` | Superadmin branding assets |
| `uploads/syllabus-docs/` | Syllabus generation source documents |

---

## 5. Database Schema

### 5.1 Table Namespaces

| Prefix | Tables | Purpose |
|--------|--------|---------|
| `pruh_core_*` | ~48 tables | Core domain: users, schools, students, teachers, classes, grades, etc. |
| `pruh_finance_*` | 4 tables | Financial: fees, payments, expenses, fee categories |
| `sa_*` | 5 tables | Superadmin: audit logs, forensic events, system alerts, settings |

### 5.2 Core Domain Models

#### Users & Roles
| Table | Key Fields |
|-------|-----------|
| `pruh_core_user` | id, username (unique), password (bcrypt), email, first_name, last_name, phone, role_id (FK), school_id (FK), is_active, is_superuser, two_factor_enabled, last_login, is_staff |
| `pruh_core_role` | id, name, code (unique), description |

#### School Hierarchy
| Table | Key Fields |
|-------|-----------|
| `pruh_core_school` | id, name, email, phone, address, city, country, badge_path, brand_colors (JSON), institution_type, capacity, is_approved, is_active, motto, rejection_reason, changes_requested, approval_date |
| `pruh_core_school_admin` | id, school_id (FK), user_id (FK), role, access_level, is_active |
| `pruh_core_academic_year` | id, school_id (FK), name, start_date, end_date, is_active |
| `pruh_core_term` | id, school_id (FK), name, academic_year_id (FK), start_date, end_date, is_active |

#### Staff & Students
| Table | Key Fields |
|-------|-----------|
| `pruh_core_teacher` | id, school_id (FK), user_id (FK), employee_id, phone_number, qualification, hire_date, is_active, is_examination_officer, years_experience, bio, linkedin_url, degrees (JSON), certifications (JSON), profile_picture |
| `pruh_core_student` | id, school_id (FK), user_id (FK), classroom_id (FK), academic_year_id (FK), admission_number (unique), admission_date, date_of_birth, gender, student_type, status, fee_category, father_name/phone/email/occupation/address, mother_name/phone/email/occupation/address, emergency_contact/phone, blood_type, allergies, medical_notes, doctor_name/phone, passport_picture, vaccinations (JSON), place_of_birth, nationality, religion, home_language, sen_status/notes, disciplinary_notes, home_address, city, phone_number |

#### Academics
| Table | Key Fields |
|-------|-----------|
| `pruh_core_class` | id, school_id (FK), name, code, form, form_number, category, stream, class_teacher_id (FK), capacity, academic_year_id (FK), room, start_time, end_time, colour_tag, education_level, track, notes, auto_promotion_target_id, is_active |
| `pruh_core_subject` | id, school_id (FK), name, code, description, is_active |
| `pruh_core_class_subject` | id, class_id (FK), subject_id (FK), teacher_id (FK) |
| `pruh_core_class_assistant_teacher` | id, class_id (FK), teacher_id (FK) |
| `pruh_core_grade` | id, school_id (FK), student_id (FK), subject_id (FK), term_id (FK), classroom_id (FK), ca_score, midterm_score, exam_score, total, grade_letter, remarks, approval_status (pending/approved/rejected), approved_by (FK), approved_at, payment_hash |
| `pruh_core_attendance` | id, school_id (FK), student_id (FK), classroom_id (FK), date, status (present/absent/late/excused), remarks |
| `pruh_core_exam` | id, school_id (FK), term_id (FK), subject_id (FK), classroom_id (FK), name, date, total_marks, is_active |
| `pruh_core_syllabus_topic` | id, school_id (FK), class_id (FK), subject_id (FK), term_id (FK), teacher_id (FK), title, description, group_name, priority, duration_weeks, week_number, status, date_covered |
| `pruh_core_grading_scheme` | id, school_id (FK), pass_mark, boundaries (JSON) |
| `pruh_core_room` | id, school_id (FK), name, code, capacity, room_type |

#### Communication & Collaboration (30 new tables)

**Messaging:**
| Table | Key Fields |
|-------|-----------|
| `pruh_core_message` | id, school_id (FK), sender_id, sender_type, recipient_id, recipient_type, subject, body, is_read, thread_id |
| `pruh_core_notification` | id, school_id (FK), user_id (FK), title, message, type, is_read, created_at |
| `pruh_core_acknowledgment` | id, school_id (FK), user_id (FK), record_type, record_id, acknowledged_at |

**Assignments & Resources:**
| Table | Key Fields |
|-------|-----------|
| `pruh_core_assignment` | id, school_id (FK), class_id (FK), subject_id (FK), teacher_id (FK), title, description, due_date, max_score, attachment_path, is_active |
| `pruh_core_assignment_submission` | id, assignment_id (FK), student_id (FK), submitted_at, content, attachment_path, score, feedback, status |
| `pruh_core_learning_resource` | id, school_id (FK), class_id (FK), subject_id (FK), teacher_id (FK), title, description, resource_type, file_path, url, is_active, download_count |
| `pruh_core_resource_visit` | id, resource_id (FK), student_id (FK), visited_at |

**Scheduling:**
| Table | Key Fields |
|-------|-----------|
| `pruh_core_office_hour` | id, school_id (FK), teacher_id (FK), date, start_time, end_time, slot_duration_minutes, max_bookings, is_active |
| `pruh_core_office_hour_booking` | id, office_hour_id (FK), student_id (FK), parent_id (FK), status, notes |
| `pruh_core_conference_slot` | id, school_id (FK), teacher_id (FK), date, start_time, end_time, status, parent_id (FK), notes |
| `pruh_core_live_class` | id, school_id (FK), teacher_id (FK), class_id (FK), subject_id (FK), title, description, meeting_url, scheduled_at, duration_minutes, is_active |

**Student Services:**
| Table | Key Fields |
|-------|-----------|
| `pruh_core_behaviour_incident` | id, school_id (FK), student_id (FK), reported_by (FK), incident_type, severity, description, action_taken, follow_up_required, follow_up_date, parent_notified |
| `pruh_core_lesson_plan` | id, school_id (FK), teacher_id (FK), class_id (FK), subject_id (FK), date, topic, objectives, activities, materials, homework, reflection |
| `pruh_core_student_goal` | id, school_id (FK), student_id (FK), title, description, target_date, status, progress_pct |
| `pruh_core_study_group` | id, school_id (FK), name, subject_id (FK), teacher_id (FK), description, meeting_schedule, is_active |
| `pruh_core_study_group_member` | id, study_group_id (FK), student_id (FK), role |
| `pruh_core_study_plan` | id, school_id (FK), student_id (FK), day_of_week, start_time, end_time, subject, activity, is_active |
| `pruh_core_transcript_request` | id, school_id (FK), student_id (FK), requested_by (FK), status, requested_at, completed_at |
| `pruh_core_student_document` | id, school_id (FK), student_id (FK), title, file_path, file_type, uploaded_by (FK), is_verified |

**Parent Services:**
| Table | Key Fields |
|-------|-----------|
| `pruh_core_pickup_person` | id, school_id (FK), student_id (FK), name, phone, relationship, is_authorized |
| `pruh_core_co_guardian` | id, school_id (FK), student_id (FK), guardian_user_id (FK), relationship, status, invited_at |
| `pruh_core_permission_slip` | id, school_id (FK), title, description, event_date, expiry_date, is_active |
| `pruh_core_permission_slip_signature` | id, slip_id (FK), student_id (FK), parent_id (FK), signed_at, signature_hash |

**Other:**
| Table | Key Fields |
|-------|-----------|
| `pruh_core_channel_preference` | id, user_id (FK, unique), push, email, sms, in_app, whatsapp |
| `pruh_core_modification_request` | id, school_id (FK), student_id (FK), subject_id (FK), grade_id (FK), requested_by (FK), request_type, reason, current_value, requested_value, status, reviewed_by (FK), reviewed_at |
| `pruh_core_whistleblower_category` | id, school_id (FK), name, description, is_active |
| `pruh_core_whistleblower_report` | id, school_id (FK), category_id (FK), title, description, severity, follow_up_key (unique), status, reporter_type |
| `pruh_core_donation_campaign` | id, school_id (FK), title, description, target_amount, current_amount, start_date, end_date, is_active |
| `pruh_core_donation` | id, campaign_id (FK), donor_id (FK), amount, is_anonymous, receipt_hash, paid_at |
| `pruh_core_peer_review` | id, school_id (FK), reviewer_id (FK), reviewee_id (FK), category, rating, comment |
| `pruh_core_spotlight_student` | id, school_id (FK), teacher_id (FK), student_id (FK), reason, week_start, week_end |
| `pruh_core_otp` | id, user_id (FK), otp, type, expires_at, is_used, created_at |

### 5.3 Finance Models

| Table | Key Fields |
|-------|-----------|
| `pruh_finance_fee_category` | id, school_id (FK), name, description, amount, frequency, applicable_classes (JSON), is_active |
| `pruh_finance_fee` | id, school_id (FK), student_id (FK), fee_category_id (FK), term_id (FK), amount, discount, amount_due, amount_paid, status, due_date |
| `pruh_finance_payment` | id, school_id (FK), student_id (FK), fee_id (FK), amount, payment_method, reference, receipt_number, payment_hash, status, notes, paid_by, paid_at |
| `pruh_finance_expense` | id, school_id (FK), category, description, amount, date, receipt_path, approved_by, status |

### 5.4 Superadmin/System Models

| Table | Key Fields |
|-------|-----------|
| `sa_superadmin_settings` | id (PK=1), settings_json |
| `sa_forensic_events` | id, event_type, event_label, description, actor, ip, severity, resolved, resolved_at, metadata_json |
| `sa_system_ops_alerts` | id, title, body, severity, trigger_type, status, notes |
| `sa_broadcast_alerts` | id, title, message, severity, audience, target_school, status, sent_at, created_by |
| `sa_security_audit_log` | id, type, severity, actor, ip, action, metadata_json, ts |

---

## 6. Model Associations

All 80+ associations are defined centrally in `src/models/associations.js`. Individual model files contain NO inline `hasMany`/`belongsTo` calls.

### 6.1 Core Associations

```
School
  └─hasMany→ AcademicYear, Term, Class, Subject, Student, SchoolAdmin,
  └─hasMany→ Teacher, FeeCategory, Fee, Payment, Expense, GradingScheme,
  └─hasMany→ Room, Notification, Exam, SyllabusTopic, Attendance, Grade,
  └─hasMany→ Message, Assignment, LearningResource, OfficeHour,
  └─hasMany→ BehaviourIncident, LessonPlan, Goal, StudyGroup,
  └─hasMany→ ConferenceSlot, PickupPerson, PermissionSlip,
  └─hasMany→ Document, TranscriptRequest, StudyPlan, DonationCampaign,
  └─hasMany→ Acknowledgment, CoGuardian, ModificationRequest,
  └─hasMany→ WhistleblowerCategory, LiveClass, PeerReview, SpotlightStudent

AcademicYear
  └─hasMany→ Term, Class, Student

Term
  └─hasMany→ Grade, Fee, Exam, SyllabusTopic

Class
  └─hasMany→ ClassSubject, ClassAssistantTeacher, Attendance, Grade,
  └─hasMany→ Exam, SyllabusTopic, Student

User
  └─hasOne→ Student, Teacher, SchoolAdmin, ChannelPreference
  └─hasMany→ Notification

Student
  └─hasMany→ Attendance, Grade, Fee, Payment

Teacher
  └─hasMany→ Class (as class_teacher), ClassSubject, SyllabusTopic
  └─hasMany→ LessonPlan, OfficeHour, ConferenceSlot, BehaviourIncident

Subject
  └─hasMany→ Grade, Exam, SyllabusTopic, ClassSubject
```

### 6.2 Extended Associations

```
Assignment → hasMany AssignmentSubmission
AssignmentSubmission → belongsTo Assignment, Student
LearningResource → hasMany ResourceVisit
ResourceVisit → belongsTo LearningResource, Student
OfficeHour → hasMany OfficeHourBooking
OfficeHourBooking → belongsTo OfficeHour, Student, User (parent)
StudyGroup → hasMany StudyGroupMember
StudyGroupMember → belongsTo StudyGroup, Student
PermissionSlip → hasMany PermissionSlipSignature
PermissionSlipSignature → belongsTo PermissionSlip, Student, User (parent)
DonationCampaign → hasMany Donation
Donation → belongsTo DonationCampaign, User (donor)
FeeCategory → hasMany Fee
Fee → hasMany Payment
WhistleblowerCategory → hasMany WhistleblowerReport
```

---

## 7. API Reference

### 7.1 Base URL

```
https://backend.pruhsms.africa/api/
```

### 7.2 Authentication

All endpoints except login, register, and OTP require:
```
Authorization: Bearer <jwt_token>
```

### 7.3 Endpoint Summary by Module

#### Auth Routes (`/api/`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/login/` | No | User login (username/email + password) |
| POST | `/logout/` | No | Logout |
| POST | `/register/` | No | School + admin registration |
| POST | `/send-otp/` | No | Send email OTP |
| POST | `/verify-otp/` | No | Verify OTP code |

#### School Routes (`/api/school/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/school/info/` | Get school profile and stats |
| POST | `/school/info/` | Update school info + badge upload |
| GET | `/school/students/` | List students |
| POST | `/school/students/` | Create student |
| PUT | `/school/students/:id/` | Update student |
| GET | `/school/students/next-admission-number/` | Next available admission number |
| GET | `/school/student-stats/` | Student statistics |
| GET | `/school/teachers/` | List teachers |
| POST | `/school/teachers/` | Create teacher |
| PUT | `/school/teachers/:id/` | Update teacher |
| GET | `/school/teacher-stats/` | Teacher statistics |
| GET | `/school/classes/` | List classes |
| GET | `/school/classes/:id/` | Get class by ID |
| POST | `/school/classes/` | Create class |
| PUT | `/school/classes/:id/` | Update class |
| DELETE | `/school/classes/:id/` | Delete class |
| POST | `/school/classes/bulk-create/` | Bulk create classes |
| POST | `/school/classes/:id/assign-students/` | Assign students to class |
| POST | `/school/classes/:id/assign-subjects/` | Assign subjects to class |
| GET | `/school/subjects/` | List subjects |
| POST | `/school/subjects/` | Create subject |
| PUT | `/school/subjects/:id/` | Update subject |
| DELETE | `/school/subjects/:id/` | Delete subject |
| POST | `/school/subjects/:id/assign-classes/` | Assign classes to subject |
| POST | `/school/subjects/:id/assign-teachers/` | Assign teachers to subject |
| GET | `/school/context/` | Get academic context (current year/term) |
| GET | `/school/academic-years/` | List academic years |
| POST | `/school/academic-years/` | Create academic year |
| GET | `/school/terms/` | List terms |
| POST | `/school/terms/` | Create term |
| PUT | `/school/terms/:id/` | Update term |
| DELETE | `/school/terms/:id/` | Delete term |
| GET | `/school/grades/` | Get grades |
| POST | `/school/grades/` | Save grades |
| POST | `/school/attendance/` | Record attendance |
| GET | `/school/grading-scheme/` | Get grading scheme |
| POST | `/school/grading-scheme/` | Set grading scheme |
| GET | `/school/rooms/` | List rooms |
| POST | `/school/rooms/` | Create room |
| GET | `/school/exams/` | List exams |
| POST | `/school/exams/` | Create exam |
| GET | `/school/notifications/` | List notifications |
| POST | `/school/notifications/` | Create notification |
| GET | `/school/analytics/` | School analytics |
| GET | `/school/finance/stats/` | Finance dashboard stats |
| GET | `/school/finance/fees/` | List fee categories |
| POST | `/school/finance/expenses/` | Record expense |
| GET | `/school/finance/expenses/` | List expenses |
| GET | `/school/messages/` | List messages |
| POST | `/school/messages/` | Send message |
| POST | `/school/attendance/class/` | Record class attendance |
| POST | `/school/parents/` | Create parent |
| GET | `/school/principal-users/` | List principal users |
| POST | `/school/principal-users/` | Create principal user |
| GET | `/school/finance-users/` | List finance users |
| POST | `/school/finance-users/` | Create finance user |
| POST | `/school/timetable/generate/` | Generate timetable |
| DELETE | `/school/timetable/` | Delete timetable |
| POST | `/school/modification-requests/review/` | Review grade modification |

#### Teacher Routes (`/api/teacher/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/profile/` | Teacher profile |
| GET | `/classes/` | Assigned classes |
| GET | `/classes/:id/students/` | Students in class |
| GET | `/classes/:id/students/:studentId/activity/` | Student activity |
| GET | `/gradebook/` | Gradebook entries |
| POST | `/gradebook/draft/` | Save grade draft |
| POST | `/gradebook/submit/` | Submit grades for locking |
| POST | `/gradebook/lock/` | Lock single grade |
| GET | `/grades/history/` | Grade history |
| GET | `/grading-scheme/` | Get grading scheme |
| GET | `/modification-requests/` | List modification requests |
| POST | `/modification-requests/` | Submit modification request |
| POST | `/modification-requests/:id/withdraw/` | Withdraw request |
| GET | `/analytics/class/` | Class analytics |
| GET | `/analytics/cohort-compare/` | Cohort comparison |
| GET | `/analytics/personal-performance/` | Personal performance |
| GET | `/current-term/` | Current term |
| GET | `/terms/` | All terms |
| GET | `/academic-calendar/` | Academic calendar |
| GET | `/assignments/` | List assignments |
| POST | `/assignments/` | Create assignment |
| DELETE | `/assignments/:id/` | Delete assignment |
| GET | `/exams/` | Teacher's exams |
| GET | `/exams/:id/results/` | Exam results |
| POST | `/exams/:id/results/` | Save exam results |
| GET | `/announcements/` | Class announcements |
| POST | `/announcements/` | Send announcement |
| GET | `/messages/` | Messages |
| POST | `/messages/` | Send message |
| GET | `/attendance/` | Attendance status |
| POST | `/attendance/` | Record attendance |
| GET | `/report-cards/` | Student report cards |
| GET | `/timetable/` | Teacher timetable |
| POST | `/timetable/generate/` | Generate timetable |
| GET | `/resources/` | Educational resources |
| POST | `/resources/` | Upload resource |
| DELETE | `/resources/:id/` | Delete resource |
| POST | `/resources/:id/recommend/` | Recommend resource |
| GET | `/feedback/students/` | Feedback student list |
| GET | `/feedback/messages/` | Feedback messages |
| POST | `/feedback/` | Send feedback |
| GET | `/feedback/templates/` | Feedback templates |
| POST | `/feedback/templates/` | Add feedback template |
| GET | `/students/grade-history/` | Student grade history |
| GET | `/students/at-risk/` | At-risk students |
| GET | `/exam-duties/` | Exam supervision duties |
| GET | `/verify/` | Hash verification |
| GET | `/tamper-count/` | Grade tamper count |
| GET | `/access-log/` | Data access history |
| GET | `/channel-preferences/` | Notification preferences |
| PUT | `/channel-preferences/` | Update preferences |
| GET | `/whistleblower/categories/` | Report categories |
| POST | `/whistleblower/report/` | Submit report |
| GET | `/whistleblower/status/:key/` | Check report status |
| GET | `/office-hours/` | Office hour slots |
| POST | `/office-hours/` | Publish slot |
| DELETE | `/office-hours/:id/` | Delete slot |
| GET | `/parent-threads/` | Parent message threads |
| POST | `/parent-threads/` | Send parent message |
| GET | `/student-threads/` | Student message threads |
| POST | `/student-threads/` | Send student message |
| GET | `/behaviour/` | Behaviour incidents |
| POST | `/behaviour/` | File incident |
| POST | `/substitute/issue/` | Issue substitute token |
| POST | `/substitute/revoke/` | Revoke substitute token |
| GET | `/substitute/list/` | List substitute tokens |
| GET | `/lesson-plans/` | Lesson plans |
| POST | `/lesson-plans/` | Create/update lesson plan |
| GET | `/peer-reviews/` | Peer reviews |
| POST | `/peer-reviews/` | Submit peer review |
| GET | `/spotlight/` | Spotlight student |
| POST | `/spotlight/` | Set spotlight student |
| GET | `/voice-digest/` | Voice digest |
| GET | `/grade-receipts/` | Grade receipts |
| POST | `/grade-receipts/submit/` | Submit grades + receipt |
| GET | `/live-classes/` | Live classes |
| POST | `/live-classes/` | Create live class |
| PUT | `/live-classes/:id/` | Update live class |
| DELETE | `/live-classes/:id/` | Delete live class |
| GET | `/modification-summary/` | Modification summary |
| POST | `/refer-counsellor/` | Refer student to counsellor |
| GET | `/workload/` | Workload calendar |
| GET | `/notifications/` | Teacher notifications |
| POST | `/notifications/:id/read/` | Mark notification read |
| POST | `/notifications/read-all/` | Mark all read |

#### Student Routes (`/api/student/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/profile/` | Student profile |
| GET | `/account/` | Account info |
| POST | `/change-password/` | Change password |
| POST | `/change-username/` | Change username |
| GET | `/current-term/` | Current term |
| GET | `/terms/` | All terms |
| GET | `/grades/` | Grades per term |
| GET | `/grades/summary/` | Grade summary |
| GET | `/grades/history/` | Grade history |
| GET | `/grades/peer-review/` | Peer review |
| GET | `/feedback/` | Feedback thread |
| POST | `/feedback/` | Send feedback message |
| GET | `/remedial/` | Remedial plan |
| POST | `/remedial/confirm/` | Confirm remedial session |
| GET | `/security-report/` | Grade security report |
| GET | `/security-health/` | Security health |
| POST | `/revoke-device/` | Revoke device access |
| GET | `/transcript/` | Get transcript |
| POST | `/transcript/download/` | Download transcript |
| POST | `/transcript/request/` | Request transcript |
| GET | `/report-cards/` | Report cards |
| POST | `/report-cards/download/` | Download report card |
| GET | `/notifications/` | Notifications |
| POST | `/notifications/:id/read/` | Mark read |
| POST | `/notifications/read-all/` | Mark all read |
| GET | `/2fa/setup/` | 2FA setup info |
| POST | `/2fa/enable/` | Enable 2FA |
| POST | `/2fa/disable/` | Disable 2FA |
| GET | `/financials/` | Financials |
| POST | `/receipts/download/` | Download receipt |
| GET | `/timetable/` | Timetable |
| GET | `/assignments/` | Assignments |
| POST | `/assignments/submit/` | Submit assignment |
| GET | `/conversations/` | Message conversations |
| POST | `/messages/` | Send message |
| GET | `/resources/` | Learning resources |
| GET | `/resources/last-visit/` | Resource last visit |
| POST | `/resources/visit/` | Mark resource visited |
| GET | `/attendance/` | Attendance record |
| GET | `/events/` | School events |
| GET | `/verify/` | Hash verification |
| GET | `/tamper-count/` | Tamper count |
| GET | `/who-saw-my-data/` | Data access log |
| GET | `/parental-access-log/` | Parental access log |
| POST | `/modification-objection/` | Object to modification |
| GET | `/channel-preferences/` | Channel preferences |
| PUT | `/channel-preferences/` | Update preferences |
| GET | `/whistleblower/categories/` | Report categories |
| POST | `/whistleblower/report/` | Submit report |
| GET | `/whistleblower/status/:key/` | Check status |
| GET | `/goals/` | Goals |
| POST | `/goals/` | Set goal |
| GET | `/office-hours/slots/` | Available slots |
| POST | `/office-hours/claim/` | Claim slot |
| POST | `/office-hours/cancel/` | Cancel slot |
| GET | `/counsellor/` | Counsellor thread |
| POST | `/counsellor/` | Send counsellor message |
| GET | `/study-groups/` | Study groups |
| POST | `/study-groups/join/` | Join group |
| POST | `/study-groups/leave/` | Leave group |
| GET | `/streaks/` | Learning streaks |
| GET | `/digital-id/` | Digital ID card |
| GET | `/documents/` | Document vault |
| POST | `/documents/` | Upload document |
| GET | `/study-plan/` | Study plan |
| POST | `/study-plan/` | Save study plan |
| GET | `/voice-summary/` | Voice summary |
| GET | `/subjects/deep-dive/` | Subject deep dive |
| GET | `/live-classes/` | Live classes |

#### Parent Routes (`/api/parent/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/children/` | List children |
| GET | `/children/:id/grades/` | Child grades |
| GET | `/children/:id/grades/history/` | Grade history |
| GET | `/children/:id/report-cards/` | Report cards |
| POST | `/children/:id/report-cards/download/` | Download report card |
| GET | `/notifications/` | Notifications |
| POST | `/notifications/:id/read/` | Mark read |
| POST | `/notifications/read-all/` | Mark all read |
| GET | `/profile/` | Profile |
| PUT | `/profile/` | Update profile |
| GET | `/2fa/setup/` | 2FA setup |
| POST | `/2fa/enable/` | Enable 2FA |
| POST | `/2fa/disable/` | Disable 2FA |
| GET | `/children/:id/attendance/` | Child attendance |
| GET | `/children/:id/behaviour/` | Child behaviour |
| GET | `/children/:id/fees/` | Child fees |
| GET | `/payment-channels/` | Payment channels |
| POST | `/pay/` | Start payment |
| GET | `/receipts/` | Receipts |
| POST | `/receipts/download/` | Download receipt PDF |
| GET | `/verify/` | Hash verification |
| GET | `/tamper-count/` | Tamper count |
| GET | `/access-log/` | Access log |
| POST | `/modification-objection/` | Object to modification |
| GET | `/channel-preferences/` | Channel preferences |
| PUT | `/channel-preferences/` | Update preferences |
| GET | `/whistleblower/categories/` | Report categories |
| POST | `/whistleblower/report/` | Submit report |
| GET | `/whistleblower/status/:key/` | Check status |
| GET | `/conference-slots/` | Conference slots |
| POST | `/conference-slots/claim/` | Claim slot |
| POST | `/conference-slots/cancel/` | Cancel slot |
| GET | `/counsellor/` | Counsellor |
| POST | `/counsellor/` | Send counsellor message |
| GET | `/teacher-threads/` | Teacher threads |
| POST | `/teacher-threads/` | Send teacher message |
| GET | `/co-guardians/` | Co-guardians |
| POST | `/co-guardians/invite/` | Invite co-guardian |
| DELETE | `/co-guardians/:id/` | Remove co-guardian |
| GET | `/pickup-list/` | Pickup allow list |
| POST | `/pickup-list/` | Add pickup person |
| DELETE | `/pickup-list/:id/` | Remove pickup person |
| GET | `/permission-slips/` | Permission slips |
| POST | `/permission-slips/sign/` | Sign permission slip |
| POST | `/acknowledge/` | Acknowledge record |
| GET | `/acknowledgments/` | Acknowledgments |
| GET | `/events/` | School events |
| GET | `/donations/` | Donation campaigns |
| POST | `/donations/` | Donate to campaign |
| GET | `/end-of-term-pack/` | End of term pack |
| GET | `/weekly-digest/` | Weekly digest |
| GET | `/voice-digest/` | Voice digest |
| GET | `/activity/` | Family activity feed |

#### Superadmin Routes (`/api/schools/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/schools/` | List all schools |
| POST | `/schools/approve/` | Approve/reject/request changes |
| POST | `/impersonate/` | Impersonate school admin |
| GET | `/grade-alerts/` | Grade integrity alerts |
| GET | `/system-health/` | System health metrics |
| POST | `/reset-user-password/` | Reset any user's password |
| GET | `/security-logs/` | Security audit logs |
| GET | `/security-counters/` | Security event counters |
| GET | `/profile/` | Superadmin profile |
| PATCH | `/profile/` | Update profile |
| POST | `/change-password/` | Change password |
| GET | `/admin-settings/` | System settings |
| PATCH | `/admin-settings/` | Update settings |
| GET | `/users/` | List all users |
| GET | `/get-users/` | Short user list |
| POST | `/users/` | Create user |
| GET | `/school-stats/` | Cross-school statistics |
| GET | `/grade-stats/` | Grade statistics |
| GET | `/forensic-events/` | Forensic event log |
| GET | `/broadcast-alerts/` | Broadcast alerts |
| POST | `/broadcast-alerts/` | Send broadcast alert |
| GET | `/system-alerts/` | System alerts |
| POST | `/system-alerts/` | Create system alert |
| POST | `/sa/branding/` | Upload branding asset |
| GET | `/sa/lockdown/` | Lockdown status |
| POST | `/sa/lockdown/` | Toggle lockdown |
| POST | `/sa/backup/manual/` | Trigger manual backup |
| GET | `/sa/custom-roles/` | Custom roles |
| POST | `/sa/custom-roles/` | Create custom role |
| GET | `/sa/export/` | Export data |

#### Principal Routes (`/api/principal/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/overview/` | Dashboard overview |
| GET | `/grade-approvals/` | Pending grade approvals |
| POST | `/grade-approvals/review/` | Approve/reject grade change |
| GET | `/report-cards/` | Report cards list |
| POST | `/report-cards/publish/` | Publish report cards |
| POST | `/report-cards/:id/comment/` | Comment on report card |

#### Finance Routes (`/api/finance/`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/stats/` | Finance dashboard stats |
| PUT | `/grade-approvals/:id/` | Update grade approval |
| POST | `/grade-approvals/bulk-approve/` | Bulk approve |
| GET | `/overview/` | Finance overview |
| GET | `/class-performance/` | Class performance |
| GET | `/teacher-insights/` | Teacher insights |
| GET | `/finance-snapshot/` | Finance snapshot |
| GET | `/activity-feed/` | Activity feed |
| GET | `/syllabus-progress/` | Syllabus progress |

---

## 8. Authentication & Authorization

### 8.1 Login Flow

```
User → POST /api/login/ { username, password }
  ├─ Find user by username/email
  ├─ Verify password (bcryptjs)
  ├─ Check is_active (reject pending accounts)
  ├─ Determine role (superadmin/school_admin/teacher/student/parent/etc.)
  ├─ Generate JWT (24h expiry)
  └─ Return { token, user: { id, username, role, is_active, ... } }
```

### 8.2 Token Format

```json
{
  "id": 1,
  "username": "admin",
  "role": "school_admin",
  "is_superuser": false,
  "is_staff": false,
  "iat": 1779255808,
  "exp": 1779342208
}
```

### 8.3 Authorization Middleware

**`authenticateToken`** (all protected routes):
1. Extract token from `Authorization: Bearer <token>` or `Authorization: Token <token>`
2. Verify with `jsonwebtoken.verify(token, JWT_SECRET)`
3. Attach decoded payload to `req.user`

**`isSuperadmin`** (superadmin routes only):
1. Check `req.user.is_superuser || req.user.role === 'superadmin'`
2. Return 403 if not superadmin

### 8.4 Role Detection (login)

Priority order for role determination:
1. `superadmin` — role code is `superadmin`
2. `school_admin` — has SchoolAdmin record
3. `teacher` — has Teacher record
4. `student` — has Student record
5. `principal` — role code is `principal`
6. `bursar` — role code is `bursar`
7. `parent` — role code is `parent`
8. `staff` — `is_staff` flag is true

---

## 9. Deployment Guide

### 9.1 Production Architecture

```
Internet → Vercel (frontend) → backend.pruhsms.africa → Nginx → Node.js:3006 → MySQL
```

### 9.2 Frontend Deployment (Vercel)

```bash
# Build
npm run build

# Deploy (via Vercel CLI or git push)
vercel --prod

# OR push to connected git repository
git push origin main
```

Configuration: `vercel.json` — SPA rewrites, security headers, env vars.

### 9.3 Backend Deployment (Ubuntu + PM2)

```bash
# On the server
cd /var/www/ek-sms/EK_SMS/backend_node

# Pull latest code
git pull

# Install dependencies
npm install

# Update .env with production values
# JWT_SECRET, DB credentials, RESEND_API_KEY, etc.

# Run migrations
node migrations/run-all-tables.js

# Restart with PM2
pm2 restart ek-sms-backend

# Check status
pm2 status
pm2 logs ek-sms-backend
```

### 9.4 Nginx Configuration

**`nginx_node_backend.conf`:**
```nginx
server {
    listen 80;
    server_name backend.pruhsms.africa;
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3006;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 9.5 Environment Variables (Production)

**`backend_node/.env`:**
```
PORT=3006
DB_NAME=pruh_db
DB_USER=eksms_user
DB_PASSWORD=<production_password>
DB_HOST=localhost
DB_PORT=3306
JWT_SECRET=<64-char-hex-secret>
RESEND_API_KEY=re_<resend_key>
DEFAULT_FROM_EMAIL=PRUH-SMS <noreply@elkendeh.com>
SUPERADMIN_SEED_USERNAME=Elkendeh@1
SUPERADMIN_SEED_EMAIL=admin@elkendeh.com
SUPERADMIN_SEED_PASSWORD=<strong_password>
GEMINI_API_KEY=AIzaSy<gemini_key>
```

**Vercel env vars:**
```
REACT_APP_API_URL=https://backend.pruhsms.africa
REACT_APP_ENVIRONMENT=production
```

### 9.6 Migration Commands

```bash
# Create 30 new tables
cd backend_node
node migrations/run-all-tables.js

# Seed superadmin account
node scripts/seedSuperAdmin.js

# Seed role records
node scripts/seedRoles.js
```

---

## 10. Security

### 10.1 Authentication
- **JWT tokens** with 24h expiry
- **bcryptjs** password hashing
- **2FA** support (per-user toggle)
- **OTP** verification via email (Resend)

### 10.2 API Security
- **CORS** restricted to 4 known origins
- **CSRF token** for state-changing requests
- **Rate limiting** (5 login attempts per 15 min)
- **Input validation** server-side (Sequelize validation)
- **Request body limit**: 50MB
- **File upload restrictions**: type + size limits per endpoint

### 10.3 Grade Integrity
- **Grade audit trail**: all grade changes logged
- **Modification requests**: workflow-based grade changes (teacher → principal approval)
- **Tamper counter**: tracks grade modification count per student
- **Payment hash**: financial transactions hashed for integrity
- **QR verification**: public hash verification endpoint

### 10.4 Data Protection
- **Security audit logs** (sa_security_audit_log): all login attempts + admin actions
- **Forensic events** (sa_forensic_events): suspicious activity tracking
- **Access logs**: per-user data access history (who-saw-my-data)
- **Account lockout**: pending accounts cannot access the system

### 10.5 Frontend Security
- **XSS sanitization** via `sanitizeHtml()` / `sanitizeInput()`
- **CSP headers** configured through meta tags
- **Secure localStorage** wrappers (`safeSetStorage`, etc.)
- **Session timeout** detection (1h inactivity)
- **High-contrast mode** for accessibility
- **Color-blind friendly mode**

---

## 11. Environment Configuration

### 11.1 Available `.env` Files

| File | Purpose | Git-tracked? |
|------|---------|-------------|
| `backend_node/.env` | Backend production config | No (gitignored) |
| `.env` | Root project config (legacy Django) | No (gitignored) |
| `.env.production` | Frontend production build vars | Yes |
| `.env.frontend` | Frontend dev/CI vars | Yes |
| `.env.example` | Django config template | Yes |
| `.env.render` | Render.com deployment | Yes |
| `vercel.json` | Vercel env overrides | Yes |

### 11.2 Key Configuration Values

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3000` |
| `DB_NAME` | MySQL database name | `pruh_db` |
| `DB_HOST` | Database host | `localhost` |
| `DB_PORT` | Database port | `3306` |
| `JWT_SECRET` | JWT signing key (64-char hex) | — |
| `RESEND_API_KEY` | Resend email API key | — |
| `GEMINI_API_KEY` | Google Gemini AI key | — |
| `REACT_APP_API_URL` | Frontend API base URL | `https://backend.pruhsms.africa` |
| `REACT_APP_ENVIRONMENT` | Frontend environment | `production` |

---

## 12. Troubleshooting

### 12.1 Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| 401 Invalid/expired token | JWT_SECRET mismatch between login and verify | Ensure same JWT_SECRET in `.env`; restart PM2 |
| CORS errors | Backend not running or wrong origin | Check `pm2 status`; verify nginx proxy |
| 500 Server error | Missing model association or transaction rollback | Check `pm2 logs`; verify associations.js |
| "Registration Under Review" | User.is_active still false | Re-approve from superadmin panel; or directly set `is_active=1` in DB |
| Login fails | Wrong password or inactive account | Reset password via superadmin; activate account |
| Cannot find route | Route not registered in index.js | Check routes/index.js mounting path |
| Build fails on Vercel (CI) | ESLint warnings treated as errors | Fix or suppress lint warnings in code |

### 12.2 Quick Commands

```bash
# Check backend status
pm2 status
pm2 logs ek-sms-backend --lines 50

# Restart backend
pm2 restart ek-sms-backend

# Check nginx
sudo nginx -t
sudo systemctl status nginx

# Check MySQL
mysql -u root -p -e "SHOW DATABASES; USE pruh_db; SHOW TABLES;"

# Force re-approve a user
mysql -u root -p -e "USE pruh_db; UPDATE pruh_core_user SET is_active=1 WHERE username='admin_username';"

# Rebuild frontend
npm run build

# Test API health
curl https://backend.pruhsms.africa/api/health
```

### 12.3 Log Locations

| Log | Location |
|-----|----------|
| PM2 logs | `pm2 logs ek-sms-backend` |
| Nginx access | `/var/log/nginx/access.log` |
| Nginx error | `/var/log/nginx/error.log` |
| MySQL | `/var/log/mysql/error.log` |
| Browser console | F12 → Console tab |

---

*Document generated from codebase analysis. For support, contact the development team.*
