import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacherTimetable } from '../../hooks/useTeacherTimetable';
import { teacherApi } from '../../api/teacherApi';
import { getPeriodsForDay, getPeriodClass, isPeriodNow, getCurrentDay, getWorkloadSummary } from '../../utils/teacherUtils';
import './TimetableScreen.css';

const MOCK_EXAM_DUTIES = [
  { id: 1, exam_name: 'Mid-Term Mathematics Exam',  date: new Date(Date.now() + 3  * 86400000).toISOString().split('T')[0], start_time: '09:00', end_time: '12:00', venue: 'Hall A', class_name: 'Form 3A', subject: 'Mathematics', role: 'Invigilator',  status: 'upcoming' },
  { id: 2, exam_name: 'End-of-Term Science Exam',   date: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0], start_time: '14:00', end_time: '16:00', venue: 'Room 12', class_name: 'Form 4B', subject: 'Science',     role: 'Examiner',    status: 'upcoming' },
  { id: 3, exam_name: 'English Literature Mock',    date: new Date(Date.now() - 5  * 86400000).toISOString().split('T')[0], start_time: '09:00', end_time: '11:00', venue: 'Hall B', class_name: 'Form 3A', subject: 'English',     role: 'Invigilator',  status: 'completed' },
];

function formatExamDate(dateStr) {
  const d    = new Date(dateStr);
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.ceil((d - today) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff > 0)   return `In ${diff} day${diff !== 1 ? 's' : ''} · ${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}`;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

const BLANK_CONSTRAINTS = {
  max_periods_per_day: 6,
  preferred_free_day: '',
  avoid_first_period: false,
  avoid_last_period: false,
  notes: '',
};

const DAYS = [
  { key: 'monday',    short: 'Mon', label: 'Monday' },
  { key: 'tuesday',   short: 'Tue', label: 'Tuesday' },
  { key: 'wednesday', short: 'Wed', label: 'Wednesday' },
  { key: 'thursday',  short: 'Thu', label: 'Thursday' },
  { key: 'friday',    short: 'Fri', label: 'Friday' },
];

export default function TimetableScreen({ navigateTo }) {
  const { timetable, loading } = useTeacherTimetable();
  const today = getCurrentDay();
  const [activeTab, setActiveTab] = useState('schedule'); // 'schedule' | 'exam-duties'
  const [activeDay, setActiveDay] = useState(today === 'saturday' || today === 'sunday' ? 'monday' : today);
  const [showGenerate, setShowGenerate] = useState(false);
  const [constraints, setConstraints] = useState(BLANK_CONSTRAINTS);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);
  const [examDuties, setExamDuties] = useState([]);
  const [loadingDuties, setLoadingDuties] = useState(false);
  const [dutyFilter, setDutyFilter] = useState('upcoming'); // 'upcoming' | 'all'

  useEffect(() => {
    if (activeTab !== 'exam-duties') return;
    setLoadingDuties(true);
    teacherApi.getExamDuties()
      .then(data => {
        const duties = data.duties || [];
        setExamDuties(duties.length > 0 ? duties : MOCK_EXAM_DUTIES);
      })
      .catch(() => setExamDuties(MOCK_EXAM_DUTIES))
      .finally(() => setLoadingDuties(false));
  }, [activeTab]);

  const workload      = timetable ? getWorkloadSummary(timetable.periods) : { teachingHours: 0, teachingPeriods: 0, dutyPeriods: 0 };
  const activePeriods = timetable ? getPeriodsForDay(timetable.periods, activeDay) : [];

  const handleGenerate = async () => {
    setGenerating(true);
    setGenResult(null);
    try {
      const result = await teacherApi.generateTimetable(constraints);
      setGenResult(result);
    } catch {
      setGenResult({ success: false, error: 'Could not reach the server. Please try again.' });
    } finally {
      setGenerating(false);
    }
  };

  const upcomingDuties  = examDuties.filter(d => d.status !== 'completed');
  const filteredDuties  = dutyFilter === 'upcoming' ? upcomingDuties : examDuties;

  return (
    <div>
      <h1 className="tch-page-title">My Timetable</h1>
      <p className="tch-page-sub">Your weekly teaching schedule and exam duties</p>

      {/* Tab switcher */}
      <div className="tt-tab-bar">
        <button
          className={`tt-tab ${activeTab === 'schedule' ? 'tt-tab--active' : ''}`}
          onClick={() => setActiveTab('schedule')}>
          <span className="material-symbols-outlined">calendar_today</span>
          Weekly Schedule
        </button>
        <button
          className={`tt-tab ${activeTab === 'exam-duties' ? 'tt-tab--active' : ''}`}
          onClick={() => setActiveTab('exam-duties')}>
          <span className="material-symbols-outlined">fact_check</span>
          Exam Duties
          {upcomingDuties.length > 0 && (
            <span className="tt-tab-badge">{upcomingDuties.length}</span>
          )}
        </button>
      </div>

      {/* ── EXAM DUTIES tab ──────────────────────────────────────── */}
      {activeTab === 'exam-duties' && (
        <AnimatePresence mode="wait">
          <motion.div key="exam-duties"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

            <div className="tt-duties-header">
              <div className="tch-stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
                <div className="tch-stat-card">
                  <p className="tch-stat-card__label">Upcoming Duties</p>
                  <p className="tch-stat-card__value">{upcomingDuties.length.toString().padStart(2,'0')}</p>
                  <p className="tch-stat-card__sub tch-stat-card__sub--amber">
                    <span className="material-symbols-outlined">schedule</span>Scheduled
                  </p>
                </div>
                <div className="tch-stat-card">
                  <p className="tch-stat-card__label">Invigilating</p>
                  <p className="tch-stat-card__value">
                    {upcomingDuties.filter(d => d.role === 'Invigilator' || d.role === 'invigilator').length.toString().padStart(2,'0')}
                  </p>
                  <p className="tch-stat-card__sub">
                    <span className="material-symbols-outlined">visibility</span>Exams
                  </p>
                </div>
                <div className="tch-stat-card">
                  <p className="tch-stat-card__label">Examining</p>
                  <p className="tch-stat-card__value">
                    {upcomingDuties.filter(d => d.role === 'Examiner' || d.role === 'examiner').length.toString().padStart(2,'0')}
                  </p>
                  <p className="tch-stat-card__sub">
                    <span className="material-symbols-outlined">assignment</span>Exams
                  </p>
                </div>
              </div>

              <div className="tt-duties-filters">
                <button
                  className={`tch-btn tch-btn--sm ${dutyFilter === 'upcoming' ? 'tch-btn--primary' : 'tch-btn--ghost'}`}
                  onClick={() => setDutyFilter('upcoming')}>
                  Upcoming
                </button>
                <button
                  className={`tch-btn tch-btn--sm ${dutyFilter === 'all' ? 'tch-btn--primary' : 'tch-btn--ghost'}`}
                  onClick={() => setDutyFilter('all')}>
                  All Duties
                </button>
              </div>
            </div>

            {loadingDuties ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[0,1,2].map(i => <div key={i} className="tch-skeleton" style={{ height: 100 }} />)}
              </div>
            ) : filteredDuties.length === 0 ? (
              <div className="tch-empty" style={{ padding: '40px 0' }}>
                <span className="material-symbols-outlined">event_available</span>
                <p>No {dutyFilter === 'upcoming' ? 'upcoming ' : ''}exam duties assigned</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredDuties.map((duty, i) => {
                  const isUpcoming  = duty.status !== 'completed';
                  const isToday     = duty.date === new Date().toISOString().split('T')[0];
                  const isTomorrow  = duty.date === new Date(Date.now() + 86400000).toISOString().split('T')[0];
                  return (
                    <motion.div key={duty.id}
                      className={`tch-card tt-duty-card ${isToday ? 'tt-duty-card--today' : ''} ${!isUpcoming ? 'tt-duty-card--done' : ''}`}
                      initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}>
                      <div className="tt-duty-card__left">
                        <div className="tt-duty-date-col">
                          <p className="tt-duty-date">{isToday ? 'TODAY' : isTomorrow ? 'TMRW' : new Date(duty.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase()}</p>
                          <p className="tt-duty-time">{duty.start_time}</p>
                        </div>
                        <div className="tt-duty-info">
                          <p className="tt-duty-name">{duty.exam_name}</p>
                          <div className="tt-duty-meta">
                            <span className="tch-chip">
                              <span className="material-symbols-outlined">meeting_room</span>{duty.venue}
                            </span>
                            {duty.class_name && (
                              <span className="tch-chip">
                                <span className="material-symbols-outlined">groups</span>{duty.class_name}
                              </span>
                            )}
                            <span className="tch-chip">
                              <span className="material-symbols-outlined">schedule</span>
                              {duty.start_time} – {duty.end_time}
                            </span>
                          </div>
                          <p className="tt-duty-countdown">{formatExamDate(duty.date)}</p>
                        </div>
                      </div>
                      <div className="tt-duty-card__right">
                        <span className={`tch-badge ${duty.role?.toLowerCase() === 'invigilator' ? 'tch-badge--blue' : 'tch-badge--primary'}`}>
                          {duty.role}
                        </span>
                        {!isUpcoming && (
                          <span className="tch-badge tch-badge--green" style={{ marginTop: 6, display: 'flex' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check</span>Done
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* ── SCHEDULE tab ─────────────────────────────────────────── */}
      {activeTab === 'schedule' && (
      <AnimatePresence mode="wait">
        <motion.div key="schedule"
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0,1,2,3].map(i => <div key={i} className="tch-skeleton" style={{ height: 80 }} />)}
        </div>
      ) : !timetable ? (
        <div className="tch-empty" style={{ padding: '40px 0' }}>
          <span className="material-symbols-outlined">calendar_today</span>
          <p>No timetable available yet</p>
        </div>
      ) : (<>

      {/* Workload summary */}
      <div className="tch-stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 20 }}>
        <div className="tch-stat-card">
          <p className="tch-stat-card__label">Teaching Hours</p>
          <p className="tch-stat-card__value">{workload.teachingHours}</p>
          <p className="tch-stat-card__sub tch-stat-card__sub--primary">
            <span className="material-symbols-outlined">schedule</span>Per week
          </p>
        </div>
        <div className="tch-stat-card">
          <p className="tch-stat-card__label">Teaching Periods</p>
          <p className="tch-stat-card__value">{workload.teachingPeriods}</p>
          <p className="tch-stat-card__sub">
            <span className="material-symbols-outlined">school</span>This week
          </p>
        </div>
        <div className="tch-stat-card">
          <p className="tch-stat-card__label">Duty Periods</p>
          <p className="tch-stat-card__value">{workload.dutyPeriods}</p>
          <p className="tch-stat-card__sub">
            <span className="material-symbols-outlined">assignment</span>Supervision
          </p>
        </div>
      </div>

      {/* AI Generate panel */}
      <div className="tt-generate-wrap">
        <button
          className="tt-generate-toggle"
          onClick={() => { setShowGenerate(p => !p); setGenResult(null); }}
        >
          <span className="material-symbols-outlined">auto_awesome</span>
          AI Timetable Suggestion
          <span className="material-symbols-outlined tt-generate-chevron" style={{ transform: showGenerate ? 'rotate(180deg)' : 'none' }}>
            expand_more
          </span>
        </button>

        <AnimatePresence>
          {showGenerate && (
            <motion.div
              className="tt-generate-panel"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="tt-generate-body">
                <p className="tt-generate-hint">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
                  Set your preferences and click "Generate Suggestion". The admin reviews and finalises the timetable.
                </p>

                <div className="tt-generate-fields">
                  <div>
                    <label className="tch-label">Max periods per day</label>
                    <select
                      className="tch-select"
                      value={constraints.max_periods_per_day}
                      onChange={e => setConstraints(p => ({ ...p, max_periods_per_day: Number(e.target.value) }))}
                    >
                      {[3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="tch-label">Preferred free day</label>
                    <select
                      className="tch-select"
                      value={constraints.preferred_free_day}
                      onChange={e => setConstraints(p => ({ ...p, preferred_free_day: e.target.value }))}
                    >
                      <option value="">No preference</option>
                      {DAYS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="tt-generate-checks">
                  <label className="tt-check-label">
                    <input
                      type="checkbox"
                      checked={constraints.avoid_first_period}
                      onChange={e => setConstraints(p => ({ ...p, avoid_first_period: e.target.checked }))}
                      style={{ accentColor: 'var(--tch-primary)' }}
                    />
                    Avoid first period (0800–0900)
                  </label>
                  <label className="tt-check-label">
                    <input
                      type="checkbox"
                      checked={constraints.avoid_last_period}
                      onChange={e => setConstraints(p => ({ ...p, avoid_last_period: e.target.checked }))}
                      style={{ accentColor: 'var(--tch-primary)' }}
                    />
                    Avoid last period
                  </label>
                </div>

                <div>
                  <label className="tch-label">Additional notes</label>
                  <textarea
                    className="tch-textarea"
                    rows={2}
                    placeholder="Any other scheduling preferences..."
                    value={constraints.notes}
                    onChange={e => setConstraints(p => ({ ...p, notes: e.target.value }))}
                    maxLength={300}
                  />
                </div>

                {genResult && (
                  <motion.div
                    className={`tt-gen-result ${genResult.success ? 'tt-gen-result--success' : 'tt-gen-result--error'}`}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="material-symbols-outlined">
                      {genResult.success ? 'check_circle' : 'error'}
                    </span>
                    <div>
                      {genResult.success
                        ? <p style={{ margin: 0, fontWeight: 600 }}>Suggestion submitted for admin review.</p>
                        : <p style={{ margin: 0 }}>{genResult.error || 'Generation failed. Please try again.'}</p>
                      }
                      {genResult.conflicts?.length > 0 && (
                        <ul className="tt-gen-conflicts">
                          {genResult.conflicts.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                )}

                <button
                  className="tch-btn tch-btn--primary"
                  onClick={handleGenerate}
                  disabled={generating}
                  style={{ alignSelf: 'flex-start' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {generating ? 'sync' : 'auto_awesome'}
                  </span>
                  {generating ? 'Generating…' : 'Generate Suggestion'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Day selector */}
      <div className="tt-day-tabs">
        {DAYS.map(d => {
          const isToday = d.key === today;
          const dayPeriods = getPeriodsForDay(timetable.periods, d.key);
          return (
            <button
              key={d.key}
              className={`tt-day-tab ${activeDay === d.key ? 'tt-day-tab--active' : ''} ${isToday ? 'tt-day-tab--today' : ''}`}
              onClick={() => setActiveDay(d.key)}
            >
              <span className="tt-day-tab__short">{d.short}</span>
              <span className="tt-day-tab__count">{dayPeriods.length}</span>
              {isToday && <span className="tt-day-tab__today-dot" />}
            </button>
          );
        })}
      </div>

      {/* Period list */}
      <div className="tt-periods">
        {activePeriods.length === 0 ? (
          <div className="tch-empty" style={{ padding: '40px 0' }}>
            <span className="material-symbols-outlined">free_cancellation</span>
            <p>No periods on {DAYS.find(d => d.key === activeDay)?.label}</p>
          </div>
        ) : (
          activePeriods.map((period, i) => {
            const isNow = isPeriodNow(period);
            const cls = getPeriodClass(period);
            return (
              <motion.div
                key={period.id}
                className={`tch-period-block ${cls} ${isNow ? 'tt-period--now' : ''}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                {isNow && <span className="tch-period-block__now-badge">Now</span>}
                <div className="tt-period-content">
                  <div className="tt-period-time">
                    <span className="tt-period-start">{period.startTime}</span>
                    <span className="tt-period-end"> – {period.endTime}</span>
                  </div>
                  <div className="tt-period-info">
                    <p className="tch-period-block__subject">{period.subject}</p>
                    <div className="tch-period-block__meta">
                      {period.class && (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>groups</span>
                          {period.class}
                          <span>·</span>
                        </>
                      )}
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>meeting_room</span>
                      {period.room}
                      {period.type === 'duty' && (
                        <span className="tch-badge tch-badge--amber" style={{ marginLeft: 6 }}>Duty</span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="tt-legend">
        <p className="tt-legend__label">Key</p>
        <div className="tt-legend__items">
          <div className="tch-period-block period-math tt-legend__item">Teaching Period</div>
          <div className="tch-period-block period-elective tt-legend__item">Elective Period</div>
          <div className="tch-period-block period-duty tt-legend__item">Duty Period</div>
        </div>
      </div>

      </>)} {/* end loading/timetable guard */}

        </motion.div>
      </AnimatePresence>
      )} {/* end schedule tab */}

    </div>
  );
}
