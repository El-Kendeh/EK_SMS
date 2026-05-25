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

export default function SAGradingSystem() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [toast, setToast] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const showToast = useCallback((msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); }, []);
  const load = useCallback(async () => {
    setLoading(true);
    try { const r = await req('GET', '/api/grading-systems/'); setList(r.gradingsystems || []); }
    catch (e) { showToast(e.message, 'error'); }
    setLoading(false);
  }, [showToast]);
  useEffect(() => { load(); }, [load]);

  async function handleSave(form) {
    try {
      if (editItem) { await req('PUT', `/api/grading-systems/${editItem.id}/`, form); showToast('Updated', 'success'); }
      else { await req('POST', '/api/grading-systems/', form); showToast('Created', 'success'); }
      setShowModal(false); setEditItem(null); load();
    } catch (e) { showToast(e.message, 'error'); }
  }
  async function handleToggle(item) { try { await req('PATCH', `/api/grading-systems/${item.id}/toggle/`); load(); } catch (e) { showToast(e.message, 'error'); } }
  async function handleDelete(item) { try { await req('DELETE', `/api/grading-systems/${item.id}/`); load(); setDeleting(null); } catch (e) { showToast(e.message, 'error'); } }

  return (
    <div className="sa-page">
      {toast && <div className={`sa-toast sa-toast--${toast.type}`}>{toast.msg}</div>}
      <div className="sa-page-head">
        <div>
          <h1 className="sa-page-title">Grading Systems</h1>
          <p className="sa-page-sub">Grading systems / score types used across schools</p>
        </div>
        <button className="sa-btn sa-btn--primary" onClick={() => { setEditItem(null); setShowModal(true); }}><IcPlus /> Add Grading System</button>
      </div>
      {loading ? <div className="sa-loading">Loading...</div> : (
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead><tr><th>ID</th><th>Grading System Name</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40, color: 'var(--sa-text-3)' }}>No grading systems found</td></tr>
              ) : list.map(p => (
                <tr key={p.id}>
                  <td><span className="sa-table-school-id">{p.id}</span></td>
                  <td><div className="sa-table-school-name">{p.name}</div></td>
                  <td>{p.is_active ? <span className="sa-badge sa-badge--approved">Active</span> : <span className="sa-badge sa-badge--inactive">Inactive</span>}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
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
      )}
      {showModal && (
        <div className="sa-modal-overlay" onClick={() => { setShowModal(false); setEditItem(null); }}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <h3>{editItem ? 'Edit Grading System' : 'Add Grading System'}</h3>
            <GradingSystemForm editItem={editItem} onSave={handleSave} onClose={() => { setShowModal(false); setEditItem(null); }} />
          </div>
        </div>
      )}
      {deleting && (
        <div className="sa-modal-overlay" onClick={() => setDeleting(null)}>
          <div className="sa-modal" onClick={e => e.stopPropagation()}>
            <h3>Delete this grading system?</h3>
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

function GradingSystemForm({ editItem, onSave, onClose }) {
  const [name, setName] = useState('');
  useEffect(() => { if (editItem) setName(editItem.name || ''); }, [editItem]);
  return (
    <form onSubmit={e => { e.preventDefault(); if (!name.trim()) return; onSave({ name: name.trim() }); }}>
      <div className="sa-modal-body">
        <div className="sa-field">
          <label>Grading System Name *</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Percentage, Letter Grade, GPA" autoFocus />
        </div>
      </div>
      <div className="sa-modal-footer">
        <button type="button" className="sa-btn sa-btn--ghost" onClick={onClose}>Cancel</button>
        <button type="submit" className="sa-btn sa-btn--primary" disabled={!name.trim()}>{editItem ? 'Update' : 'Create'}</button>
      </div>
    </form>
  );
}
