/**
 * EK-SMS School Admin — Add-on Pages
 * Analytics · Exams · Notifications · Timetable · Parents
 */
import React, { useState, useEffect, useCallback } from 'react';
import ApiClient from '../../api/client';

/* ── re-use icon helper (same pattern as SchoolAdminPages.js) ── */
const Ic = ({ name, size, className = '', style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''} ${className}`} aria-hidden="true" style={style}>
    {name}
  </span>
);

function StatCard({ icon, iconBg, iconColor, label, value, sub, trend, trendDir }) {
  return (
    <div className="ska-card ska-card-pad" style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Ic name={icon} style={{ color: iconColor, fontSize: 22 }} />
        </div>
        {trend && (
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: trendDir === 'up' ? 'var(--ska-green)' : 'var(--ska-error)', background: trendDir === 'up' ? 'var(--ska-green-dim)' : 'var(--ska-error-dim)', padding: '2px 8px', borderRadius: 20 }}>
            {trendDir === 'up' ? '↑' : '↓'} {trend}
          </span>
        )}
      </div>
      <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--ska-text)', fontFamily: 'var(--ska-font-headline)', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ska-text)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Banner({ msg }) {
  if (!msg?.text) return null;
  const ok = msg.type === 'ok';
  return (
    <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: '0.8125rem', background: ok ? 'var(--ska-green-dim)' : 'var(--ska-error-dim)', color: ok ? 'var(--ska-green)' : 'var(--ska-error)', border: `1px solid ${ok ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.25)'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
      <Ic name={ok ? 'check_circle' : 'error'} size="sm" />{msg.text}
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--ska-surface-low)', borderRadius: 10, padding: 4, width: 'fit-content', flexWrap: 'wrap' }}>
      {tabs.map(([key, icon, label]) => (
        <button key={key} onClick={() => onChange(key)} style={{ padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', background: active === key ? 'var(--ska-surface-high)' : 'transparent', color: active === key ? 'var(--ska-text)' : 'var(--ska-text-3)', fontWeight: 600, fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Ic name={icon} size="sm" /> {label}
        </button>
      ))}
    </div>
  );
}

/* ── Simple CSS bar chart ── */
function BarChart({ items, colorKey = 'var(--ska-primary)', maxVal }) {
  const max = maxVal || Math.max(...items.map(i => i.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => {
        const pct = Math.round((item.value / max) * 100);
        return (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text)', fontWeight: 600 }}>{item.label}</span>
              <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{item.value}{item.suffix || ''}</span>
            </div>
            <div className="ska-progress-track">
              <div className="ska-progress-fill" style={{ width: `${pct}%`, background: item.color || colorKey }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   ANALYTICS PAGE
   ============================================================ */
export function AnalyticsPage({ school }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('overview');

  const load = useCallback(() => {
    setLoading(true);
    ApiClient.get('/api/school/analytics/')
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const ov = data?.overview || {};

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Smart Analytics</h1>
          <p className="ska-page-sub">{school?.name} — Performance insights &amp; risk detection</p>
        </div>
        <button className="ska-btn ska-btn--ghost" onClick={load}><Ic name="refresh" size="sm" /> Refresh</button>
      </div>

      <div className="ska-stat-grid-4">
        <StatCard icon="group"       iconBg="var(--ska-primary-dim)"   iconColor="var(--ska-primary)"   label="Students"       value={loading ? '…' : ov.total_students ?? 0} />
        <StatCard icon="school"      iconBg="var(--ska-secondary-dim)" iconColor="var(--ska-secondary)" label="Teachers"       value={loading ? '…' : ov.total_teachers ?? 0} />
        <StatCard icon="grade"       iconBg="var(--ska-green-dim)"     iconColor="var(--ska-green)"     label="Avg Grade"      value={loading ? '…' : ov.avg_grade ? `${ov.avg_grade}` : '—'} sub="/ 100 pts" />
        <StatCard icon="percent"     iconBg="var(--ska-tertiary-dim)"  iconColor="var(--ska-tertiary)"  label="Today Attend."  value={loading ? '…' : ov.att_rate ? `${ov.att_rate}%` : '—'} />
      </div>

      <TabBar
        tabs={[['overview','insights','Overview'],['performance','grade','Performance'],['attendance','event_available','Attendance'],['risk','warning','At-Risk Students']]}
        active={tab} onChange={setTab}
      />

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="ska-card ska-card-pad">
            <h2 className="ska-card-title" style={{ marginBottom: 16 }}>Grade by Class</h2>
            {loading ? <p style={{ color: 'var(--ska-text-3)' }}>Loading…</p> :
              (data?.grade_by_class || []).length === 0
                ? <p style={{ color: 'var(--ska-text-3)', fontSize: '0.875rem' }}>No grade data yet. Enter grades to see performance.</p>
                : <BarChart items={(data.grade_by_class).map(g => ({ label: g.class_name, value: g.avg, suffix: ' avg', color: g.avg >= 70 ? 'var(--ska-green)' : g.avg >= 50 ? 'var(--ska-primary)' : 'var(--ska-error)' }))} maxVal={100} />
            }
          </div>
          <div className="ska-card ska-card-pad">
            <h2 className="ska-card-title" style={{ marginBottom: 16 }}>7-Day Attendance Trend</h2>
            {loading ? <p style={{ color: 'var(--ska-text-3)' }}>Loading…</p> :
              (data?.att_trend || []).length === 0
                ? <p style={{ color: 'var(--ska-text-3)', fontSize: '0.875rem' }}>No attendance data yet.</p>
                : <BarChart items={(data.att_trend).map(a => ({ label: a.date.slice(5), value: a.rate, suffix: '%', color: a.rate >= 80 ? 'var(--ska-green)' : a.rate >= 60 ? 'var(--ska-primary)' : 'var(--ska-error)' }))} maxVal={100} />
            }
          </div>
        </div>
      )}

      {tab === 'performance' && (
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head" style={{ marginBottom: 20 }}>
            <h2 className="ska-card-title">Class Performance Breakdown</h2>
            <span className="ska-badge ska-badge--cyan">Avg Score /100</span>
          </div>
          {loading ? <p style={{ color: 'var(--ska-text-3)' }}>Loading…</p> :
            (data?.grade_by_class || []).length === 0
              ? <div className="ska-empty"><Ic name="grade" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} /><p className="ska-empty-title">No grade data</p><p className="ska-empty-desc">Enter grades from the Grade Management page to see class performance.</p></div>
              : (
                <table className="ska-table">
                  <thead><tr><th>Class</th><th>Average Score</th><th>Rating</th></tr></thead>
                  <tbody>
                    {(data.grade_by_class).map((g, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{g.class_name}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="ska-progress-track" style={{ flex: 1 }}>
                              <div className="ska-progress-fill" style={{ width: `${g.avg}%`, background: g.avg >= 70 ? 'var(--ska-green)' : g.avg >= 50 ? 'var(--ska-primary)' : 'var(--ska-error)' }} />
                            </div>
                            <span style={{ fontWeight: 700, minWidth: 40 }}>{g.avg}</span>
                          </div>
                        </td>
                        <td>
                          <span className={`ska-badge ${g.avg >= 70 ? 'ska-badge--green' : g.avg >= 50 ? 'ska-badge--cyan' : 'ska-badge--error'}`}>
                            {g.avg >= 70 ? 'Good' : g.avg >= 50 ? 'Average' : 'Needs Attention'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          }
        </div>
      )}

      {tab === 'attendance' && (
        <div className="ska-card ska-card-pad">
          <div className="ska-card-head" style={{ marginBottom: 20 }}>
            <h2 className="ska-card-title">7-Day Attendance Trend</h2>
            <span className="ska-badge ska-badge--cyan">Last 7 days</span>
          </div>
          {loading ? <p style={{ color: 'var(--ska-text-3)' }}>Loading…</p> :
            (data?.att_trend || []).length === 0
              ? <div className="ska-empty"><Ic name="event_available" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} /><p className="ska-empty-title">No attendance data</p><p className="ska-empty-desc">Mark daily attendance to see trends here.</p></div>
              : (
                <table className="ska-table">
                  <thead><tr><th>Date</th><th>Present</th><th>Rate</th><th>Trend</th></tr></thead>
                  <tbody>
                    {(data.att_trend).map((a, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{a.date}</td>
                        <td>{a.present}</td>
                        <td style={{ fontWeight: 700, color: a.rate >= 80 ? 'var(--ska-green)' : a.rate >= 60 ? 'var(--ska-primary)' : 'var(--ska-error)' }}>{a.rate}%</td>
                        <td>
                          <div className="ska-progress-track">
                            <div className="ska-progress-fill" style={{ width: `${a.rate}%`, background: a.rate >= 80 ? 'var(--ska-green)' : a.rate >= 60 ? 'var(--ska-primary)' : 'var(--ska-error)' }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
          }
        </div>
      )}

      {tab === 'risk' && (
        <div className="ska-card">
          <div style={{ padding: '20px 20px 0' }}>
            <div className="ska-card-head">
              <h2 className="ska-card-title">At-Risk Students</h2>
              <span className="ska-badge ska-badge--error">{loading ? '…' : (data?.at_risk || []).length} identified</span>
            </div>
          </div>
          {loading ? (
            <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
          ) : (data?.at_risk || []).length === 0 ? (
            <div className="ska-empty">
              <Ic name="check_circle" size="xl" style={{ color: 'var(--ska-green)', marginBottom: 12 }} />
              <p className="ska-empty-title">No at-risk students detected</p>
              <p className="ska-empty-desc">All students are performing above thresholds.</p>
            </div>
          ) : (
            <table className="ska-table">
              <thead><tr><th>Student</th><th>Class</th><th>Avg Grade</th><th>Attendance</th><th>Risk Factors</th></tr></thead>
              <tbody>
                {(data.at_risk).map((s, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{s.class}</td>
                    <td style={{ fontWeight: 700, color: s.avg_grade !== null && s.avg_grade < 50 ? 'var(--ska-error)' : 'var(--ska-text)' }}>
                      {s.avg_grade !== null ? s.avg_grade : '—'}
                    </td>
                    <td style={{ fontWeight: 700, color: s.att_rate < 75 ? 'var(--ska-error)' : 'var(--ska-text)' }}>{s.att_rate}%</td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {s.reasons.map((r, j) => (
                          <span key={j} className="ska-badge ska-badge--error" style={{ fontSize: '0.7rem' }}>{r}</span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}


/* ============================================================
   EXAMS PAGE
   ============================================================ */
export function ExamsPage({ school }) {
  const [tab,       setTab]       = useState('list');
  const [exams,     setExams]     = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [subjects,  setSubjects]  = useState([]);
  const [terms,     setTerms]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [banner,    setBanner]    = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [form,      setForm]      = useState({ name: '', classroom_id: '', subject_id: '', term_id: '', exam_type: 'final', total_marks: '100', date: new Date().toISOString().split('T')[0] });
  const [saving,    setSaving]    = useState(false);
  // Results entry
  const [selExam,   setSelExam]   = useState(null);
  const [results,   setResults]   = useState([]);
  const [resLoading, setResLoading] = useState(false);
  const [marks,     setMarks]     = useState({});
  const [resSaving, setResSaving] = useState(false);

  const loadExams = useCallback(() => {
    setLoading(true);
    Promise.all([
      ApiClient.get('/api/school/exams/').then(d => setExams(d.exams || [])),
      ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes || [])),
      ApiClient.get('/api/school/subjects/').then(d => setSubjects(d.subjects || [])),
      ApiClient.get('/api/school/terms/').then(d => setTerms(d.terms || [])),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadExams(); }, [loadExams]);

  const handleCreate = async () => {
    setSaving(true); setBanner(null);
    try {
      await ApiClient.post('/api/school/exams/', form);
      setBanner({ type: 'ok', text: 'Exam created.' });
      setShowForm(false);
      setForm({ name: '', classroom_id: '', subject_id: '', term_id: '', exam_type: 'final', total_marks: '100', date: new Date().toISOString().split('T')[0] });
      loadExams();
    } catch (e) { setBanner({ type: 'err', text: e?.message || 'Failed to create exam.' }); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await ApiClient.delete(`/api/school/exams/${id}/`);
      setBanner({ type: 'ok', text: 'Exam deleted.' });
      loadExams();
    } catch (e) { setBanner({ type: 'err', text: 'Failed to delete.' }); }
  };

  const openResults = async (exam) => {
    setSelExam(exam); setTab('results'); setMarks({});
    setResLoading(true);
    try {
      const d = await ApiClient.get(`/api/school/exams/${exam.id}/results/`);
      setResults(d.results || []);
      const m = {};
      (d.results || []).forEach(r => { if (r.marks !== null) m[r.student_id] = String(r.marks); });
      setMarks(m);
    } catch { setResults([]); }
    setResLoading(false);
  };

  const handleSaveResults = async () => {
    setResSaving(true); setBanner(null);
    try {
      const entries = results.map(r => ({ student_id: r.student_id, marks: parseFloat(marks[r.student_id]) || 0, remarks: '' }));
      const res = await ApiClient.post(`/api/school/exams/${selExam.id}/results/`, { results: entries });
      setBanner({ type: 'ok', text: res.message || 'Results saved.' });
    } catch (e) { setBanner({ type: 'err', text: e?.message || 'Failed to save results.' }); }
    setResSaving(false);
  };

  const TYPE_LABEL = { ca: 'C.A.', midterm: 'Mid-Term', final: 'Final', mock: 'Mock', quiz: 'Quiz' };
  const letterColor = l => ({ A: 'var(--ska-green)', B: 'var(--ska-secondary)', C: 'var(--ska-primary)', D: 'var(--ska-tertiary)', F: 'var(--ska-error)' })[l] || 'var(--ska-text-3)';

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Exams &amp; Results</h1>
          <p className="ska-page-sub">{school?.name} — Create exams and record marks</p>
        </div>
        <button className="ska-btn ska-btn--primary" onClick={() => setShowForm(true)}><Ic name="add" size="sm" /> New Exam</button>
      </div>

      <Banner msg={banner} />

      <div className="ska-stat-grid-4">
        <StatCard icon="quiz"         iconBg="var(--ska-primary-dim)"   iconColor="var(--ska-primary)"   label="Total Exams"    value={exams.length} />
        <StatCard icon="assignment"   iconBg="var(--ska-secondary-dim)" iconColor="var(--ska-secondary)" label="Results Entered" value={exams.reduce((s, e) => s + e.result_count, 0)} />
        <StatCard icon="class"        iconBg="var(--ska-tertiary-dim)"  iconColor="var(--ska-tertiary)"  label="Classes"        value={classes.length} />
        <StatCard icon="menu_book"    iconBg="var(--ska-green-dim)"     iconColor="var(--ska-green)"     label="Subjects"       value={subjects.length} />
      </div>

      {/* Create exam form */}
      {showForm && (
        <div className="ska-card ska-card-pad" style={{ marginBottom: 20 }}>
          <div className="ska-card-head" style={{ marginBottom: 16 }}>
            <h2 className="ska-card-title">Create New Exam</h2>
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => setShowForm(false)}><Ic name="close" size="sm" /></button>
          </div>
          <div className="ska-form-grid">
            <label className="ska-form-group"><span>Exam Name</span>
              <input className="ska-input" placeholder="e.g. Mathematics Final Exam" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></label>
            <label className="ska-form-group"><span>Type</span>
              <select className="ska-input" value={form.exam_type} onChange={e => setForm(f => ({ ...f, exam_type: e.target.value }))}>
                {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
            <label className="ska-form-group"><span>Class</span>
              <select className="ska-input" value={form.classroom_id} onChange={e => setForm(f => ({ ...f, classroom_id: e.target.value }))}>
                <option value="">— Select —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></label>
            <label className="ska-form-group"><span>Subject</span>
              <select className="ska-input" value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}>
                <option value="">— Select —</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select></label>
            <label className="ska-form-group"><span>Term</span>
              <select className="ska-input" value={form.term_id} onChange={e => setForm(f => ({ ...f, term_id: e.target.value }))}>
                <option value="">— None —</option>
                {terms.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select></label>
            <label className="ska-form-group"><span>Total Marks</span>
              <input className="ska-input" type="number" min="1" value={form.total_marks} onChange={e => setForm(f => ({ ...f, total_marks: e.target.value }))} /></label>
            <label className="ska-form-group"><span>Date</span>
              <input className="ska-input" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></label>
          </div>
          <div className="ska-modal-actions">
            <button className="ska-btn ska-btn--ghost" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="ska-btn ska-btn--primary" onClick={handleCreate} disabled={saving || !form.name || !form.classroom_id || !form.subject_id}>
              <Ic name="add" size="sm" /> {saving ? 'Creating…' : 'Create Exam'}
            </button>
          </div>
        </div>
      )}

      <TabBar tabs={[['list','list','Exams List'],['results','edit_note','Enter Results']]} active={tab} onChange={setTab} />

      {tab === 'list' && (
        <div className="ska-card" style={{ overflowX: 'auto' }}>
          {loading ? (
            <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
          ) : exams.length === 0 ? (
            <div className="ska-empty">
              <Ic name="quiz" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
              <p className="ska-empty-title">No exams yet</p>
              <p className="ska-empty-desc">Click "New Exam" to schedule an exam.</p>
            </div>
          ) : (
            <table className="ska-table">
              <thead><tr><th>Name</th><th>Type</th><th>Class</th><th>Subject</th><th>Date</th><th>Marks</th><th>Results</th><th></th></tr></thead>
              <tbody>
                {exams.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{e.name}</td>
                    <td><span className="ska-badge ska-badge--cyan">{TYPE_LABEL[e.exam_type] || e.exam_type}</span></td>
                    <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{e.classroom}</td>
                    <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{e.subject}</td>
                    <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{e.date}</td>
                    <td style={{ fontWeight: 700 }}>{e.total_marks}</td>
                    <td><span className={`ska-badge ${e.result_count > 0 ? 'ska-badge--green' : 'ska-badge--inactive'}`}>{e.result_count} entered</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="ska-btn ska-btn--primary ska-btn--sm" onClick={() => openResults(e)}>Results</button>
                        <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => handleDelete(e.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'results' && (
        <div className="ska-card" style={{ overflowX: 'auto' }}>
          {!selExam ? (
            <div className="ska-empty">
              <Ic name="edit_note" size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
              <p className="ska-empty-title">Select an exam</p>
              <p className="ska-empty-desc">Click "Results" on an exam from the Exams List tab.</p>
            </div>
          ) : resLoading ? (
            <div className="ska-empty"><p className="ska-empty-desc">Loading students…</p></div>
          ) : (
            <>
              <div style={{ padding: '20px 20px 0', marginBottom: 16 }}>
                <div className="ska-card-head">
                  <div>
                    <h2 className="ska-card-title">{selExam.name}</h2>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{selExam.classroom} · {selExam.subject} · Total: {selExam.total_marks} marks</p>
                  </div>
                  <button className="ska-btn ska-btn--primary" onClick={handleSaveResults} disabled={resSaving}>
                    <Ic name="save" size="sm" /> {resSaving ? 'Saving…' : 'Save Results'}
                  </button>
                </div>
              </div>
              {results.length === 0 ? (
                <div className="ska-empty"><p className="ska-empty-desc">No students in this class.</p></div>
              ) : (
                <table className="ska-table">
                  <thead><tr><th>#</th><th>Student</th><th>Marks /{selExam.total_marks}</th><th>Grade</th></tr></thead>
                  <tbody>
                    {results.map((r, i) => {
                      const m = parseFloat(marks[r.student_id]) || 0;
                      const pct = selExam.total_marks > 0 ? m / selExam.total_marks * 100 : 0;
                      const letter = pct >= 80 ? 'A' : pct >= 65 ? 'B' : pct >= 50 ? 'C' : pct >= 40 ? 'D' : 'F';
                      return (
                        <tr key={r.student_id}>
                          <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{r.student_name}</td>
                          <td>
                            <input type="number" min="0" max={selExam.total_marks} step="0.5" value={marks[r.student_id] ?? ''} onChange={ev => setMarks(m2 => ({ ...m2, [r.student_id]: ev.target.value }))}
                              style={{ width: 80, textAlign: 'center', padding: '4px 6px', background: 'var(--ska-surface-low)', border: '1px solid var(--ska-border)', borderRadius: 6, color: 'var(--ska-text)', fontSize: '0.875rem', outline: 'none' }}
                              onFocus={ev => (ev.target.style.borderColor = 'var(--ska-primary)')} onBlur={ev => (ev.target.style.borderColor = 'var(--ska-border)')} />
                          </td>
                          <td>
                            {marks[r.student_id] ? (
                              <span style={{ display: 'inline-block', padding: '2px 12px', borderRadius: 20, fontWeight: 800, fontSize: '0.875rem', background: `${letterColor(letter)}22`, color: letterColor(letter) }}>{letter}</span>
                            ) : <span style={{ color: 'var(--ska-text-3)' }}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}


/* ============================================================
   NOTIFICATIONS PAGE
   ============================================================ */
export function NotificationsPage({ school }) {
  const [notifs,   setNotifs]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [compose,  setCompose]  = useState(false);
  const [form,     setForm]     = useState({ title: '', body: '', notif_type: 'info', recipient_role: 'all' });
  const [sending,  setSending]  = useState(false);
  const [banner,   setBanner]   = useState(null);
  const [tab,      setTab]      = useState('all');

  const load = useCallback(() => {
    setLoading(true);
    ApiClient.get('/api/school/notifications/')
      .then(d => setNotifs(d.notifications || []))
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await ApiClient.put(`/api/school/notifications/${id}/read/`, {});
      setNotifs(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch { /* silent */ }
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.body.trim()) return;
    setSending(true); setBanner(null);
    try {
      await ApiClient.post('/api/school/notifications/', form);
      setBanner({ type: 'ok', text: 'Notification sent.' });
      setForm({ title: '', body: '', notif_type: 'info', recipient_role: 'all' });
      setCompose(false);
      load();
    } catch (e) { setBanner({ type: 'err', text: e?.message || 'Failed to send.' }); }
    setSending(false);
  };

  const TYPE_STYLE = {
    info:    { bg: 'var(--ska-primary-dim)',   color: 'var(--ska-primary)',   icon: 'info' },
    success: { bg: 'var(--ska-green-dim)',      color: 'var(--ska-green)',     icon: 'check_circle' },
    warning: { bg: 'var(--ska-tertiary-dim)',   color: 'var(--ska-tertiary)',  icon: 'warning' },
    alert:   { bg: 'var(--ska-error-dim)',      color: 'var(--ska-error)',     icon: 'error' },
  };

  const unread = notifs.filter(n => !n.is_read).length;
  const filtered = notifs.filter(n => tab === 'all' || n.recipient_role === tab);
  const fmtDate = ts => { try { return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ts; } };

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Notifications</h1>
          <p className="ska-page-sub">{school?.name} — Send and manage announcements</p>
        </div>
        <button className="ska-btn ska-btn--primary" onClick={() => setCompose(true)}><Ic name="add_alert" size="sm" /> New Notification</button>
      </div>

      <Banner msg={banner} />

      <div className="ska-stat-grid-4">
        <StatCard icon="notifications" iconBg="var(--ska-primary-dim)"   iconColor="var(--ska-primary)"   label="Total Sent"  value={notifs.length} />
        <StatCard icon="mark_email_unread" iconBg="var(--ska-error-dim)" iconColor="var(--ska-error)"     label="Unread"      value={unread} />
        <StatCard icon="campaign"      iconBg="var(--ska-secondary-dim)" iconColor="var(--ska-secondary)" label="Broadcasts"  value={notifs.filter(n => n.recipient_role === 'all').length} />
        <StatCard icon="warning"       iconBg="var(--ska-tertiary-dim)"  iconColor="var(--ska-tertiary)"  label="Alerts"      value={notifs.filter(n => n.notif_type === 'alert' || n.notif_type === 'warning').length} />
      </div>

      {compose && (
        <div className="ska-card ska-card-pad" style={{ marginBottom: 20 }}>
          <div className="ska-card-head" style={{ marginBottom: 16 }}>
            <h2 className="ska-card-title">Send Notification</h2>
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => setCompose(false)}><Ic name="close" size="sm" /></button>
          </div>
          <div className="ska-form-grid">
            <label className="ska-form-group"><span>Title</span>
              <input className="ska-input" placeholder="Notification title…" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></label>
            <label className="ska-form-group"><span>Type</span>
              <select className="ska-input" value={form.notif_type} onChange={e => setForm(f => ({ ...f, notif_type: e.target.value }))}>
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="alert">Alert</option>
              </select></label>
            <label className="ska-form-group"><span>Send To</span>
              <select className="ska-input" value={form.recipient_role} onChange={e => setForm(f => ({ ...f, recipient_role: e.target.value }))}>
                <option value="all">Everyone</option>
                <option value="staff">Staff Only</option>
                <option value="students">Students Only</option>
                <option value="parents">Parents Only</option>
              </select></label>
            <label className="ska-form-group" style={{ gridColumn: '1/-1' }}><span>Message</span>
              <textarea className="ska-input" rows={3} style={{ resize: 'vertical' }} placeholder="Type your notification message…" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} /></label>
          </div>
          <div className="ska-modal-actions">
            <button className="ska-btn ska-btn--ghost" onClick={() => setCompose(false)}>Cancel</button>
            <button className="ska-btn ska-btn--primary" onClick={handleSend} disabled={sending || !form.title.trim() || !form.body.trim()}>
              <Ic name="send" size="sm" /> {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      )}

      <TabBar tabs={[['all','notifications','All'],['staff','badge','Staff'],['students','school','Students'],['parents','family_restroom','Parents']]} active={tab} onChange={setTab} />

      <div className="ska-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
        ) : filtered.length === 0 ? (
          <div className="ska-empty">
            <Ic name="notifications_none" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
            <p className="ska-empty-title">No notifications</p>
            <p className="ska-empty-desc">Send a notification to staff, students, or parents.</p>
          </div>
        ) : (
          filtered.map((n, i) => {
            const ts = TYPE_STYLE[n.notif_type] || TYPE_STYLE.info;
            return (
              <div key={n.id} onClick={() => markRead(n.id)} style={{ display: 'flex', gap: 14, padding: '16px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--ska-border)' : 'none', background: !n.is_read ? 'var(--ska-surface-high)' : 'transparent', cursor: 'pointer' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: ts.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ic name={ts.icon} style={{ color: ts.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--ska-text)' }}>{n.title}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', flexShrink: 0, marginLeft: 8 }}>{fmtDate(n.created_at)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ska-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.body}</p>
                  <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
                    <span className={`ska-badge ska-badge--${n.notif_type === 'alert' ? 'error' : n.notif_type === 'warning' ? 'pending' : n.notif_type === 'success' ? 'green' : 'cyan'}`}>{n.notif_type}</span>
                    <span className="ska-badge ska-badge--inactive">{n.recipient_role}</span>
                    {!n.is_read && <span className="ska-badge ska-badge--error">Unread</span>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}


/* ============================================================
   TIMETABLE PAGE
   ============================================================ */
export function TimetablePage({ school }) {
  const [slots,       setSlots]       = useState([]);
  const [classes,     setClasses]     = useState([]);
  const [selClass,    setSelClass]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [banner,      setBanner]      = useState(null);
  const [genStats,    setGenStats]    = useState(null);  // { placed, repaired, skipped }
  // Generator config
  const [ppd,             setPpd]             = useState(8);
  const [maxTeacher,      setMaxTeacher]       = useState(5);
  const [breakPeriodsStr, setBreakPeriodsStr]  = useState('');  // e.g. "3" or "3,6"

  const DAY_NAMES   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const SUBJ_COLORS = [
    'var(--ska-primary)', 'var(--ska-secondary)', 'var(--ska-tertiary)',
    'var(--ska-green)', '#f59e0b', '#ec4899', '#06b6d4', '#8b5cf6',
  ];

  const loadSlots = useCallback((classId) => {
    if (!classId) { setSlots([]); return; }
    setLoading(true);
    ApiClient.get(`/api/school/timetable/?class_id=${classId}`)
      .then(d => setSlots(d.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    ApiClient.get('/api/school/classes/').then(d => {
      const cls = d.classes || [];
      setClasses(cls);
      if (cls.length > 0 && !selClass) {
        setSelClass(String(cls[0].id));
        loadSlots(String(cls[0].id));
      }
    }).catch(() => {});
  }, [loadSlots, selClass]);

  useEffect(() => { loadSlots(selClass); }, [selClass, loadSlots]);

  // Parse break_periods string → array of valid ints
  const parseBreakPeriods = () =>
    breakPeriodsStr
      .split(/[\s,]+/)
      .map(s => parseInt(s, 10))
      .filter(n => !isNaN(n) && n >= 1 && n <= ppd);

  const handleGenerate = async () => {
    setGenerating(true); setBanner(null); setGenStats(null);
    try {
      const res = await ApiClient.post('/api/school/timetable/generate/', {
        periods_per_day:     ppd,
        max_teacher_per_day: maxTeacher,
        break_periods:       parseBreakPeriods(),
      });
      setBanner({ type: 'ok', text: res.message || 'Timetable generated.' });
      setGenStats({
        placed:   res.total_slots  || 0,
        repaired: res.repaired     || 0,
        skipped:  res.skipped      || 0,
        attempted: res.attempted   || 0,
      });
      loadSlots(selClass);
    } catch (e) {
      setBanner({ type: 'err', text: e?.message || 'Generation failed.' });
    }
    setGenerating(false);
  };

  const handleClear = async () => {
    try {
      await ApiClient.delete('/api/school/timetable/');
      setSlots([]); setGenStats(null);
      setBanner({ type: 'ok', text: 'Timetable cleared.' });
    } catch (e) { setBanner({ type: 'err', text: 'Failed to clear.' }); }
  };

  // Build grid: { day: { period: slot } }
  const grid = {};
  const subjectColorMap = {};
  let colorIdx = 0;
  slots.forEach(s => {
    if (!grid[s.day]) grid[s.day] = {};
    grid[s.day][s.period] = s;
    if (!(s.subject_id in subjectColorMap)) {
      subjectColorMap[s.subject_id] = SUBJ_COLORS[colorIdx % SUBJ_COLORS.length];
      colorIdx++;
    }
  });

  const allPeriods = Array.from({ length: ppd }, (_, i) => i + 1);
  const breakSet   = new Set(parseBreakPeriods());

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Auto Timetable</h1>
          <p className="ska-page-sub">{school?.name} — Constraint-based weekly schedule</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="ska-btn ska-btn--ghost" onClick={handleClear}>
            <Ic name="delete_sweep" size="sm" /> Clear
          </button>
          <button className="ska-btn ska-btn--primary" onClick={handleGenerate} disabled={generating}>
            <Ic name="auto_awesome" size="sm" /> {generating ? 'Generating…' : 'Generate Timetable'}
          </button>
        </div>
      </div>

      <Banner msg={banner} />

      {/* Generation stats pill row */}
      {genStats && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <span className="ska-badge ska-badge--active">
            <Ic name="check_circle" size="xs" /> {genStats.placed} placed
          </span>
          {genStats.repaired > 0 && (
            <span className="ska-badge" style={{ background: 'var(--ska-secondary-dim)', color: 'var(--ska-secondary)' }}>
              <Ic name="swap_horiz" size="xs" /> {genStats.repaired} repaired
            </span>
          )}
          {genStats.skipped > 0 && (
            <span className="ska-badge ska-badge--error">
              <Ic name="warning" size="xs" /> {genStats.skipped} skipped
            </span>
          )}
          <span className="ska-badge ska-badge--inactive">{genStats.attempted} attempted</span>
        </div>
      )}

      {/* Controls */}
      <div className="ska-card ska-card-pad" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* View selector */}
          <label className="ska-form-group" style={{ flex: '2 1 160px', margin: 0 }}>
            <span>View Class</span>
            <select className="ska-input" value={selClass} onChange={e => setSelClass(e.target.value)}>
              <option value="">— All Classes —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          {/* Periods per day */}
          <label className="ska-form-group" style={{ flex: '1 1 110px', margin: 0 }}>
            <span>Periods / Day</span>
            <select className="ska-input" value={ppd} onChange={e => setPpd(Number(e.target.value))}>
              {[4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          {/* Max teacher periods per day */}
          <label className="ska-form-group" style={{ flex: '1 1 130px', margin: 0 }}>
            <span>Max Teacher/Day</span>
            <select className="ska-input" value={maxTeacher} onChange={e => setMaxTeacher(Number(e.target.value))}>
              {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          {/* Break periods */}
          <label className="ska-form-group" style={{ flex: '1 1 140px', margin: 0 }}>
            <span>Break Periods <span style={{ fontWeight: 400, color: 'var(--ska-text-3)' }}>(e.g. 3 or 3,6)</span></span>
            <input
              className="ska-input"
              type="text"
              placeholder="e.g. 3 or 3,6"
              value={breakPeriodsStr}
              onChange={e => setBreakPeriodsStr(e.target.value)}
            />
          </label>
          <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: 'var(--ska-text-3)', flexShrink: 0, alignSelf: 'flex-end', paddingBottom: 6 }}>
            {slots.length} slot(s) loaded
          </p>
        </div>
      </div>

      {/* Timetable grid */}
      {loading ? (
        <div className="ska-card">
          <div className="ska-empty"><p className="ska-empty-desc">Loading timetable…</p></div>
        </div>
      ) : slots.length === 0 ? (
        <div className="ska-card">
          <div className="ska-empty">
            <Ic name="calendar_today" size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
            <p className="ska-empty-title">No timetable yet</p>
            <p className="ska-empty-desc">
              Configure the options above then click Generate. Ensure teachers,
              subjects and classes are set up first.
            </p>
            <button className="ska-btn ska-btn--primary" style={{ marginTop: 12 }} onClick={handleGenerate} disabled={generating}>
              <Ic name="auto_awesome" size="sm" /> {generating ? 'Generating…' : 'Generate Now'}
            </button>
          </div>
        </div>
      ) : (
        <div className="ska-card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', background: 'var(--ska-surface-high)', color: 'var(--ska-text-3)', fontSize: '0.75rem', fontWeight: 700, textAlign: 'left', borderBottom: '2px solid var(--ska-border)', width: 72 }}>Period</th>
                {DAY_NAMES.map(d => (
                  <th key={d} style={{ padding: '12px 16px', background: 'var(--ska-surface-high)', color: 'var(--ska-text)', fontSize: '0.8125rem', fontWeight: 700, textAlign: 'center', borderBottom: '2px solid var(--ska-border)' }}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allPeriods.map(p => {
                const isBreak = breakSet.has(p);
                return (
                  <tr key={p} style={{ borderBottom: '1px solid var(--ska-border)', opacity: isBreak ? 0.5 : 1 }}>
                    <td style={{ padding: '8px 16px', color: isBreak ? 'var(--ska-text-3)' : 'var(--ska-text)', fontSize: '0.75rem', fontWeight: 700, background: 'var(--ska-surface-high)', verticalAlign: 'middle' }}>
                      {isBreak ? <span title="Break period">☕ P{p}</span> : `P${p}`}
                    </td>
                    {[0, 1, 2, 3, 4].map(day => {
                      if (isBreak) return (
                        <td key={day} style={{ padding: '6px 8px', textAlign: 'center', background: 'var(--ska-surface-high)' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>Break</span>
                        </td>
                      );
                      const slot  = grid[day]?.[p];
                      const color = slot ? (subjectColorMap[slot.subject_id] || 'var(--ska-primary)') : null;
                      return (
                        <td key={day} style={{ padding: '6px 8px', verticalAlign: 'middle', textAlign: 'center' }}>
                          {slot ? (
                            <div style={{ background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 8, padding: '6px 8px' }}>
                              <div style={{ fontSize: '0.8125rem', fontWeight: 700, color, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                                {slot.subject}
                              </div>
                              {slot.teacher && (
                                <div style={{ fontSize: '0.7rem', color: 'var(--ska-text-3)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 120 }}>
                                  {slot.teacher}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Subject legend */}
      {slots.length > 0 && Object.keys(subjectColorMap).length > 0 && (
        <div className="ska-card ska-card-pad" style={{ marginTop: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: '0.875rem', fontWeight: 700, color: 'var(--ska-text)' }}>
            Subject Legend
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[...new Map(slots.map(s => [s.subject_id, s.subject])).entries()].map(([id, name]) => (
              <span key={id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: `${subjectColorMap[id]}18`, border: `1px solid ${subjectColorMap[id]}44`, fontSize: '0.8125rem', fontWeight: 600, color: subjectColorMap[id] }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: subjectColorMap[id], flexShrink: 0 }} />
                {name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


/* ============================================================
   PARENTS PAGE (school-admin management view)
   ============================================================ */
export function ParentsPage({ school }) {
  const [parents,  setParents]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    ApiClient.get('/api/school/parents/')
      .then(d => setParents(d.parents || []))
      .catch(() => setParents([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = parents.filter(p => {
    const q = search.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) ||
      p.children.some(c => c.name.toLowerCase().includes(q));
  });

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Parents &amp; Guardians</h1>
          <p className="ska-page-sub">{school?.name} — Parent accounts and student links</p>
        </div>
      </div>

      <div className="ska-stat-grid-4">
        <StatCard icon="family_restroom" iconBg="var(--ska-primary-dim)"   iconColor="var(--ska-primary)"   label="Total Parents"   value={loading ? '…' : parents.length} />
        <StatCard icon="group"           iconBg="var(--ska-secondary-dim)" iconColor="var(--ska-secondary)" label="Linked Students" value={loading ? '…' : parents.reduce((s, p) => s + p.children.length, 0)} />
        <StatCard icon="link"            iconBg="var(--ska-green-dim)"     iconColor="var(--ska-green)"     label="With Children"   value={loading ? '…' : parents.filter(p => p.children.length > 0).length} />
        <StatCard icon="link_off"        iconBg="var(--ska-error-dim)"     iconColor="var(--ska-error)"     label="No Links"        value={loading ? '…' : parents.filter(p => p.children.length === 0).length} />
      </div>

      <div className="ska-card ska-card-pad" style={{ marginBottom: 20 }}>
        <input className="ska-input" placeholder="Search parents or students…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 360 }} />
      </div>

      <div className="ska-card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div className="ska-empty"><p className="ska-empty-desc">Loading parents…</p></div>
        ) : filtered.length === 0 ? (
          <div className="ska-empty">
            <Ic name="family_restroom" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
            <p className="ska-empty-title">{search ? 'No results found' : 'No parents registered'}</p>
            <p className="ska-empty-desc">{search ? 'Try a different search term.' : 'Parent accounts are created during student registration.'}</p>
          </div>
        ) : (
          filtered.map((p, i) => (
            <div key={p.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--ska-border)' : 'none' }}>
              <div
                onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                style={{ display: 'flex', gap: 14, padding: '14px 20px', cursor: 'pointer', alignItems: 'center' }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'var(--ska-secondary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--ska-secondary)' }}>
                  {p.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, color: 'var(--ska-text)' }}>{p.name}</span>
                    <Ic name={expanded === p.id ? 'expand_less' : 'expand_more'} style={{ color: 'var(--ska-text-3)' }} />
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{p.email} · {p.phone} · <em>{p.relationship}</em></p>
                </div>
                <span className={`ska-badge ${p.children.length > 0 ? 'ska-badge--green' : 'ska-badge--inactive'}`}>{p.children.length} child{p.children.length !== 1 ? 'ren' : ''}</span>
              </div>
              {expanded === p.id && p.children.length > 0 && (
                <div style={{ padding: '0 20px 14px 74px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {p.children.map(c => (
                      <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px', background: 'var(--ska-surface-high)', borderRadius: 8 }}>
                        <Ic name="person" style={{ color: 'var(--ska-primary)' }} />
                        <div style={{ flex: 1 }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--ska-text)' }}>{c.name}</p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{c.class} · {c.admission}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}


/* ============================================================
   FINANCE USERS PAGE
   School admin creates and manages ACCOUNTANT staff accounts
   ============================================================ */
export function FinanceUsersPage({ school }) {
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [banner,    setBanner]    = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [showPass,  setShowPass]  = useState(false);
  const [form,      setForm]      = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    ApiClient.get('/api/school/finance-users/')
      .then(d => setUsers(d.finance_users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => setForm({ first_name: '', last_name: '', email: '', phone: '', password: '' });

  const handleCreate = async e => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setBanner({ type: 'err', text: 'Email and password are required.' });
      return;
    }
    if (form.password.length < 8) {
      setBanner({ type: 'err', text: 'Password must be at least 8 characters.' });
      return;
    }
    setSaving(true);
    try {
      await ApiClient.post('/api/school/finance-users/', form);
      setBanner({ type: 'ok', text: 'Finance user created successfully.' });
      resetForm();
      setShowForm(false);
      load();
    } catch (err) {
      setBanner({ type: 'err', text: err?.message || 'Failed to create user.' });
    }
    setSaving(false);
  };

  const handleToggle = async (uid) => {
    try {
      const res = await ApiClient.put(`/api/school/finance-users/${uid}/`, {});
      setBanner({ type: 'ok', text: res.message });
      load();
    } catch {
      setBanner({ type: 'err', text: 'Failed to update status.' });
    }
  };

  const STATUS_STYLE = {
    ACTIVE:     { bg: 'var(--ska-green-dim)',    color: 'var(--ska-green)' },
    SUSPENDED:  { bg: 'var(--ska-error-dim)',    color: 'var(--ska-error)' },
    PENDING:    { bg: 'var(--ska-tertiary-dim)', color: 'var(--ska-tertiary)' },
    TERMINATED: { bg: 'rgba(255,255,255,0.06)',  color: 'var(--ska-text-3)' },
  };

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Finance Users</h1>
          <p className="ska-page-sub">{school?.name} — Finance staff accounts</p>
        </div>
        <button
          className={`ska-btn ${showForm ? 'ska-btn--ghost' : 'ska-btn--primary'}`}
          onClick={() => { setShowForm(f => !f); setBanner(null); }}
        >
          <Ic name={showForm ? 'close' : 'person_add'} size="sm" />
          {showForm ? 'Cancel' : 'Add Finance User'}
        </button>
      </div>

      <Banner msg={banner} />

      {/* Stats */}
      <div className="ska-metrics">
        <StatCard icon="manage_accounts" iconBg="var(--ska-primary-dim)"  iconColor="var(--ska-primary)"
          label="Total Finance Staff" value={loading ? '…' : users.length} />
        <StatCard icon="check_circle"   iconBg="var(--ska-green-dim)"     iconColor="var(--ska-green)"
          label="Active"              value={loading ? '…' : users.filter(u => u.is_active).length} />
        <StatCard icon="block"          iconBg="var(--ska-error-dim)"      iconColor="var(--ska-error)"
          label="Suspended"           value={loading ? '…' : users.filter(u => !u.is_active).length} />
      </div>

      {/* Create form */}
      {showForm && (
        <div className="ska-card ska-card-pad" style={{ marginBottom: 24 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.9375rem', fontWeight: 700, color: 'var(--ska-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Ic name="person_add" size="sm" /> New Finance User
          </h3>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              <label className="ska-form-group" style={{ margin: 0 }}>
                <span>First Name</span>
                <input className="ska-input" value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  placeholder="First name" />
              </label>
              <label className="ska-form-group" style={{ margin: 0 }}>
                <span>Last Name</span>
                <input className="ska-input" value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  placeholder="Last name" />
              </label>
              <label className="ska-form-group" style={{ margin: 0 }}>
                <span>Email <span style={{ color: 'var(--ska-error)' }}>*</span></span>
                <input className="ska-input" type="email" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="finance@school.com" />
              </label>
              <label className="ska-form-group" style={{ margin: 0 }}>
                <span>Phone</span>
                <input className="ska-input" value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+xxx-xxx-xxxx" />
              </label>
              <label className="ska-form-group" style={{ margin: 0, gridColumn: '1 / -1' }}>
                <span>Password <span style={{ color: 'var(--ska-error)' }}>*</span></span>
                <div style={{ position: 'relative' }}>
                  <input className="ska-input" type={showPass ? 'text' : 'password'} required
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    placeholder="Min. 8 characters"
                    style={{ paddingRight: 44 }} />
                  <button type="button"
                    onClick={() => setShowPass(p => !p)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                             background: 'none', border: 'none', cursor: 'pointer',
                             color: 'var(--ska-text-3)', padding: 0, lineHeight: 1 }}>
                    <Ic name={showPass ? 'visibility_off' : 'visibility'} size="sm" />
                  </button>
                </div>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" className="ska-btn ska-btn--ghost"
                onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
              <button type="submit" className="ska-btn ska-btn--primary" disabled={saving}>
                <Ic name="person_add" size="sm" /> {saving ? 'Creating…' : 'Create Finance User'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="ska-card">
        {loading ? (
          <div className="ska-empty"><p className="ska-empty-desc">Loading finance users…</p></div>
        ) : users.length === 0 ? (
          <div className="ska-empty">
            <Ic name="manage_accounts" size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
            <p className="ska-empty-title">No finance users yet</p>
            <p className="ska-empty-desc">
              Create finance staff who will manage school payments and expenses.
            </p>
            <button className="ska-btn ska-btn--primary" style={{ marginTop: 12 }}
              onClick={() => setShowForm(true)}>
              <Ic name="person_add" size="sm" /> Add First Finance User
            </button>
          </div>
        ) : (
          <div className="ska-table-wrap">
            <table className="ska-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Since</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const st = STATUS_STYLE[u.status] || STATUS_STYLE.PENDING;
                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: '50%',
                            background: 'var(--ska-primary-dim)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-primary)',
                            flexShrink: 0,
                          }}>
                            {u.full_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span style={{ fontWeight: 600 }}>{u.full_name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{u.email}</td>
                      <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{u.phone || '—'}</td>
                      <td>
                        <span style={{
                          display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                          fontSize: '0.75rem', fontWeight: 700,
                          background: st.bg, color: st.color,
                        }}>
                          {u.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{u.created_at}</td>
                      <td>
                        <button
                          className={`ska-btn ska-btn--sm ${u.is_active ? 'ska-btn--danger' : 'ska-btn--approve'}`}
                          onClick={() => handleToggle(u.id)}
                        >
                          {u.is_active ? 'Suspend' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
