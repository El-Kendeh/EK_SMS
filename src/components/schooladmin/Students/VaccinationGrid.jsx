import React from 'react';
import { VACCINATIONS } from './students.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const TODAY = () => new Date().toISOString().slice(0, 10);

/**
 * Grid of vaccination check-ins with a date input per row.
 * `vaccinations` = { bcg: '2018-04-12', opv: '2018-06-10', ... }
 */
export default function VaccinationGrid({ vaccinations = {}, onChange }) {
  const set = (k, v) => onChange({ ...vaccinations, [k]: v });
  const toggleToday = (k) => {
    if (vaccinations[k]) set(k, '');
    else set(k, TODAY());
  };
  const total = VACCINATIONS.length;
  const recorded = VACCINATIONS.filter(v => vaccinations[v.key]).length;

  return (
    <div className="stu-vacc">
      <div className="stu-vacc__head">
        <span>Recorded {recorded} of {total}</span>
        <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm"
          onClick={() => onChange(Object.fromEntries(VACCINATIONS.map(v => [v.key, TODAY()])))}>
          <Ic name="check_circle" size="sm" /> Mark all today
        </button>
        <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm"
          onClick={() => onChange({})}>
          <Ic name="clear_all" size="sm" /> Clear
        </button>
      </div>
      <div className="stu-vacc__grid">
        {VACCINATIONS.map(v => {
          const date = vaccinations[v.key] || '';
          const has  = !!date;
          return (
            <div key={v.key} className={`stu-vacc__row ${has ? 'is-on' : ''}`}>
              <button type="button" className="stu-vacc__check" onClick={() => toggleToday(v.key)}
                title={has ? 'Clear' : 'Mark today'}>
                <Ic name={has ? 'check_circle' : 'circle'} />
              </button>
              <div className="stu-vacc__label">
                <strong>{v.label}</strong>
                <small>{v.hint}</small>
              </div>
              <input
                type="date"
                className="ska-input"
                value={date}
                max={TODAY()}
                onChange={e => set(v.key, e.target.value)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
