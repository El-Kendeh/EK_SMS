import React, { useState, useEffect, useMemo, useCallback } from 'react';
import './SACreateTerm.css';

/* ------------------------------------------------------------------ */
/*  Node API helpers (academic-years & system-terms live on Node/MySQL) */
/* ------------------------------------------------------------------ */
const NODE_URL = (
  process.env.REACT_APP_NODE_API_URL ||
  process.env.REACT_APP_API_URL ||
  'http://localhost:5000'
).replace(/\/$/, '');

function getToken() {
  try { return localStorage.getItem('token') || ''; } catch { return ''; }
}

async function nodeGet(path) {
  const res = await fetch(`${NODE_URL}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function nodePost(path, body) {
  const res = await fetch(`${NODE_URL}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Icons                                                               */
/* ------------------------------------------------------------------ */
const IcLink    = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>;
const IcInfo    = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IcDate    = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IcNotes   = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const IcCog     = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const IcChevron = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;
const IcSave    = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IcReset   = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>;
const IcWarn    = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcCheck   = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcClock   = () => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IcSpinner = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="sact-spin"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/></svg>;
const IcRocket  = () => <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2l.09-.09a2 2 0 00-3-3L4.5 16.5z"/><path d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function calcDuration(start, end) {
  if (!start || !end) return null;
  const ms = new Date(end) - new Date(start);
  if (ms <= 0) return null;
  const days = Math.round(ms / 86400000);
  return { days, weeks: Math.floor(days / 7) };
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function checkOverlap(start, end, terms) {
  if (!start || !end || !terms.length) return null;
  const ns = new Date(start), ne = new Date(end);
  for (const t of terms) {
    if (!t.start_date || !t.end_date) continue;
    if (ns <= new Date(t.end_date) && ne >= new Date(t.start_date)) return t.name;
  }
  return null;
}

function checkOutOfRange(start, end, year) {
  if (!start || !end || !year?.start_date || !year?.end_date) return false;
  return new Date(start) < new Date(year.start_date) || new Date(end) > new Date(year.end_date);
}

const ORDER_OPTIONS = [
  { value: '1', label: '1st Term' },
  { value: '2', label: '2nd Term' },
  { value: '3', label: '3rd Term' },
];

const NAME_MAX = 100;
const DESC_MAX = 300;

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export default function SACreateTerm({ onSave }) {
  /* form */
  const [yearId,      setYearId]      = useState('');
  const [termOrder,   setTermOrder]   = useState('');
  const [termName,    setTermName]    = useState('');
  const [description, setDescription] = useState('');
  const [startDate,   setStartDate]   = useState('');
  const [endDate,     setEndDate]     = useState('');
  const [setAsActive, setSetAsActive] = useState(false);
  const [touched,     setTouched]     = useState({});

  /* remote data */
  const [years,        setYears]        = useState([]);
  const [yearsLoading, setYearsLoading] = useState(true);
  const [yearsError,   setYearsError]   = useState('');
  const [existingTerms,setExistingTerms]= useState([]);
  const [termsLoading, setTermsLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);

  /* submit */
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState('');

  /* rollout */
  const [rollingOutTermId, setRollingOutTermId] = useState(null);
  const [yearRollingOut,   setYearRollingOut]   = useState(false);
  const [rolloutMsg,       setRolloutMsg]       = useState({ type: '', text: '' });

  /* ---- load years on mount ---- */
  useEffect(() => {
    nodeGet('/api/superadmin/academic-years/')
      .then(data => {
        if (data.success) setYears(data.years || []);
        else setYearsError(data.message || 'Failed to load academic years.');
      })
      .catch(() => setYearsError(`Could not reach the backend at ${NODE_URL}. Make sure the Node server is running.`))
      .finally(() => setYearsLoading(false));
  }, []);

  /* ---- load existing terms when year changes ---- */
  const handleYearChange = useCallback(async (id) => {
    setYearId(id);
    setExistingTerms([]);
    setSelectedYear(null);
    setSaveError('');
    setRolloutMsg({ type: '', text: '' });
    if (!id) return;
    setSelectedYear(years.find(y => String(y.id) === String(id)) || null);
    setTermsLoading(true);
    try {
      const data = await nodeGet(`/api/superadmin/system-terms/?academic_year_id=${id}`);
      if (data.success) setExistingTerms(data.terms || []);
    } catch { /* ignore — existing terms is informational */ }
    finally { setTermsLoading(false); }
  }, [years]);

  /* ---- derived ---- */
  const duration       = useMemo(() => calcDuration(startDate, endDate), [startDate, endDate]);
  const overlapWith    = useMemo(() => checkOverlap(startDate, endDate, existingTerms), [startDate, endDate, existingTerms]);
  const outOfRange     = useMemo(() => checkOutOfRange(startDate, endDate, selectedYear), [startDate, endDate, selectedYear]);
  const endBeforeStart = !!(startDate && endDate && new Date(endDate) <= new Date(startDate));

  const isValid =
    yearId !== '' &&
    termOrder !== '' &&
    termName.trim().length > 0 &&
    !endBeforeStart;

  /* ---- actions ---- */
  const touch = (field) => setTouched(t => ({ ...t, [field]: true }));

  const handleReset = () => {
    setYearId(''); setTermOrder(''); setTermName(''); setDescription('');
    setStartDate(''); setEndDate(''); setSetAsActive(false);
    setTouched({}); setExistingTerms([]); setSelectedYear(null);
    setSaveError(''); setRolloutMsg({ type: '', text: '' });
  };

  const handleRolloutTerm = async (termId) => {
    setRollingOutTermId(termId);
    setRolloutMsg({ type: '', text: '' });
    try {
      const data = await nodePost(`/api/superadmin/system-terms/${termId}/rollout/`, {});
      if (!data.success) {
        setRolloutMsg({ type: 'error', text: data.message || 'Failed to roll out term.' });
        return;
      }
      const refreshed = await nodeGet(`/api/superadmin/system-terms/?academic_year_id=${yearId}`);
      if (refreshed.success) setExistingTerms(refreshed.terms || []);
      setRolloutMsg({ type: 'success', text: 'Term rolled out — it is now the active term.' });
    } catch (err) {
      setRolloutMsg({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setRollingOutTermId(null);
    }
  };

  const handleRolloutYear = async () => {
    if (!yearId) return;
    setYearRollingOut(true);
    setRolloutMsg({ type: '', text: '' });
    try {
      const data = await nodePost(`/api/superadmin/academic-years/${yearId}/rollout/`, {});
      if (!data.success) {
        setRolloutMsg({ type: 'error', text: data.message || 'Failed to roll out academic year.' });
        return;
      }
      const refreshed = await nodeGet('/api/superadmin/academic-years/');
      if (refreshed.success) {
        const updatedYears = refreshed.years || [];
        setYears(updatedYears);
        setSelectedYear(updatedYears.find(y => String(y.id) === String(yearId)) || selectedYear);
      }
      setRolloutMsg({ type: 'success', text: 'Academic year rolled out — it is now the active year.' });
    } catch (err) {
      setRolloutMsg({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setYearRollingOut(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ yearId: true, termOrder: true, termName: true });
    if (!isValid) return;
    setSaving(true);
    setSaveError('');
    try {
      const label = ORDER_OPTIONS.find(o => o.value === termOrder)?.label;
      const payload = {
        system_academic_year_id: Number(yearId),
        name: `${label} — ${termName.trim()}`,
        ...(startDate   && { start_date: startDate }),
        ...(endDate     && { end_date: endDate }),
        ...(description.trim() && { description: description.trim() }),
      };
      const data = await nodePost('/api/superadmin/system-terms/', payload);
      if (!data.success) { setSaveError(data.message || 'Failed to save term.'); return; }
      if (setAsActive && data.id) {
        await nodePost(`/api/superadmin/system-terms/${data.id}/rollout/`, {}).catch(() => {});
      }
      onSave && onSave(data);
      handleReset();
    } catch (err) {
      setSaveError(err.message || 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------------------------------------- */
  /*  Render                                                            */
  /* ---------------------------------------------------------------- */
  return (
    <div className="sact-wrap">
      <p className="sact-subtitle">
        Associate a new teaching term with an academic year. Dates are optional but
        recommended — they drive timetable scheduling and overlap detection.
      </p>

      <form className="sact-form" onSubmit={handleSubmit} noValidate>

        {/* ══ 1: Link to Year ══ */}
        <section className="sact-section">
          <div className="sact-section-title">
            <span className="sact-section-icon"><IcLink /></span>
            <h2>Link to Year</h2>
          </div>

          <div className="sact-field">
            <label className="sact-label" htmlFor="sact-year">ACADEMIC YEAR</label>
            <div className="sact-select-wrap">
              <select
                id="sact-year"
                autoFocus
                className={`sact-select${touched.yearId && !yearId ? ' sact-field--error' : ''}`}
                value={yearId}
                onChange={e => handleYearChange(e.target.value)}
                onBlur={() => touch('yearId')}
                disabled={yearsLoading || !!yearsError}
              >
                <option value="">
                  {yearsLoading ? 'Loading years…' : years.length === 0 ? 'No academic years found' : 'Select an academic year…'}
                </option>
                {years.map(y => (
                  <option key={y.id} value={y.id}>
                    {y.name}{y.is_active ? ' ★ Active' : ''}
                    {y.start_date && y.end_date ? `  ·  ${fmtDate(y.start_date)} – ${fmtDate(y.end_date)}` : ''}
                  </option>
                ))}
              </select>
              <span className="sact-select-chevron">
                {yearsLoading ? <IcSpinner /> : <IcChevron />}
              </span>
            </div>

            {/* Validation error */}
            {touched.yearId && !yearId && !yearsError && (
              <span className="sact-err">Academic year is required</span>
            )}

            {/* API error */}
            {yearsError && (
              <div className="sact-banner sact-banner--error" style={{ marginTop: 8 }}>
                <span className="sact-banner-icon"><IcWarn /></span>
                <div>
                  <p className="sact-banner-title">Could not load academic years</p>
                  <p className="sact-banner-body">{yearsError}</p>
                </div>
              </div>
            )}

            {/* Empty state (API succeeded but no years exist) */}
            {!yearsLoading && !yearsError && years.length === 0 && (
              <div className="sact-banner sact-banner--warn" style={{ marginTop: 8 }}>
                <span className="sact-banner-icon"><IcWarn /></span>
                <div>
                  <p className="sact-banner-title">No academic years yet</p>
                  <p className="sact-banner-body">
                    Create an academic year first before adding terms.
                  </p>
                </div>
              </div>
            )}

            {/* Roll Out Year button */}
            {selectedYear && (
              <div className="sact-year-rollout-row">
                {selectedYear.is_active
                  ? <span className="sact-badge-active" style={{ fontSize: '0.7rem' }}>Year Active</span>
                  : (
                    <button
                      type="button"
                      className={`sact-btn-rollout${yearRollingOut ? ' loading' : ''}`}
                      onClick={handleRolloutYear}
                      disabled={yearRollingOut}
                      title="Roll out this academic year (set as active)"
                    >
                      {yearRollingOut ? <IcSpinner /> : <IcRocket />}
                      {yearRollingOut ? 'Rolling out…' : 'Roll Out Year'}
                    </button>
                  )
                }
              </div>
            )}
          </div>

          {/* Existing terms for selected year */}
          {yearId && (
            <div className="sact-existing">
              <p className="sact-existing-label">
                EXISTING TERMS IN THIS YEAR
                {termsLoading && <span className="sact-loading-dot" />}
              </p>
              {!termsLoading && existingTerms.length === 0 && (
                <p className="sact-existing-empty">No terms yet — this will be the first.</p>
              )}
              {existingTerms.length > 0 && (
                <div className="sact-term-list">
                  {existingTerms.map(t => (
                    <div key={t.id} className="sact-term-row">
                      <span className={`sact-term-dot${t.is_active ? ' active' : ''}`} />
                      <span className="sact-term-name">{t.name}</span>
                      <span className="sact-term-dates">
                        {t.start_date ? `${fmtDate(t.start_date)} – ${fmtDate(t.end_date)}` : 'No dates'}
                      </span>
                      {t.is_active
                        ? <span className="sact-badge-active">Active</span>
                        : (
                          <button
                            type="button"
                            className={`sact-btn-rollout${rollingOutTermId === t.id ? ' loading' : ''}`}
                            onClick={() => handleRolloutTerm(t.id)}
                            disabled={!!rollingOutTermId || yearRollingOut}
                            title="Roll out this term (set as active)"
                          >
                            {rollingOutTermId === t.id ? <IcSpinner /> : <IcRocket />}
                            {rollingOutTermId === t.id ? 'Rolling…' : 'Roll Out'}
                          </button>
                        )
                      }
                    </div>
                  ))}
                </div>
              )}

              {/* Rollout result message */}
              {rolloutMsg.text && (
                <div className={`sact-banner sact-banner--${rolloutMsg.type === 'success' ? 'success' : 'error'}`} style={{ marginTop: 10 }}>
                  <span className="sact-banner-icon">
                    {rolloutMsg.type === 'success' ? <IcCheck /> : <IcWarn />}
                  </span>
                  <p className="sact-banner-body">{rolloutMsg.text}</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ══ 2: Term Identity ══ */}
        <section className="sact-section">
          <div className="sact-section-title">
            <span className="sact-section-icon"><IcInfo /></span>
            <h2>Term Identity</h2>
          </div>

          <div className="sact-grid-2">
            {/* Order */}
            <div className="sact-field">
              <label className="sact-label" htmlFor="sact-order">TERM ORDER</label>
              <div className="sact-select-wrap">
                <select
                  id="sact-order"
                  className={`sact-select${touched.termOrder && !termOrder ? ' sact-field--error' : ''}`}
                  value={termOrder}
                  onChange={e => setTermOrder(e.target.value)}
                  onBlur={() => touch('termOrder')}
                >
                  <option value="">Select order…</option>
                  {ORDER_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <span className="sact-select-chevron"><IcChevron /></span>
              </div>
              {touched.termOrder && !termOrder && (
                <span className="sact-err">Term order is required</span>
              )}
            </div>

            {/* Name */}
            <div className="sact-field">
              <label className="sact-label" htmlFor="sact-name">
                TERM LABEL
                <span className="sact-char-count">{termName.length}/{NAME_MAX}</span>
              </label>
              <input
                id="sact-name"
                type="text"
                className={`sact-input${touched.termName && !termName.trim() ? ' sact-field--error' : ''}`}
                placeholder="e.g. 2024, Harmattan, Michaelmas"
                maxLength={NAME_MAX}
                value={termName}
                onChange={e => setTermName(e.target.value)}
                onBlur={() => touch('termName')}
              />
              {touched.termName && !termName.trim() && (
                <span className="sact-err">Term label is required</span>
              )}
            </div>
          </div>

          {/* Preview */}
          {termOrder && termName.trim() && (
            <div className="sact-preview-row">
              <span className="sact-preview-label">SAVED AS</span>
              <span className="sact-preview-pill">
                <IcCheck />
                {ORDER_OPTIONS.find(o => o.value === termOrder)?.label} — {termName.trim()}
              </span>
            </div>
          )}
        </section>

        {/* ══ 3: Date Range ══ */}
        <section className="sact-section">
          <div className="sact-section-title">
            <span className="sact-section-icon"><IcDate /></span>
            <h2>Date Range <span className="sact-optional">(optional)</span></h2>
          </div>

          <div className="sact-grid-2">
            <div className="sact-field">
              <label className="sact-label" htmlFor="sact-start">START DATE</label>
              <input
                id="sact-start"
                type="date"
                className="sact-input sact-date-input"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="sact-field">
              <label className="sact-label" htmlFor="sact-end">END DATE</label>
              <input
                id="sact-end"
                type="date"
                className={`sact-input sact-date-input${endBeforeStart ? ' sact-field--error' : ''}`}
                value={endDate}
                min={startDate || undefined}
                onChange={e => setEndDate(e.target.value)}
              />
              {endBeforeStart && (
                <span className="sact-err">End date must be after start date</span>
              )}
            </div>
          </div>

          {duration && (
            <div className="sact-duration-row">
              <span className="sact-duration-badge">
                <IcClock />
                {duration.weeks} week{duration.weeks !== 1 ? 's' : ''} · {duration.days} day{duration.days !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {outOfRange && (
            <div className="sact-banner sact-banner--warn">
              <span className="sact-banner-icon"><IcWarn /></span>
              <div>
                <p className="sact-banner-title">Dates outside year range</p>
                <p className="sact-banner-body">
                  Selected dates fall outside {selectedYear?.name}'s bounds
                  ({fmtDate(selectedYear?.start_date)} – {fmtDate(selectedYear?.end_date)}).
                </p>
              </div>
            </div>
          )}

          {overlapWith && (
            <div className="sact-banner sact-banner--warn">
              <span className="sact-banner-icon"><IcWarn /></span>
              <div>
                <p className="sact-banner-title">Date overlap detected</p>
                <p className="sact-banner-body">
                  These dates overlap with <strong>{overlapWith}</strong>. Review before saving.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* ══ 4: Description ══ */}
        <section className="sact-section">
          <div className="sact-section-title">
            <span className="sact-section-icon"><IcNotes /></span>
            <h2>Description <span className="sact-optional">(optional)</span></h2>
          </div>
          <div className="sact-field">
            <label className="sact-label" htmlFor="sact-desc">
              NOTES / CONTEXT
              <span className="sact-char-count">{description.length}/{DESC_MAX}</span>
            </label>
            <textarea
              id="sact-desc"
              className="sact-input sact-textarea"
              placeholder="e.g. Includes mid-term break, post-harvest period, second examination cycle…"
              rows={3}
              maxLength={DESC_MAX}
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
            <span className="sact-field-hint">
              Administrative notes visible to superadmin only.
            </span>
          </div>
        </section>

        {/* ══ 5: Configuration ══ */}
        <section className="sact-section">
          <div className="sact-section-title">
            <span className="sact-section-icon"><IcCog /></span>
            <h2>Configuration</h2>
          </div>
          <div className="sact-toggle-row">
            <div>
              <p className="sact-toggle-title">Set as active term</p>
              <p className="sact-toggle-sub">
                Immediately marks this as the running term. All other terms in this year will be deactivated.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={setAsActive}
              className={`sact-toggle${setAsActive ? ' on' : ''}`}
              onClick={() => setSetAsActive(v => !v)}
            >
              <span className="sact-toggle-thumb" />
            </button>
          </div>
        </section>

        {/* Save error */}
        {saveError && (
          <div className="sact-banner sact-banner--error">
            <span className="sact-banner-icon"><IcWarn /></span>
            <p className="sact-banner-body">{saveError}</p>
          </div>
        )}

        {/* ══ Footer ══ */}
        <footer className="sact-footer">
          <button type="button" className="sact-btn-reset" onClick={handleReset} disabled={saving}>
            <IcReset /> Reset
          </button>
          <button
            type="submit"
            className={`sact-btn-save${(!isValid || saving) ? ' sact-btn-save--disabled' : ''}`}
            disabled={!isValid || saving}
          >
            {saving
              ? <><IcSpinner /> Saving…</>
              : <><IcSave /> Save Term</>
            }
          </button>
        </footer>

      </form>
    </div>
  );
}
