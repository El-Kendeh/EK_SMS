import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import './RemedialActionModal.css';

export default function RemedialActionModal({ gradeId, subjectName, onClose }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmed, setConfirmed] = useState({});

  useEffect(() => {
    if (!gradeId) return;
    setLoading(true);
    setError(null);
    studentApi.getRemedialPlan(gradeId)
      .then(setPlan)
      .catch(() => setError('Could not load remedial plan.'))
      .finally(() => setLoading(false));
  }, [gradeId]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleConfirm = (idx) => {
    studentApi.confirmRemedialSession(gradeId, idx).then(() => {
      setConfirmed((prev) => ({ ...prev, [idx]: true }));
    });
  };

  const ICONS = { workbook: 'description', quiz: 'quiz', video: 'video_library' };

  return (
    <AnimatePresence>
      {gradeId && (
        <motion.div
          className="ram-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="ram-panel"
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          >
            {/* Header */}
            <div className="ram-header">
              <div className="ram-header__left">
                <p className="ram-header__eyebrow">Support Plan</p>
                <h2 className="ram-header__title">{subjectName || 'Action Plan'}</h2>
              </div>
              <button className="ram-close" onClick={onClose}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="ram-body">
              {loading && (
                <div className="ram-loading">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12, background: '#F2F4F6', marginBottom: 12 }} />
                  ))}
                </div>
              )}
              {error && <div className="ram-error">{error}</div>}

              {!loading && plan && (
                <>
                  {/* Status + Teacher Note */}
                  <div className="ram-hero">
                    <div className="ram-status-card">
                      <span className="ram-status-card__eyebrow">Current Status</span>
                      <div className="ram-status-card__score">
                        <span className="ram-status-card__pct">{plan.score}%</span>
                        <span className="ram-status-card__letter">{plan.gradeLetter}</span>
                      </div>
                      <p className="ram-status-card__subject">{plan.subjectName}</p>
                      <span className="material-symbols-outlined ram-status-card__bg-icon">trending_down</span>
                    </div>

                    <div className="ram-note-card">
                      <span className="material-symbols-outlined ram-note-card__quote">format_quote</span>
                      <h3 className="ram-note-card__teacher">Note from {plan.teacherName}</h3>
                      <p className="ram-note-card__text">"{plan.teacherNote}"</p>
                    </div>
                  </div>

                  {/* Support Sessions */}
                  <div className="ram-section">
                    <div className="ram-section__header">
                      <h3 className="ram-section__title">Upcoming Support Sessions</h3>
                    </div>
                    <div className="ram-sessions">
                      {plan.sessions.map((s, idx) => (
                        <div key={idx} className="ram-session">
                          <div className="ram-session__date">
                            <span className="ram-session__month">{s.month}</span>
                            <span className="ram-session__day">{s.day}</span>
                          </div>
                          <div className="ram-session__info">
                            <p className="ram-session__name">{s.title}</p>
                            <div className="ram-session__meta">
                              <span><span className="material-symbols-outlined">schedule</span>{s.time}</span>
                              <span><span className="material-symbols-outlined">location_on</span>{s.location}</span>
                            </div>
                          </div>
                          <button
                            className={`ram-session__btn ${confirmed[idx] ? 'ram-session__btn--confirmed' : ''}`}
                            onClick={() => handleConfirm(idx)}
                            disabled={confirmed[idx]}
                          >
                            {confirmed[idx] ? (
                              <><span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Confirmed</>
                            ) : 'Confirm'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resource Library */}
                  <div className="ram-section">
                    <h3 className="ram-section__title">Resource Library</h3>
                    <div className="ram-resources">
                      {plan.resources.map((r, i) => (
                        <div key={i} className={`ram-resource ${r.locked ? 'ram-resource--locked' : ''}`}>
                          <span className="material-symbols-outlined ram-resource__icon">{ICONS[r.type] || 'description'}</span>
                          <span className="ram-resource__label">{r.title}</span>
                          {r.locked
                            ? <span className="material-symbols-outlined ram-resource__lock" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                            : <span className="material-symbols-outlined ram-resource__action">{r.type === 'quiz' ? 'open_in_new' : 'download'}</span>
                          }
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Path to Proficiency */}
                  <div className="ram-progress-banner">
                    <div className="ram-progress-banner__text">
                      <h3>Path to Proficiency</h3>
                      <p>Complete these key areas to unlock the supplementary exam window.</p>
                    </div>
                    <div className="ram-progress-rings">
                      {plan.proficiencyModules.map((m) => (
                        <div key={m.label} className="ram-ring">
                          <div
                            className="ram-ring__circle"
                            style={{
                              borderColor: m.progress === 100
                                ? 'var(--student-primary)'
                                : m.progress > 0
                                ? 'rgba(16,185,129,0.35)'
                                : 'rgba(255,255,255,0.1)',
                            }}
                          >
                            {m.progress}%
                          </div>
                          <span className="ram-ring__label">{m.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA */}
                  <button className="ram-cta" onClick={onClose}>
                    <span className="material-symbols-outlined">event_available</span>
                    Book a Tutoring Session
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
