import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './SAStaffManager.css';
import './SAParents.css';

/* ------------------------------------------------------------------ */
/*  SAParents — superadmin / school-admin parent & guardian management  */
/*                                                                      */
/*  Shares the polished staff-form UI (sectioned tabs, one-time         */
/*  credentials modal, sasm-* styling) but keeps PARENT-specific        */
/*  content: no school/employment fields, linked-student chips, and a   */
/*  dedicated "Link to Student" flow. Backed by /api/parents/ (which     */
/*  returns the full set — pagination is done client-side here).         */
/* ------------------------------------------------------------------ */

const API = (process.env.REACT_APP_NODE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const token = () => { try { return localStorage.getItem('token') || ''; } catch { return ''; } };
const DEFAULT_PW = 'Parent@123';
const LIMIT = 20;

async function req(method, path, body, isFile) {
  const headers = { Authorization: `Bearer ${token()}` };
  if (!isFile && body !== undefined) headers['Content-Type'] = 'application/json';
  const opts = { method, headers };
  if (body !== undefined) opts.body = isFile ? body : JSON.stringify(body);
  const r = await fetch(`${API}${path}`, opts);
  let d = null;
  try { d = await r.json(); } catch { /* non-json */ }
  if (!r.ok || d?.success === false) throw new Error(d?.message || `HTTP ${r.status}`);
  return d || {};
}

/* ── Icons ── */
const IcPlus      = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcEdit      = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcTrash     = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const IcBlock     = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
const IcToggleOn  = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="16" cy="12" r="3" fill="currentColor"/></svg>;
const IcToggleOff = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="8" cy="12" r="3" fill="currentColor"/></svg>;
const IcLink      = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
const IcKey       = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
const IcCopy      = () => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
const IcWarn      = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

const RELATIONSHIPS = ['guardian', 'father', 'mother', 'aunt', 'uncle', 'grandparent', 'sibling', 'other'];

/* ── Parent form sections (parent-specific content) ── */
const SECTIONS = [
  {
    id: 'account', label: 'Account',
    fields: [
      { key: 'first_name', label: 'First Name', required: true },
      { key: 'last_name', label: 'Last Name', required: true },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'phone', label: 'Phone' },
      { key: 'username', label: 'Username', placeholder: 'auto-generated if blank' },
      { key: 'password', label: 'Password', placeholder: 'auto default if blank' },
    ],
  },
  {
    id: 'profile', label: 'Profile',
    fields: [
      { key: 'occupation', label: 'Occupation', placeholder: 'e.g. Engineer, Trader' },
      { key: 'address', label: 'Home Address' },
    ],
  },
];

const ALL_FIELD_KEYS = SECTIONS.flatMap(s => s.fields.map(f => f.key));

export default function SAParents() {
  const [list, setList]         = useState([]);
  const [search, setSearch]     = useState('');
  const [statusF, setStatusF]   = useState('all');
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast]       = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [creds, setCreds]       = useState(null);
  const [linkParent, setLinkParent] = useState(null);

  const showToast = useCallback((msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await req('GET', '/api/parents/');
      setList(r.parents || []);
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  /* Client-side search + status filter (backend returns the full set) */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter(p => {
      if (statusF === 'active' && (!p.is_active || p.status === 'blocked')) return false;
      if (statusF === 'inactive' && p.is_active) return false;
      if (statusF === 'blocked' && p.status !== 'blocked') return false;
      if (!q) return true;
      const inStudents = (p.students || []).some(s => `${s.first_name} ${s.last_name}`.toLowerCase().includes(q));
      return inStudents || [p.first_name, p.last_name, `${p.first_name} ${p.last_name}`, p.email, p.username, p.phone, p.occupation]
        .some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [list, search, statusF]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / LIMIT));
  const curPage = Math.min(page, totalPages);
  const paged = filtered.slice((curPage - 1) * LIMIT, curPage * LIMIT);

  async function handleSave(form, file) {
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') fd.append(k, v);
      });
      if (file) fd.append('passport_photo', file);
      if (editItem) {
        await req('PUT', `/api/parents/${editItem.id}/`, fd, true);
        showToast('Parent updated', 'success');
      } else {
        const d = await req('POST', '/api/parents/', fd, true);
        setCreds({
          name: `${form.first_name} ${form.last_name}`,
          username: d.username || form.username,
          // Prefer the server-generated password so the admin copies the REAL one;
          // fall back to the typed value / constant only if the API omits it.
          password: d.password || form.password || DEFAULT_PW,
        });
      }
      setShowModal(false); setEditItem(null); load();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function handleToggle(item) {
    try { await req('PATCH', `/api/parents/${item.id}/toggle/`); load(); showToast('Status updated', 'success'); }
    catch (e) { showToast(e.message, 'error'); }
  }
  async function handleBlock(item) {
    try { await req('PATCH', `/api/parents/${item.id}/block/`); load(); showToast(item.status === 'blocked' ? 'Unblocked' : 'Blocked', 'success'); }
    catch (e) { showToast(e.message, 'error'); }
  }
  async function handleDelete(item) {
    try { await req('DELETE', `/api/parents/${item.id}/`); load(); setDeleting(null); showToast('Deleted', 'success'); }
    catch (e) { showToast(e.message, 'error'); }
  }

  async function handleLink(studentId, relationship) {
    try {
      await req('POST', '/api/link-parent/', { parent_id: linkParent.id, student_id: Number(studentId), relationship });
      showToast('Parent linked to student', 'success');
      setLinkParent(null); load();
    } catch (e) { showToast(e.message, 'error'); }
  }

  const copyCreds = () => {
    const text = `Username: ${creds.username}\nPassword: ${creds.password}`;
    try { navigator.clipboard.writeText(text); showToast('Credentials copied', 'success'); }
    catch { showToast('Copy failed — note them manually', 'error'); }
  };

  return (
    <div className="sasm-wrap">
      {toast && <div className={`sa-toast sa-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="sasm-head">
        <div>
          <h1 className="sasm-title">Parents / Guardians</h1>
          <p className="sasm-sub">Register parent accounts and link them to their students.</p>
        </div>
        <button className="sasm-btn sasm-btn--primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
          <IcPlus /> Add Parent
        </button>
      </div>

      <div className="sasm-toolbar">
        <input
          className="sasm-search"
          type="search"
          placeholder="Search parents by name, email, phone, student…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <div className="sasm-filters">
          {[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive'], ['blocked', 'Blocked']].map(([key, label]) => (
            <button key={key} className={`sasm-filter${statusF === key ? ' active' : ''}`} onClick={() => { setStatusF(key); setPage(1); }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="sasm-state"><span className="sasm-spinner" />Loading…</div> : (
        <>
          {filtered.length === 0 ? (
            <div className="sasm-empty">
              {list.length === 0
                ? <>No parents yet — click “Add Parent” to register the first one.</>
                : <>No results for the current search / filter.</>}
            </div>
          ) : (
            <div className="sasm-table-wrap">
              <table className="sasm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Contact</th>
                    <th>Linked Students</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map(p => (
                    <tr key={p.id}>
                      <td>
                        <div className="sasm-name-cell">
                          <span className="sasm-avatar">{(p.first_name || '?')[0]}{(p.last_name || '')[0]}</span>
                          <div>
                            <div className="sasm-name">{p.first_name} {p.last_name}</div>
                            <div className="sasm-username">@{p.username || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="sasm-contact">
                          <span>{p.email || '—'}</span>
                          <span className="sasm-contact-sub">{p.phone || ''}</span>
                        </div>
                      </td>
                      <td>
                        {p.students && p.students.length > 0 ? (
                          <div className="sapr-chips">
                            {p.students.map(s => (
                              <span key={s.student_id} className="sapr-chip" title={s.relationship}>
                                {s.first_name || `#${s.student_id}`}<em>{s.relationship}</em>
                              </span>
                            ))}
                          </div>
                        ) : <span className="sasm-contact-sub">No students linked</span>}
                      </td>
                      <td>
                        {p.status === 'blocked'
                          ? <span className="sasm-badge sasm-badge--blocked">Blocked</span>
                          : p.is_active
                            ? <span className="sasm-badge sasm-badge--active">Active</span>
                            : <span className="sasm-badge sasm-badge--inactive">Inactive</span>}
                      </td>
                      <td>
                        <div className="sasm-actions">
                          <button className="sasm-icon-btn" title="Link to student" onClick={() => setLinkParent(p)}><IcLink /></button>
                          <button className="sasm-icon-btn" title="Edit" onClick={() => { setEditItem(p); setShowModal(true); }}><IcEdit /></button>
                          <button className="sasm-icon-btn" title={p.is_active ? 'Deactivate' : 'Activate'} onClick={() => handleToggle(p)}>
                            {p.is_active ? <IcToggleOn /> : <IcToggleOff />}
                          </button>
                          <button className={`sasm-icon-btn${p.status === 'blocked' ? ' sasm-icon-btn--danger' : ''}`} title={p.status === 'blocked' ? 'Unblock' : 'Block'} onClick={() => handleBlock(p)}><IcBlock /></button>
                          <button className="sasm-icon-btn sasm-icon-btn--danger" title="Delete" onClick={() => setDeleting(p)}><IcTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="sasm-pagination">
              <span>Page {curPage} of {totalPages} · {filtered.length} total</span>
              <div className="sasm-pagination-btns">
                <button className="sasm-btn sasm-btn--ghost" disabled={curPage <= 1} onClick={() => setPage(curPage - 1)}>Prev</button>
                <button className="sasm-btn sasm-btn--ghost" disabled={curPage >= totalPages} onClick={() => setPage(curPage + 1)}>Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <ParentForm
          editItem={editItem}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditItem(null); }}
        />
      )}

      {linkParent && (
        <LinkModal
          parent={linkParent}
          onLink={handleLink}
          onClose={() => setLinkParent(null)}
        />
      )}

      {/* Credentials success modal */}
      {creds && (
        <div className="sasm-overlay" onClick={() => setCreds(null)}>
          <div className="sasm-modal sasm-modal--creds" onClick={e => e.stopPropagation()}>
            <div className="sasm-creds-icon"><IcKey /></div>
            <h3 className="sasm-creds-title">Parent account created</h3>
            <p className="sasm-creds-sub">{creds.name} can now sign in with these credentials. They are shown only once — copy and share them securely.</p>
            <div className="sasm-creds-box">
              <div><span>Username</span><strong>{creds.username}</strong></div>
              <div><span>Password</span><strong>{creds.password}</strong></div>
            </div>
            <div className="sasm-modal-actions">
              <button className="sasm-btn sasm-btn--ghost" onClick={copyCreds}><IcCopy /> Copy</button>
              <button className="sasm-btn sasm-btn--primary" onClick={() => setCreds(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="sasm-overlay" onClick={() => setDeleting(null)}>
          <div className="sasm-modal" onClick={e => e.stopPropagation()}>
            <h3 className="sasm-modal-title">Delete {deleting.first_name} {deleting.last_name}?</h3>
            <p className="sasm-modal-text"><IcWarn /> This also removes their login access and unlinks them from their students. This cannot be undone.</p>
            <div className="sasm-modal-actions">
              <button className="sasm-btn sasm-btn--ghost" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="sasm-btn sasm-btn--danger" onClick={() => handleDelete(deleting)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Sectioned add / edit form ── */
function ParentForm({ editItem, onSave, onClose }) {
  const [form, setForm] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const [tab, setTab]   = useState('account');
  const [err, setErr]   = useState('');

  useEffect(() => {
    if (editItem) {
      const f = {};
      ALL_FIELD_KEYS.forEach(k => { if (k !== 'password') f[k] = editItem[k] ?? ''; });
      setForm(f);
    }
  }, [editItem]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (submitting) return;
    if (!String(form.first_name || '').trim()) { setErr('First name is required.'); setTab('account'); return; }
    if (!String(form.last_name || '').trim())  { setErr('Last name is required.');  setTab('account'); return; }
    setSubmitting(true);
    try { await onSave(form, file); }
    finally { setSubmitting(false); }
  };

  const section = SECTIONS.find(s => s.id === tab) || SECTIONS[0];

  return (
    <div className="sasm-overlay" onClick={onClose}>
      <div className="sasm-modal sasm-modal--lg" onClick={e => e.stopPropagation()}>
        <h3 className="sasm-modal-title">{editItem ? 'Edit Parent' : 'Register Parent'}</h3>

        <div className="sasm-tabs">
          {SECTIONS.map(s => (
            <button key={s.id} type="button" className={`sasm-tab${tab === s.id ? ' active' : ''}`} onClick={() => setTab(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          <div className="sasm-form-body">
            <div className="sasm-form-grid">
              {section.fields.map(f => (
                <div key={f.key} className="sasm-field">
                  <label>{f.label}{f.required ? ' *' : ''}</label>
                  <input
                    type={f.type || 'text'}
                    value={form[f.key] ?? ''}
                    onChange={e => set(f.key, e.target.value)}
                    placeholder={f.key === 'password' && editItem ? 'leave blank to keep current' : (f.placeholder || '')}
                  />
                </div>
              ))}
              {tab === 'profile' && (
                <div className="sasm-field">
                  <label>Passport Photo</label>
                  <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0] || null)} />
                </div>
              )}
            </div>
          </div>

          {err && <div className="sasm-form-err"><IcWarn /> {err}</div>}

          <div className="sasm-modal-actions">
            <button type="button" className="sasm-btn sasm-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="sasm-btn sasm-btn--primary" disabled={submitting}>{submitting ? 'Saving…' : (editItem ? 'Save Changes' : 'Create Parent')}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Link parent → student modal ── */
function LinkModal({ parent, onLink, onClose }) {
  const [studentId, setStudentId] = useState('');
  const [relationship, setRelationship] = useState('guardian');
  const [err, setErr] = useState('');
  const [students, setStudents] = useState([]); // student picker options (3.2)

  useEffect(() => {
    // School-scoped on the backend → a school_admin gets their students (→ picker);
    // an unscoped superadmin gets none, so the raw-ID input stays as a fallback.
    req('GET', '/api/students/').then(d => setStudents(d.students || [])).catch(() => {});
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if (!String(studentId).trim()) { setErr('Enter the student ID to link.'); return; }
    onLink(studentId, relationship);
  };

  return (
    <div className="sasm-overlay" onClick={onClose}>
      <div className="sasm-modal" onClick={e => e.stopPropagation()}>
        <h3 className="sasm-modal-title">Link to Student</h3>
        <p className="sasm-modal-text" style={{ marginTop: -4 }}>
          Connect <strong>{parent.first_name} {parent.last_name}</strong> to a student by ID.
        </p>
        <form onSubmit={submit}>
          <div className="sasm-form-grid" style={{ marginTop: 4 }}>
            <div className="sasm-field">
              <label>Student *</label>
              {students.length > 0 ? (
                <select value={studentId} onChange={e => setStudentId(e.target.value)}>
                  <option value="">— select student —</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {`${s.first_name || ''} ${s.last_name || ''}`.trim() || `Student #${s.id}`}{s.admission_number ? ` (${s.admission_number})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <input type="number" value={studentId} onChange={e => setStudentId(e.target.value)} placeholder="e.g. 42" />
              )}
            </div>
            <div className="sasm-field">
              <label>Relationship</label>
              <select value={relationship} onChange={e => setRelationship(e.target.value)}>
                {RELATIONSHIPS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
          </div>
          {err && <div className="sasm-form-err"><IcWarn /> {err}</div>}
          <div className="sasm-modal-actions">
            <button type="button" className="sasm-btn sasm-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="sasm-btn sasm-btn--primary"><IcLink /> Link Student</button>
          </div>
        </form>
      </div>
    </div>
  );
}
