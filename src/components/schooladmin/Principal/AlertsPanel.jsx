import React from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Critical Alerts panel — surfaces grade-modification attempts,
 * low-attendance classes, and financial anomalies.
 */
export default function AlertsPanel({ alerts }) {
  return (
    <div className="pu-card pu-alerts">
      <div className="pu-card__head">
        <div className="pu-card__title">
          <Ic name="warning" size="sm" />
          <strong>Critical Alerts</strong>
        </div>
        <span className="pu-card__count">{alerts.length}</span>
      </div>
      {alerts.length === 0 ? (
        <div className="pu-alerts__ok">
          <Ic name="verified" />
          <div>
            <strong>All clear</strong>
            <p>No active alerts at the moment.</p>
          </div>
        </div>
      ) : (
        <div className="pu-alerts__list">
          {alerts.map(a => (
            <div key={a.key} className={`pu-alert pu-alert--${a.tone}`}>
              <Ic name={a.icon} />
              <div className="pu-alert__body">
                <strong>{a.title}</strong>
                <p>{a.detail}</p>
              </div>
              <span className="pu-alert__badge">
                {a.tone === 'critical' ? 'CRITICAL' : 'WARNING'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
