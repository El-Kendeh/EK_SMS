import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ApiClient from '../../../api/client';
import {
  TEACHER_WIZARD_STEPS, INITIAL_TEACHER_FORM, DEFAULT_AVAILABILITY, DRAFT_KEY_PREFIX,
} from './teachers.constants';
import {
  validatePersonal, validateAccount, validateCompliance, cropImage,
} from './teachers.utils';
import PreviewPanel    from './PreviewPanel';
import PersonalStep    from './PersonalStep';
import AccountRoleStep from './AccountRoleStep';
import ComplianceStep  from './ComplianceStep';
import ReviewStep      from './ReviewStep';
import SendCredentials from './SendCredentials';
import WelcomeLetter   from './WelcomeLetter';
import './Teachers.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

export default function AddTeacherWizard({ school, onSave, onCancel, existingTeachers = [] }) {
  /* ── Form state ───────────────────────────────────────────── */
  const [step,             setStep]             = useState(0);
  const [form,             setForm]             = useState(INITIAL_TEACHER_FORM);
  const [errors,           setErrors]           = useState({});
  const [bannerError,      setBannerError]      = useState('');

  const [photoFile,        setPhotoFile]        = useState(null);
  const [photoPreview,     setPhotoPreview]     = useState('');
  const [cropConfig,       setCropConfig]       = useState({ zoom: 1, offsetX: 0, offsetY: 0 });

  const [availability,     setAvailability]     = useState(DEFAULT_AVAILABILITY);
  const [classAssignments, setClassAssignments] = useState([]);
  const [documents,        setDocuments]        = useState([]);

  const [classes,          setClasses]          = useState([]);
  const [subjects,         setSubjects]         = useState([]);

  const [saving,           setSaving]           = useState(false);
  const [created,          setCreated]          = useState(null); // server response
  const [showLetter,       setShowLetter]       = useState(false);

  const [hasDraft,         setHasDraft]         = useState(false);
  const [draftRestored,    setDraftRestored]    = useState(false);
  const draftKey           = `${DRAFT_KEY_PREFIX}${school?.id || 'default'}`;
  const draftSaveTimer     = useRef(null);

  /* ── Email + phone duplicate caches ───────────────────────── */
  const existingEmails = useMemo(() =>
    existingTeachers.map(t => (t.email || '').trim().toLowerCase()).filter(Boolean), [existingTeachers]);
  const existingPhones = useMemo(() =>
    existingTeachers.map(t => (t.phone_number || '').trim()).filter(Boolean), [existingTeachers]);

  /* ── Load classes + subjects ──────────────────────────────── */
  useEffect(() => {
    ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes || [])).catch(() => {});
    ApiClient.get('/api/school/subjects/').then(d => setSubjects(d.subjects || [])).catch(() => {});
  }, []);

  /* ── Restore draft on mount ───────────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);
      if (!draft?.form) return;
      setHasDraft(true);
      const yes = window.confirm('A saved draft for this teacher form was found. Restore it?');
      if (yes) {
        setForm(draft.form);
        setAvailability(draft.availability || DEFAULT_AVAILABILITY);
        setClassAssignments(draft.classAssignments || []);
        setStep(typeof draft.step === 'number' ? draft.step : 0);
        setDraftRestored(true);
      } else {
        localStorage.removeItem(draftKey);
        setHasDraft(false);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Throttled draft save ─────────────────────────────────── */
  useEffect(() => {
    clearTimeout(draftSaveTimer.current);
    draftSaveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({
          form, availability, classAssignments, step,
          savedAt: new Date().toISOString(),
        }));
        setHasDraft(true);
      } catch { /* quota exceeded etc — silent */ }
    }, 800);
    return () => clearTimeout(draftSaveTimer.current);
  }, [form, availability, classAssignments, step, draftKey]);

  /* ── Photo handler ────────────────────────────────────────── */
  const handlePhoto = useCallback((file) => {
    if (!file) {
      setPhotoFile(null); setPhotoPreview(''); setCropConfig({ zoom: 1, offsetX: 0, offsetY: 0 });
      return;
    }
    setPhotoFile(file);
    setCropConfig({ zoom: 1, offsetX: 0, offsetY: 0 });
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  /* ── Field-level error setter ─────────────────────────────── */
  const setError = useCallback((k, v) => {
    setErrors(prev => v ? { ...prev, [k]: v } : (() => { const x = { ...prev }; delete x[k]; return x; })());
  }, []);

  /* ── Per-step gating ──────────────────────────────────────── */
  const stepValidator = [
    () => validatePersonal(form, existingEmails, existingPhones),
    () => validateAccount(form),
    () => validateCompliance(form),
    () => ({}), // review step never blocks
  ];
  const stepIsValid = Object.keys(stepValidator[step]()).length === 0;

  const goNext = () => {
    const errs = stepValidator[step]();
    setErrors(prev => ({ ...prev, ...errs }));
    if (Object.keys(errs).length === 0) setStep(s => Math.min(s + 1, TEACHER_WIZARD_STEPS.length - 1));
  };
  const goBack = () => setStep(s => Math.max(s - 1, 0));

  /* ── Submit ───────────────────────────────────────────────── */
  const submit = async () => {
    /* run all step validators */
    const all = {
      ...stepValidator[0](),
      ...stepValidator[1](),
      ...stepValidator[2](),
    };
    if (Object.keys(all).length > 0) {
      setErrors(prev => ({ ...prev, ...all }));
      const firstStep = stepValidator.findIndex(v => Object.keys(v()).length > 0);
      if (firstStep >= 0) setStep(firstStep);
      setBannerError('Please fix the highlighted fields before creating the account.');
      return;
    }

    setSaving(true); setBannerError('');
    try {
      /* Crop photo if user adjusted zoom or offset */
      let photoBlob = photoFile;
      if (photoFile && (cropConfig.zoom !== 1 || cropConfig.offsetX !== 0 || cropConfig.offsetY !== 0)) {
        try { photoBlob = await cropImage(photoFile, cropConfig); } catch { photoBlob = photoFile; }
      }

      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined) return;
        if (Array.isArray(v)) fd.append(k, JSON.stringify(v));
        else if (typeof v === 'boolean') fd.append(k, v ? '1' : '0');
        else fd.append(k, v);
      });
      if (photoBlob) {
        const fname = photoBlob instanceof File ? photoBlob.name : 'profile.jpg';
        fd.append('profile_picture', photoBlob, fname);
      }
      if (classAssignments.length > 0) fd.append('class_assignments', JSON.stringify(classAssignments));
      fd.append('availability', JSON.stringify(availability));
      documents.forEach(d => fd.append(`document_${d.type}`, d.file, d.file.name));

      const res = await ApiClient.post('/api/school/teachers/', fd);

      /* Build credentials object for SendCredentials + WelcomeLetter */
      setCreated({
        ...res,
        password: form.password,
        email:    res.login_email || form.email,
      });
      try { localStorage.removeItem(draftKey); } catch { /* */ }
    } catch (e) {
      const msg = e?.message || '';
      /* Server-side error mapping — try to surface field-level errors */
      const mapped = mapServerError(msg);
      if (mapped.field) {
        setErrors(prev => ({ ...prev, [mapped.field]: mapped.message }));
        const stepIdx = fieldToStep(mapped.field);
        if (stepIdx >= 0) setStep(stepIdx);
        setBannerError(`${mapped.message} — see step ${stepIdx + 1}.`);
      } else {
        setBannerError(
          msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg === 'Load failed'
            ? 'Unable to reach the server. Please check your internet connection.'
            : (msg || 'Failed to add teacher.')
        );
      }
    } finally { setSaving(false); }
  };

  /* ── Reset draft on cancel? Only clear after confirming save  */
  const cancelWithCheck = () => {
    if (created) { onSave && onSave(); return; } // already saved — go back to list
    onCancel && onCancel();
  };

  /* ── If created: success view with SendCredentials + Letter ── */
  if (created) {
    return (
      <div className="tea-modal-overlay">
        <div className="tea-modal tea-modal--success">
          <div className="tea-success__head">
            <div className="tea-success__check"><Ic name="check_circle" /></div>
            <div>
              <h2>Teacher account created</h2>
              <p>{created.full_name} has been added to {school?.name || 'the school'}.</p>
              {created.email_warning && <p className="tea-success__warn"><Ic name="warning" size="sm" /> {created.email_warning}</p>}
            </div>
            <button className="ska-modal-close" onClick={() => onSave && onSave()} aria-label="Close">
              <Ic name="close" size="sm" />
            </button>
          </div>

          <div className="tea-success__body">
            <SendCredentials
              school={school}
              teacher={form}
              credentials={created}
              onPrintLetter={() => setShowLetter(true)}
            />
          </div>

          <div className="tea-success__foot">
            <button className="ska-btn ska-btn--ghost" onClick={() => onSave && onSave()}>Back to list</button>
            <button className="ska-btn ska-btn--primary" onClick={() => {
              /* "Add another" — reset state but stay open */
              setCreated(null); setForm(INITIAL_TEACHER_FORM); setStep(0);
              setPhotoFile(null); setPhotoPreview(''); setClassAssignments([]); setDocuments([]); setAvailability(DEFAULT_AVAILABILITY);
              try { localStorage.removeItem(draftKey); } catch { /* */ }
            }}>
              <Ic name="person_add" size="sm" /> Add another
            </button>
          </div>
        </div>

        {showLetter && (
          <WelcomeLetter
            school={school}
            teacher={form}
            credentials={created}
            onClose={() => setShowLetter(false)}
          />
        )}
      </div>
    );
  }

  /* ── Wizard view ──────────────────────────────────────────── */
  return (
    <div className="tea-modal-overlay">
      <div className="tea-modal">
        <PreviewPanel
          school={school}
          form={form}
          photoPreview={photoPreview}
          classAssignments={classAssignments}
          documents={documents}
          step={step}
          onJumpStep={(i) => setStep(i)}
          hasDraft={hasDraft}
          onClearDraft={() => {
            try { localStorage.removeItem(draftKey); } catch { /* */ }
            setHasDraft(false); setDraftRestored(false);
          }}
        />

        <div className="tea-form">
          {/* Top bar */}
          <div className="tea-form__head">
            <div>
              <p className="tea-form__step-num">Step {step + 1} of {TEACHER_WIZARD_STEPS.length}</p>
              <h2 className="tea-form__step-title">{TEACHER_WIZARD_STEPS[step].label}</h2>
            </div>
            {draftRestored && (
              <span className="tea-form__draft-pill">
                <Ic name="history" size="sm" /> Draft restored
              </span>
            )}
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={cancelWithCheck} aria-label="Close">
              <Ic name="close" size="sm" />
            </button>
          </div>
          <div className="tea-form__progress">
            <div className="tea-form__progress-fill" style={{ width: `${((step + 1) / TEACHER_WIZARD_STEPS.length) * 100}%` }} />
          </div>

          {/* Body */}
          <div className="tea-form__body">
            {bannerError && (
              <div className="tea-banner tea-banner--err">
                <Ic name="error" size="sm" /> <span>{bannerError}</span>
                <button className="tea-banner__close" onClick={() => setBannerError('')}>×</button>
              </div>
            )}

            {step === 0 && (
              <PersonalStep
                form={form} setForm={setForm}
                errors={errors} setError={setError}
                photoFile={photoFile} photoPreview={photoPreview}
                onPhotoChange={handlePhoto}
                cropConfig={cropConfig} onCropChange={setCropConfig}
                existingEmails={existingEmails}
                existingPhones={existingPhones}
              />
            )}

            {step === 1 && (
              <AccountRoleStep
                form={form} setForm={setForm}
                errors={errors} setError={setError}
                classes={classes} subjects={subjects}
                classAssignments={classAssignments}
                existingTeachers={existingTeachers}
              />
            )}

            {step === 2 && (
              <ComplianceStep
                form={form} setForm={setForm}
                errors={errors} setError={setError}
                classes={classes} subjects={subjects}
                classAssignments={classAssignments} setClassAssignments={setClassAssignments}
                availability={availability} setAvailability={setAvailability}
                documents={documents} setDocuments={setDocuments}
              />
            )}

            {step === 3 && (
              <ReviewStep
                school={school}
                form={form}
                photoPreview={photoPreview}
                classAssignments={classAssignments}
                subjects={subjects}
                documents={documents}
                availability={availability}
              />
            )}
          </div>

          {/* Footer */}
          <div className="tea-form__foot">
            {step > 0
              ? <button className="ska-btn ska-btn--ghost" onClick={goBack} disabled={saving}>
                  <Ic name="arrow_back" size="sm" /> Back
                </button>
              : <button className="ska-btn ska-btn--ghost" onClick={cancelWithCheck} disabled={saving}>Cancel</button>
            }
            {step < TEACHER_WIZARD_STEPS.length - 1
              ? <button className="ska-btn ska-btn--primary" onClick={goNext} disabled={saving || !stepIsValid}>
                  Continue <Ic name="arrow_forward" size="sm" />
                </button>
              : <button className="ska-btn ska-btn--primary" onClick={submit} disabled={saving}>
                  {saving
                    ? <><Ic name="hourglass_empty" size="sm" /> Creating account…</>
                    : <><Ic name="person_add" size="sm" /> Create teacher account</>}
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Server error → field mapping ─────────────────────────────── */
function mapServerError(msg) {
  const m = (msg || '').toLowerCase();
  if (m.includes('employee id'))            return { field: 'employee_id', message: msg };
  if (m.includes('email'))                  return { field: 'email',       message: msg };
  if (m.includes('password'))               return { field: 'password',    message: msg };
  if (m.includes('phone'))                  return { field: 'phone_number', message: msg };
  return { field: null, message: msg };
}
const FIELD_TO_STEP = {
  first_name: 0, middle_name: 0, last_name: 0, email: 0, phone_number: 0, alt_phone: 0,
  date_of_birth: 0, gender: 0, address: 0,
  emergency_contact_name: 0, emergency_contact_phone: 0, emergency_contact_relationship: 0,
  employee_id: 1, hire_date: 1, employment_type: 1, department: 1, role_tier: 1,
  is_class_teacher: 1, homeroom_class_id: 1, qualification: 1, qualified_subjects: 1,
  password: 1, force_password_change: 1,
  max_workload: 2, nin: 2, nassit_number: 2, bank_name: 2, bank_account_number: 2,
  license_number: 2, license_expiry: 2, police_clearance_date: 2, safeguarding_training_date: 2,
  on_probation: 2, probation_end_date: 2,
};
function fieldToStep(field) { return FIELD_TO_STEP[field] ?? -1; }
