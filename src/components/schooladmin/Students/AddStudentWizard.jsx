import React, { useCallback, useEffect, useRef, useState } from 'react';
import ApiClient from '../../../api/client';
import { FORM_STEPS, INITIAL_STUDENT_FORM } from './students.constants';
import {
  validatePersonal, validateEnrollment, validateGuardian, validateHealth,
  mapServerError, newDraftId, saveDraft, deleteDraft,
  lockBodyScroll, unlockBodyScroll, generatePassword,
} from './students.utils';
import { cropImage } from '../Teachers/teachers.utils';
import { printEnrollmentDossier } from './EnrollmentDossier';
import StepBar    from './StepBar';
import PreviewPanel from './PreviewPanel';
import PersonalStep   from './steps/PersonalStep';
import EnrollmentStep from './steps/EnrollmentStep';
import GuardianStep   from './steps/GuardianStep';
import HealthStep     from './steps/HealthStep';
import DocumentsStep  from './steps/DocumentsStep';
import ReviewStep     from './steps/ReviewStep';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/* ── Per-step validation map ──────────────────────────────────── */
const VALIDATORS = [
  validatePersonal,
  validateEnrollment,
  validateGuardian,
  validateHealth,
  () => ({}), /* documents — no hard errors */
  () => ({}), /* review    — submit-time only */
];

/* ── Build API payload ────────────────────────────────────────── */
function buildPayload(form, photoBlob, documents) {
  const clean = { ...form };

  /* Remap guardian2_* → mother_* for API compatibility */
  ['relationship','name','occupation','phone','email','address',
   'whatsapp','username','password','existing_id'].forEach(k => {
    const from = `guardian2_${k}`;
    if (from in clean) { clean[`mother_${k}`] = clean[from]; delete clean[from]; }
  });

  /* Strip front-end-only fields */
  delete clean.sibling_of_name;
  delete clean.is_transfer; /* logical only */

  const hasFile = photoBlob || documents.some(d => d.file);

  if (hasFile) {
    const fd = new FormData();
    Object.entries(clean).forEach(([k, v]) => {
      if (v === undefined || v === null) return;
      if (v instanceof File || v instanceof Blob) return;
      if (typeof v === 'boolean') fd.append(k, v ? 'true' : 'false');
      else if (typeof v === 'object') fd.append(k, JSON.stringify(v));
      else fd.append(k, String(v));
    });
    if (photoBlob) fd.append('profile_photo', photoBlob, 'photo.jpg');
    documents.forEach(d => {
      if (d.file) fd.append(`doc_${d.type}`, d.file, d.file.name);
      if (d.verified) fd.append(`doc_${d.type}_verified`, 'true');
      if (d.verified_date) fd.append(`doc_${d.type}_verified_date`, d.verified_date);
    });
    return fd;
  }

  /* JSON path */
  return clean;
}

/* ── Wizard ───────────────────────────────────────────────────── */
export default function AddStudentWizard({
  mode = 'add',
  student = null,
  school,
  classes = [],
  allStudents = [],
  draftToRestore = null,
  onClose,
  onSaved,
  schoolCountryCode,
}) {
  /* ── Form state ── */
  const initForm = () => {
    if (draftToRestore) return { ...INITIAL_STUDENT_FORM, ...draftToRestore.form };
    if (mode === 'edit' && student) return mapStudentToForm(student);
    return {
      ...INITIAL_STUDENT_FORM,
      student_password:    generatePassword(),
      father_password:     generatePassword(),
      guardian2_password:  generatePassword(),
      enrollment_date:     new Date().toISOString().slice(0, 10),
    };
  };

  const [form,        setForm]        = useState(initForm);
  const [documents,   setDocuments]   = useState(draftToRestore?.documents || []);
  const [photoFile,   setPhotoFile]   = useState(null);
  const [photoPreview,setPhotoPreview]= useState(null);
  const [cropConfig,  setCropConfig]  = useState({ zoom: 1, offsetX: 0, offsetY: 0 });
  const [step,        setStep]        = useState(draftToRestore?.step ?? 0);
  const [errors,      setErrors]      = useState({});
  const [saving,      setSaving]      = useState(false);
  const [serverErr,   setServerErr]   = useState('');
  const [draftId]     = useState(() => draftToRestore?.id || newDraftId());

  /* ── Enrollment step aux state ── */
  const [generatingAdmNo, setGeneratingAdmNo] = useState(false);
  const [showPassword,    setShowPassword]    = useState(false);

  /* ── Guardian step aux state ── */
  const [showFatherPwd,    setShowFatherPwd]    = useState(false);
  const [showGuardian2Pwd, setShowGuardian2Pwd] = useState(false);
  const [showGuardian2,    setShowGuardian2]    = useState(false);

  /* ── Scroll container ref ── */
  const bodyRef = useRef(null);

  /* ── Body scroll lock ── */
  useEffect(() => {
    lockBodyScroll();
    return () => unlockBodyScroll();
  }, []);

  /* ── Esc key → close (confirm if form touched) ── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        const dirty = form.first_name || form.last_name;
        if (!dirty || window.confirm('Close without saving? Your draft will be kept.')) {
          saveDraft(draftId, { form, documents, step });
          onClose();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, documents, step]);

  /* ── Auto-save draft on change ── */
  useEffect(() => {
    if (mode !== 'add') return;
    const t = setTimeout(() => saveDraft(draftId, { form, documents, step }), 800);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, documents, step]);

  /* ── Auto-fetch admission number for add mode ── */
  useEffect(() => {
    if (mode !== 'add' || form.admission_number) return;
    setGeneratingAdmNo(true);
    Promise.race([
      ApiClient.get('/api/school/students/next-admission-number/'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
    ])
      .then(d => { if (d.admission_number) setForm(f => ({ ...f, admission_number: d.admission_number })); })
      .catch(() => {
        const y = new Date().getFullYear();
        const seq = String(Date.now()).slice(-4);
        setForm(f => ({ ...f, admission_number: `STU/${y}/${seq}` }));
      })
      .finally(() => setGeneratingAdmNo(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Helpers ── */
  const setError = useCallback((k, v) =>
    setErrors(e => ({ ...e, [k]: v })), []);

  const scrollTop = () =>
    bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });

  const autofocusFirst = (errs) => {
    const firstKey = Object.keys(errs)[0];
    if (!firstKey) return;
    const el = bodyRef.current?.querySelector(`[data-field="${firstKey}"] input, [data-field="${firstKey}"] textarea, [data-field="${firstKey}"] select`);
    el?.focus({ preventScroll: false });
  };

  /* ── Step navigation ── */
  const goNext = () => {
    const errs = VALIDATORS[step]?.(form) || {};
    if (Object.keys(errs).length) {
      setErrors(errs);
      autofocusFirst(errs);
      return;
    }
    setErrors({});
    setStep(s => s + 1);
    scrollTop();
  };

  const goBack = () => {
    setErrors({});
    setStep(s => s - 1);
    scrollTop();
  };

  const jumpToStep = (idx) => {
    if (idx < 0 || idx >= FORM_STEPS.length) return;
    setErrors({});
    setStep(idx);
    scrollTop();
  };

  /* ── Sibling linking ── */
  const linkSibling = (s) => setForm(f => ({
    ...f,
    sibling_of_id:   String(s.id),
    sibling_of_name: s.full_name || s.first_name,
    father_name:  f.father_name  || s.father_name  || '',
    father_phone: f.father_phone || s.father_phone || '',
    father_email: f.father_email || s.father_email || '',
    fee_category: 'Sibling Discount',
  }));

  const unlinkSibling = () => setForm(f => ({
    ...f,
    sibling_of_id: '', sibling_of_name: '',
    fee_category: f.fee_category === 'Sibling Discount' ? '' : f.fee_category,
  }));

  /* ── Save and submit ── */
  const handleSave = async (addAnother = false) => {
    /* Run all validators before submit */
    const allErrs = {};
    VALIDATORS.slice(0, 5).forEach(v => Object.assign(allErrs, v(form)));
    if (Object.keys(allErrs).length) {
      setErrors(allErrs);
      const errStep = getFirstErrStep(allErrs);
      if (errStep !== step) { setStep(errStep); scrollTop(); }
      else autofocusFirst(allErrs);
      return;
    }

    setSaving(true); setServerErr('');
    try {
      let photoBlob = null;
      if (photoFile) {
        photoBlob = await cropImage(photoFile, cropConfig).catch(() => photoFile);
      }
      const payload = buildPayload(form, photoBlob, documents);
      let res;
      if (mode === 'add') {
        res = await ApiClient.post('/api/school/students/', payload);
      } else {
        res = await ApiClient.put(`/api/school/students/${student.id}/`, payload);
      }

      /* Cleanup draft on success */
      if (mode === 'add') deleteDraft(draftId);

      onSaved({
        id:                       res.id,
        full_name:                res.full_name || [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' '),
        admission_number:         res.admission_number || form.admission_number,
        student_username:         res.student_username || `stu_${(res.admission_number || form.admission_number || '').replace(/[^a-zA-Z0-9]/g,'').toLowerCase()}`.slice(0, 30),
        student_initial_password: res.student_initial_password || form.student_password,
        email_sent:               !!form.email,
        school_name:              school?.name,
        classroom:                classes.find(c => String(c.id) === String(form.classroom_id))?.name || '',
        enrollment_date:          new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
        parent_warnings:          res.parent_warnings || [],
        addAnother,
      });

    } catch (e) {
      const msg = e?.message || '';
      const mapped = mapServerError(msg);
      if (mapped.field) {
        setErrors({ [mapped.field]: mapped.message });
        const errStep = mapped.step >= 0 ? mapped.step : step;
        if (errStep !== step) setStep(errStep);
      }
      setServerErr(
        msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg === 'Load failed'
          ? 'Cannot reach the server. Check your connection.'
          : msg || 'Failed to save student.'
      );
    }
    setSaving(false);
  };

  /* ── Class name lookup ── */
  const classroomName = classes.find(c => String(c.id) === String(form.classroom_id))?.name || '';

  const isLastStep = step === FORM_STEPS.length - 1;
  const stepLabel  = FORM_STEPS[step]?.label;

  return (
    <div className="stu-wiz-overlay" onClick={() => {
      const dirty = form.first_name || form.last_name;
      if (!dirty || window.confirm('Close without saving? Your draft will be kept.')) {
        if (mode === 'add') saveDraft(draftId, { form, documents, step });
        onClose();
      }
    }}>
      <div className="stu-wiz" onClick={e => e.stopPropagation()}>

        {/* ── Left preview ── */}
        <div className="stu-wiz__preview">
          <PreviewPanel
            form={form}
            photoPreview={photoPreview}
            classroomName={classroomName}
            currentStep={step}
            onJump={jumpToStep}
            school={school}
          />
        </div>

        {/* ── Right: step content ── */}
        <div className="stu-wiz__main">
          <div className="stu-wiz__head">
            <div>
              <h2 className="stu-wiz__title">
                {mode === 'add' ? 'Register New Student' : 'Edit Student'}
              </h2>
              <p className="stu-wiz__sub">{stepLabel} — {step + 1} of {FORM_STEPS.length}</p>
            </div>
            <button className="ska-modal-close stu-wiz__close" onClick={() => {
              const dirty = form.first_name || form.last_name;
              if (!dirty || window.confirm('Close without saving? Your draft will be kept.')) {
                if (mode === 'add') saveDraft(draftId, { form, documents, step });
                onClose();
              }
            }} aria-label="Close">
              <Ic name="close" />
            </button>
          </div>

          <StepBar steps={FORM_STEPS} current={step} onJump={jumpToStep} />

          {serverErr && (
            <div className="stu-wiz__server-err">
              <Ic name="error" size="sm" />
              <span>{serverErr}</span>
              <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => handleSave()}>
                <Ic name="refresh" size="sm" /> Retry
              </button>
            </div>
          )}

          <div className="stu-wiz__body" ref={bodyRef}>
            {step === 0 && (
              <PersonalStep
                form={form} setForm={setForm} errors={errors} setError={setError}
                photoFile={photoFile} photoPreview={photoPreview}
                onPhotoChange={(file) => {
                  setPhotoFile(file);
                  if (file) {
                    const url = URL.createObjectURL(file);
                    setPhotoPreview(url);
                    setCropConfig({ zoom: 1, offsetX: 0, offsetY: 0 });
                  } else {
                    setPhotoPreview(null);
                  }
                }}
                cropConfig={cropConfig} onCropChange={setCropConfig}
                allStudents={allStudents}
                schoolCountryCode={schoolCountryCode}
                defaultNationality={school?.country}
                onLinkSibling={linkSibling}
                onUnlinkSibling={unlinkSibling}
                onViewExisting={() => {}}
              />
            )}
            {step === 1 && (
              <EnrollmentStep
                form={form} setForm={setForm} errors={errors} setError={setError}
                classes={classes}
                mode={mode}
                generatingAdmNo={generatingAdmNo} setGeneratingAdmNo={setGeneratingAdmNo}
                showPassword={showPassword} setShowPassword={setShowPassword}
              />
            )}
            {step === 2 && (
              <GuardianStep
                form={form} setForm={setForm} errors={errors} setError={setError}
                schoolCountryCode={schoolCountryCode}
                showFatherPwd={showFatherPwd}     setShowFatherPwd={setShowFatherPwd}
                showGuardian2Pwd={showGuardian2Pwd} setShowGuardian2Pwd={setShowGuardian2Pwd}
                showGuardian2={showGuardian2}     setShowGuardian2={setShowGuardian2}
              />
            )}
            {step === 3 && (
              <HealthStep
                form={form} setForm={setForm} errors={errors} setError={setError}
                schoolCountryCode={schoolCountryCode}
              />
            )}
            {step === 4 && (
              <DocumentsStep
                form={form} setForm={setForm}
                documents={documents} setDocuments={setDocuments}
              />
            )}
            {step === 5 && (
              <ReviewStep
                form={form}
                photoPreview={photoPreview}
                classroomName={classroomName}
                documents={documents}
                onJumpStep={jumpToStep}
              />
            )}
          </div>

          {/* ── Footer ── */}
          <div className="stu-wiz__foot">
            <div className="stu-wiz__foot-left">
              {step > 0 ? (
                <button className="ska-btn ska-btn--ghost" onClick={goBack} disabled={saving}>
                  <Ic name="arrow_back" size="sm" /> Back
                </button>
              ) : (
                <button className="ska-btn ska-btn--ghost" onClick={() => {
                  if (mode === 'add') saveDraft(draftId, { form, documents, step });
                  onClose();
                }} disabled={saving}>
                  Cancel
                </button>
              )}

              {mode === 'add' && (
                <button className="ska-btn ska-btn--ghost stu-wiz__draft-btn"
                  onClick={() => { saveDraft(draftId, { form, documents, step }); onClose(); }}
                  disabled={saving} title="Save draft and close">
                  <Ic name="save" size="sm" /> Save draft
                </button>
              )}
            </div>

            <div className="stu-wiz__foot-right">
              {isLastStep ? (
                <>
                  <button className="ska-btn ska-btn--ghost"
                    onClick={() => printEnrollmentDossier({ form, documents, classroomName, schoolName: school?.name })}
                    disabled={saving}>
                    <Ic name="print" size="sm" /> Print dossier
                  </button>
                  {mode === 'add' && (
                    <button className="ska-btn ska-btn--secondary"
                      onClick={() => handleSave(true)}
                      disabled={saving}>
                      <Ic name="add_circle" size="sm" />
                      {saving ? 'Saving…' : 'Save & add another'}
                    </button>
                  )}
                  <button className="ska-btn ska-btn--primary"
                    onClick={() => handleSave(false)}
                    disabled={saving}>
                    <Ic name="how_to_reg" size="sm" />
                    {saving ? 'Saving…' : mode === 'add' ? 'Confirm & Register' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <button className="ska-btn ska-btn--primary" onClick={goNext} disabled={saving}>
                  Next <Ic name="arrow_forward" size="sm" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Map existing student object → form fields for edit mode ── */
function mapStudentToForm(s) {
  return {
    ...INITIAL_STUDENT_FORM,
    first_name:      s.first_name  || '',
    middle_name:     s.middle_name || '',
    last_name:       s.last_name   || '',
    gender:          s.gender === 'M' ? 'Male' : s.gender === 'F' ? 'Female' : s.gender === 'O' ? 'Other' : s.gender || '',
    date_of_birth:   s.date_of_birth  || '',
    place_of_birth:  s.place_of_birth || '',
    nationality:     s.nationality    || '',
    religion:        s.religion       || '',
    home_address:    s.home_address   || '',
    city:            s.city           || '',
    phone_number:    s.phone_number   || '',
    email:           s.email          || '',
    nin:             s.nin            || '',
    admission_number:s.admission_number || '',
    classroom_id:    s.classroom_id    || '',
    student_status:  s.status          || 'active',
    enrollment_date: s.admission_date  || s.enrollment_date || '',
    student_type:    s.student_type === 'day' ? 'Day' : s.student_type === 'boarding' ? 'Boarding' : s.student_type || '',
    fee_category:    s.fee_category    || '',
    home_language:   s.home_language   || '',
    intake_term:     s.intake_term     || '',
    is_repeater:     !!s.is_repeater,
    hostel_house:    s.hostel_house     || '',
    transport_route: s.transport_route  || '',
    is_transfer:     !!(s.previous_school || s.last_class_completed),
    previous_school:       s.previous_school       || '',
    last_class_completed:  s.last_class_completed   || '',
    leaving_reason:        s.leaving_reason         || '',
    blood_group:         s.blood_type      || s.blood_group || '',
    allergies:           s.allergies        || '',
    medical_conditions:  s.medical_notes   || s.medical_conditions || '',
    is_critical_medical: !!s.is_critical_medical,
    doctor_name:         s.doctor_name     || '',
    doctor_phone:        s.doctor_phone    || '',
    sen_tier:            s.sen_tier        || '',
    sen_notes:           s.sen_notes       || '',
    sen_iep:             !!s.sen_iep,
    disciplinary_history:  !!s.disciplinary_history,
    disciplinary_notes:    s.disciplinary_notes || '',
    emergency_name:         s.emergency_name         || '',
    emergency_relationship: s.emergency_relationship || '',
    emergency_phone:        s.emergency_phone        || '',
    emergency_address:      s.emergency_address      || '',
  };
}

/* ── Find the first wizard step with errors ── */
function getFirstErrStep(errs) {
  const stepMap = {
    /* step 0 */ first_name: 0, last_name: 0, gender: 0, date_of_birth: 0, email: 0, phone_number: 0,
    /* step 1 */ classroom_id: 1, enrollment_date: 1, admission_number: 1,
    /* step 2 */ father_email: 2, guardian2_email: 2, father_phone: 2, guardian2_phone: 2, emergency_phone: 2,
    /* step 3 */ medical_conditions: 3, sen_notes: 3,
  };
  for (const key of Object.keys(errs)) {
    if (key in stepMap) return stepMap[key];
  }
  return 0;
}
