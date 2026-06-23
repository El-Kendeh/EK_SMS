/**
 * EK-SMS · Students module utilities — pure helpers, no React.
 */
import { CSV_COLUMNS, DRAFTS_KEY } from './students.constants';

/* ── Password / age helpers ──────────────────────────────────── */
const PWD_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
export function generatePassword(length = 10) {
  return Array.from({ length }, () => PWD_CHARS[Math.floor(Math.random() * PWD_CHARS.length)]).join('');
}
export function previewUsername(admNo) {
  if (!admNo) return '—';
  return `stu_${String(admNo).replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`.slice(0, 30);
}
export function calculateAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const birth = new Date(dob);
  if (Number.isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

/* ── Validators ──────────────────────────────────────────────── */
export const isEmail = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((v || '').trim());
export const isPhone = v => {
  const d = (v || '').replace(/\D/g, '');
  return d.length >= 7 && d.length <= 15;
};
export const isDate = v => !!v && !Number.isNaN(new Date(v).getTime());

/* ── Step validators (mirror the wizard's step gating) ───────── */
export function validatePersonal(form) {
  const errs = {};
  if (!form.first_name?.trim()) errs.first_name = 'First name is required';
  if (!form.last_name?.trim())  errs.last_name  = 'Last name is required';
  if (!form.gender)             errs.gender     = 'Gender is required';
  if (!form.date_of_birth)      errs.date_of_birth = 'Date of birth is required';
  else if (!isDate(form.date_of_birth)) errs.date_of_birth = 'Invalid date';
  else {
    const dob = new Date(form.date_of_birth), now = new Date();
    if (dob > now) errs.date_of_birth = 'Date of birth cannot be in the future';
    else {
      const yrs = (now - dob) / (365.25 * 24 * 3600 * 1000);
      if (yrs < 3)  errs.date_of_birth = 'Student appears too young for enrolment';
      if (yrs > 30) errs.date_of_birth = 'Please verify — age is over 30 years';
    }
  }
  if (form.email?.trim() && !isEmail(form.email)) errs.email = 'Enter a valid email';
  if (form.phone_number && !isPhone(form.phone_number)) errs.phone_number = 'Invalid phone';
  return errs;
}

export function validateEnrollment(form) {
  const errs = {};
  if (!form.classroom_id)    errs.classroom_id    = 'Class / Grade must be assigned';
  if (!form.enrollment_date) errs.enrollment_date = 'Enrolment date is required';
  return errs;
}

export function validateGuardian(form) {
  const errs = {};
  if (form.father_email?.trim() && !isEmail(form.father_email)) errs.father_email = 'Invalid email';
  if (form.guardian2_email?.trim() && !isEmail(form.guardian2_email)) errs.guardian2_email = 'Invalid email';
  if (form.father_phone && !isPhone(form.father_phone)) errs.father_phone = 'Invalid phone';
  if (form.guardian2_phone && !isPhone(form.guardian2_phone)) errs.guardian2_phone = 'Invalid phone';
  if (form.emergency_phone && !isPhone(form.emergency_phone)) errs.emergency_phone = 'Invalid phone';
  return errs;
}

export function validateHealth(form) {
  const errs = {};
  if (form.is_critical_medical && !form.medical_conditions?.trim() && !form.allergies?.trim())
    errs.medical_conditions = 'Critical alert needs an explanation';
  if (form.sen_iep && !form.sen_notes?.trim()) errs.sen_notes = 'IEP students need notes';
  return errs;
}

/* ── Sibling matcher: students sharing surname AND home_address ── */
export function findSiblings(form, allStudents = []) {
  if (!form.last_name?.trim()) return [];
  const lastLower = form.last_name.trim().toLowerCase();
  const hits = allStudents.filter(s => {
    const sameSurname = (s.last_name || '').trim().toLowerCase() === lastLower;
    if (!sameSurname) return false;
    const sameAddress = form.home_address?.trim() && (s.home_address || '').trim().toLowerCase() === form.home_address.trim().toLowerCase();
    const sameFatherPhone = form.father_phone && s.father_phone === form.father_phone;
    const sameMotherPhone = form.guardian2_phone && s.mother_phone === form.guardian2_phone;
    return sameAddress || sameFatherPhone || sameMotherPhone;
  });
  return hits.slice(0, 6);
}

/* ── Duplicate detector: same first+last+DOB (within 7 days) ── */
export function findDuplicates(form, allStudents = []) {
  if (!form.first_name?.trim() || !form.last_name?.trim() || !form.date_of_birth) return [];
  const fn  = form.first_name.trim().toLowerCase();
  const ln  = form.last_name.trim().toLowerCase();
  const dob = new Date(form.date_of_birth).getTime();
  if (Number.isNaN(dob)) return [];
  const sevenDays = 7 * 24 * 3600 * 1000;
  return allStudents.filter(s => {
    if ((s.first_name || '').toLowerCase().trim() !== fn) return false;
    if ((s.last_name  || '').toLowerCase().trim() !== ln) return false;
    if (!s.date_of_birth) return false;
    const sd = new Date(s.date_of_birth).getTime();
    return Math.abs(sd - dob) <= sevenDays;
  }).slice(0, 3);
}

/* ── Multi-draft manager ─────────────────────────────────────── */
export function listDrafts() {
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}
export function loadDraft(id) {
  return listDrafts().find(d => d.id === id) || null;
}
export function saveDraft(id, data) {
  const drafts = listDrafts();
  const idx = drafts.findIndex(d => d.id === id);
  const entry = {
    id,
    label: [data.form?.first_name, data.form?.last_name].filter(Boolean).join(' ').trim() || 'Unnamed draft',
    step:  data.step ?? 0,
    savedAt: new Date().toISOString(),
    form: data.form,
    documents: data.documents || [],
  };
  if (idx >= 0) drafts[idx] = entry; else drafts.push(entry);
  /* Cap at 10 drafts to avoid quota issues. */
  const trimmed = drafts.slice(-10);
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(trimmed)); } catch { /* */ }
  return entry;
}
export function deleteDraft(id) {
  const drafts = listDrafts().filter(d => d.id !== id);
  try { localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts)); } catch { /* */ }
}
export function clearAllDrafts() {
  try { localStorage.removeItem(DRAFTS_KEY); } catch { /* */ }
}
export function newDraftId() {
  return `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/* ── Format dates for display ────────────────────────────────── */
export function fmtDate(iso, opts) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, opts || { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}
export function relTimeFromNow(iso) {
  if (!iso) return '—';
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d < 7) return `${d}d ago`;
  return fmtDate(iso);
}

/* ── CSV parser (no deps) ───────────────────────────────────── */
export function parseCsv(text) {
  const rows = [];
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
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter(r => r.some(c => (c || '').trim() !== ''));
}

export function csvTemplate() {
  const header  = CSV_COLUMNS.map(c => c.label).join(',');
  const example = [
    'Aminata', '', 'Kamara', 'Female', '2014-08-12',
    'Sierra Leonean', 'Islam', '12 Wilberforce St', 'Freetown',
    '', '', 'STU/2026/0042', '1', '2026-01-15', 'Day', 'Standard',
    'Mohamed Kamara', '+232 76 111 222', 'Fatmata Kamara', '+232 76 333 444',
    'O+', '', 'false', '',
  ].join(',');
  return `${header}\n${example}\n`;
}

export function validateCsvRow(rowObj) {
  const errs = [];
  CSV_COLUMNS.forEach(col => {
    const v = (rowObj[col.key] || '').trim();
    if (col.required && !v) errs.push(`${col.label} required`);
    if (col.key === 'email'         && v && !isEmail(v))   errs.push('Invalid email');
    if (col.key === 'date_of_birth' && v && !isDate(v))    errs.push('Bad DOB');
    if (col.key === 'enrollment_date' && v && !isDate(v))  errs.push('Bad enrol date');
    if (col.key === 'gender'        && v && !['Male','Female','Other','M','F','O'].includes(v)) errs.push('Bad gender');
    if (col.key === 'student_type'  && v && !['Day','Boarding'].includes(v)) errs.push('Bad type');
  });
  return errs;
}

/* ── Server error → field mapping for inline display ───────── */
export function mapServerError(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('admission'))    return { field: 'admission_number', message: msg, step: 1 };
  if (m.includes('classroom') || m.includes('class'))
                                  return { field: 'classroom_id',     message: msg, step: 1 };
  if (m.includes('email'))        return { field: 'email',            message: msg, step: 0 };
  if (m.includes('phone'))        return { field: 'phone_number',     message: msg, step: 0 };
  if (m.includes('first_name'))   return { field: 'first_name',       message: msg, step: 0 };
  if (m.includes('last_name'))    return { field: 'last_name',        message: msg, step: 0 };
  if (m.includes('date of birth') || m.includes('date_of_birth'))
                                  return { field: 'date_of_birth',    message: msg, step: 0 };
  return { field: null, message: msg, step: -1 };
}

/* ── Body-scroll lock (compatible with multiple modals) ──────── */
let lockCount = 0;
let prevOverflow = '';
export function lockBodyScroll() {
  if (lockCount === 0) {
    prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}
export function unlockBodyScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) document.body.style.overflow = prevOverflow || '';
}
