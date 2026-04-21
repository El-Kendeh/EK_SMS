export function calculateGradeLetter(score, boundaries) {
  if (score === null || score === undefined || score === '') return null;
  const numScore = Number(score);
  if (isNaN(numScore) || numScore < 0 || numScore > 100) return null;
  const boundary = boundaries.find(b => numScore >= b.min && numScore <= b.max);
  return boundary ? boundary.letter : null;
}
export function isPassing(score, passMark = 50) {
  return score !== null && Number(score) >= passMark;
}
export function getScoreColor(score) {
  if (score === null || score === undefined) return 'var(--tch-text-secondary)';
  const n = Number(score);
  if (n >= 70) return 'var(--tch-primary)';
  if (n >= 50) return 'var(--tch-warning)';
  return 'var(--tch-error)';
}
export function getScoreBgTint(score) {
  if (score === null || score === undefined) return 'transparent';
  const n = Number(score);
  if (n >= 70) return 'var(--grade-locked-bg)';
  if (n >= 50) return 'var(--grade-draft-bg)';
  return 'var(--modification-banner-bg)';
}
export function getGradeLetterColor(letter, boundaries) {
  if (!boundaries) return 'var(--tch-text-secondary)';
  const b = boundaries.find(b => b.letter === letter);
  return b ? b.color : 'var(--tch-text-secondary)';
}
export function validateScore(value) {
  if (value === '' || value === null) return { valid: true, error: null };
  const n = Number(value);
  if (isNaN(n)) return { valid: false, error: 'Must be a number' };
  if (n < 0) return { valid: false, error: 'Cannot be negative' };
  if (n > 100) return { valid: false, error: 'Cannot exceed 100' };
  return { valid: true, error: null };
}
export function calculateClassAverage(grades) {
  const withScores = grades.filter(g => g.score !== null && g.score !== undefined);
  if (withScores.length === 0) return null;
  const sum = withScores.reduce((acc, g) => acc + Number(g.score), 0);
  return Math.round((sum / withScores.length) * 10) / 10;
}
export function getCompletionStatus(stats) {
  if (!stats) return 'not-started';
  if (stats.pending === stats.total) return 'not-started';
  if (stats.locked === stats.total) return 'complete';
  return 'in-progress';
}
export function getStatusConfig(status) {
  const configs = {
    locked: { label: 'Locked', icon: 'lock', cssClass: 'status-locked', color: 'var(--tch-primary)' },
    draft: { label: 'Draft', icon: 'edit', cssClass: 'status-draft', color: 'var(--tch-warning)' },
    pending: { label: 'Pending', icon: 'radio_button_unchecked', cssClass: 'status-pending', color: 'var(--tch-text-secondary)' },
    submitted: { label: 'Submitted', icon: 'send', cssClass: 'status-submitted', color: 'var(--tch-info)' },
  };
  return configs[status] || configs.pending;
}
export function getDeadlineWarning(deadlineDate) {
  if (!deadlineDate) return null;
  const deadline = new Date(deadlineDate);
  const now = new Date();
  const daysLeft = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { level: 'danger', text: 'Deadline passed' };
  if (daysLeft === 0) return { level: 'danger', text: 'Due today' };
  if (daysLeft <= 3) return { level: 'danger', text: `${daysLeft} day${daysLeft > 1 ? 's' : ''} left` };
  if (daysLeft <= 7) return { level: 'warning', text: `${daysLeft} days left` };
  return { level: 'info', text: `${daysLeft} days until deadline` };
}
