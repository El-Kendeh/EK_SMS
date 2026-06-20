import React, { useState, useEffect, useMemo } from 'react';
import financeApi from '../../api/financeApi';
import { fmtMoney, fmtDateTime, PAYMENT_METHODS, initials } from './bursar.utils';
import '../schooladmin/SchoolAdmin.css';
import './Bursar.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Record Payment modal — shared by Payments and StudentFees pages.
 * Steps: pick student → (optional) link an open fee → amount/method → receipt.
 *
 * Props:
 *  - presetStudent: { id, name, admission_number } | null
 *  - presetFeeId:   number | null (only used together with presetStudent)
 *  - onClose():     close without changes
 *  - onSuccess():   called after a payment was recorded (refetch lists)
 */
export default function RecordPaymentModal({ presetStudent = null, presetFeeId = null, onClose, onSuccess }) {
  const [student, setStudent] = useState(presetStudent);
  const [students, setStudents] = useState(null);   // null = not loaded yet
  const [search, setSearch] = useState('');

  const [openFees, setOpenFees] = useState([]);
  const [feesLoading, setFeesLoading] = useState(false);

  const [feeId, setFeeId] = useState(presetFeeId ? String(presetFeeId) : '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [reference, setReference] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);     // success step

  /* Load the student list only when a picker is needed */
  useEffect(() => {
    if (student) return;
    let cancelled = false;
    financeApi.getStudents()
      .then((res) => { if (!cancelled) setStudents(res.students || []); })
      .catch((err) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [student]);

  /* Load the selected student's open fees */
  useEffect(() => {
    if (!student?.id) return;
    let cancelled = false;
    setFeesLoading(true);
    financeApi.getStudentFees(student.id)
      .then((res) => {
        if (cancelled) return;
        const open = (res.fees || []).filter(
          (f) => (f.amount_due || 0) - (f.amount_paid || 0) > 0
        );
        setOpenFees(open);
        if (presetFeeId && !open.some((f) => String(f.id) === String(presetFeeId))) {
          setFeeId('');
        }
      })
      .catch(() => { if (!cancelled) setOpenFees([]); })
      .finally(() => { if (!cancelled) setFeesLoading(false); });
    return () => { cancelled = true; };
  }, [student, presetFeeId]);

  const filteredStudents = useMemo(() => {
    if (!students) return [];
    const q = search.trim().toLowerCase();
    const list = q
      ? students.filter((s) =>
          (s.full_name || '').toLowerCase().includes(q) ||
          (s.admission_number || '').toLowerCase().includes(q))
      : students;
    return list.slice(0, 50);
  }, [students, search]);

  const selectedFee = openFees.find((f) => String(f.id) === feeId) || null;
  const feeBalance = selectedFee
    ? (selectedFee.amount_due || 0) - (selectedFee.amount_paid || 0)
    : null;

  const amountNum = Number(amount);
  const amountError =
    amount === '' ? null
      : !(amountNum > 0) ? 'Amount must be greater than zero'
      : selectedFee && amountNum > feeBalance
        ? `Amount exceeds this fee's outstanding balance (${fmtMoney(feeBalance)})`
        : null;

  const canSubmit = student && amount !== '' && !amountError && !submitting;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await financeApi.recordPayment({
        studentId: student.id,
        amount: amountNum,
        feeId: feeId ? Number(feeId) : null,
        paymentMethod: method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
        paidBy: paidBy.trim() || null,
      });
      if (res?.success === false) throw new Error(res.message || 'Failed to record payment');
      setReceipt(res.payment);
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const studentName = student?.name || student?.full_name || '';

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal ska-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="ska-modal-head">
          <h3 className="ska-modal-title">
            {receipt ? 'Payment Recorded' : 'Record Payment'}
          </h3>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>

        <div className="ska-modal-body">
          {receipt ? (
            <div className="bur-receipt">
              <div className="bur-receipt__icon"><Ic name="task_alt" /></div>
              <p className="bur-receipt__title">{fmtMoney(receipt.amount)} received</p>
              <div className="bur-receipt__number">{receipt.receipt_number}</div>
              <div className="bur-receipt__grid">
                <div><span>Student</span><strong>{studentName}</strong></div>
                <div><span>Method</span><strong>{(PAYMENT_METHODS.find(m => m.value === receipt.payment_method) || {}).label || receipt.payment_method}</strong></div>
                <div><span>Date</span><strong>{fmtDateTime(receipt.paid_at || Date.now())}</strong></div>
                <div><span>Amount</span><strong>{fmtMoney(receipt.amount)}</strong></div>
              </div>
              <div className="bur-receipt__hash" title="Integrity hash">
                HASH&nbsp;·&nbsp;{receipt.payment_hash}
              </div>
              <div className="bur-modal__actions" style={{ width: '100%' }}>
                <button className="ska-btn ska-btn--primary" onClick={onClose}>Done</button>
              </div>
            </div>
          ) : (
            <form className="bur-modal-form" onSubmit={handleSubmit}>
              {error && <div className="bur-banner bur-banner--error"><Ic name="error" size="sm" />{error}</div>}

              {/* Step 1 — student */}
              {student ? (
                <div className="bur-selected">
                  <div className="bur-selected__avatar">{initials(studentName)}</div>
                  <div className="bur-selected__body">
                    <strong>{studentName}</strong>
                    <span>{student.admission_number ? `Adm. ${student.admission_number}` : 'Student'}</span>
                  </div>
                  {!presetStudent && (
                    <button type="button" className="bur-selected__change"
                      onClick={() => { setStudent(null); setFeeId(''); setOpenFees([]); }}>
                      Change
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <label className="bur-field">
                    <span>Find Student *</span>
                    <input className="bur-input" type="text" autoFocus
                      placeholder="Search by name or admission number…"
                      value={search} onChange={(e) => setSearch(e.target.value)} />
                  </label>
                  <div className="bur-picker">
                    {students === null ? (
                      <div className="bur-picker__empty">Loading students…</div>
                    ) : filteredStudents.length === 0 ? (
                      <div className="bur-picker__empty">No students match "{search}"</div>
                    ) : filteredStudents.map((s) => (
                      <button type="button" key={s.id} className="bur-picker__row"
                        onClick={() => setStudent({ id: s.id, name: s.full_name, admission_number: s.admission_number })}>
                        <span className="bur-picker__name">{s.full_name || 'Unnamed'}</span>
                        <span className="bur-picker__sub">
                          {[s.admission_number, s.classroom].filter(Boolean).join(' · ') || '—'}
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Step 2 — fee link + amount */}
              {student && (
                <>
                  <label className="bur-field">
                    <span>Apply To Fee (optional)</span>
                    <select className="bur-input" value={feeId} onChange={(e) => setFeeId(e.target.value)} disabled={feesLoading}>
                      <option value="">
                        {feesLoading ? 'Loading fees…' : '— General payment (no specific fee) —'}
                      </option>
                      {openFees.map((f) => (
                        <option key={f.id} value={f.id}>
                          {(f.feeCategory?.name || 'Fee')}{f.term?.name ? ` · ${f.term.name}` : ''} — balance {fmtMoney((f.amount_due || 0) - (f.amount_paid || 0))}
                        </option>
                      ))}
                    </select>
                    {!feesLoading && openFees.length === 0 && (
                      <span className="bur-field-hint">No outstanding fees for this student — payment will be recorded as general.</span>
                    )}
                  </label>

                  <div className="bur-field-row">
                    <label className="bur-field">
                      <span>Amount *</span>
                      <input className="bur-input" type="number" min="0.01" step="0.01" required
                        placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} />
                      {selectedFee && !amountError && (
                        <span className="bur-field-hint">Outstanding balance: {fmtMoney(feeBalance)}</span>
                      )}
                      {amountError && <span className="bur-field-err">{amountError}</span>}
                    </label>
                    <label className="bur-field">
                      <span>Payment Method</span>
                      <select className="bur-input" value={method} onChange={(e) => setMethod(e.target.value)}>
                        {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                      </select>
                    </label>
                  </div>

                  <div className="bur-field-row">
                    <label className="bur-field">
                      <span>Reference</span>
                      <input className="bur-input" type="text" placeholder="e.g. transfer ref, cheque #"
                        value={reference} onChange={(e) => setReference(e.target.value)} />
                    </label>
                    <label className="bur-field">
                      <span>Paid By</span>
                      <input className="bur-input" type="text" placeholder="e.g. parent / guardian name"
                        value={paidBy} onChange={(e) => setPaidBy(e.target.value)} />
                    </label>
                  </div>

                  <label className="bur-field">
                    <span>Notes</span>
                    <textarea className="bur-input" rows={2} placeholder="Optional notes…"
                      value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </label>
                </>
              )}

              <div className="bur-modal__actions">
                <button type="button" className="ska-btn ska-btn--ghost" onClick={onClose}>Cancel</button>
                <button type="submit" className="ska-btn ska-btn--primary" disabled={!canSubmit}>
                  {submitting ? 'Recording…' : 'Record Payment'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
