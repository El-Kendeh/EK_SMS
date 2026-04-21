// Relative time formatter
export function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Deterministic avatar color from name
export function getAvatarColor(name = '') {
  const colors = ['#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981'];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
}

// Get initials from full name
export function getInitials(fullName = '') {
  return fullName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// Grade color based on score
export function getGradeColor(score) {
  if (score >= 70) return 'var(--student-primary)';
  if (score >= 50) return 'var(--student-warning)';
  return 'var(--student-danger)';
}

// Grade background tint for table cells
export function getGradeBgTint(score) {
  if (score >= 70) return 'rgba(16,185,129,0.08)';
  if (score >= 50) return 'rgba(245,158,11,0.08)';
  return 'rgba(239,68,68,0.08)';
}

// Ordinal suffix (1st, 2nd, 3rd, 4th...)
export function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Mask phone number
export function maskPhone(phone = '') {
  const digits = phone.replace(/\D/g, '');
  const last4 = digits.slice(-4);
  return `+*** *** ${last4}`;
}

// Mask email
export function maskEmail(email = '') {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local.slice(0, 2)}***@${domain}`;
}

// Calculate term week progress
export function getTermProgress(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const now = new Date();
  const totalMs = end - start;
  const elapsedMs = now - start;
  const totalWeeks = Math.ceil(totalMs / (7 * 24 * 3600 * 1000));
  const currentWeek = Math.min(Math.max(Math.ceil(elapsedMs / (7 * 24 * 3600 * 1000)), 0), totalWeeks);
  const percentage = Math.min(Math.max(Math.round((elapsedMs / totalMs) * 100), 0), 100);
  const daysRemaining = Math.max(Math.ceil((end - now) / (24 * 3600 * 1000)), 0);
  return { currentWeek, totalWeeks, percentage, daysRemaining };
}

// Icon for notification type
export function getNotificationIcon(type) {
  switch (type) {
    case 'MODIFICATION_ATTEMPT': return 'warning';
    case 'GRADE_LOCKED': return 'lock';
    case 'GRADE_POSTED': return 'grade';
    case 'GRADE_PENDING': return 'edit_note';
    case 'REPORT_AVAILABLE': return 'description';
    default: return 'notifications';
  }
}

// Border color for notification type
export function getNotificationBorderColor(type, isSecurityAlert) {
  if (isSecurityAlert || type === 'MODIFICATION_ATTEMPT') return 'var(--student-danger)';
  if (type === 'GRADE_LOCKED') return 'var(--student-primary)';
  if (type === 'GRADE_PENDING') return '#F59E0B';
  if (type === 'REPORT_AVAILABLE') return '#3B82F6';
  return '#E5E7EB';
}
