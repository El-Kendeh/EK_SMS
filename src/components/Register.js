import React, { useState } from 'react';
import './Register.css';

/* ================================================================
   SVG Icons
   ================================================================ */
const GradCapIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" aria-hidden="true">
    <path d="M12 3L1 9l4 2.18V15c0 .92 4.03 3 7 3s7-2.08 7-3v-3.82L23 9 12 3zm6.18 7L12 13.72 5.82 10 12 6.28 18.18 10zM19 13.99l-7 3.79-7-3.79V12.7l7 3.79 7-3.79v1.29z" />
  </svg>
);

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

/* ================================================================
   Constants
   ================================================================ */
const STEPS = [
  { key: 'info',     label: 'Info' },
  { key: 'location', label: 'Location' },
  { key: 'contact',  label: 'Contact' },
  { key: 'admin',    label: 'Admin' },
  { key: 'settings', label: 'Settings' },
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

/* ================================================================
   Helper: field component
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
  const [step, setStep]           = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    /* Step 1 — Info */
    institutionName: '',
    institutionType: '',
    established: '',
    motto: '',
    /* Step 2 — Location */
    address: '',
    city: '',
    region: '',
    country: '',
    /* Step 3 — Contact */
    phone: '',
    email: '',
    website: '',
    /* Step 4 — Admin */
    firstName: '',
    lastName: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
    /* Step 5 — Settings */
    capacity: '1000',
    academicSystem: 'trimester',
    gradingSystem: 'percentage',
    language: 'English',
  });

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  /* ---- Validation per step ---- */
  const validate = () => {
    setError('');
    if (step === 1) {
      if (!form.institutionName.trim()) return setError('Institution name is required.'), false;
      if (!form.institutionType)         return setError('Please select an institution type.'), false;
    }
    if (step === 2) {
      if (!form.address.trim()) return setError('Street address is required.'), false;
      if (!form.city.trim())    return setError('City is required.'), false;
      if (!form.country)        return setError('Please select a country.'), false;
    }
    if (step === 3) {
      if (!form.phone.trim()) return setError('Phone number is required.'), false;
      if (!form.email.trim()) return setError('Institutional email is required.'), false;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        return setError('Please enter a valid email address.'), false;
    }
    if (step === 4) {
      if (!form.firstName.trim())  return setError('First name is required.'), false;
      if (!form.lastName.trim())   return setError('Last name is required.'), false;
      if (!form.adminEmail.trim()) return setError('Admin email is required.'), false;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail))
        return setError('Please enter a valid admin email address.'), false;
      if (form.password.length < 8)
        return setError('Password must be at least 8 characters.'), false;
      if (!/[A-Z]/.test(form.password))
        return setError('Password must contain at least one uppercase letter.'), false;
      if (!/[0-9]/.test(form.password))
        return setError('Password must contain at least one number.'), false;
      if (!/[^A-Za-z0-9]/.test(form.password))
        return setError('Password must contain at least one symbol.'), false;
      if (form.password !== form.confirmPassword)
        return setError('Passwords do not match.'), false;
    }
    if (step === 5) {
      const cap = parseInt(form.capacity, 10);
      if (isNaN(cap) || cap < 1)
        return setError('Please enter a valid student capacity.'), false;
    }
    return true;
  };

  const next = () => {
    if (validate()) setStep((s) => Math.min(s + 1, 6));
  };

  const back = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  /* ---- Submit ---- */
  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    try {
      const response = await fetch('/api/register/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  /* ---- Stepper fill % ---- */
  const fillPct = step === 1 ? 0 : ((step - 1) / (STEPS.length - 1)) * 100;

  /* ================================================================
     Success Screen
     ================================================================ */
  if (submitted) {
    return (
      <div className="reg-page">
        <div className="reg-card">
          <div className="reg-success">
            <div className="success-icon-wrap">
              <CheckIcon />
            </div>
            <h2 className="success-title">Application Submitted!</h2>
            <p className="success-desc">
              <span className="success-school-name">{form.institutionName}</span> has been
              successfully registered.
            </p>
            <p className="success-email-note">
              A verification email has been sent to{' '}
              <strong>{form.adminEmail}</strong>. Please check your inbox to
              activate your account.
            </p>
            <button
              className="btn-go-signin"
              onClick={() => onNavigate && onNavigate('login')}
            >
              Go to Sign In
            </button>
          </div>
        </div>
        <p className="reg-footer">© 2026 EK-SMS — School Management System.</p>
      </div>
    );
  }

  /* ================================================================
     Wizard
     ================================================================ */
  return (
    <div className="reg-page">
      {/* Back to home */}
      <button
        className="reg-back-link"
        type="button"
        onClick={() => onNavigate && onNavigate('home')}
      >
        <ArrowLeftIcon /> Back to home
      </button>

      <div className="reg-card">
        {/* Card Header */}
        <div className="reg-header">
          <div className="reg-logo-circle">
            <GradCapIcon />
          </div>
          <div className="reg-header-text">
            <h1 className="reg-title">Register Your Institution</h1>
            <p className="reg-step-label">
              Step {step} of {STEPS.length} —{' '}
              <span>{STEPS[step - 1].label}</span>
            </p>
          </div>
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
                <div
                  className={`step-circle ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}
                  aria-label={`Step ${num}: ${s.label}`}
                >
                  {isDone ? <CheckIcon /> : num}
                </div>
                <span className={`step-name ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
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
            <Field id="institutionName" label="Institution Name" required>
              <input
                id="institutionName"
                className="reg-input"
                type="text"
                placeholder="e.g. Icon High School"
                value={form.institutionName}
                onChange={set('institutionName')}
                autoFocus
              />
            </Field>

            <Field id="institutionType" label="Institution Type" required>
              <select
                id="institutionType"
                className="reg-select"
                value={form.institutionType}
                onChange={set('institutionType')}
              >
                <option value="">Select institution type</option>
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Field>

            <div className="reg-form-grid">
              <Field id="established" label="Year Established" hint="e.g. 2008">
                <input
                  id="established"
                  className="reg-input"
                  type="number"
                  placeholder="2008"
                  min="1800"
                  max={new Date().getFullYear()}
                  value={form.established}
                  onChange={set('established')}
                />
              </Field>

              <Field id="motto" label="School Motto">
                <input
                  id="motto"
                  className="reg-input"
                  type="text"
                  placeholder="e.g. Persistence"
                  value={form.motto}
                  onChange={set('motto')}
                />
              </Field>
            </div>
          </div>
        )}

        {/* ── STEP 2: Location ── */}
        {step === 2 && (
          <div className="reg-form">
            <Field id="address" label="Street Address" required>
              <input
                id="address"
                className="reg-input"
                type="text"
                placeholder="e.g. 61 New Castle Street, Kissy"
                value={form.address}
                onChange={set('address')}
                autoFocus
              />
            </Field>

            <div className="reg-form-grid">
              <Field id="city" label="City / Town" required>
                <input
                  id="city"
                  className="reg-input"
                  type="text"
                  placeholder="Freetown"
                  value={form.city}
                  onChange={set('city')}
                />
              </Field>

              <Field id="region" label="Region / State">
                <input
                  id="region"
                  className="reg-input"
                  type="text"
                  placeholder="Western Urban"
                  value={form.region}
                  onChange={set('region')}
                />
              </Field>
            </div>

            <Field id="country" label="Country" required>
              <select
                id="country"
                className="reg-select"
                value={form.country}
                onChange={set('country')}
              >
                <option value="">Select country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {/* ── STEP 3: Contact ── */}
        {step === 3 && (
          <div className="reg-form">
            <Field id="phone" label="Phone Number" required>
              <input
                id="phone"
                className="reg-input"
                type="tel"
                placeholder="+232 88 232 603"
                value={form.phone}
                onChange={set('phone')}
                autoFocus
              />
            </Field>

            <Field id="email" label="Institutional Email" required>
              <input
                id="email"
                className="reg-input"
                type="email"
                placeholder="info@iconhighschool.edu.sl"
                value={form.email}
                onChange={set('email')}
              />
            </Field>

            <Field id="website" label="Website" hint="Optional">
              <input
                id="website"
                className="reg-input"
                type="url"
                placeholder="https://www.iconhighschool.edu.sl"
                value={form.website}
                onChange={set('website')}
              />
            </Field>
          </div>
        )}

        {/* ── STEP 4: Admin Account ── */}
        {step === 4 && (
          <div className="reg-form">
            <p style={{ fontSize: '0.875rem', color: '#8892A8', margin: '0 0 4px' }}>
              This account will be the primary administrator for your institution.
            </p>

            <div className="reg-form-grid">
              <Field id="firstName" label="First Name" required>
                <input
                  id="firstName"
                  className="reg-input"
                  type="text"
                  placeholder="Ishma"
                  value={form.firstName}
                  onChange={set('firstName')}
                  autoFocus
                />
              </Field>

              <Field id="lastName" label="Last Name" required>
                <input
                  id="lastName"
                  className="reg-input"
                  type="text"
                  placeholder="Rogers"
                  value={form.lastName}
                  onChange={set('lastName')}
                />
              </Field>
            </div>

            <Field id="adminEmail" label="Admin Email" required>
              <input
                id="adminEmail"
                className="reg-input"
                type="email"
                placeholder="admin@iconhighschool.edu.sl"
                value={form.adminEmail}
                onChange={set('adminEmail')}
                autoComplete="email"
              />
            </Field>

            <Field
              id="password"
              label="Password"
              required
              hint="Use uppercase, lowercase, numbers and symbols"
            >
              <div className="input-wrap">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  className="reg-input with-toggle"
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                >
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </Field>

            <Field id="confirmPassword" label="Confirm Password" required>
              <div className="input-wrap">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  className="reg-input with-toggle"
                  placeholder="Re-enter password"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="input-toggle"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                >
                  {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </Field>
          </div>
        )}

        {/* ── STEP 5: School Settings ── */}
        {step === 5 && (
          <div className="reg-form">
            <Field
              id="capacity"
              label="Student Capacity"
              hint="Approximate maximum number of enrolled students"
            >
              <input
                id="capacity"
                className="reg-input"
                type="number"
                min="1"
                placeholder="1000"
                value={form.capacity}
                onChange={set('capacity')}
                autoFocus
              />
            </Field>

            <Field id="academicSystem" label="Academic System">
              <select
                id="academicSystem"
                className="reg-select"
                value={form.academicSystem}
                onChange={set('academicSystem')}
              >
                {ACADEMIC_SYSTEMS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </Field>

            <Field id="gradingSystem" label="Grading System">
              <select
                id="gradingSystem"
                className="reg-select"
                value={form.gradingSystem}
                onChange={set('gradingSystem')}
              >
                {GRADING_SYSTEMS.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </Field>

            <Field id="language" label="Primary Language of Instruction">
              <select
                id="language"
                className="reg-select"
                value={form.language}
                onChange={set('language')}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </Field>
          </div>
        )}

        {/* ── STEP 6: Review ── */}
        {step === 6 && (
          <div>
            <p style={{ fontSize: '0.875rem', color: '#8892A8', marginBottom: '18px' }}>
              Please review your information before submitting.
            </p>

            <ReviewSection title="Basic Information" icon={<InfoIcon />}>
              <ReviewRow label="Institution Name" value={form.institutionName} />
              <ReviewRow label="Type"             value={form.institutionType} />
              <ReviewRow label="Established"      value={form.established || '—'} />
              <ReviewRow label="Motto"            value={form.motto || '—'} />
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
              <ReviewRow label="Name"  value={`${form.firstName} ${form.lastName}`} />
              <ReviewRow label="Email" value={form.adminEmail} />
            </ReviewSection>

            <ReviewSection title="School Settings" icon={<SettingsIcon />}>
              <ReviewRow label="Capacity"        value={`${form.capacity} students`} />
              <ReviewRow label="Academic System" value={ACADEMIC_SYSTEMS.find(s => s.value === form.academicSystem)?.label} />
              <ReviewRow label="Grading"         value={GRADING_SYSTEMS.find(g => g.value === form.gradingSystem)?.label} />
              <ReviewRow label="Language"        value={form.language} />
            </ReviewSection>

            <p className="terms-note" style={{ marginTop: '16px' }}>
              By submitting, you agree to EK-SMS's{' '}
              <a href="#terms">Terms of Service</a> and{' '}
              <a href="#privacy">Privacy Policy</a>.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="reg-nav">
          {step > 1 ? (
            <button type="button" className="btn-back" onClick={back}>
              <ArrowLeftIcon /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 6 ? (
            <button type="button" className="btn-next" onClick={next}>
              Continue <ArrowRightIcon />
            </button>
          ) : (
            <button
              type="button"
              className="btn-submit"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading
                ? <><span className="spin" /> Submitting…</>
                : <><ReviewIcon /> Submit Registration</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <p className="reg-footer-signin">
        Already have an account?{' '}
        <button type="button" onClick={() => onNavigate && onNavigate('login')}>
          Sign in
        </button>
      </p>
      <p className="reg-footer">
        © 2026 EK-SMS — School Management System.
      </p>
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
      <span className={`review-value ${muted ? 'muted' : ''}`}>{value}</span>
    </div>
  );
}

export default Register;
