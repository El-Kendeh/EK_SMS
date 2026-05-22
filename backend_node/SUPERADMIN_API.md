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

## Validation Rules

- `name` field: max 100 characters, required for create
- FK fields (`country_id`, `region_id`, `system_academic_year_id`, `capacity_category_id`): validated to ensure referenced row exists
- City `region_id` validated to belong to the specified `country_id`
- Rollout endpoints: 400 error if no other active records exist to deactivate
- Toggle returns `{ "is_active": true/false }` with message
