import React from 'react';
import { fmtUsdCompact } from './finance.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Today's Financial Activity panel — payments / receipts / refunds /
 * volume — at a glance for the school admin.
 */
export default function ActivityPanel({ summary }) {
  const items = [
    { key: 'pay',      icon: 'payments',     label: 'Payments',  value: summary.txToday,                     tone: 'primary' },
    { key: 'receipts', icon: 'receipt_long', label: 'Receipts',  value: summary.receipts,                    tone: 'green' },
    { key: 'refunds',  icon: 'undo',         label: 'Refunds',   value: summary.refunds,                     tone: 'amber' },
    { key: 'volume',   icon: 'account_balance_wallet',
      label: 'Volume',
      value: fmtUsdCompact(summary.volToday),
      tone: 'cyan',
    },
  ];
  return (
    <div className="fu-activity">
      <div className="fu-activity__head">
        <div className="fu-activity__title">
          <Ic name="insights" size="sm" />
          <strong>Today's Financial Activity</strong>
        </div>
        <span className="fu-activity__sub">across {summary.active} active staff</span>
      </div>
      <div className="fu-activity__row">
        {items.map(it => (
          <div key={it.key} className={`fu-activity__pill fu-activity__pill--${it.tone}`}>
            <Ic name={it.icon} />
            <div>
              <span>{it.label}</span>
              <strong>{it.value}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
