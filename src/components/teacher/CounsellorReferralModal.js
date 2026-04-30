import { useState } from 'react';
import { motion } from 'framer-motion';
import { teacherApi } from '../../api/teacherApi';
import './CounsellorReferralModal.css';

// Modal launched from a student's drawer / card. Sends a pastoral referral.
export default function CounsellorReferralModal({ student, onClose }) {
  const [reason, setReason] = useState('');
  const [notifyParent, setNotifyParent] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!reason.trim()) return;
    setBusy(true); setError(null);
    try {
      const r = await teacherApi.referToCounsellor({
        studentId: student.id, reason: reason.trim(), notifyParent,
      });
      setDone(r);
    } catch { setError('Could not submit the referral.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="crm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        className="crm"
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
      >
        <header>
          <h3><span className="material-symbols-outlined">favorite</span> Refer to counsellor</h3>
          <button onClick={onClose} aria-label="Close"><span className="material-symbols-outlined">close</span></button>
        </header>
        {!done ? (
          <div className="crm__body">
            <p className="crm__sub">Refer <strong>{student?.fullName || student?.name}</strong> for pastoral support. The counsellor sees this in their queue. The student is not notified directly unless the counsellor chooses.</p>

            <label>
              <span>Reason / context</span>
              <textarea
                rows={5}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="What you've observed and why pastoral support might help…"
              />
            </label>

            <label className="crm__check">
              <input type="checkbox" checked={notifyParent} onChange={(e) => setNotifyParent(e.target.checked)} />
              Send a private notification to the linked parent
            </label>

            {error && <p className="crm__error">{error}</p>}

            <div className="crm__actions">
              <button className="crm__btn crm__btn--ghost" onClick={onClose}>Cancel</button>
              <button className="crm__btn crm__btn--primary" onClick={submit} disabled={busy || !reason.trim()}>
                {busy ? 'Submitting…' : 'Submit referral'}
              </button>
            </div>
          </div>
        ) : (
          <div className="crm__success">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <strong>Referral received</strong>
            <p>Reference: <code>{done.referralId}</code></p>
            <button className="crm__btn crm__btn--primary" onClick={onClose}>Done</button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
