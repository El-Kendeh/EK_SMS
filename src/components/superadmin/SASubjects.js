import React, { useState, useEffect, useCallback } from 'react';

const API = (process.env.REACT_APP_NODE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const token = () => { try { return localStorage.getItem('token') || ''; } catch { return ''; } };
async function req(method, path, body) {
  const headers = { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' };
  const opts = { method, headers };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(`${API}${path}`, opts);
  if (!r.ok) { let m = `HTTP ${r.status}`; try { const d = await r.json(); m = d.message || m; } catch {} throw new Error(m); }
  return r.json();
}

const IcPlus = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcEdit = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcTrash = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>;
const IcBook = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>;
const IcTeacher = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10l-10-6-10 6 10 6 10-6z"/><path d="M6 12v5c0 2 3 3 6 3s6-1 6-3v-5"/></svg>;

export default function SASubjects() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [assignType, setAssignType] = useState(null);
  const [assignId, setAssignId] = useState(null);
  const limit = 20;

  const showToast = useCallback((msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      const r = await req('GET', `/api/subjects/?${params}`);
      setList(r.subjects || []); setTotal(r.total || 0);
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [page, showToast]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    try {
      if (editItem) { await req('PUT', `/api/subjects/${editItem.id}/`, form); showToast('Updated', 'success'); }
      else { await req('POST', '/api/subjects/', form); showToast('Created', 'success'); }
      setShowModal(false); setEditItem(null); load();
    } catch (e) { showToast(e.message, 'error'); }
  }
  async function handleToggle(item) { try { await req('PATCH', `/api/subjects/${item.id}/toggle/`); load(); } catch (e) { showToast(e.message, 'error'); } }
  async function handleDelete(item) { try { await req('DELETE', `/api/subjects/${item.id}/`); load(); setDeleting(null); } catch (e) { showToast(e.message, 'error'); } }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="sa-page">
      {toast && <div className={`sa-toast sa-toast--${toast.type}`}>{toast.msg}</div>}
      <div className="sa-page-head">
        <div>
          <h1 className="sa-page-title">Subjects</h1>
          <p className="sa-page-sub">Manage subjects across all schools</p>
        </div>
        <button className="sa-btn sa-btn--primary" onClick={() => { setEditItem(null); setShowModal(true); }}><IcPlus /> Add Subject</button>
      </div>
      <div className="sa-toolbar">
        <div className="sa-search-bar">
          <input className="sa-search-input" placeholder="Search subjects..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>
      {loading ? <div className="sa-loading">Loading...</div> : (
        <>
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead><tr><th>Name</th><th>Code</th><th>School</th><th>Description</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--sa-text-3)' }}>No subjects found</td></tr>
                ) : list.map(p => (
                  <tr key={p.id}>
                    <td><div className="sa-table-school-name">{p.name}</div></td>
                    <td><span className="sa-table-school-id">{p.code || '—'}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--sa-text-3)' }}>{p.school_name || `ID: ${p.school_id}`}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description || '—'}</td>
                    <td>{p.is_active ? <span className="sa-badge sa-badge--approved">Active</span> : <span className="sa-badge sa-badge--inactive">Inactive</span>}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="sa-btn sa-btn--ghost sa-btn--sm" title="Assign Classes" onClick={() => { setAssignId(p.id); setAssignType('classes'); }}><IcBook /></button>
                        <button className="sa-btn sa-btn--ghost sa-btn--sm" title="Assign Teacher" onClick={() => { setAssignId(p.id); setAssignType('teacher'); }}><IcTeacher /></button>
                        <button className="sa-btn sa-btn--ghost sa-btn--sm" title="Edit" onClick={() => { setEditItem(p); setShowModal(true); }}><IcEdit /></button>
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
        <SubjectForm editItem={editItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditItem(null); }} />
      )}
      {assignType === 'classes' && assignId && (
        <AssignClassesModal subjectId={assignId} onClose={() => { setAssignType(null); setAssignId(null); load(); }} showToast={showToast} />
      )}
      {assignType === 'teacher' && assignId && (
        <AssignSubjectTeacherModal subjectId={assignId} onClose={() => { setAssignType(null); setAssignId(null); load(); }} showToast={showToast} />
      )}
      {deleting && (
        <div className="sa-modal-overlay" onClick={() => setDeleting(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete this subject?</h3>
            <p style={{ color: 'var(--sa-text-3)', margin: '8px 0 20px' }}>This action cannot be undone.</p>
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

const subjectFields = [
  { key: 'name', label: 'Subject Name', type: 'text', required: true, placeholder: 'e.g. Mathematics' },
  { key: 'code', label: 'Code', type: 'text', placeholder: 'e.g. MATH' },
  { key: 'school_id', label: 'School ID', type: 'number', required: true },
  { key: 'description', label: 'Description', type: 'text', placeholder: 'e.g. Advanced Mathematics' },
];

function SubjectForm({ editItem, onSave, onClose }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (editItem) { const f = {}; subjectFields.forEach(({ key }) => { f[key] = editItem[key] !== undefined && editItem[key] !== null ? String(editItem[key]) : ''; }); setForm(f); } }, [editItem]);
  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }
  return (
    <div className="sa-modal-overlay" onClick={onClose}>
      <div className="sa-modal" onClick={e => e.stopPropagation()}>
        <h3>{editItem ? 'Edit Subject' : 'Create Subject'}</h3>
        <form onSubmit={e => { e.preventDefault(); const data = {}; Object.entries(form).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) data[k] = k === 'school_id' ? Number(v) : v; }); onSave(data); }}>
          <div className="sa-modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {subjectFields.map(f => (
                <div key={f.key} className="sa-field">
                  <label>{f.label}{f.required ? ' *' : ''}</label>
                  <input type={f.type === 'number' ? 'number' : 'text'} value={form[f.key] !== undefined ? form[f.key] : ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder || ''} />
                </div>
              ))}
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

/* ── Assign Classes Modal ── */
function AssignClassesModal({ subjectId, onClose, showToast }) {
  const [assigned, setAssigned] = useState([]);
  const [available, setAvailable] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      req('GET', `/api/subjects/${subjectId}/classes/`),
      req('GET', `/api/subjects/${subjectId}/available-classes/`),
    ]).then(([a, av]) => {
      setAssigned(a.data?.classes || []);
      setAvailable(av.data?.classes || []);
    }).catch(e => showToast(e.message, 'error')).finally(() => setLoading(false));
  }, [subjectId, showToast]);
  async function handleAssign() {
    try {
      await req('POST', `/api/subjects/${subjectId}/assign-classes/`, { class_ids: selected.map(Number) });
      showToast('Classes assigned', 'success');
      onClose();
    } catch (e) { showToast(e.message, 'error'); }
  }
  function toggle(id) { setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]); }
  return (
    <div className="sa-modal-overlay" onClick={onClose}>
      <div className="sa-modal sa-modal--lg" onClick={e => e.stopPropagation()}>
        <h3>Assign Classes to Subject</h3>
        {loading ? <div className="sa-loading">Loading...</div> : (
          <>
            {assigned.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Currently Assigned ({assigned.length})</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {assigned.map(c => <span key={c.id} className="sa-badge sa-badge--approved">{c.class_name}</span>)}
                </div>
              </div>
            )}
            <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Available Classes ({available.length})</p>
            <div style={{ maxHeight: 300, overflowY: 'auto', border: '1px solid var(--sa-border)', borderRadius: 8 }}>
              {available.length === 0 ? (
                <p style={{ padding: 16, color: 'var(--sa-text-3)', textAlign: 'center' }}>No available classes</p>
              ) : available.map(c => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12', cursor: 'pointer', borderBottom: '1px solid var(--sa-border)' }}>
                  <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggle(c.id)} />
                  <span style={{ fontSize: 13 }}>{c.name}</span>
                  <span style={{ fontSize: 11, color: 'var(--sa-text-3)' }}>{c.code || ''}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="sa-btn sa-btn--ghost" onClick={onClose}>Cancel</button>
              <button className="sa-btn sa-btn--primary" onClick={handleAssign} disabled={selected.length === 0}>Assign {selected.length > 0 ? `(${selected.length})` : ''}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Assign Subject Teacher Modal ── */
function AssignSubjectTeacherModal({ subjectId, onClose, showToast }) {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    req('GET', `/api/subjects/${subjectId}/teachers/`)
      .then(r => setTeachers(r.teachers || []))
      .catch(e => showToast(e.message, 'error'))
      .finally(() => setLoading(false));
  }, [subjectId, showToast]);
  async function handleAssign() {
    try {
      await req('POST', `/api/subjects/${subjectId}/assign-teacher/`, { teacher_id: selectedTeacher ? Number(selectedTeacher) : null });
      showToast('Teacher assigned to subject', 'success');
      onClose();
    } catch (e) { showToast(e.message, 'error'); }
  }
  return (
    <div className="sa-modal-overlay" onClick={onClose}>
      <div className="sa-modal" onClick={e => e.stopPropagation()}>
        <h3>Assign Teacher to Subject</h3>
        {loading ? <div className="sa-loading">Loading...</div> : (
          <>
            <div className="sa-field">
              <label>Teacher (assigns to all classes linked to this subject)</label>
              <select value={selectedTeacher} onChange={e => setSelectedTeacher(e.target.value)}>
                <option value="">— None (clear) —</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.employee_id || `#${t.id}`})</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
              <button className="sa-btn sa-btn--ghost" onClick={onClose}>Cancel</button>
              <button className="sa-btn sa-btn--primary" onClick={handleAssign}>Assign</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
