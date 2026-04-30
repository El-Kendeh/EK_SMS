/**
 * EK-SMS School Admin — Add-on Pages
 * Analytics · Exams · Notifications · Timetable · Parents
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ApiClient from '../../api/client';
import AddTeacherWizard from './Teachers/AddTeacherWizard';
import BulkImportModal from './Teachers/BulkImportModal';
import PhoneInput from '../shared/PhoneInput';

/* Re-exported so existing `import { PhoneInput } from '../NewPages'`
   paths keep working. */
export { default as PhoneInput } from '../shared/PhoneInput';

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
   PARENTS PAGE — extended into a full Parent–Student Engagement
   System. Implementation lives in ./Parents/ for component
   separation; we re-export here so existing imports work.
   ============================================================ */
export { default as ParentsPage } from './Parents/ParentsPage';


/* ============================================================
   FINANCE USERS PAGE — refactored into ./FinanceUsers/ as a
   banking-grade Financial Control Dashboard. Re-exported here
   so dashboard.js's existing import keeps working.
   ============================================================ */
export { default as FinanceUsersPage } from './FinanceUsers/FinanceUsersPage';


/* ============================================================
   PRINCIPAL PAGE — refactored into ./Principal/ as a School
   Command Dashboard. Re-exported as PrincipalUsersPage so
   dashboard.js's existing import keeps working.
   ============================================================ */
export { default as PrincipalUsersPage } from './Principal/PrincipalPage';


/* ============================================================
   STUDENTS PAGE — "The Digital Curator" design
   Full upgrade: metrics, enrollment chart, smart insights,
   bento student cards, glass profile panel, add wizard
   ============================================================ */

function _initials(name = '') {
  const parts = name.trim().split(' ');
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
}
const _AVATAR_COLORS = ['#4d8eff','#4cd7f6','#ffb786','#4ade80','#8b5cf6','#f43f5e'];
function _avatarColor(name = '') { return _AVATAR_COLORS[(name.charCodeAt(0) || 0) % _AVATAR_COLORS.length]; }

function StudentAvatar({ name = '', size = 40 }) {
  const bg = _avatarColor(name);
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.25, background: bg + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: size * 0.35, color: bg, flexShrink: 0, letterSpacing: '-0.02em' }}>
      {(_initials(name) || '?').toUpperCase()}
    </div>
  );
}

function AttSparkline({ rate = 0, studentId = 0 }) {
  const bars = Array.from({ length: 7 }, (_, i) => {
    if (i === 6) return rate / 100;
    const seed = ((studentId * 13 + i * 7) % 30) / 100;
    return Math.max(0.1, Math.min(0.99, rate / 100 + seed - 0.15));
  });
  const color = rate >= 80 ? '#4cd7f6' : rate >= 60 ? '#ffb786' : '#ffb4ab';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 36 }}>
      {bars.map((h, i) => <div key={i} style={{ flex: 1, height: `${h * 100}%`, borderRadius: '2px 2px 0 0', background: i === 6 ? color : color + '40' }} />)}
    </div>
  );
}

function EnrollmentChart({ trend = [] }) {
  const max = Math.max(...trend.map(t => t.count), 1);
  return (
    <div style={{ background: 'var(--ska-surface-card)', borderRadius: 16, padding: '20px 20px 28px', marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--ska-text)' }}>Enrollment Growth</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>Monthly Trend</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ska-secondary)' }}>
          <Ic name="trending_up" size="sm" /><span style={{ fontWeight: 700, fontSize: '0.8125rem' }}>This Year</span>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80 }}>
        {trend.map((t, i) => {
          const h = max > 0 ? (t.count / max) * 100 : 4;
          const isLast = i === trend.length - 1;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', height: `${Math.max(h, 4)}%`, background: isLast ? 'var(--ska-secondary)' : 'var(--ska-primary-dim)', borderRadius: '3px 3px 0 0' }} />
              <span style={{ fontSize: '0.625rem', color: isLast ? 'var(--ska-secondary)' : 'var(--ska-text-3)', fontWeight: isLast ? 700 : 500 }}>{t.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InsightsRow({ stats }) {
  if (!stats) return null;
  const flagged = stats.flagged || 0;
  const avg     = stats.avg_attendance;
  const cards = [
    { icon: 'trending_down', iconColor: 'var(--ska-error)',    borderColor: 'var(--ska-error)',     badge: 'High Risk',  badgeBg: 'var(--ska-error-dim)',       badgeColor: 'var(--ska-error)',    title: `${flagged} student${flagged !== 1 ? 's' : ''} at risk`, sub: 'Attendance < 70% or avg grade below threshold.' },
    { icon: 'event_busy',    iconColor: 'var(--ska-tertiary)', borderColor: 'var(--ska-tertiary)',   badge: 'Attendance', badgeBg: 'rgba(255,181,149,0.15)',     badgeColor: 'var(--ska-tertiary)', title: avg != null ? `School avg: ${avg}%` : 'No attendance data yet', sub: avg != null && avg < 90 ? 'Below the 90% school target.' : 'Tracking across all classes.' },
    { icon: 'analytics',     iconColor: 'var(--ska-secondary)',borderColor: 'rgba(76,215,246,0.3)', badge: 'Live',       badgeBg: 'var(--ska-secondary-dim)',   badgeColor: 'var(--ska-secondary)',title: `${stats.total || 0} total students enrolled`, sub: `${stats.new_this_term || 0} new admissions in the last 30 days.` },
  ];
  return (
    <div style={{ overflowX: 'auto', display: 'flex', gap: 12, paddingBottom: 4, marginBottom: 20, scrollbarWidth: 'none' }}>
      {cards.map((c, i) => (
        <div key={i} style={{ minWidth: 260, background: 'var(--ska-surface-card)', borderLeft: `3px solid ${c.borderColor}`, borderRadius: 12, padding: '14px 16px', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Ic name={c.icon} style={{ color: c.iconColor, fontSize: 20 }} />
            <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', background: c.badgeBg, color: c.badgeColor, padding: '2px 8px', borderRadius: 20 }}>{c.badge}</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--ska-text)', marginBottom: 4 }}>{c.title}</div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)' }}>{c.sub}</div>
        </div>
      ))}
    </div>
  );
}

const STATUS_CFG_S = {
  active:  { bg: 'rgba(74,222,128,0.12)', color: '#4ade80',           label: 'Active' },
  flagged: { bg: 'var(--ska-error-dim)',  color: 'var(--ska-error)',  label: 'At Risk' },
};
function statusCfgS(s) { return s.is_flagged ? STATUS_CFG_S.flagged : STATUS_CFG_S.active; }

function StudentCard({ s, onOpen }) {
  const cfg = statusCfgS(s);
  const att = s.attendance_rate;
  const attColor = att == null ? 'var(--ska-text-3)' : att >= 80 ? '#4cd7f6' : att >= 60 ? '#ffb786' : '#ffb4ab';
  return (
    <div onClick={() => onOpen(s)} style={{ background: 'var(--ska-surface-card)', borderRadius: 14, padding: 16, cursor: 'pointer', transition: 'background 0.15s', borderLeft: s.is_flagged ? '3px solid var(--ska-error)' : '3px solid transparent' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--ska-surface-high)'}
      onMouseLeave={e => e.currentTarget.style.background = 'var(--ska-surface-card)'}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <StudentAvatar name={s.full_name} size={40} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--ska-text)', lineHeight: 1.2 }}>{s.full_name}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)', marginTop: 2 }}>{s.admission_number}{s.classroom ? ` • ${s.classroom}` : ''}</div>
          </div>
        </div>
        <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        <div style={{ background: 'var(--ska-surface-low)', padding: '7px 8px', borderRadius: 8 }}>
          <div style={{ fontSize: '0.5rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Attendance</div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: attColor }}>{att != null ? `${att}%` : '—'}</div>
        </div>
        <div style={{ background: 'var(--ska-surface-low)', padding: '7px 8px', borderRadius: 8 }}>
          <div style={{ fontSize: '0.5rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 2 }}>Avg Grade</div>
          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--ska-text)' }}>{s.avg_grade != null ? s.avg_grade : '—'}</div>
        </div>
        <div style={{ background: 'var(--ska-surface-low)', padding: '7px 8px', borderRadius: 8, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '0.5rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>Parents</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Ic name={s.parent_count > 0 ? 'family_restroom' : 'person_off'} style={{ fontSize: 12, color: s.parent_count > 0 ? 'var(--ska-primary)' : 'var(--ska-text-3)' }} />
            <span style={{ fontSize: '0.5625rem', fontWeight: 600, color: s.parent_count > 0 ? 'var(--ska-primary)' : 'var(--ska-text-3)' }}>{s.parent_count > 0 ? `${s.parent_count} linked` : 'None'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentProfilePanel({ student, onClose, onEdit }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    ApiClient.get(`/api/school/students/${student.id}/`)
      .then(d => setData(d)).catch(() => setData(null)).finally(() => setLoading(false));
  }, [student.id]);

  const att = data?.attendance_rate ?? student.attendance_rate;
  const attColor = att == null ? 'var(--ska-text-3)' : att >= 80 ? '#4cd7f6' : att >= 60 ? '#ffb786' : '#ffb4ab';
  const grades = data?.grades || [];
  const parents = data?.parents || [];
  const cfg = statusCfgS(data || student);
  const avgGrade = data?.avg_grade ?? student.avg_grade;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(11,19,38,0.75)', backdropFilter: 'blur(4px)' }} />
      <aside style={{ position: 'relative', width: '100%', maxWidth: 480, height: '100%', background: 'var(--ska-surface-card)', boxShadow: '0 0 48px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflowY: 'hidden' }}>
        {/* Glass header */}
        <div style={{ background: 'rgba(34,42,61,0.85)', backdropFilter: 'blur(20px)', padding: '20px 20px 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 14 }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 64, height: 64, borderRadius: 14, background: _avatarColor(student.full_name) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '1.5rem', color: _avatarColor(student.full_name), border: `2px solid ${_avatarColor(student.full_name)}33` }}>
                  {(_initials(student.full_name) || '?').toUpperCase()}
                </div>
                <span style={{ position: 'absolute', bottom: -4, right: -4, width: 12, height: 12, borderRadius: '50%', background: student.is_flagged ? 'var(--ska-error)' : '#4ade80', border: '2px solid var(--ska-surface-card)' }} />
              </div>
              <div style={{ paddingTop: 4 }}>
                <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 800, color: 'var(--ska-text)' }}>{student.full_name}</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', marginTop: 6 }}>
                  {student.classroom && <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{student.classroom}</span>}
                  <span style={{ fontSize: '0.75rem', color: 'rgba(193,198,215,0.5)' }}>ADM: {student.admission_number}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', background: cfg.bg, color: cfg.color, borderRadius: 4, fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, display: 'inline-block' }} />
                    {cfg.label}
                  </span>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--ska-surface-high)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ska-text-3)', flexShrink: 0 }}>
              <Ic name="close" size="sm" />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--ska-text-3)' }}>Loading profile…</div>
          ) : (
            <>
              {/* Performance bento */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ background: 'var(--ska-surface-lowest)', borderRadius: 12, padding: 14 }}>
                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>Attendance</span>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 8 }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 900, color: attColor, lineHeight: 1 }}>{att != null ? `${att}%` : '—'}</span>
                    {att != null && <Ic name="trending_up" style={{ fontSize: 14, color: attColor, marginBottom: 2 }} />}
                  </div>
                  {att != null && <AttSparkline rate={att} studentId={student.id} />}
                </div>
                <div style={{ background: 'var(--ska-surface-lowest)', borderRadius: 12, padding: 14 }}>
                  <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>Avg Score</span>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, marginBottom: 8 }}>
                    <span style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--ska-primary)', lineHeight: 1 }}>{avgGrade != null ? avgGrade : '—'}</span>
                    {avgGrade != null && <span style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)', marginBottom: 4 }}>/100</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {avgGrade != null && <span style={{ padding: '3px 8px', borderRadius: 20, background: 'var(--ska-primary-dim)', color: 'var(--ska-primary)', fontSize: '0.625rem', fontWeight: 700 }}>{avgGrade >= 90 ? 'Excellent' : avgGrade >= 70 ? 'Good' : avgGrade >= 50 ? 'Average' : 'Needs Help'}</span>}
                    <Ic name="military_tech" style={{ color: 'var(--ska-primary)', fontSize: 18 }} />
                  </div>
                </div>
              </div>

              {/* Subject Mastery */}
              {grades.length > 0 && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <h3 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Ic name="school" style={{ color: 'var(--ska-primary)', fontSize: 16 }} /> Subject Mastery
                    </h3>
                    <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: 'var(--ska-text-3)', textTransform: 'uppercase' }}>{grades[0]?.term}</span>
                  </div>
                  <div style={{ borderRadius: 10, overflow: 'hidden', background: 'var(--ska-surface-low)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead><tr style={{ background: 'var(--ska-surface-lowest)' }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--ska-text-3)', textTransform: 'uppercase' }}>Subject</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--ska-text-3)', textTransform: 'uppercase' }}>Grade</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: '0.5625rem', fontWeight: 700, color: 'var(--ska-text-3)', textTransform: 'uppercase' }}>Score</th>
                      </tr></thead>
                      <tbody>
                        {grades.map((g, i) => {
                          const sc = g.grade_letter === 'A' ? '#adc6ff' : g.grade_letter === 'B' ? '#4cd7f6' : g.grade_letter === 'C' ? '#ffb786' : '#ffb4ab';
                          return (
                            <tr key={i} style={{ background: i % 2 === 1 ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 500, color: 'var(--ska-text)' }}>{g.subject}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: sc }}>{g.grade_letter}</td>
                              <td style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--ska-text-3)', fontWeight: 600 }}>{g.total_score}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Linked parents */}
              <div>
                <h3 style={{ margin: '0 0 10px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Ic name="family_history" style={{ color: 'var(--ska-primary)', fontSize: 16 }} /> Linked Accounts
                </h3>
                {parents.length === 0 ? (
                  <div style={{ padding: '10px 14px', background: 'var(--ska-surface-low)', borderRadius: 10, color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>No parent accounts linked.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {parents.map(p => (
                      <div key={p.id} style={{ background: 'var(--ska-surface-low)', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--ska-primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.875rem', color: 'var(--ska-primary)', flexShrink: 0 }}>
                          {(_initials(p.full_name) || '?').toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--ska-text)' }}>{p.full_name}</div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)' }}>{p.relationship}{p.is_primary ? ' · Primary' : ''}</div>
                        </div>
                        {p.phone && <div style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)' }}>{p.phone}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div>
                <h3 style={{ margin: '0 0 10px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Ic name="info" style={{ color: 'var(--ska-primary)', fontSize: 16 }} /> Details
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { icon: 'badge',          label: 'Admission No.',  value: data?.admission_number },
                    { icon: 'cake',           label: 'Date of Birth',  value: data?.date_of_birth ? new Date(data.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null },
                    { icon: 'mail',           label: 'Email',          value: data?.email },
                    { icon: 'phone',          label: 'Phone',          value: data?.phone_number },
                    { icon: 'calendar_today', label: 'Admitted',       value: data?.admission_date ? new Date(data.admission_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null },
                  ].filter(r => r.value).map(row => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--ska-surface-low)', borderRadius: 9 }}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--ska-primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Ic name={row.icon} style={{ color: 'var(--ska-primary)', fontSize: 14 }} />
                      </div>
                      <div>
                        <div style={{ fontSize: '0.5625rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{row.label}</div>
                        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--ska-text)' }}>{row.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: '12px 16px', background: 'var(--ska-surface-lowest)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, flexShrink: 0 }}>
          <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 9, border: '1px solid rgba(193,198,215,0.15)', background: 'transparent', color: 'var(--ska-text-3)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
            <Ic name="print" size="sm" /> Report Card
          </button>
          <button onClick={() => onEdit(data || student)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 9, border: 'none', background: 'var(--ska-primary-container)', color: '#fff', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
            <Ic name="edit" size="sm" /> Edit Profile
          </button>
        </div>
      </aside>
    </div>
  );
}

const RELATIONSHIP_OPTS = ['Father', 'Mother', 'Uncle', 'Aunt', 'Grandparent', 'Legal Guardian', 'Other'];

const STUDENT_WIZARD_STEPS = [
  { label: 'Identity',            icon: 'person'            },
  { label: 'Credentials & Class', icon: 'badge'             },
  { label: 'Family',              icon: 'family_restroom'   },
  { label: 'Medical & Enroll',    icon: 'health_and_safety' },
];

function _studentAvatarLetters(first, last) {
  const a = (first || '').trim()[0] || '';
  const b = (last  || '').trim()[0] || '';
  return (a + b).toUpperCase() || '?';
}

function _calcAge(dob) {
  if (!dob) return '';
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? String(age) : '';
}

const STUDENT_STATUS_OPTS = [
  { value: 'active',      label: 'Active',      color: '#22c55e' },
  { value: 'suspended',   label: 'Suspended',   color: '#f59e0b' },
  { value: 'transferred', label: 'Transferred', color: '#6366f1' },
  { value: 'graduated',   label: 'Graduated',   color: '#4b8eff' },
];

const STUDENT_TYPE_OPTS = [
  { value: 'day',      label: 'Day Student',       icon: 'directions_walk' },
  { value: 'boarding', label: 'Boarding / Hostel',  icon: 'hotel'           },
];

const FEE_CATEGORY_OPTS = [
  { value: 'full_paying',          label: 'Full-Paying'          },
  { value: 'partial_scholarship',  label: 'Partial Scholarship'  },
  { value: 'full_scholarship',     label: 'Full Scholarship'     },
  { value: 'government_sponsored', label: 'Government-Sponsored' },
  { value: 'bursary',              label: 'Bursary'              },
];

function AddStudentWizard({ school, classes, classesLoading = false, onSave, onCancel }) {
  const [step,          setStep]        = useState(0);
  const [saving,        setSaving]      = useState(false);
  const [error,         setError]       = useState('');
  const [credentials,   setCredentials] = useState(null);
  const [dupWarning,    setDupWarning]  = useState(null);
  const [form,          setForm]        = useState({
    first_name: '', last_name: '', gender: '', date_of_birth: '', age: '',
    phone_number: '', status: 'active',
    student_type: 'day', fee_category: '', home_language: '',
    admission_number: '', classroom_id: '', email: '', enrollment_date: '',
    father_name: '', father_email: '', father_phone: '', father_occupation: '',
    mother_name: '', mother_email: '', mother_phone: '', mother_occupation: '',
    blood_type: '', allergies: '', medical_notes: '',
    intake_term: '', is_repeater: false,
    middle_name: '', hostel_house: '',
    father_relationship: 'Father', mother_relationship: 'Mother',
    father_whatsapp: '', mother_whatsapp: '',
    father_existing_id: '', mother_existing_id: '',
  });
  const [profileImage,   setProfileImage]  = useState(null);
  const [profilePreview, setProfilePreview] = useState('');
  const [photoHover,     setPhotoHover]     = useState(false);
  const studentImgRef = React.useRef(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [fatherSearch,    setFatherSearch]    = useState('');
  const [fatherResults,   setFatherResults]   = useState([]);
  const [fatherSearching, setFatherSearching] = useState(false);
  const [fatherWASame,    setFatherWASame]    = useState(false);
  const [motherSearch,    setMotherSearch]    = useState('');
  const [motherResults,   setMotherResults]   = useState([]);
  const [motherSearching, setMotherSearching] = useState(false);
  const [motherWASame,    setMotherWASame]    = useState(false);

  useEffect(() => {
    if (!fatherSearch.trim() || fatherSearch.length < 2) { setFatherResults([]); return; }
    setFatherSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await ApiClient.get(`/api/school/parents/?q=${encodeURIComponent(fatherSearch.trim())}`);
        setFatherResults((r.parents || []).slice(0, 6));
      } catch (_) { setFatherResults([]); }
      setFatherSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [fatherSearch]);

  useEffect(() => {
    if (!motherSearch.trim() || motherSearch.length < 2) { setMotherResults([]); return; }
    setMotherSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await ApiClient.get(`/api/school/parents/?q=${encodeURIComponent(motherSearch.trim())}`);
        setMotherResults((r.parents || []).slice(0, 6));
      } catch (_) { setMotherResults([]); }
      setMotherSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [motherSearch]);

  const applyExistingParent = (prefix, p) => {
    setForm(f => ({
      ...f,
      [`${prefix}_name`]:        p.name || '',
      [`${prefix}_email`]:       p.email || '',
      [`${prefix}_phone`]:       p.phone || '',
      [`${prefix}_occupation`]:  p.occupation || '',
      [`${prefix}_whatsapp`]:    p.whatsapp || '',
      [`${prefix}_existing_id`]: String(p.id),
    }));
    if (prefix === 'father') { setFatherSearch(''); setFatherResults([]); }
    else                     { setMotherSearch(''); setMotherResults([]); }
  };

  const clearExistingParent = (prefix) => {
    setForm(f => ({
      ...f,
      [`${prefix}_name`]: '', [`${prefix}_email`]: '', [`${prefix}_phone`]: '',
      [`${prefix}_occupation`]: '', [`${prefix}_whatsapp`]: '',
      [`${prefix}_existing_id`]: '',
    }));
    if (prefix === 'father') setFatherWASame(false);
    else setMotherWASame(false);
  };

  const handleDobChange = (val) => {
    setForm(f => ({ ...f, date_of_birth: val, age: _calcAge(val) }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5 MB.'); return; }
    setError('');
    setProfileImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProfilePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const canNext = [
    !!(form.first_name.trim() && form.last_name.trim()),
    !!form.admission_number.trim(),
    true,
    true,
  ][step];

  const handleSave = async (bypass = false) => {
    setError('');
    setSaving(true);
    if (!bypass) {
      try {
        const params = new URLSearchParams({ first_name: form.first_name.trim(), last_name: form.last_name.trim() });
        if (form.date_of_birth) params.set('date_of_birth', form.date_of_birth);
        const chk = await ApiClient.get(`/api/school/students/check-duplicate/?${params}`);
        if (chk.exists) {
          setDupWarning(chk.student);
          setSaving(false);
          return;
        }
      } catch (_) {}
    }
    try {
      const fd = new FormData();
      const { age, ...submitFields } = form;
      Object.entries(submitFields).forEach(([k, v]) => {
        if (v === '' || v === null || v === undefined) return;
        fd.append(k, typeof v === 'boolean' ? (v ? 'true' : 'false') : v);
      });
      if (fatherWASame && form.father_phone) fd.set('father_whatsapp', form.father_phone);
      if (motherWASame && form.mother_phone) fd.set('mother_whatsapp', form.mother_phone);
      if (profileImage) fd.append('passport_picture', profileImage);
      const res = await ApiClient.post('/api/school/students/', fd);
      if (res.student_username) {
        setCredentials({ username: res.student_username, password: res.student_initial_password });
      } else {
        onSave();
      }
    } catch (e) { setError(e?.message || 'Failed to enroll student.'); setSaving(false); }
  };

  // eslint-disable-next-line no-unused-vars
  const printAdmissionSlip = () => {
    const intakeLbls = { TERM1: 'Term 1 (First)', TERM2: 'Term 2 (Second)', TERM3: 'Term 3 (Third)' };
    const enrollDate = form.enrollment_date || new Date().toISOString().split('T')[0];
    const printDate  = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const resolvedFatherWA = fatherWASame ? form.father_phone : form.father_whatsapp;
    const resolvedMotherWA = motherWASame ? form.mother_phone : form.mother_whatsapp;
    const fullName = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ') || 'Student';
    const w = window.open('', '_blank', 'width=794,height=1123');
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8"><title>Admission Slip — ${fullName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Times New Roman',Times,serif;padding:48px 56px;color:#111;font-size:13px;line-height:1.5}
.hdr{text-align:center;border-bottom:3px double #111;padding-bottom:18px;margin-bottom:24px}
.school-name{font-size:22px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4px}
.school-meta{font-size:12px;color:#555;margin-top:2px}
.slip-title{font-size:14px;font-weight:700;text-align:center;text-transform:uppercase;letter-spacing:3px;border:1.5px solid #111;padding:7px 0;margin-bottom:22px}
.section{margin-bottom:18px}
.sec-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#666;border-bottom:1px solid #bbb;padding-bottom:4px;margin-bottom:8px}
.row{display:flex;padding:6px 0;border-bottom:1px dashed #ddd}
.lbl{width:170px;font-weight:700;font-size:12px;color:#444;flex-shrink:0}
.val{flex:1;font-size:13px}
.footer{margin-top:52px;display:flex;justify-content:space-between}
.sig{width:170px;text-align:center}.sig-line{border-top:1px solid #111;padding-top:6px;font-size:11px;color:#555}
.wm{margin-top:36px;text-align:center;font-size:9px;color:#bbb}
@media print{body{padding:24px 32px}}
</style></head><body>
<div class="hdr">
  <div class="school-name">${school?.name || 'School Name'}</div>
  ${school?.address ? `<div class="school-meta">${school.address}</div>` : ''}
  ${school?.phone ? `<div class="school-meta">Tel: ${school.phone}</div>` : ''}
  ${school?.email ? `<div class="school-meta">Email: ${school.email}</div>` : ''}
</div>
<div class="slip-title">Student Admission Slip</div>
<div class="section">
  <div class="sec-title">Student Details</div>
  <div class="row"><span class="lbl">Full Name</span><span class="val">${fullName}</span></div>
  <div class="row"><span class="lbl">Admission Number</span><span class="val">${form.admission_number || '—'}</span></div>
  <div class="row"><span class="lbl">Class</span><span class="val">${currentClass || '—'}</span></div>
  <div class="row"><span class="lbl">Date of Birth</span><span class="val">${form.date_of_birth || '—'}</span></div>
  <div class="row"><span class="lbl">Gender</span><span class="val">${form.gender === 'M' ? 'Male' : form.gender === 'F' ? 'Female' : '—'}</span></div>
  <div class="row"><span class="lbl">Enrollment Date</span><span class="val">${enrollDate}</span></div>
  ${form.intake_term ? `<div class="row"><span class="lbl">Intake Term</span><span class="val">${intakeLbls[form.intake_term] || form.intake_term}</span></div>` : ''}
  <div class="row"><span class="lbl">Student Type</span><span class="val">${form.student_type === 'boarding' ? 'Boarding / Hostel' : 'Day Student'}${form.hostel_house ? ' — ' + form.hostel_house : ''}</span></div>
  ${form.is_repeater ? '<div class="row"><span class="lbl">Repeating Year</span><span class="val">Yes</span></div>' : ''}
</div>
${form.father_name || form.mother_name ? `<div class="section">
  <div class="sec-title">Parent / Guardian</div>
  ${form.father_name ? `<div class="row"><span class="lbl">${form.father_relationship || 'Father'}</span><span class="val">${form.father_name}${form.father_phone ? ' &nbsp;·&nbsp; Tel: ' + form.father_phone : ''}${resolvedFatherWA && resolvedFatherWA !== form.father_phone ? ' &nbsp;·&nbsp; WhatsApp: ' + resolvedFatherWA : ''}</span></div>` : ''}
  ${form.mother_name ? `<div class="row"><span class="lbl">${form.mother_relationship || 'Mother'}</span><span class="val">${form.mother_name}${form.mother_phone ? ' &nbsp;·&nbsp; Tel: ' + form.mother_phone : ''}${resolvedMotherWA && resolvedMotherWA !== form.mother_phone ? ' &nbsp;·&nbsp; WhatsApp: ' + resolvedMotherWA : ''}</span></div>` : ''}
</div>` : ''}
<div class="footer">
  <div class="sig"><div class="sig-line">Head Teacher / Principal</div></div>
  <div class="sig"><div class="sig-line">School Stamp</div></div>
  <div class="sig"><div class="sig-line">Date: ${printDate}</div></div>
</div>
<div class="wm">Generated by EK-SMS &mdash; ${new Date().toLocaleString()}</div>
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const avatarLetters = _studentAvatarLetters(form.first_name, form.last_name);
  const displayName   = [form.first_name, form.middle_name, form.last_name].filter(Boolean).join(' ') || 'New Student';
  const currentClass  = classes.find(c => String(c.id) === String(form.classroom_id))?.name || '';
  const filledCount   = [form.first_name, form.last_name, form.gender, form.date_of_birth, form.admission_number, form.classroom_id, profileImage, form.enrollment_date].filter(Boolean).length;
  const completionPct = Math.round((filledCount / 8) * 100);
  const genderIcon    = form.gender === 'M' ? 'male' : form.gender === 'F' ? 'female' : 'person';
  const statusColor   = STUDENT_STATUS_OPTS.find(o => o.value === form.status)?.color || '#22c55e';

  if (credentials) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ width: '100%', maxWidth: 440, background: 'var(--ska-surface-low)', borderRadius: 20, padding: '32px 28px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(75,142,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-rounded" style={{ fontSize: 32, color: '#4b8eff' }}>how_to_reg</span>
            </div>
            <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.25rem', color: 'var(--ska-text)', textAlign: 'center' }}>Student Enrolled!</h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ska-text-3)', textAlign: 'center' }}>Share these login credentials with the student.</p>
          </div>
          <div style={{ background: 'var(--ska-surface-high)', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14, border: '1px solid var(--ska-border)' }}>
            <div>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ska-text-3)', marginBottom: 4 }}>Username</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.9375rem', fontWeight: 700, color: '#4b8eff', background: 'rgba(75,142,255,0.08)', padding: '8px 12px', borderRadius: 8, letterSpacing: '0.05em' }}>{credentials.username}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ska-text-3)', marginBottom: 4 }}>Default Password</div>
              <div style={{ fontFamily: 'monospace', fontSize: '0.9375rem', fontWeight: 700, color: '#4cd7f6', background: 'rgba(76,215,246,0.08)', padding: '8px 12px', borderRadius: 8, letterSpacing: '0.05em' }}>{credentials.password}</div>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)', textAlign: 'center', lineHeight: 1.5 }}>
            The default password is the admission number. The student can change it after first login.
          </p>
          <button className="ska-btn ska-btn--primary" onClick={onSave} style={{ width: '100%' }}>
            <span className="material-symbols-rounded" style={{ fontSize: 16 }}>check</span>Done
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
      animation: 'ska-overlay-in 0.12s ease',
    }} onClick={e => e.target === e.currentTarget && onCancel()}>
      <style>{`
        @media(max-width:600px){.student-wizard-panel{display:none!important}}
        @media(max-width:460px){.student-name-grid{grid-template-columns:1fr 1fr!important}}
        @keyframes ska-overlay-in{from{opacity:0}to{opacity:1}}
        @keyframes ska-panel-in{from{opacity:0;transform:scale(0.97) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}
      `}</style>

      <div style={{
        background: 'var(--ska-surface)', borderRadius: 20,
        width: '100%', maxWidth: 760,
        display: 'flex', overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)', maxHeight: '90vh',
        animation: 'ska-panel-in 0.15s ease',
      }}>

        {/* ── Left panel (live preview) ── */}
        <div className="student-wizard-panel" style={{
          width: 220, flexShrink: 0,
          background: 'linear-gradient(160deg,#0d1b3e 0%,#0a1628 100%)',
          padding: '32px 20px',
          display: 'flex', flexDirection: 'column', gap: 20,
          borderRight: '1px solid rgba(173,198,255,0.08)',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(173,198,255,0.5)', fontWeight: 700 }}>Institution</span>
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#adc6ff', lineHeight: 1.3 }}>{school?.name || '—'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%',
              background: 'linear-gradient(135deg,#4b8eff,#adc6ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 800, color: '#fff',
              boxShadow: '0 4px 16px rgba(75,142,255,0.35)', position: 'relative',
              overflow: 'hidden',
            }}>
              {profilePreview
                ? <img src={profilePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                : avatarLetters
              }
              {form.gender && !profilePreview && (
                <span style={{
                  position: 'absolute', bottom: 0, right: 0,
                  width: 22, height: 22, borderRadius: '50%',
                  background: form.gender === 'M' ? '#4b8eff' : '#e879a0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid #0d1b3e',
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 12, color: '#fff' }}>{genderIcon}</span>
                </span>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem', lineHeight: 1.3 }}>{displayName}</div>
              {currentClass && <div style={{ fontSize: '0.6875rem', color: 'rgba(173,198,255,0.65)', marginTop: 3 }}>Class {currentClass}</div>}
              {form.admission_number && <div style={{ fontSize: '0.6875rem', color: 'rgba(173,198,255,0.45)', marginTop: 2 }}>{form.admission_number}</div>}
              {form.status !== 'active' && (
                <div style={{ fontSize: '0.625rem', fontWeight: 700, color: statusColor, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{form.status}</div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(173,198,255,0.5)', fontWeight: 700 }}>Profile</span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#adc6ff' }}>{completionPct}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${completionPct}%`, background: 'linear-gradient(90deg,#4b8eff,#adc6ff)', borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
            {STUDENT_WIZARD_STEPS.map((s, i) => {
              const done   = i < step;
              const active = i === step;
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 10,
                  background: active ? 'rgba(75,142,255,0.18)' : 'transparent',
                  border: active ? '1px solid rgba(75,142,255,0.35)' : '1px solid transparent',
                  transition: 'all 0.2s',
                }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 16, color: done ? '#6ce0b0' : active ? '#adc6ff' : 'rgba(173,198,255,0.3)' }}>{done ? 'check_circle' : s.icon}</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: done || active ? 700 : 500, color: done ? '#6ce0b0' : active ? '#adc6ff' : 'rgba(173,198,255,0.3)' }}>{s.label}</span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 'auto', padding: '10px 12px', borderRadius: 10, background: 'rgba(173,198,255,0.06)', border: '1px solid rgba(173,198,255,0.1)' }}>
            <span style={{ fontSize: '0.6875rem', color: 'rgba(173,198,255,0.55)', lineHeight: 1.5 }}>
              Student credentials will be configured by the school administrator after enrolment.
            </span>
          </div>
        </div>

        {/* ── Right panel (form) ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          <div style={{
            padding: '20px 28px 16px',
            borderBottom: '1px solid var(--ska-surface-high)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '0.625rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ska-text-3)', fontWeight: 700, marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>Step {step + 1} of {STUDENT_WIZARD_STEPS.length}</span>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--ska-text-3)', display: 'inline-block' }} />
                <span style={{ color: 'var(--ska-primary)' }}>{Math.round(((step + 1) / STUDENT_WIZARD_STEPS.length) * 100)}% complete</span>
              </div>
              <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--ska-text)' }}>
                {STUDENT_WIZARD_STEPS[step].label}
              </div>
            </div>
            <button onClick={onCancel} style={{
              background: 'var(--ska-surface-high)', border: 'none', borderRadius: 8,
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--ska-text-3)',
            }}><Ic name="close" size="sm" /></button>
          </div>

          <div style={{ height: 4, background: 'var(--ska-surface-high)' }}>
            <div style={{
              height: '100%', width: `${((step + 1) / STUDENT_WIZARD_STEPS.length) * 100}%`,
              background: 'linear-gradient(90deg,#4b8eff,#adc6ff)', transition: 'width 0.4s ease',
              borderRadius: '0 2px 2px 0',
            }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>

            {/* ── Step 0: Identity ── */}
            {step === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} ref={studentImgRef} onChange={handleImageChange} />
                  <div
                    onClick={() => studentImgRef.current?.click()}
                    onMouseEnter={() => setPhotoHover(true)}
                    onMouseLeave={() => setPhotoHover(false)}
                    style={{
                      width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
                      background: profilePreview ? 'transparent' : 'var(--ska-surface-high)',
                      border: `2px dashed ${profilePreview ? 'var(--ska-primary)' : 'var(--ska-surface-highest)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', overflow: 'hidden', position: 'relative',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    {profilePreview
                      ? <img src={profilePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span className="material-symbols-rounded" style={{ fontSize: 28, color: 'var(--ska-text-3)' }}>add_a_photo</span>
                    }
                    {profilePreview && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: photoHover ? 1 : 0, transition: 'opacity 0.2s',
                      }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 22, color: '#fff' }}>photo_camera</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text)' }}>
                      {profilePreview ? 'Photo uploaded' : 'Upload photo'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', lineHeight: 1.4 }}>
                      JPG, PNG or WebP · max 5 MB
                    </span>
                    {profilePreview && (
                      <button type="button" onClick={() => { setProfileImage(null); setProfilePreview(''); setPhotoHover(false); }} style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontSize: '0.75rem', color: 'var(--ska-error)', fontWeight: 600, textAlign: 'left',
                      }}>Remove</button>
                    )}
                  </div>
                </div>
                <div className="student-name-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <label className="ska-form-group" style={{ margin: 0 }}>
                    <span>First Name <span style={{ color: 'var(--ska-error)' }}>*</span></span>
                    <input className="ska-input" value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="e.g. Amara" autoFocus />
                  </label>
                  <label className="ska-form-group" style={{ margin: 0 }}>
                    <span>Middle Name</span>
                    <input className="ska-input" value={form.middle_name} onChange={e => set('middle_name', e.target.value)} placeholder="e.g. Binta" />
                  </label>
                  <label className="ska-form-group" style={{ margin: 0 }}>
                    <span>Last Name <span style={{ color: 'var(--ska-error)' }}>*</span></span>
                    <input className="ska-input" value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="e.g. Kamara" />
                  </label>
                </div>
                <div className="ska-form-group" style={{ margin: 0 }}>
                  <span>Gender</span>
                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    {[{ value: 'M', label: 'Male', icon: 'male' }, { value: 'F', label: 'Female', icon: 'female' }].map(opt => (
                      <button key={opt.value} type="button" onClick={() => set('gender', form.gender === opt.value ? '' : opt.value)} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem',
                        transition: 'all 0.15s',
                        background: form.gender === opt.value ? (opt.value === 'M' ? 'rgba(75,142,255,0.18)' : 'rgba(232,121,160,0.18)') : 'var(--ska-surface-low)',
                        border: form.gender === opt.value ? `2px solid ${opt.value === 'M' ? '#4b8eff' : '#e879a0'}` : '2px solid var(--ska-surface-high)',
                        color: form.gender === opt.value ? (opt.value === 'M' ? '#4b8eff' : '#e879a0') : 'var(--ska-text-3)',
                      }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label className="ska-form-group" style={{ margin: 0 }}>
                    <span>Date of Birth</span>
                    <input className="ska-input" type="date" value={form.date_of_birth} onChange={e => handleDobChange(e.target.value)} />
                  </label>
                  <label className="ska-form-group" style={{ margin: 0 }}>
                    <span>Age <span style={{ fontSize: '0.7rem', color: 'var(--ska-text-3)', fontWeight: 400 }}>(auto)</span></span>
                    <input className="ska-input" value={form.age} readOnly placeholder="—" style={{ background: 'var(--ska-surface-high)', color: form.age ? 'var(--ska-text)' : 'var(--ska-text-3)', cursor: 'default' }} />
                  </label>
                </div>
                <label className="ska-form-group" style={{ margin: 0 }}>
                  <span>Phone Number</span>
                  <input className="ska-input" value={form.phone_number} onChange={e => set('phone_number', e.target.value)} placeholder="+232-xx-xxx-xxx" />
                </label>
                <label className="ska-form-group" style={{ margin: 0 }}>
                  <span>Status</span>
                  <select className="ska-input" value={form.status} onChange={e => set('status', e.target.value)}>
                    {STUDENT_STATUS_OPTS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <div className="ska-form-group" style={{ margin: 0 }}>
                  <span>Student Type</span>
                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    {STUDENT_TYPE_OPTS.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setForm(f => ({ ...f, student_type: opt.value, ...(opt.value === 'day' ? { hostel_house: '' } : {}) }))} style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem',
                        transition: 'all 0.15s',
                        background: form.student_type === opt.value ? 'rgba(75,142,255,0.18)' : 'var(--ska-surface-low)',
                        border: form.student_type === opt.value ? '2px solid #4b8eff' : '2px solid var(--ska-surface-high)',
                        color: form.student_type === opt.value ? '#4b8eff' : 'var(--ska-text-3)',
                      }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 18 }}>{opt.icon}</span>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {form.student_type === 'boarding' && (
                  <label className="ska-form-group" style={{ margin: 0 }}>
                    <span>House / Hostel Block</span>
                    <input className="ska-input" value={form.hostel_house} onChange={e => set('hostel_house', e.target.value)} placeholder="e.g. Girls Hostel, Block A, Sunrise House" />
                  </label>
                )}
                <label className="ska-form-group" style={{ margin: 0 }}>
                  <span>Fee / Scholarship Category</span>
                  <select className="ska-input" value={form.fee_category} onChange={e => set('fee_category', e.target.value)}>
                    <option value="">— Select category —</option>
                    {FEE_CATEGORY_OPTS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </label>
                <label className="ska-form-group" style={{ margin: 0 }}>
                  <span>Home Language</span>
                  <input className="ska-input" value={form.home_language} onChange={e => set('home_language', e.target.value)} placeholder="e.g. Krio, Mende, Temne" />
                </label>
              </div>
            )}

            {/* ── Step 1: Credentials & Class ── */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label className="ska-form-group" style={{ margin: 0 }}>
                    <span>Admission No. <span style={{ color: 'var(--ska-error)' }}>*</span></span>
                    <input className="ska-input" value={form.admission_number} onChange={e => set('admission_number', e.target.value)} placeholder="ADM-2024-001" autoFocus />
                  </label>
                  <label className="ska-form-group" style={{ margin: 0 }}>
                    <span>Enrollment Date</span>
                    <input className="ska-input" type="date" value={form.enrollment_date} onChange={e => set('enrollment_date', e.target.value)} />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <label className="ska-form-group" style={{ margin: 0 }}>
                    <span>Class</span>
                    {classesLoading ? (
                      <div style={{
                        height: 40, borderRadius: 8, background: 'var(--ska-surface-high)',
                        animation: 'ska-pulse 1.4s ease-in-out infinite',
                        display: 'flex', alignItems: 'center', paddingLeft: 12,
                        fontSize: '0.8125rem', color: 'var(--ska-text-3)', gap: 8,
                      }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 14, animation: 'ska-spin 0.8s linear infinite', display: 'inline-block' }}>autorenew</span>
                        Loading classes…
                      </div>
                    ) : (
                      <select className="ska-input" value={form.classroom_id} onChange={e => set('classroom_id', e.target.value)}>
                        <option value="">— Assign later —</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </label>
                  <label className="ska-form-group" style={{ margin: 0 }}>
                    <span>Email Address</span>
                    <input className="ska-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="student@school.com" />
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'end' }}>
                  <label className="ska-form-group" style={{ margin: 0 }}>
                    <span>Intake Term</span>
                    <select className="ska-input" value={form.intake_term} onChange={e => set('intake_term', e.target.value)}>
                      <option value="">— Select term —</option>
                      <option value="TERM1">Term 1 (First Term)</option>
                      <option value="TERM2">Term 2 (Second Term)</option>
                      <option value="TERM3">Term 3 (Third Term)</option>
                    </select>
                  </label>
                  <button type="button" onClick={() => set('is_repeater', !form.is_repeater)} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                    fontWeight: 700, fontSize: '0.8125rem', transition: 'all 0.15s',
                    background: form.is_repeater ? 'rgba(245,158,11,0.12)' : 'var(--ska-surface-low)',
                    border: `2px solid ${form.is_repeater ? '#f59e0b' : 'var(--ska-surface-high)'}`,
                    color: form.is_repeater ? '#f59e0b' : 'var(--ska-text-3)',
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18 }}>
                      {form.is_repeater ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    Repeating year
                  </button>
                </div>
                {(form.admission_number || form.classroom_id) && (
                  <div style={{
                    padding: '14px 16px', borderRadius: 12,
                    background: 'var(--ska-surface-low)', border: '1px solid var(--ska-surface-high)',
                    display: 'flex', flexDirection: 'column', gap: 8,
                  }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--ska-primary)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Enrolment Preview</span>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#4b8eff,#adc6ff)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '0.875rem', color: '#fff',
                        overflow: 'hidden', flexShrink: 0,
                      }}>
                        {profilePreview
                          ? <img src={profilePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : avatarLetters
                        }
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--ska-text)' }}>{displayName}</div>
                        {form.admission_number && <div style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{form.admission_number}</div>}
                        {currentClass && <div style={{ fontSize: '0.75rem', color: 'var(--ska-primary)', fontWeight: 600 }}>Class {currentClass}</div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Step 2: Family ── */}
            {step === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#4b8eff' }}>person</span>
                    <select value={form.father_relationship} onChange={e => set('father_relationship', e.target.value)} style={{ padding: '4px 8px', height: 32, fontSize: '0.8125rem', fontWeight: 700, minWidth: 150, borderRadius: 8, border: '1.5px solid var(--ska-surface-high)', background: 'var(--ska-surface-low)', color: 'var(--ska-text)', cursor: 'pointer' }}>
                      {RELATIONSHIP_OPTS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)' }}>(optional)</span>
                  </div>
                  {form.father_existing_id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(75,142,255,0.08)', border: '1px solid rgba(75,142,255,0.25)' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#4b8eff' }}>link</span>
                      <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 700, color: '#4b8eff' }}>Linked: {form.father_name || 'Existing parent'}</span>
                      <button type="button" onClick={() => clearExistingParent('father')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--ska-text-3)', display: 'flex', alignItems: 'center' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'relative' }}>
                        <span className="material-symbols-rounded" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--ska-text-3)', pointerEvents: 'none', zIndex: 1 }}>search</span>
                        <input className="ska-input" style={{ paddingLeft: 38 }} placeholder="Search existing parent by name or phone…" value={fatherSearch} onChange={e => setFatherSearch(e.target.value)} onBlur={() => setTimeout(() => setFatherResults([]), 150)} />
                        {fatherSearching && <span className="material-symbols-rounded" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--ska-text-3)', animation: 'ska-spin 0.8s linear infinite', display: 'inline-block' }}>autorenew</span>}
                      </div>
                      {fatherResults.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--ska-surface-high)', border: '1px solid var(--ska-border)', borderRadius: 10, marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                          {fatherResults.map(p => (
                            <button key={p.id} type="button" onMouseDown={() => applyExistingParent('father', p)} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--ska-surface-low)', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text)' }}>{p.name}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{p.phone}{p.email ? ` · ${p.email}` : ''}{p.children?.length ? ` · ${p.children.length} child${p.children.length > 1 ? 'ren' : ''}` : ''}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <label className="ska-form-group" style={{ margin: 0 }}>
                      <span>Full Name</span>
                      <input className="ska-input" value={form.father_name} onChange={e => set('father_name', e.target.value)} placeholder="e.g. Ibrahim Kamara" readOnly={!!form.father_existing_id} style={form.father_existing_id ? { background: 'var(--ska-surface-high)', cursor: 'default' } : {}} />
                    </label>
                    <label className="ska-form-group" style={{ margin: 0 }}>
                      <span>Phone</span>
                      <input className="ska-input" value={form.father_phone} onChange={e => set('father_phone', e.target.value)} placeholder="+232-xx-xxx-xxx" readOnly={!!form.father_existing_id} style={form.father_existing_id ? { background: 'var(--ska-surface-high)', cursor: 'default' } : {}} />
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <label className="ska-form-group" style={{ margin: 0 }}>
                      <span>Email</span>
                      <input className="ska-input" type="email" value={form.father_email} onChange={e => set('father_email', e.target.value)} placeholder="father@email.com" readOnly={!!form.father_existing_id} style={form.father_existing_id ? { background: 'var(--ska-surface-high)', cursor: 'default' } : {}} />
                    </label>
                    <label className="ska-form-group" style={{ margin: 0 }}>
                      <span>Occupation</span>
                      <input className="ska-input" value={form.father_occupation} onChange={e => set('father_occupation', e.target.value)} placeholder="e.g. Teacher" readOnly={!!form.father_existing_id} style={form.father_existing_id ? { background: 'var(--ska-surface-high)', cursor: 'default' } : {}} />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <label className="ska-form-group" style={{ margin: 0, flex: 1 }}>
                      <span>WhatsApp <span style={{ fontSize: '0.7rem', color: '#25d366', fontWeight: 700 }}>W</span></span>
                      <input className="ska-input" value={fatherWASame ? form.father_phone : form.father_whatsapp} onChange={e => !fatherWASame && set('father_whatsapp', e.target.value)} placeholder="+232-xx-xxx-xxx" readOnly={fatherWASame} style={fatherWASame ? { background: 'var(--ska-surface-high)', cursor: 'default' } : {}} />
                    </label>
                    <button type="button" onClick={() => setFatherWASame(v => !v)} style={{ padding: '0 12px', height: 40, borderRadius: 10, flexShrink: 0, cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', background: fatherWASame ? 'rgba(37,211,102,0.1)' : 'var(--ska-surface-low)', border: `1.5px solid ${fatherWASame ? '#25d366' : 'var(--ska-surface-high)'}`, color: fatherWASame ? '#25d366' : 'var(--ska-text-3)' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 14 }}>{fatherWASame ? 'check_circle' : 'phone'}</span>
                      Same as phone
                    </button>
                  </div>
                </div>
                <div style={{ height: 1, background: 'var(--ska-surface-high)' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#e879a0' }}>person</span>
                    <select value={form.mother_relationship} onChange={e => set('mother_relationship', e.target.value)} style={{ padding: '4px 8px', height: 32, fontSize: '0.8125rem', fontWeight: 700, minWidth: 150, borderRadius: 8, border: '1.5px solid var(--ska-surface-high)', background: 'var(--ska-surface-low)', color: 'var(--ska-text)', cursor: 'pointer' }}>
                      {RELATIONSHIP_OPTS.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)' }}>(optional)</span>
                  </div>
                  {form.mother_existing_id ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(232,121,160,0.08)', border: '1px solid rgba(232,121,160,0.25)' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 16, color: '#e879a0' }}>link</span>
                      <span style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 700, color: '#e879a0' }}>Linked: {form.mother_name || 'Existing parent'}</span>
                      <button type="button" onClick={() => clearExistingParent('mother')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--ska-text-3)', display: 'flex', alignItems: 'center' }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 16 }}>close</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'relative' }}>
                        <span className="material-symbols-rounded" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--ska-text-3)', pointerEvents: 'none', zIndex: 1 }}>search</span>
                        <input className="ska-input" style={{ paddingLeft: 38 }} placeholder="Search existing parent by name or phone…" value={motherSearch} onChange={e => setMotherSearch(e.target.value)} onBlur={() => setTimeout(() => setMotherResults([]), 150)} />
                        {motherSearching && <span className="material-symbols-rounded" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: 'var(--ska-text-3)', animation: 'ska-spin 0.8s linear infinite', display: 'inline-block' }}>autorenew</span>}
                      </div>
                      {motherResults.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: 'var(--ska-surface-high)', border: '1px solid var(--ska-border)', borderRadius: 10, marginTop: 4, overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}>
                          {motherResults.map(p => (
                            <button key={p.id} type="button" onMouseDown={() => applyExistingParent('mother', p)} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid var(--ska-surface-low)', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 2 }}>
                              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text)' }}>{p.name}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{p.phone}{p.email ? ` · ${p.email}` : ''}{p.children?.length ? ` · ${p.children.length} child${p.children.length > 1 ? 'ren' : ''}` : ''}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <label className="ska-form-group" style={{ margin: 0 }}>
                      <span>Full Name</span>
                      <input className="ska-input" value={form.mother_name} onChange={e => set('mother_name', e.target.value)} placeholder="e.g. Fatima Kamara" readOnly={!!form.mother_existing_id} style={form.mother_existing_id ? { background: 'var(--ska-surface-high)', cursor: 'default' } : {}} />
                    </label>
                    <label className="ska-form-group" style={{ margin: 0 }}>
                      <span>Phone</span>
                      <input className="ska-input" value={form.mother_phone} onChange={e => set('mother_phone', e.target.value)} placeholder="+232-xx-xxx-xxx" readOnly={!!form.mother_existing_id} style={form.mother_existing_id ? { background: 'var(--ska-surface-high)', cursor: 'default' } : {}} />
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <label className="ska-form-group" style={{ margin: 0 }}>
                      <span>Email</span>
                      <input className="ska-input" type="email" value={form.mother_email} onChange={e => set('mother_email', e.target.value)} placeholder="mother@email.com" readOnly={!!form.mother_existing_id} style={form.mother_existing_id ? { background: 'var(--ska-surface-high)', cursor: 'default' } : {}} />
                    </label>
                    <label className="ska-form-group" style={{ margin: 0 }}>
                      <span>Occupation</span>
                      <input className="ska-input" value={form.mother_occupation} onChange={e => set('mother_occupation', e.target.value)} placeholder="e.g. Nurse" readOnly={!!form.mother_existing_id} style={form.mother_existing_id ? { background: 'var(--ska-surface-high)', cursor: 'default' } : {}} />
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                    <label className="ska-form-group" style={{ margin: 0, flex: 1 }}>
                      <span>WhatsApp <span style={{ fontSize: '0.7rem', color: '#25d366', fontWeight: 700 }}>W</span></span>
                      <input className="ska-input" value={motherWASame ? form.mother_phone : form.mother_whatsapp} onChange={e => !motherWASame && set('mother_whatsapp', e.target.value)} placeholder="+232-xx-xxx-xxx" readOnly={motherWASame} style={motherWASame ? { background: 'var(--ska-surface-high)', cursor: 'default' } : {}} />
                    </label>
                    <button type="button" onClick={() => setMotherWASame(v => !v)} style={{ padding: '0 12px', height: 40, borderRadius: 10, flexShrink: 0, cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', background: motherWASame ? 'rgba(37,211,102,0.1)' : 'var(--ska-surface-low)', border: `1.5px solid ${motherWASame ? '#25d366' : 'var(--ska-surface-high)'}`, color: motherWASame ? '#25d366' : 'var(--ska-text-3)' }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 14 }}>{motherWASame ? 'check_circle' : 'phone'}</span>
                      Same as phone
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Medical & Enroll ── */}
            {step === 3 && (() => {
              const statusOpt = STUDENT_STATUS_OPTS.find(o => o.value === form.status);
              const studentTypeLabel = STUDENT_TYPE_OPTS.find(o => o.value === form.student_type)?.label || 'Day Student';
              const feeCatLabel      = FEE_CATEGORY_OPTS.find(o => o.value === form.fee_category)?.label || '—';
              const intakeTermLabels = { TERM1: 'Term 1 (First)', TERM2: 'Term 2 (Second)', TERM3: 'Term 3 (Third)' };
              const reviewRows = [
                { icon: 'person',            label: 'Full Name',       value: displayName },
                { icon: form.gender === 'M' ? 'male' : form.gender === 'F' ? 'female' : 'wc', label: 'Gender', value: form.gender === 'M' ? 'Male' : form.gender === 'F' ? 'Female' : '—' },
                { icon: 'badge',             label: 'Admission No.',   value: form.admission_number || '—' },
                { icon: 'event',             label: 'Enrollment Date', value: form.enrollment_date || '—' },
                { icon: 'calendar_month',    label: 'Intake Term',     value: intakeTermLabels[form.intake_term] || '—' },
                { icon: 'school',            label: 'Class',           value: currentClass || '—' },
                { icon: 'cake',              label: 'Date of Birth',   value: form.date_of_birth || '—' },
                { icon: 'directions_walk',   label: 'Student Type',    value: studentTypeLabel },
                { icon: 'payments',          label: 'Fee Category',    value: feeCatLabel },
                { icon: 'translate',         label: 'Home Language',   value: form.home_language || '—' },
                { icon: 'info',              label: 'Status',          value: statusOpt?.label || 'Active', color: statusOpt?.color },
                { icon: form.is_repeater ? 'replay' : 'school', label: 'Repeater', value: form.is_repeater ? 'Yes — repeating year' : 'No', color: form.is_repeater ? '#f59e0b' : undefined },
              ];
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#4cd7f6' }}>health_and_safety</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ska-text)' }}>Medical Information</span>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)' }}>(optional)</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <label className="ska-form-group" style={{ margin: 0 }}>
                        <span>Blood Type</span>
                        <select className="ska-input" value={form.blood_type} onChange={e => set('blood_type', e.target.value)}>
                          <option value="">— Unknown —</option>
                          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => (
                            <option key={bt} value={bt}>{bt}</option>
                          ))}
                        </select>
                      </label>
                      <label className="ska-form-group" style={{ margin: 0 }}>
                        <span>Known Allergies</span>
                        <input className="ska-input" value={form.allergies} onChange={e => set('allergies', e.target.value)} placeholder="e.g. Penicillin, dust" />
                      </label>
                    </div>
                    <label className="ska-form-group" style={{ margin: 0 }}>
                      <span>Medical Notes</span>
                      <textarea className="ska-input" value={form.medical_notes} onChange={e => set('medical_notes', e.target.value)} placeholder="Any conditions, medications, or special needs…" rows={3} style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                    </label>
                  </div>

                  <div style={{ height: 1, background: 'var(--ska-surface-high)' }} />

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ska-text-3)' }}>Review Summary</span>
                    <div style={{
                      padding: '14px 16px', borderRadius: 12,
                      background: 'linear-gradient(135deg,rgba(75,142,255,0.1) 0%,rgba(173,198,255,0.05) 100%)',
                      border: '1px solid rgba(75,142,255,0.18)',
                      display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4,
                    }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        background: 'linear-gradient(135deg,#4b8eff,#adc6ff)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '1rem', color: '#fff',
                        overflow: 'hidden', flexShrink: 0,
                      }}>
                        {profilePreview ? <img src={profilePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatarLetters}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: 'var(--ska-text)' }}>{displayName}</div>
                        {currentClass && <div style={{ fontSize: '0.75rem', color: 'var(--ska-primary)', fontWeight: 600, marginTop: 2 }}>Class {currentClass}</div>}
                        <div style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)', marginTop: 1 }}>{school?.name || ''}</div>
                      </div>
                    </div>
                    {reviewRows.map(row => (
                      <div key={row.label} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 12px', background: 'var(--ska-surface-low)',
                        borderRadius: 8, border: '1px solid var(--ska-surface-high)',
                      }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 15, color: row.color || 'var(--ska-text-3)', flexShrink: 0 }}>{row.icon}</span>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', fontWeight: 600, minWidth: 100 }}>{row.label}</span>
                        <span style={{ fontSize: '0.875rem', color: row.color || 'var(--ska-text)', fontWeight: 700, marginLeft: 'auto', textAlign: 'right' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>

                  {dupWarning && (
                    <div style={{
                      padding: '16px', borderRadius: 12,
                      background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.35)',
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <span className="material-symbols-rounded" style={{ fontSize: 20, color: '#f59e0b', flexShrink: 0, marginTop: 1 }}>warning</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#f59e0b', marginBottom: 4 }}>Possible Duplicate</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', lineHeight: 1.5 }}>
                            A student named <strong style={{ color: 'var(--ska-text)' }}>{dupWarning.full_name}</strong>
                            {dupWarning.date_of_birth ? <> born <strong style={{ color: 'var(--ska-text)' }}>{dupWarning.date_of_birth}</strong></> : null}
                            {' '}is already enrolled (Adm.{' '}
                            <strong style={{ color: 'var(--ska-text)' }}>{dupWarning.admission_number}</strong>).
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="ska-btn ska-btn--ghost" style={{ flex: 1 }} onClick={() => setDupWarning(null)}>
                          Cancel
                        </button>
                        <button className="ska-btn ska-btn--primary" style={{ flex: 1 }} onClick={() => { setDupWarning(null); handleSave(true); }}>
                          Continue anyway
                        </button>
                      </div>
                    </div>
                  )}

                  {error && <p style={{ margin: '4px 0 0', color: 'var(--ska-error)', fontSize: '0.8125rem' }}>{error}</p>}
                </div>
              );
            })()}

          </div>

          <div style={{
            padding: '16px 28px', borderTop: '1px solid var(--ska-surface-high)',
            display: 'flex', justifyContent: 'space-between', gap: 10,
          }}>
            <button className="ska-btn ska-btn--ghost" onClick={step === 0 ? onCancel : () => setStep(s => s - 1)}>
              {step === 0 ? 'Cancel' : <><Ic name="arrow_back" size="sm" /> Back</>}
            </button>
            {step < STUDENT_WIZARD_STEPS.length - 1
              ? <button className="ska-btn ska-btn--primary" disabled={!canNext} onClick={() => setStep(s => s + 1)}>Next <Ic name="arrow_forward" size="sm" /></button>
              : <button className="ska-btn ska-btn--primary" disabled={saving || !canNext || !!dupWarning} onClick={() => handleSave(false)}>
                  {saving
                    ? <><span className="material-symbols-rounded" style={{ fontSize: 16, animation: 'ska-spin 0.8s linear infinite', display: 'inline-block' }}>autorenew</span> Enrolling…</>
                    : <><Ic name="person_add" size="sm" /> Enroll Student</>
                  }
                </button>
            }
          </div>
        </div>
      </div>
    </div>
  );
}

function EditStudentModal({ student, classes, onSave, onClose }) {
  const [form, setForm] = useState({
    first_name:    student.first_name    || '',
    last_name:     student.last_name     || '',
    gender:        student.gender        || '',
    email:         student.email         || '',
    phone_number:  student.phone_number  || '',
    date_of_birth: student.date_of_birth || '',
    classroom_id:  student.classroom_id  || '',
  });
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState('');
  const [profileImage,   setProfileImage]   = useState(null);
  const [profilePreview, setProfilePreview] = useState(student.passport_picture || '');
  const [photoHover,     setPhotoHover]     = useState(false);
  const editImgRef = React.useRef(null);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const avatarLetters = _studentAvatarLetters(form.first_name, form.last_name);
  const displayName   = [form.first_name, form.last_name].filter(Boolean).join(' ') || 'Student';
  const currentClass  = classes.find(c => String(c.id) === String(form.classroom_id))?.name || '';
  const genderIcon    = form.gender === 'M' ? 'male' : form.gender === 'F' ? 'female' : 'person';

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5 MB.'); return; }
    setError('');
    setProfileImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProfilePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (profileImage) fd.append('passport_picture', profileImage);
      await ApiClient.put(`/api/school/students/${student.id}/`, fd);
      onSave();
    } catch (e) { setError(e?.message || 'Failed to save.'); setSaving(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: 700,
        display: 'flex', borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)', maxHeight: '92vh',
      }}>

        {/* ── Left preview panel ── */}
        <div className="student-wizard-panel" style={{
          width: 200, flexShrink: 0,
          background: 'linear-gradient(160deg,#0d1b3e 0%,#0a1628 100%)',
          display: 'flex', flexDirection: 'column', padding: '28px 18px',
          borderRight: '1px solid rgba(173,198,255,0.08)',
        }}>
          <p style={{ margin: '0 0 20px', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(173,198,255,0.5)' }}>
            Edit Student
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#4b8eff,#adc6ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 800, color: '#fff',
              boxShadow: '0 4px 16px rgba(75,142,255,0.35)',
              overflow: 'hidden', position: 'relative',
            }}>
              {profilePreview
                ? <img src={profilePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : avatarLetters
              }
              {form.gender && !profilePreview && (
                <span style={{ position: 'absolute', bottom: 0, right: 0, width: 22, height: 22, borderRadius: '50%', background: form.gender === 'M' ? '#4b8eff' : '#e879a0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #0d1b3e' }}>
                  <span className="material-symbols-rounded" style={{ fontSize: 12, color: '#fff' }}>{genderIcon}</span>
                </span>
              )}
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.875rem', lineHeight: 1.3 }}>{displayName}</div>
              {currentClass && <div style={{ fontSize: '0.6875rem', color: 'rgba(173,198,255,0.65)', marginTop: 3 }}>Class {currentClass}</div>}
              {student.admission_number && <div style={{ fontSize: '0.6875rem', color: 'rgba(173,198,255,0.45)', marginTop: 2 }}>{student.admission_number}</div>}
            </div>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(173,198,255,0.06)', border: '1px solid rgba(173,198,255,0.1)', marginTop: 'auto' }}>
            <span style={{ fontSize: '0.6875rem', color: 'rgba(173,198,255,0.55)', lineHeight: 1.5 }}>Changes take effect immediately after saving.</span>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div style={{ flex: 1, background: 'var(--ska-surface-low)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--ska-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ska-text-3)' }}>School Admin</p>
              <h2 style={{ margin: '2px 0 0', fontSize: '1.125rem', fontWeight: 800, color: 'var(--ska-text)' }}>Edit Student Profile</h2>
            </div>
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={onClose} style={{ borderRadius: 8 }}>
              <span className="ska-icon ska-icon--sm">close</span>
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--ska-error-dim)', border: '1px solid rgba(255,180,171,0.25)', marginBottom: 16, fontSize: '0.875rem', color: 'var(--ska-error)' }}>
                <span className="ska-icon ska-icon--sm">error</span>{error}
              </div>
            )}

            {/* Photo upload */}
            <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} ref={editImgRef} onChange={handleImageChange} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px 16px', borderRadius: 12, background: 'var(--ska-surface-high)', border: '1px solid var(--ska-border)' }}>
              <div
                onClick={() => editImgRef.current?.click()}
                onMouseEnter={() => setPhotoHover(true)}
                onMouseLeave={() => setPhotoHover(false)}
                style={{
                  width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                  background: profilePreview ? 'transparent' : 'var(--ska-surface-highest)',
                  border: `2px dashed ${profilePreview ? 'var(--ska-primary)' : 'var(--ska-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', position: 'relative', transition: 'border-color 0.2s',
                }}
              >
                {profilePreview
                  ? <img src={profilePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span className="material-symbols-rounded" style={{ fontSize: 24, color: 'var(--ska-text-3)' }}>add_a_photo</span>
                }
                {profilePreview && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: photoHover ? 1 : 0, transition: 'opacity 0.2s' }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 18, color: '#fff' }}>photo_camera</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text)' }}>
                  {profilePreview ? 'Profile photo' : 'Upload photo'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>JPG, PNG or WebP · max 5 MB</span>
                {profileImage && (
                  <button type="button" onClick={() => { setProfileImage(null); setProfilePreview(student.passport_picture || ''); setPhotoHover(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.75rem', color: 'var(--ska-error)', fontWeight: 600, textAlign: 'left' }}>
                    Revert to original
                  </button>
                )}
              </div>
            </div>

            {/* Name + gender */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <label className="ska-form-group" style={{ margin: 0 }}>
                <span>First Name</span>
                <input className="ska-input" value={form.first_name} onChange={e => set('first_name', e.target.value)} />
              </label>
              <label className="ska-form-group" style={{ margin: 0 }}>
                <span>Last Name</span>
                <input className="ska-input" value={form.last_name} onChange={e => set('last_name', e.target.value)} />
              </label>
            </div>

            {/* Gender */}
            <div className="ska-form-group" style={{ margin: '0 0 14px' }}>
              <span>Gender</span>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                {[{ value: 'M', label: 'Male', icon: 'male' }, { value: 'F', label: 'Female', icon: 'female' }].map(opt => (
                  <button key={opt.value} type="button" onClick={() => set('gender', form.gender === opt.value ? '' : opt.value)} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '9px 12px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: '0.875rem',
                    background: form.gender === opt.value ? (opt.value === 'M' ? 'rgba(75,142,255,0.18)' : 'rgba(232,121,160,0.18)') : 'var(--ska-surface-high)',
                    border: form.gender === opt.value ? `2px solid ${opt.value === 'M' ? '#4b8eff' : '#e879a0'}` : '2px solid var(--ska-border)',
                    color: form.gender === opt.value ? (opt.value === 'M' ? '#4b8eff' : '#e879a0') : 'var(--ska-text-3)',
                    transition: 'all 0.15s',
                  }}>
                    <span className="material-symbols-rounded" style={{ fontSize: 16 }}>{opt.icon}</span>{opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Remaining fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label className="ska-form-group" style={{ margin: 0, gridColumn: '1/-1' }}>
                <span>Email Address</span>
                <input className="ska-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              </label>
              <label className="ska-form-group" style={{ margin: 0 }}>
                <span>Phone Number</span>
                <input className="ska-input" value={form.phone_number} onChange={e => set('phone_number', e.target.value)} />
              </label>
              <label className="ska-form-group" style={{ margin: 0 }}>
                <span>Date of Birth</span>
                <input className="ska-input" type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} />
              </label>
              <label className="ska-form-group" style={{ margin: 0, gridColumn: '1/-1' }}>
                <span>Class</span>
                <select className="ska-input" value={form.classroom_id} onChange={e => set('classroom_id', e.target.value)}>
                  <option value="">— No class —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>

            {/* Admission No. read-only */}
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'var(--ska-surface-high)', border: '1px solid var(--ska-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', fontWeight: 600 }}>Admission No.</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--ska-text)', fontWeight: 700 }}>{student.admission_number || '—'}</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--ska-border)', display: 'flex', gap: 10 }}>
            <button className="ska-btn ska-btn--ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="ska-btn ska-btn--primary" disabled={saving} onClick={handleSave} style={{ flex: 2 }}>
              {saving
                ? <><span className="material-symbols-rounded" style={{ fontSize: 16 }}>hourglass_empty</span>Saving…</>
                : <><span className="material-symbols-rounded" style={{ fontSize: 16 }}>save</span>Save Changes</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StudentsPage({ school, openAddSignal }) {
  const [students,       setStudents]       = useState([]);
  const [stats,          setStats]          = useState(null);
  const [classes,        setClasses]        = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [activeFilter,   setActiveFilter]   = useState('all');
  const [subView,        setSubView]        = useState('list');
  const [profileStudent, setProfileStudent] = useState(null);
  const [editStudent,    setEditStudent]    = useState(null);
  const [banner,         setBanner]         = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    if (openAddSignal) setSubView('add');
  }, [openAddSignal]);

  const load = useCallback((q = '', filter = 'all') => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (filter === 'at_risk') params.set('at_risk', '1');
    else if (filter !== 'all') params.set('classroom_id', filter);
    ApiClient.get(`/api/school/students/?${params}`)
      .then(d => setStudents(d.students || [])).catch(() => setStudents([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    ApiClient.get('/api/school/student-stats/').then(d => setStats(d)).catch(() => {});
    ApiClient.get('/api/school/classes/')
      .then(d => setClasses(d.classes || []))
      .catch(() => {})
      .finally(() => setClassesLoading(false));
  }, [load]);

  const handleSearch = e => {
    const q = e.target.value; setSearch(q);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(q, activeFilter), 350);
  };

  const handleFilter = f => { setActiveFilter(f); load(search, f); };

  const afterSave = () => {
    setEditStudent(null); setProfileStudent(null); setSubView('list');
    setBanner({ type: 'ok', text: 'Student saved.' });
    load(search, activeFilter);
    ApiClient.get('/api/school/student-stats/').then(d => setStats(d)).catch(() => {});
  };

  if (subView === 'add') {
    return (
      <AddStudentWizard school={school} classes={classes} classesLoading={classesLoading}
        onSave={() => { setBanner({ type: 'ok', text: 'Student added.' }); setSubView('list'); load(); ApiClient.get('/api/school/student-stats/').then(d => setStats(d)).catch(() => {}); }}
        onCancel={() => setSubView('list')}
      />
    );
  }

  const filterChips = [
    { key: 'all', label: 'All Students' },
    ...classes.slice(0, 5).map(c => ({ key: String(c.id), label: c.name })),
    { key: 'at_risk', label: 'At Risk' },
  ];

  const metricCards = [
    { icon: 'group',           iconColor: 'var(--ska-primary)',   iconBg: 'var(--ska-primary-dim)',   label: 'Total',          value: stats?.total ?? '—',          extra: null },
    { icon: 'person_check',    iconColor: 'var(--ska-secondary)', iconBg: 'var(--ska-secondary-dim)', label: 'Active',         value: stats?.active ?? '—',         extra: null },
    { icon: 'person_add',      iconColor: '#4b8eff',              iconBg: 'rgba(75,142,255,0.12)',    label: 'New This Term',  value: stats?.new_this_term ?? '—',  extra: null },
    { icon: 'warning',         iconColor: 'var(--ska-error)',     iconBg: 'var(--ska-error-dim)',     label: 'Flagged',        value: stats?.flagged ?? '—',        extra: stats?.flagged > 0 ? 'At Risk' : null, extraColor: 'var(--ska-error)', extraBg: 'var(--ska-error-dim)' },
    { icon: 'event_available', iconColor: '#4cd7f6',              iconBg: 'rgba(76,215,246,0.12)',    label: 'Avg Attendance', value: stats?.avg_attendance != null ? `${stats.avg_attendance}%` : '—', extra: 'Target 95%', extraColor: '#4cd7f6', extraBg: 'transparent' },
  ];

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div><h1 className="ska-page-title">Students</h1><p className="ska-page-sub">{school?.name}</p></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ska-btn ska-btn--ghost"><Ic name="upload_file" size="sm" /> Import</button>
          <button className="ska-btn ska-btn--primary" onClick={() => setSubView('add')}><Ic name="person_add" size="sm" /> Add Student</button>
        </div>
      </div>

      <Banner msg={banner} />

      {/* Metric row */}
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, marginBottom: 20, scrollbarWidth: 'none' }}>
        {metricCards.map(m => (
          <div key={m.label} style={{ flexShrink: 0, minWidth: 148, background: 'var(--ska-surface-card)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: m.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic name={m.icon} style={{ color: m.iconColor, fontSize: 20 }} />
              </div>
              {m.extra && <span style={{ fontSize: '0.5625rem', fontWeight: 700, color: m.extraColor, background: m.extraBg, padding: '2px 6px', borderRadius: 20 }}>{m.extra}</span>}
            </div>
            <div style={{ fontSize: '0.5rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>{m.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ska-text)', lineHeight: 1 }}>{m.value}</div>
          </div>
        ))}
      </div>

      {stats?.monthly_trend && <EnrollmentChart trend={stats.monthly_trend} />}
      <InsightsRow stats={stats} />

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <Ic name="search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ska-text-3)', fontSize: 20 }} />
        <input style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ska-surface-lowest)', border: 'none', borderRadius: 14, padding: '12px 16px 12px 42px', color: 'var(--ska-text)', fontSize: '0.875rem', outline: 'none' }}
          placeholder="Search by name, ID or class…" value={search} onChange={handleSearch} />
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 16, scrollbarWidth: 'none' }}>
        {filterChips.map(c => (
          <button key={c.key} onClick={() => handleFilter(c.key)} style={{ flexShrink: 0, padding: '6px 16px', borderRadius: 20, border: 'none', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', background: activeFilter === c.key ? 'var(--ska-primary)' : 'var(--ska-surface-card)', color: activeFilter === c.key ? '#002e6a' : 'var(--ska-text-3)', transition: 'background 0.15s' }}>
            {c.key === 'at_risk' && <Ic name="warning" style={{ fontSize: 13, marginRight: 4, verticalAlign: 'middle' }} />}
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text-2)' }}>{loading ? 'Loading…' : `${students.length} student${students.length !== 1 ? 's' : ''}`}</span>
        <span style={{ fontSize: '0.625rem', fontWeight: 700, color: 'var(--ska-primary)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sort: Recent</span>
      </div>

      {loading ? (
        <div className="ska-empty"><p className="ska-empty-desc">Loading students…</p></div>
      ) : students.length === 0 ? (
        <div className="ska-empty">
          <Ic name="group" size="xl" style={{ color: 'var(--ska-primary)', marginBottom: 12 }} />
          <p className="ska-empty-title">No students found</p>
          <p className="ska-empty-desc">{search ? 'Try a different search term.' : 'Add your first student to get started.'}</p>
          {!search && <button className="ska-btn ska-btn--primary" style={{ marginTop: 12 }} onClick={() => setSubView('add')}><Ic name="person_add" size="sm" /> Add First Student</button>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {students.map(s => <StudentCard key={s.id} s={s} onOpen={s2 => { setProfileStudent(s2); setSubView('profile'); }} />)}
        </div>
      )}

      {subView === 'profile' && profileStudent && (
        <StudentProfilePanel student={profileStudent} onClose={() => { setProfileStudent(null); setSubView('list'); }} onEdit={s => { setEditStudent(s); setSubView('list'); }} />
      )}

      {editStudent && <EditStudentModal student={editStudent} classes={classes} onSave={afterSave} onClose={() => setEditStudent(null)} />}
    </div>
  );
}

/* ============================================================
   TEACHERS PAGE — upgraded with workforce intelligence design
   Resources: faculty_dashboard, teacher_directory,
              teacher_profile_timetable, workforce_intelligence_*,
              workforce_pulse_with_class_trends
   ============================================================ */

/* ── Helpers ── */
const _TEACHER_COLORS = [
  '#4d8eff','#4cd7f6','#a78bfa','#34d399','#fbbf24',
  '#f87171','#38bdf8','#fb923c','#c084fc','#4ade80',
];
function _teacherInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}
function _teacherColor(name) {
  if (!name) return _TEACHER_COLORS[0];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return _TEACHER_COLORS[h % _TEACHER_COLORS.length];
}

/* ── TeacherAvatar: rounded-square initials avatar ── */
function TeacherAvatar({ name, size = 44 }) {
  const color = _teacherColor(name);
  return (
    <div style={{
      width: size, height: size,
      borderRadius: Math.round(size * 0.28),
      background: color + '28',
      border: `2px solid ${color}50`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.36, color,
      flexShrink: 0, letterSpacing: '-0.03em',
    }}>
      {_teacherInitials(name)}
    </div>
  );
}

/* ── WorkloadBar: color-coded periods/week bar ── */
function WorkloadBar({ periods, max }) {
  const limit  = max || 20;
  const pct    = Math.min((periods / (limit * 1.5)) * 100, 100);
  const ratio  = periods / limit;
  const isOver = ratio > 1;
  const isBusy = !isOver && ratio >= 0.7;
  const color  = isOver ? 'var(--ska-error)' : isBusy ? '#fbbf24' : 'var(--ska-primary)';
  const label  = isOver ? 'Overloaded' : isBusy ? 'Busy' : 'Optimal';
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Workload</span>
        <span style={{ fontSize: '0.6875rem', fontWeight: 700, color }}>{periods}/{limit} periods · {label}</span>
      </div>
      <div style={{ height: 6, background: 'var(--ska-surface-highest)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4,
          boxShadow: isOver ? `0 0 8px ${color}60` : 'none', transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

/* ── Mock helpers for teacher operational data (no backend) ── */
const _TM_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
function _tmHash(seed) {
  let n = (Number(seed) || 1) >>> 0;
  return (k) => { n = (n * 9301 + 49297 + k) % 233280; return n / 233280; };
}
function _tmTimetable(t) {
  const r = _tmHash(t?.id || 1);
  const total = Math.max(0, Math.min(t?.periods_per_week || 0, 40));
  const dist = _TM_DAYS.map(() => 0);
  for (let i = 0; i < total; i++) dist[Math.floor(r(i) * _TM_DAYS.length)]++;
  return _TM_DAYS.map((d, i) => ({ day: d, periods: dist[i] }));
}
function _tmAvgScore(t) {
  const r = _tmHash(t?.id || 1)(7);
  return Math.round(60 + r * 30); // 60–90
}
function _tmCoverage(t) {
  const r = _tmHash(t?.id || 1)(13);
  return Math.round(35 + r * 60); // 35–95
}
function _tmPerClassScore(t) {
  const r = _tmHash(t?.id || 1);
  return (t?.classes || []).map((c, i) => ({
    name: c.name, subject: c.subject,
    students: c.student_count || 0,
    score: Math.round(55 + r(i + 3) * 35),
  }));
}
function _tmWeeklyGrid(t) {
  /* 5 days × 8 periods, mock subject/class assignments based on teacher classes */
  const r = _tmHash(t?.id || 1);
  const cls = (t?.classes || []);
  const grid = _TM_DAYS.map(() => Array(8).fill(null));
  const want = Math.min(t?.periods_per_week || 0, 5 * 8);
  let placed = 0, attempt = 0;
  while (placed < want && attempt < 200) {
    const d = Math.floor(r(attempt) * 5);
    const p = Math.floor(r(attempt + 11) * 8);
    if (!grid[d][p] && cls.length) {
      const c = cls[Math.floor(r(attempt + 21) * cls.length)];
      grid[d][p] = { name: c.name, subject: c.subject };
      placed++;
    }
    attempt++;
  }
  return grid;
}
function _tmCoverageBySubject(t) {
  const r = _tmHash(t?.id || 1);
  return (t?.subjects || []).map((s, i) => ({
    subject: s,
    coverage: Math.round(35 + r(i + 17) * 60),
    pending: Math.max(1, Math.round(2 + r(i + 23) * 8)),
  }));
}

/* ── PerfSparkline: 6-bar pseudo performance sparkline ── */
function PerfSparkline({ teacherId, height }) {
  const h      = height || 28;
  const seed   = teacherId || 1;
  const bars   = Array.from({ length: 6 }, (_, i) => ((seed * 17 + i * 31) % 40) + 55);
  const maxV   = Math.max(...bars);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: h }}>
      {bars.map((v, i) => (
        <div key={i} style={{
          flex: 1, borderRadius: 2,
          height: `${(v / maxV) * 100}%`,
          background: i === bars.length - 1 ? 'var(--ska-primary)' : 'var(--ska-primary-dim)',
        }} />
      ))}
    </div>
  );
}

/* ── TeacherCard: bento card matching teacher_directory design ── */
function TeacherCard({ t, onOpen, onEdit, onDelete }) {
  return (
    <div className="ska-card ska-card-pad"
      onClick={() => onOpen(t)}
      style={{
        cursor: 'pointer', transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        borderLeft: t.is_overloaded ? '3px solid var(--ska-error)' : '3px solid transparent',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', minWidth: 0 }}>
          <TeacherAvatar name={t.full_name} size={48} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ska-text)', lineHeight: 1.2 }}>{t.full_name}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 2 }}>
              ID: {t.employee_id}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
              {(t.subjects || []).slice(0, 3).map(s => (
                <span key={s} style={{
                  fontSize: '0.625rem', padding: '2px 7px',
                  background: 'var(--ska-surface-highest)', color: 'var(--ska-text-2)',
                  borderRadius: 4, fontWeight: 600,
                }}>{s}</span>
              ))}
              {(t.subjects || []).length > 3 && (
                <span style={{ fontSize: '0.625rem', padding: '2px 7px', background: 'var(--ska-surface-highest)', color: 'var(--ska-text-3)', borderRadius: 4 }}>
                  +{t.subjects.length - 3}
                </span>
              )}
            </div>
          </div>
        </div>
        <span style={{
          fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
          padding: '3px 8px', borderRadius: 6, flexShrink: 0,
          background: t.is_overloaded ? 'var(--ska-error-dim)' : 'var(--ska-primary-dim)',
          color:      t.is_overloaded ? 'var(--ska-error)'     : 'var(--ska-primary)',
        }}>
          {t.is_overloaded ? 'Overloaded' : 'Active'}
        </span>
      </div>

      <WorkloadBar periods={t.periods_per_week || 0} max={t.max_workload} />

      {/* Mini stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12 }}>
        {[
          { icon: 'class',    label: 'Classes',  value: (t.classes || []).length },
          { icon: 'group',    label: 'Students', value: t.student_count || 0 },
          { icon: 'schedule', label: 'Periods',  value: t.periods_per_week || 0 },
        ].map(m => (
          <div key={m.label} style={{
            background: 'var(--ska-surface-highest)', borderRadius: 8,
            padding: '8px 10px', textAlign: 'center',
          }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--ska-text)' }}>{m.value}</div>
            <div style={{ fontSize: '0.625rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
          </div>
        ))}
      </div>

      {/* Classes line */}
      {(t.classes || []).length > 0 && (
        <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--ska-text-3)', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <span className="ska-icon ska-icon--sm" style={{ color: 'var(--ska-text-3)' }}>school</span>
          <span style={{ color: 'var(--ska-text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {(t.classes || []).slice(0, 3).map(c => c.name).join(', ')}
            {(t.classes || []).length > 3 ? ` +${t.classes.length - 3}` : ''}
          </span>
        </div>
      )}

      {/* Timetable preview */}
      <div style={{ marginTop: 8, display: 'flex', gap: 4, justifyContent: 'space-between' }}>
        {_tmTimetable(t).map(({ day, periods }) => (
          <div key={day} style={{
            flex: 1, padding: '4px 0', borderRadius: 6, textAlign: 'center',
            background: periods === 0 ? 'var(--ska-surface-high)' : 'var(--ska-surface-highest)',
            opacity: periods === 0 ? 0.5 : 1,
          }}>
            <div style={{ fontSize: '0.625rem', color: 'var(--ska-text-3)', fontWeight: 700, letterSpacing: '0.06em' }}>{day}</div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: periods === 0 ? 'var(--ska-text-3)' : 'var(--ska-text)' }}>{periods}p</div>
          </div>
        ))}
      </div>

      {/* Performance + Coverage chips (mock) */}
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {(() => {
          const score = _tmAvgScore(t);
          const cov   = _tmCoverage(t);
          const sCol  = score >= 75 ? 'var(--ska-primary)' : score >= 60 ? '#fbbf24' : 'var(--ska-error)';
          const cCol  = cov   >= 75 ? 'var(--ska-primary)' : cov   >= 40 ? '#fbbf24' : 'var(--ska-error)';
          return (
            <>
              <div style={{ background: sCol + '18', border: `1px solid ${sCol}33`, borderRadius: 6, padding: '6px 8px' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Avg Score</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: sCol }}>{score}%</div>
              </div>
              <div style={{ background: cCol + '18', border: `1px solid ${cCol}33`, borderRadius: 6, padding: '6px 8px' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>Coverage</div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: cCol }}>{cov}%</div>
              </div>
            </>
          );
        })()}
      </div>

      {t.is_overloaded && (
        <p style={{ margin: '10px 0 0', fontSize: '0.7rem', color: 'var(--ska-error)', fontWeight: 600 }}>
          ⚠ Overloaded · 💡 Consider reassigning periods
        </p>
      )}

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 12 }}
        onClick={e => e.stopPropagation()}>
        <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onOpen(t)} style={{ justifyContent: 'center' }}>
          <span className="ska-icon ska-icon--sm">visibility</span> View Details
        </button>
        <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onOpen(t, 'timetable')} style={{ justifyContent: 'center' }}>
          <span className="ska-icon ska-icon--sm">calendar_view_week</span> Timetable
        </button>
        <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => onEdit(t)} style={{ justifyContent: 'center' }}>
          <span className="ska-icon ska-icon--sm">edit</span> Edit
        </button>
        <button className="ska-btn ska-btn--ghost ska-btn--sm ska-btn--danger" onClick={() => onDelete(t.id)} style={{ justifyContent: 'center' }}>
          <span className="ska-icon ska-icon--sm">delete</span> Remove
        </button>
      </div>
    </div>
  );
}

/* ── TeacherProfilePanel: slide-up overlay (teacher_profile_timetable) ── */
function TeacherProfilePanel({ teacher: initTeacher, onClose, onEdit, focus }) {
  const [teacher, setTeacher] = React.useState(initTeacher);
  const [loading, setLoading] = React.useState(true);
  const timetableRef = React.useRef(null);

  React.useEffect(() => {
    setLoading(true);
    ApiClient.get(`/api/school/teachers/${initTeacher.id}/`)
      .then(d => setTeacher(prev => ({ ...prev, ...d })))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [initTeacher.id]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!loading && focus === 'timetable' && timetableRef.current) {
      timetableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, focus]);

  const color = _teacherColor(teacher.full_name);

  const infoRows = [
    { icon: 'badge',          label: 'Employee ID',   value: teacher.employee_id  || '—' },
    { icon: 'school',         label: 'Qualification', value: teacher.qualification || '—' },
    { icon: 'mail',           label: 'Email',         value: teacher.email         || '—' },
    { icon: 'phone',          label: 'Phone',         value: teacher.phone_number  || '—' },
    { icon: 'calendar_today', label: 'Hire Date',     value: teacher.hire_date
        ? new Date(teacher.hire_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—' },
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        width: '100%', maxWidth: 680,
        maxHeight: '92vh', overflowY: 'auto',
        background: 'var(--ska-surface-low)',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -8px 48px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>

        {/* Glass header */}
        <div style={{
          padding: '28px 24px 20px',
          background: `linear-gradient(135deg, ${color}18, var(--ska-surface-card))`,
          borderBottom: '1px solid var(--ska-border)',
          borderRadius: '20px 20px 0 0',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              {/* Gradient ring avatar */}
              <div style={{ padding: 3, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}88)` }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: color + '20', border: '3px solid var(--ska-surface-low)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 900, fontSize: '1.5rem', color,
                }}>
                  {_teacherInitials(teacher.full_name)}
                </div>
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 900, color: 'var(--ska-text)', lineHeight: 1.2 }}>{teacher.full_name}</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
                  {teacher.qualification || 'Teacher'} · {teacher.employee_id}
                </p>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {(teacher.subjects || []).map(s => (
                    <span key={s} style={{ fontSize: '0.625rem', padding: '2px 8px', background: color + '25', color, borderRadius: 4, fontWeight: 700 }}>{s}</span>
                  ))}
                </div>
              </div>
            </div>
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={onClose} style={{ flexShrink: 0 }}>
              <span className="ska-icon ska-icon--sm">close</span>
            </button>
          </div>

          {/* Contact shortcuts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 16 }}>
            {[{ icon: 'mail', label: 'Email' }, { icon: 'call', label: 'Call' }, { icon: 'chat_bubble', label: 'Message' }].map(({ icon, label }) => (
              <div key={label} style={{
                background: 'var(--ska-surface-highest)', borderRadius: 10,
                padding: '10px 8px', textAlign: 'center', cursor: 'default',
              }}>
                <span className="ska-icon" style={{ color: 'var(--ska-primary)', display: 'block', marginBottom: 4 }}>{icon}</span>
                <span style={{ fontSize: '0.625rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {loading && <div className="ska-empty" style={{ padding: 20 }}><p className="ska-empty-desc">Loading profile…</p></div>}
          {!loading && (
            <>
              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  { label: 'Classes',  value: (teacher.classes || []).length, c: 'var(--ska-primary)' },
                  { label: 'Students', value: teacher.student_count || 0,     c: 'var(--ska-secondary)' },
                  { label: 'Periods',  value: teacher.periods_per_week || 0,  c: teacher.is_overloaded ? 'var(--ska-error)' : 'var(--ska-tertiary)' },
                ].map(({ label, value, c }) => (
                  <div key={label} className="ska-card ska-card-pad" style={{ textAlign: 'center', padding: '14px 10px' }}>
                    <div style={{ fontWeight: 900, fontSize: '1.5rem', color: c }}>{value}</div>
                    <div style={{ fontSize: '0.625rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Workload */}
              <div className="ska-card ska-card-pad">
                <h3 style={{ margin: '0 0 12px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Workload Balance</h3>
                <WorkloadBar periods={teacher.periods_per_week || 0} />
                {teacher.is_overloaded && (
                  <p style={{ margin: '10px 0 0', fontSize: '0.75rem', color: 'var(--ska-error)', fontWeight: 600 }}>
                    This teacher exceeds the 20 periods/week recommended threshold.
                  </p>
                )}
              </div>

              {/* Perf sparkline */}
              <div className="ska-card ska-card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Performance Trend</h3>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--ska-primary)', fontWeight: 700 }}>6-month</span>
                </div>
                <PerfSparkline teacherId={teacher.id} height={48} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                  {['Jan','Feb','Mar','Apr','May','Jun'].map(m => (
                    <span key={m} style={{ fontSize: '0.5625rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m}</span>
                  ))}
                </div>
              </div>

              {/* Assigned classes */}
              {(teacher.classes || []).length > 0 && (
                <div>
                  <h3 style={{ margin: '0 0 10px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Assigned Load</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
                    {teacher.classes.map((c, i) => {
                      const bc = ['var(--ska-primary)','var(--ska-secondary)','var(--ska-tertiary)'][i % 3];
                      return (
                        <div key={`${c.name}-${i}`} className="ska-card ska-card-pad" style={{ borderLeft: `4px solid ${bc}`, padding: '12px 14px' }}>
                          <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, color: bc, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.name}</p>
                          <p style={{ margin: '4px 0 0', fontSize: '0.9375rem', fontWeight: 800, color: 'var(--ska-text)' }}>{c.subject}</p>
                          <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>
                            <span className="ska-icon ska-icon--sm" style={{ fontSize: '0.875rem', verticalAlign: 'middle', marginRight: 4 }}>group</span>
                            {c.student_count} students
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Weekly Timetable Grid (mock) */}
              <div ref={timetableRef} className="ska-card ska-card-pad">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Weekly Timetable</h3>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)', fontWeight: 600 }}>{teacher.periods_per_week || 0} periods/week</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <div style={{ minWidth: 480, display: 'grid', gridTemplateColumns: '52px repeat(8, 1fr)', gap: 4 }}>
                    <div></div>
                    {Array.from({ length: 8 }, (_, i) => (
                      <div key={`p${i}`} style={{ textAlign: 'center', fontSize: '0.625rem', color: 'var(--ska-text-3)', fontWeight: 700 }}>P{i + 1}</div>
                    ))}
                    {_tmWeeklyGrid(teacher).map((row, di) => (
                      <React.Fragment key={`d${di}`}>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)', fontWeight: 700, alignSelf: 'center' }}>{_TM_DAYS[di]}</div>
                        {row.map((cell, pi) => (
                          <div key={`d${di}p${pi}`} style={{
                            background: cell ? 'var(--ska-primary-dim)' : 'var(--ska-surface-highest)',
                            border: cell ? '1px solid rgba(173,198,255,0.25)' : '1px solid var(--ska-border)',
                            borderRadius: 4, padding: 4, minHeight: 36,
                            fontSize: '0.625rem', color: cell ? 'var(--ska-primary)' : 'var(--ska-text-3)',
                            fontWeight: 700, textAlign: 'center', overflow: 'hidden',
                          }}>
                            {cell ? (
                              <>
                                <div style={{ lineHeight: 1.1, color: 'var(--ska-text)' }}>{cell.name}</div>
                                <div style={{ lineHeight: 1.1, color: 'var(--ska-primary)', opacity: 0.85 }}>{cell.subject}</div>
                              </>
                            ) : '·'}
                          </div>
                        ))}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              </div>

              {/* Syllabus coverage (mock) */}
              {(teacher.subjects || []).length > 0 && (
                <div className="ska-card ska-card-pad">
                  <h3 style={{ margin: '0 0 12px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Syllabus Coverage</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {_tmCoverageBySubject(teacher).map(({ subject, coverage, pending }) => {
                      const c = coverage >= 75 ? 'var(--ska-primary)' : coverage >= 40 ? '#fbbf24' : 'var(--ska-error)';
                      return (
                        <div key={subject}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ska-text)' }}>{subject}</span>
                            <span style={{ fontSize: '0.75rem', color: c, fontWeight: 700 }}>{coverage}% · {pending} pending</span>
                          </div>
                          <div style={{ height: 6, background: 'var(--ska-surface-highest)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${coverage}%`, background: c, transition: 'width 0.3s' }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Per-class average score (mock) */}
              {(teacher.classes || []).length > 0 && (
                <div className="ska-card ska-card-pad">
                  <h3 style={{ margin: '0 0 12px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Performance by Class</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {_tmPerClassScore(teacher).map(({ name, subject, students, score }, i) => {
                      const c = score >= 75 ? 'var(--ska-primary)' : score >= 60 ? '#fbbf24' : 'var(--ska-error)';
                      return (
                        <div key={`${name}-${i}`} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 8,
                          background: 'var(--ska-surface-highest)',
                        }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--ska-text)' }}>{name}</div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)' }}>{subject} · {students} students</div>
                          </div>
                          <div style={{ fontSize: '1rem', fontWeight: 900, color: c }}>{score}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Staff details */}
              <div className="ska-card ska-card-pad">
                <h3 style={{ margin: '0 0 14px', fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text-2)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Staff Details</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {infoRows.map(row => (
                    <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 8,
                        background: 'var(--ska-surface-highest)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <span className="ska-icon ska-icon--sm" style={{ color: 'var(--ska-primary)' }}>{row.icon}</span>
                      </div>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.625rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{row.label}</p>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--ska-text)' }}>{row.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--ska-border)', display: 'flex', gap: 10 }}>
          <button className="ska-btn ska-btn--ghost" onClick={onClose} style={{ flex: 1 }}>Close</button>
          <button className="ska-btn ska-btn--primary" onClick={() => { onClose(); onEdit(teacher); }} style={{ flex: 2 }}>
            <span className="ska-icon ska-icon--sm">edit</span> Edit Teacher
          </button>
        </div>
      </div>
    </div>
  );
}

function TeacherReviewRow({ label, value, icon }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 8,
      background: 'var(--ska-surface-high)',
      marginBottom: 6,
    }}>
      <span className="ska-icon ska-icon--sm" style={{ color: 'var(--ska-text-3)', flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', minWidth: 96 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text)', marginLeft: 'auto', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}


/* ── AddTeacherWizard: redesigned split-panel registration ── */
const TEACHER_WIZARD_STEPS = [
  { label: 'Personal Info',   icon: 'person'      },
  { label: 'Account & Role',  icon: 'badge'        },
  { label: 'Review & Create', icon: 'check_circle' },
];

function _pwStrength(pw) {
  if (!pw) return { score: 0, label: '', color: 'transparent' };
  let s = 0;
  if (pw.length >= 8)             s++;
  if (pw.length >= 12)            s++;
  if (/[A-Z]/.test(pw))          s++;
  if (/[0-9]/.test(pw))          s++;
  if (/[^A-Za-z0-9]/.test(pw))   s++;
  if (s <= 1) return { score: s, label: 'Weak',   color: 'var(--ska-error)' };
  if (s <= 3) return { score: s, label: 'Fair',   color: '#f9bc60' };
  if (s <= 4) return { score: s, label: 'Good',   color: '#6ce0b0' };
  return              { score: s, label: 'Strong', color: 'var(--ska-primary)' };
}

function _teacherAvatarLetters(first, last) {
  const a = (first || '').trim()[0] || '';
  const b = (last  || '').trim()[0] || '';
  return (a + b).toUpperCase() || '?';
}

// eslint-disable-next-line no-unused-vars
function _LegacyAddTeacherWizard_DEPRECATED({ school, onSave, onCancel, existingEmails = [] }) {
  const [step,            setStep]           = React.useState(0);
  const [form,            setForm]           = React.useState({
    first_name: '', last_name: '', email: '', phone_number: '',
    password: '', employee_id: '', qualification: '',
    max_workload: 20,
  });
  const [availability, setAvailability] = React.useState(
    /* Mon–Fri × Periods 1–8 boolean grid; default: all available */
    Object.fromEntries(['Mon','Tue','Wed','Thu','Fri'].map(d => [d, Array(8).fill(true)]))
  );
  const toggleAvail = (day, period) => setAvailability(prev => ({
    ...prev,
    [day]: prev[day].map((v, i) => i === period ? !v : v),
  }));
  const availSlotCount = Object.values(availability).reduce(
    (n, row) => n + row.filter(Boolean).length, 0
  );

  /* Auto-suggested specialization based on assigned subjects (mock) */
  const SUBJECT_SPECIALIZATIONS = {
    mathematics: 'B.Sc. / M.Sc. Mathematics, PGCE Mathematics',
    math: 'B.Sc. Mathematics',
    physics: 'B.Sc. Physics, Physics Education',
    chemistry: 'B.Sc. Chemistry',
    biology: 'B.Sc. Biology / Life Sciences',
    english: 'B.A. English, Linguistics or Literature',
    literature: 'B.A. English Literature',
    history: 'B.A. History',
    geography: 'B.A. / B.Sc. Geography',
    economics: 'B.A. / B.Sc. Economics',
    'computer science': 'B.Sc. Computer Science / Information Technology',
    ict: 'B.Sc. ICT or Computer Science',
    french: 'B.A. French / Modern Languages',
    arabic: 'B.A. Arabic / Islamic Studies',
    'religious studies': 'B.A. Religious Studies / Theology',
    'social studies': 'B.A. Social Studies / Sociology',
    'physical education': 'B.Sc. Physical Education / Sports Science',
    art: 'B.A. Fine Arts',
    music: 'B.A. Music',
  };
  const subjectSuggestion = (() => {
    const subjs = [...new Set(classAssignments.map(ca => (ca.subject_name || '').toLowerCase()))];
    const hits = subjs.map(s => SUBJECT_SPECIALIZATIONS[s] || Object.entries(SUBJECT_SPECIALIZATIONS).find(([k]) => s.includes(k))?.[1])
      .filter(Boolean);
    return [...new Set(hits)].slice(0, 2).join(' · ');
  })();
  const [showPass,        setShowPass]       = React.useState(false);
  const [saving,          setSaving]         = React.useState(false);
  const [error,           setError]          = React.useState('');
  const [fieldErrors,     setFieldErrors]    = React.useState({});
  const [profileImage,    setProfileImage]   = React.useState(null);
  const [profilePreview,  setProfilePreview] = React.useState('');
  const [photoHover,      setPhotoHover]     = React.useState(false);
  const teacherImgRef = React.useRef(null);
  
  // Class allocation state
  const [classes, setClasses] = React.useState([]);
  const [subjects, setSubjects] = React.useState([]);
  const [classAssignments, setClassAssignments] = React.useState([]);
  const [newAssignment, setNewAssignment] = React.useState({ classroom_id: '', subject_id: '' });
  
  // Load classes and subjects
  React.useEffect(() => {
    ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes || [])).catch(() => {});
    ApiClient.get('/api/school/subjects/').then(d => setSubjects(d.subjects || [])).catch(() => {});
  }, []);

  const handleTeacherImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5 MB.'); return; }
    setError('');
    setProfileImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProfilePreview(ev.target.result);
    reader.readAsDataURL(file);
  };
  
  // Class assignment functions
  const addClassAssignment = () => {
    if (newAssignment.classroom_id && newAssignment.subject_id) {
      const classroom = classes.find(c => c.id === parseInt(newAssignment.classroom_id));
      const subject = subjects.find(s => s.id === parseInt(newAssignment.subject_id));
      if (classroom && subject) {
        // Check for duplicates
        const exists = classAssignments.some(
          ca => ca.classroom_id === parseInt(newAssignment.classroom_id) && 
                ca.subject_id === parseInt(newAssignment.subject_id)
        );
        if (!exists) {
          setClassAssignments([...classAssignments, { 
            classroom_id: parseInt(newAssignment.classroom_id),
            subject_id: parseInt(newAssignment.subject_id),
            class_name: classroom.name,
            subject_name: subject.name
          }]);
          setNewAssignment({ classroom_id: '', subject_id: '' });
        }
      }
    }
  };
  
  const removeClassAssignment = (index) => {
    setClassAssignments(classAssignments.filter((_, i) => i !== index));
  };

  const pw = _pwStrength(form.password);
  const avatarLetters = _teacherAvatarLetters(form.first_name, form.last_name);
  const displayName   = [form.first_name, form.last_name].filter(Boolean).join(' ') || 'New Teacher';

  const canNext = [
    !!(form.first_name.trim() && form.last_name.trim() && form.email.trim() && form.password.length >= 8),
    !!form.employee_id.trim(),
    true,
  ][step];

  const handleSubmit = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError('First and last name are required.'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.'); return;
    }
    if (existingEmails.includes(form.email.trim().toLowerCase())) {
      setError('This email is already in use by another teacher. Please use a different one.');
      setFieldErrors(p => ({ ...p, email: 'Already in use' }));
      setStep(0);
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.'); return;
    }
    setSaving(true); setError(''); setFieldErrors({});
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== '') fd.append(k, v); });
      if (profileImage) fd.append('profile_picture', profileImage);
      // Add class assignments as JSON
      if (classAssignments.length > 0) {
        fd.append('class_assignments', JSON.stringify(classAssignments));
      }
      fd.append('availability', JSON.stringify(availability));
      await ApiClient.post('/api/school/teachers/', fd);
      onSave();
    } catch (e) {
      const msg = e.message || '';
      setError(
        msg === 'Load failed' || msg.includes('Failed to fetch') || msg.includes('NetworkError')
          ? 'Unable to reach the server. Please check your internet connection.'
          : msg || 'Failed to add teacher.'
      );
      setSaving(false);
    }
  };

  /* ── completion percentage for left panel ── */
  const filledFields = [form.first_name, form.last_name, form.email, form.password, form.employee_id, form.qualification, profileImage].filter(Boolean).length;
  const completionPct = Math.round((filledFields / 7) * 100);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 700,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        width: '100%', maxWidth: 760,
        display: 'flex', borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        maxHeight: '95vh',
      }}>

        {/* ── LEFT PREVIEW PANEL ── */}
        <div style={{
          width: 240, flexShrink: 0,
          background: 'linear-gradient(160deg, #1a2540 0%, #0e1728 60%, #060e1c 100%)',
          display: 'flex', flexDirection: 'column',
          padding: '28px 20px',
          borderRight: '1px solid rgba(173,198,255,0.08)',
        }} className="teacher-wizard-panel">
          {/* School label */}
          <div style={{ marginBottom: 28 }}>
            <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ska-text-3)' }}>
              {school ? school.name : 'Your School'}
            </p>
            <p style={{ margin: '3px 0 0', fontSize: '0.6875rem', color: 'var(--ska-primary)', fontWeight: 600 }}>New Teacher Registration</p>
          </div>

          {/* Avatar */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
            <div style={{
              width: 80, height: 80, borderRadius: 20,
              background: 'linear-gradient(135deg, var(--ska-primary-container), rgba(77,142,255,0.4))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.75rem', fontWeight: 900, color: '#fff',
              fontFamily: 'Manrope, sans-serif', letterSpacing: '-0.03em',
              border: '2px solid rgba(173,198,255,0.25)',
              boxShadow: '0 8px 24px rgba(77,142,255,0.25)',
              marginBottom: 12, flexShrink: 0, overflow: 'hidden',
            }}>
              {profilePreview
                ? <img src={profilePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : avatarLetters
              }
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontFamily: 'Manrope, sans-serif', fontSize: '0.9375rem', fontWeight: 800, color: 'var(--ska-text)', lineHeight: 1.2 }}>
                {displayName}
              </p>
              {form.employee_id && (
                <p style={{ margin: '4px 0 0', fontSize: '0.6875rem', color: 'var(--ska-text-3)', fontWeight: 600, letterSpacing: '0.06em' }}>
                  ID: {form.employee_id}
                </p>
              )}
              {form.qualification && (
                <div style={{
                  marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '3px 10px', borderRadius: 99,
                  background: 'rgba(173,198,255,0.1)', border: '1px solid rgba(173,198,255,0.15)',
                }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--ska-primary)' }}>{form.qualification}</span>
                </div>
              )}
            </div>
          </div>

          {/* Profile completion */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Profile</span>
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--ska-primary)' }}>{completionPct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 99, background: 'rgba(173,198,255,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${completionPct}%`, borderRadius: 99, background: 'var(--ska-primary)', transition: 'width 0.4s ease' }} />
            </div>
          </div>

          {/* Step tracker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TEACHER_WIZARD_STEPS.map((s, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 10px', borderRadius: 8,
                background: i === step ? 'rgba(173,198,255,0.1)' : 'transparent',
                border: i === step ? '1px solid rgba(173,198,255,0.2)' : '1px solid transparent',
                transition: 'all 0.3s',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: i < step ? 'var(--ska-primary-container)' : i === step ? 'rgba(173,198,255,0.15)' : 'transparent',
                  border: i < step ? 'none' : `1px solid ${i === step ? 'rgba(173,198,255,0.4)' : 'rgba(173,198,255,0.12)'}`,
                }}>
                  {i < step
                    ? <span className="ska-icon" style={{ fontSize: 14, color: '#fff' }}>check</span>
                    : <span className="ska-icon" style={{ fontSize: 14, color: i === step ? 'var(--ska-primary)' : 'var(--ska-text-3)' }}>{s.icon}</span>
                  }
                </div>
                <span style={{ fontSize: '0.8125rem', fontWeight: i === step ? 700 : 500, color: i === step ? 'var(--ska-text)' : 'var(--ska-text-3)' }}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Info note at bottom */}
          <div style={{ marginTop: 'auto', paddingTop: 20 }}>
            <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(173,198,255,0.06)', border: '1px solid rgba(173,198,255,0.1)' }}>
              <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--ska-text-3)', lineHeight: 1.5 }}>
                The teacher will use their email &amp; password to log in to their personal dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div style={{
          flex: 1, background: 'var(--ska-surface-low)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--ska-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ska-text-3)' }}>
                Step {step + 1} of {TEACHER_WIZARD_STEPS.length}
              </p>
              <h2 style={{ margin: '3px 0 0', fontFamily: 'Manrope, sans-serif', fontSize: '1.1875rem', fontWeight: 800, color: 'var(--ska-text)' }}>
                {TEACHER_WIZARD_STEPS[step].label}
              </h2>
            </div>
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={onCancel} style={{ borderRadius: 8 }}>
              <span className="ska-icon ska-icon--sm">close</span>
            </button>
          </div>

          {/* Progress bar */}
          <div style={{ height: 2, display: 'flex', background: 'var(--ska-border)' }}>
            <div style={{
              width: `${((step + 1) / TEACHER_WIZARD_STEPS.length) * 100}%`,
              background: 'var(--ska-primary)', transition: 'width 0.4s ease',
            }} />
          </div>

          {/* Form Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px 8px' }}>
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                borderRadius: 8, background: 'var(--ska-error-dim)', border: '1px solid rgba(255,180,171,0.25)',
                marginBottom: 16, fontSize: '0.875rem', color: 'var(--ska-error)',
              }}>
                <span className="ska-icon ska-icon--sm">error</span>
                <span style={{ flex: 1 }}>{error}</span>
                {(error.includes('reach the server') || error.includes('connection')) && (
                  <button type="button" onClick={handleSubmit}
                    style={{ flexShrink: 0, background: 'none', border: '1px solid var(--ska-error)', borderRadius: 6, padding: '3px 10px', fontSize: '0.8125rem', color: 'var(--ska-error)', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span className="ska-icon" style={{ fontSize: 14 }}>refresh</span>Retry
                  </button>
                )}
              </div>
            )}

            {/* STEP 0 — Personal Info */}
            {step === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ margin: '0 0 12px', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
                  Enter the teacher's personal and contact details.
                </p>
                {/* Photo upload */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} ref={teacherImgRef} onChange={handleTeacherImageChange} />
                  <div
                    onClick={() => teacherImgRef.current?.click()}
                    onMouseEnter={() => setPhotoHover(true)}
                    onMouseLeave={() => setPhotoHover(false)}
                    style={{
                      width: 68, height: 68, borderRadius: 14, flexShrink: 0,
                      background: profilePreview ? 'transparent' : 'var(--ska-surface-high)',
                      border: `2px dashed ${profilePreview ? 'var(--ska-primary)' : 'var(--ska-border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', overflow: 'hidden', position: 'relative',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    {profilePreview
                      ? <img src={profilePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span className="ska-icon" style={{ fontSize: 28, color: 'var(--ska-text-3)' }}>add_a_photo</span>
                    }
                    {profilePreview && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: photoHover ? 1 : 0, transition: 'opacity 0.2s',
                      }}>
                        <span className="ska-icon" style={{ fontSize: 22, color: '#fff' }}>photo_camera</span>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text)' }}>
                      {profilePreview ? 'Photo uploaded' : 'Upload profile photo'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>JPG, PNG or WebP · max 5 MB</span>
                    {profilePreview && (
                      <button type="button" onClick={() => { setProfileImage(null); setProfilePreview(''); setPhotoHover(false); }} style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                        fontSize: '0.75rem', color: 'var(--ska-error)', fontWeight: 600, textAlign: 'left',
                      }}>Remove</button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { key: 'first_name', label: 'First Name',    required: true,  type: 'text',  placeholder: 'e.g. Abubakarr'     },
                    { key: 'last_name',  label: 'Last Name',     required: true,  type: 'text',  placeholder: 'e.g. Kamara'        },
                    { key: 'email',      label: 'Email Address', required: true,  type: 'email', placeholder: 'teacher@school.com' },
                  ].map(({ key, label, required, type, placeholder }) => (
                    <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ska-text-3)' }}>
                        {label}{required && <span style={{ color: 'var(--ska-error)', marginLeft: 2 }}>*</span>}
                      </span>
                      <input
                        className="ska-input"
                        type={type}
                        value={form[key]}
                        placeholder={placeholder}
                        style={fieldErrors[key] ? { borderColor: 'var(--ska-error)' } : {}}
                        onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setFieldErrors(p => ({ ...p, [key]: '' })); }}
                        onBlur={() => {
                          const v = form[key].trim();
                          if (key === 'first_name' || key === 'last_name') {
                            setFieldErrors(p => ({ ...p, [key]: v ? '' : 'Required' }));
                          } else if (key === 'email') {
                            if (!v) setFieldErrors(p => ({ ...p, email: 'Required' }));
                            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) setFieldErrors(p => ({ ...p, email: 'Invalid email format' }));
                            else if (existingEmails.includes(v.toLowerCase())) setFieldErrors(p => ({ ...p, email: 'This email is already in use by another teacher' }));
                            else setFieldErrors(p => ({ ...p, email: '' }));
                          }
                        }}
                      />
                      {fieldErrors[key] && <span style={{ fontSize: '0.6875rem', color: 'var(--ska-error)', marginTop: 2 }}>{fieldErrors[key]}</span>}
                    </label>
                  ))}
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ska-text-3)' }}>
                      Phone Number
                    </span>
                    <PhoneInput value={form.phone_number} onChange={v => setForm(f => ({ ...f, phone_number: v }))} placeholder="76 000 000" />
                  </label>
                  <div style={{ gridColumn: '1/-1', height: 1, background: 'var(--ska-border)', margin: '4px 0' }} />
                  {/* Password full-width with strength meter */}
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1/-1' }}>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ska-text-3)' }}>
                      Login Password <span style={{ color: 'var(--ska-error)' }}>*</span>
                    </span>
                    <div style={{ position: 'relative' }}>
                      <input
                        className="ska-input"
                        type={showPass ? 'text' : 'password'}
                        value={form.password}
                        placeholder="Create a secure password (min 8 chars)"
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        style={{ paddingRight: 44 }}
                      />
                      <button type="button" onClick={() => setShowPass(p => !p)}
                        style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', display: 'flex', padding: 0 }}>
                        <span className="ska-icon ska-icon--sm">{showPass ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {/* Strength meter */}
                    {form.password.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {[1,2,3,4,5].map(i => (
                            <div key={i} style={{
                              flex: 1, height: 3, borderRadius: 99,
                              background: i <= pw.score ? pw.color : 'var(--ska-surface-highest)',
                              transition: 'background 0.3s',
                            }} />
                          ))}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: pw.color, fontWeight: 600 }}>
                          {pw.label} password
                          {pw.score < 3 && <span style={{ color: 'var(--ska-text-3)', fontWeight: 400 }}> — add uppercase, numbers &amp; symbols</span>}
                        </span>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* STEP 1 — Account & Role */}
            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <p style={{ margin: '0 0 16px', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
                  Assign a staff ID and professional details for this teacher.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { key: 'employee_id',   label: 'Employee ID',           required: true,  placeholder: 'e.g. T-0042' },
                    { key: 'qualification', label: 'Qualification / Degree', required: false, placeholder: 'e.g. B.Sc. Mathematics' },
                  ].map(({ key, label, required, placeholder }) => (
                    <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ska-text-3)' }}>
                        {label}{required && <span style={{ color: 'var(--ska-error)', marginLeft: 2 }}>*</span>}
                      </span>
                      <input
                        className="ska-input"
                        type="text"
                        value={form[key]}
                        placeholder={placeholder}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      />
                      {key === 'qualification' && subjectSuggestion && !form.qualification && (
                        <span style={{
                          fontSize: '0.6875rem', color: 'var(--ska-primary)', marginTop: 2,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <span className="ska-icon ska-icon--sm" style={{ fontSize: '0.85rem' }}>tips_and_updates</span>
                          Suggested: {subjectSuggestion}
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, qualification: subjectSuggestion.split(' · ')[0] }))}
                            style={{
                              marginLeft: 6, background: 'transparent', border: 'none',
                              color: 'var(--ska-primary)', textDecoration: 'underline', cursor: 'pointer',
                              fontSize: '0.6875rem', fontWeight: 700, padding: 0,
                            }}
                          >
                            Use
                          </button>
                        </span>
                      )}
                    </label>
                  ))}
                </div>

                {/* Login credentials summary */}
                <div style={{
                  marginTop: 8, padding: '14px 16px', borderRadius: 10,
                  background: 'rgba(173,198,255,0.05)', border: '1px solid rgba(173,198,255,0.12)',
                }}>
                  <p style={{ margin: '0 0 10px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Login Credentials Preview
                  </p>
                  {[
                    ['Email',    form.email    || '—', 'email'],
                    ['Password', form.password ? '••••••••' : '—', 'lock'],
                  ].map(([k, v, ic]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--ska-border)' }}>
                      <span className="ska-icon ska-icon--sm" style={{ color: 'var(--ska-text-3)' }}>{ic}</span>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', minWidth: 70 }}>{k}</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text)', marginLeft: 'auto' }}>{v}</span>
                    </div>
                  ))}
                  <p style={{ margin: '10px 0 0', fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>
                    Share these credentials with the teacher so they can log in.
                  </p>
                </div>
                
                {/* Class Allocation Section */}
                <div style={{
                  marginTop: 16, padding: '16px', borderRadius: 10,
                  background: 'var(--ska-surface-high)', border: '1px solid var(--ska-border)',
                }}>
                  <p style={{ margin: '0 0 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--ska-text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <span className="ska-icon ska-icon--sm" style={{ marginRight: 6, verticalAlign: 'middle' }}>class</span>
                    Class Allocation (Optional)
                  </p>
                  <p style={{ margin: '0 0 12px', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
                    Assign this teacher to specific classes and subjects. You can also do this later from the teacher management page.
                  </p>
                  
                  {/* Add new assignment */}
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <select
                      className="ska-input"
                      value={newAssignment.classroom_id}
                      onChange={e => setNewAssignment({ ...newAssignment, classroom_id: e.target.value })}
                      style={{ flex: 1 }}
                    >
                      <option value="">Select Class...</option>
                      {classes.filter(c => !classAssignments.some(ca => ca.classroom_id === c.id)).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    <select
                      className="ska-input"
                      value={newAssignment.subject_id}
                      onChange={e => setNewAssignment({ ...newAssignment, subject_id: e.target.value })}
                      style={{ flex: 1 }}
                    >
                      <option value="">Select Subject...</option>
                      {subjects.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="ska-btn ska-btn--primary"
                      onClick={addClassAssignment}
                      disabled={!newAssignment.classroom_id || !newAssignment.subject_id}
                      style={{ padding: '8px 12px' }}
                    >
                      <span className="ska-icon ska-icon--sm">add</span>
                    </button>
                  </div>
                  
                  {/* Assigned classes list */}
                  {classAssignments.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {classAssignments.map((ca, index) => (
                        <div key={index} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 8,
                          background: 'var(--ska-surface-card)', border: '1px solid var(--ska-border)',
                        }}>
                          <span className="ska-icon ska-icon--sm" style={{ color: 'var(--ska-primary)' }}>class</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text)' }}>{ca.class_name}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', marginLeft: 8 }}>• {ca.subject_name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeClassAssignment(index)}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              color: 'var(--ska-error)', padding: 4,
                            }}
                          >
                            <span className="ska-icon ska-icon--sm">close</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      padding: '16px', borderRadius: 8,
                      background: 'var(--ska-surface-low)', border: '1px dashed var(--ska-border)',
                      textAlign: 'center',
                    }}>
                      <span className="ska-icon" style={{ fontSize: 24, color: 'var(--ska-text-3)', marginBottom: 8 }}>school</span>
                      <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
                        No classes assigned yet
                      </p>
                    </div>
                  )}
                </div>

                {/* Academic Assignment — Max Workload + Availability */}
                <div style={{
                  marginTop: 16, padding: '16px', borderRadius: 10,
                  background: 'var(--ska-surface-high)', border: '1px solid var(--ska-border)',
                }}>
                  <p style={{ margin: '0 0 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--ska-text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <span className="ska-icon ska-icon--sm" style={{ marginRight: 6, verticalAlign: 'middle' }}>schedule</span>
                    Academic Assignment
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ska-text-3)' }}>
                        Max Workload (periods/week)
                      </span>
                      <input
                        className="ska-input"
                        type="number"
                        min={1}
                        max={50}
                        value={form.max_workload}
                        onChange={e => setForm(f => ({ ...f, max_workload: e.target.value }))}
                        placeholder="e.g. 20"
                      />
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--ska-text-3)' }}>
                        Workload Check
                      </span>
                      {(() => {
                        const assigned = classAssignments.length * 4; /* mock 4 periods/class */
                        const limit = Number(form.max_workload) || 20;
                        const over = assigned > limit;
                        return (
                          <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', fontWeight: 700, color: over ? 'var(--ska-error)' : 'var(--ska-text-2)' }}>
                            ~{assigned} periods assigned · {over ? '⚠ may exceed limit' : 'within limit'}
                          </p>
                        );
                      })()}
                    </div>
                  </div>

                  <p style={{ margin: '0 0 8px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Availability ({availSlotCount} slot{availSlotCount !== 1 ? 's' : ''} selected)
                  </p>
                  <div style={{ overflowX: 'auto' }}>
                    <div style={{ minWidth: 360, display: 'grid', gridTemplateColumns: '46px repeat(8, 1fr)', gap: 4 }}>
                      <div></div>
                      {Array.from({ length: 8 }, (_, i) => (
                        <div key={`hp${i}`} style={{ textAlign: 'center', fontSize: '0.625rem', color: 'var(--ska-text-3)', fontWeight: 700 }}>
                          P{i + 1}
                        </div>
                      ))}
                      {['Mon','Tue','Wed','Thu','Fri'].map(day => (
                        <React.Fragment key={day}>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)', fontWeight: 700, alignSelf: 'center' }}>{day}</div>
                          {availability[day].map((on, pi) => (
                            <button
                              key={`${day}${pi}`}
                              type="button"
                              onClick={() => toggleAvail(day, pi)}
                              title={`${day} P${pi + 1}: ${on ? 'available' : 'unavailable'}`}
                              style={{
                                height: 28, border: 'none', borderRadius: 4, cursor: 'pointer',
                                background: on ? 'var(--ska-primary)' : 'var(--ska-surface-highest)',
                                color: on ? 'var(--ska-surface)' : 'var(--ska-text-3)',
                                fontSize: '0.6875rem', fontWeight: 700,
                                transition: 'background 0.15s',
                              }}
                            >
                              {on ? '✓' : ''}
                            </button>
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2 — Review & Create */}
            {step === 2 && (
              <div>
                <p style={{ margin: '0 0 16px', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
                  Review all details before creating the account for{' '}
                  <strong style={{ color: 'var(--ska-text)' }}>{school ? school.name : 'your school'}</strong>.
                </p>

                {/* Teacher ID Card */}
                <div style={{
                  borderRadius: 12, overflow: 'hidden', marginBottom: 16,
                  border: '1px solid rgba(173,198,255,0.15)',
                }}>
                  {/* Card header */}
                  <div style={{
                    padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
                    background: 'linear-gradient(135deg, #1a2540, #111928)',
                    borderBottom: '1px solid rgba(173,198,255,0.1)',
                  }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 12, flexShrink: 0,
                      background: 'linear-gradient(135deg, var(--ska-primary-container), rgba(77,142,255,0.4))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.25rem', fontWeight: 900, color: '#fff',
                      fontFamily: 'Manrope, sans-serif', letterSpacing: '-0.02em',
                      border: '1.5px solid rgba(173,198,255,0.25)',
                      overflow: 'hidden',
                    }}>
                      {profilePreview
                        ? <img src={profilePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : avatarLetters
                      }
                    </div>
                    <div>
                      <p style={{ margin: 0, fontFamily: 'Manrope, sans-serif', fontSize: '1rem', fontWeight: 800, color: 'var(--ska-text)', lineHeight: 1.2 }}>
                        {displayName}
                      </p>
                      <p style={{ margin: '3px 0 0', fontSize: '0.75rem', color: 'var(--ska-primary)', fontWeight: 600 }}>
                        {form.qualification || 'Teacher'}
                      </p>
                    </div>
                    <div style={{
                      marginLeft: 'auto', padding: '4px 10px', borderRadius: 99,
                      background: 'rgba(173,198,255,0.1)', border: '1px solid rgba(173,198,255,0.2)',
                    }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--ska-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Staff</span>
                    </div>
                  </div>
                  {/* Card details */}
                  <div style={{ padding: '12px 16px', background: 'var(--ska-surface-card)' }}>
                    <TeacherReviewRow label="Email"         value={form.email         || '—'} icon="email"  />
                    <TeacherReviewRow label="Phone"         value={form.phone_number  || '—'} icon="call"   />
                    <TeacherReviewRow label="Employee ID"   value={form.employee_id   || '—'} icon="badge"  />
                    <TeacherReviewRow label="Qualification" value={form.qualification || '—'} icon="school" />
                    <TeacherReviewRow label="Password"      value="••••••••"                  icon="lock"   />
                    <TeacherReviewRow label="Max Workload"  value={`${form.max_workload || 20} periods/week`} icon="schedule" />
                    <TeacherReviewRow label="Availability"  value={`${availSlotCount} of 40 slots`} icon="event_available" />
                  </div>
                </div>

                {/* Class Assignments Summary */}
                {classAssignments.length > 0 && (
                  <div style={{
                    borderRadius: 12, overflow: 'hidden', marginBottom: 16,
                    border: '1px solid rgba(173,198,255,0.15)',
                  }}>
                    <div style={{
                      padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
                      background: 'linear-gradient(135deg, #1a2540, #111928)',
                      borderBottom: '1px solid rgba(173,198,255,0.1)',
                    }}>
                      <span className="ska-icon" style={{ color: 'var(--ska-primary)' }}>class</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--ska-primary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Class Assignments ({classAssignments.length})
                      </span>
                    </div>
                    <div style={{ padding: '12px 16px', background: 'var(--ska-surface-card)' }}>
                      {classAssignments.map((ca, index) => (
                        <div key={index} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0',
                          borderBottom: index < classAssignments.length - 1 ? '1px solid var(--ska-border)' : 'none',
                        }}>
                          <span className="ska-icon ska-icon--sm" style={{ color: 'var(--ska-text-3)' }}>class</span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ska-text)' }}>{ca.class_name}</span>
                          <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>— {ca.subject_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px',
                  borderRadius: 8, background: 'rgba(173,198,255,0.06)', border: '1px solid rgba(173,198,255,0.12)',
                }}>
                  <span className="ska-icon ska-icon--sm" style={{ color: 'var(--ska-primary)', marginTop: 1 }}>info</span>
                  <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ska-text-3)', lineHeight: 1.5 }}>
                    Once created, the teacher can log in at <strong style={{ color: 'var(--ska-text)' }}>the school portal</strong> using their email and password.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '14px 24px 20px',
            borderTop: '1px solid var(--ska-border)',
            display: 'flex', gap: 10,
          }}>
            {step > 0
              ? <button className="ska-btn ska-btn--ghost" onClick={() => setStep(s => s - 1)} style={{ flex: 1 }}>
                  <span className="ska-icon ska-icon--sm">arrow_back</span>Back
                </button>
              : <button className="ska-btn ska-btn--ghost" onClick={onCancel} style={{ flex: 1 }}>Cancel</button>
            }
            {step < TEACHER_WIZARD_STEPS.length - 1
              ? <button className="ska-btn ska-btn--primary" disabled={!canNext} onClick={() => setStep(s => s + 1)} style={{ flex: 2 }}>
                  Continue<span className="ska-icon ska-icon--sm">arrow_forward</span>
                </button>
              : <button className="ska-btn ska-btn--primary" disabled={saving || !canNext} onClick={handleSubmit} style={{ flex: 2 }}>
                  {saving
                    ? <><span className="ska-icon ska-icon--sm">hourglass_empty</span>Creating account…</>
                    : <><span className="ska-icon ska-icon--sm">person_add</span>Create Teacher Account</>
                  }
                </button>
            }
          </div>
        </div>
      </div>

      {/* Mobile panel hide style */}
      <style>{`
        @media (max-width: 600px) {
          .teacher-wizard-panel { display: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ── EditTeacherModal ── */
function EditTeacherModal({ teacher, onSave, onClose }) {
  const [form, setForm] = React.useState({
    first_name:    teacher.first_name    || '',
    last_name:     teacher.last_name     || '',
    email:         teacher.email         || '',
    phone_number:  teacher.phone_number  || '',
    qualification: teacher.qualification || '',
  });
  const [saving,         setSaving]         = React.useState(false);
  const [error,          setError]          = React.useState('');
  const [profileImage,   setProfileImage]   = React.useState(null);
  const [profilePreview, setProfilePreview] = React.useState(
    teacher.profile_picture ? teacher.profile_picture : ''
  );
  const [photoHover, setPhotoHover]         = React.useState(false);
  const editImgRef = React.useRef(null);

  const avatarLetters = _teacherAvatarLetters(form.first_name, form.last_name);
  const displayName   = [form.first_name, form.last_name].filter(Boolean).join(' ') || 'Teacher';

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError('Photo must be under 5 MB.'); return; }
    setError('');
    setProfileImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProfilePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (profileImage) fd.append('profile_picture', profileImage);
      await ApiClient.put(`/api/school/teachers/${teacher.id}/`, fd);
      onSave();
    } catch (e) { setError(e.message || 'Failed to save.'); setSaving(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        width: '100%', maxWidth: 680,
        display: 'flex', borderRadius: 20, overflow: 'hidden',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)', maxHeight: '90vh',
      }}>

        {/* ── Left preview panel ── */}
        <div className="teacher-wizard-panel" style={{
          width: 200, flexShrink: 0,
          background: 'linear-gradient(160deg,#1a2540 0%,#0e1728 60%,#060e1c 100%)',
          display: 'flex', flexDirection: 'column', padding: '28px 18px',
          borderRight: '1px solid rgba(173,198,255,0.08)',
        }}>
          <p style={{ margin: '0 0 20px', fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--ska-text-3)' }}>
            Edit Teacher
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{
              width: 76, height: 76, borderRadius: 18, flexShrink: 0,
              background: 'linear-gradient(135deg,var(--ska-primary-container),rgba(77,142,255,0.4))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 900, color: '#fff',
              border: '2px solid rgba(173,198,255,0.25)',
              boxShadow: '0 8px 24px rgba(77,142,255,0.25)',
              overflow: 'hidden',
            }}>
              {profilePreview
                ? <img src={profilePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : avatarLetters
              }
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: 'var(--ska-text)', lineHeight: 1.2 }}>{displayName}</p>
              {form.employee_id && <p style={{ margin: '3px 0 0', fontSize: '0.6875rem', color: 'var(--ska-text-3)', fontWeight: 600 }}>ID: {teacher.employee_id}</p>}
              {form.qualification && (
                <div style={{ marginTop: 6, display: 'inline-flex', padding: '2px 8px', borderRadius: 99, background: 'rgba(173,198,255,0.1)', border: '1px solid rgba(173,198,255,0.15)' }}>
                  <span style={{ fontSize: '0.625rem', color: 'var(--ska-primary)' }}>{form.qualification}</span>
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(173,198,255,0.06)', border: '1px solid rgba(173,198,255,0.1)', marginTop: 'auto' }}>
            <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--ska-text-3)', lineHeight: 1.5 }}>
              Changes take effect immediately after saving.
            </p>
          </div>
        </div>

        {/* ── Right form panel ── */}
        <div style={{ flex: 1, background: 'var(--ska-surface-low)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--ska-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ska-text-3)' }}>School Admin</p>
              <h2 style={{ margin: '2px 0 0', fontSize: '1.125rem', fontWeight: 800, color: 'var(--ska-text)' }}>Edit Teacher Profile</h2>
            </div>
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={onClose} style={{ borderRadius: 8 }}>
              <span className="ska-icon ska-icon--sm">close</span>
            </button>
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--ska-error-dim)', border: '1px solid rgba(255,180,171,0.25)', marginBottom: 16, fontSize: '0.875rem', color: 'var(--ska-error)' }}>
                <span className="ska-icon ska-icon--sm">error</span>{error}
              </div>
            )}

            {/* Photo upload */}
            <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} ref={editImgRef} onChange={handleImageChange} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, padding: '14px 16px', borderRadius: 12, background: 'var(--ska-surface-high)', border: '1px solid var(--ska-border)' }}>
              <div
                onClick={() => editImgRef.current?.click()}
                onMouseEnter={() => setPhotoHover(true)}
                onMouseLeave={() => setPhotoHover(false)}
                style={{
                  width: 56, height: 56, borderRadius: 12, flexShrink: 0,
                  background: profilePreview ? 'transparent' : 'var(--ska-surface-highest)',
                  border: `2px dashed ${profilePreview ? 'var(--ska-primary)' : 'var(--ska-border)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', overflow: 'hidden', position: 'relative', transition: 'border-color 0.2s',
                }}
              >
                {profilePreview
                  ? <img src={profilePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span className="ska-icon" style={{ fontSize: 24, color: 'var(--ska-text-3)' }}>add_a_photo</span>
                }
                {profilePreview && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: photoHover ? 1 : 0, transition: 'opacity 0.2s' }}>
                    <span className="ska-icon" style={{ fontSize: 18, color: '#fff' }}>photo_camera</span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--ska-text)' }}>
                  {profilePreview ? 'Profile photo' : 'Upload profile photo'}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>JPG, PNG or WebP · max 5 MB</span>
                {profileImage && (
                  <button type="button" onClick={() => { setProfileImage(null); setProfilePreview(teacher.profile_picture || ''); setPhotoHover(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.75rem', color: 'var(--ska-error)', fontWeight: 600, textAlign: 'left' }}>
                    Revert to original
                  </button>
                )}
              </div>
            </div>

            {/* Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { key: 'first_name',    label: 'First Name',          full: false },
                { key: 'last_name',     label: 'Last Name',           full: false },
                { key: 'email',         label: 'Email Address',       full: true,  type: 'email' },
                { key: 'phone_number',  label: 'Phone Number',        full: false },
                { key: 'qualification', label: 'Qualification',       full: false },
              ].map(({ key, label, full, type = 'text' }) => (
                <label key={key} className="ska-form-group" style={{ margin: 0, gridColumn: full ? '1/-1' : undefined }}>
                  <span>{label}</span>
                  <input className="ska-input" type={type} value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </label>
              ))}
            </div>

            {/* Employee ID (read-only) */}
            <div style={{ marginTop: 14, padding: '10px 14px', borderRadius: 10, background: 'var(--ska-surface-high)', border: '1px solid var(--ska-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', fontWeight: 600 }}>Employee ID</span>
              <span style={{ fontSize: '0.875rem', color: 'var(--ska-text)', fontWeight: 700 }}>{teacher.employee_id || '—'}</span>
            </div>
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 24px 20px', borderTop: '1px solid var(--ska-border)', display: 'flex', gap: 10 }}>
            <button className="ska-btn ska-btn--ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
            <button className="ska-btn ska-btn--primary" disabled={saving} onClick={handleSave} style={{ flex: 2 }}>
              {saving
                ? <><span className="ska-icon ska-icon--sm">hourglass_empty</span>Saving…</>
                : <><span className="ska-icon ska-icon--sm">save</span>Save Changes</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── WorkloadAnalytics: workforce intelligence panel ── */
function WorkloadAnalytics({ stats, teachers }) {
  const sorted = [...teachers]
    .sort((a, b) => (b.periods_per_week || 0) - (a.periods_per_week || 0))
    .slice(0, 6);
  const maxP = Math.max(...sorted.map(t => t.periods_per_week || 0), 20);

  return (
    <div className="ska-card ska-card-pad">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontWeight: 800, fontSize: '0.9375rem', color: 'var(--ska-text)' }}>Workload Balance</h3>
        <span style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Avg {stats.avg_periods} periods/wk
        </span>
      </div>
      {sorted.length === 0
        ? <p style={{ color: 'var(--ska-text-3)', fontSize: '0.875rem', textAlign: 'center', padding: '12px 0' }}>No teacher data yet.</p>
        : sorted.map(t => {
            const p   = t.periods_per_week || 0;
            const pct = maxP > 0 ? (p / maxP) * 100 : 0;
            const isOver = p > 20;
            const isNear = !isOver && p >= 17;
            const col = isOver ? 'var(--ska-error)' : isNear ? '#fbbf24' : 'var(--ska-primary)';
            return (
              <div key={t.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ska-text)' }}>{t.full_name}</span>
                  <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: col, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {isOver ? 'Overloaded · ' : isNear ? 'Near limit · ' : ''}{p} periods
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--ska-surface-highest)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pct}%`, background: col, borderRadius: 4,
                    boxShadow: isOver ? `0 0 10px ${col}60` : 'none', transition: 'width 0.5s ease',
                  }} />
                </div>
              </div>
            );
          })
      }
    </div>
  );
}

/* ── TeachersPage: main export ── */
export function TeachersPage({ school }) {
  const [teachers,       setTeachers]       = React.useState([]);
  const [stats,          setStats]          = React.useState(null);
  const [loading,        setLoading]        = React.useState(true);
  const [loadFailed,     setLoadFailed]     = React.useState(false);
  const [search,         setSearch]         = React.useState('');
  const [filter,         setFilter]         = React.useState('all');
  const [subView,        setSubView]        = React.useState('list');
  const [profileTeacher, setProfileTeacher] = React.useState(null);
  const [profileFocus,   setProfileFocus]   = React.useState(null);
  const [editTeacher,    setEditTeacher]    = React.useState(null);
  const [showBulkImport, setShowBulkImport] = React.useState(false);
  const searchTimer = React.useRef(null);

  const loadTeachers = React.useCallback(async (q, ov) => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const params = [];
      if (q)  params.push(`q=${encodeURIComponent(q)}`);
      if (ov) params.push(`overloaded=${ov}`);
      const url = '/api/school/teachers/' + (params.length ? '?' + params.join('&') : '');
      const d   = await ApiClient.get(url);
      setTeachers(d.teachers || []);
    } catch { setTeachers([]); setLoadFailed(true); }
    setLoading(false);
  }, []);

  const loadStats = React.useCallback(async () => {
    try { const d = await ApiClient.get('/api/school/teacher-stats/'); setStats(d); }
    catch { setStats(null); }
  }, []);

  React.useEffect(() => { loadTeachers('', ''); loadStats(); }, [loadTeachers, loadStats]);

  const handleSearch = e => {
    const q = e.target.value;
    setSearch(q);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => loadTeachers(q, filter === 'overloaded' ? '1' : ''), 280);
  };

  const setFilterLoad = f => {
    setFilter(f);
    loadTeachers(search, f === 'overloaded' ? '1' : '');
  };

  const handleDelete = async id => {
    if (!window.confirm('Remove this teacher from the school?')) return;
    try {
      await ApiClient.delete(`/api/school/teachers/${id}/`);
      loadTeachers(search, filter === 'overloaded' ? '1' : '');
      loadStats();
    } catch (e) { alert(e.message || 'Failed to remove.'); }
  };

  const afterSave = () => {
    setSubView('list');
    setEditTeacher(null);
    loadTeachers(search, filter === 'overloaded' ? '1' : '');
    loadStats();
  };

  /* Client-side filter for "active" (server only supports overloaded) */
  const visibleTeachers = filter === 'active'
    ? teachers.filter(t => !t.is_overloaded && t.is_active !== false)
    : teachers;

  const statCards = stats ? [
    { icon: 'group',        label: 'Total Staff',  value: stats.total,       color: 'var(--ska-primary)' },
    { icon: 'check_circle', label: 'Active',       value: stats.active,      color: 'var(--ska-secondary)' },
    { icon: 'warning',      label: 'Overloaded',   value: stats.overloaded,  color: 'var(--ska-error)' },
    { icon: 'schedule',     label: 'Avg Periods',  value: stats.avg_periods, color: 'var(--ska-tertiary)' },
  ] : [];

  return (
    <div className="ska-content">
      {/* Page header */}
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Teachers</h1>
          <p className="ska-page-sub">{school ? school.name : ''} · {teachers.length} staff members</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="ska-btn ska-btn--ghost" onClick={() => setShowBulkImport(true)}>
            <span className="ska-icon ska-icon--sm">upload_file</span> Bulk Import
          </button>
          <button className="ska-btn ska-btn--primary" onClick={() => setSubView('add')}>
            <span className="ska-icon ska-icon--sm">group_add</span> Add Teacher
          </button>
        </div>
      </div>

      {/* ── Analytics section: stats grid + workload ── */}
      {stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
            {statCards.map(m => (
              <div key={m.label} className="ska-card ska-card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: m.color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="ska-icon" style={{ color: m.color }}>{m.icon}</span>
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '1.375rem', color: m.color, lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontSize: '0.6875rem', color: 'var(--ska-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{m.label}</div>
                </div>
              </div>
            ))}
          </div>
          {stats.overloaded > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10,
              background: 'var(--ska-error-dim)', border: '1px solid rgba(255,180,171,0.25)',
              color: 'var(--ska-error)', fontSize: '0.85rem', fontWeight: 600,
            }}>
              <span className="ska-icon ska-icon--sm">warning</span>
              {stats.overloaded} teacher{stats.overloaded > 1 ? 's' : ''} overloaded — consider reassigning periods
            </div>
          )}
          {teachers.length > 0 && <WorkloadAnalytics stats={stats} teachers={teachers} />}
        </div>
      )}

      {/* ── List section: search, filters, teacher grid ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="ska-search ska-toolbar-search">
          <span className="ska-icon">search</span>
          <input className="ska-search-input" placeholder="Search by name or employee ID…" value={search} onChange={handleSearch} />
        </div>

        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {[
            { key: 'all',        label: 'All Teachers' },
            { key: 'active',     label: 'Active' },
            { key: 'overloaded', label: 'Overloaded' },
          ].map(c => (
            <button key={c.key} onClick={() => setFilterLoad(c.key)} style={{
              flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: 'none',
              fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
              background: filter === c.key ? 'var(--ska-primary)' : 'var(--ska-surface-card)',
              color:      filter === c.key ? 'var(--ska-surface)' : 'var(--ska-text-2)',
              transition: 'background 0.2s',
            }}>{c.label}</button>
          ))}
        </div>

        <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ska-text-3)', fontWeight: 600 }}>
          {loading ? 'Loading…' : `${visibleTeachers.length} teacher${visibleTeachers.length !== 1 ? 's' : ''}`}
        </p>

      {/* Card grid */}
      {!loading && loadFailed ? (
        <div className="ska-empty" style={{ padding: '40px 0' }}>
          <span className="ska-icon ska-icon--xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }}>wifi_off</span>
          <p className="ska-empty-title">Could not load teachers</p>
          <p className="ska-empty-desc">Check your connection and try again.</p>
          <button className="ska-btn ska-btn--ghost" style={{ marginTop: 14 }} onClick={() => loadTeachers(search, filter === 'overloaded' ? '1' : '')}>
            <span className="ska-icon ska-icon--sm">refresh</span> Retry
          </button>
        </div>
      ) : !loading && visibleTeachers.length === 0 ? (
        <div className="ska-empty" style={{ padding: '40px 0' }}>
          <span className="ska-icon ska-icon--xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }}>school</span>
          <p className="ska-empty-title">No teachers found</p>
          <p className="ska-empty-desc">
            {filter === 'overloaded' ? 'No overloaded teachers.'
              : filter === 'active' ? 'No active teachers match.'
              : 'Add your first teacher to get started.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {visibleTeachers.map(t => (
            <TeacherCard key={t.id} t={t}
              onOpen={(tc, f) => { setProfileTeacher(tc); setProfileFocus(f || null); setSubView('profile'); }}
              onEdit={tc => setEditTeacher(tc)}
              onDelete={handleDelete} />
          ))}
        </div>
      )}
      </div>{/* end list section */}

      {/* Profile panel overlay */}
      {subView === 'profile' && profileTeacher && (
        <TeacherProfilePanel
          teacher={profileTeacher}
          focus={profileFocus}
          onClose={() => { setSubView('list'); setProfileTeacher(null); setProfileFocus(null); }}
          onEdit={tc => { setSubView('list'); setProfileTeacher(null); setProfileFocus(null); setEditTeacher(tc); }} />
      )}

      {/* Add wizard */}
      {subView === 'add' && (
        <AddTeacherWizard
          school={school}
          existingTeachers={teachers}
          onSave={afterSave}
          onCancel={() => setSubView('list')} />
      )}

      {/* Bulk import modal */}
      {showBulkImport && (
        <BulkImportModal
          existingEmails={teachers.map(t => (t.email || '').trim().toLowerCase()).filter(Boolean)}
          existingTeachers={teachers}
          onClose={() => setShowBulkImport(false)}
          onImported={() => { setShowBulkImport(false); afterSave(); }}
        />
      )}

      {/* Edit modal */}
      {editTeacher && (
        <EditTeacherModal teacher={editTeacher} onSave={afterSave} onClose={() => setEditTeacher(null)} />
      )}
    </div>
  );
}
