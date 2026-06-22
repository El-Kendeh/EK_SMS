import React, { useState, useEffect, useCallback, useId, useRef, useMemo } from 'react';
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
  let payload = null;
  try { payload = await res.json(); } catch {}
  if (!res.ok) {
    const err = new Error((payload && payload.message) || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = payload || {};
    throw err;
  }
  return payload || {};
}

const apiGet    = (p)    => apiCall('GET',    p);
const apiPost   = (p, b) => apiCall('POST',   p, b);
const apiPut    = (p, b) => apiCall('PUT',    p, b);
const apiPatch  = (p)    => apiCall('PATCH',  p, {});
const apiDelete = (p)    => apiCall('DELETE', p);
/* Feature-detecting GET — returns null instead of throwing (used for optional
   year-only endpoints so a partial backend never breaks the page). */
const apiGetSafe = async (p) => { try { return await apiGet(p); } catch { return null; } };

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

/* Configurable academic-year start month (8 = September, 0 = January, 3 = April). */
function getYearPresets(startMonth = 8) {
  const today = new Date();
  const acadStartYear = today.getMonth() >= startMonth ? today.getFullYear() : today.getFullYear() - 1;
  const mm = String(startMonth + 1).padStart(2, '0');
  // end = start + 1 year − 1 day
  return [0, 1, 2].map(i => {
    const sy = acadStartYear + i;
    const endD = new Date(sy + 1, startMonth, 0); // day 0 of next-start-month = last day prior
    const ey = endD.getFullYear();
    const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      label: i === 0 ? 'This Year' : i === 1 ? 'Next Year' : 'Year After',
      name:  `${sy}/${ey}`,
      start: `${sy}-${mm}-01`,
      end:   toIso(endD),
    };
  });
}

const START_MONTHS = [
  { value: 8, label: 'Sep' },
  { value: 0, label: 'Jan' },
  { value: 3, label: 'Apr' },
];

/* Add N months to an ISO date, returning YYYY-MM-DD (used by clone preview only). */

/* Status lifecycle (year mode). Falls back to is_active for non-year pages. */
function statusOf(item) {
  if (item.status) return item.status;
  return item.is_active ? 'active' : 'draft';
}
const STATUS_META = {
  draft:    { label: 'Draft',    cls: 'draft' },
  active:   { label: 'Active',   cls: 'on' },
  upcoming: { label: 'Upcoming', cls: 'amber' },
  closed:   { label: 'Closed',   cls: 'closed' },
  archived: { label: 'Archived', cls: 'off' },
};

/* ------------------------------------------------------------------ */
/*  Icons                                                               */
/* ------------------------------------------------------------------ */
const IcPlus      = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcEdit      = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcTrash     = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>;
const IcArchive   = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>;
const IcRestore   = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>;
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
const IcCopy      = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
const IcHistory   = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 106 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>;
const IcUsers     = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const IcLock      = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
const IcInfo      = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/*                                                                      */
/*  Props:                                                              */
/*    title, subtitle, endpoint, listKey, itemLabel, fields            */
/*    hasRollout      – show Roll Out button + confirmation modal       */
/*    hasHero         – YEAR MODE: hero, stats, presets, term counts,   */
/*                      status lifecycle, clone, timeline, adoption,    */
/*                      close-out, history, accessible cascade rollout  */
/*    heroStartField / heroEndField – date field keys                  */
/*    hasOverlapCheck – warn when date ranges overlap an existing row   */
/*    onToast(msg,type) – fire a dashboard toast on every mutation      */
/*    onAddTerms(year)  – deep-link to the Term page with year preset   */
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
  onToast,
  onAddTerms,
}) {
  const uid = useId();
  const fieldId = (key) => `${uid}-${key}`;

  const [items,         setItems]         = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [loadErr,       setLoadErr]       = useState('');

  const [creating,      setCreating]      = useState(false);
  const [editId,        setEditId]        = useState(null);
  const [formData,      setFormData]      = useState({});
  const [initialForm,   setInitialForm]   = useState({});
  const [saving,        setSaving]        = useState(false);
  const [saveErr,       setSaveErr]       = useState('');
  const [fieldErrors,   setFieldErrors]   = useState({});
  const [touched,       setTouched]       = useState({});
  const [submitTried,   setSubmitTried]   = useState(false);
  const [nameAuto,      setNameAuto]      = useState(false);
  const [discardConfirm,setDiscardConfirm]= useState(false);
  const [datelessConfirm,setDatelessConfirm]= useState(false);
  const [presetMonth,   setPresetMonth]   = useState(8);

  const [deleteId,      setDeleteId]      = useState(null);
  const [deleting,      setDeleting]      = useState(false);
  const [togglingId,    setTogglingId]    = useState(null);
  const [rollingId,     setRollingId]     = useState(null);
  const [rolloutTarget, setRolloutTarget] = useState(null);
  const [rolloutPreview,setRolloutPreview]= useState(null);
  const [previewLoading,setPreviewLoading]= useState(false);
  const [cascade,       setCascade]       = useState(false);
  const [suggestedEnd,  setSuggestedEnd]  = useState('');
  const [cloningId,     setCloningId]     = useState(null);
  const [restoringId,   setRestoringId]   = useState(null);
  const [closingId,     setClosingId]     = useState(null);

  const [statusFilter,  setStatusFilter]  = useState('all');
  const [adoption,      setAdoption]      = useState(null);
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyRows,   setHistoryRows]   = useState([]);
  const [historyLoading,setHistoryLoading]= useState(false);

  const [fkOptions,     setFkOptions]     = useState({});
  const [actionErr,     setActionErr]     = useState('');
  const [query,         setQuery]         = useState('');

  /* live-region announcement for async results (a11y) */
  const [liveMsg,       setLiveMsg]       = useState('');
  const announce = useCallback((m) => { setLiveMsg(''); requestAnimationFrame(() => setLiveMsg(m)); }, []);
  const toast = useCallback((m, type = 'success') => { announce(m); if (onToast) onToast(m, type); }, [announce, onToast]);

  /* focus management refs */
  const nameInputRef   = useRef(null);
  const rolloutTrigRef = useRef(null);
  const modalRef       = useRef(null);
  const confirmBtnRef  = useRef(null);

  /* ── Load list ── */
  const loadItems = useCallback(async () => {
    setLoading(true);
    setLoadErr('');
    try {
      const sep = endpoint.includes('?') ? '&' : '?';
      const data = await apiGet(hasHero ? `${endpoint}${sep}include_archived=1` : endpoint);
      if (data.success) setItems(data[listKey] || []);
      else setLoadErr(data.message || 'Failed to load.');
    } catch (err) {
      setLoadErr(err.message || 'Network error.');
    } finally {
      setLoading(false);
    }
  }, [endpoint, listKey, hasHero]);

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

  /* ── Active item + adoption (year mode) ── */
  const activeItem = useMemo(() => hasHero ? items.find(i => i.is_active) : null, [hasHero, items]);

  useEffect(() => {
    if (!hasHero || !activeItem) { setAdoption(null); return; }
    let alive = true;
    apiGetSafe(`${endpoint}${activeItem.id}/adoption/`).then(d => {
      if (alive && d && d.success) setAdoption(d.adoption);
    });
    return () => { alive = false; };
  }, [hasHero, activeItem, endpoint]);

  /* ── Overlap detection (client-side, instant) ── */
  const checkOverlap = useCallback((startVal, endVal) => {
    if (!hasOverlapCheck || !startVal || !endVal) return false;
    const nS = new Date(startVal).getTime();
    const nE = new Date(endVal).getTime();
    if (isNaN(nS) || isNaN(nE) || nE <= nS) return false;
    return items.some(i => {
      if (i.id === editId) return false;
      if (statusOf(i) === 'archived') return false;
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
  const resetFormState = () => {
    setSaveErr(''); setFieldErrors({}); setTouched({}); setSubmitTried(false);
    setSuggestedEnd(''); setNameAuto(false); setDiscardConfirm(false); setDatelessConfirm(false);
  };
  const openCreate = () => {
    const ef = emptyForm();
    setCreating(true); setEditId(null);
    setFormData(ef); setInitialForm(ef);
    resetFormState();
  };
  const openEdit   = (item) => {
    const next = fields.reduce((acc, f) => ({ ...acc, [f.key]: item[f.key] ?? '' }), {});
    setEditId(item.id); setCreating(false);
    setFormData(next); setInitialForm(next);
    resetFormState();
  };
  const reallyCancel = () => {
    setCreating(false); setEditId(null); setFormData({}); setInitialForm({});
    resetFormState();
    if (rolloutTrigRef.current) rolloutTrigRef.current = null;
  };
  const isDirty = useMemo(
    () => fields.some(f => String(formData[f.key] ?? '') !== String(initialForm[f.key] ?? '')),
    [fields, formData, initialForm]
  );
  const cancelForm = () => {
    if (isDirty) { setDiscardConfirm(true); return; }
    reallyCancel();
  };

  /* autofocus the first field when a form opens */
  useEffect(() => {
    if ((creating || editId !== null) && nameInputRef.current) {
      nameInputRef.current.focus();
      announce(editId !== null ? 'Editing form opened' : `New ${itemLabel} form`);
    }
  }, [creating, editId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFormChange = (key, value) => {
    const resets = fields
      .filter(f => f.dependsOn === key)
      .reduce((acc, f) => ({ ...acc, [f.key]: '' }), {});
    const next = { ...formData, [key]: value, ...resets };

    if (key === 'name') setNameAuto(false);

    if (hasHero) {
      if (key === heroStartField && value) {
        const d = new Date(value);
        d.setFullYear(d.getFullYear() + 1);
        d.setDate(d.getDate() - 1);
        setSuggestedEnd(d.toISOString().split('T')[0]);
      }
      if (key === heroEndField) setSuggestedEnd('');

      // Auto-fill / refresh name from year span when name is empty OR was auto-derived
      if (key === heroStartField || key === heroEndField) {
        const s = next[heroStartField], e = next[heroEndField];
        if (s && e) {
          const sy = new Date(s).getFullYear(), ey = new Date(e).getFullYear();
          if (ey > sy && (!next.name || nameAuto)) {
            next.name = `${sy}/${ey}`;
            setNameAuto(true);
          }
        }
      }
    }
    // clear any server error on the edited field
    setFieldErrors(prev => (prev[key] || prev._form) ? { ...prev, [key]: undefined } : prev);
    setFormData(next);
  };

  const isValid = fields.every(f => !f.required || String(formData[f.key] ?? '').trim() !== '');

  /* first blocking reason — surfaced at the point of action */
  const firstRequiredMissing = fields.find(f => f.required && String(formData[f.key] ?? '').trim() === '');
  const blockReason =
    firstRequiredMissing ? `Enter ${firstRequiredMissing.label.toLowerCase()} to continue`
    : hasDatesFlipped     ? 'End date must be after the start date'
    : hasDateOverlap      ? `These dates overlap an existing ${itemLabel}`
    : '';

  const showFieldErr = (f) => {
    if (fieldErrors[f.key]) return fieldErrors[f.key];
    if ((touched[f.key] || submitTried) && f.required && String(formData[f.key] ?? '').trim() === '')
      return `${f.label} is required`;
    return '';
  };

  /* guard: editing the live active year's dates */
  const editingActive = editId !== null && activeItem && activeItem.id === editId;
  const lockActiveDates = !!(editingActive && hasHero);

  /* ── Save ── */
  const doSave = async (force) => {
    setSaving(true); setSaveErr(''); setFieldErrors({});
    try {
      const payload = fields.reduce((acc, f) => {
        const v = formData[f.key];
        if (v !== '' && v !== undefined && v !== null)
          acc[f.key] = f.type === 'number' ? Number(v) : v;
        return acc;
      }, {});
      if (force) payload.force = true;
      const data = editId
        ? await apiPut(`${endpoint}${editId}/`, payload)
        : await apiPost(endpoint, payload);
      if (!data.success) { setSaveErr(data.message || 'Save failed.'); return; }
      const verb = editId ? 'updated' : 'added';
      toast(`${payload.name || itemLabel} ${verb}`.replace(/\s+/g, ' ').trim());
      await loadItems();
      reallyCancel();
    } catch (err) {
      if (err.status === 409 && err.payload?.requiresForce) {
        // surfaced as a confirm in the form footer
        setSaveErr(`${err.message} Save anyway?`);
        setFieldErrors({ _requiresForce: true });
        return;
      }
      if (err.status === 400 && err.payload?.fieldErrors) {
        setFieldErrors(err.payload.fieldErrors);
        setSaveErr(err.payload.message || 'Please fix the highlighted fields.');
        return;
      }
      setSaveErr(err.message || 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSubmitTried(true);
    if (!isValid || hasDateOverlap || hasDatesFlipped) return;
    // soft-confirm before saving a date-less year
    if (hasHero && (!formData[heroStartField] || !formData[heroEndField]) && !datelessConfirm) {
      setDatelessConfirm(true);
      return;
    }
    doSave(false);
  };

  /* ── Toggle (activate / deactivate) ── */
  const handleToggle = async (item) => {
    setTogglingId(item.id); setActionErr('');
    try {
      const data = await apiPatch(`${endpoint}${item.id}/toggle/`);
      if (data.success) {
        await loadItems();
        toast(`${item.name || itemLabel} ${data.is_active ? 'activated' : 'deactivated'}`);
      } else setActionErr(data.message || 'Toggle failed.');
    } catch (err) {
      setActionErr(err.message || 'Network error.');
    } finally { setTogglingId(null); }
  };

  /* ── Delete / Archive (soft) ── */
  const handleDelete = async (force) => {
    const id = deleteId?.id ?? deleteId;
    if (!id) return;
    setDeleting(true); setActionErr('');
    try {
      await apiDelete(`${endpoint}${id}/${force ? '?force=1' : ''}`);
      await loadItems();
      setDeleteId(null);
      toast(hasHero ? 'Academic year archived' : `${itemLabel} deleted`, 'success');
    } catch (err) {
      if (err.status === 409 && err.payload?.requiresForce) {
        setActionErr(`${err.message} Re-press the confirm tick to archive anyway.`);
        setDeleteId({ id, force: true, term_count: err.payload.term_count });
        return;
      }
      setActionErr(err.message || 'Delete failed.');
      setDeleteId(null);
    } finally { setDeleting(false); }
  };

  /* ── Restore (year mode) ── */
  const handleRestore = async (item) => {
    setRestoringId(item.id); setActionErr('');
    try {
      const d = await apiPost(`${endpoint}${item.id}/restore/`, {});
      if (d.success) { await loadItems(); toast(`${item.name} restored`); }
      else setActionErr(d.message || 'Restore failed.');
    } catch (err) { setActionErr(err.message || 'Network error.'); }
    finally { setRestoringId(null); }
  };

  /* ── Clone (year mode) ── */
  const handleClone = async (item) => {
    setCloningId(item.id); setActionErr('');
    try {
      const d = await apiPost(`${endpoint}${item.id}/clone/`, {});
      if (d.success) { await loadItems(); toast(`Cloned to ${d.name || 'new year'}`); }
      else setActionErr(d.message || 'Clone failed.');
    } catch (err) { setActionErr(err.message || 'Network error.'); }
    finally { setCloningId(null); }
  };

  /* ── Close out (year mode) ── */
  const handleClose = async (item) => {
    setClosingId(item.id); setActionErr('');
    try {
      const d = await apiPost(`${endpoint}${item.id}/close/`, {});
      if (d.success) { await loadItems(); toast(`${item.name} closed`); }
      else setActionErr(d.message || 'Close failed.');
    } catch (err) { setActionErr(err.message || 'Network error.'); }
    finally { setClosingId(null); }
  };

  /* ── Roll Out (modal + dry-run preview + optional cascade) ── */
  const openRollout = async (item, triggerEl) => {
    rolloutTrigRef.current = triggerEl || null;
    setRolloutTarget(item);
    setCascade(false);
    setRolloutPreview(null);
    setActionErr('');
    if (hasHero) {
      setPreviewLoading(true);
      const d = await apiGetSafe(`${endpoint}${item.id}/rollout-preview/`);
      setRolloutPreview(d && d.success ? d.preview : null);
      setPreviewLoading(false);
    }
  };
  const closeRollout = () => {
    setRolloutTarget(null); setRolloutPreview(null); setCascade(false);
    const trig = rolloutTrigRef.current;
    if (trig && trig.focus) requestAnimationFrame(() => trig.focus());
  };
  const handleRollout = async () => {
    if (!rolloutTarget) return;
    const target = rolloutTarget;
    setRollingId(target.id); setActionErr('');
    try {
      const data = await apiPost(`${endpoint}${target.id}/rollout/`, hasHero ? { cascade } : {});
      if (data.success) {
        setRolloutTarget(null); setRolloutPreview(null);
        await loadItems();
        const c = data.cascade;
        toast(
          c ? `Rolled out ${target.name} — applied to ${c.schools_updated} school${c.schools_updated !== 1 ? 's' : ''}`
            : `Rolled out ${target.name} — now active`,
        );
        const trig = rolloutTrigRef.current;
        if (trig && trig.focus) requestAnimationFrame(() => trig.focus());
      } else setActionErr(data.message || 'Roll out failed.');
    } catch (err) {
      setActionErr(err.message || 'Network error.');
    } finally { setRollingId(null); setCascade(false); }
  };

  /* ── History drawer (year mode) ── */
  const openHistory = async (item) => {
    setHistoryTarget(item); setHistoryRows([]); setHistoryLoading(true);
    const d = await apiGetSafe(`${endpoint}${item.id}/history/`);
    setHistoryRows(d && d.success ? (d.history || []) : []);
    setHistoryLoading(false);
  };

  /* ── Modal focus trap + ESC ── */
  useEffect(() => {
    if (!rolloutTarget) return;
    requestAnimationFrame(() => confirmBtnRef.current && confirmBtnRef.current.focus());
    const onKey = (e) => {
      if (rollingId) return;
      if (e.key === 'Escape') { e.preventDefault(); closeRollout(); return; }
      if (e.key === 'Tab' && modalRef.current) {
        const els = modalRef.current.querySelectorAll('button:not(:disabled), input, [tabindex]:not([tabindex="-1"])');
        if (!els.length) return;
        const first = els[0], last = els[els.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [rolloutTarget, rollingId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Options (cascading filter) ── */
  const getOptions = (field) => {
    const all = fkOptions[field.key] || [];
    if (!field.dependsOn) return all;
    const parentVal = String(formData[field.dependsOn] || '');
    if (!parentVal) return [];
    return all.filter(o => String(o[field.dependsOnKey]) === parentVal);
  };

  const displayVal = (item, f) => {
    if (f.type === 'select') return item[f.key.replace(/_id$/, '_name')] || '—';
    if (f.type === 'date')   return fmtDate(item[f.key]);
    const v = item[f.key];
    return (v !== undefined && v !== null && v !== '') ? String(v) : '—';
  };

  /* ── Field renderer ── */
  const renderField = (f, isFirst) => {
    const val      = String(formData[f.key] ?? '');
    const errMsg   = showFieldErr(f);
    const errCls   = errMsg ? ' sard-input--err' : '';
    const dateLock = lockActiveDates && (f.key === heroStartField || f.key === heroEndField);
    const id       = fieldId(f.key);
    const descId   = errMsg ? `${id}-err` : undefined;
    const isNameAuto = hasHero && f.key === 'name' && nameAuto && val;

    if (f.type === 'select') {
      const opts   = getOptions(f);
      const locked = !!f.dependsOn && !formData[f.dependsOn];
      const parent = f.dependsOn ? fields.find(x => x.key === f.dependsOn) : null;
      return (
        <div key={f.key} className="sard-field">
          <label className="sard-label" htmlFor={id}>
            {f.label.toUpperCase()}{f.required && <span className="sard-req" aria-hidden="true"> *</span>}
          </label>
          <div className="sard-sel-wrap">
            <select
              id={id}
              ref={isFirst ? nameInputRef : undefined}
              className={`sard-select${errCls}`}
              value={val}
              disabled={locked}
              required={!!f.required}
              aria-required={f.required ? 'true' : undefined}
              aria-invalid={errMsg ? 'true' : undefined}
              aria-describedby={descId}
              onChange={e => handleFormChange(f.key, e.target.value)}
              onBlur={() => setTouched(t => ({ ...t, [f.key]: true }))}
            >
              <option value="">
                {locked ? `Select ${parent?.label?.toLowerCase() || 'parent'} first…` : `Select ${f.label.toLowerCase()}…`}
              </option>
              {opts.map(o => <option key={o.id} value={o.id}>{o[f.labelKey || 'name']}</option>)}
            </select>
            <span className="sard-sel-chevron"><IcChevron /></span>
          </div>
          {errMsg && <span id={descId} className="sard-field-err" role="alert">{errMsg}</span>}
        </div>
      );
    }

    const showSuggest = hasHero && f.key === heroEndField && suggestedEnd && !val && !dateLock;
    const hint = hasHero && (f.key === heroStartField || f.key === heroEndField)
      ? 'Recommended — powers the progress ring, duration & rollout warnings'
      : f.hint;
    return (
      <div key={f.key} className="sard-field">
        <label className="sard-label" htmlFor={id}>
          {f.label.toUpperCase()}{f.required && <span className="sard-req" aria-hidden="true"> *</span>}
          {isNameAuto && <span className="sard-auto-tag" title="Auto-filled from the year span">auto</span>}
        </label>
        <input
          id={id}
          ref={isFirst ? nameInputRef : undefined}
          type={f.type || 'text'}
          className={`sard-input${errCls}`}
          placeholder={f.placeholder || `Enter ${f.label.toLowerCase()}…`}
          value={val}
          disabled={dateLock}
          required={!!f.required}
          aria-required={f.required ? 'true' : undefined}
          aria-invalid={errMsg ? 'true' : undefined}
          aria-describedby={descId}
          min={f.key === heroEndField && formData[heroStartField] ? formData[heroStartField] : undefined}
          onChange={e => handleFormChange(f.key, e.target.value)}
          onBlur={() => setTouched(t => ({ ...t, [f.key]: true }))}
        />
        {dateLock && <span className="sard-field-hint"><IcLock /> Locked — this is the live active year. Edit dates via a controlled rollout.</span>}
        {!dateLock && hint && !errMsg && <span className="sard-field-hint">{hint}</span>}
        {errMsg && <span id={descId} className="sard-field-err" role="alert">{errMsg}</span>}
        {showSuggest && (
          <button type="button" className="sard-suggest-pill" onClick={() => handleFormChange(heroEndField, suggestedEnd)}>
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
    const previewDays = hasHero && !hasDatesFlipped ? calcDaysDiff(fStart, fEnd) : 0;
    const previewDur  = hasHero && !hasDatesFlipped ? calcDuration(fStart, fEnd)  : null;
    const requiresForce = !!fieldErrors._requiresForce;
    const saveBlocked = saving || (submitTried && (!isValid || hasDateOverlap || hasDatesFlipped));
    const presets = getYearPresets(presetMonth);

    return (
      <form
        className="sard-form"
        onSubmit={handleSave}
        noValidate
        onKeyDown={(e) => { if (e.key === 'Escape' && !saving) { e.preventDefault(); cancelForm(); } }}
      >

        {/* "Saving ≠ activating" notice (create only, no active year context handled in empty state) */}
        {hasHero && !isEdit && (
          <div className="sard-form-note">
            <IcInfo />
            <span>Saving only creates the year. Click <strong>Roll Out</strong> afterwards to make it active across all schools.</span>
          </div>
        )}

        {/* Year presets — create AND edit (re-snap dates in one click) */}
        {hasHero && (
          <div className="sard-presets-wrap">
            <div className="sard-presets" role="group" aria-label="Quick year presets">
              {presets.map(p => {
                const selected = fStart === p.start && fEnd === p.end;
                return (
                  <button
                    key={p.label}
                    type="button"
                    className={`sard-preset-btn${selected ? ' sard-preset-btn--on' : ''}`}
                    aria-pressed={selected}
                    onClick={() => {
                      setSuggestedEnd('');
                      setFormData(prev => {
                        const sy = new Date(p.start).getFullYear(), ey = new Date(p.end).getFullYear();
                        const useName = !prev.name || nameAuto;
                        if (useName) setNameAuto(true);
                        return { ...prev, name: useName ? `${sy}/${ey}` : prev.name, [heroStartField]: p.start, [heroEndField]: p.end };
                      });
                    }}
                  >
                    <span className="sard-preset-label">{p.label}</span>
                    <span className="sard-preset-year">{p.name}</span>
                    <span className="sard-preset-span">{fmtDate(p.start)} – {fmtDate(p.end)}</span>
                  </button>
                );
              })}
            </div>
            <div className="sard-preset-month" role="group" aria-label="Academic year start month">
              <span className="sard-preset-month-label">Starts</span>
              {START_MONTHS.map(m => (
                <button
                  key={m.value}
                  type="button"
                  className={`sard-month-chip${presetMonth === m.value ? ' on' : ''}`}
                  aria-pressed={presetMonth === m.value}
                  onClick={() => setPresetMonth(m.value)}
                >{m.label}</button>
              ))}
            </div>
          </div>
        )}

        <div className={`sard-form-grid sard-form-grid--${Math.min(fields.length, 3)}`}>
          {fields.map((f, i) => renderField(f, i === 0))}
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
          <div className="sard-overlap-warn" role="alert">
            <IcWarn />
            <span>Date range overlaps an existing {itemLabel}. Adjust the dates before saving.</span>
          </div>
        )}
        {saveErr && (
          <div className="sard-err-banner" role="alert"><IcWarn /><span>{saveErr}</span></div>
        )}

        {/* Date-less soft confirm */}
        {datelessConfirm && (
          <div className="sard-inline-confirm" role="alert">
            <span>Save {formData.name || `this ${itemLabel}`} with no dates? The progress ring, duration and overlap checks won't work.</span>
            <div className="sard-inline-confirm-btns">
              <button type="button" className="sard-btn sard-btn--ghost" onClick={() => setDatelessConfirm(false)}>Go back</button>
              <button type="button" className="sard-btn sard-btn--save" onClick={() => doSave(false)} disabled={saving}>
                {saving ? <><IcSpinner /> Saving…</> : 'Save anyway'}
              </button>
            </div>
          </div>
        )}

        {/* Discard confirm */}
        {discardConfirm && (
          <div className="sard-inline-confirm" role="alert">
            <span>Discard your unsaved changes?</span>
            <div className="sard-inline-confirm-btns">
              <button type="button" className="sard-btn sard-btn--ghost" onClick={() => setDiscardConfirm(false)}>Keep editing</button>
              <button type="button" className="sard-btn sard-btn--danger-solid" onClick={reallyCancel}>Discard</button>
            </div>
          </div>
        )}

        {!datelessConfirm && !discardConfirm && (
          <div className="sard-form-foot">
            {blockReason && submitTried && <span className="sard-block-reason"><IcWarn /> {blockReason}</span>}
            <div className="sard-form-btns">
              <button type="button" className="sard-btn sard-btn--ghost" onClick={cancelForm} disabled={saving}>
                <IcX /> Cancel
              </button>
              {requiresForce ? (
                <button type="button" className="sard-btn sard-btn--rollout-confirm" onClick={() => doSave(true)} disabled={saving}>
                  {saving ? <><IcSpinner /> Saving…</> : <><IcWarn /> Save anyway</>}
                </button>
              ) : (
                <button type="submit" className={`sard-btn sard-btn--save${saveBlocked ? ' sard-btn--disabled' : ''}`} disabled={saveBlocked}>
                  {saving ? <><IcSpinner /> Saving…</> : <><IcCheck /> {isEdit ? 'Update' : 'Add'}</>}
                </button>
              )}
            </div>
          </div>
        )}
      </form>
    );
  };

  /* ── Hero Banner ── */
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
    const termCount = activeItem.term_count;
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
          {/* term summary + add-terms deep link */}
          {(termCount !== undefined || onAddTerms) && (
            <div className="sard-hero-terms">
              {termCount !== undefined && (
                <span className={`sard-term-badge${termCount === 0 ? ' sard-term-badge--empty' : ''}`}>
                  <IcLayers />
                  {termCount === 0 ? 'No terms yet' : `${termCount} term${termCount !== 1 ? 's' : ''}`}
                  {activeItem.active_term_name ? ` · ${activeItem.active_term_name} active` : ''}
                </span>
              )}
              {onAddTerms && (
                <button type="button" className="sard-link-btn" onClick={() => onAddTerms(activeItem)}>
                  <IcPlus /> {termCount ? 'Manage terms' : 'Add terms'}
                </button>
              )}
            </div>
          )}
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

  /* ── Close-out card (active year near/past end) ── */
  const renderCloseout = () => {
    if (!activeItem || !activeItem[heroEndField]) return null;
    const pct = yearProgressPct(activeItem[heroStartField], activeItem[heroEndField]);
    const past = Date.now() > new Date(activeItem[heroEndField]).getTime();
    if (pct < 90 && !past) return null;
    return (
      <div className="sard-closeout">
        <div className="sard-closeout-icon"><IcLock /></div>
        <div className="sard-closeout-body">
          <p className="sard-closeout-title">{activeItem.name} is {past ? 'past its end date' : 'almost over'}</p>
          <p className="sard-closeout-sub">Close it out once terms have ended, grades are finalised and fees reconciled. Closing locks the year from edits and frees the calendar for the next rollout.</p>
        </div>
        <button
          type="button"
          className="sard-btn sard-btn--closeout"
          onClick={() => handleClose(activeItem)}
          disabled={closingId === activeItem.id}
        >
          {closingId === activeItem.id ? <><IcSpinner /> Closing…</> : <><IcLock /> Close Out Year</>}
        </button>
      </div>
    );
  };

  /* ── Adoption panel ── */
  const renderAdoption = () => {
    if (!adoption) return null;
    const { total_schools = 0, adopted = 0, not_yet = 0, no_terms = 0, lagging = [] } = adoption;
    const pct = total_schools ? Math.round((adopted / total_schools) * 100) : 0;
    return (
      <div className="sard-adoption">
        <div className="sard-adoption-head">
          <span className="sard-adoption-title"><IcUsers /> School adoption</span>
          <span className="sard-adoption-pct">{adopted}/{total_schools} on this year</span>
        </div>
        <div className="sard-adoption-bar"><span style={{ width: `${pct}%` }} /></div>
        <div className="sard-adoption-legend">
          <span className="sard-adoption-chip sard-adoption-chip--ok">{adopted} adopted</span>
          <span className="sard-adoption-chip sard-adoption-chip--amber">{not_yet} not yet</span>
          {no_terms > 0 && <span className="sard-adoption-chip sard-adoption-chip--warn">{no_terms} missing terms</span>}
        </div>
        {lagging.length > 0 && (
          <p className="sard-adoption-lag">
            Lagging: {lagging.slice(0, 8).map(s => s.name).join(', ')}{lagging.length > 8 ? ` +${lagging.length - 8} more` : ''}
          </p>
        )}
      </div>
    );
  };

  /* ── Stats Row ── */
  const renderStats = () => {
    if (!hasHero || items.length === 0) return null;
    const today    = new Date();
    const active   = items.find(i => i.is_active);
    const live     = items.filter(i => statusOf(i) !== 'archived');
    const upcoming = live.filter(i => !i.is_active && i[heroStartField] && new Date(i[heroStartField]) > today);
    return (
      <div className="sard-stats">
        <div className="sard-stat-chip">
          <span className="sard-stat-icon"><IcLayers /></span>
          <div>
            <div className="sard-stat-val">{live.length}</div>
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

  /* ── Timeline (mini-Gantt) ── */
  const renderTimeline = () => {
    if (!hasHero) return null;
    const dated = items
      .filter(i => statusOf(i) !== 'archived' && i[heroStartField] && i[heroEndField])
      .map(i => ({ i, s: new Date(i[heroStartField]).getTime(), e: new Date(i[heroEndField]).getTime() }))
      .filter(b => b.e > b.s)
      .sort((a, b) => a.s - b.s);
    if (dated.length < 2) return null;
    const min = Math.min(...dated.map(b => b.s));
    const max = Math.max(...dated.map(b => b.e));
    const span = max - min || 1;
    const now = Date.now();
    const nowPct = ((now - min) / span) * 100;
    const pos = (t) => ((t - min) / span) * 100;
    return (
      <div className="sard-timeline">
        <div className="sard-timeline-head">
          <span className="sard-timeline-title">Timeline</span>
          <span className="sard-timeline-range">{fmtDate(new Date(min).toISOString())} – {fmtDate(new Date(max).toISOString())}</span>
        </div>
        <div className="sard-timeline-track">
          {now >= min && now <= max && (
            <div className="sard-timeline-now" style={{ left: `${nowPct}%` }} title="Today"><span /></div>
          )}
          {dated.map(({ i, s, e }) => {
            const st = statusOf(i);
            const fill = i.is_active ? yearProgressPct(i[heroStartField], i[heroEndField]) : 0;
            return (
              <div key={i.id} className="sard-timeline-lane">
                <span className="sard-timeline-name">{i.name}</span>
                <div className="sard-timeline-lane-track">
                  <div
                    className={`sard-timeline-bar sard-timeline-bar--${st}`}
                    style={{ left: `${pos(s)}%`, width: `${Math.max(2, pos(e) - pos(s))}%` }}
                    title={`${fmtDate(i[heroStartField])} – ${fmtDate(i[heroEndField])}`}
                  >
                    {i.is_active && <span className="sard-timeline-fill" style={{ width: `${fill}%` }} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  /* ── Status filter tabs (year mode) ── */
  const STATUS_TABS = [
    { key: 'all',      label: 'All' },
    { key: 'active',   label: 'Active' },
    { key: 'draft',    label: 'Draft' },
    { key: 'closed',   label: 'Closed' },
    { key: 'archived', label: 'Archived' },
  ];
  const renderStatusTabs = () => {
    if (!hasHero) return null;
    const counts = items.reduce((acc, i) => { const s = statusOf(i); acc[s] = (acc[s] || 0) + 1; return acc; }, {});
    return (
      <div className="sard-status-tabs" role="tablist" aria-label="Filter by status">
        {STATUS_TABS.map(t => {
          const n = t.key === 'all' ? items.filter(i => statusOf(i) !== 'archived').length : (counts[t.key] || 0);
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={statusFilter === t.key}
              className={`sard-status-tab${statusFilter === t.key ? ' on' : ''}`}
              onClick={() => setStatusFilter(t.key)}
            >
              {t.label}<span className="sard-status-tab-n">{n}</span>
            </button>
          );
        })}
      </div>
    );
  };

  /* ── Rollout Confirmation Modal (accessible + dry-run + cascade) ── */
  const renderRolloutModal = () => {
    if (!rolloutTarget) return null;
    const currentActive = items.find(i => i.is_active);
    const zeroTerms = hasHero && rolloutPreview && rolloutPreview.term_count === 0;
    const titleId = `${uid}-rollout-title`;
    return (
      <div className="sard-modal-overlay" onMouseDown={() => !rollingId && closeRollout()}>
        <div
          className="sard-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          ref={modalRef}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="sard-modal-rocket"><IcRocket /></div>
          <div className="sard-modal-title" id={titleId}>Roll out {rolloutTarget.name}?</div>
          <div className="sard-modal-body">
            {currentActive && currentActive.id !== rolloutTarget.id ? (
              <>This activates <strong>{rolloutTarget.name}</strong> and deactivates <strong>{currentActive.name}</strong> across all schools. Takes effect immediately.</>
            ) : (
              <>This activates <strong>{rolloutTarget.name}</strong> as the system-wide academic year for all schools.</>
            )}
          </div>

          {/* dry-run preview */}
          {hasHero && (
            <div className="sard-modal-preview">
              {previewLoading ? (
                <span className="sard-modal-preview-loading"><IcSpinner /> Checking impact…</span>
              ) : rolloutPreview ? (
                <>
                  <div className="sard-modal-preview-row">
                    <span>{rolloutPreview.term_count} term{rolloutPreview.term_count !== 1 ? 's' : ''} defined</span>
                    <span>{rolloutPreview.schools?.total ?? 0} schools · {rolloutPreview.schools?.already ?? 0} already have it</span>
                  </div>
                  {zeroTerms && (
                    <div className="sard-modal-zeroterms" role="alert">
                      <IcWarn />
                      <div>
                        <strong>This year has no terms.</strong> Schools will have no term structure until you add at least one.
                        {onAddTerms && (
                          <button type="button" className="sard-link-btn" onClick={() => { closeRollout(); onAddTerms(rolloutTarget); }}>
                            Add terms first
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}

          {/* cascade option */}
          {hasHero && (
            <label className="sard-modal-cascade">
              <input type="checkbox" checked={cascade} onChange={e => setCascade(e.target.checked)} />
              <span>Also create/activate this year &amp; its terms in <strong>every school</strong> now {rolloutPreview?.schools ? `(${rolloutPreview.schools.missing} need it)` : ''}</span>
            </label>
          )}

          {actionErr && <div className="sard-err-banner" role="alert" style={{ marginTop: 4 }}><IcWarn /><span>{actionErr}</span></div>}

          <div className="sard-modal-actions">
            <button className="sard-btn sard-btn--ghost" onClick={closeRollout} disabled={!!rollingId}>
              <IcX /> Cancel
            </button>
            <button
              ref={confirmBtnRef}
              className="sard-btn sard-btn--rollout-confirm"
              onClick={handleRollout}
              disabled={!!rollingId}
              aria-busy={rollingId ? 'true' : undefined}
            >
              {rollingId ? <><IcSpinner /> Rolling out…</> : <><IcRocket /> {cascade ? 'Roll Out to all schools' : 'Confirm Roll Out'}</>}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ── History drawer ── */
  const renderHistory = () => {
    if (!historyTarget) return null;
    const titleId = `${uid}-hist-title`;
    return (
      <div className="sard-drawer-overlay" onMouseDown={() => setHistoryTarget(null)}>
        <aside className="sard-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={e => e.stopPropagation()}>
          <div className="sard-drawer-head">
            <div>
              <span className="sard-drawer-eyebrow">Audit history</span>
              <h3 id={titleId} className="sard-drawer-title">{historyTarget.name}</h3>
            </div>
            <button className="sard-icon-btn" onClick={() => setHistoryTarget(null)} aria-label="Close history"><IcX /></button>
          </div>
          <div className="sard-drawer-body">
            {historyLoading && <div className="sard-state"><IcSpinner /><span>Loading…</span></div>}
            {!historyLoading && historyRows.length === 0 && <p className="sard-empty">No history recorded yet.</p>}
            {!historyLoading && historyRows.map((h, idx) => (
              <div key={h.id || idx} className="sard-hist-row">
                <span className={`sard-hist-dot sard-hist-dot--${h.severity || 'low'}`} />
                <div className="sard-hist-main">
                  <p className="sard-hist-action">{h.action}</p>
                  <p className="sard-hist-meta">{h.actor || 'system'} · {fmtDate(h.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    );
  };

  /* ── Filter + search ── */
  const q = query.trim().toLowerCase();
  const visibleItems = useMemo(() => {
    let list = items;
    if (hasHero) {
      list = statusFilter === 'all'
        ? list.filter(i => statusOf(i) !== 'archived')
        : list.filter(i => statusOf(i) === statusFilter);
    }
    if (q) list = list.filter(i => fields.some(f => String(displayVal(i, f)).toLowerCase().includes(q)));
    return list;
  }, [items, hasHero, statusFilter, q, fields]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Render ── */
  return (
    <div className="sard-wrap">

      {renderRolloutModal()}
      {renderHistory()}

      {/* polite live region for screen-reader announcements */}
      <div className="sard-sr-only" role="status" aria-live="polite">{liveMsg}</div>

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

      {/* Hero + stats + timeline + adoption + close-out (year mode) */}
      {hasHero && !loading && !loadErr && items.length > 0 && (
        <>
          {renderHero()}
          {renderCloseout()}
          {renderStats()}
          {renderAdoption()}
          {renderTimeline()}
        </>
      )}

      {/* Create form */}
      {creating && (
        <div className="sard-card sard-card--form">
          <p className="sard-section-label">NEW {itemLabel.toUpperCase()}</p>
          {renderForm(false)}
        </div>
      )}

      {/* Action error banner */}
      {actionErr && !rolloutTarget && (
        <div className="sard-err-banner" role="alert" style={{ marginBottom: 12 }}>
          <IcWarn /><span>{actionErr}</span>
          <button className="sard-icon-btn" style={{ marginLeft: 'auto' }} onClick={() => setActionErr('')} aria-label="Dismiss"><IcX /></button>
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
          <div className="sard-empty-state">
            <p className="sard-empty">No {itemLabel}s yet — add one above to get started.</p>
            {hasHero && <p className="sard-empty-hint">After adding a year, click <strong>Roll Out</strong> to make it active across all schools.</p>}
          </div>
        )}

        {renderStatusTabs()}

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
            {q && <span className="sard-search-count">{visibleItems.length} of {items.length}</span>}
          </div>
        )}

        {!loading && items.length > 0 && visibleItems.length === 0 && (
          <p className="sard-empty">{q ? `No ${itemLabel} matches “${query}”.` : `No ${statusFilter} ${itemLabel}s.`}</p>
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
            {visibleItems.map(item => {
              const st = statusOf(item);
              const stMeta = STATUS_META[st] || STATUS_META.draft;
              const archived = st === 'archived';
              return (
              <div
                key={item.id}
                className={[
                  'sard-tr',
                  editId === item.id        ? 'sard-tr--editing' : '',
                  hasHero && item.is_active ? 'sard-tr--active'  : '',
                  archived                  ? 'sard-tr--archived': '',
                ].filter(Boolean).join(' ')}
                style={{ '--data-cols': fields.length }}
              >
                {editId === item.id ? (
                  <div className="sard-tr-form">{renderForm(true)}</div>
                ) : (
                  <>
                    {fields.map(f => (
                      <span key={f.key} className="sard-td" data-label={f.label}>
                        {displayVal(item, f)}
                        {hasHero && f.key === 'name' && item.term_count !== undefined && (
                          <span className={`sard-term-chip${item.term_count === 0 ? ' sard-term-chip--empty' : ''}`}>
                            {item.term_count === 0 ? 'no terms' : `${item.term_count} term${item.term_count !== 1 ? 's' : ''}`}
                          </span>
                        )}
                      </span>
                    ))}

                    {/* Status cell */}
                    <span className={`sard-td${hasHero ? ' sard-td--status' : ''}`} data-label="Status">
                      <span className={`sard-status sard-status--${stMeta.cls}`}>
                        <span className="sard-status-dot" />
                        {hasHero ? stMeta.label : (item.is_active ? 'Active' : 'Inactive')}
                      </span>
                      {hasHero && (() => {
                        const dur = calcDuration(item[heroStartField], item[heroEndField]);
                        return dur ? <span className="sard-duration">{dur}</span> : null;
                      })()}
                    </span>

                    <span className="sard-td sard-td--date" data-label="Added">{fmtDate(item.created_at)}</span>

                    <span className="sard-td sard-td--actions" data-label="Actions">
                      {archived ? (
                        <button
                          className="sard-rollout-btn"
                          onClick={() => handleRestore(item)}
                          disabled={restoringId === item.id}
                          title="Restore this archived year"
                        >
                          {restoringId === item.id ? <IcSpinner /> : <IcRestore />}
                          <span>Restore</span>
                        </button>
                      ) : (
                        <>
                          {hasRollout && !item.is_active && st !== 'closed' && (
                            <button
                              className="sard-rollout-btn"
                              title="Roll out — set as active"
                              onClick={(e) => openRollout(item, e.currentTarget)}
                              disabled={rollingId === item.id || !!togglingId}
                            >
                              {rollingId === item.id ? <IcSpinner /> : <IcRocket />}
                              <span>{rollingId === item.id ? 'Rolling…' : 'Roll Out'}</span>
                            </button>
                          )}

                          {hasHero && onAddTerms && (
                            <button className="sard-icon-btn" title="Add / manage terms" aria-label={`Manage terms for ${item.name}`} onClick={() => onAddTerms(item)}>
                              <IcLayers />
                            </button>
                          )}

                          {hasHero && (
                            <button className="sard-icon-btn" title="Clone year + terms" aria-label={`Clone ${item.name}`} onClick={() => handleClone(item)} disabled={cloningId === item.id}>
                              {cloningId === item.id ? <IcSpinner /> : <IcCopy />}
                            </button>
                          )}

                          {hasHero && (
                            <button className="sard-icon-btn" title="Audit history" aria-label={`History for ${item.name}`} onClick={() => openHistory(item)}>
                              <IcHistory />
                            </button>
                          )}

                          <button
                            className="sard-icon-btn"
                            title="Edit"
                            aria-label={`Edit ${item.name || itemLabel}`}
                            onClick={() => openEdit(item)}
                            disabled={!!togglingId || !!rollingId}
                          >
                            <IcEdit />
                          </button>

                          {!hasHero && (
                            <button
                              className={`sard-icon-btn${item.is_active ? ' sard-icon-btn--toggle-on' : ''}`}
                              title={item.is_active ? 'Deactivate' : 'Activate'}
                              aria-label={item.is_active ? `Deactivate ${item.name || itemLabel}` : `Activate ${item.name || itemLabel}`}
                              onClick={() => handleToggle(item)}
                              disabled={togglingId === item.id || !!rollingId}
                            >
                              {togglingId === item.id ? <IcSpinner /> : (item.is_active ? <IcToggleOn /> : <IcToggleOff />)}
                            </button>
                          )}

                          {(deleteId === item.id || deleteId?.id === item.id) ? (
                            <span className="sard-del-confirm">
                              <span className="sard-del-label">{hasHero ? 'Archive?' : 'Delete?'}</span>
                              <button
                                className="sard-icon-btn sard-icon-btn--danger"
                                aria-label="Confirm"
                                onClick={() => handleDelete(deleteId?.force)}
                                disabled={deleting}
                              >
                                {deleting ? <IcSpinner /> : <IcCheck />}
                              </button>
                              <button className="sard-icon-btn" aria-label="Cancel" onClick={() => setDeleteId(null)}><IcX /></button>
                            </span>
                          ) : (
                            <button
                              className="sard-icon-btn sard-icon-btn--danger"
                              title={hasHero ? (item.is_active ? 'Cannot archive the active year' : 'Archive') : 'Delete'}
                              aria-label={hasHero ? `Archive ${item.name}` : `Delete ${item.name || itemLabel}`}
                              onClick={() => setDeleteId(item.id)}
                              disabled={!!togglingId || !!rollingId || (hasHero && item.is_active)}
                            >
                              {hasHero ? <IcArchive /> : <IcTrash />}
                            </button>
                          )}
                        </>
                      )}
                    </span>
                  </>
                )}
              </div>
            );})}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <p className="sard-count">{visibleItems.length} {itemLabel}{visibleItems.length !== 1 ? 's' : ''}{q || (hasHero && statusFilter !== 'all') ? ` shown` : ''}</p>
      )}
    </div>
  );
}
