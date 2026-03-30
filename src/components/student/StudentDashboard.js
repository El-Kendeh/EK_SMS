import React, { useState, useEffect, useCallback } from 'react';
import './StudentDashboard.css';
import ApiClient from '../../api/client';

/* ── Helpers ── */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

function initials(name = '') {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] || '?').toUpperCase();
}

function gradeColor(letter) {
  return letter === 'A' ? '#89ceff'
    : letter === 'B' ? '#5de6ff'
    : letter === 'C' ? '#ffb786'
    : letter === 'D' ? '#ffb4ab'
    : '#88929b';
}

function gradeIcon(letter) {
  return letter === 'A' ? 'star' : letter === 'B' ? 'school' : letter === 'C' ? 'menu_book' : 'info';
}

function scoreToPercent(score) { return Math.min(100, Math.max(0, score)); }

function fmt12(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hr = parseInt(h, 10);
  const ampm = hr >= 12 ? 'PM' : 'AM';
  return `${hr % 12 || 12}:${m} ${ampm}`;
}

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':');
  return parseInt(h, 10) * 60 + parseInt(m, 10);
}

function todayDayIndex() {
  const d = new Date().getDay(); // 0=Sun
  return d === 0 ? 0 : d - 1;   // Mon=0 … Fri=4
}

function currentMinutes() {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
}

function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatRelative(isoStr) {
  const d = new Date(isoStr);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function notifColors(type) {
  const map = {
    info:    { bg: 'rgba(137,206,255,0.1)', color: '#89ceff', icon: 'info' },
    success: { bg: 'rgba(76,215,246,0.1)',  color: '#5de6ff', icon: 'check_circle' },
    warning: { bg: 'rgba(255,183,134,0.1)', color: '#ffb786', icon: 'warning' },
    alert:   { bg: 'rgba(255,180,171,0.1)', color: '#ffb4ab', icon: 'notification_important' },
  };
  return map[type] || map.info;
}

/* ── Material icon component ── */
function Icon({ name, size = 20, style = {} }) {
  return (
    <span className="material-symbols-outlined" style={{ fontSize: size, ...style }}>{name}</span>
  );
}

/* ── Circular SVG Gauge ── */
function AttGauge({ rate }) {
  const pct = rate ?? 0;
  const r = 54, circ = 2 * Math.PI * r;
  const offset = circ - (circ * pct) / 100;
  const color = pct >= 80 ? '#89ceff' : pct >= 60 ? '#ffb786' : '#ffb4ab';
  return (
    <svg width={130} height={130} viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={65} cy={65} r={r} fill="transparent" stroke="#2d3449" strokeWidth={10} />
      <circle
        cx={65} cy={65} r={r} fill="transparent" stroke={color} strokeWidth={10}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}

/* ================================================================
   HOME TAB
   ================================================================ */
function HomeTab({ profile, stats, recentGrades, onGotoGrades, onGotoSchedule }) {
  if (!profile) return <div className="sd-loader">Loading…</div>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const kpis = [
    {
      label: 'Avg Score',
      value: stats.avg_score != null ? `${stats.avg_score}` : '—',
      sub: 'Overall performance',
      color: '#89ceff',
      bar: stats.avg_score != null ? scoreToPercent(stats.avg_score) : 0,
    },
    {
      label: 'Attendance',
      value: stats.attendance_rate != null ? `${stats.attendance_rate}%` : '—',
      sub: stats.attendance_rate >= 80 ? 'Above target' : 'Needs attention',
      color: stats.attendance_rate >= 80 ? '#5de6ff' : '#ffb786',
      bar: stats.attendance_rate ?? 0,
    },
    {
      label: 'Subjects',
      value: stats.subjects_count ?? '—',
      sub: 'Enrolled',
      color: '#bdc2ff',
      bar: null,
    },
    {
      label: 'Upcoming',
      value: stats.upcoming_exams ?? '—',
      sub: 'Exams',
      color: '#ffb786',
      bar: null,
    },
  ];

  const insight = stats.avg_score != null
    ? (stats.avg_score >= 80
      ? `Outstanding! You're averaging ${stats.avg_score}/100. Keep up the excellent work!`
      : stats.avg_score >= 60
      ? `You're averaging ${stats.avg_score}/100. A little more effort and you'll be in the top tier.`
      : `Your average score is ${stats.avg_score}/100. Let's work on improving — speak to your teacher for support.`)
    : 'Your performance data will appear here once grades are recorded.';

  return (
    <div>
      {/* Welcome */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#bec8d2' }}>{greeting}</p>
        <h2 style={{ margin: '4px 0 0', fontFamily: 'Manrope', fontWeight: 800, fontSize: '1.625rem', color: '#dae2fd', letterSpacing: '-0.02em' }}>
          {profile.first_name || profile.full_name}
        </h2>
        <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#88929b' }}>
          {profile.academic_year || ''} {profile.classroom ? `• Class ${profile.classroom}` : ''}
        </p>
      </div>

      {/* KPI Bento */}
      <div className="sd-bento">
        {kpis.map(k => (
          <div className="sd-kpi" key={k.label}>
            <p className="sd-kpi-label">{k.label}</p>
            <div className="sd-kpi-value" style={{ color: k.color }}>{k.value}</div>
            {k.bar != null && (
              <div className="sd-kpi-bar">
                <div className="sd-kpi-bar-fill" style={{ width: `${k.bar}%`, background: k.color }} />
              </div>
            )}
            <div className="sd-kpi-sub" style={{ color: k.color }}>
              <Icon name={k.sub.includes('Above') || k.sub.includes('Out') ? 'check_circle' : k.sub === 'Enrolled' || k.sub === 'Exams' ? 'info' : 'warning'} size={13} />
              {k.sub}
            </div>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div className="sd-insight">
        <div className="sd-insight-icon"><Icon name="lightbulb" size={20} /></div>
        <div>
          <p className="sd-insight-title">Smart Insight</p>
          <p className="sd-insight-text">{insight}</p>
        </div>
      </div>

      {/* Recent Grades */}
      <div className="sd-section-head">
        <h3 className="sd-section-title">Recent Grades</h3>
        <button className="sd-section-link" onClick={onGotoGrades}>View All</button>
      </div>
      {recentGrades.length === 0 ? (
        <div className="sd-empty">
          <Icon name="school" size={40} style={{ opacity: 0.3 }} />
          <span className="sd-empty-text">No grades recorded yet</span>
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}>
          {recentGrades.map((g, i) => (
            <div className="sd-grade-card" key={i} onClick={onGotoGrades}>
              <div className="sd-grade-icon">
                <Icon name={gradeIcon(g.grade_letter)} size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="sd-grade-name">{g.subject}</div>
                <div className="sd-grade-term">{g.term}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="sd-grade-letter" style={{ color: gradeColor(g.grade_letter) }}>{g.grade_letter}</div>
                <div style={{ fontSize: '0.6875rem', color: '#88929b' }}>{g.total_score}/100</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   GRADES TAB
   ================================================================ */
function GradesTab() {
  const [grades,    setGrades]    = useState([]);
  const [terms,     setTerms]     = useState([]);
  const [selTerm,   setSelTerm]   = useState('');
  const [avgScore,  setAvgScore]  = useState(null);
  const [loading,   setLoading]   = useState(true);

  const load = useCallback((termId = '') => {
    setLoading(true);
    const params = termId ? `?term_id=${termId}` : '';
    ApiClient.get(`/api/student/grades/${params}`)
      .then(d => { setGrades(d.grades || []); setTerms(d.terms || []); setAvgScore(d.avg_score); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const letterCount = grades.reduce((acc, g) => { acc[g.grade_letter] = (acc[g.grade_letter] || 0) + 1; return acc; }, {});

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#bec8d2' }}>Academic Performance</p>
        <h2 style={{ margin: '4px 0 0', fontFamily: 'Manrope', fontWeight: 800, fontSize: '1.5rem', color: '#dae2fd' }}>My Grades</h2>
      </div>

      {/* GPA summary */}
      <div className="sd-gpa-card">
        <div>
          <div className="sd-gpa-val" style={{ color: '#89ceff' }}>{avgScore ?? '—'}</div>
          <div className="sd-gpa-lbl">Avg Score</div>
        </div>
        <div>
          <div className="sd-gpa-val" style={{ color: '#5de6ff' }}>{grades.length}</div>
          <div className="sd-gpa-lbl">Subjects</div>
        </div>
        <div>
          <div className="sd-gpa-val" style={{ color: '#bdc2ff' }}>{letterCount['A'] || 0}</div>
          <div className="sd-gpa-lbl">A Grades</div>
        </div>
      </div>

      {/* Term pills */}
      {terms.length > 0 && (
        <div className="sd-term-pills">
          <button className={`sd-term-pill ${selTerm === '' ? 'active' : 'inactive'}`} onClick={() => { setSelTerm(''); load(''); }}>All Terms</button>
          {terms.map(t => (
            <button key={t.id} className={`sd-term-pill ${selTerm === String(t.id) ? 'active' : 'inactive'}`}
              onClick={() => { setSelTerm(String(t.id)); load(t.id); }}>{t.name}</button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="sd-loader">Loading grades…</div>
      ) : grades.length === 0 ? (
        <div className="sd-empty">
          <Icon name="grade" size={48} style={{ opacity: 0.3 }} />
          <span className="sd-empty-text">No grades recorded for this term</span>
        </div>
      ) : (
        <div>
          {grades.map((g, i) => {
            const pct = scoreToPercent(g.total_score);
            const col = gradeColor(g.grade_letter);
            return (
              <div className="sd-grade-card" key={i} style={{ flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="sd-grade-icon" style={{ background: col + '18' }}>
                    <Icon name={gradeIcon(g.grade_letter)} size={20} style={{ color: col }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="sd-grade-name">{g.subject}</div>
                    <div className="sd-grade-term">{g.term}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="sd-grade-letter" style={{ color: col }}>{g.grade_letter}</div>
                    <div style={{ fontSize: '0.625rem', color: '#88929b' }}>{g.total_score}/100</div>
                  </div>
                  {g.is_locked ? (
                    <span className="sd-grade-status" style={{ color: '#ffb4ab', borderColor: '#ffb4ab', background: 'rgba(255,180,171,0.08)' }}>Locked</span>
                  ) : (
                    <span className="sd-grade-status" style={{ color: '#5de6ff', borderColor: '#5de6ff', background: 'rgba(93,230,255,0.08)' }}>Live</span>
                  )}
                </div>
                {/* Score bar */}
                <div style={{ height: 4, background: '#2d3449', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: col, borderRadius: 2, transition: 'width 0.5s' }} />
                </div>
                {/* Score breakdown */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                  {[['CA', g.ca, 20], ['Mid', g.midterm, 30], ['Final', g.final, 50]].map(([lbl, val, max]) => (
                    <span key={lbl} style={{ fontSize: '0.6875rem', color: '#88929b' }}>
                      <span style={{ color: '#bec8d2', fontWeight: 600 }}>{lbl}:</span> {val}/{max}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   ATTENDANCE TAB
   ================================================================ */
function AttendanceTab() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiClient.get('/api/student/attendance/')
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="sd-loader">Loading attendance…</div>;
  if (!data)   return <div className="sd-empty"><span className="sd-empty-text">Unable to load attendance data.</span></div>;

  const { stats, records, monthly_trend } = data;
  const rate = stats.rate;
  const rateColor = rate == null ? '#88929b' : rate >= 80 ? '#89ceff' : rate >= 60 ? '#ffb786' : '#ffb4ab';
  const rateLabel = rate == null ? '—' : rate >= 80 ? 'Excellent' : rate >= 60 ? 'Fair' : 'At Risk';
  const maxTrend = Math.max(...(monthly_trend.map(m => m.rate)), 1);
  const MONTH_NAMES = { '01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun','07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec' };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#bec8d2' }}>School Attendance</p>
        <h2 style={{ margin: '4px 0 0', fontFamily: 'Manrope', fontWeight: 800, fontSize: '1.5rem', color: '#dae2fd' }}>Attendance Record</h2>
      </div>

      {/* Gauge */}
      <div className="sd-gauge-wrap">
        <p className="sd-gauge-label">Overall Attendance Rate</p>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <AttGauge rate={rate} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="sd-gauge-value" style={{ color: rateColor }}>{rate != null ? `${rate}%` : '—'}</div>
            <div className="sd-gauge-sub" style={{ color: rateColor }}>{rateLabel}</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="sd-stats-grid">
        {[
          { icon: 'check_circle', color: '#5de6ff', label: 'Present', value: stats.present },
          { icon: 'cancel',       color: '#ffb4ab', label: 'Absent',  value: stats.absent },
          { icon: 'schedule',     color: '#bdc2ff', label: 'Late',    value: stats.late },
        ].map(s => (
          <div className="sd-stat-card" key={s.label}>
            <Icon name={s.icon} size={22} style={{ color: s.color }} />
            <div>
              <div className="sd-stat-label">{s.label}</div>
              <div className="sd-stat-value" style={{ color: s.color }}>{s.value ?? 0}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly trend */}
      {monthly_trend.length > 0 && (
        <div className="sd-bar-chart">
          <p className="sd-bar-chart-title">Monthly Trend</p>
          <div className="sd-bars">
            {monthly_trend.map(m => {
              const ht = Math.max(4, (m.rate / maxTrend) * 100);
              const mm = (m.month || '').split('-')[1];
              return (
                <div className="sd-bar-col" key={m.month}>
                  <div className="sd-bar" style={{ height: `${ht}%` }} />
                  <span className="sd-bar-month">{MONTH_NAMES[mm] || mm}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent records */}
      <div className="sd-section-head">
        <h3 className="sd-section-title">Recent Records</h3>
      </div>
      {records.length === 0 ? (
        <div className="sd-empty"><span className="sd-empty-text">No attendance records yet</span></div>
      ) : (
        <div style={{ background: '#171f33', borderRadius: 16, overflow: 'hidden' }}>
          {records.slice(0, 20).map((r, i) => {
            const statusColors = {
              present: { color: '#5de6ff', icon: 'check_circle' },
              absent:  { color: '#ffb4ab', icon: 'cancel' },
              late:    { color: '#bdc2ff', icon: 'schedule' },
              excused: { color: '#ffb786', icon: 'info' },
            };
            const sc = statusColors[r.status] || statusColors.present;
            return (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < records.slice(0,20).length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon name={sc.icon} size={18} style={{ color: sc.color }} />
                  <span style={{ fontSize: '0.875rem', color: '#dae2fd' }}>{formatDate(r.date)}</span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: sc.color, textTransform: 'capitalize' }}>{r.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   SCHEDULE TAB
   ================================================================ */
function ScheduleTab() {
  const [slots,   setSlots]   = useState([]);
  const [selDay,  setSelDay]  = useState(Math.min(todayDayIndex(), 4));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ApiClient.get('/api/student/timetable/')
      .then(d => setSlots(d.slots || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const todayIdx = Math.min(todayDayIndex(), 4);
  const nowMins  = currentMinutes();

  // Build week dates (Mon–Fri of current week)
  const weekDates = (() => {
    const today = new Date();
    const dow = today.getDay(); // 0=Sun
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
    return DAYS.map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.getDate();
    });
  })();

  const daySlots = slots.filter(s => s.day === selDay).sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  const slotStatus = (s) => {
    if (selDay !== todayIdx) return 'normal';
    const start = timeToMinutes(s.start_time), end = timeToMinutes(s.end_time);
    if (nowMins >= start && nowMins < end) return 'active';
    if (nowMins >= end) return 'past';
    return 'normal';
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#bec8d2' }}>Weekly Timetable</p>
        <h2 style={{ margin: '4px 0 0', fontFamily: 'Manrope', fontWeight: 800, fontSize: '1.5rem', color: '#dae2fd' }}>My Schedule</h2>
      </div>

      {/* Day picker */}
      <div className="sd-day-picker">
        {DAYS.map((d, i) => (
          <button key={d} className={`sd-day-btn${selDay === i ? ' active' : ''}`} onClick={() => setSelDay(i)}>
            <span className="sd-day-label">{d}</span>
            <span className="sd-day-num">{weekDates[i]}</span>
            {i === todayIdx && <span className="sd-day-dot" />}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="sd-loader">Loading schedule…</div>
      ) : daySlots.length === 0 ? (
        <div className="sd-empty">
          <Icon name="event_busy" size={48} style={{ opacity: 0.3 }} />
          <span className="sd-empty-text">No classes scheduled for {DAYS[selDay]}</span>
        </div>
      ) : (
        <div>
          {daySlots.map((s, i) => {
            const status = slotStatus(s);
            return (
              <div key={s.id} className={`sd-schedule-slot${status === 'active' ? ' active' : status === 'past' ? ' past' : ''}`}>
                <div className="sd-slot-time">
                  <div className="sd-slot-start">{fmt12(s.start_time)}</div>
                  <div className="sd-slot-end">{fmt12(s.end_time)}</div>
                </div>
                <div className="sd-slot-info">
                  <div className="sd-slot-subject">{s.subject}</div>
                  {s.teacher && <div className="sd-slot-teacher">{s.teacher}</div>}
                </div>
                <div>
                  {status === 'active' && <span className="sd-slot-badge now">Now</span>}
                  {status === 'normal' && i === 0 && selDay === todayIdx && <span className="sd-slot-badge next">Next</span>}
                  <div style={{ fontSize: '0.5625rem', color: '#88929b', textAlign: 'right', marginTop: 4 }}>P{s.period}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   NOTIFICATIONS TAB
   ================================================================ */
function NotificationsTab({ onUnreadChange }) {
  const [notifs,  setNotifs]  = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    ApiClient.get('/api/student/notifications/')
      .then(d => { setNotifs(d.notifications || []); onUnreadChange(d.unread_count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [onUnreadChange]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    await ApiClient.post('/api/student/notifications/', { notification_id: id }).catch(() => {});
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    onUnreadChange(notifs.filter(n => !n.is_read && n.id !== id).length);
  };

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#bec8d2' }}>Updates & Alerts</p>
        <h2 style={{ margin: '4px 0 0', fontFamily: 'Manrope', fontWeight: 800, fontSize: '1.5rem', color: '#dae2fd' }}>Notifications</h2>
      </div>
      {loading ? <div className="sd-loader">Loading…</div>
        : notifs.length === 0 ? (
          <div className="sd-empty">
            <Icon name="notifications_off" size={48} style={{ opacity: 0.3 }} />
            <span className="sd-empty-text">No notifications yet</span>
          </div>
        ) : (
          <div>
            {notifs.map(n => {
              const nc = notifColors(n.type);
              return (
                <div key={n.id} className={`sd-notif-item${!n.is_read ? ' unread' : ''}`}
                  onClick={() => !n.is_read && markRead(n.id)} style={{ cursor: n.is_read ? 'default' : 'pointer' }}>
                  <div className="sd-notif-icon" style={{ background: nc.bg }}>
                    <Icon name={nc.icon} size={18} style={{ color: nc.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="sd-notif-title">{n.title}</div>
                    <div className="sd-notif-body">{n.body}</div>
                    <div className="sd-notif-time">{formatRelative(n.created_at)}</div>
                  </div>
                  {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#89ceff', flexShrink: 0, marginTop: 6 }} />}
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}

/* ================================================================
   PROFILE TAB
   ================================================================ */
function ProfileTab({ profile, onLogout }) {
  const [pwForm,   setPwForm]   = useState({ old: '', new: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError,  setPwError]  = useState('');
  const [pwOk,     setPwOk]     = useState('');
  const [showPw,   setShowPw]   = useState(false);

  const handlePwSave = async () => {
    setPwError(''); setPwOk('');
    if (!pwForm.old || !pwForm.new) { setPwError('All fields required.'); return; }
    if (pwForm.new !== pwForm.confirm) { setPwError('New passwords do not match.'); return; }
    if (pwForm.new.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    setPwSaving(true);
    try {
      await ApiClient.post('/api/student/change-password/', { old_password: pwForm.old, new_password: pwForm.new });
      setPwOk('Password changed successfully!');
      setPwForm({ old: '', new: '', confirm: '' });
    } catch (e) {
      setPwError(e?.message || 'Failed to change password.');
    } finally { setPwSaving(false); }
  };

  if (!profile) return <div className="sd-loader">Loading…</div>;

  const avatarLetters = initials(profile.full_name);
  const genderMap = { M: 'Male', F: 'Female' };

  return (
    <div>
      {/* Profile hero */}
      <div className="sd-profile-hero">
        <div className="sd-profile-avatar-wrap">
          <div className="sd-profile-avatar">
            {profile.passport_picture
              ? <img src={profile.passport_picture} alt={profile.full_name} />
              : avatarLetters}
          </div>
        </div>
        <div className="sd-profile-name">{profile.full_name}</div>
        <div className="sd-profile-sub">{profile.classroom ? `Class ${profile.classroom}` : ''} {profile.school_name ? `• ${profile.school_name}` : ''}</div>
      </div>

      {/* Digital ID Card */}
      <div className="sd-id-card">
        <div className="sd-id-holographic" />
        <div className="sd-id-header">
          <div>
            <div className="sd-id-school-name">{profile.school_name || 'EK-SMS'}</div>
            <div className="sd-id-school-sub">Student Identification</div>
          </div>
          <div className="sd-id-active-badge">
            <span className="sd-id-active-dot" />
            Active
          </div>
        </div>
        <div className="sd-id-body">
          <div className="sd-id-photo">
            {profile.passport_picture
              ? <img src={profile.passport_picture} alt="" />
              : avatarLetters}
          </div>
          <div className="sd-id-info">
            <div className="sd-id-fullname">{profile.full_name}</div>
            <div className="sd-id-class">{profile.classroom ? `Class ${profile.classroom}` : 'No Class Assigned'}</div>
            <div className="sd-id-num-label">Student ID</div>
            <div className="sd-id-num">{profile.admission_number}</div>
          </div>
        </div>
      </div>

      {/* Personal Info */}
      <div className="sd-info-card">
        <h3 className="sd-info-card-title">
          <Icon name="person" size={18} style={{ color: '#5de6ff' }} />
          Personal Information
        </h3>
        {[
          ['Full Name',       profile.full_name],
          ['Email',           profile.email || '—'],
          ['Phone',           profile.phone_number || '—'],
          ['Date of Birth',   profile.date_of_birth ? formatDate(profile.date_of_birth) : '—'],
          ['Gender',          genderMap[profile.gender] || '—'],
          ['Admission No.',   profile.admission_number],
          ['Enrolled',        profile.admission_date ? formatDate(profile.admission_date) : '—'],
          ['Academic Year',   profile.academic_year || '—'],
        ].map(([label, value]) => (
          <div className="sd-info-row" key={label}>
            <span className="sd-info-label">{label}</span>
            <span className="sd-info-value">{value}</span>
          </div>
        ))}
      </div>

      {/* Change Password */}
      <div className="sd-info-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 className="sd-info-card-title" style={{ margin: 0 }}>
            <Icon name="lock" size={18} style={{ color: '#5de6ff' }} />
            Change Password
          </h3>
          <button onClick={() => setShowPw(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#89ceff', fontSize: '0.75rem', fontWeight: 700 }}>
            {showPw ? 'Cancel' : 'Change'}
          </button>
        </div>
        {showPw && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pwError && <div className="sd-error"><Icon name="error" size={16} />{pwError}</div>}
            {pwOk && <div style={{ background: 'rgba(93,230,255,0.1)', border: '1px solid rgba(93,230,255,0.2)', borderRadius: 10, padding: '12px 14px', fontSize: '0.875rem', color: '#5de6ff', display: 'flex', alignItems: 'center', gap: 8 }}><Icon name="check_circle" size={16} />{pwOk}</div>}
            <input className="sd-pw-input" type="password" placeholder="Current password" value={pwForm.old} onChange={e => setPwForm(f => ({ ...f, old: e.target.value }))} />
            <input className="sd-pw-input" type="password" placeholder="New password (min 6 chars)" value={pwForm.new} onChange={e => setPwForm(f => ({ ...f, new: e.target.value }))} />
            <input className="sd-pw-input" type="password" placeholder="Confirm new password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} />
            <button className="sd-btn-primary" disabled={pwSaving} onClick={handlePwSave}>
              <Icon name={pwSaving ? 'hourglass_empty' : 'lock_reset'} size={16} />
              {pwSaving ? 'Saving…' : 'Update Password'}
            </button>
          </div>
        )}
      </div>

      {/* Logout */}
      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <button className="sd-btn-ghost" onClick={onLogout} style={{ color: '#ffb4ab', borderColor: 'rgba(255,180,171,0.2)', background: 'rgba(255,180,171,0.06)' }}>
          <Icon name="logout" size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );
}

/* ================================================================
   ROOT COMPONENT
   ================================================================ */
const TABS = [
  { id: 'home',      icon: 'home',              label: 'Home' },
  { id: 'grades',    icon: 'grade',             label: 'Grades' },
  { id: 'attendance',icon: 'event_available',   label: 'Attendance' },
  { id: 'schedule',  icon: 'calendar_today',    label: 'Schedule' },
  { id: 'profile',   icon: 'account_circle',    label: 'Profile' },
];

export default function StudentDashboard({ onNavigate }) {
  const [tab,         setTab]         = useState('home');
  const [profile,     setProfile]     = useState(null);
  const [stats,       setStats]       = useState({});
  const [recentGrades,setRecentGrades]= useState([]);
  const [loading,     setLoading]     = useState(true);
  const [unread,      setUnread]      = useState(0);

  useEffect(() => {
    ApiClient.get('/api/student/me/')
      .then(d => {
        setProfile(d.student);
        setStats(d.stats || {});
        setRecentGrades(d.recent_grades || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
    onNavigate('login');
  };

  const avatarLetters = profile ? initials(profile.full_name) : '?';

  return (
    <div className="sd-root">
      {/* Top App Bar */}
      <header className="sd-topbar">
        <div className="sd-topbar-left">
          <div className="sd-topbar-avatar">
            {profile?.passport_picture
              ? <img src={profile.passport_picture} alt={profile.full_name} />
              : avatarLetters}
          </div>
          <div>
            <div className="sd-topbar-greeting">{profile?.school_name || 'EK-SMS'}</div>
            <div className="sd-topbar-name">{profile?.first_name || '…'}</div>
          </div>
        </div>
        <div className="sd-topbar-actions">
          <button className="sd-icon-btn" onClick={() => setTab('attendance')} title="Attendance">
            <Icon name="event_available" size={22} />
          </button>
          <button className="sd-icon-btn" onClick={() => setTab('notifications')} title="Notifications" style={{ position: 'relative' }}>
            <Icon name="notifications" size={22} />
            {unread > 0 && <span className="sd-notif-badge" />}
          </button>
        </div>
      </header>

      {/* Page content */}
      <main className="sd-page">
        {loading ? (
          <div className="sd-loader" style={{ paddingTop: 80 }}>Loading your dashboard…</div>
        ) : (
          <>
            {tab === 'home' && (
              <HomeTab
                profile={profile}
                stats={stats}
                recentGrades={recentGrades}
                onGotoGrades={() => setTab('grades')}
                onGotoSchedule={() => setTab('schedule')}
              />
            )}
            {tab === 'grades'      && <GradesTab />}
            {tab === 'attendance'  && <AttendanceTab />}
            {tab === 'schedule'    && <ScheduleTab />}
            {tab === 'notifications' && <NotificationsTab onUnreadChange={setUnread} />}
            {tab === 'profile'     && <ProfileTab profile={profile} onLogout={handleLogout} />}
          </>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="sd-bottom-nav">
        {[...TABS, { id: 'notifications', icon: 'notifications', label: 'Alerts' }].map(t => (
          <button key={t.id} className={`sd-nav-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            <span className="material-symbols-outlined" style={{ position: 'relative' }}>
              {t.icon}
              {t.id === 'notifications' && unread > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: '#5de6ff', border: '2px solid #0b1326' }} />
              )}
            </span>
            <span className="sd-nav-label">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
