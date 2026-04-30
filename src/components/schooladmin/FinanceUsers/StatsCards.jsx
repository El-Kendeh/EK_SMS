import React from 'react';
import { fmtUsdCompact } from './finance.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Compact horizontal stat cards across the top of the Finance Users page.
 * 5 cards: Total / Active / Suspended / Transactions Today / Volume Today.
 */
export default function StatsCards({ summary, loading }) {
  const cards = [
    {
      key: 'total', icon: 'manage_accounts',
      tone: 'primary', label: 'Total Finance Users',
      value: summary.total, sub: `${summary.active} active · ${summary.suspended} suspended`,
    },
    {
      key: 'active', icon: 'check_circle',
      tone: 'green', label: 'Active Users',
      value: summary.active,
      sub: summary.total ? `${Math.round(summary.active / summary.total * 100)}% of team` : 'No team yet',
    },
    {
      key: 'suspended', icon: 'block',
      tone: 'red', label: 'Suspended',
      value: summary.suspended,
      sub: summary.suspended ? 'Access revoked' : 'No suspensions',
    },
    {
      key: 'tx', icon: 'receipt_long',
      tone: 'cyan', label: 'Transactions Today',
      value: summary.txToday,
      sub: `${summary.receipts} receipts · ${summary.refunds} refunds`,
    },
    {
      key: 'vol', icon: 'payments',
      tone: 'amber', label: 'Total Volume Today',
      value: fmtUsdCompact(summary.volToday),
      sub: `${fmtUsdCompact(summary.volToday)} processed today`,
    },
  ];

  return (
    <div className="fu-stats">
      {cards.map(c => (
        <div key={c.key} className={`fu-stat fu-stat--${c.tone}`}>
          <div className="fu-stat__icon">
            <Ic name={c.icon} />
          </div>
          <div className="fu-stat__body">
            <span className="fu-stat__label">{c.label}</span>
            <strong className="fu-stat__value">{loading ? '…' : c.value}</strong>
            <span className="fu-stat__sub">{c.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
