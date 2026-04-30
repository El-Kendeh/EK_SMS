import React from 'react';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const PERIODS = 8;

export default function AvailabilityGrid({ availability, onToggle, onSelectAll, onClear }) {
  const total = Object.values(availability).reduce(
    (n, row) => n + row.filter(Boolean).length, 0
  );

  return (
    <div className="tea-avail">
      <div className="tea-avail__head">
        <div>
          <strong>{total} of {DAYS.length * PERIODS} slots</strong>
          <span> · click any cell to toggle</span>
        </div>
        <div className="tea-avail__head-btns">
          <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm" onClick={onSelectAll}>All on</button>
          <button type="button" className="ska-btn ska-btn--ghost ska-btn--sm" onClick={onClear}>Clear</button>
        </div>
      </div>

      <div className="tea-avail__scroll">
        <div className="tea-avail__grid">
          <div></div>
          {Array.from({ length: PERIODS }, (_, i) => (
            <div key={`h-${i}`} className="tea-avail__head-cell">P{i + 1}</div>
          ))}
          {DAYS.map(day => (
            <React.Fragment key={day}>
              <div className="tea-avail__day">{day}</div>
              {availability[day].map((on, pi) => (
                <button
                  key={`${day}-${pi}`}
                  type="button"
                  onClick={() => onToggle(day, pi)}
                  title={`${day} P${pi + 1}: ${on ? 'available' : 'unavailable'}`}
                  className={`tea-avail__cell ${on ? 'is-on' : ''}`}
                >
                  {on ? '✓' : ''}
                </button>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
