import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import './StudentFinancials.css';

function formatSLL(amount) {
  return 'SLL ' + Number(amount).toLocaleString('en-SL');
}

const ICONS = {
  tuition: 'receipt_long',
  lab: 'biotech',
  library: 'library_books',
  sports: 'sports_soccer',
  exam: 'quiz',
  uniform: 'checkroom',
  other: 'payments',
};

export default function StudentFinancials() {
  const [financials, setFinancials] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    setLoading(true);
    studentApi.getFinancials()
      .then(setFinancials)
      .catch(() => setError('Could not load financial records.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (receiptId) => {
    setDownloading(receiptId);
    try {
      const blob = await studentApi.downloadReceipt(receiptId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${receiptId}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setDownloading(null);
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.08 } }),
  };

  const paidPct = financials ? Math.round((financials.paidToDate / financials.totalFees) * 100) : 0;

  return (
    <div className="sfin">
      {/* Header */}
      <div className="sfin__header">
        <div>
          <h2 className="sfin__title">Financial Ledger</h2>
          <p className="sfin__subtitle">Academic Year {financials?.academicYear || '2024/25'}</p>
        </div>
      </div>

      {loading && (
        <div className="sfin__loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16, background: 'rgba(255,255,255,0.04)', marginBottom: 12 }} />
          ))}
        </div>
      )}

      {error && <div className="sfin__error">{error}</div>}

      {!loading && financials && (
        <>
          {/* Stats bento */}
          <div className="sfin__stats">
            <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible" className="sfin-stat">
              <p className="sfin-stat__label">Total Fees</p>
              <p className="sfin-stat__value">{formatSLL(financials.totalFees)}</p>
              <div className="sfin-stat__sub">
                <span className="material-symbols-outlined">account_balance</span>
                Current academic year
              </div>
            </motion.div>

            <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible" className="sfin-stat sfin-stat--paid">
              <p className="sfin-stat__label sfin-stat__label--paid">Paid to Date</p>
              <p className="sfin-stat__value sfin-stat__value--paid">{formatSLL(financials.paidToDate)}</p>
              <div className="sfin-stat__sub sfin-stat__sub--paid">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                {paidPct}% Completed
              </div>
            </motion.div>

            <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible" className="sfin-stat">
              <p className="sfin-stat__label">Outstanding</p>
              <p className="sfin-stat__value sfin-stat__value--outstanding">{formatSLL(financials.outstanding)}</p>
              {financials.dueDays != null && (
                <div className="sfin-stat__due">
                  <span className="material-symbols-outlined">warning</span>
                  Payment due in {financials.dueDays} days
                </div>
              )}
            </motion.div>
          </div>

          {/* Trust banner */}
          <div className="sfin__trust">
            <div className="sfin__trust-left">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <p>Financial records are immutable once verified by the bursar office.</p>
            </div>
            <span className="sfin__trust-badge">Security Protocol V4.2</span>
          </div>

          {/* Payment history table */}
          <div className="sfin__table-section">
            <div className="sfin__table-header">
              <div>
                <h3 className="sfin__table-title">Payment History</h3>
                <p className="sfin__table-sub">Review and download your institutional transaction logs.</p>
              </div>
            </div>

            <div className="sfin__table-wrap">
              <table className="sfin-table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Date</th>
                    <th className="text-right">Amount</th>
                    <th className="text-center">Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {financials.transactions.map((tx, idx) => (
                    <motion.tr
                      key={tx.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <td>
                        <div className="sfin-tx__desc">
                          <div className="sfin-tx__icon">
                            <span className="material-symbols-outlined">{ICONS[tx.type] || ICONS.other}</span>
                          </div>
                          <span className="sfin-tx__name">{tx.description}</span>
                        </div>
                      </td>
                      <td className="sfin-tx__date">
                        {new Date(tx.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="sfin-tx__amount">{formatSLL(tx.amount)}</td>
                      <td className="text-center">
                        <span className={`sfin-badge sfin-badge--${tx.status}`}>
                          {tx.status === 'verified' && (
                            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                          )}
                          {tx.status === 'pending' && (
                            <span className="material-symbols-outlined">hourglass_empty</span>
                          )}
                          {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                        </span>
                      </td>
                      <td className="text-right">
                        <button
                          className="sfin-dl-btn"
                          onClick={() => handleDownload(tx.id)}
                          disabled={downloading === tx.id}
                          title="Download receipt"
                        >
                          <span className="material-symbols-outlined">
                            {downloading === tx.id ? 'hourglass_empty' : 'download'}
                          </span>
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Locked module + scholarship CTA */}
          <div className="sfin__bottom">
            <div className="sfin__locked">
              <div className="sfin__locked-overlay">
                <div className="sfin__locked-icon">
                  <span className="material-symbols-outlined">lock</span>
                </div>
                <div>
                  <h4 className="sfin__locked-title">Term 2 Fee Schedule</h4>
                  <p className="sfin__locked-desc">Restricted until the current term evaluation is complete.</p>
                </div>
              </div>
            </div>

            <div className="sfin__scholarship">
              <h4 className="sfin__scholarship-title">Need Financial Assistance?</h4>
              <p className="sfin__scholarship-desc">
                Our scholarship portal is now accepting applications from eligible students.
              </p>
              <div className="sfin__scholarship-actions">
                <button className="sfin__scholarship-btn--primary">Apply Now</button>
                <button className="sfin__scholarship-btn--ghost">View Eligibility</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
