import React, { useState, useEffect, useCallback } from 'react';

const API = (process.env.REACT_APP_NODE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const token = () => { try { return localStorage.getItem('token') || ''; } catch { return ''; } };
async function req(method, path, body, isFile) {
  const headers = { Authorization: `Bearer ${token()}` };
  if (!isFile) headers['Content-Type'] = 'application/json';
  const opts = { method, headers };
  if (body !== undefined) opts.body = isFile ? body : JSON.stringify(body);
  const r = await fetch(`${API}${path}`, opts);
  if (!r.ok) { let m = `HTTP ${r.status}`; try { const d = await r.json(); m = d.message || m; } catch {} throw new Error(m); }
  return r.json();
}

const IcPlus = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcEdit = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcTrash = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
const IcBlock = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>;
const IcLink = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;

export default function SAParents() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkParentId, setLinkParentId] = useState(null);
  const [linkStudentId, setLinkStudentId] = useState('');
  const [linkRelationship, setLinkRelationship] = useState('guardian');
  const limit = 20;

  const showToast = useCallback((msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      const r = await req('GET', `/api/parents/?${params}`);
      setList(r.parents || []); setTotal(r.total || 0);
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [page, showToast]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
      if (form._file) fd.append('passport_photo', form._file);
      if (form.student_ids && typeof form.student_ids === 'string') fd.append('student_ids', form.student_ids);
      if (editItem) { await req('PUT', `/api/parents/${editItem.id}/`, fd, true); showToast('Updated', 'success'); }
      else { await req('POST', '/api/parents/', fd, true); showToast('Created', 'success'); }
      setShowModal(false); setEditItem(null); load();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function handleToggle(item) { try { await req('PATCH', `/api/parents/${item.id}/toggle/`); load(); } catch (e) { showToast(e.message, 'error'); } }
  async function handleBlock(item) { try { await req('PATCH', `/api/parents/${item.id}/block/`); load(); } catch (e) { showToast(e.message, 'error'); } }
  async function handleDelete(item) { try { await req('DELETE', `/api/parents/${item.id}/`); load(); setDeleting(null); } catch (e) { showToast(e.message, 'error'); } }

  async function handleLink() {
    try {
      await req('POST', '/api/link-parent/', { parent_id: linkParentId, student_id: Number(linkStudentId), relationship: linkRelationship });
      showToast('Parent linked to student', 'success');
      setShowLinkModal(false); load();
    } catch (e) { showToast(e.message, 'error'); }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="sa-page">
      {toast && <div className={`sa-toast sa-toast--${toast.type}`}>{toast.msg}</div>}
      <div className="sa-page-head">
        <div>
          <h1 className="sa-page-title">Parents / Guardians</h1>
          <p className="sa-page-sub">Parent accounts with student linking</p>
        </div>
        <button className="sa-btn sa-btn--primary" onClick={() => { setEditItem(null); setShowModal(true); }}><IcPlus /> Add Parent</button>
      </div>
      <div className="sa-toolbar">
        <div className="sa-search-bar">
          <input className="sa-search-input" placeholder="Search parents..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>
      {loading ? <div className="sa-loading">Loading...</div> : (
        <>
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Students</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--sa-text-3)' }}>No parents found</td></tr>
                ) : list.map(p => (
                  <tr key={p.id}>
                    <td><div className="sa-table-school-name">{p.first_name} {p.last_name}</div></td>
                    <td>{p.email || '—'}</td>
                    <td>{p.phone || '—'}</td>
                    <td>
                      {p.students && p.students.length > 0
                        ? p.students.map(s => <span key={s.student_id} style={{ display: 'inline-block', marginRight: 4 }} className="sa-badge sa-badge--info">{s.first_name} ({s.relationship})</span>)
                        : '—'}
                    </td>
                    <td>
                      {p.status === 'blocked' ? <span className="sa-badge sa-badge--rejected">Blocked</span>
                        : p.is_active ? <span className="sa-badge sa-badge--approved">Active</span>
                        : <span className="sa-badge sa-badge--inactive">Inactive</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="sa-btn sa-btn--ghost sa-btn--sm" title="Link to Student" onClick={() => { setLinkParentId(p.id); setShowLinkModal(true); }}><IcLink /></button>
                        <button className="sa-btn sa-btn--ghost sa-btn--sm" title="Edit" onClick={() => { setEditItem(p); setShowModal(true); }}><IcEdit /></button>
                        <button className="sa-btn sa-btn--ghost sa-btn--sm" title={p.status === 'blocked' ? 'Unblock' : 'Block'} onClick={() => handleBlock(p)}><IcBlock /></button>
                        <button className="sa-btn sa-btn--ghost sa-btn--sm" title="Toggle" onClick={() => handleToggle(p)}><span style={{ fontSize: 12 }}>{p.is_active ? '🔴' : '🟢'}</span></button>
                        <button className="sa-btn sa-btn--ghost sa-btn--sm" title="Delete" onClick={() => setDeleting(p.id)}><IcTrash /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="sa-pagination">
              <span>Page {page} of {totalPages} ({total} total)</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="sa-btn sa-btn--ghost sa-btn--sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Prev</button>
                <button className="sa-btn sa-btn--ghost sa-btn--sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </>
      )}
      {showModal && (
        <ParentForm editItem={editItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditItem(null); }} />
      )}
      {showLinkModal && (
        <div className="sa-modal-overlay" onClick={() => setShowLinkModal(false)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <h3>Link to Student</h3>
            <div className="sa-field">
              <label>Student ID</label>
              <input type="number" value={linkStudentId} onChange={e => setLinkStudentId(e.target.value)} placeholder="Enter student ID" />
            </div>
            <div className="sa-field">
              <label>Relationship</label>
              <select value={linkRelationship} onChange={e => setLinkRelationship(e.target.value)}>
                <option value="guardian">Guardian</option>
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="aunt">Aunt</option>
                <option value="uncle">Uncle</option>
                <option value="grandparent">Grandparent</option>
                <option value="sibling">Sibling</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="sa-btn sa-btn--ghost" onClick={() => setShowLinkModal(false)}>Cancel</button>
              <button className="sa-btn sa-btn--primary" onClick={handleLink}>Link</button>
            </div>
          </div>
        </div>
      )}
      {deleting && (
        <div className="sa-modal-overlay" onClick={() => setDeleting(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete this parent?</h3>
            <p style={{ color: 'var(--sa-text-3)', margin: '8px 0 20px' }}>This will also remove their login access and unlink from students.</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="sa-btn sa-btn--ghost" onClick={() => setDeleting(null)}>Cancel</button>
              <button className="sa-btn sa-btn--danger" onClick={() => handleDelete(list.find(x => x.id === deleting))}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const parentFields = [
  { key: 'first_name', label: 'First Name', type: 'text', required: true },
  { key: 'last_name', label: 'Last Name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'occupation', label: 'Occupation', type: 'text' },
  { key: 'address', label: 'Address', type: 'text' },
  { key: 'username', label: 'Username', type: 'text', placeholder: 'auto-generated' },
  { key: 'password', label: 'Password', type: 'text', placeholder: 'default: Parent@123' },
];

function ParentForm({ editItem, onSave, onClose }) {
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  useEffect(() => { if (editItem) { const f = {}; parentFields.forEach(({ key }) => { f[key] = editItem[key] || ''; }); setForm(f); } }, [editItem]);
  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }
  return (
    <div className="sa-modal-overlay" onClick={onClose}>
      <div className="sa-modal" onClick={e => e.stopPropagation()}>
        <h3>{editItem ? 'Edit Parent' : 'Register Parent'}</h3>
        <form onSubmit={e => { e.preventDefault(); onSave({ ...form, _file: file }); }}>
          <div className="sa-modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {parentFields.map(f => (
                <div key={f.key} className="sa-field">
                  <label>{f.label}{f.required ? ' *' : ''}</label>
                  <input type="text" value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder || ''} />
                </div>
              ))}
              <div className="sa-field">
                <label>Passport Photo</label>
                <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0] || null)} />
              </div>
            </div>
          </div>
          <div className="sa-modal-footer">
            <button type="button" className="sa-btn sa-btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="sa-btn sa-btn--primary">{editItem ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
