import React, { useState, useEffect, useMemo, useCallback } from 'react';
import financeApi from '../../api/financeApi';
import { fmtMoney, fmtMoneyCompact, methodLabel, catLabel } from './bursar.utils';
import { downloadCsv } from '../../utils/csv';

import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css';
import './Bursar.css';
import './Reports.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/* ── Period helpers ───────────────────────────────────────── */
const PERIODS = [
  { key: 'm1',  label: 'This Month' },
  { key: 'm3',  label: '3 Months' },
  { key: 'm6',  label: '6 Months' },
  { key: 'ytd', label: 'This Year' },
  { key: 'm12', label: '12 Months' },
  { key: 'all', label: 'All Time' },
];

const isoDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const monthsBack = (n) => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - n, 1);
};

/** Current range + the equal-length previous range (for trend deltas). */
function periodRanges(key) {
  const today = new Date();
  const endOf = (d) => `${isoDate(d)} 23:59:59`;
  switch (key) {
    case 'm1': {
      const from = monthsBack(0);
      return {
        current: { date_from: isoDate(from) },
        previous: { date_from: isoDate(monthsBack(1)), date_to: endOf(new Date(from.getTime() - 86400000)) },
      };
    }
    case 'm3': case 'm6': case 'm12': {
      const n = Number(key.slice(1));
      const from = monthsBack(n - 1);
      return {
        current: { date_from: isoDate(from) },
        previous: { date_from: isoDate(monthsBack(2 * n - 1)), date_to: endOf(new Date(from.getTime() - 86400000)) },
      };
    }
    case 'ytd': {
      const from = new Date(today.getFullYear(), 0, 1);
      return {
        current: { date_from: isoDate(from) },
        previous: {
          date_from: isoDate(new Date(today.getFullYear() - 1, 0, 1)),
          date_to: endOf(new Date(today.getFullYear() - 1, 11, 31)),
        },
      };
    }
    default:
      return { current: {}, previous: null };
  }
}

/** Month keys covering the selected window so quiet months still show. */
function monthKeysFor(key) {
  const count = key === 'm1' ? 1
    : key === 'm3' ? 3
    : key === 'm6' ? 6
    : key === 'm12' ? 12
    : key === 'ytd' ? new Date().getMonth() + 1
    : 0;
  const keys = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = monthsBack(i);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

const monthShort = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short' });
};

const monthLong = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
};

const pctDelta = (cur, prev) => {
  if (prev == null || prev <= 0) return null;
  return Math.round(((cur - prev) / prev) * 1000) / 10;
};

/* ── CSV export ───────────────────────────────────────────── */
/* csvCell + downloadCsv moved verbatim to src/utils/csv.js (shared with the
   principal export buttons) — behavior identical, BOM included. */

const EXPORT_OPTIONS = [
  { value: 'summary',  label: 'Summary report',  desc: 'KPIs, monthly performance, methods and spending breakdowns' },
  { value: 'payments', label: 'Payments ledger', desc: 'Receipt #, student, amount, method, reference, date' },
  { value: 'expenses', label: 'Expenses ledger', desc: 'Date, category, description, amount' },
];

function ExportModal({ range, periodLabel, analytics, onClose }) {
  const [dataset, setDataset] = useState('summary');
  const [phase, setPhase] = useState('configure'); // configure | generating | ready | error
  const [note, setNote] = useState(null);

  const stamp = isoDate(new Date());

  const runExport = async () => {
    setPhase('generating');
    setNote(null);
    try {
      if (dataset === 'summary') {
        const { summary, monthly, methods, expense_categories: cats } = analytics;
        const rows = [
          ['EK-SMS Finance Summary', periodLabel, `Generated ${stamp}`],
          [],
          ['Metric', 'Value'],
          ['Total revenue', summary.revenue],
          ['Total expenses', summary.expenses],
          ['Net surplus', summary.net],
          ['Payments recorded', summary.payment_count],
          ['Average payment', summary.avg_payment],
          ['Largest payment', summary.largest_payment],
          [],
          ['Month', 'Revenue', 'Expenses', 'Payments'],
          ...monthly.map((m) => [m.month, m.revenue, m.expenses, m.payments]),
          [],
          ['Payment method', 'Total', 'Count'],
          ...methods.map((m) => [methodLabel(m.method), m.total, m.count]),
          [],
          ['Expense category', 'Total', 'Count'],
          ...cats.map((c) => [catLabel(c.category), c.total, c.count]),
        ];
        downloadCsv(`finance-summary-${stamp}.csv`, rows);
      } else if (dataset === 'payments') {
        const res = await financeApi.getPayments(range);
        const list = res.payments || [];
        if (list.length === 200) setNote('Export holds the latest 200 payments — narrow the period for a complete ledger.');
        downloadCsv(`payments-${stamp}.csv`, [
          ['Receipt #', 'Student', 'Admission #', 'Amount', 'Method', 'Reference', 'Status', 'Paid At'],
          ...list.map((p) => [
            p.receipt_number, p.student_name, p.admission_number, p.amount,
            methodLabel(p.payment_method), p.reference || '', p.status || 'completed', p.paid_at,
          ]),
        ]);
      } else {
        const res = await financeApi.getExpenses(range);
        const list = res.expenses || [];
        if (list.length === 200) setNote('Export holds the latest 200 expenses — narrow the period for a complete ledger.');
        downloadCsv(`expenses-${stamp}.csv`, [
          ['Date', 'Category', 'Description', 'Amount', 'Status'],
          ...list.map((e) => [e.date, catLabel(e.category), e.description, e.amount, e.status || 'approved']),
        ]);
      }
      setPhase('ready');
    } catch (err) {
      setNote(err.message);
      setPhase('error');
    }
  };

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ska-modal-head">
          <h3 className="ska-modal-title">Export Report</h3>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>
        <div className="ska-modal-body">
          {phase === 'generating' ? (
            <div className="bfr-export-state">
              <div className="bfr-spinner" aria-hidden="true" />
              <p className="bfr-export-state__title">Generating report…</p>
              <p className="bfr-export-state__desc">Compiling {periodLabel.toLowerCase()} data into CSV.</p>
            </div>
          ) : phase === 'ready' ? (
            <div className="bfr-export-state">
              <Ic name="task_alt" size="xl" style={{ color: 'var(--ska-green)' }} />
              <p className="bfr-export-state__title">Report ready</p>
              <p className="bfr-export-state__desc">Your download has started.</p>
              {note && <div className="bur-banner bur-banner--error"><Ic name="info" size="sm" />{note}</div>}
              <div className="bur-modal__actions">
                <button className="ska-btn ska-btn--ghost" onClick={() => setPhase('configure')}>Export another</button>
                <button className="ska-btn ska-btn--primary" onClick={onClose}>Done</button>
              </div>
            </div>
          ) : (
            <div className="bur-modal-form">
              {phase === 'error' && note && (
                <div className="bur-banner bur-banner--error"><Ic name="error" size="sm" />{note}</div>
              )}
              <p className="bfr-export-period"><Ic name="calendar_month" size="sm" /> Period: <strong>{periodLabel}</strong></p>
              <div className="bfr-export-opts" role="radiogroup" aria-label="Report to export">
                {EXPORT_OPTIONS.map((o) => (
                  <button key={o.value} type="button" role="radio" aria-checked={dataset === o.value}
                    className={`bfr-export-opt${dataset === o.value ? ' bfr-export-opt--on' : ''}`}
                    onClick={() => setDataset(o.value)}>
                    <span className="bfr-export-opt__radio" aria-hidden="true" />
                    <span>
                      <strong>{o.label}</strong>
                      <small>{o.desc}</small>
                    </span>
                  </button>
                ))}
              </div>
              <div className="bur-modal__actions">
                <button className="ska-btn ska-btn--ghost" onClick={onClose}>Cancel</button>
                <button className="ska-btn ska-btn--primary" onClick={runExport}>
                  <Ic name="download" size="sm" /> Export CSV
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Share-bar row (methods / categories) ─────────────────── */
function ShareRow({ icon, label, total, count, share, tone }) {
  return (
    <div className="bfr-share">
      <div className="bfr-share__head">
        <span className="bfr-share__label"><Ic name={icon} size="sm" /> {label}</span>
        <span className="bfr-share__figures">
          <strong>{fmtMoney(total)}</strong>
          <small>{count} · {share}%</small>
        </span>
      </div>
      <div className="bfr-share__track">
        <div className="bfr-share__fill" style={{ width: `${Math.max(share, 2)}%`, background: tone }} />
      </div>
    </div>
  );
}

const METHOD_ICONS = {
  cash: 'payments', mobile_money: 'smartphone', bank_transfer: 'account_balance',
  cheque: 'edit_note', card: 'credit_card', other: 'more_horiz',
};
const METHOD_TONES = ['var(--ska-primary)', 'var(--ska-green)', '#06b6d4', '#f59e0b', '#a855f7', '#f43f5e'];

const rateTone = (r) => (r >= 70 ? 'var(--ska-green)' : r >= 40 ? '#f59e0b' : 'var(--ska-error)');

/* ── Collection rate (plan 4.3) ───────────────────────────── */
function CollectionSection() {
  const [by, setBy] = useState('term');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    financeApi.getCollectionAnalytics(by)
      .then((res) => setRows(res.rows || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [by]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="pu-card">
      <div className="pu-card__head">
        <p className="pu-card__title"><Ic name="percent" /> Collection Rate</p>
        <div className="bfr-mini-toggle" role="tablist" aria-label="Collection breakdown">
          {[['term', 'By Term'], ['class', 'By Class']].map(([k, l]) => (
            <button key={k} type="button" role="tab" aria-selected={by === k}
              className={`pu-pill${by === k ? ' pu-pill--on' : ''}`}
              onClick={() => setBy(k)}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="bfr-chart-skel"><div className="bur-skel" /><div className="bur-skel" /><div className="bur-skel" /></div>
      ) : error ? (
        <div className="bur-banner bur-banner--error">
          <Ic name="error" size="sm" /> {error}
          <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={load}>Retry</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="bur-picker__empty">No fees assigned by {by} yet — assign fees to see collection rates.</div>
      ) : (
        <div className="bfr-share-list">
          {rows.map((r) => {
            const rate = Math.max(0, Math.min(100, Math.round(Number(r.rate) || 0)));
            return (
              <div className="bfr-share" key={r.key}>
                <div className="bfr-share__head">
                  <span className="bfr-share__label">
                    <Ic name={by === 'term' ? 'calendar_month' : 'school'} size="sm" /> {r.label}
                  </span>
                  <span className="bfr-share__figures">
                    <strong>{rate}%</strong>
                    <small>{fmtMoney(r.paid)} of {fmtMoney(r.due)}</small>
                  </span>
                </div>
                <div className="bfr-share__track">
                  <div className="bfr-share__fill" style={{ width: `${Math.max(rate, 2)}%`, background: rateTone(rate) }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Cash flow, last 12 months (plan 4.3) ─────────────────── */
function CashFlowSection() {
  const [months, setMonths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    financeApi.getCashFlow()
      .then((res) => setMonths(res.months || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const max = useMemo(
    () => Math.max(1, ...months.map((m) => Math.max(Number(m.inflow) || 0, Number(m.outflow) || 0))),
    [months]
  );

  return (
    <div className="pu-card">
      <div className="pu-card__head">
        <p className="pu-card__title"><Ic name="swap_vert" /> Cash Flow (12 Months)</p>
        <div className="bfr-legend">
          <span><i className="bfr-legend__dot bfr-legend__dot--rev" /> Inflow</span>
          <span><i className="bfr-legend__dot bfr-legend__dot--exp" /> Outflow</span>
        </div>
      </div>
      {loading ? (
        <div className="bfr-chart-skel"><div className="bur-skel" /><div className="bur-skel" /><div className="bur-skel" /></div>
      ) : error ? (
        <div className="bur-banner bur-banner--error">
          <Ic name="error" size="sm" /> {error}
          <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={load}>Retry</button>
        </div>
      ) : months.length === 0 ? (
        <div className="bur-picker__empty">No cash movement recorded yet.</div>
      ) : (
        <div className="bfr-chart-scroll">
          <div className="bfr-chart bfr-chart--cf" style={{ minWidth: `${months.length * 56}px` }}>
            {months.map((m) => {
              const inflow = Number(m.inflow) || 0;
              const outflow = Number(m.outflow) || 0;
              const net = Number(m.net) || 0;
              return (
                <div className="bfr-chart__col" key={m.month}
                  title={`${monthLong(m.month)} — Inflow ${fmtMoney(inflow)} · Outflow ${fmtMoney(outflow)} · Net ${fmtMoney(net)}`}>
                  <div className="bfr-chart__bars">
                    <div className="bfr-chart__bar bfr-chart__bar--rev" style={{ height: `${Math.round((inflow / max) * 100)}%` }} />
                    <div className="bfr-chart__bar bfr-chart__bar--exp" style={{ height: `${Math.round((outflow / max) * 100)}%` }} />
                  </div>
                  <span className="bfr-chart__label">{monthShort(m.month)}</span>
                  <span className={`bfr-cf-net ${net >= 0 ? 'bfr-cf-net--up' : 'bfr-cf-net--down'}`}>
                    {net >= 0 ? '+' : '−'}{fmtMoneyCompact(Math.abs(net))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Budgets vs actuals (plan 4.3) ────────────────────────── */
function BudgetsSection() {
  const [budgets, setBudgets] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ termId: '', category: '', amount: '' });
  const [formErr, setFormErr] = useState(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // { kind: 'success' | 'error', text }
  const [deletingId, setDeletingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([financeApi.getBudgets(), financeApi.getTerms()])
      .then(([b, t]) => {
        setBudgets(b.budgets || []);
        setTerms(t.terms || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    const category = form.category.trim();
    const amount = Number(form.amount);
    if (!category) { setFormErr('Category is required.'); return; }
    if (!form.amount || Number.isNaN(amount) || amount <= 0) { setFormErr('Enter an amount greater than zero.'); return; }
    setFormErr(null);
    setSaving(true);
    setNotice(null);
    try {
      await financeApi.saveBudget({ termId: form.termId || null, category, amount });
      const res = await financeApi.getBudgets();
      setBudgets(res.budgets || []);
      setForm({ termId: '', category: '', amount: '' });
      setNotice({ kind: 'success', text: 'Budget saved.' });
    } catch (err) {
      setNotice({ kind: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`Delete the ${b.category} budget${b.term_name ? ` for ${b.term_name}` : ''}?`)) return;
    setDeletingId(b.id);
    setNotice(null);
    try {
      await financeApi.deleteBudget(b.id);
      setBudgets((list) => list.filter((x) => x.id !== b.id));
      setNotice({ kind: 'success', text: 'Budget deleted.' });
    } catch (err) {
      setNotice({ kind: 'error', text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="pu-card">
      <div className="pu-card__head">
        <p className="pu-card__title"><Ic name="savings" /> Budgets vs Actuals</p>
      </div>

      {notice && (
        <div className={`bur-banner bur-banner--${notice.kind}`}>
          <Ic name={notice.kind === 'success' ? 'task_alt' : 'error'} size="sm" /> {notice.text}
        </div>
      )}

      <form className="bfr-budget-form" onSubmit={submit}>
        <label className="bur-field">
          <span>Term</span>
          <select className="bur-input" value={form.termId} disabled={saving || loading}
            onChange={(e) => setForm((f) => ({ ...f, termId: e.target.value }))}>
            <option value="">— All terms —</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}{t.academicYear?.name ? ` · ${t.academicYear.name}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="bur-field">
          <span>Category</span>
          <input className="bur-input" type="text" placeholder="e.g. Tuition" maxLength={60}
            value={form.category} disabled={saving}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
        </label>
        <label className="bur-field">
          <span>Target amount</span>
          <input className="bur-input" type="number" min="0" step="0.01" placeholder="0.00"
            value={form.amount} disabled={saving}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
        </label>
        <button className="ska-btn ska-btn--primary bfr-budget-form__btn" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Set budget'}
        </button>
      </form>
      {formErr && <p className="bur-field-err">{formErr}</p>}

      {loading ? (
        <div className="bfr-chart-skel"><div className="bur-skel" /><div className="bur-skel" /></div>
      ) : error ? (
        <div className="bur-banner bur-banner--error">
          <Ic name="error" size="sm" /> {error}
          <button className="ska-btn ska-btn--ghost ska-btn--sm" onClick={load}>Retry</button>
        </div>
      ) : budgets.length === 0 ? (
        <div className="bur-picker__empty">No budgets set yet — use the form above to set your first revenue target.</div>
      ) : (
        <div className="bur-table-wrap">
          <table className="ska-table">
            <thead>
              <tr>
                <th>Term</th><th>Category</th><th>Budget</th><th>Actual</th><th>Variance</th><th>Attainment</th><th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {budgets.map((b) => {
                const att = Math.max(0, Math.round(Number(b.attainment) || 0));
                const variance = Number(b.variance) || 0;
                return (
                  <tr key={b.id}>
                    <td>{b.term_name || 'All terms'}</td>
                    <td>{b.category}</td>
                    <td>{fmtMoney(b.amount)}</td>
                    <td>{fmtMoney(b.actual_revenue)}</td>
                    <td style={{ color: variance >= 0 ? 'var(--ska-green)' : 'var(--ska-error)', fontWeight: 700 }}>
                      {variance >= 0 ? '+' : '−'}{fmtMoney(Math.abs(variance))}
                    </td>
                    <td>
                      <div className="bfr-attain" role="progressbar" aria-valuemin={0} aria-valuemax={100}
                        aria-valuenow={Math.min(att, 100)} aria-label={`${b.category} attainment ${att}%`}>
                        <span className="bfr-attain__track">
                          <span className="bfr-attain__fill" style={{ width: `${Math.min(att, 100)}%`, background: rateTone(att) }} />
                        </span>
                        <span className="bfr-attain__pct">{att}%</span>
                      </div>
                    </td>
                    <td>
                      <button className="ska-btn ska-btn--danger ska-btn--sm bfr-budget-del" type="button"
                        onClick={() => remove(b)} disabled={deletingId === b.id}
                        aria-label={`Delete ${b.category} budget`}>
                        {deletingId === b.id ? '…' : <Ic name="delete" size="sm" />}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function FinanceReports({ navigateTo }) {
  const [period, setPeriod] = useState('m6');
  const [data, setData] = useState(null);       // current-period analytics
  const [prev, setPrev] = useState(null);       // previous-period analytics
  const [stats, setStats] = useState(null);     // all-time stats (collection rate)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);

  const ranges = useMemo(() => periodRanges(period), [period]);
  const periodLabel = PERIODS.find((p) => p.key === period)?.label || '';

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      financeApi.getAnalytics(ranges.current),
      ranges.previous ? financeApi.getAnalytics(ranges.previous) : Promise.resolve(null),
      financeApi.getStats(),
    ])
      .then(([cur, prv, st]) => {
        setData(cur);
        setPrev(prv);
        setStats(st);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [ranges]);

  useEffect(() => { load(); }, [load]);

  const summary = data?.summary || { revenue: 0, expenses: 0, net: 0, payment_count: 0, avg_payment: 0, largest_payment: 0 };
  const prevSummary = prev?.summary || null;

  /* Monthly series padded with quiet months */
  const monthly = useMemo(() => {
    const fromApi = new Map((data?.monthly || []).map((m) => [m.month, m]));
    const keys = period === 'all'
      ? (data?.monthly || []).map((m) => m.month)
      : monthKeysFor(period);
    return keys.map((k) => fromApi.get(k) || { month: k, revenue: 0, expenses: 0, payments: 0 });
  }, [data, period]);

  const chartMax = useMemo(
    () => Math.max(1, ...monthly.map((m) => Math.max(m.revenue, m.expenses))),
    [monthly]
  );

  /* Collection rate — all-time, from the same stats the home page uses */
  const collected = Number(stats?.total_collected || 0);
  const outstanding = Number(stats?.outstanding_balance || 0);
  const collectionRate = collected + outstanding > 0
    ? Math.round((collected / (collected + outstanding)) * 100)
    : 0;

  /* Method insights */
  const methods = useMemo(() => data?.methods || [], [data]);
  const mostPopular = methods[0] || null;
  const fastestGrowing = useMemo(() => {
    if (!prev || !methods.length) return null;
    const prevByMethod = new Map((prev.methods || []).map((m) => [m.method, m.total]));
    let best = null;
    for (const m of methods) {
      const before = prevByMethod.get(m.method) || 0;
      const growth = before > 0 ? ((m.total - before) / before) * 100 : (m.total > 0 ? null : 0);
      if (growth != null && growth > 0 && (!best || growth > best.growth)) {
        best = { method: m.method, growth: Math.round(growth) };
      }
    }
    return best;
  }, [methods, prev]);

  const expenseCats = data?.expense_categories || [];
  const topDebtors = data?.top_debtors || [];

  const kpis = [
    {
      key: 'revenue', label: 'Total Revenue', icon: 'trending_up', tone: 'green',
      value: fmtMoneyCompact(summary.revenue),
      delta: prevSummary ? pctDelta(summary.revenue, prevSummary.revenue) : null,
      sub: `${summary.payment_count} payments`,
    },
    {
      key: 'expenses', label: 'Total Expenses', icon: 'trending_down', tone: 'amber',
      value: fmtMoneyCompact(summary.expenses),
      delta: prevSummary ? pctDelta(summary.expenses, prevSummary.expenses) : null,
      deltaInverted: true,
      sub: 'approved spending',
    },
    {
      key: 'net', label: 'Net Surplus', icon: 'account_balance', tone: 'finance',
      toneColor: summary.net >= 0 ? 'var(--ska-green)' : 'var(--ska-error)',
      value: fmtMoneyCompact(summary.net),
      delta: prevSummary ? pctDelta(summary.net, prevSummary.net) : null,
      sub: 'revenue − expenses',
    },
    {
      key: 'rate', label: 'Collection Rate', icon: 'task_alt', tone: 'primary',
      value: `${collectionRate}%`,
      delta: null,
      sub: `${fmtMoneyCompact(collected)} of ${fmtMoneyCompact(collected + outstanding)} billed`,
    },
  ];

  if (error) {
    return (
      <div className="pu-page">
        <div className="pu-empty">
          <Ic name="error" size="xl" style={{ color: 'var(--ska-error)' }} />
          <p className="pu-empty__title">Couldn't load reports</p>
          <p className="pu-empty__desc">{error}</p>
          <button className="ska-btn ska-btn--primary" onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="pu-page bfr-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Reports &amp; Analytics</h1>
          <p className="ska-page-sub">Revenue, spending and collection insights</p>
        </div>
        <div className="bur-head-actions">
          <button className="ska-btn ska-btn--primary" onClick={() => setExportOpen(true)} disabled={loading || !data}>
            <Ic name="download" size="sm" /> Export
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div className="bfr-periods" role="tablist" aria-label="Report period">
        {PERIODS.map((p) => (
          <button key={p.key} type="button" role="tab" aria-selected={period === p.key}
            className={`pu-pill${period === p.key ? ' pu-pill--on' : ''}`}
            onClick={() => setPeriod(p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      {/* KPI cards */}
      <div className="pu-stats bfr-kpis">
        {kpis.map((c) => {
          const deltaGood = c.delta != null && (c.deltaInverted ? c.delta <= 0 : c.delta >= 0);
          return (
            <div key={c.key}
              className={`pu-stat pu-stat--${c.tone}`}
              style={c.toneColor ? { '--pu-stat-tone': c.toneColor } : undefined}>
              <div className="pu-stat__icon"><Ic name={c.icon} /></div>
              <div className="pu-stat__body">
                <span className="pu-stat__label">{c.label}</span>
                <span className="pu-stat__value">{loading ? '…' : c.value}</span>
                <span className="pu-stat__sub">
                  {loading ? '' : (
                    <>
                      {c.delta != null && (
                        <span className={`bfr-delta ${deltaGood ? 'bfr-delta--up' : 'bfr-delta--down'}`}>
                          <Ic name={c.delta >= 0 ? 'arrow_upward' : 'arrow_downward'} size="sm" />
                          {Math.abs(c.delta)}% vs prior
                        </span>
                      )}
                      {c.delta == null && c.sub}
                    </>
                  )}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Plan 4.3 — collection rate, cash flow, budgets (own data windows) */}
      <div className="bfr-grid">
        <CollectionSection />
        <CashFlowSection />
      </div>
      <BudgetsSection />

      {/* Monthly performance chart */}
      <div className="pu-card">
        <div className="pu-card__head">
          <p className="pu-card__title"><Ic name="bar_chart" /> Monthly Performance</p>
          <div className="bfr-legend">
            <span><i className="bfr-legend__dot bfr-legend__dot--rev" /> Revenue</span>
            <span><i className="bfr-legend__dot bfr-legend__dot--exp" /> Expenses</span>
          </div>
        </div>
        {loading ? (
          <div className="bfr-chart-skel"><div className="bur-skel" /><div className="bur-skel" /><div className="bur-skel" /></div>
        ) : monthly.length === 0 ? (
          <div className="bur-picker__empty">No transactions in this period yet.</div>
        ) : (
          <div className="bfr-chart-scroll">
            <div className="bfr-chart" style={{ minWidth: `${monthly.length * 56}px` }}>
              {monthly.map((m) => (
                <div className="bfr-chart__col" key={m.month}
                  title={`${monthLong(m.month)} — Revenue ${fmtMoney(m.revenue)} · Expenses ${fmtMoney(m.expenses)} · ${m.payments} payments`}>
                  <div className="bfr-chart__bars">
                    <div className="bfr-chart__bar bfr-chart__bar--rev"
                      style={{ height: `${Math.round((m.revenue / chartMax) * 100)}%` }} />
                    <div className="bfr-chart__bar bfr-chart__bar--exp"
                      style={{ height: `${Math.round((m.expenses / chartMax) * 100)}%` }} />
                  </div>
                  <span className="bfr-chart__label">{monthShort(m.month)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bfr-grid">
        {/* Payment method analytics */}
        <div className="pu-card">
          <div className="pu-card__head">
            <p className="pu-card__title"><Ic name="donut_small" /> Payment Methods</p>
          </div>
          {!loading && (mostPopular || fastestGrowing) && (
            <div className="bfr-insight-chips">
              {mostPopular && (
                <span className="bfr-chip bfr-chip--primary">
                  <Ic name="star" size="sm" /> Most popular: <strong>{methodLabel(mostPopular.method)}</strong>
                  {summary.revenue > 0 && <> ({Math.round((mostPopular.total / summary.revenue) * 100)}%)</>}
                </span>
              )}
              {fastestGrowing && (
                <span className="bfr-chip bfr-chip--green">
                  <Ic name="trending_up" size="sm" /> Fastest growing: <strong>{methodLabel(fastestGrowing.method)}</strong> +{fastestGrowing.growth}%
                </span>
              )}
            </div>
          )}
          {loading ? (
            <div className="bfr-chart-skel"><div className="bur-skel" /><div className="bur-skel" /></div>
          ) : methods.length === 0 ? (
            <div className="bur-picker__empty">No payments in this period yet.</div>
          ) : (
            <div className="bfr-share-list">
              {methods.map((m, i) => (
                <ShareRow key={m.method}
                  icon={METHOD_ICONS[m.method] || 'payments'}
                  label={methodLabel(m.method)}
                  total={m.total}
                  count={`${m.count} payment${m.count === 1 ? '' : 's'}`}
                  share={summary.revenue > 0 ? Math.round((m.total / summary.revenue) * 100) : 0}
                  tone={METHOD_TONES[i % METHOD_TONES.length]} />
              ))}
            </div>
          )}
        </div>

        {/* Spending by category */}
        <div className="pu-card">
          <div className="pu-card__head">
            <p className="pu-card__title"><Ic name="category" /> Spending by Category</p>
            <button className="pu-card__action" onClick={() => navigateTo && navigateTo('expenses')}>
              Open Expenses
            </button>
          </div>
          {loading ? (
            <div className="bfr-chart-skel"><div className="bur-skel" /><div className="bur-skel" /></div>
          ) : expenseCats.length === 0 ? (
            <div className="bur-picker__empty">No expenses in this period yet.</div>
          ) : (
            <div className="bfr-share-list">
              {expenseCats.map((c, i) => (
                <ShareRow key={c.category}
                  icon="receipt_long"
                  label={catLabel(c.category)}
                  total={c.total}
                  count={`${c.count} entr${c.count === 1 ? 'y' : 'ies'}`}
                  share={summary.expenses > 0 ? Math.round((c.total / summary.expenses) * 100) : 0}
                  tone={METHOD_TONES[(i + 3) % METHOD_TONES.length]} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bfr-grid">
        {/* Top outstanding balances */}
        <div className="pu-card">
          <div className="pu-card__head">
            <p className="pu-card__title"><Ic name="hourglass_top" /> Top Outstanding Balances</p>
            <button className="pu-card__action" onClick={() => navigateTo && navigateTo('student-fees')}>
              Open Student Fees
            </button>
          </div>
          {loading ? (
            <div className="bfr-chart-skel"><div className="bur-skel" /><div className="bur-skel" /></div>
          ) : topDebtors.length === 0 ? (
            <div className="bur-picker__empty">
              <Ic name="task_alt" size="sm" style={{ color: 'var(--ska-green)' }} /> No outstanding balances — all fees settled.
            </div>
          ) : (
            <div className="bur-detail-list">
              {topDebtors.map((d) => (
                <div className="bur-detail-row" key={d.student_id}>
                  <p>
                    {d.student_name}
                    <small>{d.admission_number ? `${d.admission_number} · ` : ''}{d.open_fees} open fee{d.open_fees === 1 ? '' : 's'}</small>
                  </p>
                  <strong className="bur-cell-money--red">{fmtMoney(d.balance)}</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Period summary */}
        <div className="pu-card">
          <div className="pu-card__head">
            <p className="pu-card__title"><Ic name="summarize" /> Period Summary</p>
            <span className="pu-card__sub">{periodLabel}</span>
          </div>
          <div className="bfr-facts">
            <div className="bfr-fact">
              <span>Payments recorded</span>
              <strong>{loading ? '…' : summary.payment_count}</strong>
            </div>
            <div className="bfr-fact">
              <span>Average payment</span>
              <strong>{loading ? '…' : fmtMoney(summary.avg_payment)}</strong>
            </div>
            <div className="bfr-fact">
              <span>Largest payment</span>
              <strong>{loading ? '…' : fmtMoney(summary.largest_payment)}</strong>
            </div>
            <div className="bfr-fact">
              <span>Net position</span>
              <strong style={{ color: summary.net >= 0 ? 'var(--ska-green)' : 'var(--ska-error)' }}>
                {loading ? '…' : fmtMoney(summary.net)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {exportOpen && data && (
        <ExportModal
          range={ranges.current}
          periodLabel={periodLabel}
          analytics={data}
          onClose={() => setExportOpen(false)}
        />
      )}
    </div>
  );
}
