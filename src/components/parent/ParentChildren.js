import { motion } from 'framer-motion';
import { useParentChildren } from '../../hooks/useParentChildren';
import { getChildColors, formatDate } from '../../utils/parentUtils';
import './ParentChildren.css';

export default function ParentChildren({ navigateTo }) {
  const { children, loading } = useParentChildren();

  if (loading) {
    return (
      <div>
        {[0, 1].map((i) => (
          <div key={i} className="par-skeleton" style={{ height: 200, marginBottom: 20, borderRadius: 16 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="par-children">
      <div className="par-page-header">
        <h1 className="par-page-header__title">My Children</h1>
        <p className="par-page-header__sub">Linked academic profiles for your registered children.</p>
      </div>

      <div className="par-children__list">
        {children.map((child, idx) => {
          const colors = getChildColors(child.colorIndex ?? idx);

          return (
            <motion.div
              key={child.id}
              className="par-children__card"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, delay: idx * 0.07 }}
            >
              {/* Card header strip */}
              <div className="par-children__card-header" style={{ background: colors.bg }}>
                <div className="par-children__card-initials">{child.initials}</div>
                <div className="par-children__card-identity">
                  <h2 className="par-children__card-name">{child.fullName}</h2>
                  <p className="par-children__card-class">{child.relationship} · {child.classroom} · {child.program}</p>
                </div>
                <div className="par-children__card-status">
                  <span className="par-children__status-badge">Active</span>
                </div>
              </div>

              {/* Alert if any */}
              {child.hasAlert && (
                <div className="par-alert-strip">
                  <span className="material-symbols-outlined">warning</span>
                  <span>{child.alertMessage}</span>
                </div>
              )}

              {/* Details grid */}
              <div className="par-children__details">
                <div className="par-children__detail">
                  <span className="par-children__detail-label">Admission No.</span>
                  <span className="par-children__detail-val">{child.admissionNumber}</span>
                </div>
                <div className="par-children__detail">
                  <span className="par-children__detail-label">Date of Birth</span>
                  <span className="par-children__detail-val">{formatDate(child.dateOfBirth)}</span>
                </div>
                <div className="par-children__detail">
                  <span className="par-children__detail-label">Class</span>
                  <span className="par-children__detail-val">{child.classroom}</span>
                </div>
                <div className="par-children__detail">
                  <span className="par-children__detail-label">Programme</span>
                  <span className="par-children__detail-val">{child.program}</span>
                </div>
                <div className="par-children__detail">
                  <span className="par-children__detail-label">Attendance</span>
                  <span className="par-children__detail-val">{child.attendance}%</span>
                </div>
                <div className="par-children__detail">
                  <span className="par-children__detail-label">Current Average</span>
                  <span className="par-children__detail-val" style={{ color: 'var(--par-primary)', fontWeight: 800 }}>
                    {child.currentAverage}%
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="par-children__actions">
                <button className="par-child-card__btn par-child-card__btn--primary"
                  onClick={() => navigateTo('grades')}>
                  <span className="material-symbols-outlined">grade</span>
                  View Grades
                </button>
                <button className="par-child-card__btn par-child-card__btn--secondary"
                  onClick={() => navigateTo('report-cards')}>
                  <span className="material-symbols-outlined">description</span>
                  Report Cards
                </button>
                <button className="par-child-card__btn par-child-card__btn--secondary"
                  onClick={() => navigateTo('notifications')}>
                  <span className="material-symbols-outlined">notifications</span>
                  Notifications
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
