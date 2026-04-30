/**
 * EK-SMS · Principal — role / access / permissions model.
 * Single source of truth used by the page, cards, form, details modal.
 */

export const PU_ROLES = {
  Principal: {
    label: 'Principal', sub: 'Head of School',
    icon: 'workspace_premium', color: 'var(--ska-primary)',
  },
  'Vice Principal': {
    label: 'Vice Principal', sub: 'Deputy Head',
    icon: 'star', color: 'var(--ska-secondary)',
  },
};
export const PU_ROLE_KEYS = Object.keys(PU_ROLES);

export const PU_ACCESS_LEVELS = {
  Full:       { label: 'Full Access',       sub: 'All school data & actions', color: 'var(--ska-primary)' },
  Restricted: { label: 'Restricted Access', sub: 'View-only & limited edits', color: 'var(--ska-tertiary)' },
};

export const PU_PERMISSIONS = [
  { key: 'view_all',         label: 'View All Data',    icon: 'visibility' },
  { key: 'manage_teachers',  label: 'Manage Teachers',  icon: 'group' },
  { key: 'approve_changes',  label: 'Approve Changes',  icon: 'task_alt' },
  { key: 'access_finance',   label: 'Access Finance',   icon: 'account_balance' },
  { key: 'view_reports',     label: 'View Reports',     icon: 'analytics' },
];

export const PU_NOTIFICATIONS = [
  { key: 'grade_alerts',      label: 'Grade Alerts',      icon: 'grade' },
  { key: 'attendance_alerts', label: 'Attendance Alerts', icon: 'event_available' },
  { key: 'finance_alerts',    label: 'Finance Alerts',    icon: 'payments' },
];

export const PU_PERMS_BY_ACCESS = {
  Full:       ['view_all','manage_teachers','approve_changes','access_finance','view_reports'],
  Restricted: ['view_all','view_reports'],
};

export const PU_SCOPE_OPTIONS = [
  'Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12',
];

/* ── Finance status styling ────────────────────────────────── */
export const PU_FINANCE_STYLE = {
  Stable:            { color: 'var(--ska-green)',    bg: 'var(--ska-green-dim)' },
  'Needs Attention': { color: 'var(--ska-tertiary)', bg: 'var(--ska-tertiary-dim)' },
  Critical:          { color: 'var(--ska-error)',    bg: 'var(--ska-error-dim)' },
};

/* ── Quick action buttons (executive shortcuts) ────────────── */
export const PU_QUICK_ACTIONS = [
  { key: 'analytics',    label: 'View Analytics',    icon: 'analytics',     tone: 'primary',   target: 'analytics' },
  { key: 'teachers',     label: 'Manage Teachers',   icon: 'group',         tone: 'secondary', target: 'teachers' },
  { key: 'reports',      label: 'View Reports',      icon: 'description',   tone: 'tertiary',  target: 'examinations' },
  { key: 'announcement', label: 'Send Announcement', icon: 'campaign',      tone: 'green',     target: 'notifications' },
];

/* ── Filter chip values ────────────────────────────────────── */
export const PU_STATUS_OPTIONS = [
  { key: 'all',       label: 'All' },
  { key: 'active',    label: 'Active' },
  { key: 'suspended', label: 'Suspended' },
];
