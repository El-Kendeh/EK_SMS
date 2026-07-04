# Principal Dashboard — UI / UX Audit

Dimension: **UI / UX** (layout & hierarchy, states, modals/forms, tables, accessibility, design consistency, mobile responsiveness, fake/stub data, dead controls, upgrade opportunities).
Scope: the 7 principal frontend components + their CSS + the shared `schooladmin/Principal/*` sub-components rendered by the Command Center, and how everything mounts inside the single `SuperadminDashboard` shell.
Method: read the actual source. Every finding cites a concrete file and line/handler.

---

## 1. Inventory & how it mounts

The Principal console is 7 lazy pages, all routed through the single shell `src/components/superadmin/SuperadminDashboard.js`:

| Page (activePage key) | Component | CSS it imports | Mount point |
|---|---|---|---|
| `overview` | `principal/PrincipalHome.js` | `SchoolAdmin.css`, `Principal/Principal.css`, `PrincipalHome.css` | line 1170-1171 (role===principal) |
| `grade-approvals` | `principal/GradeApprovals.js` | `SchoolAdmin.css`, `GradeApprovals.css` | line 1524 (`scoped(...)`) |
| `report-card-approval` | `principal/ReportCardApproval.js` | `SchoolAdmin.css`, `GradeApprovals.css`, `ReportCardApproval.css` | line 1525 |
| `report-cards-published` | `principal/PublishedReportCards.js` | `SchoolAdmin.css`, `GradeApprovals.css`, `ReportCardApproval.css`, `PublishedReportCards.css` | line 1526 |
| `principal-users` | `principal/PrincipalUsers.js` | `SchoolAdmin.css`, `Principal/Principal.css`, `GradeApprovals.css`, `PrincipalUsers.css` | line 1527 |
| `syllabus-progress` | `principal/SyllabusProgress.js` | `SchoolAdmin.css`, `Principal/Principal.css`, `GradeApprovals.css`, `SyllabusProgress.css` | line 1528 |
| `attendance-report` | `principal/AttendanceReport.js` | `SchoolAdmin.css`, `Principal/Principal.css`, `GradeApprovals.css`, `ReportCardApproval.css`, `AttendanceReport.css` | line 1529 |

Sidebar: a purpose-built `PRINCIPAL_NAV_ITEMS` (SuperadminDashboard.js:837-846) grouped into Approvals / Academics / Team, plus a role-aware mobile bottom nav (:1566-1573). The Command Center (`PrincipalHome`) is the visual centerpiece and is well built — 6 KPI cards, a dark "School Health Score" hero with an SVG ring, class-performance, teacher-performance, alerts, AI-insights, finance, quick actions, syllabus summary, and an activity feed. Loading / empty / error states are handled consistently across all 7 pages (`pu-empty` blocks with an icon + title + description, `hourglass_empty` while loading, a distinct error card).

The problems are concentrated in three areas: **stub backend data rendered as if real** (finance + parts of the health score + teacher tiles), a **repeat of the documented "unstyled lazy page" bug** (three pages don't import the CSS that defines the `.pu-*` classes they use), and a **decorative superadmin school-scope picker** that principal pages ignore. Plus the usual polish gaps (confirmations, modal a11y, touch targets, and zero charts on an "executive command center").

---

## 2. Findings

### UI-01 — Financial Snapshot renders stub data as real (always $0 / 0% / empty)
- **Severity:** high
- **Category:** fake-data / broken-or-stub
- **Location:** `src/components/schooladmin/Principal/FinancePanel.jsx` (whole component) fed by `backend_node/src/controllers/principalController.js` → `getFinanceSnapshot` (lines 616-631)
- **Current state:** broken-or-stub (has UI, backend returns hardcoded zeros)
- **Evidence:** `getFinanceSnapshot` returns `{ revenue: 0, outstanding: 0, paymentsToday: 0, transactions: [] }` unconditionally. `FinancePanel` renders these directly: `fmtUsd(data.revenue)` → `$0`, `collectionRate = round(0 / max(1,0)) * 100 = 0%`, "Payments Today" → `0`, and the "Recent Payments" `<ul>` maps an empty array so the section renders as a **dangling header with nothing beneath it** (no empty-state message, unlike every other panel). A principal reading the Command Center sees a school that has collected nothing, ever.
- **Recommendation:** Either wire `getFinanceSnapshot` to real Payment/Fee data (owned by the backend dimension) or, until then, have `FinancePanel` detect the empty/zeroed snapshot and show an honest empty-state ("Finance data not yet connected") instead of confident `$0`/`0%`. Add an empty-state to the Recent Payments list regardless.

### UI-02 — School Health Score & "Financial Status" KPI are partly fabricated
- **Severity:** high
- **Category:** fake-data / broken-or-stub
- **Location:** `src/components/schooladmin/Principal/HealthScoreCard.jsx` (lines 16-31) and `StatsCards.jsx` (the `finance` card, lines 51-59); backend `principalController.js` → `getSchoolCommandDashboard` line 515 (`const finance = 'Stable';`) and line 516 health formula
- **Current state:** partial (academics/attendance are real; finance is a constant)
- **Evidence:** the backend hardcodes `finance = 'Stable'` and computes `healthScore = round(avgAcademic*0.45 + avgAttendance*0.40 + 15)` — finance always contributes a flat **+15 of a possible 15**. In `HealthScoreCard`, `finPct` is derived as `Stable→95`, so the "Finance" breakdown bar is **always 95% green**, and the headline ring is inflated by a constant. `StatsCards` shows "Financial Status: **Stable** — Collections on track" always. This directly contradicts UI-01's `$0 revenue / 0% collection` in the same viewport.
- **Recommendation:** compute `finance` from real collection data, or drop the finance dimension from the health score and the "Financial Status" KPI until it's real. Don't present a constant as a live metric next to a $0 finance panel.

### UI-03 — Teacher Performance tiles "Overloaded" / "Underperforming" are always 0
- **Severity:** medium
- **Category:** fake-data / partial
- **Location:** `src/components/schooladmin/Principal/TeacherPanel.jsx` (tiles, lines 12-37); backend `getTeacherInsights` (`principalController.js` lines 594-614)
- **Current state:** partial (only "Pending Grades" is real; `overloaded` and `underperforming` are hardcoded `0`)
- **Evidence:** `getTeacherInsights` returns `{ overloaded: 0, underperforming: 0, pendingGrades, totalTeachers }`. The panel renders three equal-weight tiles; two are permanently `0` with confident hints ("Teachers with > 28 periods/week", "Class avg below threshold"), implying real analysis that isn't happening.
- **Recommendation:** compute the two metrics (period-load from timetable, class-avg vs threshold from grades) or hide those tiles until backed. At minimum flag them as "not tracked yet" rather than `0`.

### UI-04 — Unstyled-risk: three pages use `.pu-*` classes without importing `Principal.css`
- **Severity:** medium
- **Category:** unstyled-risk (repeat of the documented repo bug)
- **Location:** `principal/GradeApprovals.js` (imports only `SchoolAdmin.css` + `GradeApprovals.css`), `principal/ReportCardApproval.js`, `principal/PublishedReportCards.js`
- **Current state:** works-by-accident
- **Evidence:** all three render `<div className="pu-page ...">`, the `pu-page__head` header, and every loading/empty/error block as `pu-empty` / `pu-empty__title` / `pu-empty__desc`. Those `.pu-*` classes are defined **only** in `schooladmin/Principal/Principal.css` (confirmed: `grep '.pu-page {' / '.pu-empty {'` → 0 hits in `SchoolAdmin.css`, defined in `Principal.css`). None of these three files import `Principal.css`. They only look correct because the Command Center (`PrincipalHome`, which does import `Principal.css`) is the default landing page and its CSS chunk stays in the document. A deep-link / hard refresh directly onto `grade-approvals`, `report-card-approval`, or `report-cards-published` (or any flow where those load before overview) renders the page **unstyled** — the exact failure the CLAUDE.md note warns about ("lazy pages must import the CSS defining their prefixed classes").
- **Recommendation:** add `import '../schooladmin/Principal/Principal.css';` to `GradeApprovals.js`, `ReportCardApproval.js`, and `PublishedReportCards.js`.

### UI-05 — Superadmin school-scope picker is decorative for every principal page
- **Severity:** medium
- **Category:** dead-control / cross-tenant oversight (cross-ref the tenant dimension)
- **Location:** shell `SuperadminDashboard.js` `scoped()` helper (lines 706-710) wrapping principal pages (:1524-1529); the `schoolId` prop threaded into every principal component; `api/adminApi.js` `principalApi.*`; backend `getSchoolFromUser`
- **Current state:** broken (UI present, no effect)
- **Evidence:** for a superadmin the shell wraps these pages in `<SASchoolScope>` (a school-picker), and passes `schoolId={schoolId}` (which is `user?.school_id`, line 460). But **every principal component destructures `schoolId` and never uses it** (`GradeApprovals({ schoolId })`, `AttendanceReport({ schoolId })`, etc. — the prop appears only in the signature). And `principalApi` never sends a `school_id` query param (`listGradeApprovals` sends only `status/class_id/term_id`; the rest send nothing). The backend resolves the school purely from the auth token. So a superadmin picking "School X" in the scope UI changes nothing — the principal endpoints still key off the superadmin's own token (`school_id` null → empty results). The picker implies functionality it doesn't have.
- **Recommendation:** either have `principalApi` forward the selected `school_id` (and the backend honor it for superadmin) so the picker actually scopes the data, or drop the `scoped()` wrapper for principal pages and show an explicit "principal pages are viewed via impersonation" note. Remove the unused `schoolId` prop or make it load-bearing.

### UI-06 — Impactful actions with no confirmation (Publish All, Suspend)
- **Severity:** medium
- **Category:** UX / destructive-action safety
- **Location:** `ReportCardApproval.js` "Publish All Approved" button (line 129-133, `onClick={() => publish([])}`); `PrincipalUsers.js` `toggleActive` (lines 134-149, "Suspend"/"Activate" button lines 298-302)
- **Current state:** works but unsafe
- **Evidence:** "Publish All Approved" publishes every approved report card in the term — a parent/student-facing, hard-to-reverse action — on a single click with **no confirm dialog and no recall/un-publish**. "Suspend" flips a leadership account's access instantly with no confirmation. Notably, the **grade** bulk approve/reject in `GradeApprovals.js` already does this right (a `ga-modal` confirm with an optional comment, lines 183-207) — that pattern should be reused here.
- **Recommendation:** add a confirm modal to "Publish All Approved" (state the count and that it becomes visible to parents/students) and to Suspend/Activate. Consider an un-publish path.

### UI-07 — Leadership status toggle: optimistic flip on an empty PUT
- **Severity:** medium
- **Category:** functional / data-integrity risk
- **Location:** `PrincipalUsers.js` `toggleActive` (lines 134-149)
- **Current state:** fragile contract
- **Evidence:** the toggle calls `principalApi.updatePrincipalUser(user.id, {})` — an **empty body** — then, on success, locally does `is_active: !u.is_active` regardless of what the server actually persisted. If the backend doesn't interpret an empty PUT as "toggle status" (or returns the unchanged record), the card will display the wrong state until a manual reload, and the true server state and the shown state diverge. There's also no per-action loading text on the card beyond the disabled state.
- **Recommendation:** send an explicit `{ is_active: !user.is_active }` and update the card from the server's returned record rather than a blind local invert.

### UI-08 — Touch targets below the mandated 44px on mobile
- **Severity:** low
- **Category:** mobile / accessibility (CLAUDE.md mandates ≥44px)
- **Location:** `GradeApprovals.css` `.ga-icon-btn { width:32px; height:32px }` (lines 262-273) — the comment button and the expand/collapse chevrons in `ReportCardApproval.js` / `PublishedReportCards.js`; `.ga-tab` mobile padding (`10px 8px`, ~38px tall, line 286); raw table checkboxes
- **Current state:** partial (buttons that were explicitly handled — `.pru-card__actions .ga-btn`, `.ga-bulkbar .ga-btn` — correctly get `min-height:44px` at ≤600px; the icon buttons were missed)
- **Evidence:** `.ga-icon-btn` stays 32×32 at every breakpoint; on a phone the primary way to expand a student's report card or open a grade comment is a 32px tap target.
- **Recommendation:** bump `.ga-icon-btn` to ≥40-44px (or add a mobile override), and give `.ga-tab` a `min-height:44px` on mobile.

### UI-09 — Modals lack dialog semantics, focus management, and Escape-to-close
- **Severity:** low
- **Category:** accessibility
- **Location:** all `.ga-modal` overlays — `GradeApprovals.js` (bulk confirm :183, comment :209), `ReportCardApproval.js` (comment :169), `PrincipalUsers.js` (add/edit :186)
- **Current state:** partial
- **Evidence:** the overlay is a bare `<div onClick={close}>` with `e.stopPropagation()` on the inner card. There's no `role="dialog"`, no `aria-modal="true"`, no focus trap, no autofocus on the first field, and no `Escape` key handler. Backdrop-click closes (mouse only); keyboard users can tab out of the dialog into the page behind it. Icons are correctly `aria-hidden`, and form inputs in `PrincipalUsers` have visible `<span>` labels tied via wrapping `<label>` (good).
- **Recommendation:** add `role="dialog" aria-modal="true"`, focus the first control on open, trap focus, and close on `Escape`. A small shared `Modal` wrapper would fix all four dialogs at once.

### UI-10 — No table sorting; inconsistent filter/sort affordances
- **Severity:** low
- **Category:** UX consistency
- **Location:** `GradeApprovals.js` table (:258-318, filters only: status tabs + class + term, no column sort); `AttendanceReport.js` (range dropdown only, no search/sort); vs `SyllabusProgress.js` (sort dropdown) and `PublishedReportCards.js` (search box)
- **Current state:** works, uneven
- **Evidence:** the grade-approvals table can't be sorted by student/total/grade; attendance has no search over classes; two other pages do offer search/sort. Affordances differ page to page.
- **Recommendation:** add sortable headers to the grade-approvals table and a search box to attendance; standardize a filter/search/sort control row across all list pages.

### UI-11 — Two visual languages between the Command Center and the sub-pages
- **Severity:** low
- **Category:** design consistency
- **Location:** `Principal/Principal.css` (`.pu-*` executive cards: 14px radius, dark gradient health hero, hover-lift, KPI tiles) vs `GradeApprovals.css` / `ReportCardApproval.css` (`.ga-*` / `.rca-*` flatter cards using `--ska-radius`, uppercase headline titles)
- **Current state:** cohesive tokens, divergent density
- **Evidence:** they share the `--ska-*` token palette so colors are consistent, but the home page reads as a polished executive dashboard while the approval/report/attendance pages read as plainer admin tables. For a "leadership console" the sub-pages feel a tier below the landing page.
- **Recommendation:** lift the sub-pages toward the `.pu-*` card styling (summary strips as KPI tiles, consistent card chrome, subtle hover) so the whole console feels of one piece.

### UI-12 — Dead component: `QuickActions.jsx` is unused; PrincipalHome re-implements it inline
- **Severity:** low
- **Category:** dead-code / maintainability
- **Location:** `schooladmin/Principal/QuickActions.jsx` and the `PU_QUICK_ACTIONS` constant (`principal.constants.js` :54-59) vs `PrincipalHome.js` inline `PRC_QUICK_ACTIONS` (:22-27) + inline quick grid (:124-142)
- **Current state:** exists-but-unused
- **Evidence:** `PrincipalHome` defines its own `PRC_QUICK_ACTIONS` and renders a hand-rolled `pu-quick` grid rather than importing the shared `QuickActions` component. The shared constant `PU_QUICK_ACTIONS` even points at non-principal targets (`analytics`, `teachers`, `notifications`) that aren't in the principal nav. Duplication invites drift.
- **Recommendation:** delete `QuickActions.jsx` + `PU_QUICK_ACTIONS` if the inline version is canonical, or consolidate onto the shared component with principal-correct targets.

---

## 3. Enhancement opportunities (net-new, to elevate the console)

### E-01 — Zero charts on an "executive command center"
- **Severity:** enhancement
- **Location:** whole console — `PrincipalHome`, `AttendanceReport`, `SyllabusProgress`
- **Rationale:** every "trend" today is a static CSS bar or a single number. There's no time-series anywhere (the SVG ring in `HealthScoreCard` is the only chart). Add: attendance-over-time and academic-average trend lines, KPI-card sparklines, and a class-vs-subject performance heatmap. This is where the plan's analytics/predictive modules should surface for leadership. (Note `Principal.css` already ships a `.pu-modal__trend-bars` mini-bar style — that lives in the school-admin `PrincipalDetails` modal, not the principal console.)

### E-02 — Grade Approvals lacks governance context (old→new diff, requester, reason)
- **Severity:** enhancement
- **Location:** `GradeApprovals.js` table (:258-318)
- **Rationale:** for a grade-**governance** screen it only shows the current CA/Midterm/Final/Total/Grade — not the requested change (old value → new value), who requested it, when, or the justification (the `remarks` are only reachable by opening the comment modal). Add an inline old→new diff, requester + timestamp, the reason, per-row approve/reject (not just bulk), and a drill-through to the immutable grade audit trail.

### E-03 — No print/export and no announcements surface
- **Severity:** enhancement
- **Location:** `PublishedReportCards.js` (no way to open/print an individual card), `AttendanceReport.js` / `SyllabusProgress.js` (no export), Command Center quick actions
- **Rationale:** a principal can't print or export a published report card, an attendance report, or syllabus coverage. There's also no announcement/broadcast entry point in the console (a leadership-relevant plan module). Add per-card PDF/print, CSV/PDF export on the report pages, and a "Send Announcement" quick action.

### E-04 — AttendanceReport has no drill-down or student-level view
- **Severity:** enhancement
- **Location:** `AttendanceReport.js` (:114-136)
- **Rationale:** it lists per-class rates with pills but you can't click into a class to see the roster, chronic-absentee students, or a per-class trend; the range picker is fixed presets only. Add class → student drill-down, an at-risk (chronic absence) list, a custom date range, and a trend line.

---

## 4. What's genuinely good (so it isn't regressed)
- Consistent, well-designed **loading / empty / error** states on all 7 pages (`pu-empty` pattern).
- The **Command Center layout & hierarchy** (KPI row → health hero → two-column analytics → finance/quick-actions → syllabus → activity) is strong.
- **Mobile responsiveness is broadly present**: `Principal.css` collapses `.pu-two-col` at ≤900, the health hero at ≤700, KPI/finance grids via `auto-fit`; `GradeApprovals.css` does a proper table→stacked-card transform at ≤600 with `data-label` pseudo-headers; every principal CSS file has ≤600 rules and most add ≤400/≤360. The only mobile gaps are the sub-44px icon buttons (UI-08).
- **Grade bulk approve/reject** already uses a confirm modal with an optional comment — the right pattern to copy for UI-06.
- Form validation exists in `PrincipalUsers` (required name/email, inline `formError`), and checkboxes carry `aria-label`s.

## 5. Severity roll-up
| Severity | Count | IDs |
|---|---|---|
| critical | 0 | — |
| high | 2 | UI-01, UI-02 |
| medium | 5 | UI-03, UI-04, UI-05, UI-06, UI-07 |
| low | 5 | UI-08, UI-09, UI-10, UI-11, UI-12 |
| enhancement | 4 | E-01, E-02, E-03, E-04 |
