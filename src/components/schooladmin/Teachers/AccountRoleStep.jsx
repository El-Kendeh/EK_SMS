import React, { useEffect, useState } from 'react';
import Field from './Field';
import { EMPLOYMENT_TYPES, ROLE_TIERS, DEPARTMENTS } from './teachers.constants';
import { generatePassword, passwordStrength, suggestEmployeeId, suggestQualification } from './teachers.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

export default function AccountRoleStep({
  form, setForm, errors, setError,
  classes, subjects,
  classAssignments,
  existingTeachers,
}) {
  const [showPass, setShowPass] = useState(false);

  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setError(k, '');
  };

  /* Auto-suggest employee ID once when blank */
  const suggested = suggestEmployeeId(existingTeachers);
  useEffect(() => {
    if (!form.employee_id && suggested) {
      setForm(f => f.employee_id ? f : { ...f, employee_id: suggested });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const qualSuggest = suggestQualification(classAssignments);
  const pw = passwordStrength(form.password);

  const toggleSubject = (subj) => {
    const cur = form.qualified_subjects || [];
    const next = cur.includes(subj.id)
      ? cur.filter(id => id !== subj.id)
      : [...cur, subj.id];
    setField('qualified_subjects', next);
  };

  return (
    <div className="tea-step">
      <p className="tea-step__intro">Account credentials, employment terms and the subjects this teacher is qualified to deliver.</p>

      <div className="tea-section">
        <h4 className="tea-section__title"><Ic name="badge" size="sm" /> Identity at the school</h4>
        <div className="tea-grid">
          <Field label="Employee ID" required error={errors.employee_id} valid={!!form.employee_id?.trim()}
                 hint={form.employee_id === suggested ? `Auto-suggested: ${suggested}` : `Suggested: ${suggested}`}>
            <div className="tea-with-action">
              <input className="ska-input" value={form.employee_id}
                placeholder="e.g. T/2026/0042"
                onChange={e => setField('employee_id', e.target.value)}
                onBlur={() => setError('employee_id', form.employee_id?.trim() ? '' : 'Required')} />
              {form.employee_id !== suggested && (
                <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm"
                  onClick={() => setField('employee_id', suggested)} title="Use suggested ID">
                  <Ic name="auto_fix_high" size="sm" /> Suggest
                </button>
              )}
            </div>
          </Field>

          <Field label="Hire date" error={errors.hire_date} valid={!!form.hire_date}>
            <input className="ska-input" type="date" value={form.hire_date}
              onChange={e => setField('hire_date', e.target.value)} />
          </Field>

          <Field label="Department" valid={!!form.department}>
            <select className="ska-input" value={form.department}
              onChange={e => setField('department', e.target.value)}>
              <option value="">—</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>

          <Field label="Role tier" valid={!!form.role_tier}>
            <select className="ska-input" value={form.role_tier}
              onChange={e => setField('role_tier', e.target.value)}>
              {ROLE_TIERS.map(r => <option key={r.key} value={r.key}>{r.label} — {r.desc}</option>)}
            </select>
          </Field>

          <Field label="Employment type" span="full" valid>
            <div className="tea-pillrow tea-pillrow--wrap">
              {EMPLOYMENT_TYPES.map(et => (
                <button key={et.key} type="button"
                  className={`tea-pill-btn ${form.employment_type === et.key ? 'is-active' : ''}`}
                  onClick={() => setField('employment_type', et.key)}
                  title={et.hint}>
                  {et.label}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </div>

      <div className="tea-section">
        <h4 className="tea-section__title"><Ic name="house" size="sm" /> Class teacher (homeroom)</h4>
        <div className="tea-grid">
          <Field label="Is class teacher?" valid>
            <div className="tea-pillrow">
              <button type="button"
                className={`tea-pill-btn ${form.is_class_teacher ? 'is-active' : ''}`}
                onClick={() => setField('is_class_teacher', true)}>Yes</button>
              <button type="button"
                className={`tea-pill-btn ${!form.is_class_teacher ? 'is-active' : ''}`}
                onClick={() => { setField('is_class_teacher', false); setField('homeroom_class_id', ''); }}>No</button>
            </div>
          </Field>
          {form.is_class_teacher && (
            <Field label="Homeroom class" required error={errors.homeroom_class_id} valid={!!form.homeroom_class_id}>
              <select className="ska-input" value={form.homeroom_class_id}
                onChange={e => setField('homeroom_class_id', e.target.value)}>
                <option value="">Pick a class…</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
          )}
        </div>
      </div>

      <div className="tea-section">
        <h4 className="tea-section__title"><Ic name="school" size="sm" /> Qualifications &amp; subject expertise</h4>
        <div className="tea-grid">
          <Field label="Qualification / degree" span="full" valid={!!form.qualification?.trim()}
                 hint={qualSuggest && !form.qualification ? `Suggested: ${qualSuggest}` : null}>
            <div className="tea-with-action">
              <input className="ska-input" value={form.qualification}
                placeholder="e.g. B.Sc. Mathematics, PGCE"
                onChange={e => setField('qualification', e.target.value)} />
              {qualSuggest && !form.qualification && (
                <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm"
                  onClick={() => setField('qualification', qualSuggest.split(' · ')[0])}>
                  <Ic name="tips_and_updates" size="sm" /> Use
                </button>
              )}
            </div>
          </Field>

          <Field label="Subjects qualified to teach" span="full" valid={form.qualified_subjects?.length > 0}
                 hint={`Selected ${form.qualified_subjects?.length || 0} of ${subjects.length} subjects`}>
            <div className="tea-chiprow">
              {subjects.length === 0
                ? <span className="tea-step__muted">No subjects available — add them under Subjects first.</span>
                : subjects.map(s => (
                    <button key={s.id} type="button"
                      className={`tea-chip ${form.qualified_subjects?.includes(s.id) ? 'is-active' : ''}`}
                      onClick={() => toggleSubject(s)}>
                      {s.name}
                    </button>
                  ))
              }
            </div>
          </Field>
        </div>
      </div>

      <div className="tea-section">
        <h4 className="tea-section__title"><Ic name="key" size="sm" /> Login credentials</h4>
        <div className="tea-grid">
          <Field label="Login password" required error={errors.password} valid={form.password?.length >= 8}
                 hint={form.password ? null : 'At least 8 characters with mixed-case, numbers, and a symbol.'}
                 span="full">
            <div className="tea-with-action">
              <div style={{ position: 'relative', flex: 1 }}>
                <input className="ska-input" type={showPass ? 'text' : 'password'} value={form.password}
                  placeholder="Create or auto-generate"
                  onChange={e => setField('password', e.target.value)}
                  onBlur={() => setError('password', form.password?.length >= 8 ? '' : 'At least 8 characters')}
                  style={{ paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', display: 'flex', padding: 4 }}>
                  <Ic name={showPass ? 'visibility_off' : 'visibility'} size="sm" />
                </button>
              </div>
              <button type="button" className="ska-btn ska-btn--secondary ska-btn--sm"
                onClick={() => setField('password', generatePassword(12))}>
                <Ic name="autorenew" size="sm" /> Generate
              </button>
            </div>
            {form.password && (
              <div className="tea-pw-meter">
                <div className="tea-pw-meter__bars">
                  {[1,2,3,4,5].map(i => (
                    <span key={i} style={{ background: i <= pw.score ? pw.color : 'var(--ska-surface-highest)' }} />
                  ))}
                </div>
                <span style={{ color: pw.color, fontWeight: 700, fontSize: '0.75rem' }}>{pw.label}</span>
              </div>
            )}
          </Field>

          <Field label="Force password change on first login" span="full" valid>
            <label className="tea-toggle">
              <input type="checkbox" checked={!!form.force_password_change}
                onChange={e => setField('force_password_change', e.target.checked)} />
              <span className="tea-toggle__slider" />
              <span className="tea-toggle__label">
                {form.force_password_change ? 'Required' : 'Disabled'}
                <small>Recommended — teacher must change the temp password on first login.</small>
              </span>
            </label>
          </Field>
        </div>
      </div>
    </div>
  );
}
