import React from 'react';
import { calculateAge } from './students.utils';
import { FORM_STEPS } from './students.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const initials = (f, l) => {
  const a = (f?.[0] || '').toUpperCase();
  const b = (l?.[0] || '').toUpperCase();
  return (a + b) || '?';
};

/* ── Completion calculation ─────────────────────────────────── */
function calcCompletion(form) {
  const required = ['first_name', 'last_name', 'gender', 'date_of_birth', 'classroom_id', 'enrollment_date'];
  const optional = ['nationality', 'email', 'phone_number', 'home_address', 'father_name', 'father_phone',
    'blood_group', 'admission_number', 'student_type', 'fee_category'];
  const reqDone = required.filter(k => !!form[k]).length;
  const optDone = optional.filter(k => !!form[k]).length;
  const reqWeight = 0.7, optWeight = 0.3;
  const reqPct = reqDone / required.length * reqWeight;
  const optPct = optDone / optional.length * optWeight;
  return Math.round((reqPct + optPct) * 100);
}

/**
 * Vertical sidebar panel inside AddStudentWizard. Shows avatar, name,
 * completion progress, and a clickable step tracker.
 */
export default function PreviewPanel({ form, photoPreview, classroomName, currentStep, onJump, school }) {
  const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ') || 'New Student';
  const age      = calculateAge(form.date_of_birth);
  const pct      = calcCompletion(form);

  return (
    <>
      <p className="stu-preview__sch">{school?.name || 'Your School'}</p>
      {school?.code && <p className="stu-preview__sch-sub">Code: {school.code}</p>}

      <div className="stu-preview__avatar-wrap">
        <div className="stu-preview__avatar">
          {photoPreview
            ? <img src={photoPreview} alt="" />
            : <span>{initials(form.first_name, form.last_name)}</span>}
        </div>
        <h3 className="stu-preview__name">{fullName}</h3>
        {form.admission_number && (
          <p className="stu-preview__id">{form.admission_number}</p>
        )}
        <div className="stu-preview__pills">
          {form.gender && <span className="stu-preview__pill">{form.gender}</span>}
          {age !== null && <span className="stu-preview__pill">{age}y</span>}
          {classroomName && <span className="stu-preview__pill">{classroomName}</span>}
          {form.is_critical_medical && <span className="stu-preview__pill stu-preview__pill--err">Critical med</span>}
          {form.sibling_of_id && <span className="stu-preview__pill stu-preview__pill--ok">Sibling</span>}
          {form.is_repeater && <span className="stu-preview__pill">Repeater</span>}
        </div>
      </div>

      <div className="stu-preview__bar-wrap">
        <div className="stu-preview__bar-head">
          <span>Completion</span>
          <strong>{pct}%</strong>
        </div>
        <div className="stu-preview__bar">
          <div className="stu-preview__bar-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="stu-preview__steps">
        {FORM_STEPS.map((s, i) => (
          <button key={s.key} type="button"
            className={`stu-preview__step ${i === currentStep ? 'is-active' : ''} ${i < currentStep ? 'is-done' : ''}`}
            onClick={() => onJump && onJump(i)}>
            <Ic name={i < currentStep ? 'check_circle' : s.icon} size="sm" />
            {s.label}
          </button>
        ))}
      </div>
    </>
  );
}
