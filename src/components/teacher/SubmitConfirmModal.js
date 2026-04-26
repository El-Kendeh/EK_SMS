import { useState } from 'react';
import { motion } from 'framer-motion';
import './SubmitConfirmModal.css';

export default function SubmitConfirmModal({ students, onConfirm, onCancel }) {
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!confirmed) return;
    setSubmitting(true);
    try {
      await onConfirm();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tch-modal-backdrop">
      <motion.div
        className="tch-modal scm-modal"
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="tch-modal__header">
          <div className="scm-header-icon">
            <span className="material-symbols-outlined">lock</span>
          </div>
          <button className="tch-drawer__close" onClick={onCancel} disabled={submitting}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="tch-modal__body">
          {/* Warning */}
          <div className="scm-warning">
            <span className="material-symbols-outlined scm-warning__icon">warning</span>
            <div>
              <p className="scm-warning__title">This action is PERMANENT and IRREVERSIBLE</p>
              <p className="scm-warning__text">
                Once grades are locked, they cannot be edited. Any future changes require a formal
                modification request to be reviewed and approved by the school administrator.
              </p>
            </div>
          </div>

          <h3 className="scm-title">Confirm Grade Submission</h3>
          <p className="scm-sub">
            You are about to permanently lock {students.length} grade{students.length !== 1 ? 's' : ''}:
          </p>

          {/* Student list */}
          <div className="scm-student-list">
            {students.map(s => (
              <div key={s.id} className="scm-student-row">
                <span className="scm-student-name">{s.name}</span>
                <div className="scm-student-grade">
                  <span className="scm-score">{s.score}%</span>
                  {s.gradeLetter && (
                    <span className="tch-badge tch-badge--primary scm-letter">{s.gradeLetter}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Confirmation checkbox */}
          <label className="scm-confirm-label">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="scm-checkbox"
              disabled={submitting}
            />
            <span className="scm-confirm-text">
              I understand this action is permanent and irreversible. These grades will be
              locked and cannot be changed without administrator approval.
            </span>
          </label>
        </div>

        <div className="tch-modal__footer">
          <button
            className="tch-btn tch-btn--ghost"
            onClick={onCancel}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            className="tch-btn tch-btn--primary"
            onClick={handleConfirm}
            disabled={!confirmed || submitting}
            style={{ flex: 1 }}
          >
            <span className="material-symbols-outlined">{submitting ? 'sync' : 'lock'}</span>
            {submitting ? 'Locking…' : `Lock ${students.length} Grade${students.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
