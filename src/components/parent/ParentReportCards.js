import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParentChildren } from '../../hooks/useParentChildren';
import { useChildReportCards } from '../../hooks/useChildReportCards';
import { getChildColors, getGradeLetterColor, formatDate } from '../../utils/parentUtils';
import './ParentReportCards.css';

function DownloadModal({ reportCard, studentName, onClose }) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(intervalRef.current);
          setTimeout(() => setDone(true), 200);
          return 100;
        }
        return p + 4;
      });
    }, 80);
    return () => clearInterval(intervalRef.current);
  }, []);

  const radius = 44;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (progress / 100) * circ;
  const fileName = `Report_Card_${reportCard.term.replace(/\s/g,'_')}_${reportCard.academicYear}.pdf`;

  return (
    <div className="par-dl-overlay" onClick={!done ? undefined : onClose}>
      <motion.div
        className="par-dl-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.88, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {!done ? (
          <>
            <div className="par-dl-modal__circle-wrap">
              <svg width="120" height="120" className="par-dl-modal__svg">
                <circle cx="60" cy="60" r={radius} className="par-dl-modal__track" />
                <circle
                  cx="60" cy="60" r={radius}
                  className="par-dl-modal__progress"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="par-dl-modal__pct">{progress}%</div>
              <div className="par-dl-modal__shield">
                <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              </div>
            </div>
            <h3 className="par-dl-modal__title">Preparing Secure Document</h3>
            <p className="par-dl-modal__sub">
              Encrypting and verifying academic record for <strong>{studentName}</strong>...
            </p>
            <div className="par-dl-modal__note">
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--par-info)', fontVariationSettings: "'FILL' 1" }}>info</span>
              THIS DOCUMENT IS CRYPTOGRAPHICALLY SIGNED FOR AUTHENTICITY.
            </div>
            <button className="par-dl-modal__cancel" onClick={onClose}>Cancel</button>
          </>
        ) : (
          <>
            <div className="par-dl-modal__success-icon">
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'white', fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
            <h3 className="par-dl-modal__title">Secure Document Ready</h3>
            <p className="par-dl-modal__sub">
              The academic record for <strong>{studentName}</strong> has been cryptographically verified and is now available.
            </p>
            <div className="par-dl-modal__file-card">
              <div className="par-dl-modal__file-icon">
                <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--par-primary)' }}>description</span>
              </div>
              <div className="par-dl-modal__file-info">
                <span className="par-dl-modal__file-label">OFFICIAL RECORD</span>
                <span className="par-dl-modal__file-name">{fileName}</span>
                <div className="par-dl-modal__file-meta">
                  <span>FILE SIZE <strong>1.2 MB</strong></span>
                  <span>STATUS <strong style={{ color: 'var(--par-primary)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 12, verticalAlign: 'middle', fontVariationSettings: "'FILL' 1" }}>lock</span>
                    {' '}Verified
                  </strong></span>
                </div>
              </div>
            </div>
            <button className="par-dl-modal__open-btn">
              <span className="material-symbols-outlined">open_in_new</span>
              Open Document
            </button>
            <button className="par-dl-modal__back-btn" onClick={onClose}>Back to Reports</button>
            <div className="par-dl-modal__footer-note">
              <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--par-primary)', fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <div>
                <p className="par-dl-modal__footer-title">IMMUTABLE ARCHIVE SYSTEM</p>
                <p className="par-dl-modal__footer-sub">This document is an immutable record from the EI-Kendeh Smart School Ledger.</p>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

function QRModal({ reportCard, onClose }) {
  return (
    <div className="par-qr-overlay" onClick={onClose}>
      <motion.div
        className="par-qr-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="par-qr-modal__header">
          <h3>Verification QR Code</h3>
          <button onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="par-qr-modal__body">
          {/* Simulated QR pattern */}
          <div className="par-qr-modal__qr-box">
            <div className="par-qr-mock">
              <div className="par-qr-mock__corner par-qr-mock__corner--tl" />
              <div className="par-qr-mock__corner par-qr-mock__corner--tr" />
              <div className="par-qr-mock__corner par-qr-mock__corner--bl" />
              <div className="par-qr-mock__dots" />
            </div>
          </div>
          <div className="par-qr-modal__code">{reportCard.qrCode}</div>
          <p className="par-qr-modal__desc">
            Scan this code to verify the authenticity of this report card on the EK-SMS public verification portal.
          </p>
          <div className="par-qr-modal__meta">
            <div className="par-qr-modal__meta-row">
              <span className="material-symbols-outlined" style={{ color: 'var(--par-primary)', fontVariationSettings: "'FILL' 1" }}>verified</span>
              <span>Verified on {formatDate(reportCard.verifiedAt)}</span>
            </div>
            <div className="par-qr-modal__meta-row">
              <span className="material-symbols-outlined" style={{ color: 'var(--par-primary)', fontVariationSettings: "'FILL' 1" }}>lock</span>
              <span>Cryptographically signed — tamper-evident</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ParentReportCards({ children }) {
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [qrCard, setQrCard] = useState(null);
  const [downloadCard, setDownloadCard] = useState(null);

  const { children: loadedChildren } = useParentChildren();
  const resolvedChildren = children?.length ? children : loadedChildren;
  const activeChild = resolvedChildren.find((c) => c.id === selectedChildId) || resolvedChildren[0];

  const { reportCards, loading } = useChildReportCards(activeChild?.id || null);


  return (
    <div className="par-reports">
      <div className="par-reports__top">
        <div>
          <h1 className="par-page-header__title">Report Cards</h1>
          <p className="par-page-header__sub">The Digital Archive · Official academic transcripts.</p>
        </div>

        {resolvedChildren.length > 1 && (
          <div className="par-child-tabs">
            {resolvedChildren.map((child, idx) => {
              const colors = getChildColors(child.colorIndex ?? idx);
              const isActive = (selectedChildId || resolvedChildren[0]?.id) === child.id;
              return (
                <button
                  key={child.id}
                  className={`par-child-tab ${isActive ? 'par-child-tab--active' : ''}`}
                  onClick={() => setSelectedChildId(child.id)}
                >
                  <span className="par-child-tab__dot" style={{ background: colors.bg }} />
                  {child.fullName.split(' ')[0]}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {loading ? (
        <div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="par-skeleton" style={{ height: 140, marginBottom: 16, borderRadius: 16 }} />
          ))}
        </div>
      ) : reportCards.length === 0 ? (
        <div className="par-empty">
          <span className="material-symbols-outlined">description</span>
          <p>No report cards available yet.</p>
        </div>
      ) : (
        <div className="par-reports__list">
          {reportCards.map((card, idx) => {
            const letterColor = getGradeLetterColor(card.grade);
            return (
              <motion.div
                key={card.id}
                className="par-report-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, delay: idx * 0.06 }}
              >
                <div className="par-report-card__left">
                  <div className="par-report-card__icon">
                    <span className="material-symbols-outlined"
                      style={{ fontVariationSettings: "'FILL' 1", fontSize: 28, color: 'var(--par-primary)' }}>
                      description
                    </span>
                  </div>
                  <div className="par-report-card__info">
                    <h3 className="par-report-card__term">{card.term} · {card.academicYear}</h3>
                    <div className="par-report-card__meta-row">
                      <span>{activeChild?.classroom || 'Grade'}</span>
                      <span className="par-report-card__sep">·</span>
                      <span>Position {card.position} of {card.totalStudents}</span>
                      <span className="par-report-card__sep">·</span>
                      <span>Average: {card.average}%</span>
                    </div>
                    <div className="par-report-card__badges">
                      {card.isVerified && (
                        <span className="par-report-card__verified-badge">
                          <span className="material-symbols-outlined"
                            style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>verified</span>
                          Verified
                        </span>
                      )}
                      <span className="par-report-card__grade-badge" style={{ color: letterColor }}>
                        Grade {card.grade}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="par-report-card__actions">
                  <button
                    className="par-report-card__btn par-report-card__btn--qr"
                    onClick={() => setQrCard(card)}
                  >
                    <span className="material-symbols-outlined">qr_code_2</span>
                    Verify
                  </button>
                  <button
                    className="par-report-card__btn par-report-card__btn--download"
                    onClick={() => setDownloadCard(card)}
                  >
                    <span className="material-symbols-outlined">download</span>
                    Download PDF
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {qrCard && <QRModal reportCard={qrCard} onClose={() => setQrCard(null)} />}
        {downloadCard && (
          <DownloadModal
            reportCard={downloadCard}
            studentName={activeChild?.fullName || 'Student'}
            onClose={() => setDownloadCard(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
