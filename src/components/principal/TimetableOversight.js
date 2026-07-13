import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { principalApi } from '../../api/adminApi';
import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css';
import './GradeApprovals.css';
import './AtRisk.css';
import './TimetableOversight.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function TimetableOversight() {
  const [classes, setClasses] = useState([]);
  const [hasTimetable, setHasTimetable] = useState(false);
  const [activeClass, setActiveClass] = useState(null); // class_id
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    principalApi.getTimetable()
      .then(res => {
        if (res?.success === false) { setError(res.message || 'Failed to load timetable'); return; }
        const cs = res.classes || [];
        setClasses(cs);
        setHasTimetable(!!res.has_timetable);
        setActiveClass(cs.length ? cs[0].class_id : null);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const current = useMemo(() => classes.find(c => c.class_id === activeClass) || null, [classes, activeClass]);

  // Build a period -> day grid for the active class.
  const grid = useMemo(() => {
    if (!current) return { periods: [], byCell: {} };
    const periods = [...new Set(current.slots.map(s => s.period))].sort((a, b) => a - b);
    const byCell = {};
    current.slots.forEach(s => { byCell[`${s.period}-${s.day}`] = s; });
    return { periods, byCell };
  }, [current]);

  return (
    <div className="pu-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Timetable Oversight</h1>
          <p className="ska-page-sub">The school's published weekly timetable, by class</p>
        </div>
      </div>

      {error && (
        <div className="pu-empty">
          <Ic name="error" size="xl" />
          <p className="pu-empty__title">Couldn't load the timetable</p>
          <p className="pu-empty__desc">{error}</p>
        </div>
      )}

      {!error && loading && (
        <div className="pu-empty"><Ic name="hourglass_empty" size="xl" /><p className="pu-empty__title">Loading…</p></div>
      )}

      {!error && !loading && !hasTimetable && (
        <div className="pu-empty">
          <Ic name="calendar_month" size="xl" />
          <p className="pu-empty__title">No timetable has been generated yet</p>
          <p className="pu-empty__desc">Once the school administrator generates the timetable, it appears here for oversight.</p>
        </div>
      )}

      {!error && !loading && hasTimetable && (
        <>
          <div className="tt-tabs" role="tablist" aria-label="Classes">
            {classes.map(c => (
              <button
                key={c.class_id}
                role="tab"
                aria-selected={c.class_id === activeClass}
                className={`tt-tab${c.class_id === activeClass ? ' tt-tab--active' : ''}`}
                onClick={() => setActiveClass(c.class_id)}
              >
                {c.class_name}
              </button>
            ))}
          </div>

          {current && (
            <div className="tt-grid-wrap">
              <table className="tt-grid">
                <thead>
                  <tr>
                    <th className="tt-period-col">Period</th>
                    {DAYS.map((d, i) => <th key={i}>{d}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {grid.periods.map(p => (
                    <tr key={p}>
                      <th className="tt-period-col" scope="row">P{p}</th>
                      {DAYS.map((_, day) => {
                        const cell = grid.byCell[`${p}-${day}`];
                        if (!cell) return <td key={day} className="tt-cell tt-cell--empty">—</td>;
                        if (cell.is_break) return <td key={day} className="tt-cell tt-cell--break">Break</td>;
                        return (
                          <td key={day} className="tt-cell">
                            <span className="tt-subject">{cell.subject}</span>
                            {cell.teacher ? <span className="tt-teacher">{cell.teacher}</span> : null}
                            {cell.room ? <span className="tt-room">{cell.room}</span> : null}
                            {cell.start_time ? <span className="tt-time">{cell.start_time}{cell.end_time ? `–${cell.end_time}` : ''}</span> : null}
                          </td>
                        );
                      })}
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
