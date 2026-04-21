import { useState } from 'react';
import { motion } from 'framer-motion';
import { useParentChildren } from '../../hooks/useParentChildren';
import { getChildColors, formatDate } from '../../utils/parentUtils';
import { mockAttendanceByChild } from '../../mock/parentMockData';
import './ParentAttendance.css';

const STATUS_META = {
  present: { label: 'Verified',     color: 'success', icon: 'verified' },
  late:    { label: 'Late Entry',   color: 'warning', icon: 'warning' },
  absent:  { label: 'Absence',      color: 'danger',  icon: 'cancel' },
};

export default function ParentAttendance() {
  const { children } = useParentChildren();
  const [selectedChildId, setSelectedChildId] = useState(null);

  const activeChild = children.find((c) => c.id === selectedChildId) || children[0];
  const data = mockAttendanceByChild[activeChild?.id] || { rate: 0, days: [], logs: [], present: 0, late: 0, absent: 0, total: 0 };

  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="par-attend">
      {/* Breadcrumb + header */}
      <div className="par-attend__top">
        <div>
          <nav className="par-attend__breadcrumb">
            <span>Records</span><span>/</span><span className="par-attend__breadcrumb--active">Attendance Audit</span>
          </nav>
          <h1 className="par-page-header__title">{data.month || 'Attendance'}</h1>
          <p className="par-page-header__sub">Detailed attendance verification. All records are immutable and cryptographically signed.</p>
        </div>
        <div className="par-attend__rate-chip">
          <div className="par-attend__rate-icon">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          </div>
          <div>
            <p className="par-attend__rate-label">Attendance Rate</p>
            <p className="par-attend__rate-value">{data.rate}%</p>
          </div>
        </div>
      </div>

      {/* Child selector */}
      {children.length > 1 && (
        <div className="par-child-tabs" style={{ marginBottom: 24 }}>
          {children.map((child, idx) => {
            const colors = getChildColors(child.colorIndex ?? idx);
            const isActive = (selectedChildId || children[0]?.id) === child.id;
            return (
              <button key={child.id}
                className={`par-child-tab ${isActive ? 'par-child-tab--active' : ''}`}
                onClick={() => setSelectedChildId(child.id)}>
                <span className="par-child-tab__dot" style={{ background: colors.bg }} />
                {child.fullName.split(' ')[0]}
              </button>
            );
          })}
        </div>
      )}

      {/* Summary stat strip */}
      <div className="par-attend__stats">
        {[
          { label: 'Present', value: data.present, color: 'success' },
          { label: 'Late',    value: data.late,    color: 'warning' },
          { label: 'Absent',  value: data.absent,  color: 'danger' },
          { label: 'Total School Days', value: data.total, color: 'muted' },
        ].map((s) => (
          <div key={s.label} className={`par-attend__stat par-attend__stat--${s.color}`}>
            <span className="par-attend__stat-val">{s.value}</span>
            <span className="par-attend__stat-label">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="par-attend__grid">
        {/* Calendar + integrity card */}
        <div className="par-attend__left">
          <div className="par-card par-card--pad par-attend__calendar">
            <div className="par-attend__cal-header">
              <h3 className="par-attend__cal-title">Monthly Ledger</h3>
              <div className="par-attend__cal-nav">
                <button><span className="material-symbols-outlined">chevron_left</span></button>
                <button><span className="material-symbols-outlined">chevron_right</span></button>
              </div>
            </div>

            {/* Day labels */}
            <div className="par-attend__cal-grid">
              {dayLabels.map((d) => (
                <div key={d} className="par-attend__cal-day-label">{d}</div>
              ))}
              {/* Day cells */}
              {data.days.map((d, idx) => {
                if (!d.day) return <div key={idx} className="par-attend__cal-cell par-attend__cal-cell--empty" />;
                if (d.status === 'weekend') return (
                  <div key={idx} className="par-attend__cal-cell par-attend__cal-cell--weekend">
                    <span>{d.day}</span>
                  </div>
                );
                return (
                  <motion.div key={idx}
                    className={`par-attend__cal-cell par-attend__cal-cell--${d.status}`}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.95 }}>
                    <span>{d.day}</span>
                    <div className="par-attend__cal-dot" />
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Integrity banner */}
          <div className="par-attend__integrity">
            <span className="material-symbols-outlined par-attend__integrity-bg">shield</span>
            <div className="par-attend__integrity-inner">
              <span className="par-attend__integrity-chip">System Verification</span>
              <h4 className="par-attend__integrity-title">Ledger Integrity Confirmed</h4>
              <p className="par-attend__integrity-text">
                This attendance record is cryptographically tied to the main student ledger.
                No unauthorized modifications have been detected for the current academic period.
              </p>
              <button className="par-attend__integrity-btn">View Blockchain Hash</button>
            </div>
          </div>
        </div>

        {/* Logs sidebar */}
        <div className="par-attend__right par-card">
          <div className="par-attend__logs-header">
            <h3 className="par-attend__logs-title">Recent Logs</h3>
            <span className="material-symbols-outlined" style={{ color: 'var(--par-text-secondary)', fontSize: 20 }}>filter_list</span>
          </div>
          <div className="par-attend__logs-list">
            {data.logs.map((log, idx) => {
              const meta = STATUS_META[log.status] || STATUS_META.present;
              return (
                <motion.div key={idx}
                  className={`par-attend__log par-attend__log--${meta.color}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}>
                  <div className="par-attend__log-top">
                    <span className="par-attend__log-date">{formatDate(log.date)}</span>
                    <span className={`par-attend__log-badge par-attend__log-badge--${meta.color}`}>
                      <span className="material-symbols-outlined" style={{ fontSize: 11, fontVariationSettings: "'FILL' 1" }}>{meta.icon}</span>
                      {meta.label}
                    </span>
                  </div>
                  <h4 className="par-attend__log-title">{log.title}</h4>
                  <p className="par-attend__log-detail">{log.detail}</p>
                  <div className="par-attend__log-method">
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>sensors</span>
                    {log.method}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
