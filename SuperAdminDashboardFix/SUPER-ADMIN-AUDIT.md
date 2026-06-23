# Super Admin Console -- Full Audit (UI + Backend)

**Date:** 2026-06-23

**Scope:** Entire Super Admin surface -- ~45 React components in `src/components/superadmin/` plus the SA backend (`superadminController.js`, `superadminDataController.js`, `routes/superadmin.js`).

**Method:** Two multi-agent audit workflows; every high/medium finding was adversarially re-verified against source before inclusion. Main pass: 43 agents. Addendum pass (two clusters that failed mid-run, re-scanned): 42 agents. All `file:line` references are from the working tree at audit time.

> **Part A** = tenant lifecycle, platform-ops backend, analytics/billing, grades, reference-data, accounts. **Part B (addendum)** = onboarding-pipeline UI + security/observability UI. See `README.md` for the consolidated verdict, what is already fixed, and the remediation plan.

---

# Part A -- Main Audit

## Executive Summary

The Super Admin console is roughly half genuinely-built-and-wired, a quarter partial/orphaned, and a quarter fabricated operator trust-signals. The real, backend-wired core is the strongest part of the platform: the school approval pipeline (handleSchoolAction — transactional approve/reject/request_changes with email + audit), the entire reference-data/taxonomy CRUD surface, the Academic Year/Term lifecycle with real per-school cascade rollout (the single best feature), impersonation hardening, honest grade-stats accumulation, virtual meetings, school CSV/JSON export, and the security/forensics/broadcast feeds — all compute from real tables and handle loading/empty/error states. The dangerous third is a cluster of fabricated OPERATOR TRUST SIGNALS: Emergency Lockdown writes a flag and a high-severity audit row but terminates zero sessions and locks zero grades while telling the operator everyone is locked out and records are encrypted; Manual Backup performs no dump yet reports a hardcoded 2 MB success filename; system-health shows constant 99.98% uptime and always-green API/Auth with no probe; and the entire grade-integrity deep-dive (SAGradeAuditDetail / SAGradeIntegrity / SAGradeReport / SABenchmarks) renders a blockchain/hash/anomaly narrative over fields the backend never sends and columns the Grade model does not have — producing phantom 'Hash Mismatch' alarms on every row, fabricated always-100% green integrity rankings, and Validate/Flag buttons that persist nothing. Top risks: (1) two HIGH tenant-isolation PII leaks — bare superadmin GET /api/bursars/ and /api/principals/ return every tenant's national-ID, bank, and salary-grade data because the empty-return gate added to students/teachers/parents was never applied to staff; (2) class/subject by-ID mutations and every assignment route have no school-ownership check and even accept school_id in the update body, so a school_admin (including during impersonation) can read/edit/delete/reassign any tenant's class, subject, or roster by id (an IDOR); (3) fabricated incident-response controls (lockdown, backup) that give a false sense of safety during a real incident; (4) a cluster of fully-built-but-orphaned features (SABatchTransfer, SAVirtualMeeting, Classes/Subjects, and all five account-management pages) with no reachable nav or command-palette entry for the superadmin; and (5) three person-management pages (Students/Teachers/Parents) that are unusable because the list never sends ?school_id= against a backend that correctly gates on it and the page offers no list-level school selector. Net: the operator can be misled into believing health is green, backups exist, lockdowns work, and grade integrity is cryptographically verified — none of which is true — while tenant PII and tenant data integrity are actually exposed.

## Component Status

- **SAOverview / getDashboard** -- `partial` -- Top-line School/User counts are real (superadminController.js:494-505), but the 'API Healthy' status bar and 100% Grade-Integrity card draw from getSystemHealth's fabricated uptime/always-green API status — real counts wrapped in fake green signals.
- **SAAnalytics.js** -- `partial` -- Real school list + headcounts (/api/school-stats/, but that endpoint returns zeros), security tab, geo map. Fabricated-and-displayed: per-school compliance flags derived from is_approved/is_active not real policy (122-126), Grade Distribution fixed array (216), Coverage bars 100/94/78% + 'Next Review: Apr 2025' (239-244). KPI deltas/sparklines hardcoded (656-658). Note: attendance '+2.1%' delta (170) is dead/never-rendered. Phone button dead (277).
- **SABenchmarks.js** -- `partial` -- Avg score/totals real; Pass Rate reads gradeStats.passed (never returned) → renders a FALSE '0.0%' when grades exist; Grade Distribution reads gradeStats.distribution (never returned) → always 'No data'; top-school integrity hardcoded 100 (always green), attendance 90, type 'Public' (228-235); filter selects query nothing; Compare ranks fabricated metrics.
- **SAReportsHub.js** -- `real` -- Most honest page in cluster. Real counts, real CSV/JSON exports, real blob downloads, onNavigate to existing pages. No fabricated data.
- **SABilling.js** -- `stub` -- Honest stub: 'Backend pending' pills, disabled CTAs, no fabricated MRR. Nav entry commented out (SuperadminDashboard.js:874) so orphaned by design. No risk.
- **SASettings.js** -- `partial` -- Real: live counters, admin-settings GET/PATCH, change-password, branding upload, lockdown hydrate, bulk-export blob. Fake/dead: Emergency Lockdown theater, Manual Backup fake, bulk export ignores datasets + false 'redacted per compliance' claim, 2FA static-QR mock posts nothing, security toggles persist to JSON blob but no server code enforces them.
- **SANotifications.js** -- `partial` -- Notifications derived from real schools/gradeAlerts props, but read/mark-all/dismiss are client-only (never persist, reset on reload, 189-208), and a hardcoded fake 'System Backup Completed' notification is injected on every build (80-88).
- **SAProfile.js** -- `partial` -- Real profile/settings/password/activity wiring. Avatar read to base64 and saved only to localStorage + never uploaded (168-178,191). Misleading hardcoded fallbacks: username 'ek_sms0000', cosmetic UID, 'Feb 20, 2026', Status 'Active'.
- **SAGradesAccumulation** -- `real` -- Genuinely functional: real getGradeStats SQL, loading/error/empty handled, reachable via nav and Reports hub. integrity_score is an honest derived metric (soft caveat: conflates pending-review with integrity).
- **SABatchTransfer** -- `real` -- Fully-built 4-step wizard with real tenant-correct backend wiring (students/grades/images). ORPHANED: batch-* keys only in ALL_NAV_ITEMS (737-739), absent from SUPERADMIN_NAV_ITEMS and Ctrl+K, no goTo('batch-*') anywhere — superadmin cannot reach it. Grade import never computes total/grade_letter; per-row student POST loop has no transaction; plaintext creds rendered + exported to CSV.
- **SAGradeReport** -- `fake-data` -- Fetches real /api/grade-alerts/ but the feed lacks ts, so the chart shows its empty state; the hardcoded week/exam x-axis labels + fixed day-20 anomaly spike (402-433) are gated behind hasChartData and effectively never render. The genuinely-displayed fake signal is the Hash-Verified card defaulting to 100% 'All records checked' (249-255). Export buttons real client-side.
- **SAGradeIntegrity** -- `fake-data` -- Stats strip real; but the hash badge reads req.hashMatch (never emitted) → every card shows a red 'Hash Mismatch' phantom alarm (68-70); oldGrade/newGrade/scores/term/reason/initials render undefined/blank because getGradeAlerts emits none of them. Search/filter/CSV functional. (Flagged tab counter is driven off status==='Flagged', not hashMatch.)
- **SAGradeAuditDetail** -- `stub` -- No API calls. Validate/Flag only flip local useState (309,325) — persist nothing, no endpoint. Two hardcoded fake evidence files (244-245). Blockchain ledger/hash/IP/device/geo all read fields with no backing columns on the Grade model → fabricated 'Integrity Verified — Hash Match' security assurance on a system with no hashing.
- **SARefDataManager (+ Academic Years workflow)** -- `real` -- Genuinely functional and fully wired: real CRUD, real rollout transaction with per-school cascade, adoption/history SQL, 409/400 handling, a11y. No fake data. Strongest real feature in the cluster.
- **SACreateTerm** -- `real` -- Real and wired: year/term load, term POST, term + year rollout. Minor: 'set as active' fires rollout with .catch(()=>{}) so a failed activation is swallowed silently; year-rollout-from-terms bypasses the cascade/preview safeguards the Years page has.
- **SAAcademicSystem / SAGradingSystem** -- `real` -- Thin wrappers, real CRUD, in nav. Product-depth limitation: name-only labels with no underlying grade-scale/GPA/framework definition — 'adopting GPA 4.0' conveys no computational config.
- **SASchoolCapacity** -- `real` -- Two-tab page, both SARefDataManager instances real and routed, dependent select works. Minor: tab switch reloads; no cross-tab FK guard beyond the select.
- **SAClasses** -- `real` -- Real CRUD + 4 assignment modals, pagination/search. ORPHANED from SUPERADMIN_NAV_ITEMS (only in ALL_NAV_ITEMS). Utilisation bars use fabricated fallbacks cap||50 / maxT||10. Hard-delete 'cannot be undone' with no cascade-impact warning. Backend mutation/assignment routes are the HIGH tenant-isolation gap.
- **SASubjects** -- `real` -- Real CRUD + Assign Classes/Teacher. ORPHANED (only ALL_NAV_ITEMS). Assign-Teacher applies to ALL linked classes with no confirm/count (label discloses blast radius in prose only). Hard-delete no impact preview. Same backend tenant-isolation gap as Classes.
- **SAStaffManager (shared engine)** -- `real` -- Functional engine: server pagination, one-time creds, toggle/block/delete. But list GET sends no ?school_id= so for principals/bursars it relies on the (missing) backend gate → superadmin sees cross-tenant rows (drives the PII leak).
- **SAPrincipal** -- `partial` -- Real CRUD via SAStaffManager. ORPHANED: 'principal' not in SUPERADMIN_NAV_ITEMS. HIGH backend tenant-isolation leak: getSuperPrincipals (3733-3742) has no empty-return gate → bare superadmin GET returns all tenants' principal PII (national-ID/bank/salary-grade, 3755-3756).
- **SABursar** -- `partial` -- Real CRUD. ORPHANED for superadmin. HIGH tenant-isolation leak: getSuperBursars (3589-3596) lacks the gate → bulk-returns every tenant's bursar PII (national-ID/bank/salary-grade, 3613-3615).
- **SATeachers** -- `partial` -- Backend correctly gates (3409-3411) but the list GET (140-141) never sends ?school_id= and there's no list-level school selector (only inside the create form) → superadmin table is ALWAYS empty and the feature is unusable. Orphaned from nav.
- **SAStudents** -- `partial` -- Richest page; all CRUD real. Same blocker: list GET (218) sends no ?school_id=, selector only in create drawer → permanently empty for superadmin (backend gate 2882-2884). Classroom/Year are free-text ID inputs. Orphaned.
- **SAParents** -- `partial` -- Real CRUD + link flow. Same empty-list blocker (91, no school selector anywhere). Link-to-Student requires hand-typing a raw numeric DB student id (433/154). Creds modal shows form.password||DEFAULT_PW, never server-returned d.password (132) — can show the wrong password.
- **SAVirtualMeeting** -- `real` -- Fully built end-to-end with real model + tenant-correct CRUD (/api/virtual-meetings/). But ORPHANED for every role: vm-* keys permitted only for superadmin yet absent from SUPERADMIN_NAV_ITEMS, present only in ALL_NAV_ITEMS where canAccess strips them for school_admin; not in Ctrl+K or mobile nav. Reminders advertised but unimplemented; meeting_url unvalidated.
- **getSystemHealth (backend)** -- `fake-data` -- Only db (authenticate) and mail (key presence) reflect reality. API and Auth status hardcoded 'Operational'; all per-service uptime hardcoded (0.9998/0.9995/0.998/0.9999, L389-392). CPU/mem/heap real. Constant green API/Auth hides incidents (top-level status does flip on a DB failure).
- **getGradeStats (backend)** -- `real` -- Honest: real COUNTs/AVG/per-school GROUP BY; integrity_score=(total-pending)/total, 100 only when zero grades (mathematically correct, not a fake signal). Does NOT return passed/distribution that SABenchmarks expects.
- **getSchoolStats (backend)** -- `fake-data` -- Real school list but every per-school metric hardcoded 0 (student/teacher/class counts, attendance, performance, L381-385). Consumed by reachable SAAnalytics/SABenchmarks → renders an all-zero non-functional dashboard.
- **getSecurityCounters (backend)** -- `partial` -- Failed-login/threat queries real, but active_sessions = User.unscoped().count({is_active:true}) (144,149) — total enabled accounts platform-wide mislabeled as live concurrent sessions; rendered as 'Active Sessions / Live count'.
- **getUsers / mapUserToSaRow (backend)** -- `fake-data` -- Identity/email/school/role real, but all risk/security columns hardcoded constants (riskLevel low, riskScore 0, twoFAEnabled false, sessions [], L268-276) → uniform fabricated zero-risk picture + a 2FA-non-compliance banner that flags every user.
- **Security/Forensics/Alerts/Broadcast feeds (backend)** -- `real` -- All read real tables with ordering/limits + safe JSON parse; post handlers persist rows and write audit logs. Functional.
- **postSaLockdown (backend)** -- `partial` -- Flag stored + high-sev audit, but zero enforcement: returns hardcoded sessions_terminated:0/grades_locked:0 (631) and nothing in authController/middleware reads lockdown_state to block logins or lock grades. Dangerous false control with confident UI copy.
- **postSaBackupManual (backend)** -- `fake-data` -- No dump performed (no mysqldump/child_process/fs.write); fabricated filename + hardcoded size_bytes=2048000 (644), returns 'Backup recorded successfully'. Disaster-recovery / data-integrity risk.
- **getSaExport (backend)** -- `real` -- Real School CSV/JSON stream with escaping + audit log. Coverage gap: ?datasets= param logged but ignored — always exports only schools; format=pdf silently → CSV; no redaction code despite UI claim.
- **handleSchoolAction (backend)** -- `real` -- Approve/reject/request_changes fully wired in a transaction with email + audit; request_changes clears is_active/rejection_reason (documented fix). Real workflow.
- **impersonate / endImpersonation (backend)** -- `real` -- 30-min TTL token + imp claims, start/end audit with duration. OPEN (acknowledged): full-write token, no read-only support mode, hard 30-min expiry no refresh.
- **resetUserPassword (backend)** -- `real` -- Hashes, sets must_change_password, emails new password, audits. Minor: emails plaintext password, no strength validation.
- **Academic Year lifecycle (rollout/clone/preview/adoption, backend)** -- `real` -- Substantial genuinely-wired workflow: transactional demote+cascade findOrCreate per-school year/term, real adoption/preview SQL, force guards on active-date-change and archive. Strongest real feature.
- **Shared Class/Subject CRUD + assignment routes (backend)** -- `broken` -- TENANT-ISOLATION GAP: update/delete/toggle for classes (2395-2422) and subjects (2457-2485) findByPk then mutate with NO ownership check; update accepts school_id in body (cross-tenant reassign). All assignment routes only check row exists. Routes reachable by school_admin via requireRole(['superadmin','school_admin']).
- **Student/Parent/Teacher Super CRUD (backend)** -- `real` -- Tenant isolation correctly enforced (the documented fix): lists force ?school_id, every mutation guards outsideScope/parentInSchool, create pins school_id. Minor: linkParentToStudent doesn't tenant-check the parent; updateSuperStudent stores classroom_id/academic_year_id without same-school validation.
- **Legacy getPrincipals/getBursars CRUD (backend)** -- `stub` -- Dead, unrouted code on legacy name-only models (2797-2872). Harmless but should be deleted to avoid confusion with the live Core-prefixed handlers.

## Top Risks (HIGH)

### A1. Bare superadmin GET /api/bursars/ and /api/principals/ leak every tenant's staff PII  _[high]_
The cross-tenant empty-return gate that protects students/teachers/parents was never applied to staff, so a superadmin token with no ?school_id= bulk-returns national_id_number, bank_name/account/holder, and salary_grade for every school's principals and bursars. SAStaffManager fires this in normal use because its list GET never sends school_id.

**Evidence:** superadminDataController.js:3589-3596 (bursars, no guard) + 3613-3615 (PII); 3733-3742 (principals, no guard) + 3755-3756 (PII); contrast guarded teachers 3409-3411; SAStaffManager.js:150-151 GET without school_id

### A2. Class/Subject by-ID mutations + all assignment routes have no tenant check (IDOR), and accept school_id in the body  _[high]_
updateSuperClass/deleteSuperClass/toggleSuperClassStatus and the Subject equivalents do findByPk(id) with only an existence check — no scopedSchoolId/outsideScope. update even applies school_id from the body, allowing cross-tenant reassignment. Routes sit under requireRole(['superadmin','school_admin']), so a school_admin (including during impersonation) can read/edit/delete/reassign ANY school's class, subject, or roster by id.

**Evidence:** superadminDataController.js:2395-2422 (class), 2457-2485 (subject), school_id in update array 2400-2401 / row.school_id=req.body 2465, assignment routes 2578-2744; routes superadmin.js:223-256

### A3. Emergency Lockdown locks nothing but tells the operator everyone is locked out  _[high]_
postSaLockdown only writes a flag + high-severity audit row and returns hardcoded sessions_terminated:0/grades_locked:0; nothing reads lockdown_state to block logins, terminate sessions, or lock grades. The confirm modal asserts all sessions terminated and non-admins locked out, and the panel shows 'Records: Encrypted'. A fabricated incident-control gives false safety during a real incident.

**Evidence:** superadminDataController.js:607-637; grep lockdown_state = only this file (display-read, never enforced); authController.js = 0 refs; SASettings.js:1264-1266, 488, 492

### A4. Manual Backup creates no backup but reports success with a fabricated 2MB filename  _[high]_
postSaBackupManual performs no mysqldump/file write; it fabricates a filename from Date.now() and a hardcoded estimatedSizeBytes=2048000, stamps last_backup_at, and returns 'Backup recorded successfully'. The UI renders 'Backup created' + 'Successful'. An operator believing a recoverable DB backup exists is a disaster-recovery / data-integrity risk.

**Evidence:** superadminDataController.js:639-671 (no mysqldump/child_process/fs.write); SASettings.js:1103,1113,1119-1146

### A5. Grade-integrity deep-dive fabricates blockchain/hash trust signals and phantom anomaly alarms  _[high]_
SAGradeAuditDetail renders a blockchain ledger, hash-match banner, IP/device/geo and two hardcoded evidence files over fields with no backing columns, and its Validate/Flag buttons only flip local state. SAGradeIntegrity shows a red 'Hash Mismatch' on every card because the feed never emits hashMatch. On a system with no hashing at all, the operator is shown a fabricated 'Integrity Verified' or universal tamper alarm.

**Evidence:** SAGradeAuditDetail.js:1 (no fetch), 244-245, 271-302, 128-145, 309/325; SAGradeIntegrity.js:68-70; getGradeAlerts superadminController.js:362-369; models/Grade.js (no hash/ip columns)

### A6. System-health console reports hardcoded uptime and always-green API/Auth, masking incidents  _[high]_
getSystemHealth probes only db and mail; 'Core API Server' and 'Identity Provider' are the literal string 'Operational' with no check and per-service uptime is hardcoded (0.9998/0.9995/0.998/0.9999). The operator sees constant 99.98% / always-green API & Auth even during a real outage of those subsystems.

**Evidence:** superadminController.js:389-392

### A7. 'Top Performing Schools' ranking shows fabricated always-100% green integrity  _[high]_
SABenchmarks hardcodes per-row integrity to 100 (always rendered green at >=95) with the comment 'no per-school integrity API — show 100% as verified', plus invented perf/attendance/GPA/type. A platform-wide green integrity signal on the operator console would hide real grade tampering, and the Compare workflow declares a meaningless 'Overall Leader' on these invented metrics.

**Evidence:** SABenchmarks.js:228 (integrity:100), 232 (attendance:90), 235 (type:'Public'), 326 (>=95 → green), CompareView 62-177

### A8. Person-management pages (Students/Teachers/Parents) are unusable for the superadmin  _[high]_
All three list GETs never send ?school_id= against a backend that correctly gates a superadmin to an empty list, and the only school selector lives inside the create form/drawer (Parents has none anywhere). The operator sees a permanently empty table with no in-page way to pick a school. SAParents' Link-to-Student also requires hand-typing an internal DB student id.

**Evidence:** SAStudents.js:218; SATeachers.js:140-141; SAParents.js:91,433,154; backend gates 2882-2884 / 3409-3411 / 3143-3145

### A9. Fully-built features are orphaned from the superadmin's navigation  _[high]_
SABatchTransfer (bulk import) and SAVirtualMeeting are real, backend-wired tools that have no sidebar row, no Ctrl+K entry, and no programmatic goTo for the superadmin — their keys live only in ALL_NAV_ITEMS (school_admin nav) where canAccess strips them. Classes/Subjects and all five account-management pages are similarly orphaned. Wasted build + no operator access.

**Evidence:** SuperadminDashboard.js:737-739/778-780 (ALL_NAV only), 844-900 (SUPERADMIN_NAV omits), 902-906, 1510-1511; permissions.js:135-143

### A10. Bulk Data Export ignores selected datasets and falsely claims redaction  _[high]_
getSaExport reads only the format param and ALWAYS queries School.findAll; the datasets param (Grades/Audit Logs/User Accounts) is logged but never used and format=pdf silently downgrades to CSV. Ticking 'Audit Logs' or 'User Accounts' silently downloads schools, and the modal's 'Sensitive data is redacted per compliance policy' is untrue — no redaction code exists.

**Evidence:** superadminDataController.js:704-742 (datasets logged 728, unused); SASettings.js:954-969, 1193, 1203-1207

## Partially-Built Workflow Features

### Emergency Lockdown (incident response)
- **Works:** UI confirm modal + active-state panel; backend persists lockdown_state JSON and writes a high-severity audit row; SASettings hydrates the active state on load.
- **Missing:** Zero enforcement: no login-block, session-termination, or grade-lock reads lockdown_state; the handler returns hardcoded sessions_terminated:0/grades_locked:0 while the UI asserts everyone is locked out and records are encrypted.
- **Evidence:** superadminDataController.js:607-637; SASettings.js:1264-1266,488,492; authController/middleware have 0 lockdown refs

### Manual Backup / disaster recovery
- **Works:** UI button + status card; backend stamps last_backup_at, writes a 'backup_manual' audit row, and returns a structured success payload.
- **Missing:** No actual dump or file is ever produced; filename and 2MB size are fabricated. There is no scheduled backup job either (the 'Daily snapshot' notification is hardcoded).
- **Evidence:** superadminDataController.js:639-671; SANotifications.js:80-88

### Bulk Data Export wizard
- **Works:** Modal with dataset checkboxes + format selector; backend streams real School CSV/JSON with proper escaping and an audit log.
- **Missing:** datasets param is ignored (always exports schools), PDF silently becomes CSV, and the advertised compliance redaction does not exist.
- **Evidence:** superadminDataController.js:704-742; SASettings.js:954-969,1193,1203-1207

### 2FA setup wizard + security policy toggles
- **Works:** Multi-step wizard UI; toggles (2FA enforcement, auto grade-lock, session timeout, audit retention) PATCH to admin-settings and persist in a JSON blob.
- **Missing:** QR is a static decorative SVG (not a real provisioning URI), OTP inputs validate nothing, 'Complete Setup' posts nothing; no server code reads or enforces any of the persisted toggles.
- **Evidence:** SASettings.js:364-376,684; patchAdminSettings superadminDataController.js:236-251; no enforcement reads found

### Grade-integrity audit / validation workflow
- **Works:** Rich review board UI (SAGradeIntegrity list, SAGradeAuditDetail drill-in) reachable in nav; backend getGradeAlerts returns real id/status/school/student/subject/requester from SystemOpsAlert.
- **Missing:** Validate/Flag buttons only flip local state (no endpoint, no persistence); the feed omits hashMatch/oldGrade/newGrade/scores/term/reason/ts so the comparison renders blank/undefined and every card shows a phantom 'Hash Mismatch'; blockchain/hash/IP fields have no backing columns.
- **Evidence:** SAGradeAuditDetail.js:309,325; SAGradeIntegrity.js:68-70,92-126; getGradeAlerts superadminController.js:362-369; models/Grade.js

### Bulk Batch Transfer (students/grades/images import)
- **Works:** 4-step wizard with real, tenant-correct backend calls: school/term load, student create, bulk grade save, image PUT; results table + CSV export.
- **Missing:** Orphaned — no nav/Ctrl+K/goTo entry for the superadmin; students-mode is a per-row POST loop with no transaction/rollback; grade import never computes total/grade_letter (leaves them NULL, inflates pending_reviews); generated creds shown + exported in plaintext.
- **Evidence:** SABatchTransfer.js:136-295; SuperadminDashboard.js:737-739,844-900; saveGrades schoolController.js:1468-1477; Grade.js:14-17

### Person-management (Students / Teachers / Parents) create+manage
- **Works:** Full create/edit/delete/toggle CRUD with one-time credentials; backend correctly tenant-scopes every mutation; create-form school selector works.
- **Missing:** The list view is permanently empty for the superadmin because the GET never sends ?school_id= and there is no list-level school selector (Parents has none at all); SAParents Link-to-Student needs a hand-typed raw DB student id and can display the wrong (default) password.
- **Evidence:** SAStudents.js:218; SATeachers.js:140-141; SAParents.js:91,132,154,433; backend gates 2882-2884/3409-3411/3143-3145

### Academic Year / Term rollout from the Terms page
- **Works:** Year/term load, term POST, and term + year rollout all wired; the dedicated Academic Years page rollout is fully transactional with per-school cascade and preview.
- **Missing:** The Terms-page 'set as active' awaits rollout with .catch(()=>{}) so a failed activation is swallowed silently after a success toast, and the Terms-page year rollout bypasses the cascade/preview safeguards the Years page enforces.
- **Evidence:** SACreateTerm.js:240-242,199; vs SARefDataManager preview/cascade 520-559

### Notifications center
- **Works:** Builds a live feed from real schools/gradeAlerts props with derived read-state and severity filtering.
- **Missing:** Mark-read/mark-all/dismiss never persist (client-only, reset on reload), and a hardcoded fake 'System Backup Completed' item is injected into every build.
- **Evidence:** SANotifications.js:80-88,189-208

### Virtual Meeting scheduler
- **Works:** Full end-to-end CRUD against a real model and tenant-correct controller (/api/virtual-meetings/).
- **Missing:** No UI entry point for any role (orphaned from nav/Ctrl+K/mobile nav); advertised reminders are unimplemented; meeting_url is rendered as a raw external link with no domain allowlist.
- **Evidence:** SAVirtualMeeting.js:68,100-110,135-137; SuperadminDashboard.js:778-780,844-900; createVirtualMeeting superadminDataController.js:1670-1695

## All Findings by Category

### tenant-isolation
- **[high]** Bare superadmin GET /api/bursars/ leaks every tenant's bursar PII (no lockdown gate) -- getSuperBursars never applies the empty-return guard that getSuperTeachers has. For a superadmin token with no ?school_id=, scopedSchoolId returns null, where stays {}, and CoreBursar.findAndCountAll returns ALL bursars across ALL schools — including national_id_number, bank_account_number, bank_account_name, salary_grade. SAStaffManager's list GET sends no ?school_id=, so this fires in normal use.
  - _ev:_ superadminDataController.js:3589-3596 (no guard), PII 3613-3615; contrast guarded teachers 3409-3411; SAStaffManager.js:150-151
- **[high]** Bare superadmin GET /api/principals/ leaks all tenants' principal PII (same missing gate) -- getSuperPrincipals mirrors getSuperBursars: where={}; if(forcedSchool!==null) scope; else if(school_id) scope; with no empty-return for the null+no-school_id case. A bare superadmin GET returns every school's principal incl. national_id_number/bank/salary_grade. Route GET /api/principals/ is gated only by requireRole(superadmin,school_admin), which the superadmin passes.
  - _ev:_ superadminDataController.js:3733-3742 (no guard), PII 3755-3756; route superadmin.js:331
- **[high]** Class/Subject by-ID mutations and all assignment routes have no school-ownership check (IDOR) -- updateSuperClass/deleteSuperClass/toggleSuperClassStatus and the Subject equivalents do findByPk(id) then mutate with NO outsideScope/scopedSchoolId guard (contrast the scoped LIST endpoints and the guarded student/teacher mutations). All assignment routes only verify the row exists. Routes are the shared requireRole(['superadmin','school_admin']) set, so a school_admin token (incl. during impersonation) can read/edit/delete/re-assign ANY school's class, subject, or roster by id.
  - _ev:_ superadminDataController.js:2395-2422 (class), 2457-2485 (subject), assignment routes 2578-2744; routes superadmin.js:223-256
- **[high]** school_admin can reassign a class/subject to another school via school_id in the update body -- updateSuperClass includes 'school_id' in its blindly-applied field array, and updateSuperSubject sets row.school_id from req.body, with no restriction to the caller's school — a school_admin can move a row into (or out of) another tenant. Because the update handlers also skip ownership checks, this compounds with the IDOR: any class/subject by id can be edited or relocated.
  - _ev:_ superadminDataController.js:2400-2401 (class school_id in array), 2465 (subject row.school_id=req.body); contrast createSuperClass scopedSchoolId 2375-2377
- **[low]** linkParentToStudent does not tenant-check the parent side -- The student is scope-checked but the parent is only existence-checked, so a school_admin could link an out-of-school parent record to their own student.
  - _ev:_ superadminDataController.js:3305-3318

### fake-data
- **[high]** Emergency Lockdown locks nothing but tells the operator everyone is locked out -- postSaLockdown only writes lockdown_state JSON + a high-severity audit row and returns hardcoded affected:{sessions_terminated:0, grades_locked:0}; nothing reads lockdown_state to block logins, terminate sessions, or lock grades. Yet the confirm modal asserts 'All active sessions will be terminated... Students, teachers, and school admins will be locked out' and the active panel shows 'Records: Encrypted'.
  - _ev:_ superadminDataController.js:607-637; SASettings.js:1264-1266,488,492
- **[high]** Manual Backup creates no backup but reports success with a fabricated filename and 2MB size -- postSaBackupManual performs no mysqldump/file write; it fabricates backupFilename from Date.now() and a hardcoded estimatedSizeBytes=2048000, stamps last_backup_at, audits, and returns 'Backup recorded successfully'. The UI renders 'Backup created: {filename}' with the fake size and 'Successful'.
  - _ev:_ superadminDataController.js:639-671; SASettings.js:1103,1113,1119-1146
- **[high]** System-health console reports hardcoded uptime and always-green API/Auth, masking incidents -- getSystemHealth probes only db (sequelize.authenticate) and mail (RESEND_API_KEY presence). 'Core API Server' and 'Identity Provider' are the literal string 'Operational' with no check, and per-service uptime is hardcoded (api 0.9998, db 0.9995, mail 0.998, auth 0.9999). CPU/mem/heap are real, and the top-level status flips on a DB failure, but API/Auth are constant green even during a real outage.
  - _ev:_ superadminController.js:389-392
- **[high]** SAGradeAuditDetail blockchain/hash/IP-geo trust signals have no backing data or columns -- Block #, hash/prevHash 'Confirmed' ledger, hash-match/mismatch banner, and actor IP/device/'External' geolocation rows all read request fields that getGradeAlerts never emits AND that have no columns on the Grade model. The green 'Integrity Verified — Hash Match' on a system with no hashing is a fabricated security assurance. 'Digital Evidence' is two hardcoded files shown for every record.
  - _ev:_ SAGradeAuditDetail.js:244-245,271-302,128-145,100; getGradeAlerts superadminController.js:362-369; models/Grade.js
- **[high]** SAGradeIntegrity shows 'Hash Mismatch' on every card because the backend never sends hashMatch -- The hash badge's else branch fires for every row (req.hashMatch is undefined), rendering a red 'Hash Mismatch' with a warning accent across the whole board — a fabricated platform-wide tamper signal. (Correction vs draft: the Flagged tab/counter is driven by status==='Flagged', not by hashMatch.)
  - _ev:_ SAGradeIntegrity.js:68-70; getGradeAlerts superadminController.js:362-369
- **[high]** 'Top Performing Schools' ranking shows fabricated 100% integrity and invented perf/attendance/GPA -- Per-row integrity is hardcoded 100 (comment: 'no per-school integrity API — show 100% as verified'), perf is a contrived student-count ratio, attendance hardcoded 90, gpa derived from the platform-wide avg, type hardcoded 'Public'. The integrity column colours green at >=95 and is always 100 → an always-green platform-wide integrity signal that would hide real grade tampering. Compare diffs these same invented metrics and declares a meaningless 'Overall Leader'.
  - _ev:_ SABenchmarks.js:228,232,235,326; CompareView 62-177
- **[medium]** getSchoolStats returns hardcoded zeros for every per-school metric -- Returns one row per real school but student_count, teacher_count, active_classes, attendance_rate, avg_performance are all literal 0. The endpoint is live and consumed by the reachable SAAnalytics and SABenchmarks pages, rendering an all-zero non-functional dashboard.
  - _ev:_ superadminDataController.js:381-385; SAAnalytics.js:98,729; SABenchmarks.js:194,225-242
- **[medium]** SA Users directory risk/security columns are hardcoded constants -- mapUserToSaRow sets riskLevel:'low', riskScore:0, failedAttempts:0, successLogins:0, twoFAEnabled:false, alertsTriggered:0, recentActivity:[], sessions:[] identically for every user. Identity is real, but the security picture is a fabricated uniform zero-risk / 2FA-off-for-all, and the UI's 2FA-compliance banner consequently flags every user.
  - _ev:_ superadminDataController.js:268-276; SAUsers.js:331-333,563,592-600,657-664
- **[medium]** A hardcoded 'System Backup Completed' notification is injected on every build -- buildNotifications unconditionally pushes a static 'Daily automated snapshot completed successfully' item timestamped 4h ago. There is no automated backup job (and manual backup is itself fake), so this is a fabricated success/health signal in the operator's feed.
  - _ev:_ SANotifications.js:79-88
- **[medium]** SAAnalytics Oversight presents fabricated compliance/academic trust signals as real -- Per-school compliance flags (2FA/backups/gradelock) are derived from is_approved/is_active, not real policy; Grade Distribution is a fixed array; Coverage Metrics bars are hardcoded 100/94/78% with a literal stale 'Next Review: Apr 2025'. These render live whenever a school is opened, so the operator sees invented green checks. (The attendance '+2.1%' delta is dead/never displayed.)
  - _ev:_ SAAnalytics.js:122-126,216,239-244
- **[medium]** SAGradeReport Hash-Verified card defaults to a static 100% 'All records checked' -- The Hash-Verified stat defaults to 100% when there are no alerts. The chart's hardcoded week/exam labels and fixed day-20 anomaly spike (402-433) are real in source but gated behind hasChartData, which never triggers because the feed lacks ts — so the empty state shows and the 100% card is the genuinely-displayed fake signal.
  - _ev:_ SAGradeReport.js:249-255,402-433; getGradeAlerts superadminController.js:362-369
- **[medium]** SAGradeIntegrity grade-comparison UI renders undefined/blank because the alerts feed lacks the fields -- Cards read req.oldGrade/newGrade/oldScore/newScore/term/reason/requester.initials/ts but getGradeAlerts emits none of them, so old/new grade render 'undefined (undefined)', term/reason render 'undefined', and the guarded fields fall back to '—'/'?'. The rich grade-change review board is presentation-only.
  - _ev:_ SAGradeIntegrity.js:85-126; getGradeAlerts superadminController.js:362-369; SystemOpsAlert.js:4-17
- **[low]** SAClasses utilisation bars fabricate denominators -- Capacity/teacher bars use fallbacks cap=p.capacity||50 and maxT=p.max_teachers||10, so when those columns are null every class shows /50 (or /10) and a green/amber/red judgement against an invented limit. Same for SASubjects.
  - _ev:_ SAClasses.js:101-106; SASubjects.js:143-147
- **[low]** SAAnalytics top KPI deltas and all sparkline trend lines are hardcoded -- KPI cards hardcode '+5% MoM' / '+12% YTD' and fixed spark arrays with no time-series backing. The current counts are real but the implied growth trend is fabricated.
  - _ev:_ SAAnalytics.js:656-658
- **[low]** SAProfile Account Details show misleading hardcoded fallbacks -- Username falls back to 'ek_sms0000' (no longer exists), Account ID is a cosmetic 'UID-####', Member Since falls back to literal 'Feb 20, 2026', and Status is hardcoded 'Active' — all rendered as authoritative account facts.
  - _ev:_ SAProfile.js:412,414,236,417

### correctness-bug
- **[high]** Bulk Data Export ignores selected datasets and the 'redacted per compliance' claim is false -- getSaExport reads only req.query.format and ALWAYS queries School.findAll; the datasets param is logged in audit metadata but never used, and format=pdf silently falls through to CSV. Ticking 'Audit Logs' or 'User Accounts' silently downloads schools. The modal's 'Sensitive data is redacted per compliance policy' is untrue — no redaction code exists.
  - _ev:_ superadminDataController.js:704-742 (datasets logged 728, unused); SASettings.js:954-969,1193
- **[high]** Pass Rate KPI and Grade Distribution read fields getGradeStats never returns -- SABenchmarks reads gradeStats.passed and gradeStats.distribution, but getGradeStats returns neither. The distribution chart always shows 'No grade data available yet'. Because total_grades IS returned, passRatePct renders a FALSE '0.0%' (with a red down-arrow) whenever grades exist — worse than a neutral '—', which only appears when total_grades===0.
  - _ev:_ SABenchmarks.js:206,212-221; getGradeStats superadminDataController.js:441-452
- **[medium]** Bulk grade import saves ca/midterm/final but never computes total or grade_letter -- SABatchTransfer grades mode POSTs {ca,midterm,final}; the shared saveGrades upserts only those columns — total and grade_letter stay NULL (no model defaultValue/hook) and rows default to approval_status='pending'. AVG(total) ignores the NULLs (so it is excluded, not zeroed), and the pending rows inflate pending_reviews / lower integrity_score. This is the shared saveGrades endpoint gap, not batch-specific.
  - _ev:_ SABatchTransfer.js:238-247; saveGrades schoolController.js:1468-1477; Grade.js:14-17; getGradeStats superadminDataController.js:407-435
- **[medium]** SAParents credentials modal can display the wrong password -- setCreds uses password: form.password || DEFAULT_PW and ignores d.password from the POST response (contrast SAStaffManager/SATeachers which prefer d.password). If the operator submits a blank password and the backend auto-generates one, the modal shows 'Parent@123' — a password the account does not have.
  - _ev:_ SAParents.js:17,128,132,160-161,305,308
- **[medium]** 'active_sessions' actually counts every enabled user account, not live sessions -- active_sessions = User.unscoped().count({where:{is_active:true}}) (internally named activeUsers) and is returned/rendered under the 'Active Sessions / Live count' card. There is no session store; the label misrepresents total platform-wide user count as concurrent sessions.
  - _ev:_ superadminDataController.js:144,149; SASecurityLogs.js:90
- **[low]** updateSuperStudent accepts classroom_id/academic_year_id without same-school validation -- classroom_id and academic_year_id are in the blindly-applied update field list with no school-membership check, risking cross-school references in student records. The list view also exposes these as raw free-text ID inputs.
  - _ev:_ superadminDataController.js:3078-3094; SAStudents.js:592-593

### dead-action
- **[high]** SAGradeAuditDetail Validate/Flag buttons do nothing server-side -- The component imports no ApiClient/fetch; Flag/Validate onClick only flip local useState and there is no validate/flag endpoint. The UI shows 'Validated'/'Flagged for Review' as if persisted, but it resets on re-render and records nothing.
  - _ev:_ SAGradeAuditDetail.js:1 (only import),309,325; no flag/validate route in superadmin.js
- **[high]** Fully-built, backend-wired bulk-import tool (SABatchTransfer) is unreachable by the superadmin -- Rendered for batch-students/batch-grades/batch-image-data, but those keys appear only in ALL_NAV_ITEMS (and a label map), NOT in SUPERADMIN_NAV_ITEMS, and a repo search finds no goTo('batch-*'). Ctrl+K is fed navItems (= SUPERADMIN_NAV_ITEMS), so it isn't searchable either. No sidebar, palette, or programmatic route.
  - _ev:_ SuperadminDashboard.js:737-739,844-900,902-906,1510-1511; permissions.js:135-137
- **[high]** Fully-built Virtual Meeting feature has no reachable UI entry point for any role -- permissions.js grants vm-* to SUPERADMIN only, but those keys are absent from SUPERADMIN_NAV_ITEMS and appear only in ALL_NAV_ITEMS (school_admin nav) where canAccess filters them out. GlobalSearch and the mobile bottom nav are fed navItems, so they aren't searchable there either. A real backend+model feature is dead in the UI.
  - _ev:_ permissions.js:141-143; SuperadminDashboard.js:778-780,844-900,902-906,1480-1483,1511
- **[low]** SAAnalytics Oversight 'Phone' button has no handler -- The Phone icon button has no onClick (the adjacent Email button does). Dead control.
  - _ev:_ SAAnalytics.js:277
- **[medium]** SABenchmarks Year/Term/Grade filter selects are decorative -- The three selects update local state but no effect or fetch depends on them; the single useEffect runs once with no params (year is echoed only into a cosmetic header label). Operator-facing controls that imply filtered analytics but do nothing.
  - _ev:_ SABenchmarks.js:190-202,252-262,346

### workflow-gap
- **[high]** SAStudents list is permanently empty for the superadmin (no ?school_id=, no list-level selector) -- The list GET hits /api/students/ with no ?school_id=, and the backend correctly gates a superadmin without school_id to {students:[]}. The only school selector lives inside the create drawer — the operator sees an empty table with no in-page way to pick a school.
  - _ev:_ SAStudents.js:218,555-569; backend gate superadminDataController.js:2882-2884
- **[high]** SATeachers list is permanently empty for the superadmin (same missing ?school_id=) -- List GET builds params with only page/limit; the backend gate returns empty teachers for a superadmin without school_id. The school select exists only in the create form, so the table is always empty and unusable.
  - _ev:_ SATeachers.js:140-141,432-439; backend gate superadminDataController.js:3409-3411
- **[high]** SAParents list is empty for superadmin AND Link-to-Student requires hand-typing a raw DB student id -- List GET hits /api/parents/ with no school_id and there is NO school selector anywhere on the page, so the gated backend returns empty. The Link-to-Student picker is a free-text number input (POSTs Number(studentId)) with no lookup/search/validation — unusable unless the operator already knows internal DB ids.
  - _ev:_ SAParents.js:91,154,433; backend gate superadminDataController.js:3143-3145
- **[medium]** Notifications mark-read / mark-all / dismiss never persist (client-only, reset on reload) -- markRead/markAllRead/dismiss only mutate React state and call onUnreadChange; no PATCH/POST. Reload rebuilds from props and the unread bell badge resets, so the operator can never durably clear notifications.
  - _ev:_ SANotifications.js:189-208
- **[low]** SACreateTerm 'Set as active' swallows rollout failure silently -- On save, if setAsActive the rollout POST is awaited with .catch(()=>{}); the form then resets and the user sees a 'Term saved' toast, so a failed activation leaves no feedback. Separately, the Terms-page year rollout bypasses the cascade/preview safeguards the Academic Years page has.
  - _ev:_ SACreateTerm.js:240-242,199; vs SARefDataManager 520-559
- **[low]** Batch students-mode import is per-row POST with no transaction/rollback -- The students loop issues sequential POST /api/students/ calls accumulating per-row ok/fail; a mid-run failure leaves a partially-imported batch with no undo. (Grades mode is a single bulk call.)
  - _ev:_ SABatchTransfer.js:253-268

### security-risk
- **[medium]** Generated student/parent credentials are shown and exported to CSV in plaintext -- Provisioned 'username / password' pairs are rendered in the results table and written into a downloadable batch_students_results.csv in cleartext, with only an advisory self-warning and no enforced expiry/forced-reset.
  - _ev:_ SABatchTransfer.js:262,454-456,290-295,464-468
- **[low]** resetUserPassword emails the new plaintext password with no strength validation -- The force-reset flow works (hashes, sets must_change_password, audits) but emails the plaintext new password and applies no password-strength validation.
  - _ev:_ superadminController.js:436-491

### partial-ui
- **[medium]** Classes/Subjects and all five account-management pages are orphaned from the superadmin sidebar -- Keys classes/subjects/principal/bursar/account-teachers/account-students/account-parents appear in ALL_NAV_ITEMS but NOT in SUPERADMIN_NAV_ITEMS; navItems for a superadmin resolves to SUPERADMIN_NAV_ITEMS and GlobalSearch is fed navItems. They render only if activePage is set programmatically — no sidebar or Ctrl+K route. The pages themselves are fully wired and permitted, so this is a discoverability gap.
  - _ev:_ SuperadminDashboard.js:690-698,844-900,902-906,1510-1511; permissions.js:55-69
- **[medium]** 2FA setup wizard is a non-functional mock and security toggles enforce nothing -- TwoFAView renders a static decorative QR-pattern SVG (not a real provisioning URI); OTP inputs validate nothing; 'Complete Setup' just closes + toasts success and POSTs nothing. The Security-tab toggles persist to admin-settings JSON but no server code reads or enforces them.
  - _ev:_ SASettings.js:364-376,684; patchAdminSettings superadminDataController.js:236-251
- **[medium]** SAProfile avatar is saved only to localStorage and never uploaded -- handleFileChange reads the file to a base64 data URL into state; handleSave writes it to localStorage and PATCHes /api/profile/ with only name/email plus an avatarColor swatch — the avatar image is never sent to the server, so it is per-browser and lost on another device despite the 'Upload Photo' affordance.
  - _ev:_ SAProfile.js:168-178,191,195-200; backend patchProfile superadminDataController.js:176-196
- **[low]** getSaExport always exports only schools regardless of requested datasets (backend coverage gap) -- The ?datasets= param is only logged in audit metadata and never used; output is always the School table. Backend root-cause shared with the Settings bulk-export finding; flagged separately as the controller-level gap.
  - _ev:_ superadminDataController.js:704-737 (datasets 728)

### missing-feature
- **[low]** Grading/Academic Systems are name-only labels with no underlying scale/framework -- Both wrappers define a single 'name' text field and the backend stores only a name. There is no grade-boundary, pass-mark, GPA mapping, or curriculum framework behind the label, so a school 'adopting GPA 4.0' inherits only a cosmetic name — a product-depth limitation, not a bug.
  - _ev:_ SAGradingSystem.js:15-17; SAAcademicSystem.js:15-17; createAcademicSystem superadminDataController.js:2494-2499
- **[low]** Virtual Meeting advertises reminders that don't exist; meeting links unvalidated -- The subtitle promises 'reminders and status tracking' but no reminder/notification call exists in the component or createVirtualMeeting. meeting_url is rendered as a raw external link with only a type=url input, no domain allowlist.
  - _ev:_ SAVirtualMeeting.js:135-137,156; createVirtualMeeting superadminDataController.js:1670-1695
- **[low]** Dead, unrouted legacy Principal/Bursar CRUD lingers in the controller -- getPrincipals/createPrincipal/.../toggleBursarStatus operate on legacy name-only models and are never mounted in superadmin.js. Harmless but should be deleted to avoid confusion with the live Core-prefixed handlers.
  - _ev:_ superadminDataController.js:2797-2872

### ux-shortcoming
- **[medium]** 'Assign Teacher to Subject' applies to EVERY linked class with no confirmation -- The Assign-Teacher action POSTs to assign-teacher and runs a bulk ClassSubject.update over all classes linked to the subject in one click, with no count of affected classes and no confirm step; selecting '— None (clear) —' silently clears the teacher from all of them. The field label discloses the blast radius in prose only.
  - _ev:_ SASubjects.js:291,303-312; assignSubjectTeacher superadminDataController.js:2731-2744
- **[low]** Hard-delete of classes/subjects has no cascade-impact warning -- The delete modal says 'cannot be undone' and does a hard row.destroy() with no count of attached students/teachers — unlike the year-archive flow which surfaces term_count + requiresForce. Same for SASubjects.
  - _ev:_ SAClasses.js:176-177; deleteSuperClass superadminDataController.js:2411; SASubjects.js:143-147

## Verification Corrections (claims the adversarial pass refuted or nuanced)

- **SAGradeIntegrity Flagged tab/counter driven off the phantom hashMatch condition** -- REFUTED in part. The headline is TRUE (every card shows a red 'Hash Mismatch' because the backend never emits hashMatch, SAGradeIntegrity.js:68-70). But the supporting detail is wrong: isFlagged = req.hashMatch === false evaluates to FALSE for every row (undefined===false is false), so it only affects per-card compare-box styling, and the Flagged tab/counter is independently computed from r.status === 'Flagged' (lines 175-180), not from hashMatch. Kept the phantom-mismatch finding; dropped the counter claim.
- **SABenchmarks Pass Rate KPI is 'always null (—/No data)'** -- NUANCED. total_grades IS returned by getGradeStats, so when grades exist passRatePct renders a FALSE '0.0%' (passed hardcoded to 0) with a red down-arrow — arguably worse than a neutral '—', which only shows when total_grades===0. The distribution-chart half of the finding (always 'No data') is fully confirmed.
- **SAGradeReport hardcoded week/exam labels + day-20 anomaly spike are shown to the operator** -- NUANCED. The hardcoded labels and fixed index-20 anomaly spike are real in source (402-433) but are gated behind hasChartData, which is effectively never true because the alerts feed lacks ts — so the operator sees the empty state, not the fake spike. The genuinely-displayed fake signal is the Hash-Verified card defaulting to 100% 'All records checked' (249-255).
- **SAAnalytics attendance '+2.1%' hardcoded delta is displayed** -- NUANCED. The '+2.1%' delta (line 170) is hardcoded but gated behind ov.attendance != null, and the only setOv call populates students/teachers only — so attendance and its delta never render. The genuinely-live fabricated signals are the compliance flags (122-126), the fixed Grade Distribution array (216), and the Coverage bars + stale 'Next Review: Apr 2025' (239-244).
- **getSystemHealth is constant-green system-wide** -- NUANCED. The top-level status field and the db service card DO flip to Degraded/Major Outage on a database failure, so the console is not 100% always-green. The fabrication is specific to the API and Auth services, which are the literal string 'Operational' with no probe and never reflect an incident — which is the substance of the finding.
- **Batch grade import deflates AVG(total) toward zero** -- NUANCED. Confirmed that bulk grade import never sets total/grade_letter (NULL) — but SQL AVG() ignores NULLs rather than treating them as 0, so the average is not dragged toward zero; instead the imported rows are excluded from the average and inflate pending_reviews / lower integrity_score. Also note this is the shared saveGrades endpoint gap, not batch-specific.

---

# Part B -- Addendum (Onboarding-Pipeline UI + Security/Observability UI)

## Summary

Gap-fill audit of 13 Super Admin onboarding + security/observability UI components. Every prior finding was verified against current source; all confirmed except one (SAAppHistory workflow-gap) which is nuanced. The headline problem is a pattern of fabricated operator-trust signals layered on top of (or directly adjacent to) real, irreversible actions: the entire onboarding review->history->compare pipeline ends in invented data (SAAppHistory synthesizes a fake audit timeline with no API; SAVersionCompare manufactures a fake v1 'original submission' diff sitting directly above a LIVE transactional Approve button), and the security/observability surface fabricates trust signals (random uptime bars, hardcoded 'All Systems Operational' for unprobed API/Auth, fake SecurLog digital signature + chain-of-custody, all per-user 2FA/risk/session telemetry hardcoded to 0/false in the backend, dead Reset/Suspend/2FA actions that show false success toasts). Several real backend feeds exist (schools list, broadcast alerts, forensic events, security counters, users) but are wrapped in mislabeled or non-rendering UI (field-name contract mismatches in SAChangeAlerts, 'Flagged IPs' mislabel, non-enforcing RBAC matrix). The approval pipeline backend itself (handleSchoolAction) and impersonation are real/hardened per prior audit — the gap is entirely in these frontend review/observability layers.

## Component Status

- **SAVersionCompare.js** -- `fake-data` -- Entire v1 'original submission' diff fabricated client-side (SAVersionCompare.js:86-99); no version-history API. Real, transactional 'Approve v2' button (line 211-218 -> handleAction approve) sits on top of the invented diff. backendWiring: none (data) / approve action wired.
- **SAAppHistory.js** -- `fake-data` -- Pure-render, zero network call. Event timeline + Review Summary synthesized from the single school prop; every event stamped with registration_date, reviewer quote/last-reviewer/revisions all hardcoded (lines 22,31-70,106). No 'reconstructed' disclaimer. backendWiring: none.
- **SAReview.js** -- `partial` -- Real school data, but fabricated 'Trust Score' gauge ('Domain and IP checks passed', line 57) is field-presence count only, and 'Email Status: Verified' (line 362) asserts verification from mere email presence. backendWiring: wired (data) with fabricated trust overlays.
- **SAApplications.js** -- `partial` -- Prop-driven real list + real onReview. 'Avg Review' KPI structurally always 0 with hardcoded '-10m faster' trend (lines 82,94); invented per-app Risk badge/filter (lines 43-51); no loading state; dead onBatchAction prop (line 69). backendWiring: partial.
- **SAOnboarding.js** -- `partial` -- Real /api/schools/ fetch drives KPIs/charts, but 3 filter dropdowns + Calendar + 'View Map' are inert (lines 177,181-193,266); 'In Review' double-counts approved (line 145); no loading/error state. backendWiring: partial.
- **SASchools.js** -- `partial` -- Total/Active/Pending counts real; hardcoded 'System Health: 98%' stat card fabricated (line 82); onAction prop never used so directory cannot manage/suspend/approve (only View Details). backendWiring: partial.
- **SARejected.js** -- `partial` -- Real rejected list; reason-category tabs substring-match free-text rejection_reason (lines 79-81) so Fraud/Incomplete/Policy tabs are unreliable and usually empty. backendWiring: wired.
- **SARejectionAudit.js** -- `partial` -- Honestly labeled — real 'Live' events when available, 'Reconstructed' fallback (line 178) collapses all events onto registration_date with generic 'Super Admin' actor (lines 142,145-149). Not fabrication; conveys no real per-event timing in fallback. backendWiring: partial.
- **SASecurityLogs.js** -- `partial` -- Real counters + events fetched, but 'Flagged IPs' is a mislabeled failed_logins_7d count (line 53/92); trend arrows hardcoded (lines 89-92); loading flag discarded + errors swallowed so failure == empty state (lines 27,39-43,286-292). backendWiring: wired/partial.
- **SAForensics.js** -- `partial` -- Real /api/forensic-events/ fetch + Event Details/hash from real caseData, but Chain-of-Custody hardcoded 5-step (lines 22-28), fake SecurLog signature 0x492...1F (lines 213-217), hardcoded 'Action' literal (line 87); Flag/Acknowledge are no-ops/local-only (lines 221-231); security-log drill-through broken (stale useState init + incompatible type keys, lines 269-272). backendWiring: partial (read-only).
- **SAAlertBroadcast.js** -- `partial` -- Real broadcast send/list + user count, but hardcoded 'System: Optimal' pill (lines 353-359); 'View All'/'View Report'/'Edit' dead (lines 383-385,430-436); 'Acknowledge & Dismiss' local-only despite 'logged for audit' copy (lines 89,96-103); send has no error UI (lines 153-165); audience targeting cosmetic. backendWiring: partial.
- **SASystemHealth.js** -- `fake-data` -- Random Math.random() uptime bars (lines 11-18,70,200-204); 'All Systems Operational' green hero never trips on unprobed API/Auth (backend hardcodes status:'Operational' superadminController.js:389,392); Security Health/'Last updated'/Recent Activity all static (lines 109,133,139,219). Only db+mail truly probed. backendWiring: partial (fabricated).
- **SAChangeAlerts.js** -- `broken` -- Field-name contract mismatch: UI reads description/triggered_at/channels/school/by-fields that backend never sends (controller returns body/created_at only, SystemOpsAlert has no such columns), so most of each card renders blank/Invalid Date/'not sent'; acknowledge/resolve cannot record actor; channel toggles persist a preference nothing consumes. backendWiring: partial/broken.
- **SAGovernance.js** -- `fake-data` -- Permission matrix is a non-enforcing UI illusion — MODULES/DEFAULT_PERMS hardcoded (lines 16-39), PATCHed into AdminSetting JSON nothing reads; requireRole ignores rbac_role_permissions. Teacher/Registrar cards always 0 (backend never emits those roles); 'Clone role' button dead (line 507). backendWiring: partial (writes ignored).
- **SAUsers.js** -- `fake-data` -- All per-user security telemetry (risk/2FA/sessions/activity) hardcoded by backend mapUserToSaRow to 0/false/[] (superadminDataController.js:268-276); 30-day risk sparkline is pseudo-random walk (lines 34-47); Reset Password/Suspend/2FA/Terminate Session are local-state-only despite a real backend resetUserPassword existing unused; 2FA banner always 100%. Real user list fetch underneath. backendWiring: partial (fabricated telemetry).

## Top Risks (HIGH)

### B1. Fabricated revision diff sits directly above a LIVE transactional Approve button  _[high]_
The operator is shown red strike-through 'changed' rows implying a real resubmission edit history, then approves a real school account on that false basis. v1 is deterministically derived from v2, so EVERY unapproved school falsely appears to have 'resubmitted' edits even on first submission. The approval itself (POST /api/schools/approve/) is real and irreversible.

**Evidence:** SAVersionCompare.js:86-99 (v1 synthesized: 'http://old-domain.edu','old.'+admin_email,'Previous: '+motto; comment line 86 'simulated original submission ... for demo'); :190,211-218 'Approve v2' -> onApprove -> SuperadminDashboard.js:1103 handleAction approve -> :521-537 POST /api/schools/approve/. No version API (handleCompare SuperadminDashboard.js:555-558 does no fetch).

### B2. Onboarding history timeline is wholly fabricated with no disclaimer  _[high]_
One click from the live Approve button, SAAppHistory presents an invented review/audit trail (submission/review/changes/resubmit/approval) as real, with a fake reviewer quote and hardcoded reviewer/revisions — and unlike its sibling SARejectionAudit it carries NO 'reconstructed' caveat, so the operator cannot tell it is synthetic.

**Evidence:** SAAppHistory.js:25-74 events array, no fetch/useEffect; every event date=fmtDate(school.registration_date) (lines 31,38,46,54,63); fake quote line 47; revisions=changes_requested?2:1 line 22; 'Last Reviewer: Super Admin' literal line 106. No school-history route exists in backend (only grade/academic-year /history/).

### B3. System Health hero + uptime are fabricated for API and Auth services  _[high]_
The operator-facing 'All Systems Operational' green hero and 90-day uptime bars give false assurance: API/Auth status is a string literal that never trips the issue check, and the per-service bars are pure Math.random() noise. Real outages of the API or Auth layer would still show green.

**Evidence:** SASystemHealth.js:11-18,70,200-204 genUptimeBars Math.random(); :76 hasIssue=status!=='Operational' (can't trip on api/auth); backend superadminController.js:389,392 returns status:'Operational' uptime 0.9998/0.9999 unprobed; only db (sequelize.authenticate :381-386) + mail (RESEND_API_KEY) actually checked.

### B4. Forensic chain-of-custody + digital signature are invented evidentiary signals  _[high]_
Chain-of-custody and a 'Digitally Signed · SecurLog Sig: 0x492...1F' footer are exactly the evidentiary trust signals an operator would rely on in a security investigation, and both are wholly hardcoded; the resolve/flag actions also never persist, so cases stay Open after reload.

**Evidence:** SAForensics.js:22-28 static CHAIN_STEPS (always-incomplete 'Integrity Check'), rendered 188 with no caseData binding; :213-217 hardcoded SecurLog signature; :87 hardcoded 'Action: Write Attempt on Locked Record'; :221-223 Flag no onClick, :224-231 Acknowledge sets local state only (sole API call is GET :246).

### B5. Security-log -> forensics drill-through is broken (opens nothing)  _[high]_
Clicking a security event to investigate it in Forensics fails silently: the deep-link target is read from an empty cases array on first render (stale useState initializer) and matched against an incompatible type vocabulary, so the linked case never opens — the operator lands on the list with no indication the link failed.

**Evidence:** SASecurityLogs.js:251/275 onForensic(ev) -> SuperadminDashboard.js:569-572 -> SAForensics initialEvent; SAForensics.js:269-272 initCase=cases.find(c=>c.type===initialEvent.type)||cases[0] fed only to useState(initCase) while cases=[] (init line 242, fetch in useEffect 244-267); SecurityAuditLog.type (login_failure/threat_blocked) != ForensicEvent event_label/event_type.

### B6. Per-user security telemetry and security actions are fabricated/dead in SAUsers  _[high]_
The entire Super Admin user-security console is theater: every user's risk/2FA/sessions/activity is backend-hardcoded to 0/false/[], the 30-day risk sparkline is a pseudo-random walk, the always-red '100% lack 2FA' banner is meaningless, and Reset Password/Suspend/2FA/Terminate show success confirmations for actions that never hit the API (a real resetUserPassword endpoint exists but is unused).

**Evidence:** superadminDataController.js:268-276 hardcodes riskLevel:'low',riskScore:0,twoFAEnabled:false,sessions:[],recentActivity:[]; SAUsers.js:34-47 genSparkData pseudo-random; :368/377/386/252-253 Reset/2FA/Suspend/Terminate local-state only; :563,593-603 always-100% 2FA banner; real handler superadminController.js:436 resetUserPassword unused.

### B7. RBAC permission matrix is a non-enforcing UI illusion  _[high]_
A Super Admin toggling role permissions sees a confirm modal claiming changes 'affect N active users immediately', but nothing in the authorization path reads the saved rbac_role_permissions blob, so access is unchanged — a dangerous false sense of access control.

**Evidence:** SAGovernance.js:16-39 hardcoded MODULES/DEFAULT_PERMS; :378-380 handleSave PATCHes rbac_role_permissions into AdminSetting JSON; backend patchAdminSettings (superadminDataController.js:236-251) blind-merges, requireRole (middleware/requireRole.js:11-22) authorizes on static role string only; repo grep 'rbac_role_permissions' = 0 backend hits; modal 'affect N users' line 192.

## Partially-Built Workflow Features

### Onboarding review -> history -> version-compare -> approve pipeline
- **Works:** Entry conditions and the terminal Approve action are real: SAReview is fed genuinely fetched school data; the 'Compare Versions' gate (SAAppHistory.js:95) keys on school.changes_requested, a REAL server-backed column (School.js, set transactionally by request_changes superadminController.js:203); and the Approve button at the end is the real transactional /api/schools/approve/ pipeline (tx + email + audit).
- **Missing:** Every intermediate review SCREEN is fabricated: SAAppHistory invents the entire event timeline + reviewer quote + revisions/last-reviewer with no API and no 'reconstructed' disclaimer; SAVersionCompare manufactures a fake v1 'original submission' and renders manufactured red/green diffs. There is no revision-snapshot table or school-history endpoint anywhere in the backend, so no real before/after exists. The multi-step pipeline thus walks the operator through invented audit/diff data and terminates in a real, irreversible approval — the worst possible composition.

### Security event -> forensic case investigation drill-through
- **Works:** SASecurityLogs fetches real audit logs/counters and the row click wires through SuperadminDashboard to SAForensics with the selected event; SAForensics independently fetches real ForensicEvent rows and binds Event Details + SHA-256 hash comparison to real case data.
- **Missing:** The hand-off is broken end-to-end: the linked case is resolved from an empty cases array at first render (stale useState init) and matched on incompatible type vocabularies, so the targeted case opens neither correctly nor at all; and once in a case, 'Flag for Review'/'Acknowledge & Dismiss' never persist (no POST/PATCH), so investigation outcomes are never recorded — the case remains Open on reload.

### System change-alert acknowledge/resolve workflow (SAChangeAlerts)
- **Works:** getSystemAlerts returns real SystemOpsAlert rows (id/title/body/severity/trigger_type/status/notes/created_at) and postSystemAlerts genuinely persists status acknowledged/resolved + notes.
- **Missing:** The card UI is contract-mismatched so the workflow is unusable/auditless: UI reads description/triggered_at/channels/school/triggered_by/acknowledged_by that the backend never sends (blank body, 'Invalid Date'/'NaNd ago', every channel 'not sent', empty meta row); and because SystemOpsAlert has no actor column, acknowledge/resolve cannot record WHO acted, so the 'Ack./Resolved by' line is permanently empty — the compliance workflow has no audit trail.

### Alert broadcast compose -> send -> track workflow (SAAlertBroadcast)
- **Works:** Compose -> Send Now genuinely POSTs to /api/broadcast-alerts/ and the history list + Active Users/Total Sent/Critical counts are real fetches.
- **Missing:** The rest of the lifecycle is stubbed or dead: Schedule and Save Draft are disabled 'soon' stubs; per-card 'View Report' (Sent) and 'Edit' (Scheduled) and 'View All' do nothing; 'Acknowledge & Dismiss' is local-only despite 'logged for audit' copy; audience/region targeting is cosmetic (stored as a string, no fan-out); and send failure has no user-facing error. So only the single create-and-send leg is real.

## All Findings by Category

### Fabricated operator-trust signals (fake-data)
- **[high]** SAVersionCompare: entire v1 'original submission' diff invented -- v1 is built by mutating the current v2 values (name+' (Prev. Name)', website 'http://old-domain.edu', motto 'Previous: '+motto, 'old.'+admin_email). The code comment itself says 'simulated original submission ... for demo'. Because v1 is derived from v2, the fake diff always shows changes — even for a first-time school. No version-history source exists.
  - _ev:_ SAVersionCompare.js:86-99 (v1 synth), :13-52 DiffRow red line-through, :138/149 hardcoded 'v1 — Initial Submission'/'v2 — Resubmission'
- **[high]** SAAppHistory: fully synthesized event timeline + review summary -- No network call. Every dated event reuses registration_date; reviewer quote (line 47), description prose (45), revisions count (22), and 'Last Reviewer: Super Admin' (106) are hardcoded literals. No 'reconstructed' disclaimer unlike SARejectionAudit.
  - _ev:_ SAAppHistory.js:1 (imports only React), :25-74 events, :22,31,38,46,47,54,63,70,106
- **[high]** SAReview: fake 'Trust Score' gauge + 'Email Verified' chip -- getRisk returns 94/62/28 from three field-presence booleans (city/contact/admin) and labels the top tier 'Domain and IP checks passed' though no domain/IP check exists. 'Email Status: Verified ✓' is asserted whenever a non-placeholder admin email string is present; backend admin_email is just User.email with no verification flag.
  - _ev:_ SAReview.js:52-60 (getRisk, 'Domain and IP checks passed' line 57), :261-266 gauge, :362-365 email chip; backend superadminController.js:60 admin_email=usr.email
- **[high]** SASystemHealth: random uptime + fake green hero + static security card -- genUptimeBars uses Math.random() per bar under a '90-Day Uptime' header (only 30 bars). 'All Systems Operational' hero never trips on API/Auth because backend returns literal status:'Operational'. Security Health 'Verified', 'Last Audit 4m ago', 'Last updated: Just now' and the permanently-empty Recent Activity panel are all hardcoded.
  - _ev:_ SASystemHealth.js:11-18,70,172,200-207; backend superadminController.js:389,392; SASystemHealth.js:109,133,139,219
- **[high]** SAForensics: hardcoded chain-of-custody, fake SecurLog signature, static 'Action' -- CHAIN_STEPS is a module-level static array (4 done + always-incomplete 'Integrity Check') rendered identically on every case; footer shows 'Digitally Signed · SecurLog Sig: 0x492...1F' with no signing in the backend; Event Details 'Action: Write Attempt on Locked Record' is a literal shown for every record.
  - _ev:_ SAForensics.js:22-28,188,191 (chain), :213-217 (signature), :87 (action); backend getForensicEvents superadminDataController.js:460-481 has no signature/action
- **[high]** SAGovernance: non-enforcing RBAC matrix -- MODULES/DEFAULT_PERMS hardcoded; handleSave PATCHes rbac_role_permissions into AdminSetting JSON that no authorization path reads (requireRole uses static role string). Confirm modal claims changes 'affect N active users immediately' though nothing is enforced.
  - _ev:_ SAGovernance.js:16-39,378-380,190-192; backend patchAdminSettings superadminDataController.js:236-251, requireRole.js:11-22; grep rbac_role_permissions = 0 backend
- **[high]** SAUsers: all per-user security telemetry hardcoded + pseudo-random sparkline -- Backend forces riskLevel:'low', riskScore:0, failedAttempts:0, twoFAEnabled:false, sessions:[], recentActivity:[] for EVERY user. So risk bars=0/100, all badges 'Low'/'No 2FA', Sessions/Activity always empty. The 30-day 'Risk Trend' is a deterministic pseudo-random walk; stat cards show hardcoded trend deltas '+5%'/'-10%'/'0%'.
  - _ev:_ superadminDataController.js:268-276; SAUsers.js:34-47 genSparkData, :62-63, :331-333, :353-356, :413-423, :443-444, :563
- **[medium]** SASchools: hardcoded 'System Health: 98%' stat card -- Component receives only schools+onReview props; the System Health card is a string literal '98%' with no probe, rendered identically to the three genuine Total/Active/Pending counts.
  - _ev:_ SASchools.js:49 (props), :82 (literal), :78-83/96-105 (mixed render)
- **[medium]** SAApplications: structurally-zero 'Avg Review' KPI + invented Risk score -- avgReview sums (approval_date - registration_date) but backend makes both equal created_at, so it is always 0/'—'; the '-10m faster' trend is a hardcoded literal. Per-app Risk badge/filter is a field-completeness score with no backend risk model.
  - _ev:_ SAApplications.js:79-88,94 (KPI/trend), :43-51,115-120,213 (risk); backend superadminController.js:65-66, School.js no approval timestamp
- **[medium]** SASecurityLogs: 'Flagged IPs' mislabel + hardcoded trend arrows -- 'Flagged IPs' card maps the backend failed_logins_7d value (no flagged-IP metric exists in getSecurityCounters). All four cards carry hardcoded trend:{dir,'Live count'} arrows implying movement that is never computed.
  - _ev:_ SASecurityLogs.js:53,92 (mislabel), :89-92,142-144 (trends); backend getSecurityCounters superadminDataController.js:131-155
- **[medium]** SAAlertBroadcast: hardcoded 'System: Optimal' health pill -- Green 'System: Optimal' pill with live-dot is an unconditional static header child; no health probe exists in the component (only broadcast/users fetches). Surrounding metric cards are real.
  - _ev:_ SAAlertBroadcast.js:353-359; only API calls :156,:297,:321

### Dead buttons / non-persisting actions
- **[high]** SAUsers: Reset Password / Suspend / 2FA Setup / Terminate Session are local-only -- All four show success confirmations but never call the API (Reset just setResetSent; 2FA fakes success + flips local flag after 1500ms; Suspend toggles local state; Terminate filters the local array). A real backend resetUserPassword exists but is unused. Edit Profile is a 'coming next release' toast.
  - _ev:_ SAUsers.js:368,377,386,252-253,266-267; backend superadminController.js:436 resetUserPassword unused
- **[medium]** SAForensics: Flag for Review no-op + Acknowledge local-only -- 'Flag for Review' has no onClick; 'Acknowledge & Dismiss' only setAcknowledged(true). No POST/PATCH exists, and the flag is wiped on Back navigation (ForensicDetail unmounts), so resolutions never persist.
  - _ev:_ SAForensics.js:221-223,224-231,39,246,275
- **[medium]** SAAlertBroadcast: View All / View Report / Edit / Acknowledge dead or local-only -- 'View All' has no handler; per-card action only opens compose for Draft, so Sent ('View Report') and Scheduled ('Edit') do nothing AND stopPropagation suppresses the card's own detail-open; AlertDetail 'Acknowledge & Dismiss' is local-only despite 'logged for audit' copy.
  - _ev:_ SAAlertBroadcast.js:383-385,430-436,96-103,89
- **[medium]** SAGovernance: 'Clone role' button has no handler -- The clone icon button renders with aria-label but no onClick and no ancestor delegation; a file-wide search for clone handlers returns nothing.
  - _ev:_ SAGovernance.js:507
- **[low]** SASchools: onAction prop never used — directory cannot manage schools -- Parent passes onAction={handleAction} but SASchools never references it; the row '...' menu offers only View Details, so the 'School Management' page cannot suspend/approve/deactivate any school.
  - _ev:_ SuperadminDashboard.js:1170; SASchools.js:221-232
- **[low]** SAApplications: dead onBatchAction prop -- Parent passes onBatchAction={handleBatchAction} but the component destructures only {schools,onReview} and renders no select-all/bulk controls.
  - _ev:_ SAApplications.js:69; SuperadminDashboard.js:1075
- **[medium]** SAOnboarding: inert filters + Calendar + View Map -- Date Range/School Type/Region selects only set local state never read by any chart/KPI (regVol chart always uses last-6-months of all data; dateRange echoed as a cosmetic label only); Calendar button and 'View Map' span have no onClick. ('View Report' CSV export IS real.)
  - _ev:_ SAOnboarding.js:73-75,109-124,181-193,301,177,266; real export :213-237

### Correctness bugs
- **[high]** SAChangeAlerts: field-name contract mismatch breaks card rendering -- Controller returns {body,created_at,...} but UI reads alert.description (blank), alert.triggered_at (Invalid Date / 'NaNd ago'), alert.channels (every badge 'not sent'), and alert.school/triggered_by/acknowledged_by (empty meta row). SystemOpsAlert model has none of these columns.
  - _ev:_ SAChangeAlerts.js:166,223-251,230; backend superadminDataController.js:537-547; SystemOpsAlert.js:4-17
- **[medium]** SAChangeAlerts: acknowledge/resolve cannot record actor -- postSystemAlerts sets only status+notes+updated_at; SystemOpsAlert has no acknowledged_by/resolved_by column, so the UI's 'Ack./Resolved by' line is permanently empty and who-acted is unauditable.
  - _ev:_ superadminDataController.js:555-571; SystemOpsAlert.js:4-17; SAChangeAlerts.js:241-243
- **[medium]** SAGovernance: Teacher/Registrar role cards always show 0 users -- roleCounts is keyed by getUsers role labels, but mapUserToSaRow only ever emits Super Admin/Staff Admin/School Admin/User — never 'Teacher' or 'Registrar' — so those base-role cards resolve to undefined -> 0 even when such accounts exist.
  - _ev:_ superadminDataController.js:254-259; SAGovernance.js:10-11,326-328,341,504
- **[low]** SAOnboarding: 'In Review' pipeline step counts approved schools -- 'In Review' = pendingCount + approvedCount, double-counting already-approved schools into the review backlog and overstating it.
  - _ev:_ SAOnboarding.js:145
- **[low]** SAUsers: role filter/badges can never show Teacher/Finance/Exam Officer -- Backend never emits anything beyond Super Admin/Staff Admin/School Admin/User, yet the Invite modal offers Teacher/Exam Officer/Finance Officer the directory can never display as such.
  - _ev:_ SAUsers.js:97,562; superadminDataController.js:256-259
- **[low]** SAReview: 'Approved' date / 'days in review' meaningless -- approval_date equals registration_date (backend), so the 'Approved' date is just the registration date and daysSince keeps growing labelled 'in review' even after approval.
  - _ev:_ SAReview.js:67-70,373-377; backend superadminController.js:66

### Missing loading / error / empty states
- **[medium]** SASecurityLogs: loading flag discarded, errors swallowed -- useState loading value is destructured away; fetch errors only console.error; the 'No events found' empty branch is shown identically for loading, error, and true-empty — conflating three states.
  - _ev:_ SASecurityLogs.js:27,39-43,55-57,286-292
- **[low]** SAForensics: no loading/error state on case fetch -- fetchCases has no loading flag; failure only console.errors and the generic empty card is shown, indistinguishable from a real no-incidents result.
  - _ev:_ SAForensics.js:244-265,318-324
- **[low]** SASystemHealth: no error state on health fetch -- fetchHealth catch only console.errors; on failure metrics stays null and the page renders header+hero with no services/resources and no error message.
  - _ev:_ SASystemHealth.js:47-48
- **[low]** SAApplications: no loading state; failed fetch -> empty state -- Component renders only from the schools prop with an empty-state branch; the parent fetch swallows errors (silent catch), so network failure looks identical to genuinely-zero applications.
  - _ev:_ SAApplications.js:184-193; SuperadminDashboard.js:478
- **[low]** SAOnboarding: no loading state + swallowed self-fetch errors -- The /api/schools/ self-fetch has an empty .catch and no loading indicator, so on error the page shows perpetual em-dash KPIs with no message.
  - _ev:_ SAOnboarding.js:78-84
- **[medium]** SAAlertBroadcast: compose send has no user-facing error handling -- handleSend catch only console.errors + setSending(false); no error banner/state, so a failed broadcast looks like an idle form.
  - _ev:_ SAAlertBroadcast.js:153-165

### Workflow gaps
- **[high]** Onboarding review->history->compare->approve ends in fabricated screens -- Real entry gate (changes_requested) and real terminal Approve action, but the intermediate history and version-compare screens are entirely synthetic with no revision-snapshot backend. The operator approves a real school against an invented diff/audit trail.
  - _ev:_ SAAppHistory.js:95-99; SuperadminDashboard.js:1095,555-558; SAVersionCompare.js:86-99,211-218
- **[high]** Security-log -> forensics drill-through opens nothing -- Deep-link target read from empty cases array on first render (stale useState init) and matched on incompatible type vocabularies; the linked case never opens, dropping the operator on the list with no error.
  - _ev:_ SAForensics.js:269-272,242,244-267; SASecurityLogs.js:251,275; SuperadminDashboard.js:569-572

### UX shortcomings / honestly-labeled stubs
- **[low]** SARejected: reason-category tabs rely on free-text substring matching -- Fraud/Incomplete Docs/Policy tabs substring-match operator free-text rejection_reason (no enum), so a reason like 'Documents not legible' may or may not match — making the tabs unreliable and usually empty.
  - _ev:_ SARejected.js:79-81
- **[low]** SARejectionAudit: reconstructed fallback collapses events onto one date -- Fallback timeline stamps Submitted/Under-Review/Rejected all with registration_date and defaults actor to 'Super Admin'. Honestly labeled 'Reconstructed' so not fabrication, but conveys no real per-event timing.
  - _ev:_ SARejectionAudit.js:142,145-149,178
- **[low]** SAAlertBroadcast: disabled 'soon' stubs surfaced as primary affordances -- Schedule, Save Draft, View Full Audit Log, Review School Settings are honestly greyed/titled but advertise unbuilt workflow steps; regional/audience targeting is cosmetic with no recipient resolution; channel toggles in SAChangeAlerts persist a preference nothing consumes.
  - _ev:_ SAAlertBroadcast.js:107-116,227,270-280; superadminDataController.js:504-531; SAChangeAlerts.js:335-425

## Verification Corrections

- **SAAppHistory workflow-gap: 'gated on a fabricated condition' — NUANCED (sub-claim refuted)** -- Core claim CONFIRMED (history + compare destination screens are synthetic), but the sub-claim that the 'Compare Versions' branch is gated on a fabricated condition is REFUTED. school.changes_requested is a REAL server-backed BOOLEAN column (School.js, default false), set transactionally by the request_changes action (superadminController.js:203), surfaced at superadminController.js:67, and read in auth/registration logic. So the gate correctly fires only for schools that truly had changes requested; it is the destination CONTENT (history timeline + v1 diff), not the entry gate, that is fabricated. Net: real entry condition, fabricated destination.
- **SAForensics drill-through: outcome is 'opens NOTHING', not 'wrong case'** -- Mechanism sharpened. The finding said the broken match opens the wrong case (cases[0]) or none. Verified the dominant bug is the stale useState initializer: initCase is computed every render but fed only to useState(initCase), which React reads ONCE on first render when cases is still [] -> undefined; nothing ever calls setSelectedCase afterward. So the practical result is the linked case opens NEITHER cases[0] NOR the match — it opens nothing (list view). The incompatible-type-vocabulary mismatch is a second latent defect that would still break the match even if the timing were fixed.
- **SASecurityLogs 'Flagged IPs': mislabel of a backend value, not a visual duplicate** -- Confirmed as a mislabel but corrected: it is NOT a duplicate of a displayed 7-day failed-login value — no other card shows that number (the visible 'Failed Logins' card uses failed_logins_24h, a different window). It is a mislabel of the backend failed_logins_7d value, and the data is genuinely fetched (not hardcoded/random). Backend range is superadminDataController.js:131-155 (function ends at 155, not 150).
- **SAGovernance RBAC 'counts are hardcoded' — partially corrected** -- MODULES/DEFAULT_PERMS/ROLE_DEFS ARE hardcoded literals, but the 'N active users' count itself is NOT hardcoded — role.users is computed from a live GET /api/users/ fetch and saved perms hydrate from GET /api/admin-settings/. Core thesis (non-enforcing UI illusion) fully stands; only the 'counts hardcoded' phrasing is imprecise. Teacher/Registrar line numbers corrected to 341 (base roles) / 504 (render), with 350 for the separate custom-role path.
- **SAOnboarding inert filters: dateRange is read as a cosmetic label (not literally 'never read')** -- All three filters are functionally inert for data, confirmed. Minor refinement: dateRange IS read once at SAOnboarding.js:301 as a cosmetic Pipeline-Summary header label — but it never filters any data, which arguably makes it more misleading (it echoes the selection yet changes nothing). schoolType/region are read nowhere. The adjacent 'View Report' button is genuinely functional (real CSV export), so the dead-control claim was correctly scoped to Calendar + View Map.
- **SAReview getRisk duplication note** -- The same getRisk completeness heuristic also exists in SAApplications.js:43, but that copy only drives a color/level label and does NOT make the deceptive 'Domain and IP checks passed' claim — that fabricated security copy is unique to SAReview.js:57. Both are flagged separately and correctly.
- **SAApplications 'Avg Review' trend literal: Unicode-minus transcription** -- Confirmed structurally-zero KPI and hardcoded trend. Trivial transcription nuance: the source literal uses a Unicode minus '−10m faster' (U+2212), not ASCII '-10m faster'; semantically identical, does not change the finding.
- **SAAppHistory/SAVersionCompare fabrication is SYSTEMATIC, not occasional** -- Strengthening note (not a refutation): because SAVersionCompare derives v1 deterministically from v2, the fake diff ALWAYS shows changes even for a first-time, never-rejected school (gated only by !is_approved). The fabrication is systematic across every unapproved school, not an edge case.
