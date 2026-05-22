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

export default function SAStudents() {
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [parents, setParents] = useState([]);
  const [showParentsModal, setShowParentsModal] = useState(null);
  const limit = 20;

  const showToast = useCallback((msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      const r = await req('GET', `/api/students/?${params}`);
      setList(r.data?.students || []); setTotal(r.data?.total || 0);
    } catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [page, showToast]); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v); });
      if (form._file) fd.append('passport_photo', form._file);
      if (editItem) { await req('PUT', `/api/students/${editItem.id}/`, fd, true); showToast('Updated', 'success'); }
      else { await req('POST', '/api/students/', fd, true); showToast('Created', 'success'); }
      setShowModal(false); setEditItem(null); load();
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function handleToggle(item) { try { await req('PATCH', `/api/students/${item.id}/toggle/`); load(); } catch (e) { showToast(e.message, 'error'); } }
  async function handleBlock(item) { try { await req('PATCH', `/api/students/${item.id}/block/`); load(); } catch (e) { showToast(e.message, 'error'); } }
  async function handleDelete(item) { try { await req('DELETE', `/api/students/${item.id}/`); load(); setDeleting(null); } catch (e) { showToast(e.message, 'error'); } }
  async function loadParents(studentId) {
    try { const r = await req('GET', `/api/students/${studentId}/parents/`); setParents(r.data?.parents || []); } catch (e) { showToast(e.message, 'error'); }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="sa-page">
      {toast && <div className={`sa-toast sa-toast--${toast.type}`}>{toast.msg}</div>}
      <div className="sa-page-head">
        <div>
          <h1 className="sa-page-title">Students</h1>
          <p className="sa-page-sub">Full student registration with parent auto-linking</p>
        </div>
        <button className="sa-btn sa-btn--primary" onClick={() => { setEditItem(null); setShowModal(true); }}><IcPlus /> Add Student</button>
      </div>
      <div className="sa-toolbar">
        <div className="sa-search-bar">
          <input className="sa-search-input" placeholder="Search students..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>
      {loading ? <div className="sa-loading">Loading...</div> : (
        <>
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead><tr><th>Name</th><th>Admission #</th><th>Gender</th><th>Classroom</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--sa-text-3)' }}>No students found</td></tr>
                ) : list.map(p => (
                  <tr key={p.id}>
                    <td><div className="sa-table-school-name">{p.first_name} {p.last_name}</div></td>
                    <td><span className="sa-table-school-id">{p.admission_number || '—'}</span></td>
                    <td>{p.gender || '—'}</td>
                    <td>{p.classroom_id || '—'}</td>
                    <td>
                      {p.status === 'blocked' ? <span className="sa-badge sa-badge--rejected">Blocked</span>
                        : p.is_active ? <span className="sa-badge sa-badge--approved">Active</span>
                        : <span className="sa-badge sa-badge--inactive">Inactive</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="sa-btn sa-btn--ghost sa-btn--sm" title="Parents" onClick={() => { loadParents(p.id); setShowParentsModal(p.id); }}><span style={{ fontSize: 12 }}>👤</span></button>
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
        <StudentForm editItem={editItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditItem(null); }} />
      )}
      {showParentsModal && (
        <div className="sa-modal-overlay" onClick={() => setShowParentsModal(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <h3>Parents / Guardians</h3>
            {parents.length === 0 ? <p style={{ color: 'var(--sa-text-3)', margin: '16px 0' }}>No parents linked</p> : (
              <table className="sa-table" style={{ margin: '12px 0' }}>
                <thead><tr><th>Name</th><th>Relationship</th><th>Phone</th><th>Email</th></tr></thead>
                <tbody>
                  {parents.map((pa, i) => (
                    <tr key={i}>
                      <td>{pa.first_name} {pa.last_name}</td>
                      <td>{pa.StudentParent?.relationship || 'guardian'}</td>
                      <td>{pa.phone || '—'}</td>
                      <td>{pa.email || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="sa-btn sa-btn--ghost" onClick={() => setShowParentsModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {deleting && (
        <div className="sa-modal-overlay" onClick={() => setDeleting(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete this student?</h3>
            <p style={{ color: 'var(--sa-text-3)', margin: '8px 0 20px' }}>This will also remove their login access.</p>
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

const basicFields = [
  { key: 'first_name', label: 'First Name', type: 'text', required: true },
  { key: 'last_name', label: 'Last Name', type: 'text', required: true },
  { key: 'email', label: 'Email', type: 'text' },
  { key: 'username', label: 'Username', type: 'text', placeholder: 'auto-generated' },
  { key: 'password', label: 'Password', type: 'text', placeholder: 'default: Student@123' },
  { key: 'admission_number', label: 'Admission #', type: 'text' },
  { key: 'admission_date', label: 'Admission Date', type: 'date' },
  { key: 'date_of_birth', label: 'DOB', type: 'date' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
  { key: 'student_type', label: 'Student Type', type: 'select', options: ['regular', 'boarding', 'day', 'special'] },
  { key: 'fee_category', label: 'Fee Category', type: 'text' },
  { key: 'school_id', label: 'School ID', type: 'number', required: true },
  { key: 'classroom_id', label: 'Classroom ID', type: 'number' },
  { key: 'academic_year_id', label: 'Academic Year ID', type: 'number' },
  { key: 'place_of_birth', label: 'Place of Birth', type: 'text' },
  { key: 'nationality', label: 'Nationality', type: 'text' },
  { key: 'religion', label: 'Religion', type: 'text' },
  { key: 'home_language', label: 'Home Language', type: 'text' },
  { key: 'home_address', label: 'Home Address', type: 'text' },
  { key: 'city', label: 'City', type: 'text' },
  { key: 'phone_number', label: 'Phone', type: 'text' },
  { key: 'blood_type', label: 'Blood Type', type: 'text' },
  { key: 'vaccinations', label: 'Vaccinations (JSON)', type: 'text' },
  { key: 'is_critical_medical', label: 'Critical Medical?', type: 'select', options: ['true', 'false'] },
  { key: 'sen_tier', label: 'SEN Tier', type: 'text' },
  { key: 'sen_iep', label: 'SEN IEP?', type: 'select', options: ['true', 'false'] },
];
const emergencyFields = [
  { key: 'emergency_name', label: 'Emergency Contact Name', type: 'text' },
  { key: 'emergency_relationship', label: 'Emergency Relationship', type: 'text' },
  { key: 'emergency_phone', label: 'Emergency Phone', type: 'text' },
  { key: 'emergency_address', label: 'Emergency Address', type: 'text' },
  { key: 'doctor_name', label: 'Doctor Name', type: 'text' },
  { key: 'doctor_phone', label: 'Doctor Phone', type: 'text' },
  { key: 'allergies', label: 'Allergies', type: 'text' },
  { key: 'medical_notes', label: 'Medical Notes', type: 'text' },
  { key: 'sen_notes', label: 'SEN Notes', type: 'text' },
  { key: 'disciplinary_history', label: 'Disciplinary History?', type: 'select', options: ['true', 'false'] },
  { key: 'disciplinary_notes', label: 'Disciplinary Notes', type: 'text' },
];
const documentFields = [
  { key: 'documents_birth_certificate', label: 'Birth Certificate?', type: 'select', options: ['true', 'false'] },
  { key: 'documents_passport_photo', label: 'Passport Photo?', type: 'select', options: ['true', 'false'] },
  { key: 'documents_previous_school_report', label: 'Prev School Report?', type: 'select', options: ['true', 'false'] },
  { key: 'documents_transfer_letter', label: 'Transfer Letter?', type: 'select', options: ['true', 'false'] },
  { key: 'documents_medical_report', label: 'Medical Report?', type: 'select', options: ['true', 'false'] },
  { key: 'documents_other', label: 'Other Documents?', type: 'select', options: ['true', 'false'] },
];
const parentFields = [
  { key: 'father_name', label: 'Father Name', type: 'text' },
  { key: 'father_phone', label: 'Father Phone', type: 'text' },
  { key: 'father_email', label: 'Father Email', type: 'text' },
  { key: 'father_occupation', label: 'Father Occupation', type: 'text' },
  { key: 'father_address', label: 'Father Address', type: 'text' },
  { key: 'father_username', label: 'Father Username', type: 'text', placeholder: 'auto-generated' },
  { key: 'father_password', label: 'Father Password', type: 'text', placeholder: 'default: Parent@123' },
  { key: 'mother_name', label: 'Mother Name', type: 'text' },
  { key: 'mother_phone', label: 'Mother Phone', type: 'text' },
  { key: 'mother_email', label: 'Mother Email', type: 'text' },
  { key: 'mother_occupation', label: 'Mother Occupation', type: 'text' },
  { key: 'mother_address', label: 'Mother Address', type: 'text' },
  { key: 'mother_username', label: 'Mother Username', type: 'text', placeholder: 'auto-generated' },
  { key: 'mother_password', label: 'Mother Password', type: 'text', placeholder: 'default: Parent@123' },
  { key: 'mother_whatsapp', label: 'Mother WhatsApp?', type: 'select', options: ['true', 'false'] },
  { key: 'father_whatsapp', label: 'Father WhatsApp?', type: 'select', options: ['true', 'false'] },
  { key: 'mother_relationship', label: 'Mother Relationship', type: 'text' },
];

function StudentForm({ editItem, onSave, onClose }) {
  const [form, setForm] = useState({});
  const [file, setFile] = useState(null);
  const [tab, setTab] = useState('basic');
  useEffect(() => {
    if (editItem) {
      const f = {};
      [...basicFields, ...emergencyFields, ...documentFields, ...parentFields].forEach(({ key }) => { f[key] = editItem[key] !== undefined && editItem[key] !== null ? String(editItem[key]) : ''; });
      setForm(f);
    }
  }, [editItem]);
  function set(k, v) { setForm(p => ({ ...p, [k]: v })); }
  function renderFields(fields) {
    return fields.map(f => (
      <div key={f.key} className="sa-field">
        <label>{f.label}{f.required ? ' *' : ''}</label>
        {f.options ? (
          <select value={form[f.key] !== undefined ? form[f.key] : ''} onChange={e => set(f.key, e.target.value)} required={f.required}>
            <option value="">Select</option>
            {f.options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : f.type === 'date' ? (
          <input type="date" value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} />
        ) : f.type === 'number' ? (
          <input type="number" value={form[f.key] || ''} onChange={e => set(f.key, Number(e.target.value) || '')} />
        ) : (
          <input type="text" value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder || ''} />
        )}
      </div>
    ));
  }
  return (
    <div className="sa-modal-overlay" onClick={onClose}>
      <div className="sa-modal sa-modal--lg" onClick={e => e.stopPropagation()}>
        <h3>{editItem ? 'Edit Student' : 'Register Student'}</h3>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {['basic', 'emergency', 'documents', 'parents'].map(t => (
            <button key={t} className={`sa-btn sa-btn--sm ${tab === t ? 'sa-btn--primary' : 'sa-btn--ghost'}`} onClick={() => setTab(t)}>
              {t === 'basic' ? 'Basic Info' : t === 'emergency' ? 'Medical & Emergency' : t === 'documents' ? 'Documents' : 'Parents'}
            </button>
          ))}
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave({ ...form, _file: file }); }}>
          <div className="sa-modal-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {tab === 'basic' && renderFields(basicFields)}
              {tab === 'emergency' && renderFields(emergencyFields)}
              {tab === 'documents' && renderFields(documentFields)}
              {tab === 'parents' && renderFields(parentFields)}
              {tab === 'basic' && (
                <div className="sa-field">
                  <label>Passport Photo</label>
                  <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0] || null)} />
                </div>
              )}
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
