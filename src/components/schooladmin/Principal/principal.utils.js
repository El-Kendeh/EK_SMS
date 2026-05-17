/**
 * EK-SMS · Principal — pure helpers (no React).
 * Utility functions only — all data comes from the backend.
 */

export function puHealthColor(score) {
  if (score >= 80) return 'var(--ska-green)';
  if (score >= 65) return 'var(--ska-tertiary)';
  return 'var(--ska-error)';
}

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
