/**
 * EK-SMS Parents Module — mock data + aggregation helpers
 *
 * The /api/school/parents/ endpoint only returns identity + linked children.
 * To power the engagement dashboard we layer deterministic mock metrics
 * (performance, attendance, finance, engagement, alerts) on top, keyed by
 * parent.id and child.id so the UI stays stable across re-renders.
 */

export const RELATIONSHIPS = ['Mother', 'Father', 'Guardian'];

const SUBJECTS = ['Mathematics', 'English', 'Science', 'History', 'Geography', 'ICT'];

/* deterministic hash so mock values stay stable per id */
function hash(str) {
  const s = String(str || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function pick(arr, seed)        { return arr[hash(seed) % arr.length]; }
function range(seed, lo, hi)    { return lo + (hash(seed) % (hi - lo + 1)); }

/* ── per-child mock metrics ─────────────────────────────────── */
export function buildChildMetrics(child) {
  const seed       = `child:${child.id}`;
  const performance = range(seed + ':perf', 45, 96);
  const attendance  = range(seed + ':att', 60, 99);
  const recentGrades = SUBJECTS.slice(0, 4).map((sub, i) => ({
    subject: sub,
    score:   range(seed + ':g' + i, 40, 95),
  }));
  return { performance, attendance, recentGrades };
}

/* ── per-parent mock data ───────────────────────────────────── */
export function enrichParent(p) {
  const seed         = `parent:${p.id}`;
  const childrenRich = (p.children || []).map(c => ({ ...c, ...buildChildMetrics(c) }));

  const avgPerformance = childrenRich.length
    ? Math.round(childrenRich.reduce((s, c) => s + c.performance, 0) / childrenRich.length)
    : 0;
  const avgAttendance  = childrenRich.length
    ? Math.round(childrenRich.reduce((s, c) => s + c.attendance, 0) / childrenRich.length)
    : 0;

  const outstandingFees = childrenRich.length ? range(seed + ':fee', 0, 1500) : 0;
  const feesPaid        = range(seed + ':paid', 800, 4500);
  const lastActiveDays  = range(seed + ':active', 0, 30);
  const messagesRead    = range(seed + ':msgRead', 2, 48);
  const messagesSent    = range(seed + ':msgSent', 0, 12);
  const isActive        = lastActiveDays <= 14;

  const alerts = [];
  if (avgPerformance > 0 && avgPerformance < 60) alerts.push({ kind: 'low_performance', label: 'Low performance', sev: 'red' });
  if (avgAttendance  > 0 && avgAttendance  < 75) alerts.push({ kind: 'low_attendance',  label: 'Low attendance',  sev: 'amber' });
  if (outstandingFees > 0)                       alerts.push({ kind: 'fee_overdue',     label: 'Fee overdue',     sev: outstandingFees > 800 ? 'red' : 'amber' });

  /* Mock payment history — only when we have children */
  const paymentHistory = childrenRich.length ? [
    { date: '2026-04-12', amount: range(seed + ':p1', 200, 900), method: 'Bank Transfer', status: 'Paid' },
    { date: '2026-03-05', amount: range(seed + ':p2', 200, 900), method: 'Mobile Money',  status: 'Paid' },
    { date: '2026-02-08', amount: range(seed + ':p3', 200, 900), method: 'Cash',          status: 'Paid' },
  ] : [];

  /* Mock subject-aggregate trend (avg across children per subject) */
  const subjectTrend = childrenRich.length ? SUBJECTS.map((sub, i) => ({
    subject: sub,
    score:   Math.round(
      childrenRich.reduce((s, c) => s + range(`${c.id}:trend:${i}`, 45, 95), 0) / childrenRich.length
    ),
  })) : [];

  /* Mock communication history */
  const commHistory = [
    { id: 1, kind: 'message',      title: 'Term 2 progress report shared',     at: lastActiveDays + 2,  dir: 'sent' },
    { id: 2, kind: 'notification', title: 'Parent-teacher meeting reminder',   at: lastActiveDays + 5,  dir: 'sent' },
    { id: 3, kind: 'message',      title: 'Reply: thank you for the update',   at: lastActiveDays + 7,  dir: 'received' },
    { id: 4, kind: 'notification', title: 'Mid-term exam timetable published', at: lastActiveDays + 12, dir: 'sent' },
  ];

  return {
    ...p,
    childrenRich,
    avgPerformance,
    avgAttendance,
    outstandingFees,
    feesPaid,
    lastActiveDays,
    messagesRead,
    messagesSent,
    isActive,
    alerts,
    paymentHistory,
    subjectTrend,
    commHistory,
    relationshipNorm: pick(RELATIONSHIPS, seed + ':rel'),
  };
}

/* ── humanise relative time ─────────────────────────────────── */
export function relTime(days) {
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days} days ago`;
  if (days < 30)  return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
}

/* ── colour helpers ─────────────────────────────────────────── */
export function perfColor(pct) {
  if (pct >= 75) return 'var(--ska-green)';
  if (pct >= 60) return 'var(--ska-tertiary)';
  return 'var(--ska-error)';
}
export function attColor(pct) {
  if (pct >= 90) return 'var(--ska-green)';
  if (pct >= 75) return 'var(--ska-tertiary)';
  return 'var(--ska-error)';
}
