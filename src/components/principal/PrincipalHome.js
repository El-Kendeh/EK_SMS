import React from 'react';
import { usePrincipalDashboard } from '../../hooks/usePrincipalDashboard';

import StatsCards      from '../schooladmin/Principal/StatsCards';
import HealthScoreCard from '../schooladmin/Principal/HealthScoreCard';
import ClassPerformance from '../schooladmin/Principal/ClassPerformance';
import TeacherPanel    from '../schooladmin/Principal/TeacherPanel';
import FinancePanel    from '../schooladmin/Principal/FinancePanel';
import AlertsPanel     from '../schooladmin/Principal/AlertsPanel';
import InsightsPanel   from '../schooladmin/Principal/InsightsPanel';
import ActivityFeed    from '../schooladmin/Principal/ActivityFeed';

import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css';
import './PrincipalHome.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const PRC_QUICK_ACTIONS = [
  { key: 'grade-approvals',      label: 'Grade Approvals',  icon: 'fact_check',          tone: 'primary',   target: 'grade-approvals' },
  { key: 'report-card-approval', label: 'Report Cards',     icon: 'description',         tone: 'secondary', target: 'report-card-approval' },
  { key: 'syllabus-progress',    label: 'Syllabus Progress',icon: 'menu_book',           tone: 'tertiary',  target: 'syllabus-progress' },
  { key: 'principal-users',      label: 'Leadership Team',  icon: 'admin_panel_settings',tone: 'green',     target: 'principal-users' },
  { key: 'expenses',             label: 'Expense Approvals',icon: 'receipt_long',        tone: 'tertiary',  target: 'expenses' },
  { key: 'principal-announcements', label: 'Announcements', icon: 'campaign',            tone: 'primary',   target: 'principal-announcements' },
];

function PrincipalHomeInner({ navigateTo }) {
  const {
    loading, error, overview, dashboard,
    classPerf, teacherData, financeData, activityItems, syllabus,
  } = usePrincipalDashboard();

  // Pre-load defaults are honest "no data" states, not fake zeros/greens.
  const summary = dashboard || {
    totalStudents: 0, totalTeachers: 0, totalClasses: 0,
    avgAcademic: 0, avgAttendance: 0, finance: null, financeRate: null, healthScore: 0,
    totalGradeMods: 0, totalAtRisk: 0, totalFinAnom: 0, totalLowAttend: 0,
  };
  const cp = classPerf || { top: [], low: [] };
  const td = teacherData || { overloaded: null, underperforming: null, pendingGrades: 0, totalTeachers: 0 };
  const fd = financeData || { has_data: false, transactions: [] };
  const subjects = syllabus?.subjects || [];

  const pendingGradeMods = Math.max(summary.totalGradeMods || 0, overview?.metrics?.pending_grade_changes || 0);

  const alerts = [];
  if (pendingGradeMods > 0) {
    alerts.push({
      key: 'grades', tone: 'critical', icon: 'edit_note',
      title: `${pendingGradeMods} grade modification${pendingGradeMods !== 1 ? 's' : ''} pending review`,
      detail: 'Open Grade Approvals to review and act.',
    });
  }
  /* Threshold matches the At-Risk page (any flagged student appears there) —
     the old >5 cutoff meant the page could show students the home card denied. */
  if ((summary.totalAtRisk || 0) > 0) {
    alerts.push({
      key: 'atrisk', tone: 'warning', icon: 'trending_down',
      title: `${summary.totalAtRisk} student${summary.totalAtRisk !== 1 ? 's' : ''} at academic risk`,
      detail: 'Open the At-Risk panel to see who and why.',
      onClick: () => navigateTo('principal-at-risk'),
    });
  }
  if ((summary.totalFinAnom || 0) > 0) {
    alerts.push({
      key: 'finanom', tone: 'critical', icon: 'account_balance',
      title: 'Financial anomaly detected',
      detail: `${summary.totalFinAnom} unusual transaction${summary.totalFinAnom !== 1 ? 's' : ''} in last 24h.`,
    });
  }
  if ((summary.totalLowAttend || 0) > 0) {
    alerts.push({
      key: 'lowatt', tone: 'warning', icon: 'event_busy',
      title: 'Low attendance classes',
      detail: `${summary.totalLowAttend} class${summary.totalLowAttend !== 1 ? 'es' : ''} below 85% attendance.`,
    });
  }

  const insights = [];
  if (summary.avgAcademic < 75) insights.push('Consider a curriculum review for underperforming classes.');
  if (summary.avgAttendance < 88) insights.push('Attendance dropping — schedule home visits.');
  if ((summary.totalAtRisk || 0) > 8) insights.push(`${summary.totalAtRisk} students at risk — convene a support meeting.`);
  if (summary.finance && summary.finance !== 'Stable') insights.push('Finance status is unstable — review collections this week.');
  if (insights.length === 0) insights.push('All key metrics within target. Keep monitoring trend lines.');

  if (error) {
    return (
      <div className="pu-page">
        <div className="pu-empty">
          <Ic name="error" size="xl" style={{ color: 'var(--ska-error)' }} />
          <p className="pu-empty__title">Couldn't load dashboard</p>
          <p className="pu-empty__desc">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pu-page prc-home">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Principal Command Center</h1>
          <p className="ska-page-sub">School-wide oversight, approvals, and insights</p>
        </div>
      </div>

      <StatsCards summary={summary} loading={loading} />
      <HealthScoreCard summary={summary} loading={loading} />

      <div className="pu-two-col">
        <div className="pu-two-col__left">
          <ClassPerformance data={cp} onSelect={() => navigateTo('principal-at-risk')} />
          <TeacherPanel data={td} />
        </div>
        <div className="pu-two-col__right">
          <AlertsPanel alerts={alerts} />
          <InsightsPanel insights={insights} />
        </div>
      </div>

      <div className="pu-two-col">
        <div className="pu-two-col__left">
          <FinancePanel data={fd} />
        </div>
        <div className="pu-two-col__right">
          <div className="pu-card pu-quick">
            <div className="pu-card__head">
              <div className="pu-card__title">
                <Ic name="bolt" size="sm" />
                <strong>Quick Actions</strong>
              </div>
              <span className="pu-card__sub">Frequently used</span>
            </div>
            <div className="pu-quick__grid">
              {PRC_QUICK_ACTIONS.map(a => (
                <button key={a.key} type="button"
                  className={`pu-quick__btn pu-quick__btn--${a.tone}`}
                  onClick={() => navigateTo(a.target)}>
                  <div className="pu-quick__icon"><Ic name={a.icon} /></div>
                  <span>{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Syllabus Progress */}
      <div className="pu-card prc-syllabus">
        <div className="pu-card__head">
          <div className="pu-card__title">
            <Ic name="menu_book" size="sm" />
            <strong>Syllabus Progress</strong>
          </div>
          <button type="button" className="pu-card__action" onClick={() => navigateTo('syllabus-progress')}>
            Full View <Ic name="arrow_forward" size="sm" />
          </button>
        </div>
        {subjects.length === 0 ? (
          <div className="prc-syllabus__empty">
            <Ic name="info" size="sm" /> No syllabus data available yet.
          </div>
        ) : (
          <div className="prc-syllabus__list">
            {subjects.slice(0, 6).map(s => (
              <div key={s.code || s.name} className="prc-syllabus__row">
                <div className="prc-syllabus__row-head">
                  <span className="prc-syllabus__name">{s.name}{s.code ? ` (${s.code})` : ''}</span>
                  <strong className="prc-syllabus__pct">{s.pct}%</strong>
                </div>
                <div className="pu-finance__bar-track">
                  <div className="pu-finance__bar-fill" style={{
                    width: `${s.pct}%`,
                    background: s.pct >= 80 ? 'var(--ska-green)' : s.pct >= 50 ? '#f59e0b' : 'var(--ska-error)',
                  }} />
                </div>
                <span className="prc-syllabus__pending">{s.pending}</span>
              </div>
            ))}
            {subjects.length > 6 && (
              <button type="button" className="prc-syllabus__more" onClick={() => navigateTo('syllabus-progress')}>
                +{subjects.length - 6} more subjects → Full View
              </button>
            )}
          </div>
        )}
      </div>

      <ActivityFeed items={activityItems} />
    </div>
  );
}

export default function PrincipalHome(props) {
  return <PrincipalHomeInner {...props} />;
}
