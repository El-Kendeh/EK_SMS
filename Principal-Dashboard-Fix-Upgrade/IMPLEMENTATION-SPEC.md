# Principal Dashboard — Implementation Spec (Fix + Upgrade)

**Date:** 2026-07-03
**Source audits:** `Principal-Dashboard-Fix-Upgrade/00-INDEX.md` (+ section files 01–06). This spec is self-contained; audit IDs are cited for traceability only.
**Verdict being fixed:** NO-SHIP — 1 critical (create-principal lockout) + fabricated finance/health/teacher data + non-functional Leadership-Team RBAC.

---

## 0. Ground rules & environment

- **Project root:** `c:/Users/ishma/Videos/newworld/elken-recent/EK_SMS`
- **Frontend:** `EK_SMS/src` (React 19 CRA). **Backend:** `EK_SMS/backend_node/src` (Express/Sequelize, MySQL, tables `pruh_*`).
- **Run:** backend `cd EK_SMS/backend_node && npm start`; frontend `cd EK_SMS && npm start` → http://localhost:3000.
- **DO NOT modify** collaborator files `src/components/superadmin/Dashboard.js` and `src/components/schooladmin/dashboard.js`. **`src/components/superadmin/SuperadminDashboard.js` is NOT that file** — it is the role-routing shell we own; principal nav (`PRINCIPAL_NAV_ITEMS`), render blocks, and `HANDLED_PAGES` live there and MUST be edited for Batch 3 (exact edits below, keep them additive and localized).
- **Mobile responsiveness is mandatory** on anything new: `@media (max-width:600px)`, plus 400/360 where layouts break; touch targets ≥44px; tables horizontally scrollable inside their own container.
- **Never fabricate data in UI** — every widget must either show real backend data or an honest empty state.
- **Prod DB sync is OFF.** Every migration in this spec must ALSO be run manually on prod; add it to the pending-prod-migrations list. Migration files go in `backend_node/migrations/` (naming convention: `YYYY-MM-DD-slug.sql`).
- **No new npm packages.** `package.json` has no chart library — all charts are hand-rolled SVG/CSS (see `HealthScoreCard.jsx` ring, `.pu-finance__bar-track` bars). Keep it that way.
- **CSS-import gotcha (standing repo bug):** lazily-loaded pages must import every CSS file that defines their prefixed classes. `.pu-*` classes are defined ONLY in `src/components/schooladmin/Principal/Principal.css`.

### Key file map

| Concern | Path |
|---|---|
| Principal backend controller (16 handlers) | `backend_node/src/controllers/principalController.js` |
| Principal routes | `backend_node/src/routes/principal.js` |
| Finance routes (principal already authorized) | `backend_node/src/routes/finance.js` |
| Grade audit chain util | `backend_node/src/utils/gradeEvent.js` |
| Models | `backend_node/src/models/{SchoolAdmin,User,Grade,GradeEvent,Payment,Fee,Expense,Term,TimetableSlot,ClassSubject,Notification,Attendance,Student,Teacher}.js` |
| Principal pages (7) | `src/components/principal/{PrincipalHome,GradeApprovals,ReportCardApproval,PublishedReportCards,PrincipalUsers,AttendanceReport,SyllabusProgress}.js` (+ matching `.css`) |
| Command-center panels | `src/components/schooladmin/Principal/{StatsCards,HealthScoreCard,FinancePanel,TeacherPanel,ClassPerformance,AlertsPanel,InsightsPanel,ActivityFeed,QuickActions}.jsx`, `principal.constants.js`, `principal.utils.js`, `Principal.css` |
| Principal API client | `src/api/adminApi.js` (`export const principalApi`, lines 51–110) |
| Dashboard data hook + context | `src/hooks/usePrincipalDashboard.js`, `src/context/PrincipalContext.js` |
| Role shell (nav + routing) | `src/components/superadmin/SuperadminDashboard.js` |
| Page permissions | `src/config/permissions.js` |
| Bursar reuse targets | `src/components/bursar/{Expenses,Reports}.js`, `src/api/financeApi.js`, `src/components/bursar/bursar.utils.js` |
| Superadmin scope picker | `src/components/superadmin/SASchoolScope.js`; auto-append of `?school_id=` in `src/api/client.js` lines 87–96 |

### How tenant scoping already works (do not re-invent)

- `backend_node/src/middleware/schoolScope.js`: non-superadmin → `req.schoolId = req.user.school_id`; superadmin → honors `?school_id=` query param.
- `src/api/client.js` (lines 87–96) auto-appends `?school_id=<sessionStorage['ek-sms-sa-school-id']>` to every `/api/principal|finance|school/*` call for the shell's SASchoolScope selection, and `SASchoolScope.js` remounts children (`key={schoolId}`) on change. So superadmin scoping mostly works end-to-end already; the fixes below only tighten error responses (BE-15) and remove dead props.
- `requireActiveAccount` middleware gates every `/api/principal/*` request on **`User.is_active`** — this is why the `SchoolAdmin.is_active` writes in the current controller revoke nothing.

---

# BATCH 1 — Ship-blockers (do first)

## 1.1 WR-01 + BE-10 — Fix create-principal lockout, harden provisioning `S`

**File:** `backend_node/src/controllers/principalController.js`, `createPrincipalUser` (lines 359–394).

**Current defects:**
- `User.create(...)` (lines 371–379) omits `is_active`; `User.js:22` defaults `is_active:false`; login (`authController.js:96`) and `requireActiveAccount` block inactive users → every UI-created principal is permanently locked out while the API returns "Principal created".
- Default password is the static literal `'Principal@123'` (line 367) with no forced rotation.
- No uniqueness pre-check: a duplicate email/username hits the DB unique constraint and surfaces as a generic 500 "Failed to create principal".
- `User.create` + `SchoolAdmin.create` are not in a transaction → a failure on the second insert orphans a `users` row (and the email is then permanently "taken").

**Target implementation (replace the function body):**

```js
async function createPrincipalUser(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const { full_name, email, phone, username, password, role, access_level } = req.body;
    if (!full_name?.trim() || !email?.trim()) {
      return res.status(400).json(errorResponse('full_name and email are required'));
    }
    const uname = (username || email).trim();

    // Uniqueness pre-check → 409, not a generic 500 (BE-10)
    const clash = await User.findOne({
      where: { [Op.or]: [{ username: uname }, { email: email.trim() }] },
    });
    if (clash) {
      return res.status(409).json(errorResponse(
        clash.email === email.trim()
          ? 'A user with this email already exists'
          : 'This username is already taken'));
    }

    // Password policy: caller supplies a strong password, or we mint a random
    // temp password and force rotation at first login (BE-10).
    let tempPassword = null;
    let pw = password;
    if (!pw) {
      tempPassword = generateTempPassword();
      pw = tempPassword;
    } else if (String(pw).length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) {
      return res.status(400).json(errorResponse('Password must be at least 8 characters and contain letters and numbers'));
    }

    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(pw, 10);
    const { requireRoleId } = require('../utils/roleIds');
    const principalRoleId = await requireRoleId('principal');

    const { user, admin } = await sequelize.transaction(async (t) => {
      const user = await User.create({
        username: uname,
        email: email.trim(),
        phone,                               // persists once users.phone exists (1.3)
        password: hashedPassword,
        first_name: full_name.split(' ')[0] || '',
        last_name: full_name.split(' ').slice(1).join(' ') || '',
        role_id: principalRoleId,
        is_active: true,                     // WR-01: school is already approved
      }, { transaction: t });
      const admin = await SchoolAdmin.create({
        school_id: school.id,
        user_id: user.id,
        role: role || 'Principal',           // real columns after migration 1.3
        access_level: access_level || 'Full',
        is_active: true,
        must_change_password: !password,     // login already surfaces this flag (authController.js:175)
      }, { transaction: t });
      return { user, admin };
    });

    return res.json(successResponse({
      id: admin.id,
      username: user.username,
      temp_password: tempPassword,           // null when the caller supplied one
      must_change_password: !password,
    }, 'Principal created'));
  } catch (err) {
    console.error('createPrincipalUser Error:', err);
    return res.status(500).json(errorResponse('Failed to create principal'));
  }
}
```

Add near the top of the file:

```js
const crypto = require('crypto');
const generateTempPassword = () =>
  'Ek1!' + crypto.randomBytes(6).toString('base64url'); // 12 chars, letters+digits+symbol
```

**Frontend — surface the temp password.** `src/components/principal/PrincipalUsers.js`:
- Current success path (lines 119–126) shows a 4-second toast, which would swallow a temp password. On create success, when `res.temp_password` is truthy, open a **persistent** "Account created" modal (do NOT auto-dismiss) showing `res.username` + `res.temp_password`, a copy-to-clipboard button, and the line "They must change this password at first login." Reuse the existing `ga-modal-overlay`/`ga-modal` markup; new state `const [createdCreds, setCreatedCreds] = useState(null)`.
- Surface 409s: `res.message` already lands in `setFormError` — no change needed beyond confirming it renders (it does, line 191).
- Update the password placeholder at line 234 from `"defaults to Principal@123"` to `"leave blank to auto-generate"`.

**Regression check (must be run before claiming done):**
1. As a principal, POST `/api/principal/principal-users/` with a new email, no password → response contains `temp_password`.
2. POST `/api/auth/login/` (check exact login route in `routes/auth.js`) with the new username + temp password → login succeeds and the payload carries `must_change_password: true`.
3. Repeat step 1 with the same email → 409 with the specific message.

## 1.2 WR-02 — Make Suspend/Activate actually revoke access `S–M`

**File:** `backend_node/src/controllers/principalController.js`, `updatePrincipalUser` (lines 396–440); FE `src/components/principal/PrincipalUsers.js` `toggleActive` (lines 134–149).

**Current defects:** the empty-body "legacy toggle" (lines 409–413) flips `SchoolAdmin.is_active` — a column that does not exist on the model (silently dropped by Sequelize) — and never touches `User.is_active`, the flag login + `requireActiveAccount` actually gate on. The FE then optimistically flips local state, so suspension is pure theater.

**Target backend:** inside `updatePrincipalUser`, whenever an active-state change is requested (explicit `is_active` in body, or the legacy empty-body toggle), update **both** rows in one transaction and return the persisted state:

```js
const targetActive = hasProfileChanges
  ? (is_active !== undefined ? !!is_active : undefined)
  : !(admin.is_active !== false); // legacy empty-body toggle

if (targetActive !== undefined) {
  if (String(admin.user_id) === String(req.user?.id) && targetActive === false) {
    return res.status(400).json(errorResponse('You cannot suspend your own account'));
  }
  await sequelize.transaction(async (t) => {
    await admin.update({ is_active: targetActive }, { transaction: t });
    await User.update({ is_active: targetActive }, { where: { id: admin.user_id }, transaction: t });
  });
}
// ...profile-field updates as today (role/access_level now persist after 1.3)...
return res.json(successResponse(
  { id: admin.id, is_active: admin.is_active !== false },
  targetActive === undefined ? 'Member updated' : (targetActive ? 'Member activated' : 'Member suspended')
));
```

Keep the WR-04 guard from item 2.4 in mind: once 2.4 lands, this handler must refuse to operate on the school_admin's own row. If 1.2 ships before 2.4, add the guard here directly (see 2.4 code) — a principal must never be able to lock out the school administrator.

**Target frontend (`toggleActive`):** send the explicit body and trust the server:

```js
const res = await principalApi.updatePrincipalUser(user.id, { is_active: !user.is_active });
if (res?.success === false) { ...error feedback... }
else {
  setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, is_active: res.is_active } : u)));
  setFeedback({ type: 'success', msg: res.message || 'Status updated' });
}
```

Also add the confirmation dialog (spec in 2.5) before calling — implement both together.

**Regression check:** suspend a member → their next API call returns 403 `ACCOUNT_INACTIVE` and their login is refused; activate → restored.

## 1.3 FC-03 — Real `role` / `access_level` / `is_active` columns + `users.phone` `M`

**Current defect:** `SchoolAdmin.js` defines only `user_id`, `school_id`, `must_change_password` (lines 6–20). The controller reads/writes `role`, `access_level`, `is_active` — all silently dropped, so every member forever renders "Principal / Full / Active". `users` has no `phone` column, so the form's phone is discarded too (`getPrincipalUsers` line 336 comment).

**Decision on phone:** ADD `phone` to `users` (nullable). Rationale: `createPrincipalUser` and `createFinanceUser` both already try to write it, the Leadership/Finance-team forms both collect it, and CorePrincipal's `phone_number` is not on the identity path. This is a shared-table migration — coordinate with any bursar/finance track doing the same (apply once).

**Migration file:** `backend_node/migrations/2026-07-03-leadership-columns-and-user-phone.sql`

```sql
-- Principal Leadership Team: persist role/access_level/is_active on the
-- SchoolAdmin link row (they were silently dropped before), and give users
-- a phone column (Leadership + Finance-team forms collect one).
-- NOTE: prod sync is OFF — run this manually on prod.

ALTER TABLE pruh_core_schooladmin
  ADD COLUMN role VARCHAR(50) NULL AFTER must_change_password,
  ADD COLUMN access_level VARCHAR(20) NULL AFTER role,
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER access_level;

ALTER TABLE users
  ADD COLUMN phone VARCHAR(20) NULL AFTER last_name;
```

(`role`/`access_level` stay NULLable: existing rows include the actual school_admin account, which must not be mislabeled "Principal"; the controller already falls back with `a.role || 'Principal'` on read.)

**Model edits:**
- `backend_node/src/models/SchoolAdmin.js` — add:
  ```js
  role: { type: DataTypes.STRING(50), allowNull: true },
  access_level: { type: DataTypes.STRING(20), allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  ```
- `backend_node/src/models/User.js` — add after `last_name`:
  ```js
  phone: { type: DataTypes.STRING(20), allowNull: true },
  ```

**Controller read path:** `getPrincipalUsers` (lines 329–357): add `'phone'` to the User `attributes` array (line 336). `phone: a.user?.phone` (line 344) then works. Drop the stale comment. `created_at` on line 349 is always undefined (`timestamps:false`) — remove the field or return `null` explicitly.

**FE:** no change needed — `PrincipalUsers.js` already sends and renders these fields; they simply start persisting.

**Update `pending-prod-migrations`** memory/docs with this file.

## 1.4 FC-05 / UI-01 — Real Financial Snapshot (or honest empty state) `M`

**Backend — `getFinanceSnapshot` (`principalController.js` lines 616–631).** Currently returns hardcoded `{revenue:0, outstanding:0, paymentsToday:0, transactions:[]}`.

**Target:** real Sequelize aggregates over `Payment` (`pruh_finance_payment`) and `Fee` (`pruh_finance_fee`), scoped by school + active term:

```js
async function getFinanceSnapshot(req, res) {
  try {
    const school = await getSchoolFromUser(req);
    if (!school) return res.status(401).json(errorResponse('Not authenticated'));

    const Payment = require('../models/Payment');
    const Fee = require('../models/Fee');
    const activeTerm = await Term.findOne({ where: { school_id: school.id, is_active: true } });

    const feeWhere = { school_id: school.id, ...(activeTerm ? { term_id: activeTerm.id } : {}) };
    const payWhere = {
      school_id: school.id, status: 'completed',
      ...(activeTerm?.start_date ? { paid_at: { [Op.gte]: activeTerm.start_date } } : {}),
    };

    const [revenue, totalDue, totalPaid] = await Promise.all([
      Payment.sum('amount', { where: payWhere }),
      Fee.sum('amount_due', { where: feeWhere }),
      Fee.sum('amount_paid', { where: feeWhere }),
    ]);
    const outstanding = Math.max(0, (totalDue || 0) - (totalPaid || 0));

    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const paymentsToday = await Payment.count({
      where: { school_id: school.id, status: 'completed', paid_at: { [Op.gte]: startOfDay } },
    });

    // Recent payments — 2-step (no Payment→Student association exists)
    const recent = await Payment.findAll({
      where: { school_id: school.id, status: 'completed' },
      order: [['paid_at', 'DESC']], limit: 5,
    });
    const studentIds = [...new Set(recent.map(p => p.student_id).filter(Boolean))];
    const students = studentIds.length ? await Student.findAll({
      where: { id: studentIds },
      include: [{ model: User, as: 'user', attributes: ['first_name', 'last_name'] }],
    }) : [];
    const nameById = Object.fromEntries(students.map(s =>
      [s.id, `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.trim() || `Student #${s.id}`]));

    const feeCount = await Fee.count({ where: { school_id: school.id } });
    const hasData = feeCount > 0 || recent.length > 0;
    const collectionRate = (totalDue || 0) > 0
      ? Math.round(((totalPaid || 0) / totalDue) * 100) : null;

    return res.json(successResponse({
      revenue: Math.round((revenue || 0) * 100) / 100,
      outstanding: Math.round(outstanding * 100) / 100,
      paymentsToday,
      collection_rate: collectionRate,
      term: activeTerm?.name || null,
      has_data: hasData,
      transactions: recent.map(p => ({
        label: `${nameById[p.student_id] || 'Payment'}${p.payment_method ? ` · ${p.payment_method}` : ''}`,
        at: p.paid_at,
        amount: p.amount,
      })),
    }));
  } catch (err) { /* as today */ }
}
```

**Frontend — `src/components/schooladmin/Principal/FinancePanel.jsx`:**
- When `data.has_data === false`: render the card head + a `pu-empty`-style block: "No finance records yet — figures appear once the bursar assigns fees and records payments." Do NOT render `$0` KPIs or the collection bar.
- When `data.transactions.length === 0` (but has_data): under the "Recent Payments" heading render "No payments recorded yet" instead of a dangling empty `<ul>`.
- Collection bar: use `data.collection_rate` from the server (component-side recompute at lines 12–14 can stay as fallback when `collection_rate == null`); show "—" when null.
- Sub-header "This term" → `data.term ? \`Term: ${data.term}\` : 'No active term'`.
- Humanize `t.at` with the `timeAgo` helper from 2.9c.
- **Currency (GAP-05):** add to `src/components/schooladmin/Principal/principal.utils.js`:
  ```js
  export const fmtLrd = (n) => 'L$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  ```
  and use it in FinancePanel in place of `fmtUsd`. Leave `fmtUsd` exported (other consumers) but grep for remaining uses.
- The hook default at `PrincipalHome.js:42` (`financeData || { revenue: 0, ... }`) must become `financeData || { has_data: false, transactions: [] }` so the pre-load state is the empty state, not fake zeros.

## 1.5 UI-02 / GAP-03 — De-fabricate the health score & Financial-Status KPI `S–M`

**Backend — `getSchoolCommandDashboard` (`principalController.js` lines 497–557).** Lines 515–516 are the offenders: `const finance = 'Stable'; const healthScore = Math.round(avgAcademic*0.45 + avgAttendance*0.40 + 15);`

**Target:** compute the finance dimension from the same Fee aggregates as 1.4, and reweight when there is no finance data:

```js
const Fee = require('../models/Fee');
const activeTerm = await Term.findOne({ where: { school_id: school.id, is_active: true } });
const feeWhere = { school_id: school.id, ...(activeTerm ? { term_id: activeTerm.id } : {}) };
const [finDue, finPaid] = await Promise.all([
  Fee.sum('amount_due', { where: feeWhere }),
  Fee.sum('amount_paid', { where: feeWhere }),
]);
const financeRate = (finDue || 0) > 0 ? Math.round(((finPaid || 0) / finDue) * 100) : null;
const finance = financeRate == null ? null
  : financeRate >= 80 ? 'Stable'
  : financeRate >= 60 ? 'Needs Attention'
  : 'Critical';
const healthScore = financeRate == null
  ? Math.round(avgAcademic * 0.55 + avgAttendance * 0.45)          // reweighted, no fabricated 15
  : Math.round(avgAcademic * 0.45 + avgAttendance * 0.40 + financeRate * 0.15);
```

Add `financeRate` to the response payload (keep `finance` for compatibility — now possibly `null`).

**Frontend:**
- `StatsCards.jsx` (lines 51–59): when `summary.finance == null` → `value: 'No data'`, `sub: 'Assign fees to see status'`, neutral styling (fall back to the existing structure with a muted color instead of `PU_FINANCE_STYLE.Stable` green). Guard `PU_FINANCE_STYLE[summary.finance]` lookup (line 14) against null.
- `HealthScoreCard.jsx` (lines 18–31): replace the hardcoded `finPct` mapping (`Stable→95` etc.) with `summary.financeRate`; when `null`, render the finance bar at width 0 with `displayValue: 'No data'` and a muted color, and change the sub copy (line 66) to "Score combines academics (55%) and attendance (45%) — finance joins once fee data exists." when finance is null.
- `PrincipalHome.js` line 37 default `finance: 'Stable'` → `finance: null`; line 81 insight `if (summary.finance !== 'Stable')` → `if (summary.finance && summary.finance !== 'Stable')`.
- `principal.constants.js` `PU_FINANCE_STYLE`: add a `'No data'`/null-safe entry or handle in components.

## 1.6 GAP-02 — Real teacher-insights (overloaded / underperforming) `M`

**Backend — `getTeacherInsights` (`principalController.js` lines 594–614).** `overloaded: 0, underperforming: 0` are literals under authoritative UI copy ("> 28 periods/week", "Class avg below threshold" — `TeacherPanel.jsx` lines 12–37).

**Target:**

```js
const TimetableSlot = require('../models/TimetableSlot');
const ClassSubject = require('../models/ClassSubject');
const MAX_PERIODS_PER_WEEK = 28;
const UNDERPERFORM_THRESHOLD = 50;

// Overloaded: distinct teachers with more than 28 non-break slots/week
const slotCounts = await TimetableSlot.findAll({
  attributes: ['teacher_id', [sequelize.fn('COUNT', sequelize.col('id')), 'periods']],
  where: { school_id: school.id, is_break: false, teacher_id: { [Op.ne]: null } },
  group: ['teacher_id'], raw: true,
});
const hasTimetable = slotCounts.length > 0;
const overloaded = hasTimetable
  ? slotCounts.filter(r => Number(r.periods) > MAX_PERIODS_PER_WEEK).length
  : null; // honest "no data" — timetable not generated yet

// Underperforming: teachers whose taught class-subject average is below threshold
const [underRows] = await sequelize.query(`
  SELECT cs.teacher_id, AVG(g.total) AS avg_total
  FROM pruh_core_class_subject cs
  JOIN pruh_core_grade g
    ON g.subject_id = cs.subject_id AND g.classroom_id = cs.class_id
  WHERE g.school_id = :schoolId AND g.total IS NOT NULL AND cs.teacher_id IS NOT NULL
  GROUP BY cs.teacher_id
`, { replacements: { schoolId: school.id } });
const hasGrades = underRows.length > 0;
const underperforming = hasGrades
  ? underRows.filter(r => Number(r.avg_total) < UNDERPERFORM_THRESHOLD).length
  : null;
```

Response: `{ overloaded, underperforming, pendingGrades, totalTeachers, has_timetable: hasTimetable, has_grades: hasGrades, max_periods: 28, threshold: 50 }`.

**Frontend — `TeacherPanel.jsx`:** for each tile, when `value == null` render `—` and swap the hint to `'No timetable data yet'` / `'No grade data yet'`. `PrincipalHome.js` line 41 default `{ overloaded: 0, ... }` → `{ overloaded: null, underperforming: null, pendingGrades: 0, totalTeachers: 0 }`.

## 1.7 UI-04 — Import `Principal.css` on the 3 unstyled-risk pages `S`

Add `import '../schooladmin/Principal/Principal.css';` (after the `SchoolAdmin.css` import) to:
- `src/components/principal/GradeApprovals.js` (currently imports only `SchoolAdmin.css` + `GradeApprovals.css`)
- `src/components/principal/ReportCardApproval.js`
- `src/components/principal/PublishedReportCards.js`

All three render `.pu-page`/`.pu-empty` classes defined only in `Principal.css`; today they work only because `PrincipalHome` loaded it first. Verify by hard-refreshing directly on `grade-approvals` as a principal.

---

# BATCH 2 — Contract, RBAC & UX fixes

## 2.1 FC-06 — Persist the approve/reject rationale `S`

`principalController.js` `reviewGradeChange` (lines 128–182): the `comment` from the FE bulk modal (`GradeApprovals.js` lines 184–199 sends it) is destructured then dropped. Inside the existing transaction loop, when `comment?.trim()`:

```js
const stamp = `[${new Date().toISOString()}] ${action === 'approve' ? 'Approved' : 'Rejected'} by ${req.user?.username || 'principal'}: ${comment.trim()}`;
await g.update({ remarks: g.remarks ? `${g.remarks}\n${stamp}` : stamp }, { transaction: t });
```

(matches the `commentReportCard` remarks format, lines 315–318). Do NOT add a column to `GradeEvent` — its hash payload is fixed (see `utils/gradeEvent.js:36-43`); the remarks row plus the existing event is the auditable record.

## 2.2 FC-07 — Make publish state visible; fix Published list filter `S–M`

- `src/components/principal/PublishedReportCards.js` line 30: `(res.report_cards || []).filter(rc => rc.approved)` → `.filter(rc => rc.published)`. The backend already computes per-student `published` from `Grade.is_published` (`principalController.js` lines 209–239).
- `src/components/principal/ReportCardApproval.js`:
  - Badge block (lines ~239–240): three-state — `rc.published` → `ga-badge--approved` "Published"; else `rc.approved` → "Ready to publish"; else `ga-badge--pending` "Pending approvals".
  - Disable/hide the per-row and bulk publish controls for students whose `rc.published` is already true (backend skips them anyway via `is_published:false` filter — this is honesty, not safety).
  - After a successful publish, call the existing `load()` so badges flip (verify it already does; if it only sets feedback, add the reload).

## 2.3 WR-03 — Tighten backend read gates `S`

`backend_node/src/routes/principal.js`: `PRINCIPAL_ACCESS` (line 21) includes `school_admin` for ALL reads, but `permissions.js` gives school_admin no grade-governance or leadership pages. Keep `school_admin` ONLY where the school-admin console legitimately reuses the endpoint (`attendance-report`, `syllabus-progress`, `report-cards` list for the Published page, `overview` if SchoolAdminHome consumes it — grep before removing). Concrete edit:

```js
const PRINCIPAL_ACCESS = ['superadmin', 'school_admin', 'principal']; // shared reads
const PRINCIPAL_ONLY_READ = ['superadmin', 'principal'];              // governance reads
...
router.get('/grade-approvals/', requireRole(PRINCIPAL_ONLY_READ), listGradeApprovals);
router.get('/principal-users/', requireRole(PRINCIPAL_ONLY_READ), getPrincipalUsers);
```

(Route-level `requireRole` stacks on the router-level default — the stricter one wins because both run.) Leave every other GET as-is.

## 2.4 WR-04 / FC-04 — Leadership listing/CRUD must exclude the school_admin account `M`

`principalController.js`:
- `getPrincipalUsers`: include the user's role and filter out tenant admins:
  ```js
  include: [{ model: User, as: 'user', attributes: ['id','username','first_name','last_name','email','phone'],
              include: [{ model: Role, as: 'role', attributes: ['code'] }] }],
  ```
  then `admins.filter(a => !['school_admin','schooladmin'].includes(a.user?.role?.code))`. (Role codes: `User.js:41` uses `'schooladmin'`; JWT role strings use `'school_admin'` — match both.) Requires `const Role = require('../models/Role');`. If the default scope on User already includes role, the extra include is redundant — verify and use whichever loads `user.role.code`.
- `updatePrincipalUser`: after loading `admin`, load its user (with role) and return `403 'The school administrator account cannot be managed from Leadership Team'` when the target's role code is school_admin/schooladmin.

## 2.5 UI-06 — Confirmations for Publish-All and Suspend `S`

- `ReportCardApproval.js`: "Publish All Approved" (lines 129–131) and "Publish Selected" (161–163) currently fire immediately. Add a confirm modal (same `ga-modal-overlay`/`ga-modal` pattern as GradeApprovals' `bulkPrompt`, lines 184–199): title "Publish report cards?", body "This releases N report card(s) for TERM to parents and students. Published cards cannot be silently retracted.", buttons Cancel / "Publish". State: `const [confirmPublish, setConfirmPublish] = useState(null) // null | { studentIds }`.
- `PrincipalUsers.js`: wrap `toggleActive` in a confirm modal: "Suspend NAME? They will immediately lose access to EK-SMS." / "Activate NAME?".
- Once 2.6 lands, both use the shared `Modal`.

## 2.6 UI-09 — Shared accessible Modal wrapper `M`

New file `src/components/principal/Modal.js` (+ nothing new in CSS — reuse `ga-modal*` classes):

```jsx
// Accessible modal: role="dialog", aria-modal, labelled title, focus trap,
// Escape-to-close, focus restore. Children render inside .ga-modal.
export default function Modal({ title, onClose, children, className = '' }) { ... }
```

Requirements: `role="dialog" aria-modal="true" aria-labelledby={titleId}`; on mount focus the first focusable element (or the dialog itself with `tabIndex={-1}`); trap Tab/Shift-Tab within; `keydown` Escape → `onClose`; on unmount restore focus to the previously focused element; overlay click closes (existing behavior).

Refactor to use it: `GradeApprovals.js` bulk-comment modal (line 184) + comment modal (line 209); `PrincipalUsers.js` add/edit form modal (line 186) + the new confirm + credentials modals; `ReportCardApproval.js` new publish confirm. Keep inner markup/classes unchanged.

## 2.7 WR-05 / FC-10 — Delete the dead PrincipalContext `S–M`

**Decision: DELETE (do not lift).** The provider is mounted inside `PrincipalHome` (lines 192–198) so its "cache" dies with the page; no sibling page consumes it; lifting it into the shell would add principal-only state to a shared file for no measurable win.

- `src/hooks/usePrincipalDashboard.js`: replace the `usePrincipal()` destructuring with local `useState` for `dashboard/classPerf/teacherData/financeData/activityItems/syllabus/loaded`; delete the context import. Behavior is identical (state was already per-mount).
- `src/components/principal/PrincipalHome.js`: remove the `PrincipalProvider` import and wrapper; export `PrincipalHomeInner` directly as default.
- Delete `src/context/PrincipalContext.js` after `grep -rn "PrincipalContext\|usePrincipal\b" src` shows no remaining consumers.

## 2.8 UI-05 / BE-15 — School-scope picker honesty + correct status codes `S–M`

The heavy lifting already exists (client auto-append + `schoolScope` middleware + SASchoolScope remount — see §0). Remaining:
- **BE-15:** in `principalController.js`, every handler starts with `if (!school) return res.status(401).json(errorResponse('Not authenticated'))`. A superadmin without `?school_id` is authenticated — the 401 also trips the client's logout heuristics. Add one helper and use it in all 16 handlers:
  ```js
  function schoolOr400(req, res) {
    // sync wrapper around getSchoolFromUser for the common case
  }
  ```
  Concretely: keep `getSchoolFromUser`, and where it returns null, respond
  `req.user?.role === 'superadmin' ? res.status(400).json(errorResponse('school_id query parameter is required'))
   : res.status(401).json(errorResponse('Not authenticated'))`.
- **Dead prop cleanup:** the 7 principal components all accept `schoolId` and never use it. Remove the prop from the component signatures (`GradeApprovals({ schoolId })` → `GradeApprovals()`, etc.). Leaving the `schoolId={schoolId}` attributes in `SuperadminDashboard.js` render lines 1524–1529 is harmless — remove them only if already editing those lines for Batch 3.
- Manual verify: as superadmin, open Grade Approvals → picker → choose school → data loads (client sends `?school_id=`); with no school chosen the page shows the picker empty-state (never a logout).

## 2.9 Housekeeping bundle (each `S`)

**(a) UI-08 — 44px touch targets.** `src/components/principal/GradeApprovals.css`: `.ga-icon-btn` is 32×32 (lines ~262–273). Inside the existing `@media (max-width:600px)` block add:
```css
.ga-icon-btn { width: 44px; height: 44px; }
.ga-tab { min-height: 44px; }
```
Audit the other principal CSS files for sub-44px interactive elements at ≤600px while there.

**(b) FC-14/BE-13 — syllabus N+1.** `getSyllabusProgress` (lines 662–693) queries topics per subject in a loop. Replace with one fetch + in-memory grouping:
```js
const topics = await SyllabusTopic.findAll({ where: { school_id: school.id } });
const bySubject = topics.reduce((m, t) => ((m[t.subject_id] ||= []).push(t), m), {});
```
then build `progress` from `bySubject[s.id] || []`.

**(c) FC-11 — humanize activity timestamps.** Add to `principal.utils.js`:
```js
export const timeAgo = (d) => {
  const mins = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} hr ago`;
  return new Date(d).toLocaleDateString();
};
```
Use it in `ActivityFeed.jsx` (`<span>{timeAgo(it.at)}</span>`, currently raw at ~line 42) and FinancePanel's transaction rows.

**(d) FC-16 + BE-04 — term-scoped KPIs, SQL aggregates, no duplicate scan.** `getSchoolCommandDashboard` (lines 497–557):
- `avgAcademic`: replace the unbounded `Grade.findAll` (line 506) with an aggregate over approved grades in the active term:
  ```js
  const avgRow = await Grade.findOne({
    attributes: [[sequelize.fn('AVG', sequelize.col('total')), 'avg']],
    where: { school_id: school.id, approval_status: 'approved', total: { [Op.ne]: null },
             ...(activeTerm ? { term_id: activeTerm.id } : {}) },
    raw: true,
  });
  const avgAcademic = Math.round(Number(avgRow?.avg) || 0);
  ```
- `avgAttendance`: drop the all-time `Attendance.findAll` (line 511); compute it from the SAME last-30-days grouped query that feeds `lowAttend` (lines 525–538) — one grouped SQL:
  ```js
  const [attRows] = await sequelize.query(`
    SELECT classroom_id,
           SUM(status IN ('present','late')) AS present,
           COUNT(*) AS total
    FROM pruh_core_attendance
    WHERE school_id = :schoolId AND date >= :since
    GROUP BY classroom_id
  `, { replacements: { schoolId: school.id, since } });
  ```
  overall rate = sum(present)/sum(total); `lowAttend` = rows with total>0 and rate<85.
- `atRisk`: `Grade.count({ where: { school_id, total: { [Op.lt]: 40 }, ...(activeTerm ? { term_id: activeTerm.id } : {}) } })` — no full-table load. (Note: still counts grades, not distinct students; the at-risk endpoint in 3.6 is the student-level truth.)
- Confirm the Attendance table name (`pruh_core_attendance`) from `models/Attendance.js` before writing the raw SQL.

**(e) FC-13 — notification subject name.** `reviewGradeChange` grade fetch (lines 138–140): add `include: [{ model: Subject, as: 'subject', attributes: ['name'] }]` and change line 167 to `g.subject?.name || 'subject'` (alias is lowercase; `g.Subject` is always undefined today).

**(f) UI-12 — dead QuickActions.** Delete `src/components/schooladmin/Principal/QuickActions.jsx` and the `PU_QUICK_ACTIONS` export in `principal.constants.js` (its targets `analytics/teachers/examinations` don't exist in the principal nav). `grep -rn "QuickActions\|PU_QUICK_ACTIONS" src` must be clean first. The inline `PRC_QUICK_ACTIONS` grid in `PrincipalHome.js` is canonical; extend it with the new Batch-3 targets (`expenses`, `principal-announcements`).

## 2.10 BE-10 — covered by 1.1 (uniqueness 409, temp password, must_change_password, strength validation). No extra work.

## 2.11 Backend correctness/perf housekeeping `S–M`

All in `backend_node/src/controllers/principalController.js` unless noted.

- **BE-06 — real report-card counts in `getOverview`** (lines 45–46 hardcode 0). With the active term:
  ```js
  const [rcRows] = await sequelize.query(`
    SELECT SUM(all_approved = 1 AND all_published = 0) AS pending,
           SUM(all_published = 1) AS published
    FROM ( SELECT student_id,
                  MIN(approval_status = 'approved') AS all_approved,
                  MIN(is_published) AS all_published
           FROM pruh_core_grade
           WHERE school_id = :schoolId AND term_id = :termId
           GROUP BY student_id ) t
  `, { replacements: { schoolId: school.id, termId: activeTerm?.id || 0 } });
  ```
  `report_cards_pending = Number(rcRows[0]?.pending) || 0`, `report_cards_published = Number(rcRows[0]?.published) || 0`.
- **BE-08 — pagination.**
  - `listGradeApprovals` (limit 200 at line 87): accept `page` (default 1) and `page_size` (default 50, max 200); use `Grade.findAndCountAll` with `limit`/`offset` (`distinct: true` because of includes); add `total`, `page`, `page_size` to the response. FE `GradeApprovals.js`: add Prev/Next pager under the table (44px buttons), pass `page`/`page_size` through `principalApi.listGradeApprovals(params)` (already forwards arbitrary params).
  - `listReportCards` (limit 500 at line 206): full per-student pagination is invasive; instead return `truncated: totalGrades > 500` and, when true, FE (`ReportCardApproval.js`, `PublishedReportCards.js`) shows a `ga-banner` warning: "Showing the most recent 500 grade rows — counts above are exact, the list may be incomplete."
- **BE-14 — top/low overlap in `getClassPerformance`** (lines 584–587): with ≤3 classes `low` duplicates `top`. After sorting:
  ```js
  const top = performance.slice(0, 3);
  const low = performance.length > 3
    ? performance.slice(Math.max(3, performance.length - 3)).reverse()
    : [];
  ```
- **BE-15 —** covered in 2.8.
- **BE-16 — `publishReportCard`** (lines 256–302): (a) `Term.findByPk(term_id)` (line 264) is unscoped → `Term.findOne({ where: { id: term_id, school_id: school.id } })`; return `404 'Term not found'` when null. (b) Move `Notification.create` behind `if (publishedStudents.size > 0)` so a zero-publish doesn't announce "Report cards published".
- **BE-12 — identity-model decision:** **KEEP all three models.** `Principal.js` (`pruh_system_principal`) is NOT dead — `superadminDataController.js:26,3162-3191` runs a superadmin ref-data CRUD on it. `CorePrincipal` backs the auth fallback (`authController.js:141`) and superadmin principal CRUD (~line 4272). Document the canonical rule with a comment atop `principalController.js`:
  ```js
  // Principal identity model: a leadership login = users row (role principal)
  // + pruh_core_schooladmin link row. User.is_active is the ONLY access gate;
  // SchoolAdmin.is_active mirrors it for display. CorePrincipal/Principal serve
  // superadmin HR-profile + ref-data flows and are not on the auth path.
  ```

---

# BATCH 3 — Net-new leadership features

> Shell edits pattern (used by 3.3–3.6): in `src/components/superadmin/SuperadminDashboard.js` — (1) add a `lazy()` import next to lines 80–87, (2) add the key to `HANDLED_PAGES` (set at lines ~369–394), (3) add a render line next to lines 1524–1529 using the `scoped()` helper, (4) add the nav row to `PRINCIPAL_NAV_ITEMS` (lines 837–846). In `src/config/permissions.js` add the page key. In `src/api/adminApi.js` extend `principalApi`.

## 3.1 Finance oversight page (read-only) `S`

Backend: **none** — `routes/finance.js` `FINANCE_ACCESS` (line 22) already includes `principal`; `bursar/Reports.js` consumes `financeApi.getStats()` + `getAnalytics()` only (reads).
- `src/config/permissions.js` line 115: `'finance-reports': [ROLES.BURSAR],` → `'finance-reports': [ROLES.BURSAR, ROLES.PRINCIPAL],`
- `SuperadminDashboard.js` `PRINCIPAL_NAV_ITEMS`: add `{ key: 'finance-reports', label: 'Finance Reports', icon: <IcGen />, badge: 0, section: 'Finance' },` (render block already exists at line 1520; `finance-reports` is already in `HANDLED_PAGES`).
- Verify as a principal: page loads real stats (financeController `getFinanceStats`, lines 35–59, is already real data).

## 3.2 Expense-approval queue `S`

Backend: **none** — `CAN_APPROVE_EXPENSE` (`finance.js:32`) includes `principal`; `bursar/Expenses.js:21` already lists `principal` in `APPROVER_ROLES` so the approve/reject controls render.
- `permissions.js` line 121: `expenses: [ROLES.BURSAR],` → `expenses: [ROLES.BURSAR, ROLES.PRINCIPAL],`
- `PRINCIPAL_NAV_ITEMS`: add `{ key: 'expenses', label: 'Expense Approvals', icon: <IcGen />, badge: 0, section: 'Finance' },` (render exists at line 1518; key already in `HANDLED_PAGES`).
- Note: `reviewExpense` blocks self-approval at the individual level (financeController lines ~670) — no change.
- Optional S add-on: pending-expense count badge — skip unless trivial (nav badges are static today).

## 3.3 Grade-audit forensic timeline viewer `M`

**Backend.**
- `backend_node/src/utils/gradeEvent.js`: extract the hash formula into an exported helper so append + verify can never drift:
  ```js
  function computeEventHash(evt, prevHash) {
    const payload = JSON.stringify({
      grade_id: evt.grade_id ?? null, school_id: evt.school_id,
      student_id: evt.student_id ?? null, subject_id: evt.subject_id ?? null,
      term_id: evt.term_id ?? null, actor_user_id: evt.actor_user_id ?? null,
      event_type: evt.event_type, field: evt.field ?? null,
      old_value: evt.old_value == null ? null : String(evt.old_value),
      new_value: evt.new_value == null ? null : String(evt.new_value),
      approval_status_after: evt.approval_status_after ?? null,
      ts: Math.floor(new Date(evt.created_at).getTime() / 1000),
    });
    return crypto.createHash('sha256').update((prevHash || '') + payload).digest('hex');
  }
  module.exports = { appendGradeEvent, appendGradeEventSafe, computeEventHash };
  ```
  Refactor `appendGradeEvent` (lines 36–43) to call it. The `ts` epoch-seconds rule is load-bearing (MySQL DATETIME drops ms) — copy exactly.
- `principalController.js` — new handler `getGradeAudit`:
  - Query params: `page` (default 1), `page_size` (default 50, max 200), `event_type`, `student_id`, `grade_id`, `verify` (`'1'` to run chain verification).
  - List: `GradeEvent.findAndCountAll({ where: { school_id: school.id, ...filters }, order: [['id','DESC']], limit, offset })`. Enrich with student/subject names via two batched lookups (`Student` with its `user` include, `Subject`) keyed by the ids present on the page.
  - Verification (only when `verify=1`): stream the whole school chain ordered `id ASC` (`attributes` = the hashed fields + `prev_hash`,`hash`,`created_at`; `raw: true`; hard cap 20,000 rows — above that return `chain: { valid: null, checked: 20000, note: 'chain too long for online verification' }`). Walk it with `computeEventHash`; a mismatch of either recomputed hash or stored `prev_hash` linkage breaks: `chain = { valid: false, checked: n, broken_at_id: e.id }`; else `{ valid: true, checked: all.length }`.
  - Response: `{ events: [...], total, page, page_size, chain }` where each event = `{ id, event_type, field, old_value, new_value, approval_status_after, actor_name, student_name, subject_name, grade_id, created_at, hash, prev_hash }`.
- `routes/principal.js`: `router.get('/grade-audit/', requireRole(PRINCIPAL_WRITE), getGradeAudit);` (PRINCIPAL_WRITE = `['superadmin','principal']` — correct gate for a governance read).

**Frontend.**
- `principalApi` addition: `getGradeAudit(params = {})` mirroring `listGradeApprovals` query-string handling → `GET /api/principal/grade-audit/`.
- New page `src/components/principal/GradeAudit.js` + `GradeAudit.css` (import `SchoolAdmin.css`, `Principal.css`, `GradeApprovals.css`, own css):
  - Header (`pu-page`/`pu-page__head` pattern) + a "Verify chain" button that refetches with `verify=1`.
  - Chain banner: green `ga-banner ga-banner--success` "Chain verified — N events intact (SHA-256)"; red `ga-banner--error` "TAMPER ALERT — chain breaks at event #ID. Events after this point cannot be trusted."; neutral when unverified.
  - Timeline list: one row per event — icon by `event_type` (`approve` fact_check green, `reject` block red, `publish` publish blue, `submit`/`update` edit_note amber), "ACTOR event_type STUDENT · SUBJECT", `old_value → new_value`, `timeAgo(created_at)` + full timestamp on title attr, monospace truncated `hash` (first 12 chars).
  - Filters: event-type chips (`pu-chips` pattern), student search box; Prev/Next pager.
  - Loading/empty/error via the `pu-empty` pattern ("No grade events yet — events appear as teachers submit and you approve grades.").
  - Mobile: rows stack; chips wrap; buttons ≥44px at ≤600px.
- Wiring: permissions key `'principal-grade-audit': [ROLES.PRINCIPAL, ROLES.SUPERADMIN]` (do NOT reuse the existing superadmin-only `'grade-audit'` key); nav row `{ key: 'principal-grade-audit', label: 'Grade Audit Trail', section: 'Oversight' }`; `HANDLED_PAGES` add; render `{activePage === 'principal-grade-audit' && scoped(<PrincipalGradeAudit />, 'Pick a school to view its grade audit trail.')}` with lazy import `const PrincipalGradeAudit = lazy(() => import('../principal/GradeAudit'));`.

## 3.4 Academics analytics page `L`

**Backend — new handler `getAcademicsAnalytics`** in `principalController.js`, route `router.get('/academics-analytics/', getAcademicsAnalytics);` (default PRINCIPAL_ACCESS gate is fine — read-only academics). Term param `?term_id=` optional (default active term). All queries school+term scoped, `approval_status='approved'`:

```js
// 1. Grade distribution: GROUP BY grade_letter → [{ letter:'A', count: 42 }, ...]
// 2. Pass rate per class:
//    SELECT g.classroom_id, c.name, SUM(g.total >= 50)/COUNT(*)*100 AS pass_rate, COUNT(DISTINCT g.student_id) students
//    FROM pruh_core_grade g JOIN pruh_core_class c ON c.id=g.classroom_id  (confirm Class tableName)
//    WHERE ... GROUP BY g.classroom_id
// 3. Term trend: AVG(total) per term for the school, terms ordered by start_date → [{ term:'Term 1', avg: 63 }]
// 4. Heatmap: AVG(total) GROUP BY classroom_id, subject_id → matrix { classes:[...], subjects:[...], cells:[{class_id, subject_id, avg, count}] }
```

Response: `{ distribution, pass_rates, trend, heatmap, term, term_id, has_data }` (`has_data:false` when zero approved grades — the page must show an honest empty state).

**Frontend — `src/components/principal/AcademicsAnalytics.js` + `.css`.** No chart libs — reuse the repo's SVG/CSS patterns:
- Distribution: horizontal bars via `.pu-finance__bar-track/.pu-finance__bar-fill` (colors: A/B green, C amber, D/E/F red).
- Pass rate per class: same bar pattern sorted ascending so problem classes surface first.
- Term trend: small inline SVG polyline (the repo precedent for hand-rolled SVG is `HealthScoreCard.jsx`'s ring; a `<svg viewBox>` with a computed `points` attribute, dots per term, min-max normalized). Wrap in `overflow-x:auto` for mobile.
- Heatmap: CSS-grid table (classes × subjects), cell background from a 5-step scale (`>=80` green → `<40` red, `--ska-*` vars), cell text = rounded avg; wrap in a horizontally scrollable container; on ≤600px keep scroll (do not reflow the matrix).
- `principalApi.getAcademicsAnalytics(params)`; wiring: permissions `'principal-analytics': [ROLES.PRINCIPAL, ROLES.SUPERADMIN]`, nav `{ key:'principal-analytics', label:'Academics Analytics', section:'Academics' }`, HANDLED_PAGES, render `scoped(<PrincipalAnalytics />, 'Pick a school to view its academics analytics.')`.

## 3.5 Announcement composer (tenant-scoped) `M`

**Backend** (`principalController.js` + `routes/principal.js`):
- `POST /api/principal/announcements/` gated `requireRole(PRINCIPAL_WRITE)`. Body `{ title, message }` (both required, title ≤ 191 chars). Creates `Notification.create({ school_id: school.id, title: title.trim(), message: message.trim(), type: 'announcement', is_read: false })`. Response `{ id }`.
- `GET /api/principal/announcements/` → `Notification.findAll({ where: { school_id: school.id, type: 'announcement' }, order: [['created_at','DESC']], limit: 100 })` → `{ announcements: [{ id, title, message, created_at }] }`.
- Constraint to state in code comments: `pruh_core_notification` has NO audience column — announcements are school-wide. Audience targeting (class/role) needs a schema change; explicitly out of scope here.
- Also update `getActivityFeed`'s kind mapping (line 648) so `type === 'announcement'` maps to `'announce'` (it already falls through to `'announce'` for non-alert — verify, no change likely needed).

**Frontend** — new page `src/components/principal/Announcements.js` + `.css`: composer card (title input, message textarea, char counter, Send button with confirm via shared Modal: "Send to everyone at SCHOOL?") above a sent-list (title, message preview, `timeAgo`). Honest empty state "No announcements yet". `principalApi.listAnnouncements()` / `postAnnouncement({ title, message })`. Wiring: permissions `'principal-announcements': [ROLES.PRINCIPAL, ROLES.SUPERADMIN]`, nav `{ key:'principal-announcements', label:'Announcements', section:'Oversight' }`, HANDLED_PAGES, render `scoped(<PrincipalAnnouncements />)`. Add a `PRC_QUICK_ACTIONS` entry (`campaign` icon → `principal-announcements`).

## 3.6 Predictive at-risk panel with drill-down `M`

**Backend** — `GET /api/principal/at-risk/` (default read gate):
- Signals (active term / last 30 days), computed via two grouped queries then merged in JS keyed by `student_id`:
  1. Grades: `SELECT student_id, AVG(total) avg_total, COUNT(*) n FROM pruh_core_grade WHERE school_id=? AND term_id=? AND total IS NOT NULL GROUP BY student_id`.
  2. Attendance: `SELECT student_id, SUM(status IN ('present','late')) present, COUNT(*) total FROM pruh_core_attendance WHERE school_id=? AND date >= :since GROUP BY student_id` (confirm `Attendance` has `student_id` — it is a per-student record; check `models/Attendance.js` first).
- Risk rules: `avg_total < 50` → reason `low_grades`; attendance rate `< 75` → reason `poor_attendance`; both → `severity:'high'`, one → `'medium'`. Rank by (reasons desc, avg_total asc).
- Enrich with student name/admission_number/class (batch `Student.findAll` include user + `Class` name map). Response `{ students: [{ student_id, name, admission_number, class_name, avg_total, attendance_rate, reasons: ['low_grades'], severity }], term, has_data }`. Cap 200 rows.

**Frontend** — `src/components/principal/AtRisk.js` + `.css`: severity summary chips, table (scrollable container) with reason chips (`ga-badge` variants), row click opens the student profile drawer (3.7). Honest empty state: "No students currently flagged — flags appear when a student's term average drops below 50% or attendance below 75%." Wiring: permissions `'principal-at-risk': [ROLES.PRINCIPAL, ROLES.SUPERADMIN]`, nav `{ key:'principal-at-risk', label:'At-Risk Students', section:'Academics' }`, HANDLED_PAGES, render `scoped(<PrincipalAtRisk />)`. Also make the Command-Center `totalAtRisk` alert (PrincipalHome lines 55–61) navigate to this page. "Assign mentor" action: out of scope (no mentor model) — do not render a fake button.

## 3.7 Student profile drill-down (drawer reuse) `M`

- Inspect `src/components/teacher/StudentProfileDrawer.js` first. If it fetches through teacher-gated endpoints (`/api/teacher/*`), do NOT reuse its data layer: add `GET /api/principal/students/:id/` (default read gate; 404 unless `student.school_id === school.id`) returning `{ student: { id, name, admission_number, class_name, status }, grades: [current-term rows], attendance: { rate_30d, present, absent, late } }`, and either (a) pass a `fetcher`/`data` prop into the drawer if its rendering is decoupled, or (b) create `src/components/principal/StudentDrawer.js` copying the drawer layout + CSS class conventions. Prefer (a); fall back to (b) if the coupling is deep.
- Hook it up from: At-Risk rows (3.6) and `ClassPerformance.jsx` rows (make rows buttons — keyboard accessible, ≥44px).

## 3.8 CSV export `S–M`

- New `src/utils/csv.js`: move `csvCell` + `downloadCsv` verbatim from `src/components/bursar/Reports.js` (lines 99–115), export both; refactor `Reports.js` to import from it (delete the local copies — behavior identical, BOM included).
- Add an "Export CSV" `ga-btn ga-btn--ghost` button to: `GradeApprovals.js` (current filtered rows: student, admission no, subject, class, term, ca/midterm/final/total, letter, status), `AttendanceReport.js` (class table: class, total, present, absent, late, excused, rate), `PublishedReportCards.js` (student, admission no, per-subject totals flattened or one row per subject — one row per subject is simpler), `AtRisk.js` (3.6). Filenames: `grade-approvals-YYYY-MM-DD.csv` etc. No backend work.

## 3.9 Follow-on features (spec-level only, build after 3.1–3.8)

| Item | Effort | Sketch |
|---|---|---|
| Teacher-evaluation dashboard (GAP-09) | L | Extend 1.6's queries into `GET /api/principal/teacher-insights/detail/`: per-teacher rows (name, classes, periods/week from TimetableSlot, avg class total from the ClassSubject join, pending-grade count). New page reusing the analytics bar patterns. |
| Whistleblower inbox (GAP-14) | M | `WhistleblowerReport` model exists, submit-only today. Add `GET /api/principal/whistleblower/` (school-scoped list; keep reporter anonymity — never return reporter identity fields) + status update endpoint; inbox page. Verify model columns first. |
| Internal messaging (GAP-15) | L | `Message` model exists — audit its shape before designing; likely needs thread/recipient semantics. Defer. |
| Exam/timetable read-only oversight (GAP-13/PAR-10) | M | Reuse `ExamsPage`/`TimetablePage` from `schooladmin/NewPages` with a `readOnly` prop that hides mutating controls; add principal to the relevant `/api/school/*` read gates only. |
| Health scorecard export (GAP-12) | S | After 1.5, add a "Download scorecard" button on `HealthScoreCard` using `downloadCsv` (dimensions, weights, values, score). |

---

# Work packages (disjoint file sets where possible)

| WP | Scope | Files touched | Depends on |
|---|---|---|---|
| **WP-1** Backend blockers | 1.1, 1.2, 1.3(BE), 1.4(BE), 1.5(BE), 1.6(BE), 2.1, 2.3, 2.4, 2.9b/d/e, 2.11 | `principalController.js`, `routes/principal.js`, `models/SchoolAdmin.js`, `models/User.js`, `migrations/2026-07-03-leadership-columns-and-user-phone.sql` | migration first |
| **WP-2** Frontend blockers + UX | 1.1(FE), 1.2(FE), 1.4(FE), 1.5(FE), 1.6(FE), 1.7, 2.2, 2.5, 2.6, 2.7, 2.8(FE), 2.9a/c/f | `src/components/principal/*` (7 pages + new `Modal.js`), `src/components/schooladmin/Principal/*` panels + utils/constants, `src/hooks/usePrincipalDashboard.js`, delete `src/context/PrincipalContext.js` | WP-1 payload shapes |
| **WP-3** Wiring (small, isolated diffs) | 3.1, 3.2 nav/permissions; 3.3–3.6 nav/permissions/render/HANDLED_PAGES; 2.8 dead-prop cleanup (optional) | `src/config/permissions.js`, `src/components/superadmin/SuperadminDashboard.js` | pages from WP-4 must exist before their render lines land (or land with lazy imports in the same commit) |
| **WP-4** Batch-3 backends + pages | 3.3–3.8 | `principalController.js` (new handlers only), `routes/principal.js` (new routes only), `utils/gradeEvent.js`, `src/api/adminApi.js`, new files `src/components/principal/{GradeAudit,AcademicsAnalytics,Announcements,AtRisk}.js|.css`, `src/utils/csv.js`, `src/components/bursar/Reports.js` (import-only refactor) | WP-1 merged (same controller file) |

Sequencing: **WP-1 → WP-2 → (WP-4 ∥ WP-3)**. WP-1 and WP-4 both edit `principalController.js`/`routes/principal.js` — do not run them in parallel.

# Verification checklist (before claiming done)

1. `npm start` both ends; log in as a principal (create one via a school admin if needed).
2. Batch 1: create member without password → credentials modal with temp password → log in with it → succeeds, `must_change_password:true`. Duplicate email → inline 409 message. Suspend → target's session dies (403 ACCOUNT_INACTIVE) and login refused; Activate restores. Edit role/access/phone → persists after reload. Finance panel: with zero fee rows shows the empty state (no `$0`, no green bar); Financial-Status KPI shows "No data"; health ring has no fabricated +15. Teacher tiles show `—` with "No timetable data yet" when no timetable. Hard-refresh directly on `grade-approvals` → fully styled.
3. Batch 2: approve with a comment → comment lands in `grade.remarks`. Publish All → confirm modal; published students badge "Published"; Published page lists only `published`. school_admin token GET `/api/principal/grade-approvals/` → 403. Leadership list no longer shows the school-admin account; editing it via API → 403. Escape closes every modal; Tab stays trapped. All icon buttons ≥44px at 375px viewport.
4. Batch 3: principal nav shows Finance Reports / Expense Approvals / Grade Audit Trail / Academics Analytics / Announcements / At-Risk; each loads real data or its honest empty state; superadmin reaches each via the school picker (no logouts, no 401 storms). Chain verify on a school with events → green banner; manually UPDATE one `pruh_core_grade_event.old_value` in dev DB → red tamper banner at that id (then restore).
5. `grep -rn "Principal@123" backend_node/src` → 0 hits. `grep -rn "PrincipalContext" src` → 0 hits. CRA build passes (`npm run build`).
6. Do NOT commit or push unless explicitly told; never touch `superadmin/Dashboard.js` / `schooladmin/dashboard.js`; record the migration in the pending-prod list.
