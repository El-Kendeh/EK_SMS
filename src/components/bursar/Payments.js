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

/* ── Printable official receipt (opens print dialog) ─────── */
const escHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

function printReceipt(r) {
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Receipt ${escHtml(r.receipt_number)}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; margin: 32px; }
      .head { text-align: center; border-bottom: 2px solid #1B3FAF; padding-bottom: 14px; margin-bottom: 18px; }
      .brand { font-size: 20px; font-weight: 800; color: #1B3FAF; }
      .muted { color: #6b7280; font-size: 12px; }
      h1 { font-size: 15px; margin: 6px 0 0; text-transform: uppercase; letter-spacing: 0.08em; }
      .rno { font-family: ui-monospace, Menlo, monospace; font-size: 18px; font-weight: 700;
             text-align: center; border: 1px dashed #1B3FAF; color: #1B3FAF;
             border-radius: 8px; padding: 8px; margin: 0 auto 18px; max-width: 320px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      td { border: 1px solid #e5e7eb; padding: 8px 12px; }
      td:first-child { width: 38%; font-size: 11px; text-transform: uppercase; color: #6b7280; background: #f9fafb; }
      .qr { text-align: center; margin-top: 22px; }
      .qr img { width: 150px; height: 150px; }
      .qr .cap { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #374151; }
      .qr .url { font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: #6b7280; word-break: break-all; }
      .foot { margin-top: 26px; font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 10px; text-align: center; }
      @media print { body { margin: 12mm; } }
    </style></head><body>
    <div class="head">
      <div class="brand">${escHtml(r.school_name || 'EK-SMS')}</div>
      <div class="muted">School Management System · Finance Office</div>
      <h1>Official Payment Receipt</h1>
    </div>
    <div class="rno">${escHtml(r.receipt_number)}</div>
    <table><tbody>
      <tr><td>Student</td><td>${escHtml(r.student_name || '—')}</td></tr>
      <tr><td>Admission #</td><td>${escHtml(r.admission_number || '—')}</td></tr>
      ${r.fee_category ? `<tr><td>Fee Category</td><td>${escHtml(r.fee_category)}</td></tr>` : ''}
      <tr><td>Amount</td><td><strong>${escHtml(fmtMoney(r.amount))}</strong></td></tr>
      <tr><td>Method</td><td>${escHtml(methodLabel(r.payment_method))}</td></tr>
      ${r.reference ? `<tr><td>Reference</td><td>${escHtml(r.reference)}</td></tr>` : ''}
      <tr><td>Date</td><td>${escHtml(fmtDateTime(r.paid_at))}</td></tr>
      <tr><td>Status</td><td>${escHtml((r.status || 'completed').toUpperCase())}</td></tr>
      ${r.paid_by ? `<tr><td>Paid By</td><td>${escHtml(r.paid_by)}</td></tr>` : ''}
    </tbody></table>
    ${r.qr_data_url ? `<div class="qr">
      <img src="${escHtml(r.qr_data_url)}" alt="Verification QR code" />
      <div class="cap">Scan to verify</div>
      ${r.verify_url ? `<div class="url">${escHtml(r.verify_url)}</div>` : ''}
    </div>` : ''}
    <div class="foot">This receipt is tamper-evident. Verify authenticity via the QR code or link above.</div>
    </body></html>`;
  const win = window.open('', '_blank', 'width=560,height=780');
  if (!win) return; // popup blocked — user can retry after allowing popups
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

/* ── Official receipt modal (server-verified via getReceipt) ─ */
function ReceiptModal({ receiptNumber, preloaded, onClose }) {
  const [receipt, setReceipt] = useState(preloaded || null);
  const [error, setError] = useState(null);
  const loading = !receipt && !error;

  useEffect(() => {
    if (preloaded) return undefined;
    let cancelled = false;
    financeApi.getReceipt(receiptNumber)
      .then((res) => { if (!cancelled) setReceipt(res.receipt); })
      .catch((err) => {
        if (!cancelled) {
          setError(err.status === 404
            ? 'No payment with that receipt number.'
            : (err.message || 'Could not load receipt'));
        }
      });
    return () => { cancelled = true; };
  }, [receiptNumber, preloaded]);

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ska-modal-head">
          <h3 className="ska-modal-title">Official Receipt</h3>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>
        <div className="ska-modal-body">
          {loading && (
            <div className="bur-receipt-loading" aria-label="Loading receipt">
              <div className="bur-skel" style={{ width: '55%', margin: '0 auto' }} />
              <div className="bur-skel" style={{ width: '100%' }} />
              <div className="bur-skel" style={{ width: '100%' }} />
              <div className="bur-skel" style={{ width: '70%' }} />
            </div>
          )}
          {error && (
            <>
              <div className="bur-banner bur-banner--error"><Ic name="error" size="sm" />{error}</div>
              <div className="bur-modal__actions">
                <button className="ska-btn ska-btn--ghost" onClick={onClose}>Close</button>
              </div>
            </>
          )}
          {receipt && (
            <div className="bur-receipt">
              {receipt.school_name && <p className="bur-receipt__school">{receipt.school_name}</p>}
              <p className="bur-receipt__title">Payment Receipt</p>
              <div className="bur-receipt__number">{receipt.receipt_number}</div>
              <div className="bur-receipt__grid">
                <div><span>Student</span><strong>{receipt.student_name || '—'}</strong></div>
                <div><span>Admission #</span><strong>{receipt.admission_number || '—'}</strong></div>
                <div><span>Amount</span><strong>{fmtMoney(receipt.amount)}</strong></div>
                <div><span>Method</span><strong>{methodLabel(receipt.payment_method)}</strong></div>
                <div><span>Date</span><strong>{fmtDateTime(receipt.paid_at)}</strong></div>
                <div><span>Status</span><strong style={{ color: 'var(--ska-green)' }}>{(receipt.status || 'completed').toUpperCase()}</strong></div>
                {receipt.fee_category && <div><span>Fee Category</span><strong>{receipt.fee_category}</strong></div>}
                {receipt.reference && <div><span>Reference</span><strong>{receipt.reference}</strong></div>}
                {receipt.paid_by && <div><span>Paid By</span><strong>{receipt.paid_by}</strong></div>}
              </div>
              {receipt.qr_data_url && (
                <div className="bur-receipt__verify">
                  <img className="bur-receipt__qr" src={receipt.qr_data_url} alt="Receipt verification QR code" />
                  <span className="bur-receipt__scan">Scan to verify</span>
                  {receipt.verify_url && <span className="bur-receipt__url">{receipt.verify_url}</span>}
                </div>
              )}
              <div className="bur-modal__actions" style={{ width: '100%' }}>
                <button className="ska-btn ska-btn--ghost" onClick={onClose}>Close</button>
                <button className="ska-btn ska-btn--primary" onClick={() => printReceipt(receipt)}>
                  <Ic name="print" size="sm" /> Print
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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

  // Receipt lookup + official-receipt view (server-verified)
  const [lookup, setLookup] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState(null);
  const [receiptView, setReceiptView] = useState(null); // { receipt } | { number }

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

  const handleLookup = (e) => {
    e.preventDefault();
    const num = lookup.trim();
    if (!num) { setLookupError('Enter a receipt number to look up.'); return; }
    setLookupLoading(true);
    setLookupError(null);
    financeApi.getReceipt(num)
      .then((res) => setReceiptView({ receipt: res.receipt }))
      .catch((err) => setLookupError(err.status === 404
        ? 'No payment with that receipt number.'
        : (err.message || 'Receipt lookup failed')))
      .finally(() => setLookupLoading(false));
  };

  return (
    <div className="pu-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Payments</h1>
          <p className="ska-page-sub">Every payment recorded with a tamper-evident receipt</p>
        </div>
        <div className="bur-head-actions">
          <form className="bur-lookup" onSubmit={handleLookup}>
            <input
              className="bur-input"
              type="text"
              placeholder="Find by receipt number…"
              aria-label="Find by receipt number"
              value={lookup}
              onChange={(e) => { setLookup(e.target.value); if (lookupError) setLookupError(null); }}
            />
            <button type="submit" className="ska-btn ska-btn--ghost" disabled={lookupLoading}>
              <Ic name="receipt_long" size="sm" /> {lookupLoading ? 'Finding…' : 'Find'}
            </button>
          </form>
          <button className="ska-btn ska-btn--primary" onClick={() => setRecordOpen(true)}>
            <Ic name="point_of_sale" size="sm" /> Record Payment
          </button>
        </div>
      </div>

      {banner && <div className="bur-banner bur-banner--success"><Ic name="check_circle" size="sm" />{banner}</div>}
      {error && <div className="bur-banner bur-banner--error"><Ic name="error" size="sm" />{error}</div>}
      {lookupError && <div className="bur-banner bur-banner--error"><Ic name="search_off" size="sm" />{lookupError}</div>}

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
                      <td>
                        {p.receipt_number ? (
                          <button
                            className="bur-receipt-link"
                            onClick={() => setReceiptView({ number: p.receipt_number })}
                            title="View official receipt"
                          >
                            <span className="bur-cell-mono">{p.receipt_number}</span>
                          </button>
                        ) : (
                          <span className="bur-cell-mono">—</span>
                        )}
                      </td>
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
                            Details
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

      {receiptView && (
        <ReceiptModal
          receiptNumber={receiptView.number || receiptView.receipt?.receipt_number}
          preloaded={receiptView.receipt}
          onClose={() => setReceiptView(null)}
        />
      )}
    </div>
  );
}
