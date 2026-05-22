import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from '../common/QRCode';
import './CertificateModal.css';

export default function CertificateModal({ reportCard, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDownload = () => {
    window.print();
  };

  if (!reportCard) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="cert-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          className="cert-panel"
          initial={{ opacity: 0, scale: 0.96, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 30 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          {/* Top action bar */}
          <div className="cert-topbar">
            <div className="cert-topbar__left">
              <span className="material-symbols-outlined">account_balance</span>
              Academic Registry
            </div>
            <div className="cert-topbar__actions">
              <button className="cert-topbar__btn cert-topbar__btn--primary" onClick={handleDownload}>
                <span className="material-symbols-outlined">download</span>
                Download PDF
              </button>
              <button className="cert-topbar__btn cert-topbar__btn--ghost" onClick={() => {}}>
                <span className="material-symbols-outlined">share</span>
                Share
              </button>
              <button className="cert-topbar__close" onClick={onClose}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>

          {/* Certificate canvas */}
          <div className="cert-scroll">
            <div className="cert-doc">
              {/* Watermark */}
              <div className="cert-watermark">
                <span className="material-symbols-outlined">verified</span>
              </div>

              {/* Header */}
              <div className="cert-doc__header">
                <div className="cert-doc__brand">
                  <div className="cert-doc__brand-icon">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                  </div>
                  <div>
                    <h2 className="cert-doc__school-name">El-Kendeh</h2>
                    <p className="cert-doc__school-sub">SMART SCHOOL</p>
                  </div>
                </div>
                <div className="cert-doc__serial">
                  <p className="cert-doc__serial-label">Document Serial</p>
                  <p className="cert-doc__serial-value">{reportCard.serialNumber || 'EK-2024-CERT-N/A'}</p>
                </div>
              </div>

              {/* Title */}
              <div className="cert-doc__title-block">
                <h1 className="cert-doc__title">Official Certificate of Academic Achievement</h1>
                <div className="cert-doc__title-bar" />
              </div>

              {/* Student */}
              <div className="cert-doc__student">
                <p className="cert-doc__certify">This is to certify that</p>
                <h3 className="cert-doc__student-name">{reportCard.studentName}</h3>
                <div className="cert-doc__meta">
                  <span>{reportCard.classroom}</span>
                  <span className="cert-doc__meta-dot">•</span>
                  <span>{reportCard.termName} {reportCard.academicYear}</span>
                </div>
              </div>

              {/* Grades + Verification bento */}
              <div className="cert-doc__bento">
                {/* Subjects */}
                <div className="cert-grades">
                  <h4 className="cert-grades__title">
                    <span className="material-symbols-outlined">analytics</span>
                    Academic Summary
                  </h4>
                  <div className="cert-grades__list">
                    {(reportCard.subjects || []).map((s) => (
                      <div key={s.subject} className="cert-grade-row">
                        <span className="cert-grade-row__subject">{s.subject}</span>
                        <span className="cert-grade-row__score">{s.score}%</span>
                      </div>
                    ))}
                    <div className="cert-grade-row cert-grade-row--total">
                      <span className="cert-grade-row__subject">Final Average</span>
                      <span className="cert-grade-row__score cert-grade-row__score--total">
                        {reportCard.average != null ? `${reportCard.average.toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Verification */}
                <div className="cert-verify">
                  <div className="cert-verify__qr-wrap">
                    <p className="cert-verify__label">Instant Verification</p>
                    <QRCode
                      value={`${window.location.origin}/verify/${encodeURIComponent(reportCard.verificationHash || '')}`}
                      size={128}
                      ariaLabel="Scan to verify this certificate"
                    />
                    <p className="cert-verify__hash">{(reportCard.verificationHash || '').slice(0, 40)}…</p>
                  </div>
                  <div className="cert-verify__badge">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield_lock</span>
                    <span>Blockchain Verified Asset</span>
                  </div>
                </div>
              </div>

              {/* Signatures & Seal */}
              <div className="cert-doc__signatories">
                <div className="cert-signatory">
                  <div className="cert-signatory__sig-line" />
                  <p className="cert-signatory__name">{reportCard.principal || 'Dr. Elias Kendeh'}</p>
                  <p className="cert-signatory__role">Principal</p>
                </div>

                <div className="cert-seal">
                  <div className="cert-seal__ring">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                    <span className="cert-seal__text">Authenticity<br/>Guaranteed</span>
                  </div>
                  <div className="cert-seal__label">Official Seal</div>
                </div>

                <div className="cert-signatory">
                  <div className="cert-signatory__sig-line" />
                  <p className="cert-signatory__name">{reportCard.registrar || 'Sarah J. Miller'}</p>
                  <p className="cert-signatory__role">Registrar</p>
                </div>
              </div>

              {/* Footer */}
              <div className="cert-doc__footer">
                <div className="cert-doc__footer-left">
                  <span className="material-symbols-outlined">verified_user</span>
                  Academic Integrity Protocol V4.2 — Secure &amp; Immutable
                </div>
                <div className="cert-doc__footer-right">
                  <span>Issued: {reportCard.issueDate || 'N/A'}</span>
                  <span>Validity: Indefinite</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
