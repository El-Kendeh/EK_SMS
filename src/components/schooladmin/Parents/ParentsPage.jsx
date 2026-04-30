import React, { useEffect, useMemo, useState, useCallback } from 'react';
import ApiClient from '../../../api/client';
import { enrichParent } from './utils';
import StatsCards         from './StatsCards';
import FiltersBar         from './FiltersBar';
import ParentCard         from './ParentCard';
import LinkStudentModal   from './LinkStudentModal';
import CommunicationPanel from './CommunicationPanel';
import ParentDetails      from './ParentDetails';
import './Parents.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

export default function ParentsPage({ school }) {
  const [rawParents, setRawParents] = useState([]);
  const [loading,    setLoading]    = useState(true);

  const [search,       setSearch]       = useState('');
  const [filterLink,   setFilterLink]   = useState('all');
  const [filterRel,    setFilterRel]    = useState('all');
  const [filterClass,  setFilterClass]  = useState('all');
  const [filterAlert,  setFilterAlert]  = useState('all');

  /* Modal state */
  const [detailsOf,  setDetailsOf]  = useState(null);
  const [linkOf,     setLinkOf]     = useState(null);
  const [messageOf,  setMessageOf]  = useState(null);
  const [broadcast,  setBroadcast]  = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    ApiClient.get('/api/school/parents/')
      .then(d => setRawParents(d.parents || []))
      .catch(() => setRawParents([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Enrich + filter */
  const parents = useMemo(() => rawParents.map(enrichParent), [rawParents]);

  const classOptions = useMemo(() => {
    const set = new Set();
    parents.forEach(p => p.children?.forEach(c => c.class && set.add(c.class)));
    return Array.from(set).sort();
  }, [parents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return parents.filter(p => {
      if (q) {
        const matchSelf = (p.name || '').toLowerCase().includes(q) ||
                          (p.email || '').toLowerCase().includes(q) ||
                          (p.phone || '').toLowerCase().includes(q);
        const matchKid  = (p.children || []).some(c => (c.name || '').toLowerCase().includes(q));
        if (!matchSelf && !matchKid) return false;
      }
      if (filterLink === 'linked'   && (p.children?.length || 0) === 0) return false;
      if (filterLink === 'unlinked' && (p.children?.length || 0) > 0)   return false;
      if (filterRel !== 'all' && p.relationshipNorm !== filterRel)      return false;
      if (filterClass !== 'all' && !(p.children || []).some(c => c.class === filterClass)) return false;
      if (filterAlert === 'any' && p.alerts.length === 0) return false;
      if (filterAlert !== 'all' && filterAlert !== 'any' &&
          !p.alerts.some(a => a.kind === filterAlert)) return false;
      return true;
    });
  }, [parents, search, filterLink, filterRel, filterClass, filterAlert]);

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Parents &amp; Engagement</h1>
          <p className="ska-page-sub">{school?.name} — family relationships, monitoring &amp; communication</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="ska-btn ska-btn--ghost" onClick={load} disabled={loading}>
            <Ic name="refresh" size="sm" /> Refresh
          </button>
          <button className="ska-btn ska-btn--primary" onClick={() => setBroadcast(true)}>
            <Ic name="campaign" size="sm" /> Broadcast
          </button>
        </div>
      </div>

      <StatsCards parents={parents} loading={loading} />

      <FiltersBar
        search={search}              setSearch={setSearch}
        filterLink={filterLink}      setFilterLink={setFilterLink}
        filterRel={filterRel}        setFilterRel={setFilterRel}
        filterClass={filterClass}    setFilterClass={setFilterClass}
        filterAlert={filterAlert}    setFilterAlert={setFilterAlert}
        classOptions={classOptions}
        onBroadcast={() => setBroadcast(true)}
      />

      <div className="ska-prnt-card-list">
        {loading ? (
          <div className="ska-card ska-empty"><p className="ska-empty-desc">Loading parents…</p></div>
        ) : filtered.length === 0 ? (
          <div className="ska-card ska-empty">
            <Ic name="family_restroom" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
            <p className="ska-empty-title">{rawParents.length === 0 ? 'No parents registered' : 'No matching parents'}</p>
            <p className="ska-empty-desc">
              {rawParents.length === 0
                ? 'Parent accounts are created during student registration.'
                : 'Try adjusting search or filters.'}
            </p>
          </div>
        ) : filtered.map(p => (
          <ParentCard
            key={p.id}
            parent={p}
            onView={setDetailsOf}
            onLink={setLinkOf}
            onMessage={setMessageOf}
          />
        ))}
      </div>

      {detailsOf && (
        <ParentDetails
          parent={detailsOf}
          onClose={() => setDetailsOf(null)}
          onLink={(p) => { setDetailsOf(null); setLinkOf(p); }}
          onMessage={(p) => { setDetailsOf(null); setMessageOf(p); }}
        />
      )}

      {linkOf && (
        <LinkStudentModal
          parent={linkOf}
          onClose={() => setLinkOf(null)}
          onLinked={load}
        />
      )}

      {messageOf && (
        <CommunicationPanel
          mode="direct"
          parent={messageOf}
          onClose={() => setMessageOf(null)}
        />
      )}

      {broadcast && (
        <CommunicationPanel
          mode="broadcast"
          recipientsCount={filtered.length}
          onClose={() => setBroadcast(false)}
        />
      )}
    </div>
  );
}
