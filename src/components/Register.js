import React, { useState, useRef } from 'react';
import './Register.css';
import { SECURITY_CONFIG } from '../config/security';
import ThemeToggle from './ThemeToggle';
import PruhLogo from './PruhLogo';

/* ================================================================
   SVG Icons
   ================================================================ */
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 12H5M12 5l-7 7 7 7" />
  </svg>
);
const ArrowRightIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
);
const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const WarnIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);
const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" />
  </svg>
);
const EyeOffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);
const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);
const LocationIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
  </svg>
);
const ContactIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.63a16 16 0 006.29 6.29l1.15-1.15a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
  </svg>
);
const AdminIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M20 12h2M2 12h2M19.07 19.07l-1.41-1.41M4.93 19.07l1.41-1.41" />
  </svg>
);
const ReviewIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
  </svg>
);
/* Field-specific icons */
const BuildingIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
  </svg>
);
const MailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M2 7l10 7 10-7" />
  </svg>
);
const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
  </svg>
);
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const UsersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const ShieldIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const HashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="4" y1="9" x2="20" y2="9" /><line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" /><line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);
const PaletteIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
    <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
    <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
    <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
  </svg>
);
const LegalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

/* ================================================================
   Constants
   ================================================================ */
const STEPS = [
  { key: 'info',     label: 'Info' },
  { key: 'location', label: 'Location' },
  { key: 'contact',  label: 'Contact' },
  { key: 'admin',    label: 'Admin' },
  { key: 'settings', label: 'Settings' },
  { key: 'legal',    label: 'Legal' },
  { key: 'review',   label: 'Review' },
];

const INSTITUTION_TYPES = [
  'Primary School',
  'Secondary School / High School',
  'University',
  'Tertiary Institute / College',
  'Technical / Vocational School',
  'International School',
  'Special Needs School',
];

const ACADEMIC_SYSTEMS = [
  { value: 'semester',  label: 'Semester System (2 terms)' },
  { value: 'trimester', label: 'Trimester System (3 terms)' },
  { value: 'quarter',   label: 'Quarter System (4 terms)' },
  { value: 'annual',    label: 'Annual System (1 term)' },
];

const GRADING_SYSTEMS = [
  { value: 'percentage', label: 'Percentage (0–100%)' },
  { value: 'letter',     label: 'Letter Grades (A–F)' },
  { value: 'gpa',        label: 'GPA Scale (0–4.0)' },
  { value: 'custom',     label: 'Custom System' },
];

const LANGUAGES = [
  'English', 'French', 'Arabic', 'Spanish', 'Portuguese',
  'Swahili', 'Hausa', 'Mandarin', 'Hindi', 'Other',
];

const COUNTRIES = [
  'Sierra Leone', 'Ghana', 'Nigeria', 'Kenya', 'South Africa',
  'Gambia', 'Liberia', 'Guinea', 'Senegal', 'United Kingdom',
  'United States', 'Canada', 'Australia', 'Other',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1799 }, (_, i) => CURRENT_YEAR - i);

/* Brand color presets */
const BRAND_COLORS = [
  { hex: '#1B3FAF', name: 'Royal Blue' },
  { hex: '#0891B2', name: 'Cyan' },
  { hex: '#0F766E', name: 'Teal' },
  { hex: '#7C3AED', name: 'Purple' },
  { hex: '#DC2626', name: 'Crimson' },
  { hex: '#EA580C', name: 'Orange' },
  { hex: '#16A34A', name: 'Green' },
  { hex: '#92400E', name: 'Brown' },
];

/* Public email domains — warning only, not blocking */
const PUBLIC_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com',
  'icloud.com', 'aol.com', 'live.com', 'msn.com',
];

/* ================================================================
   Password Strength Indicator
   ================================================================ */
function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8)            score++;
  if (/[A-Z]/.test(password))         score++;
  if (/[0-9]/.test(password))         score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const colors = ['', '#EF4444', '#F97316', '#EAB308', '#22D3A3'];
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div className="pwd-strength">
      <div className="pwd-strength-bars">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="pwd-strength-bar"
            style={i <= score ? { background: colors[score] } : undefined} />
        ))}
      </div>
      {score > 0 && (
        <span className="pwd-strength-label" style={{ color: colors[score] }}>
          {labels[score]}
        </span>
      )}
    </div>
  );
}

/* ================================================================
   Brand Color Picker
   ================================================================ */
function BrandColorPicker({ value, onChange }) {
  const nativeRef = useRef(null);
  const preview = value || '#1B3FAF';

  return (
    <div className="brand-color-picker">
      <div className="color-swatches">
        {BRAND_COLORS.map(({ hex, name }) => (
          <button
            key={hex}
            type="button"
            className={`color-swatch${value === hex ? ' selected' : ''}`}
            style={{ background: hex }}
            onClick={() => onChange(hex)}
            title={name}
            aria-label={`Select ${name} (${hex})`}
          />
        ))}
        {/* Native color picker trigger */}
        <button
          type="button"
          className="color-swatch color-swatch--custom"
          onClick={() => nativeRef.current?.click()}
          title="Custom color"
          aria-label="Pick a custom color"
        >
          <input
            ref={nativeRef}
            type="color"
            value={value && value.startsWith('#') ? value : '#1B3FAF'}
            onChange={(e) => onChange(e.target.value)}
            tabIndex={-1}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Text input — type hex or a CSS color name */}
      <div className="input-wrap" style={{ marginTop: '10px' }}>
        <span className="input-icon"><PaletteIcon /></span>
        <input
          className="reg-input with-icon"
          type="text"
          placeholder="e.g. #1B3FAF or navy blue"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>

      {/* Live preview bar */}
      {value && (
        <div className="color-preview-bar" style={{ background: preview }}>
          <span>Brand Color Preview</span>
          <span className="color-preview-hex">{value}</span>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Logo / Badge Upload
   ================================================================ */
function LogoUpload({ preview, inputRef, onChange, onRemove }) {
  return (
    <div className="logo-upload">
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg"
        style={{ display: 'none' }}
        onChange={onChange}
        aria-label="Upload school badge"
      />
      {preview ? (
        <div className="logo-preview-wrap">
          <img src={preview} alt="School badge preview" className="logo-preview" />
          <div className="logo-preview-info">
            <span className="logo-preview-ok">Badge uploaded</span>
            <button type="button" className="logo-remove-btn" onClick={onRemove}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="logo-dropzone"
          onClick={() => inputRef.current?.click()}
        >
          <span className="logo-dropzone-icon"><UploadIcon /></span>
          <span className="logo-dropzone-label">Upload School Badge</span>
          <span className="logo-dropzone-sub">PNG or JPG · Max 5 MB</span>
          <span className="logo-dropzone-btn">Choose File</span>
        </button>
      )}
      <p className="input-hint">
        Used in report cards, certificates, transcripts, and dashboards.
      </p>
    </div>
  );
}

/* ================================================================
   Helper: Field wrapper
   ================================================================ */
function Field({ id, label, required, hint, children }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>
        {label}
        {required && <span className="req"> *</span>}
      </label>
      {children}
      {hint && <p className="input-hint">{hint}</p>}
    </div>
  );
}

/* ================================================================
   Main Register Component
   ================================================================ */
function Register({ onNavigate }) {
  const [step, setStep]               = useState(1);
  const [submitted, setSubmitted]     = useState(false);
  const [isLoading, setIsLoading]     = useState(false);
  const [checkingName, setCheckingName] = useState(false);
  const [error, setError]             = useState('');
  const [showPwd, setShowPwd]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  /* Badge file state (separate — File objects can't be JSON-serialised) */
  const [badgeFile, setBadgeFile]       = useState(null);
  const [badgePreview, setBadgePreview] = useState('');
  const badgeInputRef = useRef(null);

  const [form, setForm] = useState({
    /* Step 1 — Info */
    institutionName:    '',
    institutionType:    '',
    established:        '',
    motto:              '',
    registrationNumber: '',
    estimatedTeachers:  '',
    schoolStartTime:    '08:00',
    schoolEndTime:      '15:00',
    brandColor:         '#1B3FAF',
    /* Step 2 — Location */
    address: '',
    city:    '',
    region:  '',
    country: '',
    /* Step 3 — Contact */
    phone:   '',
    email:   '',
    website: '',
    /* Step 4 — Admin */
    firstName:       '',
    lastName:        '',
    adminUsername:   '',
    adminEmail:      '',
    adminPhone:      '',
    password:        '',
    confirmPassword: '',
    enable2FA:       true,
    /* Step 5 — Settings */
    capacity:       '1000',
    academicSystem: 'trimester',
    gradingSystem:  'percentage',
    language:       'English',
    /* Step 6 — Legal */
    agreementAccuracy:        false,
    agreementDataProtection:  false,
    agreementAuthorized:      false,
  });

  const set    = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));
  const setChk = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.checked }));

  /* ---- Badge upload handler ---- */
  const handleBadgeChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      setError('Please upload a PNG or JPG image.'); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Badge image must be smaller than 5 MB.'); return;
    }
    setBadgeFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setBadgePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const removeBadge = () => {
    setBadgeFile(null);
    setBadgePreview('');
    if (badgeInputRef.current) badgeInputRef.current.value = '';
  };

  /* ---- Public email domain check (non-blocking warning) ---- */
  const adminEmailDomainWarning = (() => {
    if (!form.adminEmail.includes('@')) return null;
    const domain = form.adminEmail.split('@')[1]?.toLowerCase();
    return PUBLIC_DOMAINS.includes(domain) ? domain : null;
  })();

  /* ---- Async duplicate school name check ---- */
  const checkDuplicateName = async (name) => {
    try {
      const res = await fetch(
        `${SECURITY_CONFIG.API_URL}/api/check-school-name/?name=${encodeURIComponent(name)}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        return data.exists === true;
      }
    } catch { /* API unavailable — allow registration to proceed */ }
    return false;
  };

  /* ---- Step validation ---- */
  const validate = () => {
    setError('');
    if (step === 1) {
      if (!form.institutionName.trim()) { setError('Institution name is required.'); return false; }
      if (!form.institutionType)        { setError('Please select an institution type.'); return false; }
      if (form.estimatedTeachers) {
        const n = parseInt(form.estimatedTeachers, 10);
        if (isNaN(n) || n < 1) { setError('Please enter a valid number of teachers.'); return false; }
      }
    }
    if (step === 2) {
      if (!form.address.trim()) { setError('Street address is required.'); return false; }
      if (!form.city.trim())    { setError('City is required.'); return false; }
      if (!form.country)        { setError('Please select a country.'); return false; }
    }
    if (step === 3) {
      if (!form.phone.trim())   { setError('Phone number is required.'); return false; }
      if (!form.email.trim())   { setError('Institutional email is required.'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        setError('Please enter a valid email address.'); return false;
      }
    }
    if (step === 4) {
      if (!form.firstName.trim())     { setError('First name is required.'); return false; }
      if (!form.lastName.trim())      { setError('Last name is required.'); return false; }
      if (!form.adminUsername.trim()) { setError('Admin username is required.'); return false; }
      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(form.adminUsername)) {
        setError('Username must be 3–30 characters: letters, numbers, _ or -'); return false;
      }
      if (!form.adminEmail.trim()) { setError('Admin email is required.'); return false; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) {
        setError('Please enter a valid admin email address.'); return false;
      }
      if (!form.adminPhone.trim()) { setError('Admin phone number is required.'); return false; }
      if (form.password.length < 8)              { setError('Password must be at least 8 characters.'); return false; }
      if (!/[A-Z]/.test(form.password))          { setError('Password must contain at least one uppercase letter.'); return false; }
      if (!/[0-9]/.test(form.password))          { setError('Password must contain at least one number.'); return false; }
      if (!/[^A-Za-z0-9]/.test(form.password))  { setError('Password must contain at least one symbol.'); return false; }
      if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return false; }
    }
    if (step === 5) {
      const cap = parseInt(form.capacity, 10);
      if (isNaN(cap) || cap < 1) { setError('Please enter a valid student capacity.'); return false; }
    }
    if (step === 6) {
      if (!form.agreementAccuracy)       { setError('Please confirm the school information is accurate.'); return false; }
      if (!form.agreementDataProtection) { setError('Please agree to the data protection policy.'); return false; }
      if (!form.agreementAuthorized)     { setError('Please confirm you are authorised to register this institution.'); return false; }
    }
    return true;
  };

  /* ---- Next (async for step 1 duplicate check) ---- */
  const next = async () => {
    if (!validate()) return;
    if (step === 1 && form.institutionName.trim()) {
      setCheckingName(true);
      const isDuplicate = await checkDuplicateName(form.institutionName.trim());
      setCheckingName(false);
      if (isDuplicate) {
        setError(`"${form.institutionName}" is already registered in EK-SMS. If this is your school, please sign in instead.`);
        return;
      }
    }
    setStep((s) => Math.min(s + 1, STEPS.length));
  };

  const back = () => { setError(''); setStep((s) => Math.max(s - 1, 1)); };

  /* ---- Submit ---- */
  const handleSubmit = async () => {
    if (!validate()) return;
    setError('');
    setIsLoading(true);
    try {
      const payload = {
        ...form,
        ...(badgeFile ? { schoolBadgeName: badgeFile.name, schoolBadgeSize: badgeFile.size } : {}),
      };
      const response = await fetch(`${SECURITY_CONFIG.API_URL}/api/register/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Registration failed. Please try again.');
      }
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillPct = step === 1 ? 0 : ((step - 1) / (STEPS.length - 1)) * 100;

  /* ================================================================
     Success Screen
     ================================================================ */
  if (submitted) {
    return (
      <div className="reg-page">
        <ThemeToggle />
        <div className="reg-card">
          <div className="reg-success">
            <div className="success-icon-wrap"><CheckIcon /></div>
            <h2 className="success-title">Application Submitted!</h2>
            <p className="success-desc">
              <span className="success-school-name">{form.institutionName}</span> has been
              successfully registered.
            </p>
            <p className="success-email-note">
              A verification email has been sent to{' '}
              <strong>{form.adminEmail}</strong>. Please check your inbox to activate your account.
            </p>
            <button className="btn-go-signin" onClick={() => onNavigate && onNavigate('login')}>
              Go to Sign In
            </button>
          </div>
        </div>
        <p className="reg-footer">© 2026 EK-SMS. School Management System.</p>
      </div>
    );
  }

  /* ================================================================
     Wizard
     ================================================================ */
  return (
    <div className="reg-page">
      <ThemeToggle />

      <button className="reg-back-link" type="button" onClick={() => onNavigate && onNavigate('home')}>
        <ArrowLeftIcon /> Back to home
      </button>

      <div className="reg-card">
        {/* Card Header */}
        <div className="reg-header">
          <PruhLogo size={52} showText={false} variant="blue" />
          <h1 className="reg-title">Register Your Institution</h1>
          <p className="reg-step-label">
            Step {step} of {STEPS.length} — <span>{STEPS[step - 1].label}</span>
          </p>
        </div>

        {/* Stepper */}
        <div className="stepper" aria-label="Registration progress">
          <div className="stepper-track">
            <div className="stepper-fill" style={{ width: `${fillPct}%` }} />
          </div>
          {STEPS.map((s, i) => {
            const num = i + 1;
            const isDone   = step > num;
            const isActive = step === num;
            return (
              <div className="step-item" key={s.key}>
                <div className={`step-circle${isDone ? ' done' : ''}${isActive ? ' active' : ''}`}
                  aria-label={`Step ${num}: ${s.label}`}>
                  {isDone ? <CheckIcon /> : num}
                </div>
                <span className={`step-name${isDone ? ' done' : ''}${isActive ? ' active' : ''}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div className="reg-error" role="alert" style={{ marginBottom: '16px' }}>
            <AlertIcon /> {error}
          </div>
        )}

        {/* ── STEP 1: Basic Information ── */}
        {step === 1 && (
          <div className="reg-form">
            <p className="step-intro">
              Tell us about your institution. This is how it will appear across EK-SMS —
              on reports, dashboards, and certificates.
            </p>

            {/* School Badge Upload */}
            <div className="form-field">
              <label>School Badge / Logo <span className="field-tag">Optional</span></label>
              <LogoUpload
                preview={badgePreview}
                inputRef={badgeInputRef}
                onChange={handleBadgeChange}
                onRemove={removeBadge}
              />
            </div>

            <Field id="institutionName" label="Institution Name" required>
              <div className="input-wrap">
                <span className="input-icon"><BuildingIcon /></span>
                <input id="institutionName" className="reg-input with-icon" type="text"
                  placeholder="e.g. Greenfield Academy"
                  value={form.institutionName} onChange={set('institutionName')} autoFocus />
              </div>
            </Field>

            <Field id="institutionType" label="Institution Type" required>
              <select id="institutionType" className="reg-select"
                value={form.institutionType} onChange={set('institutionType')}>
                <option value="">Select type...</option>
                {INSTITUTION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <Field id="registrationNumber" label="Government Registration Number"
              hint="Helps verify your institution as an official school.">
              <div className="input-wrap">
                <span className="input-icon"><HashIcon /></span>
                <input id="registrationNumber" className="reg-input with-icon" type="text"
                  placeholder="e.g. EDU-SL-2024-00123"
                  value={form.registrationNumber} onChange={set('registrationNumber')} />
              </div>
            </Field>

            <div className="reg-form-grid">
              <Field id="established" label="Year Established">
                <select id="established" className="reg-select"
                  value={form.established} onChange={set('established')}>
                  <option value="">Select year...</option>
                  {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>

              <Field id="estimatedTeachers" label="Est. Number of Teachers">
                <div className="input-wrap">
                  <span className="input-icon"><UsersIcon /></span>
                  <input id="estimatedTeachers" className="reg-input with-icon" type="number"
                    min="1" placeholder="e.g. 40"
                    value={form.estimatedTeachers} onChange={set('estimatedTeachers')} />
                </div>
              </Field>
            </div>

            <Field id="motto" label="School Motto">
              <input id="motto" className="reg-input" type="text"
                placeholder="e.g. Excellence in Education"
                value={form.motto} onChange={set('motto')} />
            </Field>

            {/* School Hours */}
            <div className="form-field">
              <label>
                School Hours
                <span className="field-tag">Used for attendance &amp; scheduling</span>
              </label>
              <div className="time-grid">
                <div className="time-field">
                  <label htmlFor="schoolStartTime" className="time-label">
                    <ClockIcon /> Start Time
                  </label>
                  <input id="schoolStartTime" className="reg-input time-input"
                    type="time" value={form.schoolStartTime} onChange={set('schoolStartTime')} />
                </div>
                <div className="time-field">
                  <label htmlFor="schoolEndTime" className="time-label">
                    <ClockIcon /> End Time
                  </label>
                  <input id="schoolEndTime" className="reg-input time-input"
                    type="time" value={form.schoolEndTime} onChange={set('schoolEndTime')} />
                </div>
              </div>
            </div>

            {/* Brand Color */}
            <div className="form-field">
              <label>
                School Branding Colour
                <span className="field-tag">Used in portal, dashboards &amp; report cards</span>
              </label>
              <BrandColorPicker value={form.brandColor} onChange={(v) => setForm((p) => ({ ...p, brandColor: v }))} />
            </div>
          </div>
        )}

        {/* ── STEP 2: Location ── */}
        {step === 2 && (
          <div className="reg-form">
            <p className="step-intro">
              Where is your institution located? This helps with directory listings and reports.
            </p>
            <Field id="address" label="Street Address" required>
              <div className="input-wrap">
                <span className="input-icon"><LocationIcon /></span>
                <input id="address" className="reg-input with-icon" type="text"
                  placeholder="e.g. 61 New Castle Street, Kissy"
                  value={form.address} onChange={set('address')} autoFocus />
              </div>
            </Field>
            <div className="reg-form-grid">
              <Field id="city" label="City / Town" required>
                <input id="city" className="reg-input" type="text" placeholder="Freetown"
                  value={form.city} onChange={set('city')} />
              </Field>
              <Field id="region" label="Region / State">
                <input id="region" className="reg-input" type="text" placeholder="Western Urban"
                  value={form.region} onChange={set('region')} />
              </Field>
            </div>
            <Field id="country" label="Country" required>
              <select id="country" className="reg-select" value={form.country} onChange={set('country')}>
                <option value="">Select country</option>
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          </div>
        )}

        {/* ── STEP 3: Contact ── */}
        {step === 3 && (
          <div className="reg-form">
            <p className="step-intro">
              Provide your institution's official contact details for communication and verification.
            </p>
            <Field id="phone" label="Phone Number" required>
              <div className="input-wrap">
                <span className="input-icon"><ContactIcon /></span>
                <input id="phone" className="reg-input with-icon" type="tel"
                  placeholder="+232 88 232 603"
                  value={form.phone} onChange={set('phone')} autoFocus />
              </div>
            </Field>
            <Field id="email" label="Institutional Email" required>
              <div className="input-wrap">
                <span className="input-icon"><MailIcon /></span>
                <input id="email" className="reg-input with-icon" type="email"
                  placeholder="info@iconhighschool.edu.sl"
                  value={form.email} onChange={set('email')} />
              </div>
            </Field>
            <Field id="website" label="Website" hint="Optional — include https://...">
              <div className="input-wrap">
                <span className="input-icon"><GlobeIcon /></span>
                <input id="website" className="reg-input with-icon" type="url"
                  placeholder="https://www.iconhighschool.edu.sl"
                  value={form.website} onChange={set('website')} />
              </div>
            </Field>
          </div>
        )}

        {/* ── STEP 4: Admin Account ── */}
        {step === 4 && (
          <div className="reg-form">
            <p className="step-intro">
              Create the primary administrator account. This person will have full access
              to manage your institution on EK-SMS.
            </p>

            <div className="reg-form-grid">
              <Field id="firstName" label="First Name" required>
                <div className="input-wrap">
                  <span className="input-icon"><AdminIcon /></span>
                  <input id="firstName" className="reg-input with-icon" type="text"
                    placeholder="Ishma" value={form.firstName} onChange={set('firstName')} autoFocus />
                </div>
              </Field>
              <Field id="lastName" label="Last Name" required>
                <div className="input-wrap">
                  <span className="input-icon"><AdminIcon /></span>
                  <input id="lastName" className="reg-input with-icon" type="text"
                    placeholder="Rogers" value={form.lastName} onChange={set('lastName')} />
                </div>
              </Field>
            </div>

            <Field id="adminUsername" label="Admin Username" required
              hint="3–30 characters: letters, numbers, _ or -. Used to sign in.">
              <div className="input-wrap">
                <span className="input-icon"><AdminIcon /></span>
                <input id="adminUsername" className="reg-input with-icon" type="text"
                  placeholder="e.g. ishma_rogers"
                  value={form.adminUsername} onChange={set('adminUsername')}
                  autoComplete="username" />
              </div>
            </Field>

            <Field id="adminEmail" label="Admin Email" required>
              <div className="input-wrap">
                <span className="input-icon"><MailIcon /></span>
                <input id="adminEmail" className="reg-input with-icon" type="email"
                  placeholder="admin@iconhighschool.edu.sl"
                  value={form.adminEmail} onChange={set('adminEmail')} autoComplete="email" />
              </div>
              {adminEmailDomainWarning && (
                <div className="field-warning" role="alert">
                  <WarnIcon />
                  Admin email uses a public domain (@{adminEmailDomainWarning}).
                  Using your school's official email is recommended for professional use.
                </div>
              )}
            </Field>

            <Field id="adminPhone" label="Admin Phone Number" required
              hint="Used for two-factor authentication and account recovery.">
              <div className="input-wrap">
                <span className="input-icon"><ContactIcon /></span>
                <input id="adminPhone" className="reg-input with-icon" type="tel"
                  placeholder="+232 76 000 000"
                  value={form.adminPhone} onChange={set('adminPhone')} />
              </div>
            </Field>

            <Field id="password" label="Password" required>
              <div className="input-wrap">
                <span className="input-icon"><LockIcon /></span>
                <input id="password" type={showPwd ? 'text' : 'password'}
                  className="reg-input with-icon with-toggle"
                  placeholder="Min. 8 characters"
                  value={form.password} onChange={set('password')} autoComplete="new-password" />
                <button type="button" className="input-toggle"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}>
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <PasswordStrength password={form.password} />
            </Field>

            <Field id="confirmPassword" label="Confirm Password" required
              hint="Use uppercase, lowercase, numbers and a symbol.">
              <div className="input-wrap">
                <span className="input-icon"><LockIcon /></span>
                <input id="confirmPassword" type={showConfirm ? 'text' : 'password'}
                  className="reg-input with-icon with-toggle"
                  placeholder="Re-enter password"
                  value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" />
                <button type="button" className="input-toggle"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </Field>

            {/* 2FA Option */}
            <div className="tfa-option">
              <input type="checkbox" id="enable2FA" checked={form.enable2FA}
                onChange={setChk('enable2FA')} />
              <label htmlFor="enable2FA" className="tfa-option-label">
                <div className="tfa-option-title">
                  <ShieldIcon />
                  Enable Two-Factor Authentication
                  <span className="tfa-badge">Recommended</span>
                </div>
                <p className="tfa-option-desc">
                  Adds an extra layer of security using your phone number. You will receive
                  a verification code each time you sign in.
                </p>
              </label>
            </div>
          </div>
        )}

        {/* ── STEP 5: School Settings ── */}
        {step === 5 && (
          <div className="reg-form">
            <p className="step-intro">
              Configure how EK-SMS operates for your institution. These can be updated later
              from your admin dashboard.
            </p>
            <Field id="capacity" label="Student Capacity"
              hint="Approximate maximum number of enrolled students">
              <div className="input-wrap">
                <span className="input-icon"><UsersIcon /></span>
                <input id="capacity" className="reg-input with-icon" type="number"
                  min="1" placeholder="1000"
                  value={form.capacity} onChange={set('capacity')} autoFocus />
              </div>
            </Field>
            <Field id="academicSystem" label="Academic System">
              <select id="academicSystem" className="reg-select"
                value={form.academicSystem} onChange={set('academicSystem')}>
                {ACADEMIC_SYSTEMS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field id="gradingSystem" label="Grading System">
              <select id="gradingSystem" className="reg-select"
                value={form.gradingSystem} onChange={set('gradingSystem')}>
                {GRADING_SYSTEMS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </Field>
            <Field id="language" label="Primary Language of Instruction">
              <select id="language" className="reg-select"
                value={form.language} onChange={set('language')}>
                {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </div>
        )}

        {/* ── STEP 6: Legal & Compliance ── */}
        {step === 6 && (
          <div className="reg-form">
            <p className="step-intro">
              EK-SMS handles sensitive student records. Please review and confirm the
              following before proceeding.
            </p>

            <div className="legal-checks">
              <label className={`legal-check-item${form.agreementAccuracy ? ' checked' : ''}`}>
                <input type="checkbox" checked={form.agreementAccuracy}
                  onChange={setChk('agreementAccuracy')} />
                <div className="legal-check-text">
                  <strong>Accuracy of Information</strong>
                  <span>I confirm that the school information provided in this registration
                    is accurate and complete to the best of my knowledge.</span>
                </div>
              </label>

              <label className={`legal-check-item${form.agreementDataProtection ? ' checked' : ''}`}>
                <input type="checkbox" checked={form.agreementDataProtection}
                  onChange={setChk('agreementDataProtection')} />
                <div className="legal-check-text">
                  <strong>Data Protection Agreement</strong>
                  <span>I agree to protect all student, staff, and parent data stored
                    in EK-SMS in accordance with applicable data protection laws and
                    EK-SMS platform policies.</span>
                </div>
              </label>

              <label className={`legal-check-item${form.agreementAuthorized ? ' checked' : ''}`}>
                <input type="checkbox" checked={form.agreementAuthorized}
                  onChange={setChk('agreementAuthorized')} />
                <div className="legal-check-text">
                  <strong>Authorization Confirmation</strong>
                  <span>I confirm that I am an authorised representative of this institution
                    and have the authority to register it on EK-SMS.</span>
                </div>
              </label>
            </div>

            <p className="terms-note" style={{ marginTop: '20px' }}>
              By proceeding you also agree to the EK-SMS{' '}
              <a href="#terms">Terms of Service</a> and{' '}
              <a href="#privacy">Privacy Policy</a>.
            </p>
          </div>
        )}

        {/* ── STEP 7: Review ── */}
        {step === 7 && (
          <div>
            <p className="step-intro" style={{ marginBottom: '18px' }}>
              Review your information carefully before submitting. Go back to any step to make changes.
            </p>

            <ReviewSection title="Basic Information" icon={<InfoIcon />}>
              {badgePreview && (
                <div className="review-badge-row">
                  <img src={badgePreview} alt="School badge" className="review-badge" />
                  <span className="review-badge-label">Badge uploaded</span>
                </div>
              )}
              <ReviewRow label="Institution Name"    value={form.institutionName} />
              <ReviewRow label="Type"                value={form.institutionType} />
              <ReviewRow label="Reg. Number"         value={form.registrationNumber || '—'} />
              <ReviewRow label="Established"         value={form.established || '—'} />
              <ReviewRow label="Est. Teachers"       value={form.estimatedTeachers || '—'} />
              <ReviewRow label="School Hours"        value={`${form.schoolStartTime} – ${form.schoolEndTime}`} />
              <ReviewRow label="Motto"               value={form.motto || '—'} />
              <div className="review-row">
                <span className="review-label">Brand Colour</span>
                <span className="review-value" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="review-color-dot" style={{ background: form.brandColor }} />
                  {form.brandColor}
                </span>
              </div>
            </ReviewSection>

            <ReviewSection title="Location" icon={<LocationIcon />}>
              <ReviewRow label="Address" value={form.address} />
              <ReviewRow label="City"    value={form.city} />
              <ReviewRow label="Region"  value={form.region || '—'} />
              <ReviewRow label="Country" value={form.country} />
            </ReviewSection>

            <ReviewSection title="Contact" icon={<ContactIcon />}>
              <ReviewRow label="Phone"   value={form.phone} />
              <ReviewRow label="Email"   value={form.email} />
              <ReviewRow label="Website" value={form.website || '—'} muted={!form.website} />
            </ReviewSection>

            <ReviewSection title="Administrator" icon={<AdminIcon />}>
              <ReviewRow label="Name"     value={`${form.firstName} ${form.lastName}`} />
              <ReviewRow label="Username" value={form.adminUsername} />
              <ReviewRow label="Email"    value={form.adminEmail} />
              <ReviewRow label="Phone"    value={form.adminPhone} />
              <ReviewRow label="2FA"      value={form.enable2FA ? 'Enabled' : 'Disabled'} />
            </ReviewSection>

            <ReviewSection title="School Settings" icon={<SettingsIcon />}>
              <ReviewRow label="Capacity"       value={`${form.capacity} students`} />
              <ReviewRow label="Academic System" value={ACADEMIC_SYSTEMS.find(s => s.value === form.academicSystem)?.label} />
              <ReviewRow label="Grading"        value={GRADING_SYSTEMS.find(g => g.value === form.gradingSystem)?.label} />
              <ReviewRow label="Language"       value={form.language} />
            </ReviewSection>

            <ReviewSection title="Legal & Compliance" icon={<LegalIcon />}>
              <ReviewRow label="Accuracy"        value="Confirmed" />
              <ReviewRow label="Data Protection" value="Agreed" />
              <ReviewRow label="Authorization"   value="Confirmed" />
            </ReviewSection>
          </div>
        )}

        {/* Navigation */}
        <div className={`reg-nav${step === 1 ? ' solo' : ''}`}>
          {step > 1 ? (
            <button type="button" className="btn-back" onClick={back}>
              <ArrowLeftIcon /> Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length ? (
            <button type="button" className="btn-next" onClick={next}
              disabled={checkingName}>
              {checkingName
                ? <><span className="spin" /> Checking…</>
                : <>Continue <ArrowRightIcon /></>
              }
            </button>
          ) : (
            <button type="button" className="btn-submit" onClick={handleSubmit}
              disabled={isLoading}>
              {isLoading
                ? <><span className="spin" /> Submitting…</>
                : <><ReviewIcon /> Submit Registration</>
              }
            </button>
          )}
        </div>
      </div>

      <p className="reg-footer-signin">
        Already have an account?{' '}
        <button type="button" onClick={() => onNavigate && onNavigate('login')}>Sign in here</button>
      </p>
      <p className="reg-footer">© 2026 EK-SMS · EL-KENDEH School Management System.</p>
    </div>
  );
}

/* ================================================================
   Sub-components for Review step
   ================================================================ */
function ReviewSection({ title, icon, children }) {
  return (
    <div className="review-section">
      <div className="review-section-header">
        <span className="review-section-icon">{icon}</span>
        <h3 className="review-section-title">{title}</h3>
      </div>
      <div className="review-rows">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value, muted }) {
  return (
    <div className="review-row">
      <span className="review-label">{label}</span>
      <span className={`review-value${muted ? ' muted' : ''}`}>{value}</span>
    </div>
  );
}

export default Register;
