import React from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const LINK_OPTS = [
  { key: 'all',      label: 'All' },
  { key: 'linked',   label: 'Has children' },
  { key: 'unlinked', label: 'No children' },
];
const REL_OPTS = [
  { key: 'all',      label: 'All relationships' },
  { key: 'Mother',   label: 'Mother' },
  { key: 'Father',   label: 'Father' },
  { key: 'Guardian', label: 'Guardian' },
];
const ALERT_OPTS = [
  { key: 'all',     label: 'No filter' },
  { key: 'any',     label: 'Has alerts' },
  { key: 'low_performance', label: 'Low performance' },
  { key: 'low_attendance',  label: 'Low attendance' },
  { key: 'fee_overdue',     label: 'Fee overdue' },
];

export default function FiltersBar({
  search, setSearch,
  filterLink, setFilterLink,
  filterRel, setFilterRel,
  filterClass, setFilterClass,
  filterAlert, setFilterAlert,
  classOptions = [],
  onBroadcast,
}) {
  return (
    <div className="ska-card ska-card-pad ska-prnt-filters">
      <div className="ska-prnt-filters__row">
        <div className="ska-prnt-search">
          <Ic name="search" size="sm" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ska-text-3)' }} />
          <input
            className="ska-input"
            placeholder="Search parents, email, or student name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 38, width: '100%' }}
          />
        </div>

        <button className="ska-btn ska-btn--secondary" onClick={onBroadcast} style={{ flexShrink: 0 }}>
          <Ic name="campaign" size="sm" /> Broadcast
        </button>
      </div>

      <div className="ska-prnt-filters__chips">
        {LINK_OPTS.map(o => (
          <button
            key={o.key}
            type="button"
            className={`ska-prnt-chip ${filterLink === o.key ? 'is-active' : ''}`}
            onClick={() => setFilterLink(o.key)}
          >
            {o.label}
          </button>
        ))}
        <span className="ska-prnt-chip-divider" />
        <select className="ska-input ska-prnt-chip-select" value={filterRel} onChange={e => setFilterRel(e.target.value)}>
          {REL_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <select className="ska-input ska-prnt-chip-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="all">All classes</option>
          {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="ska-input ska-prnt-chip-select" value={filterAlert} onChange={e => setFilterAlert(e.target.value)}>
          {ALERT_OPTS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}
