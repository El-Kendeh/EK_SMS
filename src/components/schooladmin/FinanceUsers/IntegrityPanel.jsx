import React from 'react';
import { FU_INTEGRITY_BADGES } from './finance.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Banking-grade trust panel. Confirms to the school admin that every
 * finance transaction is hashed, audit-trailed, and tamper-evident.
 */
export default function IntegrityPanel({ summary }) {
  return (
    <div className="fu-integrity">
      <div className="fu-integrity__shield">
        <div className="fu-integrity__shield-ring">
          <Ic name="lock" />
        </div>
      </div>
      <div className="fu-integrity__body">
        <div className="fu-integrity__head">
          <Ic name="verified_user" size="sm" />
          <strong>System Integrity</strong>
          <span className="fu-integrity__pulse">ACTIVE</span>
        </div>
        <p className="fu-integrity__sub">
          All transactions are securely logged and audited.
          {summary?.txToday ? ` ${summary.txToday} transactions hashed today.` : ''}
        </p>
        <div className="fu-integrity__badges">
          {FU_INTEGRITY_BADGES.map(b => (
            <span key={b.key} className="fu-integrity__badge"
              style={{ color: b.color, borderColor: `${b.color}55`, background: `${b.color}10` }}>
              <Ic name={b.icon} size="sm" /> {b.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
