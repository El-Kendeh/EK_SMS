import React, { useState, useEffect, useMemo, useCallback } from 'react';
import financeApi from '../../api/financeApi';
import { fmtMoney, fmtDate, EXPENSE_CATEGORIES, catLabel } from './bursar.utils';

import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css';
import './Bursar.css';
import './Expenses.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const todayStr = () => new Date().toISOString().slice(0, 10);

/* ── Record expense modal ─────────────────────────────────── */
function RecordExpenseModal({ onClose, onSuccess }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('general');
  const [date, setDate] = useState(todayStr());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const amountNum = Number(amount);
  const amountError = amount !== '' && !(amountNum > 0) ? 'Amount must be greater than zero' : null;
  const canSubmit = description.trim() && amount !== '' && !amountError && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await financeApi.recordExpense({
        description: description.trim(),
        amount: amountNum,
        category,
        date: date || null,
      });
      if (res?.success === false) throw new Error(res.message || 'Failed to record expense');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ska-modal-head">
          <h3 className="ska-modal-title">Record Expense</h3>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>
        <div className="ska-modal-body">
          <form className="bur-modal-form" onSubmit={handleSubmit}>
            {error && <div className="bur-banner bur-banner--error"><Ic name="error" size="sm" />{error}</div>}

            <label className="bur-field">
              <span>Description *</span>
              <input className="bur-input" type="text" required autoFocus
                placeholder="e.g. Electricity bill — May, classroom chairs…"
                value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>

            <div className="bur-field-row">
              <label className="bur-field">
                <span>Amount *</span>
                <input className="bur-input" type="number" min="0.01" step="0.01" required
                  placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                {amountError && <span className="bur-field-err">{amountError}</span>}
              </label>
              <label className="bur-field">
                <span>Category</span>
                <select className="bur-input" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
                </select>
              </label>
            </div>

            <label className="bur-field">
              <span>Date</span>
              <input className="bur-input" type="date" value={date} max={todayStr()}
                onChange={(e) => setDate(e.target.value)} />
            </label>

            <div className="bur-modal__actions">
              <button type="button" className="ska-btn ska-btn--ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="ska-btn ska-btn--primary" disabled={!canSubmit}>
                {submitting ? 'Saving…' : 'Save Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [allTimeTotal, setAllTimeTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);

  const [category, setCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [recordOpen, setRecordOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    financeApi.getExpenses({
      category: category || undefined,
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
    })
      .then((res) => {
        setExpenses(res.expenses || []);
        setAllTimeTotal(Number(res.total || 0));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [category, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!banner) return undefined;
    const t = setTimeout(() => setBanner(null), 5000);
    return () => clearTimeout(t);
  }, [banner]);

  const filteredTotal = useMemo(
    () => expenses.reduce((sum, x) => sum + Number(x.amount || 0), 0),
    [expenses]
  );

  const monthTotal = useMemo(() => {
    const now = new Date();
    return expenses.reduce((sum, x) => {
      const d = new Date(x.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        ? sum + Number(x.amount || 0)
        : sum;
    }, 0);
  }, [expenses]);

  const topCategory = useMemo(() => {
    const byCat = {};
    expenses.forEach((x) => {
      const c = x.category || 'general';
      byCat[c] = (byCat[c] || 0) + Number(x.amount || 0);
    });
    const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
    return entries.length ? { name: catLabel(entries[0][0]), amount: entries[0][1] } : null;
  }, [expenses]);

  const resetFilters = () => { setCategory(''); setDateFrom(''); setDateTo(''); };

  return (
    <div className="pu-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Expenses</h1>
          <p className="ska-page-sub">School spending ledger by category and date</p>
        </div>
        <div className="bur-head-actions">
          <button className="ska-btn ska-btn--primary" onClick={() => setRecordOpen(true)}>
            <Ic name="add_card" size="sm" /> Record Expense
          </button>
        </div>
      </div>

      {banner && <div className="bur-banner bur-banner--success"><Ic name="check_circle" size="sm" />{banner}</div>}
      {error && <div className="bur-banner bur-banner--error"><Ic name="error" size="sm" />{error}</div>}

      {/* Summary */}
      <div className="bur-summary">
        <div className="bur-summary__chip bur-summary__chip--red">
          <span>All-time Spending</span><strong>{loading ? '…' : fmtMoney(allTimeTotal)}</strong>
        </div>
        <div className="bur-summary__chip bur-summary__chip--amber">
          <span>Shown ({loading ? '…' : expenses.length})</span><strong>{loading ? '…' : fmtMoney(filteredTotal)}</strong>
        </div>
        <div className="bur-summary__chip bur-summary__chip--primary">
          <span>This Month</span><strong>{loading ? '…' : fmtMoney(monthTotal)}</strong>
        </div>
        <div className="bur-summary__chip">
          <span>Top Category</span>
          <strong>{loading ? '…' : topCategory ? topCategory.name : '—'}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="bur-filters">
        <label className="bur-field">
          <span>Category</span>
          <select className="bur-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">All categories</option>
            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
          </select>
        </label>
        <label className="bur-field">
          <span>From</span>
          <input className="bur-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </label>
        <label className="bur-field">
          <span>To</span>
          <input className="bur-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </label>
        {(category || dateFrom || dateTo) && (
          <button className="ska-btn ska-btn--ghost bur-filters__reset" onClick={resetFilters}>
            <Ic name="filter_alt_off" size="sm" /> Reset
          </button>
        )}
      </div>

      {/* Ledger */}
      {!loading && expenses.length === 0 ? (
        <div className="pu-empty">
          <Ic name="receipt_long" size="xl" style={{ color: 'var(--ska-text-3)' }} />
          <p className="pu-empty__title">No expenses found</p>
          <p className="pu-empty__desc">
            {category || dateFrom || dateTo
              ? 'No expenses match the current filters.'
              : 'Record the school’s first expense to start tracking spending.'}
          </p>
          {!(category || dateFrom || dateTo) && (
            <button className="ska-btn ska-btn--primary" onClick={() => setRecordOpen(true)}>
              <Ic name="add_card" size="sm" /> Record Expense
            </button>
          )}
        </div>
      ) : (
        <div className="bur-table-wrap">
          <table className="ska-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 5 }).map((__, j) => (
                      <td key={j}><div className="bur-skel" /></td>
                    ))}</tr>
                  ))
                : expenses.map((x) => (
                    <tr key={x.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(x.date)}</td>
                      <td><span className="ska-badge ska-badge--primary">{catLabel(x.category)}</span></td>
                      <td>{x.description || '—'}</td>
                      <td className="bur-cell-money bur-cell-money--red" style={{ textAlign: 'right' }}>
                        −{fmtMoney(x.amount)}
                      </td>
                      <td>
                        <span className={`ska-badge ska-badge--${x.status === 'approved' ? 'green' : 'pending'}`}>
                          {(x.status || 'approved').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      )}

      {recordOpen && (
        <RecordExpenseModal
          onClose={() => setRecordOpen(false)}
          onSuccess={() => { setBanner('Expense recorded'); load(); }}
        />
      )}
    </div>
  );
}
