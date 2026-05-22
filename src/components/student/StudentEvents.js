import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import './StudentEvents.css';

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'exam',     label: 'Exams' },
  { key: 'event',    label: 'Events' },
  { key: 'holiday',  label: 'Holidays' },
  { key: 'deadline', label: 'Deadlines' },
];

const TYPE_META = {
  exam:     { icon: 'quiz',            color: '#EF4444', bg: 'rgba(239,68,68,0.1)',    label: 'Exam'     },
  event:    { icon: 'celebration',     color: '#3B82F6', bg: 'rgba(59,130,246,0.1)',   label: 'Event'    },
  holiday:  { icon: 'beach_access',    color: '#F59E0B', bg: 'rgba(245,158,11,0.1)',   label: 'Holiday'  },
  deadline: { icon: 'pending_actions', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)',  label: 'Deadline' },
};

function getDaysUntil(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today) / 86400000);
}

function formatDateLong(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function getDateParts(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return {
    day: d,
    month: date.toLocaleDateString('en-GB', { month: 'short' }),
  };
}

function EventCard({ event, index }) {
  const meta = TYPE_META[event.type] || TYPE_META.event;
  const days = getDaysUntil(event.date);
  const isPast = days < 0;
  const isToday = days === 0;
  const isSoon = days > 0 && days <= 7;
  const { day, month } = getDateParts(event.date);

  return (
    <motion.div
      className={`sev-card${isPast ? ' sev-card--past' : ''}${isToday ? ' sev-card--today' : ''}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
    >
      <div className="sev-card__date-col">
        <div className="sev-card__month">{month}</div>
        <div className="sev-card__day">{day}</div>
      </div>

      <div className="sev-card__bar" style={{ background: meta.color }} />

      <div className="sev-card__body">
        <div className="sev-card__top-row">
          <span className="sev-card__type-badge" style={{ background: meta.bg, color: meta.color }}>
            <span className="material-symbols-outlined">{meta.icon}</span>
            {meta.label}
          </span>
          {isToday && <span className="sev-pill sev-pill--today">Today</span>}
          {isSoon && !isToday && <span className="sev-pill sev-pill--soon">Soon</span>}
          {isPast && <span className="sev-pill sev-pill--past">Past</span>}
        </div>

        <div className="sev-card__title">{event.title}</div>

        <div className="sev-card__meta">
          {event.time && (
            <span className="sev-card__meta-item">
              <span className="material-symbols-outlined">schedule</span>
              {event.time}{event.endTime ? ` – ${event.endTime}` : ''}
            </span>
          )}
          {event.location && (
            <span className="sev-card__meta-item">
              <span className="material-symbols-outlined">location_on</span>
              {event.location}
            </span>
          )}
        </div>

        {event.notes && <div className="sev-card__notes">{event.notes}</div>}
      </div>

      <div className="sev-card__countdown-col">
        {isPast ? (
          <span className="material-symbols-outlined sev-card__past-icon">check_circle</span>
        ) : isToday ? (
          <div className="sev-card__countdown sev-card__countdown--today" style={{ color: meta.color }}>
            <span className="material-symbols-outlined">today</span>
            TODAY
          </div>
        ) : (
          <div className="sev-card__countdown" style={{ color: isSoon ? '#EF4444' : meta.color }}>
            <span className="sev-card__days-num">{days}</span>
            <span className="sev-card__days-label">days</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function StudentEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const data = await studentApi.getEvents();
      setEvents(data);
    } catch {
      // show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => events.filter(e => filter === 'all' || e.type === filter),
    [events, filter]
  );

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.date.localeCompare(b.date)),
    [filtered]
  );

  const nextExam = useMemo(
    () => events
      .filter(e => e.type === 'exam' && getDaysUntil(e.date) >= 0)
      .sort((a, b) => a.date.localeCompare(b.date))[0] || null,
    [events]
  );

  const upcomingCount = useMemo(
    () => events.filter(e => getDaysUntil(e.date) >= 0).length,
    [events]
  );

  const nextExamDays = nextExam ? getDaysUntil(nextExam.date) : null;

  return (
    <div className="sev">
      {/* Header */}
      <div className="sev__header">
        <div>
          <h1 className="sev__title">School Calendar</h1>
          <p className="sev__sub">
            {loading ? 'Loading…' : `${upcomingCount} upcoming event${upcomingCount !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Next Exam Hero */}
      {!loading && nextExam && (
        <motion.div
          className="sev__next-exam"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="sev__next-exam-glow" />
          <div className="sev__next-exam-content">
            <div className="sev__next-exam-label">
              <span className="material-symbols-outlined">event_upcoming</span>
              Next Exam
            </div>
            <div className="sev__next-exam-title">{nextExam.title}</div>
            <div className="sev__next-exam-meta">
              {nextExam.time && (
                <span>
                  <span className="material-symbols-outlined">schedule</span>
                  {nextExam.time}{nextExam.endTime ? ` – ${nextExam.endTime}` : ''}
                </span>
              )}
              {nextExam.location && (
                <span>
                  <span className="material-symbols-outlined">location_on</span>
                  {nextExam.location}
                </span>
              )}
            </div>
            <div className="sev__next-exam-date">{formatDateLong(nextExam.date)}</div>
          </div>
          <div className="sev__next-exam-countdown">
            <div className="sev__next-exam-days">
              {nextExamDays === 0 ? 'TODAY' : nextExamDays}
            </div>
            {nextExamDays > 0 && (
              <div className="sev__next-exam-days-label">days away</div>
            )}
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="sev__filters">
        {FILTERS.map(f => (
          <button
            key={f.key}
            className={`sev__filter${filter === f.key ? ' sev__filter--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Events list */}
      {loading ? (
        <div className="sev__list">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="sev-card">
              <div className="skeleton" style={{ width: 52, height: 60, borderRadius: 10, flexShrink: 0 }} />
              <div className="sev-card__bar" style={{ background: '#E5E7EB' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton" style={{ height: 14, width: '35%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 18, width: '65%', marginBottom: 8 }} />
                <div className="skeleton" style={{ height: 12, width: '50%' }} />
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="sev__empty">
          <span className="material-symbols-outlined">event_busy</span>
          <p>No {filter === 'all' ? '' : filter + ' '}events found</p>
        </div>
      ) : (
        <div className="sev__list">
          <AnimatePresence>
            {sorted.map((e, i) => (
              <EventCard key={e.id} event={e} index={i} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
