# Super Admin — complex-backend backlog (deferred, NOT half-built)

These are the "record-only action that claims to act" findings whose **honest UI/labelling has been fixed**, but whose **real behaviour needs substantial backend work** (new infra, middleware, dispatch pipelines). They were intentionally *not* half-implemented — a half-built version is worse than an honestly-labelled stub. Each entry says what's needed, where, and the rough size.

Status legend: ✅ honesty/labelling fixed in code · ⛔ real behaviour still missing (this backlog).

Priority order is roughly top-to-bottom.

---

## 1. SA-19 — Broadcast announcements aren't delivered ⛔ (✅ UI no longer says "Sent")
**Now:** `postBroadcastAlerts` (`superadminDataController.js`) does `BroadcastAlert.create({ status:'sent' })` + an audit row — no email/SMS/push, audience stored as free text. UI success screen now says **"Announcement Recorded / Saved to the broadcast log"** instead of "Alert Sent!".
**Needed:**
1. Resolve the audience string (All Schools / Region: X / Admin Staff …) to a concrete recipient set (query School/User/SchoolAdmin).
2. Dispatch via the existing Resend path (`utils/email.js`) and/or create per-user in-app notifications.
3. Only set `status:'sent'` **after** dispatch succeeds; until step 1-2 exist, store `status:'recorded'` and surface that in the list badge (update the badge colour map + the `alert.status === 'Sent'` check in `SAAlertBroadcast.js:120`).
**Size:** M–L (recipient resolution + batched send + delivery state).

## 2. SA-15 / SA-76 — Security toggles & Emergency Lockdown are recorded but never enforced ⛔ (✅ "enforcement pending" disclosed)
**Now:** `Global 2FA / Auto Grade Locking / Session Timeout` (SA-15) and the Lockdown protocols (SA-76) persist flags in the `admin-settings` JSON; nothing reads them. SASettings now shows a **"Recorded — enforcement pending"** banner; lockdown already returns `sessions_terminated:0`.
**Needed:**
- Session timeout + global 2FA: enforce in the auth middleware / token-issuance path (`middleware/auth.js`, login controller). 2FA also needs SA-46 (real TOTP).
- Auto grade-locking: a job/trigger that locks grades older than 24h (ties into the new `is_locked` grade columns from the teacher-dashboard work).
- Lockdown: at minimum a login-suspend gate keyed off `lockdown_state` in the auth middleware; collapse the 3 identical "protocol" radios until they differ.
**Size:** L (touches auth/session/grade subsystems).

## 3. SA-27 — RBAC permission matrix + custom-role permissions aren't enforced ⛔ (already banner-disclosed)
**Now:** `handleSave` persists `rbac_role_permissions`; `postSaCustomRoles` stores only `{id,name,description}` (drops permissions). Auth never reads either. Page already says "Preview — not enforced" (but the custom-role permission drop is undisclosed).
**Needed:** wire `rbac_role_permissions` into `requireRole`/route guards; extend `postSaCustomRoles` to persist a `permissions` object and have the editor save it. Disclose the custom-role permission gap in `CreateRoleModal` until then.
**Size:** L (authorization layer).

## 4. SA-17 / SA-18 — Forensics & Change-Alerts pages can never show data ⛔
**Now:** `getForensicEvents` / `getSystemAlerts` read tables that **no code ever writes** (`ForensicEvent.create` / `SystemOpsAlert.create` have zero call sites). Pages render permanent empty states.
**Needed:** emit rows at the real trigger sites — e.g. ForensicEvent on hash-mismatch / repeated login failure; SystemOpsAlert on grade-lock attempt / enrolment change / large fee payment / permission change. Cheaper interim: derive Forensics from high/critical `SecurityAuditLog` rows. Until a producer exists, the empty-state copy overpromises.
**Size:** M each (instrumentation at many call sites).

## 5. SA-12 — Grade-audit detail shows fabricated evidence/ledger; Validate/Flag don't persist ⛔
**Now:** `SAGradeAuditDetail` hardcodes two evidence files + a "not committed to blockchain" ledger for every record; Validate/Flag flip local state only. (The list itself is now fed real data via the SA-01 grade-alert repoint.)
**Needed:** a real evidence-attachment + grade-change-ledger model, fetch the record by id, and persist Validate/Flag to the grade audit log via POST. Until then, disable the Validate/Flag buttons (don't ship a clickable no-op).
**Size:** M–L (new model + endpoints).

## 6. SA-46 — "Manage 2FA" enrolment is an illustrative wizard ⛔
**Now:** QR is a static SVG, OTP boxes unvalidated, recovery codes empty; `onComplete` just toasts "preview". (Honestly labelled.)
**Needed:** real TOTP enrol/verify (e.g. `otplib`) + a `two_factor_secret` on the user + recovery codes, or replace the multi-step wizard with a single "coming soon" state. Prereq for SA-15's global-2FA enforcement.
**Size:** M.

## 7. SA-75 — Manual backup emits a fake filename/size, no real dump ⛔ (already disclosed)
**Now:** `postSaBackupManual` fabricates `eksms-backup-<ts>.sql` + a hardcoded `2048000` bytes.
**Needed:** run `mysqldump` (or the hosting provider's snapshot API), store the real artifact + true size; or store **only** a timestamp + an explicit "no artifact" marker and stop emitting a fake filename/size.
**Size:** M (ops/infra; needs a writable backup target).

## 8. SA-78 — Branding logo/favicon uploads are stored but never applied ⛔
**Now:** `postSaBranding` saves the file + URL into settings (real); nothing consumes it.
**Needed:** consume `settings.branding_logo.url` in the dashboard header/login and inject `branding_favicon` into the document `<link rel="icon">` (likely via a small provider or in `index.html`/`SchoolBrandingContext`). Or label the upload "stored for future use".
**Size:** S–M (frontend consumption + favicon swap).

## 9. SA-16 — Bulk export ignores `datasets` and PDF ⛔
**Now:** `getSaExport` always exports the Schools table; `?datasets=grades|audit|users` and `format=pdf` are ignored (PDF falls through to CSV).
**Needed:** implement per-dataset queries (grades/audit/users) and a real PDF path; or disable the unimplemented dataset/format options in the Settings exporter UI until backed.
**Size:** M.

## 10. SA-49 / SA-38 — Acknowledge & notification read/dismiss don't persist ⛔ (✅ false "logged for audit" claim removed)
**Now:** Broadcast "Acknowledge" (SA-49) and Notifications mark-read/dismiss (SA-38) mutate local React state only; everything returns on reload. SA-49's misleading "logged for audit and compliance" copy has been removed.
**Needed:** a per-user read-receipts table (or per-user localStorage keyed by id as an interim, mirroring `SAProfile`'s per-user key) + PATCH endpoints.
**Size:** S–M.

---

### Already fixed in code (for reference — not in this backlog)
The light-backend / honesty parts of the above are done: broadcast success copy (SA-19), security-toggle disclosure (SA-15), acknowledge copy (SA-49). The structural data-layer criticals (grade-integrity repoint SA-01/07, real school-stats SA-02/03, grade pass/distribution SA-28, academic-year migration SA-05, approval timestamp SA-30), the security route-gating (SA-06/35/51), the Invite User cluster (SA-08/09/10), the data-integrity guards (SA-21/23/24/33), and the UI/dead-control cluster (SA-29/47/56/60/61/63/64) are all implemented and verified — see `SUPER-ADMIN-AUDIT.md`.
