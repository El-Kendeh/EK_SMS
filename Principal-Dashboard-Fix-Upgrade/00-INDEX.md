# Principal Dashboard — Fix & Upgrade — Master Report

**Effort:** Principal-Dashboard-Fix-Upgrade
**Date:** 2026-07-03
**Scope:** The Principal (school-leadership) console of EK-SMS — 7 frontend pages routed through the single `SuperadminDashboard` shell, the `/api/principal` backend (16 handlers), and how both are wired, gated, and scoped.
**Method:** Six independent dimension audits read the actual source; every critical/high finding then went through an adversarial verification pass. This index consolidates them.

Section files (full detail):
- [01-UI-UX-AUDIT.md](01-UI-UX-AUDIT.md)
- [02-BACKEND-AUDIT.md](02-BACKEND-AUDIT.md)
- [03-FUNCTIONALITY-CONTRACT-AUDIT.md](03-FUNCTIONALITY-CONTRACT-AUDIT.md)
- [04-GAP-ANALYSIS-VS-PLAN.md](04-GAP-ANALYSIS-VS-PLAN.md)
- [05-WIRING-RBAC-AUDIT.md](05-WIRING-RBAC-AUDIT.md)
- [06-PARITY-VS-PEERS.md](06-PARITY-VS-PEERS.md)

---

## 1. Executive summary

The Principal Dashboard is an **added leadership / oversight console** — it exists beyond the written system plan, which defines no "principal" role. What ships today is a genuinely well-built **Command Center** (KPI row, SVG health-score hero, class/teacher analytics, alerts, finance and syllabus summaries, activity feed) plus six sub-pages: grade approvals, report-card approval/publish, published cards, attendance report, syllabus progress, and a leadership-team CRUD. Loading / empty / error states are handled consistently everywhere, routing and nav wiring are sound (no orphan pages, no orphan routes), tenant scoping holds (no cross-tenant leak, no IDOR, no `TODO_JWT` backdoor), and impersonation is TTL-boxed and audited.

**Overall maturity: partial / not-shippable-as-is.** The console's *core anti-corruption loop works* — review pending grade changes, approve/reject inside a transaction that appends a SHA-256 hash-chained `GradeEvent`, publish report cards. But the polish masks three structural problems:

1. **Fake data presented as real.** The Financial Snapshot, the "Financial Status" KPI, the finance slice of the School Health Score, and two of three Teacher-Performance tiles are all hardcoded constants (all `$0` / `0%` / always-`0` / always-`Stable`). A leadership oversight tool is showing fabricated figures — internally self-contradictory (a full-green 95% "Stable" finance bar sitting next to a `$0` finance panel on the same screen).
2. **The Leadership-Team / RBAC feature is broken end to end.** Principals are stored as `SchoolAdmin` rows while auth gates on `User.is_active`, and the two are never synced. Result: **newly created principals are locked out of login** (ship-blocker), **"Suspend" revokes nothing**, and **role / access_level / phone from the form are silently discarded**.
3. **The highest-leverage leadership capabilities have backend but no UI.** The principal is already authorized for the finance routes (stats + expense approval) and writes the immutable grade-audit chain on every action — yet there is no finance page, no expense-approval queue, and no forensic audit viewer. These are "add a screen," not "build a system."

**The single biggest risks:** (a) the create-principal lockout bug (`WR-01`) makes the leadership-provisioning feature fake-success; (b) the fabricated finance/health data (`UI-01`/`UI-02`/`FC-05`/`GAP-01`) undermines the trustworthiness of an oversight console; (c) the broken deactivation control (`WR-02`) means an access-revocation action revokes nothing.

---

## 2. Scoreboard

### Findings by severity (raw, all six dimensions)

| Severity | Count |
|---|---|
| Critical | 1 |
| High | 15 |
| Medium | 19 |
| Low | 18 |
| Enhancement | 18 |
| **Total** | **71** |

After adversarial verification: **0 findings refuted.** Five high findings were **downgraded** (not refuted) — `FC-06`→medium, `GAP-06`→medium, `PAR-01`→enhancement, `PAR-04`→enhancement, `PAR-05`→medium. Verified **critical/high that remain: 1 critical + 10 high** (deduplicated to **7 distinct issues** — several are the same defect seen from different dimensions).

> **Auditing note (transparency).** The Backend dimension's *structured* return failed validation, so its findings are **not separately tallied** in the 71 above — but its full section file [02-BACKEND-AUDIT.md](02-BACKEND-AUDIT.md) (findings `BE-01`…`BE-18`) was written and is fully incorporated here. Most `BE-*` defects are the same issues the other five auditors independently found (`BE-01`↔`WR-01`/`FC-02`, `BE-02`↔`WR-02`/`FC-03`, `BE-03`↔`FC-05`/`UI-01`, `BE-04`↔`UI-02`/perf, `BE-05`↔`GAP-02`, `BE-07`↔`FC-06`, `BE-09`↔`WR-04`, `BE-13`↔`FC-14`, `BE-17`/`BE-18`↔`GAP` enhancements), so they were verified via their twins. The **backend-only** findings not mirrored elsewhere are folded into the roadmap below: `BE-06` (report-card counts hardcoded `0`), `BE-08` (list endpoints silently truncate at 200/500, no pagination), `BE-10` (weak default password + no duplicate guard — **security**), `BE-12` (dead `Principal.js`/unused `CorePrincipal` model), `BE-14` (top/low class overlap for small schools), `BE-15` (superadmin-without-`school_id` returns misleading 401), `BE-16` (publish emits a notification even on zero-publish; unscoped term lookup).

### Per-dimension health

| Dimension | Section | Rating | One-line verdict |
|---|---|---|---|
| UI / UX | 01 | 🟡 Fair | Strong Command Center, but headline widgets render stub data as real; unstyled-page bug recurs on 3 pages. |
| Backend | 02 | 🟡 Fair | Handlers wired and consumed; finance + teacher insights are stubs; leadership CRUD writes to non-existent columns. |
| Functionality / contract | 03 | 🟠 Weak | No orphan calls, but leadership RBAC is non-functional (data-loss, fake-success) and finance is fabricated. |
| Gap vs plan | 04 | 🟡 Fair | Governance loop covered; analytics, communication, forensic-audit surfaces thin or missing. |
| Wiring / routing / RBAC | 05 | 🔴 Blocker | Routing/tenant/impersonation clean, but 1 critical (login lockout) + broken deactivation control. |
| Parity vs peers | 06 | 🟡 Fair | Missing whole capability classes peers ship (finance, expense approval, charts, export) — mostly cheap adds. |

---

## 3. Verified critical & high findings

Only findings **CONFIRMED** or **ADJUSTED (and still critical/high)** after adversarial verification. Deduplicated across dimensions; the "Also reported as" column lists the same defect seen by other auditors. **Refuted: 0.**

| # | Severity | Area | Issue | Primary ID (also reported as) | Location | Fix |
|---|---|---|---|---|---|---|
| 1 | **Critical** | Provisioning / auth | New leadership accounts are created with `User.is_active=false` and can never log in — "Add member" reports success but the account is permanently locked out. | `WR-01` (·`FC-02`) | `principalController.js:371-379 createPrincipalUser`; `User.js:22`; `authController.js:96` | Set `is_active:true` on `User.create(...)` for principal-minted accounts (school already approved); surface temp password; add a "new principal can authenticate" regression check. |
| 2 | High | Security control / RBAC | "Suspend/Activate" toggles only `SchoolAdmin.is_active`, but login + `requireActiveAccount` gate on `User.is_active` — suspension revokes nothing, and the model has no `is_active` column so the write is silently dropped. | `WR-02` (·`FC-01`) | `principalController.js:396-419 updatePrincipalUser`; `requireActiveAccount.js:35`; `SchoolAdmin.js:6-20` | Toggle `User.is_active` (the real gate) in a transaction; add a real `is_active` column if leadership status is wanted; return the persisted state. |
| 3 | High | Data-loss / RBAC | `role` / `access_level` (and `phone`) from the Add/Edit leadership form are silently discarded — `SchoolAdmin` has no such columns, so every member permanently shows "Principal / Full / Active" regardless of input. | `FC-03` (·`FC-04`, `FC-09`) | `principalController.js:381-419`; `SchoolAdmin.js:6-20`; `User.js` (no `phone`); `PrincipalUsers.js:99-117` | Add `role`/`access_level`/`is_active` columns + migration (or store on `CorePrincipal`); add `phone` to `users` or drop the field. Whole form is cosmetic until then. |
| 4 | High | Finance oversight | Financial Snapshot returns hardcoded `{revenue:0, outstanding:0, paymentsToday:0, transactions:[]}` and renders confident `$0`/`0%`/"This term" with a dangling empty Recent-Payments header — no honest empty state. | `FC-05` (·`UI-01`, `GAP-01`, `PAR-03`) | `principalController.js:616-631 getFinanceSnapshot`; `FinancePanel.jsx`; `StatsCards.jsx:51-59` | Wire to real `Payment`/`Fee` queries (or reuse `/api/finance/stats`, principal is authorized), scoped by `school_id` + active term; show an empty state until connected. |
| 5 | High | Fabricated metric | School Health Score bakes in a literal `+15` finance dimension and the "Financial Status" KPI is a hardcoded `'Stable'` — a permanent full-green 95% finance bar next to the `$0` finance panel. | `UI-02` (·`GAP-03`) | `principalController.js:515-516 getSchoolCommandDashboard`; `HealthScoreCard.jsx:16-31`; `StatsCards.jsx:51-59` | Compute finance from real collection data, or drop the finance dimension from both the health score and the KPI. |
| 6 | High | Teacher analytics | `getTeacherInsights` returns `overloaded:0` / `underperforming:0` as literals; the panel shows authoritative "> 28 periods/week" and "below threshold" tiles that are always 0. | `GAP-02` (·`UI-03`, `FC-08`, `PAR-09`) | `principalController.js:594-609 getTeacherInsights`; `TeacherPanel.jsx:12-37` | Compute overload from timetable/assignment counts and underperformance from class-avg-vs-threshold, or hide/relabel the two tiles. |
| 7 | High | Finance approvals | The principal is a designated expense approver (`CAN_APPROVE_EXPENSE` includes `principal`) and the Bursar `Expenses.js` is already principal-aware, but no nav/permission entry exists — the principal half of the two-approver flow is dead. | `PAR-02` | `finance.js:32,73`; `bursar/Expenses.js:21`; `permissions.js:121`; `SuperadminDashboard.js:837-846` | Whitelist `expenses` for `PRINCIPAL` in `permissions.js`, add to `PRINCIPAL_NAV_ITEMS`, mount `bursar/Expenses.js`. No backend change. |

Adversarial adjustments recorded so the trail is honest: `FC-06` (approval-comment discarded) → **medium** (the auditable decision + actor + timestamp + GradeEvent still commit; only an optional free-text note is lost). `GAP-06` (grade-audit chain not surfaced to principal) → **medium** (nothing broken; the chain is read elsewhere). `PAR-01`/`PAR-04` (finance page / announcements) → **enhancement** (purely additive). `PAR-05` (charts) → **medium** (existing bars render real data).

---

## 4. What's not implemented — features without UI / missing modals

Consolidated across all six sections. "Backend exists" means a principal-authorized endpoint or model is already present and only the UI is missing.

**Backend exists, no UI (cheap wins):**
- **Finance / budget oversight page** — `/api/finance/*` already lists `principal` in `FINANCE_ACCESS` (read). `bursar/Reports.js` would work verbatim. (`PAR-01`, `GAP-10`)
- **Expense-approval queue** — principal is an authorized approver; `bursar/Expenses.js` is principal-ready. (`PAR-02`, `GAP-10`)
- **Grade-audit / forensic trail viewer** — every approve/reject/publish appends a tenant-scoped SHA-256-chained `GradeEvent`, but the principal (the transparency-enforcing role) has no screen to view or verify it. Needs `GET /api/principal/grade-audit/`. (`GAP-06`, `PAR-06`)
- **CSV / report export** — no export anywhere in the console; grade/attendance/report-card endpoints exist and are principal-authorized. Drop in the Bursar `downloadCsv` helper. (`PAR-08`, `E-03`)
- **Student / teacher profile drill-down** — class-performance and grade-approval rows aren't clickable; reuse teacher `StudentProfileDrawer.js`. (`PAR-07`, `GAP-11`)
- **Exam / timetable oversight** — read-only reuse of school-admin `ExamsPage`/`TimetablePage`. (`PAR-10`, `GAP-13`)

**Missing entirely (net-new, no backend):**
- **Announcement / broadcast composer** for the principal (superadmin-only today). (`GAP-07`, `PAR-04`)
- **Predictive at-risk student panel** with drill-down + intervention (only a headline count exists). (`GAP-08`, `GAP-04`)
- **Whistleblower / anonymous-report inbox** (submit exists, no list/read endpoint — reports go into a void). (`GAP-14`)
- **Secure internal messaging** (principal → teacher/parent). (`GAP-15`)
- **Charts / time-series** — the only chart is the health-score ring; no trend lines, sparklines, distribution, pass-rate, or heatmap. (`E-01`, `PAR-05`, `GAP-18`)
- **Transparent, exportable health scorecard** replacing the opaque single number. (`GAP-12`)

**Missing modals / UX safety:**
- No confirmation on **"Publish All Approved"** (parent/student-facing, hard to reverse) or **Suspend/Activate**. (`UI-06`)
- Modals lack `role="dialog"` / `aria-modal` / focus trap / autofocus / Escape-to-close (all four dialogs). (`UI-09`)
- No table sorting on grade-approvals; inconsistent filter/search/sort across pages. (`UI-10`)
- AttendanceReport has no class→student drill-down or custom date range. (`E-04`)

---

## 5. Prioritized roadmap

Effort key: **S** ≈ <½ day, **M** ≈ 1–2 days, **L** ≈ 3+ days.

### Batch 1 — Ship-blockers & correctness bugs (do first)

| # | Item | IDs | Effort | UI touchpoints | Backend touchpoints |
|---|---|---|---|---|---|
| 1.1 | **Fix create-principal lockout** — set `is_active:true` on `User.create`; return/surface temp password; regression test. | `WR-01`, `FC-02` | S | — | `principalController.js createPrincipalUser` |
| 1.2 | **Make Suspend actually revoke access** — toggle `User.is_active` in a transaction; return persisted state. | `WR-02`, `FC-01` | S–M | `PrincipalUsers.js toggleActive` (send explicit body, read server record) | `principalController.js updatePrincipalUser`; migration if `SchoolAdmin.is_active` kept |
| 1.3 | **Stop discarding role/access_level/phone** — add columns + migration (or store on `CorePrincipal`), map on read/write; add `phone` to `users` or remove field. | `FC-03`, `FC-04`, `FC-09` | M | `PrincipalUsers.js` form/read | `SchoolAdmin`/`User` models + migration; controller create/update/read |
| 1.4 | **Stop rendering fabricated finance as real** — either wire `getFinanceSnapshot` to `Payment`/`Fee` (or reuse `/api/finance/stats`) or show an honest empty state; add Recent-Payments empty state. | `FC-05`, `UI-01`, `GAP-01` | M | `FinancePanel.jsx`, `StatsCards.jsx` | `principalController.js getFinanceSnapshot` |
| 1.5 | **De-fabricate health score / KPI** — compute finance dimension from real data or remove the `+15` constant and the "Financial Status" KPI. | `UI-02`, `GAP-03` | S–M | `HealthScoreCard.jsx`, `StatsCards.jsx` | `principalController.js getSchoolCommandDashboard` |
| 1.6 | **Fix teacher-insights stub** — compute overloaded/underperforming, or hide/relabel the two tiles. | `GAP-02`, `UI-03`, `FC-08` | M | `TeacherPanel.jsx` | `principalController.js getTeacherInsights` |
| 1.7 | **Import `Principal.css` on the 3 unstyled-risk pages** (deep-link/refresh renders unstyled). | `UI-04` | S | `GradeApprovals.js`, `ReportCardApproval.js`, `PublishedReportCards.js` | — |

### Batch 2 — Contract, RBAC & UX fixes

| # | Item | IDs | Effort | UI | Backend |
|---|---|---|---|---|---|
| 2.1 | Persist approve/reject rationale (pass `comment` into GradeEvent / `grade.remarks`). | `FC-06` | S | — | `principalController.js reviewGradeChange` |
| 2.2 | Make publish visible — badge/gate on returned `published` flag; filter Published list on `rc.published` not `rc.approved`. | `FC-07` | S–M | `ReportCardApproval.js`, `PublishedReportCards.js` | — (use returned flag) |
| 2.3 | Split the backend read gate — drop `school_admin` from grade-governance + principal-users reads to match `permissions.js`. | `WR-03` | S | — | `routes/principal.js` |
| 2.4 | Guard leadership CRUD — filter listings to real leadership records; block a principal editing the school_admin row. | `WR-04`, `FC-04` | M | — | `principalController.js getPrincipalUsers/updatePrincipalUser` |
| 2.5 | Add confirmations to "Publish All Approved" and Suspend/Activate (reuse the GradeApprovals confirm modal). | `UI-06` | S | `ReportCardApproval.js`, `PrincipalUsers.js` | — |
| 2.6 | Shared accessible `Modal` wrapper (role=dialog, focus trap, Escape). | `UI-09` | M | all principal modals | — |
| 2.7 | Lift `PrincipalProvider` to the shell (real cross-page cache) or delete the context. | `WR-05`, `FC-10` | S–M | `SuperadminDashboard.js`, `PrincipalHome.js` | — |
| 2.8 | Fix the decorative school-scope picker — forward `school_id` for superadmin or drop the `scoped()` wrapper. | `UI-05` | M | `principalApi`, principal components | `principalController.js getSchoolFromUser` (honor `?school_id` for superadmin) |
| 2.9 | Housekeeping: 44px touch targets (`UI-08`), N+1 in syllabus (`FC-14`/`BE-13`), humanize activity timestamps (`FC-11`), term-scope KPIs (`FC-16`), notification subject include (`FC-13`), LRD currency (`GAP-05`), delete dead `QuickActions.jsx` (`UI-12`). | various | S each | mixed | mixed |
| 2.10 | **Harden create-principal (security)** — pre-check username/email uniqueness (return 409, not a generic 500); require a supplied password or force `must_change_password` (default is `Principal@123` today with no forced rotation); validate strength. | `BE-10` | S | `PrincipalUsers.js` (error surfacing) | `principalController.js createPrincipalUser` |
| 2.11 | **Backend correctness/perf housekeeping** — real report-card counts in `getOverview` (`BE-06`); add pagination/total to `listGradeApprovals`/`listReportCards` so they stop silently truncating at 200/500 (`BE-08`); replace unbounded grade/attendance scans + the duplicate attendance query in `getSchoolCommandDashboard` with SQL aggregates (`BE-04` perf); guard top/low class overlap for <6 classes (`BE-14`); return 400 (not 401) for superadmin without `?school_id` (`BE-15`); only notify on non-zero publish + scope the term lookup (`BE-16`); pick one principal identity model and delete dead `Principal.js` (`BE-12`). | `BE-04`/`06`/`08`/`12`/`14`/`15`/`16` | S–M | — | `principalController.js`, `routes/principal.js`, models |

### Batch 3 — Net-new leadership features / parity add-ons

| # | Item | IDs | Effort | UI | Backend |
|---|---|---|---|---|---|
| 3.1 | **Finance oversight page** (read-only) reusing `bursar/Reports.js`. | `PAR-01`, `GAP-10` | S | nav + permissions + route to `Reports.js` | none (already authorized) |
| 3.2 | **Expense-approval queue** reusing `bursar/Expenses.js`. | `PAR-02`, `GAP-10` | S | nav + `permissions.js` whitelist | none (already authorized) |
| 3.3 | **Grade-audit / forensic timeline** viewer + `chainValid` flag. | `GAP-06`, `PAR-06` | M | new viewer page | `GET /api/principal/grade-audit/` (tenant-scoped) |
| 3.4 | **Academics analytics page** — grade distribution, pass-rate, term trend, class×subject heatmap (borrow `SABenchmarks`/`ClassAnalytics`). | `PAR-05`, `E-01`, `GAP-18` | L | new analytics page + charts | extend `getClassPerformance` aggregates |
| 3.5 | **Announcement / broadcast composer** (tenant-scoped Notification). | `GAP-07`, `PAR-04`, `PAR-12` | M | composer modal + sent-list | `POST/GET /api/principal/announcements/` |
| 3.6 | **Predictive at-risk panel** with drill-down + assign-mentor. | `GAP-08`, `GAP-04`, `E-04` | M | at-risk table + student drawer | `GET /api/principal/at-risk/` |
| 3.7 | **Student/teacher profile drill-down** from class-performance/at-risk. | `PAR-07`, `GAP-11` | M | profile drawer (reuse teacher `StudentProfileDrawer`) | principal-scoped student-detail endpoint |
| 3.8 | **CSV/PDF export + per-card print** across list pages. | `PAR-08`, `E-03` | S–M | export buttons on existing tables | none (endpoints exist) |
| 3.9 | **Real teacher-evaluation dashboard**, **whistleblower inbox**, **internal messaging**, **exam/timetable oversight**, **health scorecard export**. | `GAP-09`, `GAP-14`, `GAP-15`, `GAP-13`/`PAR-10`, `GAP-12` | M–L each | new pages | mixed (some need new endpoints/models) |

---

## 6. Ship / no-ship verdict

**NO-SHIP as-is.** The console is not safe to present to school leadership in its current state, for three reasons that each independently block:

1. **`WR-01` (critical):** the leadership-provisioning feature is fake-success — every principal created through the UI is locked out of login with no in-app remedy. A core CRUD action of the console does not work.
2. **Fabricated oversight data (`UI-01`/`UI-02`/`FC-05`/`GAP-01`/`GAP-02`):** an oversight console that shows a school confident `$0` collections *and* a full-green 95% "Stable" finance health bar on the same screen actively misinforms the exact decisions it exists to support. This is worse than a missing feature.
3. **`WR-02` + `FC-03` (high):** the access-revocation control revokes nothing, and the leadership form silently discards role/access/phone — so the RBAC surface is cosmetic.

**Path to ship:** Batch 1 is small (mostly S/M, one migration) and clears every blocker — after it, the console is honestly shippable as a **grade-governance + read-only academic-oversight** tool. Batch 2 makes the RBAC/contract behavior correct. Batch 3 is where the console earns the "executive command center" label (finance, expense approvals, forensic audit, real analytics) — most of it is cheap because the backend already authorizes the principal. Recommend **ship after Batch 1 + the RBAC items in Batch 2 (2.3, 2.4, 2.5)**, then iterate Batch 3.

---

## 7. Section files

| # | File | Dimension |
|---|---|---|
| 01 | [01-UI-UX-AUDIT.md](01-UI-UX-AUDIT.md) | UI / UX, states, modals, mobile, fake-data, dead controls |
| 02 | [02-BACKEND-AUDIT.md](02-BACKEND-AUDIT.md) | Controllers, handlers, queries, models |
| 03 | [03-FUNCTIONALITY-CONTRACT-AUDIT.md](03-FUNCTIONALITY-CONTRACT-AUDIT.md) | FE↔BE contract, write flows, data-loss |
| 04 | [04-GAP-ANALYSIS-VS-PLAN.md](04-GAP-ANALYSIS-VS-PLAN.md) | Coverage vs the 7-module / 47-feature plan |
| 05 | [05-WIRING-RBAC-AUDIT.md](05-WIRING-RBAC-AUDIT.md) | Routing, nav, permissions, tenant isolation, impersonation |
| 06 | [06-PARITY-VS-PEERS.md](06-PARITY-VS-PEERS.md) | Capability parity vs superadmin / bursar / teacher consoles |
