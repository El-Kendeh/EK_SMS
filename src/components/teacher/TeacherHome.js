import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { useTeacherProfile } from '../../hooks/useTeacherProfile';
import { useTeacherNotifications } from '../../hooks/useTeacherNotifications';
import { useTeacherTimetable } from '../../hooks/useTeacherTimetable';
import { teacherApi } from '../../api/teacherApi';
import { getGreeting, getPeriodClass, getPeriodsForDay, getCurrentDay, isPeriodNow, formatRelativeTime } from '../../utils/teacherUtils';
import { getDeadlineWarning } from '../../utils/gradeUtils';
import './TeacherHome.css';

const ACTIVITY_ICONS = {
  grade_viewed:       'visibility',
  parent_notified:    'family_restroom',
  report_downloaded:  'download',
  message_sent:       'chat',
};

const CAL_EVENT_ICONS = {
  exam:       'fact_check',
  holiday:    'celebration',
  deadline:   'schedule',
  event:      'event',
  term_end:   'event_available',
  term_start: 'play_circle',
};

const CAL_EVENT_COLORS = {
  exam:       '--amber',
  holiday:    '--green',
  deadline:   '--red',
  event:      '--blue',
  term_end:   '--primary',
  term_start: '--primary',
};

function formatCalDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.ceil((d - today) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays <= 7) return `In ${diffDays} days`;
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const MOCK_ACTIVITY = [
  { id: 1, type: 'grade_viewed',     studentName: 'Amara Koroma',   detail: 'Viewed their Mathematics grade',          time: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: 2, type: 'parent_notified',  studentName: 'Ibrahim Sesay',  detail: 'Parent notified of English grade lock',   time: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: 3, type: 'report_downloaded',studentName: 'Fatima Bangura', detail: 'Downloaded term report card',             time: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 4, type: 'grade_viewed',     studentName: 'Mohamed Conteh', detail: 'Viewed their Science grade',             time: new Date(Date.now() - 3 * 3600000).toISOString() },
];

export default function TeacherHome({ navigateTo }) {
  const { assignedClasses, pendingCounts, currentTerm, actionFeedback, clearActionFeedback } = useTeacher();
  const { profile } = useTeacherProfile();
  const { notifications } = useTeacherNotifications();
  const { timetable } = useTeacherTimetable();
  const [activity, setActivity] = useState(MOCK_ACTIVITY);
  const [attendanceStatus, setAttendanceStatus] = useState({ classes: [], at_risk: [] });
  const [atRiskStudents, setAtRiskStudents] = useState([]);
  const [modSummary, setModSummary] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [calendarEvents, setCalendarEvents] = useState([]);

  useEffect(() => {
    teacherApi.getStudentActivity()
      .then(data => { if (data.activities?.length > 0) setActivity(data.activities); })
      .catch(() => {});
    teacherApi.getAttendanceStatus()
      .then(data => setAttendanceStatus({ classes: data.classes || [], at_risk: data.at_risk || [] }))
      .catch(() => {});
    teacherApi.getAtRiskStudents()
      .then(data => setAtRiskStudents(data.students || []))
      .catch(() => {});
    teacherApi.getModificationSummary()
      .then(data => setModSummary({ pending: data.pending || 0, approved: data.approved || 0, rejected: data.rejected || 0 }))
      .catch(() => {});
    teacherApi.getAcademicCalendar()
      .then(data => {
        const upcoming = (data.events || [])
          .filter(e => new Date(e.date) >= new Date())
          .sort((a, b) => new Date(a.date) - new Date(b.date))
          .slice(0, 5);
        setCalendarEvents(upcoming);
      })
      .catch(() => {});
  }, []);

  const greeting      = getGreeting(profile?.firstName || 'Teacher');
  const today         = getCurrentDay();
  const todayPeriods  = timetable ? getPeriodsForDay(timetable.periods, today) : [];
  const totalLocked   = assignedClasses.reduce((a, c) => a + (c.gradeStats?.locked  || 0), 0);
  const totalDraft    = assignedClasses.reduce((a, c) => a + (c.gradeStats?.draft   || 0), 0);
  const totalPending  = assignedClasses.reduce((a, c) => a + (c.gradeStats?.pending || 0), 0);
  const deadline      = currentTerm?.gradeEntryDeadline;
  const deadlineWarning = getDeadlineWarning(deadline);
  const recentNotifs  = notifications.slice(0, 3);
  const modTotal      = modSummary.pending + modSummary.approved + modSummary.rejected;

  const quickActions = [];
  const notTakenClass = attendanceStatus.classes.find(c => !c.taken && c.total_students > 0);
  if (notTakenClass) {
    quickActions.push({
      key: 'attendance', icon: 'how_to_reg',
      label: `Mark attendance for ${notTakenClass.classroom_name}`,
      action: () => navigateTo('attendance'), cls: 'tch-qa--amber',
    });
  }
  if (deadlineWarning && pendingCounts.totalDraft > 0) {
    quickActions.push({
      key: 'lock-drafts', icon: 'lock',
      label: `Lock ${pendingCounts.totalDraft} draft grade${pendingCounts.totalDraft !== 1 ? 's' : ''} before deadline`,
      action: () => navigateTo('grade-completion'), cls: 'tch-qa--danger',
    });
  }
  const worstPendingClass = assignedClasses.reduce((best, c) =>
    (c.gradeStats?.pending || 0) > (best?.gradeStats?.pending || 0) ? c : best, null);
  if (worstPendingClass && (worstPendingClass.gradeStats?.pending || 0) > 0) {
    quickActions.push({
      key: 'enter-grades', icon: 'edit_note',
      label: `Enter ${worstPendingClass.gradeStats.pending} missing grade${worstPendingClass.gradeStats.pending !== 1 ? 's' : ''} for ${worstPendingClass.name}`,
      action: () => navigateTo('grade-entry'), cls: 'tch-qa--info',
    });
  }
  if (modSummary.pending > 0) {
    quickActions.push({
      key: 'mod-requests', icon: 'rate_review',
      label: `${modSummary.pending} grade modification request${modSummary.pending !== 1 ? 's' : ''} awaiting admin review`,
      action: () => navigateTo('modifications'), cls: 'tch-qa--amber',
    });
  }

  const statCards = [
    { label: 'Classes Assigned', value: assignedClasses.length, icon: 'school',          sub: 'This term',              subClass: '' },
    { label: 'Pending Grades',   value: totalPending,           icon: 'pending_actions',  sub: 'Not yet entered',        subClass: totalPending > 0 ? '--amber' : '' },
    { label: 'Draft Grades',     value: totalDraft,             icon: 'edit_note',        sub: 'Saved, not locked',      subClass: totalDraft > 0 ? '--amber' : '' },
    { label: 'Locked Grades',    value: totalLocked,            icon: 'lock',             sub: 'Permanently recorded',   subClass: '--primary' },
  ];

  return (
    <div className="tch-home">

      {/* ── Greeting banner ───────────────────────────────────────── */}
      <motion.div className="tch-home__banner"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
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

      {/* ── 2FA recommendation ────────────────────────────────────── */}
      {profile && profile.has_2fa === false && (
        <motion.div className="tch-home__deadline tch-home__deadline--amber"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <span className="material-symbols-outlined">shield</span>
          <div className="tch-home__deadline-text">
            <strong>Secure your account:</strong> Two-factor authentication is not enabled.
            Enable 2FA to protect your grade records from unauthorised access.
          </div>
          <button className="tch-btn tch-btn--sm tch-btn--primary" onClick={() => navigateTo('settings')}>Enable 2FA</button>
        </motion.div>
      )}

      {/* ── Deadline warning ──────────────────────────────────────── */}
      {deadlineWarning && (pendingCounts.totalPending > 0 || pendingCounts.totalDraft > 0) && (
        <motion.div className={`tch-home__deadline tch-home__deadline--${deadlineWarning.level}`}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <span className="material-symbols-outlined">schedule</span>
          <div className="tch-home__deadline-text">
            <strong>Grade Entry Deadline:</strong> {deadlineWarning.text} —{' '}
            {pendingCounts.totalPending + pendingCounts.totalDraft} grades still need your attention.
          </div>
          <button className="tch-btn tch-btn--sm tch-btn--primary" onClick={() => navigateTo('grade-entry')}>Enter Grades</button>
        </motion.div>
      )}

      {/* ── Action feedback ───────────────────────────────────────── */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div className="tch-home__action-feedback"
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
            <span className="material-symbols-outlined tch-home__action-feedback__icon">verified</span>
            <div className="tch-home__action-feedback__body">
              <p className="tch-home__action-feedback__title">
                {actionFeedback.count} grade{actionFeedback.count !== 1 ? 's' : ''} locked in {actionFeedback.className}
              </p>
              <p className="tch-home__action-feedback__detail">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>groups</span>
                {actionFeedback.studentsNotified} student{actionFeedback.studentsNotified !== 1 ? 's' : ''} notified
                <span style={{ margin: '0 4px' }}>·</span>
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>family_restroom</span>
                {actionFeedback.parentsNotified} parent{actionFeedback.parentsNotified !== 1 ? 's' : ''} notified
                <span style={{ margin: '0 4px' }}>·</span>
                {actionFeedback.subjectName}
              </p>
            </div>
            <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={clearActionFeedback} title="Dismiss">
              <span className="material-symbols-outlined">close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Stat cards ────────────────────────────────────────────── */}
      <div className="tch-stats-grid">
        {statCards.map((s, i) => (
          <motion.div key={s.label} className="tch-stat-card"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: i * 0.06 }}>
            <p className="tch-stat-card__label">{s.label}</p>
            <p className="tch-stat-card__value">{String(s.value).padStart(2, '0')}</p>
            <p className={`tch-stat-card__sub tch-stat-card__sub${s.subClass}`}>
              <span className="material-symbols-outlined">{s.icon}</span>{s.sub}
            </p>
          </motion.div>
        ))}
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────── */}
      {quickActions.length > 0 && (
        <motion.div className="tch-home__qa-panel"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <p className="tch-home__section-label" style={{ marginBottom: 10 }}>Quick Actions</p>
          <div className="tch-home__qa-list">
            {quickActions.map(qa => (
              <button key={qa.key} className={`tch-qa-btn ${qa.cls}`} onClick={qa.action}>
                <span className="material-symbols-outlined tch-qa-btn__icon">{qa.icon}</span>
                <span className="tch-qa-btn__label">{qa.label}</span>
                <span className="material-symbols-outlined tch-qa-btn__arrow">arrow_forward</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── Academic Calendar Strip ───────────────────────────────── */}
      {calendarEvents.length > 0 && (
        <motion.div className="tch-card tch-card--pad tch-home__cal-strip"
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
          <div className="tch-home__section-header">
            <p className="tch-home__section-label">
              <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>event</span>
              Upcoming Dates
            </p>
            <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => navigateTo('timetable')}>
              Full Calendar
            </button>
          </div>
          <div className="tch-home__cal-events">
            {calendarEvents.map(evt => {
              const color  = CAL_EVENT_COLORS[evt.type] || '--blue';
              const icon   = CAL_EVENT_ICONS[evt.type]  || 'event';
              const urgent = new Date(evt.date) - new Date() < 3 * 86400000;
              return (
                <div key={evt.id} className={`tch-home__cal-event tch-home__cal-event${color}`}>
                  <span className="material-symbols-outlined tch-home__cal-event-icon">{icon}</span>
                  <div className="tch-home__cal-event-body">
                    <p className="tch-home__cal-event-name">{evt.name}</p>
                    <p className={`tch-home__cal-event-date ${urgent ? 'tch-home__cal-event-date--urgent' : ''}`}>
                      {formatCalDate(evt.date)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Main grid ─────────────────────────────────────────────── */}
      <div className="tch-home__grid">

        {/* Left column */}
        <div className="tch-home__left">

          {/* My Classes */}
          <div className="tch-card tch-card--pad tch-home__section">
            <div className="tch-home__section-header">
              <p className="tch-home__section-label">My Classes</p>
              <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => navigateTo('classes')}>View All</button>
            </div>
            <div className="tch-home__class-list">
              {assignedClasses.map((cls, i) => {
                const stats    = cls.gradeStats || {};
                const lockedPct = stats.total ? (stats.locked / stats.total) * 100 : 0;
                const draftPct  = stats.total ? (stats.draft  / stats.total) * 100 : 0;
                return (
                  <motion.div key={cls.id} className="tch-home__class-row"
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.07 }} onClick={() => navigateTo('grade-entry')}>
                    <div className="tch-home__class-row-left">
                      <div className="tch-home__class-row-name">{cls.name}</div>
                      <div className="tch-home__class-row-meta">
                        <span className="tch-chip">
                          <span className="material-symbols-outlined">subject</span>{cls.subject.name}
                        </span>
                        <span className="tch-chip">
                          <span className="material-symbols-outlined">meeting_room</span>{cls.room}
                        </span>
                      </div>
                      <div className="tch-completion-bar" style={{ marginTop: 8 }}>
                        <div className="tch-completion-bar__locked" style={{ width: `${lockedPct}%` }} />
                        <div className="tch-completion-bar__draft"  style={{ width: `${draftPct}%` }} />
                      </div>
                      <p className="tch-home__class-row-stats">
                        <span style={{ color: 'var(--tch-primary)' }}>{stats.locked} locked</span>
                        {stats.draft   > 0 && <span style={{ color: 'var(--tch-warning)' }}> · {stats.draft} draft</span>}
                        {stats.pending > 0 && <span style={{ color: 'var(--tch-text-secondary)' }}> · {stats.pending} pending</span>}
                      </p>
                    </div>
                    <span className="material-symbols-outlined tch-home__class-row-arrow">chevron_right</span>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ── Today's Classes (merged schedule + attendance) ─────── */}
          <div className="tch-card tch-card--pad tch-home__section">
            <div className="tch-home__section-header">
              <p className="tch-home__section-label">Today's Classes</p>
              <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => navigateTo('timetable')}>Full Timetable</button>
            </div>
            {todayPeriods.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, color: 'var(--tch-text-secondary)', opacity: 0.35 }}>free_cancellation</span>
                <p style={{ color: 'var(--tch-text-secondary)', fontSize: 13, margin: '8px 0 0' }}>No classes scheduled today</p>
              </div>
            ) : (
              <div className="tch-home__today-list">
                {todayPeriods.map(period => {
                  const isNow   = isPeriodNow(period);
                  const cls     = getPeriodClass(period);
                  const attCls  = attendanceStatus.classes.find(c =>
                    c.classroom_name === period.class ||
                    c.classroom_name?.toLowerCase() === period.class?.toLowerCase()
                  );
                  return (
                    <div key={period.id} className={`tch-home__today-row ${isNow ? 'tch-home__today-row--now' : ''} ${cls}`}>
                      <div className="tch-home__today-time">
                        <span className="tch-home__today-start">{period.startTime}</span>
                        <span className="tch-home__today-end">{period.endTime}</span>
                      </div>
                      <div className="tch-home__today-info">
                        <p className="tch-home__today-subject">
                          {isNow && <span className="tch-home__now-dot" />}
                          {period.subject}
                        </p>
                        <p className="tch-home__today-meta">
                          {period.class && <>{period.class} · </>}{period.room}
                        </p>
                      </div>
                      <div className="tch-home__today-att">
                        {attCls ? (
                          attCls.taken ? (
                            <span className="tch-chip" style={{ color: 'var(--tch-primary)', borderColor: 'var(--tch-primary)' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>check_circle</span>
                              {attCls.present_count}/{attCls.total_students}
                            </span>
                          ) : (
                            <button className="tch-btn tch-btn--sm tch-btn--primary" onClick={() => navigateTo('attendance')}>Mark</button>
                          )
                        ) : (
                          <button className="tch-btn tch-btn--sm tch-btn--ghost" onClick={() => navigateTo('attendance')}>Attendance</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {attendanceStatus.at_risk.length > 0 && (
              <details className="tch-home__att-risk" style={{ marginTop: 12 }}>
                <summary className="tch-home__att-risk-summary">
                  <span className="material-symbols-outlined">warning</span>
                  {attendanceStatus.at_risk.length} student{attendanceStatus.at_risk.length !== 1 ? 's' : ''} below 75% attendance
                </summary>
                <div className="tch-home__att-risk-list">
                  {attendanceStatus.at_risk.map(s => (
                    <div key={s.id} className="tch-home__att-risk-row">
                      <span className="tch-home__att-risk-name">{s.name}</span>
                      <span className="tch-chip">{s.classroom}</span>
                      <span className="tch-badge tch-badge--red">{s.att_rate}%</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>

        </div>

        {/* Right column */}
        <div className="tch-home__right">

          {/* ── Grade Modification Summary ─────────────────────────── */}
          {modTotal > 0 && (
            <motion.div className="tch-card tch-card--pad tch-home__section tch-home__mod-summary"
              initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <div className="tch-home__section-header">
                <p className="tch-home__section-label">Grade Requests</p>
                <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => navigateTo('modifications')}>View All</button>
              </div>
              <div className="tch-home__mod-stats">
                <div className="tch-home__mod-stat tch-home__mod-stat--amber">
                  <span className="material-symbols-outlined">pending</span>
                  <span className="tch-home__mod-stat-value">{modSummary.pending}</span>
                  <span className="tch-home__mod-stat-label">Pending</span>
                </div>
                <div className="tch-home__mod-stat tch-home__mod-stat--green">
                  <span className="material-symbols-outlined">check_circle</span>
                  <span className="tch-home__mod-stat-value">{modSummary.approved}</span>
                  <span className="tch-home__mod-stat-label">Approved</span>
                </div>
                <div className="tch-home__mod-stat tch-home__mod-stat--red">
                  <span className="material-symbols-outlined">cancel</span>
                  <span className="tch-home__mod-stat-value">{modSummary.rejected}</span>
                  <span className="tch-home__mod-stat-label">Rejected</span>
                </div>
              </div>
              {modSummary.pending > 0 && (
                <p className="tch-home__mod-note">
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>info</span>
                  {modSummary.pending} request{modSummary.pending !== 1 ? 's' : ''} waiting on admin decision
                </p>
              )}
            </motion.div>
          )}

          {/* ── Academic At-Risk Students ──────────────────────────── */}
          <motion.div className="tch-card tch-card--pad tch-home__section"
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
            <div className="tch-home__section-header">
              <p className="tch-home__section-label">
                <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>trending_down</span>
                Academic At-Risk
              </p>
              <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => navigateTo('analytics')}>Analytics</button>
            </div>
            {atRiskStudents.length === 0 ? (
              <div className="tch-home__atrisk-empty">
                <span className="material-symbols-outlined">verified</span>
                <p>No students currently below 60% in any subject</p>
              </div>
            ) : (
              <>
                <p className="tch-home__atrisk-note">Students scoring below 60% — requires attention</p>
                <div className="tch-home__atrisk-list">
                  {atRiskStudents.slice(0, 6).map((s, i) => (
                    <motion.div key={s.id} className="tch-home__atrisk-row"
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                      <div className="tch-home__atrisk-avatar">{(s.name || 'S')[0].toUpperCase()}</div>
                      <div className="tch-home__atrisk-info">
                        <p className="tch-home__atrisk-name">{s.name}</p>
                        <p className="tch-home__atrisk-class">{s.classroom}{s.subject ? ` · ${s.subject}` : ''}</p>
                      </div>
                      <span className={`tch-badge ${s.score < 40 ? 'tch-badge--red' : 'tch-badge--amber'}`}>
                        {s.score}%
                      </span>
                    </motion.div>
                  ))}
                </div>
                {atRiskStudents.length > 6 && (
                  <button className="tch-home__atrisk-more" onClick={() => navigateTo('analytics')}>
                    +{atRiskStudents.length - 6} more students → View in Analytics
                  </button>
                )}
              </>
            )}
          </motion.div>

          {/* ── Recent Notifications ──────────────────────────────── */}
          <div className="tch-card tch-card--pad tch-home__section">
            <div className="tch-home__section-header">
              <p className="tch-home__section-label">Recent Notifications</p>
              <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => navigateTo('notifications')}>View All</button>
            </div>
            <div style={{ marginTop: 12 }}>
              {recentNotifs.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--tch-text-secondary)', textAlign: 'center', padding: '20px 0' }}>No notifications</p>
              ) : recentNotifs.map(n => (
                <div key={n.id}
                  className={`tch-notif-item ${!n.isRead ? 'tch-notif-item--unread' : ''} ${n.isSecurityAlert ? 'tch-notif-item--security' : ''}`}
                  onClick={() => navigateTo('notifications')}>
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

          {/* ── Recent Student Activity ────────────────────────────── */}
          {activity.length > 0 && (
            <div className="tch-card tch-card--pad tch-home__section">
              <div className="tch-home__section-header">
                <p className="tch-home__section-label">Recent Student Activity</p>
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activity.slice(0, 4).map((item, i) => (
                  <motion.div key={item.id} className="tch-home__activity-row"
                    initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.05 }}>
                    <div className="tch-home__activity-icon">
                      <span className="material-symbols-outlined">{ACTIVITY_ICONS[item.type] || 'info'}</span>
                    </div>
                    <div className="tch-home__activity-info">
                      <p className="tch-home__activity-student">{item.studentName}</p>
                      <p className="tch-home__activity-detail">{item.detail}</p>
                    </div>
                    <span className="tch-home__activity-time">{formatRelativeTime(item.time)}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* ── Grade Integrity card ───────────────────────────────── */}
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
