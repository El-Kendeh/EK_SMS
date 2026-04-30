import React, { useEffect } from 'react';
import ApiClient from '../../../../api/client';
import Field from '../Field';
import {
  STUDENT_TYPES, FEE_CATEGORIES, INTAKE_TERMS, STUDENT_STATUSES,
} from '../students.constants';
import { previewUsername, generatePassword, fmtDate } from '../students.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const PROMOTION_HINT = {
  /* Common SL school class progression — used for "next class" suggestion */
  'KG1': 'KG2', 'KG2': 'Primary 1', 'Primary 1': 'Primary 2', 'Primary 2': 'Primary 3',
  'Primary 3': 'Primary 4', 'Primary 4': 'Primary 5', 'Primary 5': 'Primary 6',
  'Primary 6': 'JSS 1', 'JSS 1': 'JSS 2', 'JSS 2': 'JSS 3',
  'JSS 3': 'SSS 1', 'SSS 1': 'SSS 2', 'SSS 2': 'SSS 3',
};

export default function EnrollmentStep({
  form, setForm, errors, setError,
  classes, mode = 'add',
  generatingAdmNo, setGeneratingAdmNo,
  showPassword, setShowPassword,
}) {
  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setError(k, '');
  };

  /* Auto-suggest the "next class" when previous_school + last_class_completed
     are filled — saves typing during transfers. */
  const promotionSuggest = form.is_transfer && form.last_class_completed && PROMOTION_HINT[form.last_class_completed]
    ? classes.find(c => c.name === PROMOTION_HINT[form.last_class_completed])
    : null;

  /* Ensure password is set when wizard reaches this step (idempotent). */
  useEffect(() => {
    if (mode === 'add' && !form.student_password) {
      setForm(f => ({ ...f, student_password: generatePassword() }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const regenerateAdmNo = () => {
    setGeneratingAdmNo(true);
    Promise.race([
      ApiClient.get('/api/school/students/next-admission-number/'),
      new Promise((_, rej) => setTimeout(() => rej(new Error('adm-timeout')), 5000)),
    ])
      .then(d => { if (d.admission_number) setForm(f => ({ ...f, admission_number: d.admission_number })); })
      .catch(() => {
        const y = new Date().getFullYear();
        const seq = String(Date.now()).slice(-4);
        setForm(f => ({ ...f, admission_number: `STU/${y}/${seq}` }));
      })
      .finally(() => setGeneratingAdmNo(false));
  };

  return (
    <div className="stu-step">
      <p className="stu-step__intro">Enrolment, class assignment, and login credentials.</p>

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="badge" size="sm" /> Admission</h4>
        <div className="stu-grid">
          <Field name="admission_number" span="full" label="Admission number" error={errors.admission_number} valid={!!form.admission_number}
                 action={
                   mode === 'add' && !generatingAdmNo
                     ? <button type="button" className="stu-field__action" onClick={regenerateAdmNo}>
                         <Ic name="refresh" size="sm" /> Re-generate
                       </button>
                     : null
                 }>
            <input className="ska-input"
              value={generatingAdmNo ? 'Generating…' : form.admission_number}
              readOnly={generatingAdmNo}
              placeholder="Auto-generated — or type your own"
              style={{ fontFamily: 'monospace', letterSpacing: '0.04em' }}
              onChange={e => !generatingAdmNo && setField('admission_number', e.target.value)} />
          </Field>

          <Field name="classroom_id" label="Class / Grade" required error={errors.classroom_id} valid={!!form.classroom_id}
                 hint={promotionSuggest ? `Suggested: ${promotionSuggest.name} (next after ${form.last_class_completed})` : null}>
            <select className="ska-input" value={form.classroom_id}
              onChange={e => setField('classroom_id', e.target.value)}>
              <option value="">— Assign a class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <Field name="enrollment_date" label="Enrolment date" required error={errors.enrollment_date} valid={!!form.enrollment_date}>
            <input className="ska-input" type="date" value={form.enrollment_date}
              onChange={e => setField('enrollment_date', e.target.value)} />
          </Field>

          {mode !== 'add' && (
            <Field label="Status" valid>
              <select className="ska-input" value={form.student_status}
                onChange={e => setField('student_status', e.target.value)}>
                {STUDENT_STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
          )}
        </div>
      </div>

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="settings" size="sm" /> Programme</h4>
        <div className="stu-grid">
          <Field label="Type" valid>
            <div className="stu-pillrow">
              {STUDENT_TYPES.map(t => (
                <button key={t} type="button"
                  className={`stu-pill-btn ${form.student_type === t ? 'is-active' : ''}`}
                  onClick={() => setField('student_type', t)}>
                  <Ic name={t === 'Day' ? 'wb_sunny' : 'hotel'} size="sm" /> {t}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Fee category" valid={!!form.fee_category}
                 hint={form.sibling_of_id ? 'Sibling Discount auto-applied — adjust if needed.' : null}>
            <select className="ska-input" value={form.fee_category}
              onChange={e => setField('fee_category', e.target.value)}>
              <option value="">—</option>
              {FEE_CATEGORIES.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>

          <Field label="Intake term" valid={!!form.intake_term}>
            <div className="stu-pillrow">
              {INTAKE_TERMS.map(t => (
                <button key={t} type="button"
                  className={`stu-pill-btn ${form.intake_term === t ? 'is-active' : ''}`}
                  onClick={() => setField('intake_term', t)}>{t}</button>
              ))}
            </div>
          </Field>

          <Field label="Repeating year?" valid>
            <label className="stu-toggle">
              <input type="checkbox" checked={!!form.is_repeater}
                onChange={e => setField('is_repeater', e.target.checked)} />
              <span className="stu-toggle__slider" />
              <span className="stu-toggle__label">{form.is_repeater ? 'Repeating' : 'New year'}</span>
            </label>
          </Field>

          {form.student_type === 'Boarding' && (
            <Field label="Hostel house" valid={!!form.hostel_house}>
              <input className="ska-input" value={form.hostel_house}
                onChange={e => setField('hostel_house', e.target.value)} />
            </Field>
          )}
          <Field label="Transport route" valid={!!form.transport_route}>
            <input className="ska-input" value={form.transport_route}
              onChange={e => setField('transport_route', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="output" size="sm" /> Transfer</h4>
        <div className="stu-grid">
          <Field span="full" label="Is this student transferring in?" valid>
            <label className="stu-toggle">
              <input type="checkbox" checked={!!form.is_transfer}
                onChange={e => setField('is_transfer', e.target.checked)} />
              <span className="stu-toggle__slider" />
              <span className="stu-toggle__label">{form.is_transfer ? 'Yes — fill below' : 'No — skip'}</span>
            </label>
          </Field>
          {form.is_transfer && (
            <>
              <Field label="Previous school" valid={!!form.previous_school}>
                <input className="ska-input" value={form.previous_school}
                  onChange={e => setField('previous_school', e.target.value)} />
              </Field>
              <Field label="Last class completed" valid={!!form.last_class_completed}>
                <input className="ska-input" value={form.last_class_completed}
                  placeholder="e.g. Primary 5"
                  onChange={e => setField('last_class_completed', e.target.value)} />
              </Field>
              <Field span="full" label="Reason for leaving" valid={!!form.leaving_reason}>
                <input className="ska-input" value={form.leaving_reason}
                  onChange={e => setField('leaving_reason', e.target.value)} />
              </Field>
            </>
          )}
        </div>
      </div>

      {mode === 'add' && (
        <div className="stu-section stu-section--accent">
          <h4 className="stu-section__title"><Ic name="key" size="sm" /> Student portal credentials</h4>
          <p className="stu-section__sub">Auto-generated. Share with the student — they can change after first login.</p>
          <div className="stu-creds">
            <div className="stu-creds__row">
              <Ic name="account_circle" size="sm" />
              <div>
                <span>Username</span>
                <strong>{form.admission_number ? previewUsername(form.admission_number) : 'Generated after admission number'}</strong>
              </div>
            </div>
            <div className="stu-creds__row">
              <Ic name="lock" size="sm" />
              <div>
                <span>Password</span>
                <strong className="stu-creds__pwd" style={{ filter: showPassword ? 'none' : 'blur(5px)' }}>
                  {form.student_password}
                </strong>
              </div>
              <div className="stu-creds__actions">
                <button type="button" title={showPassword ? 'Hide' : 'Show'}
                  onClick={() => setShowPassword(p => !p)}>
                  <Ic name={showPassword ? 'visibility_off' : 'visibility'} size="sm" />
                </button>
                <button type="button" title="Regenerate"
                  onClick={() => setField('student_password', generatePassword())}>
                  <Ic name="refresh" size="sm" />
                </button>
                <button type="button" title="Copy"
                  onClick={() => navigator.clipboard?.writeText(form.student_password)}>
                  <Ic name="content_copy" size="sm" />
                </button>
              </div>
            </div>
          </div>
          <p className="stu-section__hint">
            {form.email ? 'Will also be emailed to the student.' : 'No email entered — share credentials manually.'}
            {' '}Last update: {fmtDate(new Date().toISOString())}.
          </p>
        </div>
      )}
    </div>
  );
}
