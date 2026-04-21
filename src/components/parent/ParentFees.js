import { useState } from 'react';
import { motion } from 'framer-motion';
import { useParentChildren } from '../../hooks/useParentChildren';
import { getChildColors } from '../../utils/parentUtils';
import { mockFeesByChild } from '../../mock/parentMockData';
import './ParentFees.css';

const SLL = (n) => `Le ${Number(n).toLocaleString()}`;

export default function ParentFees() {
  const { children } = useParentChildren();
  const [selectedChildId, setSelectedChildId] = useState(null);

  const activeChild = children.find((c) => c.id === selectedChildId) || children[0];
  const data = mockFeesByChild[activeChild?.id] || { totalPaid: 0, balanceDue: 0, transactions: [] };

  return (
    <div className="par-fees">
      {/* Child switcher */}
      {children.length > 1 && (
        <div className="par-child-tabs" style={{ marginBottom: 24 }}>
          {children.map((child, idx) => {
            const colors = getChildColors(child.colorIndex ?? idx);
            const isActive = (selectedChildId || children[0]?.id) === child.id;
            return (
              <button key={child.id}
                className={`par-child-tab ${isActive ? 'par-child-tab--active' : ''}`}
                onClick={() => setSelectedChildId(child.id)}>
                <span className="par-child-tab__dot" style={{ background: colors.bg }} />
                {child.fullName.split(' ')[0]}
              </button>
            );
          })}
        </div>
      )}

      {/* Summary grid */}
      <div className="par-fees__summary">
        {/* Balance card */}
        <div className="par-card par-card--pad par-fees__balance-card">
          <span className="material-symbols-outlined par-fees__wallet-bg"
            style={{ fontVariationSettings: "'FILL' 1" }}>account_balance_wallet</span>
          <div className="par-fees__balance-inner">
            <p className="par-fees__label">Financial Summary</p>
            <h2 className="par-fees__student-name">{data.studentName || activeChild?.fullName}</h2>
            <div className="par-fees__balance-row">
              <div>
                <p className="par-fees__balance-label">Total Paid</p>
                <p className="par-fees__balance-paid">{SLL(data.totalPaid)}</p>
              </div>
              <div className="par-fees__balance-divider" />
              <div>
                <p className="par-fees__balance-label">Balance Due</p>
                <p className="par-fees__balance-due">{SLL(data.balanceDue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Integrity badge */}
        <div className="par-fees__integrity-card">
          <span className="material-symbols-outlined par-fees__integrity-icon"
            style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
          <h3 className="par-fees__integrity-title">Immutable Integrity</h3>
          <p className="par-fees__integrity-sub">Financial integrity ensured by ledger</p>
          <div className="par-fees__integrity-chip">LOCKED RECORD</div>
        </div>
      </div>

      {/* Transactions header */}
      <div className="par-fees__tx-header">
        <h3 className="par-fees__tx-title">
          <span className="material-symbols-outlined">receipt_long</span>
          Payment Ledger
        </h3>
        <button className="par-fees__audit-btn">
          <span className="material-symbols-outlined">download</span>
          Full Audit
        </button>
      </div>

      {/* Transaction list */}
      <div className="par-fees__tx-list">
        {data.transactions.map((tx, idx) => {
          const isPending = tx.status === 'pending';
          return (
            <motion.div key={tx.id}
              className={`par-fees__tx-item ${isPending ? 'par-fees__tx-item--pending' : ''}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}>
              <div className="par-fees__tx-left">
                <div className="par-fees__tx-icon">
                  <span className="material-symbols-outlined"
                    style={{ fontVariationSettings: isPending ? "'FILL' 0" : "'FILL' 1" }}>
                    {tx.icon}
                  </span>
                </div>
                <div>
                  <p className="par-fees__tx-desc">{tx.description}</p>
                  <div className="par-fees__tx-meta">
                    <span>{tx.id}</span>
                    <span className="par-fees__tx-dot" />
                    <span>{tx.date}</span>
                  </div>
                </div>
              </div>
              <div className="par-fees__tx-right">
                <p className={`par-fees__tx-amount ${isPending ? 'par-fees__tx-amount--pending' : ''}`}>
                  {SLL(tx.amount)}
                </p>
                {isPending ? (
                  <button className="par-fees__pay-btn">Pay Now</button>
                ) : (
                  <div className="par-fees__tx-verified">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
                    Verified
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Footnote */}
      <div className="par-fees__footnote">
        <div className="par-fees__footnote-icon">
          <span className="material-symbols-outlined">info</span>
        </div>
        <p>All transaction records are synchronized with the central academic ledger. If you notice any discrepancies, please contact the finance office immediately. Digital receipts are legally valid for official purposes.</p>
      </div>
    </div>
  );
}
