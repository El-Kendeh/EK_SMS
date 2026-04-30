/**
 * EK-SMS · Teachers module utilities — pure helpers, no React.
 */
import { SUBJECT_SPECIALIZATIONS, CSV_COLUMNS } from './teachers.constants';

/* ── Password generation (matches SAstudents.js charset) ─────── */
const PWD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
export function generatePassword(length = 12) {
  return Array.from(
    { length },
    () => PWD_CHARS[Math.floor(Math.random() * PWD_CHARS.length)]
  ).join('');
}

/* ── Strength meter ──────────────────────────────────────────── */
export function passwordStrength(pw) {
  if (!pw) return { score: 0, label: '', color: 'transparent' };
  let s = 0;
  if (pw.length >= 8)            s++;
  if (pw.length >= 12)           s++;
  if (/[A-Z]/.test(pw))          s++;
  if (/[0-9]/.test(pw))          s++;
  if (/[^A-Za-z0-9]/.test(pw))   s++;
  if (s <= 1) return { score: s, label: 'Weak',   color: 'var(--ska-error)' };
  if (s <= 3) return { score: s, label: 'Fair',   color: '#f9bc60' };
  if (s <= 4) return { score: s, label: 'Good',   color: '#6ce0b0' };
  return            { score: s, label: 'Strong', color: 'var(--ska-primary)' };
}

/* ── Avatar initials ────────────────────────────────────────── */
export function avatarInitials(first, last) {
  const a = (first || '').trim()[0] || '';
  const b = (last  || '').trim()[0] || '';
  return (a + b).toUpperCase() || '?';
}

/* ── Suggest next employee ID, e.g. T/2026/0042 ──────────────── */
export function suggestEmployeeId(existing = [], school = null) {
  const year   = new Date().getFullYear();
  const prefix = `T/${year}/`;
  const max = existing
    .map(t => (t.employee_id || ''))
    .filter(id => id.startsWith(prefix))
    .map(id => parseInt(id.replace(prefix, ''), 10))
    .filter(n => !Number.isNaN(n))
    .reduce((m, n) => Math.max(m, n), 0);
  const fallback = existing
    .map(t => (t.employee_id || ''))
    .map(id => {
      const m = id.match(/(\d+)\s*$/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .reduce((m, n) => Math.max(m, n), 0);
  const next = String(Math.max(max, fallback) + 1).padStart(4, '0');
  void school;
  return `${prefix}${next}`;
}

/* ── Subject-aware qualification suggestion ──────────────────── */
export function suggestQualification(classAssignments = []) {
  const subjs = [...new Set(
    classAssignments.map(ca => (ca.subject_name || '').toLowerCase())
  )];
  const hits = subjs
    .map(s =>
      SUBJECT_SPECIALIZATIONS[s] ||
      Object.entries(SUBJECT_SPECIALIZATIONS).find(([k]) => s.includes(k))?.[1]
    )
    .filter(Boolean);
  return [...new Set(hits)].slice(0, 2).join(' · ');
}

/* ── Field validators ────────────────────────────────────────── */
export const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());
export const isPhone = v => {
  const digits = (v || '').replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
};
export const isDate  = v => !!v && !Number.isNaN(new Date(v).getTime());

/* ── Validate a step; returns map of {field: error} (empty = OK) */
export function validatePersonal(form, existingEmails = [], existingPhones = []) {
  const errs = {};
  if (!form.first_name?.trim()) errs.first_name = 'Required';
  if (!form.last_name?.trim())  errs.last_name  = 'Required';
  if (!form.email?.trim())      errs.email      = 'Required';
  else if (!isEmail(form.email)) errs.email     = 'Invalid email format';
  else if (existingEmails.includes(form.email.trim().toLowerCase())) errs.email = 'Already in use';
  if (form.phone_number && !isPhone(form.phone_number)) errs.phone_number = 'Invalid number';
  else if (form.phone_number && existingPhones.includes(form.phone_number.trim())) errs.phone_number = 'Already in use';
  if (form.date_of_birth && !isDate(form.date_of_birth)) errs.date_of_birth = 'Invalid date';
  if (form.emergency_contact_phone && !isPhone(form.emergency_contact_phone)) errs.emergency_contact_phone = 'Invalid number';
  return errs;
}

export function validateAccount(form) {
  const errs = {};
  if (!form.employee_id?.trim()) errs.employee_id = 'Required';
  if (!form.password || form.password.length < 8) errs.password = 'At least 8 characters';
  if (form.hire_date && !isDate(form.hire_date)) errs.hire_date = 'Invalid date';
  if (form.is_class_teacher && !form.homeroom_class_id) errs.homeroom_class_id = 'Pick a homeroom class';
  return errs;
}

export function validateCompliance(form) {
  const errs = {};
  if (form.license_expiry && !isDate(form.license_expiry)) errs.license_expiry = 'Invalid date';
  if (form.police_clearance_date && !isDate(form.police_clearance_date)) errs.police_clearance_date = 'Invalid date';
  if (form.safeguarding_training_date && !isDate(form.safeguarding_training_date)) errs.safeguarding_training_date = 'Invalid date';
  if (form.on_probation && !form.probation_end_date) errs.probation_end_date = 'Set probation end date';
  return errs;
}

/* ── Profile completion % across all fields ──────────────────── */
export function completionPercent(form, photo = null, classAssignments = [], documents = []) {
  const tracked = [
    form.first_name, form.last_name, form.email, form.phone_number,
    form.password, form.employee_id, form.qualification, form.hire_date,
    form.employment_type, form.gender, form.date_of_birth,
    form.emergency_contact_phone, form.address,
    form.nin, form.nassit_number,
    photo, classAssignments.length > 0, documents.length > 0,
  ];
  const filled = tracked.filter(Boolean).length;
  return Math.round((filled / tracked.length) * 100);
}

/* ── Workload calc using real periods_per_week from subjects ──── */
export function calcWorkload(classAssignments = [], subjects = []) {
  const subById = Object.fromEntries(subjects.map(s => [String(s.id), s]));
  return classAssignments.reduce((sum, ca) => {
    const s = subById[String(ca.subject_id)];
    const p = s ? Number(s.periods_per_week) || 4 : 4;
    return sum + p;
  }, 0);
}

/* ── CSV parser (no deps) — handles quoted commas + CRLF ─────── */
export function parseCsv(text) {
  const rows  = [];
  let i = 0, row = [], cell = '', inQuote = false;
  while (i < text.length) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i += 2; continue; }
      if (c === '"') { inQuote = false; i++; continue; }
      cell += c; i++; continue;
    }
    if (c === '"') { inQuote = true; i++; continue; }
    if (c === ',') { row.push(cell); cell = ''; i++; continue; }
    if (c === '\r') { i++; continue; }
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; continue; }
    cell += c; i++;
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => (c || '').trim() !== ''));
}

/* ── Build CSV template content with header row + comment ─────── */
export function csvTemplate() {
  const header = CSV_COLUMNS.map(c => c.label).join(',');
  const example = [
    'Abu', 'Kamara', 'abu.kamara@example.com', '+232 76 123 456',
    'T/2026/0001', 'B.Sc. Mathematics', '2026-01-15', 'full_time',
    'Mathematics', 'male', '1992-04-12', '', '', '',
  ].join(',');
  return `${header}\n${example}\n`;
}

/* ── Validate one CSV row against column spec ─────────────────── */
export function validateCsvRow(rowObj) {
  const errs = [];
  CSV_COLUMNS.forEach(col => {
    const v = (rowObj[col.key] || '').trim();
    if (col.required && !v) errs.push(`${col.label} required`);
    if (col.key === 'email' && v && !isEmail(v)) errs.push('Invalid email');
    if (col.key === 'date_of_birth' && v && !isDate(v)) errs.push('Bad DOB date');
    if (col.key === 'hire_date' && v && !isDate(v)) errs.push('Bad hire date');
    if (col.key === 'employment_type' && v && !['full_time','part_time','contract','volunteer','substitute'].includes(v)) errs.push('Bad employment type');
    if (col.key === 'gender' && v && !['female','male','other'].includes(v)) errs.push('Bad gender');
  });
  return errs;
}

/* ── Convert canvas + crop config → cropped Blob ──────────────── */
/* `frameSize` is the on-screen preview frame size (CSS px) used to
   capture offsetX/offsetY — we scale them up to canvas-pixel space. */
export async function cropImage(file, { zoom = 1, offsetX = 0, offsetY = 0, size = 512, frameSize = 110 } = {}) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(size / img.width, size / img.height) * zoom;
      const dw = img.width * scale;
      const dh = img.height * scale;
      const ratio = size / frameSize;
      const dx = (size - dw) / 2 + offsetX * ratio;
      const dy = (size - dh) / 2 + offsetY * ratio;
      ctx.fillStyle = '#0b1326';
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, dx, dy, dw, dh);
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('Crop failed')), 'image/jpeg', 0.9);
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = URL.createObjectURL(file);
  });
}

/* ── Format dates for display ────────────────────────────────── */
export function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

/* ── Days until license expiry (negative = expired) ──────────── */
export function daysUntil(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  const now = new Date();
  return Math.round((d - now) / (1000 * 60 * 60 * 24));
}
