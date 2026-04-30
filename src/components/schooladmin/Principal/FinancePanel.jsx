import React from 'react';
import { fmtUsd } from './principal.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Financial Snapshot — revenue, outstanding fees, recent payments.
 */
export default function FinancePanel({ data }) {
  const collectionRate = Math.round(
    (data.revenue / Math.max(1, data.revenue + data.outstanding)) * 100
  );
  return (
    <div className="pu-card pu-finance">
      <div className="pu-card__head">
        <div className="pu-card__title">
          <Ic name="account_balance_wallet" size="sm" />
          <strong>Financial Snapshot</strong>
        </div>
        <span className="pu-card__sub">This term</span>
      </div>

      <div className="pu-finance__kpis">
        <div className="pu-finance__kpi pu-finance__kpi--green">
          <span>Total Revenue</span>
          <strong>{fmtUsd(data.revenue)}</strong>
        </div>
        <div className={`pu-finance__kpi ${data.outstanding > 9000 ? 'pu-finance__kpi--red' : 'pu-finance__kpi--amber'}`}>
          <span>Outstanding Fees</span>
          <strong>{fmtUsd(data.outstanding)}</strong>
        </div>
        <div className="pu-finance__kpi pu-finance__kpi--primary">
          <span>Payments Today</span>
          <strong>{data.paymentsToday}</strong>
        </div>
      </div>

      <div className="pu-finance__bar">
        <div className="pu-finance__bar-head">
          <span>Collection rate</span>
          <strong>{collectionRate}%</strong>
        </div>
        <div className="pu-finance__bar-track">
          <div className="pu-finance__bar-fill"
            style={{
              width: `${collectionRate}%`,
              background: collectionRate >= 80 ? 'var(--ska-green)'
                        : collectionRate >= 65 ? '#f59e0b'
                        : 'var(--ska-error)',
            }} />
        </div>
      </div>

      <h5 className="pu-finance__list-title">Recent Payments</h5>
      <ul className="pu-finance__list">
        {data.transactions.map((t, i) => (
          <li key={i}>
            <Ic name="receipt_long" size="sm" />
            <div>
              <p>{t.label}</p>
              <span>{t.at}</span>
            </div>
            <strong>{fmtUsd(t.amount)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
