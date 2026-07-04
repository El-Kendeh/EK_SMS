# Principal Dashboard — Wiring, Routing, RBAC & Security Audit

**Dimension:** How the Principal console is wired, routed, and gated (frontend routing, sidebar/nav, provider mounting, `config/permissions.js`, backend route gates + the 4 middleware, tenant isolation, impersonation/audit).
**Method:** Read the actual source. Every finding cites a concrete file + line/handler.
**Date:** 2026-07-02

---

## Executive summary

The **routing and nav wiring is sound**: all 7 built principal pages are reachable, none are orphaned, every nav key is permitted in `permissions.js`, all pages are in `HANDLED_PAGES` (no stub fallback), the `PrincipalProvider` correctly wraps its only consumer, and every page imports its own CSS (no unstyled-lazy-page regression). The backend middleware chain is applied uniformly (`auth → schoolScope → requireActiveAccount → requireRole`), tenant scoping holds (no cross-tenant leak, no IDOR via `?school_id`), there are **no `TODO_JWT`/backdoor patterns**, and impersonation is TTL-boxed + audited.

The problems are all in **account provisioning / RBAC separation**, and they cluster around one root cause: principal accounts are stored as `SchoolAdmin` rows while the auth layer gates on `User.is_active`, and the two are never kept in sync.

- **1 critical:** creating a leadership member via the Leadership Team page mints a `User` with `is_active=false` (model default, never set true) → the new principal is **permanently locked out at login**. Fake-success provisioning.
- **1 high:** the "deactivate" toggle in Leadership Team only flips `SchoolAdmin.is_active`; login and `requireActiveAccount` both check `User.is_active`, so **deactivation does not revoke access** — a broken security control.
- **2 medium:** the backend read gate (`PRINCIPAL_ACCESS` includes `school_admin`) is broader than the frontend role map for grade governance / leadership reads; and a principal can read + edit the **school_admin's own** leadership record.
- **4 low / enhancement:** dead shared-context design, client-trusted nav role, impersonation can't perform principal writes, and the underlying data-model muddle.

---

## What is correctly wired (verified positives)

| Area | Evidence | Status |
|---|---|---|
| All 7 principal pages reachable from nav (none orphaned) | `PRINCIPAL_NAV_ITEMS` (SuperadminDashboard.js L837-846) lists overview, grade-approvals, report-card-approval, report-cards-published, syllabus-progress, attendance-report, principal-users, notifications | works |
| Every nav key permitted for `principal` | `permissions.js` L23,72-73,87,128-129,150 — all 8 keys include `PRINCIPAL`; nav filter `canAccess(item.key, role)` (L1004) passes all | works |
| No stub fallback for principal pages | all keys present in `HANDLED_PAGES` (L382-386); `!HANDLED_PAGES.has(activePage)` StubPage never fires | works |
| `PrincipalProvider` wraps its consumer | `usePrincipalDashboard()` runs inside `PrincipalHomeInner`, which is wrapped by `<PrincipalProvider>` in the `PrincipalHome` default export (PrincipalHome.js L29-33, L192-198) → `usePrincipal` never throws | works |
| No unstyled-lazy-page bug | all 6 non-home pages import `SchoolAdmin.css` + their own prefixed CSS (GradeApprovals/ReportCardApproval/PublishedReportCards/AttendanceReport/SyllabusProgress/PrincipalUsers all import their `.css`) | works |
| Full middleware chain on every route | `routes/principal.js` L26-33: `authenticateToken → schoolScope → requireActiveAccount → requireRole(PRINCIPAL_ACCESS)`; writes add `requireRole(PRINCIPAL_WRITE)` (L37,39,40,50,51) | works |
| Tenant scoping / no IDOR | `schoolScope` pins non-superadmin to `req.user.school_id` and **ignores** `?school_id` for them (schoolScope.js L3-9); `getSchoolFromUser` returns `req.schoolId ‖ req.user.school_id` (principalController.js L21). Bare superadmin with no school picked → `null` → 401, no cross-tenant data | works |
| No backdoor / `TODO_JWT` | grep for `TODO_JWT\|backdoor\|dummyToken\|BYPASS\|skipAuth` across `backend_node/src` = **0 matches** | works |
| Impersonation TTL + audit | `impersonate()` mints a **30m** token (`IMPERSONATION_TTL='30m'`), `imp_sid`, `imp_actor`, audited start; `auth.js` L34-43 logs every mutating impersonated request (superadminController.js L264-300) | works |
| Frontend defense-in-depth guard | `PAGE_PERMISSIONS[activePage] && !canAccess(...)` → `<NotAuthorized>` (SuperadminDashboard.js L1165) | works |

---

## Findings

### WR-01 — CRITICAL — New leadership accounts are created inactive and cannot log in
- **Severity:** critical
- **Category:** Provisioning / auth wiring (fake-success)
- **Location:** `backend_node/src/controllers/principalController.js` `createPrincipalUser` L371-379; `backend_node/src/models/User.js` L22; `backend_node/src/controllers/authController.js` L96
- **Current state:** broken-or-stub (endpoint + UI exist; the account it produces is unusable)
- **Evidence:**
  - `User.is_active` has `defaultValue: false` (User.js L22).
  - `createPrincipalUser` inserts the `User` **without** an `is_active` field: `User.create({ username, email, phone, password, first_name, last_name, role_id: principalRoleId })` (L371-379). The row is written with `is_active = 0`.
  - It sets `SchoolAdmin.is_active: true` (L386), but that is a **different column** on a different table.
  - Login blocks any non-superuser whose `User.is_active` is false: `if (!user.is_active && !isPortalSuper) return 403 "Your account is pending approval by the Superadmin."` (authController.js L96-109).
  - There is **no per-user approval flow** — the Super Admin approves *schools*, not individual leadership logins — so nothing ever flips this `User.is_active` to true. The account is permanently locked out.
- **Impact:** The Leadership Team "Add member" flow reports success (`successResponse({ id }, 'Principal created')`) but the created principal can never sign in. Silent, non-obvious failure.
- **Recommendation:** In `createPrincipalUser`, set `is_active: true` on the `User.create(...)` (the parent school is already approved, so leadership logins should be immediately usable). Add a regression check that a freshly created principal can authenticate.

---

### WR-02 — HIGH — "Deactivate" in Leadership Team does not revoke access
- **Severity:** high
- **Category:** Broken security control / RBAC
- **Location:** `backend_node/src/controllers/principalController.js` `updatePrincipalUser` L396-419; `backend_node/src/middleware/requireActiveAccount.js` L35; `backend_node/src/controllers/authController.js` L96
- **Current state:** broken-or-stub
- **Evidence:**
  - Deactivating a member toggles only the `SchoolAdmin` row: empty-payload path `admin.update({ is_active: !admin.is_active })` (L411) and explicit path `adminUpdates.is_active = !!is_active` (L418). `User.is_active` is never touched (the only `User` updates are name/email/phone, L421-432).
  - Access revocation everywhere else keys off `User.is_active`: the login gate (authController.js L96) and the per-request `requireActiveAccount` (`User.findByPk(..., ['id','is_active'])` → 403 if `is_active === false`, requireActiveAccount.js L35-42).
  - Net: after "deactivating" a principal, `User.is_active` is still `true`, so they keep logging in and keep passing `requireActiveAccount` on every `/api/principal/*` call.
- **Impact:** An admin who removes a leader's access via the UI has not actually revoked anything. Directly counter to the intent of `requireActiveAccount` (immediate withdrawal of access).
- **Recommendation:** Make `updatePrincipalUser`'s status change authoritative — update `User.is_active` (and, if desired, mirror it onto `SchoolAdmin.is_active`) inside a transaction. Same fix surface as WR-01 (unify on `User.is_active`).

---

### WR-03 — MEDIUM — Backend read gate is broader than the frontend role map (separation-of-duties gap)
- **Severity:** medium
- **Category:** RBAC consistency / over-exposure
- **Location:** `backend_node/src/routes/principal.js` L21 (`PRINCIPAL_ACCESS = ['superadmin','school_admin','principal']`), L36/38/49; vs `src/config/permissions.js` L72-73, L128
- **Current state:** partial
- **Evidence:**
  - Frontend restricts `grade-approvals`, `report-card-approval`, and `principal-users` to `[PRINCIPAL, SUPERADMIN]` (permissions.js L72-73, L128) — a `school_admin` never sees these in the nav.
  - The backend gates **all** reads with `PRINCIPAL_ACCESS`, which includes `school_admin`. So a `school_admin` token can directly `GET /api/principal/grade-approvals/`, `/report-cards/`, `/principal-users/`, `/overview/`, `/dashboard/`, `/class-performance/`, `/teacher-insights/`, `/finance-snapshot/`, `/activity-feed/`.
  - The route comment (L17-20) justifies `school_admin` only for the **reused** pages (attendance/syllabus/report cards). Grade governance and the leadership-user list exceed that stated intent.
- **Impact:** Not a cross-tenant leak (all queries stay school-scoped) and read-only, so low blast radius. But it breaks the product's separation of duties (grade-change governance is the principal's *separated* responsibility) and the FE/BE role maps disagree.
- **Recommendation:** Split the gate. Keep `school_admin` on the genuinely shared reads (`attendance-report`, `syllabus-progress`, `report-cards` list, `overview`/`dashboard` if intended) and drop it from `grade-approvals` and `principal-users` reads so the backend matches `permissions.js`.

---

### WR-04 — MEDIUM — A principal can read and edit the school_admin's own leadership record
- **Severity:** medium
- **Category:** Horizontal privilege (within tenant)
- **Location:** `backend_node/src/controllers/principalController.js` `getPrincipalUsers` L334-338, `updatePrincipalUser` L402-433, `createPrincipalUser` L371-387; gate `PRINCIPAL_WRITE=['superadmin','principal']` (routes/principal.js L24)
- **Current state:** partial
- **Evidence:**
  - `getPrincipalUsers` returns **all** `SchoolAdmin` rows for the school with **no role filter** (`where: { school_id: school.id }`, L335). Because a real `school_admin` is also a `SchoolAdmin` row, the school_admin's account is listed as a "principal user".
  - `updatePrincipalUser` finds the target by `{ id, school_id }` only (L402) — no check that the target is actually a principal vs the school_admin. A principal (allowed by `PRINCIPAL_WRITE`) can therefore change the **school_admin's** email/name and toggle its status (L415-432).
  - A principal can also mint new principal logins for the school without school_admin involvement (`createPrincipalUser`, `PRINCIPAL_WRITE`).
- **Impact:** A principal can alter the tenant administrator's profile record. Combined with WR-02 the status toggle is inert, but the email/name edits do apply, and unbounded principal self-minting is a governance concern.
- **Recommendation:** Filter `getPrincipalUsers` to actual leadership records (by role) and guard `updatePrincipalUser`/`createPrincipalUser` so a principal cannot target/alter the school_admin account. Consider whether principal self-minting of peers should require school_admin or superadmin.

---

### WR-05 — LOW — Shared `PrincipalContext` is effectively dead; it wraps only the overview page
- **Severity:** low
- **Category:** State wiring / performance
- **Location:** `src/components/principal/PrincipalHome.js` L192-198; `src/context/PrincipalContext.js`; `src/hooks/usePrincipalDashboard.js`; `src/components/superadmin/SuperadminDashboard.js` (shell does **not** mount `PrincipalProvider`)
- **Current state:** partial (works, but the abstraction buys nothing)
- **Evidence:**
  - `PrincipalProvider` is mounted **inside** `PrincipalHome`, so its `dashboard/classPerf/teacherData/...` cache lives and dies with the Command Center page. The 6 sibling pages don't consume the context at all (grep: `usePrincipal` appears only in PrincipalHome + the hook).
  - `usePrincipalDashboard` gates on `loaded` to skip refetch, but because the provider remounts every time the user returns to overview, `loaded` resets and all **7 endpoints refetch** each visit (`Promise.allSettled([...7])`, hook L27-35).
- **Impact:** No correctness bug — just wasted requests and a misleading "shared context" that shares nothing.
- **Recommendation:** Either lift `<PrincipalProvider>` to the shell so the cache is real and cross-page, or delete the context and keep `usePrincipalDashboard` local. As-is it is dead weight.

---

### WR-06 — LOW — Sidebar/nav role is trusted from `localStorage`, not the JWT
- **Severity:** low
- **Category:** Defense-in-depth
- **Location:** `src/components/superadmin/SuperadminDashboard.js` L523-526 (`JSON.parse(localStorage.getItem('user'))`), navItems selection L999-1004
- **Current state:** partial
- **Evidence:** The shell chooses `PRINCIPAL_NAV_ITEMS` vs `SUPERADMIN_NAV_ITEMS` from `user.role` read out of `localStorage`. A principal could locally set `role:'superadmin'` and render the operator sidebar/pages.
- **Impact:** No data exposure — every backend route independently gates on the **JWT** role (superadmin routes 403 a principal token), so spoofing only renders empty/forbidden pages. Standard SPA posture; flagged for completeness.
- **Recommendation:** Acceptable as long as the backend remains the source of truth (it is). Optionally decode the role from the token rather than trusting `localStorage`.

---

### WR-07 — LOW — Principal WRITE actions cannot be performed through impersonation
- **Severity:** low
- **Category:** Oversight coverage gap
- **Location:** `backend_node/src/controllers/superadminController.js` `impersonate` L276 (`role:'school_admin'`); `routes/principal.js` L24 (`PRINCIPAL_WRITE=['superadmin','principal']`)
- **Current state:** partial
- **Evidence:** "Enter a School" mints a `school_admin` token. `PRINCIPAL_WRITE` excludes `school_admin`, so while impersonating, an operator **cannot** approve grades, publish report cards, or create/update principal users via `/api/principal/*`. To do those, the operator must fall back to the bare superadmin token + `?school_id=` — where the write is audited as the superadmin action, not tagged as an impersonation event (`auth.js` L34 only fires for `verified.imp` tokens).
- **Impact:** No vulnerability; a coverage/traceability gap. Superadmin principal-writes on another school are attributed to `superadmin` rather than framed as "acting for school X".
- **Recommendation:** If operators need to exercise principal governance for a tenant, either allow an impersonation-as-principal variant, or ensure bare-token superadmin writes on `/api/principal` still record the target `school_id` in the audit trail.

---

### WR-08 — LOW / ENHANCEMENT — Data-model muddle: principals live on `SchoolAdmin` rows while `CorePrincipal`/`Principal` models go unused
- **Severity:** low (root cause of WR-01, WR-02, WR-04)
- **Category:** Data model / consistency
- **Location:** `backend_node/src/controllers/principalController.js` `createPrincipalUser` L381-387 (writes `SchoolAdmin`); `backend_node/src/controllers/authController.js` L135-146 (login principal branch derives `schoolId` from `schoolAdminLink`, with an unused `CorePrincipal` fallback); `models/CorePrincipal.js`, `models/Principal.js`
- **Current state:** partial
- **Evidence:** A principal created via Leadership Team is a `User` (role_id=principal) + a `SchoolAdmin` row. Login's `principal` branch resolves the school via the `SchoolAdmin` link and only falls back to `CorePrincipal` when that's absent (L139-146) — so for Leadership-Team-created principals, `CorePrincipal` is never used. Two "is_active" flags (User vs SchoolAdmin) for one identity is exactly what breaks WR-01/WR-02, and the shared `SchoolAdmin` table with no role filter is what enables WR-04.
- **Impact:** Ambiguous identity model; every provisioning/deactivation bug in this console traces back here.
- **Recommendation:** Pick one model for leadership identity and enforce it. Simplest: keep the `SchoolAdmin`-row approach but treat `User.is_active` as the single source of truth for access, and filter leadership listings by role. Longer term, move principals onto `CorePrincipal` consistently.

---

## Answers to the specific audit questions

- **Orphaned pages (built, no menu entry)?** None. All 7 principal pages have a `PRINCIPAL_NAV_ITEMS` entry and a render branch; all keys are in `HANDLED_PAGES`.
- **Missing nav entries?** None for the principal role.
- **Is `PrincipalProvider` actually wrapping the pages (else `usePrincipal` throws)?** Yes for the only consumer (PrincipalHome). The other 6 pages don't use the context, so no throw. But the provider is scoped to one page (WR-05).
- **Sidebar shows principal-appropriate items only?** Yes — `PRINCIPAL_NAV_ITEMS` is a purpose-built list, filtered again by `canAccess`.
- **Route role-gates correct? Is `school_admin` in `PRINCIPAL_ACCESS` intended everywhere?** Mostly, but **over-broad for grade governance + leadership reads** (WR-03).
- **`requireActiveAccount` + `schoolScope` applied?** Yes, globally on the router (routes/principal.js L29-31). Note the enforcement is undermined by the User-vs-SchoolAdmin `is_active` split (WR-01/WR-02).
- **Impersonation / audit / TTL gaps?** Impersonation is 30m TTL + audited + `imp_sid` tracked; mutating impersonated requests are logged. The only gap is coverage, not security (WR-07). The previously-open impersonation audit/TTL concern is now handled for the principal reach.
- **Any way a non-principal reaches principal data?** A `school_admin` can read principal-console endpoints for **their own school** via the over-broad gate (WR-03) — same-tenant, read-only, no cross-tenant leak. No other role reaches `/api/principal/*`.
- **Any way a principal reaches another school's data?** No. `schoolScope` ignores `?school_id` for non-superadmin; `getSchoolFromUser` pins to the token's school; the client's `?school_id` auto-append only takes effect for superadmin tokens server-side.
- **Any `TODO_JWT`/backdoor patterns?** None under the `/api/principal` reach (grep = 0).

---

## Severity roll-up

| Severity | Count | IDs |
|---|---|---|
| Critical | 1 | WR-01 |
| High | 1 | WR-02 |
| Medium | 2 | WR-03, WR-04 |
| Low | 4 | WR-05, WR-06, WR-07, WR-08 |
| Enhancement | 0 | — |
