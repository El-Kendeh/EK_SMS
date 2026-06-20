import React, { useState, useEffect, useCallback, useRef } from 'react';
import './SABatchTransfer.css';

/* ------------------------------------------------------------------ */
/*  SABatchTransfer — bulk import tools (superadmin)                    */
/*    mode="students"  CSV → POST /api/students/ per row               */
/*    mode="grades"    CSV → one POST /api/school/grades/ bulk call    */
/*    mode="images"    image files matched by admission number →       */
/*                     PUT /api/students/:id/ (passport photo)         */
/* ------------------------------------------------------------------ */

const API = (process.env.REACT_APP_NODE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const token = () => { try { return localStorage.getItem('token') || ''; } catch { return ''; } };

async function req(method, path, body, isFile) {
  const headers = { Authorization: `Bearer ${token()}` };
  if (!isFile && body !== undefined) headers['Content-Type'] = 'application/json';
  const opts = { method, headers };
  if (body !== undefined) opts.body = isFile ? body : JSON.stringify(body);
  const r = await fetch(`${API}${path}`, opts);
  let data = null;
  try { data = await r.json(); } catch { /* non-json */ }
  if (!r.ok || data?.success === false) {
    throw new Error(data?.message || `HTTP ${r.status}`);
  }
  return data || {};
}

/* ── Tiny CSV parser (handles quoted fields) ── */
function parseCSV(text) {
  const rows = [];
  let cur = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { cur.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      cur.push(field); field = '';
      if (cur.some(v => v.trim() !== '')) rows.push(cur);
      cur = [];
    } else field += c;
  }
  cur.push(field);
  if (cur.some(v => v.trim() !== '')) rows.push(cur);
  return rows;
}

function downloadText(filename, text, type = 'text/csv') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const csvEsc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/* ── Icons ── */
const IcUpload  = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
const IcDown    = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IcCheck   = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcX       = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcWarn    = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcRestart = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>;

/* ── Mode metadata ── */
const MODES = {
  students: {
    title: 'Batch Transfer — Students',
    sub: 'Import many students at once from a CSV file. Each row creates a student account (and parent accounts when parent details are present).',
    accept: '.csv,text/csv',
    template: {
      name: 'students_template.csv',
      header: ['first_name', 'last_name', 'admission_number', 'gender', 'date_of_birth', 'email', 'username', 'password', 'phone_number', 'nationality', 'city', 'home_address', 'father_name', 'father_phone', 'mother_name', 'mother_phone'],
      sample: ['Aminata', 'Koroma', 'ADM/2026/001', 'Female', '2012-04-18', '', '', '', '', 'Sierra Leonean', 'Freetown', '12 Wilkinson Rd', 'Ibrahim Koroma', '+23276000000', 'Fatmata Koroma', ''],
    },
  },
  grades: {
    title: 'Batch Transfer — Grades',
    sub: 'Upload a CSV of scores for one subject and term. Students are matched by admission number and grades are saved in a single bulk operation.',
    accept: '.csv,text/csv',
    template: {
      name: 'grades_template.csv',
      header: ['admission_number', 'ca', 'midterm', 'final'],
      sample: ['ADM/2026/001', '18', '22', '48'],
    },
  },
  images: {
    title: 'Batch Transfer — Image Data',
    sub: 'Bulk-upload student passport photos. Name each image file with the student\'s admission number (e.g. ADM-2026-001.jpg — slashes may be written as dashes).',
    accept: 'image/*',
  },
};

const normAdm = (s) => String(s || '').trim().toLowerCase().replace(/[/\\_\s]+/g, '-');

export default function SABatchTransfer({ mode = 'students' }) {
  const meta = MODES[mode] || MODES.students;

  /* School context */
  const [schools, setSchools]   = useState([]);
  const [schoolId, setSchoolId] = useState('');

  /* Grades context */
  const [subjects, setSubjects]   = useState([]);
  const [terms, setTerms]         = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [termId, setTermId]       = useState('');

  /* Roster (grades + images matching) */
  const [students, setStudents] = useState([]);

  /* Parsed work items */
  const [rows, setRows]       = useState([]);   // { data, valid, problems[] } | image: { file, student, preview }
  const [fileName, setFileName] = useState('');

  /* Import run */
  const [running, setRunning]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults]   = useState(null); // [{label, ok, message, credentials?}]
  const [error, setError]       = useState('');

  const fileRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  /* ── Load schools ── */
  useEffect(() => {
    req('GET', '/api/schools/')
      .then(d => setSchools((d.schools || []).filter(s => s.is_approved)))
      .catch(e => setError(e.message));
  }, []);

  /* ── Load per-school context ── */
  useEffect(() => {
    setRows([]); setResults(null); setFileName('');
    setSubjects([]); setTerms([]); setSubjectId(''); setTermId(''); setStudents([]);
    if (!schoolId) return;
    if (mode === 'grades' || mode === 'images') {
      req('GET', `/api/students/?school_id=${schoolId}&limit=2000`)
        .then(d => setStudents(d.students || []))
        .catch(e => setError(e.message));
    }
    if (mode === 'grades') {
      req('GET', `/api/subjects/?school_id=${schoolId}&limit=500`)
        .then(d => setSubjects(d.subjects || []))
        .catch(() => {});
      req('GET', `/api/school/terms/?school_id=${schoolId}`)
        .then(d => setTerms(d.terms || []))
        .catch(() => {});
    }
  }, [schoolId, mode]);

  const studentByAdm = useCallback(() => {
    const map = {};
    students.forEach(s => { if (s.admission_number) map[normAdm(s.admission_number)] = s; });
    return map;
  }, [students]);

  /* ── Handle file selection ── */
  const handleFiles = useCallback((fileList) => {
    setError(''); setResults(null);
    const files = Array.from(fileList || []);
    if (!files.length) return;

    if (mode === 'images') {
      const map = studentByAdm();
      const items = files
        .filter(f => f.type.startsWith('image/'))
        .map(f => {
          const base = f.name.replace(/\.[^.]+$/, '');
          const student = map[normAdm(base)] || null;
          return {
            file: f,
            label: f.name,
            student,
            preview: URL.createObjectURL(f),
            valid: !!student,
            problems: student ? [] : ['No student with this admission number'],
          };
        });
      setRows(items);
      setFileName(`${items.length} image${items.length !== 1 ? 's' : ''}`);
      return;
    }

    const file = files[0];
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCSV(String(reader.result || ''));
        if (parsed.length < 2) { setError('The CSV has no data rows.'); setRows([]); return; }
        const header = parsed[0].map(h => h.trim().toLowerCase());
        const items = parsed.slice(1).map((cells, idx) => {
          const data = {};
          header.forEach((h, i) => { if (h) data[h] = (cells[i] ?? '').trim(); });
          const problems = [];
          if (mode === 'students') {
            if (!data.first_name) problems.push('first_name missing');
            if (!data.last_name) problems.push('last_name missing');
            if (data.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(data.date_of_birth)) problems.push('date_of_birth must be YYYY-MM-DD');
          } else if (mode === 'grades') {
            if (!data.admission_number) problems.push('admission_number missing');
            else if (!studentByAdm()[normAdm(data.admission_number)]) problems.push('no matching student');
            ['ca', 'midterm', 'final'].forEach(k => {
              if (data[k] !== '' && data[k] !== undefined && isNaN(Number(data[k]))) problems.push(`${k} is not a number`);
            });
          }
          return { data, label: data.admission_number || `${data.first_name || ''} ${data.last_name || ''}`.trim() || `Row ${idx + 2}`, valid: problems.length === 0, problems };
        });
        setRows(items);
      } catch (e) {
        setError(`Could not parse file: ${e.message}`);
        setRows([]);
      }
    };
    reader.readAsText(file);
  }, [mode, studentByAdm]);

  /* ── Run import ── */
  const runImport = async () => {
    const valid = rows.filter(r => r.valid);
    if (!valid.length || !schoolId) return;
    setRunning(true); setProgress(0); setError('');
    const out = [];

    try {
      if (mode === 'grades') {
        const map = studentByAdm();
        const grades = valid.map(r => ({
          student_id: map[normAdm(r.data.admission_number)].id,
          ca: r.data.ca !== '' ? Number(r.data.ca) : null,
          midterm: r.data.midterm !== '' ? Number(r.data.midterm) : null,
          final: r.data.final !== '' ? Number(r.data.final) : null,
        }));
        try {
          await req('POST', `/api/school/grades/?school_id=${schoolId}`, {
            subject_id: Number(subjectId), term_id: Number(termId), grades,
          });
          valid.forEach(r => out.push({ label: r.label, ok: true, message: 'Saved' }));
        } catch (e) {
          valid.forEach(r => out.push({ label: r.label, ok: false, message: e.message }));
        }
        setProgress(100);
      } else if (mode === 'students') {
        for (let i = 0; i < valid.length; i++) {
          const r = valid[i];
          try {
            const payload = { ...r.data, school_id: Number(schoolId) };
            const d = await req('POST', '/api/students/', payload);
            out.push({
              label: r.label, ok: true,
              message: 'Created',
              credentials: d.username ? `${d.username} / ${d.password || '(custom)'}` : '',
            });
          } catch (e) {
            out.push({ label: r.label, ok: false, message: e.message });
          }
          setProgress(Math.round(((i + 1) / valid.length) * 100));
        }
      } else if (mode === 'images') {
        for (let i = 0; i < valid.length; i++) {
          const r = valid[i];
          try {
            const fd = new FormData();
            fd.append('passport_photo', r.file);
            await req('PUT', `/api/students/${r.student.id}/`, fd, true);
            out.push({ label: `${r.label} → ${r.student.first_name} ${r.student.last_name}`, ok: true, message: 'Photo updated' });
          } catch (e) {
            out.push({ label: r.label, ok: false, message: e.message });
          }
          setProgress(Math.round(((i + 1) / valid.length) * 100));
        }
      }
    } finally {
      rows.filter(r => !r.valid).forEach(r => out.push({ label: r.label, ok: false, message: r.problems.join('; ') + ' (skipped)' }));
      setResults(out);
      setRunning(false);
    }
  };

  const exportResults = () => {
    if (!results) return;
    const lines = [['item', 'status', 'message', 'credentials'].join(',')];
    results.forEach(r => lines.push([csvEsc(r.label), r.ok ? 'success' : 'failed', csvEsc(r.message), csvEsc(r.credentials || '')].join(',')));
    downloadText(`batch_${mode}_results.csv`, lines.join('\n'));
  };

  const reset = () => {
    setRows([]); setResults(null); setFileName(''); setError(''); setProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  const validCount = rows.filter(r => r.valid).length;
  const invalidCount = rows.length - validCount;
  const gradesReady = mode !== 'grades' || (subjectId && termId);
  const okCount = results ? results.filter(r => r.ok).length : 0;

  return (
    <div className="sabt-wrap">
      <div className="sabt-head">
        <div>
          <h1 className="sabt-title">{meta.title}</h1>
          <p className="sabt-sub">{meta.sub}</p>
        </div>
        {meta.template && (
          <button
            className="sabt-btn sabt-btn--ghost"
            onClick={() => downloadText(meta.template.name, [meta.template.header.join(','), meta.template.sample.join(',')].join('\n'))}
          >
            <IcDown /> CSV Template
          </button>
        )}
      </div>

      {/* Step 1 — context */}
      <div className="sabt-card">
        <p className="sabt-step-label"><span className="sabt-step-num">1</span> Target</p>
        <div className="sabt-context">
          <div className="sabt-field">
            <label>School</label>
            <select value={schoolId} onChange={e => setSchoolId(e.target.value)}>
              <option value="">— select school —</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {mode === 'grades' && (
            <>
              <div className="sabt-field">
                <label>Subject</label>
                <select value={subjectId} onChange={e => setSubjectId(e.target.value)} disabled={!schoolId}>
                  <option value="">— select subject —</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>)}
                </select>
              </div>
              <div className="sabt-field">
                <label>Term</label>
                <select value={termId} onChange={e => setTermId(e.target.value)} disabled={!schoolId}>
                  <option value="">— select term —</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </>
          )}
          {(mode === 'grades' || mode === 'images') && schoolId && (
            <div className="sabt-roster-pill">{students.length} students on roster</div>
          )}
        </div>
      </div>

      {/* Step 2 — file */}
      <div className={`sabt-card${!schoolId || !gradesReady ? ' sabt-card--disabled' : ''}`}>
        <p className="sabt-step-label"><span className="sabt-step-num">2</span> {mode === 'images' ? 'Select images' : 'Upload CSV'}</p>
        <div
          className={`sabt-drop${dragOver ? ' sabt-drop--over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); if (schoolId && gradesReady) handleFiles(e.dataTransfer.files); }}
          onClick={() => schoolId && gradesReady && fileRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <IcUpload />
          <p className="sabt-drop-main">{fileName || (mode === 'images' ? 'Drop images here or tap to browse' : 'Drop a CSV here or tap to browse')}</p>
          <p className="sabt-drop-sub">
            {mode === 'images'
              ? 'JPEG / PNG, named by admission number'
              : 'UTF-8 CSV with a header row — download the template above'}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept={meta.accept}
            multiple={mode === 'images'}
            style={{ display: 'none' }}
            onChange={e => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {error && <div className="sabt-banner sabt-banner--err"><IcWarn /><span>{error}</span></div>}

      {/* Step 3 — review */}
      {rows.length > 0 && !results && (
        <div className="sabt-card">
          <p className="sabt-step-label"><span className="sabt-step-num">3</span> Review &amp; import</p>
          <div className="sabt-review-stats">
            <span className="sabt-chip sabt-chip--ok"><IcCheck /> {validCount} ready</span>
            {invalidCount > 0 && <span className="sabt-chip sabt-chip--bad"><IcWarn /> {invalidCount} with problems</span>}
          </div>

          {mode === 'images' ? (
            <div className="sabt-img-grid">
              {rows.map((r, i) => (
                <div key={i} className={`sabt-img-cell${r.valid ? '' : ' sabt-img-cell--bad'}`}>
                  <img src={r.preview} alt={r.label} />
                  <span className="sabt-img-name">{r.label}</span>
                  <span className={`sabt-img-match${r.valid ? '' : ' bad'}`}>
                    {r.valid ? `${r.student.first_name} ${r.student.last_name}` : 'No match'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="sabt-rows">
              {rows.slice(0, 200).map((r, i) => (
                <div key={i} className={`sabt-row${r.valid ? '' : ' sabt-row--bad'}`}>
                  <span className={`sabt-row-dot${r.valid ? ' ok' : ''}`} />
                  <span className="sabt-row-label">{r.label}</span>
                  <span className="sabt-row-note">{r.valid ? 'Ready' : r.problems.join(' · ')}</span>
                </div>
              ))}
              {rows.length > 200 && <p className="sabt-more">…and {rows.length - 200} more rows</p>}
            </div>
          )}

          {running && (
            <div className="sabt-progress">
              <div className="sabt-progress-fill" style={{ width: `${progress}%` }} />
              <span className="sabt-progress-label">{progress}%</span>
            </div>
          )}

          <div className="sabt-actions">
            <button className="sabt-btn sabt-btn--ghost" onClick={reset} disabled={running}><IcX /> Clear</button>
            <button className="sabt-btn sabt-btn--primary" onClick={runImport} disabled={running || validCount === 0 || !gradesReady}>
              {running ? 'Importing…' : `Import ${validCount} ${mode === 'images' ? 'photo' : mode === 'grades' ? 'grade row' : 'student'}${validCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4 — results */}
      {results && (
        <div className="sabt-card">
          <p className="sabt-step-label"><span className="sabt-step-num">4</span> Results</p>
          <div className="sabt-review-stats">
            <span className="sabt-chip sabt-chip--ok"><IcCheck /> {okCount} succeeded</span>
            {results.length - okCount > 0 && <span className="sabt-chip sabt-chip--bad"><IcWarn /> {results.length - okCount} failed / skipped</span>}
          </div>
          <div className="sabt-rows">
            {results.map((r, i) => (
              <div key={i} className={`sabt-row${r.ok ? '' : ' sabt-row--bad'}`}>
                <span className={`sabt-row-dot${r.ok ? ' ok' : ''}`} />
                <span className="sabt-row-label">{r.label}</span>
                <span className="sabt-row-note">
                  {r.message}{r.credentials ? ` — ${r.credentials}` : ''}
                </span>
              </div>
            ))}
          </div>
          <div className="sabt-actions">
            <button className="sabt-btn sabt-btn--ghost" onClick={exportResults}><IcDown /> Export results CSV</button>
            <button className="sabt-btn sabt-btn--primary" onClick={reset}><IcRestart /> New import</button>
          </div>
          {mode === 'students' && okCount > 0 && (
            <p className="sabt-cred-note">
              <IcWarn /> Generated login credentials are included in the results export — share them securely and ask users to change passwords on first login.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
