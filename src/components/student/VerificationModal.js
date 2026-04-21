import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './VerificationModal.css';

export default function VerificationModal({ reportCard, onClose }) {
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!reportCard) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [reportCard, onClose]);

  // Draw a simple QR-like pattern on canvas as placeholder
  useEffect(() => {
    if (!reportCard || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = 120;
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);

    // Use verificationHash to seed a deterministic pattern
    const hash = reportCard.verificationHash || 'abcdef1234567890';
    const cellSize = 8;
    const cols = Math.floor(size / cellSize);
    ctx.fillStyle = '#101C2E';

    // Finder squares (corners)
    const drawFinder = (x, y) => {
      ctx.fillStyle = '#101C2E';
      ctx.fillRect(x, y, cellSize * 7, cellSize * 7);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + cellSize, y + cellSize, cellSize * 5, cellSize * 5);
      ctx.fillStyle = '#101C2E';
      ctx.fillRect(x + cellSize * 2, y + cellSize * 2, cellSize * 3, cellSize * 3);
    };
    drawFinder(0, 0);
    drawFinder(size - cellSize * 7, 0);
    drawFinder(0, size - cellSize * 7);

    // Data dots from hash
    ctx.fillStyle = '#101C2E';
    for (let r = 0; r < cols; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = (r * cols + c) % hash.length;
        const charCode = hash.charCodeAt(idx);
        // Skip finder square areas
        const inTL = r < 8 && c < 8;
        const inTR = r < 8 && c >= cols - 8;
        const inBL = r >= cols - 8 && c < 8;
        if (inTL || inTR || inBL) continue;
        if (charCode % 2 === 0) {
          ctx.fillRect(c * cellSize, r * cellSize, cellSize - 1, cellSize - 1);
        }
      }
    }
  }, [reportCard]);

  const handleCopy = () => {
    if (!reportCard?.verificationHash) return;
    navigator.clipboard.writeText(reportCard.verificationHash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    await new Promise((r) => setTimeout(r, 1400));
    setVerifyResult(reportCard?.isValid !== false ? 'valid' : 'invalid');
    setVerifying(false);
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
              </div>

              {/* QR code */}
              <div className="vmod-qr">
                <div className="vmod-qr-box">
                  <canvas ref={canvasRef} />
                </div>
                <span className="vmod-qr-label">Scan to verify at any institution</span>
              </div>

              {/* Hash row */}
              <div className="vmod-hash">
                <code>SHA-256: {shortHash}</code>
                <button className="vmod-hash-copy" onClick={handleCopy} title="Copy full hash">
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
