import { motion } from 'framer-motion';
import { useGradeHistory } from '../../hooks/useGradeHistory';
import './GradeAuditPanel.css';

const EVENT_LABELS = {
  DRAFT:                 { label: 'Draft Saved',          icon: 'edit',    cls: '' },
  SUBMIT:                { label: 'Submitted for Locking', icon: 'send',    cls: '' },
  LOCK:                  { label: 'Grade Locked',          icon: 'lock',    cls: '' },
  MODIFICATION_ATTEMPT:  { label: 'Modification Attempt — BLOCKED', icon: 'warning', cls: '--security' },
  MODIFICATION_APPROVED: { label: 'Modification Approved', icon: 'check_circle', cls: '' },
};

export default function GradeAuditPanel({ grade, onClose }) {
  const { history, loading } = useGradeHistory(grade?.id);

  return (
    <>
      <motion.div
        className="tch-drawer-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="tch-drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 350, damping: 35 }}
      >
        <div className="tch-drawer__header">
          <div>
            <h3 className="tch-drawer__title">Grade Audit Trail</h3>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--tch-text-secondary)' }}>
              Full history for grade #{grade?.id}
            </p>
          </div>
          <button className="tch-drawer__close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="tch-drawer__body">
          {/* Grade summary */}
          {grade && (
            <div className="gap-grade-summary">
              <div className="gap-grade-summary__row">
                <span>Score</span>
                <strong style={{ color: 'var(--tch-primary)' }}>
                  {grade.score !== null ? `${grade.score}%` : '—'}
                </strong>
              </div>
              <div className="gap-grade-summary__row">
                <span>Grade</span>
                <strong>{grade.gradeLetter || '—'}</strong>
              </div>
              <div className="gap-grade-summary__row">
                <span>Status</span>
                <span className={`tch-badge ${
                  grade.status === 'locked' ? 'tch-badge--green' :
                  grade.status === 'draft'  ? 'tch-badge--amber' : 'tch-badge--grey'
                }`}>{grade.status}</span>
              </div>
            </div>
          )}

          <p className="gap-section-label">Event Timeline</p>

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0,1,2].map(i => <div key={i} className="tch-skeleton" style={{ height: 60 }} />)}
            </div>
          ) : history.length === 0 ? (
            <div className="tch-empty" style={{ padding: '40px 0' }}>
              <span className="material-symbols-outlined">history</span>
              <p>No history available</p>
            </div>
          ) : (
            <div className="tch-timeline">
              {history.map(event => {
                const cfg = EVENT_LABELS[event.eventType] || { label: event.eventType, icon: 'info', cls: '' };
                return (
                  <div
                    key={event.id}
                    className={`tch-timeline-event ${event.isSecurityEvent ? 'tch-timeline-event--security' : ''}`}
                  >
                    <p className="tch-timeline-event__type">
                      <span className="material-symbols-outlined" style={{ fontSize: 13, verticalAlign: 'middle', marginRight: 4 }}>
                        {cfg.icon}
                      </span>
                      {cfg.label}
                    </p>
                    {(event.score !== undefined && event.score !== null) && (
                      <p className="tch-timeline-event__detail">
                        Score: <strong>{event.score}%</strong>
                        {event.gradeLetter && <span> · {event.gradeLetter}</span>}
                      </p>
                    )}
                    {event.reason && (
                      <p className="tch-timeline-event__detail" style={{ color: 'var(--tch-error)' }}>
                        {event.reason}
                      </p>
                    )}
                    <p className="tch-timeline-event__meta">
                      {event.recordedBy} · {event.recordedByRole} ·{' '}
                      {new Date(event.recordedAt).toLocaleString('en-GB')}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
