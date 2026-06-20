# Principal Dashboard — Build Plan (Priority #1)

> Goal: replace the 2 placeholder files in `src/components/principal/` with a full Principal dashboard:
> a "command center" home + working grade-approval and report-card workflows + principal-user management.
> Backend is ~90% ready. Start with [06-KNOWN-ISSUES.md](06-KNOWN-ISSUES.md) §1 (route fix) — everything else depends on it.

## Step 0 — Backend fix (do this first)

In `backend_node/src/routes/principal.js`, add the 9 missing routes, importing from `principalController` instead of `financeController`:

```js
const {
  getOverview, listGradeApprovals, reviewGradeChange,
  listReportCards, publishReportCard, commentReportCard,
  getSchoolCommandDashboard, getClassPerformance, getTeacherInsights,
  getFinanceSnapshot, getActivityFeed, getSyllabusProgress,
  getPrincipalUsers, createPrincipalUser, updatePrincipalUser,
} = require('../controllers/principalController');

// existing 6...
router.get('/dashboard/', getSchoolCommandDashboard);
router.get('/class-performance/', getClassPerformance);
router.get('/teacher-insights/', getTeacherInsights);
router.get('/finance-snapshot/', getFinanceSnapshot);
router.get('/activity-feed/', getActivityFeed);
router.get('/syllabus-progress/', getSyllabusProgress);
router.get('/principal-users/', getPrincipalUsers);
router.post('/principal-users/', createPrincipalUser);
router.put('/principal-users/:id/', updatePrincipalUser);
```

This immediately fixes the silent 404s in `PrincipalPage.jsx` (school-admin's existing principal preview) too.

## Step 1 — Extend `principalApi` in `src/api/adminApi.js`

Add (and fix the 3 mismatches from [06-KNOWN-ISSUES.md](06-KNOWN-ISSUES.md) §2):

```js
export const principalApi = {
  overview: () => apiClient.get('/api/principal/overview/'),
  getDashboard: () => apiClient.get('/api/principal/dashboard/'),
  getClassPerformance: () => apiClient.get('/api/principal/class-performance/'),
  getTeacherInsights: () => apiClient.get('/api/principal/teacher-insights/'),
  getFinanceSnapshot: () => apiClient.get('/api/principal/finance-snapshot/'),
  getActivityFeed: () => apiClient.get('/api/principal/activity-feed/'),
  getSyllabusProgress: () => apiClient.get('/api/principal/syllabus-progress/'),

  listGradeApprovals: (params) => apiClient.get('/api/principal/grade-approvals/', { params }),
  reviewGradeChange: ({ gradeIds, action, comment }) =>
    apiClient.post('/api/principal/grade-approvals/', { grade_ids: gradeIds, action, comment }),

  listReportCards: () => apiClient.get('/api/principal/report-cards/'),
  publishReportCards: ({ studentIds, termId }) =>
    apiClient.post('/api/principal/report-cards/', { student_ids: studentIds, term_id: termId }),
  commentReportCard: ({ gradeId, comment }) =>
    apiClient.post('/api/principal/report-cards/comment/', { grade_id: gradeId, comment }),

  getPrincipalUsers: () => apiClient.get('/api/principal/principal-users/'),
  createPrincipalUser: (payload) => apiClient.post('/api/principal/principal-users/', payload),
  updatePrincipalUser: (id, payload) => apiClient.put(`/api/principal/principal-users/${id}/`, payload),
};
```

(Existing buggy `reviewGradeChange`/`publishReportCard`/`commentReportCard` signatures aren't called anywhere yet — safe to replace.)

## Step 2 — `PrincipalContext.js` + `usePrincipalDashboard.js`

Create `src/context/PrincipalContext.js` and `src/hooks/usePrincipalDashboard.js` following the pattern of `TeacherContext`/`useTeacher()`. The hook should fire all of these in parallel on mount:
`overview()`, `getDashboard()`, `getClassPerformance()`, `getTeacherInsights()`, `getFinanceSnapshot()`, `getActivityFeed()`, `getSyllabusProgress()`. Return `{ loading, error, dashboard, classPerf, teacherData, financeData, activityItems, syllabus }`.

## Step 3 — `PrincipalHome.js` (the new dashboard shell)

`src/components/principal/PrincipalHome.js` — model on `TeacherHome.js`'s structure (hooks → state → framer-motion card grid). Props: `navigateTo`, `schoolId`. Sections, mapped to data:

1. **Header / health score card** — `dashboard.healthScore`, `dashboard.totalStudents`, `totalTeachers`, `totalClasses`, `avgAcademic`, `avgAttendance`.
2. **Alert strip** — derived from `dashboard.totalGradeMods`, `totalAtRisk`, `totalFinAnom`, `totalLowAttend` (e.g. "3 grade modifications pending review", "2 classes below 80% attendance").
3. **Class performance** — `classPerf.top[]` / `classPerf.low[]` (name, score, studentCount) — two small ranked lists ("Top performing classes" / "Classes needing attention").
4. **Teacher insights** — `teacherData.overloaded`, `underperforming`, `pendingGrades`, `totalTeachers` — quick-glance cards + link to `/api/school/teachers/`.
5. **Finance snapshot** — `financeData.revenue`, `outstanding`, `paymentsToday`, `transactions[]` (last few). Link through to the Finance dashboard if the principal also has access.
6. **Syllabus progress** — `syllabus.subjects[]` (name, code, pct, pending/total topics) — progress bars per subject.
7. **Activity feed** — `activityItems[]` (kind, text, at) — recent events list.
8. **Quick actions** — buttons to navigate to: Grade Approvals, Report Card Approval, Principal Users, Syllabus Progress (full page).

## Step 4 — Wire into `SuperadminDashboard.js`

- Import `PrincipalHome`.
- At `activePage === 'overview'` (line ~765), branch: `user?.role === 'principal' ? <PrincipalHome navigateTo={goTo} schoolId={schoolId} /> : <SAOverview .../>`.
- Add new `ALL_NAV_ITEMS` entries (and `permissions.js` `canAccess()` rules, role: `ROLES.PRINCIPAL`, also allow `SUPERADMIN`/`SCHOOL_ADMIN` to preview if desired):
  - `principal-overview` (or reuse `'overview'`)
  - `grade-approvals` (already exists)
  - `report-card-approval` (already exists)
  - `principal-users` (new)
  - `syllabus-progress` (new — full-page version of the dashboard widget)

## Step 5 — Replace `GradeApprovals.js` stub

Full implementation:
- Filters bar: status (pending/approved/rejected), class, term — calls `principalApi.listGradeApprovals(params)`.
- Table: student name, admission #, subject, class, term, CA/Midterm/Final/Total, grade letter, status, submitted-by/date.
- Multi-select checkboxes → bulk **Approve** / **Reject** (with optional comment) → `principalApi.reviewGradeChange({ gradeIds, action, comment })`.
- Per-row "comment" action → `principalApi.commentReportCard` (note: backend's `commentReportCard` takes `grade_id` — usable for grade-level comments too, confirm against controller before relying on it for non-report-card grades).
- Show `counts.pending/approved/rejected` as summary chips.

## Step 6 — Replace `ReportCardApproval.js` stub

- Term selector (default to `report_cards[].term`/`term_id` from `listReportCards()`).
- List/expand report cards per student; show `approved_count`/`total_count` summary.
- "Publish" action for selected students → `principalApi.publishReportCards({ studentIds, termId })`.
- Per-grade comment → `principalApi.commentReportCard({ gradeId, comment })`.

## Step 7 — `PrincipalUsers.js` (new page, medium priority)

Table of `getPrincipalUsers()` results (name, email, phone, role, access_level, active/inactive) with **Add** (`createPrincipalUser`) and **Edit/toggle-active** (`updatePrincipalUser`) — can mirror `src/components/schooladmin/Principal/PrincipalPage.jsx`'s existing form components (`AddPrincipalForm.jsx`, `PrincipalCard.jsx`, etc. in that folder) for UI consistency, but place the principal-self-service version under `src/components/principal/`.

## Step 8 — Syllabus Progress full page (lower priority)

`src/components/principal/SyllabusProgress.js` — `syllabus.subjects[]` as a sortable/filterable table with progress bars, filter by class/term if the endpoint supports it (check controller for query params not yet documented).

## CSS / responsiveness
New files: `PrincipalHome.css`, `GradeApprovals.css`, `ReportCardApproval.css`, `PrincipalUsers.css`, `SyllabusProgress.css`. Every file needs `@media (max-width: 600px)` rules — stacked layout, full-width buttons, scrollable tables (per root project memory mobile-responsiveness rule).
