import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ApiClient from '../../api/client';

/* ---- Icons ---- */
const IcSearch = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
const IcFilter = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></svg>;
const IcShield = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const IcWarn = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
const IcArrow = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
const IcTrend = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>;

/* ================================================================
   Mock data — realistic school grade modification requests
   ================================================================ */
export const MOCK_REQUESTS = [
  {
    id: 'REQ-2026-001',
    student: 'Fatima Koroma',
    school: 'MAB Secondary School',
    term: 'Term 2, 2025/26',
    subject: 'Mathematics',
    oldGrade: 'B+', oldScore: 88,
    newGrade: 'A-', newScore: 91,
    reason: 'Calculation error on final project weighting. Re-calculation verified by Department Head.',
    status: 'Pending',
    urgency: 'medium',
    verified: true,
    hashMatch: true,
    ts: '2026-02-28 14:30',
    requester: { name: 'Mr. A. Jalloh', role: 'Mathematics Dept.', initials: 'AJ', ip: '192.168.1.42', device: 'Campus PC — Windows 11', location: 'Campus WiFi — Building A' },
    approver: null,
    blockHash: '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    prevHash: '0x3a19b22f91e4c7d8a5b63f21c40d985e77a1234f560cb72e89df41c33de78ba1',
    blockNum: 192048,
  },
  {
    id: 'REQ-2026-002',
    student: 'Ibrahim Bangura',
    school: 'AIC Grammar School',
    term: 'Term 2, 2025/26',
    subject: 'Physics 101',
    oldGrade: 'C', oldScore: 74,
    newGrade: 'B', newScore: 82,
    reason: 'Late submission approved due to verified medical emergency. Supporting certificate attached.',
    status: 'Pending',
    urgency: 'low',
    verified: true,
    hashMatch: true,
    ts: '2026-02-28 11:15',
    requester: { name: 'Mrs. E. Robinson', role: 'Science Dept.', initials: 'ER', ip: '10.0.1.55', device: 'Laptop — macOS', location: 'School Network — Staff Room' },
    approver: null,
    blockHash: '0xa2c9d4f1b3e78902a45c6d71e2f834b1',
    prevHash: '0x1f3d9a2c7b40f85e3d12c6a9b8e70421',
    blockNum: 192031,
  },
  {
    id: 'REQ-2026-003',
    student: 'Mohamed Conteh',
    school: 'UMU School',
    term: 'Term 1, 2025/26',
    subject: 'Biology AP',
    oldGrade: 'F', oldScore: 55,
    newGrade: 'A', newScore: 95,
    reason: '"System Error" — No supporting documentation provided. Unusual 40-point jump in score.',
    status: 'Flagged',
    urgency: 'critical',
    verified: false,
    hashMatch: false,
    ts: '2026-02-27 08:50',
    requester: { name: 'Mr. S. Kamara', role: 'Science Dept.', initials: 'SK', ip: '45.22.19.112', device: 'Unknown — External', location: 'External Network (Flagged)' },
    approver: null,
    blockHash: null,
    prevHash: null,
    blockNum: null,
  },
  {
    id: 'REQ-2026-004',
    student: 'Aminata Turay',
    school: 'MAB Secondary School',
    term: 'Term 2, 2025/26',
    subject: 'English Literature',
    oldGrade: 'B', oldScore: 80,
    newGrade: 'B+', newScore: 87,
    reason: 'Essay re-graded after formal appeal. Department peer review confirmed higher score.',
    status: 'Approved',
    urgency: 'low',
    verified: true,
    hashMatch: true,
    ts: '2026-02-26 16:22',
    requester: { name: 'Ms. P. Williams', role: 'English Dept.', initials: 'PW', ip: '192.168.1.33', device: 'MacBook — macOS', location: 'Campus WiFi — Library' },
    approver: { name: 'Principal Sesay', role: 'Administration', initials: 'PS', ip: '192.168.1.10', device: 'Desktop — Windows', location: 'Admin Office Network' },
    blockHash: '0xb1d4e7f2a9c38b12456d91e0f7a23c84',
    prevHash: '0x9a2c4b8e1d67f032c5a8b3e9d14f7601',
    blockNum: 191987,
  },
  {
    id: 'REQ-2026-005',
    student: 'Abdul Turay',
    school: 'AIC Grammar School',
    term: 'Term 2, 2025/26',
    subject: 'Chemistry',
    oldGrade: 'A-', oldScore: 90,
    newGrade: 'A+', newScore: 97,
    reason: 'Marking error on practical exam — verified independently by external examiner board.',
    status: 'Pending',
    urgency: 'medium',
    verified: true,
    hashMatch: true,
    ts: '2026-02-28 09:42',
    requester: { name: 'Dr. B. Mansaray', role: 'Science Dept.', initials: 'BM', ip: '192.168.2.18', device: 'PC — Windows 11', location: 'Science Lab Network' },
    approver: null,
    blockHash: '0xf2e1c9b4a7d36520e8f13b94c50a7d12',
    prevHash: '0x7c3a1e8b4d92f067c5a4b8e2d31f6090',
    blockNum: 192041,
  },
  {
    id: 'REQ-2026-006',
    student: 'Sia Bangura',
    school: 'Fourah Bay Secondary',
    term: 'Term 1, 2025/26',
    subject: 'History AP',
    oldGrade: 'C+', oldScore: 78,
    newGrade: 'B-', newScore: 80,
    reason: 'Minor marking oversight — confirmed via recorded oral examination transcript.',
    status: 'Approved',
    urgency: 'low',
    verified: true,
    hashMatch: true,
    ts: '2026-02-25 13:10',
    requester: { name: 'Mr. J. Kanu', role: 'Humanities Dept.', initials: 'JK', ip: '10.0.3.22', device: 'Tablet — Android', location: 'Campus WiFi — Classroom B' },
    approver: { name: 'Vice Principal Koroma', role: 'Administration', initials: 'VK', ip: '10.0.1.5', device: 'Desktop', location: 'Admin Network' },
    blockHash: '0xe4c1a7f2b9d38012456c91e0f8a23b75',
    prevHash: '0x8b3c5d9e2f174062c4a7b2e8d03f6512',
    blockNum: 191964,
  },
];

/* ---- Urgency accent colour ---- */
function accentClass(urgency) {
  if (urgency === 'critical') return 'red';
  if (urgency === 'medium') return 'orange';
  if (urgency === 'low') return 'blue';
  return 'blue';
}

/* ---- Status badge styles ---- */
function statusCfg(status) {
  if (status === 'Approved') return { color: 'var(--sa-green)', bg: 'var(--sa-green-dim)' };
  if (status === 'Flagged') return { color: 'var(--sa-red)', bg: 'var(--sa-red-dim)' };
  if (status === 'Rejected') return { color: 'var(--sa-text-2)', bg: 'var(--sa-card-bg2)' };
  return { color: 'var(--sa-amber)', bg: 'var(--sa-amber-dim)' };
}

/* ================================================================
   Request Card
   ================================================================ */
function RequestCard({ req, onClick }) {
  const accent = accentClass(req.urgency);
  const st = statusCfg(req.status);
  const isFlagged = !req.hashMatch;

  return (
    <div className="sa-gi-card" onClick={onClick} role="button" tabIndex={0} onKeyDown={e => e.key === 'Enter' && onClick()} aria-label={`Grade modification request ${req.id}`}>
      {/* Accent bar */}
      <div className={`sa-gi-card-accent sa-gi-card-accent--${accent}`} />

      {/* Top row: REQ ID + badges + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'Consolas, monospace', fontSize: '0.6875rem', color: 'var(--sa-text-3)', letterSpacing: '0.02em' }}>#{req.id}</span>
          {/* Hash badge */}
          <span className={`sa-gi-hash-badge ${req.hashMatch ? 'sa-gi-hash-badge--ok' : 'sa-gi-hash-badge--bad'}`}>
            <span style={{ width: 10, height: 10, display: 'flex' }}>{req.hashMatch ? <IcShield /> : <IcWarn />}</span>
            {req.hashMatch ? (req.verified ? 'Blockchain Verified' : 'Hash Match') : 'Hash Mismatch'}
          </span>
        </div>
        {/* Status badge */}
        <span style={{
          padding: '3px 10px', borderRadius: 8, fontSize: '0.6875rem', fontWeight: 700,
          background: st.bg, color: st.color, border: `1px solid ${st.color}33`, flexShrink: 0,
        }}>
          {req.status}
        </span>
      </div>

      {/* Student + school */}
      <div style={{ marginBottom: 12 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: 'var(--sa-text)' }}>{req.student}</p>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--sa-text-2)', marginTop: 2 }}>{req.school} · {req.term}</p>
      </div>

      {/* Grade comparison */}
      <div className="sa-gi-compare" style={{ marginBottom: 12 }}>
        <div className="sa-gi-compare-box">
          <p style={{ margin: '0 0 4px', fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--sa-text-3)', fontWeight: 700 }}>Original</p>
          <p className="sa-gi-grade-old">{req.oldGrade} <span style={{ fontSize: '0.75rem' }}>({req.oldScore})</span></p>
          <p style={{ margin: '2px 0 0', fontSize: '0.625rem', color: 'var(--sa-text-3)' }}>{req.subject}</p>
        </div>
        <div className={`sa-gi-compare-box ${isFlagged ? 'sa-gi-compare-box--flagged' : 'sa-gi-compare-box--new'}`}>
          <p style={{ margin: '0 0 4px', fontSize: '0.5625rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: isFlagged ? 'var(--sa-red)' : 'var(--sa-accent)', fontWeight: 700 }}>Requested</p>
          <p className={isFlagged ? 'sa-gi-grade-new sa-gi-grade-new--flagged' : 'sa-gi-grade-new'}>{req.newGrade} <span style={{ fontSize: '0.75rem' }}>({req.newScore})</span></p>
          <p style={{ margin: '2px 0 0', fontSize: '0.625rem', color: 'var(--sa-text-3)' }}>+{req.newScore - req.oldScore} pts</p>
        </div>
      </div>

      {/* Reason */}
      <p style={{
        margin: '0 0 12px',
        fontSize: '0.8125rem',
        color: 'var(--sa-text-2)',
        lineHeight: 1.5,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--sa-text)' }}>Reason: </span>{req.reason}
      </p>

      {/* Footer: requester + timestamp + arrow */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--sa-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div className="sa-gi-avatar">{req.requester.initials}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--sa-text-2)' }}>{req.requester.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--sa-text-3)' }}>
            {req.ts.slice(11, 16)} · {req.ts.slice(5, 10)}
          </span>
          <span style={{ width: 16, height: 16, display: 'flex', color: 'var(--sa-text-3)' }}><IcArrow /></span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Main: Grade Modification Request List
   ================================================================ */
const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'Pending', label: 'Pending' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Flagged', label: 'Flagged' },
  { key: 'Rejected', label: 'Rejected' },
];

export default function SAGradeIntegrity({ onDetail }) {
  const [alerts, setAlerts] = useState([]);
  const [, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [schoolFilt, setSchoolFilt] = useState('');

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await ApiClient.get('/api/grade-alerts/');
      if (data.success) {
        setAlerts(data.alerts);
      }
    } catch (err) {
      console.error('Failed to fetch grade alerts', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const counts = useMemo(() => {
    const c = { all: alerts.length, Pending: 0, Approved: 0, Flagged: 0, Rejected: 0 };
    alerts.forEach(r => { if (c[r.status] !== undefined) c[r.status]++; });
    return c;
  }, [alerts]);

  const filtered = useMemo(() => {
    let list = alerts;
    if (activeTab !== 'all') list = list.filter(r => r.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.student.toLowerCase().includes(q) ||
        r.school.toLowerCase().includes(q) ||
        r.subject.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.requester.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [alerts, activeTab, search]);

  /* Schools for filter dropdown */
  const schools = useMemo(() => [...new Set(alerts.map(r => r.school))], [alerts]);

  return (
    <div>

      {/* ── Page Header ── */}
      <div className="sa-page-head" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="sa-page-title">Grade Modification Requests</h1>
          <p className="sa-page-sub">Review, validate, and audit all grade change requests across all schools.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Anomaly indicator */}
          {counts.Flagged > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'var(--sa-red-dim)', color: 'var(--sa-red)',
              border: '1px solid rgba(239,68,68,0.25)', borderRadius: 20,
              padding: '5px 12px', fontSize: '0.75rem', fontWeight: 700,
            }}>
              <span style={{ width: 14, height: 14, display: 'flex' }}><IcWarn /></span>
              {counts.Flagged} Flagged
            </div>
          )}
        </div>
      </div>

      {/* ── Search + Filter Bar ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div className="sa-search-bar" style={{ flex: 1, minWidth: 200 }}>
          <IcSearch />
          <input
            className="sa-search-input"
            type="text"
            placeholder="Search by ID, student, teacher, subject…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search grade modification requests"
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--sa-text-2)', fontSize: '0.75rem' }}>
          <span style={{ width: 14, height: 14, display: 'flex' }}><IcFilter /></span>
          <select
            value={schoolFilt}
            onChange={e => setSchoolFilt(e.target.value)}
            style={{
              background: 'var(--sa-card-bg)', border: '1px solid var(--sa-border)',
              borderRadius: 8, padding: '6px 10px', fontSize: '0.75rem',
              color: 'var(--sa-text-2)', cursor: 'pointer', outline: 'none',
            }}
            aria-label="Filter by school"
          >
            <option value="">All Schools</option>
            {schools.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* ── Status Tabs ── */}
      <div className="sa-filter-tabs" style={{ marginBottom: 16, overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: 4 }}>
        {STATUS_TABS.map(t => (
          <button
            key={t.key}
            className={`sa-filter-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {t.label}
            <span style={{
              marginLeft: 6, fontSize: '0.625rem', fontWeight: 700,
              background: activeTab === t.key ? 'rgba(255,255,255,0.15)' : 'var(--sa-border)',
              borderRadius: 10, padding: '1px 7px', minWidth: 20, display: 'inline-block', textAlign: 'center',
            }}>
              {counts[t.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Request Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {filtered
          .filter(r => !schoolFilt || r.school === schoolFilt)
          .map(req => (
            <RequestCard key={req.id} req={req} onClick={() => onDetail && onDetail(req)} />
          ))
        }
        {filtered.filter(r => !schoolFilt || r.school === schoolFilt).length === 0 && (
          <div className="sa-empty">
            <div className="sa-empty-icon" style={{ fontSize: 32 }}>
              <IcTrend />
            </div>
            <p className="sa-empty-title">No requests found</p>
            <p className="sa-empty-desc">Try adjusting your search or filter</p>
          </div>
        )}
      </div>

    </div>
  );
}
