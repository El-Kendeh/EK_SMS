import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import './PeerReviewPanel.css';

export default function PeerReviewPanel({ grade, onClose }) {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!grade) return;
    setLoading(true);
    setError(null);
    studentApi.getPeerReview(grade.id)
      .then(setReview)
      .catch(() => setError('No peer review available for this grade.'))
      .finally(() => setLoading(false));
  }, [grade]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleCopy = () => {
    if (!review) return;
    navigator.clipboard.writeText(review.hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <AnimatePresence>
      {grade && (
        <>
          <motion.div
            className="prp-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="prp-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="prp-header">
              <div className="prp-header__info">
                <h3>Peer Review Audit</h3>
                <p>{grade.subject?.name}</p>
              </div>
              <button className="prp-close" onClick={onClose}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="prp-body">
              {loading && (
                <div className="prp-loading">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 56, borderRadius: 12, background: '#F2F4F6', marginBottom: 12 }} />
                  ))}
                </div>
              )}
              {error && <div className="prp-error">{error}</div>}

              {!loading && review && (
                <>
                  {/* Subject overview */}
                  <div className="prp-subject-card">
                    <div className="prp-subject-card__glow" />
                    <div className="prp-subject-card__content">
                      <div className="prp-subject-card__top">
                        <div>
                          <p className="prp-subject-card__eyebrow">Course Unit</p>
                          <h4 className="prp-subject-card__name">{review.subjectName}</h4>
                        </div>
                        <div className="prp-subject-card__score">{review.score}%</div>
                      </div>
                      <div className="prp-verified-badge">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                        Review Complete &amp; Verified
                      </div>
                    </div>
                  </div>

                  {/* Reviewer */}
                  <div className="prp-section">
                    <p className="prp-section__label">Faculty Audit</p>
                    <div className="prp-reviewer">
                      <div className="prp-reviewer__avatar">
                        <span className="material-symbols-outlined">person</span>
                      </div>
                      <div className="prp-reviewer__info">
                        <p className="prp-reviewer__name">{review.reviewer.name}</p>
                        <p className="prp-reviewer__role">{review.reviewer.role}</p>
                      </div>
                      <span className="material-symbols-outlined prp-reviewer__badge">verified_user</span>
                    </div>
                  </div>

                  {/* Hash */}
                  <div className="prp-hash-card" onClick={handleCopy} title="Click to copy">
                    <div className="prp-hash-card__header">
                      <span className="material-symbols-outlined">fingerprint</span>
                      <span>Security Blockchain ID</span>
                    </div>
                    <code className="prp-hash-card__hash">{review.hash}</code>
                    <div className="prp-hash-card__footer">
                      <span>Audit ID: {review.auditId}</span>
                      <span className="prp-hash-card__status">
                        <span className="prp-hash-card__pulse" />
                        {copied ? 'COPIED!' : 'IMMUTABLE RECORD'}
                      </span>
                    </div>
                  </div>

                  {/* Audit trail */}
                  <div className="prp-section">
                    <p className="prp-section__label">Audit Trail</p>
                    <div className="prp-timeline">
                      {review.auditTrail.map((step, idx) => (
                        <motion.div
                          key={idx}
                          className="prp-step"
                          initial={{ opacity: 0, x: 16 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.07 }}
                        >
                          {idx < review.auditTrail.length - 1 && <div className="prp-step__line" />}
                          <div className={`prp-step__dot ${step.completed ? 'prp-step__dot--done' : ''}`}>
                            {step.completed
                              ? <span className="material-symbols-outlined" style={{ fontVariationSettings: "'wght' 700" }}>{idx === review.auditTrail.length - 1 ? 'done_all' : 'check'}</span>
                              : <div className="prp-step__dot-inner" />
                            }
                          </div>
                          <div className="prp-step__body">
                            <p className={`prp-step__time ${step.completed ? 'prp-step__time--done' : ''}`}>{step.time}</p>
                            <p className="prp-step__title">{step.title}</p>
                            <p className="prp-step__desc">{step.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Download */}
                  <button className="prp-download-btn">
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                    Download Audit Report
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
