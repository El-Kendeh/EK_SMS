import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { principalApi } from '../../api/adminApi';
import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css';
import './GradeApprovals.css';
import './SyllabusProgress.css';

const Ic = ({ name, size }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true">{name}</span>
);

const SORT_OPTIONS = [
  { key: 'name-asc',  label: 'Name (A–Z)' },
  { key: 'name-desc', label: 'Name (Z–A)' },
  { key: 'pct-asc',   label: 'Progress (Low → High)' },
  { key: 'pct-desc',  label: 'Progress (High → Low)' },
];

const barColor = (pct) => (pct >= 80 ? 'var(--ska-green)' : pct >= 50 ? '#f59e0b' : 'var(--ska-error)');

export default function SyllabusProgress({ schoolId }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name-asc');

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    principalApi.getSyllabusProgress()
      .then(res => {
        if (res?.success === false) { setError(res.message || 'Failed to load syllabus progress'); return; }
        setSubjects(res.subjects || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const stats = useMemo(() => {
    if (subjects.length === 0) return { avg: 0, onTrack: 0, behind: 0 };
    const total = subjects.reduce((sum, s) => sum + (s.pct || 0), 0);
    return {
      avg: Math.round(total / subjects.length),
      onTrack: subjects.filter(s => (s.pct || 0) >= 80).length,
      behind: subjects.filter(s => (s.pct || 0) < 50).length,
    };
  }, [subjects]);

  const visible = useMemo(() => {
    let list = subjects;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(s => s.name?.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q));
    }
    const sorted = [...list];
    switch (sort) {
      case 'name-desc': sorted.sort((a, b) => (b.name || '').localeCompare(a.name || '')); break;
      case 'pct-asc':   sorted.sort((a, b) => (a.pct || 0) - (b.pct || 0)); break;
      case 'pct-desc':  sorted.sort((a, b) => (b.pct || 0) - (a.pct || 0)); break;
      default:          sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return sorted;
  }, [subjects, search, sort]);

  return (
    <div className="pu-page syp-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Syllabus Progress</h1>
          <p className="ska-page-sub">Curriculum coverage across all subjects this term</p>
        </div>
      </div>

      {!error && !loading && subjects.length > 0 && (
        <div className="rca-summary">
          <div className="rca-summary__item">
            <span className="rca-summary__num">{stats.avg}%</span>
            <span className="rca-summary__label">Average coverage</span>
          </div>
          <div className="rca-summary__item">
            <span className="rca-summary__num rca-summary__num--green">{stats.onTrack}</span>
            <span className="rca-summary__label">On track (≥80%)</span>
          </div>
          <div className="rca-summary__item">
            <span className="rca-summary__num syp-summary__num--warn">{stats.behind}</span>
            <span className="rca-summary__label">Behind (&lt;50%)</span>
          </div>
          <div className="rca-summary__item">
            <span className="rca-summary__num">{subjects.length}</span>
            <span className="rca-summary__label">Subjects</span>
          </div>
        </div>
      )}

      {!error && !loading && subjects.length > 0 && (
        <div className="syp-controls">
          <div className="syp-search">
            <Ic name="search" size="sm" />
            <input
              type="text"
              placeholder="Search subjects…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="ga-select" value={sort} onChange={e => setSort(e.target.value)}>
            {SORT_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </div>
      )}

      {error && (
        <div className="pu-empty">
          <Ic name="error" size="xl" />
          <p className="pu-empty__title">Couldn't load syllabus progress</p>
          <p className="pu-empty__desc">{error}</p>
        </div>
      )}

      {!error && loading && (
        <div className="pu-empty">
          <Ic name="hourglass_empty" size="xl" />
          <p className="pu-empty__title">Loading…</p>
        </div>
      )}

      {!error && !loading && subjects.length === 0 && (
        <div className="pu-empty">
          <Ic name="menu_book" size="xl" />
          <p className="pu-empty__title">No syllabus data available</p>
          <p className="pu-empty__desc">Topics will appear here once teachers start tracking syllabus coverage.</p>
        </div>
      )}

      {!error && !loading && subjects.length > 0 && visible.length === 0 && (
        <div className="pu-empty">
          <Ic name="search_off" size="xl" />
          <p className="pu-empty__title">No subjects match "{search}"</p>
        </div>
      )}

      {!error && !loading && visible.length > 0 && (
        <div className="syp-list">
          {visible.map(s => (
            <div key={s.code || s.name} className="syp-row">
              <div className="syp-row__head">
                <div className="syp-row__name">
                  <strong>{s.name}</strong>
                  {s.code && <span className="ga-muted">({s.code})</span>}
                </div>
                <strong className="syp-row__pct" style={{ color: barColor(s.pct) }}>{s.pct}%</strong>
              </div>
              <div className="pu-finance__bar-track">
                <div className="pu-finance__bar-fill" style={{ width: `${s.pct}%`, background: barColor(s.pct) }} />
              </div>
              <div className="syp-row__foot">
                <span>{s.covered_topics} of {s.total_topics} topics covered</span>
                <span>{s.pending}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
