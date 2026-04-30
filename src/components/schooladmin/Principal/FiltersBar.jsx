import React from 'react';
import { PU_ROLE_KEYS, PU_STATUS_OPTIONS } from './principal.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Search + filter chips for the principal-staff cards section.
 */
export default function FiltersBar({
  search, onSearch,
  roleFilter, onRole,
  statusFilter, onStatus,
}) {
  const Group = ({ label, value, options, onPick }) => (
    <div className="pu-filters__group">
      <span className="pu-filters__label">{label}</span>
      {options.map(o => (
        <button key={o.key} type="button"
          className={`pu-pill ${value === o.key ? 'pu-pill--on' : ''}`}
          onClick={() => onPick(o.key)}>{o.label}</button>
      ))}
    </div>
  );
  const roleOptions = [{ key: 'all', label: 'All' }, ...PU_ROLE_KEYS.map(r => ({ key: r, label: r }))];

  return (
    <div className="pu-filters">
      <div className="pu-filters__search">
        <Ic name="search" />
        <input
          className="pu-filters__input"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => onSearch(e.target.value)} />
        {search && (
          <button type="button" className="pu-filters__clear"
            onClick={() => onSearch('')} aria-label="Clear search">
            <Ic name="close" size="sm" />
          </button>
        )}
      </div>
      <div className="pu-filters__row">
        <Group label="Role"   value={roleFilter}   options={roleOptions}       onPick={onRole} />
        <Group label="Status" value={statusFilter} options={PU_STATUS_OPTIONS} onPick={onStatus} />
      </div>
    </div>
  );
}
