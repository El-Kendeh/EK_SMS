/**
 * EK-SMS · Principal — pure helpers (no React).
 * Utility functions only — all data comes from the backend.
 */
import {
  PU_ROLES, PU_ROLE_KEYS, PU_ACCESS_LEVELS, PU_PERMS_BY_ACCESS, PU_SCOPE_OPTIONS,
} from './principal.constants';

/* ── Health-score color ───────────────────────────────────── */
export function puHealthColor(score) {
  if (score >= 80) return 'var(--ska-green)';
  if (score >= 65) return 'var(--ska-tertiary)';
  return 'var(--ska-error)';
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
