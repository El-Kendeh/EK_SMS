import React from 'react';
import { fmtLrd, timeAgo } from './principal.utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Financial Snapshot — revenue, outstanding fees, recent payments.
 * Renders an honest empty state until the school has real fee/payment data —
 * never confident $0 figures about data that was never recorded.
 */
export default function FinancePanel({ data }) {
  const hasData = data.has_data === true;
  // Prefer the server-computed collection rate; fall back to a local estimate.
  const collectionRate = data.collection_rate != null
    ? data.collection_rate
    : Math.round((data.revenue / Math.max(1, (data.revenue || 0) + (data.outstanding || 0))) * 100);

  return (
    <div className="pu-card pu-finance">
      <div className="pu-card__head">
        <div className="pu-card__title">
          <Ic name="account_balance_wallet" size="sm" />
          <strong>Financial Snapshot</strong>
        </div>
        <span className="pu-card__sub">{data.term ? `Term: ${data.term}` : 'No active term'}</span>
      </div>

      {!hasData ? (
        <div className="pu-empty">
          <Ic name="account_balance_wallet" />
          <p>No finance records yet</p>
          <span>Figures appear once the bursar assigns fees and records payments.</span>
        </div>
      ) : (
        <>
          <div className="pu-finance__kpis">
            <div className="pu-finance__kpi pu-finance__kpi--green">
              <span>Total Revenue</span>
              <strong>{fmtLrd(data.revenue)}</strong>
            </div>
            <div className={`pu-finance__kpi ${data.outstanding > 9000 ? 'pu-finance__kpi--red' : 'pu-finance__kpi--amber'}`}>
              <span>Outstanding Fees</span>
              <strong>{fmtLrd(data.outstanding)}</strong>
            </div>
            <div className="pu-finance__kpi pu-finance__kpi--primary">
              <span>Payments Today</span>
              <strong>{data.paymentsToday}</strong>
            </div>
          </div>

          <div className="pu-finance__bar">
            <div className="pu-finance__bar-head">
              <span>Collection rate</span>
              <strong>{data.collection_rate == null ? '—' : `${collectionRate}%`}</strong>
            </div>
            <div className="pu-finance__bar-track">
              <div className="pu-finance__bar-fill"
                style={{
                  width: `${data.collection_rate == null ? 0 : collectionRate}%`,
                  background: collectionRate >= 80 ? 'var(--ska-green)'
                            : collectionRate >= 65 ? '#f59e0b'
                            : 'var(--ska-error)',
                }} />
            </div>
          </div>

          <h5 className="pu-finance__list-title">Recent Payments</h5>
          {data.transactions.length === 0 ? (
            <p className="pu-finance__empty-list">No payments recorded yet</p>
          ) : (
            <ul className="pu-finance__list">
              {data.transactions.map((t, i) => (
                <li key={i}>
                  <Ic name="receipt_long" size="sm" />
                  <div>
                    <p>{t.label}</p>
                    <span title={t.at}>{timeAgo(t.at)}</span>
                  </div>
                  <strong>{fmtLrd(t.amount)}</strong>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
