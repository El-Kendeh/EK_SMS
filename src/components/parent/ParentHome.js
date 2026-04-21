import { motion } from 'framer-motion';
import { useParentChildren } from '../../hooks/useParentChildren';
import { getChildColors, formatParentRelativeTime } from '../../utils/parentUtils';
import { mockRecentActivity } from '../../mock/parentMockData';
import './ParentHome.css';

const activityColorMap = {
  success:  { bg: 'rgba(16,185,129,0.15)', icon: '#10B981' },
  info:     { bg: 'rgba(59,130,246,0.15)',  icon: '#3B82F6' },
  critical: { bg: 'rgba(239,68,68,0.15)',   icon: '#EF4444' },
};

export default function ParentHome({ navigateTo, parent }) {
  const { children, loading } = useParentChildren();

  const totalAlerts = children.filter((c) => c.hasAlert).length;
  const unreadNotifs = 3;

  if (loading) {
    return (
      <div>
        {[0,1,2].map((i) => (
          <div key={i} className="par-skeleton" style={{ height: 120, marginBottom: 16 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="par-home">
      {/* Identity banner */}
      <motion.div
        className="par-home__banner"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <span style={{ fontSize: 28 }}>👨‍👧‍👦</span>
        <div>
          <p className="par-home__banner-title">
            You are viewing records for {children.length} linked {children.length === 1 ? 'child' : 'children'}.
          </p>
          <p className="par-home__banner-sub">
            You will be notified of any changes to their academic records. All data is synchronized from the school's central registry.
          </p>
        </div>
      </motion.div>

      {/* Bento grid */}
      <div className="par-home__grid">
        {/* Left column: quick stats + activity */}
        <div className="par-home__left">
          {/* Quick stats */}
          <div className="par-card par-card--pad par-home__quick-stats">
            <p className="par-home__section-label">Quick Stats</p>
            <div className="par-home__stats-list">
              <div className="par-home__stat-row">
                <span>Total Children</span>
                <span className="par-home__stat-val --green">{String(children.length).padStart(2, '0')}</span>
              </div>
              <div className="par-home__stat-row">
                <span>Security Alerts</span>
                <span className="par-home__stat-val --blue">{String(totalAlerts).padStart(2, '0')}</span>
              </div>
              <div className="par-home__stat-row">
                <span>Report Cards</span>
                <span className="par-home__stat-val --green">{String(children.length).padStart(2, '0')}</span>
              </div>
              <div className="par-home__stat-row">
                <span>Notifications</span>
                <span className="par-home__notif-badge">{unreadNotifs} NEW</span>
              </div>
            </div>
          </div>

          {/* Recent activity */}
          <div className="par-card par-card--pad par-home__activity">
            <p className="par-home__section-label">Recent Activity</p>
            <div className="par-home__activity-list">
              {mockRecentActivity.map((item, idx) => {
                const c = activityColorMap[item.color] || activityColorMap.info;
                return (
                  <div key={item.id} className="par-home__activity-item">
                    <div className="par-home__activity-line">
                      <div className="par-home__activity-dot" style={{ background: c.icon }}>
                        <span className="material-symbols-outlined"
                          style={{ fontSize: 10, color: 'white', fontVariationSettings: "'FILL' 1" }}>
                          {item.icon}
                        </span>
                      </div>
                    </div>
                    <div className="par-home__activity-body">
                      <p className="par-home__activity-title">{item.title}</p>
                      <p className="par-home__activity-desc">{item.description}</p>
                      <span className="par-home__activity-time">{formatParentRelativeTime(item.time)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right column: child cards */}
        <div className="par-home__right">
          {children.map((child, idx) => {
            const colors = getChildColors(child.colorIndex ?? idx);
            const trendStr = child.trend > 0 ? `↑ ${child.trend}%` : child.trend < 0 ? `↓ ${Math.abs(child.trend)}%` : '→ 0.0%';
            const trendColor = child.trend > 0 ? 'var(--par-primary)' : child.trend < 0 ? 'var(--par-error)' : 'var(--par-text-secondary)';

            return (
              <motion.div
                key={child.id}
                className="par-child-card"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.08 }}
              >
                {/* Card header */}
                <div className="par-child-card__header" style={{ background: colors.bg }}>
                  <div className="par-child-card__header-left">
                    <div className="par-child-card__initials">{child.initials}</div>
                    <div>
                      <h3 className="par-child-card__name">{child.fullName}</h3>
                      <p className="par-child-card__meta">{child.relationship} · {child.classroom}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined par-child-card__lock"
                    style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                </div>

                {/* Alert strip */}
                {child.hasAlert && (
                  <div className="par-alert-strip">
                    <span className="material-symbols-outlined">report</span>
                    <span>⚠ Grade modification attempt detected: {child.alertMessage}</span>
                  </div>
                )}

                {/* Stats row */}
                <div className="par-child-card__stats">
                  <div className="par-child-card__stat">
                    <p className="par-child-card__stat-label">Current Average</p>
                    <div className="par-child-card__stat-val-row">
                      <span className="par-child-card__big-val">{child.currentAverage}%</span>
                      <span className="par-child-card__trend" style={{ color: trendColor }}>{trendStr}</span>
                    </div>
                  </div>
                  <div className="par-child-card__stat">
                    <p className="par-child-card__stat-label">Class Position</p>
                    <p className="par-child-card__mid-val">
                      {child.classPosition}<sup>th</sup>{' '}
                      <span className="par-child-card__of">of {child.totalStudents}</span>
                    </p>
                  </div>
                  <div className="par-child-card__stat">
                    <p className="par-child-card__stat-label">Subjects Passed</p>
                    <p className="par-child-card__mid-val">
                      {child.subjectsPassed}/{child.totalSubjects}{' '}
                      <span className="par-child-card__of">Passed</span>
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="par-child-card__actions">
                  <button
                    className="par-child-card__btn par-child-card__btn--primary"
                    onClick={() => navigateTo('grades')}
                  >
                    <span className="material-symbols-outlined">visibility</span>
                    View Detailed Grades
                  </button>
                  <button
                    className="par-child-card__btn par-child-card__btn--secondary"
                    onClick={() => navigateTo('report-cards')}
                  >
                    <span className="material-symbols-outlined">download</span>
                    Download Report Card
                  </button>
                </div>
              </motion.div>
            );
          })}

          {/* Integrity banner */}
          <div className="par-integrity-banner">
            <h3 className="par-integrity-banner__title">Immutable Integrity</h3>
            <p className="par-integrity-banner__text">
              The Digital Archive ensures your children's records are locked against retrospective tampering.
              Once a grade is verified, any modification requires multi-level authorization.
            </p>
            <div className="par-integrity-banner__chips">
              <div className="par-integrity-banner__chip">
                <span className="material-symbols-outlined">shield</span>
                AES-256 Encrypted
              </div>
              <div className="par-integrity-banner__chip">
                <span className="material-symbols-outlined">history_edu</span>
                Audit Logged
              </div>
              <div className="par-integrity-banner__chip">
                <span className="material-symbols-outlined">verified_user</span>
                Tamper-proof
              </div>
            </div>
            <span className="material-symbols-outlined par-integrity-banner__bg-icon">verified_user</span>
          </div>
        </div>
      </div>
    </div>
  );
}
