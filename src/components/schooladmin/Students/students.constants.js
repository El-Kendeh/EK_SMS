/**
 * EK-SMS · Students module constants
 * Single source of truth for the wizard, bulk import, and edit flows.
 */

export const FORM_STEPS = [
  { key: 'personal',   label: 'Personal',   icon: 'person'           },
  { key: 'enrollment', label: 'Enrollment', icon: 'school'           },
  { key: 'guardian',   label: 'Guardian',   icon: 'family_restroom'  },
  { key: 'health',     label: 'Health',     icon: 'medical_services' },
  { key: 'documents',  label: 'Documents',  icon: 'folder_open'      },
  { key: 'review',     label: 'Review',     icon: 'task_alt'         },
];

export const GENDERS = [
  { key: 'Male',   label: 'Male',   icon: 'male' },
  { key: 'Female', label: 'Female', icon: 'female' },
  { key: 'Other',  label: 'Other',  icon: 'transgender' },
];

export const STUDENT_STATUSES = [
  { key: 'active',      label: 'Active',      tone: 'green' },
  { key: 'suspended',   label: 'Suspended',   tone: 'amber' },
  { key: 'transferred', label: 'Transferred', tone: 'cyan' },
  { key: 'graduated',   label: 'Graduated',   tone: 'primary' },
];

export const STUDENT_TYPES   = ['Day', 'Boarding'];
export const FEE_CATEGORIES  = ['Standard', 'Sibling Discount', 'Scholarship', 'Staff Child', 'Bursary', 'Free Quality Education'];
export const INTAKE_TERMS    = ['Term 1', 'Term 2', 'Term 3'];

export const COMMON_NATIONALITIES = [
  'Sierra Leonean', 'Liberian', 'Guinean', 'Ghanaian', 'Nigerian',
  'Gambian', 'Ivorian', 'Senegalese', 'Malian', 'Cameroonian',
];

export const COMMON_LANGUAGES = [
  'English', 'Krio', 'Mende', 'Temne', 'Limba', 'Fula',
  'Mandingo', 'Susu', 'Kissi', 'Sherbro', 'Arabic', 'French',
];

export const COMMON_RELIGIONS = [
  'Christianity', 'Islam', 'Traditional', 'Other', 'Prefer not to say',
];

export const RELATIONSHIP_OPTIONS = [
  'Father', 'Mother', 'Guardian', 'Stepfather', 'Stepmother',
  'Grandparent', 'Aunt', 'Uncle', 'Sibling', 'Legal Guardian',
];

export const BLOOD_GROUPS = [
  { key: 'O+', tone: 'green' }, { key: 'O-', tone: 'green' },
  { key: 'A+', tone: 'cyan' },  { key: 'A-', tone: 'cyan' },
  { key: 'B+', tone: 'amber' }, { key: 'B-', tone: 'amber' },
  { key: 'AB+', tone: 'primary' }, { key: 'AB-', tone: 'primary' },
  { key: 'Unknown', tone: 'inactive' },
];

/* ── SEN tier (was free-text in the old form) ───────────────── */
export const SEN_TIERS = [
  { key: '',         label: 'Not applicable', tone: 'inactive' },
  { key: 'mild',     label: 'Mild support',   tone: 'green' },
  { key: 'moderate', label: 'Moderate',       tone: 'amber' },
  { key: 'severe',   label: 'Severe / IEP',   tone: 'red' },
];

/* ── Document categories with required flag ────────────────── */
export const STUDENT_DOCUMENT_TYPES = [
  { key: 'birth_certificate',    label: 'Birth Certificate',    icon: 'description', required: true,  hint: 'Statutory under-18 enrolment requirement' },
  { key: 'passport_photo',       label: 'Passport Photo',       icon: 'photo',       required: true,  hint: 'Recent, clear face shot' },
  { key: 'previous_report',      label: 'Previous School Report', icon: 'fact_check', required: false, hint: 'Most recent term report' },
  { key: 'transfer_letter',      label: 'Transfer Letter',      icon: 'output',      required: false, hint: 'From previous school (if transferring)' },
  { key: 'medical_report',       label: 'Medical Report',       icon: 'medical_services', required: false, hint: 'Recent vaccination + fitness' },
  { key: 'national_id',          label: 'Parent National ID',   icon: 'badge',       required: false, hint: 'Parent NIN / NRA card copy' },
  { key: 'photo_consent',        label: 'Photo / Media Consent', icon: 'how_to_reg', required: false, hint: 'Signed media-release form' },
  { key: 'sibling_relationship', label: 'Sibling Proof',        icon: 'family_restroom', required: false, hint: 'Required for sibling-discount eligibility' },
  { key: 'other',                label: 'Other',                icon: 'attach_file', required: false },
];

/* ── Vaccination programme (Sierra Leone EPI baseline) ──────── */
export const VACCINATIONS = [
  { key: 'bcg',           label: 'BCG',                hint: 'Tuberculosis (at birth)' },
  { key: 'opv',           label: 'OPV',                hint: 'Polio — birth, 6, 10, 14 weeks' },
  { key: 'pentavalent',   label: 'Pentavalent',        hint: '6, 10, 14 weeks' },
  { key: 'pcv',           label: 'PCV',                hint: 'Pneumococcal' },
  { key: 'rotavirus',     label: 'Rotavirus',          hint: '6, 10 weeks' },
  { key: 'measles',       label: 'Measles',            hint: '9 + 15 months' },
  { key: 'yellow_fever',  label: 'Yellow Fever',       hint: '9 months' },
  { key: 'meningitis',    label: 'Meningitis A',       hint: '12 months' },
  { key: 'covid19',       label: 'COVID-19',           hint: 'Optional' },
];

/* ── CSV bulk-import column spec ─────────────────────────────── */
export const CSV_COLUMNS = [
  { key: 'first_name',     label: 'First Name',    required: true },
  { key: 'middle_name',    label: 'Middle Name',   required: false },
  { key: 'last_name',      label: 'Last Name',     required: true },
  { key: 'gender',         label: 'Gender',        required: true,  hint: 'Male / Female / Other' },
  { key: 'date_of_birth',  label: 'Date of Birth', required: true,  hint: 'YYYY-MM-DD' },
  { key: 'nationality',    label: 'Nationality',   required: false },
  { key: 'religion',       label: 'Religion',      required: false },
  { key: 'home_address',   label: 'Address',       required: false },
  { key: 'city',           label: 'City',          required: false },
  { key: 'phone_number',   label: 'Phone',         required: false },
  { key: 'email',          label: 'Email',         required: false },
  { key: 'admission_number',label: 'Admission No.', required: false, hint: 'Auto-generated if blank' },
  { key: 'classroom_id',   label: 'Classroom ID',  required: true,  hint: 'Numeric class ID — see Classes page' },
  { key: 'enrollment_date',label: 'Enrolment Date', required: false, hint: 'YYYY-MM-DD; defaults to today' },
  { key: 'student_type',   label: 'Type',          required: false, hint: 'Day / Boarding' },
  { key: 'fee_category',   label: 'Fee Category',  required: false },
  { key: 'father_name',    label: 'Father Name',   required: false },
  { key: 'father_phone',   label: 'Father Phone',  required: false },
  { key: 'mother_name',    label: 'Mother Name',   required: false },
  { key: 'mother_phone',   label: 'Mother Phone',  required: false },
  { key: 'blood_group',    label: 'Blood Group',   required: false },
  { key: 'allergies',      label: 'Allergies',     required: false },
  { key: 'is_critical_medical', label: 'Critical Med', required: false, hint: 'true / false' },
  { key: 'nin',            label: 'Student NIN',   required: false },
];

export const QUICK_PICK = {
  nationality: COMMON_NATIONALITIES,
  religion:    COMMON_RELIGIONS,
  language:    COMMON_LANGUAGES,
};

/* ── Multi-draft localStorage prefix ─────────────────────────── */
export const DRAFTS_KEY = 'ek_sms.students.drafts.v2';

/* ── Initial form state — additive over the existing emptyForm ─ */
export const INITIAL_STUDENT_FORM = {
  /* Personal */
  first_name: '', middle_name: '', last_name: '',
  gender: '', date_of_birth: '', place_of_birth: '',
  nationality: '', religion: '', home_address: '', city: '',
  phone_number: '', email: '',
  home_language: '',

  /* Enrollment */
  admission_number: '', classroom_id: '',
  student_status: 'active', enrollment_date: new Date().toISOString().slice(0, 10),
  student_type: '', fee_category: '', intake_term: '',
  is_repeater: false, hostel_house: '', transport_route: '',
  is_transfer: false, previous_school: '', last_class_completed: '', leaving_reason: '',

  /* Login */
  student_username: '', student_password: '',

  /* Sibling link (new) */
  sibling_of_id: '', sibling_of_name: '',

  /* Guardian 1 */
  father_relationship: 'Father',
  father_name: '', father_occupation: '', father_phone: '', father_email: '',
  father_address: '', father_whatsapp: '',
  father_username: '', father_password: '', father_existing_id: '',

  /* Guardian 2 */
  guardian2_relationship: 'Mother',
  guardian2_name: '', guardian2_occupation: '', guardian2_phone: '', guardian2_email: '',
  guardian2_address: '', guardian2_whatsapp: '',
  guardian2_username: '', guardian2_password: '', guardian2_existing_id: '',

  /* Emergency contact */
  emergency_name: '', emergency_relationship: '', emergency_phone: '', emergency_address: '',

  /* Health (new structure) */
  blood_group: '', allergies: '', medical_conditions: '',
  doctor_name: '', doctor_phone: '',
  is_critical_medical: false,
  sen_tier: '', sen_notes: '', sen_iep: false,
  disciplinary_history: false, disciplinary_notes: '',
  vaccinations: {}, /* keyed { bcg: '2018-04-12', ... } */

  /* Compliance / new (Tier 4) */
  nin: '', tax_paying_parent: false, tax_paying_parent_signed_date: '',
  photo_consent: false, photo_consent_signed_date: '',
};
