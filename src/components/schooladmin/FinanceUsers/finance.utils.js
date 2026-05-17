/**
 * EK-SMS · Finance Users — pure helpers (no React).
 * Utility functions only — all data comes from the backend.
 */

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

/* ── Aggregate metrics across all users ───────────── */
export function summariseUsers(users = []) {
  const total      = users.length;
  const active     = users.filter(u => u.is_active).length;
  const suspended  = total - active;
  const txToday    = users.reduce((s, u) => s + (u.tx_today || 0),  0);
  const volToday   = users.reduce((s, u) => s + (u.tx_amount || 0), 0);
  const volTotal   = users.reduce((s, u) => s + (u.tx_total || 0),  0);
  const receipts   = users.reduce((s, u) => s + (u.receipts_today || 0), 0);
  const refunds    = users.reduce((s, u) => s + (u.refunds_today || 0), 0);
  const flagged    = users.filter(u => u.flagged).length;
  const highVol    = users.filter(u => u.high_vol).length;
  const riskLevels = {
    low:    users.filter(u => u.risk === 'low').length,
    medium: users.filter(u => u.risk === 'medium').length,
    high:   users.filter(u => u.risk === 'high').length,
  };
  return { total, active, suspended, txToday, volToday, volTotal,
           receipts, refunds, flagged, highVol, riskLevels };
}

/* ── Heat-map summary from backend data ── */
export function heatSummary(users = []) {
  const txToday = users.reduce((s, u) => s + (u.tx_today || 0), 0);
  const morning = Math.round(txToday * 0.3);
  const afternoon = Math.round(txToday * 0.5);
  const evening = txToday - morning - afternoon;
  const max = Math.max(morning, afternoon, evening, 1);

  return [
    { label: 'Morning', count: morning, pct: Math.round(morning / max * 100), level: morning / max >= 0.7 ? 'High' : morning / max >= 0.35 ? 'Medium' : 'Low' },
    { label: 'Afternoon', count: afternoon, pct: Math.round(afternoon / max * 100), level: afternoon / max >= 0.7 ? 'High' : afternoon / max >= 0.35 ? 'Medium' : 'Low' },
    { label: 'Evening', count: evening, pct: Math.round(evening / max * 100), level: evening / max >= 0.7 ? 'High' : evening / max >= 0.35 ? 'Medium' : 'Low' },
  ];
}

/* ── Generate system alerts from backend data ────────────── */
export function generateAlerts(users = []) {
  const alerts = [];
  const flagged = users.filter(u => u.flagged);
  const highVol = users.filter(u => u.high_vol);

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
      title: `High transaction volume — ${highVol.length} user${highVol.length > 1 ? 's' : ''}`,
      detail: 'Verify against approved fee schedules.',
      users: highVol,
    });
  }
  return alerts;
}
