/**
 * EK-SMS · Finance Users — role / permission / risk model.
 * Single source of truth used by the page, cards, form, details modal.
 */

export const FU_PERMISSIONS = [
  { key: 'record_payments', label: 'Record Payments', icon: 'payments'      },
  { key: 'issue_receipts',  label: 'Issue Receipts',  icon: 'receipt_long'  },
  { key: 'view_reports',    label: 'View Reports',    icon: 'analytics'     },
  { key: 'approve_refunds', label: 'Approve Refunds', icon: 'undo'          },
  { key: 'manage_fees',     label: 'Manage Fees',     icon: 'price_change'  },
];

export const FU_ROLES = {
  Bursar: {
    label: 'Bursar', sub: 'Full Access',
    icon: 'verified_user', tone: 'green',
    color: 'var(--ska-green)', dim: 'var(--ska-green-dim)',
    defaults: ['record_payments','issue_receipts','view_reports','approve_refunds','manage_fees'],
  },
  Cashier: {
    label: 'Cashier', sub: 'Operations',
    icon: 'point_of_sale', tone: 'primary',
    color: 'var(--ska-primary)', dim: 'var(--ska-primary-dim)',
    defaults: ['record_payments','issue_receipts'],
  },
  Auditor: {
    label: 'Auditor', sub: 'Read-only',
    icon: 'fact_check', tone: 'gray',
    color: 'var(--ska-text-2)', dim: 'var(--ska-surface-high)',
    defaults: ['view_reports'],
  },
};
export const FU_ROLE_KEYS = Object.keys(FU_ROLES);

export const FU_SCOPE_OPTIONS = [
  'Grade 7A','Grade 7B','Grade 8A','Grade 8B','Grade 9A','Grade 9B',
  'Grade 10A','Grade 10B','Grade 11A','Grade 12A',
];

/* ── Risk indicator levels ─────────────────────────────────── */
export const FU_RISK = {
  low:    { label: 'Low Risk',    color: 'var(--ska-green)',    bg: 'var(--ska-green-dim)',    icon: 'shield' },
  medium: { label: 'Medium Risk', color: '#f59e0b',             bg: 'rgba(245,158,11,0.14)',   icon: 'warning_amber' },
  high:   { label: 'High Risk',   color: 'var(--ska-error)',    bg: 'var(--ska-error-dim)',    icon: 'priority_high' },
};

/* ── Time-of-day buckets used by TransactionHeat ───────────── */
export const FU_HEAT_BUCKETS = [
  { key: 'morning',   label: 'Morning',   sub: '8 AM – 12 PM', icon: 'wb_sunny' },
  { key: 'afternoon', label: 'Afternoon', sub: '12 PM – 5 PM', icon: 'partly_cloudy_day' },
  { key: 'evening',   label: 'Evening',   sub: '5 PM – 8 PM',  icon: 'nights_stay' },
];

export const FU_HEAT_TONE = {
  Low:    { color: 'var(--ska-green)',   bg: 'var(--ska-green-dim)',   pct: 30 },
  Medium: { color: '#f59e0b',            bg: 'rgba(245,158,11,0.14)',  pct: 60 },
  High:   { color: 'var(--ska-error)',   bg: 'var(--ska-error-dim)',   pct: 95 },
};

/* ── Filter option lists for the FiltersBar ────────────────── */
export const FU_STATUS_OPTIONS = [
  { key: 'all',       label: 'All' },
  { key: 'active',    label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
];

export const FU_ACTIVITY_OPTIONS = [
  { key: 'all',  label: 'All' },
  { key: 'high', label: 'High' },
  { key: 'low',  label: 'Low' },
  { key: 'idle', label: 'Idle' },
];

export const FU_RISK_OPTIONS = [
  { key: 'all',    label: 'All' },
  { key: 'low',    label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high',   label: 'High' },
];

/* ── Integrity badges (System Integrity panel) ─────────────── */
export const FU_INTEGRITY_BADGES = [
  { key: 'sha256',  label: 'SHA-256 Hashed',     icon: 'tag',          color: 'var(--ska-primary)' },
  { key: 'audit',   label: 'Audit Trail Enabled',icon: 'history_edu',  color: 'var(--ska-secondary)' },
  { key: 'merkle',  label: 'Immutable Records',  icon: 'lock',         color: 'var(--ska-green)' },
];
