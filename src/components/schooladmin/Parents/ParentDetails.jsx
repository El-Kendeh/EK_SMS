import React, { useState } from 'react';
import { relTime, perfColor, attColor } from './utils';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const TABS = [
  ['children',  'group',          'Children'],
  ['academic',  'insights',       'Academic'],
  ['finance',   'payments',       'Financial'],
  ['comm',      'forum',          'Communication'],
  ['alerts',    'notifications',  'Alerts'],
];

function Bar({ label, value, color, suffix = '%' }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ska-text)' }}>{label}</span>
        <span style={{ fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>{value}{suffix}</span>
      </div>
      <div style={{ height: 8, background: 'var(--ska-surface-low)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color || 'var(--ska-primary)' }} />
      </div>
    </div>
  );
}

const ALERT_DESC = {
  low_performance: 'Avg performance across linked children is below 60%.',
  low_attendance:  'Attendance dropped below the 75% target this term.',
  fee_overdue:     'Outstanding fees should be settled before the next term.',
};

function AlertChip({ a }) {
  const palette = a.sev === 'red'
    ? { bg: 'var(--ska-error-dim)',    fg: 'var(--ska-error)',    icon: 'priority_high' }
    : a.sev === 'amber'
    ? { bg: 'var(--ska-tertiary-dim)', fg: 'var(--ska-tertiary)', icon: 'warning' }
    : { bg: 'var(--ska-green-dim)',    fg: 'var(--ska-green)',    icon: 'check_circle' };
  return (
    <div className="ska-prnt-alert-row" style={{ borderLeftColor: palette.fg }}>
      <Ic name={palette.icon} style={{ color: palette.fg }} />
      <div>
        <strong>{a.label}</strong>
        <p>{ALERT_DESC[a.kind] || ''}</p>
      </div>
    </div>
  );
}

export default function ParentDetails({ parent: p, onClose, onLink, onMessage }) {
  const [tab, setTab] = useState('children');

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal ska-prnt-details-modal" onClick={e => e.stopPropagation()}>
        <div className="ska-modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <div className="ska-prnt-avatar ska-prnt-avatar--lg">{p.name?.[0]?.toUpperCase() || '?'}</div>
            <div style={{ minWidth: 0 }}>
              <h3 className="ska-modal-title" style={{ margin: 0 }}>{p.name}</h3>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                <span className="ska-badge ska-badge--primary">{p.relationshipNorm}</span>
                <span className={`ska-badge ${p.isActive ? 'ska-badge--active' : 'ska-badge--inactive'}`}>● {p.isActive ? 'Active' : 'Inactive'}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--ska-text-3)' }}>Last active: {relTime(p.lastActiveDays)}</span>
              </div>
            </div>
          </div>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>

        {/* Quick action bar */}
        <div className="ska-prnt-details-actions">
          <button className="ska-btn ska-btn--secondary ska-btn--sm" onClick={() => onLink && onLink(p)}>
            <Ic name="link" size="sm" /> Link Student
          </button>
          <button className="ska-btn ska-btn--primary ska-btn--sm" onClick={() => onMessage && onMessage(p)}>
            <Ic name="send" size="sm" /> Message
          </button>
          <a className="ska-btn ska-btn--ghost ska-btn--sm" href={`mailto:${p.email || ''}`}>
            <Ic name="mail" size="sm" /> {p.email || '—'}
          </a>
          <a className="ska-btn ska-btn--ghost ska-btn--sm" href={`tel:${p.phone || ''}`}>
            <Ic name="call" size="sm" /> {p.phone || '—'}
          </a>
        </div>

        {/* Tabs */}
        <div className="ska-prnt-tabbar">
          {TABS.map(([k, ic, lab]) => (
            <button key={k} type="button" className={`ska-prnt-tab ${tab === k ? 'is-active' : ''}`} onClick={() => setTab(k)}>
              <Ic name={ic} size="sm" /> {lab}
              {k === 'alerts' && p.alerts.length > 0 && (
                <span className="ska-prnt-tab-count">{p.alerts.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="ska-modal-body ska-prnt-details-body">
          {tab === 'children' && (
            <>
              {p.childrenRich.length === 0 ? (
                <div className="ska-empty">
                  <Ic name="group_off" size="xl" style={{ color: 'var(--ska-text-3)', marginBottom: 12 }} />
                  <p className="ska-empty-title">No children linked yet</p>
                  <p className="ska-empty-desc">Click “Link Student” to connect this parent to a learner.</p>
                </div>
              ) : (
                <div className="ska-prnt-detail-children">
                  {p.childrenRich.map(c => (
                    <div key={c.id} className="ska-prnt-detail-child">
                      <div className="ska-prnt-detail-child__head">
                        <div className="ska-prnt-avatar ska-prnt-avatar--md"><Ic name="person" /></div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <strong>{c.name}</strong>
                          <span>{c.class || 'No class'} · {c.admission || '—'}</span>
                        </div>
                        <div className="ska-prnt-detail-child__pills">
                          <span className="ska-prnt-pill" style={{ color: perfColor(c.performance) }}>
                            <Ic name="grade" size="sm" /> {c.performance}%
                          </span>
                          <span className="ska-prnt-pill" style={{ color: attColor(c.attendance) }}>
                            <Ic name="event_available" size="sm" /> {c.attendance}%
                          </span>
                        </div>
                      </div>
                      <div className="ska-prnt-detail-child__grades">
                        <span className="ska-prnt-detail-child__grades-label">Recent grades</span>
                        <div className="ska-prnt-detail-child__grades-list">
                          {c.recentGrades.map(g => (
                            <div key={g.subject} className="ska-prnt-grade-pill" style={{ borderColor: perfColor(g.score) }}>
                              <span>{g.subject}</span>
                              <strong style={{ color: perfColor(g.score) }}>{g.score}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'academic' && (
            <div className="ska-prnt-detail-grid">
              <div className="ska-card ska-card-pad">
                <h4 className="ska-prnt-detail-title">Subject performance (avg across children)</h4>
                {p.subjectTrend.length === 0
                  ? <p className="ska-empty-desc">No subjects to display.</p>
                  : p.subjectTrend.map(s => (
                      <Bar key={s.subject} label={s.subject} value={s.score} color={perfColor(s.score)} />
                    ))
                }
              </div>
              <div className="ska-card ska-card-pad">
                <h4 className="ska-prnt-detail-title">Trend snapshot</h4>
                <div className="ska-prnt-trend">
                  <div>
                    <span>Avg Performance</span>
                    <strong style={{ color: perfColor(p.avgPerformance) }}>{p.avgPerformance}%</strong>
                  </div>
                  <div>
                    <span>Avg Attendance</span>
                    <strong style={{ color: attColor(p.avgAttendance) }}>{p.avgAttendance}%</strong>
                  </div>
                  <div>
                    <span>Children</span>
                    <strong>{p.childrenRich.length}</strong>
                  </div>
                </div>
                <p className="ska-prnt-detail-note">
                  {p.avgPerformance >= 75 ? 'Strong, consistent performance across children.'
                  : p.avgPerformance >= 60 ? 'Performance is acceptable but trending toward the warning band.'
                  : p.childrenRich.length === 0 ? 'Link children to surface academic insights.'
                  : 'Performance is below target — consider scheduling a parent–teacher review.'}
                </p>
              </div>
            </div>
          )}

          {tab === 'finance' && (
            <div className="ska-prnt-detail-grid">
              <div className="ska-card ska-card-pad">
                <h4 className="ska-prnt-detail-title">Fees summary</h4>
                <div className="ska-prnt-fee-grid">
                  <div>
                    <span>Paid this year</span>
                    <strong style={{ color: 'var(--ska-green)' }}>${p.feesPaid.toLocaleString()}</strong>
                  </div>
                  <div>
                    <span>Outstanding</span>
                    <strong style={{ color: p.outstandingFees > 0 ? 'var(--ska-error)' : 'var(--ska-green)' }}>
                      ${p.outstandingFees.toLocaleString()}
                    </strong>
                  </div>
                  <div>
                    <span>Children billed</span>
                    <strong>{p.childrenRich.length}</strong>
                  </div>
                </div>
                <Bar
                  label="Settlement progress"
                  value={p.feesPaid + p.outstandingFees > 0
                    ? Math.round((p.feesPaid / (p.feesPaid + p.outstandingFees)) * 100)
                    : 0}
                  color="var(--ska-green)"
                />
              </div>
              <div className="ska-card ska-card-pad">
                <h4 className="ska-prnt-detail-title">Payment history</h4>
                {p.paymentHistory.length === 0 ? (
                  <p className="ska-empty-desc">No payments recorded.</p>
                ) : (
                  <div className="ska-prnt-pay-list">
                    {p.paymentHistory.map((pay, i) => (
                      <div key={i} className="ska-prnt-pay-row">
                        <Ic name="receipt_long" style={{ color: 'var(--ska-secondary)' }} />
                        <div style={{ flex: 1 }}>
                          <strong>${pay.amount.toLocaleString()}</strong>
                          <span>{pay.method} · {pay.date}</span>
                        </div>
                        <span className="ska-badge ska-badge--green">{pay.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'comm' && (
            <div className="ska-card ska-card-pad">
              <h4 className="ska-prnt-detail-title">
                Communication history
                <small style={{ marginLeft: 10, color: 'var(--ska-text-3)', fontWeight: 500 }}>
                  Sent: {p.messagesSent} · Read: {p.messagesRead}
                </small>
              </h4>
              <ul className="ska-prnt-comm-list">
                {p.commHistory.map(c => (
                  <li key={c.id}>
                    <span className={`ska-prnt-comm-dot ska-prnt-comm-dot--${c.dir}`}>
                      <Ic name={c.kind === 'message' ? 'mail' : 'notifications'} size="sm" />
                    </span>
                    <div style={{ flex: 1 }}>
                      <strong>{c.title}</strong>
                      <span>{c.dir === 'sent' ? 'Sent' : 'Received'} · {relTime(c.at)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tab === 'alerts' && (
            <div className="ska-card ska-card-pad">
              <h4 className="ska-prnt-detail-title">Alerts panel</h4>
              {p.alerts.length === 0 ? (
                <div className="ska-empty">
                  <Ic name="check_circle" size="xl" style={{ color: 'var(--ska-green)', marginBottom: 12 }} />
                  <p className="ska-empty-title">No active alerts</p>
                  <p className="ska-empty-desc">All metrics are within healthy ranges.</p>
                </div>
              ) : (
                <div className="ska-prnt-alert-list">
                  {p.alerts.map(a => <AlertChip key={a.kind} a={a} />)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
