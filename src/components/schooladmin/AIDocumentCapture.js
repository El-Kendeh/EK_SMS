import { useEffect, useRef, useState } from 'react';
import { adminApi } from '../../api/adminApi';

const DOC_TYPES = [
  { key: 'student_roster',   label: 'Student Roster' },
  { key: 'teacher_roster',   label: 'Teacher Roster' },
  { key: 'grade_sheet',      label: 'Grade Sheet' },
  { key: 'attendance_sheet', label: 'Attendance Sheet' },
  { key: 'other',            label: 'Other Document' },
];

const ACCEPT = '.pdf,.docx,.txt,.csv,.png,.jpg,.jpeg,.webp';

export default function AIDocumentCapture() {
  const fileRef = useRef(null);
  const [docType, setDocType] = useState('student_roster');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);   // { capture_id, structured }
  const [err, setErr] = useState(null);
  const [history, setHistory] = useState([]);

  const loadHistory = () =>
    adminApi.aiCaptureList()
      .then((d) => { if (d.success) setHistory(d.captures || []); })
      .catch(() => {});

  useEffect(() => { loadHistory(); }, []);

  const onPick = (e) => {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResult(null); setErr(null); }
  };

  const upload = async () => {
    if (!file) return;
    setBusy(true); setErr(null); setResult(null);
    try {
      const r = await adminApi.aiCaptureUpload({ file, documentType: docType });
      if (r.success) {
        setResult(r);
        loadHistory();
      } else {
        setErr(r.message || 'AI extraction failed.');
      }
    } catch (e) {
      setErr(e.message || 'Network error.');
    }
    setBusy(false);
  };

  const reset = () => {
    setFile(null); setResult(null); setErr(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const rows = result?.structured?.rows || [];
  const cols = result?.structured?.columns
              || (rows[0] ? Object.keys(rows[0]) : []);

  return (
    <div className="aidc">
      <header style={{ marginBottom: 20 }}>
        <h1 className="ska-page-title">AI Document Capture</h1>
        <p className="ska-page-sub">
          Upload a roster, grade sheet, or attendance sheet — Gemini extracts structured rows
          you can review and import.
        </p>
      </header>

      {/* Uploader */}
      <div className="ska-card" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <label style={{ flex: '1 1 220px', minWidth: 180 }}>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700,
                           color: 'var(--ska-text-2)', textTransform: 'uppercase',
                           letterSpacing: '0.06em', marginBottom: 4 }}>
              Document type
            </span>
            <select className="ska-input" value={docType}
                    onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((d) => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
          </label>

          <label style={{ flex: '2 1 280px', minWidth: 220 }}>
            <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700,
                           color: 'var(--ska-text-2)', textTransform: 'uppercase',
                           letterSpacing: '0.06em', marginBottom: 4 }}>
              File (PDF, DOCX, TXT, CSV, image)
            </span>
            <input ref={fileRef} type="file" accept={ACCEPT}
                   onChange={onPick} className="ska-input" />
          </label>

          <button className="ska-btn ska-btn--primary"
                  disabled={!file || busy} onClick={upload}>
            {busy ? 'Extracting…' : 'Extract'}
          </button>
          {(file || result) && (
            <button className="ska-btn ska-btn--ghost" onClick={reset}>Reset</button>
          )}
        </div>

        {err && (
          <p style={{ marginTop: 12, color: '#dc2626', fontSize: '0.85rem' }}>
            <strong>Error:</strong> {err}
          </p>
        )}
        {file && !result && !err && !busy && (
          <p style={{ marginTop: 12, color: 'var(--ska-text-3)', fontSize: '0.85rem' }}>
            {file.name} ({Math.round(file.size / 1024)} KB) — click Extract.
          </p>
        )}
      </div>

      {/* Result preview */}
      {result && (
        <div className="ska-card" style={{ padding: 20, marginBottom: 20 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 800 }}>
            Extracted: {rows.length} row{rows.length === 1 ? '' : 's'}
          </h2>
          <p style={{ marginTop: 0, color: 'var(--ska-text-3)', fontSize: '0.8rem' }}>
            Capture #{result.capture_id} · review the rows below before importing.
            Use the Students or Teachers Bulk Import to actually create accounts.
          </p>
          <div style={{ overflowX: 'auto', maxHeight: 480, marginTop: 12,
                        border: '1px solid var(--ska-border)', borderRadius: 8 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c} style={{ padding: '8px 10px', textAlign: 'left',
                                         background: 'var(--ska-surface-high)',
                                         borderBottom: '1px solid var(--ska-border)',
                                         fontWeight: 700,
                                         position: 'sticky', top: 0 }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    {cols.map((c) => (
                      <td key={c} style={{ padding: '6px 10px',
                                           borderBottom: '1px solid var(--ska-border)' }}>
                        {r[c] == null ? <span style={{ color: 'var(--ska-text-3)' }}>—</span>
                                       : String(r[c])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>
            Tip: copy these rows into the Students / Teachers <strong>Bulk Import</strong>
            wizards (CSV) for direct ingestion.
          </p>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="ska-card" style={{ padding: 20 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 800 }}>
            Recent captures
          </h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>When</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Type</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Rows</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left' }}>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <td style={{ padding: '6px 10px' }}>{new Date(h.created_at).toLocaleString()}</td>
                    <td style={{ padding: '6px 10px' }}>{h.document_type}</td>
                    <td style={{ padding: '6px 10px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
                        background: h.status === 'done' ? 'rgba(5,150,105,0.1)'
                                  : h.status === 'failed' ? 'rgba(220,38,38,0.1)'
                                  : 'rgba(217,119,6,0.1)',
                        color:      h.status === 'done' ? '#059669'
                                  : h.status === 'failed' ? '#dc2626'
                                  : '#d97706',
                      }}>{h.status}</span>
                    </td>
                    <td style={{ padding: '6px 10px' }}>{h.rows ?? 0}</td>
                    <td style={{ padding: '6px 10px', color: 'var(--ska-text-3)' }}>{h.error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
