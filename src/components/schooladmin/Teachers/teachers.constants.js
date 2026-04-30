/**
 * EK-SMS · Teachers module constants
 * Centralised so AddTeacherWizard, EditTeacher, BulkImport all share the same vocab.
 */

/* ── Specialisation lookup keyed by subject keyword ──────────── */
export const SUBJECT_SPECIALIZATIONS = {
  mathematics: 'B.Sc. / M.Sc. Mathematics, PGCE Mathematics',
  math: 'B.Sc. Mathematics',
  physics: 'B.Sc. Physics, Physics Education',
  chemistry: 'B.Sc. Chemistry',
  biology: 'B.Sc. Biology / Life Sciences',
  english: 'B.A. English, Linguistics or Literature',
  literature: 'B.A. English Literature',
  history: 'B.A. History',
  geography: 'B.A. / B.Sc. Geography',
  economics: 'B.A. / B.Sc. Economics',
  'computer science': 'B.Sc. Computer Science / Information Technology',
  ict: 'B.Sc. ICT or Computer Science',
  french: 'B.A. French / Modern Languages',
  arabic: 'B.A. Arabic / Islamic Studies',
  'religious studies': 'B.A. Religious Studies / Theology',
  'social studies': 'B.A. Social Studies / Sociology',
  'physical education': 'B.Sc. Physical Education / Sports Science',
  art: 'B.A. Fine Arts',
  music: 'B.A. Music',
};

/* ── Employment + role taxonomy ──────────────────────────────── */
export const EMPLOYMENT_TYPES = [
  { key: 'full_time', label: 'Full-time',  hint: 'Standard 30-40 periods/week' },
  { key: 'part_time', label: 'Part-time',  hint: '15-25 periods/week' },
  { key: 'contract',  label: 'Contract',   hint: 'Fixed-term contract' },
  { key: 'volunteer', label: 'Volunteer',  hint: 'Unpaid / volunteer staff' },
  { key: 'substitute',label: 'Substitute', hint: 'Cover / supply teacher' },
];

export const ROLE_TIERS = [
  { key: 'teacher',          label: 'Teacher',           desc: 'Classroom teacher' },
  { key: 'senior_teacher',   label: 'Senior Teacher',    desc: '5+ years experience' },
  { key: 'head_of_dept',     label: 'Head of Department', desc: 'Manages a subject area' },
  { key: 'deputy_head',      label: 'Deputy Head',       desc: 'School leadership' },
  { key: 'special_needs',    label: 'Special Needs',     desc: 'SEN / inclusion specialist' },
];

export const DEPARTMENTS = [
  'Sciences', 'Mathematics', 'Languages', 'Humanities',
  'Arts', 'Physical Education', 'ICT & Computing',
  'Religious Studies', 'Vocational', 'Pastoral / Counselling',
];

export const GENDERS = [
  { key: 'female', label: 'Female', icon: 'female' },
  { key: 'male',   label: 'Male',   icon: 'male' },
  { key: 'other',  label: 'Other',  icon: 'transgender' },
];

export const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Friend', 'Other'];

export const LANGUAGES = [
  'English', 'Krio', 'Mende', 'Temne', 'Limba', 'Fula', 'Mandingo',
  'Arabic', 'French', 'Portuguese', 'Spanish',
];

/* ── Document categories the wizard accepts ──────────────────── */
export const DOCUMENT_TYPES = [
  { key: 'cv',                  label: 'CV / Résumé',           icon: 'description',     required: false },
  { key: 'qualification_cert',  label: 'Qualification Cert.',   icon: 'workspace_premium', required: false },
  { key: 'national_id',         label: 'National ID Copy',      icon: 'badge',           required: false },
  { key: 'teaching_license',    label: 'Teaching License',      icon: 'verified',        required: false },
  { key: 'police_clearance',    label: 'Police Clearance',      icon: 'gpp_good',        required: false },
  { key: 'reference_letter',    label: 'Reference Letter',      icon: 'recommend',       required: false },
  { key: 'other',               label: 'Other',                 icon: 'attach_file',     required: false },
];

/* ── Wizard steps ────────────────────────────────────────────── */
export const TEACHER_WIZARD_STEPS = [
  { key: 'personal',   label: 'Personal',         icon: 'person'        },
  { key: 'account',    label: 'Account & Role',   icon: 'badge'         },
  { key: 'compliance', label: 'Workload & Comp.', icon: 'shield'        },
  { key: 'review',     label: 'Review & Create',  icon: 'check_circle'  },
];

/* ── CSV bulk-import column spec (in display order) ──────────── */
export const CSV_COLUMNS = [
  { key: 'first_name',     label: 'First Name',     required: true },
  { key: 'last_name',      label: 'Last Name',      required: true },
  { key: 'email',          label: 'Email',          required: true },
  { key: 'phone_number',   label: 'Phone',          required: false },
  { key: 'employee_id',    label: 'Employee ID',    required: true },
  { key: 'qualification',  label: 'Qualification',  required: false },
  { key: 'hire_date',      label: 'Hire Date',      required: false, hint: 'YYYY-MM-DD' },
  { key: 'employment_type',label: 'Employment',     required: false, hint: 'full_time / part_time / contract / volunteer / substitute' },
  { key: 'department',     label: 'Department',     required: false },
  { key: 'gender',         label: 'Gender',         required: false, hint: 'female / male / other' },
  { key: 'date_of_birth',  label: 'Date of Birth',  required: false, hint: 'YYYY-MM-DD' },
  { key: 'nin',            label: 'NIN',            required: false },
  { key: 'nassit_number',  label: 'NASSIT',         required: false },
  { key: 'password',       label: 'Password',       required: false, hint: 'Auto-generated if blank' },
];

/* ── Default availability grid: Mon-Fri × 8 periods, all on ──── */
export const DEFAULT_AVAILABILITY = Object.fromEntries(
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => [d, Array(8).fill(true)])
);

/* ── Initial form state (one source of truth) ─────────────────── */
export const INITIAL_TEACHER_FORM = {
  /* identity */
  first_name: '', middle_name: '', last_name: '',
  email: '', phone_number: '', alt_phone: '',
  date_of_birth: '', gender: '',
  address: '', languages: [],
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',

  /* account & role */
  employee_id: '', hire_date: new Date().toISOString().slice(0, 10),
  employment_type: 'full_time', department: '', role_tier: 'teacher',
  is_class_teacher: false, homeroom_class_id: '',
  qualification: '', qualified_subjects: [],
  password: '', force_password_change: true,

  /* workload */
  max_workload: 20,

  /* payroll & compliance */
  nin: '', nassit_number: '',
  bank_name: '', bank_account_number: '',
  license_number: '', license_expiry: '',
  police_clearance_date: '',
  safeguarding_training_date: '',
  on_probation: false, probation_end_date: '',
};

export const DRAFT_KEY_PREFIX = 'eksms.teachers.addDraft.';
