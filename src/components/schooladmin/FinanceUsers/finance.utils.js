/**
 * EK-SMS · Finance Users — pure helpers (no React).
 * Deterministic mock-data so each user keeps the same role/activity/risk
 * across renders until the backend supplies real values.
 */
import { FU_ROLES, FU_ROLE_KEYS, FU_SCOPE_OPTIONS, FU_HEAT_BUCKETS } from './finance.constants';

/* ── Stable hash (FNV-style) ───────────────────────────────── */
export function fuHash(seed) {
  const s = String(seed || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/* ── Risk level derivation ─────────────────────────────────── */
export function riskLevel(u) {
  if (!u.is_active) return 'low';
  if (u.flagged) return 'high';
  if (u.txAmount > 3000 || u.txToday > 18) return 'high';
  if (u.txAmount > 1000 || u.txToday > 10) return 'medium';
  return 'low';
}

/* ── Per-user enrichment with mock metrics ─────────────────── */
export function fuEnrich(u) {
  const h = fuHash(u.email || u.id);
  const role = u.role && FU_ROLES[u.role] ? u.role : FU_ROLE_KEYS[h % FU_ROLE_KEYS.length];
  const def  = FU_ROLES[role].defaults;
  const perms = u.permissions && u.permissions.length ? u.permissions : def;

  const txToday   = u.is_active ? (h % 22) + (role === 'Auditor' ? 0 : 3) : 0;
  const txAmount  = u.is_active ? ((h % 47) + 4) * 50 : 0;
  const txTotal   = txAmount * (8 + (h % 30));     /* lifetime estimate */
  const lastMins  = (h % 240) + 5;
  const limit     = role === 'Bursar' ? 5000 : role === 'Cashier' ? 500 : 0;

  const scope     = u.scope && u.scope.length ? u.scope :
                    role === 'Bursar' ? ['All Classes'] :
                    role === 'Cashier' ? [
                      FU_SCOPE_OPTIONS[h % FU_SCOPE_OPTIONS.length],
                      FU_SCOPE_OPTIONS[(h + 3) % FU_SCOPE_OPTIONS.length],
                    ] : ['All Classes'];

  const hours     = u.working_hours
    || (role === 'Cashier' ? '8AM – 4PM'
        : role === 'Auditor' ? '9AM – 5PM' : 'Flexible');

  const flagged   = u.is_active && txToday > 18;
  const highVol   = u.is_active && txAmount > 2000;

  const enriched = {
    ...u, role, perms,
    txToday, txAmount, txTotal,
    lastMins, limit, scope, hours,
    flagged, highVol,
    activity: [
      { kind: 'login',   text: 'Signed in to dashboard',                  at: `${Math.max(1, lastMins - 4)} min ago` },
      { kind: 'payment', text: `Collected fee — $${(h % 90) + 50}`,        at: `${lastMins} min ago` },
      { kind: 'receipt', text: `Issued receipt — REC-${1000 + (h % 9000)}`,at: `${lastMins + 12} min ago` },
      { kind: 'payment', text: `Collected fee — $${(h % 60) + 25}`,        at: `${lastMins + 47} min ago` },
    ],
  };
  enriched.risk = riskLevel(enriched);
  return enriched;
}

/* ── Format helpers ────────────────────────────────────────── */
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

export const fmtMinsCompact = (m) =>
  m == null ? '—' : m < 60 ? `${m}m` : `${Math.round(m / 60)}h`;

/* ── Aggregate metrics across all enriched users ───────────── */
export function summariseUsers(users = []) {
  const total      = users.length;
  const active     = users.filter(u => u.is_active).length;
  const suspended  = total - active;
  const txToday    = users.reduce((s, u) => s + u.txToday,  0);
  const volToday   = users.reduce((s, u) => s + u.txAmount, 0);
  const volTotal   = users.reduce((s, u) => s + u.txTotal,  0);
  const receipts   = Math.round(txToday * 0.95);
  const refunds    = Math.max(0, Math.round(txToday * 0.08));
  const flagged    = users.filter(u => u.flagged).length;
  const highVol    = users.filter(u => u.highVol).length;
  const riskLevels = {
    low:    users.filter(u => u.risk === 'low').length,
    medium: users.filter(u => u.risk === 'medium').length,
    high:   users.filter(u => u.risk === 'high').length,
  };
  return { total, active, suspended, txToday, volToday, volTotal,
           receipts, refunds, flagged, highVol, riskLevels };
}

/* ── Heat-map summary (deterministic distribution per session) ── */
export function heatSummary(users = []) {
  if (users.length === 0) {
    return FU_HEAT_BUCKETS.map(b => ({ ...b, level: 'Low', count: 0, pct: 5 }));
  }
  /* Distribute today's tx across the three buckets using a deterministic split.
     The split shifts a bit across renders so the demo doesn't feel static. */
  const txToday = users.reduce((s, u) => s + u.txToday, 0);
  const dayHash = fuHash(new Date().toISOString().slice(0, 10));
  const splits = [
    [0.20, 0.30],   /* morning   */
    [0.45, 0.55],   /* afternoon */
    [0.20, 0.30],   /* evening   */
  ];
  const counts = splits.map(([lo, hi], i) => {
    const slot = lo + ((dayHash >> (i * 3)) % 100) / 1000;
    const f = Math.min(hi, slot);
    return Math.max(0, Math.round(txToday * f));
  });
  const max = Math.max(...counts, 1);
  return FU_HEAT_BUCKETS.map((b, i) => {
    const c = counts[i];
    const pct = Math.round((c / max) * 100);
    const level = pct >= 70 ? 'High' : pct >= 35 ? 'Medium' : 'Low';
    return { ...b, level, count: c, pct };
  });
}

/* ── Generate system alerts for the AlertsPanel ────────────── */
export function generateAlerts(users = []) {
  const alerts = [];
  const flagged = users.filter(u => u.flagged);
  const highVol = users.filter(u => u.highVol);
  const refundSpikes = users.filter(u => u.role === 'Bursar' && u.txToday > 14);

  if (flagged.length) {
    alerts.push({
      key: 'flagged', tone: 'critical',
      icon: 'warning',
      title: `${flagged.length} suspicious transaction${flagged.length > 1 ? 's' : ''} detected`,
      detail: flagged.map(u => u.full_name || u.email).slice(0, 3).join(', ')
        + (flagged.length > 3 ? ` and ${flagged.length - 3} more` : ''),
      users: flagged,
    });
  }
  if (highVol.length) {
    alerts.push({
      key: 'highvol', tone: 'warning',
      icon: 'trending_up',
      title: `High transaction spike — ${highVol.length} user${highVol.length > 1 ? 's' : ''}`,
      detail: 'Volume above $2,000 today. Verify against approved fee schedules.',
      users: highVol,
    });
  }
  if (refundSpikes.length) {
    alerts.push({
      key: 'refund', tone: 'warning',
      icon: 'undo',
      title: 'Refund anomaly',
      detail: `${refundSpikes.length} bursar${refundSpikes.length > 1 ? 's' : ''} processed unusually high refund volume today.`,
      users: refundSpikes,
    });
  }
  return alerts;
}
