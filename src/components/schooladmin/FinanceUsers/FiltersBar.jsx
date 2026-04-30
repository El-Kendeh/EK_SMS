import React from 'react';
import {
  FU_ROLE_KEYS, FU_STATUS_OPTIONS, FU_ACTIVITY_OPTIONS, FU_RISK_OPTIONS,
} from './finance.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Search + filter chips for the Finance Users page. Keeps the same filter
 * keys as the existing inline implementation so logic stays untouched.
 */
export default function FiltersBar({
  search, onSearch,
  roleFilter, onRole,
  statusFilter, onStatus,
  activityFilter, onActivity,
  riskFilter, onRisk,
}) {
  const Group = ({ label, value, options, onPick }) => (
    <div className="fu-filters__group">
      <span className="fu-filters__label">{label}</span>
      {options.map(o => (
        <button key={o.key} type="button"
          className={`fu-pill ${value === o.key ? 'fu-pill--on' : ''}`}
          onClick={() => onPick(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );

  const roleOptions = [{ key: 'all', label: 'All' }, ...FU_ROLE_KEYS.map(r => ({ key: r, label: r }))];

  return (
    <div className="fu-filters">
      <div className="fu-filters__search">
        <Ic name="search" />
        <input
          className="fu-filters__input"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => onSearch(e.target.value)}
        />
        {search && (
          <button type="button" className="fu-filters__clear"
            onClick={() => onSearch('')} aria-label="Clear search">
            <Ic name="close" size="sm" />
          </button>
        )}
      </div>
      <div className="fu-filters__row">
        <Group label="Role"     value={roleFilter}     options={roleOptions}        onPick={onRole} />
        <Group label="Status"   value={statusFilter}   options={FU_STATUS_OPTIONS}  onPick={onStatus} />
        <Group label="Activity" value={activityFilter} options={FU_ACTIVITY_OPTIONS} onPick={onActivity} />
        <Group label="Risk"     value={riskFilter}     options={FU_RISK_OPTIONS}    onPick={onRisk} />
      </div>
    </div>
  );
}
