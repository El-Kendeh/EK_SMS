import React, { useState, useEffect, useCallback } from 'react';
import { principalApi } from '../../api/adminApi';
import { downloadCsv } from '../../utils/csv';
import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css';
import './GradeApprovals.css';
import './ReportCardApproval.css';
import './AttendanceReport.css';

const Ic = ({ name, size }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true">{name}</span>
);

const RANGE_OPTIONS = [
  { key: 7,   label: 'Last 7 days'  },
  { key: 30,  label: 'Last 30 days' },
  { key: 90,  label: 'Last 90 days' },
  { key: 180, label: 'Last 6 months' },
];

const rateColor = (rate) => (rate >= 90 ? 'var(--ska-green)' : rate >= 85 ? '#f59e0b' : 'var(--ska-error)');

export default function AttendanceReport({ schoolId }) {
  const [days, setDays] = useState(30);
  const [overall, setOverall] = useState(null);
  const [classes, setClasses] = useState([]);
  const [lowCount, setLowCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    principalApi.getAttendanceReport(days)
      .then(res => {
        if (res?.success === false) { setError(res.message || 'Failed to load attendance report'); return; }
        setOverall(res.overall || null);
        setClasses(res.classes || []);
        setLowCount(res.low_attendance_count || 0);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`attendance-report-${stamp}.csv`, [
      ['Class', 'Records', 'Present', 'Absent', 'Late', 'Excused', 'Rate (%)'],
      ...classes.map(c => [c.class_name, c.total, c.present, c.absent, c.late, c.excused, c.rate]),
    ]);
  };

  return (
    <div className="pu-page atr-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Attendance Report</h1>
          <p className="ska-page-sub">School-wide attendance by class</p>
        </div>
        <div className="atr-head-actions">
          <select className="ga-select" value={days} onChange={e => setDays(Number(e.target.value))}>
            {RANGE_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
          <button type="button" className="ga-btn ga-btn--ghost" disabled={loading || classes.length === 0}
            onClick={exportCsv} title="Export the class table">
            <Ic name="download" size="sm" /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="pu-empty">
          <Ic name="error" size="xl" />
          <p className="pu-empty__title">Couldn't load attendance report</p>
          <p className="pu-empty__desc">{error}</p>
        </div>
      )}

      {!error && loading && (
        <div className="pu-empty">
          <Ic name="hourglass_empty" size="xl" />
          <p className="pu-empty__title">Loading…</p>
        </div>
      )}

      {!error && !loading && (!overall || overall.total === 0) && (
        <div className="pu-empty">
          <Ic name="event_available" size="xl" />
          <p className="pu-empty__title">No attendance records</p>
          <p className="pu-empty__desc">Records will appear here once teachers start taking attendance.</p>
        </div>
      )}

      {!error && !loading && overall && overall.total > 0 && (
        <>
          <div className="rca-summary">
            <div className="rca-summary__item">
              <span className="rca-summary__num" style={{ color: rateColor(overall.rate) }}>{overall.rate}%</span>
              <span className="rca-summary__label">Overall attendance</span>
            </div>
            <div className="rca-summary__item">
              <span className="rca-summary__num rca-summary__num--green">{overall.present}</span>
              <span className="rca-summary__label">Present</span>
            </div>
            <div className="rca-summary__item">
              <span className="rca-summary__num atr-num--error">{overall.absent}</span>
              <span className="rca-summary__label">Absent</span>
            </div>
            <div className="rca-summary__item">
              <span className="rca-summary__num atr-num--warn">{overall.late}</span>
              <span className="rca-summary__label">Late</span>
            </div>
            <div className="rca-summary__item">
              <span className="rca-summary__num">{overall.excused}</span>
              <span className="rca-summary__label">Excused</span>
            </div>
          </div>

          {lowCount > 0 && (
            <div className="ga-banner ga-banner--error atr-alert">
              <Ic name="warning" size="sm" />
              {lowCount} class{lowCount !== 1 ? 'es' : ''} below 85% attendance — listed first below.
            </div>
          )}

          <div className="atr-list">
            {classes.map(c => (
              <div key={c.class_id} className={`atr-row${c.rate < 85 ? ' atr-row--low' : ''}`}>
                <div className="atr-row__head">
                  <div className="atr-row__name">
                    <Ic name="meeting_room" size="sm" />
                    <strong>{c.class_name}</strong>
                  </div>
                  <strong className="atr-row__rate" style={{ color: rateColor(c.rate) }}>{c.rate}%</strong>
                </div>
                <div className="pu-finance__bar-track">
                  <div className="pu-finance__bar-fill" style={{ width: `${c.rate}%`, background: rateColor(c.rate) }} />
                </div>
                <div className="atr-row__foot">
                  <span className="atr-pill atr-pill--green">{c.present} present</span>
                  <span className="atr-pill atr-pill--error">{c.absent} absent</span>
                  <span className="atr-pill atr-pill--warn">{c.late} late</span>
                  <span className="atr-pill">{c.excused} excused</span>
                  <span className="atr-row__total">{c.total} records</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
