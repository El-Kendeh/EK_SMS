import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { principalApi } from '../../api/adminApi';
import { downloadCsv } from '../../utils/csv';
import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css';
import './GradeApprovals.css';
import './AtRisk.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

export default function TeacherRoster() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    principalApi.getTeacherRoster()
      .then(res => {
        if (res?.success === false) { setError(res.message || 'Failed to load teacher roster'); return; }
        setTeachers(res.teachers || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? teachers.filter(t => (t.name || '').toLowerCase().includes(s) || (t.email || '').toLowerCase().includes(s)) : teachers;
  }, [teachers, q]);

  const active = teachers.filter(t => t.is_active).length;
  const totalPeriods = teachers.reduce((s, t) => s + (t.weekly_periods || 0), 0);

  const exportCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`teacher-roster-${stamp}.csv`, [
      ['Teacher', 'Email', 'Phone', 'Status', 'Weekly periods', 'Classes', 'Subjects'],
      ...filtered.map(t => [t.name, t.email, t.phone, t.is_active ? 'Active' : 'Suspended', t.weekly_periods, t.classes_taught, t.subjects_taught]),
    ]);
  };

  return (
    <div className="pu-page par-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Teacher Roster</h1>
          <p className="ska-page-sub">Every teacher on staff with their current teaching load</p>
        </div>
        {teachers.length > 0 && (
          <button type="button" className="ga-btn ga-btn--ghost par-export-btn" onClick={exportCsv}>
            <Ic name="download" size="sm" /> Export CSV
          </button>
        )}
      </div>

      {error && (
        <div className="pu-empty">
          <Ic name="error" size="xl" />
          <p className="pu-empty__title">Couldn't load teacher roster</p>
          <p className="pu-empty__desc">{error}</p>
        </div>
      )}

      {!error && loading && (
        <div className="pu-empty"><Ic name="hourglass_empty" size="xl" /><p className="pu-empty__title">Loading…</p></div>
      )}

      {!error && !loading && teachers.length === 0 && (
        <div className="pu-empty">
          <Ic name="groups" size="xl" />
          <p className="pu-empty__title">No teachers on staff yet</p>
          <p className="pu-empty__desc">Teacher accounts appear here once they're added to the school.</p>
        </div>
      )}

      {!error && !loading && teachers.length > 0 && (
        <>
          <div className="par-chips">
            <span className="par-chip par-chip--total"><Ic name="groups" size="sm" /> {teachers.length} teacher{teachers.length === 1 ? '' : 's'}</span>
            <span className="par-chip par-chip--medium"><Ic name="how_to_reg" size="sm" /> {active} active</span>
            <span className="par-chip par-chip--total"><Ic name="schedule" size="sm" /> {totalPeriods} periods/week</span>
          </div>

          <div className="par-toolbar" style={{ margin: '12px 0' }}>
            <label className="sr-only" htmlFor="tr-search">Search teachers</label>
            <input id="tr-search" className="ska-input" placeholder="Search by name or email…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 320 }} />
          </div>

          <div className="ga-table-wrap par-table-wrap">
            <table className="ga-table">
              <thead>
                <tr>
                  <th>Teacher</th><th>Contact</th><th>Status</th>
                  <th className="ga-col-num">Periods/wk</th><th className="ga-col-num">Classes</th><th className="ga-col-num">Subjects</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td data-label="Teacher"><strong>{t.name}</strong></td>
                    <td data-label="Contact">
                      <span className="ga-student">
                        <span className="ga-student__sub">{t.email || '—'}</span>
                        {t.phone ? <span className="ga-student__sub">{t.phone}</span> : null}
                      </span>
                    </td>
                    <td data-label="Status">
                      <span className={`ga-badge ${t.is_active ? 'ga-badge--approved' : 'ga-badge--rejected'}`}>{t.is_active ? 'Active' : 'Suspended'}</span>
                    </td>
                    <td className="ga-col-num" data-label="Periods/wk">{t.weekly_periods}</td>
                    <td className="ga-col-num" data-label="Classes">{t.classes_taught}</td>
                    <td className="ga-col-num" data-label="Subjects">{t.subjects_taught}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--ska-text-2)' }}>No teachers match “{q}”.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
