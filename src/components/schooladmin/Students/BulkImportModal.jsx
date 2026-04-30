import React, { useEffect, useRef, useState } from 'react';
import ApiClient from '../../../api/client';
import { CSV_COLUMNS } from './students.constants';
import { parseCsv, csvTemplate, validateCsvRow, generatePassword } from './students.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

export default function BulkImportModal({ existingStudents = [], classes = [], onClose, onImported }) {
  const inputRef  = useRef(null);
  const [file,    setFile]    = useState(null);
  const [rows,    setRows]    = useState([]);
  const [stats,   setStats]   = useState({ ok: 0, fail: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [progress,   setProgress]   = useState(0);
  const [results,    setResults]    = useState([]);
  const [doneCount,  setDoneCount]  = useState(0);

  const existingAdmNos = existingStudents.map(s => (s.admission_number || '').toLowerCase());

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate()], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'students_template.csv'; a.click();
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
          const col = CSV_COLUMNS.find(c =>
            c.label.toLowerCase() === h.toLowerCase() || c.key === h
          );
          if (col) obj[col.key] = (r[i] || '').trim();
        });
        return obj;
      });
      setRows(data);
      setResults([]); setDoneCount(0);
    };
    reader.readAsText(f);
  };

  useEffect(() => {
    let ok = 0, fail = 0;
    rows.forEach(r => {
      const errs = validateCsvRow(r);
      const dup  = r.admission_number && existingAdmNos.includes((r.admission_number || '').toLowerCase());
      if (errs.length || dup) fail++; else ok++;
    });
    setStats({ ok, fail });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const submit = async () => {
    if (!rows.length) return;
    setSubmitting(true); setResults([]); setDoneCount(0);
    const out = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const errs = validateCsvRow(r);
      const dup  = r.admission_number && existingAdmNos.includes((r.admission_number || '').toLowerCase());
      if (errs.length) {
        out.push({ rowIdx: i, ok: false, message: errs.join(', ') });
      } else if (dup) {
        out.push({ rowIdx: i, ok: false, message: 'Admission number already in use' });
      } else {
        try {
          const fd = new FormData();
          Object.entries(r).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
          if (!r.student_password) fd.append('student_password', generatePassword());
          if (!r.enrollment_date) fd.append('enrollment_date', new Date().toISOString().slice(0, 10));
          await ApiClient.post('/api/school/students/', fd);
          out.push({ rowIdx: i, ok: true, message: 'Created' });
        } catch (e) {
          out.push({ rowIdx: i, ok: false, message: e?.message || 'Server error' });
        }
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
      <div className="ska-modal stu-bulk" onClick={e => e.stopPropagation()}>
        <div className="ska-modal-head">
          <div>
            <h3 className="ska-modal-title"><Ic name="upload_file" size="sm" /> Bulk import students</h3>
            <p className="stu-bulk__sub">
              Upload a CSV with one student per row. Existing students ({existingStudents.length}) are checked for duplicate admission numbers.
            </p>
          </div>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>

        <div className="ska-modal-body stu-bulk__body">
          {!file && (
            <div className="stu-bulk__intro">
              <button className="ska-btn ska-btn--ghost" onClick={downloadTemplate}>
                <Ic name="download" size="sm" /> Download CSV template
              </button>
              <input ref={inputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files?.[0])} />
              <button className="ska-btn ska-btn--primary" onClick={() => inputRef.current?.click()}>
                <Ic name="upload" size="sm" /> Choose CSV file
              </button>
              <div className="stu-bulk__cols">
                <strong>Expected columns:</strong>
                <div>
                  {CSV_COLUMNS.map(c => (
                    <span key={c.key} className={`stu-chip ${c.required ? 'is-active' : ''}`}>
                      {c.label}{c.required && '*'}
                    </span>
                  ))}
                </div>
              </div>
              {classes.length > 0 && (
                <details className="stu-bulk__classes">
                  <summary>Available classroom IDs</summary>
                  <div>
                    {classes.map(c => (
                      <span key={c.id} className="stu-chip">
                        {c.id} = {c.name}
                      </span>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {file && rows.length === 0 && (
            <div className="stu-bulk__empty">
              <Ic name="error" /> Could not parse rows from {file.name}.
              <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={reset}>Try again</button>
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="stu-bulk__summary">
                <div><strong>{rows.length}</strong> rows in {file.name}</div>
                <div className="stu-bulk__stats">
                  <span className="stu-chip stu-chip--ok">{stats.ok} valid</span>
                  {stats.fail > 0 && <span className="stu-chip stu-chip--err">{stats.fail} invalid</span>}
                </div>
                <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={reset} disabled={submitting}>
                  <Ic name="autorenew" size="sm" /> Replace
                </button>
              </div>

              {submitting && (
                <div className="stu-bulk__prog-wrap">
                  <div className="stu-bulk__prog-bar" style={{ width: `${progress}%` }} />
                  <span className="stu-bulk__prog-text">{doneCount} of {rows.length} processed</span>
                </div>
              )}

              <div className="stu-bulk__table-wrap">
                <table className="stu-bulk__table">
                  <thead>
                    <tr>
                      <th>#</th>
                      {CSV_COLUMNS.slice(0, 6).map(c => <th key={c.key}>{c.label}</th>)}
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const errs = validateCsvRow(r);
                      const dup  = r.admission_number && existingAdmNos.includes((r.admission_number || '').toLowerCase());
                      const res  = results.find(x => x.rowIdx === i);
                      const status = res ? (res.ok ? 'ok' : 'err') : (errs.length || dup ? 'warn' : 'pending');
                      const msg    = res ? res.message
                        : (errs.length ? errs.join('; ') : dup ? 'Duplicate admission no.' : 'Ready');
                      return (
                        <tr key={i} className={`is-${status}`}>
                          <td>{i + 1}</td>
                          {CSV_COLUMNS.slice(0, 6).map(c => <td key={c.key}>{r[c.key] || '—'}</td>)}
                          <td>
                            <span className={`stu-bulk__status stu-bulk__status--${status}`}>
                              <Ic name={
                                status === 'ok'   ? 'check_circle' :
                                status === 'err'  ? 'error' :
                                status === 'warn' ? 'warning' : 'pending'
                              } size="sm" />
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
                <div className="stu-bulk__done">
                  <Ic name="check_circle" /> Imported {results.filter(r => r.ok).length} of {rows.length} students.
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
            <button className="ska-btn ska-btn--primary" onClick={submit}
              disabled={submitting || stats.ok === 0}>
              <Ic name="cloud_upload" size="sm" />
              {submitting ? `Importing… ${progress}%` : `Import ${stats.ok} student${stats.ok === 1 ? '' : 's'}`}
            </button>
          )}
          {finished && (
            <button className="ska-btn ska-btn--primary"
              onClick={() => { onImported && onImported(); onClose(); }}>
              <Ic name="check" size="sm" /> Refresh student list
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
