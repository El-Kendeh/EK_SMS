import React, { useMemo } from 'react';
import Field from '../Field';
import QuickChips from '../QuickChips';
import SiblingMatchCard from '../SiblingMatchCard';
import DuplicateAlert from '../DuplicateAlert';
import PhotoUploadZone from '../../Teachers/PhotoUploadZone';
import PhoneInput from '../../../shared/PhoneInput';
import {
  GENDERS, COMMON_NATIONALITIES, COMMON_LANGUAGES, COMMON_RELIGIONS,
} from '../students.constants';
import {
  calculateAge, isEmail, isPhone, findSiblings, findDuplicates,
} from '../students.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

export default function PersonalStep({
  form, setForm, errors, setError,
  photoFile, photoPreview, onPhotoChange,
  cropConfig, onCropChange,
  allStudents = [], schoolCountryCode, defaultNationality,
  onLinkSibling, onUnlinkSibling, onViewExisting,
}) {
  const setField = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setError(k, '');
  };

  const siblings   = useMemo(() => findSiblings(form, allStudents), [form, allStudents]);
  const duplicates = useMemo(() => findDuplicates(form, allStudents), [form, allStudents]);
  const age = calculateAge(form.date_of_birth);

  const blurEmail = () => {
    const v = (form.email || '').trim();
    if (!v) return setError('email', '');
    setError('email', isEmail(v) ? '' : 'Enter a valid email');
  };
  const blurPhone = () => {
    const v = (form.phone_number || '').trim();
    if (!v) return setError('phone_number', '');
    setError('phone_number', isPhone(v) ? '' : 'Invalid phone');
  };

  return (
    <div className="stu-step">
      <p className="stu-step__intro">Personal &amp; identity details. We'll auto-detect siblings and possible duplicate enrolments as you type.</p>

      {duplicates.length > 0 && (
        <DuplicateAlert duplicates={duplicates} onView={onViewExisting} />
      )}

      <SiblingMatchCard
        matches={siblings}
        linkedId={form.sibling_of_id}
        onLink={onLinkSibling}
        onUnlink={onUnlinkSibling}
      />

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="photo_camera" size="sm" /> Profile photo</h4>
        <PhotoUploadZone
          file={photoFile}
          preview={photoPreview}
          onFile={onPhotoChange}
          cropConfig={cropConfig}
          onCropChange={onCropChange}
        />
      </div>

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="person" size="sm" /> Name</h4>
        <div className="stu-grid">
          <Field name="first_name" label="First name" required error={errors.first_name} valid={!!form.first_name?.trim()}>
            <input className="ska-input" autoComplete="given-name" value={form.first_name}
              onChange={e => setField('first_name', e.target.value)}
              onBlur={() => setError('first_name', form.first_name?.trim() ? '' : 'First name is required')} />
          </Field>
          <Field name="middle_name" label="Middle name" valid={!!form.middle_name?.trim()}>
            <input className="ska-input" autoComplete="additional-name" value={form.middle_name}
              placeholder="Optional"
              onChange={e => setField('middle_name', e.target.value)} />
          </Field>
          <Field name="last_name" label="Last name" required error={errors.last_name} valid={!!form.last_name?.trim()}>
            <input className="ska-input" autoComplete="family-name" value={form.last_name}
              onChange={e => setField('last_name', e.target.value)}
              onBlur={() => setError('last_name', form.last_name?.trim() ? '' : 'Last name is required')} />
          </Field>
        </div>
      </div>

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="cake" size="sm" /> Demographics</h4>
        <div className="stu-grid">
          <Field name="gender" label="Gender" required error={errors.gender} valid={!!form.gender}>
            <div className="stu-pillrow">
              {GENDERS.map(g => (
                <button key={g.key} type="button"
                  className={`stu-pill-btn ${form.gender === g.key ? 'is-active' : ''}`}
                  onClick={() => setField('gender', g.key)}>
                  <Ic name={g.icon} size="sm" /> {g.label}
                </button>
              ))}
            </div>
          </Field>

          <Field name="date_of_birth" label="Date of birth" required error={errors.date_of_birth}
                 valid={!!form.date_of_birth && !errors.date_of_birth}
                 hint={age !== null ? `Age: ${age} year${age !== 1 ? 's' : ''}` : null}>
            <input className="ska-input" type="date" value={form.date_of_birth}
              max={new Date().toISOString().slice(0, 10)}
              onChange={e => setField('date_of_birth', e.target.value)} />
          </Field>

          <Field name="place_of_birth" label="Place of birth" valid={!!form.place_of_birth}>
            <input className="ska-input" value={form.place_of_birth}
              onChange={e => setField('place_of_birth', e.target.value)} />
          </Field>

          <Field name="nationality" label="Nationality" valid={!!form.nationality}
                 hint={defaultNationality && !form.nationality ? `Suggested: ${defaultNationality}` : null}>
            <input className="ska-input" autoComplete="country-name" value={form.nationality}
              onChange={e => setField('nationality', e.target.value)}
              onFocus={() => { if (!form.nationality && defaultNationality) setField('nationality', defaultNationality); }} />
          </Field>

          <Field span="full" label="Quick-pick nationality">
            <QuickChips options={COMMON_NATIONALITIES} value={form.nationality} onPick={v => setField('nationality', v)} />
          </Field>

          <Field name="religion" label="Religion" valid={!!form.religion}>
            <input className="ska-input" value={form.religion}
              onChange={e => setField('religion', e.target.value)} />
          </Field>

          <Field span="full" label="Quick-pick religion">
            <QuickChips options={COMMON_RELIGIONS} value={form.religion} onPick={v => setField('religion', v)} />
          </Field>

          <Field name="home_language" label="Home language" valid={!!form.home_language}>
            <input className="ska-input" value={form.home_language}
              onChange={e => setField('home_language', e.target.value)} />
          </Field>

          <Field span="full" label="Quick-pick language">
            <QuickChips options={COMMON_LANGUAGES} value={form.home_language} onPick={v => setField('home_language', v)} />
          </Field>
        </div>
      </div>

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="contact_phone" size="sm" /> Contact</h4>
        <div className="stu-grid">
          <Field name="email" label="Student email" error={errors.email} valid={form.email && isEmail(form.email)}>
            <input className="ska-input" type="email" autoComplete="email" value={form.email}
              onChange={e => setField('email', e.target.value)} onBlur={blurEmail} />
          </Field>
          <Field name="phone_number" label="Student phone" error={errors.phone_number} valid={form.phone_number && isPhone(form.phone_number)}>
            <PhoneInput
              value={form.phone_number}
              onChange={v => setField('phone_number', v)}
              defaultCountry={schoolCountryCode}
            />
          </Field>
          <Field name="home_address" span="full" label="Home address" valid={!!form.home_address}>
            <textarea className="ska-input" rows={2} autoComplete="street-address" value={form.home_address}
              onChange={e => setField('home_address', e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit', minHeight: 60 }} />
          </Field>
          <Field name="city" label="City / town" valid={!!form.city}>
            <input className="ska-input" autoComplete="address-level2" value={form.city}
              onChange={e => setField('city', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="badge" size="sm" /> Identification (optional)</h4>
        <div className="stu-grid">
          <Field name="nin" label="National ID Number (NIN)" valid={!!form.nin}>
            <input className="ska-input" value={form.nin}
              placeholder="If issued — will appear on certificates"
              onChange={e => setField('nin', e.target.value)} />
          </Field>
        </div>
      </div>
    </div>
  );
}
