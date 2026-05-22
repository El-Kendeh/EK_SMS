# Superadmin System Configuration — API Reference

**Base URL:** `https://backend.pruhsms.africa`  
**Auth:** All endpoints require `Authorization: Bearer <token>` + superadmin role.

## Tables & Migrations

All system-level tables use prefix `pruh_system_`. Total: **43 tables** in `backend_node/migrations/2026-05-18-all-new-tables.sql`.

---

## Simple CRUD Pattern (id + name + is_active)

Every simple config table has these 5 endpoints:

| Method | Path | Action |
|---|---|---|
| GET | `/api/{resource}/` | List all (ordered by created_at DESC) |
| POST | `/api/{resource}/` | Create `{ name: "..." }` |
| PUT | `/api/{resource}/:id/` | Update `{ name: "..." }` |
| DELETE | `/api/{resource}/:id/` | Delete |
| PATCH | `/api/{resource}/:id/toggle/` | Toggle active/inactive |

### Table list

| # | Table | Model | Resource Path | Fields |
|---|---|---|---|---|
| 1 | `pruh_system_academicyear` | `SystemAcademicYear.js` | `/api/academic-years/` | id, name, is_active, timestamps |
| 2 | `pruh_system_term` | `SystemTerm.js` | `/api/system-terms/` | id, system_academic_year_id (FK), name, is_active, timestamps |
| 3 | `pruh_system_institutiontype` | `InstitutionType.js` | `/api/institution-types/` | id, name, is_active, timestamps |
| 4 | `pruh_system_capacitycategory` | `CapacityCategory.js` | `/api/capacity-categories/` | id, name, is_active, timestamps |
| 5 | `pruh_system_schoolcapacity` | `SchoolCapacity.js` | `/api/school-capacities/` | id, capacity_category_id (FK), range, is_active, timestamps |
| 6 | `pruh_system_country` | `Country.js` | `/api/countries/` | id, name, is_active, timestamps |
| 7 | `pruh_system_region` | `Region.js` | `/api/regions/` | id, country_id (FK), name, is_active, timestamps |
| 8 | `pruh_system_city` | `City.js` | `/api/cities/` | id, country_id (FK), region_id (FK), name, is_active, timestamps |
| 9 | `pruh_system_schooltype` | `SchoolType.js` | `/api/school-types/` | id, name, is_active, timestamps |
| 10 | `pruh_system_syllabustype` | `SyllabusType.js` | `/api/syllabus-types/` | id, name, is_active, timestamps |
| 11 | `pruh_system_classsubtype` | `ClassSubtype.js` | `/api/class-subtypes/` | id, name, is_active, timestamps |
| 12 | `pruh_system_principal` | `Principal.js` | `/api/principals/` | id, name, is_active, timestamps |
| 13 | `pruh_system_bursar` | `Bursar.js` | `/api/bursars/` | id, name, is_active, timestamps |

**Request body for create/update (all simple tables):**
```json
{ "name": "value" }
```

**Response shape:**
```json
{ "success": true, "data": { "id": 1, ... }, "message": "..." }
```

---

## Special Endpoints

### Academic Years — Rollout
| Method | Path | Action |
|---|---|---|
| POST | `/api/academic-years/:id/rollout/` | Deactivates all other academic years, activates the one with `:id` |

### System Terms — Rollout (scoped to parent academic year)
| Method | Path | Action |
|---|---|---|
| POST | `/api/system-terms/:id/rollout/` | Deactivates all other terms in the same `system_academic_year_id`, activates the one with `:id` |

---

## Lookup / Filter Queries

| Resource | Query Param | Description |
|---|---|---|
| `/api/regions/` | `?country_id=X` | Filter regions by country |
| `/api/cities/` | `?country_id=X` | Filter cities by country |

**GET responses for regions/cities include resolved names:**
- `/api/regions/` → each item has `country_name`
- `/api/cities/` → each item has `country_name` + `region_name`

**School capacities include resolved category name:**
- `/api/school-capacities/` → each item has `capacity_category_name`

---

## Superadmin Dashboard (non-CRUD) Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/security-logs/` | Security audit logs |
| GET | `/api/security-counters/` | Security counters |
| GET | `/api/profile/` | Superadmin profile |
| PATCH | `/api/profile/` | Update profile |
| POST | `/api/change-password/` | Change password |
| GET | `/api/admin-settings/` | Get admin settings |
| PATCH | `/api/admin-settings/` | Update admin settings |
| GET | `/api/users/` | List users |
| GET | `/api/get-users/` | Users (short list) |
| POST | `/api/users/` | Create user |
| GET | `/api/school-stats/` | School statistics |
| GET | `/api/grade-stats/` | Grade statistics |
| GET | `/api/forensic-events/` | Forensic events |
| GET | `/api/broadcast-alerts/` | List broadcast alerts |
| POST | `/api/broadcast-alerts/` | Create broadcast alert |
| GET | `/api/system-alerts/` | List system alerts |
| POST | `/api/system-alerts/` | Create system alert |
| POST | `/api/sa/branding/` | Upload branding (multipart) |
| GET | `/api/sa/lockdown/` | Get lockdown status |
| POST | `/api/sa/lockdown/` | Set lockdown |
| POST | `/api/sa/backup/manual/` | Trigger manual backup |
| GET | `/api/sa/custom-roles/` | List custom roles |
| POST | `/api/sa/custom-roles/` | Create custom role |
| GET | `/api/sa/export/` | Export data |

---

## School Management Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/schools/` | List all schools |
| POST | `/api/schools/approve/` | Approve/reject school |
| POST | `/api/impersonate/` | Impersonate a user |
| GET | `/api/grade-alerts/` | Grade alerts |
| GET | `/api/system-health/` | System health check |
| POST | `/api/reset-user-password/` | Reset user password |

---

## Frontend Sidebar Mapping

The `SuperadminDashboard.js` sidebar navItems use these keys. Each matches the resource routes above:

| navItem key | Label | API Resource |
|---|---|---|
| `academic-year` | Year | `/api/academic-years/` |
| `academic-terms` | Terms | `/api/system-terms/` |
| `institution-type` | Institution Type | `/api/institution-types/` |
| `school-capacity` | School Capacity | `/api/school-capacities/` |
| `countries` | Countries | `/api/countries/` |
| `regions` | Regions | `/api/regions/` |
| `cities` | Cities | `/api/cities/` |
| `school-type` | School Type | `/api/school-types/` |
| `syllabus-type` | Syllabus Type | `/api/syllabus-types/` |
| `class-subtype` | Class Subtype | `/api/class-subtypes/` |
| *(not yet added)* | Principal | `/api/principals/` |
| *(not yet added)* | Bursar | `/api/bursars/` |

---

## Student & Parent Management (Superadmin)

### Students — Full Registration

| Method | Path | Description |
|---|---|---|
| GET | `/api/students/` | List all students (`?school_id=X&status=active`) |
| POST | `/api/students/` | Create student + User account (multipart: `passport_photo`) |
| PUT | `/api/students/:id/` | Update student + User (multipart: `passport_photo`) |
| DELETE | `/api/students/:id/` | Delete student + linked User |
| PATCH | `/api/students/:id/toggle/` | Toggle `is_active` |
| PATCH | `/api/students/:id/block/` | Toggle blocked/unblocked |
| GET | `/api/students/:id/parents/` | Get parents linked to student |
| GET | `/api/students/:id/documents/` | List student documents |
| POST | `/api/students/:id/documents/` | Upload document (multipart: `file`) |
| DELETE | `/api/students/:id/documents/:docId/` | Delete document |

**POST /api/students/ — request (multipart/form-data):**  
**PUT /api/students/:id/ — same fields**

| Field | Type | Notes |
|---|---|---|
| `first_name`, `last_name` | string | **required** for create |
| `school_id` | number | **required** for create |
| `email`, `username`, `password` | string | auto-generated if omitted |
| `admission_number` | string | unique |
| `date_of_birth` | date | YYYY-MM-DD |
| `gender` | string | M / F / O |
| `classroom_id`, `academic_year_id` | number | FK references |
| `admission_date` | date | defaults to now |
| `student_type` | string | e.g. boarding, day |
| `fee_category` | string | fee category label |
| `place_of_birth`, `nationality`, `religion` | string | |
| `home_language`, `home_address`, `city` | string | |
| `phone_number` | string | |
| **Medical** | | |
| `blood_type`, `allergies`, `medical_notes` | string | |
| `doctor_name`, `doctor_phone` | string | |
| `is_critical_medical` | boolean | |
| `sen_tier`, `sen_notes` | string | SEN / special needs |
| `sen_iep` | boolean | Individual Education Plan |
| **Father** | | |
| `father_name`, `father_phone`, `father_email` | string | |
| `father_occupation`, `father_address` | string | |
| `father_whatsapp` | boolean | |
| **Mother** | | |
| `mother_name`, `mother_phone`, `mother_email` | string | |
| `mother_occupation`, `mother_address` | string | |
| `mother_whatsapp`, `mother_relationship` | string/boolean | |
| **Emergency** | | |
| `emergency_name`, `emergency_relationship` | string | |
| `emergency_phone`, `emergency_address` | string | |
| **Disciplinary** | | |
| `disciplinary_history` | boolean | |
| `disciplinary_notes` | text | |
| **Document checklist** | | |
| `documents_birth_certificate` | boolean | |
| `documents_passport_photo` | boolean | |
| `documents_previous_school_report` | boolean | |
| `documents_transfer_letter` | boolean | |
| `documents_medical_report` | boolean | |
| `documents_other` | boolean | |
| `vaccinations` | JSON | `{"BCG": true, "Polio": false}` |
| `passport_photo` | file | multipart upload |
| **Parent auto-registration** — when father/mother name is provided, a User + Parent record is created automatically with dashboard login: | | |
| `father_username`, `father_password` | string | auto-generated if omitted |
| `mother_username`, `mother_password` | string | auto-generated if omitted |

**Response includes parent credentials:**
```json
{
  "success": true,
  "data": {
    "id": 1, "user_id": 1, "username": "john.doe_123", "password": "Student@123",
    "parents": [
      { "id": 10, "user_id": 5, "username": "parent.john.doe_123", "password": "Parent@123", "relationship": "father" },
      { "id": 11, "user_id": 6, "username": "parent.jane.doe_123", "password": "Parent@123", "relationship": "mother" }
    ]
  },
  "message": "Student and parents registered"
}
```

### Parents — Full Registration

| Method | Path | Description |
|---|---|---|
| GET | `/api/parents/` | List all parents (`?status=active`) — includes linked students |
| POST | `/api/parents/` | Create parent + User account (multipart: `passport_photo`) |
| PUT | `/api/parents/:id/` | Update parent + User (multipart: `passport_photo`) |
| DELETE | `/api/parents/:id/` | Delete parent + User + links |
| PATCH | `/api/parents/:id/toggle/` | Toggle `is_active` |
| PATCH | `/api/parents/:id/block/` | Toggle blocked/unblocked |

**POST /api/parents/ — request (multipart/form-data):**

| Field | Type | Required |
|---|---|---|
| `first_name` | string | yes |
| `last_name` | string | yes |
| `email` | string | no |
| `username` | string | auto-generated if omitted |
| `password` | string | defaults to `Parent@123` |
| `phone` | string | no |
| `passport_photo` | file | no (multipart) |
| `address` | text | no |
| `occupation` | string | no |
| `student_ids` | JSON array | no — `[{"student_id": 1, "relationship": "father"}]` |

### Student-Parent Linking

| Method | Path | Body |
|---|---|---|
| POST | `/api/link-parent/` | `{ "student_id": 1, "parent_id": 1, "relationship": "father" }` |
| POST | `/api/unlink-parent/` | `{ "student_id": 1, "parent_id": 1 }` |

### Models

| # | Table | Model File | Fields |
|---|---|---|---|
| 44 | `pruh_core_parent` | `Parent.js` | id, user_id (FK→users), first_name, last_name, email, phone, passport_photo, address, occupation, status, is_active, timestamps |
| 45 | `pruh_core_student_parent` | `StudentParent.js` | student_id (FK→student), parent_id (FK→parent), relationship |

### Auth Flow
- Student users get `role_id` for role `student` and can log into the student dashboard
- Parent users get `role_id` for role `parent` and can log into the parent dashboard
- Default passwords: `Student@123` / `Parent@123`
- Usernames auto-generated if omitted: `{first}.{last}_{timestamp}`

---

## Validation Rules

- `name` field: max 100 characters, required for create
- FK fields (`country_id`, `region_id`, `system_academic_year_id`, `capacity_category_id`): validated to ensure referenced row exists
- City `region_id` validated to belong to the specified `country_id`
- Rollout endpoints: 400 error if no other active records exist to deactivate
- Toggle returns `{ "is_active": true/false }` with message
