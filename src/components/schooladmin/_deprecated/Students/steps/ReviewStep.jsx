import React from 'react';
import {
  STUDENT_DOCUMENT_TYPES, VACCINATIONS, SEN_TIERS, FORM_STEPS,
} from '../students.constants';
import { fmtDate, calculateAge } from '../students.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const Row = ({ icon, label, value, danger }) => (
  <div className="stu-rev__row">
    <Ic name={icon} size="sm" style={{ color: 'var(--ska-text-3)' }} />
    <span className="stu-rev__label">{label}</span>
    <span className="stu-rev__val" style={danger ? { color: 'var(--ska-error)' } : {}}>{value || '—'}</span>
  </div>
);

export default function ReviewStep({
  form, photoPreview, classroomName, documents, onJumpStep,
}) {
  const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ') || 'New Student';
  const age      = calculateAge(form.date_of_birth);
  const senTier  = SEN_TIERS.find(t => t.key === form.sen_tier)?.label || '—';
  const vaccCount = Object.keys(form.vaccinations || {}).filter(k => form.vaccinations[k]).length;
  const docCount  = documents.length;
  const requiredMissing = STUDENT_DOCUMENT_TYPES
    .filter(t => t.required)
    .filter(t => !documents.find(d => d.type === t.key && (d.file || d.verified)));

  return (
    <div className="stu-step">
      <p className="stu-step__intro">Review the full record. Click any section to jump back and edit.</p>

      {requiredMissing.length > 0 && (
        <div className="stu-rev__warn">
          <Ic name="warning" />
          <div>
            <strong>{requiredMissing.length} required document{requiredMissing.length === 1 ? '' : 's'} not uploaded or sighted</strong>
            <p>{requiredMissing.map(d => d.label).join(', ')} — you can still register, but mark these complete soon.</p>
          </div>
          <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm"
            onClick={() => onJumpStep(FORM_STEPS.findIndex(s => s.key === 'documents'))}>
            <Ic name="folder" size="sm" /> Jump to Documents
          </button>
        </div>
      )}

      {/* Hero card */}
      <div className="stu-rev__hero">
        <div className="stu-rev__hero-avatar">
          {photoPreview
            ? <img src={photoPreview} alt="" />
            : <span>{(form.first_name?.[0] || '?').toUpperCase()}{(form.last_name?.[0] || '').toUpperCase()}</span>}
        </div>
        <div className="stu-rev__hero-text">
          <h3>{fullName}</h3>
          <div className="stu-rev__hero-pills">
            <span className="stu-pill">{form.gender || '—'}</span>
            {age !== null && <span className="stu-pill">{age}y</span>}
            <span className="stu-pill stu-pill--primary">{classroomName || 'No class'}</span>
            {form.is_critical_medical && <span className="stu-pill stu-pill--err">Critical medical</span>}
            {form.sibling_of_id && <span className="stu-pill stu-pill--ok">Sibling discount</span>}
            {form.is_repeater && <span className="stu-pill">Repeating</span>}
          </div>
        </div>
        <div className="stu-rev__hero-id">
          <span>Admission</span>
          <strong>{form.admission_number || '—'}</strong>
        </div>
      </div>

      <div className="stu-rev__grid">
        <section className="stu-rev__sec" onClick={() => onJumpStep(0)}>
          <h4><Ic name="person" size="sm" /> Personal</h4>
          <Row icon="email"        label="Email"        value={form.email} />
          <Row icon="phone"        label="Phone"        value={form.phone_number} />
          <Row icon="cake"         label="DOB"          value={fmtDate(form.date_of_birth)} />
          <Row icon="public"       label="Nationality"  value={form.nationality} />
          <Row icon="translate"    label="Language"     value={form.home_language} />
          <Row icon="home"         label="Address"      value={[form.home_address, form.city].filter(Boolean).join(', ')} />
          <Row icon="badge"        label="NIN"          value={form.nin} />
        </section>

        <section className="stu-rev__sec" onClick={() => onJumpStep(1)}>
          <h4><Ic name="school" size="sm" /> Enrolment</h4>
          <Row icon="event"        label="Enrolment date" value={fmtDate(form.enrollment_date)} />
          <Row icon="settings"     label="Type"         value={form.student_type} />
          <Row icon="payments"     label="Fee category" value={form.fee_category} />
          <Row icon="schedule"     label="Intake term"  value={form.intake_term} />
          <Row icon="output"       label="Transfer"     value={form.is_transfer ? `Yes — from ${form.previous_school || '?'}` : 'No'} />
          <Row icon="hotel"        label="Boarding"     value={form.student_type === 'Boarding' ? form.hostel_house || 'Yes' : 'No'} />
          <Row icon="commute"      label="Transport"    value={form.transport_route} />
        </section>

        <section className="stu-rev__sec stu-rev__sec--full" onClick={() => onJumpStep(2)}>
          <h4><Ic name="family_restroom" size="sm" /> Guardians</h4>
          <div className="stu-rev__guardians">
            <div>
              <span>Guardian 1 ({form.father_relationship})</span>
              <strong>{form.father_name || '—'}</strong>
              <small>{[form.father_phone, form.father_email].filter(Boolean).join(' · ') || '—'}</small>
            </div>
            <div>
              <span>Guardian 2 ({form.guardian2_relationship})</span>
              <strong>{form.guardian2_name || '—'}</strong>
              <small>{[form.guardian2_phone, form.guardian2_email].filter(Boolean).join(' · ') || '—'}</small>
            </div>
            <div>
              <span>Emergency</span>
              <strong>{form.emergency_name || '—'} ({form.emergency_relationship || '—'})</strong>
              <small>{form.emergency_phone || '—'}</small>
            </div>
          </div>
        </section>

        <section className="stu-rev__sec" onClick={() => onJumpStep(3)}>
          <h4><Ic name="medical_services" size="sm" /> Health</h4>
          <Row icon="bloodtype"  label="Blood group"  value={form.blood_group} />
          <Row icon="warning"    label="Allergies"    value={form.allergies} />
          <Row icon="report"     label="Conditions"   value={form.medical_conditions} danger={form.is_critical_medical} />
          <Row icon="psychology" label="SEN tier"     value={senTier} />
          <Row icon="vaccines"   label="Vaccinations" value={`${vaccCount} of ${VACCINATIONS.length} recorded`} />
        </section>

        <section className="stu-rev__sec" onClick={() => onJumpStep(4)}>
          <h4><Ic name="folder_open" size="sm" /> Documents</h4>
          {STUDENT_DOCUMENT_TYPES.slice(0, 5).map(t => {
            const d = documents.find(x => x.type === t.key);
            const status = d?.file ? 'Uploaded' : d?.verified ? 'Sighted' : '—';
            return <Row key={t.key} icon={t.icon} label={t.label} value={status} danger={t.required && !d} />;
          })}
          <Row icon="folder" label={`+ ${Math.max(0, docCount - 5)} more`} value={`${docCount} total`} />
        </section>
      </div>
    </div>
  );
}
