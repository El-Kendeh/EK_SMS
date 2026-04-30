import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import { formatRelativeTime, getGradeColor } from '../../utils/studentUtils';
import './GradeHistoryPanel.css';

const EVENT_CONFIG = {
  DRAFT:                { icon: 'edit_note',  color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  SUBMIT:               { icon: 'send',       color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
  LOCK:                 { icon: 'lock',       color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  MODIFICATION_ATTEMPT: { icon: 'warning',    color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  UPDATE:               { icon: 'update',     color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)' },
  default:              { icon: 'history',    color: '#94A3B8', bg: 'rgba(148,163,184,0.12)' },
};

function getEventConfig(type) {
  return EVENT_CONFIG[type] || EVENT_CONFIG.default;
}

export default function GradeHistoryPanel({ grade, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('history');

  useEffect(() => {
    setActiveTab('history');
  }, [grade]);

  useEffect(() => {
    if (!grade) return;
    setLoading(true);
    studentApi.getGradeHistory(grade.id)
      .then((data) => setHistory(data))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [grade]);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const gradeColor = grade ? getGradeColor(grade.score) : '#10B981';
  const hasSecurityEvent = history.some((e) => e.isSecurityEvent);

  return (
    <AnimatePresence>
      {grade && (
        <>
          {/* Overlay */}
          <motion.div
            className="ghp-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="ghp-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            role="dialog"
            aria-modal="true"
            aria-label={`Grade history for ${grade.subject?.name}`}
          >
            {/* Header */}
            <div className="ghp-header">
              <div className="ghp-header__info">
                <h3>{grade.subject?.name}</h3>
                <p>{grade.teacher?.fullName}</p>
              </div>
              <button className="ghp-close" onClick={onClose} aria-label="Close panel">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Grade badge */}
            <div
              className="ghp-grade-badge"
              style={{ background: `${gradeColor}12`, border: `1px solid ${gradeColor}30` }}
            >
              <div className="ghp-grade-badge__left">
                <h4>Current Grade</h4>
                <div className="ghp-grade-badge__score" style={{ color: gradeColor }}>
                  {grade.score}%
                </div>
              </div>
              <div className="ghp-grade-badge__letter" style={{ color: gradeColor }}>
                {grade.gradeLetter}
              </div>
            </div>

            {/* Security alert banner */}
            {hasSecurityEvent && (
              <div className="ghp-security-alert">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                <p>
                  A grade modification attempt was detected and <strong style={{ color: '#FCA5A5' }}>blocked</strong>.
                  Your original grade has been preserved.
                </p>
              </div>
            )}

            {/* Tabs */}
            <div className="ghp-tabs">
              <button
                className={`ghp-tab${activeTab === 'history' ? ' ghp-tab--active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                <span className="material-symbols-outlined">history</span>
                History
              </button>
              {grade.weightBreakdown && (
                <button
                  className={`ghp-tab${activeTab === 'breakdown' ? ' ghp-tab--active' : ''}`}
                  onClick={() => setActiveTab('breakdown')}
                >
                  <span className="material-symbols-outlined">calculate</span>
                  Breakdown
                </button>
              )}
            </div>

            {/* Weight Breakdown */}
            {activeTab === 'breakdown' && grade.weightBreakdown && (
              <div className="ghp-breakdown">
                <div className="ghp-breakdown__title">
                  <span className="material-symbols-outlined">calculate</span>
                  Weighting Breakdown
                </div>

                {/* Final Exam — full width */}
                <div className="ghp-breakdown__item ghp-breakdown__item--primary">
                  <div className="ghp-breakdown__row">
                    <span className="ghp-breakdown__label">Final Exam</span>
                    <span className="ghp-breakdown__weight">(60% weight)</span>
                    <span className="ghp-breakdown__score">{grade.weightBreakdown.finalExam.score}%</span>
                  </div>
                  <div className="ghp-breakdown__track">
                    <div
                      className="ghp-breakdown__fill ghp-breakdown__fill--primary"
                      style={{ width: `${grade.weightBreakdown.finalExam.score}%` }}
                    />
                  </div>
                </div>

                {/* Mid-term + CA — 2 column */}
                <div className="ghp-breakdown__grid">
                  <div className="ghp-breakdown__item">
                    <div className="ghp-breakdown__row">
                      <span className="ghp-breakdown__label">Mid-term</span>
                      <span className="ghp-breakdown__weight">(20%)</span>
                      <span className="ghp-breakdown__score">{grade.weightBreakdown.midterm.score}%</span>
                    </div>
                    <div className="ghp-breakdown__track ghp-breakdown__track--thin">
                      <div
                        className="ghp-breakdown__fill ghp-breakdown__fill--secondary"
                        style={{ width: `${grade.weightBreakdown.midterm.score}%` }}
                      />
                    </div>
                  </div>
                  <div className="ghp-breakdown__item">
                    <div className="ghp-breakdown__row">
                      <span className="ghp-breakdown__label">C.A.</span>
                      <span className="ghp-breakdown__weight">(20%)</span>
                      <span className="ghp-breakdown__score">{grade.weightBreakdown.ca.score}%</span>
                    </div>
                    <div className="ghp-breakdown__track ghp-breakdown__track--thin">
                      <div
                        className="ghp-breakdown__fill ghp-breakdown__fill--secondary"
                        style={{ width: `${grade.weightBreakdown.ca.score}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Composite score */}
                <div className="ghp-breakdown__composite">
                  <span className="ghp-breakdown__composite-label">Composite Score</span>
                  <span className="ghp-breakdown__composite-value" style={{ color: gradeColor }}>
                    {grade.score}% · {grade.gradeLetter}
                  </span>
                </div>
              </div>
            )}

            {/* Timeline */}
            {activeTab === 'history' && (
            <div className="ghp-timeline">
              <div className="ghp-timeline__title">Audit Timeline</div>

              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                    <div className="skeleton" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: 11, width: '40%', marginBottom: 6 }} />
                      <div className="skeleton" style={{ height: 10, width: '70%' }} />
                    </div>
                  </div>
                ))
              ) : history.length === 0 ? (
                <div className="ghp-empty">No history available for this grade.</div>
              ) : (
                history.map((event, idx) => {
                  const cfg = getEventConfig(event.eventType);
                  const isSecurity = event.isSecurityEvent;

                  // Find previous score-bearing event for delta diff
                  let prevWithScore = null;
                  for (let j = idx - 1; j >= 0; j--) {
                    if (history[j]?.score != null) { prevWithScore = history[j]; break; }
                  }
                  const showDelta =
                    (event.eventType === 'UPDATE' || event.eventType === 'MODIFY_APPROVED') &&
                    event.score != null && prevWithScore && prevWithScore.score !== event.score;

                  return (
                    <motion.div
                      key={event.id}
                      className={`ghp-event ${isSecurity ? 'ghp-event--security' : ''}`}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                    >
                      {idx < history.length - 1 && <div className="ghp-event__line" />}

                      <div className="ghp-event__dot-wrap">
                        <div
                          className="ghp-event__dot"
                          style={{ background: isSecurity ? 'rgba(239,68,68,0.15)' : cfg.bg }}
                        >
                          <span
                            className="material-symbols-outlined"
                            style={{ color: isSecurity ? '#EF4444' : cfg.color, fontVariationSettings: isSecurity ? "'FILL' 1" : "'FILL' 0" }}
                          >
                            {cfg.icon}
                          </span>
                        </div>
                      </div>

                      <div className="ghp-event__body">
                        <div
                          className="ghp-event__type"
                          style={{ color: isSecurity ? '#F87171' : cfg.color }}
                        >
                          {event.eventType.replace(/_/g, ' ')}
                        </div>
                        <div className="ghp-event__by">{event.recordedBy}</div>
                        <div className="ghp-event__time">{formatRelativeTime(event.recordedAt)}</div>

                        {event.score !== undefined && !isSecurity && !showDelta && (
                          <div
                            className="ghp-event__score"
                            style={{ background: cfg.bg, color: cfg.color }}
                          >
                            {event.score}% · {event.gradeLetter}
                          </div>
                        )}

                        {showDelta && (
                          <div className="ghp-event__delta">
                            <div className="ghp-event__delta-row">
                              <div className="ghp-event__delta-cell ghp-event__delta-cell--before">
                                <span>Before</span>
                                <strong>{prevWithScore.score}% · {prevWithScore.gradeLetter}</strong>
                              </div>
                              <span className="material-symbols-outlined ghp-event__delta-arrow">arrow_forward</span>
                              <div className="ghp-event__delta-cell ghp-event__delta-cell--after">
                                <span>After</span>
                                <strong>{event.score}% · {event.gradeLetter}</strong>
                              </div>
                            </div>
                            {event.reason && (
                              <p className="ghp-event__delta-reason">
                                <span className="material-symbols-outlined">notes</span>
                                {event.reason}
                              </p>
                            )}
                            {event.approvedBy && (
                              <p className="ghp-event__delta-approver">
                                <span className="material-symbols-outlined">how_to_reg</span>
                                Approved by <strong>{event.approvedBy}</strong>
                              </p>
                            )}
                          </div>
                        )}

                        {isSecurity && event.reason && (
                          <div className="ghp-event__reason">{event.reason}</div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
