import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import QRCode from '../common/QRCode';
import './VerificationModal.css';

export default function VerificationModal({ reportCard, onClose }) {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyDetail, setVerifyDetail] = useState(null);

  useEffect(() => {
    if (!reportCard) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [reportCard, onClose]);

  const verifyUrl = reportCard?.verificationHash
    ? `${window.location.origin}/verify/${encodeURIComponent(reportCard.verificationHash)}`
    : '';

  const handleCopy = (text) => () => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleVerify = async () => {
    if (!reportCard?.verificationHash) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const result = await studentApi.verifyHash(reportCard.verificationHash);
      setVerifyDetail(result);
      setVerifyResult(result?.valid ? 'valid' : 'invalid');
    } catch (e) {
      setVerifyResult('invalid');
    } finally {
      setVerifying(false);
    }
  };

  const shortHash = reportCard?.verificationHash
    ? `${reportCard.verificationHash.slice(0, 6)}...${reportCard.verificationHash.slice(-4)}`
    : 'N/A';

  return (
    <AnimatePresence>
      {reportCard && (
        <motion.div
          className="vmod-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="vmod-panel"
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          >
            {/* Header */}
            <div className="vmod-header">
              <h3>
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                Grade Verification
              </h3>
              <button className="vmod-close" onClick={onClose} aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="vmod-body">
              {/* Status banner */}
              {verifyResult && (
                <div className={`vmod-status ${verifyResult === 'valid' ? 'vmod-status--valid' : 'vmod-status--invalid'}`}>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                    {verifyResult === 'valid' ? 'verified' : 'error'}
                  </span>
                  <p>
                    {verifyResult === 'valid'
                      ? 'Authenticity confirmed — record is unmodified'
                      : 'Verification failed — contact the registrar'}
                  </p>
                </div>
              )}

              {/* Report card info */}
              <div className="vmod-info-block">
                <div className="vmod-info-row">
                  <span>Term</span>
                  <span>{reportCard.termName || 'First Term'}</span>
                </div>
                <div className="vmod-info-row">
                  <span>Academic Year</span>
                  <span>{reportCard.academicYear || '2024–2025'}</span>
                </div>
                <div className="vmod-info-row">
                  <span>Term Average</span>
                  <span>{reportCard.average != null ? `${reportCard.average.toFixed(1)}%` : 'N/A'}</span>
                </div>
                <div className="vmod-info-row">
                  <span>Status</span>
                  <span>{reportCard.status === 'published' ? 'Published' : 'Draft'}</span>
                </div>
                {verifyUrl && (
                  <div className="vmod-info-row vmod-info-row--url">
                    <span>Verification URL</span>
                    <a
                      href={verifyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="vmod-verify-link"
                    >
                      <span className="material-symbols-outlined">open_in_new</span>
                      Open verification page
                    </a>
                  </div>
                )}
                {verifyDetail?.valid && (
                  <>
                    <div className="vmod-info-row">
                      <span>Signed by</span>
                      <span>{verifyDetail.signedBy}</span>
                    </div>
                    <div className="vmod-info-row">
                      <span>Chain position</span>
                      <span>#{verifyDetail.chainPosition}</span>
                    </div>
                  </>
                )}
              </div>

              {/* QR code — real, scannable */}
              <div className="vmod-qr">
                <div className="vmod-qr-box">
                  <QRCode value={verifyUrl} size={180} ariaLabel="Scan to verify report card" />
                </div>
                <span className="vmod-qr-label">Scan to verify at any institution</span>
              </div>

              {/* Hash row */}
              <div className="vmod-hash">
                <code>SHA-256: {shortHash}</code>
                <button className="vmod-hash-copy" onClick={handleCopy(reportCard?.verificationHash)} title="Copy full hash">
                  <span className="material-symbols-outlined">{copied ? 'check' : 'content_copy'}</span>
                </button>
              </div>

              {/* Actions */}
              <div className="vmod-actions">
                <button
                  className="vmod-btn vmod-btn--primary"
                  onClick={handleVerify}
                  disabled={verifying}
                >
                  {verifying ? (
                    <>
                      <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>autorenew</span>
                      Verifying…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">shield_with_heart</span>
                      Verify Authenticity
                    </>
                  )}
                </button>
                <button className="vmod-btn vmod-btn--secondary" onClick={onClose}>
                  <span className="material-symbols-outlined">close</span>
                  Close
                </button>
              </div>

              {/* Smart verification panel */}
              <div className="vmod-info-panel">
                <h4>
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
                  Smart Verification
                </h4>
                <p>
                  Every EK-SMS report card is cryptographically signed. The QR code allows
                  universities and employers to instantly verify the authenticity of your grades
                  without contacting the office.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
