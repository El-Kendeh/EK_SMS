/**
 * EK-SMS · Principal — pure helpers (no React).
 * Deterministic mock-data so each principal/school keeps the same KPIs
 * across renders until backend supplies real values.
 */
import {
  PU_ROLES, PU_ROLE_KEYS, PU_ACCESS_LEVELS, PU_PERMS_BY_ACCESS, PU_SCOPE_OPTIONS,
} from './principal.constants';

/* ── Stable hash ───────────────────────────────────────────── */
export function puHash(seed) {
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* ── Health-score color ───────────────────────────────────── */
export function puHealthColor(score) {
  if (score >= 80) return 'var(--ska-green)';
  if (score >= 65) return 'var(--ska-tertiary)';
  return 'var(--ska-error)';
}

/* ── Per-principal enrichment ─────────────────────────────── */
export function puEnrich(u, idx) {
  const h = puHash(u.email || u.id);
  const role = u.role && PU_ROLES[u.role]
    ? u.role
    : (idx === 0 ? 'Principal' : PU_ROLE_KEYS[h % PU_ROLE_KEYS.length]);
  const access = u.access_level && PU_ACCESS_LEVELS[u.access_level]
    ? u.access_level
    : (role === 'Principal' ? 'Full' : 'Restricted');
  const perms  = u.permissions && u.permissions.length ? u.permissions : PU_PERMS_BY_ACCESS[access];
  const scope  = u.scope && u.scope.length
    ? u.scope
    : (role === 'Principal'
        ? ['Entire School']
        : [PU_SCOPE_OPTIONS[h % 6], PU_SCOPE_OPTIONS[(h + 2) % 6], PU_SCOPE_OPTIONS[(h + 4) % 6]]
            .filter((v, i, a) => a.indexOf(v) === i));
  const notifs = u.notifications && u.notifications.length
    ? u.notifications
    : ['grade_alerts','attendance_alerts','finance_alerts'];

  const totalStudents = 380 + (h % 220);
  const totalTeachers = 22  + (h % 18);
  const totalClasses  = 14  + (h % 10);
  const academic      = 62  + (h % 33);
  const attendance    = 78  + (h % 19);
  const finance       = academic > 80 ? 'Stable' : academic > 70 ? 'Needs Attention' : 'Critical';
  const lastMins      = (h % 240) + 5;

  const flags = {
    gradeMods:  u.is_active ? (h % 4) : 0,
    atRisk:     u.is_active ? ((h + 7) % 8) : 0,
    finAnomaly: u.is_active && finance !== 'Stable' ? 1 : 0,
    lowAttend:  u.is_active && attendance < 85 ? 1 : 0,
  };

  return {
    ...u,
    role, access, perms, scope, notifs,
    totalStudents, totalTeachers, totalClasses,
    academic, attendance, finance,
    lastMins, flags,
    actions: [
      { text: 'Approved 12 grade entries',       at: `${Math.max(1, lastMins - 6)} min ago` },
      { text: 'Reviewed Grade 10A performance',  at: `${lastMins + 14} min ago` },
      { text: 'Signed off on weekly report',     at: `${lastMins + 38} min ago` },
      { text: 'Updated teacher schedule',        at: `${lastMins + 92} min ago` },
    ],
  };
}

/* ── School-wide command-center summary ───────────────────── */
export function schoolSummary(users = [], school = {}) {
  /* Use the first principal's hash if available, else seed from school.name */
  const seed = users[0]?.email || users[0]?.id || school?.name || 'school';
  const h = puHash(seed);

  const active = users.filter(u => u.is_active);
  const fallback = active.length === 0;

  const totalStudents = fallback ? 380 + (h % 220) : active[0].totalStudents;
  const totalTeachers = fallback ? 22  + (h % 18)  : active[0].totalTeachers;
  const totalClasses  = fallback ? 14  + (h % 10)  : active[0].totalClasses;

  const avgAcademic = active.length
    ? Math.round(active.reduce((s, u) => s + u.academic, 0) / active.length)
    : 62 + (h % 33);
  const avgAttendance = active.length
    ? Math.round(active.reduce((s, u) => s + u.attendance, 0) / active.length)
    : 78 + (h % 19);
  const stableShare = active.length
    ? active.filter(u => u.finance === 'Stable').length / active.length
    : (avgAcademic > 80 ? 1 : avgAcademic > 70 ? 0.5 : 0);

  const finance = avgAcademic > 80 ? 'Stable'
                : avgAcademic > 70 ? 'Needs Attention'
                : 'Critical';

  const healthScore = Math.round(
    avgAcademic * 0.45 + avgAttendance * 0.40 + stableShare * 100 * 0.15
  );

  return {
    totalStudents, totalTeachers, totalClasses,
    avgAcademic, avgAttendance, finance,
    healthScore,
    /* Aggregate flags across active principals */
    totalGradeMods: users.reduce((s, u) => s + u.flags.gradeMods,  0),
    totalAtRisk:    users.reduce((s, u) => s + u.flags.atRisk,     0),
    totalFinAnom:   users.reduce((s, u) => s + u.flags.finAnomaly, 0),
    totalLowAttend: users.reduce((s, u) => s + u.flags.lowAttend,  0),
  };
}

/* ── Critical alerts at school level ──────────────────────── */
export function buildAlerts(summary) {
  const alerts = [];
  if (summary.totalGradeMods > 0) {
    alerts.push({
      key: 'grades', tone: 'critical',
      icon: 'edit_note',
      title: `${summary.totalGradeMods} grade modification attempt${summary.totalGradeMods > 1 ? 's' : ''}`,
      detail: 'Audit teacher access and review change history.',
    });
  }
  if (summary.totalAtRisk > 5) {
    alerts.push({
      key: 'atrisk', tone: 'warning',
      icon: 'trending_down',
      title: `${summary.totalAtRisk} students at academic risk`,
      detail: 'Convene a support meeting and assign mentors.',
    });
  }
  if (summary.totalFinAnom > 0) {
    alerts.push({
      key: 'finanom', tone: 'critical',
      icon: 'account_balance',
      title: 'Financial anomaly detected',
      detail: `${summary.totalFinAnom} unusual transaction${summary.totalFinAnom > 1 ? 's' : ''} in last 24h.`,
    });
  }
  if (summary.totalLowAttend > 0) {
    alerts.push({
      key: 'lowatt', tone: 'warning',
      icon: 'event_busy',
      title: 'Low attendance classes',
      detail: `${summary.totalLowAttend} class${summary.totalLowAttend > 1 ? 'es' : ''} below 85% attendance.`,
    });
  }
  return alerts;
}

/* ── AI / decision-support insights ───────────────────────── */
export function buildInsights(summary) {
  const out = [];
  if (summary.avgAcademic < 75)
    out.push('Grade 9 performance is declining — consider a curriculum review.');
  if (summary.avgAttendance < 88)
    out.push('Attendance dropping in Grade 10B — schedule home visits.');
  if (summary.totalAtRisk > 8)
    out.push(`${summary.totalAtRisk} students at risk — convene a support meeting.`);
  if (summary.totalGradeMods > 3)
    out.push('Multiple grade modification attempts — audit teacher access.');
  if (summary.finance !== 'Stable')
    out.push('Finance status is unstable — review collections this week.');
  if (out.length === 0)
    out.push('All key metrics within target. Keep monitoring trend lines.');
  return out;
}

/* ── Class performance snapshot (top + low) ───────────────── */
export function classPerformance(summary, school) {
  const seed = (school?.name || 'school') + summary.avgAcademic;
  const h = puHash(seed);
  const top = [
    { name: 'Grade 11A', score: 88 + (h % 7) },
    { name: 'Grade 9B',  score: 84 + (h % 6) },
    { name: 'Grade 12A', score: 82 + (h % 5) },
  ];
  const low = [
    { name: 'Grade 8A',  score: 56 + (h % 8) },
    { name: 'Grade 10B', score: 60 + (h % 5) },
    { name: 'Grade 7A',  score: 64 + (h % 4) },
  ];
  return { top, low };
}

/* ── Teacher panel mock ───────────────────────────────────── */
export function teacherInsights(summary, school) {
  const seed = (school?.name || 'school') + summary.totalTeachers;
  const h = puHash(seed);
  return {
    overloaded:      2 + (h % 3),
    underperforming: 1 + (h % 3),
    pendingGrades:   8 + (h % 12),
  };
}

/* ── Financial snapshot mock ──────────────────────────────── */
export function financeSnapshot(summary, school) {
  const seed = (school?.name || 'school') + summary.totalStudents;
  const h = puHash(seed);
  return {
    revenue:     45000 + (h % 9000),
    outstanding: 8000  + (h % 4000),
    paymentsToday: 12 + (h % 18),
    transactions: [
      { label: 'Tuition payment — Grade 11', amount: 1200 + (h % 300), at: 'Today, 10:24' },
      { label: 'Lab fees — Grade 9',         amount: 450  + (h % 120), at: 'Today, 09:11' },
      { label: 'Bus fee — multiple',         amount: 870  + (h % 200), at: 'Yesterday' },
    ],
  };
}

/* ── Recent activity feed (school-wide mock) ──────────────── */
export function activityFeed(users = []) {
  /* Pick the first 2 active principals' actions, plus mock school events */
  const fromPrincipals = users.slice(0, 2).flatMap(u => u.actions.slice(0, 2));
  const seed = users[0]?.id || 'feed';
  const h = puHash(seed);
  const mock = [
    { kind: 'grade',     text: `Mr. Bangura submitted ${10 + (h % 8)} grades for Grade 11A`, at: '12 min ago' },
    { kind: 'payment',   text: `Tuition payment recorded — $${1100 + (h % 200)}`,            at: '34 min ago' },
    { kind: 'request',   text: 'Modification request from Mrs. Kamara awaiting approval',   at: '1 hr ago' },
    { kind: 'attendance',text: 'Daily attendance closed — 92% school-wide',                   at: '2 hr ago' },
    { kind: 'announce',  text: 'Mid-term break announcement sent to all parents',             at: 'Yesterday' },
  ];
  return [...fromPrincipals.map(a => ({ kind: 'admin', text: a.text, at: a.at })), ...mock]
    .slice(0, 8);
}

/* ── Format helpers ───────────────────────────────────────── */
export const fmtUsd = (n) =>
  '$' + Number(n || 0).toLocaleString();

export const fmtUsdCompact = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return '$' + (v / 1_000).toFixed(1) + 'k';
  return '$' + v.toLocaleString();
};

export const fmtMins = (m) =>
  m == null ? '—' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} hr ago`;
