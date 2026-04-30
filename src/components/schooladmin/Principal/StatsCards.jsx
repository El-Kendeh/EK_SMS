import React from 'react';
import { PU_FINANCE_STYLE } from './principal.constants';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Executive KPI cards — 6 compact cards across the top.
 * Total Students · Total Teachers · Active Classes ·
 * Avg Academic % · Attendance Rate % · Financial Status
 */
export default function StatsCards({ summary, loading }) {
  const fs = PU_FINANCE_STYLE[summary.finance] || PU_FINANCE_STYLE.Stable;

  const cards = [
    {
      key: 'students', icon: 'groups', tone: 'primary',
      label: 'Total Students',
      value: summary.totalStudents,
      sub: `${summary.totalClasses} active classes`,
    },
    {
      key: 'teachers', icon: 'school', tone: 'secondary',
      label: 'Total Teachers',
      value: summary.totalTeachers,
      sub: `~${Math.round(summary.totalStudents / Math.max(1, summary.totalTeachers))}:1 ratio`,
    },
    {
      key: 'classes', icon: 'meeting_room', tone: 'cyan',
      label: 'Active Classes',
      value: summary.totalClasses,
      sub: 'Currently in session',
    },
    {
      key: 'academic', icon: 'auto_graph', tone: 'green',
      label: 'Avg Academic',
      value: `${summary.avgAcademic}%`,
      sub: summary.avgAcademic >= 80 ? '↑ Strong performance'
         : summary.avgAcademic >= 70 ? 'On target'
         : '↓ Needs attention',
    },
    {
      key: 'attendance', icon: 'event_available', tone: 'amber',
      label: 'Attendance',
      value: `${summary.avgAttendance}%`,
      sub: summary.avgAttendance >= 90 ? '↑ Excellent'
         : summary.avgAttendance >= 85 ? 'Healthy'
         : '↓ Below target',
    },
    {
      key: 'finance', icon: 'account_balance', tone: 'finance',
      label: 'Financial Status',
      value: summary.finance,
      sub: summary.finance === 'Stable' ? 'Collections on track'
         : summary.finance === 'Needs Attention' ? 'Outstanding fees rising'
         : 'Action required',
      financeColor: fs.color, financeBg: fs.bg,
    },
  ];

  return (
    <div className="pu-stats">
      {cards.map(c => (
        <div key={c.key} className={`pu-stat pu-stat--${c.tone}`}
          style={c.tone === 'finance' ? { '--pu-stat-tone': fs.color } : undefined}>
          <div className="pu-stat__icon">
            <Ic name={c.icon} />
          </div>
          <div className="pu-stat__body">
            <span className="pu-stat__label">{c.label}</span>
            <strong className="pu-stat__value">{loading ? '…' : c.value}</strong>
            <span className="pu-stat__sub">{c.sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
