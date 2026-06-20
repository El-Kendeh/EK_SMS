import React, { useState, useEffect, useMemo, useCallback } from 'react';
import financeApi from '../../api/financeApi';
import RecordPaymentModal from './RecordPaymentModal';
import { fmtMoney, fmtDateTime, methodLabel } from './bursar.utils';

import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css';
import './Bursar.css';
import './Payments.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/* ── Payment detail modal ─────────────────────────────────── */
function PaymentDetailModal({ payment, onClose }) {
  const [copied, setCopied] = useState(false);

  const copyReceipt = async () => {
    try {
      await navigator.clipboard.writeText(payment.receipt_number || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ska-modal-head">
          <h3 className="ska-modal-title">Payment Receipt</h3>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>
        <div className="ska-modal-body">
          <div className="bur-receipt">
            <div className="bur-receipt__number">{payment.receipt_number || '—'}</div>
            <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={copyReceipt}>
              <Ic name={copied ? 'check' : 'content_copy'} size="sm" /> {copied ? 'Copied' : 'Copy receipt #'}
            </button>
            <div className="bur-receipt__grid">
              <div><span>Student</span><strong>{payment.student_name || '—'}</strong></div>
              <div><span>Admission #</span><strong>{payment.admission_number || '—'}</strong></div>
              <div><span>Amount</span><strong>{fmtMoney(payment.amount)}</strong></div>
              <div><span>Method</span><strong>{methodLabel(payment.payment_method)}</strong></div>
              <div><span>Date</span><strong>{fmtDateTime(payment.paid_at)}</strong></div>
              <div><span>Status</span><strong style={{ color: 'var(--ska-green)' }}>{(payment.status || 'completed').toUpperCase()}</strong></div>
              {payment.reference && <div><span>Reference</span><strong>{payment.reference}</strong></div>}
              {payment.paid_by && <div><span>Paid By</span><strong>{payment.paid_by}</strong></div>}
            </div>
            {payment.notes && (
              <div className="bur-receipt__hash" style={{ fontFamily: 'inherit' }}>
                NOTES&nbsp;·&nbsp;{payment.notes}
              </div>
            )}
            <div className="bur-receipt__hash" title="Tamper-evident integrity hash">
              HASH&nbsp;·&nbsp;{payment.payment_hash || '—'}
            </div>
            <div className="bur-modal__actions" style={{ width: '100%' }}>
              <button className="ska-btn ska-btn--primary" onClick={onClose}>Done</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const [recordOpen, setRecordOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    financeApi.getPayments({
      date_from: dateFrom || undefined,
      date_to: dateTo ? `${dateTo} 23:59:59` : undefined,
    })
      .then((res) => setPayments(res.payments || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!banner) return undefined;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter((p) =>
      (p.student_name || '').toLowerCase().includes(q) ||
      (p.admission_number || '').toLowerCase().includes(q) ||
      (p.receipt_number || '').toLowerCase().includes(q) ||
      (p.reference || '').toLowerCase().includes(q));
  }, [payments, search]);

  const totals = useMemo(() => ({
    count: visible.length,
    amount: visible.reduce((sum, p) => sum + Number(p.amount || 0), 0),
  }), [visible]);

  const resetFilters = () => { setDateFrom(''); setDateTo(''); setSearch(''); };

  return (
    <div className="pu-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Payments</h1>
          <p className="ska-page-sub">Every payment recorded with a tamper-evident receipt</p>
        </div>
        <div className="bur-head-actions">
          <button className="ska-btn ska-btn--primary" onClick={() => setRecordOpen(true)}>
            <Ic name="point_of_sale" size="sm" /> Record Payment
          </button>
        </div>
      </div>

      {banner && <div className="bur-banner bur-banner--success"><Ic name="check_circle" size="sm" />{banner}</div>}
      {error && <div className="bur-banner bur-banner--error"><Ic name="error" size="sm" />{error}</div>}

      {/* Filters */}
      <div className="bur-filters">
        <label className="bur-field bur-filters__search">
          <span>Search</span>
          <input className="bur-input" type="text" placeholder="Student, receipt # or reference…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="bur-field">
          <span>From</span>
          <input className="bur-input" type="date" value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="bur-field">
          <span>To</span>
          <input className="bur-input" type="date" value={dateTo}
            onChange={(e) => setDateTo(e.target.value)} />
        </label>
        {(dateFrom || dateTo || search) && (
          <button className="ska-btn ska-btn--ghost bur-filters__reset" onClick={resetFilters}>
            <Ic name="filter_alt_off" size="sm" /> Reset
          </button>
        )}
      </div>

      {/* Summary */}
      <div className="bur-summary">
        <div className="bur-summary__chip">
          <span>Payments</span><strong>{loading ? '…' : totals.count}</strong>
        </div>
        <div className="bur-summary__chip bur-summary__chip--green">
          <span>Total Received</span><strong>{loading ? '…' : fmtMoney(totals.amount)}</strong>
        </div>
      </div>

      {/* Ledger */}
      {!loading && visible.length === 0 ? (
        <div className="pu-empty">
          <Ic name="payments" size="xl" style={{ color: 'var(--ska-text-3)' }} />
          <p className="pu-empty__title">No payments found</p>
          <p className="pu-empty__desc">
            {payments.length === 0
              ? 'Record your first payment to start the collection ledger.'
              : 'No payments match the current filters.'}
          </p>
          {payments.length === 0 && (
            <button className="ska-btn ska-btn--primary" onClick={() => setRecordOpen(true)}>
              <Ic name="point_of_sale" size="sm" /> Record Payment
            </button>
          )}
        </div>
      ) : (
        <div className="bur-table-wrap">
          <table className="ska-table">
            <thead>
              <tr>
                <th>Receipt #</th>
                <th>Student</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Date</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 8 }).map((__, j) => (
                      <td key={j}><div className="bur-skel" /></td>
                    ))}</tr>
                  ))
                : visible.map((p) => (
                    <tr key={p.id}>
                      <td><span className="bur-cell-mono">{p.receipt_number || '—'}</span></td>
                      <td>
                        <span className="bur-cell-main">{p.student_name || '—'}</span>
                        <span className="bur-cell-sub">{p.admission_number || ''}</span>
                      </td>
                      <td className="bur-cell-money bur-cell-money--green" style={{ textAlign: 'right' }}>
                        {fmtMoney(p.amount)}
                      </td>
                      <td>{methodLabel(p.payment_method)}</td>
                      <td>{p.reference || '—'}</td>
                      <td>{fmtDateTime(p.paid_at)}</td>
                      <td>
                        <span className={`ska-badge ska-badge--${p.status === 'completed' ? 'green' : 'pending'}`}>
                          {(p.status || 'completed').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      </td>
                      <td>
                        <div className="bur-cell-actions">
                          <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={() => setDetail(p)}>
                            Receipt
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {recordOpen && (
        <RecordPaymentModal
          onClose={() => setRecordOpen(false)}
          onSuccess={() => { setBanner('Payment recorded'); load(); }}
        />
      )}

      {detail && <PaymentDetailModal payment={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
