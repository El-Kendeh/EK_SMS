export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}
export function getPeriodClass(period) {
  if (period.type === 'duty') return 'period-duty';
  if (period.type === 'break') return 'period-break';
  if (period.subjectCode === 'MTH') return 'period-math';
  if (period.subjectCode === 'MTE') return 'period-elective';
  return 'period-default';
}
export function getCurrentDay() {
  const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  return days[new Date().getDay()];
}
export function getCurrentTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
}
export function isPeriodNow(period) {
  if (period.day !== getCurrentDay()) return false;
  const current = getCurrentTime();
  return current >= period.startTime && current < period.endTime;
}
export function isPeriodUpcomingToday(period) {
  if (period.day !== getCurrentDay()) return false;
  return getCurrentTime() < period.startTime;
}
export function getPeriodsForDay(periods, day) {
  const arr = Array.isArray(periods) ? periods : [];
  return arr.filter(p => p.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
}
export function getWorkloadSummary(periods) {
  const arr = Array.isArray(periods) ? periods : [];
  const teachingPeriods = arr.filter(p => p.type === 'teaching');
  const totalMinutes = teachingPeriods.reduce((acc, p) => {
    const [sh, sm] = p.startTime.split(':').map(Number);
    const [eh, em] = p.endTime.split(':').map(Number);
    return acc + ((eh * 60 + em) - (sh * 60 + sm));
  }, 0);
  return { teachingHours: Math.round(totalMinutes / 60 * 10) / 10, teachingPeriods: teachingPeriods.length, dutyPeriods: arr.filter(p => p.type === 'duty').length };
}
export function getGreeting(firstName) {
  const hour = new Date().getHours();
  const time = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  return `Good ${time}, ${firstName}`;
}
export function sortTeacherNotifications(notifications) {
  return [...notifications].sort((a, b) => {
    const aUrgent = a.type === 'MODIFICATION_ATTEMPT' && !a.isRead;
    const bUrgent = b.type === 'MODIFICATION_ATTEMPT' && !b.isRead;
    if (aUrgent && !bUrgent) return -1;
    if (!aUrgent && bUrgent) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}
