import React from 'react';
import Field from './Field';
import PhotoUploadZone from './PhotoUploadZone';
import PhoneInput from '../../shared/PhoneInput';
import { GENDERS, RELATIONSHIPS, LANGUAGES } from './teachers.constants';
import { isEmail, isPhone } from './teachers.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

export default function PersonalStep({
  form, setForm,
  errors, setError,
  photoFile, photoPreview, onPhotoChange,
  cropConfig, onCropChange,
  existingEmails, existingPhones,
}) {
  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setError(k, '');
  };

  const blurEmail = () => {
    const v = (form.email || '').trim();
    if (!v) return setError('email', 'Required');
    if (!isEmail(v)) return setError('email', 'Invalid email format');
    if (existingEmails.includes(v.toLowerCase())) return setError('email', 'Already in use');
    setError('email', '');
  };
  const toggleLang = (lang) => {
    const cur = form.languages || [];
    const next = cur.includes(lang) ? cur.filter(l => l !== lang) : [...cur, lang];
    setField('languages', next);
  };

  return (
    <div className="tea-step">
      <p className="tea-step__intro">Personal &amp; identity details. Contact info is used for credentials delivery and emergency communication.</p>

      <PhotoUploadZone
        file={photoFile}
        preview={photoPreview}
        onFile={onPhotoChange}
        cropConfig={cropConfig}
        onCropChange={onCropChange}
      />

      <div className="tea-section">
        <h4 className="tea-section__title"><Ic name="person" size="sm" /> Name</h4>
        <div className="tea-grid">
          <Field label="First name" required error={errors.first_name} valid={!!form.first_name?.trim()}>
            <input className="ska-input" value={form.first_name}
              placeholder="e.g. Abu"
              onChange={e => setField('first_name', e.target.value)}
              onBlur={() => setError('first_name', form.first_name?.trim() ? '' : 'Required')} />
          </Field>
          <Field label="Middle name" valid={!!form.middle_name?.trim()}>
            <input className="ska-input" value={form.middle_name}
              placeholder="Optional"
              onChange={e => setField('middle_name', e.target.value)} />
          </Field>
          <Field label="Last name" required error={errors.last_name} valid={!!form.last_name?.trim()}>
            <input className="ska-input" value={form.last_name}
              placeholder="e.g. Kamara"
              onChange={e => setField('last_name', e.target.value)}
              onBlur={() => setError('last_name', form.last_name?.trim() ? '' : 'Required')} />
          </Field>
        </div>
      </div>

      <div className="tea-section">
        <h4 className="tea-section__title"><Ic name="contact_phone" size="sm" /> Contact</h4>
        <div className="tea-grid">
          <Field label="Email" required error={errors.email} valid={isEmail(form.email)}>
            <input className="ska-input" type="email" value={form.email}
              placeholder="teacher@school.com"
              onChange={e => setField('email', e.target.value)} onBlur={blurEmail} />
          </Field>
          <Field label="Phone number" error={errors.phone_number} valid={form.phone_number && isPhone(form.phone_number)}>
            <PhoneInput value={form.phone_number} onChange={v => setField('phone_number', v)} placeholder="76 000 000" />
          </Field>
          <Field label="Alternate phone" valid={!!form.alt_phone}>
            <PhoneInput value={form.alt_phone} onChange={v => setField('alt_phone', v)} placeholder="optional" />
          </Field>
          <Field label="Residential address" span="full" valid={!!form.address}>
            <textarea className="ska-input" rows={2} value={form.address}
              placeholder="Street, town, district"
              onChange={e => setField('address', e.target.value)}
              style={{ resize: 'vertical', minHeight: 60 }} />
          </Field>
        </div>
      </div>

      <div className="tea-section">
        <h4 className="tea-section__title"><Ic name="cake" size="sm" /> Demographics</h4>
        <div className="tea-grid">
          <Field label="Date of birth" error={errors.date_of_birth} valid={!!form.date_of_birth}>
            <input className="ska-input" type="date" value={form.date_of_birth}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setField('date_of_birth', e.target.value)} />
          </Field>
          <Field label="Gender" valid={!!form.gender}>
            <div className="tea-pillrow">
              {GENDERS.map(g => (
                <button key={g.key} type="button"
                  className={`tea-pill-btn ${form.gender === g.key ? 'is-active' : ''}`}
                  onClick={() => setField('gender', g.key)}>
                  <Ic name={g.icon} size="sm" /> {g.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Languages spoken" span="full" valid={form.languages?.length > 0}>
            <div className="tea-chiprow">
              {LANGUAGES.map(l => (
                <button key={l} type="button"
                  className={`tea-chip ${form.languages?.includes(l) ? 'is-active' : ''}`}
                  onClick={() => toggleLang(l)}>
                  {l}
                </button>
              ))}
            </div>
          </Field>
        </div>
      </div>

      <div className="tea-section">
        <h4 className="tea-section__title"><Ic name="emergency" size="sm" /> Emergency contact</h4>
        <div className="tea-grid">
          <Field label="Contact name" valid={!!form.emergency_contact_name}>
            <input className="ska-input" value={form.emergency_contact_name}
              placeholder="Full name"
              onChange={e => setField('emergency_contact_name', e.target.value)} />
          </Field>
          <Field label="Relationship" valid={!!form.emergency_contact_relationship}>
            <select className="ska-input" value={form.emergency_contact_relationship}
              onChange={e => setField('emergency_contact_relationship', e.target.value)}>
              <option value="">—</option>
              {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Contact phone" error={errors.emergency_contact_phone} valid={form.emergency_contact_phone && isPhone(form.emergency_contact_phone)}>
            <PhoneInput value={form.emergency_contact_phone} onChange={v => setField('emergency_contact_phone', v)} placeholder="76 000 000" />
          </Field>
        </div>
      </div>
    </div>
  );
}
