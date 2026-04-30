import React from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Risk & Alerts panel — flags suspicious transactions, volume spikes,
 * refund anomalies. `alerts` comes pre-built from generateAlerts(users).
 */
export default function AlertsPanel({ alerts }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="fu-alerts fu-alerts--ok">
        <Ic name="verified" />
        <div>
          <strong>All clear</strong>
          <p>No suspicious activity, volume spikes, or refund anomalies detected today.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="fu-alerts">
      <div className="fu-alerts__head">
        <Ic name="notifications_active" size="sm" />
        <strong>{alerts.length} alert{alerts.length !== 1 ? 's' : ''} need attention</strong>
      </div>
      <div className="fu-alerts__list">
        {alerts.map(a => (
          <div key={a.key} className={`fu-alert fu-alert--${a.tone}`}>
            <Ic name={a.icon} />
            <div className="fu-alert__body">
              <strong>{a.title}</strong>
              <p>{a.detail}</p>
            </div>
            <span className="fu-alert__badge">
              {a.tone === 'critical' ? 'CRITICAL' : 'WARNING'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
