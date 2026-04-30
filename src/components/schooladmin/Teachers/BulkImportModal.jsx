import React, { useEffect, useRef, useState } from 'react';
import ApiClient from '../../../api/client';
import { CSV_COLUMNS } from './teachers.constants';
import { parseCsv, csvTemplate, validateCsvRow, generatePassword } from './teachers.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * BulkImportModal — upload CSV → preview rows → submit one POST per row.
 * Falls back gracefully if a row fails (other rows continue).
 */
export default function BulkImportModal({ existingEmails, existingTeachers, onClose, onImported }) {
  const inputRef = useRef(null);
  const [file,    setFile]    = useState(null);
  const [rows,    setRows]    = useState([]);
  const [stats,   setStats]   = useState({ ok: 0, fail: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress]     = useState(0);
  const [results,  setResults]      = useState([]); // [{rowIdx, ok, message}]
  const [doneCount, setDoneCount]   = useState(0);

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate()], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'teachers_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw  = parseCsv(e.target.result);
      if (raw.length === 0) { setRows([]); return; }
      const head = raw[0].map(h => h.trim());
      const data = raw.slice(1).map(r => {
        const obj = {};
        head.forEach((h, i) => {
          const col = CSV_COLUMNS.find(c => c.label.toLowerCase() === h.toLowerCase() || c.key === h);
          if (col) obj[col.key] = (r[i] || '').trim();
        });
        return obj;
      });
      setRows(data);
      setResults([]);
      setDoneCount(0);
    };
    reader.readAsText(f);
  };

  /* Recompute valid/invalid count when rows change */
  useEffect(() => {
    let ok = 0, fail = 0;
    rows.forEach(r => {
      const errs = validateCsvRow(r);
      if (errs.length || existingEmails.includes((r.email || '').trim().toLowerCase())) fail++;
      else ok++;
    });
    setStats({ ok, fail });
  }, [rows, existingEmails]);

  const submit = async () => {
    if (rows.length === 0) return;
    setSubmitting(true);
    setResults([]);
    setDoneCount(0);
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const r    = rows[i];
      const errs = validateCsvRow(r);
      if (errs.length) {
        out.push({ rowIdx: i, ok: false, message: errs.join(', ') });
        setDoneCount(i + 1);
        setProgress(Math.round(((i + 1) / rows.length) * 100));
        continue;
      }
      if (existingEmails.includes((r.email || '').trim().toLowerCase())) {
        out.push({ rowIdx: i, ok: false, message: 'Email already in use' });
        setDoneCount(i + 1);
        setProgress(Math.round(((i + 1) / rows.length) * 100));
        continue;
      }
      try {
        const fd = new FormData();
        Object.entries(r).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
        if (!r.password) fd.append('password', generatePassword(12));
        await ApiClient.post('/api/school/teachers/', fd);
        out.push({ rowIdx: i, ok: true, message: 'Created' });
      } catch (e) {
        out.push({ rowIdx: i, ok: false, message: (e?.message) || 'Server error' });
      }
      setResults([...out]);
      setDoneCount(i + 1);
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }
    setSubmitting(false);
  };

  const reset = () => {
    setFile(null); setRows([]); setResults([]); setDoneCount(0); setProgress(0);
    if (inputRef.current) inputRef.current.value = '';
  };

  const finished = !submitting && results.length > 0 && results.length === rows.length;

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal tea-bulk" onClick={e => e.stopPropagation()}>
        <div className="ska-modal-head">
          <div>
            <h3 className="ska-modal-title"><Ic name="upload_file" size="sm" /> Bulk import teachers</h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
              Upload a CSV with one teacher per row. Existing teachers ({existingTeachers.length}) will be detected as duplicates.
            </p>
          </div>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>

        <div className="ska-modal-body tea-bulk__body">
          {!file && (
            <div className="tea-bulk__intro">
              <button className="ska-btn ska-btn--ghost" onClick={downloadTemplate}>
                <Ic name="download" size="sm" /> Download CSV template
              </button>
              <input ref={inputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files?.[0])} />
              <button className="ska-btn ska-btn--primary" onClick={() => inputRef.current?.click()}>
                <Ic name="upload" size="sm" /> Choose CSV file
              </button>
              <div className="tea-bulk__cols">
                <strong>Expected columns:</strong>
                <div>
                  {CSV_COLUMNS.map(c => (
                    <span key={c.key} className={`tea-chip ${c.required ? 'is-active' : ''}`}>
                      {c.label}{c.required && '*'}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {file && rows.length === 0 && (
            <div className="tea-bulk__empty">
              <Ic name="error" /> Could not parse rows from {file.name}.
              <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={reset}>Try again</button>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="tea-bulk__summary">
                <div><strong>{rows.length}</strong> rows in {file.name}</div>
                <div className="tea-bulk__stats">
                  <span className="tea-pill tea-pill--ok">{stats.ok} valid</span>
                  {stats.fail > 0 && <span className="tea-pill tea-pill--err">{stats.fail} invalid</span>}
                </div>
                <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={reset} disabled={submitting}>
                  <Ic name="autorenew" size="sm" /> Replace file
                </button>
              </div>

              {submitting && (
                <div className="tea-bulk__progress">
                  <div className="tea-bulk__progress-bar" style={{ width: `${progress}%` }} />
                  <span>{doneCount} of {rows.length} processed</span>
                </div>
              )}

              <div className="tea-bulk__table-wrap">
                <table className="tea-bulk__table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {CSV_COLUMNS.slice(0, 7).map(c => <th key={c.key}>{c.label}</th>)}
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const errs = validateCsvRow(r);
                      const dup  = existingEmails.includes((r.email || '').trim().toLowerCase());
                      const res  = results.find(x => x.rowIdx === i);
                      const status = res ? (res.ok ? 'ok' : 'err') : (errs.length || dup ? 'warn' : 'pending');
                      const msg = res ? res.message : (errs.length ? errs.join('; ') : dup ? 'Email already in use' : 'Ready');
                      return (
                        <tr key={i} className={`is-${status}`}>
                          <td>{i + 1}</td>
                          {CSV_COLUMNS.slice(0, 7).map(c => <td key={c.key}>{r[c.key] || '—'}</td>)}
                          <td>
                            <span className={`tea-bulk__status tea-bulk__status--${status}`}>
                              <Ic name={status === 'ok' ? 'check_circle' : status === 'err' ? 'error' : status === 'warn' ? 'warning' : 'pending'} size="sm" />
                              {msg}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {finished && (
                <div className="tea-bulk__done">
                  <Ic name="check_circle" /> Imported {results.filter(r => r.ok).length} of {rows.length} teachers.
                  {results.some(r => !r.ok) && ' Failed rows are highlighted above.'}
                </div>
              )}
            </>
          )}
        </div>

        <div className="ska-modal-actions">
          <button className="ska-btn ska-btn--ghost" onClick={onClose} disabled={submitting}>
            {finished ? 'Done' : 'Cancel'}
          </button>
          {rows.length > 0 && !finished && (
            <button className="ska-btn ska-btn--primary" onClick={submit} disabled={submitting || stats.ok === 0}>
              <Ic name="cloud_upload" size="sm" />
              {submitting ? `Importing… ${progress}%` : `Import ${stats.ok} teacher${stats.ok === 1 ? '' : 's'}`}
            </button>
          )}
          {finished && (
            <button className="ska-btn ska-btn--primary" onClick={() => { onImported && onImported(); onClose(); }}>
              <Ic name="check" size="sm" /> Refresh teacher list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
