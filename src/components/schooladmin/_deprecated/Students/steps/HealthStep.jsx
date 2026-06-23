import React from 'react';
import Field from '../Field';
import VaccinationGrid from '../VaccinationGrid';
import PhoneInput from '../../../shared/PhoneInput';
import { BLOOD_GROUPS, SEN_TIERS } from '../students.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

export default function HealthStep({
  form, setForm, errors, setError, schoolCountryCode,
}) {
  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setError(k, '');
  };

  return (
    <div className="stu-step">
      <p className="stu-step__intro">Health, special-needs, and disciplinary record. The <strong>Critical Alert</strong> flag surfaces a red dot on attendance and class lists for the school nurse / first-aider.</p>

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="bloodtype" size="sm" /> Vital information</h4>
        <div className="stu-grid">
          <Field label="Blood group" valid={!!form.blood_group}>
            <div className="stu-pillrow stu-pillrow--wrap">
              {BLOOD_GROUPS.map(b => (
                <button key={b.key} type="button"
                  className={`stu-pill-btn stu-pill-btn--${b.tone} ${form.blood_group === b.key ? 'is-active' : ''}`}
                  onClick={() => setField('blood_group', b.key)}>
                  {b.key}
                </button>
              ))}
            </div>
          </Field>

          <Field span="full" label="Allergies" valid={!!form.allergies}>
            <input className="ska-input" value={form.allergies}
              placeholder="e.g. penicillin, peanuts"
              onChange={e => setField('allergies', e.target.value)} />
          </Field>

          <Field span="full" label="Medical conditions" error={errors.medical_conditions} valid={!!form.medical_conditions}>
            <textarea className="ska-input" rows={2} value={form.medical_conditions}
              placeholder="Asthma, diabetes, epilepsy, etc."
              onChange={e => setField('medical_conditions', e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit', minHeight: 60 }} />
          </Field>

          <Field span="full" label="Critical-alert flag" valid>
            <label className="stu-toggle stu-toggle--danger">
              <input type="checkbox" checked={!!form.is_critical_medical}
                onChange={e => setField('is_critical_medical', e.target.checked)} />
              <span className="stu-toggle__slider" />
              <span className="stu-toggle__label">
                {form.is_critical_medical ? 'CRITICAL — surfaces a red dot on attendance + class lists' : 'Not critical'}
                <small>Use for life-threatening allergies, severe conditions, or anything first-aiders must know.</small>
              </span>
            </label>
          </Field>
        </div>
      </div>

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="local_hospital" size="sm" /> Doctor / care contact</h4>
        <div className="stu-grid">
          <Field label="Doctor / clinic name" valid={!!form.doctor_name}>
            <input className="ska-input" value={form.doctor_name}
              onChange={e => setField('doctor_name', e.target.value)} />
          </Field>
          <Field label="Doctor / clinic phone" valid={!!form.doctor_phone}>
            <PhoneInput
              value={form.doctor_phone}
              onChange={v => setField('doctor_phone', v)}
              defaultCountry={schoolCountryCode}
            />
          </Field>
        </div>
      </div>

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="vaccines" size="sm" /> Vaccination record</h4>
        <VaccinationGrid
          vaccinations={form.vaccinations || {}}
          onChange={v => setField('vaccinations', v)}
        />
      </div>

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="psychology" size="sm" /> Special educational needs</h4>
        <div className="stu-grid">
          <Field label="SEN tier" valid={form.sen_tier !== undefined}>
            <div className="stu-pillrow stu-pillrow--wrap">
              {SEN_TIERS.map(t => (
                <button key={t.key} type="button"
                  className={`stu-pill-btn stu-pill-btn--${t.tone} ${form.sen_tier === t.key ? 'is-active' : ''}`}
                  onClick={() => setField('sen_tier', t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="IEP (Individual Education Plan)?" valid>
            <label className="stu-toggle">
              <input type="checkbox" checked={!!form.sen_iep}
                onChange={e => setField('sen_iep', e.target.checked)} />
              <span className="stu-toggle__slider" />
              <span className="stu-toggle__label">{form.sen_iep ? 'Has IEP' : 'No IEP'}</span>
            </label>
          </Field>

          {form.sen_tier && (
            <Field name="sen_notes" span="full" label="Notes for teachers" error={errors.sen_notes} valid={!!form.sen_notes}>
              <textarea className="ska-input" rows={2} value={form.sen_notes}
                onChange={e => setField('sen_notes', e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit', minHeight: 60 }} />
            </Field>
          )}
        </div>
      </div>

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="report" size="sm" /> Disciplinary history</h4>
        <div className="stu-grid">
          <Field span="full" label="Prior disciplinary record?" valid>
            <label className="stu-toggle">
              <input type="checkbox" checked={!!form.disciplinary_history}
                onChange={e => setField('disciplinary_history', e.target.checked)} />
              <span className="stu-toggle__slider" />
              <span className="stu-toggle__label">{form.disciplinary_history ? 'Yes — fill notes below' : 'None'}</span>
            </label>
          </Field>
          {form.disciplinary_history && (
            <Field span="full" label="Notes" valid={!!form.disciplinary_notes}>
              <textarea className="ska-input" rows={2} value={form.disciplinary_notes}
                onChange={e => setField('disciplinary_notes', e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit', minHeight: 60 }} />
            </Field>
          )}
        </div>
      </div>
    </div>
  );
}
