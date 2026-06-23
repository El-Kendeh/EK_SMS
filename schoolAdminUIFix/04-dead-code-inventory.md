# 04 — Dead Code Inventory (the `schooladmin/` graveyard)

These files exist and are often **more complete** than their live replacements, but **nothing the shell reaches imports them**. Verified via import-graph trace (see [01-ARCHITECTURE-live-vs-dead.md](01-ARCHITECTURE-live-vs-dead.md)). `[verified]`

> Why this matters: (1) it's lost engineering value, (2) it wires to a third API contract (`/api/school/students…parents…`) that doesn't exist, so reviving it = instant 404s, (3) it confuses maintenance and code search.

---

## Fully dead files/folders

| Path | Lines | What it is | Notes / salvage value |
|------|-------|-----------|-----------------------|
| [schooladmin/SchoolAdminPages.js](../src/components/schooladmin/SchoolAdminPages.js) | ~3,172 | Gradebook, Attendance, Finance, Reports (CSV), Messages, Security, Settings, Syllabus(+AI) | **Largest dead file.** Gradebook/attendance/syllabus-AI are genuinely built & were wired to `/api/school/*`. Contains `BursarAuditPage` with a **fake** submit. |
| [schooladmin/SAstudents.js](../src/components/schooladmin/SAstudents.js) | ~2,575 | Students CRUD + inline LinkParentDrawer + CredentialCard | Superseded by `superadmin/SAStudents.js`. Calls non-existent `/api/school/students/:id/parents/`. |
| [schooladmin/SAClasses.js](../src/components/schooladmin/SAClasses.js) | ~1,846 | Classes CRUD + ClassProfileDrawer | Superseded by `superadmin/SAClasses.js`. Timetable preview is a stub. |
| [schooladmin/SASubjects.js](../src/components/schooladmin/SASubjects.js) | ~1,277 | Subjects CRUD | Superseded by `superadmin/SASubjects.js`. Perf scores + timetable are mock; archive is localStorage-only. |
| [schooladmin/ClassProfileDrawer.js](../src/components/schooladmin/ClassProfileDrawer.js) | ~413 | Class detail drawer | Timetable + Audit tabs are "coming soon". |
| [schooladmin/Students/](../src/components/schooladmin/Students/) | ~10 files | **Full 6-step AddStudentWizard** + steps + BulkImportModal + DraftManager + EnrollmentDossier | **High salvage value.** This wizard correctly transmits ALL collected data (health, vaccinations, consents, documents) — unlike the live form. See "Salvage" below. |
| [schooladmin/Teachers/](../src/components/schooladmin/Teachers/) | ~12 files | **Full 4-step AddTeacherWizard** + availability grid + class-assignment editor + BulkImportModal | **High salvage value.** Sends availability + class assignments + documents. `SendCredentials` is mailto/sms only (no server send). |
| [schooladmin/Parents/](../src/components/schooladmin/Parents/) | ~9 files | Parent engagement dashboard | All engagement metrics are **fabricated client-side** (`utils.js` `enrichParent`); CommunicationPanel send is a mock `setTimeout`. Low salvage. |
| [schooladmin/Principal/](../src/components/schooladmin/Principal/) | ~14 files | Principal "command dashboard" | Superseded by `SAStaffManager`. Panels render from real API but the page isn't mounted. |
| [schooladmin/ResendCredentialsButton.js](../src/components/schooladmin/ResendCredentialsButton.js) | ~78 | Resend-credentials button | Calls non-existent `/api/school/users/resend-credentials/`. Only used by dead pages. |

---

## Partially dead (file is live, most exports are not)

| Path | Lines | Live exports | Dead exports |
|------|-------|--------------|--------------|
| [schooladmin/NewPages.js](../src/components/schooladmin/NewPages.js) | ~4,559 | `ExamsPage`, `TimetablePage`, `FinanceUsersPage` (re-export) | `AnalyticsPage`, `NotificationsPage`, `StudentsPage`, `TeachersPage`, inline `AddStudentWizard`, `StudentProfilePanel`, `EditStudentModal`, `EditTeacherModal`, `_LegacyAddTeacherWizard_DEPRECATED`, `printAdmissionSlip`, and the `ParentsPage`/`PrincipalUsersPage` re-exports |
| [schooladmin/SAExtraPages.js](../src/components/schooladmin/SAExtraPages.js) | ~1,680 | `RoomsPage`, `GradingSchemePage`, `AcademicCalendarPage`, `StudentPromotionPage`, `TeacherAssignmentsPage`, `ExamOfficersPage` | `ModRequestsPage`, `SecurityPageEnhanced`, `GradeOversightPage`, `TermsPage`, and others |

> So ~3,500 of NewPages.js's 4,559 lines and ~half of SAExtraPages.js are dead even though the files themselves are imported.

---

## Live (for contrast)

| Path | Lines | Mounted as |
|------|-------|-----------|
| [schooladmin/FinanceUsers/](../src/components/schooladmin/FinanceUsers/) | ~12 files | `finance-users` key (the only fully-live `schooladmin/` folder) |
| [schooladmin/AIDocumentCapture.js](../src/components/schooladmin/AIDocumentCapture.js) | ~211 | `ai-capture` key (but its endpoints 404) |

---

## Salvage recommendation

Before deleting, **harvest two assets** that are better than the live equivalents:

1. **`schooladmin/Students/AddStudentWizard`** — the live `SAStudents` create form has no document upload and uses raw-ID inputs. This wizard has a proper 6-step flow with sibling/duplicate detection, document slots, and full data submission. Consider porting it onto the live `/api/students/` contract.
2. **`schooladmin/Teachers/AddTeacherWizard`** — captures availability grid + class assignments + documents that the live form lacks.

Everything else (SchoolAdminPages gradebook/attendance/reports, Parents engagement, Principal dashboard, the duplicate CRUD pages) can be **deleted** once you've confirmed nothing you want is in them — they're superseded and several contain fakes.

**Process suggestion:** move the whole dead set into a `schooladmin/_deprecated/` folder in one commit (so it's recoverable from git but clearly quarantined), then delete after a release cycle. Do **not** silently leave it — it's the #1 source of "which file do I edit?" confusion.
