import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import { useStudentProfile } from '../../hooks/useStudentProfile';
import { useLowData } from '../../context/LowDataContext';
import {
  getTermProgress,
  ordinalSuffix,
  getGradeColor,
  formatRelativeTime,
  getNextClassFromTimetable,
  formatDueDate,
} from '../../utils/studentUtils';
import './StudentHome.css';

/* ── Circular Progress Ring ── */
function CircularProgress({ percentage, size = 120, strokeWidth = 10 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color =
    percentage >= 70
      ? 'var(--student-primary)'
      : percentage >= 50
      ? 'var(--student-warning)'
      : 'var(--student-danger)';

  return (
    <svg width={size} height={size} className="circular-progress">
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1.2s ease' }}
      />
      <text
        x="50%" y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{
          fontSize: '20px',
          fontWeight: '900',
          fill: color,
          fontFamily: 'Manrope, Inter, sans-serif',
        }}
      >
        {percentage}%
      </text>
    </svg>
  );
}

/* ── Subject icon map ── */
const SUBJECT_ICONS = {
  MTH: { icon: 'calculate',   color: 'var(--student-primary)' },
  MTE: { icon: 'calculate',   color: 'var(--student-primary)' },
  ENG: { icon: 'menu_book',   color: '#3B82F6' },
  BIO: { icon: 'biotech',     color: 'var(--student-primary)' },
  CHM: { icon: 'science',     color: '#EF4444' },
  HIS: { icon: 'history_edu', color: '#8B5CF6' },
  default: { icon: 'school',  color: '#F59E0B' },
};

function getSubjectStyle(code) {
  return SUBJECT_ICONS[code] || SUBJECT_ICONS.default;
}

/* ── Skeleton cards ── */
function StatSkeleton() {
  return (
    <div className="stu-stat-card">
      <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 40, width: '80%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 10, width: '50%' }} />
    </div>
  );
}

/* ── Notification icon + color by type ── */
function notifStyle(type, isSecurityAlert) {
  if (isSecurityAlert || type === 'MODIFICATION_ATTEMPT')
    return { bg: '#FEF2F2', color: 'var(--student-danger)', icon: 'warning' };
  if (type === 'GRADE_LOCKED')
    return { bg: '#ECFDF5', color: 'var(--student-primary)', icon: 'lock' };
  if (type === 'GRADE_POSTED' || type === 'GRADE_PENDING')
    return { bg: '#FFFBEB', color: 'var(--student-warning)', icon: 'edit_note' };
  if (type === 'REPORT_AVAILABLE')
    return { bg: '#EFF6FF', color: 'var(--student-info)', icon: 'description' };
  return { bg: '#F3F4F6', color: '#6B7280', icon: 'notifications' };
}

/* ── Low-Data Lite Layout ── */
function StudentHomeLite({ profile, summary, grades, recentNotifs, loading, navigateTo }) {
  const firstName = profile?.firstName || profile?.fullName?.split(' ')[0] || 'Student';
  const lastName  = profile?.lastName  || profile?.fullName?.split(' ').slice(-1)[0] || '';
  const initials  = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  const avg  = summary?.overallAverage ?? 0;
  const rank = summary?.classRank ?? '--';
  const total = summary?.totalStudentsInClass ?? '--';

  return (
    <div className="stu-home stu-home--lite">
      {/* Lite mode pill */}
      <div className="stu-lite-pill">
        <span className="material-symbols-outlined">signal_cellular_alt</span>
        Low-Data Mode Active
      </div>

      {/* Avatar + greeting */}
      <div className="stu-lite-header">
        <div className="stu-lite-avatar">{initials}</div>
        <div>
          <h2 className="stu-lite-name">{firstName} {lastName}</h2>
          <p className="stu-lite-sub">Student · {profile?.className || 'SSS3'}</p>
        </div>
      </div>

      {/* 2-col stat grid */}
      <div className="stu-lite-stats">
        <div className="stu-lite-stat">
          <p className="stu-lite-stat__label">Term Average</p>
          <p className="stu-lite-stat__value">{avg}%</p>
        </div>
        <div className="stu-lite-stat">
          <p className="stu-lite-stat__label">Class Rank</p>
          <p className="stu-lite-stat__value">
            {typeof rank === 'number' ? ordinalSuffix(rank) : rank}
            <span className="stu-lite-stat__sub"> / {total}</span>
          </p>
        </div>
      </div>

      {/* Subjects list */}
      <div className="stu-lite-section">
        <p className="stu-lite-section__title">Subjects</p>
        {loading
          ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 38, borderRadius: 6, marginBottom: 6 }} />)
          : grades.map((g) => (
              <div key={g.id} className="stu-lite-row" onClick={() => navigateTo('grades')}>
                <span className="stu-lite-row__name">{g.subject?.name}</span>
                {g.status === 'locked' && (
                  <span className="material-symbols-outlined stu-lite-row__lock">lock</span>
                )}
                <span
                  className="stu-lite-row__score"
                  style={{ color: getGradeColor(g.score) }}
                >
                  {g.score}%
                </span>
              </div>
            ))}
      </div>

      {/* Notifications */}
      <div className="stu-lite-section">
        <p className="stu-lite-section__title">Recent Notifications</p>
        {loading
          ? [1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 32, borderRadius: 6, marginBottom: 6 }} />)
          : recentNotifs.map((n) => {
              const style = notifStyle(n.type, n.isSecurityAlert);
              return (
                <div key={n.id} className="stu-lite-notif" onClick={() => navigateTo('notifications')}>
                  <span className="stu-lite-notif__dot" style={{ background: style.color }} />
                  <span className="stu-lite-notif__text">{n.title}</span>
                  <span className="stu-lite-notif__time">{formatRelativeTime(n.createdAt)}</span>
                </div>
              );
            })}
        {!loading && recentNotifs.length === 0 && (
          <p className="stu-lite-empty">No notifications.</p>
        )}
      </div>
    </div>
  );
}

/* ── Main Component ── */
export default function StudentHome({ navigateTo }) {
  const { profile } = useStudentProfile();
  const { lowData } = useLowData();

  const [currentTerm, setCurrentTerm] = useState(null);
  const [summary, setSummary] = useState(null);
  const [grades, setGrades] = useState([]);
  const [recentNotifs, setRecentNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextClass, setNextClass] = useState(null);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [insights, setInsights] = useState({});

  const scrollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [term, notifs, timetable, assignments, insightsData] = await Promise.all([
        studentApi.getCurrentTerm(),
        studentApi.getNotifications(4),
        studentApi.getTimetable(),
        studentApi.getAssignments(),
        studentApi.getGradeInsights(),
      ]);
      setInsights(insightsData || {});
      setCurrentTerm(term);
      setRecentNotifs(notifs);
      setNextClass(getNextClassFromTimetable(timetable));
      setUpcomingAssignments(
        assignments.filter((a) => a.status === 'pending').slice(0, 3)
      );

      const [g, s] = await Promise.all([
        studentApi.getGrades(term.id),
        studentApi.getGradesSummary(term.id),
      ]);
      setGrades(g);
      setSummary(s);
    } catch (e) {
      // fail silently — show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const scroll = (dir) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir === 'left' ? -220 : 220, behavior: 'smooth' });
    }
  };

  const termProgress = currentTerm
    ? getTermProgress(currentTerm.startDate, currentTerm.endDate)
    : null;

  const firstName = profile?.firstName || profile?.fullName?.split(' ')[0] || 'Student';
  const avg = summary?.overallAverage ?? 0;
  const rank = summary?.classRank ?? '--';
  const total = summary?.totalStudentsInClass ?? '--';
  const passed = summary?.subjectsPassed ?? 0;
  const totalSubj = summary?.totalSubjects ?? 0;

  const cardVariants = {
    hidden:  { opacity: 0, y: 20 },
    visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.4, delay: i * 0.08 } }),
  };

  const atRiskSubjects = useMemo(
    () => grades.filter(g => g.score < 60),
    [grades]
  );

  const bestSubject = useMemo(
    () => grades.length > 0 ? grades.reduce((b, g) => g.score > b.score ? g : b, grades[0]) : null,
    [grades]
  );

  const weakestSubject = useMemo(
    () => grades.length > 1 ? grades.reduce((w, g) => g.score < w.score ? g : w, grades[0]) : null,
    [grades]
  );

  const badges = useMemo(() => {
    const list = [];
    const attendancePct = profile?.attendance ?? 0;
    if (typeof rank === 'number' && typeof total === 'number' && rank <= Math.ceil(total * 0.2)) {
      list.push({ id: 'top-20', icon: 'emoji_events', label: 'Top 20%', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', desc: `Ranked ${rank} of ${total}` });
    }
    if (avg >= 80) {
      list.push({ id: 'high-avg', icon: 'stars', label: 'High Achiever', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', desc: `${avg.toFixed(1)}% average` });
    }
    if (grades.filter(g => g.score >= 70).length >= 4) {
      list.push({ id: 'consistent', icon: 'workspace_premium', label: 'Consistent', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)', desc: '4+ subjects above 70%' });
    }
    if (attendancePct >= 90) {
      list.push({ id: 'attendance', icon: 'how_to_reg', label: 'High Attendance', color: '#10B981', bg: 'rgba(16,185,129,0.1)', desc: `${attendancePct}% attendance` });
    }
    return list;
  }, [avg, rank, total, grades, profile]);

  if (lowData) {
    return (
      <StudentHomeLite
        profile={profile}
        summary={summary}
        grades={grades}
        recentNotifs={recentNotifs}
        loading={loading}
        navigateTo={navigateTo}
      />
    );
  }

  return (
    <div className="stu-home">
      {/* Welcome */}
      <div className="stu-home__welcome">
        <div className="stu-home__welcome-text">
          <h2>Welcome back, {firstName}</h2>
          <p>
            Your academic performance is{' '}
            <strong>{avg >= 70 ? 'on track' : avg >= 50 ? 'progressing' : 'needs attention'}</strong>{' '}
            this term.
          </p>
        </div>
        <div className="stu-home__welcome-actions">
          <button className="stu-btn stu-btn--outline" onClick={() => navigateTo('report-cards')}>
            <span className="material-symbols-outlined">download</span>
            Download Report Card
          </button>
          <button className="stu-btn stu-btn--primary" onClick={() => navigateTo('grades')}>
            <span className="material-symbols-outlined">menu_book</span>
            View Full Grades
          </button>
        </div>
      </div>

      {/* Trust / integrity banner */}
      <div className="stu-trust-banner">
        <span className="material-symbols-outlined stu-trust-banner__icon" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
        <div className="stu-trust-banner__body">
          <strong>Your grades are permanently recorded and tamper-proof.</strong>
          <span> Any unauthorized modification attempt is automatically blocked, logged, and visible to you.</span>
        </div>
      </div>

      {/* At-Risk Alerts */}
      {!loading && atRiskSubjects.length > 0 && (
        <div className="stu-risk-alerts">
          {atRiskSubjects.map(g => (
            <div key={g.id} className="stu-risk-alert">
              <span className="material-symbols-outlined stu-risk-alert__icon" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              <span className="stu-risk-alert__text">
                <strong>{g.subject?.name}</strong> — {g.score}% · At risk of failing. Immediate attention needed.
              </span>
              <button className="stu-risk-alert__btn" onClick={() => {}}>View Grades</button>
            </div>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className="stu-home__stats">
        {loading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            {/* Average */}
            <motion.div
              custom={0} variants={cardVariants} initial="hidden" animate="visible"
              className="stu-stat-card stu-stat-card--average"
            >
              <div className="stu-stat-card__ring-wrap">
                <CircularProgress percentage={Math.round(avg)} size={112} strokeWidth={9} />
              </div>
              <div className="stu-stat-card__average-info">
                <div className="stu-stat-card__label">Term Average</div>
                <div className="stu-stat-card__big">{avg >= 70 ? 'Consistent' : avg >= 50 ? 'Progressing' : 'Needs Work'}</div>
                <div className="stu-stat-card__trend">
                  <span className="material-symbols-outlined">
                    {avg >= 70 ? 'trending_up' : avg >= 50 ? 'trending_flat' : 'trending_down'}
                  </span>
                  {passed}/{totalSubj} subjects passed
                </div>
              </div>
            </motion.div>

            {/* Rank */}
            <motion.div
              custom={1} variants={cardVariants} initial="hidden" animate="visible"
              className="stu-stat-card stu-stat-card--rank"
            >
              <div className="stu-stat-card__label">Class Rank</div>
              <div style={{ marginTop: 8 }}>
                <span className="stu-stat-card__rank-number">{typeof rank === 'number' ? ordinalSuffix(rank) : rank}</span>
                <span className="stu-stat-card__rank-of">of {total}</span>
              </div>
              {typeof rank === 'number' && typeof total === 'number' && (
                <div className="stu-stat-card__trend" style={{ marginTop: 12 }}>
                  <span className="material-symbols-outlined">emoji_events</span>
                  Top {Math.round((rank / total) * 100)}% of cohort
                </div>
              )}
            </motion.div>

            {/* Term progress */}
            <motion.div
              custom={2} variants={cardVariants} initial="hidden" animate="visible"
              className="stu-stat-card stu-stat-card--progress"
            >
              <div className="stu-progress-header">
                <div className="stu-stat-card__label">Term Progress</div>
                <span className="stu-progress-week">
                  {termProgress
                    ? `Week ${termProgress.currentWeek} of ${termProgress.totalWeeks}`
                    : currentTerm?.name || '—'}
                </span>
              </div>
              <div className="stu-progress-track">
                <div
                  className="stu-progress-fill"
                  style={{ width: `${termProgress?.percentage ?? 0}%` }}
                />
              </div>
              <div className="stu-progress-note">
                {termProgress?.daysRemaining > 0
                  ? `${termProgress.daysRemaining} days remaining`
                  : 'Term complete'}
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Subjects at a Glance */}
      <div className="stu-home__subjects">
        <div className="stu-section-title">
          <div className="stu-section-title__bar" />
          Subjects at a Glance
        </div>

        <div className="stu-subjects-scroll-wrap">
          <button className="stu-scroll-btn stu-scroll-btn--left" onClick={() => scroll('left')} aria-label="Scroll left">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>

          <div className="stu-subjects-scroll" ref={scrollRef}>
            {loading
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} style={{ flexShrink: 0, width: 190 }}>
                    <div className="skeleton" style={{ height: 160, borderRadius: 16 }} />
                  </div>
                ))
              : grades.map((g, i) => {
                  const { icon, color } = getSubjectStyle(g.subject?.code);
                  const gradeColor = getGradeColor(g.score);
                  const isFailing = g.score < 50;
                  const insight = insights[g.id];
                  const isBest = bestSubject?.id === g.id;
                  const isWeakest = weakestSubject?.id === g.id;

                  return (
                    <motion.div
                      key={g.id}
                      custom={i}
                      variants={cardVariants}
                      initial="hidden"
                      animate="visible"
                      className="stu-subject-card"
                      onClick={() => navigateTo('grades')}
                    >
                      {isBest && (
                        <div className="stu-subject-card__crown">
                          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          Best
                        </div>
                      )}
                      <div className="stu-subject-card__top">
                        <div
                          className="stu-subject-card__icon"
                          style={{ background: `${color}18` }}
                        >
                          <span className="material-symbols-outlined" style={{ color }}>{icon}</span>
                        </div>
                        <div
                          className="stu-subject-card__grade-letter"
                          style={{ background: `${gradeColor}18`, color: gradeColor }}
                        >
                          {g.gradeLetter}
                        </div>
                      </div>
                      <div
                        className="stu-subject-card__name"
                        style={{ color: isFailing ? 'var(--student-danger)' : undefined }}
                      >
                        {g.subject?.name}
                      </div>
                      <div
                        className="stu-subject-card__score"
                        style={{ color: isFailing ? 'var(--student-danger)' : undefined }}
                      >
                        {g.score}%
                      </div>
                      {insight && (
                        <div
                          className="stu-subject-card__trend-chip"
                          style={{ color: insight.direction === 'up' ? 'var(--student-primary)' : 'var(--student-danger)' }}
                        >
                          <span className="material-symbols-outlined">
                            {insight.direction === 'up' ? 'trending_up' : 'trending_down'}
                          </span>
                          {insight.trend > 0 ? '+' : ''}{insight.trend}% vs last term
                        </div>
                      )}
                      <div className="stu-subject-card__footer">
                        {isWeakest && !isBest && (
                          <span className="stu-subject-card__focus-tag">Focus</span>
                        )}
                        {g.status === 'locked' ? (
                          <span className="material-symbols-outlined" style={{ color: 'var(--student-primary)', fontVariationSettings: "'FILL' 1" }}>lock</span>
                        ) : (
                          <span className="material-symbols-outlined" style={{ color: 'var(--student-warning)' }}>edit_note</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

            {!loading && grades.length === 0 && (
              <div className="stu-empty">No grades available for this term.</div>
            )}
          </div>

          <button className="stu-scroll-btn stu-scroll-btn--right" onClick={() => scroll('right')} aria-label="Scroll right">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Quick-info row: Next Class + Upcoming Assignments */}
      <div className="stu-home__quick-row">
        {/* Next Class Card */}
        <div className="stu-next-class-card">
          <div className="stu-next-class-card__label">
            <span className="material-symbols-outlined">video_call</span>
            Next Class
          </div>
          {nextClass ? (
            <>
              <div className="stu-next-class-card__subject">
                <span
                  className="stu-next-class-card__dot"
                  style={{ background: nextClass.color || 'var(--student-primary)' }}
                />
                {nextClass.subject}
              </div>
              <div className="stu-next-class-card__meta">
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>schedule</span>
                {nextClass.time} – {nextClass.endTime}
                &nbsp;·&nbsp;
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>door_open</span>
                {nextClass.room}
              </div>
              <div className="stu-next-class-card__teacher">
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>person</span>
                {nextClass.teacher}
                {nextClass.minutesUntil > 0 && (
                  <span className="stu-next-class-card__countdown">
                    in {nextClass.minutesUntil} min
                  </span>
                )}
              </div>
              {nextClass.link && (
                <a
                  href={nextClass.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="stu-next-class-card__join"
                >
                  <span className="material-symbols-outlined">videocam</span>
                  Join Class
                </a>
              )}
            </>
          ) : (
            <div className="stu-next-class-card__empty">
              <span className="material-symbols-outlined">weekend</span>
              <p>No upcoming class today</p>
            </div>
          )}
          <button
            className="stu-next-class-card__view"
            onClick={() => navigateTo('timetable')}
          >
            View full timetable
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
        </div>

        {/* Upcoming Assignments */}
        <div className="stu-upcoming-asgn-card">
          <div className="stu-upcoming-asgn-card__header">
            <span className="stu-upcoming-asgn-card__label">
              <span className="material-symbols-outlined">assignment</span>
              Upcoming Assignments
            </span>
            <button onClick={() => navigateTo('assignments')}>View all</button>
          </div>
          {upcomingAssignments.length === 0 ? (
            <div className="stu-next-class-card__empty">
              <span className="material-symbols-outlined">task_alt</span>
              <p>All caught up!</p>
            </div>
          ) : (
            upcomingAssignments.map((a) => {
              const due = formatDueDate(a.dueDate);
              const isUrgent = due.includes('today') || due.includes('tomorrow') || due.includes('overdue');
              return (
                <div key={a.id} className="stu-asgn-row" onClick={() => navigateTo('assignments')}>
                  <div
                    className="stu-asgn-row__bar"
                    style={{ background: a.subjectColor }}
                  />
                  <div className="stu-asgn-row__body">
                    <div className="stu-asgn-row__title">{a.title}</div>
                    <div className="stu-asgn-row__sub">{a.subject}</div>
                  </div>
                  <span
                    className="stu-asgn-row__due"
                    style={{ color: isUrgent ? 'var(--student-danger)' : 'var(--student-text-secondary)' }}
                  >
                    {due}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom: notifications + quick actions */}
      <div className="stu-home__bottom">
        {/* Recent notifications */}
        <div className="stu-home__notifs">
          <div className="stu-home__notifs-header">
            <h3>Recent Notifications</h3>
            <button onClick={() => navigateTo('notifications')}>View all</button>
          </div>

          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', alignItems: 'center' }}>
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 12, marginBottom: 6 }} />
                    <div className="skeleton" style={{ height: 10, width: '60%' }} />
                  </div>
                </div>
              ))
            : recentNotifs.map((n) => {
                const style = notifStyle(n.type, n.isSecurityAlert);
                return (
                  <div
                    key={n.id}
                    className="stu-notif-item"
                    onClick={() => navigateTo('notifications')}
                  >
                    <div className="stu-notif-item__icon" style={{ background: style.bg }}>
                      <span className="material-symbols-outlined" style={{ color: style.color, fontSize: 20 }}>
                        {style.icon}
                      </span>
                    </div>
                    <div className="stu-notif-item__body">
                      <div className="stu-notif-item__title">{n.title}</div>
                      <div className="stu-notif-item__meta">{formatRelativeTime(n.createdAt)}</div>
                    </div>
                    {!n.isRead && <div className="stu-notif-item__dot" />}
                  </div>
                );
              })}

          {!loading && recentNotifs.length === 0 && (
            <div className="stu-empty">No notifications yet.</div>
          )}
        </div>

        {/* Right column */}
        <div className="stu-home__right">
          {/* Performance Insights */}
          <div className="stu-insights-card">
            <div className="stu-insights-card__glow" />
            <h4 className="stu-insights-card__title">
              <span className="material-symbols-outlined">insights</span>
              Performance Insights
            </h4>
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 36, background: 'rgba(255,255,255,0.06)', borderRadius: 8 }} />)}
              </div>
            ) : (
              <div className="stu-insights-card__rows">
                {bestSubject && (
                  <div className="stu-insight-row stu-insight-row--best">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
                    <span><strong>Best:</strong> {bestSubject.subject?.name} · {bestSubject.score}%</span>
                  </div>
                )}
                {weakestSubject && (
                  <div className="stu-insight-row stu-insight-row--weak">
                    <span className="material-symbols-outlined">warning</span>
                    <span><strong>Focus:</strong> {weakestSubject.subject?.name} · {weakestSubject.score}%</span>
                  </div>
                )}
                {weakestSubject && (
                  <div className="stu-insight-row stu-insight-row--tip">
                    <span className="material-symbols-outlined">lightbulb</span>
                    <span>Schedule extra study time for <strong>{weakestSubject.subject?.name}</strong> this week</span>
                  </div>
                )}
                {!bestSubject && !weakestSubject && (
                  <div className="stu-insight-row stu-insight-row--tip">
                    <span className="material-symbols-outlined">lightbulb</span>
                    <span>Grades not yet available for this term</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Achievements */}
          {badges.length > 0 && (
            <div className="stu-achievements-card">
              <h4 className="stu-achievements-card__title">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
                Achievements
              </h4>
              <div className="stu-achievements-grid">
                {badges.map(b => (
                  <div key={b.id} className="stu-badge-item" style={{ background: b.bg }} title={b.desc}>
                    <span className="material-symbols-outlined stu-badge-item__icon" style={{ color: b.color, fontVariationSettings: "'FILL' 1" }}>
                      {b.icon}
                    </span>
                    <span className="stu-badge-item__label">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick shortcuts */}
          <div className="stu-shortcuts-card">
            <h4>Quick Shortcuts</h4>
            <div className="stu-shortcuts-grid">
              {[
                { label: 'Timetable',    icon: 'calendar_month', section: 'timetable' },
                { label: 'Assignments',  icon: 'assignment',     section: 'assignments' },
                { label: 'Grades',       icon: 'auto_stories',   section: 'grades' },
                { label: 'Attendance',   icon: 'fact_check',     section: 'attendance' },
                { label: 'Resources',    icon: 'folder_open',    section: 'resources' },
                { label: 'Events',       icon: 'event_note',     section: 'events' },
                { label: 'Messages',     icon: 'chat',           section: 'messages' },
                { label: 'Report Cards', icon: 'description',    section: 'report-cards' },
              ].map(({ label, icon, section }) => (
                <button
                  key={section}
                  className="stu-shortcut-btn"
                  onClick={() => navigateTo(section)}
                >
                  <span className="material-symbols-outlined">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
