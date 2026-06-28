import React, { useState, useEffect, useCallback } from 'react';
import financeApi from '../../api/financeApi';
import AssignFeesModal from './AssignFeesModal';
import { fmtMoney, fmtDate, freqLabel, parseApplicableClasses, FEE_FREQUENCIES } from './bursar.utils';

import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css';
import './Bursar.css';
import './FeeCategories.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/* ── Create category modal ────────────────────────────────── */
function CreateCategoryModal({ classes, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [frequency, setFrequency] = useState('term');
  const [selectedClasses, setSelectedClasses] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const amountNum = Number(amount);
  const amountError = amount !== '' && !(amountNum > 0) ? 'Amount must be greater than zero' : null;
  const canSubmit = name.trim() && amount !== '' && !amountError && !submitting;

  const toggleClass = (clsName) => {
    setSelectedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(clsName)) next.delete(clsName); else next.add(clsName);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await financeApi.createFeeCategory({
        name: name.trim(),
        amount: amountNum,
        description: description.trim(),
        frequency,
        applicableClasses: Array.from(selectedClasses),
      });
      if (res?.success === false) throw new Error(res.message || 'Failed to create fee category');
      onSuccess?.(res.category);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create fee category');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal ska-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="ska-modal-head">
          <h3 className="ska-modal-title">New Fee Category</h3>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>
        <div className="ska-modal-body">
          <form className="bur-modal-form" onSubmit={handleSubmit}>
            {error && <div className="bur-banner bur-banner--error"><Ic name="error" size="sm" />{error}</div>}

            <div className="bur-field-row">
              <label className="bur-field">
                <span>Category Name *</span>
                <input className="bur-input" type="text" required autoFocus
                  placeholder="e.g. Tuition Fee, Library Fee…"
                  value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="bur-field">
                <span>Amount *</span>
                <input className="bur-input" type="number" min="0.01" step="0.01" required
                  placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                {amountError && <span className="bur-field-err">{amountError}</span>}
              </label>
            </div>

            <div className="bur-field-row">
              <label className="bur-field">
                <span>Frequency</span>
                <select className="bur-input" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                  {FEE_FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </label>
              <label className="bur-field">
                <span>Description</span>
                <input className="bur-input" type="text" placeholder="Optional description…"
                  value={description} onChange={(e) => setDescription(e.target.value)} />
              </label>
            </div>

            <div className="bur-field">
              <span>Applicable Classes {selectedClasses.size > 0 && `— ${selectedClasses.size} selected`}</span>
              {classes.length === 0 ? (
                <span className="bur-field-hint">No classes found — the category will apply school-wide.</span>
              ) : (
                <div className="bur-chips">
                  <button type="button"
                    className={`pu-chip pu-chip--all${selectedClasses.size === 0 ? ' pu-chip--on' : ''}`}
                    onClick={() => setSelectedClasses(new Set())}>
                    All classes
                  </button>
                  {classes.map((c) => (
                    <button type="button" key={c.id}
                      className={`pu-chip${selectedClasses.has(c.name) ? ' pu-chip--on' : ''}`}
                      onClick={() => toggleClass(c.name)}>
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              <span className="bur-field-hint">Leave empty to make the category available to every class.</span>
            </div>

            <div className="bur-modal__actions">
              <button type="button" className="ska-btn ska-btn--ghost" onClick={onClose}>Cancel</button>
              <button type="submit" className="ska-btn ska-btn--primary" disabled={!canSubmit}>
                {submitting ? 'Creating…' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ────────────────────────────────────────────── */
export default function FeeCategories() {
  const [categories, setCategories] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [banner, setBanner] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [assignCategory, setAssignCategory] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    financeApi.getFeeCategories()
      .then((res) => setCategories(res.categories || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

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

  return (
    <div className="pu-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Fee Categories</h1>
          <p className="ska-page-sub">Define the fee types your school bills, then assign them to students</p>
        </div>
        <div className="bur-head-actions">
          <button className="ska-btn ska-btn--primary" onClick={() => setCreateOpen(true)}>
            <Ic name="add" size="sm" /> New Category
          </button>
        </div>
      </div>

      {banner && <div className="bur-banner bur-banner--success"><Ic name="check_circle" size="sm" />{banner}</div>}
      {error && <div className="bur-banner bur-banner--error"><Ic name="error" size="sm" />{error}</div>}

      {loading ? (
        <div className="pu-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div className="pu-card" key={i}>
              <div className="bur-skel" style={{ width: '55%' }} />
              <div className="bur-skel" style={{ width: '35%' }} />
              <div className="bur-skel" style={{ width: '80%' }} />
            </div>
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="pu-empty pu-empty--cta">
          <div className="pu-empty__icon-wrap"><Ic name="category" /></div>
          <p className="pu-empty__title">No fee categories yet</p>
          <p className="pu-empty__desc">
            Create your first category (e.g. Tuition, Library, Sports) to start assigning fees and collecting payments.
          </p>
          <button className="ska-btn ska-btn--primary" onClick={() => setCreateOpen(true)}>
            <Ic name="add" size="sm" /> Create Category
          </button>
        </div>
      ) : (
        <div className="pu-grid">
          {categories.map((c) => {
            const cls = parseApplicableClasses(c.applicable_classes);
            return (
              <div className="pu-card burc-card" key={c.id}>
                <div className="burc-card__top">
                  <div className="burc-card__icon"><Ic name="sell" /></div>
                  <div className="burc-card__id">
                    <strong className="burc-card__name">{c.name}</strong>
                    <span className="burc-card__amount">{fmtMoney(c.amount)}</span>
                  </div>
                  <span className={`ska-badge ska-badge--${c.is_active === false ? 'inactive' : 'active'}`}>
                    {c.is_active === false ? 'Inactive' : 'Active'}
                  </span>
                </div>

                {c.description && <p className="burc-card__desc">{c.description}</p>}

                <div className="burc-card__meta">
                  <span className="ska-badge ska-badge--primary">{freqLabel(c.frequency)}</span>
                  {cls.length === 0
                    ? <span className="ska-badge ska-badge--cyan">All classes</span>
                    : cls.slice(0, 4).map((n) => <span className="ska-badge ska-badge--cyan" key={n}>{n}</span>)}
                  {cls.length > 4 && <span className="ska-badge ska-badge--inactive">+{cls.length - 4}</span>}
                </div>

                <div className="burc-card__foot">
                  <span className="burc-card__date">Created {fmtDate(c.created_at)}</span>
                  <button className="ska-btn ska-btn--secondary ska-btn--sm"
                    disabled={c.is_active === false}
                    onClick={() => setAssignCategory(c)}>
                    <Ic name="post_add" size="sm" /> Assign to Students
                  </button>
                  {/* L17: deactivate (retire) a category instead of a hard delete that could
                      orphan assigned fees. Backend also supports full PUT edits. */}
                  <button className="ska-btn ska-btn--ghost ska-btn--sm"
                    title={c.is_active === false ? 'Reactivate this category' : 'Deactivate (hide from new fee assignments)'}
                    onClick={async () => {
                      try {
                        await financeApi.updateFeeCategory(c.id, { is_active: c.is_active === false });
                        setBanner(c.is_active === false ? 'Category activated.' : 'Category deactivated.');
                        load();
                      } catch (e) { setBanner(e?.message || 'Failed to update category.'); }
                    }}>
                    <Ic name={c.is_active === false ? 'check_circle' : 'block'} size="sm" />
                    {c.is_active === false ? 'Activate' : 'Deactivate'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {createOpen && (
        <CreateCategoryModal
          classes={classes}
          onClose={() => setCreateOpen(false)}
          onSuccess={() => { setBanner('Fee category created'); load(); }}
        />
      )}

      {assignCategory && (
        <AssignFeesModal
          presetCategory={assignCategory}
          onClose={() => setAssignCategory(null)}
          onSuccess={(count) => setBanner(`${count} fee(s) assigned from "${assignCategory.name}"`)}
        />
      )}
    </div>
  );
}
