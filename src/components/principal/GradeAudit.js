import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { principalApi } from '../../api/adminApi';
import { timeAgo } from '../schooladmin/Principal/principal.utils';
import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css'; // defines the .pu-* classes this page renders
import './GradeApprovals.css';                   // ga-banner / ga-btn / ga-pager / ga-badge
import './GradeAudit.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const EVENT_TYPES = [
  { key: '',        label: 'All events' },
  { key: 'submit',  label: 'Submitted' },
  { key: 'update',  label: 'Updated' },
  { key: 'approve', label: 'Approved' },
  { key: 'reject',  label: 'Rejected' },
  { key: 'publish', label: 'Published' },
];

const EVENT_ICON = {
  approve: { icon: 'fact_check', color: 'var(--ska-green)' },
  reject:  { icon: 'block',      color: 'var(--ska-error)' },
  publish: { icon: 'publish',    color: 'var(--ska-primary)' },
  submit:  { icon: 'edit_note',  color: '#f59e0b' },
  update:  { icon: 'edit_note',  color: '#f59e0b' },
  create:  { icon: 'edit_note',  color: '#f59e0b' },
};

const PAGE_SIZE = 50;

export default function GradeAudit() {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState('');
  const [search, setSearch] = useState('');
  const [chain, setChain] = useState(null);       // null | {valid, checked, broken_at_id?, note?}
  const [verifying, setVerifying] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback((withVerify = false) => {
    if (withVerify) setVerifying(true); else setLoading(true);
    setError(null);
    const params = { page, page_size: PAGE_SIZE };
    if (eventType) params.event_type = eventType;
    if (withVerify) params.verify = '1';

    principalApi.getGradeAudit(params)
      .then(res => {
        if (res?.success === false) { setError(res.message || 'Failed to load grade audit'); return; }
        setEvents(res.events || []);
        setTotal(res.total ?? (res.events || []).length);
        if (withVerify) setChain(res.chain || null);
      })
      .catch(err => setError(err.message))
      .finally(() => { setLoading(false); setVerifying(false); });
  }, [page, eventType]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [eventType]);

  /* The search box filters the loaded page by student name — the chain itself
     is paginated server-side, so this is a page-level lens, not a query. */
  const visible = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.trim().toLowerCase();
    return events.filter(e => (e.student_name || '').toLowerCase().includes(q));
  }, [events, search]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="pu-page gau-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Grade Audit Trail</h1>
          <p className="ska-page-sub">Tamper-evident, hash-chained record of every grade change</p>
        </div>
        <button type="button" className="ga-btn ga-btn--primary gau-verify-btn"
          disabled={verifying || loading} onClick={() => load(true)}>
          <Ic name="verified_user" size="sm" /> {verifying ? 'Verifying…' : 'Verify chain'}
        </button>
      </div>

      {chain && chain.valid === true && (
        <div className="ga-banner ga-banner--success">
          <Ic name="verified" size="sm" />
          Chain verified — {chain.checked} event{chain.checked !== 1 ? 's' : ''} intact (SHA-256).
        </div>
      )}
      {chain && chain.valid === false && (
        <div className="ga-banner ga-banner--error">
          <Ic name="gpp_bad" size="sm" />
          TAMPER ALERT — chain breaks at event #{chain.broken_at_id}. Events after this point cannot be trusted.
        </div>
      )}
      {chain && chain.valid === null && (
        <div className="ga-banner gau-banner--neutral">
          <Ic name="info" size="sm" />
          {chain.note || 'Chain not verified.'}
        </div>
      )}

      <div className="gau-filters">
        <div className="pu-chips gau-chips" role="tablist" aria-label="Event type filter">
          {EVENT_TYPES.map(t => (
            <button key={t.key || 'all'} type="button" role="tab" aria-selected={eventType === t.key}
              className={`pu-pill${eventType === t.key ? ' pu-pill--on' : ''}`}
              onClick={() => setEventType(t.key)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="gau-search">
          <Ic name="search" size="sm" />
          <input
            type="text"
            placeholder="Filter this page by student name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Filter events by student name"
          />
        </div>
      </div>

      {error && (
        <div className="pu-empty">
          <Ic name="error" size="xl" />
          <p className="pu-empty__title">Couldn't load grade audit</p>
          <p className="pu-empty__desc">{error}</p>
        </div>
      )}

      {!error && loading && (
        <div className="pu-empty">
          <Ic name="hourglass_empty" size="xl" />
          <p className="pu-empty__title">Loading…</p>
        </div>
      )}

      {!error && !loading && events.length === 0 && (
        <div className="pu-empty">
          <Ic name="receipt_long" size="xl" />
          <p className="pu-empty__title">No grade events yet</p>
          <p className="pu-empty__desc">Events appear as teachers submit and you approve grades.</p>
        </div>
      )}

      {!error && !loading && events.length > 0 && visible.length === 0 && (
        <div className="pu-empty">
          <Ic name="search_off" size="xl" />
          <p className="pu-empty__title">No events on this page match "{search}"</p>
        </div>
      )}

      {!error && !loading && visible.length > 0 && (
        <div className="gau-timeline">
          {visible.map(e => {
            const meta = EVENT_ICON[e.event_type] || { icon: 'history', color: 'var(--ska-text-3)' };
            const broken = chain && chain.valid === false && chain.broken_at_id != null && e.id >= chain.broken_at_id;
            return (
              <div key={e.id} className={`gau-event${broken ? ' gau-event--broken' : ''}`}>
                <span className="gau-event__icon" style={{ color: meta.color }}>
                  <Ic name={meta.icon} />
                </span>
                <div className="gau-event__body">
                  <p className="gau-event__line">
                    <strong>{e.actor_name || 'System'}</strong>
                    <span className={`ga-badge gau-badge--${e.event_type}`}>{e.event_type}</span>
                    {e.student_name && <strong>{e.student_name}</strong>}
                    {e.subject_name && <span className="gau-event__subject"> · {e.subject_name}</span>}
                  </p>
                  {(e.old_value != null || e.new_value != null) && (
                    <p className="gau-event__change">
                      {e.field ? <span className="gau-event__field">{e.field}: </span> : null}
                      <span className="gau-event__old">{e.old_value ?? '—'}</span>
                      <Ic name="arrow_forward" size="sm" />
                      <span className="gau-event__new">{e.new_value ?? '—'}</span>
                    </p>
                  )}
                  <p className="gau-event__meta">
                    <span title={e.created_at ? new Date(e.created_at).toLocaleString() : ''}>
                      {timeAgo(e.created_at)}
                    </span>
                    <code className="gau-event__hash" title={e.hash}>{(e.hash || '').slice(0, 12)}</code>
                    <span className="gau-event__id">#{e.id}</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!error && !loading && total > PAGE_SIZE && (
        <div className="ga-pager">
          <button type="button" className="ga-btn ga-btn--ghost" disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}>
            <Ic name="chevron_left" size="sm" /> Prev
          </button>
          <span className="ga-pager__info">Page {page} of {totalPages} · {total} events</span>
          <button type="button" className="ga-btn ga-btn--ghost" disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}>
            Next <Ic name="chevron_right" size="sm" />
          </button>
        </div>
      )}
    </div>
  );
}
