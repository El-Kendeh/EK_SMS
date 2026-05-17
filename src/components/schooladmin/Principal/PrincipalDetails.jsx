import React from 'react';
import { PU_ROLES, PU_ACCESS_LEVELS, PU_FINANCE_STYLE } from './principal.constants';
import { fmtUsd } from './principal.utils';
import { PuRoleBadge } from './PrincipalCard';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

export default function PrincipalDetails({ u, dashboard, classPerf, teacherData, financeData, onClose, onEdit, onToggle }) {
  const r  = PU_ROLES[u.role] || PU_ROLES.Principal;
  const al = PU_ACCESS_LEVELS[u.access_level] || PU_ACCESS_LEVELS.Full;
  const fs = PU_FINANCE_STYLE[u.finance || dashboard?.finance || 'Stable'] || PU_FINANCE_STYLE.Stable;
  const initials = (u.full_name || u.email || '?').trim().charAt(0).toUpperCase();

  const topClasses = classPerf?.top || [];
  const lowClasses = classPerf?.low || [];
  const tInsights = teacherData || { overloaded: 0, underperforming: 0, pendingGrades: 0 };
  const finance = financeData || { revenue: 0, outstanding: 0, transactions: [] };

  const alerts = [
    dashboard?.totalGradeMods > 0 ? { kind: 'err',  text: `${dashboard.totalGradeMods} grade modification attempt${dashboard.totalGradeMods > 1 ? 's' : ''} flagged` } : null,
    dashboard?.totalLowAttend > 0 ? { kind: 'warn', text: `Low attendance detected — ${dashboard.avgAttendance}% school-wide` } : null,
    dashboard?.totalFinAnom > 0   ? { kind: 'err',  text: 'Financial anomaly detected in last 24h' } : null,
    dashboard?.totalAtRisk > 3    ? { kind: 'warn', text: `${dashboard.totalAtRisk} students at academic risk` } : null,
  ].filter(Boolean);

  const insights = [
    tInsights.overloaded > 2     ? 'Consider assigning more teachers to reduce workload' : null,
    dashboard?.avgAttendance < 88 ? 'Attendance dropping — schedule home visits' : null,
    finance.outstanding > 9000    ? 'High outstanding fees this term — send reminders' : null,
    dashboard?.avgAcademic < 75   ? 'Performance declining — consider curriculum review' : null,
    tInsights.pendingGrades > 12  ? 'Many pending grades — nudge teachers before report cards' : null,
  ].filter(Boolean);

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal ska-modal--wide pu-modal" onClick={e => e.stopPropagation()}>
        <div className="ska-modal-head pu-modal__head">
          <div className="pu-modal__id">
            <div className="pu-staff__avatar pu-modal__avatar"
              style={{ background: `${r.color}1a`, color: r.color, borderColor: `${r.color}40` }}>
              {initials}
            </div>
            <div>
              <h3 className="ska-modal-title">{u.full_name || '—'}</h3>
              <div className="pu-modal__meta">
                <PuRoleBadge role={u.role} size="sm" />
                <span className="pu-modal__access" style={{ color: al.color }}>{al.label}</span>
                <span style={{
                  fontSize: '0.75rem',
                  color: u.is_active ? 'var(--ska-green)' : 'var(--ska-error)',
                  fontWeight: 700,
                }}>
                  ● {u.is_active ? 'Active' : 'Suspended'}
                </span>
              </div>
            </div>
          </div>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>

        <div className="ska-modal-body pu-modal__body">

          {alerts.length > 0 && (
            <section className="pu-modal__sec">
              <h4 className="pu-modal__sec-title"><Ic name="warning" /> Alerts Panel</h4>
              <div className="pu-modal__alerts">
                {alerts.map((a, i) => (
                  <div key={i} className={`pu-modal__alert pu-modal__alert--${a.kind}`}>
                    <Ic name={a.kind === 'err' ? 'error' : 'warning'} size="sm" />
                    <span>{a.text}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="pu-modal__sec">
            <h4 className="pu-modal__sec-title"><Ic name="domain" /> School Overview</h4>
            <div className="pu-modal__overview">
              <div><span>Students</span><strong>{dashboard?.totalStudents || 0}</strong></div>
              <div><span>Teachers</span><strong>{dashboard?.totalTeachers || 0}</strong></div>
              <div><span>Classes</span><strong>{dashboard?.totalClasses || 0}</strong></div>
            </div>
          </section>

          <section className="pu-modal__sec">
            <h4 className="pu-modal__sec-title"><Ic name="trending_up" /> Academic Performance</h4>
            <div className="pu-modal__academic">
              <div className="pu-modal__academic-col">
                <div className="pu-modal__academic-hd pu-modal__academic-hd--good">Top Performing</div>
                {topClasses.length > 0 ? topClasses.map(c => (
                  <div key={c.name} className="pu-modal__perf-row">
                    <span>{c.name}</span>
                    <strong style={{ color: 'var(--ska-green)' }}>{c.score}%</strong>
                  </div>
                )) : <p style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>No data yet</p>}
              </div>
              <div className="pu-modal__academic-col">
                <div className="pu-modal__academic-hd pu-modal__academic-hd--bad">Needs Attention</div>
                {lowClasses.length > 0 ? lowClasses.map(c => (
                  <div key={c.name} className="pu-modal__perf-row">
                    <span>{c.name}</span>
                    <strong style={{ color: 'var(--ska-error)' }}>{c.score}%</strong>
                  </div>
                )) : <p style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>No data yet</p>}
              </div>
            </div>
          </section>

          <section className="pu-modal__sec">
            <h4 className="pu-modal__sec-title"><Ic name="group" /> Teacher Insights</h4>
            <div className="pu-modal__overview">
              <div className="pu-modal__overview-warn">
                <span>Overloaded</span><strong>{tInsights.overloaded}</strong>
              </div>
              <div className="pu-modal__overview-warn">
                <span>Underperforming</span><strong>{tInsights.underperforming}</strong>
              </div>
              <div>
                <span>Pending Grades</span><strong>{tInsights.pendingGrades}</strong>
              </div>
            </div>
          </section>

          <section className="pu-modal__sec">
            <h4 className="pu-modal__sec-title"><Ic name="account_balance" /> Financial Overview</h4>
            <div className="pu-modal__finance-grid">
              <div>
                <span>Total Revenue</span>
                <strong style={{ color: 'var(--ska-green)' }}>{fmtUsd(finance.revenue)}</strong>
              </div>
              <div>
                <span>Outstanding Fees</span>
                <strong style={{ color: finance.outstanding > 9000 ? 'var(--ska-error)' : 'var(--ska-tertiary)' }}>
                  {fmtUsd(finance.outstanding)}
                </strong>
              </div>
              <div>
                <span>Status</span>
                <strong style={{ color: fs.color }}>{dashboard?.finance || 'Stable'}</strong>
              </div>
            </div>
            {finance.transactions && finance.transactions.length > 0 && (
              <ul className="pu-modal__tx-list">
                {finance.transactions.map((t, i) => (
                  <li key={i}>
                    <Ic name="receipt_long" size="sm" />
                    <div>
                      <p>{t.label}</p>
                      <span>{t.at}</span>
                    </div>
                    <strong>{fmtUsd(t.amount)}</strong>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {insights.length > 0 && (
            <section className="pu-modal__sec">
              <h4 className="pu-modal__sec-title"><Ic name="lightbulb" /> Decision Insights</h4>
              <ul className="pu-modal__insights">
                {insights.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </section>
          )}

          <div className="ska-modal-actions">
            <button className="ska-btn ska-btn--ghost" onClick={onClose}>Close</button>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="ska-btn ska-btn--ghost" onClick={() => onEdit(u)}>
                <Ic name="edit" size="sm" /> Edit
              </button>
              <button
                className={`ska-btn ${u.is_active ? 'ska-btn--danger' : 'ska-btn--approve'}`}
                onClick={() => onToggle(u)}>
                <Ic name={u.is_active ? 'block' : 'check_circle'} size="sm" />
                {u.is_active ? 'Suspend' : 'Activate'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
