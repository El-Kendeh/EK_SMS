import React, { useEffect, useState } from 'react';
import ApiClient from '../../../../api/client';
import Field from '../Field';
import PhoneInput from '../../../shared/PhoneInput';
import { RELATIONSHIP_OPTIONS } from '../students.constants';
import { isEmail, isPhone, generatePassword } from '../students.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Inline parent search — pick existing parents instead of typing fields.
 * Saves a duplicate parent record.
 */
function ParentSearchInline({ which, value, onPick, onClear }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!q.trim()) { setHits([]); return; }
    const t = setTimeout(() => {
      setBusy(true);
      ApiClient.get(`/api/school/parents/?q=${encodeURIComponent(q)}`)
        .then(d => setHits((d.parents || []).slice(0, 5)))
        .catch(() => setHits([]))
        .finally(() => setBusy(false));
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  if (value) {
    return (
      <div className="stu-parent-linked">
        <Ic name="link" />
        <strong>Linked to existing {which}: {value}</strong>
        <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm" onClick={onClear}>
          <Ic name="link_off" size="sm" /> Unlink
        </button>
      </div>
    );
  }
  return (
    <div className="stu-parent-search">
      <input className="ska-input" placeholder={`Search existing ${which} by name, phone or email…`}
        value={q} onChange={e => setQ(e.target.value)} />
      {q.trim() && (
        <div className="stu-parent-search__list">
          {busy ? <div className="stu-parent-search__empty">Searching…</div>
            : hits.length === 0 ? <div className="stu-parent-search__empty">No matches.</div>
            : hits.map(p => (
                <button key={p.id} type="button"
                  onClick={() => { onPick(p); setQ(''); }}>
                  <strong>{p.name}</strong>
                  <span>{p.email} · {p.phone}</span>
                </button>
              ))}
        </div>
      )}
    </div>
  );
}

function GuardianBlock({
  prefix, title, color,
  form, setForm, errors, setError,
  showPwd, onTogglePwd,
  schoolCountryCode,
}) {
  const setField = (k, v) => {
    setForm(f => ({ ...f, [`${prefix}_${k}`]: v }));
    if (errors[`${prefix}_${k}`]) setError(`${prefix}_${k}`, '');
  };
  const linkExisting = (p) => {
    setForm(f => ({
      ...f,
      [`${prefix}_existing_id`]: p.id,
      [`${prefix}_name`]: p.name,
      [`${prefix}_phone`]: p.phone,
      [`${prefix}_email`]: p.email,
    }));
  };
  const unlink = () => {
    setForm(f => ({
      ...f,
      [`${prefix}_existing_id`]: '',
      [`${prefix}_name`]: '',
      [`${prefix}_phone`]: '',
      [`${prefix}_email`]: '',
    }));
  };

  const isLinked = !!form[`${prefix}_existing_id`];

  return (
    <div className="stu-section" style={{ borderLeft: `3px solid ${color}` }}>
      <h4 className="stu-section__title" style={{ color }}>
        <Ic name="person" size="sm" /> {title}
      </h4>

      {/* Inline parent search (link existing) — saves duplicate records */}
      <ParentSearchInline
        which={prefix === 'father' ? 'guardian' : 'guardian 2'}
        value={form[`${prefix}_existing_id`] ? form[`${prefix}_name`] : ''}
        onPick={linkExisting}
        onClear={unlink}
      />

      <div className="stu-grid">
        <Field label="Relationship" valid={!!form[`${prefix}_relationship`]}>
          <select className="ska-input" value={form[`${prefix}_relationship`]}
            disabled={isLinked}
            onChange={e => setField('relationship', e.target.value)}>
            {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>
        <Field name={`${prefix}_name`} label={`${form[`${prefix}_relationship`] || title} name`}
               valid={!!form[`${prefix}_name`]}>
          <input className="ska-input" disabled={isLinked} value={form[`${prefix}_name`]}
            onChange={e => setField('name', e.target.value)} />
        </Field>
        <Field label="Occupation" valid={!!form[`${prefix}_occupation`]}>
          <input className="ska-input" value={form[`${prefix}_occupation`]}
            onChange={e => setField('occupation', e.target.value)} />
        </Field>
        <Field name={`${prefix}_phone`} label="Phone" error={errors[`${prefix}_phone`]}
               valid={form[`${prefix}_phone`] && isPhone(form[`${prefix}_phone`])}>
          <PhoneInput
            value={form[`${prefix}_phone`]}
            onChange={v => setField('phone', v)}
            defaultCountry={schoolCountryCode}
            disabled={isLinked}
          />
        </Field>
        <Field label="WhatsApp" valid={!!form[`${prefix}_whatsapp`]}>
          <PhoneInput
            value={form[`${prefix}_whatsapp`]}
            onChange={v => setField('whatsapp', v)}
            defaultCountry={schoolCountryCode}
          />
        </Field>
        <Field name={`${prefix}_email`} label="Email" error={errors[`${prefix}_email`]}
               valid={form[`${prefix}_email`] && isEmail(form[`${prefix}_email`])}>
          <input className="ska-input" type="email" disabled={isLinked} value={form[`${prefix}_email`]}
            onChange={e => setField('email', e.target.value)} />
        </Field>
        <Field span="full" label="Address" valid={!!form[`${prefix}_address`]}>
          <input className="ska-input" value={form[`${prefix}_address`]}
            onChange={e => setField('address', e.target.value)} />
        </Field>

        {!isLinked && (
          <Field span="full" label="Login password (auto-generated)" valid={!!form[`${prefix}_password`]}>
            <div className="stu-with-action">
              <input className="ska-input" type={showPwd ? 'text' : 'password'}
                value={form[`${prefix}_password`]}
                onChange={e => setField('password', e.target.value)} />
              <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm" onClick={onTogglePwd}>
                <Ic name={showPwd ? 'visibility_off' : 'visibility'} size="sm" />
              </button>
              <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm"
                onClick={() => setField('password', generatePassword())}>
                <Ic name="autorenew" size="sm" />
              </button>
            </div>
          </Field>
        )}
      </div>
    </div>
  );
}

export default function GuardianStep({
  form, setForm, errors, setError,
  schoolCountryCode,
  showFatherPwd, setShowFatherPwd,
  showGuardian2Pwd, setShowGuardian2Pwd,
  showGuardian2,    setShowGuardian2,
}) {
  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setError(k, '');
  };

  /* Auto-fill an empty password on first paint */
  useEffect(() => {
    if (!form.father_password)    setForm(f => ({ ...f, father_password: generatePassword() }));
    if (!form.guardian2_password) setForm(f => ({ ...f, guardian2_password: generatePassword() }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="stu-step">
      <p className="stu-step__intro">Parent / guardian and emergency contact. Use the search box to link an existing parent record instead of creating a duplicate.</p>

      <GuardianBlock
        prefix="father"
        title="Guardian 1"
        color="var(--ska-primary)"
        form={form} setForm={setForm} errors={errors} setError={setError}
        showPwd={showFatherPwd} onTogglePwd={() => setShowFatherPwd(p => !p)}
        schoolCountryCode={schoolCountryCode}
      />

      <button type="button" className="stu-add-guardian"
        onClick={() => setShowGuardian2(p => !p)}>
        <Ic name={showGuardian2 ? 'expand_less' : 'expand_more'} size="sm" />
        {showGuardian2 ? 'Hide Guardian 2' : 'Add Guardian 2 (optional)'}
      </button>

      {showGuardian2 && (
        <GuardianBlock
          prefix="guardian2"
          title="Guardian 2"
          color="#e879a0"
          form={form} setForm={setForm} errors={errors} setError={setError}
          showPwd={showGuardian2Pwd} onTogglePwd={() => setShowGuardian2Pwd(p => !p)}
          schoolCountryCode={schoolCountryCode}
        />
      )}

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="emergency" size="sm" /> Emergency contact</h4>
        <div className="stu-grid">
          <Field label="Contact name" valid={!!form.emergency_name}>
            <input className="ska-input" value={form.emergency_name}
              onChange={e => setField('emergency_name', e.target.value)} />
          </Field>
          <Field label="Relationship" valid={!!form.emergency_relationship}>
            <select className="ska-input" value={form.emergency_relationship}
              onChange={e => setField('emergency_relationship', e.target.value)}>
              <option value="">—</option>
              {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field name="emergency_phone" label="Phone" error={errors.emergency_phone}
                 valid={form.emergency_phone && isPhone(form.emergency_phone)}>
            <PhoneInput
              value={form.emergency_phone}
              onChange={v => setField('emergency_phone', v)}
              defaultCountry={schoolCountryCode}
            />
          </Field>
          <Field span="full" label="Address" valid={!!form.emergency_address}>
            <input className="ska-input" value={form.emergency_address}
              onChange={e => setField('emergency_address', e.target.value)} />
          </Field>
        </div>
      </div>
    </div>
  );
}
