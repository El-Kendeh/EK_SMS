import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './SAStaffManager.css';

/* ------------------------------------------------------------------ */
/*  SAStaffManager — shared Principal / Bursar management page          */
/*                                                                      */
/*  Powers the 'principal' and 'bursar' dashboard pages for both the    */
/*  superadmin (cross-school, with a school selector) and the school    */
/*  admin (locked to their own school — the backend pins school_id      */
/*  from the token). Creating a record provisions a real login and      */
/*  the credentials are shown once in a copyable success modal.         */
/* ------------------------------------------------------------------ */

const API = (process.env.REACT_APP_NODE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const token = () => { try { return localStorage.getItem('token') || ''; } catch { return ''; } };

function getCurrentUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

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
const IcKey       = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>;
const IcCopy      = () => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
const IcWarn      = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

const KINDS = {
  principal: {
    title: 'Principals',
    singular: 'Principal',
    sub: 'Register school principals with full employment records and login credentials.',
    endpoint: '/api/principals/',
    listKey: 'principals',
    defaultPw: 'Principal@123',
  },
  bursar: {
    title: 'Bursars (HR records)',
    singular: 'Bursar',
    sub: 'Full employment / HR records for finance staff. For login & access management, use the Finance Users page.',
    endpoint: '/api/bursars/',
    listKey: 'bursars',
    defaultPw: 'Bursar@123',
  },
};

/* ── Form sections ── */
const SECTIONS = [
  {
    id: 'account', label: 'Account',
    fields: [
      { key: 'first_name', label: 'First Name', required: true },
      { key: 'last_name', label: 'Last Name', required: true },
      { key: 'employee_id', label: 'Employee ID', required: true, placeholder: 'e.g. EMP-001' },
      { key: 'email', label: 'Email', type: 'email' },
      { key: 'username', label: 'Username', placeholder: 'auto-generated if blank' },
      { key: 'password', label: 'Password', placeholder: 'auto default if blank' },
    ],
  },
  {
    id: 'personal', label: 'Personal',
    fields: [
      { key: 'phone_number', label: 'Phone' },
      { key: 'gender', label: 'Gender', options: ['Male', 'Female', 'Other'] },
      { key: 'date_of_birth', label: 'Date of Birth', type: 'date' },
      { key: 'marital_status', label: 'Marital Status', options: ['Single', 'Married', 'Divorced', 'Widowed'] },
      { key: 'nationality', label: 'Nationality' },
      { key: 'state_of_origin', label: 'State / Province of Origin' },
      { key: 'lga', label: 'District / LGA' },
      { key: 'religion', label: 'Religion' },
      { key: 'address', label: 'Address' },
      { key: 'city', label: 'City' },
    ],
  },
  {
    id: 'employment', label: 'Employment',
    fields: [
      { key: 'qualification', label: 'Qualification', placeholder: 'e.g. B.Ed, MBA' },
      { key: 'years_experience', label: 'Years of Experience', type: 'number' },
      { key: 'hire_date', label: 'Hire Date', type: 'date' },
      { key: 'contract_type', label: 'Contract Type', options: ['Full-time', 'Part-time', 'Contract'] },
      { key: 'salary_grade', label: 'Salary Grade' },
      { key: 'bio', label: 'Short Bio' },
    ],
  },
  {
    id: 'banking', label: 'ID & Banking',
    fields: [
      { key: 'national_id_number', label: 'National ID Number' },
      { key: 'bank_name', label: 'Bank Name' },
      { key: 'bank_account_number', label: 'Account Number' },
      { key: 'bank_account_name', label: 'Account Name' },
    ],
  },
  {
    id: 'emergency', label: 'Emergency',
    fields: [
      { key: 'emergency_contact_name', label: 'Contact Name' },
      { key: 'emergency_contact_phone', label: 'Contact Phone' },
      { key: 'emergency_contact_relationship', label: 'Relationship' },
    ],
  },
];

const ALL_FIELD_KEYS = SECTIONS.flatMap(s => s.fields.map(f => f.key));

export default function SAStaffManager({ kind = 'principal' }) {
  const cfg = KINDS[kind] || KINDS.principal;
  const currentUser = getCurrentUser();
  const isSuper = currentUser?.role === 'superadmin';

  const [list, setList]         = useState([]);
  const [schools, setSchools]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [statusF, setStatusF]   = useState('all');
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast]       = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [creds, setCreds]       = useState(null); // { name, username, password }
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const limit = 20;

  const showToast = useCallback((msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      const q = debouncedSearch.trim();
      if (q) params.set('q', q);           // server-side search across ALL pages
      const r = await req('GET', `${cfg.endpoint}?${params}`);
      setList(r[cfg.listKey] || []);
      setTotal(r.total || 0);
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [page, debouncedSearch, cfg.endpoint, cfg.listKey, showToast]);

  useEffect(() => { load(); }, [load]);

  // Debounce the search box and push it to the server (resetting to page 1) so a
  // record on a later page is found instead of a false "No results". The client
  // filter below still refines the current page (and covers any endpoint that
  // ignores q), so this is a strict improvement with no regression.
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!isSuper) return;
    req('GET', '/api/schools/')
      .then(d => setSchools((d.schools || []).filter(s => s.is_approved)))
      .catch(() => {});
  }, [isSuper]);

  const schoolName = useCallback((id) => {
    if (id == null) return '—';
    const s = schools.find(x => String(x.id) === String(id));
    return s ? s.name : `#${id}`;
  }, [schools]);

  /* Client-side search + status filter */
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter(p => {
      if (statusF === 'active' && (!p.is_active || p.status === 'blocked')) return false;
      if (statusF === 'inactive' && p.is_active) return false;
      if (statusF === 'blocked' && p.status !== 'blocked') return false;
      if (!q) return true;
      return [p.first_name, p.last_name, `${p.first_name} ${p.last_name}`, p.email, p.username, p.employee_id, p.phone_number]
        .some(v => String(v || '').toLowerCase().includes(q));
    });
  }, [list, search, statusF]);

  async function handleSave(form, file) {
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') fd.append(k, v);
      });
      if (file) fd.append('profile_picture', file);
      if (editItem) {
        await req('PUT', `${cfg.endpoint}${editItem.id}/`, fd, true);
        showToast(`${cfg.singular} updated`, 'success');
      } else {
        const d = await req('POST', cfg.endpoint, fd, true);
        setCreds({
          name: `${form.first_name} ${form.last_name}`,
          username: d.username || form.username,
          password: d.password || form.password || cfg.defaultPw,
        });
      }
      setShowModal(false); setEditItem(null); load();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function handleToggle(item) {
    try { await req('PATCH', `${cfg.endpoint}${item.id}/toggle/`); load(); showToast('Status updated', 'success'); }
    catch (e) { showToast(e.message, 'error'); }
  }
  async function handleBlock(item) {
    try { await req('PATCH', `${cfg.endpoint}${item.id}/block/`); load(); showToast(item.status === 'blocked' ? 'Unblocked' : 'Blocked', 'success'); }
    catch (e) { showToast(e.message, 'error'); }
  }
  async function handleDelete(item) {
    try { await req('DELETE', `${cfg.endpoint}${item.id}/`); load(); setDeleting(null); showToast('Deleted', 'success'); }
    catch (e) { showToast(e.message, 'error'); }
  }

  const copyCreds = () => {
    const text = `Username: ${creds.username}\nPassword: ${creds.password}`;
    try { navigator.clipboard.writeText(text); showToast('Credentials copied', 'success'); }
    catch { showToast('Copy failed — note them manually', 'error'); }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="sasm-wrap">
      {toast && <div className={`sa-toast sa-toast--${toast.type}`}>{toast.msg}</div>}

      <div className="sasm-head">
        <div>
          <h1 className="sasm-title">{cfg.title}</h1>
          <p className="sasm-sub">{cfg.sub}</p>
        </div>
        <button className="sasm-btn sasm-btn--primary" onClick={() => { setEditItem(null); setShowModal(true); }}>
          <IcPlus /> Add {cfg.singular}
        </button>
      </div>

      <div className="sasm-toolbar">
        <input
          className="sasm-search"
          type="search"
          placeholder={`Search ${cfg.title.toLowerCase()} by name, email, ID…`}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="sasm-filters">
          {[['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive'], ['blocked', 'Blocked']].map(([key, label]) => (
            <button key={key} className={`sasm-filter${statusF === key ? ' active' : ''}`} onClick={() => setStatusF(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? <div className="sasm-state"><span className="sasm-spinner" />Loading…</div> : (
        <>
          {visible.length === 0 ? (
            <div className="sasm-empty">
              {list.length === 0
                ? <>No {cfg.title.toLowerCase()} yet — click “Add {cfg.singular}” to register the first one.</>
                : <>No results for the current search / filter.</>}
            </div>
          ) : (
            <div className="sasm-table-wrap">
              <table className="sasm-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Employee ID</th>
                    {isSuper && <th>School</th>}
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(p => (
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
                      <td><span className="sasm-emp-id">{p.employee_id || '—'}</span></td>
                      {isSuper && <td className="sasm-school">{schoolName(p.school_id)}</td>}
                      <td>
                        <div className="sasm-contact">
                          <span>{p.email || '—'}</span>
                          <span className="sasm-contact-sub">{p.phone_number || ''}</span>
                        </div>
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
              <span>Page {page} of {totalPages} · {total} total</span>
              <div className="sasm-pagination-btns">
                <button className="sasm-btn sasm-btn--ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <button className="sasm-btn sasm-btn--ghost" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <StaffForm
          cfg={cfg}
          isSuper={isSuper}
          schools={schools}
          editItem={editItem}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditItem(null); }}
        />
      )}

      {/* Credentials success modal */}
      {creds && (
        <div className="sasm-overlay" onClick={() => setCreds(null)}>
          <div className="sasm-modal sasm-modal--creds" onClick={e => e.stopPropagation()}>
            <div className="sasm-creds-icon"><IcKey /></div>
            <h3 className="sasm-creds-title">{cfg.singular} account created</h3>
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
            <p className="sasm-modal-text"><IcWarn /> This also removes their login access permanently. This cannot be undone.</p>
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
function StaffForm({ cfg, isSuper, schools, editItem, onSave, onClose }) {
  const [form, setForm]     = useState({});
  const [file, setFile]     = useState(null);
  const [tab, setTab]       = useState('account');
  const [err, setErr]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editItem) {
      const f = {};
      ALL_FIELD_KEYS.forEach(k => { if (k !== 'password') f[k] = editItem[k] ?? ''; });
      if (editItem.school_id != null) f.school_id = String(editItem.school_id);
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
    if (!String(form.employee_id || '').trim()) { setErr('Employee ID is required.'); setTab('account'); return; }
    if (isSuper && !editItem && !form.school_id) { setErr('Please select a school.'); setTab('account'); return; }
    setSubmitting(true);
    try { await onSave(form, file); }
    finally { setSubmitting(false); }
  };

  const section = SECTIONS.find(s => s.id === tab) || SECTIONS[0];

  return (
    <div className="sasm-overlay" onClick={onClose}>
      <div className="sasm-modal sasm-modal--lg" onClick={e => e.stopPropagation()}>
        <h3 className="sasm-modal-title">{editItem ? `Edit ${cfg.singular}` : `Register ${cfg.singular}`}</h3>

        <div className="sasm-tabs">
          {SECTIONS.map(s => (
            <button key={s.id} type="button" className={`sasm-tab${tab === s.id ? ' active' : ''}`} onClick={() => setTab(s.id)}>
              {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={submit}>
          <div className="sasm-form-body">
            {tab === 'account' && isSuper && (
              <div className="sasm-field sasm-field--full">
                <label>School {editItem ? '' : '*'}</label>
                <select
                  value={form.school_id || ''}
                  onChange={e => set('school_id', e.target.value)}
                  disabled={!!editItem}
                >
                  <option value="">— select school —</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {editItem && <span className="sasm-hint">School assignment cannot be changed here.</span>}
              </div>
            )}

            <div className="sasm-form-grid">
              {section.fields.map(f => (
                <div key={f.key} className="sasm-field">
                  <label>{f.label}{f.required ? ' *' : ''}</label>
                  {f.options ? (
                    <select value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}>
                      <option value="">Select…</option>
                      {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={f.type || 'text'}
                      value={form[f.key] ?? ''}
                      onChange={e => set(f.key, e.target.value)}
                      placeholder={f.key === 'password' && editItem ? 'leave blank to keep current' : (f.placeholder || '')}
                    />
                  )}
                </div>
              ))}
              {tab === 'account' && (
                <div className="sasm-field">
                  <label>Profile Picture</label>
                  <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0] || null)} />
                </div>
              )}
            </div>
          </div>

          {err && <div className="sasm-form-err"><IcWarn /> {err}</div>}

          <div className="sasm-modal-actions">
            <button type="button" className="sasm-btn sasm-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="sasm-btn sasm-btn--primary" disabled={submitting}>{submitting ? 'Saving…' : (editItem ? 'Save Changes' : `Create ${cfg.singular}`)}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
