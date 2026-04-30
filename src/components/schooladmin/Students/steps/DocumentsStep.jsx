import React, { useRef, useState } from 'react';
import Field from '../Field';
import { STUDENT_DOCUMENT_TYPES } from '../students.constants';
import { fmtDate } from '../students.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const fmtSize = (s) => {
  if (!s) return '—';
  if (s < 1024) return `${s} B`;
  if (s < 1024 * 1024) return `${(s / 1024).toFixed(1)} KB`;
  return `${(s / 1024 / 1024).toFixed(2)} MB`;
};

/**
 * Each document row is a slot — admin uploads a file (or marks "verified
 * by sight" with a date if no scanner is at hand). This replaces the
 * old form's 6 ticky-boxes with provenance.
 *
 * `documents` = [{ id, type, file?, verified?, verified_date? }]
 */
function DocumentRow({ slot, doc, onUpload, onClear, onVerify }) {
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);

  const accept = (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { alert(`${file.name} is over 10 MB.`); return; }
    onUpload(slot.key, file);
  };

  return (
    <div className={`stu-doc-row ${doc?.file ? 'is-uploaded' : doc?.verified ? 'is-verified' : ''} ${slot.required ? 'is-required' : ''}`}>
      <div className="stu-doc-row__icon"><Ic name={slot.icon} /></div>
      <div className="stu-doc-row__info">
        <strong>{slot.label}{slot.required && <em> *</em>}</strong>
        {slot.hint && <small>{slot.hint}</small>}
        {doc?.file && <span className="stu-doc-row__file">{doc.file.name} · {fmtSize(doc.file.size)}</span>}
        {!doc?.file && doc?.verified && <span className="stu-doc-row__verified">Sighted on {fmtDate(doc.verified_date)}</span>}
      </div>

      <div
        className={`stu-doc-row__actions ${drag ? 'is-drag' : ''}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => { e.preventDefault(); setDrag(false); accept(e.dataTransfer?.files?.[0]); }}
      >
        <input ref={inputRef} type="file" style={{ display: 'none' }}
          accept=".pdf,.doc,.docx,image/*"
          onChange={e => accept(e.target.files?.[0])} />

        {doc?.file ? (
          <>
            <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => inputRef.current?.click()}>
              <Ic name="autorenew" size="sm" /> Replace
            </button>
            <button type="button" className="ska-btn ska-btn--danger ska-btn--sm" onClick={() => onClear(slot.key)}>
              <Ic name="delete" size="sm" /> Remove
            </button>
          </>
        ) : (
          <>
            <button type="button" className="ska-btn ska-btn--secondary ska-btn--sm" onClick={() => inputRef.current?.click()}>
              <Ic name="upload" size="sm" /> Upload
            </button>
            <button type="button"
              className={`ska-btn ska-btn--sm ${doc?.verified ? 'ska-btn--approve' : 'ska-btn--ghost'}`}
              onClick={() => onVerify(slot.key, !doc?.verified)}>
              <Ic name={doc?.verified ? 'check_circle' : 'visibility'} size="sm" />
              {doc?.verified ? 'Sighted' : 'Mark sighted'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function DocumentsStep({
  form, setForm,
  documents, setDocuments,
}) {
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const upload = (key, file) => {
    setDocuments(docs => {
      const without = docs.filter(d => d.type !== key);
      return [...without, { id: `d_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, type: key, file, verified: true, verified_date: new Date().toISOString().slice(0, 10) }];
    });
  };
  const clearDoc = (key) => setDocuments(docs => docs.filter(d => d.type !== key));
  const verify   = (key, on) => {
    setDocuments(docs => {
      const without = docs.filter(d => d.type !== key);
      if (!on) return without;
      return [...without, { id: `d_${Date.now()}_${Math.random().toString(36).slice(2,5)}`, type: key, verified: true, verified_date: new Date().toISOString().slice(0, 10) }];
    });
  };

  const docByType = Object.fromEntries(documents.map(d => [d.type, d]));

  return (
    <div className="stu-step">
      <p className="stu-step__intro">Upload supporting documents, or mark them as physically sighted with the date. Required documents are flagged with an asterisk.</p>

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="folder" size="sm" /> Document slots</h4>
        <div className="stu-doc-list">
          {STUDENT_DOCUMENT_TYPES.map(slot => (
            <DocumentRow
              key={slot.key}
              slot={slot}
              doc={docByType[slot.key]}
              onUpload={upload}
              onClear={clearDoc}
              onVerify={verify}
            />
          ))}
        </div>
      </div>

      <div className="stu-section">
        <h4 className="stu-section__title"><Ic name="how_to_reg" size="sm" /> Consents &amp; declarations</h4>
        <div className="stu-grid">
          <Field span="full" label="Photo / media-release consent" valid>
            <label className="stu-toggle">
              <input type="checkbox" checked={!!form.photo_consent}
                onChange={e => {
                  setField('photo_consent', e.target.checked);
                  if (e.target.checked && !form.photo_consent_signed_date) {
                    setField('photo_consent_signed_date', new Date().toISOString().slice(0, 10));
                  }
                }} />
              <span className="stu-toggle__slider" />
              <span className="stu-toggle__label">
                {form.photo_consent ? `Granted on ${fmtDate(form.photo_consent_signed_date)}` : 'Not granted'}
                <small>Permission to use student photo in school publications, social media, prospectus.</small>
              </span>
            </label>
          </Field>

          <Field span="full" label="Tax-paying parent declaration (NRA)" valid>
            <label className="stu-toggle">
              <input type="checkbox" checked={!!form.tax_paying_parent}
                onChange={e => {
                  setField('tax_paying_parent', e.target.checked);
                  if (e.target.checked && !form.tax_paying_parent_signed_date) {
                    setField('tax_paying_parent_signed_date', new Date().toISOString().slice(0, 10));
                  }
                }} />
              <span className="stu-toggle__slider" />
              <span className="stu-toggle__label">
                {form.tax_paying_parent ? `Signed on ${fmtDate(form.tax_paying_parent_signed_date)}` : 'Not signed'}
                <small>Required for fee-relief / FQE eligibility under NRA rules.</small>
              </span>
            </label>
          </Field>
        </div>
      </div>
    </div>
  );
}
