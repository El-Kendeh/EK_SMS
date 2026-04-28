import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacherTimetable } from '../../hooks/useTeacherTimetable';
import { teacherApi } from '../../api/teacherApi';
import { getPeriodsForDay, getPeriodClass, isPeriodNow, getCurrentDay, getWorkloadSummary } from '../../utils/teacherUtils';
import './TimetableScreen.css';

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
  const [activeDay, setActiveDay] = useState(today === 'saturday' || today === 'sunday' ? 'monday' : today);
  const [showGenerate, setShowGenerate] = useState(false);
  const [constraints, setConstraints] = useState(BLANK_CONSTRAINTS);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState(null);

  if (loading) {
    return (
      <div>
        <h1 className="tch-page-title">My Timetable</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
          {[0,1,2,3].map(i => <div key={i} className="tch-skeleton" style={{ height: 80 }} />)}
        </div>
      </div>
    );
  }

  if (!timetable) {
    return (
      <div>
        <h1 className="tch-page-title">My Timetable</h1>
        <div className="tch-empty">
          <span className="material-symbols-outlined">calendar_today</span>
          <p>No timetable available</p>
        </div>
      </div>
    );
  }

  const workload = getWorkloadSummary(timetable.periods);
  const activePeriods = getPeriodsForDay(timetable.periods, activeDay);

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

  return (
    <div>
      <h1 className="tch-page-title">My Timetable</h1>
      <p className="tch-page-sub">Your weekly teaching schedule</p>

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
    </div>
  );
}
