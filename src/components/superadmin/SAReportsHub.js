import React, { useState, useEffect } from 'react';
import './SAReportsHub.css';

/* ------------------------------------------------------------------ */
/*  SAReportsHub — 'reports' page                                       */
/*  Central export + reporting launcher for the superadmin: download    */
/*  platform datasets (schools, users, grade stats) and jump to the     */
/*  live analytic pages.                                                */
/* ------------------------------------------------------------------ */

const API = (process.env.REACT_APP_NODE_API_URL || process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const token = () => { try { return localStorage.getItem('token') || ''; } catch { return ''; } };

async function apiGet(path) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!r.ok) { let m = `HTTP ${r.status}`; try { const d = await r.json(); m = d.message || m; } catch {} throw new Error(m); }
  return r.json();
}

async function downloadAuth(path, filename) {
  const r = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token()}` } });
  if (!r.ok) { let m = `HTTP ${r.status}`; try { const d = await r.json(); m = d.message || m; } catch {} throw new Error(m); }
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadText(filename, text, type = 'text/csv') {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const csvEsc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

const IcSchools = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V10.6M19 21V10.6M12 3L2 8h20L12 3z"/><rect x="9" y="13" width="6" height="8" rx="1"/></svg>;
const IcUsers   = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>;
const IcGrades  = () => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IcLink    = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg>;
const IcDown    = () => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
const IcWarn    = () => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

export default function SAReportsHub({ onNavigate }) {
  const [counts, setCounts] = useState({ schools: null, users: null, grades: null });
  const [busy, setBusy]     = useState('');
  const [error, setError]   = useState('');

  useEffect(() => {
    apiGet('/api/dashboard/')
      .then(d => setCounts(c => ({ ...c, schools: d.schools, users: d.total_users })))
      .catch(() => {});
    apiGet('/api/grade-stats/')
      .then(d => setCounts(c => ({ ...c, grades: d.total_grades })))
      .catch(() => {});
  }, []);

  const run = async (key, fn) => {
    setBusy(key); setError('');
    try { await fn(); }
    catch (e) { setError(e.message || 'Export failed.'); }
    finally { setBusy(''); }
  };

  const exportUsersCsv = async () => {
    const d = await apiGet('/api/users/');
    const users = d.users || [];
    if (!users.length) throw new Error('No users to export.');
    const cols = Object.keys(users[0]);
    const lines = [cols.join(',')];
    users.forEach(u => lines.push(cols.map(c => csvEsc(u[c])).join(',')));
    downloadText('eksms_users.csv', lines.join('\n'));
  };

  const exportGradeStats = async () => {
    const d = await apiGet('/api/grade-stats/');
    downloadText('eksms_grade_stats.json', JSON.stringify(d, null, 2), 'application/json');
  };

  const cards = [
    {
      key: 'schools',
      icon: <IcSchools />, tone: 'blue',
      title: 'Schools Register',
      desc: 'Every institution on the platform with location, contact and approval status.',
      count: counts.schools != null ? `${counts.schools} schools` : '',
      actions: [
        { label: 'CSV',  fn: () => downloadAuth('/api/sa/export/?format=csv&datasets=schools', 'eksms_schools.csv') },
        { label: 'JSON', fn: () => downloadAuth('/api/sa/export/?format=json&datasets=schools', 'eksms_schools.json') },
      ],
    },
    {
      key: 'users',
      icon: <IcUsers />, tone: 'green',
      title: 'Platform Users',
      desc: 'All user accounts across every role — admins, principals, bursars, teachers, students, parents.',
      count: counts.users != null ? `${counts.users} users` : '',
      actions: [{ label: 'CSV', fn: exportUsersCsv }],
    },
    {
      key: 'grades',
      icon: <IcGrades />, tone: 'violet',
      title: 'Grade Statistics',
      desc: 'Aggregated grade volumes, approval pipeline and per-school accumulation snapshot.',
      count: counts.grades != null ? `${counts.grades} grades` : '',
      actions: [{ label: 'JSON', fn: exportGradeStats }],
    },
  ];

  const links = [
    { key: 'analytics',               label: 'Platform Analytics',      desc: 'Growth, engagement and per-school benchmarks' },
    { key: 'grade-report',            label: 'Grade Reports',           desc: 'Grade integrity reporting and audit trails' },
    { key: 'grades-accumulation',     label: 'Grades Accumulation',     desc: 'Per-school grade volume and approval pipeline' },
    { key: 'school-financial-report', label: 'School Financial Report', desc: 'Revenue, expenses and debtors for any school' },
    { key: 'attendance-report',       label: 'Attendance Report',       desc: 'Class-by-class attendance for any school' },
    { key: 'system-audits',           label: 'Security Audit Log',      desc: 'Every sensitive action recorded on the platform' },
  ];

  return (
    <div className="sarh-wrap">
      <div className="sarh-head">
        <div>
          <h1 className="sarh-title">Reports</h1>
          <p className="sarh-sub">Export platform datasets or open a live report. Every export is recorded in the security audit log.</p>
        </div>
      </div>

      {error && <div className="sarh-banner"><IcWarn /><span>{error}</span></div>}

      <div className="sarh-grid">
        {cards.map(c => (
          <div key={c.key} className={`sarh-card sarh-card--${c.tone}`}>
            <div className="sarh-card-top">
              <span className="sarh-card-icon">{c.icon}</span>
              {c.count && <span className="sarh-count">{c.count}</span>}
            </div>
            <h3 className="sarh-card-title">{c.title}</h3>
            <p className="sarh-card-desc">{c.desc}</p>
            <div className="sarh-card-actions">
              {c.actions.map(a => (
                <button
                  key={a.label}
                  className="sarh-dl-btn"
                  disabled={busy === `${c.key}-${a.label}`}
                  onClick={() => run(`${c.key}-${a.label}`, a.fn)}
                >
                  <IcDown /> {busy === `${c.key}-${a.label}` ? 'Preparing…' : `Download ${a.label}`}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="sarh-links-card">
        <h2 className="sarh-links-title">Live Reports</h2>
        <div className="sarh-links">
          {links.map(l => (
            <button key={l.key} className="sarh-link" onClick={() => onNavigate && onNavigate(l.key)}>
              <span>
                <span className="sarh-link-label">{l.label}</span>
                <span className="sarh-link-desc">{l.desc}</span>
              </span>
              <IcLink />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
