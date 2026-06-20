import React, { useState, useEffect, useMemo, useCallback } from 'react';
import financeApi from '../../api/financeApi';
import RecordPaymentModal from './RecordPaymentModal';
import AssignFeesModal from './AssignFeesModal';
import { fmtMoney, fmtDate, fmtDateTime, FEE_STATUS, methodLabel } from './bursar.utils';

import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css';
import './Bursar.css';
import './StudentFees.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const STATUS_FILTERS = [
  { value: '',        label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'partial', label: 'Partial' },
  { value: 'paid',    label: 'Paid' },
];

/* ── Printable statement (opens print dialog — save as PDF) ── */
const escHtml = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));

function printStatement(student, data) {
  const { fees = [], payments = [], summary = {} } = data || {};
  const today = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const feeRows = fees.map((f) => {
    const bal = (f.amount_due || 0) - (f.amount_paid || 0);
    return `<tr>
      <td>${escHtml(f.feeCategory?.name || 'Fee')}</td>
      <td>${escHtml(f.term?.name || '—')}</td>
      <td class="num">${escHtml(fmtMoney(f.amount_due))}</td>
      <td class="num">${escHtml(fmtMoney(f.amount_paid))}</td>
      <td class="num">${escHtml(fmtMoney(bal))}</td>
      <td>${escHtml((FEE_STATUS[f.status] || FEE_STATUS.pending).label)}</td>
    </tr>`;
  }).join('');
  const payRows = payments.map((p) => `<tr>
      <td>${escHtml(p.receipt_number || '—')}</td>
      <td>${escHtml(fmtDateTime(p.paid_at))}</td>
      <td>${escHtml(methodLabel(p.payment_method))}</td>
      <td>${escHtml(p.reference || '—')}</td>
      <td class="num">${escHtml(fmtMoney(p.amount))}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Fee Statement — ${escHtml(student.name)}</title>
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; color: #111827; margin: 32px; }
      h1 { font-size: 20px; margin: 0; }
      .muted { color: #6b7280; font-size: 12px; }
      .head { display: flex; justify-content: space-between; align-items: flex-start;
              border-bottom: 2px solid #1B3FAF; padding-bottom: 12px; margin-bottom: 20px; }
      .brand { font-size: 22px; font-weight: 800; color: #1B3FAF; }
      .summary { display: flex; gap: 12px; margin: 16px 0 24px; }
      .chip { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; }
      .chip span { display: block; font-size: 11px; text-transform: uppercase; color: #6b7280; }
      .chip strong { font-size: 16px; }
      .chip.bal strong { color: #b91c1c; }
      .chip.paid strong { color: #047857; }
      h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; margin: 24px 0 8px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #e5e7eb; padding: 7px 10px; text-align: left; }
      th { background: #f3f4f6; font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; }
      td.num { text-align: right; font-variant-numeric: tabular-nums; }
      .empty { color: #6b7280; font-size: 12px; padding: 8px 0; }
      .foot { margin-top: 32px; font-size: 11px; color: #6b7280;
              border-top: 1px solid #e5e7eb; padding-top: 10px; }
      @media print { body { margin: 12mm; } }
    </style></head><body>
    <div class="head">
      <div>
        <div class="brand">EK-SMS</div>
        <div class="muted">School Management System · Finance Office</div>
      </div>
      <div style="text-align:right">
        <h1>Fee Statement</h1>
        <div class="muted">Generated ${escHtml(today)}</div>
      </div>
    </div>
    <p style="margin:0 0 4px"><strong>${escHtml(student.name)}</strong></p>
    <p class="muted" style="margin:0">${student.admission_number ? `Admission #: ${escHtml(student.admission_number)}` : ''}</p>
    <div class="summary">
      <div class="chip"><span>Total Billed</span><strong>${escHtml(fmtMoney(summary.total_due))}</strong></div>
      <div class="chip paid"><span>Total Paid</span><strong>${escHtml(fmtMoney(summary.total_paid))}</strong></div>
      <div class="chip bal"><span>Balance</span><strong>${escHtml(fmtMoney(summary.balance))}</strong></div>
    </div>
    <h2>Fees</h2>
    ${fees.length
      ? `<table><thead><tr><th>Category</th><th>Term</th><th>Due</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>${feeRows}</tbody></table>`
      : '<p class="empty">No fees assigned.</p>'}
    <h2>Payments</h2>
    ${payments.length
      ? `<table><thead><tr><th>Receipt #</th><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead><tbody>${payRows}</tbody></table>`
      : '<p class="empty">No payments recorded.</p>'}
    <div class="foot">All payments carry tamper-evident receipt hashes. Queries: contact the school finance office.</div>
    </body></html>`;

  const win = window.open('', '_blank', 'width=860,height=920');
  if (!win) return; // popup blocked — user can retry after allowing popups
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

/* ── Student statement modal ──────────────────────────────── */
function StatementModal({ student, onClose, onPay }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    financeApi.getStudentFees(student.id)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [student.id]);

  const summary = data?.summary || { total_due: 0, total_paid: 0, balance: 0 };

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal ska-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="ska-modal-head">
          <h3 className="ska-modal-title">Fee Statement — {student.name}</h3>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>
        <div className="ska-modal-body">
          {error && <div className="bur-banner bur-banner--error"><Ic name="error" size="sm" />{error}</div>}
          {!data && !error && <div className="bur-picker__empty">Loading statement…</div>}
          {data && (
            <div className="bur-modal-form">
              <div className="bur-head-actions" style={{ justifyContent: 'flex-end' }}>
                <button className="ska-btn ska-btn--ghost ska-btn--sm"
                  onClick={() => printStatement(student, data)}
                  title="Opens the print dialog — choose 'Save as PDF' to download">
                  <Ic name="download" size="sm" /> Download Statement
                </button>
              </div>
              <div className="bur-summary">
                <div className="bur-summary__chip bur-summary__chip--primary">
                  <span>Total Billed</span><strong>{fmtMoney(summary.total_due)}</strong>
                </div>
                <div className="bur-summary__chip bur-summary__chip--green">
                  <span>Total Paid</span><strong>{fmtMoney(summary.total_paid)}</strong>
                </div>
                <div className={`bur-summary__chip ${summary.balance > 0 ? 'bur-summary__chip--red' : 'bur-summary__chip--green'}`}>
                  <span>Balance</span><strong>{fmtMoney(summary.balance)}</strong>
                </div>
              </div>

              <p className="pu-finance__list-title">Fees</p>
              {(data.fees || []).length === 0 ? (
                <div className="bur-picker__empty">No fees assigned to this student.</div>
              ) : (
                <div className="bur-detail-list">
                  {data.fees.map((f) => {
                    const bal = (f.amount_due || 0) - (f.amount_paid || 0);
                    const meta = FEE_STATUS[f.status] || FEE_STATUS.pending;
                    return (
                      <div className="bur-detail-row" key={f.id}>
                        <p>
                          {f.feeCategory?.name || 'Fee'}{f.term?.name ? ` · ${f.term.name}` : ''}
                          <small>
                            Due {fmtMoney(f.amount_due)} · Paid {fmtMoney(f.amount_paid)}
                            {f.due_date ? ` · due ${fmtDate(f.due_date)}` : ''}
                          </small>
                        </p>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className={`ska-badge ska-badge--${meta.badge}`}>{meta.label}</span>
                          {bal > 0 && (
                            <button className="ska-btn ska-btn--approve ska-btn--sm"
                              onClick={() => onPay(f.id)}>
                              Pay
                            </button>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="pu-finance__list-title">Payments</p>
              {(data.payments || []).length === 0 ? (
                <div className="bur-picker__empty">No payments recorded for this student.</div>
              ) : (
                <div className="bur-detail-list">
                  {data.payments.map((p) => (
                    <div className="bur-detail-row" key={p.id}>
                      <p>
                        {p.receipt_number}
                        <small>{methodLabel(p.payment_method)} · {fmtDateTime(p.paid_at)}{p.reference ? ` · ref ${p.reference}` : ''}</small>
                      </p>
                      <strong className="bur-cell-money--green">{fmtMoney(p.amount)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function StudentFees() {
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);

  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const [assignOpen, setAssignOpen] = useState(false);
  const [payTarget, setPayTarget] = useState(null);      // { student, feeId }
  const [statementOf, setStatementOf] = useState(null);  // { id, name }

  const loadFees = useCallback(() => {
    setLoading(true);
    setError(null);
    financeApi.getFees({ class_id: classId || undefined, status: status || undefined })
      .then((res) => setFees(res.fees || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [classId, status]);

  useEffect(() => { loadFees(); }, [loadFees]);

  useEffect(() => {
    financeApi.getClasses()
      .then((res) => setClasses(res.classes || []))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    if (!banner) return undefined;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return fees;
    return fees.filter((f) =>
      (f.student_name || '').toLowerCase().includes(q) ||
      (f.admission_number || '').toLowerCase().includes(q) ||
      (f.category_name || '').toLowerCase().includes(q));
  }, [fees, search]);

  const totals = useMemo(() => visible.reduce((acc, f) => {
    acc.due += Number(f.amount_due || 0);
    acc.paid += Number(f.amount_paid || 0);
    acc.balance += Number(f.balance ?? ((f.amount_due || 0) - (f.amount_paid || 0)));
    return acc;
  }, { due: 0, paid: 0, balance: 0 }), [visible]);

  return (
    <div className="pu-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Student Fees</h1>
          <p className="ska-page-sub">Assigned fees, balances, and statements per student</p>
        </div>
        <div className="bur-head-actions">
          <button className="ska-btn ska-btn--primary" onClick={() => setAssignOpen(true)}>
            <Ic name="post_add" size="sm" /> Assign Fees
          </button>
        </div>
      </div>

      {banner && <div className="bur-banner bur-banner--success"><Ic name="check_circle" size="sm" />{banner}</div>}
      {error && <div className="bur-banner bur-banner--error"><Ic name="error" size="sm" />{error}</div>}

      {/* Filters */}
      <div className="bur-filters">
        <label className="bur-field bur-filters__search">
          <span>Search</span>
          <input className="bur-input" type="text" placeholder="Student, admission # or category…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <label className="bur-field">
          <span>Class</span>
          <select className="bur-input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">All classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <div className="bur-field">
          <span>Status</span>
          <div className="bur-pills">
            {STATUS_FILTERS.map((s) => (
              <button key={s.value} type="button"
                className={`pu-pill${status === s.value ? ' pu-pill--on' : ''}`}
                onClick={() => setStatus(s.value)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bur-summary">
        <div className="bur-summary__chip">
          <span>Fee Records</span><strong>{loading ? '…' : visible.length}</strong>
        </div>
        <div className="bur-summary__chip bur-summary__chip--primary">
          <span>Billed</span><strong>{loading ? '…' : fmtMoney(totals.due)}</strong>
        </div>
        <div className="bur-summary__chip bur-summary__chip--green">
          <span>Collected</span><strong>{loading ? '…' : fmtMoney(totals.paid)}</strong>
        </div>
        <div className={`bur-summary__chip ${totals.balance > 0 ? 'bur-summary__chip--amber' : 'bur-summary__chip--green'}`}>
          <span>Outstanding</span><strong>{loading ? '…' : fmtMoney(totals.balance)}</strong>
        </div>
      </div>

      {/* Ledger */}
      {!loading && visible.length === 0 ? (
        <div className="pu-empty">
          <Ic name="request_quote" size="xl" style={{ color: 'var(--ska-text-3)' }} />
          <p className="pu-empty__title">No fee records found</p>
          <p className="pu-empty__desc">
            {fees.length === 0
              ? 'Assign a fee category to students to start tracking balances.'
              : 'No records match the current filters.'}
          </p>
          {fees.length === 0 && (
            <button className="ska-btn ska-btn--primary" onClick={() => setAssignOpen(true)}>
              <Ic name="post_add" size="sm" /> Assign Fees
            </button>
          )}
        </div>
      ) : (
        <div className="bur-table-wrap bur-table-wrap--wide">
          <table className="ska-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Category</th>
                <th>Term</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th style={{ textAlign: 'right' }}>Discount</th>
                <th style={{ textAlign: 'right' }}>Paid</th>
                <th style={{ textAlign: 'right' }}>Balance</th>
                <th>Status</th>
                <th>Due Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 10 }).map((__, j) => (
                      <td key={j}><div className="bur-skel" /></td>
                    ))}</tr>
                  ))
                : visible.map((f) => {
                    const meta = FEE_STATUS[f.status] || FEE_STATUS.pending;
                    const balance = Number(f.balance ?? ((f.amount_due || 0) - (f.amount_paid || 0)));
                    const student = { id: f.student_id, name: f.student_name, admission_number: f.admission_number };
                    return (
                      <tr key={f.id}>
                        <td>
                          <span className="bur-cell-main">{f.student_name || '—'}</span>
                          <span className="bur-cell-sub">{f.admission_number || ''}</span>
                        </td>
                        <td>{f.category_name || '—'}</td>
                        <td>{f.term_name || '—'}</td>
                        <td className="bur-cell-money" style={{ textAlign: 'right' }}>{fmtMoney(f.amount_due)}</td>
                        <td style={{ textAlign: 'right' }}>{Number(f.discount) > 0 ? fmtMoney(f.discount) : '—'}</td>
                        <td className="bur-cell-money bur-cell-money--green" style={{ textAlign: 'right' }}>{fmtMoney(f.amount_paid)}</td>
                        <td className={`bur-cell-money${balance > 0 ? ' bur-cell-money--red' : ''}`} style={{ textAlign: 'right' }}>{fmtMoney(balance)}</td>
                        <td><span className={`ska-badge ska-badge--${meta.badge}`}>{meta.label}</span></td>
                        <td>{fmtDate(f.due_date)}</td>
                        <td>
                          <div className="bur-cell-actions">
                            <button className="ska-btn ska-btn--ghost ska-btn--sm"
                              onClick={() => setStatementOf(student)}>
                              Statement
                            </button>
                            {balance > 0 && (
                              <button className="ska-btn ska-btn--approve ska-btn--sm"
                                onClick={() => setPayTarget({ student, feeId: f.id })}>
                                Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
        </div>
      )}

      {assignOpen && (
        <AssignFeesModal
          onClose={() => setAssignOpen(false)}
          onSuccess={(count) => { setBanner(`${count} fee(s) assigned`); loadFees(); }}
        />
      )}

      {payTarget && (
        <RecordPaymentModal
          presetStudent={payTarget.student}
          presetFeeId={payTarget.feeId}
          onClose={() => setPayTarget(null)}
          onSuccess={() => { setBanner('Payment recorded'); loadFees(); }}
        />
      )}

      {statementOf && (
        <StatementModal
          student={statementOf}
          onClose={() => setStatementOf(null)}
          onPay={(feeId) => {
            setPayTarget({ student: statementOf, feeId });
            setStatementOf(null);
          }}
        />
      )}
    </div>
  );
}
