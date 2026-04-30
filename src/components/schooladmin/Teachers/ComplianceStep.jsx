import React from 'react';
import Field from './Field';
import AvailabilityGrid from './AvailabilityGrid';
import ClassAssignmentEditor from './ClassAssignmentEditor';
import DocumentsZone from './DocumentsZone';
import { calcWorkload, daysUntil, fmtDate } from './teachers.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

export default function ComplianceStep({
  form, setForm, errors, setError,
  classes, subjects,
  classAssignments, setClassAssignments,
  availability, setAvailability,
  documents, setDocuments,
}) {
  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setError(k, '');
  };

  const totalPeriods = calcWorkload(classAssignments, subjects);
  const limit = Number(form.max_workload) || 20;
  const overloadPct = limit ? Math.round((totalPeriods / limit) * 100) : 0;
  const over = totalPeriods > limit;

  const licenseDays = daysUntil(form.license_expiry);
  const licenseExpired = licenseDays !== null && licenseDays < 0;
  const licenseSoon    = licenseDays !== null && licenseDays >= 0 && licenseDays <= 60;

  return (
    <div className="tea-step">
      <p className="tea-step__intro">Class assignments, availability, payroll/compliance details, and supporting documents.</p>

      <div className="tea-section">
        <h4 className="tea-section__title"><Ic name="class" size="sm" /> Class assignments</h4>
        <ClassAssignmentEditor
          classes={classes} subjects={subjects}
          assignments={classAssignments}
          onAdd={(ca) => setClassAssignments([...classAssignments, ca])}
          onRemove={(i) => setClassAssignments(classAssignments.filter((_, idx) => idx !== i))}
        />
      </div>

      <div className="tea-section">
        <h4 className="tea-section__title"><Ic name="schedule" size="sm" /> Workload &amp; availability</h4>
        <div className="tea-grid">
          <Field label="Max workload (periods/week)" valid>
            <input className="ska-input" type="number" min={1} max={50}
              value={form.max_workload}
              onChange={e => setField('max_workload', e.target.value)} />
          </Field>
          <div className="tea-workload">
            <div className="tea-workload__num">
              <strong style={{ color: over ? 'var(--ska-error)' : 'var(--ska-text)' }}>{totalPeriods}</strong>
              <span>/ {limit} periods</span>
            </div>
            <div className="tea-workload__bar">
              <div
                className="tea-workload__fill"
                style={{
                  width: `${Math.min(overloadPct, 100)}%`,
                  background: over ? 'var(--ska-error)' : overloadPct > 80 ? 'var(--ska-tertiary)' : 'var(--ska-primary)',
                }} />
            </div>
            <span className={`tea-workload__msg ${over ? 'is-bad' : overloadPct > 80 ? 'is-warn' : 'is-ok'}`}>
              {over
                ? <><Ic name="warning" size="sm" /> Over the configured limit — reassign or raise max.</>
                : overloadPct > 80
                  ? <><Ic name="info" size="sm" /> Approaching limit ({overloadPct}%).</>
                  : <><Ic name="check_circle" size="sm" /> Within limit.</>}
            </span>
          </div>
        </div>
        <AvailabilityGrid
          availability={availability}
          onToggle={(day, period) => setAvailability(prev => ({
            ...prev,
            [day]: prev[day].map((v, i) => i === period ? !v : v),
          }))}
          onSelectAll={() => setAvailability({
            Mon: Array(8).fill(true), Tue: Array(8).fill(true), Wed: Array(8).fill(true), Thu: Array(8).fill(true), Fri: Array(8).fill(true),
          })}
          onClear={() => setAvailability({
            Mon: Array(8).fill(false), Tue: Array(8).fill(false), Wed: Array(8).fill(false), Thu: Array(8).fill(false), Fri: Array(8).fill(false),
          })}
        />
      </div>

      <div className="tea-section">
        <h4 className="tea-section__title"><Ic name="payments" size="sm" /> Payroll &amp; identification</h4>
        <p className="tea-section__sub">Skip if employment type is volunteer or details are not yet on hand.</p>
        <div className="tea-grid">
          <Field label="National ID Number (NIN)" valid={!!form.nin}>
            <input className="ska-input" value={form.nin}
              placeholder="14-digit NIN"
              onChange={e => setField('nin', e.target.value)} />
          </Field>
          <Field label="NASSIT number" valid={!!form.nassit_number}>
            <input className="ska-input" value={form.nassit_number}
              placeholder="Social security ref"
              onChange={e => setField('nassit_number', e.target.value)} />
          </Field>
          <Field label="Bank name" valid={!!form.bank_name}>
            <input className="ska-input" value={form.bank_name}
              placeholder="e.g. Sierra Leone Commercial Bank"
              onChange={e => setField('bank_name', e.target.value)} />
          </Field>
          <Field label="Bank account number" valid={!!form.bank_account_number}>
            <input className="ska-input" value={form.bank_account_number}
              placeholder="Account number"
              onChange={e => setField('bank_account_number', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="tea-section">
        <h4 className="tea-section__title"><Ic name="shield" size="sm" /> Licensing &amp; safeguarding</h4>
        <div className="tea-grid">
          <Field label="Teaching license number" valid={!!form.license_number}>
            <input className="ska-input" value={form.license_number}
              placeholder="License / certification ref"
              onChange={e => setField('license_number', e.target.value)} />
          </Field>
          <Field label="License expiry" error={errors.license_expiry}
                 valid={!!form.license_expiry && !licenseExpired}
                 hint={
                   licenseExpired ? 'EXPIRED — request renewal'
                   : licenseSoon  ? `Expires in ${licenseDays} day${licenseDays === 1 ? '' : 's'}`
                   : form.license_expiry ? `Valid until ${fmtDate(form.license_expiry)}`
                   : null}>
            <input className="ska-input" type="date" value={form.license_expiry}
              onChange={e => setField('license_expiry', e.target.value)} />
          </Field>
          <Field label="Police clearance date" error={errors.police_clearance_date}
                 valid={!!form.police_clearance_date}>
            <input className="ska-input" type="date" value={form.police_clearance_date}
              onChange={e => setField('police_clearance_date', e.target.value)} />
          </Field>
          <Field label="Safeguarding training date" error={errors.safeguarding_training_date}
                 valid={!!form.safeguarding_training_date}>
            <input className="ska-input" type="date" value={form.safeguarding_training_date}
              onChange={e => setField('safeguarding_training_date', e.target.value)} />
          </Field>

          <Field label="On probation?" valid>
            <div className="tea-pillrow">
              <button type="button"
                className={`tea-pill-btn ${form.on_probation ? 'is-active' : ''}`}
                onClick={() => setField('on_probation', true)}>Yes</button>
              <button type="button"
                className={`tea-pill-btn ${!form.on_probation ? 'is-active' : ''}`}
                onClick={() => { setField('on_probation', false); setField('probation_end_date', ''); }}>No</button>
            </div>
          </Field>

          {form.on_probation && (
            <Field label="Probation ends" required error={errors.probation_end_date} valid={!!form.probation_end_date}>
              <input className="ska-input" type="date" value={form.probation_end_date}
                onChange={e => setField('probation_end_date', e.target.value)} />
            </Field>
          )}
        </div>
      </div>

      <div className="tea-section">
        <h4 className="tea-section__title"><Ic name="folder" size="sm" /> Supporting documents</h4>
        <DocumentsZone documents={documents} onChange={setDocuments} />
      </div>
    </div>
  );
}
