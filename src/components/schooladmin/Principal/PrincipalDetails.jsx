import React from 'react';
import { PU_ROLES, PU_ACCESS_LEVELS, PU_FINANCE_STYLE } from './principal.constants';
import { puHash, fmtUsd } from './principal.utils';
import { PuRoleBadge } from './PrincipalCard';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Detail modal for a principal — leadership dashboard view of one staff
 * member's oversight scope: school overview, academic, teachers, syllabus,
 * finance, alerts, decision insights, recent actions.
 */
export default function PrincipalDetails({ u, onClose, onEdit, onToggle }) {
  const r  = PU_ROLES[u.role] || PU_ROLES.Principal;
  const al = PU_ACCESS_LEVELS[u.access] || PU_ACCESS_LEVELS.Full;
  const fs = PU_FINANCE_STYLE[u.finance] || PU_FINANCE_STYLE.Stable;
  const h  = puHash(u.email || u.id);
  const initials = (u.full_name || u.email || '?').trim().charAt(0).toUpperCase();

  /* Deterministic mock breakdowns */
  const topClasses = [
    { name: 'Grade 11A', score: 88 + (h % 7) },
    { name: 'Grade 9B',  score: 84 + (h % 6) },
    { name: 'Grade 12A', score: 82 + (h % 5) },
  ];
  const lowClasses = [
    { name: 'Grade 8A',  score: 56 + (h % 8) },
    { name: 'Grade 10B', score: 60 + (h % 5) },
  ];
  const trend = [62, 65, 70, 72, 71, 76, u.academic];

  const teacherInsights = {
    overloaded:      2 + (h % 3),
    underperforming: 1 + (h % 3),
    pendingGrades:   8 + (h % 12),
  };

  const syllabus = [
    { name: 'Mathematics', pct: 78 + (h % 12), pending: 'Calculus intro' },
    { name: 'English',     pct: 84 + (h % 8),  pending: 'Essay writing' },
    { name: 'Science',     pct: 70 + (h % 14), pending: 'Lab reports' },
    { name: 'Social',      pct: 88 + (h % 6),  pending: '—' },
  ];

  const finance = {
    revenue:     45000 + (h % 9000),
    outstanding: 8000  + (h % 4000),
    transactions: [
      { label: 'Tuition payment — Grade 11', amount: 1200 + (h % 300), at: 'Today, 10:24' },
      { label: 'Lab fees — Grade 9',         amount: 450  + (h % 120), at: 'Today, 09:11' },
      { label: 'Bus fee — multiple',         amount: 870  + (h % 200), at: 'Yesterday' },
    ],
  };

  const alerts = [
    u.flags.gradeMods > 0 ? { kind: 'err',  text: `${u.flags.gradeMods} grade modification attempt${u.flags.gradeMods > 1 ? 's' : ''} flagged` } : null,
    u.flags.lowAttend     ? { kind: 'warn', text: `Low attendance detected — ${u.attendance}% school-wide` } : null,
    u.flags.finAnomaly    ? { kind: 'err',  text: 'Financial anomaly detected in last 24h' } : null,
    u.flags.atRisk > 3    ? { kind: 'warn', text: `${u.flags.atRisk} students at academic risk` } : null,
  ].filter(Boolean);

  const insights = [
    teacherInsights.overloaded > 2     ? '💡 Consider assigning more teachers to Grade 9' : null,
    u.attendance < 88                  ? '💡 Attendance dropping in Grade 10B — schedule home visits' : null,
    finance.outstanding > 9000         ? '💡 High outstanding fees this term — send reminders' : null,
    u.academic < 75                    ? '💡 Grade 9 performance declining — consider curriculum review' : null,
    teacherInsights.pendingGrades > 12 ? '💡 Many pending grades — nudge teachers before report cards' : null,
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
              <div><span>Students</span><strong>{u.totalStudents}</strong></div>
              <div><span>Teachers</span><strong>{u.totalTeachers}</strong></div>
              <div><span>Classes</span><strong>{u.totalClasses}</strong></div>
            </div>
          </section>

          <section className="pu-modal__sec">
            <h4 className="pu-modal__sec-title"><Ic name="trending_up" /> Academic Performance</h4>
            <div className="pu-modal__academic">
              <div className="pu-modal__academic-col">
                <div className="pu-modal__academic-hd pu-modal__academic-hd--good">Top Performing</div>
                {topClasses.map(c => (
                  <div key={c.name} className="pu-modal__perf-row">
                    <span>{c.name}</span>
                    <strong style={{ color: 'var(--ska-green)' }}>{c.score}%</strong>
                  </div>
                ))}
              </div>
              <div className="pu-modal__academic-col">
                <div className="pu-modal__academic-hd pu-modal__academic-hd--bad">Needs Attention</div>
                {lowClasses.map(c => (
                  <div key={c.name} className="pu-modal__perf-row">
                    <span>{c.name}</span>
                    <strong style={{ color: 'var(--ska-error)' }}>{c.score}%</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="pu-modal__trend">
              <span className="pu-modal__trend-lbl">7-Term Trend</span>
              <div className="pu-modal__trend-bars">
                {trend.map((v, i) => (
                  <div key={i} className="pu-modal__trend-bar" title={`${v}%`}
                    style={{
                      height: `${v}%`,
                      background: i === trend.length - 1 ? 'var(--ska-primary)' : 'var(--ska-text-3)',
                    }} />
                ))}
              </div>
            </div>
          </section>

          <section className="pu-modal__sec">
            <h4 className="pu-modal__sec-title"><Ic name="group" /> Teacher Insights</h4>
            <div className="pu-modal__overview">
              <div className="pu-modal__overview-warn">
                <span>Overloaded</span><strong>{teacherInsights.overloaded}</strong>
              </div>
              <div className="pu-modal__overview-warn">
                <span>Underperforming</span><strong>{teacherInsights.underperforming}</strong>
              </div>
              <div>
                <span>Pending Grades</span><strong>{teacherInsights.pendingGrades}</strong>
              </div>
            </div>
          </section>

          <section className="pu-modal__sec">
            <h4 className="pu-modal__sec-title"><Ic name="menu_book" /> Syllabus Progress</h4>
            <div className="pu-modal__syllabus">
              {syllabus.map(s => (
                <div key={s.name} className="pu-modal__syllabus-row">
                  <div className="pu-modal__syllabus-top">
                    <span>{s.name}</span>
                    <strong>{s.pct}%</strong>
                  </div>
                  <div className="pu-progress">
                    <div style={{
                      width: `${s.pct}%`,
                      background: s.pct >= 85 ? 'var(--ska-green)' : s.pct >= 70 ? 'var(--ska-tertiary)' : 'var(--ska-error)',
                    }} />
                  </div>
                  <small>Pending: {s.pending}</small>
                </div>
              ))}
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
                <strong style={{ color: fs.color }}>{u.finance}</strong>
              </div>
            </div>
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
          </section>

          {insights.length > 0 && (
            <section className="pu-modal__sec">
              <h4 className="pu-modal__sec-title"><Ic name="lightbulb" /> Decision Insights</h4>
              <ul className="pu-modal__insights">
                {insights.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </section>
          )}

          <section className="pu-modal__sec">
            <h4 className="pu-modal__sec-title"><Ic name="history" /> Recent Actions</h4>
            <ul className="pu-modal__activity">
              {u.actions.map((a, i) => (
                <li key={i}>
                  <span className="pu-modal__activity-dot" />
                  <div>
                    <p>{a.text}</p>
                    <span>{a.at}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

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
