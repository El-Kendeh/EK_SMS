import React, { useState, useEffect, useMemo } from 'react';
import financeApi from '../../api/financeApi';
import { fmtMoney, freqLabel } from './bursar.utils';
import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css';
import './Bursar.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const INSTALLMENT_OPTIONS = [1, 2, 3, 4, 6, 9, 12];

/**
 * Assign Fees modal — shared by FeeCategories and StudentFees pages.
 * Picks a fee category, an optional term, a class's students (multi-select),
 * and an optional absolute discount, then bulk-assigns via POST /fees/assign/.
 * The backend skips students who already hold that category+term fee.
 *
 * Props:
 *  - presetCategory: category object | null (locks the category select)
 *  - onClose()
 *  - onSuccess(count): called after fees were assigned
 */
export default function AssignFeesModal({ presetCategory = null, onClose, onSuccess }) {
  const [categories, setCategories] = useState(presetCategory ? [presetCategory] : []);
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [lookupsLoading, setLookupsLoading] = useState(true);

  const [categoryId, setCategoryId] = useState(presetCategory ? String(presetCategory.id) : '');
  const [termId, setTermId] = useState('');
  const [classId, setClassId] = useState('');
  const [discount, setDiscount] = useState('');
  const [discountMode, setDiscountMode] = useState('amount'); // 'amount' | 'percent'
  const [discountReason, setDiscountReason] = useState('');
  const [installments, setInstallments] = useState('1');

  const [students, setStudents] = useState(null);  // null = no class picked yet
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);           // { count }

  /* Lookups */
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled([
      presetCategory ? Promise.resolve(null) : financeApi.getFeeCategories(),
      financeApi.getClasses(),
      financeApi.getTerms(),
    ]).then(([cat, cls, trm]) => {
      if (cancelled) return;
      if (cat.status === 'fulfilled' && cat.value?.categories) {
        setCategories((cat.value.categories || []).filter((c) => c.is_active !== false));
      }
      if (cls.status === 'fulfilled') setClasses(cls.value?.classes || []);
      if (trm.status === 'fulfilled') setTerms(trm.value?.terms || []);
      setLookupsLoading(false);
    });
    return () => { cancelled = true; };
  }, [presetCategory]);

  /* Students of the chosen class */
  useEffect(() => {
    if (!classId) { setStudents(null); setSelectedIds(new Set()); return; }
    let cancelled = false;
    setStudentsLoading(true);
    financeApi.getStudents({ classroom_id: classId })
      .then((res) => {
        if (cancelled) return;
        setStudents(res.students || []);
        setSelectedIds(new Set());
      })
      .catch((err) => { if (!cancelled) { setStudents([]); setError(err.message); } })
      .finally(() => { if (!cancelled) setStudentsLoading(false); });
    return () => { cancelled = true; };
  }, [classId]);

  const category = useMemo(
    () => categories.find((c) => String(c.id) === categoryId) || null,
    [categories, categoryId]
  );

  const discountNum = Number(discount || 0);
  const discountError =
    discount === '' ? null
      : discountNum < 0 ? 'Discount cannot be negative'
      : discountMode === 'percent'
        ? (discountNum > 99.99 ? 'Percent must be between 0 and 99.99' : null)
        : category && discountNum >= Number(category.amount)
          ? `Discount must be less than the fee amount (${fmtMoney(category.amount)})`
          : null;

  const netPerStudent = !category ? 0
    : discountMode === 'percent'
      ? Math.max(0, Number(category.amount) * (1 - Math.min(discountNum, 100) / 100))
      : Math.max(0, Number(category.amount) - discountNum);

  const installmentsNum = Number(installments) || 1;

  const switchMode = (mode) => {
    if (mode === discountMode) return;
    setDiscountMode(mode);
    setDiscount('');
  };

  const toggleStudent = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const allSelected = students && students.length > 0 && selectedIds.size === students.length;
  const toggleAll = () => {
    if (!students) return;
    setSelectedIds(allSelected ? new Set() : new Set(students.map((s) => s.id)));
  };

  const canSubmit = category && selectedIds.size > 0 && !discountError && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await financeApi.assignFees({
        feeCategoryId: Number(categoryId),
        studentIds: Array.from(selectedIds),
        termId: termId ? Number(termId) : null,
        discount: discountMode === 'amount' ? discountNum : 0,
        discountPercent: discountMode === 'percent' && discount !== '' ? discountNum : null,
        discountReason: discountReason.trim() ? discountReason.trim().slice(0, 120) : null,
        installments: installmentsNum,
      });
      if (res?.success === false) throw new Error(res.message || 'Failed to assign fees');
      setDone({ count: res.count ?? 0, requested: selectedIds.size });
      onSuccess?.(res.count ?? 0);
    } catch (err) {
      setError(err.message || 'Failed to assign fees');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal ska-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="ska-modal-head">
          <h3 className="ska-modal-title">{done ? 'Fees Assigned' : 'Assign Fees to Students'}</h3>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>

        <div className="ska-modal-body">
          {done ? (
            <div className="bur-receipt">
              <div className="bur-receipt__icon"><Ic name="task_alt" /></div>
              <p className="bur-receipt__title">
                {done.count} fee{done.count !== 1 ? 's' : ''} assigned
              </p>
              {done.count < done.requested && (
                <p className="bur-field-hint" style={{ maxWidth: 380 }}>
                  {done.requested - done.count} student{done.requested - done.count !== 1 ? 's were' : ' was'} skipped —
                  they already have this fee for the selected term.
                </p>
              )}
              <div className="bur-modal__actions" style={{ width: '100%' }}>
                <button className="ska-btn ska-btn--primary" onClick={onClose}>Done</button>
              </div>
            </div>
          ) : (
            <form className="bur-modal-form" onSubmit={handleSubmit}>
              {error && <div className="bur-banner bur-banner--error"><Ic name="error" size="sm" />{error}</div>}

              <div className="bur-field-row">
                <label className="bur-field">
                  <span>Fee Category *</span>
                  <select className="bur-input" value={categoryId} required
                    disabled={!!presetCategory || lookupsLoading}
                    onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">{lookupsLoading ? 'Loading…' : 'Select category…'}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {fmtMoney(c.amount)} ({freqLabel(c.frequency)})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="bur-field">
                  <span>Term (optional)</span>
                  <select className="bur-input" value={termId} onChange={(e) => setTermId(e.target.value)}>
                    <option value="">— No specific term —</option>
                    {terms.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}{t.academicYear?.name ? ` · ${t.academicYear.name}` : ''}
                      </option>
                    ))}
                  </select>
                  <span className="bur-field-hint">Due date defaults to the term's end date.</span>
                </label>
              </div>

              <div className="bur-field-row">
                <label className="bur-field">
                  <span>Class *</span>
                  <select className="bur-input" value={classId} required onChange={(e) => setClassId(e.target.value)}>
                    <option value="">Select class…</option>
                    {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </label>
                <div className="bur-field">
                  <span>Scholarship / Discount (optional)</span>
                  <div className="bur-pills bur-mode">
                    <button type="button"
                      className={`pu-pill${discountMode === 'amount' ? ' pu-pill--on' : ''}`}
                      onClick={() => switchMode('amount')}>
                      Amount
                    </button>
                    <button type="button"
                      className={`pu-pill${discountMode === 'percent' ? ' pu-pill--on' : ''}`}
                      onClick={() => switchMode('percent')}>
                      Percent
                    </button>
                  </div>
                  <input className="bur-input" type="number" min="0" step="0.01"
                    max={discountMode === 'percent' ? '99.99' : undefined}
                    placeholder={discountMode === 'percent' ? '0 – 99.99 %' : '0.00'}
                    aria-label={discountMode === 'percent' ? 'Discount percent' : 'Discount amount'}
                    value={discount} onChange={(e) => setDiscount(e.target.value)} />
                  {discountError
                    ? <span className="bur-field-err">{discountError}</span>
                    : category && <span className="bur-field-hint">Each student will owe {fmtMoney(netPerStudent)}.</span>}
                </div>
              </div>

              <div className="bur-field-row">
                <label className="bur-field">
                  <span>Discount reason (optional)</span>
                  <input className="bur-input" type="text" maxLength={120}
                    placeholder="e.g. Merit scholarship"
                    value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} />
                </label>
                <label className="bur-field">
                  <span>Payment plan</span>
                  <select className="bur-input" value={installments} onChange={(e) => setInstallments(e.target.value)}>
                    {INSTALLMENT_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n === 1 ? 'Pay in full' : `${n} installments`}</option>
                    ))}
                  </select>
                  {installmentsNum > 1 && category && (
                    <span className="bur-field-hint">
                      {installmentsNum} × {fmtMoney(netPerStudent / installmentsNum)} per installment
                    </span>
                  )}
                </label>
              </div>

              {classId && (
                <div className="bur-field">
                  <span>
                    Students *
                    {students && students.length > 0 && ` — ${selectedIds.size} of ${students.length} selected`}
                  </span>
                  <div className="bur-picker">
                    {studentsLoading ? (
                      <div className="bur-picker__empty">Loading students…</div>
                    ) : !students || students.length === 0 ? (
                      <div className="bur-picker__empty">No students in this class.</div>
                    ) : (
                      <>
                        <label className="bur-picker__row" style={{ fontWeight: 700 }}>
                          <input type="checkbox" checked={!!allSelected} onChange={toggleAll} />
                          <span className="bur-picker__name">Select all</span>
                          <span className="bur-picker__sub">{students.length} students</span>
                        </label>
                        {students.map((s) => (
                          <label key={s.id} className={`bur-picker__row${selectedIds.has(s.id) ? ' is-on' : ''}`}>
                            <input type="checkbox" checked={selectedIds.has(s.id)} onChange={() => toggleStudent(s.id)} />
                            <span className="bur-picker__name">{s.full_name || 'Unnamed'}</span>
                            <span className="bur-picker__sub">{s.admission_number || '—'}</span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="bur-modal__actions">
                <button type="button" className="ska-btn ska-btn--ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="ska-btn ska-btn--primary" disabled={!canSubmit}>
                  {submitting
                    ? 'Assigning…'
                    : `Assign to ${selectedIds.size || ''} Student${selectedIds.size !== 1 ? 's' : ''}`}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
