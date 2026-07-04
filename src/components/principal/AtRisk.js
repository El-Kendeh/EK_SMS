import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { principalApi } from '../../api/adminApi';
import StudentDrawer from './StudentDrawer';
import { downloadCsv } from '../../utils/csv';
import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css'; // defines the .pu-* classes this page renders
import './GradeApprovals.css';                   // ga-table / ga-badge / ga-btn
import './AtRisk.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const REASON_LABELS = {
  low_grades: 'Low grades',
  poor_attendance: 'Poor attendance',
};

const fmtPct = (n) => (n === null || n === undefined ? '—' : `${n}%`);

export default function AtRisk() {
  const [students, setStudents] = useState([]);
  const [term, setTerm] = useState(null);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drawerStudent, setDrawerStudent] = useState(null); // student_id | null

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    principalApi.getAtRisk()
      .then(res => {
        if (res?.success === false) { setError(res.message || 'Failed to load at-risk students'); return; }
        setStudents(res.students || []);
        setTerm(res.term || null);
        setHasData(!!res.has_data);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const highCount = useMemo(() => students.filter(s => s.severity === 'high').length, [students]);
  const mediumCount = students.length - highCount;

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`at-risk-students-${stamp}.csv`, [
      ['Student', 'Admission #', 'Class', 'Term Avg (%)', 'Attendance 30d (%)', 'Reasons', 'Severity'],
      ...students.map(s => [
        s.name, s.admission_number, s.class_name,
        s.avg_total ?? '', s.attendance_rate ?? '',
        (s.reasons || []).map(r => REASON_LABELS[r] || r).join('; '),
        s.severity,
      ]),
    ]);
  };

  return (
    <div className="pu-page par-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">At-Risk Students</h1>
          <p className="ska-page-sub">
            {term ? `Term: ${term} — ` : ''}Flagged for term average &lt; 50% or attendance &lt; 75% (30 days)
          </p>
        </div>
        {students.length > 0 && (
          <button type="button" className="ga-btn ga-btn--ghost par-export-btn" onClick={exportCsv}>
            <Ic name="download" size="sm" /> Export CSV
          </button>
        )}
      </div>

      {error && (
        <div className="pu-empty">
          <Ic name="error" size="xl" />
          <p className="pu-empty__title">Couldn't load at-risk students</p>
          <p className="pu-empty__desc">{error}</p>
        </div>
      )}

      {!error && loading && (
        <div className="pu-empty">
          <Ic name="hourglass_empty" size="xl" />
          <p className="pu-empty__title">Loading…</p>
        </div>
      )}

      {!error && !loading && students.length === 0 && (
        <div className="pu-empty">
          <Ic name={hasData ? 'task_alt' : 'monitoring'} size="xl" />
          <p className="pu-empty__title">
            {hasData ? 'No students currently flagged' : 'No grade or attendance data yet'}
          </p>
          <p className="pu-empty__desc">
            Flags appear when a student's term average drops below 50% or attendance below 75%.
          </p>
        </div>
      )}

      {!error && !loading && students.length > 0 && (
        <>
          <div className="par-chips">
            <span className="par-chip par-chip--total">
              <Ic name="groups" size="sm" /> {students.length} flagged
            </span>
            <span className="par-chip par-chip--high">
              <Ic name="priority_high" size="sm" /> {highCount} high
            </span>
            <span className="par-chip par-chip--medium">
              <Ic name="warning" size="sm" /> {mediumCount} medium
            </span>
          </div>

          <div className="ga-table-wrap par-table-wrap">
            <table className="ga-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th className="ga-col-num">Term Avg</th>
                  <th className="ga-col-num">Attendance (30d)</th>
                  <th>Reasons</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.student_id}>
                    <td data-label="Student">
                      <button type="button" className="par-student-btn"
                        onClick={() => setDrawerStudent(s.student_id)}
                        aria-label={`Open profile for ${s.name}`}>
                        <span className="ga-student">
                          <strong>{s.name}</strong>
                          <span className="ga-student__sub">{s.admission_number}</span>
                        </span>
                        <Ic name="chevron_right" size="sm" />
                      </button>
                    </td>
                    <td data-label="Class">{s.class_name || '—'}</td>
                    <td className="ga-col-num" data-label="Term Avg">{fmtPct(s.avg_total)}</td>
                    <td className="ga-col-num" data-label="Attendance (30d)">{fmtPct(s.attendance_rate)}</td>
                    <td data-label="Reasons">
                      <span className="par-reasons">
                        {(s.reasons || []).map(r => (
                          <span key={r} className={`ga-badge ${r === 'low_grades' ? 'ga-badge--rejected' : 'ga-badge--pending'}`}>
                            {REASON_LABELS[r] || r}
                          </span>
                        ))}
                      </span>
                    </td>
                    <td data-label="Severity">
                      <span className={`ga-badge ${s.severity === 'high' ? 'ga-badge--rejected' : 'ga-badge--pending'}`}>
                        {s.severity}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {drawerStudent != null && (
        <StudentDrawer studentId={drawerStudent} onClose={() => setDrawerStudent(null)} />
      )}
    </div>
  );
}
