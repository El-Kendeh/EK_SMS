import React, { useState, useEffect, useCallback } from 'react';
import './TeacherDashboard.css';
import ApiClient from '../../api/client';

/* ── Helpers ── */
const today = () => new Date().toISOString().split('T')[0];
const mkInitials = (name = '') => name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'T';
const scoreClass = s => s >= 70 ? 'td-score--high' : s >= 50 ? 'td-score--mid' : 'td-score--low';
const gradeMax = { ca: 20, midterm: 30, final_exam: 50 };

/* ── Icon component ── */
function Ic({ n, size = '', ...rest }) {
  return <span className={`td-icon${size ? ` td-icon--${size}` : ''}`} {...rest}>{n}</span>;
}

/* ── Sidebar Nav ── */
const NAV = [
  { id: 'dashboard',    label: 'Dashboard',         icon: 'dashboard' },
  { id: 'classes',      label: 'My Classes',         icon: 'school' },
  { id: 'timetable',    label: 'Timetable',          icon: 'calendar_today' },
  { id: 'gradebook',    label: 'Gradebook',          icon: 'menu_book' },
  { id: 'attendance',   label: 'Attendance',         icon: 'how_to_reg' },
  { id: 'performance',  label: 'Performance',        icon: 'trending_up' },
  { id: 'settings',     label: 'Settings',           icon: 'settings' },
];
const MOBILE_NAV = ['dashboard', 'classes', 'gradebook', 'attendance', 'settings'];

/* ══════════════════════════════════════════════
   DASHBOARD PAGE
══════════════════════════════════════════════ */
function DashboardPage({ teacher, classes, onNavigate }) {
  const school = teacher?.school_name || '';
  const totalStudents = classes.reduce((s, c) => s + (c.student_count || 0), 0);
  const totalPeriods = classes.reduce((s, c) => s + (c.periods || 1), 0);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Simulated today schedule from classes (first 4)
  const schedule = classes.slice(0, 5).map((c, i) => ({
    time: `${8 + i * 1}:00 - ${9 + i * 1}:00`,
    subject: c.subject_name || c.subject,
    room: c.classroom_name || `Room ${i + 1}`,
    status: i === 0 ? 'now' : i < 1 ? 'past' : 'upcoming',
  }));

  return (
    <div className="td-page">
      <div style={{ marginBottom: 24 }}>
        <h1 className="td-page-title">{greeting}, {teacher?.first_name || 'Teacher'}</h1>
        <p className="td-page-sub">{school} · {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats row */}
      <div className="td-stats-grid">
        <div className="td-stat">
          <div className="td-stat__glow" />
          <div className="td-stat__label">My Classes</div>
          <div className="td-stat__value">{String(classes.length).padStart(2, '0')}</div>
          <div className="td-stat__hint"><Ic n="trending_up" size="sm" />Active this term</div>
        </div>
        <div className="td-stat">
          <div className="td-stat__glow" style={{ background: 'rgba(0,218,243,0.06)' }} />
          <div className="td-stat__label">Total Students</div>
          <div className="td-stat__value">{totalStudents}</div>
          <div className="td-stat__hint" style={{ color: 'var(--td-tertiary)' }}><Ic n="group" size="sm" />Across all classes</div>
        </div>
        <div className="td-stat">
          <div className="td-stat__glow" style={{ background: 'rgba(249,188,96,0.06)' }} />
          <div className="td-stat__label">Periods/Week</div>
          <div className="td-stat__value">{totalPeriods}</div>
          <div className="td-stat__hint warn"><Ic n="schedule" size="sm" />Weekly load</div>
        </div>
        <div className="td-stat">
          <div className="td-stat__glow" style={{ background: 'rgba(108,224,176,0.06)' }} />
          <div className="td-stat__label">Subjects</div>
          <div className="td-stat__value">{[...new Set(classes.map(c => c.subject_name || c.subject))].length}</div>
          <div className="td-stat__hint success"><Ic n="check_circle" size="sm" />Assigned</div>
        </div>
      </div>

      <div className="td-grid-2">
        {/* Today's Schedule */}
        <div className="td-card td-card--p">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h2 className="td-card__title">Today's Schedule</h2>
            <span className="td-badge td-badge--primary">{schedule.length} classes</span>
          </div>
          {schedule.length === 0 ? (
            <p style={{ color: 'var(--td-text-3)', fontSize: '0.875rem', textAlign: 'center', padding: '20px 0' }}>No classes scheduled for today</p>
          ) : schedule.map((s, i) => (
            <div className="td-schedule-item" key={i}>
              <div className="td-schedule-item__time">{s.time.split(' - ')[0]}</div>
              <div className={`td-schedule-item__dot ${s.status}`} />
              <div>
                <div className="td-schedule-item__label">{s.subject}</div>
                <div className="td-schedule-item__meta">{s.room}</div>
              </div>
              {s.status === 'now' && <span className="td-badge td-badge--success" style={{ marginLeft: 'auto' }}>Now</span>}
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="td-card td-card--p">
          <h2 className="td-card__title" style={{ marginBottom: 16 }}>Quick Actions</h2>
          {[
            { icon: 'how_to_reg', label: 'Mark Attendance', sub: 'Record today\'s attendance', page: 'attendance', color: 'var(--td-success)' },
            { icon: 'menu_book',  label: 'Enter Grades',    sub: 'Update gradebook',           page: 'gradebook',  color: 'var(--td-primary)' },
            { icon: 'school',     label: 'View Classes',    sub: 'Manage your classes',        page: 'classes',    color: 'var(--td-tertiary)' },
            { icon: 'trending_up',label: 'Performance',     sub: 'Student analytics',          page: 'performance',color: 'var(--td-warn)' },
          ].map(a => (
            <button key={a.page} onClick={() => onNavigate(a.page)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '10px 14px', borderRadius: 8, background: 'var(--td-surface-high)', border: 'none', cursor: 'pointer', marginBottom: 8, transition: 'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--td-surface-top)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--td-surface-high)'}
            >
              <div style={{ width: 36, height: 36, borderRadius: 8, background: `${a.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ic n={a.icon} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--td-text)' }}>{a.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--td-text-3)' }}>{a.sub}</div>
              </div>
              <Ic n="chevron_right" style={{ marginLeft: 'auto', color: 'var(--td-text-3)' }} />
            </button>
          ))}
        </div>
      </div>

      {/* My Classes Overview */}
      {classes.length > 0 && (
        <div className="td-card">
          <div className="td-card__header">
            <h2 className="td-card__title">My Classes This Term</h2>
            <button className="td-btn td-btn--ghost td-btn--sm" onClick={() => onNavigate('classes')}>View all</button>
          </div>
          <div style={{ padding: '0 20px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {classes.slice(0, 6).map((c, i) => (
              <div key={i} style={{ padding: '14px', background: 'var(--td-surface-high)', borderRadius: 8, border: '1px solid var(--td-border-dim)' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--td-primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                  {c.subject_name || c.subject}
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--td-text)', marginBottom: 4 }}>
                  {c.classroom_name || `Class ${i + 1}`}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--td-text-3)' }}>{c.student_count || 0} students</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MY CLASSES PAGE
══════════════════════════════════════════════ */
function ClassesPage({ classes }) {
  const [search, setSearch] = useState('');
  const filtered = classes.filter(c =>
    (c.classroom_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.subject_name || c.subject || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="td-page">
      <h1 className="td-page-title">My Classes</h1>
      <p className="td-page-sub">{classes.length} class assignment{classes.length !== 1 ? 's' : ''} this term</p>

      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', maxWidth: 340 }}>
          <Ic n="search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--td-text-3)' }} />
          <input className="td-input" placeholder="Search classes..." value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 40 }} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--td-text-3)' }}>
          <Ic n="school" size="lg" />
          <p style={{ marginTop: 8 }}>No classes found</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {filtered.map((c, i) => (
            <div className="td-class-card" key={i}>
              <div className="td-class-card__subject">{c.subject_name || c.subject}</div>
              <div className="td-class-card__name">{c.classroom_name || `Class ${i + 1}`}</div>
              <div className="td-class-card__meta">Subject ID #{c.subject_id} · Class ID #{c.classroom_id}</div>
              <div className="td-class-card__footer">
                <span className="td-chip"><Ic n="group" />{c.student_count || 0} students</span>
                <span className="td-chip"><Ic n="schedule" />{c.periods || 1} period{(c.periods || 1) !== 1 ? 's' : ''}/wk</span>
                <span className="td-badge td-badge--primary" style={{ marginLeft: 'auto' }}>Active</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   GRADEBOOK PAGE
══════════════════════════════════════════════ */
function GradebookPage({ classes }) {
  const [selClass, setSelClass] = useState('');
  const [students, setStudents] = useState([]);
  const [grades,   setGrades]   = useState({});
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [banner,   setBanner]   = useState(null);

  const selectedClass = classes.find(c => `${c.classroom_id}-${c.subject_id}` === selClass);

  const fetchGrades = useCallback(async (classroomId, subjectId) => {
    setLoading(true);
    try {
      const data = await ApiClient.get(`/api/teacher/gradebook/?classroom_id=${classroomId}&subject_id=${subjectId}`);
      const map = {};
      (data.entries || []).forEach(e => {
        map[e.student_id] = { ca: e.ca ?? '', midterm: e.midterm ?? '', final_exam: e.final_exam ?? '' };
      });
      setStudents(data.students || []);
      setGrades(map);
    } catch (e) {
      setBanner({ type: 'error', text: e.message });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!selClass) return;
    const c = classes.find(x => `${x.classroom_id}-${x.subject_id}` === selClass);
    if (c) fetchGrades(c.classroom_id, c.subject_id);
  }, [selClass, classes, fetchGrades]);

  const setGrade = (sid, field, val) => {
    const max = gradeMax[field];
    const num = val === '' ? '' : Math.min(max, Math.max(0, Number(val)));
    setGrades(g => ({ ...g, [sid]: { ...(g[sid] || {}), [field]: num } }));
  };

  const handleSave = async () => {
    if (!selectedClass) return;
    setSaving(true); setBanner(null);
    try {
      const entries = students.map(s => ({
        student_id: s.id,
        subject_id: selectedClass.subject_id,
        ...grades[s.id],
      }));
      await ApiClient.post('/api/teacher/gradebook/', {
        classroom_id: selectedClass.classroom_id,
        subject_id: selectedClass.subject_id,
        entries,
      });
      setBanner({ type: 'success', text: 'Grades saved successfully.' });
    } catch (e) {
      setBanner({ type: 'error', text: e.message || 'Failed to save grades.' });
    } finally { setSaving(false); }
  };

  const total = (sid) => {
    const g = grades[sid] || {};
    const ca = Number(g.ca || 0), mt = Number(g.midterm || 0), fi = Number(g.final_exam || 0);
    return ca + mt + fi;
  };

  return (
    <div className="td-page">
      <h1 className="td-page-title">Gradebook</h1>
      <p className="td-page-sub">Enter and manage student grades</p>

      {banner && (
        <div className={`td-banner td-banner--${banner.type === 'error' ? 'error' : 'success'}`}>
          <Ic n={banner.type === 'error' ? 'error' : 'check_circle'} size="sm" />{banner.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 24 }}>
        <div style={{ flex: '1 1 280px' }}>
          <label className="td-label">Select Class & Subject</label>
          <select className="td-select" value={selClass} onChange={e => setSelClass(e.target.value)}>
            <option value="">-- Select a class --</option>
            {classes.map((c, i) => (
              <option key={i} value={`${c.classroom_id}-${c.subject_id}`}>
                {c.classroom_name} — {c.subject_name || c.subject}
              </option>
            ))}
          </select>
        </div>
        {selClass && (
          <button className="td-btn td-btn--primary" onClick={handleSave} disabled={saving || loading}>
            <Ic n="save" size="sm" />{saving ? 'Saving…' : 'Save Grades'}
          </button>
        )}
      </div>

      {!selClass && (
        <div className="td-card td-card--p" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--td-text-3)' }}>
          <Ic n="menu_book" size="lg" />
          <p style={{ marginTop: 8 }}>Select a class to view and edit grades</p>
        </div>
      )}

      {selClass && loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--td-text-3)' }}>
          <div className="td-spinner" style={{ margin: '0 auto 12px' }} />
          Loading gradebook…
        </div>
      )}

      {selClass && !loading && (
        <div className="td-card">
          <div className="td-card__header">
            <div>
              <h2 className="td-card__title">{selectedClass?.classroom_name} — {selectedClass?.subject_name}</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--td-text-3)' }}>{students.length} students · CA(20) + MidTerm(30) + Final(50) = 100</p>
            </div>
          </div>
          <div className="td-table-wrap" style={{ padding: '0 0 20px' }}>
            <table className="td-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>CA /20</th>
                  <th>MidTerm /30</th>
                  <th>Final /50</th>
                  <th>Total /100</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--td-text-3)' }}>No students in this class</td></tr>
                ) : students.map((s, i) => {
                  const t = total(s.id);
                  const g = grades[s.id] || {};
                  const letter = t >= 80 ? 'A' : t >= 70 ? 'B' : t >= 60 ? 'C' : t >= 50 ? 'D' : 'F';
                  return (
                    <tr key={s.id}>
                      <td style={{ color: 'var(--td-text-3)' }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--td-text)' }}>{s.first_name} {s.last_name}</div>
                        {s.student_id && <div style={{ fontSize: '0.75rem', color: 'var(--td-text-3)' }}>{s.student_id}</div>}
                      </td>
                      <td>
                        <input className="td-grade-input" type="number" min="0" max="20"
                          value={g.ca ?? ''} placeholder="—"
                          onChange={e => setGrade(s.id, 'ca', e.target.value)} />
                      </td>
                      <td>
                        <input className="td-grade-input" type="number" min="0" max="30"
                          value={g.midterm ?? ''} placeholder="—"
                          onChange={e => setGrade(s.id, 'midterm', e.target.value)} />
                      </td>
                      <td>
                        <input className="td-grade-input" type="number" min="0" max="50"
                          value={g.final_exam ?? ''} placeholder="—"
                          onChange={e => setGrade(s.id, 'final_exam', e.target.value)} />
                      </td>
                      <td>
                        <span className={scoreClass(t)} style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1rem' }}>{t || '—'}</span>
                      </td>
                      <td>
                        <span className={`td-badge ${t >= 70 ? 'td-badge--success' : t >= 50 ? 'td-badge--warn' : 'td-badge--error'}`}>{letter}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   ATTENDANCE PAGE
══════════════════════════════════════════════ */
const ATT_STATUSES = ['present', 'absent', 'late', 'excused'];

function AttendancePage({ classes }) {
  const [selClass,   setSelClass]   = useState('');
  const [date,       setDate]       = useState(today());
  const [students,   setStudents]   = useState([]);
  const [records,    setRecords]    = useState({});
  const [loading,    setLoading]    = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [banner,     setBanner]     = useState(null);

  const selectedClass = classes.find(c => String(c.classroom_id) === selClass);

  const fetchData = useCallback(async (classroomId, d) => {
    setLoading(true); setBanner(null);
    try {
      const [studData, attData] = await Promise.all([
        ApiClient.get(`/api/teacher/students/?classroom_id=${classroomId}`),
        ApiClient.get(`/api/teacher/attendance/?classroom_id=${classroomId}&date=${d}`),
      ]);
      const map = {};
      (attData.records || []).forEach(r => { map[r.student_id] = r.status; });
      const stList = studData.students || studData || [];
      // Default to 'present' for unmarked
      stList.forEach(s => { if (!map[s.id]) map[s.id] = 'present'; });
      setStudents(stList);
      setRecords(map);
    } catch (e) {
      setBanner({ type: 'error', text: e.message });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (selClass) fetchData(selClass, date);
  }, [selClass, date, fetchData]);

  const handleSave = async () => {
    if (!selClass) return;
    setSaving(true); setBanner(null);
    try {
      await ApiClient.post('/api/teacher/attendance/', {
        classroom_id: selClass,
        date,
        records: students.map(s => ({ student_id: s.id, status: records[s.id] || 'present' })),
      });
      setBanner({ type: 'success', text: 'Attendance saved successfully.' });
    } catch (e) {
      setBanner({ type: 'error', text: e.message || 'Failed to save attendance.' });
    } finally { setSaving(false); }
  };

  const markAll = (status) => {
    const map = {};
    students.forEach(s => { map[s.id] = status; });
    setRecords(map);
  };

  const counts = ATT_STATUSES.reduce((acc, s) => {
    acc[s] = Object.values(records).filter(v => v === s).length;
    return acc;
  }, {});

  return (
    <div className="td-page">
      <h1 className="td-page-title">Attendance</h1>
      <p className="td-page-sub">Record daily attendance for your classes</p>

      {banner && (
        <div className={`td-banner td-banner--${banner.type === 'error' ? 'error' : 'success'}`}>
          <Ic n={banner.type === 'error' ? 'error' : 'check_circle'} size="sm" />{banner.text}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 20 }}>
        <div style={{ flex: '1 1 220px' }}>
          <label className="td-label">Class</label>
          <select className="td-select" value={selClass} onChange={e => setSelClass(e.target.value)}>
            <option value="">-- Select class --</option>
            {[...new Map(classes.map(c => [c.classroom_id, c])).values()].map((c, i) => (
              <option key={i} value={c.classroom_id}>{c.classroom_name}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: '1 1 160px' }}>
          <label className="td-label">Date</label>
          <input className="td-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        {selClass && students.length > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="td-btn td-btn--ghost td-btn--sm" onClick={() => markAll('present')}>All Present</button>
            <button className="td-btn td-btn--ghost td-btn--sm" onClick={() => markAll('absent')}>All Absent</button>
          </div>
        )}
        {selClass && students.length > 0 && (
          <button className="td-btn td-btn--primary" onClick={handleSave} disabled={saving}>
            <Ic n="save" size="sm" />{saving ? 'Saving…' : 'Save'}
          </button>
        )}
      </div>

      {selClass && students.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          {[['present','success'],['absent','error'],['late','warn'],['excused','primary']].map(([s, t]) => (
            <span key={s} className={`td-badge td-badge--${t}`}>
              {s.charAt(0).toUpperCase() + s.slice(1)}: {counts[s] || 0}
            </span>
          ))}
        </div>
      )}

      {!selClass && (
        <div className="td-card td-card--p" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--td-text-3)' }}>
          <Ic n="how_to_reg" size="lg" />
          <p style={{ marginTop: 8 }}>Select a class to mark attendance</p>
        </div>
      )}

      {selClass && loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--td-text-3)' }}>
          <div className="td-spinner" style={{ margin: '0 auto 12px' }} />Loading…
        </div>
      )}

      {selClass && !loading && students.length > 0 && (
        <div className="td-card">
          <div className="td-card__header">
            <h2 className="td-card__title">{selectedClass?.classroom_name}</h2>
            <span className="td-badge td-badge--primary">{students.length} students</span>
          </div>
          <div className="td-table-wrap" style={{ padding: '0 0 20px' }}>
            <table className="td-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--td-text-3)' }}>{i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--td-text)' }}>{s.first_name} {s.last_name}</div>
                      {s.student_id && <div style={{ fontSize: '0.75rem', color: 'var(--td-text-3)' }}>{s.student_id}</div>}
                    </td>
                    <td>
                      <div className="td-att-toggle">
                        {ATT_STATUSES.map(st => (
                          <button key={st}
                            className={`td-att-btn ${st} ${records[s.id] === st ? 'active' : ''}`}
                            onClick={() => setRecords(r => ({ ...r, [s.id]: st }))}>
                            {st.charAt(0).toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selClass && !loading && students.length === 0 && (
        <div className="td-card td-card--p" style={{ textAlign: 'center', color: 'var(--td-text-3)', padding: '40px 20px' }}>
          No students found for this class.
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   TIMETABLE PAGE
══════════════════════════════════════════════ */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const PERIODS = ['7:00', '8:00', '9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];

function TimetablePage({ classes }) {
  // Build a simple visual timetable from classes data
  // Since we don't have actual period-day info from backend, show a weekly overview
  return (
    <div className="td-page">
      <h1 className="td-page-title">Timetable</h1>
      <p className="td-page-sub">Your weekly teaching schedule</p>

      <div className="td-card td-card--p" style={{ marginBottom: 20 }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--td-text-2)', margin: 0 }}>
          <Ic n="info" size="sm" style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Detailed period scheduling is managed by your school administrator. Below is an overview of your assigned classes.
        </p>
      </div>

      <div className="td-card">
        <div className="td-card__header">
          <h2 className="td-card__title">Assigned Classes Overview</h2>
          <span className="td-badge td-badge--primary">{classes.length} assignments</span>
        </div>
        <div className="td-table-wrap" style={{ padding: '0 0 20px' }}>
          <table className="td-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Class</th>
                <th>Subject</th>
                <th>Students</th>
                <th>Periods/Week</th>
              </tr>
            </thead>
            <tbody>
              {classes.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--td-text-3)' }}>No classes assigned</td></tr>
              ) : classes.map((c, i) => (
                <tr key={i}>
                  <td style={{ color: 'var(--td-text-3)' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600, color: 'var(--td-text)' }}>{c.classroom_name}</td>
                  <td><span className="td-badge td-badge--primary">{c.subject_name || c.subject}</span></td>
                  <td>{c.student_count || 0}</td>
                  <td>{c.periods || 1}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual weekly grid placeholder */}
      <div className="td-card" style={{ marginTop: 20 }}>
        <div className="td-card__header">
          <h2 className="td-card__title">Weekly Grid</h2>
          <span className="td-badge td-badge--primary">This week</span>
        </div>
        <div style={{ padding: '0 20px 20px', overflowX: 'auto' }}>
          <div className="td-tt-grid">
            <div className="td-tt-header" />
            {DAYS.map(d => <div className="td-tt-header" key={d}>{d}</div>)}
            {PERIODS.map((p, pi) => (
              <React.Fragment key={p}>
                <div className="td-tt-time">{p}</div>
                {DAYS.map((d, di) => {
                  const cls = classes[((pi * 5 + di) % Math.max(classes.length, 1))];
                  const show = cls && ((pi + di) % 3 === 0 || (pi * 3 + di) % 5 === 0);
                  return (
                    <div className={`td-tt-slot ${show ? 'active' : 'td-tt-slot--empty'}`} key={d}>
                      {show && cls && (
                        <>
                          <div className="td-tt-slot__subject">{(cls.subject_name || cls.subject || '').slice(0, 10)}</div>
                          <div className="td-tt-slot__class">{(cls.classroom_name || '').slice(0, 8)}</div>
                        </>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   PERFORMANCE PAGE
══════════════════════════════════════════════ */
function PerformancePage({ classes }) {
  const [selClass, setSelClass] = useState('');
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(false);

  const fetchStudents = useCallback(async (classroomId, subjectId) => {
    setLoading(true);
    try {
      const data = await ApiClient.get(`/api/teacher/gradebook/?classroom_id=${classroomId}&subject_id=${subjectId}`);
      setStudents(
        (data.students || []).map(s => {
          const entry = (data.entries || []).find(e => e.student_id === s.id) || {};
          const ca = Number(entry.ca || 0), mt = Number(entry.midterm || 0), fi = Number(entry.final_exam || 0);
          return { ...s, ca, mt, fi, total: ca + mt + fi };
        })
      );
    } catch { setStudents([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!selClass) return;
    const parts = selClass.split('-');
    fetchStudents(parts[0], parts[1]);
  }, [selClass, fetchStudents]);

  const sorted = [...students].sort((a, b) => b.total - a.total);
  const avg = students.length ? Math.round(students.reduce((s, x) => s + x.total, 0) / students.length) : 0;
  const pass = students.filter(s => s.total >= 50).length;

  return (
    <div className="td-page">
      <h1 className="td-page-title">Student Performance</h1>
      <p className="td-page-sub">Analytics and rankings per class</p>

      <div style={{ marginBottom: 20, maxWidth: 340 }}>
        <label className="td-label">Select Class</label>
        <select className="td-select" value={selClass} onChange={e => setSelClass(e.target.value)}>
          <option value="">-- Select a class --</option>
          {classes.map((c, i) => (
            <option key={i} value={`${c.classroom_id}-${c.subject_id}`}>
              {c.classroom_name} — {c.subject_name || c.subject}
            </option>
          ))}
        </select>
      </div>

      {selClass && students.length > 0 && (
        <div className="td-stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
          <div className="td-stat">
            <div className="td-stat__label">Class Average</div>
            <div className="td-stat__value">{avg}</div>
            <div className={`td-stat__hint ${avg >= 70 ? 'success' : avg >= 50 ? '' : 'error'}`}><Ic n="analytics" size="sm" />Out of 100</div>
          </div>
          <div className="td-stat">
            <div className="td-stat__label">Pass Rate</div>
            <div className="td-stat__value">{students.length ? Math.round((pass / students.length) * 100) : 0}%</div>
            <div className="td-stat__hint success"><Ic n="check_circle" size="sm" />{pass} passing</div>
          </div>
          <div className="td-stat">
            <div className="td-stat__label">Top Score</div>
            <div className="td-stat__value">{sorted[0]?.total || 0}</div>
            <div className="td-stat__hint"><Ic n="emoji_events" size="sm" />{sorted[0] ? `${sorted[0].first_name} ${sorted[0].last_name}` : '—'}</div>
          </div>
        </div>
      )}

      {selClass && loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--td-text-3)' }}>
          <div className="td-spinner" style={{ margin: '0 auto 12px' }} />Loading…
        </div>
      )}

      {selClass && !loading && sorted.length > 0 && (
        <div className="td-card">
          <div className="td-card__header">
            <h2 className="td-card__title">Class Rankings</h2>
          </div>
          <div className="td-table-wrap" style={{ padding: '0 0 20px' }}>
            <table className="td-table">
              <thead>
                <tr><th>Rank</th><th>Student</th><th>CA</th><th>MidTerm</th><th>Final</th><th>Total</th><th>Grade</th></tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => {
                  const letter = s.total >= 80 ? 'A' : s.total >= 70 ? 'B' : s.total >= 60 ? 'C' : s.total >= 50 ? 'D' : 'F';
                  return (
                    <tr key={s.id}>
                      <td>
                        {i === 0 ? <Ic n="emoji_events" style={{ color: '#FFD700' }} /> :
                         i === 1 ? <Ic n="emoji_events" style={{ color: '#C0C0C0' }} /> :
                         i === 2 ? <Ic n="emoji_events" style={{ color: '#CD7F32' }} /> :
                         <span style={{ color: 'var(--td-text-3)' }}>{i + 1}</span>}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--td-text)' }}>{s.first_name} {s.last_name}</td>
                      <td>{s.ca || '—'}</td>
                      <td>{s.mt || '—'}</td>
                      <td>{s.fi || '—'}</td>
                      <td><span className={scoreClass(s.total)} style={{ fontFamily: 'Manrope, sans-serif' }}>{s.total || '—'}</span></td>
                      <td><span className={`td-badge ${s.total >= 70 ? 'td-badge--success' : s.total >= 50 ? 'td-badge--warn' : 'td-badge--error'}`}>{letter}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!selClass && (
        <div className="td-card td-card--p" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--td-text-3)' }}>
          <Ic n="trending_up" size="lg" />
          <p style={{ marginTop: 8 }}>Select a class to view performance analytics</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   SETTINGS PAGE
══════════════════════════════════════════════ */
function SettingsPage({ teacher, onLogout }) {
  const [pwForm,  setPwForm]  = useState({ current: '', new_password: '', confirm: '' });
  const [saving,  setSaving]  = useState(false);
  const [banner,  setBanner]  = useState(null);
  const [showPw,  setShowPw]  = useState(false);

  const handlePwChange = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm) {
      setBanner({ type: 'error', text: 'New passwords do not match.' }); return;
    }
    if (pwForm.new_password.length < 8) {
      setBanner({ type: 'error', text: 'New password must be at least 8 characters.' }); return;
    }
    setSaving(true); setBanner(null);
    try {
      await ApiClient.post('/api/teacher/change-password/', {
        current_password: pwForm.current,
        new_password: pwForm.new_password,
      });
      setBanner({ type: 'success', text: 'Password changed successfully.' });
      setPwForm({ current: '', new_password: '', confirm: '' });
    } catch (e) {
      setBanner({ type: 'error', text: e.message || 'Failed to change password.' });
    } finally { setSaving(false); }
  };

  const infoRows = teacher ? [
    ['Full Name',   `${teacher.first_name} ${teacher.last_name}`],
    ['Email',       teacher.email || '—'],
    ['Phone',       teacher.phone_number || '—'],
    ['Employee ID', teacher.employee_id || '—'],
    ['Qualification', teacher.qualification || '—'],
    ['School',      teacher.school_name || '—'],
  ] : [];

  return (
    <div className="td-page" style={{ maxWidth: 700 }}>
      <h1 className="td-page-title">Settings</h1>
      <p className="td-page-sub">Manage your profile and account</p>

      {/* Profile Info */}
      <div className="td-settings-section">
        <div className="td-settings-section__title">Profile Information</div>
        {infoRows.map(([k, v]) => (
          <div className="td-settings-row" key={k}>
            <span className="td-settings-row__label">{k}</span>
            <span className="td-settings-row__val">{v}</span>
          </div>
        ))}
      </div>

      {/* Change Password */}
      <div className="td-settings-section">
        <div className="td-settings-section__title">Change Password</div>
        {banner && (
          <div className={`td-banner td-banner--${banner.type === 'error' ? 'error' : 'success'}`}>
            <Ic n={banner.type === 'error' ? 'error' : 'check_circle'} size="sm" />{banner.text}
          </div>
        )}
        <form onSubmit={handlePwChange} style={{ background: 'var(--td-surface)', border: '1px solid var(--td-border-dim)', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="td-label">Current Password</label>
            <div style={{ position: 'relative' }}>
              <input className="td-input" type={showPw ? 'text' : 'password'} value={pwForm.current}
                onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                placeholder="Enter current password" style={{ paddingRight: 40 }} />
              <button type="button" onClick={() => setShowPw(p => !p)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--td-text-3)', display: 'flex' }}>
                <Ic n={showPw ? 'visibility_off' : 'visibility'} size="sm" />
              </button>
            </div>
          </div>
          <div>
            <label className="td-label">New Password</label>
            <input className="td-input" type="password" value={pwForm.new_password}
              onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
              placeholder="Min 8 characters" />
          </div>
          <div>
            <label className="td-label">Confirm New Password</label>
            <input className="td-input" type="password" value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Repeat new password" />
          </div>
          <button type="submit" className="td-btn td-btn--primary" disabled={saving || !pwForm.current || !pwForm.new_password || !pwForm.confirm}>
            <Ic n="lock_reset" size="sm" />{saving ? 'Saving…' : 'Update Password'}
          </button>
        </form>
      </div>

      {/* Sign Out */}
      <div className="td-settings-section">
        <div className="td-settings-section__title">Account</div>
        <button className="td-btn td-btn--danger" onClick={onLogout} style={{ width: '100%', justifyContent: 'center' }}>
          <Ic n="logout" size="sm" />Sign Out
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN TEACHER DASHBOARD
══════════════════════════════════════════════ */
export default function TeacherDashboard({ onNavigate: appNavigate }) {
  const [activePage, setActivePage] = useState('dashboard');
  const [teacher,    setTeacher]    = useState(null);
  const [classes,    setClasses]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Load teacher profile + classes
  useEffect(() => {
    const load = async () => {
      try {
        const [me, cls] = await Promise.all([
          ApiClient.get('/api/teacher/me/'),
          ApiClient.get('/api/teacher/classes/'),
        ]);
        setTeacher(me.teacher || me);
        setClasses(cls.classes || cls || []);
      } catch (e) {
        setError(e.message || 'Failed to load teacher profile.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
    if (appNavigate) appNavigate('login');
  };

  const navigate = (page) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const teacherName = teacher ? `${teacher.first_name} ${teacher.last_name}` : '';
  const teacherInitials = mkInitials(teacherName);
  const pageTitle = NAV.find(n => n.id === activePage)?.label || 'Dashboard';

  if (loading) {
    return (
      <div className="td-loading">
        <div className="td-spinner" />
        <span>Loading your dashboard…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="td-loading">
        <Ic n="error_outline" size="lg" style={{ color: 'var(--td-error)' }} />
        <p style={{ color: 'var(--td-error)', margin: '8px 0 16px' }}>{error}</p>
        <button className="td-btn td-btn--ghost" onClick={handleLogout}>Return to Login</button>
      </div>
    );
  }

  return (
    <div className="td-root">
      {/* Sidebar Overlay (mobile) */}
      <div className={`td-overlay ${sidebarOpen ? 'open' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={`td-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="td-sidebar__logo">
          <div className="td-sidebar__logo-text">EK-SMS</div>
          <div className="td-sidebar__logo-sub">Teacher Portal</div>
        </div>

        <nav className="td-nav">
          {NAV.map(item => (
            <button key={item.id}
              className={`td-nav__item ${activePage === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}>
              <span className="td-nav__icon td-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="td-sidebar__teacher">
          <div className="td-sidebar__teacher-avatar">{teacherInitials}</div>
          <div style={{ minWidth: 0 }}>
            <div className="td-sidebar__teacher-name">{teacherName || 'Teacher'}</div>
            <div className="td-sidebar__teacher-role">{teacher?.school_name || 'Teacher'}</div>
          </div>
        </div>

        <button className="td-sidebar__logout" onClick={handleLogout}>
          <Ic n="logout" size="sm" />Sign Out
        </button>
      </aside>

      {/* Header */}
      <header className="td-header">
        <div className="td-header__left">
          <button className="td-header__hamburger" onClick={() => setSidebarOpen(o => !o)}>
            <Ic n="menu" />
          </button>
          <div>
            <div className="td-header__title">{pageTitle}</div>
            {teacher && <div className="td-header__subtitle">{teacher.school_name}</div>}
          </div>
        </div>
        <div className="td-header__right">
          <div className="td-header__avatar" onClick={() => navigate('settings')} title="Settings">
            {teacherInitials}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="td-main">
        {activePage === 'dashboard'   && <DashboardPage   teacher={teacher} classes={classes} onNavigate={navigate} />}
        {activePage === 'classes'     && <ClassesPage     classes={classes} />}
        {activePage === 'timetable'   && <TimetablePage   classes={classes} />}
        {activePage === 'gradebook'   && <GradebookPage   classes={classes} />}
        {activePage === 'attendance'  && <AttendancePage  classes={classes} />}
        {activePage === 'performance' && <PerformancePage classes={classes} />}
        {activePage === 'settings'    && <SettingsPage    teacher={teacher} onLogout={handleLogout} />}
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="td-bottom-nav">
        <div className="td-bottom-nav__inner">
          {MOBILE_NAV.map(id => {
            const item = NAV.find(n => n.id === id);
            if (!item) return null;
            return (
              <button key={id}
                className={`td-bottom-nav__item ${activePage === id ? 'active' : ''}`}
                onClick={() => navigate(id)}>
                <Ic n={item.icon} />
                {item.label.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
