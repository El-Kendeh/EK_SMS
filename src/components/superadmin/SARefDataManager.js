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

const apiGet    = (p)    => apiCall('GET',    p);
const apiPost   = (p, b) => apiCall('POST',   p, b);
const apiPut    = (p, b) => apiCall('PUT',    p, b);
const apiPatch  = (p)    => apiCall('PATCH',  p, {});
const apiDelete = (p)    => apiCall('DELETE', p);

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Year-mode helpers (only active when hasHero=true)                  */
/* ------------------------------------------------------------------ */
function calcDuration(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const s = new Date(startIso), e = new Date(endIso);
  const totalMonths = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  if (totalMonths <= 0) return null;
  const yrs = Math.floor(totalMonths / 12);
  const mos = totalMonths % 12;
  if (yrs && mos) return `${yrs}yr ${mos}mo`;
  if (yrs) return `${yrs} yr`;
  return `${mos} mo`;
}

function yearProgressPct(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  const now = Date.now();
  const s   = new Date(startIso).getTime();
  const e   = new Date(endIso).getTime();
  if (e <= s) return 0;
  return Math.min(100, Math.max(0, ((now - s) / (e - s)) * 100));
}

function daysLabel(startIso, endIso) {
  if (!startIso || !endIso) return '';
  const now = Date.now();
  const s   = new Date(startIso).getTime();
  const e   = new Date(endIso).getTime();
  if (now < s) {
    const d = Math.ceil((s - now) / 86400000);
    return `Starts in ${d} day${d !== 1 ? 's' : ''}`;
  }
  if (now > e) return 'Completed';
  const d = Math.ceil((e - now) / 86400000);
  return `${d} day${d !== 1 ? 's' : ''} remaining`;
}

function calcDaysDiff(startIso, endIso) {
  if (!startIso || !endIso) return 0;
  return Math.max(0, Math.round((new Date(endIso) - new Date(startIso)) / 86400000));
}

function getYearPresets() {
  const today = new Date();
  const acadStartYear = today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
  return [0, 1, 2].map(i => {
    const s = acadStartYear + i, e = s + 1;
    return {
      label: i === 0 ? 'This Year' : i === 1 ? 'Next Year' : 'Year After',
      name:  `${s}/${e}`,
      start: `${s}-09-01`,
      end:   `${e}-08-31`,
    };
  });
}

/* ------------------------------------------------------------------ */
/*  Icons                                                               */
/* ------------------------------------------------------------------ */
const IcPlus      = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcEdit      = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcTrash     = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const IcCheck     = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcX         = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcSpinner   = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="sard-spin"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>;
const IcWarn      = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcRocket    = () => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l.09-.09a2 2 0 00-3-3L4.5 16.5z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>;
const IcChevron   = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IcToggleOn  = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="16" cy="12" r="3" fill="currentColor"/></svg>;
const IcToggleOff = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="22" height="14" rx="7"/><circle cx="8" cy="12" r="3" fill="currentColor"/></svg>;
const IcCalendar  = () => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcLayers    = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IcClock     = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/*                                                                      */
/*  Props:                                                              */
/*    title          – page heading                                     */
/*    subtitle       – description text                                 */
/*    endpoint       – base API path                                    */
/*    listKey        – key in GET response                              */
/*    itemLabel      – singular noun                                    */
/*    fields         – array of field config objects                    */
/*    hasRollout     – show Roll Out button + confirmation modal        */
/*    hasHero        – show active-year hero banner + stats row         */
/*    heroStartField – field key for start date (default: start_date)  */
/*    heroEndField   – field key for end date   (default: end_date)    */
/*    hasOverlapCheck – warn when date ranges overlap an existing row   */
/* ------------------------------------------------------------------ */
export default function SARefDataManager({
  title,
  subtitle,
  endpoint,
  listKey,
  itemLabel,
  fields = [],
  hasRollout     = false,
  hasHero        = false,
  heroStartField = 'start_date',
  heroEndField   = 'end_date',
  hasOverlapCheck = false,
}) {
  const [items,         setItems]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [loadErr,       setLoadErr]       = useState('');

  const [creating,      setCreating]      = useState(false);
  const [editId,        setEditId]        = useState(null);
  const [formData,      setFormData]      = useState({});
  const [saving,        setSaving]        = useState(false);
  const [saveErr,       setSaveErr]       = useState('');

  const [deleteId,      setDeleteId]      = useState(null);
  const [deleting,      setDeleting]      = useState(false);
  const [togglingId,    setTogglingId]    = useState(null);
  const [rollingId,     setRollingId]     = useState(null);
  const [rolloutTarget, setRolloutTarget] = useState(null);
  const [suggestedEnd,  setSuggestedEnd]  = useState('');

  const [fkOptions,     setFkOptions]     = useState({});
  const [actionErr,     setActionErr]     = useState('');
  const [query,         setQuery]         = useState('');

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

  /* ── Overlap detection ── */
  const checkOverlap = useCallback((startVal, endVal) => {
    if (!hasOverlapCheck || !startVal || !endVal) return false;
    const nS = new Date(startVal).getTime();
    const nE = new Date(endVal).getTime();
    if (isNaN(nS) || isNaN(nE) || nE <= nS) return false;
    return items.some(i => {
      if (i.id === editId) return false;
      if (!i[heroStartField] || !i[heroEndField]) return false;
      const iS = new Date(i[heroStartField]).getTime();
      const iE = new Date(i[heroEndField]).getTime();
      return nS < iE && nE > iS;
    });
  }, [hasOverlapCheck, items, editId, heroStartField, heroEndField]);

  const hasDateOverlap  = checkOverlap(formData[heroStartField], formData[heroEndField]);
  const hasDatesFlipped = hasHero
    && !!formData[heroStartField] && !!formData[heroEndField]
    && new Date(formData[heroStartField]) >= new Date(formData[heroEndField]);

  /* ── Form helpers ── */
  const emptyForm  = () => fields.reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
  const openCreate = () => { setCreating(true); setEditId(null); setFormData(emptyForm()); setSaveErr(''); setSuggestedEnd(''); };
  const openEdit   = (item) => {
    setEditId(item.id);
    setCreating(false);
    setFormData(fields.reduce((acc, f) => ({ ...acc, [f.key]: item[f.key] ?? '' }), {}));
    setSaveErr('');
    setSuggestedEnd('');
  };
  const cancelForm = () => { setCreating(false); setEditId(null); setFormData({}); setSaveErr(''); setSuggestedEnd(''); };

  const handleFormChange = (key, value) => {
    const resets = fields
      .filter(f => f.dependsOn === key)
      .reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
    const next = { ...formData, [key]: value, ...resets };

    if (hasHero) {
      // Auto-suggest end date (start + 1 year − 1 day) when start is picked
      if (key === heroStartField && value) {
        const d = new Date(value);
        d.setFullYear(d.getFullYear() + 1);
        d.setDate(d.getDate() - 1);
        setSuggestedEnd(d.toISOString().split('T')[0]);
      }
      // Clear suggestion once end date is manually set
      if (key === heroEndField) setSuggestedEnd('');

      // Auto-fill name from years when name is still empty
      if (key === heroStartField || key === heroEndField) {
        const s = next[heroStartField], e = next[heroEndField];
        if (s && e && !next.name) {
          const sy = new Date(s).getFullYear(), ey = new Date(e).getFullYear();
          if (ey > sy) next.name = `${sy}/${ey}`;
        }
      }
    }

    setFormData(next);
  };

  const isValid = fields.every(f => !f.required || String(formData[f.key] ?? '').trim() !== '');

  /* ── Save ── */
  const handleSave = async () => {
    if (!isValid || hasDateOverlap || hasDatesFlipped) return;
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

  /* ── Roll Out (fires after modal confirmation) ── */
  const handleRollout = async () => {
    if (!rolloutTarget) return;
    const target = rolloutTarget;
    setRollingId(target.id); setActionErr('');
    setRolloutTarget(null);
    try {
      const data = await apiPost(`${endpoint}${target.id}/rollout/`, {});
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
    const val    = String(formData[f.key] ?? '');
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

    const showSuggest = hasHero && f.key === heroEndField && suggestedEnd && !val;
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
        {showSuggest && (
          <button
            type="button"
            className="sard-suggest-pill"
            onClick={() => handleFormChange(heroEndField, suggestedEnd)}
          >
            ↗ {fmtDate(suggestedEnd)}
          </button>
        )}
      </div>
    );
  };

  /* ── Inline form (create + edit) ── */
  const renderForm = (isEdit) => {
    const fStart      = formData[heroStartField];
    const fEnd        = formData[heroEndField];
    const previewDays  = hasHero && !hasDatesFlipped ? calcDaysDiff(fStart, fEnd) : 0;
    const previewDur   = hasHero && !hasDatesFlipped ? calcDuration(fStart, fEnd)  : null;
    const saveBlocked  = !isValid || saving || hasDateOverlap || hasDatesFlipped;

    return (
      <div className="sard-form">

        {/* Year presets — create mode only */}
        {hasHero && !isEdit && (
          <div className="sard-presets">
            {getYearPresets().map(p => (
              <button
                key={p.label}
                type="button"
                className="sard-preset-btn"
                onClick={() => {
                  setSuggestedEnd('');
                  setFormData(prev => ({
                    ...prev,
                    name:            prev.name || p.name,
                    [heroStartField]: p.start,
                    [heroEndField]:   p.end,
                  }));
                }}
              >
                <span className="sard-preset-label">{p.label}</span>
                <span className="sard-preset-year">{p.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className={`sard-form-grid sard-form-grid--${Math.min(fields.length, 3)}`}>
          {fields.map(renderField)}
        </div>

        {/* Live duration preview */}
        {hasHero && (hasDatesFlipped || (fStart && fEnd && previewDur)) && (
          <div className={`sard-dur-preview${hasDatesFlipped ? ' sard-dur-preview--warn' : ''}`}>
            {hasDatesFlipped
              ? <><IcWarn /><span>End date must be after start date</span></>
              : <><IcCalendar /><span>{previewDays} days · {previewDur}</span></>
            }
          </div>
        )}

        {hasDateOverlap && (
          <div className="sard-overlap-warn">
            <IcWarn />
            <span>Date range overlaps an existing {itemLabel}. Adjust the dates before saving.</span>
          </div>
        )}
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
            className={`sard-btn sard-btn--save${saveBlocked ? ' sard-btn--disabled' : ''}`}
            onClick={handleSave}
            disabled={saveBlocked}
          >
            {saving ? <><IcSpinner /> Saving…</> : <><IcCheck /> {isEdit ? 'Update' : 'Add'}</>}
          </button>
        </div>
      </div>
    );
  };

  /* ── Hero Banner ── */
  const activeItem = hasHero ? items.find(i => i.is_active) : null;

  const renderHero = () => {
    if (!activeItem) {
      return (
        <div className="sard-hero sard-hero--empty">
          <span className="sard-hero-eyebrow">Active Year</span>
          <div className="sard-hero-name sard-hero-name--dim">No active year</div>
          <p className="sard-hero-no-active">Roll out a year below to activate it across all schools.</p>
        </div>
      );
    }
    const pct   = yearProgressPct(activeItem[heroStartField], activeItem[heroEndField]);
    const dur   = calcDuration(activeItem[heroStartField], activeItem[heroEndField]);
    const label = daysLabel(activeItem[heroStartField], activeItem[heroEndField]);
    return (
      <div className="sard-hero">
        <div className="sard-hero-glow" />
        <div className="sard-hero-left">
          <span className="sard-hero-eyebrow">
            <span className="sard-hero-pulse" />
            Active Year
          </span>
          <div className="sard-hero-name">{activeItem.name || '—'}</div>
          <div className="sard-hero-dates">
            <IcCalendar />
            <span>{fmtDate(activeItem[heroStartField])} — {fmtDate(activeItem[heroEndField])}</span>
            {dur && <span className="sard-hero-dur">{dur}</span>}
          </div>
        </div>
        <div className="sard-hero-right">
          <div className="sard-hero-ring">
            <svg viewBox="0 0 64 64" className="sard-hero-ring-svg">
              <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="4" className="sard-ring-track" />
              <circle
                cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="4"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`}
                strokeLinecap="round"
                className="sard-ring-fill"
                transform="rotate(-90 32 32)"
              />
            </svg>
            <div className="sard-ring-label">
              <div className="sard-ring-pct">{Math.round(pct)}%</div>
            </div>
          </div>
          <div className="sard-hero-days">{label}</div>
        </div>
      </div>
    );
  };

  /* ── Stats Row ── */
  const renderStats = () => {
    if (!hasHero || items.length === 0) return null;
    const today    = new Date();
    const active   = items.find(i => i.is_active);
    const upcoming = items.filter(i => !i.is_active && i[heroStartField] && new Date(i[heroStartField]) > today);
    return (
      <div className="sard-stats">
        <div className="sard-stat-chip">
          <span className="sard-stat-icon"><IcLayers /></span>
          <div>
            <div className="sard-stat-val">{items.length}</div>
            <div className="sard-stat-key">Total Years</div>
          </div>
        </div>
        <div className="sard-stat-chip sard-stat-chip--green">
          <span className="sard-stat-icon sard-stat-icon--green"><IcCheck /></span>
          <div>
            <div className="sard-stat-val">{active ? active.name : '—'}</div>
            <div className="sard-stat-key">Active Now</div>
          </div>
        </div>
        <div className="sard-stat-chip sard-stat-chip--amber">
          <span className="sard-stat-icon sard-stat-icon--amber"><IcClock /></span>
          <div>
            <div className="sard-stat-val">{upcoming.length}</div>
            <div className="sard-stat-key">Upcoming</div>
          </div>
        </div>
      </div>
    );
  };

  /* ── Rollout Confirmation Modal ── */
  const renderRolloutModal = () => {
    if (!rolloutTarget) return null;
    const currentActive = items.find(i => i.is_active);
    return (
      <div className="sard-modal-overlay" onClick={() => !rollingId && setRolloutTarget(null)}>
        <div className="sard-modal" onClick={e => e.stopPropagation()}>
          <div className="sard-modal-rocket"><IcRocket /></div>
          <div className="sard-modal-title">Roll out {rolloutTarget.name}?</div>
          <div className="sard-modal-body">
            {currentActive ? (
              <>
                This will activate <strong>{rolloutTarget.name}</strong> and deactivate{' '}
                <strong>{currentActive.name}</strong> across all schools. This takes effect immediately.
              </>
            ) : (
              <>
                This will activate <strong>{rolloutTarget.name}</strong> as the system-wide academic year for all schools.
              </>
            )}
          </div>
          <div className="sard-modal-actions">
            <button
              className="sard-btn sard-btn--ghost"
              onClick={() => setRolloutTarget(null)}
              disabled={!!rollingId}
            >
              <IcX /> Cancel
            </button>
            <button
              className="sard-btn sard-btn--rollout-confirm"
              onClick={handleRollout}
              disabled={!!rollingId}
            >
              {rollingId ? <><IcSpinner /> Rolling out…</> : <><IcRocket /> Confirm Roll Out</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ── Search filter (client-side, across all configured fields) ── */
  const q = query.trim().toLowerCase();
  const visibleItems = q
    ? items.filter(i =>
        fields.some(f => String(displayVal(i, f)).toLowerCase().includes(q)))
    : items;

  /* ── Render ── */
  return (
    <div className="sard-wrap">

      {renderRolloutModal()}

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

      {/* Hero banner + stats — only when items exist to avoid clashing with empty state */}
      {hasHero && !loading && !loadErr && items.length > 0 && renderHero()}
      {hasHero && !loading && !loadErr && items.length > 0 && renderStats()}

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
          <button className="sard-icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setActionErr('')}><IcX /></button>
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

        {!loading && !loadErr && items.length > 3 && (
          <div className="sard-search-bar">
            <input
              className="sard-input sard-input--search"
              type="search"
              placeholder={`Search ${title.toLowerCase()}…`}
              value={query}
              onChange={e => setQuery(e.target.value)}
              aria-label={`Search ${title}`}
            />
            {q && (
              <span className="sard-search-count">
                {visibleItems.length} of {items.length}
              </span>
            )}
          </div>
        )}

        {!loading && items.length > 0 && visibleItems.length === 0 && (
          <p className="sard-empty">No {itemLabel} matches “{query}”.</p>
        )}

        {!loading && visibleItems.length > 0 && (
          <div className="sard-table">
            {/* Header */}
            <div className="sard-thead" style={{ '--data-cols': fields.length }}>
              {fields.map(f => <span key={f.key} className="sard-th">{f.label.toUpperCase()}</span>)}
              <span className="sard-th">STATUS</span>
              <span className="sard-th sard-th--date">ADDED</span>
              <span className="sard-th sard-th--actions">ACTIONS</span>
            </div>

            {/* Rows */}
            {visibleItems.map(item => (
              <div
                key={item.id}
                className={[
                  'sard-tr',
                  editId === item.id                ? 'sard-tr--editing' : '',
                  hasHero && item.is_active         ? 'sard-tr--active'  : '',
                ].filter(Boolean).join(' ')}
                style={{ '--data-cols': fields.length }}
              >
                {editId === item.id ? (
                  <div className="sard-tr-form">{renderForm(true)}</div>
                ) : (
                  <>
                    {fields.map(f => (
                      <span key={f.key} className="sard-td">{displayVal(item, f)}</span>
                    ))}

                    {/* Status cell — flex column only when hasHero (to fit duration badge) */}
                    <span className={`sard-td${hasHero ? ' sard-td--status' : ''}`}>
                      <span className={`sard-status${item.is_active ? ' sard-status--on' : ' sard-status--off'}`}>
                        <span className="sard-status-dot" />
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {hasHero && (() => {
                        const dur = calcDuration(item[heroStartField], item[heroEndField]);
                        return dur ? <span className="sard-duration">{dur}</span> : null;
                      })()}
                    </span>

                    <span className="sard-td sard-td--date">{fmtDate(item.created_at)}</span>

                    <span className="sard-td sard-td--actions">
                      {hasRollout && !item.is_active && (
                        <button
                          className="sard-rollout-btn"
                          title="Roll out — set as active"
                          onClick={() => setRolloutTarget(item)}
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
