/**
 * EK-SMS · Bursar / Finance — pure helpers (no React).
 * Mirrors principal.utils.js conventions so money formatting stays
 * consistent across dashboards.
 */

export const fmtMoney = (n) =>
  '$' + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

export const fmtMoneyCompact = (n) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return '$' + (v / 1_000_000).toFixed(1) + 'M';
  if (v >= 1_000)     return '$' + (v / 1_000).toFixed(1) + 'k';
  return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? '—'
    : dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

export const fmtDateTime = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return Number.isNaN(dt.getTime())
    ? '—'
    : dt.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/** FeeCategory.applicable_classes is stored as a JSON string (or null). */
export const parseApplicableClasses = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

/** Fee.status values set by the backend (assignFees / recordPayment). */
export const FEE_STATUS = {
  pending: { label: 'Pending', badge: 'pending' },
  partial: { label: 'Partial', badge: 'primary' },
  paid:    { label: 'Paid',    badge: 'green' },
};

/** Payment methods accepted by recordPayment (free string; backend defaults to cash). */
export const PAYMENT_METHODS = [
  { value: 'cash',          label: 'Cash' },
  { value: 'mobile_money',  label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'card',          label: 'Card' },
  { value: 'other',         label: 'Other' },
];

export const methodLabel = (value) =>
  (PAYMENT_METHODS.find((m) => m.value === value) || {}).label
  || (value ? value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—');

/** Expense categories (backend stores free string, defaults to 'general'). */
export const EXPENSE_CATEGORIES = [
  'general', 'utilities', 'salaries', 'maintenance', 'supplies', 'transport', 'events', 'other',
];

export const catLabel = (c) =>
  (c || 'general').replace(/\b\w/g, (ch) => ch.toUpperCase());

/** Fee category frequencies (backend stores free string, defaults to 'term'). */
export const FEE_FREQUENCIES = [
  { value: 'term',     label: 'Per Term' },
  { value: 'monthly',  label: 'Monthly' },
  { value: 'annual',   label: 'Annual' },
  { value: 'one-time', label: 'One-time' },
];

export const freqLabel = (value) =>
  (FEE_FREQUENCIES.find((f) => f.value === value) || {}).label || (value || 'Per Term');

export const initials = (name) =>
  (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';
