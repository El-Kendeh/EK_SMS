import { motion } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { useTeacherProfile } from '../../hooks/useTeacherProfile';
import { useTeacherNotifications } from '../../hooks/useTeacherNotifications';
import { useTeacherTimetable } from '../../hooks/useTeacherTimetable';
import { getGreeting, getPeriodClass, getPeriodsForDay, getCurrentDay, isPeriodNow, formatRelativeTime } from '../../utils/teacherUtils';
import { getDeadlineWarning } from '../../utils/gradeUtils';
import './TeacherHome.css';

export default function TeacherHome({ navigateTo }) {
  const { assignedClasses, pendingCounts, currentTerm } = useTeacher();
  const { profile } = useTeacherProfile();
  const { notifications } = useTeacherNotifications();
  const { timetable } = useTeacherTimetable();

  const greeting = getGreeting(profile?.firstName || 'Teacher');
  const today = getCurrentDay();
  const todayPeriods = timetable ? getPeriodsForDay(timetable.periods, today) : [];

  const totalLocked = assignedClasses.reduce((a, c) => a + (c.gradeStats?.locked || 0), 0);
  const totalDraft   = assignedClasses.reduce((a, c) => a + (c.gradeStats?.draft || 0), 0);
  const totalPending = assignedClasses.reduce((a, c) => a + (c.gradeStats?.pending || 0), 0);

  const deadline = currentTerm?.gradeEntryDeadline;
  const deadlineWarning = getDeadlineWarning(deadline);

  const recentNotifs = notifications.slice(0, 3);

  const statCards = [
    { label: 'Classes Assigned', value: assignedClasses.length, icon: 'school', sub: 'This term', subClass: '' },
    { label: 'Pending Grades',   value: totalPending, icon: 'pending_actions', sub: 'Not yet entered', subClass: totalPending > 0 ? '--amber' : '' },
    { label: 'Draft Grades',     value: totalDraft,   icon: 'edit_note', sub: 'Saved, not locked', subClass: totalDraft > 0 ? '--amber' : '' },
    { label: 'Locked Grades',    value: totalLocked,  icon: 'lock', sub: 'Permanently recorded', subClass: '--primary' },
  ];

  return (
    <div className="tch-home">
      {/* Greeting banner */}
      <motion.div
        className="tch-home__banner"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="tch-home__banner-left">
          <h1 className="tch-home__greeting">{greeting}</h1>
          <p className="tch-home__date">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            {currentTerm && ` · ${currentTerm.name} ${currentTerm.academicYear}`}
          </p>
        </div>
        {currentTerm && (
          <div className="tch-home__term-badge">
            <span className="material-symbols-outlined">calendar_today</span>
            Week {currentTerm.weekNumber} of {currentTerm.totalWeeks}
          </div>
        )}
      </motion.div>

      {/* 2FA recommendation */}
      {profile && profile.has_2fa === false && (
        <motion.div
          className="tch-home__deadline tch-home__deadline--amber"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <span className="material-symbols-outlined">shield</span>
          <div className="tch-home__deadline-text">
            <strong>Secure your account:</strong> Two-factor authentication is not enabled.
            Enable 2FA to protect your grade records from unauthorised access.
          </div>
          <button className="tch-btn tch-btn--sm tch-btn--primary" onClick={() => navigateTo('settings')}>
            Enable 2FA
          </button>
        </motion.div>
      )}

      {/* Deadline warning */}
      {deadlineWarning && (pendingCounts.totalPending > 0 || pendingCounts.totalDraft > 0) && (
        <motion.div
          className={`tch-home__deadline tch-home__deadline--${deadlineWarning.level}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <span className="material-symbols-outlined">schedule</span>
          <div className="tch-home__deadline-text">
            <strong>Grade Entry Deadline:</strong> {deadlineWarning.text} —{' '}
            {pendingCounts.totalPending + pendingCounts.totalDraft} grades still need your attention.
          </div>
          <button className="tch-btn tch-btn--sm tch-btn--primary" onClick={() => navigateTo('grade-entry')}>
            Enter Grades
          </button>
        </motion.div>
      )}

      {/* Stat cards */}
      <div className="tch-stats-grid">
        {statCards.map((s, i) => (
          <motion.div
            key={s.label}
            className="tch-stat-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.06 }}
          >
            <p className="tch-stat-card__label">{s.label}</p>
            <p className="tch-stat-card__value">{String(s.value).padStart(2, '0')}</p>
            <p className={`tch-stat-card__sub tch-stat-card__sub${s.subClass}`}>
              <span className="material-symbols-outlined">{s.icon}</span>
              {s.sub}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="tch-home__grid">
        {/* Left: My Classes + Today's schedule */}
        <div className="tch-home__left">
          {/* My Classes */}
          <div className="tch-card tch-card--pad tch-home__section">
            <div className="tch-home__section-header">
              <p className="tch-home__section-label">My Classes</p>
              <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => navigateTo('classes')}>
                View All
              </button>
            </div>
            <div className="tch-home__class-list">
              {assignedClasses.map((cls, i) => {
                const stats = cls.gradeStats || {};
                const lockedPct = stats.total ? (stats.locked / stats.total) * 100 : 0;
                const draftPct  = stats.total ? (stats.draft  / stats.total) * 100 : 0;
                return (
                  <motion.div
                    key={cls.id}
                    className="tch-home__class-row"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.07 }}
                    onClick={() => navigateTo('grade-entry')}
                  >
                    <div className="tch-home__class-row-left">
                      <div className="tch-home__class-row-name">{cls.name}</div>
                      <div className="tch-home__class-row-meta">
                        <span className="tch-chip">
                          <span className="material-symbols-outlined">subject</span>
                          {cls.subject.name}
                        </span>
                        <span className="tch-chip">
                          <span className="material-symbols-outlined">meeting_room</span>
                          {cls.room}
                        </span>
                      </div>
                      <div className="tch-completion-bar" style={{ marginTop: 8 }}>
                        <div className="tch-completion-bar__locked" style={{ width: `${lockedPct}%` }} />
                        <div className="tch-completion-bar__draft"  style={{ width: `${draftPct}%` }} />
                      </div>
                      <p className="tch-home__class-row-stats">
                        <span style={{ color: 'var(--tch-primary)' }}>{stats.locked} locked</span>
                        {stats.draft > 0 && <span style={{ color: 'var(--tch-warning)' }}> · {stats.draft} draft</span>}
                        {stats.pending > 0 && <span style={{ color: 'var(--tch-text-secondary)' }}> · {stats.pending} pending</span>}
                      </p>
                    </div>
                    <span className="material-symbols-outlined tch-home__class-row-arrow">chevron_right</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Today's schedule */}
          {todayPeriods.length > 0 && (
            <div className="tch-card tch-card--pad tch-home__section">
              <p className="tch-home__section-label">Today's Schedule</p>
              <div style={{ marginTop: 12 }}>
                {todayPeriods.map(period => {
                  const isNow = isPeriodNow(period);
                  const cls = getPeriodClass(period);
                  return (
                    <div key={period.id} className={`tch-period-block ${cls}`}>
                      {isNow && <span className="tch-period-block__now-badge">Now</span>}
                      <p className="tch-period-block__subject">{period.subject}</p>
                      <div className="tch-period-block__meta">
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>schedule</span>
                        {period.startTime} – {period.endTime}
                        <span>·</span>
                        <span>{period.class}</span>
                        <span>·</span>
                        <span>{period.room}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {todayPeriods.length === 0 && (
            <div className="tch-card tch-card--pad" style={{ textAlign: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--tch-text-secondary)', opacity: 0.4 }}>free_cancellation</span>
              <p style={{ color: 'var(--tch-text-secondary)', fontSize: 13, margin: '8px 0 0' }}>No classes scheduled today</p>
            </div>
          )}
        </div>

        {/* Right: Recent notifications */}
        <div className="tch-home__right">
          <div className="tch-card tch-card--pad tch-home__section">
            <div className="tch-home__section-header">
              <p className="tch-home__section-label">Recent Notifications</p>
              <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => navigateTo('notifications')}>
                View All
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              {recentNotifs.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--tch-text-secondary)', textAlign: 'center', padding: '20px 0' }}>
                  No notifications
                </p>
              ) : recentNotifs.map(n => (
                <div
                  key={n.id}
                  className={`tch-notif-item ${!n.isRead ? 'tch-notif-item--unread' : ''} ${n.isSecurityAlert ? 'tch-notif-item--security' : ''}`}
                  onClick={() => navigateTo('notifications')}
                >
                  <div className={`tch-notif-item__icon ${n.isSecurityAlert ? 'tch-notif-item__icon--security' : 'tch-notif-item__icon--default'}`}>
                    <span className="material-symbols-outlined">
                      {n.isSecurityAlert ? 'warning' : n.type === 'GRADE_LOCKED' ? 'lock' : 'notifications'}
                    </span>
                  </div>
                  <div>
                    <p className="tch-notif-item__title">{n.title}</p>
                    <p className="tch-notif-item__time">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Integrity card */}
          <div className="tch-home__integrity-card">
            <span className="material-symbols-outlined tch-home__integrity-icon">verified_user</span>
            <h3 className="tch-home__integrity-title">Grade Integrity Active</h3>
            <p className="tch-home__integrity-text">
              All grade submissions are cryptographically hashed and audit-logged.
              Once locked, grades cannot be altered without a formal modification request.
            </p>
            <div className="tch-home__integrity-chips">
              <span className="tch-chip"><span className="material-symbols-outlined">shield</span>SHA-256 Hashed</span>
              <span className="tch-chip"><span className="material-symbols-outlined">history_edu</span>Audit Trail</span>
              <span className="tch-chip"><span className="material-symbols-outlined">lock</span>Immutable</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
