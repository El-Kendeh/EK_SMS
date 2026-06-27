# Super Admin Dashboard — Full Audit (UI · Backend · Functional)

**Date:** 2026-06-25
**Scope:** The Super Admin console only — `SUPERADMIN_NAV_ITEMS` in `EK_SMS/src/components/superadmin/SuperadminDashboard.js`, the ~50 `SA*` page components it mounts, and every superadmin-only backend route in `EK_SMS/backend_node/src/routes/superadmin.js` + its two controllers (`superadminController.js`, `superadminDataController.js`).
**Method:** Multi-agent fan-out — 2 recon mappers (nav→component→endpoint, route→implementation) + 12 deep audit buckets (74 raw findings), each finding then adversarially re-checked by an independent skeptic agent. 43 findings passed independent verification, 2 were refuted and dropped, 37 could not be re-verified before the run hit a session limit (marked **UNVERIFIED** — they come straight from the audit agent and several are corroborated by the backend recon map, noted inline). 5 additional issues come only from the endpoint recon (SA-81…SA-85).

---

## Executive summary

The Super Admin console is **broad and visually complete, but functionally hollow in its highest-value areas.** The lean operator menu is cleanly wired — all 31 page rows render a real component, none dead-end on a stub, and tenant-PII GETs (students/teachers/parents/bursars/principals) are correctly locked behind `?school_id=`. The master-data CRUD (geography, types, capacities, academic years/terms) is genuinely functional end-to-end. That's the solid half.

The other half is the problem. The platform's stated USP — **Grade Integrity** — is dead end to end: the integrity dashboard, grade reports, audit drill-down and grade notifications all read `/api/grade-alerts/`, which queries a table (`sa_system_ops_alerts`) that **no code ever writes**, while the real grade-change requests sit in a different table the console never reads (SA-01). **Analytics and Benchmarks headcounts are hardcoded zeros** (`getSchoolStats` returns `student_count: 0` for every school) and Benchmarks filters on fields the endpoint never sends, so the whole school-benchmarking surface is permanently empty (SA-02, SA-03). The **Academic Years subsystem 500s in production** because the model uses `status`/`deleted_at` columns no migration creates (SA-05). **Impersonation ("Enter a school") doesn't switch the console** without a manual reload (SA-04). And **global platform settings are writable by any authenticated user** — a teacher token can flip maintenance mode (SA-06, corroborated by recon).

Recurring themes: (1) **mock/placeholder data presented as live** (grade alerts, school stats, security "Recent Activity", forensics, change-alerts, user risk scores, uptime); (2) **UI/API contract drift** — cards read 9–15 fields the controller emits 6 of; (3) **"record-only" actions that claim to act** — Send broadcast, Acknowledge, Lockdown, Backup, 2FA enrollment all persist a label but do nothing; (4) **default-inactive-on-create** master data that silently never publishes; (5) a few real **privilege-boundary holes** on shared (non-SA-gated) routes.

**Verdict:** Not shippable as a trustworthy operator console yet. Roughly **6 critical** issues make flagship features non-functional or production-breaking and should be fixed before any demo that touches Grade Integrity, Analytics, Academic Years, or impersonation. The catalog/onboarding plumbing underneath is sound, so the fixes are mostly "wire the real source / gate the route / add the migration," not rebuilds.

### Counts (excludes 2 refuted findings)

| Severity | Count |
|---|---|
| 🔴 Critical | 6 |
| 🟠 High | 13 |
| 🟡 Medium | 32 |
| 🟢 Low | 34 |
| **Total** | **85** |

---

## 🔴 Critical

### SA-01 · Grade-integrity chain reads a table nothing writes — the USP is permanently empty
`grade-integrity`, `grade-report`, `notifications`, `grade-audit` · `SAGradeIntegrity.js`, `SAGradeReport.js`, `SANotifications.js`, `SAGradeAuditDetail.js` · `getGradeAlerts` (`superadminController.js:343`)
`getGradeAlerts` queries `SystemOpsAlert` where `trigger_type LIKE 'grade%'`, but a repo-wide grep shows `SystemOpsAlert` is **only ever read** — there is no `.create` and no seeder, so `/api/grade-alerts/` always returns `{alerts: []}`. **The real grade-modification data exists** — it's written to `pruh_core_modification_request` (`ModificationRequest.create` in teacher/parent/student controllers) — the SA console just points at the wrong table.
**Fix:** Repoint `getGradeAlerts` at `pruh_core_modification_request` (filtered/joined for grade-type requests), so the integrity dashboard, grade report and notifications surface the activity that is already being captured.

### SA-02 · `getSchoolStats` returns hardcoded zero counts — every headcount on Analytics/Benchmarks is fake
`analytics`, `benchmarks` · `SAAnalytics.js`, `SABenchmarks.js` · `getSchoolStats` (`superadminDataController.js:408-424`)
The handler maps each School to a literal `{ student_count: 0, teacher_count: 0, active_classes: 0, attendance_rate: 0, avg_performance: 0 }` — no query against Student/Teacher tables at all. The "Total Students" KPI, school-card headcounts, Top-Schools index and Platform Summary all consume these as real, so they show 0 (or blank) while real schools have enrolled students.
**Fix:** Implement real `COUNT(...) GROUP BY school_id` for students/teachers, and include `is_approved` + `school_name` on each row (see SA-03).

### SA-03 · Benchmarks reads `is_approved` + `school_name` that `getSchoolStats` never returns — whole school-benchmark layer is empty
`benchmarks` · `SABenchmarks.js:196-230` · `getSchoolStats`
`data.stats.filter(s => s.is_approved)` removes every row (the field is `undefined` on all of them), so `schoolStats` is always `[]`. "Top Performing Schools" always shows the empty state, the Schools-Live KPI and Platform Summary show "—", and Compare (needs ≥2 schools) is unreachable — regardless of how many approved schools exist. (Grade-stats KPIs on the same page still work; only the school-stats half is dead.)
**Fix:** Add `is_approved` and `name` to the School query in `getSchoolStats`.

### SA-04 · "Enter a school" doesn't switch the console — SA shell keeps rendering after the token swap
`__enter_school` / `schools` · `SuperadminDashboard.js:879-894`, `App.js:178-194` · `POST /api/impersonate/` (works)
`enterSchool()` swaps `localStorage` token/user and dispatches a `storage` event, but `App.js` registers **no `storage` listener** and passes no `key` tied to token/user, and the Dashboard's auth effect runs once on mount and never re-reads. So after impersonation the same superadmin shell keeps rendering; the school console only appears after a manual full reload. `UserContext`/`SchoolBrandingContext` *do* listen to `storage`, producing an inconsistent half-switched state. (The exit path has the same flaw.)
**Fix:** Have `App.js` listen for `storage` and re-read user/token (or pass `key={token}` to `<SuperadminDashboard>` so it remounts).

### SA-05 · `SystemAcademicYear` uses `status` + `deleted_at` columns no migration creates — every academic-year query 500s in prod
`academic-year` · `SARefDataManager.js` (Years mode), `SACreateTerm.js` · all `/api/academic-years/*` handlers
`models/SystemAcademicYear.js` declares `status` ENUM + `deleted_at`, and every controller reads/writes them, but `migrations/2026-05-18-all-new-tables.sql` and `run-all-tables.js` define `pruh_system_academicyear` with only `id,name,start_date,end_date,is_active,created_at,updated_at`. No `ALTER` adds the columns, and prod runs `db.sync({ alter: false })`. So Sequelize selects `status, deleted_at` → `ER_BAD_FIELD_ERROR` → 500 on the **list load itself** and every lifecycle action. The whole year+term subsystem is non-functional in prod until a manual ALTER runs.
**Fix:** Ship a migration: `ALTER TABLE pruh_system_academicyear ADD COLUMN status ENUM('draft','active','closed','archived') NOT NULL DEFAULT 'draft', ADD COLUMN deleted_at DATETIME NULL;` and backfill `status='active' WHERE is_active=1`.

### SA-06 · Global platform settings (`/admin-settings/`) are readable AND writable by ANY authenticated user
`settings` · `SASettings.js` · `GET/PATCH /api/admin-settings/` *(UNVERIFIED by skeptic — but independently confirmed by the backend recon map, scoping_findings #3)*
The two `/admin-settings/` routes are mounted on the **base** router (only `authenticateToken` + `schoolScope`, neither of which blocks any role) **before** the `requireRole(['superadmin'])` sub-router. `patchAdminSettings` has no internal role check and writes the single global settings row (id:1). So a teacher/parent/student/school-admin token can read and overwrite `platform_name`, `maintenance_mode`, `allow_registrations`, branding URLs, security flags, `lockdown_state`, `custom_roles`, plus the super admin's stored phone/bio.
**Fix:** Move `GET/PATCH /admin-settings/` onto the `sa` (superadmin-gated) router, or add an explicit `req.user.role !== 'superadmin' → 403` guard. Keep `/profile/` + `/change-password/` shared (they self-scope on `req.user.id`).

---

## 🟠 High

### SA-07 · Grade alert DTO mismatch — cards/audit/exports read ~15 fields the controller sends 6 of
`grade-integrity` · `SAGradeIntegrity.js`, `SAGradeReport.js`, `SAGradeAuditDetail.js` · `getGradeAlerts:362-369`
The controller emits only `{id,status,school,student,subject,requester:{name}}`, but the cards read `oldGrade/oldScore/newGrade/newScore/urgency/term/reason/requester.initials/ts`, and the audit detail also reads `requester.{ip,device,location}/hashMatch/blockNum`. Even once SA-01's source is fixed, every card shows "—" scores, blank reason/urgency/term/timestamp, and the CSV "Hash Match"/scores columns export blank. `subject` is just the first 120 chars of the alert body. **Fix:** define one canonical alert DTO and populate every field the UI reads (or trim the UI).

### SA-08 · Create-User offers "Exam Officer"/"Finance Officer" roles the backend silently downgrades to School Admin
`users` · `SAUsers.js:53` · `postUsers` → `mapInviteLabelToCode`
`ROLES_LIST` includes Exam Officer / Finance Officer, but `mapInviteLabelToCode` has no mapping for them and **defaults to `'schooladmin'`**; no such roles are seeded. Inviting either creates a **School Admin** (full tenant-admin authority) — a privilege escalation vs the label shown. **Fix:** remove those labels until real roles exist, or map+seed them and make the default branch reject unknown labels (400).

### SA-09 · Invite "School" is required free-text but silently ignored unless it exactly matches a school name
`users` · `SAUsers.js:68,82` · `postUsers:383-385`
The backend only links a school when `role==='School Admin'` AND `School.findOne({where:{name}})` exactly matches; for all other roles the typed school is dropped. A typo/near-match skips the `SchoolAdmin` link silently and still returns `success`. **Fix:** replace free-text with a dropdown that sends `school_id`; 400 if a required school doesn't resolve.

### SA-10 · Invited users are created `is_active:false` with no email/activation path, yet the UI says "credentials dispatched"
`users` · `SAUsers.js:150,553` · `postUsers:367,379`
`postUsers` generates a temp password but **never emails anything** (unlike `resetUserPassword`, which does), while the modal asserts "Credentials have been dispatched to <email>." Every invited user lands inactive, never receives credentials, and can never log in. **Fix:** send an invite/credential email (or a first-login activation token), and don't claim dispatch unless mail actually went out.

### SA-11 · Reports Hub "Schools" export hits `/api/superadmin/sa/export/` — a path that doesn't exist (404)
`reports` · `SAReportsHub.js:95-96` · real route is `GET /api/sa/export/`
The component prefixes `/api/superadmin/`, but the router is mounted at `/api`, so the real URL is `/api/sa/export/`. The headline Schools-register CSV/JSON download always 404s. (Users CSV + grade-stats JSON use correct paths and work.) **Fix:** change both paths to `/api/sa/export/`.

### SA-12 · Grade audit detail renders hardcoded evidence files, a fake blockchain ledger, and a no-op Validate/Flag *(UNVERIFIED)*
`grade-audit` · `SAGradeAuditDetail.js`
Every record hardcodes the same two "Digital Evidence" files (`Exam_Scan.pdf` 2.4 MB, `Mod_Request.docx` 145 KB), the actor IP/device/location always fall to "N/A", the Blockchain Ledger always reads "not committed," and Validate/Flag only flip local `useState` (nothing persists). **Fix:** back it with a real evidence/ledger source and persist validate/flag, or disable the buttons; the honesty banner doesn't excuse a clickable no-op.

### SA-13 · Grade-alert notifications read `urgency/ts/oldGrade/newGrade` the controller never returns *(UNVERIFIED)*
`notifications` · `SANotifications.js:68-80` · `getGradeAlerts`
Every grade notification falls back to a generic "info" card with a "? → ?" body, and `a.ts` is `undefined` → `new Date(undefined)` → "NaNm ago" timestamps that also corrupt the feed sort. **Fix:** extend `getGradeAlerts` with `urgency/old_grade/new_grade/created_at`, or consume only the emitted fields; guard timestamp before `relativeTime()`.

### SA-14 · Reconsider fires an irreversible state change + email on a single click, no confirmation *(UNVERIFIED)*
`rejected` · `SARejected.js:205`, `SuperadminDashboard.js:574-576` · `handleSchoolAction` (request_changes)
Unlike approve/reject (which use confirm modals), the Reconsider button calls `handleAction(..., 'request_changes', ...)` directly, immediately un-rejecting the school and emailing its admins — no confirm, no undo. **Fix:** route Reconsider through a confirm modal with a note field.

### SA-15 · Security toggles (Global 2FA, Auto Grade Locking, Session Timeout) persist but are never enforced *(UNVERIFIED)*
`settings` · `SASettings.js:741-784` · `patchAdminSettings`
The flags save into `admin-settings` JSON, but nothing in the auth/grade/session layer reads `settings.twoFA / autoLock / sessionTimeout`. They present as live controls (no honesty banner, unlike Lockdown/Backup). **Fix:** wire them into middleware, or add a "Recorded — enforcement pending" disclosure.

### SA-16 · Bulk Export offers PDF + Grades/Audit/Users datasets the backend silently ignores *(UNVERIFIED; recon-confirmed partial)*
`settings` · `SASettings.js:962-989` · `getSaExport`
`getSaExport` ignores `?datasets=` (always queries Schools) and treats any non-`json` format (incl. `pdf`) as CSV. Exporting "Audit Logs as PDF" actually downloads the schools list as CSV. **Fix:** implement per-dataset + PDF export, or disable the unimplemented options.

### SA-17 · Forensics page is permanently empty — nothing ever creates a `ForensicEvent` *(UNVERIFIED; recon-consistent)*
`forensics` · `SAForensics.js` · `getForensicEvents:494`
The GET is real and the model exists, but a repo-wide search finds **zero `ForensicEvent.create`**. The page always shows the empty state, all stats are 0/"—", and the security-log "View forensic detail" drill-through always lands on nothing. **Fix:** emit forensic rows from real signals (or derive from high/critical `SecurityAuditLog` rows), or remove the nav entry until a producer exists.

### SA-18 · Change Alerts page is permanently empty — nothing ever creates a `SystemOpsAlert` *(UNVERIFIED; recon-consistent)*
`change-alerts` · `SAChangeAlerts.js` · `getSystemAlerts:568` / `postSystemAlerts:589`
`postSystemAlerts` only **updates** existing rows; no `SystemOpsAlert.create` exists anywhere for the documented triggers (grade_lock_attempt, enrollment_change, fee_payment, …). The acknowledge/resolve workflow has nothing to act on, and the empty-state copy overpromises ("will appear automatically"). **Fix:** insert `SystemOpsAlert` rows at the real trigger sites.

### SA-19 · "Send Now" broadcast writes a DB row labelled `sent` — no email/SMS/push is dispatched *(UNVERIFIED; recon-confirmed partial)*
`alert-broadcast` · `SAAlertBroadcast.js:263` · `postBroadcastAlerts:538`
The UI shows "Alert Sent!", but `postBroadcastAlerts` only does `BroadcastAlert.create({status:'sent'})` + an audit row — no delivery, and the audience string is never resolved to recipients. Platform-wide announcements reach no one. **Fix:** resolve the audience and dispatch via the existing Resend email path / in-app notifications; only mark `sent` after dispatch.

---

## 🟡 Medium

### SA-20 · New countries/regions/cities are created `is_active=false` and never appear in registration dropdowns
`geography` · models `Country/Region/City` default `is_active:false`; `createCountry/Region/City` omit it · `Register.js` filters `.is_active`. Adding "Sierra Leone" saves as Inactive and silently never reaches registrants until the SA toggles each row. (Regions/cities have a public-API fallback; countries do not.) **Fix:** set `is_active:true` on create, or surface the publish semantics in the UI.

### SA-21 · Deleting a country/region hard-deletes and orphans all child regions/cities — no FK guard or force flow
`geography` · `deleteCountry/deleteRegion` do unconditional `row.destroy()` with no dependent check; the frontend even supports a `?force=1` + 409 flow the controllers never emit. Cities can outlive their region/country. **Fix:** count children → 409 `requiresForce` (matching the existing shell flow), or block.

### SA-22 · School registration discards SA-managed institution/academic/grading master data and uses hardcoded constants
`academic-system`/`grading-system`/`institution-type` · `Register.js:1389-1393` fetches all three endpoints but the extract callbacks are no-ops; dropdowns are driven by `DEFAULT_*` constants bound with no setter. SA edits to these taxonomies never reach the registration form. *(Note: blocked by a real schema gap — the master-data rows store only free-text `name`, while the dropdowns need stable coded enum values.)* **Fix:** add a `code`/`value` column to those taxonomies and wire real setters (fallback to `DEFAULT_*` only when the API is empty).

### SA-23 · Catalog create/update handlers have no duplicate-name or non-empty validation
`institution-type`/`school-type`/`syllabus-type`/`class-subtype`/`academic-system`/`grading-system`/`capacity-category` · every `createX` only checks truthiness then inserts — no `trim` (so `' '` passes), no case-insensitive dedupe, no unique constraint (unlike `validateYearPayload`). Pollutes the catalog + dropdowns. **Fix:** shared validator (trim+reject empty, length-cap, CI dedupe excluding self) returning `fieldErrors`.

### SA-24 · Deleting a Capacity Category referenced by School Capacities isn't blocked (orphan risk)
`school-capacity` · `deleteCapacityCategory:1805` does `row.destroy()` with no dependent check; `getSchoolCapacities` then renders a blank category name for orphaned rows. **Fix:** count dependent `SchoolCapacity` rows → 409/400 if in use.

### SA-25 · User-list role column is derived heuristically and mislabels most tenant users
`users` · `mapUserToSaRow:290-293` ignores `role_id` and infers role from `is_superuser`/`is_staff`/SchoolAdmin link. Because `is_staff` is true for superadmin/schooladmin/principal/bursar/**teacher**, those all collapse to "Staff Admin"; only parents/students fall to "User". The role filter + Governance per-role counts are wrong. **Fix:** join `users.role_id → roles.code` and map the real label.

### SA-26 · Governance shows a hardcoded "Registrar" role that doesn't exist in the backend
`governance` · `SAGovernance.js:11,340` · `ROLE_DEFS` always merges a fabricated `registrar` role; no such role is seeded, so it shows 0 users forever and editing its perms writes a settings key auth never reads. **Fix:** drop the fabricated entry; render only seeded roles + real `custom_roles`.

### SA-27 · Permission matrix is fully editable/saved but never enforced; custom-role permissions are silently discarded
`governance` · `SAGovernance.js:380,226` · nothing reads `rbac_role_permissions`; `postSaCustomRoles` persists only `{id,name,description}`, dropping any permissions. The page's "Preview — not enforced" banner covers the matrix but **not** the custom-role permission drop (the modal says "assign permissions later"). **Fix:** wire `rbac_role_permissions` into `requireRole`, and persist custom-role permissions.

### SA-28 · `getGradeStats` never returns `passed` or `distribution` — Pass Rate KPI + Grade Distribution chart are permanently dead
`benchmarks` · `SABenchmarks.js:211-215` · `getGradeStats:475-486` returns many fields but no `passed`/`distribution`, so `passRatePct` is always null and `gradeDist` always `[]`, even with thousands of grades. **Fix:** add a pass-count and a letter-grade band aggregate alongside the existing per-school AVG machinery.

### SA-29 · Benchmarks year/term/grade filters are decorative — hardcoded fake options that filter nothing
`benchmarks` · `SABenchmarks.js:258-260` · options are hardcoded `['2023-24',…]`/US seasons (`Spring/Fall/Summer` — not this platform's term model); `term`/`grade` are write-only, the data effect has empty deps, and the endpoints take no period params. **Fix:** remove the bar, or populate it from `/api/academic-years/` + `/api/system-terms/` and pass the period through.

### SA-30 · `approval_date` is fabricated as `registration_date` in the serializer
`applications` · `serializeSchool` (`superadminController.js:35,66`) sets `approval_date = created_at` for approved schools (no real approved-at column). "Avg Review" is therefore always `0m`, and the "Approved" date on the review screen is really the registration date. **Fix:** add a real `approved_at` column set in `handleSchoolAction`'s approve branch; serialize it.

### SA-31 · Sidebar Notifications badge + header bell never reflect unread items until the page is first opened
`notifications`/topbar · `SuperadminDashboard.js:456,959,1098` · `unreadNotifCount` is only updated by `<SANotifications>`, which mounts only on the notifications page; no unread count is fetched on shell mount. **Fix:** fetch unread count on shell mount (and interval) independent of the page.

### SA-32 · System-term edit/delete/toggle endpoints have NO UI — terms can be created/rolled-out but never modified or removed
`academic-terms` · `SACreateTerm.js` only calls create + rollout; `PUT/DELETE/PATCH /api/system-terms/:id/` are routed but unreachable. A mistyped term can't be fixed or removed. **Fix:** add edit/deactivate/delete row controls (mirror `SARefDataManager`).

### SA-33 · `createSystemTerm`/`updateSystemTerm` have no server-side date validation
`academic-terms` · `createSystemTerm:1437` writes `start/end` straight through — no start<end, within-year-bounds, or overlap check (the frontend only *warns* on overlap/out-of-range, and a direct API client bypasses even the reversed-date block). Garbage term ranges cascade to every school on rollout. **Fix:** validate server-side (reject `end<=start`, out-of-year-bounds; warn/reject overlap) on both create and update.

### SA-34 · Rollout cascade matches schools' years/terms by case-insensitive **name only** — silent duplicates / wrong-row activation
`academic-year` · `rolloutAcademicYear:1092-1128` joins via `LOWER(name)` with no stable FK. A school's pre-existing same-named year gets adopted+activated (deactivating its others), and a renamed system term spawns duplicates; preview/adoption metrics drift too. **Fix:** add nullable `system_academic_year_id`/`system_term_id` FKs and match on those, name-only for legacy.

### SA-35 · `/api/grade-alerts/` is a shared route, not superadmin-gated (cross-tenant read) *(UNVERIFIED; recon-confirmed, scoping #2)*
`grade-integrity` · `routes/superadmin.js:100` mounts it before the `sa` sub-router, and `getGradeAlerts` does no tenant scoping — any authenticated user (incl. an impersonating school_admin) can read all-school grade-alert data. Low live impact only because the table is empty; becomes a PII leak the moment SA-01 is fixed. **Fix:** move under the `sa` router and/or add explicit superadmin + tenant scoping.

### SA-36 · `SAGradeReport` has zero `@media` rules and a hardcoded 2-col risk grid that breaks on mobile *(UNVERIFIED)*
`grade-report` · `SAGradeReport.js:444` · fully inline-styled, fixed `gridTemplateColumns:'1fr 1fr'`, and the `.sa-gi-risk-grid` class has no rule in any imported CSS. Violates the mandatory ≤600px responsiveness rule. **Fix:** add `@media (max-width:600px){.sa-gi-risk-grid{grid-template-columns:1fr}}` and verify ≥44px touch targets.

### SA-37 · Sidebar bell badge stays 0 until Notifications is opened *(UNVERIFIED — duplicate of SA-31 from the notifications bucket)*
Same root cause as SA-31. **Fix:** compute unread count at shell level from already-loaded data.

### SA-38 · Mark-as-read / Mark-all / Dismiss are session-only — reset on reload *(UNVERIFIED)*
`notifications` · `SANotifications.js:250-269` · these mutate only local state, no `ApiClient` call, no read-receipts table. The whole backlog returns on next login; "Mark all read" is cosmetic. **Fix:** persist read/dismissed state (per-user, minimally localStorage keyed like `SAProfile`; ideally a backend endpoint).

### SA-39 · Reconsider sends a hardcoded internal note as the change-request reason *(UNVERIFIED)*
`rejected` · `SuperadminDashboard.js:575` hardcodes `'Reconsidering rejected application'`, which the backend emails verbatim to the school and stores in the audit log. The operator can't say what to fix. **Fix:** capture a real note in the Reconsider dialog (pairs with SA-14).

### SA-40 · Rejected "Fraud / Incomplete / Policy" filter tabs almost never match (free-text reason) *(UNVERIFIED)*
`rejected` · `SARejected.js:79-81` substring-matches a free-text **optional** reason (default `'Rejected by superadmin'`). Three of four tabs render empty unless the operator typed the exact keyword. **Fix:** add a structured rejection-reason category and filter on it.

### SA-41 · Rejection audit fabricates a fake event timeline when the live log is empty, presented as the record *(UNVERIFIED)*
`rejection-audit` · `SARejectionAudit.js:144-149` invents reviewer steps ("Super Admin opened the application…") and stamps all fallback events at `registration_date`, so a fabricated rejection appears to have happened at submission time. The only hint is an easy-to-miss "Reconstructed" badge. On an audit page, this is a trust problem. **Fix:** show an explicit "no audit events recorded" state instead of synthesizing actors/timestamps.

### SA-42 · Rejection audit can miss the real event — security-logs capped at 500 rows, no per-school filter *(UNVERIFIED)*
`rejection-audit` · `SARejectionAudit.js:106` fetches `/api/security-logs/?limit=500` then filters client-side by `school_id`; `getSecurityLogs` hard-caps at 500 with no per-school query. Older schools fall outside the window → silently degrade to the fabricated fallback (SA-41). **Fix:** add `GET /api/security-logs/?school_id=` and call that.

### SA-43 · `getAllSchools` returns every school + admins + users on each render — no pagination/filter *(UNVERIFIED)*
`schools`/`rejected` · `getAllSchools:77-84` does an unbounded `findAll` with a SchoolAdmin→User include; the whole onboarding/rejected/schools surface + badge counts filter this client-side. Payload/DB cost grows linearly. **Fix:** add server-side `?status=` filter + pagination.

### SA-44 · Super-admin profile prefs (phone, bio, avatarColor, language, timezone) are saved into the single shared global settings row *(UNVERIFIED; recon-related to SA-06)*
`profile` · `SAProfile.js:205` writes them to `/admin-settings/` (the one global row), and `getProfile` never returns them. Combined with SA-06's missing role gate, any authenticated user can read the SA's phone/bio; a second operator would overwrite the first's. **Fix:** persist these on the User record via `/profile/`.

### SA-45 · Profile photo is only stored in localStorage — lost on any other browser/device *(UNVERIFIED)*
`profile` · `SAProfile.js:194-205` writes the base64 avatar only to `localStorage` (per-user key — no cross-account leak, that part's fine); the server PATCH deliberately omits `avatarSrc`. Upload "persists," then vanishes on another device. **Fix:** add a real avatar upload endpoint (reuse the multipart branding pattern), or label it device-local.

### SA-46 · "Manage 2FA" enrollment is an entirely non-functional preview (QR/OTP/recovery codes illustrative) *(UNVERIFIED)*
`settings` · `SASettings.js:316-461` · hardcoded QR SVG, unvalidated OTP boxes, blank manual key + empty recovery grid, `onComplete` just toasts "preview." Honestly labelled, but it's a multi-step dead-end behind a primary button. **Fix:** implement TOTP end to end, or replace with a single "coming soon" state.

### SA-47 · Global search surfaces "Enter a School" and navigates to a broken `__enter School` StubPage *(UNVERIFIED)*
`global-search` · `SuperadminDashboard.js:912,1575` · the `__enter_school` action item isn't filtered out of the search list; `onSelect` calls `goTo(item.key)` (not the sidebar's special-case), so it falls through to `StubPage` titled "__enter School." **Fix:** exclude items with an `action` from search, or honor `item.action` in `onSelect`.

### SA-48 · Security-log "Status" column is always blank — backend never returns it, model has no such field *(UNVERIFIED)*
`security-logs` · `SASecurityLogs.js:237-270` renders a Status column + `statusColor` logic, but `getSecurityLogs` returns no `status` and `SecurityAuditLog` has no such column. Every row's Status cell is empty; the color branch is dead code. **Fix:** add a real outcome field at write time, or remove the column.

### SA-49 · Broadcast detail "Acknowledge & Dismiss" claims it's "logged for audit" but only flips local state *(UNVERIFIED)*
`alert-broadcast` · `SAAlertBroadcast.js:88-116` · the copy guarantees compliance logging; the onClick is `setAcknowledged(true)` with no API call, and the severity copy is hardcoded "critical security update." The two secondary buttons are permanently disabled. **Fix:** wire acknowledge to a persisted endpoint (or drop the claim); make severity/type copy dynamic.

### SA-50 · Weak cross-tenant linking on class/subject assignment routes *(recon-only, scoping #4)*
`assign-subjects / assign-teacher / assign-multiple-teachers / assign-classes / assign-subject-teacher` · the owning class/subject is `denyCrossTenant`-checked, but the **supplied** `subject_ids/teacher_ids/class_ids` are bulk-linked without verifying they belong to the same school. A school_admin (or in-scope SA) could link another school's subject/teacher/class by guessing ids. **Fix:** verify every referenced id resolves to `cls.school_id`/`sub.school_id` before bulkCreate/update.

### SA-51 · `GET /api/dashboard/` leaks platform-wide counts to any authenticated user *(recon-only, scoping #1)*
Mounted on the shared router (no `requireRole`); returns global School/User/pending/approved counts to any tenant role. **Fix:** gate behind superadmin, or expose a tenant-scoped variant for non-SA callers.

---

## 🟢 Low

### SA-52 · Geography status shows raw "Inactive" with no hint that inactive = hidden from registration
`geography` · `SARefDataManager.js:1321,1387` · only the Countries subtitle mentions registration; Regions/Cities say nothing, and the toggle reads as cosmetic rather than a publish switch (compounds SA-20). **Fix:** relabel to "Live/Hidden" + tooltip "Only active entries appear in registration dropdowns."

### SA-53 · `getRegions`/`getCities` resolve parent names with per-row `findByPk` (N+1)
`regions`/`cities` · `getRegions:2002`, `getCities:2087` · ~2M+1 queries to list M cities; these GETs are public/unauth too. **Fix:** define associations + single `findAll` with `include`, or bulk-fetch parents.

### SA-54 · New catalog rows are created `is_active=false` by default (model default) — inactive on creation
`institution-type`/`school-type`/`school-capacity`/`syllabus-type`/`class-subtype` · models default false + handlers omit `is_active` (inconsistent with AcademicSystem/GradingSystem/LessonPlanType which default true). Cosmetic for these (no live consumer filters them, unlike geography), but the SA must toggle each new row. **Fix:** default `is_active:true` on create across all nine types for consistency.

### SA-55 · Public (unauth) catalog GETs return inactive rows; clients must filter client-side
`institution-type`/`academic-system`/`grading-system` · `routes/superadmin.js:88-93` public mounts return all rows regardless of `is_active`. Low-sensitivity master-data names; mainly a hardening/consistency note (no live consumer surfaces them). **Fix:** add a server-side `is_active` filter to a public-only handler, or drop the unused public mounts.

### SA-56 · "Clone role" button on every governance role card has no handler (dead onClick)
`governance` · `SAGovernance.js:515` · clicking does nothing. **Fix:** wire to `CreateRoleModal` pre-filled, or remove.

### SA-57 · User-profile "Active Sessions" / Terminate / risk stats are local-only fabrications
`users` · `mapUserToSaRow:302-310` hardcodes `sessions:[]`, `riskScore:0`, etc.; `terminateSession/All` filter local state only. Because `sessions` is always `[]`, the Terminate buttons never even render (dead code). A prior cleanup relabeled the risk bar "not yet tracked," but the sessions empty-state still reads "No sessions found" (implies tracking). **Fix:** label sessions "not yet tracked," or back them with real data.

### SA-58 · Reports Hub count chips never populate — `/api/superadmin/dashboard/` 404 swallowed silently
`reports` · `SAReportsHub.js:57` · wrong path (real: `/api/dashboard/`), caught by `.catch(()=>{})`. The "N schools"/"N users" chips stay blank. (Same wrong path also in `App.js:144`.) **Fix:** change to `/api/dashboard/`.

### SA-59 · Top-Schools "Perf. Index" is a relative student-count ratio mislabeled as performance/integrity
`benchmarks` · `SABenchmarks.js:234,315,325` · `perf = student_count / maxStudentCount * 10` rendered as "Integrity & Performance Index." (Also empty in practice via SA-03.) **Fix:** rank by a real academic metric, or relabel "Relative Size."

### SA-60 · "View All Schools" button + `SABenchmarks onNavigate` prop are dead; SchoolCard kebab is a no-op
`benchmarks`/`analytics` · `SABenchmarks.js:343` button has no onClick and the component ignores the passed `onNavigate`; `SAAnalytics.js:301` kebab only `stopPropagation`. **Fix:** wire "View All Schools" to `onNavigate('analytics')`; implement or remove the kebab.

### SA-61 · `SAVersionCompare` is dead code — no UI path navigates to it
`version-compare` · `SAAppHistory.js:24` never destructures/calls the `onCompare` prop the shell passes, and has no Compare button. The whole page is unreachable. **Fix:** delete `SAVersionCompare` + `handleCompare` + the route, or add a Compare button in `SAAppHistory`.

### SA-62 · "Avg Review" stat shows a hardcoded fake trend "−10m faster"
`applications` · `SAApplications.js:94` · the trend dir+label are constants (the value itself is real, but always `0m` per SA-30). **Fix:** remove the hardcoded trend or compute it once `approved_at` exists.

### SA-63 · Review "Administrator" section renders two fields both labeled "Email"
`review` · `SAReview.js:358,361-365` · the second is an email-presence status chip reusing the "Email" label → reads as a contradictory second email. **Fix:** relabel to "Email status."

### SA-64 · Field-completeness heuristic is dressed up as a precise "Risk" / trust score
`review`/`applications` · `SAReview.js:52-60` returns fixed 94/62/28 from a 3-field-group count, labeled "Profile Completeness /100" in one place and "Risk Assessment" in another (desktop chip too); `SAApplications` stamps "High/Medium/Low Risk." A missing phone reads as "high risk." **Fix:** one honest label everywhere; show "2 of 3 sections complete" or list missing fields.

### SA-65 · All-Schools rows have no "Enter as admin" action despite the documented intent
`schools` · `SASchools.js:221-232` row menu has only "View Details"; the `onAction` prop is unused and the "impersonate from here" comment is unfulfilled (impersonation is only via the separate nav modal). **Fix:** add "Enter as admin" to the row menu (approved+active only), or remove the dead prop/comment.

### SA-66 · All-Schools / Onboarding show "No schools found" on fetch failure (silent error swallow)
`schools` · `fetchSchools:475-481` swallows network errors and clears loading, so a failed `/api/schools/` renders the empty state with no error/retry. (A fullscreen loader covers the initial load, so there's no transient-flash issue — the defect is the silent failure.) **Fix:** track a fetch-error flag → distinct error state with retry.

### SA-67 · `SuperadminDashboard.css` is empty — all shell responsiveness lives in `SA.css`
`shell` · the file is 2 comment lines, 0 rules; the off-canvas sidebar/mobile-nav/search clamps are all in `SA.css`. Maintainability/colocated-CSS smell, not a runtime defect. **Fix:** remove the empty file, or move the shell `@media` rules into it.

### SA-68 · GlobalSearch modal is inline-styled; page-result rows are ~38px (under the 44px touch minimum)
`global-search` · `SuperadminDashboard.js:196-239` · functional (navigates + closes), but page rows fall short of the project touch-target rule (school rows at 46px are fine). **Fix:** move styling to `SA.css`, bump row min-height to ≥44px.

### SA-69 · `closeAcademicYear` can close any year (incl. a draft) and leave the platform with no active year, no confirm
`academic-year` · `closeAcademicYear:1288` unconditionally sets `is_active=false,status='closed'` with no active-row guard and the UI close button has no confirm. (Reversible via toggle/rollout, so not catastrophic.) **Fix:** guard to only act on the active year + add a confirm step.

### SA-70 · `SAGradeIntegrity`/`SAGradeAuditDetail` rely on shared `sa-gi-*` classes with unverified mobile rules *(UNVERIFIED)*
`grade-integrity` · neither imports CSS; `sa-gi-*` classes (compare/evidence/actor/ledger) must carry `@media` rules in a global `SA.css` or the comparison/evidence grids won't stack on mobile. **Fix:** verify/add ≤600px stacking rules for those classes.

### SA-71 · Grade Reports chart hardcodes mid-term/exam x-axis labels and a fixed "anomaly spike" at day 20 *(UNVERIFIED)*
`grade-report` · `SAGradeReport.js:398-429` · draws a red "anomaly" peak at array index 20 unconditionally and labels a 30/90-day daily axis as "Week 1 / Mid-Term / Exam Period / Finals." Implies a detected anomaly that isn't from data. **Fix:** render axis ticks from the real date range; mark a peak only at the actual max index.

### SA-72 · No loading state while security-logs / admin-settings fetches are in flight (notifications) *(UNVERIFIED)*
`notifications` · `SANotifications.js:214-221` · empty `.catch(()=>{})` and no loading flag → momentary "No notifications" flash and silent failure of the security/system feeds. **Fix:** add an isLoading flag + surface fetch errors.

### SA-73 · Reconsider promises "return to pending review" but backend sets `changes_requested` (different state) *(UNVERIFIED)*
`rejection-audit` · `SARejectionAudit.js:353` copy vs `handleSchoolAction` setting `changes_requested=true` (login gate treats it distinctly — school must edit/resubmit, not just await review). **Fix:** correct the copy, or add a true "reopen as pending" action.

### SA-74 · Rejection audit shows the fabricated timeline during initial load instead of a loading state *(UNVERIFIED)*
`rejection-audit` · `SARejectionAudit.js:140,157` · on first paint `logs` is empty so it renders the reconstructed fallback + "Reconstructed" badge, then snaps to real data. **Fix:** render a skeleton while `loading` is true; choose real-vs-fallback only after the fetch settles.

### SA-75 · "Record Backup Entry" writes a fabricated filename/size but produces no actual backup *(UNVERIFIED; recon-confirmed stub)*
`settings` · `postSaBackupManual:673` · fakes `eksms-backup-<ts>.sql` + hardcoded `2048000` bytes; no dump. Honestly labelled, but the concrete filename/size implies a recoverable artifact. **Fix:** run `mysqldump` and report the true file/size, or store only a timestamp + "no artifact" marker.

### SA-76 · Emergency Lockdown records state + audit only; enforcement is unimplemented *(UNVERIFIED; recon-confirmed stub)*
`settings` · `postSaLockdown:641` · returns `sessions_terminated:0, grades_locked:0`; nothing blocks logins/sessions/grades, so the three "Protocol" options are identical. Honestly labelled. **Fix:** implement at least login-suspension keyed off `lockdown_state`, or collapse the cosmetic protocol options.

### SA-77 · Server-side change-password accepts any non-empty new password (no length/strength check) *(UNVERIFIED)*
`settings`/`profile` · `postChangePassword:233` · only checks presence + current-password match; the 12-char/complexity policy is client-only and bypassable via direct API. **Fix:** mirror the policy server-side; reject `new === current`.

### SA-78 · Branding logo/favicon upload persists a URL but is never applied to the running app *(UNVERIFIED)*
`settings` · `postSaBranding:608` saves the file + URL (real), but nothing consumes `settings.branding_logo.url` to render the logo or swap the favicon. **Fix:** consume it in the header/login + inject the favicon `<link>`, or label "stored for future use."

### SA-79 · Forensic detail Acknowledge/Flag don't persist; chain-of-custody is illustrative *(UNVERIFIED)*
`forensics` · `SAForensics.js:223-229` · "Acknowledge & Dismiss" is local-only; "Flag for Review" has no onClick. Honestly labelled, but the buttons imply function. **Fix:** wire Acknowledge to a PATCH (resolved/resolved_at); implement or remove Flag. (Lower priority while the page has no data — SA-17.)

### SA-80 · System Health "Recent Activity" card is a hardcoded empty placeholder *(UNVERIFIED)*
`system-health` · `SASystemHealth.js:164-169` · fixed string "No recent system activity recorded."; no backing field. (The rest of the page — CPU/mem/heap/db probe/mail check — is genuinely real.) **Fix:** feed it from recent `SecurityAuditLog` rows, or remove the card.

### SA-81 · System Health uptime counter drifts from real backend uptime between polls *(UNVERIFIED)*
`system-health` · `SASystemHealth.js:34-54` · seeds from real `process.uptime()` then runs a cosmetic +1/s client timer, re-synced only every 30s; a backend restart shows wrong until next poll. **Fix:** derive displayed uptime from `lastChecked` + last server value.

### SA-82 · Security counter maps 7-day failed-logins into a field named `flagged_ips` (vestigial mislabel) *(UNVERIFIED)*
`security-logs` · `SASecurityLogs.js:53` · `flagged_ips: data.failed_logins_7d`; the card was deleted so it's unused, but a future edit could surface a "flagged IPs" number that's really failed logins. **Fix:** drop the key or rename to `failed_logins_7d`.

### SA-83 · System Health "Network Ingress" reads a non-existent field — always 0 *(recon-only, partial)*
`system-health` · `getSystemHealth:414-423` reads `details.bytesReceived` from `os.networkInterfaces()`, which Node doesn't provide. **Fix:** use a real network metric source or drop the tile.

### SA-84 · Security "Active Sessions" counter is just an active-user count, not real sessions *(recon-only, partial)*
`security-counters` · `getSecurityCounters:178` · `active_sessions = User.count({is_active:true})`; no session store exists. **Fix:** relabel "Active Users," or back it with a real session store.

### SA-85 · getTitle breadcrumb labels diverge from the renamed lean-menu labels (cosmetic) *(recon-only)*
`shell` · the lean menu renamed many rows ("Onboarding", "All Schools", "Academic Years", "Capacity Tiers", "Integrity Dashboard", "Platform Health", "Announcements", "Platform Users"…) but `getTitle`/the default formatter still produce the old/singular forms, so the page header doesn't match the sidebar label. Nothing breaks. **Fix:** align the `getTitle` map with the lean-menu labels.

---

## Cross-cutting: features without working UI / UI without working backend

**Endpoints implemented but with no (or broken) UI driving them:**
- `PUT/DELETE/PATCH /api/system-terms/:id/` — routed, no UI (SA-32)
- `GET /api/sa/export/` — real, but the Reports-Hub Schools button mis-paths it (SA-11) and the Settings exporter ignores its `datasets`/`pdf` params (SA-16)
- `POST /api/impersonate/` — works, but the Schools-list "Enter as admin" entry point doesn't exist (SA-65) and even the modal path doesn't re-render (SA-04)
- Dead exports never routed: `getPrincipals/createPrincipal/…`, `getBursars/createBursar/…` (live routes use the richer `getSuperPrincipals/getSuperBursars`) — cleanup only.

**UI present but the backend is a stub / wrong table / empty source:**
- Grade Integrity, Grade Report, grade Notifications → `getGradeAlerts` reads an unwritten table (SA-01, SA-07, SA-13)
- Analytics/Benchmarks headcounts → `getSchoolStats` all-zeros (SA-02, SA-03, SA-28, SA-59)
- Forensics → no `ForensicEvent` producer (SA-17); Change Alerts → no `SystemOpsAlert` producer (SA-18)
- Announcements "Send" → no delivery (SA-19); Lockdown/Backup/Custom-roles/2FA → record-only stubs (SA-75, SA-76, SA-27, SA-46)
- User risk/sessions → hardcoded placeholders (SA-57)

**Dead navigation / unreachable code:** `SAVersionCompare` (SA-61); `__enter_school` via search → StubPage (SA-47).

---

## What's solid (don't touch)

- **The lean operator menu is cleanly wired** — all 31 SA page rows render a real component, none dead-end on a StubPage, and `__enter_school` correctly bypasses the permission gate by design (no silently-blocked nav).
- **Master-data CRUD is genuinely functional end-to-end** — geography, institution/school/syllabus/class-subtype types, capacity categories/tiers, academic years and terms all have real create/update/delete/toggle handlers (the gaps are validation + the prod migration, not missing logic).
- **Tenant-PII isolation is strong** — the bulk `students/teachers/parents/bursars/principals` GETs refuse to dump cross-tenant PII for a superadmin unless `?school_id=` is supplied, and mutations use `outsideScope`/`denyCrossTenant` guards.
- **System Health real metrics** (CPU/mem/heap, db probe, mail-config check), the **grade-stats aggregates**, **impersonation token issuance**, **branding file upload**, and the **password-reset email** are all real.
- Several screens already carry **honest "not enforced / preview" banners** (Lockdown, Backup, Governance matrix, 2FA, forensic chain) — good instinct; the fix is mostly to extend that honesty to the screens that still overpromise (SA-15, SA-19, SA-49, SA-57).

---

## Suggested fix order

1. **SA-05** (prod migration) and **SA-06** (settings auth gate) — production-breaking / security, smallest diffs.
2. **SA-01 → SA-07 → SA-13** (repoint grade alerts to `modification_request` + fix the DTO) — restores the USP.
3. **SA-02 / SA-03 / SA-28** (real `getSchoolStats` + grade bands) — restores Analytics/Benchmarks.
4. **SA-04** (impersonation re-render) and **SA-11 / SA-58** (export/dashboard path typos) — high impact, tiny diffs.
5. **SA-08 / SA-09 / SA-10** (Invite User correctness + escalation).
6. The "record-only claims real" cluster (SA-19, SA-49, SA-15, SA-16, SA-75, SA-76) — wire or disclose.
7. Validation/data-integrity (SA-21, SA-23, SA-24, SA-33, SA-34) and the long tail of UI-quality/responsiveness items.

---

*Verification note: SA-01 through SA-50 marked without "(UNVERIFIED)" passed an independent adversarial skeptic re-check (severities reflect the skeptic's adjustment). Items marked "(UNVERIFIED)" come from the audit agents but the verifying agent hit a session limit before re-checking them; several are corroborated by the backend recon map as noted. SA-81–SA-85 are recon-only. Two original findings were refuted in verification and dropped.*
