import React from 'react';
import { FU_HEAT_TONE } from './finance.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Lightweight heat summary — Morning / Afternoon / Evening. CSS bars only,
 * no chart library.
 */
export default function TransactionHeat({ heat }) {
  if (!heat || heat.length === 0) return null;
  return (
    <div className="fu-heat">
      <div className="fu-heat__head">
        <Ic name="bar_chart" size="sm" />
        <strong>Transaction Heat</strong>
        <span>How activity is distributed across the day</span>
      </div>
      <div className="fu-heat__row">
        {heat.map(h => {
          const tone = FU_HEAT_TONE[h.level] || FU_HEAT_TONE.Low;
          return (
            <div key={h.key} className="fu-heat__col">
              <div className="fu-heat__col-head">
                <Ic name={h.icon} size="sm" />
                <strong>{h.label}</strong>
                <span>{h.sub}</span>
              </div>
              <div className="fu-heat__bar-track">
                <div className="fu-heat__bar"
                  style={{ width: `${h.pct}%`, background: tone.color }} />
              </div>
              <div className="fu-heat__col-foot">
                <span className="fu-heat__level"
                  style={{ color: tone.color, background: tone.bg }}>
                  {h.level}
                </span>
                <span className="fu-heat__count">{h.count} tx</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
