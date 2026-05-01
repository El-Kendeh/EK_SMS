import { useEffect, useState, useCallback } from 'react';
import { principalApi } from '../../api/adminApi';
import './PrincipalDashboard.css';

/* Material Symbol shortcut */
const Ic = ({ name, size = 'sm' }) => (
  <span className={`pri-icon pri-icon--${size}`} aria-hidden="true">{name}</span>
);

const NAV = [
  { key: 'overview',   icon: 'dashboard',         label: 'Overview' },
  { key: 'approvals',  icon: 'rate_review',       label: 'Grade Approvals' },
  { key: 'reports',    icon: 'assessment',        label: 'Report Cards' },
  { key: 'activity',   icon: 'monitoring',        label: 'Activity' },
];

const SECTION_PATHS = {
  overview:  '/principal',
  approvals: '/principal/approvals',
  reports:   '/principal/reports',
  activity:  '/principal/activity',
};

function getInitialSection() {
  const p = window.location.pathname;
  for (const [k, v] of Object.entries(SECTION_PATHS)) {
    if (k !== 'overview' && p.startsWith(v)) return k;
  }
  return 'overview';
}

/* ==========================================================
   OVERVIEW
   ========================================================== */
function PrincipalOverview({ onJump }) {
  const [data, setData] = useState(null);
  const [err, setErr]   = useState(null);

  useEffect(() => {
    principalApi.overview().then((d) => {
      if (d && d.success) setData(d);
      else setErr(d?.message || 'Failed to load metrics.');
    }).catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="pri-empty">{err}</div>;
  if (!data) return <div className="pri-skel">Loading metrics…</div>;

  const m = data.metrics;
  const cards = [
    { k: 'students_total',         label: 'Active Students',  icon: 'group' },
    { k: 'teachers_total',         label: 'Active Teachers',  icon: 'school' },
    { k: 'classrooms_total',       label: 'Classes',          icon: 'class' },
    { k: 'pending_grade_changes',  label: 'Pending Grade Changes', icon: 'rate_review',
      action: 'approvals', warn: m.pending_grade_changes > 0 },
    { k: 'report_cards_pending',   label: 'Reports Pending Publish', icon: 'pending_actions',
      action: 'reports', warn: m.report_cards_pending > 0 },
    { k: 'report_cards_published', label: 'Reports Published',  icon: 'task_alt' },
  ];

  return (
    <div className="pri-overview">
      <header className="pri-h">
        <div>
          <h1 className="pri-h__title">{data.school?.name || 'School'} — Principal</h1>
          <p className="pri-h__sub">
            {m.active_term ? `${m.active_term} active` : 'No active term'} · live snapshot
          </p>
        </div>
      </header>

      <div className="pri-grid">
        {cards.map((c) => (
          <button key={c.k}
                  className={`pri-card ${c.warn ? 'pri-card--warn' : ''}`}
                  onClick={() => c.action && onJump(c.action)}
                  type="button">
            <Ic name={c.icon} size="lg" />
            <div className="pri-card__value">{m[c.k] ?? 0}</div>
            <div className="pri-card__label">{c.label}</div>
          </button>
        ))}
      </div>

      <div className="pri-callout">
        <Ic name="info" />
        <p>
          Grade changes submitted by teachers must be approved here before they take effect.
          Once a term's grades are finalised and approved, you can publish the term's
          report cards from the <strong>Report Cards</strong> tab.
        </p>
      </div>
    </div>
  );
}

/* ==========================================================
   GRADE APPROVALS
   ========================================================== */
function GradeApprovals() {
  const [rows, setRows] = useState(null);
  const [err, setErr]   = useState(null);
  const [busy, setBusy] = useState(null);
  const [filter, setFilter] = useState('pending');

  const load = useCallback(() => {
    principalApi.listGradeApprovals().then((d) => {
      if (d && d.success !== false) setRows(d.requests || []);
      else setErr(d?.message || 'Failed to load.');
    }).catch((e) => setErr(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const review = async (modId, action) => {
    const comment = action === 'reject'
      ? window.prompt('Reason for rejection (sent to the teacher):')
      : window.prompt('Optional comment for this approval:') || '';
    if (action === 'reject' && (!comment || !comment.trim())) return;
    setBusy(modId);
    try {
      await principalApi.reviewGradeChange({ modId, action, comment });
      load();
    } catch (e) {
      alert(e.message || 'Action failed.');
    }
    setBusy(null);
  };

  const visible = (rows || []).filter((r) => {
    if (filter === 'all') return true;
    return (r.status || 'pending').toLowerCase() === filter;
  });

  return (
    <div className="pri-section">
      <header className="pri-h">
        <h1 className="pri-h__title">Grade Change Approvals</h1>
        <div className="pri-tabs">
          {['pending', 'approved', 'rejected', 'all'].map((f) => (
            <button key={f}
                    className={`pri-tab ${filter === f ? 'pri-tab--on' : ''}`}
                    onClick={() => setFilter(f)}>{f}</button>
          ))}
        </div>
      </header>

      {err && <div className="pri-empty">{err}</div>}
      {!rows && <div className="pri-skel">Loading requests…</div>}
      {rows && visible.length === 0 && (
        <div className="pri-empty">
          <Ic name="check_circle" /> No {filter} requests.
        </div>
      )}

      <div className="pri-table-wrap">
        {visible.length > 0 && (
          <table className="pri-table">
            <thead>
              <tr>
                <th>Student</th><th>Subject</th><th>Old → New</th>
                <th>Reason</th><th>Requested by</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>{r.student || '—'}</td>
                  <td>{r.subject || '—'}</td>
                  <td>
                    <span className="pri-badge pri-badge--grey">{r.old_value ?? '—'}</span>
                    {' → '}
                    <span className="pri-badge pri-badge--blue">{r.new_value ?? '—'}</span>
                  </td>
                  <td className="pri-truncate" title={r.reason || ''}>{r.reason || '—'}</td>
                  <td>{r.requested_by || '—'}</td>
                  <td><span className={`pri-badge pri-badge--${r.status === 'approved' ? 'green' : r.status === 'rejected' ? 'red' : 'amber'}`}>
                    {r.status || 'pending'}
                  </span></td>
                  <td>
                    {(r.status || 'pending') === 'pending' && (
                      <div className="pri-row-actions">
                        <button className="pri-btn pri-btn--ok"
                                disabled={busy === r.id}
                                onClick={() => review(r.id, 'approve')}>Approve</button>
                        <button className="pri-btn pri-btn--no"
                                disabled={busy === r.id}
                                onClick={() => review(r.id, 'reject')}>Reject</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ==========================================================
   REPORT CARDS
   ========================================================== */
function ReportCardsPanel() {
  const [data, setData] = useState(null);
  const [err, setErr]   = useState(null);
  const [busy, setBusy] = useState(null);
  const [comments, setComments] = useState({});

  const load = useCallback(() => {
    principalApi.listReportCards().then((d) => {
      if (d && d.success !== false) setData(d);
      else setErr(d?.message || 'Failed to load.');
    }).catch((e) => setErr(e.message));
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateComment = (id, val) =>
    setComments((c) => ({ ...c, [id]: val }));

  const saveComment = async (cardId) => {
    setBusy(cardId);
    try {
      await principalApi.commentReportCard({ cardId, principalComment: comments[cardId] || '' });
      load();
    } catch (e) { alert(e.message); }
    setBusy(null);
  };
  const publish = async (cardId) => {
    if (!window.confirm('Publish this report card to the parent? This cannot be undone.')) return;
    setBusy(cardId);
    try {
      await principalApi.publishReportCard({ cardId, principalComment: comments[cardId] || '' });
      load();
    } catch (e) { alert(e.message); }
    setBusy(null);
  };

  if (err) return <div className="pri-empty">{err}</div>;
  if (!data) return <div className="pri-skel">Loading report cards…</div>;

  const cards = data.report_cards || [];
  const pending = cards.filter((c) => !c.is_published);
  const published = cards.filter((c) => c.is_published);

  return (
    <div className="pri-section">
      <header className="pri-h">
        <h1 className="pri-h__title">Report Cards</h1>
        <p className="pri-h__sub">
          {data.term ? `Active term: ${data.term}` : 'No active term'} ·
          {' '}{pending.length} pending · {published.length} published
        </p>
      </header>

      {pending.length > 0 && (
        <>
          <h2 className="pri-h2">Pending publication</h2>
          <div className="pri-table-wrap">
            <table className="pri-table">
              <thead>
                <tr>
                  <th>Student</th><th>Adm No.</th><th>Term</th>
                  <th>Principal Comment</th><th></th>
                </tr>
              </thead>
              <tbody>
                {pending.map((c) => (
                  <tr key={c.id}>
                    <td>{c.student || '—'}</td>
                    <td>{c.admission_number || '—'}</td>
                    <td>{c.term || '—'}</td>
                    <td>
                      <textarea className="pri-textarea" rows={2}
                                placeholder="Optional comment shown on the report card"
                                value={(comments[c.id] !== undefined ? comments[c.id] : c.principal_comment) || ''}
                                onChange={(e) => updateComment(c.id, e.target.value)} />
                    </td>
                    <td>
                      <div className="pri-row-actions">
                        <button className="pri-btn pri-btn--ghost"
                                disabled={busy === c.id}
                                onClick={() => saveComment(c.id)}>Save</button>
                        <button className="pri-btn pri-btn--ok"
                                disabled={busy === c.id}
                                onClick={() => publish(c.id)}>Publish</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {published.length > 0 && (
        <>
          <h2 className="pri-h2" style={{ marginTop: 24 }}>Published</h2>
          <div className="pri-table-wrap">
            <table className="pri-table">
              <thead>
                <tr><th>Student</th><th>Adm No.</th><th>Term</th><th>Published</th></tr>
              </thead>
              <tbody>
                {published.map((c) => (
                  <tr key={c.id}>
                    <td>{c.student || '—'}</td>
                    <td>{c.admission_number || '—'}</td>
                    <td>{c.term || '—'}</td>
                    <td>{c.published_at ? new Date(c.published_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/* ==========================================================
   ACTIVITY (placeholder summary view)
   ========================================================== */
function ActivityPanel() {
  return (
    <div className="pri-section">
      <header className="pri-h">
        <h1 className="pri-h__title">Activity Monitoring</h1>
        <p className="pri-h__sub">Cross-school activity feed (coming soon)</p>
      </header>
      <div className="pri-callout">
        <Ic name="construction" />
        <p>
          A live activity feed (logins, grade-entry events, report-card publishes,
          attendance dips) will land here. For now, refer to the school admin's
          Security Logs and Notifications tabs.
        </p>
      </div>
    </div>
  );
}

/* ==========================================================
   ROOT
   ========================================================== */
export default function PrincipalDashboard({ onNavigate }) {
  const [section, setSection] = useState(getInitialSection);

  useEffect(() => {
    const path = SECTION_PATHS[section] || '/principal';
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  }, [section]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.dispatchEvent(new Event('storage'));
    if (onNavigate) onNavigate('login');
  };

  return (
    <div className="pri-shell">
      <aside className="pri-sidebar">
        <div className="pri-brand">
          <Ic name="account_balance" size="lg" />
          <div>
            <div className="pri-brand__title">Principal</div>
            <div className="pri-brand__sub">EK-SMS</div>
          </div>
        </div>
        <nav className="pri-nav">
          {NAV.map((n) => (
            <button key={n.key}
                    className={`pri-nav__item ${section === n.key ? 'pri-nav__item--on' : ''}`}
                    onClick={() => setSection(n.key)}>
              <Ic name={n.icon} />
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
        <button className="pri-logout" onClick={logout}>
          <Ic name="logout" /> Sign out
        </button>
      </aside>

      <main className="pri-main">
        {section === 'overview'  && <PrincipalOverview onJump={setSection} />}
        {section === 'approvals' && <GradeApprovals />}
        {section === 'reports'   && <ReportCardsPanel />}
        {section === 'activity'  && <ActivityPanel />}
      </main>
    </div>
  );
}
