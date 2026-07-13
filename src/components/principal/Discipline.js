import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { principalApi } from '../../api/adminApi';
import { downloadCsv } from '../../utils/csv';
import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css'; // .pu-* classes
import './GradeApprovals.css';                   // .ga-table / .ga-badge / .ga-btn
import './AtRisk.css';                            // .par-* chips + table wrap

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const SEV_CLASS = { high: 'ga-badge--rejected', critical: 'ga-badge--rejected', medium: 'ga-badge--pending', low: 'ga-badge--approved' };
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

export default function Discipline() {
  const [incidents, setIncidents] = useState([]);
  const [summary, setSummary] = useState({ total: 0, by_severity: {}, follow_ups: 0 });
  const [severity, setSeverity] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    principalApi.getDiscipline(severity ? { severity } : {})
      .then(res => {
        if (res?.success === false) { setError(res.message || 'Failed to load discipline incidents'); return; }
        setIncidents(res.incidents || []);
        setSummary(res.summary || { total: 0, by_severity: {}, follow_ups: 0 });
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [severity]);

  useEffect(() => { load(); }, [load]);

  const severities = useMemo(() => Object.entries(summary.by_severity || {}), [summary]);

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`discipline-incidents-${stamp}.csv`, [
      ['Date', 'Student', 'Type', 'Title', 'Severity', 'Reported by', 'Action taken', 'Follow-up'],
      ...incidents.map(i => [
        fmtDate(i.created_at), i.student_name, i.type, i.title, i.severity,
        i.reported_by, i.action_taken || '', i.follow_up_required ? 'Yes' : 'No',
      ]),
    ]);
  };

  return (
    <div className="pu-page par-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Student Discipline</h1>
          <p className="ska-page-sub">Behaviour incidents logged by teachers across the school</p>
        </div>
        {incidents.length > 0 && (
          <button type="button" className="ga-btn ga-btn--ghost par-export-btn" onClick={exportCsv}>
            <Ic name="download" size="sm" /> Export CSV
          </button>
        )}
      </div>

      {error && (
        <div className="pu-empty">
          <Ic name="error" size="xl" />
          <p className="pu-empty__title">Couldn't load discipline incidents</p>
          <p className="pu-empty__desc">{error}</p>
        </div>
      )}

      {!error && loading && (
        <div className="pu-empty"><Ic name="hourglass_empty" size="xl" /><p className="pu-empty__title">Loading…</p></div>
      )}

      {!error && !loading && (
        <>
          <div className="par-chips">
            <span className="par-chip par-chip--total"><Ic name="gavel" size="sm" /> {summary.total} incident{summary.total === 1 ? '' : 's'}</span>
            <span className="par-chip par-chip--medium"><Ic name="event_repeat" size="sm" /> {summary.follow_ups} need follow-up</span>
            {severities.map(([sev, n]) => (
              <span key={sev} className={`par-chip ${sev === 'high' || sev === 'critical' ? 'par-chip--high' : 'par-chip--medium'}`}>
                <Ic name="label" size="sm" /> {n} {sev}
              </span>
            ))}
          </div>

          <div className="par-toolbar" style={{ display: 'flex', gap: 8, margin: '12px 0', flexWrap: 'wrap' }}>
            <label className="sr-only" htmlFor="disc-sev">Filter by severity</label>
            <select id="disc-sev" className="ska-input" value={severity} onChange={e => setSeverity(e.target.value)} style={{ maxWidth: 220 }}>
              <option value="">All severities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {incidents.length === 0 ? (
            <div className="pu-empty">
              <Ic name="verified_user" size="xl" />
              <p className="pu-empty__title">{severity ? `No ${severity} incidents` : 'No discipline incidents logged'}</p>
              <p className="pu-empty__desc">Incidents appear here as teachers record behaviour reports.</p>
            </div>
          ) : (
            <div className="ga-table-wrap par-table-wrap">
              <table className="ga-table">
                <thead>
                  <tr>
                    <th>Date</th><th>Student</th><th>Type</th><th>Title</th>
                    <th>Severity</th><th>Reported by</th><th>Follow-up</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map(i => (
                    <tr key={i.id}>
                      <td data-label="Date">{fmtDate(i.created_at)}</td>
                      <td data-label="Student"><strong>{i.student_name}</strong></td>
                      <td data-label="Type">{i.type}</td>
                      <td data-label="Title">{i.title}{i.description ? <span className="ga-student__sub" style={{ display: 'block' }}>{i.description}</span> : null}</td>
                      <td data-label="Severity"><span className={`ga-badge ${SEV_CLASS[i.severity] || 'ga-badge--pending'}`}>{i.severity}</span></td>
                      <td data-label="Reported by">{i.reported_by}</td>
                      <td data-label="Follow-up">
                        {i.follow_up_required
                          ? <span className="ga-badge ga-badge--pending">Due {i.follow_up_date ? fmtDate(i.follow_up_date) : ''}</span>
                          : <span className="ga-badge ga-badge--approved">None</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
