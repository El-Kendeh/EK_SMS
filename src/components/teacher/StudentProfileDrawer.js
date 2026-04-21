import { motion } from 'framer-motion';
import './StudentProfileDrawer.css';

export default function StudentProfileDrawer({ student, onClose }) {
  const grade = student.currentGrade;

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
          <h3 className="tch-drawer__title">Student Profile</h3>
          <button className="tch-drawer__close" onClick={onClose}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="tch-drawer__body">
          {/* Avatar + name */}
          <div className="spd-hero">
            <div className="spd-avatar" style={{ background: student.avatarColor }}>
              {student.initials}
            </div>
            <div>
              <h3 className="spd-name">{student.fullName}</h3>
              <p className="spd-num">{student.studentNumber}</p>
              <span className="tch-badge tch-badge--primary">{student.className}</span>
            </div>
          </div>

          {/* Grade card */}
          <div className="spd-grade-card">
            <p className="spd-section-label">Current Grade — {student.subjectName}</p>
            <div className="spd-grade-main">
              <span className="spd-score" style={{ color: grade.score >= 70 ? 'var(--tch-primary)' : grade.score >= 50 ? 'var(--tch-warning)' : 'var(--tch-error)' }}>
                {grade.score !== null ? `${grade.score}%` : 'No grade yet'}
              </span>
              {grade.gradeLetter && (
                <span className="spd-letter">{grade.gradeLetter}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span className={`tch-badge ${
                grade.status === 'locked' ? 'tch-badge--green' :
                grade.status === 'draft'  ? 'tch-badge--amber' : 'tch-badge--grey'
              }`}>{grade.status}</span>
              {grade.hasModificationAttempt && (
                <span className="tch-badge tch-badge--red">
                  <span className="material-symbols-outlined">warning</span>
                  Mod. Attempt
                </span>
              )}
            </div>
            {grade.remarks && (
              <p className="spd-remarks">"{grade.remarks}"</p>
            )}
          </div>

          {/* Student details */}
          <p className="spd-section-label">Details</p>
          <div className="spd-info-list">
            <div className="spd-info-row">
              <span>Student Number</span>
              <strong>{student.studentNumber}</strong>
            </div>
            <div className="spd-info-row">
              <span>Class</span>
              <strong>{student.className}</strong>
            </div>
            <div className="spd-info-row">
              <span>Subject</span>
              <strong>{student.subjectName}</strong>
            </div>
            <div className="spd-info-row">
              <span>Gender</span>
              <strong style={{ textTransform: 'capitalize' }}>{student.gender}</strong>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
