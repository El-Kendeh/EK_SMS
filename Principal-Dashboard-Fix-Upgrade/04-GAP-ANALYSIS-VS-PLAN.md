# Principal Dashboard — Gap Analysis vs. System Plan + Feature Roadmap

**Dimension:** Coverage of the 7-module / 47-feature system plan by the Principal console, plus a prioritized build roadmap.
**Audited paths:** `src/components/principal/*`, `src/hooks/usePrincipalDashboard.js`, `src/context/PrincipalContext.js`, `src/components/schooladmin/Principal/*`, `src/api/adminApi.js` (`principalApi`), `backend_node/src/controllers/principalController.js`, `backend_node/src/routes/principal.js`, `backend_node/src/routes/finance.js`, `backend_node/src/routes/whistleblower.js`.
**Method:** Read the actual source. The plan defines **no "principal" role** (RBAC lists Super Admin, School Admin, Teacher, Student, Parent, Finance Officer, Examination Officer). The Principal console is an *added* leadership/oversight/approval layer. So "vs the plan" = for each leadership-relevant feature, judge Present / Partial / Missing in the Principal console and whether a principal *should* have it.

---

## 1. Executive summary

The Principal console today is essentially a **grade-and-report-card approval workstation with three read-only oversight views** (attendance, syllabus, class performance) plus a leadership-team CRUD. That maps to roughly **the governance slice of Module 1 (anti-corruption approvals) and part of Module 2 (report cards, attendance)**. It genuinely works for its core loop: review pending grade changes → approve/reject (transactional, audited via `appendGradeEvent`) → publish report cards.

Everything beyond that governance loop is either **stubbed with fabricated zeros**, **missing UI over backend that already exists**, or **missing entirely**. The two most damaging issues: the **Financial Snapshot** and **Teacher Performance** panels on the Command Center render hardcoded zeros (`getFinanceSnapshot` and `getTeacherInsights` return constants), so a principal is shown a confident-looking but fake finance/teacher dashboard. And the platform's flagship anti-corruption asset — the tamper-evident `GradeEvent` hash chain — is **written on every approval but never surfaced to the principal**, so the leadership role that exists to *enforce* transparency has no forensic viewer.

Notably, backend capability the principal is *already authorized for* sits unused: `backend_node/src/routes/finance.js` grants `principal` real finance stats/analytics (`getFinanceStats`, `getFinanceAnalytics`) and **expense approve/reject** (`CAN_APPROVE_EXPENSE = ['school_admin','principal','superadmin']`), and `whistleblower.js` accepts anonymous reports — yet the Principal console wires to none of it. Several roadmap items are therefore "add a screen," not "build a system."

---

## 2. Coverage matrix — all 47 features

Legend — **Present** (in Principal console, works) · **Partial** (present but stub/degraded/oversight-only) · **Missing** (no Principal UI) · **N/A** (infra/other-role, not principal-relevant). "Should?" = should a principal have this in their console.

### Module 1 — Security & Anti-Corruption (10)

| # | Feature | State | Should? | Evidence |
|---|---------|-------|---------|----------|
| 1.1 | Immutable grade recording | Partial | Yes | `principalController.reviewGradeChange` appends events via `appendGradeEvent`; principal can approve/reject but **cannot view** the immutable chain. |
| 1.2 | System-wide change alerts | Partial | Yes | `PrincipalHome` derives alert cards from counts; `getActivityFeed` surfaces `Notification` rows. No configurable/real-time alerting; system-generated only. |
| 1.3 | **Audit trail & forensic logs** | **Missing (no UI)** | **Yes** | `GradeEvent` hash chain (`utils/gradeEvent.js`) exists; `SecurityAuditLog` exists but is platform-wide (no `school_id`, per comment in `getActivityFeed`). **No principal viewer for either.** |
| 1.4 | Blockchain-backed security | N/A | No | Optional/deferred (plan Phase 5). Merkle-style hashing already in `GradeEvent`. |
| 1.5 | Two-factor authentication | Missing | Low | No 2FA management in principal console; enforcement is admin/infra. |
| 1.6 | Role-based access control | Partial | Yes | `PrincipalUsers` manages only **principal/vice-principal** accounts (`SchoolAdmin` rows). No visibility/control over teachers/students/parents. |
| 1.7 | Security audits / pentest | N/A | No | Infra. |
| 1.8 | System health monitoring | Partial | Yes | `getSchoolCommandDashboard` computes a `healthScore` — but it's `avgAcademic*0.45 + avgAttendance*0.40 + 15` (arbitrary constant, no finance/security/compliance inputs). |
| 1.9 | End-to-end encryption | N/A | No | Infra (TLS/at-rest). |
| 1.10 | Access revocation & lockout | Partial | Yes | `updatePrincipalUser` toggles `is_active` for **leadership members only**; no force-logout, no scheduled windows, no staff-wide scope. |

### Module 2 — Academic Management (8)

| # | Feature | State | Should? | Evidence |
|---|---------|-------|---------|----------|
| 2.1 | Student academic profiles | Missing | Yes | No principal-facing student profile/drill-down anywhere; class-performance rows aren't clickable. |
| 2.2 | Grade compilation & calculation | Partial | Yes (oversight) | Principal reviews compiled `ca/midterm/final/total` in Grade Approvals + Report Card Approval; does not compile (school-admin/exam-officer). |
| 2.3 | AI-powered timetabling | Missing | Low | Not in principal console (school-admin owns `timetable-mgr`). |
| 2.4 | Report cards & transcripts | Partial | Yes | `ReportCardApproval` + `PublishedReportCards` do review/publish; **no PDF, QR, digital signature, or transcript generation** (plan 2.4 features). |
| 2.5 | Attendance tracking & analytics | Present | Yes | `AttendanceReport` (`getAttendanceReport`) — per-class rate, low-attendance flags, date ranges. Read-only oversight, appropriate. |
| 2.6 | Continuous assessment | Partial | Yes | CA scores visible inside grade rows + `SyllabusProgress`; no dedicated trend/early-warning view. |
| 2.7 | Course & subject management | Partial | Low | `SyllabusProgress` reads subjects/topics; no CRUD (correct — oversight only). |
| 2.8 | **Examination management** | **Missing** | **Yes** | No exam schedule/results-status oversight in principal console. Exam models exist (school-admin `exam-schedule`). |

### Module 3 — Communication & Engagement (5)

| # | Feature | State | Should? | Evidence |
|---|---------|-------|---------|----------|
| 3.1 | Parent & guardian portal oversight | Missing | Medium | Principal has no view of parent engagement/linked accounts. |
| 3.2 | Secure internal messaging | Missing | Yes | No messaging for principal ↔ teacher/parent. |
| 3.3 | Push / SMS / Email alerts | Partial | Yes | `Notification.create` fires on approve/publish (in-app only, generic school-wide); no compose, no email/SMS channel, no targeting. |
| 3.4 | Anonymous whistleblower channel | Partial (write-only) | Yes | `routes/whistleblower.js` accepts anonymous `submit`; **no list/read endpoint and no principal inbox** — the channel is write-only, leadership can't read reports. |
| 3.5 | **Event & announcement broadcasting** | **Missing** | **Yes** | Superadmin has `sa.post('/broadcast-alerts/')`; principal has **no** broadcaster (no targeted/scheduled announcements). |

### Module 4 — Finance & Administration (6)

| # | Feature | State | Should? | Evidence |
|---|---------|-------|---------|----------|
| 4.1 | Cashless fee payment | N/A | No | Bursar domain. |
| 4.2 | Receipt generation | N/A | No | Bursar domain. |
| 4.3 | **Finance & budget dashboards** | **Partial (stub)** | **Yes** | `getFinanceSnapshot` returns hardcoded `{revenue:0, outstanding:0, paymentsToday:0, transactions:[]}`; `FinancePanel.jsx` renders a fake all-zero panel + 0% collection rate. Real data exists at `/api/finance/*` (principal is authorized). |
| 4.4 | Inventory & resource mgmt | N/A | No | Not principal-scoped. |
| 4.5 | Staff payroll & HR | Missing | Low | Not present; oversight-only relevance. |
| 4.6 | Document & certificate mgmt | Missing | Low | Not present. |

### Module 5 — AI & Advanced Analytics (4)

| # | Feature | State | Should? | Evidence |
|---|---------|-------|---------|----------|
| 5.1 | Predictive analytics (at-risk) | Partial | Yes | `getSchoolCommandDashboard` computes `totalAtRisk = grades.total<40` count (crude, no attendance/trend inputs); surfaced only as an alert count — **no student list, no drill-down, no forecast**. |
| 5.2 | **Teacher evaluation analytics** | **Partial (stub)** | **Yes** | `getTeacherInsights` returns hardcoded `overloaded:0, underperforming:0`; `TeacherPanel.jsx` shows fabricated tiles ("Teachers with >28 periods/week" always 0). No per-teacher metrics. |
| 5.3 | Customizable performance dashboards | Partial | Medium | `getClassPerformance` gives fixed top-3/low-3; not configurable, no subject/teacher comparison. |
| 5.4 | Benchmarking reports | Missing | Medium | No school-vs-district / year-over-year for principal (superadmin has benchmarks). |

### Module 6 — Integration & Accessibility (5)

| # | Feature | State | Should? | Evidence |
|---|---------|-------|---------|----------|
| 6.1 | Offline functionality | Missing | Low | System-wide; not principal-specific. |
| 6.2 | Multi-device access | Present | Yes | Principal sidebar + `sa-mobile-nav` role branch exist; responsive CSS present per component. |
| 6.3 | Multi-language support | Missing | Low | No i18n; strings hardcoded. |
| 6.4 | National database integration | Missing | Low | Not present. |
| 6.5 | API integration support | N/A | No | REST exists platform-wide. |

### Module 7 — Liberia-Specific (9)

| # | Feature | State | Should? | Evidence |
|---|---------|-------|---------|----------|
| 7.1 | Anti-bribery architecture | Partial | Yes | Principal is the approval gatekeeper (grade governance works); but forensic-log viewer (1.3) missing weakens it. |
| 7.2 | Automated stakeholder alerting | Partial | Yes | Approve/publish create a **generic school-wide** `Notification`, not targeted to the specific student + parent (plan 7.2 recipients). |
| 7.3 | Blockchain-ready architecture | Present (backend) | — | `GradeEvent` SHA-256 prev-hash chain implemented; not surfaced to principal. |
| 7.4 | Offline-first design | Missing | Low | Not present. |
| 7.5 | National transparency focus | Missing | Medium | No publishable scorecard / compliance export. |
| 7.6 | Rural deployment | N/A | No | Infra. |
| 7.7 | Low-bandwidth optimization | N/A | No | Infra; `Promise.allSettled` fan-out loads 7 endpoints at once (not optimized). |
| 7.8 | Power-outage resilience (autosave) | N/A | No | Autosave is a teacher grade-entry concern. |
| 7.9 | Local currency & context | Partial (wrong) | Yes | `FinancePanel` uses `fmtUsd` (US Dollar); plan 7.9 mandates **Liberian Dollar (LRD)** + local date formats. |

**Tally (leadership-relevant only):** Present 3 · Partial 12 · Missing 10 · N/A 12. The console covers its approval core but is thin-to-empty on analytics, communication, and forensic oversight.

---

## 3. Findings — existing defects (rate honestly)

### GAP-01 — Financial Snapshot serves hardcoded zeros (fake dashboard)
- **Severity:** High · **State:** broken-or-stub
- **Location:** `backend_node/src/controllers/principalController.js:616` (`getFinanceSnapshot`) → `src/components/schooladmin/Principal/FinancePanel.jsx`
- **Evidence:** Handler returns literal `{revenue:0, outstanding:0, paymentsToday:0, transactions:[]}`. `FinancePanel` computes `collectionRate = revenue/(revenue+outstanding)` → `0/1 = 0%` and renders "Total Revenue $0 / This term" as if real. Meanwhile `routes/finance.js` exposes `getFinanceStats`/`getFinanceAnalytics`/`getFinanceFees` and lists `principal` in `FINANCE_ACCESS`.
- **Why it matters:** A principal is shown a confident, branded finance panel that is entirely fabricated — worse than showing nothing.
- **Recommendation:** Wire `getFinanceSnapshot` to the real finance controller (revenue = sum of payments this term, outstanding = assigned − paid, paymentsToday = count) or have `PrincipalHome` call `/api/finance/stats`. Show an explicit empty state when there's no data instead of zeros-as-data.

### GAP-02 — Teacher Performance analytics stubbed (constants, not data)
- **Severity:** High · **State:** broken-or-stub
- **Location:** `principalController.js:594` (`getTeacherInsights`) → `src/components/schooladmin/Principal/TeacherPanel.jsx`
- **Evidence:** Returns `overloaded:0, underperforming:0` unconditionally (only `pendingGrades` and `totalTeachers` are real). `TeacherPanel` renders tiles with authoritative hints ("Teachers with > 28 periods/week", "Class avg below threshold") that are always 0.
- **Why it matters:** Teacher-evaluation analytics (Module 5.2) is a core leadership feature; presenting always-zero as truth misleads staffing decisions.
- **Recommendation:** Compute real metrics from `Grade` + teacher assignments (class avg per teacher, grade-distribution skew, grading timeliness = time from term end to submission, workload from timetable slots). See roadmap GAP-09.

### GAP-03 — "School Health Score" is an arbitrary formula
- **Severity:** Medium · **State:** partial
- **Location:** `principalController.js:516` (`getSchoolCommandDashboard`)
- **Evidence:** `healthScore = round(avgAcademic*0.45 + avgAttendance*0.40 + 15)` — a flat `+15` inflates every school; finance, syllabus, compliance, and at-risk signals are excluded despite being computed nearby.
- **Recommendation:** Replace with a transparent weighted scorecard (academic, attendance, syllabus coverage, finance collection, pending-governance backlog) and show the component breakdown, not a single opaque number. See roadmap GAP-12.

### GAP-04 — At-risk detection is a crude count with no drill-down
- **Severity:** Medium · **State:** partial
- **Location:** `principalController.js:521` (`atRisk = grades.filter(g => g.total < 40)`)
- **Evidence:** Produces only a headline count consumed by an alert card in `PrincipalHome`. No student list, no attendance/trend inputs, no action (assign mentor), no forecast — far short of Module 5.1.
- **Recommendation:** Build a real at-risk panel (roadmap GAP-08).

### GAP-05 — Currency shown in USD, not Liberian Dollar
- **Severity:** Low · **State:** partial
- **Location:** `src/components/schooladmin/Principal/FinancePanel.jsx:2` (`fmtUsd`) and `principal.utils`
- **Evidence:** Finance figures format as US Dollars; plan 7.9 mandates LRD + local date formats.
- **Recommendation:** Introduce an LRD formatter (and localized dates) once real finance data is wired.

### GAP-06 — Immutable grade audit chain is never surfaced to the principal
- **Severity:** High · **State:** missing-no-ui
- **Location:** data in `backend_node/src/models/GradeEvent.js` + `utils/gradeEvent.js`; **no** read route in `routes/principal.js`; no viewer component.
- **Evidence:** Every approve/reject/publish appends a SHA-256 prev-hash-chained `GradeEvent` (who/when/field/old→new). The principal — the role whose entire justification is transparency enforcement — has no screen to view grade history, see who changed what, or verify chain integrity. `SecurityAuditLog` is additionally platform-wide (not tenant-scoped), so it can't be safely shown either.
- **Recommendation:** Add `GET /api/principal/grade-audit/` (tenant-scoped, filter by student/grade) returning the event chain + a computed `chainValid` flag, and a forensic-log viewer UI (timeline). This is the single highest-leverage anti-corruption gap.

---

## 4. Roadmap — features to build (enhancements, prioritized)

Each item is an **enhancement** finding. Effort: **S** ≤2 days · **M** ~3–6 days · **L** >1 week.

### P0 — anti-corruption + trust core

**GAP-07 — Announcement & Event Broadcaster** · Effort **M** · missing-entirely
- *What:* Principal composes targeted announcements (by class / grade / role), optional scheduled publish, acknowledgment tracking (Module 3.5).
- *Why principal:* School-wide communication is a defining leadership function; today only superadmin can broadcast (`sa.post('/broadcast-alerts/')`).
- *UI:* Composer modal (audience selector, schedule, attachment) + sent-list with read/ack counts. *Backend:* `POST/GET /api/principal/announcements/` writing `Notification` rows with audience targeting; reuse existing notification plumbing.

**GAP-08 — Predictive at-risk student panel** · Effort **M** · missing-no-ui
- *What:* Ranked list of at-risk students blending grades + attendance trend + declining-assessment signal; drill-down; "assign mentor / flag" action (Module 5.1).
- *Why principal:* Early intervention is leadership's job; the raw signal already exists as `totalAtRisk`.
- *UI:* At-risk table with risk reason chips + student drawer. *Backend:* `GET /api/principal/at-risk/` (school-scoped join over `Grade` + `Attendance`).

**GAP-09 — Teacher-evaluation analytics (real)** · Effort **L** · replaces stub (GAP-02)
- *What:* Per-teacher metrics — class average, grade-distribution skew, grading timeliness, pending-grade rate, workload (Module 5.2).
- *Why principal:* Data-driven staffing/PD decisions.
- *UI:* Teacher leaderboard/table + per-teacher detail. *Backend:* replace `getTeacherInsights` constants with aggregates over `Grade` + assignments + timetable slots.

### P1 — oversight completeness

**GAP-10 — Budget & expense-approval queue** · Effort **M** · missing-no-ui
- *What:* Principal approve/reject expenses + budget-vs-actual view.
- *Why principal:* Backend **already authorizes it** — `routes/finance.js` `CAN_APPROVE_EXPENSE = ['school_admin','principal','superadmin']`, `POST /api/finance/expenses/:id/review/`, `GET /api/finance/expenses/` — but the Principal console has no screen. Pure UI gap.
- *UI:* Pending-expense list with approve/reject + comment; budget summary. *Backend:* exists; consume `/api/finance/*`.

**GAP-11 — Student academic profile drill-down** · Effort **M** · missing-entirely
- *What:* Open a student from class-performance / at-risk into a read-only profile (grades by term, attendance %, remarks, guardian) (Module 2.1).
- *UI:* Profile drawer/page. *Backend:* reuse student read endpoints with principal school-scope.

**GAP-12 — School health scorecard (proper)** · Effort **M** · partial→build
- *What:* Replace the opaque `healthScore` with a transparent, exportable scorecard (academic, attendance, syllabus, finance collection, governance backlog) + trend + PDF/print for board reporting (Modules 1.8 / 7.5 transparency).
- *UI:* Scorecard page with component bars + export. *Backend:* aggregation endpoint.

**GAP-13 — Exam oversight** · Effort **M** · missing-entirely
- *What:* Read-only exam schedule + results-compilation status by class (Module 2.8).
- *UI:* Exam calendar/status board. *Backend:* reuse exam models (school-scoped read).

### P2 — engagement + accountability depth

**GAP-14 — Whistleblower / anonymous-report inbox** · Effort **M** · missing-no-ui
- *What:* Leadership inbox to read anonymous reports + category routing + anonymous follow-up (Module 3.4).
- *Why:* `routes/whistleblower.js` accepts `submit` but exposes **no list/read** — reports go into a void. Needs a read endpoint + principal viewer.
- *UI:* Inbox with category filters, status, reply-to-key. *Backend:* add `GET /api/whistleblower/reports/` (leadership-gated, tenant-scoped) + controller.

**GAP-15 — Internal messaging (principal ↔ staff/parent)** · Effort **L** · missing-entirely
- *What:* Threaded messaging with read receipts (Module 3.2). *UI:* Inbox/thread. *Backend:* new messaging model + endpoints.

**GAP-16 — Real multi-channel stakeholder alerting** · Effort **M** · partial→build
- *What:* On grade approve/publish, notify the *specific* student + parent (not a generic school-wide row), with email/SMS channel (Modules 1.2 / 7.2). *Backend:* target `Notification` by user + hook email/SMS providers.

**GAP-17 — Broaden RBAC / access oversight beyond leadership team** · Effort **M** · partial→build
- *What:* Let the principal view/suspend/force-logout any school staff account and set scheduled-access windows (Modules 1.6 / 1.10). Today `PrincipalUsers` only touches principal/VP rows. *UI:* staff roster with status toggles. *Backend:* scoped user-admin endpoints + session revocation.

**GAP-18 — Benchmarking + configurable dashboards** · Effort **L** · missing-entirely
- *What:* School-vs-district / year-over-year comparison (5.4) and drag-to-arrange widgets (5.3). *Backend:* benchmark aggregation (needs cross-school data via superadmin) + saved layout per user.

---

## 5. Prioritized roadmap table

| ID | Feature | Module | Priority | Effort | Backend exists? |
|----|---------|--------|----------|--------|-----------------|
| GAP-07 | Announcement & event broadcaster | 3.5 | P0 | M | Partial (Notification) |
| GAP-08 | Predictive at-risk panel | 5.1 | P0 | M | Signal only |
| GAP-09 | Teacher-evaluation analytics | 5.2 | P0 | L | No (stub) |
| GAP-06 | Grade forensic-log viewer | 1.3 | P0 | M | **Yes (GradeEvent)** |
| GAP-10 | Budget & expense-approval queue | 4.3 | P1 | M | **Yes (finance.js)** |
| GAP-11 | Student profile drill-down | 2.1 | P1 | M | Reusable |
| GAP-12 | School health scorecard | 1.8/7.5 | P1 | M | Partial |
| GAP-13 | Exam oversight | 2.8 | P1 | M | Reusable |
| GAP-14 | Whistleblower inbox | 3.4 | P2 | M | Partial (submit only) |
| GAP-15 | Internal messaging | 3.2 | P2 | L | No |
| GAP-16 | Real stakeholder alerting | 1.2/7.2 | P2 | M | Partial |
| GAP-17 | Staff-wide RBAC / access oversight | 1.6/1.10 | P2 | M | Partial |
| GAP-18 | Benchmarking + configurable dashboards | 5.3/5.4 | P2 | L | Partial |

---

## 6. Quick wins (backend already there — ship UI only)

1. **GAP-10 expense approval** — `principal` is already in `CAN_APPROVE_EXPENSE`; add a pending-expense list screen.
2. **GAP-01 finance snapshot** — repoint `getFinanceSnapshot` / `FinancePanel` at the live `/api/finance/stats` the principal can already call.
3. **GAP-06 forensic viewer** — the `GradeEvent` chain is fully populated; a read endpoint + timeline unlocks the core anti-corruption promise.

These three convert existing, already-authorized backend capability into visible principal value with no new data model.
