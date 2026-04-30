import { motion } from 'framer-motion';
import QRCode from '../common/QRCode';
import './GradeReceiptModal.css';

// Cryptographic batch receipt shown after a teacher locks a batch of grades.
// Downloadable defensive paperwork — proves "I submitted N grades on day D
// with content hashing to H".
export default function GradeReceiptModal({ receipt, onClose }) {
  if (!receipt) return null;

  const verifyUrl = `${window.location.origin}/verify/${encodeURIComponent(receipt.verificationHash)}`;

  const downloadAsPdf = () => window.print();

  return (
    <div className="grm-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <motion.div
        className="grm-modal"
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
      >
        <header>
          <h3>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            Grade submission receipt
          </h3>
          <button onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </header>
        <div className="grm-body">
          <div className="grm-confirm">
            <strong>{receipt.count} grades locked</strong>
            <span>Cryptographically signed and added to the school ledger.</span>
          </div>

          <dl>
            <div><dt>Receipt</dt><dd>{receipt.id}</dd></div>
            <div><dt>Submitted at</dt><dd>{new Date(receipt.submittedAt).toLocaleString()}</dd></div>
            <div><dt>Chain position</dt><dd>#{receipt.chainPosition}</dd></div>
            <div><dt>Hash</dt><dd className="grm-hash">{receipt.verificationHash}</dd></div>
          </dl>

          <div className="grm-qr">
            <QRCode value={verifyUrl} size={140} ariaLabel="Receipt verification QR" />
            <small>Scan to verify this submission</small>
          </div>

          <p className="grm-note">
            Save this receipt. If a third party later challenges the grades, this is your
            defensible proof of when and what you submitted.
          </p>

          <div className="grm-actions">
            <button className="grm-btn grm-btn--ghost" onClick={onClose}>Done</button>
            <button className="grm-btn grm-btn--primary" onClick={downloadAsPdf}>
              <span className="material-symbols-outlined">print</span> Print / save PDF
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
