import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import './StudentAttendance.css';

const STATUS_META = {
  present: { label: 'Present', color: 'var(--student-primary)', bg: 'rgba(16,185,129,0.1)', icon: 'check_circle' },
  absent:  { label: 'Absent',  color: 'var(--student-danger)',  bg: 'rgba(239,68,68,0.1)',   icon: 'cancel' },
  tardy:   { label: 'Tardy',   color: '#F59E0B',                bg: 'rgba(245,158,11,0.1)',   icon: 'schedule' },
};

function formatLogDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function StatCard({ label, value, icon, color, bg, delay }) {
  return (
    <motion.div
      className="satd-stat"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <div className="satd-stat__icon-wrap" style={{ background: bg }}>
        <span
          className="material-symbols-outlined satd-stat__icon"
          style={{ color, fontVariationSettings: "'FILL' 1" }}
        >
          {icon}
        </span>
      </div>
      <div className="satd-stat__label">{label}</div>
      <div className="satd-stat__value" style={{ color }}>{value}</div>
    </motion.div>
  );
}

export default function StudentAttendance() {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await studentApi.getAttendance();
      setAttendance(data);
    } catch {
      // show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const rateColor =
    !attendance ? 'var(--student-primary)'
    : attendance.rate >= 85 ? 'var(--student-primary)'
    : attendance.rate >= 70 ? '#F59E0B'
    : 'var(--student-danger)';

  return (
    <div className="satd">
      {/* Header */}
      <div className="satd__header">
        <div>
          <h1 className="satd__title">Attendance Overview</h1>
          <p className="satd__sub">
            {loading ? 'Loading…'
              : `${attendance?.academicYear} · ${attendance?.term}`}
          </p>
        </div>
        {!loading && attendance && (
          <div className="satd__rate-badge" style={{ color: rateColor, background: `${rateColor}15` }}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
              {attendance.rate >= 85 ? 'verified' : attendance.rate >= 70 ? 'warning' : 'error'}
            </span>
            {attendance.rate}% Rate
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="satd__stats">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="satd-stat">
              <div className="skeleton" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 10 }} />
              <div className="skeleton" style={{ height: 36, width: '50%' }} />
            </div>
          ))
        ) : (
          <>
            <StatCard
              label="Present Days"
              value={attendance?.presentDays ?? '--'}
              icon="check_circle"
              color="var(--student-primary)"
              bg="rgba(16,185,129,0.1)"
              delay={0}
            />
            <StatCard
              label="Absent Days"
              value={attendance?.absentDays ?? '--'}
              icon="cancel"
              color="var(--student-danger)"
              bg="rgba(239,68,68,0.1)"
              delay={0.08}
            />
            <StatCard
              label="Tardy"
              value={attendance?.tardyDays ?? '--'}
              icon="schedule"
              color="#F59E0B"
              bg="rgba(245,158,11,0.1)"
              delay={0.16}
            />
          </>
        )}
      </div>

      {/* Attendance rate bar */}
      {!loading && attendance && (
        <motion.div
          className="satd__rate-card"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.24 }}
        >
          <div className="satd__rate-card__header">
            <div>
              <div className="satd__rate-card__label">Overall Attendance Rate</div>
              <div className="satd__rate-card__period">{attendance.totalDays} school days this term</div>
            </div>
            <div className="satd__rate-card__pct" style={{ color: rateColor }}>
              {attendance.rate}%
            </div>
          </div>
          <div className="satd__rate-track">
            <motion.div
              className="satd__rate-fill"
              style={{ background: rateColor }}
              initial={{ width: 0 }}
              animate={{ width: `${attendance.rate}%` }}
              transition={{ duration: 1, delay: 0.4, ease: 'easeOut' }}
            />
          </div>
          <div className="satd__rate-legend">
            <span style={{ color: 'var(--student-primary)' }}>■ Present ({attendance.presentDays})</span>
            <span style={{ color: 'var(--student-danger)' }}>■ Absent ({attendance.absentDays})</span>
            <span style={{ color: '#F59E0B' }}>■ Tardy ({attendance.tardyDays})</span>
          </div>
          {attendance.rate < 85 && (
            <div className="satd__rate-warn">
              <span className="material-symbols-outlined">warning</span>
              Attendance below 85% may affect your academic standing. Contact your academic advisor.
            </div>
          )}
        </motion.div>
      )}

      {/* Recent attendance log */}
      {!loading && attendance?.recentLog?.length > 0 && (
        <div className="satd__log">
          <div className="satd__log-header">
            <div className="satd__section-title">
              <div className="satd__section-title__bar" />
              Recent Attendance Log
            </div>
            <div className="satd__log-legend">
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <span key={key} className="satd__log-legend-item">
                  <span style={{ background: meta.color, width: 8, height: 8, borderRadius: '50%', display: 'inline-block' }} />
                  {meta.label}
                </span>
              ))}
            </div>
          </div>
          <div className="satd__log-grid">
            {attendance.recentLog.map((entry, i) => {
              const meta = STATUS_META[entry.status] || STATUS_META.present;
              return (
                <motion.div
                  key={entry.date}
                  className="satd-log-row"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                >
                  <div className="satd-log-row__date">{formatLogDate(entry.date)}</div>
                  <div className="satd-log-row__status">
                    <span
                      className="satd-log-row__badge"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: 13, fontVariationSettings: "'FILL' 1" }}
                      >
                        {meta.icon}
                      </span>
                      {meta.label}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && !attendance && (
        <div className="satd__empty">
          <span className="material-symbols-outlined">event_busy</span>
          <p>No attendance data available</p>
        </div>
      )}
    </div>
  );
}
