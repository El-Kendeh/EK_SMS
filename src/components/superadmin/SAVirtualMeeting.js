import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './SAVirtualMeeting.css';

/* ------------------------------------------------------------------ */
/*  SAVirtualMeeting — schedule & manage video meetings per audience    */
/*    audience: 'parents' | 'staffs' | 'students'                       */
/*  Superadmin sees all schools (with a school selector); school admin  */
/*  is pinned to their own school by the backend.                       */
/* ------------------------------------------------------------------ */

const API = (process.env.REACT_APP_NODE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const token = () => { try { return localStorage.getItem('token') || ''; } catch { return ''; } };
function getCurrentUser() { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } }

async function req(method, path, body) {
  const headers = { Authorization: `Bearer ${token()}` };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(`${API}${path}`, opts);
  let d = null;
  try { d = await r.json(); } catch { /* non-json */ }
  if (!r.ok || d?.success === false) throw new Error(d?.message || `HTTP ${r.status}`);
  return d || {};
}

const AUDIENCE_META = {
  parents:  { label: 'Parents',  noun: 'Parent–Teacher Meeting', accent: 'blue' },
  staffs:   { label: 'Staff',    noun: 'Staff Meeting',          accent: 'violet' },
  students: { label: 'Students', noun: 'Student Assembly',        accent: 'green' },
};

const IcPlus    = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcEdit    = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcTrash   = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>;
const IcVideo   = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
const IcClock   = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcUser    = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcWarn    = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcCheck   = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcLink    = () => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;

function fmtWhen(iso) {
  if (!iso) return 'Not scheduled';
  try {
    return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}

export default function SAVirtualMeeting({ audience = 'parents' }) {
  const meta = AUDIENCE_META[audience] || AUDIENCE_META.parents;
  const isSuper = getCurrentUser()?.role === 'superadmin';

  const [list, setList]       = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [toast, setToast]     = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const showToast = useCallback((msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await req('GET', `/api/virtual-meetings/?audience=${audience}`);
      setList(d.meetings || []);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }, [audience]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!isSuper) return;
    req('GET', '/api/schools/').then(d => setSchools((d.schools || []).filter(s => s.is_approved))).catch(() => {});
  }, [isSuper]);

  const schoolName = useCallback((id) => {
    if (id == null) return 'All schools';
    const s = schools.find(x => String(x.id) === String(id));
    return s ? s.name : `School #${id}`;
  }, [schools]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up = [], pa = [];
    list.forEach(m => {
      const t = m.scheduled_at ? new Date(m.scheduled_at).getTime() : 0;
      if (m.status === 'scheduled' && t >= now) up.push(m); else pa.push(m);
    });
    up.sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at));
    pa.sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at));
    return { upcoming: up, past: pa };
  }, [list]);

  async function handleSave(form) {
    try {
      if (editItem) { await req('PUT', `/api/virtual-meetings/${editItem.id}/`, form); showToast('Meeting updated', 'success'); }
      else { await req('POST', '/api/virtual-meetings/', { ...form, audience }); showToast('Meeting scheduled', 'success'); }
      setShowForm(false); setEditItem(null); load();
    } catch (e) { showToast(e.message, 'error'); }
  }
  async function handleStatus(m, status) {
    try { await req('PUT', `/api/virtual-meetings/${m.id}/`, { status }); load(); showToast(`Marked ${status}`, 'success'); }
    catch (e) { showToast(e.message, 'error'); }
  }
  async function handleDelete(m) {
    try { await req('DELETE', `/api/virtual-meetings/${m.id}/`); setDeleting(null); load(); showToast('Deleted', 'success'); }
    catch (e) { showToast(e.message, 'error'); }
  }

  const renderCard = (m) => {
    const statusCls = m.status === 'completed' ? 'done' : m.status === 'cancelled' ? 'cancel' : 'live';
    return (
      <div key={m.id} className={`savm-card savm-card--${meta.accent}`}>
        <div className="savm-card-head">
          <span className={`savm-status savm-status--${statusCls}`}>
            {m.status === 'scheduled' ? 'Scheduled' : m.status === 'completed' ? 'Completed' : 'Cancelled'}
          </span>
          <div className="savm-card-tools">
            <button className="savm-icon-btn" title="Edit" onClick={() => { setEditItem(m); setShowForm(true); }}><IcEdit /></button>
            <button className="savm-icon-btn savm-icon-btn--danger" title="Delete" onClick={() => setDeleting(m)}><IcTrash /></button>
          </div>
        </div>
        <h3 className="savm-card-title">{m.title}</h3>
        {m.description && <p className="savm-card-desc">{m.description}</p>}
        <div className="savm-card-meta">
          <span><IcClock /> {fmtWhen(m.scheduled_at)}{m.duration_minutes ? ` · ${m.duration_minutes} min` : ''}</span>
          {m.host && <span><IcUser /> {m.host}</span>}
          {isSuper && <span className="savm-card-school">{schoolName(m.school_id)}</span>}
        </div>
        <div className="savm-card-actions">
          {m.meeting_url && (
            <a className="savm-join" href={m.meeting_url} target="_blank" rel="noopener noreferrer"><IcVideo /> Join</a>
          )}
          {m.status === 'scheduled' && (
            <>
              <button className="savm-btn savm-btn--ghost savm-btn--sm" onClick={() => handleStatus(m, 'completed')}><IcCheck /> Complete</button>
              <button className="savm-btn savm-btn--ghost savm-btn--sm" onClick={() => handleStatus(m, 'cancelled')}>Cancel</button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="savm-wrap">
      {toast && <div className={`sa-toast sa-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="savm-head">
        <div>
          <h1 className="savm-title">Virtual Meeting · {meta.label}</h1>
          <p className="savm-sub">Schedule and manage video meetings for {meta.label.toLowerCase()}. Shareable join links, reminders and status tracking.</p>
        </div>
        <button className="savm-btn savm-btn--primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
          <IcPlus /> Schedule Meeting
        </button>
      </div>

      {loading && <div className="savm-state"><span className="savm-spinner" />Loading meetings…</div>}
      {!loading && error && <div className="savm-state savm-state--err"><IcWarn /><span>{error}</span></div>}

      {!loading && !error && (
        <>
          {list.length === 0 ? (
            <div className="savm-empty">
              <div className="savm-empty-icon"><IcVideo /></div>
              <h3>No meetings scheduled</h3>
              <p>Click “Schedule Meeting” to set up your first {meta.noun.toLowerCase()}.</p>
            </div>
          ) : (
            <>
              <section className="savm-section">
                <h2 className="savm-section-title">Upcoming <span className="savm-count">{upcoming.length}</span></h2>
                {upcoming.length === 0 ? (
                  <p className="savm-section-empty">No upcoming meetings. Schedule one above.</p>
                ) : (
                  <div className="savm-grid">{upcoming.map(renderCard)}</div>
                )}
              </section>

              {past.length > 0 && (
                <section className="savm-section">
                  <h2 className="savm-section-title">Past &amp; Closed <span className="savm-count">{past.length}</span></h2>
                  <div className="savm-grid">{past.map(renderCard)}</div>
                </section>
              )}
            </>
          )}
        </>
      )}

      {showForm && (
        <MeetingForm
          meta={meta}
          isSuper={isSuper}
          schools={schools}
          editItem={editItem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}

      {deleting && (
        <div className="savm-overlay" onClick={() => setDeleting(null)}>
          <div className="savm-modal" onClick={e => e.stopPropagation()}>
            <h3 className="savm-modal-title">Delete this meeting?</h3>
            <p className="savm-modal-text">“{deleting.title}” will be removed permanently.</p>
            <div className="savm-modal-actions">
              <button className="savm-btn savm-btn--ghost" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="savm-btn savm-btn--danger" onClick={() => handleDelete(deleting)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── datetime helpers for <input type="datetime-local"> ── */
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function MeetingForm({ meta, isSuper, schools, editItem, onSave, onClose }) {
  const [form, setForm] = useState({ duration_minutes: 60 });
  const [err, setErr] = useState('');

  useEffect(() => {
    if (editItem) {
      setForm({
        title: editItem.title || '',
        description: editItem.description || '',
        meeting_url: editItem.meeting_url || '',
        host: editItem.host || '',
        scheduled_at: toLocalInput(editItem.scheduled_at),
        duration_minutes: editItem.duration_minutes || 60,
        school_id: editItem.school_id != null ? String(editItem.school_id) : '',
        status: editItem.status || 'scheduled',
      });
    }
  }, [editItem]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  function submit(e) {
    e.preventDefault();
    setErr('');
    if (!String(form.title || '').trim()) { setErr('Title is required.'); return; }
    const payload = {
      title: form.title,
      description: form.description || '',
      meeting_url: form.meeting_url || '',
      host: form.host || '',
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : 60,
    };
    if (isSuper && form.school_id) payload.school_id = Number(form.school_id);
    if (editItem && form.status) payload.status = form.status;
    onSave(payload);
  }

  return (
    <div className="savm-overlay" onClick={onClose}>
      <div className="savm-modal savm-modal--lg" onClick={e => e.stopPropagation()}>
        <h3 className="savm-modal-title">{editItem ? 'Edit Meeting' : `Schedule ${meta.noun}`}</h3>
        <form onSubmit={submit}>
          <div className="savm-form-grid">
            <div className="savm-field savm-field--full">
              <label>Title *</label>
              <input type="text" value={form.title || ''} onChange={e => set('title', e.target.value)} placeholder={`e.g. ${meta.noun} — Term 2`} />
            </div>
            {isSuper && (
              <div className="savm-field">
                <label>School</label>
                <select value={form.school_id || ''} onChange={e => set('school_id', e.target.value)}>
                  <option value="">All schools</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}
            <div className="savm-field">
              <label>Host</label>
              <input type="text" value={form.host || ''} onChange={e => set('host', e.target.value)} placeholder="e.g. Mr. Bangura" />
            </div>
            <div className="savm-field">
              <label>Date &amp; Time</label>
              <input type="datetime-local" value={form.scheduled_at || ''} onChange={e => set('scheduled_at', e.target.value)} />
            </div>
            <div className="savm-field">
              <label>Duration (minutes)</label>
              <input type="number" min="5" step="5" value={form.duration_minutes || ''} onChange={e => set('duration_minutes', e.target.value)} placeholder="60" />
            </div>
            <div className="savm-field savm-field--full">
              <label>Meeting Link</label>
              <div className="savm-link-input"><IcLink /><input type="url" value={form.meeting_url || ''} onChange={e => set('meeting_url', e.target.value)} placeholder="https://meet.google.com/…  or  Zoom / Teams link" /></div>
            </div>
            <div className="savm-field savm-field--full">
              <label>Description / Agenda</label>
              <textarea rows={3} value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="What will this meeting cover?" />
            </div>
            {editItem && (
              <div className="savm-field">
                <label>Status</label>
                <select value={form.status || 'scheduled'} onChange={e => set('status', e.target.value)}>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>
          {err && <div className="savm-form-err"><IcWarn /> {err}</div>}
          <div className="savm-modal-actions">
            <button type="button" className="savm-btn savm-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="savm-btn savm-btn--primary">{editItem ? 'Save Changes' : 'Schedule'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
