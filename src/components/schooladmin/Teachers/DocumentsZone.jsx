import React, { useRef, useState } from 'react';
import { DOCUMENT_TYPES } from './teachers.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const fileIcon = (f) => {
  const t = (f.type || '').toLowerCase();
  if (t.includes('pdf')) return 'picture_as_pdf';
  if (t.startsWith('image/')) return 'image';
  if (t.includes('word') || t.includes('document')) return 'article';
  return 'attach_file';
};

const fmtSize = (s) => {
  if (!s) return '—';
  if (s < 1024) return `${s} B`;
  if (s < 1024 * 1024) return `${(s / 1024).toFixed(1)} KB`;
  return `${(s / 1024 / 1024).toFixed(2)} MB`;
};

/**
 * Documents = array of { id, file, type } — `type` is one of DOCUMENT_TYPES keys.
 */
export default function DocumentsZone({ documents, onChange }) {
  const inputRef = useRef(null);
  const [drag,   setDrag]   = useState(false);
  const [defType, setDefType] = useState('cv');

  const accept = (files) => {
    const arr = Array.from(files || []);
    if (!arr.length) return;
    const max = 10 * 1024 * 1024; // 10 MB per file
    const next = [...documents];
    for (const f of arr) {
      if (f.size > max) { alert(`${f.name} is over 10 MB — skipped.`); continue; }
      next.push({ id: `d_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, file: f, type: defType });
    }
    onChange(next);
  };

  const onDragOver  = (e) => { e.preventDefault(); setDrag(true); };
  const onDragLeave = () => setDrag(false);
  const onDrop      = (e) => { e.preventDefault(); setDrag(false); accept(e.dataTransfer?.files); };

  const setDocType = (id, type) => onChange(documents.map(d => d.id === id ? { ...d, type } : d));
  const removeDoc  = (id)       => onChange(documents.filter(d => d.id !== id));

  return (
    <div className="tea-docs">
      <div className="tea-docs__head">
        <span>Default category for next upload</span>
        <select className="ska-input tea-docs__type-sel" value={defType} onChange={e => setDefType(e.target.value)}>
          {DOCUMENT_TYPES.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
      </div>

      <div
        className={`tea-docs__drop ${drag ? 'is-drag' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <input
          ref={inputRef} type="file" multiple
          accept=".pdf,.doc,.docx,image/*"
          style={{ display: 'none' }}
          onChange={e => accept(e.target.files)}
        />
        <Ic name="upload_file" />
        <strong>{drag ? 'Drop files here' : 'Drop documents or click to browse'}</strong>
        <small>PDF, Word, image · up to 10 MB each · multi-select supported</small>
      </div>

      {documents.length > 0 && (
        <div className="tea-docs__list">
          {documents.map(d => (
            <div key={d.id} className="tea-docs__row">
              <span className="tea-docs__icon"><Ic name={fileIcon(d.file)} /></span>
              <div className="tea-docs__info">
                <strong>{d.file.name}</strong>
                <span>{fmtSize(d.file.size)}</span>
              </div>
              <select className="ska-input tea-docs__type-sel" value={d.type} onChange={e => setDocType(d.id, e.target.value)}>
                {DOCUMENT_TYPES.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
              </select>
              <button type="button" className="tea-docs__remove" onClick={() => removeDoc(d.id)} aria-label="Remove">
                <Ic name="close" size="sm" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
