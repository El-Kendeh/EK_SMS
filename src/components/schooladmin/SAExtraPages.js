/**
 * EK-SMS School Admin — Extra Pages (Gap fills)
 * ModRequests · GradingScheme · 2FA Setup · AcademicCalendar ·
 * SecurityPage (enhanced) · GradeOversight · Rooms ·
 * ExamOfficers · TeacherAssignments · StudentPromotion
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ApiClient from '../../api/client';

/* ── Shared helpers ──────────────────────────────────────────── */
const Ic = ({ name, size, style, className = '' }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''} ${className}`}
    aria-hidden="true" style={style}>{name}</span>
);
function Banner({ msg }) {
  if (!msg?.text) return null;
  const ok = msg.type === 'ok';
  return (
    <div style={{
      marginBottom: 16, padding: '10px 14px', borderRadius: 8, fontSize: '0.8125rem',
      background: ok ? 'var(--ska-green-dim)' : 'var(--ska-error-dim)',
      color: ok ? 'var(--ska-green)' : 'var(--ska-error)',
      border: `1px solid ${ok ? 'rgba(74,222,128,.25)' : 'rgba(239,68,68,.25)'}`,
      display: 'flex', alignItems: 'center', gap: 8,
    }}>
      <Ic name={ok ? 'check_circle' : 'error'} size="sm" />{msg.text}
    </div>
  );
}
function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      background: 'rgba(0,0,0,0.45)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--ska-surface)', borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        width: '100%', maxWidth: width, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--ska-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--ska-text)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-text-3)', display: 'flex', alignItems: 'center' }}>
            <Ic name="close" />
          </button>
        </div>
        <div style={{ padding: 20, overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}
const STATUS_BADGE = {
  pending:  { bg: 'var(--ska-tertiary-dim)', color: 'var(--ska-tertiary)', label: 'Pending' },
  approved: { bg: 'var(--ska-green-dim)',    color: 'var(--ska-green)',    label: 'Approved' },
  rejected: { bg: 'var(--ska-error-dim)',    color: 'var(--ska-error)',    label: 'Rejected' },
  withdrawn:{ bg: 'var(--ska-surface-high)', color: 'var(--ska-text-3)',  label: 'Withdrawn' },
};

/* ============================================================
   1. MODIFICATION REQUEST REVIEW PAGE
   ============================================================ */
export function ModRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('pending');
  const [selected, setSelected] = useState(null);
  const [reason, setReason]     = useState('');
  const [acting, setActing]     = useState(false);
  const [banner, setBanner]     = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    ApiClient.get(`/api/school/modification-requests/${filter ? `?status=${filter}` : ''}`)
      .then(d => setRequests(d.requests || []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async (action) => {
    if (!selected) return;
    setActing(true);
    try {
      await ApiClient.post('/api/school/modification-requests/review/', {
        request_id: selected.id,
        action,
        reason,
      });
      setBanner({ type: 'ok', text: `Request ${action === 'approve' ? 'approved' : 'rejected'} successfully.` });
      setSelected(null);
      setReason('');
      load();
    } catch (e) {
      setBanner({ type: 'err', text: e.message || 'Action failed.' });
    }
    setActing(false);
  };

  const counts = requests.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Modification Requests</h1>
          <p className="ska-page-sub">Grade change requests from teachers — review and approve or reject</p>
        </div>
        <button className="ska-btn ska-btn--ghost" onClick={load}><Ic name="refresh" size="sm" /> Refresh</button>
      </div>

      <Banner msg={banner} />

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['pending','schedule','var(--ska-tertiary)'],['approved','check_circle','var(--ska-green)'],['rejected','cancel','var(--ska-error)']].map(([s,ic,c]) => (
          <div key={s} className="ska-card ska-card-pad" style={{ flex: '1 1 150px', cursor: 'pointer', borderBottom: filter === s ? `3px solid ${c}` : '3px solid transparent' }}
            onClick={() => setFilter(s)}>
            <Ic name={ic} style={{ color: c, fontSize: 24 }} />
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ska-text)', marginTop: 8 }}>{counts[s] || 0}</div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', textTransform: 'capitalize' }}>{s}</div>
          </div>
        ))}
        <div className="ska-card ska-card-pad" style={{ flex: '1 1 150px', cursor: 'pointer', borderBottom: filter === '' ? '3px solid var(--ska-primary)' : '3px solid transparent' }}
          onClick={() => setFilter('')}>
          <Ic name="list" style={{ color: 'var(--ska-primary)', fontSize: 24 }} />
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ska-text)', marginTop: 8 }}>{requests.length}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>All</div>
        </div>
      </div>

      <div className="ska-card" style={{ overflowX: 'auto' }}>
        {loading ? <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
          : requests.length === 0 ? (
            <div className="ska-empty">
              <Ic name="task_alt" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
              <p className="ska-empty-title">No {filter} requests</p>
              <p className="ska-empty-desc">Grade modification requests from teachers appear here.</p>
            </div>
          ) : (
            <table className="ska-table">
              <thead><tr>
                <th>Student</th><th>Subject</th><th>Teacher</th>
                <th>Current</th><th>Proposed</th><th>Reason</th>
                <th>Status</th><th>Date</th><th></th>
              </tr></thead>
              <tbody>
                {requests.map(r => {
                  const sb = STATUS_BADGE[r.status] || STATUS_BADGE.pending;
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 600 }}>{r.student_name}</td>
                      <td>{r.subject}</td>
                      <td>{r.teacher_name || r.requested_by}</td>
                      <td><span style={{ fontWeight: 700, color: 'var(--ska-error)' }}>{r.current_score}</span></td>
                      <td><span style={{ fontWeight: 700, color: 'var(--ska-green)' }}>{r.proposed_score}</span></td>
                      <td style={{ maxWidth: 200, fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{r.reason}</td>
                      <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: sb.bg, color: sb.color }}>{sb.label}</span></td>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', whiteSpace: 'nowrap' }}>
                        {r.created_at ? new Date(r.created_at).toLocaleDateString() : '—'}
                      </td>
                      <td>
                        {r.status === 'pending' && (
                          <button className="ska-btn ska-btn--primary ska-btn--sm" onClick={() => { setSelected(r); setReason(''); }}>
                            Review
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
      </div>

      {selected && (
        <Modal title={`Review Request #${selected.id}`} onClose={() => setSelected(null)}>
          <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}><label className="ska-label">Student</label><p style={{ margin: 0, fontWeight: 700 }}>{selected.student_name}</p></div>
              <div style={{ flex: 1 }}><label className="ska-label">Subject</label><p style={{ margin: 0 }}>{selected.subject}</p></div>
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ flex: 1 }}><label className="ska-label">Current Score</label>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: 'var(--ska-error)' }}>{selected.current_score}</p></div>
              <div style={{ flex: 1 }}><label className="ska-label">Proposed Score</label>
                <p style={{ margin: 0, fontWeight: 800, fontSize: '1.5rem', color: 'var(--ska-green)' }}>{selected.proposed_score}</p></div>
            </div>
            <div><label className="ska-label">Reason from Teacher</label>
              <div style={{ background: 'var(--ska-surface-low)', padding: '10px 14px', borderRadius: 8, fontSize: '0.875rem', color: 'var(--ska-text)' }}>{selected.reason || '—'}</div>
            </div>
            {selected.evidence_url && (
              <div>
                <label className="ska-label">Evidence File</label>
                <a
                  href={selected.evidence_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, background: 'var(--ska-surface-low)', color: 'var(--ska-primary)', fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
                >
                  <Ic name="attach_file" size="sm" /> View Attached Evidence
                </a>
              </div>
            )}
            <label className="ska-form-group">
              <span className="ska-label">Your Review Reason (optional)</span>
              <textarea className="ska-input" rows={3} value={reason} onChange={e => setReason(e.target.value)}
                placeholder="Add a note explaining your decision…" style={{ resize: 'vertical' }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="ska-btn ska-btn--primary" style={{ flex: 1 }} disabled={acting}
              onClick={() => handleReview('approve')}>
              <Ic name="check_circle" size="sm" /> {acting ? 'Processing…' : 'Approve'}
            </button>
            <button className="ska-btn" style={{ flex: 1, background: 'var(--ska-error-dim)', color: 'var(--ska-error)', border: 'none' }}
              disabled={acting} onClick={() => handleReview('reject')}>
              <Ic name="cancel" size="sm" /> Reject
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   2. GRADING SCHEME CONFIGURATION
   ============================================================ */
export function GradingSchemePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [banner, setBanner]   = useState(null);
  const [passMark, setPassMark] = useState(50);
  const [boundaries, setBoundaries] = useState([]);

  useEffect(() => {
    ApiClient.get('/api/school/grading-scheme/')
      .then(d => {
        setPassMark(d.scheme?.pass_mark ?? 50);
        setBoundaries(d.scheme?.boundaries ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateBoundary = (idx, field, val) => {
    setBoundaries(prev => prev.map((b, i) => i === idx ? { ...b, [field]: val } : b));
  };

  const addBoundary = () => {
    setBoundaries(prev => [...prev, { letter: '', min: 0, max: 0, color: '#6b7280', gpa: 0 }]);
  };

  const removeBoundary = (idx) => {
    setBoundaries(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    setSaving(true); setBanner(null);
    try {
      await ApiClient.post('/api/school/grading-scheme/', { pass_mark: passMark, boundaries });
      setBanner({ type: 'ok', text: 'Grading scheme saved.' });
    } catch (e) {
      setBanner({ type: 'err', text: e.message || 'Failed to save.' });
    }
    setSaving(false);
  };

  if (loading) return <div className="ska-content"><div className="ska-card"><div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div></div></div>;

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Grading Scheme</h1>
          <p className="ska-page-sub">Configure grade boundaries and pass mark for your school</p>
        </div>
        <button className="ska-btn ska-btn--primary" onClick={handleSave} disabled={saving}>
          <Ic name="save" size="sm" /> {saving ? 'Saving…' : 'Save Scheme'}
        </button>
      </div>

      <Banner msg={banner} />

      <div className="ska-split-grid">
        <div className="ska-card ska-card-pad">
          <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: '0.9375rem', fontWeight: 800 }}>Pass Mark</h3>
          <label className="ska-form-group">
            <span>Minimum score to pass (out of 100)</span>
            <input type="number" className="ska-input" min={0} max={100}
              value={passMark} onChange={e => setPassMark(Number(e.target.value))} />
          </label>
          <div style={{ marginTop: 16, padding: '14px', background: 'var(--ska-surface-low)', borderRadius: 10 }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
              Students scoring below <strong>{passMark}</strong> will be marked as <span style={{ color: 'var(--ska-error)', fontWeight: 700 }}>FAIL</span>
            </p>
          </div>
        </div>

        <div className="ska-card ska-card-pad">
          <h3 style={{ marginTop: 0, marginBottom: 4, fontSize: '0.9375rem', fontWeight: 800 }}>Preview</h3>
          <p style={{ marginBottom: 16, fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>How grades will appear on report cards</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {boundaries.map((b, i) => (
              <div key={i} style={{ padding: '6px 14px', borderRadius: 20, background: b.color + '22', border: `1px solid ${b.color}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontWeight: 800, color: b.color }}>{b.letter || '?'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{b.min}–{b.max}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ska-card ska-card-pad" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800 }}>Grade Boundaries</h3>
          <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={addBoundary}>
            <Ic name="add" size="sm" /> Add Grade
          </button>
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {boundaries.map((b, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr 1fr 60px 40px', gap: 10, alignItems: 'center', padding: '10px 14px', background: 'var(--ska-surface-low)', borderRadius: 10 }}>
              <label className="ska-form-group" style={{ margin: 0 }}>
                <span style={{ fontSize: '0.7rem' }}>Grade</span>
                <input className="ska-input" value={b.letter} onChange={e => updateBoundary(i, 'letter', e.target.value)} placeholder="A+" />
              </label>
              <label className="ska-form-group" style={{ margin: 0 }}>
                <span style={{ fontSize: '0.7rem' }}>Min %</span>
                <input type="number" className="ska-input" value={b.min} min={0} max={100} onChange={e => updateBoundary(i, 'min', Number(e.target.value))} />
              </label>
              <label className="ska-form-group" style={{ margin: 0 }}>
                <span style={{ fontSize: '0.7rem' }}>Max %</span>
                <input type="number" className="ska-input" value={b.max} min={0} max={100} onChange={e => updateBoundary(i, 'max', Number(e.target.value))} />
              </label>
              <label className="ska-form-group" style={{ margin: 0 }}>
                <span style={{ fontSize: '0.7rem' }}>Color</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="color" value={b.color || '#6b7280'} onChange={e => updateBoundary(i, 'color', e.target.value)}
                    style={{ width: 36, height: 36, border: 'none', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--ska-text-3)' }}>{b.color}</span>
                </div>
              </label>
              <label className="ska-form-group" style={{ margin: 0 }}>
                <span style={{ fontSize: '0.7rem' }}>GPA</span>
                <input type="number" className="ska-input" value={b.gpa ?? ''} step="0.1" min={0} max={4} onChange={e => updateBoundary(i, 'gpa', Number(e.target.value))} />
              </label>
              <button onClick={() => removeBoundary(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ska-error)', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end', marginBottom: 2 }}>
                <Ic name="delete" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   3. ACADEMIC CALENDAR — years + terms CRUD
   ============================================================ */
const POLL_MS = 30_000;

function fmtTime(d) {
  if (!d) return '—';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function AcademicCalendarPage() {
  const [years, setYears]         = useState([]);
  const [selYear, setSelYear]     = useState(null);
  const [terms, setTerms]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [syncing, setSyncing]     = useState(false);
  const [lastSync, setLastSync]   = useState(null);
  const [showYearForm, setShowYearForm] = useState(false);
  const [showTermForm, setShowTermForm] = useState(false);
  const [editingTerm, setEditingTerm] = useState(null);
  const [banner, setBanner]       = useState(null);
  const [saving, setSaving]       = useState(false);
  const [yearForm, setYearForm]   = useState({ name: '', start_date: '', end_date: '' });
  const [termForm, setTermForm]   = useState({ name: 'TERM1', start_date: '', end_date: '', grade_entry_open: false, grade_entry_deadline: '' });
  const selYearRef = useRef(null);
  const pollRef    = useRef(null);

  const fetchYears = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setSyncing(true);
    try {
      const d   = await ApiClient.get('/api/school/academic-years/');
      const yrs = d.academic_years || [];
      setYears(yrs);
      setLastSync(new Date());
      setSelYear(prev => {
        if (prev) return yrs.find(y => y.id === prev.id) || prev;
        return yrs.find(y => y.is_active) || yrs[0] || null;
      });
    } catch { /* silent — keep stale data */ }
    if (!silent) setLoading(false); else setSyncing(false);
  }, []);

  const fetchTerms = useCallback(async (yearId) => {
    if (!yearId) { setTerms([]); return; }
    try {
      const d = await ApiClient.get(`/api/school/terms/?academic_year_id=${yearId}`);
      setTerms(d.terms || []);
    } catch { /* keep stale */ }
  }, []);

  // Initial load
  useEffect(() => { fetchYears(false); }, [fetchYears]);

  // Fetch terms whenever selected year changes
  useEffect(() => {
    selYearRef.current = selYear;
    fetchTerms(selYear?.id);
  }, [selYear, fetchTerms]);

  // Polling — refresh years + terms every 30 s
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      setSyncing(true);
      try {
        const d   = await ApiClient.get('/api/school/academic-years/');
        const yrs = d.academic_years || [];
        setYears(yrs);
        setLastSync(new Date());
        const cur = selYearRef.current;
        if (cur) {
          const td = await ApiClient.get(`/api/school/terms/?academic_year_id=${cur.id}`);
          setTerms(td.terms || []);
        }
      } catch { /* ignore */ }
      setSyncing(false);
    }, POLL_MS);
    return () => clearInterval(pollRef.current);
  }, []);

  const handleAddYear = async () => {
    if (!yearForm.name) return;
    setSaving(true);
    try {
      await ApiClient.post('/api/school/academic-years/', yearForm);
      setBanner({ type: 'ok', text: 'Academic year created.' });
      setShowYearForm(false);
      setYearForm({ name: '', start_date: '', end_date: '' });
      await fetchYears(true);
    } catch (e) { setBanner({ type: 'err', text: e.message || 'Failed.' }); }
    setSaving(false);
  };

  const handleActivateYear = async (year) => {
    try {
      await ApiClient.put(`/api/school/academic-years/${year.id}/`, { is_active: true });
      await fetchYears(true);
    } catch (e) { setBanner({ type: 'err', text: e.message || 'Failed.' }); }
  };

  const handleSaveTerm = async () => {
    if (!selYear) return;
    setSaving(true);
    try {
      if (editingTerm) {
        await ApiClient.put(`/api/school/terms/${editingTerm.id}/`, { ...termForm });
        setBanner({ type: 'ok', text: 'Term updated.' });
      } else {
        await ApiClient.post('/api/school/terms/', { ...termForm, academic_year_id: selYear.id });
        setBanner({ type: 'ok', text: 'Term created.' });
      }
      setShowTermForm(false);
      setEditingTerm(null);
      setTermForm({ name: 'TERM1', start_date: '', end_date: '', grade_entry_open: false, grade_entry_deadline: '' });
      await fetchTerms(selYear.id);
    } catch (e) { setBanner({ type: 'err', text: e.message || 'Failed.' }); }
    setSaving(false);
  };

  const openEditTerm = (t) => {
    setEditingTerm(t);
    setTermForm({
      name: t.name, start_date: t.start_date || '', end_date: t.end_date || '',
      grade_entry_open: t.grade_entry_open || false,
      grade_entry_deadline: t.grade_entry_deadline ? t.grade_entry_deadline.substring(0, 16) : '',
    });
    setShowTermForm(true);
  };

  const handleDeleteTerm = async (termId) => {
    if (!window.confirm('Delete this term? This cannot be undone.')) return;
    try {
      await ApiClient.delete(`/api/school/terms/${termId}/`);
      setTerms(prev => prev.filter(t => t.id !== termId));
      setBanner({ type: 'ok', text: 'Term deleted.' });
    } catch (e) { setBanner({ type: 'err', text: e.message || 'Failed.' }); }
  };

  const STATUS_COLORS = { draft: 'var(--ska-text-3)', open: 'var(--ska-green)', closed: 'var(--ska-error)', archived: 'var(--ska-text-3)' };

  if (loading) return <div className="ska-content"><div className="ska-card"><div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div></div></div>;

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Academic Calendar</h1>
          <p className="ska-page-sub">Manage academic years, terms, and grade entry windows</p>
        </div>
        <button className="ska-btn ska-btn--primary" onClick={() => setShowYearForm(true)}>
          <Ic name="add" size="sm" /> New Academic Year
        </button>
      </div>

      <Banner msg={banner} />
      {/* Live sync bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', color: 'var(--ska-text-3)', marginBottom: 16 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: syncing ? 'var(--ska-tertiary)' : 'var(--ska-green)', display: 'inline-block', animation: syncing ? 'ska-pulse 1s infinite' : 'none' }} />
        {syncing ? 'Syncing…' : `Live · Last synced ${fmtTime(lastSync)}`}
        <button className="ska-btn ska-btn--ghost ska-btn--sm" style={{ marginLeft: 4, padding: '2px 8px' }} onClick={() => fetchYears(true)}>
          <Ic name="refresh" size="sm" />
        </button>
      </div>

      <div className="ska-split-grid">
        {/* Years list */}
        <div className="ska-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--ska-border)' }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800 }}>Academic Years</h3>
          </div>
          <div style={{ padding: 8 }}>
            {years.length === 0 ? <p style={{ padding: 16, color: 'var(--ska-text-3)', fontSize: '0.875rem' }}>No academic years yet.</p>
              : years.map(y => (
                <div key={y.id} onClick={() => setSelYear(y)} style={{
                  padding: '12px 14px', borderRadius: 10, cursor: 'pointer', marginBottom: 4,
                  background: selYear?.id === y.id ? 'var(--ska-primary-dim)' : 'transparent',
                  border: selYear?.id === y.id ? '1px solid var(--ska-primary)' : '1px solid transparent',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700, flex: 1 }}>{y.name}</span>
                    {y.is_active && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ska-green)', background: 'var(--ska-green-dim)', padding: '2px 8px', borderRadius: 20 }}>ACTIVE</span>}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', marginTop: 2 }}>
                    {y.start_date} → {y.end_date}
                  </div>
                  {!y.is_active && (
                    <button className="ska-btn ska-btn--ghost ska-btn--sm" style={{ marginTop: 6 }}
                      onClick={e => { e.stopPropagation(); handleActivateYear(y); }}>Set Active</button>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Terms */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 800 }}>
              Terms {selYear ? `— ${selYear.name}` : ''}
            </h3>
            {selYear && (
              <button className="ska-btn ska-btn--primary ska-btn--sm" onClick={() => { setShowTermForm(true); setEditingTerm(null); setTermForm({ name: 'TERM1', start_date: '', end_date: '', grade_entry_open: false, grade_entry_deadline: '' }); }}>
                <Ic name="add" size="sm" /> Add Term
              </button>
            )}
          </div>
          {!selYear ? <div className="ska-card ska-card-pad" style={{ color: 'var(--ska-text-3)', textAlign: 'center' }}>Select an academic year to manage its terms.</div>
            : terms.length === 0 ? <div className="ska-card ska-card-pad" style={{ color: 'var(--ska-text-3)', textAlign: 'center' }}>No terms yet for this year.</div>
            : terms.map(t => (
              <div key={t.id} className="ska-card ska-card-pad" style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 800 }}>{t.name_display || t.name}</span>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: STATUS_COLORS[t.status] || 'var(--ska-text-3)', background: 'var(--ska-surface-low)', padding: '2px 8px', borderRadius: 20 }}>
                        {t.status?.toUpperCase() || 'DRAFT'}
                      </span>
                      {t.is_active && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--ska-green)', background: 'var(--ska-green-dim)', padding: '2px 8px', borderRadius: 20 }}>CURRENT</span>}
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{t.start_date} → {t.end_date}</p>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: '0.8125rem' }}>
                      <span style={{ color: t.grade_entry_open ? 'var(--ska-green)' : 'var(--ska-text-3)' }}>
                        <Ic name={t.grade_entry_open ? 'lock_open' : 'lock'} size="sm" />
                        Grade entry: {t.grade_entry_open ? 'Open' : 'Closed'}
                      </span>
                      {t.grade_entry_deadline && <span style={{ color: 'var(--ska-text-3)' }}>· Deadline: {new Date(t.grade_entry_deadline).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => openEditTerm(t)}>
                      <Ic name="edit" size="sm" />
                    </button>
                    <button className="ska-btn ska-btn--sm" style={{ background: 'var(--ska-error-dim)', color: 'var(--ska-error)', border: 'none' }}
                      onClick={() => handleDeleteTerm(t.id)}>
                      <Ic name="delete" size="sm" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Add Academic Year Modal */}
      {showYearForm && (
        <Modal title="New Academic Year" onClose={() => setShowYearForm(false)}>
          <div style={{ display: 'grid', gap: 12 }}>
            <label className="ska-form-group"><span>Year Name (e.g. 2025–2026)</span>
              <input className="ska-input" value={yearForm.name} onChange={e => setYearForm(f => ({ ...f, name: e.target.value }))} placeholder="2025-2026" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="ska-form-group"><span>Start Date</span>
                <input type="date" className="ska-input" value={yearForm.start_date} onChange={e => setYearForm(f => ({ ...f, start_date: e.target.value }))} />
              </label>
              <label className="ska-form-group"><span>End Date</span>
                <input type="date" className="ska-input" value={yearForm.end_date} onChange={e => setYearForm(f => ({ ...f, end_date: e.target.value }))} />
              </label>
            </div>
            <button className="ska-btn ska-btn--primary" disabled={saving || !yearForm.name} onClick={handleAddYear}>
              {saving ? 'Creating…' : 'Create Academic Year'}
            </button>
          </div>
        </Modal>
      )}

      {/* Add/Edit Term Modal */}
      {showTermForm && (
        <Modal title={editingTerm ? 'Edit Term' : 'Add Term'} onClose={() => { setShowTermForm(false); setEditingTerm(null); }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <label className="ska-form-group"><span>Term</span>
              <select className="ska-input" value={termForm.name} onChange={e => setTermForm(f => ({ ...f, name: e.target.value }))}>
                <option value="TERM1">Term 1</option>
                <option value="TERM2">Term 2</option>
                <option value="TERM3">Term 3</option>
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="ska-form-group"><span>Start Date</span>
                <input type="date" className="ska-input" value={termForm.start_date} onChange={e => setTermForm(f => ({ ...f, start_date: e.target.value }))} />
              </label>
              <label className="ska-form-group"><span>End Date</span>
                <input type="date" className="ska-input" value={termForm.end_date} onChange={e => setTermForm(f => ({ ...f, end_date: e.target.value }))} />
              </label>
            </div>
            <label className="ska-form-group"><span>Grade Entry Deadline</span>
              <input type="datetime-local" className="ska-input" value={termForm.grade_entry_deadline} onChange={e => setTermForm(f => ({ ...f, grade_entry_deadline: e.target.value }))} />
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="checkbox" checked={termForm.grade_entry_open} onChange={e => setTermForm(f => ({ ...f, grade_entry_open: e.target.checked }))} style={{ accentColor: 'var(--ska-primary)' }} />
              <span style={{ fontSize: '0.875rem', color: 'var(--ska-text)' }}>Grade entry is open for teachers</span>
            </label>
            <button className="ska-btn ska-btn--primary" disabled={saving} onClick={handleSaveTerm}>
              {saving ? 'Saving…' : editingTerm ? 'Update Term' : 'Create Term'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   4. SECURITY PAGE (ENHANCED) — date filter + CSV export
   ============================================================ */
export function SecurityPageEnhanced() {
  const [logs, setLogs]           = useState([]);
  const [counters, setCounters]   = useState({});
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [sevFilter, setSevFilter] = useState('');
  const [dateFrom, setDateFrom]   = useState('');
  const [dateTo, setDateTo]       = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logsData, ctrs] = await Promise.all([
        ApiClient.get('/api/security-logs/?limit=500'),
        ApiClient.get('/api/security-counters/'),
      ]);
      setLogs(logsData.logs || []);
      setCounters(ctrs);
    } catch { setLogs([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const SEV_STYLE = {
    critical: { bg: 'var(--ska-error-dim)', color: 'var(--ska-error)' },
    high:     { bg: 'var(--ska-tertiary-dim)', color: 'var(--ska-tertiary)' },
    medium:   { bg: 'var(--ska-primary-dim)', color: 'var(--ska-primary)' },
    low:      { bg: 'var(--ska-surface-high)', color: 'var(--ska-text-3)' },
    info:     { bg: 'var(--ska-surface-high)', color: 'var(--ska-text-3)' },
  };

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    if (q && !l.actor?.toLowerCase().includes(q) && !l.action?.toLowerCase().includes(q) && !l.type?.toLowerCase().includes(q)) return false;
    if (sevFilter && l.severity !== sevFilter) return false;
    if (dateFrom && l.ts < dateFrom) return false;
    if (dateTo && l.ts > dateTo + 'T23:59:59') return false;
    return true;
  });

  const exportCSV = () => {
    const header = 'Timestamp,Actor,Event,Type,Severity,IP,Status';
    const rows = filtered.map(l =>
      [l.ts, l.actor, `"${(l.action || '').replace(/"/g, '""')}"`, l.type, l.severity, l.ip, l.status].join(',')
    );
    const blob = new Blob([header + '\n' + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `security-logs-${new Date().toISOString().slice(0,10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const fmtTs = ts => { try { return new Date(ts).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch { return ts; } };

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Security Logs</h1>
          <p className="ska-page-sub">Audit trail — system security events</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="ska-btn ska-btn--ghost" onClick={exportCSV} disabled={filtered.length === 0}>
            <Ic name="download" size="sm" /> Export CSV
          </button>
          <button className="ska-btn ska-btn--ghost" onClick={load}><Ic name="refresh" size="sm" /> Refresh</button>
        </div>
      </div>

      <div className="ska-stat-grid-4">
        {[
          { icon: 'shield', bg: 'var(--ska-primary-dim)', color: 'var(--ska-primary)', label: 'Total Events', value: (counters.total_log_entries || 0).toLocaleString() },
          { icon: 'block', bg: 'var(--ska-error-dim)', color: 'var(--ska-error)', label: 'Threats (24h)', value: counters.threats_blocked || 0 },
          { icon: 'manage_accounts', bg: 'var(--ska-secondary-dim)', color: 'var(--ska-secondary)', label: 'Active Sessions', value: counters.active_sessions || 0 },
          { icon: 'check_circle', bg: 'var(--ska-green-dim)', color: 'var(--ska-green)', label: 'Logins (24h)', value: counters.successful_logins_24h || 0 },
        ].map(c => (
          <div key={c.label} className="ska-card ska-card-pad" style={{ flex: 1, minWidth: 0 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
              <Ic name={c.icon} style={{ color: c.color, fontSize: 22 }} />
            </div>
            <div style={{ fontSize: '1.875rem', fontWeight: 800 }}>{c.value}</div>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="ska-card ska-card-pad" style={{ marginBottom: 20, marginTop: 20 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="ska-search ska-toolbar-search" style={{ flex: '2 1 200px', marginBottom: 0 }}>
            <Ic name="search" />
            <input className="ska-search-input" placeholder="Search actor, action, type…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <label className="ska-form-group" style={{ margin: 0, flex: '1 1 140px' }}>
            <span style={{ fontSize: '0.75rem' }}>Severity</span>
            <select className="ska-input" value={sevFilter} onChange={e => setSevFilter(e.target.value)}>
              <option value="">All</option>
              {['critical','high','medium','low','info'].map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </label>
          <label className="ska-form-group" style={{ margin: 0, flex: '1 1 140px' }}>
            <span style={{ fontSize: '0.75rem' }}>From date</span>
            <input type="date" className="ska-input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </label>
          <label className="ska-form-group" style={{ margin: 0, flex: '1 1 140px' }}>
            <span style={{ fontSize: '0.75rem' }}>To date</span>
            <input type="date" className="ska-input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </label>
          {(search || sevFilter || dateFrom || dateTo) && (
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => { setSearch(''); setSevFilter(''); setDateFrom(''); setDateTo(''); }}>
              <Ic name="filter_alt_off" size="sm" /> Clear
            </button>
          )}
          <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', whiteSpace: 'nowrap', alignSelf: 'center' }}>{filtered.length} / {logs.length}</span>
        </div>
      </div>

      <div className="ska-card" style={{ overflowX: 'auto' }}>
        {loading ? <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
          : filtered.length === 0 ? (
            <div className="ska-empty">
              <Ic name="security" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
              <p className="ska-empty-title">{logs.length === 0 ? 'No events yet' : 'No results'}</p>
              <p className="ska-empty-desc">{logs.length === 0 ? 'Events appear here as users interact with the system.' : 'Adjust your filters.'}</p>
            </div>
          ) : (
            <table className="ska-table">
              <thead><tr><th>Timestamp</th><th>Actor</th><th>Event</th><th>Severity</th><th>IP</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map(l => {
                  const sev = SEV_STYLE[l.severity] || SEV_STYLE.info;
                  return (
                    <tr key={l.id}>
                      <td style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', whiteSpace: 'nowrap' }}>{fmtTs(l.ts)}</td>
                      <td style={{ fontWeight: 600 }}>{l.actor}</td>
                      <td style={{ maxWidth: 280 }}>
                        <p style={{ margin: 0, fontSize: '0.875rem' }}>{l.action}</p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{l.type?.replace(/_/g, ' ')}</p>
                      </td>
                      <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: sev.bg, color: sev.color }}>{l.severity}</span></td>
                      <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{l.ip}</td>
                      <td><span className={`ska-badge ${l.status === 'Allowed' ? 'ska-badge--green' : l.status === 'Blocked' ? 'ska-badge--error' : 'ska-badge--pending'}`}>{l.status}</span></td>
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
   5. GRADE ENTRY OVERSIGHT
   ============================================================ */
export function GradeOversightPage() {
  const [terms, setTerms]       = useState([]);
  const [selTerm, setSelTerm]   = useState('');
  const [rows, setRows]         = useState([]);
  const [summary, setSummary]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const [search, setSearch]     = useState('');

  useEffect(() => {
    ApiClient.get('/api/school/terms/').then(d => {
      const ts = d.terms || [];
      setTerms(ts);
      const active = ts.find(t => t.is_active);
      if (active) setSelTerm(String(active.id));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selTerm) return;
    setLoading(true);
    ApiClient.get(`/api/school/grade-entry-status/?term_id=${selTerm}`)
      .then(d => { setRows(d.rows || []); setSummary(d.summary); })
      .catch(() => { setRows([]); setSummary(null); })
      .finally(() => setLoading(false));
  }, [selTerm]);

  const filtered = rows.filter(r => {
    const q = search.toLowerCase();
    return !q || r.teacher_name.toLowerCase().includes(q) || r.subject.toLowerCase().includes(q) || r.classroom.toLowerCase().includes(q);
  });

  const pct = (r) => r.total_students ? Math.round(r.submitted / r.total_students * 100) : 0;

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Grade Entry Oversight</h1>
          <p className="ska-page-sub">Track teacher submission status per class and subject</p>
        </div>
      </div>

      {summary && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Assignments', value: summary.total, icon: 'assignment', color: 'var(--ska-primary)' },
            { label: 'Complete', value: summary.complete, icon: 'check_circle', color: 'var(--ska-green)' },
            { label: 'Pending', value: summary.pending, icon: 'pending', color: 'var(--ska-tertiary)' },
          ].map(s => (
            <div key={s.label} className="ska-card ska-card-pad" style={{ flex: '1 1 160px' }}>
              <Ic name={s.icon} style={{ color: s.color, fontSize: 24 }} />
              <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8 }}>{s.value}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div className="ska-card ska-card-pad" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label className="ska-form-group" style={{ margin: 0, flex: '1 1 200px' }}>
          <span>Term</span>
          <select className="ska-input" value={selTerm} onChange={e => setSelTerm(e.target.value)}>
            <option value="">— Select term —</option>
            {terms.map(t => <option key={t.id} value={t.id}>{t.display_name || t.name}</option>)}
          </select>
        </label>
        <div className="ska-search" style={{ flex: '2 1 200px', margin: 0 }}>
          <Ic name="search" />
          <input className="ska-search-input" placeholder="Search teacher, subject, class…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="ska-card" style={{ overflowX: 'auto' }}>
        {loading ? <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
          : !selTerm ? <div className="ska-empty"><p className="ska-empty-desc">Select a term to view submission status.</p></div>
          : filtered.length === 0 ? <div className="ska-empty"><p className="ska-empty-desc">No assignments found for this term.</p></div>
          : (
            <table className="ska-table">
              <thead><tr><th>Teacher</th><th>Subject</th><th>Class</th><th>Progress</th><th>Submitted</th><th>Locked</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((r, i) => {
                  const p = pct(r);
                  return (
                    <tr key={i}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{r.teacher_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{r.employee_id}</div>
                      </td>
                      <td>{r.subject}</td>
                      <td>{r.classroom}</td>
                      <td style={{ minWidth: 120 }}>
                        <div style={{ background: 'var(--ska-surface-low)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                          <div style={{ width: `${p}%`, height: '100%', background: r.complete ? 'var(--ska-green)' : p > 50 ? 'var(--ska-primary)' : 'var(--ska-tertiary)', transition: 'width .3s' }} />
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)', marginTop: 2 }}>{p}%</div>
                      </td>
                      <td>{r.submitted} / {r.total_students}</td>
                      <td>{r.locked}</td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                          background: r.complete ? 'var(--ska-green-dim)' : 'var(--ska-tertiary-dim)',
                          color: r.complete ? 'var(--ska-green)' : 'var(--ska-tertiary)' }}>
                          {r.complete ? 'Complete' : 'Pending'}
                        </span>
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
   6. ROOM CONFIGURATION
   ============================================================ */
const ROOM_TYPE_LABELS = { classroom: 'Classroom', laboratory: 'Laboratory', library: 'Library', hall: 'Assembly Hall', gymnasium: 'Gymnasium', other: 'Other' };
const ROOM_TYPE_ICONS  = { classroom: 'class', laboratory: 'science', library: 'local_library', hall: 'stadium', gymnasium: 'fitness_center', other: 'room' };

export function RoomsPage() {
  const [rooms, setRooms]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRoom, setEditRoom] = useState(null);
  const [banner, setBanner]   = useState(null);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({ name: '', code: '', room_type: 'classroom', capacity: 30, notes: '' });

  const load = useCallback(() => {
    setLoading(true);
    ApiClient.get('/api/school/rooms/').then(d => setRooms(d.rooms || [])).catch(() => setRooms([])).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditRoom(null); setForm({ name: '', code: '', room_type: 'classroom', capacity: 30, notes: '' }); setShowForm(true); };
  const openEdit = (r) => { setEditRoom(r); setForm({ name: r.name, code: r.code, room_type: r.room_type, capacity: r.capacity, notes: r.notes || '' }); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editRoom) {
        await ApiClient.put(`/api/school/rooms/${editRoom.id}/`, form);
        setBanner({ type: 'ok', text: 'Room updated.' });
      } else {
        await ApiClient.post('/api/school/rooms/', form);
        setBanner({ type: 'ok', text: 'Room created.' });
      }
      setShowForm(false); setEditRoom(null);
      load();
    } catch (e) { setBanner({ type: 'err', text: e.message || 'Failed.' }); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this room?')) return;
    try {
      await ApiClient.delete(`/api/school/rooms/${id}/`);
      setRooms(prev => prev.filter(r => r.id !== id));
      setBanner({ type: 'ok', text: 'Room deleted.' });
    } catch (e) { setBanner({ type: 'err', text: e.message || 'Failed.' }); }
  };

  const handleToggle = async (room) => {
    try {
      await ApiClient.put(`/api/school/rooms/${room.id}/`, { is_active: !room.is_active });
      load();
    } catch (e) { setBanner({ type: 'err', text: e.message || 'Failed.' }); }
  };

  const grouped = rooms.reduce((acc, r) => { (acc[r.room_type] = acc[r.room_type] || []).push(r); return acc; }, {});

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Room Configuration</h1>
          <p className="ska-page-sub">Manage physical spaces for timetabling and allocation</p>
        </div>
        <button className="ska-btn ska-btn--primary" onClick={openAdd}><Ic name="add" size="sm" /> Add Room</button>
      </div>

      <Banner msg={banner} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12, marginBottom: 20 }}>
        {Object.entries(ROOM_TYPE_LABELS).map(([type, label]) => {
          const count = (grouped[type] || []).length;
          return (
            <div key={type} className="ska-card ska-card-pad">
              <Ic name={ROOM_TYPE_ICONS[type]} style={{ color: 'var(--ska-primary)', fontSize: 24 }} />
              <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: 8 }}>{count}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{label}</div>
            </div>
          );
        })}
      </div>

      {loading ? <div className="ska-card ska-card-pad"><div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div></div>
        : rooms.length === 0 ? (
          <div className="ska-card ska-card-pad" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Ic name="meeting_room" style={{ fontSize: 48, color: 'var(--ska-text-3)' }} />
            <p style={{ marginTop: 12, color: 'var(--ska-text-3)' }}>No rooms configured yet. Add rooms to enable timetable constraints.</p>
            <button className="ska-btn ska-btn--primary" style={{ marginTop: 12 }} onClick={openAdd}>Add first room</button>
          </div>
        ) : (
          <div className="ska-card" style={{ overflowX: 'auto' }}>
            <table className="ska-table">
              <thead><tr><th>Room</th><th>Type</th><th>Capacity</th><th>Code</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {rooms.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.name}</div>
                      {r.notes && <div style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{r.notes}</div>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Ic name={ROOM_TYPE_ICONS[r.room_type] || 'room'} size="sm" style={{ color: 'var(--ska-primary)' }} />
                        {ROOM_TYPE_LABELS[r.room_type] || r.room_type}
                      </div>
                    </td>
                    <td>{r.capacity}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{r.code || '—'}</td>
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700,
                        background: r.is_active ? 'var(--ska-green-dim)' : 'var(--ska-surface-high)',
                        color: r.is_active ? 'var(--ska-green)' : 'var(--ska-text-3)' }}>
                        {r.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => openEdit(r)}><Ic name="edit" size="sm" /></button>
                        <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => handleToggle(r)}><Ic name={r.is_active ? 'toggle_on' : 'toggle_off'} size="sm" /></button>
                        <button className="ska-btn ska-btn--sm" style={{ background: 'var(--ska-error-dim)', color: 'var(--ska-error)', border: 'none' }} onClick={() => handleDelete(r.id)}><Ic name="delete" size="sm" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      {showForm && (
        <Modal title={editRoom ? 'Edit Room' : 'Add Room'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} style={{ display: 'grid', gap: 12 }}>
            <label className="ska-form-group"><span>Room Name *</span>
              <input className="ska-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Room 101" />
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <label className="ska-form-group"><span>Code</span>
                <input className="ska-input" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="e.g. R101" />
              </label>
              <label className="ska-form-group"><span>Capacity</span>
                <input type="number" className="ska-input" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
              </label>
            </div>
            <label className="ska-form-group"><span>Room Type</span>
              <select className="ska-input" value={form.room_type} onChange={e => setForm(f => ({ ...f, room_type: e.target.value }))}>
                {Object.entries(ROOM_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label className="ska-form-group"><span>Notes</span>
              <textarea className="ska-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes about this room" style={{ resize: 'vertical' }} />
            </label>
            <button type="submit" className="ska-btn ska-btn--primary" disabled={saving || !form.name.trim()}>
              {saving ? 'Saving…' : editRoom ? 'Update Room' : 'Create Room'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   7. EXAMINATION OFFICER ASSIGNMENT
   ============================================================ */
export function ExamOfficersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [acting, setActing]     = useState(null);
  const [banner, setBanner]     = useState(null);
  const [search, setSearch]     = useState('');

  const load = useCallback(() => {
    setLoading(true);
    ApiClient.get('/api/school/exam-officers/')
      .then(d => setTeachers(d.teachers || []))
      .catch(() => setTeachers([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (teacher) => {
    setActing(teacher.id);
    try {
      await ApiClient.post('/api/school/exam-officers/', { teacher_id: teacher.id, assign: !teacher.is_examination_officer });
      setBanner({ type: 'ok', text: `${teacher.name} ${!teacher.is_examination_officer ? 'assigned as' : 'removed from'} Examination Officer.` });
      load();
    } catch (e) { setBanner({ type: 'err', text: e.message || 'Failed.' }); }
    setActing(null);
  };

  const filtered = teachers.filter(t => !search || t.name?.toLowerCase().includes(search.toLowerCase()) || (t.employee_id || '').toLowerCase().includes(search.toLowerCase()));
  const officers = filtered.filter(t => t.is_examination_officer);
  const others   = filtered.filter(t => !t.is_examination_officer);

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Examination Officers</h1>
          <p className="ska-page-sub">Assign teachers the Examination Officer role to allow report card generation</p>
        </div>
      </div>

      <Banner msg={banner} />

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div className="ska-card ska-card-pad" style={{ flex: '1 1 160px' }}>
          <Ic name="verified_user" style={{ color: 'var(--ska-green)', fontSize: 24 }} />
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8 }}>{teachers.filter(t => t.is_examination_officer).length}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>Exam Officers</div>
        </div>
        <div className="ska-card ska-card-pad" style={{ flex: '1 1 160px' }}>
          <Ic name="school" style={{ color: 'var(--ska-primary)', fontSize: 24 }} />
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: 8 }}>{teachers.length}</div>
          <div style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>Total Teachers</div>
        </div>
      </div>

      <div className="ska-search" style={{ marginBottom: 16 }}>
        <Ic name="search" />
        <input className="ska-search-input" placeholder="Search teachers…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {officers.length > 0 && (
        <>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: 10, color: 'var(--ska-green)' }}>
            <Ic name="verified_user" size="sm" /> Current Examination Officers
          </h3>
          <div style={{ display: 'grid', gap: 8, marginBottom: 20 }}>
            {officers.map(t => (
              <div key={t.id} className="ska-card ska-card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12, borderLeft: '3px solid var(--ska-green)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--ska-green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--ska-green)', flexShrink: 0 }}>
                  {t.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{t.employee_id} · {t.email}</div>
                </div>
                <button className="ska-btn ska-btn--sm" style={{ background: 'var(--ska-error-dim)', color: 'var(--ska-error)', border: 'none' }}
                  disabled={acting === t.id} onClick={() => toggle(t)}>
                  {acting === t.id ? '…' : 'Remove Role'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 style={{ fontSize: '0.875rem', fontWeight: 800, marginBottom: 10, color: 'var(--ska-text-3)' }}>All Teachers</h3>
      {loading ? <div className="ska-card ska-card-pad"><p style={{ color: 'var(--ska-text-3)' }}>Loading…</p></div>
        : others.length === 0 && officers.length === 0 ? <div className="ska-card ska-card-pad" style={{ color: 'var(--ska-text-3)', textAlign: 'center' }}>No teachers found.</div>
        : (
          <div style={{ display: 'grid', gap: 8 }}>
            {others.map(t => (
              <div key={t.id} className="ska-card ska-card-pad" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--ska-surface-low)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--ska-text-3)', flexShrink: 0 }}>
                  {t.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>{t.employee_id} · {t.email}</div>
                </div>
                <button className="ska-btn ska-btn--primary ska-btn--sm" disabled={acting === t.id} onClick={() => toggle(t)}>
                  {acting === t.id ? '…' : 'Assign Role'}
                </button>
              </div>
            ))}
          </div>
        )}
    </div>
  );
}

/* ============================================================
   8. TEACHER ↔ CLASS/SUBJECT ASSIGNMENTS
   ============================================================ */
export function TeacherAssignmentsPage() {
  const [teachers, setTeachers] = useState([]);
  const [classes, setClasses]   = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [banner, setBanner]     = useState(null);
  const [form, setForm]         = useState({ teacher_id: '', class_id: '', subject_id: '' });
  const [filterTeacher, setFilterTeacher] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      ApiClient.get('/api/school/teachers/').then(d => setTeachers(d.teachers || [])).catch(() => {}),
      ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes || [])).catch(() => {}),
      ApiClient.get('/api/school/subjects/').then(d => setSubjects(d.subjects || [])).catch(() => {}),
    ])
      .then(() => ApiClient.get('/api/school/teacher-assignments/').then(d => setAssignments(d.assignments || [])).catch(() => {}))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!form.teacher_id || !form.class_id || !form.subject_id) return;
    setSaving(true);
    try {
      await ApiClient.post('/api/school/teacher-assignments/', form);
      setBanner({ type: 'ok', text: 'Assignment created.' });
      setShowForm(false);
      setForm({ teacher_id: '', class_id: '', subject_id: '' });
      const d = await ApiClient.get('/api/school/teacher-assignments/');
      setAssignments(d.assignments || []);
    } catch (e) { setBanner({ type: 'err', text: e.message || 'Failed.' }); }
    setSaving(false);
  };

  const handleRemove = async (assignmentId) => {
    if (!window.confirm('Remove this assignment?')) return;
    try {
      await ApiClient.delete(`/api/school/teacher-assignments/${assignmentId}/`);
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      setBanner({ type: 'ok', text: 'Assignment removed.' });
    } catch (e) { setBanner({ type: 'err', text: e.message || 'Failed.' }); }
  };

  const filtered = filterTeacher ? assignments.filter(a => String(a.teacher_id) === String(filterTeacher)) : assignments;

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Teacher Assignments</h1>
          <p className="ska-page-sub">Assign teachers to class–subject combinations for the current term</p>
        </div>
        <button className="ska-btn ska-btn--primary" onClick={() => setShowForm(true)}>
          <Ic name="add" size="sm" /> New Assignment
        </button>
      </div>

      <Banner msg={banner} />

      <div className="ska-card ska-card-pad" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label className="ska-form-group" style={{ margin: 0, flex: '1 1 200px' }}>
          <span>Filter by teacher</span>
          <select className="ska-input" value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}>
            <option value="">All teachers</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </label>
        <div style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)', alignSelf: 'center' }}>{filtered.length} assignment{filtered.length !== 1 ? 's' : ''}</div>
      </div>

      <div className="ska-card" style={{ overflowX: 'auto' }}>
        {loading ? <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
          : filtered.length === 0 ? (
            <div className="ska-empty">
              <Ic name="assignment_ind" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
              <p className="ska-empty-title">No assignments yet</p>
              <p className="ska-empty-desc">Assign teachers to classes and subjects to enable grade entry and timetabling.</p>
            </div>
          ) : (
            <table className="ska-table">
              <thead><tr><th>Teacher</th><th>Subject</th><th>Class</th><th>Students</th><th></th></tr></thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td style={{ fontWeight: 600 }}>{a.teacher_name || a.teacher}</td>
                    <td>{a.subject_name || a.subject}</td>
                    <td>{a.class_name || a.classroom}</td>
                    <td>{a.student_count ?? '—'}</td>
                    <td>
                      <button className="ska-btn ska-btn--sm" style={{ background: 'var(--ska-error-dim)', color: 'var(--ska-error)', border: 'none' }}
                        onClick={() => handleRemove(a.id)}>
                        <Ic name="delete" size="sm" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {showForm && (
        <Modal title="New Teacher Assignment" onClose={() => setShowForm(false)}>
          <form onSubmit={handleAssign} style={{ display: 'grid', gap: 12 }}>
            <label className="ska-form-group">
              <span>Teacher *</span>
              <select className="ska-input" required value={form.teacher_id} onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))}>
                <option value="">— Select teacher —</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </label>
            <label className="ska-form-group">
              <span>Class *</span>
              <select className="ska-input" required value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
                <option value="">— Select class —</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className="ska-form-group">
              <span>Subject *</span>
              <select className="ska-input" required value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}>
                <option value="">— Select subject —</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <button type="submit" className="ska-btn ska-btn--primary" disabled={saving || !form.teacher_id || !form.class_id || !form.subject_id}>
              {saving ? 'Assigning…' : 'Create Assignment'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

/* ============================================================
   9. STUDENT PROMOTION / TRANSFER
   ============================================================ */
export function StudentPromotionPage() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [promoting, setPromoting] = useState(null);
  const [destClass, setDestClass] = useState('');
  const [saving, setSaving]     = useState(false);
  const [banner, setBanner]     = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      ApiClient.get('/api/school/students/').then(d => setStudents(d.students || [])).catch(() => {}),
      ApiClient.get('/api/school/classes/').then(d => setClasses(d.classes || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchQ = !q || s.full_name?.toLowerCase().includes(q) || s.admission_number?.toLowerCase().includes(q);
    const matchC = !filterClass || String(s.classroom_id) === String(filterClass);
    return matchQ && matchC;
  });

  const openPromote = (student) => {
    setPromoting(student);
    setDestClass('');
  };

  const handlePromote = async () => {
    if (!promoting || !destClass) return;
    const dest = classes.find(c => String(c.id) === String(destClass));
    setSaving(true);
    try {
      await ApiClient.post(`/api/school/students/${promoting.id}/promote/`, { classroom_id: destClass });
      setBanner({ type: 'ok', text: `${promoting.full_name} moved to ${dest?.name}.` });
      setStudents(prev => prev.map(s => s.id === promoting.id ? { ...s, classroom: dest?.name, classroom_id: dest?.id } : s));
      setPromoting(null);
    } catch (e) { setBanner({ type: 'err', text: e.message || 'Promotion failed.' }); }
    setSaving(false);
  };

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Student Promotion</h1>
          <p className="ska-page-sub">Move students between classes while preserving existing grades</p>
        </div>
      </div>

      <Banner msg={banner} />

      <div className="ska-card ska-card-pad" style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="ska-search" style={{ flex: '2 1 200px', margin: 0 }}>
          <Ic name="search" />
          <input className="ska-search-input" placeholder="Search by name or admission number…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <label className="ska-form-group" style={{ margin: 0, flex: '1 1 180px' }}>
          <span>Filter by class</span>
          <select className="ska-input" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>

      <div className="ska-card" style={{ overflowX: 'auto' }}>
        {loading ? <div className="ska-empty"><p className="ska-empty-desc">Loading…</p></div>
          : filtered.length === 0 ? <div className="ska-empty"><p className="ska-empty-desc">No students found.</p></div>
          : (
            <table className="ska-table">
              <thead><tr><th>#</th><th>Student</th><th>Current Class</th><th>Admission No.</th><th>Action</th></tr></thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id}>
                    <td style={{ color: 'var(--ska-text-3)', fontSize: '0.8125rem' }}>{i + 1}</td>
                    <td style={{ fontWeight: 700 }}>{s.full_name}</td>
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 700, background: 'var(--ska-primary-dim)', color: 'var(--ska-primary)' }}>
                        {s.classroom || '—'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{s.admission_number}</td>
                    <td>
                      <button className="ska-btn ska-btn--primary ska-btn--sm" onClick={() => openPromote(s)}>
                        <Ic name="move_up" size="sm" /> Transfer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>

      {promoting && (
        <Modal title={`Transfer: ${promoting.full_name}`} onClose={() => setPromoting(null)}>
          <div style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--ska-surface-low)', borderRadius: 8 }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--ska-text-3)' }}>Current class</p>
            <p style={{ margin: '4px 0 0', fontWeight: 700, color: 'var(--ska-primary)' }}>{promoting.classroom || '—'}</p>
          </div>
          <label className="ska-form-group" style={{ marginBottom: 20 }}>
            <span>Move to class *</span>
            <select className="ska-input" value={destClass} onChange={e => setDestClass(e.target.value)}>
              <option value="">— Select destination class —</option>
              {classes.filter(c => String(c.id) !== String(promoting.classroom_id)).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <div style={{ padding: '10px 14px', background: 'var(--ska-tertiary-dim)', borderRadius: 8, marginBottom: 16, fontSize: '0.8125rem', color: 'var(--ska-tertiary)' }}>
            <Ic name="info" size="sm" /> Existing grades for this student are preserved. Only the class assignment changes.
          </div>
          <button className="ska-btn ska-btn--primary" style={{ width: '100%' }}
            disabled={!destClass || saving} onClick={handlePromote}>
            <Ic name="move_up" size="sm" /> {saving ? 'Moving…' : 'Confirm Transfer'}
          </button>
        </Modal>
      )}
    </div>
  );
}
