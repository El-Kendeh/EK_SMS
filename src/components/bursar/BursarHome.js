import React, { useState } from 'react';
import { BursarProvider, useBursar } from '../../context/BursarContext';
import { useBursarDashboard } from '../../hooks/useBursarDashboard';
import RecordPaymentModal from './RecordPaymentModal';
import ActivityFeed from '../schooladmin/Principal/ActivityFeed';
import { fmtMoney, fmtMoneyCompact, fmtDateTime, fmtDate, methodLabel, freqLabel, catLabel } from './bursar.utils';

import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css';
import './Bursar.css';
import './BursarHome.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const QUICK_ACTIONS = [
  { key: 'record-payment', label: 'Record Payment', icon: 'point_of_sale',  tone: 'green',     modal: true },
  { key: 'student-fees',   label: 'Student Fees',   icon: 'request_quote',  tone: 'primary',   target: 'student-fees' },
  { key: 'fee-categories', label: 'Fee Categories', icon: 'category',       tone: 'secondary', target: 'fee-categories' },
  { key: 'expenses',       label: 'Record Expense', icon: 'receipt_long',   tone: 'tertiary',  target: 'expenses' },
  { key: 'payments',        label: 'All Payments',   icon: 'payments',       tone: 'primary',   target: 'payments' },
  { key: 'finance-reports', label: 'Reports',        icon: 'monitoring',     tone: 'secondary', target: 'finance-reports' },
  { key: 'finance-team',    label: 'Finance Team',   icon: 'group',          tone: 'green',     target: 'finance-team' },
];

function BursarHomeInner({ navigateTo }) {
  const {
    loading, error, stats, snapshot,
    recentPayments, recentExpenses, feeCategories, activityItems,
  } = useBursarDashboard();
  const { invalidate } = useBursar();
  const [payOpen, setPayOpen] = useState(false);

  const st = stats || {
    total_collected: 0, outstanding_balance: 0, expenses: 0, balance: 0, total_students: 0,
  };
  const sn = snapshot || { revenue: 0, outstanding: 0, paymentsToday: 0, transactions: [] };

  const collected = Number(st.total_collected || 0);
  const outstanding = Number(st.outstanding_balance || 0);
  const collectionRate = collected + outstanding > 0
    ? Math.round((collected / (collected + outstanding)) * 100)
    : 0;

  const statCards = [
    { key: 'collected',  label: 'Total Collected',  value: fmtMoneyCompact(collected),           sub: 'completed payments',          icon: 'savings',        tone: 'green' },
    { key: 'outstanding',label: 'Outstanding',      value: fmtMoneyCompact(outstanding),         sub: 'unpaid fee balances',         icon: 'hourglass_top',  tone: 'amber' },
    { key: 'expenses',   label: 'Expenses',         value: fmtMoneyCompact(st.expenses),         sub: 'approved spending',           icon: 'trending_down',  tone: 'finance', toneColor: 'var(--ska-error)' },
    { key: 'balance',    label: 'Net Balance',      value: fmtMoneyCompact(st.balance),          sub: 'collected − expenses',        icon: 'account_balance',tone: 'finance', toneColor: Number(st.balance) >= 0 ? 'var(--ska-green)' : 'var(--ska-error)' },
    { key: 'today',      label: 'Payments Today',   value: String(sn.paymentsToday ?? 0),        sub: 'transactions today',          icon: 'today',          tone: 'cyan' },
    { key: 'students',   label: 'Active Students',  value: String(st.total_students ?? 0),       sub: 'billable students',           icon: 'school',         tone: 'primary' },
  ];

  if (error) {
    return (
      <div className="pu-page">
        <div className="pu-empty">
          <Ic name="error" size="xl" style={{ color: 'var(--ska-error)' }} />
          <p className="pu-empty__title">Couldn't load finance dashboard</p>
          <p className="pu-empty__desc">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pu-page burh-home">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Finance Command Center</h1>
          <p className="ska-page-sub">Collections, spending, and fee health at a glance</p>
        </div>
        <div className="bur-head-actions">
          <button className="ska-btn ska-btn--primary" onClick={() => setPayOpen(true)}>
            <Ic name="point_of_sale" size="sm" /> Record Payment
          </button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="pu-stats">
        {statCards.map((c) => (
          <div key={c.key}
            className={`pu-stat pu-stat--${c.tone}`}
            style={c.toneColor ? { '--pu-stat-tone': c.toneColor } : undefined}>
            <div className="pu-stat__icon"><Ic name={c.icon} /></div>
            <div className="pu-stat__body">
              <span className="pu-stat__label">{c.label}</span>
              <span className="pu-stat__value">{loading ? '…' : c.value}</span>
              <span className="pu-stat__sub">{c.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Collection rate */}
      <div className="pu-card">
        <div className="pu-finance__bar">
          <div className="pu-finance__bar-head">
            <span>Fee collection rate</span>
            <strong>{loading ? '…' : `${collectionRate}%`}</strong>
          </div>
          <div className="pu-finance__bar-track">
            <div className="pu-finance__bar-fill" style={{
              width: `${collectionRate}%`,
              background: collectionRate >= 80 ? 'var(--ska-green)'
                        : collectionRate >= 65 ? '#f59e0b'
                        : 'var(--ska-error)',
            }} />
          </div>
          <span className="burh-bar-note">
            {fmtMoney(collected)} collected of {fmtMoney(collected + outstanding)} billed
          </span>
        </div>
      </div>

      <div className="pu-two-col">
        <div className="pu-two-col__left">
          {/* Recent payments */}
          <div className="pu-card">
            <div className="pu-card__head">
              <div className="pu-card__title">
                <Ic name="payments" size="sm" />
                <strong>Recent Payments</strong>
              </div>
              <button type="button" className="pu-card__action" onClick={() => navigateTo('payments')}>
                View All <Ic name="arrow_forward" size="sm" />
              </button>
            </div>
            {recentPayments.length === 0 ? (
              <div className="burh-empty"><Ic name="info" size="sm" /> {loading ? 'Loading…' : 'No payments recorded yet.'}</div>
            ) : (
              <ul className="pu-finance__list">
                {recentPayments.slice(0, 6).map((p) => (
                  <li key={p.id}>
                    <Ic name="receipt_long" size="sm" />
                    <div>
                      <p>{p.student_name || 'Student'}</p>
                      <span>{p.receipt_number} · {methodLabel(p.payment_method)} · {fmtDateTime(p.paid_at)}</span>
                    </div>
                    <strong className="bur-cell-money--green">{fmtMoney(p.amount)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent expenses */}
          <div className="pu-card">
            <div className="pu-card__head">
              <div className="pu-card__title">
                <Ic name="receipt_long" size="sm" />
                <strong>Recent Expenses</strong>
              </div>
              <button type="button" className="pu-card__action" onClick={() => navigateTo('expenses')}>
                View All <Ic name="arrow_forward" size="sm" />
              </button>
            </div>
            {recentExpenses.length === 0 ? (
              <div className="burh-empty"><Ic name="info" size="sm" /> {loading ? 'Loading…' : 'No expenses recorded yet.'}</div>
            ) : (
              <ul className="pu-finance__list">
                {recentExpenses.slice(0, 6).map((x) => (
                  <li key={x.id}>
                    <Ic name="shopping_cart" size="sm" />
                    <div>
                      <p>{x.description || 'Expense'}</p>
                      <span>{catLabel(x.category)} · {fmtDate(x.date)}</span>
                    </div>
                    <strong className="bur-cell-money--red">−{fmtMoney(x.amount)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="pu-two-col__right">
          {/* Quick actions */}
          <div className="pu-card pu-quick">
            <div className="pu-card__head">
              <div className="pu-card__title">
                <Ic name="bolt" size="sm" />
                <strong>Quick Actions</strong>
              </div>
              <span className="pu-card__sub">Frequently used</span>
            </div>
            <div className="pu-quick__grid">
              {QUICK_ACTIONS.map((a) => (
                <button key={a.key} type="button"
                  className={`pu-quick__btn pu-quick__btn--${a.tone}`}
                  onClick={() => (a.modal ? setPayOpen(true) : navigateTo(a.target))}>
                  <div className="pu-quick__icon"><Ic name={a.icon} /></div>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fee categories overview */}
          <div className="pu-card">
            <div className="pu-card__head">
              <div className="pu-card__title">
                <Ic name="category" size="sm" />
                <strong>Fee Categories</strong>
              </div>
              <button type="button" className="pu-card__action" onClick={() => navigateTo('fee-categories')}>
                Manage <Ic name="arrow_forward" size="sm" />
              </button>
            </div>
            {feeCategories.length === 0 ? (
              <div className="burh-empty"><Ic name="info" size="sm" /> {loading ? 'Loading…' : 'No fee categories yet — create one to start billing.'}</div>
            ) : (
              <ul className="pu-finance__list">
                {feeCategories.slice(0, 5).map((c) => (
                  <li key={c.id}>
                    <Ic name="sell" size="sm" />
                    <div>
                      <p>{c.name}</p>
                      <span>{freqLabel(c.frequency)}{c.is_active === false ? ' · inactive' : ''}</span>
                    </div>
                    <strong>{fmtMoney(c.amount)}</strong>
                  </li>
                ))}
                {feeCategories.length > 5 && (
                  <li className="burh-more" onClick={() => navigateTo('fee-categories')}>
                    <Ic name="more_horiz" size="sm" />
                    <div><p>+{feeCategories.length - 5} more categories</p><span>Open Fee Categories</span></div>
                    <strong />
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ActivityFeed items={activityItems} />

      {payOpen && (
        <RecordPaymentModal
          onClose={() => setPayOpen(false)}
          onSuccess={() => invalidate()}
        />
      )}
    </div>
  );
}

export default function BursarHome(props) {
  return (
    <BursarProvider>
      <BursarHomeInner {...props} />
    </BursarProvider>
  );
}
