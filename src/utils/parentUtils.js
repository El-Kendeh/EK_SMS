// ─── Parent Utility Functions ─────────────────────────────────────────────

export function formatParentRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 2) return 'Just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return '1 week ago';
  if (weeks < 5) return `${weeks} weeks ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function getGradeColor(score) {
  if (score >= 80) return 'success';
  if (score >= 65) return 'info';
  if (score >= 50) return 'warning';
  return 'danger';
}

export function getGradeLetterColor(letter) {
  if (!letter) return 'var(--par-text-secondary)';
  const l = letter.toUpperCase();
  if (l.startsWith('A')) return 'var(--par-primary)';
  if (l.startsWith('B')) return '#3B82F6';
  if (l.startsWith('C')) return '#F59E0B';
  if (l.startsWith('D')) return '#F97316';
  return 'var(--par-error)';
}

export function getStatusMeta(status) {
  switch (status) {
    case 'locked':  return { label: 'Locked',     icon: 'lock',      color: 'success' };
    case 'draft':   return { label: 'Draft',       icon: 'edit_note', color: 'warning' };
    case 'pending': return { label: 'Pending',     icon: 'schedule',  color: 'warning' };
    default:        return { label: 'Unverified',  icon: 'help',      color: 'muted' };
  }
}

export function getNotifMeta(type) {
  switch (type) {
    case 'security_alert': return { icon: 'warning', color: 'critical', label: 'Security Alert' };
    case 'grade_posted':   return { icon: 'assignment_turned_in', color: 'success', label: 'Grade' };
    case 'grade_locked':   return { icon: 'lock', color: 'info', label: 'Grade Locked' };
    case 'attendance':     return { icon: 'school', color: 'tertiary', label: 'Attendance' };
    case 'report_card':    return { icon: 'description', color: 'info', label: 'Report Card' };
    case 'system':         return { icon: 'campaign', color: 'muted', label: 'System' };
    default:               return { icon: 'notifications', color: 'muted', label: 'Notice' };
  }
}

export function getChildColors(colorIndex) {
  const palette = [
    { bg: '#10B981', light: 'rgba(16,185,129,0.12)', text: '#065F46', border: '#10B981' },
    { bg: '#3B82F6', light: 'rgba(59,130,246,0.12)', text: '#1E3A8A', border: '#3B82F6' },
    { bg: '#8B5CF6', light: 'rgba(139,92,246,0.12)', text: '#4C1D95', border: '#8B5CF6' },
    { bg: '#F59E0B', light: 'rgba(245,158,11,0.12)', text: '#78350F', border: '#F59E0B' },
    { bg: '#EC4899', light: 'rgba(236,72,153,0.12)', text: '#831843', border: '#EC4899' },
  ];
  return palette[colorIndex % palette.length];
}

export function calcOverallAverage(grades) {
  if (!grades || grades.length === 0) return 0;
  const sum = grades.reduce((a, g) => a + (g.score || 0), 0);
  return Math.round((sum / grades.length) * 10) / 10;
}

export function getTermLabel(term, year) {
  return `${term} · ${year}`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}
