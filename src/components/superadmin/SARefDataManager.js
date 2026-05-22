import React, { useState, useEffect, useCallback } from 'react';
import './SARefDataManager.css';

/* ------------------------------------------------------------------ */
/*  API helpers                                                         */
/* ------------------------------------------------------------------ */
const NODE_URL = (
  process.env.REACT_APP_NODE_API_URL ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '');

function getToken() {
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
}

async function apiCall(method, path, body) {
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
    },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  };
  const res = await fetch(`${NODE_URL}${path}`, opts);
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const d = await res.json(); msg = d.message || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

const apiGet    = (p)       => apiCall('GET',    p);
const apiPost   = (p, b)    => apiCall('POST',   p, b);
const apiPut    = (p, b)    => apiCall('PUT',    p, b);
const apiPatch  = (p)       => apiCall('PATCH',  p, {});
const apiDelete = (p)       => apiCall('DELETE', p);

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Icons                                                               */
/* ------------------------------------------------------------------ */
const IcPlus    = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcEdit    = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcTrash   = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const IcCheck   = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcX       = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcSpinner = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="sard-spin"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>;
const IcWarn    = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcRocket  = () => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l.09-.09a2 2 0 00-3-3L4.5 16.5z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>;
const IcChevron = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IcToggleOn  = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="16" cy="12" r="3" fill="currentColor"/></svg>;
const IcToggleOff = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="8" cy="12" r="3" fill="currentColor"/></svg>;

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/*                                                                      */
/*  Props:                                                              */
/*    title       – page heading                                        */
/*    subtitle    – description text                                    */
/*    endpoint    – base API path, e.g. '/api/superadmin/countries/'   */
/*    listKey     – key in GET response, e.g. 'countries'              */
/*    itemLabel   – singular noun, e.g. 'country'                      */
/*    fields      – array of field config objects (see below)          */
/*    hasRollout  – show Roll Out button on inactive rows               */
/*                                                                      */
/*  Field config object:                                                */
/*    { key, label, type, required, placeholder,                        */
/*      loadFrom, optionsKey, labelKey,                                 */
/*      dependsOn, dependsOnKey }                                       */
/* ------------------------------------------------------------------ */
export default function SARefDataManager({
  title,
  subtitle,
  endpoint,
  listKey,
  itemLabel,
  fields = [],
  hasRollout = false,
}) {
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [loadErr,    setLoadErr]    = useState('');

  const [creating,   setCreating]   = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [formData,   setFormData]   = useState({});
  const [saving,     setSaving]     = useState(false);
  const [saveErr,    setSaveErr]    = useState('');

  const [deleteId,   setDeleteId]   = useState(null);
  const [deleting,   setDeleting]   = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [rollingId,  setRollingId]  = useState(null);

  const [fkOptions,  setFkOptions]  = useState({});
  const [actionErr,  setActionErr]  = useState('');

  /* ── Load list ── */
  const loadItems = useCallback(async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const data = await apiGet(endpoint);
      if (data.success) setItems(data[listKey] || []);
      else setLoadErr(data.message || 'Failed to load.');
    } catch (err) {
      setLoadErr(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  }, [endpoint, listKey]);

  useEffect(() => { loadItems(); }, [loadItems]);

  /* ── Load FK options ── */
  useEffect(() => {
    fields
      .filter(f => f.type === 'select' && f.loadFrom)
      .forEach(async f => {
        try {
          const data = await apiGet(f.loadFrom);
          if (data.success) setFkOptions(prev => ({ ...prev, [f.key]: data[f.optionsKey] || [] }));
        } catch {}
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Form helpers ── */
  const emptyForm = () => fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});

  const openCreate = () => { setCreating(true); setEditId(null); setFormData(emptyForm()); setSaveErr(''); };
  const openEdit   = (item) => {
    setEditId(item.id);
    setCreating(false);
    setFormData(fields.reduce((acc, f) => ({ ...acc, [f.key]: item[f.key] ?? '' }), {}));
    setSaveErr('');
  };
  const cancelForm = () => { setCreating(false); setEditId(null); setFormData({}); setSaveErr(''); };

  const handleFormChange = (key, value) => {
    const resets = fields
      .filter(f => f.dependsOn === key)
      .reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
    setFormData(prev => ({ ...prev, [key]: value, ...resets }));
  };

  const isValid = fields.every(f => !f.required || String(formData[f.key] ?? '').trim() !== '');

  /* ── Save ── */
  const handleSave = async () => {
    if (!isValid) return;
    setSaving(true); setSaveErr('');
    try {
      const payload = fields.reduce((acc, f) => {
        const v = formData[f.key];
        if (v !== '' && v !== undefined && v !== null)
          acc[f.key] = f.type === 'number' ? Number(v) : v;
        return acc;
      }, {});
      const data = editId
        ? await apiPut(`${endpoint}${editId}/`, payload)
        : await apiPost(endpoint, payload);
      if (!data.success) { setSaveErr(data.message || 'Save failed.'); return; }
      await loadItems();
      cancelForm();
    } catch (err) {
      setSaveErr(err.message || 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Toggle ── */
  const handleToggle = async (item) => {
    setTogglingId(item.id); setActionErr('');
    try {
      const data = await apiPatch(`${endpoint}${item.id}/toggle/`);
      if (data.success) setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i));
      else setActionErr(data.message || 'Toggle failed.');
    } catch (err) {
      setActionErr(err.message || 'Network error.');
    } finally { setTogglingId(null); }
  };

  /* ── Delete ── */
  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true); setActionErr('');
    try {
      await apiDelete(`${endpoint}${deleteId}/`);
      setItems(prev => prev.filter(i => i.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setActionErr(err.message || 'Delete failed.');
      setDeleteId(null);
    } finally { setDeleting(false); }
  };

  /* ── Roll Out ── */
  const handleRollout = async (item) => {
    setRollingId(item.id); setActionErr('');
    try {
      const data = await apiPost(`${endpoint}${item.id}/rollout/`, {});
      if (data.success) await loadItems();
      else setActionErr(data.message || 'Roll out failed.');
    } catch (err) {
      setActionErr(err.message || 'Network error.');
    } finally { setRollingId(null); }
  };

  /* ── Options (with cascading filter) ── */
  const getOptions = (field) => {
    const all = fkOptions[field.key] || [];
    if (!field.dependsOn) return all;
    const parentVal = String(formData[field.dependsOn] || '');
    if (!parentVal) return [];
    return all.filter(o => String(o[field.dependsOnKey]) === parentVal);
  };

  /* ── Display value for list row ── */
  const displayVal = (item, f) => {
    if (f.type === 'select') return item[f.key.replace(/_id$/, '_name')] || '—';
    if (f.type === 'date')   return fmtDate(item[f.key]);
    const v = item[f.key];
    return (v !== undefined && v !== null && v !== '') ? String(v) : '—';
  };

  /* ── Field renderer ── */
  const renderField = (f) => {
    const val = String(formData[f.key] ?? '');
    const errCls = f.required && val.trim() === '' ? ' sard-input--err' : '';

    if (f.type === 'select') {
      const opts   = getOptions(f);
      const locked = !!f.dependsOn && !formData[f.dependsOn];
      const parent = f.dependsOn ? fields.find(x => x.key === f.dependsOn) : null;
      return (
        <div key={f.key} className="sard-field">
          <label className="sard-label">{f.label.toUpperCase()}</label>
          <div className="sard-sel-wrap">
            <select
              className={`sard-select${errCls}`}
              value={val}
              disabled={locked}
              onChange={e => handleFormChange(f.key, e.target.value)}
            >
              <option value="">
                {locked ? `Select ${parent?.label?.toLowerCase() || 'parent'} first…` : `Select ${f.label.toLowerCase()}…`}
              </option>
              {opts.map(o => <option key={o.id} value={o.id}>{o[f.labelKey || 'name']}</option>)}
            </select>
            <span className="sard-sel-chevron"><IcChevron /></span>
          </div>
        </div>
      );
    }

    return (
      <div key={f.key} className="sard-field">
        <label className="sard-label">{f.label.toUpperCase()}</label>
        <input
          type={f.type || 'text'}
          className={`sard-input${errCls}`}
          placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}…`}
          value={val}
          onChange={e => handleFormChange(f.key, e.target.value)}
        />
      </div>
    );
  };

  /* ── Inline form (create + edit) ── */
  const renderForm = (isEdit) => (
    <div className="sard-form">
      <div className={`sard-form-grid sard-form-grid--${Math.min(fields.length, 3)}`}>
        {fields.map(renderField)}
      </div>
      {saveErr && (
        <div className="sard-err-banner">
          <IcWarn /><span>{saveErr}</span>
        </div>
      )}
      <div className="sard-form-btns">
        <button className="sard-btn sard-btn--ghost" onClick={cancelForm} disabled={saving}>
          <IcX /> Cancel
        </button>
        <button
          className={`sard-btn sard-btn--save${!isValid || saving ? ' sard-btn--disabled' : ''}`}
          onClick={handleSave}
          disabled={!isValid || saving}
        >
          {saving ? <><IcSpinner /> Saving…</> : <><IcCheck /> {isEdit ? 'Update' : 'Add'}</>}
        </button>
      </div>
    </div>
  );

  /* ── Render ── */
  return (
    <div className="sard-wrap">

      {/* Page header */}
      <div className="sard-page-head">
        <div>
          <h1 className="sard-page-title">{title}</h1>
          {subtitle && <p className="sard-page-sub">{subtitle}</p>}
        </div>
        {!creating && (
          <button className="sard-btn sard-btn--primary" onClick={openCreate}>
            <IcPlus /> Add {itemLabel}
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <div className="sard-card sard-card--form">
          <p className="sard-section-label">NEW {itemLabel.toUpperCase()}</p>
          {renderForm(false)}
        </div>
      )}

      {/* Action error banner */}
      {actionErr && (
        <div className="sard-err-banner" style={{ marginBottom: 12 }}>
          <IcWarn /><span>{actionErr}</span>
          <button
            className="sard-icon-btn"
            style={{ marginLeft: 'auto' }}
            onClick={() => setActionErr('')}
          ><IcX /></button>
        </div>
      )}

      {/* List */}
      <div className="sard-card">
        {loading && (
          <div className="sard-state"><IcSpinner /><span>Loading {title.toLowerCase()}…</span></div>
        )}
        {!loading && loadErr && (
          <div className="sard-state sard-state--err"><IcWarn /><span>{loadErr}</span></div>
        )}
        {!loading && !loadErr && items.length === 0 && (
          <p className="sard-empty">No {itemLabel}s yet — add one above to get started.</p>
        )}

        {!loading && items.length > 0 && (
          <div className="sard-table">
            {/* Header */}
            <div className="sard-thead" style={{ '--data-cols': fields.length }}>
              {fields.map(f => <span key={f.key} className="sard-th">{f.label.toUpperCase()}</span>)}
              <span className="sard-th">STATUS</span>
              <span className="sard-th sard-th--date">ADDED</span>
              <span className="sard-th sard-th--actions">ACTIONS</span>
            </div>

            {/* Rows */}
            {items.map(item => (
              <div
                key={item.id}
                className={`sard-tr${editId === item.id ? ' sard-tr--editing' : ''}`}
                style={{ '--data-cols': fields.length }}
              >
                {editId === item.id ? (
                  <div className="sard-tr-form">{renderForm(true)}</div>
                ) : (
                  <>
                    {fields.map(f => (
                      <span key={f.key} className="sard-td">{displayVal(item, f)}</span>
                    ))}

                    <span className="sard-td">
                      <span className={`sard-status${item.is_active ? ' sard-status--on' : ' sard-status--off'}`}>
                        <span className="sard-status-dot" />
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </span>

                    <span className="sard-td sard-td--date">{fmtDate(item.created_at)}</span>

                    <span className="sard-td sard-td--actions">
                      {hasRollout && !item.is_active && (
                        <button
                          className="sard-rollout-btn"
                          title="Roll out — set as active"
                          onClick={() => handleRollout(item)}
                          disabled={rollingId === item.id || !!togglingId}
                        >
                          {rollingId === item.id ? <IcSpinner /> : <IcRocket />}
                          <span>{rollingId === item.id ? 'Rolling…' : 'Roll Out'}</span>
                        </button>
                      )}

                      <button
                        className="sard-icon-btn"
                        title="Edit"
                        onClick={() => openEdit(item)}
                        disabled={!!togglingId || !!rollingId}
                      >
                        <IcEdit />
                      </button>

                      <button
                        className={`sard-icon-btn${item.is_active ? ' sard-icon-btn--toggle-on' : ''}`}
                        title={item.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => handleToggle(item)}
                        disabled={togglingId === item.id || !!rollingId}
                      >
                        {togglingId === item.id ? <IcSpinner /> : (item.is_active ? <IcToggleOn /> : <IcToggleOff />)}
                      </button>

                      {deleteId === item.id ? (
                        <span className="sard-del-confirm">
                          <span className="sard-del-label">Delete?</span>
                          <button className="sard-icon-btn sard-icon-btn--danger" onClick={handleDelete} disabled={deleting}>
                            {deleting ? <IcSpinner /> : <IcCheck />}
                          </button>
                          <button className="sard-icon-btn" onClick={() => setDeleteId(null)}><IcX /></button>
                        </span>
                      ) : (
                        <button
                          className="sard-icon-btn sard-icon-btn--danger"
                          title="Delete"
                          onClick={() => setDeleteId(item.id)}
                          disabled={!!togglingId || !!rollingId}
                        >
                          <IcTrash />
                        </button>
                      )}
                    </span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <p className="sard-count">{items.length} {itemLabel}{items.length !== 1 ? 's' : ''}</p>
      )}
    </div>
  );
}
