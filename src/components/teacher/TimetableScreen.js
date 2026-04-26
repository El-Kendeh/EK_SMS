import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTeacherTimetable } from '../../hooks/useTeacherTimetable';
import { getPeriodsForDay, getPeriodClass, isPeriodNow, getCurrentDay, getWorkloadSummary } from '../../utils/teacherUtils';
import './TimetableScreen.css';

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

  return (
    <div>
      <h1 className="tch-page-title">My Timetable</h1>
      <p className="tch-page-sub">First Term 2024–2025 · AI-Generated Schedule</p>

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
          <div className="tch-period-block period-math tt-legend__item">Mathematics (Core)</div>
          <div className="tch-period-block period-elective tt-legend__item">Mathematics Elective</div>
          <div className="tch-period-block period-duty tt-legend__item">Duty Period</div>
        </div>
      </div>
    </div>
  );
}
