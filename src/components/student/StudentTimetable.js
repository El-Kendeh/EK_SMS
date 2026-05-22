import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import './StudentTimetable.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' };

function getTodayName() {
  const d = new Date().getDay();
  return { 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday', 4: 'Thursday', 5: 'Friday' }[d] || null;
}

function getWeekDates() {
  const today = new Date();
  const dow = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  return DAYS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.getDate();
  });
}

function SlotCard({ slot, isNow }) {
  if (slot.isBreak) {
    return (
      <div className="stt-slot stt-slot--break">
        <div className="stt-slot__break-time">{slot.time} – {slot.endTime}</div>
        <div className="stt-slot__break-label">
          <span className="material-symbols-outlined">coffee</span>
          {slot.subject}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className={`stt-slot ${isNow ? 'stt-slot--now' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {isNow && (
        <div className="stt-slot__in-progress">
          <span className="stt-slot__pulse" />
          In Progress
        </div>
      )}

      <div className="stt-slot__time-col">
        <span className="stt-slot__time">{slot.time}</span>
        <span className="stt-slot__time-end">{slot.endTime}</span>
      </div>

      <div className="stt-slot__bar" style={{ background: slot.color }} />

      <div className="stt-slot__body">
        <div className="stt-slot__subject-row">
          <div className="stt-slot__icon" style={{ background: `${slot.color}18` }}>
            <span className="material-symbols-outlined" style={{ color: slot.color, fontSize: 18 }}>
              {slot.icon}
            </span>
          </div>
          <div className="stt-slot__subject">{slot.subject}</div>
        </div>
        <div className="stt-slot__details">
          <span className="stt-slot__detail">
            <span className="material-symbols-outlined">person</span>
            {slot.teacher}
          </span>
          <span className="stt-slot__detail">
            <span className="material-symbols-outlined">door_open</span>
            {slot.room}
          </span>
        </div>
      </div>

      {slot.link && (
        <a
          href={slot.link}
          target="_blank"
          rel="noopener noreferrer"
          className="stt-slot__join"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="material-symbols-outlined">videocam</span>
          Join
        </a>
      )}
    </motion.div>
  );
}

export default function StudentTimetable() {
  const todayName = getTodayName();
  const weekDates = getWeekDates();
  const [activeDay, setActiveDay] = useState(todayName || 'Monday');
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await studentApi.getTimetable();
      setTimetable(data);
    } catch {
      // show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const slots = timetable?.[activeDay] || [];
  const now = new Date();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isToday = activeDay === todayName;

  const daySlots = slots.filter((s) => !s.isBreak);
  const totalClasses = daySlots.length;
  const hasLinks = daySlots.some((s) => s.link);

  // Tomorrow's Focus — first class of next day after activeDay
  const activeDayIdx = DAYS.indexOf(activeDay);
  const tomorrowDay = activeDayIdx < 4 ? DAYS[activeDayIdx + 1] : null;
  const tomorrowLabel = tomorrowDay ? DAY_SHORT[tomorrowDay] : null;
  const tomorrowFirst = tomorrowDay
    ? (timetable?.[tomorrowDay] || []).filter((s) => !s.isBreak)[0] || null
    : null;

  return (
    <div className="stt">
      {/* Page header */}
      <div className="stt__header">
        <div>
          <h1 className="stt__title">Class Timetable</h1>
          <p className="stt__sub">
            {totalClasses} class{totalClasses !== 1 ? 'es' : ''} scheduled
            {hasLinks ? ' · Online links available' : ''}
          </p>
        </div>
        {todayName && (
          <div className="stt__today-badge">
            <span className="material-symbols-outlined">today</span>
            Today is {todayName}
          </div>
        )}
      </div>

      {/* Day tabs with date numbers */}
      <div className="stt__tabs">
        {DAYS.map((day, i) => (
          <button
            key={day}
            className={`stt__tab ${activeDay === day ? 'stt__tab--active' : ''} ${day === todayName ? 'stt__tab--today' : ''}`}
            onClick={() => setActiveDay(day)}
          >
            <span className="stt__tab-label">{DAY_SHORT[day]}</span>
            <span className="stt__tab-date">{weekDates[i]}</span>
            {day === todayName && <span className="stt__tab-dot" />}
          </button>
        ))}
      </div>

      {/* Schedule list */}
      <div className="stt__schedule">
        {loading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} className="stt-slot">
              <div className="skeleton" style={{ width: 52, height: 40, borderRadius: 8 }} />
              <div className="stt-slot__bar" style={{ background: '#E5E7EB' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: '40%' }} />
              </div>
            </div>
          ))
        ) : slots.length === 0 ? (
          <div className="stt__empty">
            <span className="material-symbols-outlined">event_busy</span>
            <p>No classes scheduled for {activeDay}</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeDay}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {slots.map((slot) => {
                const isNow = isToday && !slot.isBreak &&
                  hhmm >= slot.time && hhmm < slot.endTime;
                return <SlotCard key={slot.id} slot={slot} isNow={isNow} />;
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Tomorrow's Focus card */}
      {!loading && tomorrowFirst && (
        <div className="stt__tomorrow">
          <div className="stt__tomorrow-glow" />
          <div className="stt__tomorrow-content">
            <div className="stt__tomorrow-label">
              <span className="material-symbols-outlined">wb_sunny</span>
              {tomorrowLabel}'s Focus
            </div>
            <div className="stt__tomorrow-subject">{tomorrowFirst.subject}</div>
            <div className="stt__tomorrow-meta">
              <span>
                <span className="material-symbols-outlined">schedule</span>
                {tomorrowFirst.time} – {tomorrowFirst.endTime}
              </span>
              {tomorrowFirst.room && (
                <span>
                  <span className="material-symbols-outlined">location_on</span>
                  {tomorrowFirst.room}
                </span>
              )}
              {tomorrowFirst.teacher && (
                <span>
                  <span className="material-symbols-outlined">person</span>
                  {tomorrowFirst.teacher}
                </span>
              )}
            </div>
          </div>
          {tomorrowFirst.link && (
            <a
              href={tomorrowFirst.link}
              target="_blank"
              rel="noopener noreferrer"
              className="stt__tomorrow-join"
            >
              <span className="material-symbols-outlined">videocam</span>
              Join Class
            </a>
          )}
        </div>
      )}

      {/* Legend */}
      {!loading && (
        <div className="stt__legend">
          <span className="stt__legend-item">
            <span className="stt__legend-dot" style={{ background: 'var(--student-primary)' }} />
            Current class
          </span>
          <span className="stt__legend-item">
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: '#3B82F6' }}>videocam</span>
            Online class
          </span>
          <span className="stt__legend-item">
            <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--student-text-secondary)' }}>coffee</span>
            Break
          </span>
        </div>
      )}
    </div>
  );
}
