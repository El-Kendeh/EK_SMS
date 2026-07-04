# Principal Dashboard Audit — Parity vs Peer Dashboards

**Dimension:** Parity vs peer dashboards (Super Admin `SA*`, Bursar, Teacher, School Admin)
**Question:** Which leadership capabilities do the mature sibling consoles have that the Principal console is missing, and which existing components can the Principal build reuse or adapt?
**Method:** Read the actual source of every peer family and the whole Principal console (7 pages + controller + routes + shell wiring). Every gap below cites a concrete file and, where a fix is cheap, the exact component to borrow and whether the backend already permits it.

---

## 1. What the Principal console has today

Wired in `SuperadminDashboard.js` under `PRINCIPAL_NAV_ITEMS` (lines 837-846) and routed at lines 1523-1529:

| Page | File | State |
|---|---|---|
| Command Center (home) | `src/components/principal/PrincipalHome.js` | Works, but two panels are stub-fed (see PAR-03, PAR-09) |
| Grade Approvals | `src/components/principal/GradeApprovals.js` | Works |
| Report Card Approval | `src/components/principal/ReportCardApproval.js` | Works |
| Published Report Cards | `src/components/principal/PublishedReportCards.js` | Works |
| Syllabus Progress | `src/components/principal/SyllabusProgress.js` | Works |
| Attendance Report | `src/components/principal/AttendanceReport.js` | Works |
| Leadership Team | `src/components/principal/PrincipalUsers.js` | Works |

The home page already reuses shared sub-components from `src/components/schooladmin/Principal/*` (`StatsCards`, `HealthScoreCard`, `ClassPerformance`, `TeacherPanel`, `FinancePanel`, `AlertsPanel`, `InsightsPanel`, `ActivityFeed`). So component reuse across role folders is already an established pattern in this build — the recommendations below extend that same pattern to the Bursar and Teacher folders.

The Principal console is squarely an **approvals + read-only oversight** tool. Everything it does is grade governance, report-card release, attendance/syllabus read-outs, and managing its own leadership accounts. It has **no finance, no analytics/charts, no announcements, no audit trail, no profile lookup, and no export** — all of which one or more peers already ship.

---

## 2. Peer capability inventory (the shelf the Principal can shop from)

**Super Admin (`src/components/superadmin/SA*.js`)**
- `SAAnalytics.js` — KPI sparkline strip, geo map, per-entity oversight tabs (Overview / Academics / Compliance / Security), bar charts.
- `SABenchmarks.js` — pass-rate KPI, average-score KPI, **grade-distribution bar chart**, top-performer ranking, head-to-head compare view. Reads `/api/grade-stats/`.
- `SAReportsHub.js` — dataset export cards (CSV/JSON) + a "live reports" launcher; auth-download helper.
- `SAAlertBroadcast.js` — compose/send broadcast with title, type, severity, audience targeting, live preview, history list. Backend `POST/GET /api/broadcast-alerts/`.
- `SASecurityLogs.js` — audit-event table with severity tabs, 24-hour activity chart, live counters, click-through to forensic detail (`SAForensics.js`).
- `SAGovernance.js` — RBAC role/permission matrix editor (currently a saved-but-not-enforced preview).
- `SAGradeIntegrity.js`, `SAGradeReport.js`, `SAGradeAuditDetail.js`, `SAVersionCompare.js`, `SAChangeAlerts.js` — grade forensic depth.

**Bursar (`src/components/bursar/*.js`)**
- `Reports.js` — finance analytics: KPI cards with period-over-period trend deltas, **monthly revenue vs expense bar chart**, payment-method share bars, spending-by-category bars, top-debtors list, period selector, CSV export (summary / payments / expenses). Reads `financeApi.getAnalytics/getStats`.
- `Expenses.js` — expense ledger with **record → approve/reject** and separation-of-duties. `APPROVER_ROLES = ['principal', 'school_admin', 'superadmin']` (line 21) and the record modal literally says *"a principal or school admin must approve"* (line 80).
- `Payments.js`, `StudentFees.js`, `FeeCategories.js`, `FinanceTeam.js`, `BursarOverview.js`.

**Teacher (`src/components/teacher/*.js`)**
- `ClassAnalytics.js` — grade distribution, trend series, pass-rate against grading scheme, per-class drill-down (Recharts/motion).
- `PersonalPerformance.js` — self-analytics dashboard.
- `StudentProfileDrawer.js` / `MyStudents.js` — student profile lookup drawer.
- `TimetableScreen.js`, `ExamDuties.js`.

**School Admin (`SuperadminDashboard.js` school-admin routes)**
- `attendance-report`, `timetable-mgr` (`TimetablePage`), `exam-schedule` (`ExamsPage`), `grading-scheme`, `promotions`, `ai-capture`.

---

## 3. Parity table

Legend: ✅ has it & works · ⚠️ partial/stub · ❌ missing · n/a not applicable to role.

| Capability | SchoolAdmin | Bursar | Teacher | **Principal** | Recommendation |
|---|---|---|---|---|---|
| Grade-change approval | ❌ | ❌ | requests only | ✅ `GradeApprovals.js` | Keep |
| Report-card review & release | ✅ | ❌ | ❌ | ✅ `ReportCardApproval.js` | Keep |
| Attendance oversight | ✅ | ❌ | takes it | ✅ `AttendanceReport.js` | Keep |
| Syllabus/curriculum progress | ✅ | ❌ | ❌ | ✅ `SyllabusProgress.js` | Keep |
| Leadership/user account mgmt | ✅ (SAPrincipal) | ❌ | ❌ | ✅ `PrincipalUsers.js` | Keep |
| **Finance analytics & budget** | ⚠️ report link | ✅ `Reports.js` | ❌ | ❌ | **PAR-01** — reuse Bursar `Reports.js`; backend already allows principal |
| **Expense approval** | ✅ (approver) | ✅ `Expenses.js` | ❌ | ❌ | **PAR-02** — mount Bursar `Expenses.js` verbatim; principal is a designated approver |
| Finance snapshot on home | n/a | ✅ | ❌ | ⚠️ **stub zeros** | **PAR-03** — wire `FinancePanel` to real `financeApi` |
| **Announcements / broadcast** | ⚠️ virtual mtg | ❌ | notify only | ❌ | **PAR-04** — adapt `SAAlertBroadcast.js` compose → tenant Notification endpoint |
| **Rich analytics & charts** | ❌ | ✅ | ✅ `ClassAnalytics.js` | ⚠️ bars only | **PAR-05** — adapt `SABenchmarks.js` + `ClassAnalytics.js` school-wide |
| Grade-distribution / pass-rate | ❌ | ❌ | ✅ | ❌ | Folds into PAR-05 (borrow `BarChart` from `SABenchmarks.js`) |
| **Audit / forensic trail** | ❌ | ❌ | own audit panel | ❌ | **PAR-06** — reuse `SASecurityLogs.js` table shell over tenant grade-event feed |
| **Student / teacher lookup** | ✅ (SAStudents) | ❌ | ✅ `StudentProfileDrawer` | ❌ | **PAR-07** — adapt teacher `StudentProfileDrawer.js` |
| **Reports / export hub** | ❌ | ✅ CSV | export CSV | ❌ | **PAR-08** — adapt `SAReportsHub.js` + Bursar export modal |
| Teacher-evaluation analytics | ❌ | ❌ | self only | ⚠️ **stub zeros** | **PAR-09** — adapt `PersonalPerformance.js`; back with real query |
| Exam / timetable oversight | ✅ | ❌ | ✅ | ❌ | **PAR-10** — read-only reuse of `ExamsPage`/`TimetablePage` |
| RBAC / governance matrix | ❌ | ❌ | ❌ | ❌ | **PAR-11** — low; `SAGovernance` is superadmin-only & unenforced |
| Home alerts/insights | ❌ | ❌ | ❌ | ⚠️ client heuristic | **PAR-12** — enhancement; back with real thresholds |

---

## 4. Findings

### PAR-01 — No finance / budget oversight page, though the backend already grants it
- **Severity:** High
- **Category:** Finance oversight / parity
- **Location:** absent from `src/components/principal/*` and `PRINCIPAL_NAV_ITEMS` (`SuperadminDashboard.js:837-846`); peer is `src/components/bursar/Reports.js`; backend gate `backend_node/src/routes/finance.js:22` `FINANCE_ACCESS = ['superadmin','school_admin','principal','bursar']`.
- **Current state:** missing-no-ui (backend endpoints `GET /api/finance/analytics/`, `/stats/`, `/payments/`, `/expenses/` already authorize the principal role; no principal-facing page consumes them).
- **Evidence:** `finance.js` mounts `getFinanceAnalytics`, `getFinanceStats`, `getPayments`, `getExpenses` behind `router.use(requireRole(FINANCE_ACCESS))` (line 41) which includes `principal`. The Bursar `Reports.js` calls exactly those via `financeApi` and is already styled with the same `pu-*`/`ska-*`/`bfr-*` token classes the Principal pages use.
- **Recommendation:** Add a `finance-oversight` (or `finance-reports`) item to `PRINCIPAL_NAV_ITEMS`, whitelist it for `PRINCIPAL` in `config/permissions.js`, and route it to the Bursar `Reports.js` component (read-only view is fine). No backend change required. This is the single biggest, cheapest parity win: a fully-built finance analytics screen the principal is already permitted to load.

### PAR-02 — Principal is a designated expense approver but the console gives them no way to approve
- **Severity:** High
- **Category:** Finance approvals / broken workflow
- **Location:** peer `src/components/bursar/Expenses.js` (`APPROVER_ROLES` line 21); backend `finance.js:32` `CAN_APPROVE_EXPENSE = ['school_admin','principal','superadmin']` and `finance.js:73` `POST /expenses/:id/review/`.
- **Current state:** missing-no-ui (backend explicitly designates principal as an approver; there is no principal UI to act on it).
- **Evidence:** `Expenses.js` renders the Approve/Reject controls whenever `currentUser().role` is in `APPROVER_ROLES` (which includes `principal`), and the record modal tells bursars a principal must approve. Yet the Principal nav has no Expenses page, so pending expenses can only be approved by a school admin or superadmin — the principal half of the designed two-approver flow is dead.
- **Recommendation:** Mount Bursar `Expenses.js` for the principal verbatim (whitelist `expenses` for `PRINCIPAL` in `permissions.js`, add to `PRINCIPAL_NAV_ITEMS`). Separation-of-duties, reason-required rejects, and the "can't approve your own entry" guard all already work for the principal role. Zero backend change.

### PAR-03 — Home FinancePanel shows hardcoded zeros while a live finance API exists
- **Severity:** Medium
- **Category:** Finance / misleading stub
- **Location:** `backend_node/src/controllers/principalController.js:616-631` `getFinanceSnapshot`; consumed by `hooks/usePrincipalDashboard.js:32` and rendered by `PrincipalHome.js:121` via `schooladmin/Principal/FinancePanel`.
- **Current state:** broken-or-stub.
- **Evidence:** `getFinanceSnapshot` returns `{ revenue:0, outstanding:0, paymentsToday:0, transactions:[] }` unconditionally. The Bursar reads real figures from `financeApi.getStats/getAnalytics` for the same school. So the principal's "Finance" card is permanently blank/zero — worse than absent because it reads as real data.
- **Recommendation:** Reimplement `getFinanceSnapshot` on top of the same Payment/Expense queries the finance controller already uses (revenue, outstanding, today's payments), or have the home panel call `/api/finance/stats/` directly (principal is authorized). Then the home card matches the (recommended) full finance page.

### PAR-04 — No announcement / broadcast capability for a school-leadership role
- **Severity:** High
- **Category:** Communications / broadcasting
- **Location:** peer `src/components/superadmin/SAAlertBroadcast.js`; backend `routes/superadmin.js:108` `sa.use(requireRole(['superadmin']))` gates `broadcast-alerts` superadmin-only; tenant-scoped `Notification` writes already exist in `principalController.js:164` and `:288`.
- **Current state:** missing-entirely (no principal-facing broadcast endpoint and no UI), but the building blocks exist.
- **Evidence:** The Principal cannot push any message to staff/parents. `SAAlertBroadcast.js` is a complete compose UI (title, severity, audience, live preview, history) but writes to the superadmin-only `broadcast-alerts` table. Separately, `principalController` already creates tenant-scoped `Notification` rows on approve/publish, and `getActivityFeed` reads them back — so a school-scoped announcement primitive is half-built.
- **Recommendation:** Add a tenant-scoped `POST/GET /api/principal/announcements/` that writes a `Notification` (school_id-scoped), and adapt the `ComposeAlert` sub-component from `SAAlertBroadcast.js` (drop the "All Schools/Region" audience picker; keep title/severity/body/preview). Reuses ~80% of an existing screen for a core leadership function.

### PAR-05 — Analytics are bar-only; no grade-distribution, pass-rate, or trend charts
- **Severity:** High
- **Category:** Analytics & charts
- **Location:** `PrincipalHome.js` (`ClassPerformance`, `TeacherPanel`, syllabus bars); peers `superadmin/SABenchmarks.js` (`BarChart`, pass-rate/grade-distribution), `teacher/ClassAnalytics.js` (distribution + trend).
- **Current state:** partial (a class-performance endpoint exists but only feeds top/low lists; no distribution, pass-rate, or trend visualization anywhere in the console).
- **Evidence:** `getClassPerformance` (`principalController.js:559`) returns only `top`/`low` arrays; there is no grade-distribution or pass-rate anywhere. `SABenchmarks.js` already computes distribution + pass rate from `/api/grade-stats/` and renders a reusable `BarChart`; `ClassAnalytics.js` does the same per class against the grading scheme.
- **Recommendation:** Add a Principal "Academics Analytics" page: borrow `BarChart` + the grade-distribution/pass-rate derivation from `SABenchmarks.js`, computed school-wide from the tenant's grades, plus a term-over-term trend line adapted from `ClassAnalytics.js`. This is the analytics depth a principal is expected to review and every other analytical role already has.

### PAR-06 — No audit / forensic trail view for grade governance
- **Severity:** Medium
- **Category:** Governance / audit
- **Location:** peer `superadmin/SASecurityLogs.js` (+ `SAForensics.js`); tenant-scoped grade events already written by `utils/gradeEvent.appendGradeEvent` (called throughout `principalController.js:154, 279`).
- **Current state:** missing-no-ui (a tenant-scoped, immutable grade-event store exists; no principal view reads it).
- **Evidence:** Every approve/reject/publish appends a grade event with actor, old/new value, and timestamp — the exact material for a leadership audit trail. But `SASecurityLogs.js` reads the platform-wide `SecurityAuditLog` (no `school_id`, superadmin-only), which `principalController.js:638` explicitly avoids because it would leak cross-tenant. So the table shell is reusable but must be pointed at a new tenant-scoped grade-event endpoint, not `SecurityAuditLog`.
- **Recommendation:** Expose `GET /api/principal/audit-trail/` over the tenant's grade events and reuse the `SASecurityLogs.js` table + severity-filter + activity-chart shell (swap columns to actor/field/old→new/status). Gives the principal the forensic oversight the role implies without touching platform audit data.

### PAR-07 — No student or teacher profile lookup
- **Severity:** Medium
- **Category:** Oversight / drill-down
- **Location:** peers `teacher/StudentProfileDrawer.js`, `teacher/MyStudents.js`, `superadmin/SAStudents.js`.
- **Current state:** missing-entirely for the principal (existing lookups are teacher-scoped or superadmin-scoped).
- **Evidence:** The principal can see class/subject aggregates but cannot open a single student (grades history, attendance, report card) or a single teacher. Grade Approvals lists students but has no click-through profile. The teacher `StudentProfileDrawer.js` is a self-contained drawer that already assembles a student's academic snapshot.
- **Recommendation:** Add a school-scoped student lookup (search + `StudentProfileDrawer`-style drawer) reading tenant data. Adapt the teacher drawer; back it with a principal-scoped student-detail endpoint. Enables the "open this student / this teacher" flow that anchors most leadership investigations.

### PAR-08 — No reports / export anywhere in the Principal console
- **Severity:** Medium
- **Category:** Reporting / export
- **Location:** peers `superadmin/SAReportsHub.js`, `bursar/Reports.js` (`ExportModal`, `downloadCsv`).
- **Current state:** missing-no-ui (the underlying data endpoints — grades, attendance, report cards — already exist and are principal-authorized; only the export UI is absent).
- **Evidence:** Grade Approvals, Attendance Report, Published Report Cards, and Syllabus Progress all render tables with no CSV/PDF export. The Bursar `Reports.js` ships a reusable `downloadCsv` helper + `ExportModal`; `SAReportsHub.js` ships an auth-download pattern.
- **Recommendation:** Add an export affordance to the existing principal tables (client-side CSV via the Bursar `downloadCsv` helper) and/or a small "Reports" hub adapted from `SAReportsHub.js`. Cheap, self-contained, and expected of a leadership console.

### PAR-09 — Teacher-evaluation panel is stub-fed (hardcoded zeros)
- **Severity:** Medium
- **Category:** Teacher analytics / stub
- **Location:** `principalController.js:594-614` `getTeacherInsights`; rendered by `PrincipalHome.js:111` via `schooladmin/Principal/TeacherPanel`.
- **Current state:** broken-or-stub.
- **Evidence:** `getTeacherInsights` returns `overloaded: 0, underperforming: 0` as literals (only `totalTeachers` and `pendingGrades` are real). The home "Teacher" panel therefore always shows zero overloaded / zero underperforming — a fake signal. The Teacher `PersonalPerformance.js`/`ClassAnalytics.js` show what real teacher analytics look like.
- **Recommendation:** Either compute `overloaded`/`underperforming` from real workload/grade-average queries, or drop those two metrics until backed. For a full view, add a Teacher Performance page adapting `PersonalPerformance.js` aggregated across the school.

### PAR-10 — No exam or timetable oversight
- **Severity:** Low
- **Category:** Academic operations oversight
- **Location:** peers `ExamsPage`/`TimetablePage` (school-admin routes in `SuperadminDashboard.js:1543-1544`), `teacher/TimetableScreen.js`, `teacher/ExamDuties.js`.
- **Current state:** missing-no-ui (school-scoped exam/timetable endpoints exist for other roles).
- **Evidence:** School Admin and Teacher both have exam-schedule and timetable views; the Principal has neither, so a head-of-school cannot glance at the exam calendar or timetable coverage.
- **Recommendation:** Add read-only exam/timetable oversight by reusing `ExamsPage`/`TimetablePage` (or the teacher `TimetableScreen`) in a view-only mode. Lower priority than finance/analytics.

### PAR-11 — No governance / RBAC visibility beyond the Leadership Team
- **Severity:** Low
- **Category:** Governance
- **Location:** peer `superadmin/SAGovernance.js`.
- **Current state:** missing-entirely for principal, and intentionally so.
- **Evidence:** `SAGovernance.js` is superadmin-only and its own banner says the permission matrix is "saved as configuration but not yet wired into authorization." Duplicating it for the principal would add an unenforced screen.
- **Recommendation:** Defer. Principal RBAC needs are covered by `PrincipalUsers.js`. Revisit only if/when the governance matrix becomes enforced and a per-school scope is added.

### PAR-12 — Home alerts/insights are client-side heuristics, not a real alerting backend
- **Severity:** Enhancement
- **Category:** Alerts / notifications
- **Location:** `PrincipalHome.js:47-82` (alerts + insights derived in the browser); `AlertsPanel`/`InsightsPanel` from `schooladmin/Principal/*`.
- **Current state:** partial (renders, but every threshold is hardcoded in the component; no persistence, acknowledgement, or subscription).
- **Evidence:** Alerts like "students at academic risk" and insights like "schedule home visits" are computed from `summary.*` in the render body with literal cut-offs (`> 5`, `< 75`, etc.). There is no server-side alert model, no dismiss/ack, no history — contrast with `SAAlertBroadcast.js`'s acknowledgement affordance.
- **Recommendation:** Enhancement — move thresholds server-side and persist alerts (with ack/history) so the panel becomes an actionable inbox rather than a re-derived list. Pairs naturally with PAR-04's announcements endpoint.

---

## 5. Reusable components the Principal build can borrow

| Need (finding) | Borrow from | Backend already allows principal? | Effort |
|---|---|---|---|
| Finance analytics page (PAR-01) | `bursar/Reports.js` | **Yes** — `FINANCE_ACCESS` incl. `principal` | Route + nav + permission entry only |
| Expense approval (PAR-02) | `bursar/Expenses.js` | **Yes** — `CAN_APPROVE_EXPENSE` incl. `principal` | Route + nav + permission entry only |
| Real home finance card (PAR-03) | `financeApi` / `bursar` queries | Yes | Rewrite `getFinanceSnapshot` |
| Announcements (PAR-04) | `superadmin/SAAlertBroadcast.js` (`ComposeAlert`) | No — needs tenant `Notification` endpoint | New endpoint + trim compose UI |
| Grade-distribution / pass-rate charts (PAR-05) | `superadmin/SABenchmarks.js` (`BarChart`), `teacher/ClassAnalytics.js` | Partial — grades are tenant-scoped | New page + reuse chart primitives |
| Audit trail table (PAR-06) | `superadmin/SASecurityLogs.js` shell | No — must point at tenant grade-event feed (not `SecurityAuditLog`) | New endpoint + reskin table |
| Student/teacher profile lookup (PAR-07) | `teacher/StudentProfileDrawer.js`, `MyStudents.js` | No — needs principal-scoped detail endpoint | New endpoint + adapt drawer |
| CSV export (PAR-08) | `bursar/Reports.js` (`downloadCsv`), `superadmin/SAReportsHub.js` | Yes — data endpoints exist | Client-side helper drop-in |
| Teacher performance (PAR-09) | `teacher/PersonalPerformance.js` | Partial — fix stub query | New query + optional page |
| Exam/timetable oversight (PAR-10) | `ExamsPage`, `TimetablePage`, `teacher/TimetableScreen.js` | Yes — school-scoped endpoints | Read-only reuse |

**Bottom line:** the two highest-value, lowest-cost wins (PAR-01 and PAR-02) require **no backend work** — the finance route suite already authorizes the principal role and the Bursar's screens already render the principal's approver controls. They are missing purely because no nav entry, permission entry, or route line was added for the principal. Announcements (PAR-04) and real analytics (PAR-05) are the next tier and need modest new tenant-scoped endpoints, but can lean on existing compose/chart UIs. Audit trail (PAR-06) and profile lookup (PAR-07) are genuinely new surfaces but have clear component templates to adapt.
