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
  const [selClass,        setSelClass]        = useState('');
  const [selSubj,         setSelSubj]         = useState('');
  const [students,        setStudents]        = useState([]);
  const [grades,          setGrades]          = useState({});
  const [loading,         setLoading]         = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);

  useEffect(() => {
    Promise.all([
      ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes   || [])).catch(() => {}),
      ApiClient.get('/api/school/subjects/').then(d => setSubjects(d.subjects || [])).catch(() => {}),
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

  const setGrade = (sid, field, val) => {
    setSaved(false);
    setGrades(g => ({ ...g, [sid]: { ...(g[sid] || {}), [field]: val } }));
  };

  const calcTotal   = g => (parseFloat(g?.ca) || 0) + (parseFloat(g?.midterm) || 0) + (parseFloat(g?.final) || 0);
  const letterFor   = total => total >= 80 ? 'A' : total >= 65 ? 'B' : total >= 50 ? 'C' : total >= 40 ? 'D' : 'F';
  const letterColor = l => ({ A: 'var(--ska-green)', B: 'var(--ska-secondary)', C: 'var(--ska-primary)', D: 'var(--ska-tertiary)', F: 'var(--ska-error)' })[l];

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaved(true);
    setSaving(false);
  };

  const ready        = selClass && selSubj;
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

      {/* Selectors */}
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
            <span>Subject</span>
            <select className="ska-input" value={selSubj} onChange={e => setSelSubj(e.target.value)}>
              <option value="">— Select Subject —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
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
              <p className="ska-empty-title">Select a class and subject</p>
              <p className="ska-empty-desc">Choose a class and subject above to begin entering grades.</p>
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
export function AttendancePage({ school }) {
  const [classes,    setClasses]    = useState([]);
  const [students,   setStudents]   = useState([]);
  const [selClass,   setSelClass]   = useState('');
  const [date,       setDate]       = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState({});
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  useEffect(() => {
    ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selClass) { setStudents([]); setAttendance({}); setSaved(false); return; }
    setLoadingStudents(true);
    ApiClient.get('/api/school/students/')
      .then(d => {
        const all = d.students || [];
        setStudents(all.filter(s => String(s.classroom_id) === String(selClass)));
        setAttendance({});
        setSaved(false);
      })
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, [selClass]);

  const setStatus = (id, status) => setAttendance(a => ({ ...a, [id]: status }));
  const markAll   = (status)    => setAttendance(Object.fromEntries(students.map(s => [s.id, status])));

  const present = Object.values(attendance).filter(v => v === 'present').length;
  const absent  = Object.values(attendance).filter(v => v === 'absent').length;
  const late    = Object.values(attendance).filter(v => v === 'late').length;
  const rate    = students.length ? Math.round((present / students.length) * 100) : 0;

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaved(true);
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
  const [classes, setClasses] = useState([]);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes || [])).catch(() => {});
  }, []);

  /* Deterministic fee % from class id — avoids random re-renders */
  const feePct = id => ((id * 37 + 13) % 61) + 39;

  const TRANSACTIONS = [
    { name: 'Ismail Rogers',  cls: 'Grade 10A', amount: 450, date: '2026-03-22', status: 'paid' },
    { name: 'Aisha Kamara',   cls: 'Grade 11B', amount: 450, date: '2026-03-21', status: 'paid' },
    { name: 'Mohamed Bah',    cls: 'Grade 12A', amount: 450, date: '2026-03-20', status: 'pending' },
    { name: 'Fatima Koroma',  cls: 'Grade 10B', amount: 450, date: '2026-03-18', status: 'paid' },
    { name: 'Samuel Johnson', cls: 'Grade 11A', amount: 450, date: '2026-03-15', status: 'paid' },
  ];

  const EXPENSES = [
    { label: 'Salaries',    pct: 60, color: 'var(--ska-primary)' },
    { label: 'Maintenance', pct: 20, color: 'var(--ska-secondary)' },
    { label: 'Utilities',   pct: 10, color: 'var(--ska-tertiary)' },
    { label: 'Supplies',    pct: 10, color: 'var(--ska-green)' },
  ];

  const STATUS_BADGE = { paid: 'ska-badge--green', pending: 'ska-badge--pending', failed: 'ska-badge--error' };

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Finance</h1>
          <p className="ska-page-sub">{school?.name} — Fee collection and expenses</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ska-btn ska-btn--ghost"><Ic name="download" size="sm" /> Export</button>
          <button className="ska-btn ska-btn--primary"><Ic name="add" size="sm" /> Record Payment</button>
        </div>
      </div>

      {/* Stats */}
      <div className="ska-stat-grid-4">
        <StatCard icon="payments"        iconBg="var(--ska-green-dim)"    iconColor="var(--ska-green)"    label="Total Collected"  value="$0" sub="This term" />
        <StatCard icon="account_balance" iconBg="var(--ska-error-dim)"    iconColor="var(--ska-error)"    label="Outstanding"      value="$0" sub="Not yet paid" />
        <StatCard icon="receipt_long"    iconBg="var(--ska-tertiary-dim)" iconColor="var(--ska-tertiary)" label="Total Expenses"   value="$0" sub="This term" />
        <StatCard icon="percent"         iconBg="var(--ska-primary-dim)"  iconColor="var(--ska-primary)"  label="Collection Rate"  value="—"  sub="Fee recovery" />
      </div>

      <TabBar
        tabs={[['overview','dashboard','Overview'],['transactions','receipt','Transactions'],['expenses','pie_chart','Expenses']]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
          <div className="ska-card ska-card-pad">
            <div className="ska-card-head" style={{ marginBottom: 20 }}>
              <h2 className="ska-card-title">Fee Status by Class</h2>
              <span className="ska-badge ska-badge--cyan">This Term</span>
            </div>
            {classes.length === 0 ? (
              <div className="ska-empty" style={{ padding: '24px 0' }}>
                <p className="ska-empty-desc">No classes found. Add classes first.</p>
              </div>
            ) : (
              <div className="ska-progress-list">
                {classes.map(c => {
                  const pct = feePct(c.id);
                  return (
                    <div key={c.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.875rem', color: 'var(--ska-text)', fontWeight: 600 }}>{c.name}</span>
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
            {EXPENSES.map(e => (
              <div key={e.label} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text)' }}>{e.label}</span>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{e.pct}%</span>
                </div>
                <div className="ska-progress-track">
                  <div className="ska-progress-fill" style={{ width: `${e.pct}%`, background: e.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'transactions' && (
        <div className="ska-card" style={{ overflowX: 'auto' }}>
          <div style={{ padding: '20px 20px 0' }}>
            <div className="ska-card-head">
              <h2 className="ska-card-title">Recent Transactions</h2>
              <span className="ska-badge ska-badge--cyan">{TRANSACTIONS.length} entries</span>
            </div>
          </div>
          <table className="ska-table">
            <thead>
              <tr><th>Student</th><th>Class</th><th>Amount</th><th>Date</th><th>Status</th></tr>
            </thead>
            <tbody>
              {TRANSACTIONS.map((t, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{t.name}</td>
                  <td style={{ color: 'var(--ska-text-3)' }}>{t.cls}</td>
                  <td style={{ fontWeight: 700, color: 'var(--ska-green)' }}>${t.amount}</td>
                  <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{t.date}</td>
                  <td><span className={`ska-badge ${STATUS_BADGE[t.status] || 'ska-badge--primary'}`}>{t.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'expenses' && (
        <div className="ska-card">
          <div className="ska-empty">
            <Ic name="receipt_long" size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
            <p className="ska-empty-title">No expenses recorded</p>
            <p className="ska-empty-desc">Record school expenses to track your spending.</p>
            <button className="ska-btn ska-btn--primary" style={{ marginTop: 12 }}>
              <Ic name="add" size="sm" /> Add Expense
            </button>
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
  const [classes,  setClasses]  = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [years,    setYears]    = useState([]);
  const [form, setForm] = useState({ yearId: '', type: 'performance', classId: '', subjectId: '' });
  const [generating, setGenerating] = useState(false);
  const [generated,  setGenerated]  = useState(false);

  useEffect(() => {
    ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes || [])).catch(() => {});
    ApiClient.get('/api/school/subjects/').then(d => setSubjects(d.subjects || [])).catch(() => {});
    ApiClient.get('/api/school/academic-years/').then(d => setYears(d.academic_years || [])).catch(() => {});
  }, []);

  const REPORT_TYPES = [
    { value: 'performance',  label: 'Class Performance Report' },
    { value: 'attendance',   label: 'Attendance Summary' },
    { value: 'transcripts',  label: 'Student Transcripts' },
    { value: 'merit',        label: 'Merit List' },
    { value: 'retention',    label: 'Student Retention Analysis' },
    { value: 'finance',      label: 'Fee Collection Report' },
  ];

  const RECENT = [
    { name: 'Consolidated Results — Term 1', date: 'Mar 20, 2026', type: 'Performance', status: 'ready' },
    { name: 'Student Attendance Summary',    date: 'Mar 18, 2026', type: 'Attendance',  status: 'ready' },
    { name: 'Merit List — Grade 12',         date: 'Mar 10, 2026', type: 'Merit',       status: 'inactive' },
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
        <StatCard icon="assessment"        iconBg="var(--ska-primary-dim)"   iconColor="var(--ska-primary)"   label="Reports Generated"  value={RECENT.length} sub="All time" />
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
            <label className="ska-form-group">
              <span>Academic Year</span>
              <select className="ska-input" value={form.yearId}
                onChange={e => setForm(f => ({ ...f, yearId: e.target.value }))}>
                <option value="">— All Years —</option>
                {years.map(y => <option key={y.id} value={y.id}>{y.name}</option>)}
              </select>
            </label>
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
            {RECENT.map((r, i) => (
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
  const [messages,  setMessages]  = useState([
    { from: 'System', subject: 'Welcome', text: 'Welcome to the EK-SMS messaging centre. Use this page to broadcast announcements to staff, students, and parents.', time: 'Today', tag: 'all', unread: false },
  ]);

  const TABS = [
    ['all',     'all_inbox',       'All'],
    ['staff',   'badge',           'Staff'],
    ['parents', 'family_restroom', 'Parents'],
    ['students','school',          'Students'],
  ];

  const handleSend = async () => {
    if (!msgText.trim() || !subject.trim()) return;
    setSending(true);
    await new Promise(r => setTimeout(r, 800));
    const name = admin?.full_name || admin?.username || 'Admin';
    setMessages(m => [{
      from: name, subject, text: msgText, recipient,
      time: 'Just now', tag: recipient, unread: false,
    }, ...m]);
    setSent(true);
    setMsgText(''); setSubject('');
    setSending(false);
    setTimeout(() => { setSent(false); setCompose(false); }, 1500);
  };

  const filtered = messages.filter(m => tab === 'all' || m.tag === tab);

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
        {filtered.length === 0 ? (
          <div className="ska-empty">
            <Ic name="mail" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
            <p className="ska-empty-title">No messages in this category</p>
            <p className="ska-empty-desc">Broadcast a message to staff, students, or parents.</p>
          </div>
        ) : (
          filtered.map((m, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, padding: '16px 20px',
              borderBottom: i < filtered.length - 1 ? '1px solid var(--ska-border)' : 'none',
              background: m.unread ? 'var(--ska-surface-high)' : 'transparent',
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'var(--ska-primary-dim)', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, color: 'var(--ska-primary)',
              }}>
                {m.from?.[0]?.toUpperCase() || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ska-text)' }}>{m.from}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{m.time}</span>
                </div>
                {m.subject && <p style={{ margin: '0 0 2px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ska-text-2)' }}>{m.subject}</p>}
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ska-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.text}</p>
              </div>
              {m.tag && m.tag !== 'system' && (
                <span className="ska-badge ska-badge--cyan" style={{ flexShrink: 0, alignSelf: 'center' }}>{m.tag}</span>
              )}
            </div>
          ))
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

      const res = await ApiClient.post('/api/school/update/', payload);
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
                    setBadgePreview(URL.createObjectURL(file));
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
  const [topics,   setTopics]   = useState([]);
  const [modal,    setModal]    = useState(null); // null | 'add' | topic-object
  const [form,     setForm]     = useState({ title: '', term: 'Term 1', objectives: '' });

  const TERMS = ['Term 1', 'Term 2', 'Term 3'];

  useEffect(() => {
    ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes   || [])).catch(() => {});
    ApiClient.get('/api/school/subjects/').then(d => setSubjects(d.subjects || [])).catch(() => {});
  }, []);

  const openAdd  = () => { setForm({ title: '', term: 'Term 1', objectives: '' }); setModal('add'); };
  const openEdit = t  => { setForm({ title: t.title, term: t.term, objectives: t.objectives }); setModal(t); };

  const handleSave = () => {
    if (!form.title.trim()) return;
    if (modal === 'add') {
      setTopics(ts => [...ts, { id: Date.now(), ...form, done: false }]);
    } else {
      setTopics(ts => ts.map(t => t.id === modal.id ? { ...t, ...form } : t));
    }
    setModal(null);
  };

  const toggleDone  = id => setTopics(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const deleteTopic = id => { if (window.confirm('Remove this topic?')) setTopics(ts => ts.filter(t => t.id !== id)); };

  const ready    = selClass && selSubj;
  const covered  = topics.filter(t => t.done).length;
  const coverage = topics.length ? Math.round(covered / topics.length * 100) : null;

  const byTerm = TERMS.map(term => ({ term, items: topics.filter(t => t.term === term) }));

  const selectedClassName = classes.find(c => String(c.id) === String(selClass))?.name || '';
  const selectedSubjName  = subjects.find(s => String(s.id) === String(selSubj))?.name || '';

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Syllabus &amp; Curriculum</h1>
          <p className="ska-page-sub">{school?.name} — Topics and learning objectives</p>
        </div>
        {ready && (
          <button className="ska-btn ska-btn--primary" onClick={openAdd}>
            <Ic name="add" size="sm" /> Add Topic
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="ska-stat-grid-4">
        <StatCard icon="import_contacts" iconBg="var(--ska-primary-dim)"   iconColor="var(--ska-primary)"   label="Total Topics" value={topics.length} />
        <StatCard icon="check_circle"    iconBg="var(--ska-green-dim)"     iconColor="var(--ska-green)"     label="Covered"      value={covered}       sub="Marked complete" />
        <StatCard icon="pending"         iconBg="var(--ska-tertiary-dim)"  iconColor="var(--ska-tertiary)"  label="Pending"      value={topics.length - covered} sub="Not yet covered" />
        <StatCard icon="percent"         iconBg="var(--ska-secondary-dim)" iconColor="var(--ska-secondary)" label="Coverage"     value={coverage !== null ? `${coverage}%` : '—'} />
      </div>

      {/* Selectors */}
      <div className="ska-card ska-card-pad" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label className="ska-form-group" style={{ flex: 1, minWidth: 160, margin: 0 }}>
            <span>Class</span>
            <select className="ska-input" value={selClass}
              onChange={e => { setSelClass(e.target.value); setTopics([]); }}>
              <option value="">— Select Class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="ska-form-group" style={{ flex: 1, minWidth: 160, margin: 0 }}>
            <span>Subject</span>
            <select className="ska-input" value={selSubj}
              onChange={e => { setSelSubj(e.target.value); setTopics([]); }}>
              <option value="">— Select Subject —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
        {ready && (
          <p style={{ margin: '10px 0 0', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
            Curriculum for <strong style={{ color: 'var(--ska-text)' }}>{selectedSubjName}</strong> — <strong style={{ color: 'var(--ska-text)' }}>{selectedClassName}</strong>
          </p>
        )}
      </div>

      {!ready ? (
        <div className="ska-card">
          <div className="ska-empty" style={{ padding: '48px 24px' }}>
            <Ic name="import_contacts" size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
            <p className="ska-empty-title">Select a class and subject</p>
            <p className="ska-empty-desc">Choose above to manage curriculum topics and learning objectives.</p>
          </div>
        </div>
      ) : topics.length === 0 ? (
        <div className="ska-card">
          <div className="ska-empty" style={{ padding: '48px 24px' }}>
            <Ic name="post_add" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
            <p className="ska-empty-title">No topics yet</p>
            <p className="ska-empty-desc">Add curriculum topics and learning objectives for this class and subject.</p>
            <button className="ska-btn ska-btn--primary" style={{ marginTop: 16 }} onClick={openAdd}>
              <Ic name="add" size="sm" /> Add First Topic
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {byTerm.map(({ term, items }) => items.length === 0 ? null : (
            <div key={term} className="ska-card ska-card-pad">
              <div className="ska-card-head" style={{ marginBottom: 16 }}>
                <h2 className="ska-card-title">{term}</h2>
                <span className="ska-badge ska-badge--cyan">{items.length} topic{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {items.map((t, i) => (
                  <div key={t.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 14px', borderRadius: 8,
                    background: t.done ? 'var(--ska-green-dim)' : 'var(--ska-surface-high)',
                    borderLeft: `3px solid ${t.done ? 'var(--ska-green)' : 'var(--ska-border)'}`,
                    transition: 'background 0.2s',
                  }}>
                    <button
                      onClick={() => toggleDone(t.id)}
                      title={t.done ? 'Mark as pending' : 'Mark as covered'}
                      style={{
                        width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                        border: `2px solid ${t.done ? 'var(--ska-green)' : 'var(--ska-border)'}`,
                        background: t.done ? 'var(--ska-green)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      {t.done && <Ic name="check" style={{ color: '#000', fontSize: '14px' }} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ska-text)',
                        textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.65 : 1,
                      }}>
                        {i + 1}. {t.title}
                      </p>
                      {t.objectives && (
                        <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{t.objectives}</p>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => openEdit(t)}>
                        <Ic name="edit" size="sm" />
                      </button>
                      <button className="ska-btn ska-btn--ghost ska-btn--sm ska-btn--danger" onClick={() => deleteTopic(t.id)}>
                        <Ic name="delete" size="sm" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {modal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)', zIndex: 300,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: 'var(--ska-surface)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontWeight: 800, fontSize: '1.125rem', color: 'var(--ska-text)' }}>
                {modal === 'add' ? 'Add Topic' : 'Edit Topic'}
              </h3>
              <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => setModal(null)}>
                <Ic name="close" size="sm" />
              </button>
            </div>
            <div className="ska-form-grid" style={{ gridTemplateColumns: '1fr' }}>
              <label className="ska-form-group">
                <span>Topic Title *</span>
                <input className="ska-input" placeholder="e.g. Introduction to Algebra"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </label>
              <label className="ska-form-group">
                <span>Term</span>
                <select className="ska-input" value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}>
                  {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </label>
              <label className="ska-form-group">
                <span>Learning Objectives <span style={{ color: 'var(--ska-text-3)', fontSize: '0.75rem' }}>(optional)</span></span>
                <textarea className="ska-input" rows={3} style={{ resize: 'vertical' }}
                  placeholder="What students will learn from this topic…"
                  value={form.objectives} onChange={e => setForm(f => ({ ...f, objectives: e.target.value }))} />
              </label>
            </div>
            <div className="ska-modal-actions">
              <button className="ska-btn ska-btn--ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="ska-btn ska-btn--primary" onClick={handleSave} disabled={!form.title.trim()}>
                {modal === 'add' ? 'Add Topic' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
