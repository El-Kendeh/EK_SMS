/**
 * EK-SMS School Admin — Extra Pages
 * Grades · Attendance · Finance · Reports · Messages · Security · Settings
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ApiClient from '../../api/client';
import { BrandColorPicker, LogoUpload } from '../BrandingComponents';

/* ── Shared icon helper ───────────────────────────────────── */
const Ic = ({ name, size, className = '', style }) => (
  <span
    className={`ska-icon${size ? ` ska-icon--${size}` : ''} ${className}`}
    aria-hidden="true"
    style={style}
  >
    {name}
  </span>
);

/* ── Shared stat card ─────────────────────────────────────── */
function StatCard({ icon, iconBg, iconColor, label, value, trend, trendDir, sub }) {
  return (
    <div className="ska-card ska-card-pad" style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Ic name={icon} style={{ color: iconColor, fontSize: 22 }} />
        </div>
        {trend && (
          <span style={{
            fontSize: '0.75rem', fontWeight: 700,
            color: trendDir === 'up' ? 'var(--ska-green)' : 'var(--ska-error)',
            background: trendDir === 'up' ? 'var(--ska-green-dim)' : 'var(--ska-error-dim)',
            padding: '2px 8px', borderRadius: 20,
          }}>
            {trendDir === 'up' ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--ska-text)', fontFamily: 'var(--ska-font-headline)', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ska-text)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

/* ── Shared inline feedback banner ───────────────────────── */
function Banner({ msg }) {
  if (!msg?.text) return null;
  const ok = msg.type === 'ok';
  return (
    <div style={{
      marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: '0.8125rem',
      background: ok ? 'var(--ska-green-dim)' : 'var(--ska-error-dim)',
      color: ok ? 'var(--ska-green)' : 'var(--ska-error)',
      border: `1px solid ${ok ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}`,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <Ic name={ok ? 'check_circle' : 'error'} size="sm" />
      {msg.text}
    </div>
  );
}

/* ── Pill tab bar ─────────────────────────────────────────── */
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex', gap: 4, marginBottom: 20,
      background: 'var(--ska-surface-low)', borderRadius: 10, padding: 4, width: 'fit-content',
    }}>
      {tabs.map(([key, icon, label]) => (
        <button key={key}
          onClick={() => onChange(key)}
          style={{
            padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
            background: active === key ? 'var(--ska-surface-high)' : 'transparent',
            color: active === key ? 'var(--ska-text)' : 'var(--ska-text-3)',
            fontWeight: 600, fontSize: '0.8125rem',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
          <Ic name={icon} size="sm" /> {label}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   GRADES PAGE  — with student grade entry table
   ============================================================ */
export function GradesPage({ school }) {
  const [classes,         setClasses]         = useState([]);
  const [subjects,        setSubjects]        = useState([]);
  const [terms,           setTerms]           = useState([]);
  const [selClass,        setSelClass]        = useState('');
  const [selSubj,         setSelSubj]         = useState('');
  const [selTerm,         setSelTerm]         = useState('');
  const [students,        setStudents]        = useState([]);
  const [grades,          setGrades]          = useState({});
  const [loading,         setLoading]         = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [banner,          setBanner]          = useState(null);

  useEffect(() => {
    Promise.all([
      ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes   || [])).catch(() => {}),
      ApiClient.get('/api/school/subjects/').then(d => setSubjects(d.subjects || [])).catch(() => {}),
      ApiClient.get('/api/school/terms/').then(d => setTerms(d.terms         || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selClass) { setStudents([]); setGrades({}); return; }
    setLoadingStudents(true);
    setSaved(false);
    ApiClient.get('/api/school/students/')
      .then(d => {
        const all = d.students || [];
        setStudents(all.filter(s => String(s.classroom_id) === String(selClass)));
        setGrades({});
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [selClass]);

  // Load existing saved grades when class+subject+term are all set
  useEffect(() => {
    if (!selClass || !selSubj || !selTerm) return;
    ApiClient.get(`/api/school/grades/?class_id=${selClass}&subject_id=${selSubj}&term_id=${selTerm}`)
      .then(d => {
        const map = {};
        (d.grades || []).forEach(g => {
          map[g.student_id] = { ca: g.ca, midterm: g.midterm, final: g.final };
        });
        setGrades(map);
      })
      .catch(() => {});
  }, [selClass, selSubj, selTerm]);

  const setGrade = (sid, field, val) => {
    setSaved(false);
    setGrades(g => ({ ...g, [sid]: { ...(g[sid] || {}), [field]: val } }));
  };

  const calcTotal   = g => (parseFloat(g?.ca) || 0) + (parseFloat(g?.midterm) || 0) + (parseFloat(g?.final) || 0);
  const letterFor   = total => total >= 80 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : total >= 40 ? 'D' : 'F';
  const letterColor = l => ({ A: 'var(--ska-green)', B: 'var(--ska-secondary)', C: 'var(--ska-primary)', D: 'var(--ska-tertiary)', F: 'var(--ska-error)' })[l];

  const handleSave = async () => {
    if (!selSubj || !selTerm) {
      setBanner({ type: 'err', text: 'Select a subject and term before saving.' });
      return;
    }
    setSaving(true);
    setBanner(null);
    const entries = students.map(s => {
      const g = grades[s.id] || {};
      return { student_id: s.id, ca: parseFloat(g.ca) || 0, midterm: parseFloat(g.midterm) || 0, final: parseFloat(g.final) || 0 };
    });
    try {
      const res = await ApiClient.post('/api/school/grades/', { subject_id: selSubj, term_id: selTerm, grades: entries });
      setSaved(true);
      setBanner({ type: 'ok', text: res.message || 'Grades saved.' });
    } catch (e) {
      setBanner({ type: 'err', text: e?.message || 'Failed to save grades.' });
    }
    setSaving(false);
  };

  const ready        = selClass && selSubj && selTerm;
  const entered      = Object.values(grades).filter(g => g.ca || g.midterm || g.final);
  const passCount    = entered.filter(g => calcTotal(g) >= 50).length;
  const passRate     = entered.length ? Math.round(passCount / entered.length * 100) : null;

  const GRADE_SCALE = [
    { grade: 'A  (80–100)', pct: 32, color: 'var(--ska-green)' },
    { grade: 'B  (65–79)',  pct: 28, color: 'var(--ska-secondary)' },
    { grade: 'C  (50–64)',  pct: 22, color: 'var(--ska-primary)' },
    { grade: 'D  (40–49)',  pct: 12, color: 'var(--ska-tertiary)' },
    { grade: 'F  (<40)',    pct:  6, color: 'var(--ska-error)' },
  ];

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Grade Management</h1>
          <p className="ska-page-sub">{school?.name} — Academic term results</p>
        </div>
        {ready && students.length > 0 && (
          <button className="ska-btn ska-btn--primary" onClick={handleSave} disabled={saving}>
            <Ic name={saved ? 'check' : 'save'} size="sm" />
            {saving ? 'Saving…' : saved ? 'Saved' : 'Save Grades'}
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="ska-stat-grid-4">
        <StatCard icon="grade"       iconBg="var(--ska-primary-dim)"   iconColor="var(--ska-primary)"   label="Grades Entered" value={entered.length}                          sub="This session" />
        <StatCard icon="group"       iconBg="var(--ska-secondary-dim)" iconColor="var(--ska-secondary)" label="Students"       value={students.length}                         sub={selClass ? 'In selected class' : 'Select a class'} />
        <StatCard icon="lock"        iconBg="var(--ska-tertiary-dim)"  iconColor="var(--ska-tertiary)"  label="Locked Grades"  value="0"                                       sub="Finalised" />
        <StatCard icon="trending_up" iconBg="var(--ska-green-dim)"     iconColor="var(--ska-green)"     label="Pass Rate"      value={passRate !== null ? `${passRate}%` : '—'} sub="≥ 50 points" />
      </div>

      <Banner msg={banner} />

      {/* Selectors */}
      <div className="ska-card ska-card-pad" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="ska-form-group" style={{ flex: 1, minWidth: 140, margin: 0 }}>
            <span>Class</span>
            <select className="ska-input" value={selClass} onChange={e => setSelClass(e.target.value)}>
              <option value="">— Select Class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="ska-form-group" style={{ flex: 1, minWidth: 140, margin: 0 }}>
            <span>Subject</span>
            <select className="ska-input" value={selSubj} onChange={e => setSelSubj(e.target.value)}>
              <option value="">— Select Subject —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="ska-form-group" style={{ flex: 1, minWidth: 140, margin: 0 }}>
            <span>Term</span>
            <select className="ska-input" value={selTerm} onChange={e => setSelTerm(e.target.value)}>
              <option value="">— Select Term —</option>
              {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <p style={{ margin: '0 0 2px', fontSize: '0.75rem', color: 'var(--ska-text-3)', whiteSpace: 'nowrap', paddingBottom: 6 }}>
            CA /20 · Mid-Term /30 · Final /50
          </p>
        </div>
      </div>

      {/* Grade table */}
      <div className="ska-grade-main-grid">
        <div className="ska-card" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
          ) : !ready ? (
            <div className="ska-empty" style={{ padding: '48px 24px' }}>
              <Ic name="grade" size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
              <p className="ska-empty-title">Select class, subject and term</p>
              <p className="ska-empty-desc">Choose all three above to begin entering grades.</p>
            </div>
          ) : loadingStudents ? (
            <div className="ska-empty"><p className="ska-empty-desc">Loading students…</p></div>
          ) : students.length === 0 ? (
            <div className="ska-empty" style={{ padding: '48px 24px' }}>
              <Ic name="group" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
              <p className="ska-empty-title">No students in this class</p>
              <p className="ska-empty-desc">Add students to this class from the Students page.</p>
            </div>
          ) : (
            <table className="ska-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>#</th>
                  <th>Student</th>
                  <th style={{ textAlign: 'center' }}>CA <span style={{ fontWeight: 400, opacity: 0.6 }}>/20</span></th>
                  <th style={{ textAlign: 'center' }}>Mid-Term <span style={{ fontWeight: 400, opacity: 0.6 }}>/30</span></th>
                  <th style={{ textAlign: 'center' }}>Final <span style={{ fontWeight: 400, opacity: 0.6 }}>/50</span></th>
                  <th style={{ textAlign: 'center' }}>Total</th>
                  <th style={{ textAlign: 'center' }}>Grade</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const g      = grades[s.id] || {};
                  const total  = calcTotal(g);
                  const hasAny = g.ca || g.midterm || g.final;
                  const letter = hasAny ? letterFor(total) : null;
                  return (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{i + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                            background: 'var(--ska-primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '0.8125rem', color: 'var(--ska-primary)',
                          }}>{s.first_name?.[0]?.toUpperCase() || '?'}</div>
                          <div>
                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem' }}>{s.first_name} {s.last_name}</p>
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{s.admission_number}</p>
                          </div>
                        </div>
                      </td>
                      {[['ca', 20], ['midterm', 30], ['final', 50]].map(([field, max]) => (
                        <td key={field} style={{ textAlign: 'center' }}>
                          <input
                            type="number" min="0" max={max} step="0.5"
                            value={g[field] ?? ''}
                            onChange={e => setGrade(s.id, field, e.target.value)}
                            style={{
                              width: 60, textAlign: 'center', padding: '4px 6px',
                              background: 'var(--ska-surface-low)', border: '1px solid var(--ska-border)',
                              borderRadius: 6, color: 'var(--ska-text)', fontSize: '0.875rem', outline: 'none',
                            }}
                            onFocus={e => (e.target.style.borderColor = 'var(--ska-primary)')}
                            onBlur={e  => (e.target.style.borderColor = 'var(--ska-border)')}
                          />
                        </td>
                      ))}
                      <td style={{ textAlign: 'center', fontWeight: 700, fontSize: '1rem', color: hasAny ? 'var(--ska-text)' : 'var(--ska-text-3)' }}>
                        {hasAny ? total.toFixed(1) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {letter ? (
                          <span style={{
                            display: 'inline-block', padding: '2px 12px', borderRadius: 20,
                            fontWeight: 800, fontSize: '0.875rem',
                            background: `${letterColor(letter)}22`, color: letterColor(letter),
                          }}>{letter}</span>
                        ) : <span style={{ color: 'var(--ska-text-3)' }}>—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="ska-card ska-card-pad">
            <h2 className="ska-card-title" style={{ marginBottom: 16 }}>Grade Scale</h2>
            {GRADE_SCALE.map(g => (
              <div key={g.grade} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--ska-text)' }}>{g.grade}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{g.pct}%</span>
                </div>
                <div className="ska-progress-track">
                  <div className="ska-progress-fill" style={{ width: `${g.pct}%`, background: g.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="ska-card ska-card-pad">
            <h2 className="ska-card-title" style={{ marginBottom: 12 }}>Score Breakdown</h2>
            {[
              { label: 'CA',       desc: 'Continuous Assessment', max: 20, color: 'var(--ska-primary)' },
              { label: 'Mid-Term', desc: 'Mid-term examination',   max: 30, color: 'var(--ska-secondary)' },
              { label: 'Final',    desc: 'Final examination',      max: 50, color: 'var(--ska-green)' },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--ska-border)' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: r.color }}>{r.label}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{r.desc}</p>
                </div>
                <span style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--ska-text)', alignSelf: 'center' }}>/{r.max}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ATTENDANCE PAGE
   ============================================================ */
const ATT_POLL_MS = 30_000;
function fmtAttTime(d) {
  if (!d) return '—';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function AttendancePage({ school }) {
  const [classes,    setClasses]    = useState([]);
  const [students,   setStudents]   = useState([]);
  const [selClass,   setSelClass]   = useState('');
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving,   setSaving]  = useState(false);
  const [saved,    setSaved]   = useState(false);
  const [banner,   setBanner]  = useState(null);
  const [syncing,  setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [isDirty,  setIsDirty] = useState(false);
  // dirtyRef mirrors isDirty for synchronous reads inside the poll interval (refs don't re-render)
  const dirtyRef    = useRef(false);
  const pollRef     = useRef(null);
  const selClassRef = useRef('');
  const dateRef     = useRef(date);

  const markDirty  = useCallback(() => { dirtyRef.current = true;  setIsDirty(true); }, []);
  const clearDirty = useCallback(() => { dirtyRef.current = false; setIsDirty(false); }, []);

  useEffect(() => {
    ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selClass) { setStudents([]); setAttendance({}); setSaved(false); clearDirty(); return; }
    selClassRef.current = selClass;
    setLoadingStudents(true);
    ApiClient.get('/api/school/students/')
      .then(d => {
        const all = d.students || [];
        setStudents(all.filter(s => String(s.classroom_id) === String(selClass)));
        setAttendance({});
        setSaved(false);
        clearDirty();
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [selClass, clearDirty]);

  // Fetch saved attendance for current class+date
  const fetchAttendance = useCallback(async (classId, dateStr, silent = false) => {
    if (!classId || !dateStr) return;
    if (!silent) setSyncing(true);
    try {
      const d = await ApiClient.get(`/api/school/attendance/?class_id=${classId}&date=${dateStr}`);
      if (d.attendance) {
        if (!dirtyRef.current) {
          setAttendance(d.attendance);
        }
        setLastSync(new Date());
      }
    } catch { /* keep stale */ }
    if (!silent) setSyncing(false);
  }, []);

  // Load on class/date change
  useEffect(() => {
    dateRef.current = date;
    clearDirty();
    fetchAttendance(selClass, date, false);
  }, [selClass, date, fetchAttendance, clearDirty]);

  // Polling — refresh saved attendance every 30 s (only when not dirty)
  useEffect(() => {
    pollRef.current = setInterval(() => {
      const cls = selClassRef.current;
      const dt  = dateRef.current;
      if (!cls || !dt || dirtyRef.current) return;
      setSyncing(true);
      ApiClient.get(`/api/school/attendance/?class_id=${cls}&date=${dt}`)
        .then(d => {
          if (d.attendance && !dirtyRef.current) {
            setAttendance(d.attendance);
            setLastSync(new Date());
          }
        })
        .catch(() => {})
        .finally(() => setSyncing(false));
    }, ATT_POLL_MS);
    return () => clearInterval(pollRef.current);
  }, []);

  const setStatus = (id, status) => {
    markDirty();
    setSaved(false);
    setAttendance(a => ({ ...a, [id]: status }));
  };
  const markAll = (status) => {
    markDirty();
    setSaved(false);
    setAttendance(Object.fromEntries(students.map(s => [s.id, status])));
  };

  const present = Object.values(attendance).filter(v => v === 'present').length;
  const absent  = Object.values(attendance).filter(v => v === 'absent').length;
  const late    = Object.values(attendance).filter(v => v === 'late').length;
  const rate    = students.length ? Math.round((present / students.length) * 100) : 0;

  const handleSave = async () => {
    if (!selClass || !date) return;
    setSaving(true);
    setBanner(null);
    try {
      const res = await ApiClient.post('/api/school/attendance/', {
        class_id: selClass,
        date,
        records: attendance,
      });
      setSaved(true);
      clearDirty();
      setLastSync(new Date());
      setBanner({ type: 'ok', text: res.message || 'Attendance saved.' });
    } catch (e) {
      setBanner({ type: 'err', text: e?.message || 'Failed to save attendance.' });
    }
    setSaving(false);
  };

  const RADIO_COLORS = { present: 'var(--ska-green)', late: 'var(--ska-tertiary)', absent: 'var(--ska-error)' };
  const BADGE_MAP    = { present: 'ska-badge--green', late: 'ska-badge--pending', absent: 'ska-badge--error' };

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Attendance</h1>
          <p className="ska-page-sub">{school?.name} — Daily attendance tracking</p>
        </div>
      </div>

      <Banner msg={banner} />

      {/* Live sync indicator */}
      {selClass && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--ska-text-3)', marginBottom: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', display: 'inline-block', flexShrink: 0,
            background: isDirty ? 'var(--ska-tertiary)' : syncing ? 'var(--ska-primary)' : 'var(--ska-green)',
            animation: (syncing || isDirty) ? 'ska-pulse 1s infinite' : 'none' }} />
          {isDirty ? 'Unsaved changes — save to sync' : syncing ? 'Syncing…' : `Live · Last synced ${fmtAttTime(lastSync)}`}
        </div>
      )}

      {/* Stats */}
      <div className="ska-stat-grid-4">
        <StatCard icon="check_circle" iconBg="var(--ska-green-dim)"    iconColor="var(--ska-green)"    label="Present"          value={present}                                   sub={`of ${students.length}`} />
        <StatCard icon="cancel"       iconBg="var(--ska-error-dim)"    iconColor="var(--ska-error)"    label="Absent"           value={absent} />
        <StatCard icon="schedule"     iconBg="var(--ska-tertiary-dim)" iconColor="var(--ska-tertiary)" label="Late Arrivals"    value={late} />
        <StatCard icon="percent"      iconBg="var(--ska-primary-dim)"  iconColor="var(--ska-primary)"  label="Attendance Rate"  value={students.length ? `${rate}%` : '—'} />
      </div>

      {/* Controls */}
      <div className="ska-card ska-card-pad" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="ska-form-group" style={{ flex: 1, minWidth: 160, margin: 0 }}>
            <span>Class</span>
            <select className="ska-input" value={selClass} onChange={e => setSelClass(e.target.value)}>
              <option value="">— Select Class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="ska-form-group" style={{ flex: 1, minWidth: 160, margin: 0 }}>
            <span>Date</span>
            <input className="ska-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          {students.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => markAll('present')}>
                <Ic name="done_all" size="sm" /> Mark All Present
              </button>
              <button className="ska-btn ska-btn--primary" onClick={handleSave} disabled={saving}>
                <Ic name={saved ? 'check' : 'save'} size="sm" />
                {saving ? 'Saving…' : saved ? 'Saved' : 'Save Attendance'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Student table */}
      {!selClass ? (
        <div className="ska-card">
          <div className="ska-empty">
            <Ic name="event_available" size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
            <p className="ska-empty-title">Select a class to begin</p>
            <p className="ska-empty-desc">Choose a class above to mark today's attendance.</p>
          </div>
        </div>
      ) : loadingStudents ? (
        <div className="ska-card"><div className="ska-empty"><p className="ska-empty-desc">Loading students…</p></div></div>
      ) : students.length === 0 ? (
        <div className="ska-card">
          <div className="ska-empty">
            <Ic name="group" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
            <p className="ska-empty-title">No students in this class</p>
            <p className="ska-empty-desc">Add students to this class from the Students page.</p>
          </div>
        </div>
      ) : (
        <div className="ska-card" style={{ overflowX: 'auto' }}>
          <table className="ska-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Student</th>
                <th>Admission No.</th>
                <th style={{ textAlign: 'center' }}>Present</th>
                <th style={{ textAlign: 'center' }}>Late</th>
                <th style={{ textAlign: 'center' }}>Absent</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const status = attendance[s.id] || '';
                return (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'var(--ska-primary-dim)', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          fontWeight: 800, fontSize: '0.8125rem', color: 'var(--ska-primary)', flexShrink: 0,
                        }}>
                          {s.first_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span style={{ fontWeight: 600 }}>{s.first_name} {s.last_name}</span>
                      </div>
                    </td>
                    <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{s.admission_number || '—'}</td>
                    {['present', 'late', 'absent'].map(val => (
                      <td key={val} style={{ textAlign: 'center' }}>
                        <input
                          type="radio"
                          name={`att-${s.id}`}
                          checked={status === val}
                          onChange={() => setStatus(s.id, val)}
                          style={{ accentColor: RADIO_COLORS[val], width: 18, height: 18, cursor: 'pointer' }}
                        />
                      </td>
                    ))}
                    <td>
                      {status
                        ? <span className={`ska-badge ${BADGE_MAP[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                        : <span style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   FINANCE PAGE
   ============================================================ */
export function FinancePage({ school }) {
  const [tab,        setTab]        = useState('overview');
  const [stats,      setStats]      = useState(null);
  const [fees,       setFees]       = useState([]);
  const [expenses,   setExpenses]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showPayModal,  setShowPayModal]  = useState(false);
  const [showExpModal,  setShowExpModal]  = useState(false);
  const [payFee,     setPayFee]     = useState(null);
  const [payAmount,  setPayAmount]  = useState('');
  const [expForm,    setExpForm]    = useState({ title: '', amount: '', category: 'other', date: new Date().toISOString().split('T')[0] });
  const [saving,     setSaving]     = useState(false);
  const [banner,     setBanner]     = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [st, fe, ex] = await Promise.all([
        ApiClient.get('/api/school/finance/stats/'),
        ApiClient.get('/api/school/finance/fees/'),
        ApiClient.get('/api/school/finance/expenses/'),
      ]);
      setStats(st);
      setFees(fe.fees || []);
      setExpenses(ex.expenses || []);
    } catch { /* leave empty */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRecordPayment = async () => {
    if (!payFee) return;
    setSaving(true);
    try {
      await ApiClient.put(`/api/school/finance/fees/${payFee.id}/`, { amount_paid: parseFloat(payAmount) || 0 });
      setBanner({ type: 'ok', text: 'Payment recorded.' });
      setShowPayModal(false);
      loadAll();
    } catch (e) {
      setBanner({ type: 'err', text: e?.message || 'Failed to record payment.' });
    }
    setSaving(false);
  };

  const handleAddExpense = async () => {
    setSaving(true);
    try {
      await ApiClient.post('/api/school/finance/expenses/', expForm);
      setBanner({ type: 'ok', text: 'Expense recorded.' });
      setShowExpModal(false);
      setExpForm({ title: '', amount: '', category: 'other', date: new Date().toISOString().split('T')[0] });
      loadAll();
    } catch (e) {
      setBanner({ type: 'err', text: e?.message || 'Failed to add expense.' });
    }
    setSaving(false);
  };

  const fmt = n => n !== undefined && n !== null ? `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '$0';
  const STATUS_BADGE = { paid: 'ska-badge--green', partial: 'ska-badge--pending', unpaid: 'ska-badge--error' };
  const CAT_COLORS = ['var(--ska-primary)', 'var(--ska-secondary)', 'var(--ska-tertiary)', 'var(--ska-green)', 'var(--ska-error)'];

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Finance</h1>
          <p className="ska-page-sub">{school?.name} — Fee collection and expenses</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ska-btn ska-btn--ghost" onClick={() => setShowExpModal(true)}><Ic name="add" size="sm" /> Add Expense</button>
          <button className="ska-btn ska-btn--primary" onClick={() => { setPayFee(null); setPayAmount(''); setShowPayModal(true); }}>
            <Ic name="payments" size="sm" /> Record Payment
          </button>
        </div>
      </div>

      <Banner msg={banner} />

      {/* Stats */}
      <div className="ska-stat-grid-4">
        <StatCard icon="payments"        iconBg="var(--ska-green-dim)"    iconColor="var(--ska-green)"    label="Total Collected"  value={loading ? '…' : fmt(stats?.collected)}       sub="This term" />
        <StatCard icon="account_balance" iconBg="var(--ska-error-dim)"    iconColor="var(--ska-error)"    label="Outstanding"      value={loading ? '…' : fmt(stats?.outstanding)}     sub="Not yet paid" />
        <StatCard icon="receipt_long"    iconBg="var(--ska-tertiary-dim)" iconColor="var(--ska-tertiary)" label="Total Expenses"   value={loading ? '…' : fmt(stats?.total_expenses)}  sub="This term" />
        <StatCard icon="percent"         iconBg="var(--ska-primary-dim)"  iconColor="var(--ska-primary)"  label="Collection Rate"  value={loading ? '…' : stats ? `${stats.collection_rate}%` : '—'} sub="Fee recovery" />
      </div>

      <TabBar
        tabs={[['overview','dashboard','Overview'],['transactions','receipt','Fee Records'],['expenses','pie_chart','Expenses']]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
          <div className="ska-card ska-card-pad">
            <div className="ska-card-head" style={{ marginBottom: 20 }}>
              <h2 className="ska-card-title">Fee Status by Class</h2>
              <span className="ska-badge ska-badge--cyan">Live</span>
            </div>
            {loading ? (
              <div className="ska-empty" style={{ padding: '24px 0' }}><p className="ska-empty-desc">Loading…</p></div>
            ) : (stats?.class_fees || []).length === 0 ? (
              <div className="ska-empty" style={{ padding: '24px 0' }}>
                <p className="ska-empty-desc">No fee records yet. Record student fees to see breakdown.</p>
              </div>
            ) : (
              <div className="ska-progress-list">
                {(stats.class_fees || []).map((c, i) => {
                  const pct = c.total > 0 ? Math.round((c.collected / c.total) * 100) : 0;
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--ska-text)', fontWeight: 600 }}>{c.class_name}</span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{pct}% collected</span>
                      </div>
                      <div className="ska-progress-track">
                        <div className="ska-progress-fill" style={{
                          width: `${pct}%`,
                          background: pct >= 80 ? 'var(--ska-green)' : pct >= 55 ? 'var(--ska-primary)' : 'var(--ska-error)',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="ska-card ska-card-pad">
            <h2 className="ska-card-title" style={{ marginBottom: 20 }}>Expense Distribution</h2>
            {(stats?.expense_distribution || []).length === 0 ? (
              <div className="ska-empty" style={{ padding: '16px 0' }}>
                <p className="ska-empty-desc">No expenses recorded.</p>
              </div>
            ) : (
              (stats.expense_distribution || []).map((e, i) => {
                const totalExp = stats.expense_distribution.reduce((s, x) => s + x.amount, 0);
                const pct = totalExp > 0 ? Math.round((e.amount / totalExp) * 100) : 0;
                return (
                  <div key={e.category} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text)', textTransform: 'capitalize' }}>{e.category}</span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{pct}%</span>
                    </div>
                    <div className="ska-progress-track">
                      <div className="ska-progress-fill" style={{ width: `${pct}%`, background: CAT_COLORS[i % CAT_COLORS.length] }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="ska-card" style={{ overflowX: 'auto' }}>
          <div style={{ padding: '20px 20px 0' }}>
            <div className="ska-card-head">
              <h2 className="ska-card-title">Fee Records</h2>
              <span className="ska-badge ska-badge--cyan">{fees.length} entries</span>
            </div>
          </div>
          {fees.length === 0 ? (
            <div className="ska-empty">
              <Ic name="receipt" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
              <p className="ska-empty-title">No fee records yet</p>
              <p className="ska-empty-desc">Click "Record Payment" to add a fee record.</p>
            </div>
          ) : (
            <table className="ska-table">
              <thead>
                <tr><th>Student</th><th>Description</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {fees.map(f => (
                  <tr key={f.id}>
                    <td style={{ fontWeight: 600 }}>{f.student_name}</td>
                    <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{f.description}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(f.amount)}</td>
                    <td style={{ color: 'var(--ska-green)', fontWeight: 600 }}>{fmt(f.amount_paid)}</td>
                    <td style={{ color: f.balance > 0 ? 'var(--ska-error)' : 'var(--ska-text-3)' }}>{fmt(f.balance)}</td>
                    <td><span className={`ska-badge ${STATUS_BADGE[f.status] || 'ska-badge--primary'}`}>{f.status}</span></td>
                    <td>
                      {f.status !== 'paid' && (
                        <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => { setPayFee(f); setPayAmount(String(f.balance)); setShowPayModal(true); }}>
                          Pay
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'expenses' && (
        <div className="ska-card" style={{ overflowX: 'auto' }}>
          <div style={{ padding: '20px 20px 0' }}>
            <div className="ska-card-head">
              <h2 className="ska-card-title">Expenses</h2>
              <span className="ska-badge ska-badge--cyan">{expenses.length} entries</span>
            </div>
          </div>
          {expenses.length === 0 ? (
            <div className="ska-empty">
              <Ic name="receipt_long" size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
              <p className="ska-empty-title">No expenses recorded</p>
              <p className="ska-empty-desc">Record school expenses to track your spending.</p>
              <button className="ska-btn ska-btn--primary" style={{ marginTop: 12 }} onClick={() => setShowExpModal(true)}>
                <Ic name="add" size="sm" /> Add Expense
              </button>
            </div>
          ) : (
            <table className="ska-table">
              <thead>
                <tr><th>Title</th><th>Category</th><th>Amount</th><th>Date</th></tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.title}</td>
                    <td style={{ color: 'var(--ska-text-3)', textTransform: 'capitalize', fontSize: '0.8125rem' }}>{e.category}</td>
                    <td style={{ fontWeight: 700, color: 'var(--ska-error)' }}>{fmt(e.amount)}</td>
                    <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{e.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="ska-card ska-card-pad" style={{ width: '100%', maxWidth: 440 }}>
            <div className="ska-card-head" style={{ marginBottom: 16 }}>
              <h2 className="ska-card-title">{payFee ? `Pay — ${payFee.student_name}` : 'Record Payment'}</h2>
              <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => setShowPayModal(false)}><Ic name="close" size="sm" /></button>
            </div>
            {payFee ? (
              <>
                <p style={{ margin: '0 0 12px', fontSize: '0.875rem', color: 'var(--ska-text-3)' }}>Balance: <strong style={{ color: 'var(--ska-text)' }}>{fmt(payFee.balance)}</strong></p>
                <label className="ska-form-group">
                  <span>Amount Paying</span>
                  <input className="ska-input" type="number" min="0" max={payFee.balance} value={payAmount}
                    onChange={e => setPayAmount(e.target.value)} placeholder="Enter amount…" />
                </label>
              </>
            ) : (
              <p style={{ margin: '0 0 16px', fontSize: '0.875rem', color: 'var(--ska-text-3)' }}>
                Select a fee record from the Fee Records tab to record a payment.
              </p>
            )}
            <div className="ska-modal-actions">
              <button className="ska-btn ska-btn--ghost" onClick={() => setShowPayModal(false)}>Cancel</button>
              {payFee && (
                <button className="ska-btn ska-btn--primary" onClick={handleRecordPayment} disabled={saving || !payAmount}>
                  <Ic name="check" size="sm" /> {saving ? 'Saving…' : 'Confirm Payment'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div className="ska-card ska-card-pad" style={{ width: '100%', maxWidth: 440 }}>
            <div className="ska-card-head" style={{ marginBottom: 16 }}>
              <h2 className="ska-card-title">Add Expense</h2>
              <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => setShowExpModal(false)}><Ic name="close" size="sm" /></button>
            </div>
            <div className="ska-form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label className="ska-form-group">
                <span>Title</span>
                <input className="ska-input" placeholder="e.g. Teacher salaries…" value={expForm.title}
                  onChange={e => setExpForm(f => ({ ...f, title: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Amount</span>
                <input className="ska-input" type="number" min="0" placeholder="0.00" value={expForm.amount}
                  onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Category</span>
                <select className="ska-input" value={expForm.category} onChange={e => setExpForm(f => ({ ...f, category: e.target.value }))}>
                  {['salaries','utilities','supplies','maintenance','events','technology','other'].map(c =>
                    <option key={c} value={c} style={{ textTransform: 'capitalize' }}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                  )}
                </select>
              </label>
              <label className="ska-form-group">
                <span>Date</span>
                <input className="ska-input" type="date" value={expForm.date}
                  onChange={e => setExpForm(f => ({ ...f, date: e.target.value }))} />
              </label>
            </div>
            <div className="ska-modal-actions">
              <button className="ska-btn ska-btn--ghost" onClick={() => setShowExpModal(false)}>Cancel</button>
              <button className="ska-btn ska-btn--primary" onClick={handleAddExpense} disabled={saving || !expForm.title || !expForm.amount}>
                <Ic name="add" size="sm" /> {saving ? 'Saving…' : 'Add Expense'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   REPORTS PAGE
   ============================================================ */
export function ReportsPage({ school }) {
  const [classes,      setClasses]      = useState([]);
  const [subjects,     setSubjects]     = useState([]);
  const [years,        setYears]        = useState([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [recentReports] = useState([]);
  const [form, setForm] = useState({ yearId: '', type: 'performance', classId: '', subjectId: '' });
  const [generating, setGenerating] = useState(false);
  const [generated,  setGenerated]  = useState(false);

  useEffect(() => {
    ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes || [])).catch(() => {});
    ApiClient.get('/api/school/subjects/').then(d => setSubjects(d.subjects || [])).catch(() => {});
    ApiClient.get('/api/school/academic-years/')
      .then(d => { setYears(d.academic_years || []); setYearsLoading(false); })
      .catch(() => setYearsLoading(false));
  }, []);

  const REPORT_TYPES = [
    { value: 'performance',  label: 'Class Performance Report' },
    { value: 'attendance',   label: 'Attendance Summary' },
    { value: 'transcripts',  label: 'Student Transcripts' },
    { value: 'merit',        label: 'Merit List' },
    { value: 'retention',    label: 'Student Retention Analysis' },
    { value: 'finance',      label: 'Fee Collection Report' },
  ];

  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 1200));
    setGenerated(true);
    setGenerating(false);
  };

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Reports</h1>
          <p className="ska-page-sub">{school?.name} — Academic and administrative analytics</p>
        </div>
      </div>

      {/* Stats */}
      <div className="ska-stat-grid-4">
        <StatCard icon="assessment"        iconBg="var(--ska-primary-dim)"   iconColor="var(--ska-primary)"   label="Reports Generated"  value={recentReports.length} sub="All time" />
        <StatCard icon="school"            iconBg="var(--ska-secondary-dim)" iconColor="var(--ska-secondary)" label="GPA Average"         value="—"             sub="Current term" />
        <StatCard icon="workspace_premium" iconBg="var(--ska-green-dim)"     iconColor="var(--ska-green)"     label="Graduation Rate"     value="—"             sub="This year" />
        <StatCard icon="people"            iconBg="var(--ska-tertiary-dim)"  iconColor="var(--ska-tertiary)"  label="Retention Rate"      value="—"             sub="This year" />
      </div>

      <div className="ska-split-grid">
        {/* Generator */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head" style={{ marginBottom: 20 }}>
            <h2 className="ska-card-title">Generate Report</h2>
            <Ic name="auto_awesome" size="sm" style={{ color: 'var(--ska-tertiary)' }} />
          </div>
          <div className="ska-form-grid" style={{ gridTemplateColumns: '1fr' }}>
            <label className="ska-form-group">
              <span>Report Type</span>
              <select className="ska-input" value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {REPORT_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </label>
            <div className="ska-form-group">
              <span>Academic Year</span>
              <div className="ska-year-filter" style={{ marginTop: 8 }}>
                {yearsLoading ? (
                  <div className="ska-year-filter__pills">
                    {[1, 2, 3].map(i => <span key={i} className="ska-year-pill ska-year-pill--skeleton" />)}
                  </div>
                ) : (
                  <div className="ska-year-filter__pills">
                    <button type="button"
                      className={`ska-year-pill${form.yearId === '' ? ' ska-year-pill--active' : ''}`}
                      onClick={() => setForm(f => ({ ...f, yearId: '' }))}>
                      All Years
                    </button>
                    {years.map(y => (
                      <button type="button" key={y.id}
                        className={`ska-year-pill${form.yearId === String(y.id) ? ' ska-year-pill--active' : ''}${y.is_active && form.yearId !== String(y.id) ? ' ska-year-pill--current' : ''}`}
                        onClick={() => setForm(f => ({ ...f, yearId: String(y.id) }))}>
                        {y.name}
                        {y.is_active && <span className="ska-year-pill__dot" />}
                      </button>
                    ))}
                    {years.length === 0 && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--ska-text-3)', padding: '6px 0' }}>No academic years found</span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <label className="ska-form-group">
              <span>Class <span style={{ color: 'var(--ska-text-3)', fontSize: '0.75rem' }}>(optional)</span></span>
              <select className="ska-input" value={form.classId}
                onChange={e => setForm(f => ({ ...f, classId: e.target.value }))}>
                <option value="">— All Classes —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="ska-form-group">
              <span>Subject <span style={{ color: 'var(--ska-text-3)', fontSize: '0.75rem' }}>(optional)</span></span>
              <select className="ska-input" value={form.subjectId}
                onChange={e => setForm(f => ({ ...f, subjectId: e.target.value }))}>
                <option value="">— All Subjects —</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
          </div>
          <button
            className="ska-btn ska-btn--primary"
            style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}
            onClick={handleGenerate}
            disabled={generating}
          >
            <Ic name={generated ? 'download' : 'auto_awesome'} size="sm" />
            {generating ? 'Generating…' : generated ? 'Download Report' : 'Generate Report'}
          </button>
        </div>

        {/* Recent reports */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head" style={{ marginBottom: 16 }}>
            <h2 className="ska-card-title">Recent Reports</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {recentReports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                <Ic name="description" style={{ fontSize: 36, color: 'var(--ska-text-3)', display: 'block', margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text-3)' }}>No reports yet</p>
                <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: 'var(--ska-text-3)' }}>Generated reports will appear here.</p>
              </div>
            ) : recentReports.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 8, background: 'var(--ska-surface-high)',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 8, flexShrink: 0,
                  background: 'var(--ska-primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Ic name="description" size="sm" style={{ color: 'var(--ska-primary)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</p>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{r.type} · {r.date}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <span className={`ska-badge ${r.status === 'ready' ? 'ska-badge--green' : 'ska-badge--inactive'}`}>{r.status}</span>
                  <button className="ska-btn ska-btn--ghost ska-btn--sm" aria-label="Download">
                    <Ic name="download" size="sm" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MESSAGES PAGE
   ============================================================ */
export function MessagesPage({ school, admin }) {
  const [tab,       setTab]       = useState('all');
  const [compose,   setCompose]   = useState(false);
  const [subject,   setSubject]   = useState('');
  const [msgText,   setMsgText]   = useState('');
  const [recipient, setRecipient] = useState('all');
  const [sending,   setSending]   = useState(false);
  const [sent,      setSent]      = useState(false);
  const [messages,  setMessages]  = useState([]);
  const [loading,   setLoading]   = useState(true);

  const TABS = [
    ['all',     'all_inbox',       'All'],
    ['staff',   'badge',           'Staff'],
    ['parents', 'family_restroom', 'Parents'],
    ['students','school',          'Students'],
  ];

  const loadMessages = useCallback(() => {
    setLoading(true);
    ApiClient.get('/api/school/messages/')
      .then(d => setMessages(d.messages || []))
      .catch(() => setMessages([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  const handleSend = async () => {
    if (!msgText.trim() || !subject.trim()) return;
    setSending(true);
    try {
      await ApiClient.post('/api/school/messages/', {
        recipient_role: recipient,
        subject,
        body: msgText,
        is_broadcast: true,
      });
      setSent(true);
      setMsgText(''); setSubject('');
      loadMessages();
      setTimeout(() => { setSent(false); setCompose(false); }, 1500);
    } catch { /* show nothing — keep compose open */ }
    setSending(false);
  };

  const filtered = messages.filter(m => tab === 'all' || m.recipient_role === tab);

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Messages</h1>
          <p className="ska-page-sub">{school?.name} — Announcements and communication</p>
        </div>
        <button className="ska-btn ska-btn--primary" onClick={() => setCompose(true)}>
          <Ic name="edit" size="sm" /> New Message
        </button>
      </div>

      {/* Compose panel */}
      {compose && (
        <div className="ska-card ska-card-pad" style={{ marginBottom: 20 }}>
          <div className="ska-card-head" style={{ marginBottom: 16 }}>
            <h2 className="ska-card-title">Broadcast Message</h2>
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => setCompose(false)}>
              <Ic name="close" size="sm" />
            </button>
          </div>
          <div className="ska-form-grid">
            <label className="ska-form-group">
              <span>Send To</span>
              <select className="ska-input" value={recipient} onChange={e => setRecipient(e.target.value)}>
                <option value="all">All (Students + Staff + Parents)</option>
                <option value="staff">Staff Only</option>
                <option value="students">Students Only</option>
                <option value="parents">Parents Only</option>
              </select>
            </label>
            <label className="ska-form-group">
              <span>Subject</span>
              <input className="ska-input" placeholder="Message subject…"
                value={subject} onChange={e => setSubject(e.target.value)} />
            </label>
            <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
              <span>Message</span>
              <textarea className="ska-input" rows={4} style={{ resize: 'vertical' }}
                placeholder="Type your announcement here…"
                value={msgText} onChange={e => setMsgText(e.target.value)} />
            </label>
          </div>
          <div className="ska-modal-actions">
            <button className="ska-btn ska-btn--ghost" onClick={() => setCompose(false)}>Cancel</button>
            <button className="ska-btn ska-btn--primary" onClick={handleSend}
              disabled={sending || !msgText.trim() || !subject.trim()}>
              <Ic name="send" size="sm" />
              {sent ? 'Sent ✓' : sending ? 'Sending…' : 'Send Message'}
            </button>
          </div>
        </div>
      )}

      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      <div className="ska-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="ska-empty"><p className="ska-empty-desc">Loading messages…</p></div>
        ) : filtered.length === 0 ? (
          <div className="ska-empty">
            <Ic name="mail" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
            <p className="ska-empty-title">No messages in this category</p>
            <p className="ska-empty-desc">Broadcast a message to staff, students, or parents.</p>
          </div>
        ) : (
          filtered.map((m, i) => {
            const fmtDate = ts => { try { return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ts; } };
            return (
              <div key={m.id || i} style={{
                display: 'flex', gap: 14, padding: '16px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--ska-border)' : 'none',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'var(--ska-primary-dim)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, color: 'var(--ska-primary)',
                }}>
                  {(m.sender_name || 'S')?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ska-text)' }}>{m.sender_name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{fmtDate(m.created_at)}</span>
                  </div>
                  {m.subject && <p style={{ margin: '0 0 2px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ska-text-2)' }}>{m.subject}</p>}
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ska-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.body}</p>
                </div>
                {m.recipient_role && m.recipient_role !== 'system' && (
                  <span className="ska-badge ska-badge--cyan" style={{ flexShrink: 0, alignSelf: 'center' }}>{m.recipient_role}</span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SECURITY PAGE  — real data from /api/security-logs/
   ============================================================ */
export function SecurityPage() {
  const [logs,      setLogs]      = useState([]);
  const [counters,  setCounters]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [sevFilter, setSevFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logsData, ctrs] = await Promise.all([
        ApiClient.get('/api/security-logs/?limit=100'),
        ApiClient.get('/api/security-counters/'),
      ]);
      setLogs(logsData.logs || []);
      setCounters(ctrs);
    } catch {
      setLogs([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const SEV_STYLE = {
    critical: { bg: 'var(--ska-error-dim)',    color: 'var(--ska-error)' },
    high:     { bg: 'var(--ska-tertiary-dim)', color: 'var(--ska-tertiary)' },
    medium:   { bg: 'var(--ska-primary-dim)',  color: 'var(--ska-primary)' },
    low:      { bg: 'var(--ska-surface-high)', color: 'var(--ska-text-3)' },
    info:     { bg: 'var(--ska-surface-high)', color: 'var(--ska-text-3)' },
  };
  const STATUS_CL = { Blocked: 'ska-badge--error', Throttled: 'ska-badge--pending', Flagged: 'ska-badge--pending', Allowed: 'ska-badge--green' };

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.actor.toLowerCase().includes(q) || l.action.toLowerCase().includes(q) || l.type.toLowerCase().includes(q);
    const matchSev    = !sevFilter || l.severity === sevFilter;
    return matchSearch && matchSev;
  });

  const fmtTs = ts => {
    try { return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
    catch { return ts; }
  };

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Security Logs</h1>
          <p className="ska-page-sub">Audit trail — system security events</p>
        </div>
        <button className="ska-btn ska-btn--ghost" onClick={load}>
          <Ic name="refresh" size="sm" /> Refresh
        </button>
      </div>

      {/* Counters */}
      <div className="ska-stat-grid-4">
        <StatCard icon="shield"          iconBg="var(--ska-primary-dim)"   iconColor="var(--ska-primary)"   label="Total Events"    value={(counters.total_log_entries || 0).toLocaleString()} />
        <StatCard icon="block"           iconBg="var(--ska-error-dim)"     iconColor="var(--ska-error)"     label="Threats (24h)"   value={counters.threats_blocked || 0}            sub="Failed logins" />
        <StatCard icon="manage_accounts" iconBg="var(--ska-secondary-dim)" iconColor="var(--ska-secondary)" label="Active Sessions" value={counters.active_sessions || 0}            sub="Last 1 hour" />
        <StatCard icon="check_circle"    iconBg="var(--ska-green-dim)"     iconColor="var(--ska-green)"     label="Logins (24h)"    value={counters.successful_logins_24h || 0}      sub="Successful" />
      </div>

      {/* Filters */}
      <div className="ska-card ska-card-pad" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="ska-search ska-toolbar-search" style={{ flex: 1, minWidth: 200 }}>
            <Ic name="search" />
            <input className="ska-search-input" placeholder="Search actor, action, type…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="ska-input" style={{ width: 'auto', minWidth: 150 }}
            value={sevFilter} onChange={e => setSevFilter(e.target.value)}>
            <option value="">All Severities</option>
            {['critical','high','medium','low','info'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', whiteSpace: 'nowrap' }}>
            {filtered.length} / {logs.length} entries
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="ska-card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div className="ska-empty"><p className="ska-empty-desc">Loading security logs…</p></div>
        ) : filtered.length === 0 ? (
          <div className="ska-empty">
            <Ic name="security" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
            <p className="ska-empty-title">{logs.length === 0 ? 'No security events yet' : 'No results match your filter'}</p>
            <p className="ska-empty-desc">
              {logs.length === 0
                ? 'Events appear here as users interact with the system.'
                : 'Try adjusting your search or severity filter.'}
            </p>
          </div>
        ) : (
          <table className="ska-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Actor</th>
                <th>Event</th>
                <th>Severity</th>
                <th>IP Address</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const sev = SEV_STYLE[l.severity] || SEV_STYLE.info;
                return (
                  <tr key={l.id}>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', whiteSpace: 'nowrap' }}>{fmtTs(l.ts)}</td>
                    <td style={{ fontWeight: 600 }}>{l.actor}</td>
                    <td style={{ maxWidth: 280 }}>
                      <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ska-text)' }}>{l.action}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{l.type.replace(/_/g, ' ')}</p>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px',
                        borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                        background: sev.bg, color: sev.color,
                      }}>
                        {l.severity}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{l.ip}</td>
                    <td>
                      <span className={`ska-badge ${STATUS_CL[l.status] || 'ska-badge--green'}`}>{l.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   SETTINGS PAGE  — real data
   ============================================================ */
export function SettingsPage({ school: schoolProp, onSchoolUpdate }) {
  const [school,     setSchool]     = useState(schoolProp || {});
  const [years,      setYears]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState({ type: '', text: '' });
  const [addingYear, setAddingYear] = useState(false);
  const [savingYear, setSavingYear] = useState(false);
  const [yearForm,   setYearForm]   = useState({ name: '', start_date: '', end_date: '' });
  const [form,    setForm]    = useState({ 
    phone: '', address: '', city: '', country: '', 
    brand_colors: schoolProp?.brand_colors || '' 
  });
  const [badgePreview, setBadgePreview] = useState(schoolProp?.badge || '');
  const [badgeFile, setBadgeFile] = useState(null);
  const badgeRef = useRef(null);

  useEffect(() => {
    Promise.all([
      ApiClient.get('/api/school/info/').then(d => {
        setSchool(d);
        setForm({ 
          phone: d.phone || '', address: d.address || '', 
          city: d.city || '', country: d.country || '',
          brand_colors: d.brand_colors || ''
        });
        setBadgePreview(d.badge || '');
      }).catch(() => {}),
      ApiClient.get('/api/school/academic-years/').then(d => setYears(d.academic_years || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [school?.badge, school?.brand_colors]);

  const handleSave = async () => {
    setSaving(true); setMsg({ type: '', text: '' });
    try {
      const payload = new FormData();
      payload.append('phone', form.phone);
      payload.append('address', form.address);
      payload.append('city', form.city);
      payload.append('country', form.country);
      payload.append('brand_colors', form.brand_colors);
      if (badgeFile) {
        payload.append('badge', badgeFile);
      }

      const res = await ApiClient.post('/api/school/info/', payload);
      setMsg({ type: 'ok', text: 'Settings saved successfully.' });
      if (onSchoolUpdate) onSchoolUpdate(res.school);
      setSchool(s => ({ ...s, ...res.school }));
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Failed to save settings.' });
    }
    setSaving(false);
  };

  const handleAddYear = async () => {
    if (!yearForm.name.trim()) return;
    setSavingYear(true);
    try {
      await ApiClient.post('/api/school/academic-years/', yearForm);
      const d = await ApiClient.get('/api/school/academic-years/');
      setYears(d.academic_years || []);
      setYearForm({ name: '', start_date: '', end_date: '' });
      setAddingYear(false);
    } catch (e) {
      alert(e.message || 'Failed to add academic year.');
    }
    setSavingYear(false);
  };

  if (loading) {
    return (
      <div className="ska-content">
        <div className="ska-card"><div className="ska-empty"><p className="ska-empty-desc">Loading settings…</p></div></div>
      </div>
    );
  }

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Settings</h1>
          <p className="ska-page-sub">School configuration and preferences</p>
        </div>
      </div>

      <div className="ska-split-grid">

        {/* School Profile */}
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head" style={{ marginBottom: 20 }}>
            <h2 className="ska-card-title">School Profile</h2>
            <Ic name="business" size="sm" style={{ color: 'var(--ska-primary)' }} />
          </div>
          <Banner msg={msg} />
          <div className="ska-form-grid">
            <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
              <span>School Name <span style={{ color: 'var(--ska-text-3)', fontSize: '0.75rem' }}>(managed by superadmin)</span></span>
              <input className="ska-input" value={school.name || ''} disabled style={{ opacity: 0.55 }} readOnly />
            </label>
            <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
              <span>School Email <span style={{ color: 'var(--ska-text-3)', fontSize: '0.75rem' }}>(managed by superadmin)</span></span>
              <input className="ska-input" value={school.email || ''} disabled style={{ opacity: 0.55 }} readOnly />
            </label>
            <label className="ska-form-group">
              <span>Phone</span>
              <input className="ska-input" value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </label>
            <label className="ska-form-group">
              <span>City</span>
              <input className="ska-input" value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </label>
            <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
              <span>Address</span>
              <input className="ska-input" value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </label>
            <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
              <span>Country</span>
              <input className="ska-input" value={form.country}
                onChange={e => setForm(f => ({ ...f, country: e.target.value }))} />
            </label>
          </div>
          <button className="ska-btn ska-btn--primary" style={{ marginTop: 8, width: '100%' }}
            onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>

        {/* Branding & Customization */}
        <div className="ska-card ska-card-pad" style={{ gridColumn: '1 / -1' }}>
          <div className="ska-card-head" style={{ marginBottom: 20 }}>
            <h2 className="ska-card-title">Branding & Customization</h2>
            <Ic name="palette" size="sm" style={{ color: 'var(--ska-secondary)' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 32 }}>
            <div>
              <p style={{ margin: '0 0 12px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text-2)' }}>School Badge</p>
              <LogoUpload
                preview={badgePreview}
                inputRef={badgeRef}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    setBadgeFile(file);
                    const reader = new FileReader();
                    reader.onload = (re) => setBadgePreview(re.target.result);
                    reader.readAsDataURL(file);
                  }
                }}
                onRemove={() => {
                  setBadgeFile(null);
                  setBadgePreview('');
                }}
              />
              <p style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--ska-text-3)', lineHeight: 1.5 }}>
                Your logo will appear on report cards, certificates, transcripts, and the dashboard sidebar.
              </p>
            </div>
            <div>
              <p style={{ margin: '0 0 12px', fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text-2)' }}>Brand Color Palette</p>
              <BrandColorPicker
                value={form.brand_colors ? form.brand_colors.split(',').map(c => c.trim()).filter(Boolean) : []}
                onChange={(colors) => setForm(f => ({ ...f, brand_colors: colors.join(',') }))}
              />
              <p style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--ska-text-3)', lineHeight: 1.5 }}>
                Choose your school's official colours to customize the dashboard theme and academic documents.
              </p>
            </div>
          </div>
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--ska-border)', display: 'flex', justifyContent: 'flex-end' }}>
            <button className="ska-btn ska-btn--primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Update Branding'}
            </button>
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Academic Years */}
          <div className="ska-card ska-card-pad">
            <div className="ska-card-head" style={{ marginBottom: 16 }}>
              <h2 className="ska-card-title">Academic Years</h2>
              <button className="ska-btn ska-btn--ghost ska-btn--sm"
                onClick={() => setAddingYear(v => !v)}>
                <Ic name={addingYear ? 'close' : 'add'} size="sm" />
                {addingYear ? 'Cancel' : 'Add Year'}
              </button>
            </div>

            {addingYear && (
              <div style={{ marginBottom: 16, padding: 14, borderRadius: 8, background: 'var(--ska-surface-high)' }}>
                <div className="ska-form-grid">
                  <label className="ska-form-group" style={{ gridColumn: '1/-1' }}>
                    <span>Year Name (e.g. 2025–2026)</span>
                    <input className="ska-input" value={yearForm.name}
                      onChange={e => setYearForm(f => ({ ...f, name: e.target.value }))} />
                  </label>
                  <label className="ska-form-group">
                    <span>Start Date</span>
                    <input className="ska-input" type="date" value={yearForm.start_date}
                      onChange={e => setYearForm(f => ({ ...f, start_date: e.target.value }))} />
                  </label>
                  <label className="ska-form-group">
                    <span>End Date</span>
                    <input className="ska-input" type="date" value={yearForm.end_date}
                      onChange={e => setYearForm(f => ({ ...f, end_date: e.target.value }))} />
                  </label>
                </div>
                <button className="ska-btn ska-btn--primary ska-btn--sm"
                  onClick={handleAddYear}
                  disabled={savingYear || !yearForm.name.trim()}>
                  {savingYear ? 'Saving…' : 'Create Year'}
                </button>
              </div>
            )}

            {years.length === 0 ? (
              <div className="ska-empty" style={{ padding: '20px 0' }}>
                <Ic name="calendar_today" size="lg" style={{ color: 'var(--ska-text-3)', marginBottom: 8 }} />
                <p className="ska-empty-desc">No academic years set up yet.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {years.map(y => (
                  <div key={y.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', borderRadius: 8, background: 'var(--ska-surface-high)',
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ska-text)' }}>{y.name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{y.start_date} → {y.end_date}</p>
                    </div>
                    {y.is_active && <span className="ska-badge ska-badge--green">Active</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* System info */}
          <div className="ska-card ska-card-pad">
            <div className="ska-card-head" style={{ marginBottom: 16 }}>
              <h2 className="ska-card-title">System Information</h2>
            </div>
            {[
              { label: 'School Code',   value: school.code || '—' },
              { label: 'Platform',      value: 'EK-SMS v1.0' },
              { label: 'Status',        value: school.is_approved ? 'Approved ✓' : 'Pending' },
              { label: 'Academic Year', value: school.academic_year || '—' },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '10px 0', borderBottom: '1px solid var(--ska-border)',
              }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--ska-text-3)' }}>{row.label}</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text)' }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SYLLABUS / CURRICULUM PAGE
   ============================================================ */
export function SyllabusPage({ school }) {
  const [classes,  setClasses]  = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [selSubj,  setSelSubj]  = useState('');
  const [file,     setFile]     = useState(null);
  const [uploading, setUploading] = useState(false);
  const [syllabuses, setSyllabuses] = useState([]);
  const [banner, setBanner] = useState(null);

  const loadData = useCallback(() => {
    ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes   || [])).catch(() => {});
    ApiClient.get('/api/school/subjects/').then(d => setSubjects(d.subjects || [])).catch(() => {});
    ApiClient.get('/api/school/syllabus/').then(d => setSyllabuses(d.syllabuses || [])).catch(() => {});
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleUpload = async () => {
    if (!selClass || !selSubj || !file) {
      setBanner({ type: 'err', text: 'Please select class, subject and a file.' });
      return;
    }
    
    setUploading(true);
    setBanner(null);
    
    const formData = new FormData();
    formData.append('classroom_id', selClass);
    formData.append('subject_id', selSubj);
    formData.append('file', file);
    
    try {
      // Custom fetch because ApiClient usually sends JSON
      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${SECURITY_CONFIG.API_URL}/api/school/syllabus/upload/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      const data = await response.json();
      if (data.success) {
        setBanner({ type: 'ok', text: 'Syllabus uploaded and AI generated lesson plans successfully.' });
        setFile(null);
        loadData();
      } else {
        setBanner({ type: 'err', text: data.message || 'Upload failed.' });
      }
    } catch (err) {
      setBanner({ type: 'err', text: 'Error connecting to server.' });
    }
    setUploading(false);
  };

  const ready = selClass && selSubj;
  
  // Filter syllabuses for current selection, or show all if none selected
  const displaySyllabuses = (selClass && selSubj) 
    ? syllabuses.filter(s => s.classroom === classes.find(c=>c.id==selClass)?.name && s.subject === subjects.find(sub=>sub.id==selSubj)?.name)
    : syllabuses;

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Syllabus &amp; Lesson Plans</h1>
          <p className="ska-page-sub">{school?.name} — Upload syllabus (Word/PDF) and generate AI lesson plans</p>
        </div>
      </div>

      <Banner msg={banner} />

      {/* Selectors and Upload */}
      <div className="ska-card ska-card-pad" style={{ marginBottom: 20 }}>
        <h2 className="ska-card-title" style={{ marginBottom: 16 }}>Upload Syllabus</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="ska-form-group" style={{ flex: 1, minWidth: 160, margin: 0 }}>
            <span>Class</span>
            <select className="ska-input" value={selClass} onChange={e => setSelClass(e.target.value)}>
              <option value="">— Select Class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="ska-form-group" style={{ flex: 1, minWidth: 160, margin: 0 }}>
            <span>Subject</span>
            <select className="ska-input" value={selSubj} onChange={e => setSelSubj(e.target.value)}>
              <option value="">— Select Subject —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="ska-form-group" style={{ flex: 1, minWidth: 200, margin: 0 }}>
            <span>Syllabus File (.pdf, .docx)</span>
            <input type="file" className="ska-input" accept=".pdf,.doc,.docx" onChange={e => setFile(e.target.files[0])} />
          </label>
          <button className="ska-btn ska-btn--primary" onClick={handleUpload} disabled={uploading || !ready || !file}>
            <Ic name={uploading ? "sync" : "cloud_upload"} size="sm" className={uploading ? "ska-spin" : ""} /> 
            {uploading ? 'Generating AI Plans...' : 'Upload & Generate'}
          </button>
        </div>
      </div>

      {/* Display AI Generated Lesson Plans */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {displaySyllabuses.length === 0 ? (
          <div className="ska-card">
            <div className="ska-empty" style={{ padding: '48px 24px' }}>
              <Ic name="auto_awesome" size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
              <p className="ska-empty-title">No Lesson Plans</p>
              <p className="ska-empty-desc">Upload a syllabus above to automatically generate AI lesson plans for the term.</p>
            </div>
          </div>
        ) : (
          displaySyllabuses.map((syllabus, idx) => (
            <div key={idx} className="ska-card ska-card-pad">
              <div className="ska-card-head" style={{ marginBottom: 16 }}>
                <h2 className="ska-card-title">{syllabus.subject} — {syllabus.classroom}</h2>
                <a href={SECURITY_CONFIG.API_URL + syllabus.file_url} target="_blank" rel="noreferrer" className="ska-btn ska-btn--ghost ska-btn--sm">
                  <Ic name="download" size="sm" /> View Original Syllabus
                </a>
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 12 }}>AI Generated Weekly Lesson Plan</h3>
              <div style={{ display: 'grid', gap: 12 }}>
                {syllabus.plans?.map(plan => (
                  <div key={plan.week_number} style={{
                    padding: '16px', borderRadius: 8, background: 'var(--ska-surface-low)',
                    borderLeft: '4px solid var(--ska-primary)'
                  }}>
                    <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--ska-primary)' }}>Week {plan.week_number}</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--ska-text-2)', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {plan.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ============================================================
   BURSAR FINANCIAL LEDGER PAGE
   Institution-wide: totals, transactions table, export
   ============================================================ */
const SLL = (n) =>
  new Intl.NumberFormat('en-SL', { style: 'currency', currency: 'SLL', maximumFractionDigits: 0 })
    .format(n)
    .replace('SLL', 'Le');


function TxStatusBadge({ status }) {
  const map = {
    verified: { label: 'Verified', bg: 'var(--ska-green-dim)',   color: 'var(--ska-green)' },
    pending:  { label: 'Pending',  bg: 'rgba(245,158,11,0.12)',  color: '#F59E0B' },
    partial:  { label: 'Partial',  bg: 'rgba(59,130,246,0.12)',  color: '#3B82F6' },
    unpaid:   { label: 'Unpaid',   bg: 'var(--ska-error-dim)',   color: 'var(--ska-error)' },
  };
  const s = map[status] || map.pending;
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
}

export function BursarLedgerPage({ school }) {
  const [search,     setSearch]     = useState('');
  const [stats,      setStats]      = useState(null);
  const [fees,       setFees]       = useState([]);
  const [activeYear, setActiveYear] = useState('');
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      ApiClient.get('/api/school/finance/stats/').catch(() => null),
      ApiClient.get('/api/school/finance/fees/').catch(() => ({ fees: [] })),
      ApiClient.get('/api/school/academic-years/').catch(() => ({ academic_years: [] })),
    ]).then(([statsData, feesData, yearsData]) => {
      if (statsData?.success) setStats(statsData);
      setFees(feesData?.fees || []);
      const active = (yearsData?.academic_years || []).find(y => y.is_active);
      setActiveYear(active ? active.name : '');
    }).finally(() => setLoading(false));
  }, []);

  const totalExpected = stats ? (stats.collected + stats.outstanding) : 0;
  const pct = totalExpected > 0 ? Math.round((stats.collected / totalExpected) * 100) : 0;
  const filtered = fees.filter(tx =>
    (tx.student_name || '').toLowerCase().includes(search.toLowerCase())
  );

  const StatSkeleton = () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className="ska-card ska-card-pad"
          style={{ height: 92, background: 'var(--ska-surface-high)', animation: 'ska-pulse 1.4s ease-in-out infinite' }} />
      ))}
    </div>
  );

  return (
    <div className="ska-page-root">
      <div className="ska-page-head" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="ska-page-title">Institutional Financial Ledger</h1>
          <p className="ska-page-sub">{activeYear ? `${activeYear} · All Students` : 'All Students'}</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="ska-btn ska-btn--ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Ic name="picture_as_pdf" size="sm" /> Export PDF</button>
          <button className="ska-btn ska-btn--primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Ic name="payments" size="sm" /> Process Batch</button>
        </div>
      </div>

      {loading ? <StatSkeleton /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          <div className="ska-card ska-card-pad">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Total Fees Expected</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--ska-text)', fontFamily: 'var(--ska-font-headline)', lineHeight: 1.1 }}>{stats ? SLL(totalExpected) : '—'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', marginTop: 4 }}>{activeYear || 'All time'}</div>
          </div>
          <div className="ska-card ska-card-pad">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Total Collected</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--ska-green)', fontFamily: 'var(--ska-font-headline)', lineHeight: 1.1 }}>{stats ? SLL(stats.collected) : '—'}</div>
            <div className="ska-progress-track" style={{ marginTop: 10, marginBottom: 4 }}>
              <div className="ska-progress-fill" style={{ width: `${pct}%`, background: 'var(--ska-green)', transition: 'width 0.6s ease' }} />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{pct}% of target collected</div>
          </div>
          <div className="ska-card ska-card-pad">
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Outstanding</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--ska-error)', fontFamily: 'var(--ska-font-headline)', lineHeight: 1.1 }}>{stats ? SLL(stats.outstanding) : '—'}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', marginTop: 4 }}>Collection rate: <strong style={{ color: 'var(--ska-green)' }}>{stats?.collection_rate ?? '—'}%</strong></div>
          </div>
        </div>
      )}

      <div className="ska-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--ska-border)', flexWrap: 'wrap', gap: 12 }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--ska-text)', fontFamily: 'var(--ska-font-headline)', margin: 0 }}>Fee Records</h3>
          <div className="ska-search" style={{ width: 220 }}>
            <Ic name="search" />
            <input className="ska-search-input" type="text" placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--ska-border)' }}>
                {['Student', 'Description', 'Amount', 'Paid', 'Balance', 'Status', 'Due Date'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--ska-border)' }}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} style={{ padding: '12px 16px' }}>
                        <div style={{ height: 14, borderRadius: 4, background: 'var(--ska-surface-high)', animation: 'ska-pulse 1.4s ease-in-out infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div style={{ padding: '48px 32px', textAlign: 'center' }}>
                    <Ic name="payments" style={{ fontSize: 40, color: 'var(--ska-text-3)', display: 'block', margin: '0 auto 12px' }} />
                    <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text-3)' }}>
                      {search ? 'No records match your search.' : 'No fee records yet.'}
                    </p>
                    {!search && <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: 'var(--ska-text-3)' }}>Fee records will appear here once added.</p>}
                  </div>
                </td></tr>
              ) : filtered.map(tx => {
                const name = tx.student_name || 'Unknown';
                const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <tr key={tx.id} style={{ borderBottom: '1px solid var(--ska-border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--ska-primary-dim)', color: 'var(--ska-primary)', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{initials}</div>
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text)' }}>{name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8125rem', color: 'var(--ska-text-2)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description || tx.term || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 700, color: 'var(--ska-text)' }}>{SLL(tx.amount)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 700, color: 'var(--ska-green)' }}>{SLL(tx.amount_paid)}</td>
                    <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 700, color: tx.balance > 0 ? 'var(--ska-error)' : 'var(--ska-text-3)' }}>{SLL(tx.balance)}</td>
                    <td style={{ padding: '12px 16px' }}><TxStatusBadge status={tx.status} /></td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{tx.due_date || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   BURSAR AUDIT REQUEST PAGE
   Restricted banner, blurred preview, request form, history
   ============================================================ */

function AuditStatusPill({ status }) {
  const map = {
    approved: { label: 'Approved', bg: 'var(--ska-green-dim)',   color: 'var(--ska-green)' },
    denied:   { label: 'Denied',   bg: 'var(--ska-error-dim)',   color: 'var(--ska-error)' },
    expired:  { label: 'Expired',  bg: 'rgba(100,116,139,0.1)', color: '#64748B' },
  };
  const s = map[status] || map.expired;
  return <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>;
}

export function BursarAuditPage({ school }) {
  const [form, setForm] = useState({ reason: '', duration: '', authority: '', justification: '', acknowledged: false });
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [auditHistory] = useState([]);
  const histLoading    = false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.reason || !form.duration || !form.justification || !form.acknowledged) return;
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 900));
    setSubmitting(false);
    setSubmitted(true);
  };

  const totalAudits = auditHistory.length;
  const activeNow   = auditHistory.filter(a => a.status === 'approved').length;

  return (
    <div className="ska-page-root">
      <div className="ska-page-head" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="ska-page-title">Bursar Audit Request</h1>
          <p className="ska-page-sub">Restricted — Level 4 Access Required</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '20px 22px', borderRadius: 12, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Ic name="lock" style={{ color: 'var(--ska-error)', fontSize: 22 }} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--ska-error)', margin: '0 0 4px', fontFamily: 'var(--ska-font-headline)' }}>Financial Ledger Restricted</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', margin: 0, lineHeight: 1.6 }}>
                Full ledger access requires <strong style={{ color: 'var(--ska-text)' }}>Level 4 authorization</strong>. Submit a formal audit request with principal approval to view complete financial records.
              </p>
            </div>
          </div>
          <div className="ska-card" style={{ overflow: 'hidden', position: 'relative' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--ska-border)' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text-3)' }}>Financial Ledger Preview</span>
            </div>
            <div style={{ filter: 'blur(6px)', userSelect: 'none', pointerEvents: 'none', padding: 20, opacity: 0.7 }}>
              {[['Tuition Fee — SSS3A', 'Le 1,200,000', 'Verified'], ['Lab Fee', 'Le 120,000', 'Verified'], ['Library Fee', 'Le 45,000', 'Pending'], ['Activity Fee', 'Le 80,000', 'Partial']].map(([label, amount, stat]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--ska-border)', fontSize: '0.875rem', color: 'var(--ska-text)' }}>
                  <span>{label}</span><span style={{ fontWeight: 700 }}>{amount}</span><span>{stat}</span>
                </div>
              ))}
            </div>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.35)' }}>
              <Ic name="lock" style={{ fontSize: 36, color: '#fff', marginBottom: 8 }} />
              <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#fff', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Content Protected</span>
            </div>
          </div>
          {submitted ? (
            <div className="ska-card ska-card-pad" style={{ textAlign: 'center', padding: '40px 32px' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--ska-green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Ic name="check_circle" style={{ fontSize: 28, color: 'var(--ska-green)' }} />
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--ska-text)', fontFamily: 'var(--ska-font-headline)', marginBottom: 8 }}>Audit Request Submitted</h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', marginBottom: 20 }}>Your request has been securely forwarded to the approving authority. You will be notified once a decision is made.</p>
              <button className="ska-btn ska-btn--ghost" onClick={() => { setSubmitted(false); setForm({ reason: '', duration: '', authority: '', justification: '', acknowledged: false }); }}>Submit Another Request</button>
            </div>
          ) : (
            <div className="ska-card ska-card-pad">
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--ska-text)', fontFamily: 'var(--ska-font-headline)', marginBottom: 18 }}>Submit Audit Request</h3>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="ska-form-group">
                  <label className="ska-label">Reason for Audit</label>
                  <select className="ska-input" value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} required>
                    <option value="">Select a reason…</option>
                    {['Annual Financial Review', 'Term-End Reconciliation', 'Spot-Check Audit', 'Scholarship Fund Review', 'Regulatory Compliance', 'Other'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="ska-form-group">
                  <label className="ska-label">Access Duration</label>
                  <select className="ska-input" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} required>
                    <option value="">Select duration…</option>
                    {['24 hours', '3 days', '7 days', '14 days', '30 days', '60 days'].map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="ska-form-group">
                  <label className="ska-label">Approving Authority</label>
                  <input className="ska-input" type="text" placeholder="Principal name or Board Secretary…" value={form.authority} onChange={e => setForm(f => ({ ...f, authority: e.target.value }))} />
                </div>
                <div className="ska-form-group">
                  <label className="ska-label">Justification</label>
                  <textarea className="ska-input" rows={4} placeholder="Provide detailed justification for this audit request…" value={form.justification} onChange={e => setForm(f => ({ ...f, justification: e.target.value }))} required style={{ resize: 'vertical', minHeight: 100 }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.acknowledged} onChange={e => setForm(f => ({ ...f, acknowledged: e.target.checked }))} style={{ marginTop: 2, flexShrink: 0, accentColor: 'var(--ska-primary)' }} />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', lineHeight: 1.5 }}>I acknowledge that accessing financial records without authorization is a breach of institutional policy and may result in disciplinary action.</span>
                </label>
                <button type="submit" className="ska-btn ska-btn--primary" disabled={submitting || !form.reason || !form.duration || !form.justification || !form.acknowledged} style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <Ic name="security" size="sm" />
                  {submitting ? 'Submitting…' : 'Submit Secure Request'}
                </button>
              </form>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="ska-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--ska-border)' }}>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--ska-text)', fontFamily: 'var(--ska-font-headline)', margin: 0 }}>History of Requests</h3>
            </div>
            <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {histLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'var(--ska-surface-high)', flexShrink: 0, marginTop: 2, animation: 'ska-pulse 1.4s ease-in-out infinite' }} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ height: 13, borderRadius: 4, background: 'var(--ska-surface-high)', animation: 'ska-pulse 1.4s ease-in-out infinite', width: '70%' }} />
                      <div style={{ height: 11, borderRadius: 4, background: 'var(--ska-surface-high)', animation: 'ska-pulse 1.4s ease-in-out infinite', width: '50%' }} />
                    </div>
                  </div>
                ))
              ) : auditHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 8px' }}>
                  <Ic name="history" style={{ fontSize: 32, color: 'var(--ska-text-3)', display: 'block', margin: '0 auto 8px' }} />
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--ska-text-3)' }}>No audit requests yet.</p>
                </div>
              ) : auditHistory.map((entry, idx) => (
                <div key={entry.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                  {idx < auditHistory.length - 1 && (
                    <div style={{ position: 'absolute', left: 7, top: 18, bottom: -16, width: 2, background: 'var(--ska-border)' }} />
                  )}
                  <div style={{ width: 16, height: 16, borderRadius: '50%', background: entry.status === 'approved' ? 'var(--ska-green)' : entry.status === 'denied' ? 'var(--ska-error)' : 'var(--ska-border)', flexShrink: 0, marginTop: 2, zIndex: 1 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3, gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text)' }}>{entry.reason}</span>
                      <AuditStatusPill status={entry.status} />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', margin: '0 0 2px' }}>{entry.requestedAt} · {entry.duration}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', margin: 0 }}>By: {entry.approver || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', borderTop: '1px solid var(--ska-border)', padding: '12px 18px' }}>
              <div style={{ flex: 1, textAlign: 'center', borderRight: '1px solid var(--ska-border)' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--ska-text)', fontFamily: 'var(--ska-font-headline)' }}>{String(totalAudits).padStart(3, '0')}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Total Audits</div>
              </div>
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--ska-green)', fontFamily: 'var(--ska-font-headline)' }}>{String(activeNow).padStart(2, '0')}</div>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Active Now</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
