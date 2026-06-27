import React, { useEffect, useState } from 'react';
import ApiClient from '../../api/client';

/*
 * SchoolAdminHome — the school_admin landing page (activePage 'overview').
 *
 * Replaces the superadmin "Command Center" (SAOverview) that used to render for
 * school admins: that page showed platform-wide onboarding stats (Total Schools /
 * Pending Review) and called superadmin-only endpoints (/api/schools/:id/ → 404,
 * /api/security-* → 403), so every figure was 0/empty for a tenant admin. This
 * shows the admin's OWN school instead, using endpoints they can actually read.
 */

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const QUICK_ACTIONS = [
  { key: 'account-students',   label: 'Students',         icon: 'groups' },
  { key: 'account-teachers',   label: 'Teachers',         icon: 'co_present' },
  { key: 'classes',            label: 'Classes',          icon: 'category' },
  { key: 'timetable-mgr',      label: 'Timetable',        icon: 'schedule' },
  { key: 'fee-dashboard',      label: 'Fees',             icon: 'payments' },
  { key: 'exam-schedule',      label: 'Examinations',     icon: 'quiz' },
  { key: 'exam-officers',      label: 'Exam Officers',    icon: 'how_to_reg' },
  { key: 'ai-capture',         label: 'AI Capture',       icon: 'document_scanner' },
];

function StatCard({ icon, value, label, sub, color, loading }) {
  return (
    <div className="ska-card ska-card-pad" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 46, height: 46, borderRadius: 12, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${color}1a`, color,
      }}>
        <Ic name={icon} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, lineHeight: 1.1, color: 'var(--ska-text-1)' }}>
          {loading ? '—' : value}
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--ska-text-2)', fontWeight: 600 }}>{label}</div>
        {sub != null && !loading && (
          <div style={{ fontSize: '0.72rem', color: 'var(--ska-text-3)' }}>{sub}</div>
        )}
      </div>
    </div>
  );
}

export default function SchoolAdminHome({ navigateTo, schoolName }) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    students: null, studentsActive: null,
    teachers: null, teachersActive: null,
    classes: null, subjects: null,
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.allSettled([
      ApiClient.get('/api/school/student-stats/'),
      ApiClient.get('/api/school/teacher-stats/'),
      ApiClient.get('/api/school/classes/'),
      ApiClient.get('/api/school/subjects/'),
    ]).then(([st, te, cl, su]) => {
      if (!alive) return;
      const val = (r) => (r.status === 'fulfilled' ? r.value : null);
      const s = val(st), t = val(te), c = val(cl), j = val(su);
      setStats({
        students: s?.total ?? null,
        studentsActive: s?.active ?? null,
        teachers: t?.total ?? null,
        teachersActive: t?.active ?? null,
        classes: Array.isArray(c?.classes) ? c.classes.length : null,
        subjects: Array.isArray(j?.subjects) ? j.subjects.length : null,
      });
      setLoading(false);
    });
    return () => { alive = false; };
  }, []);

  const go = (k) => { if (navigateTo) navigateTo(k); };

  return (
    <div className="ska-content">
      <div className="ska-page-head">
        <div>
          <h1 className="ska-page-title">Welcome back</h1>
          <p className="ska-page-sub">
            {schoolName ? `Here's an overview of ${schoolName}.` : "Here's an overview of your school."}
          </p>
        </div>
      </div>

      <div className="ska-stat-grid-4">
        <StatCard icon="groups"     color="#2563eb" loading={loading}
          value={stats.students ?? 0} label="Students"
          sub={stats.studentsActive != null ? `${stats.studentsActive} active` : null} />
        <StatCard icon="co_present" color="#7c3aed" loading={loading}
          value={stats.teachers ?? 0} label="Teachers"
          sub={stats.teachersActive != null ? `${stats.teachersActive} active` : null} />
        <StatCard icon="category"   color="#0891b2" loading={loading}
          value={stats.classes ?? 0} label="Classes" />
        <StatCard icon="menu_book"  color="#d97706" loading={loading}
          value={stats.subjects ?? 0} label="Subjects" />
      </div>

      <div className="ska-card ska-card-pad" style={{ marginTop: 20 }}>
        <h3 style={{ margin: '0 0 14px', fontSize: '0.9375rem', fontWeight: 800 }}>Quick actions</h3>
        <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {QUICK_ACTIONS.map(a => (
            <button key={a.key} type="button" onClick={() => go(a.key)}
              className="ska-card ska-card-pad"
              style={{
                display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                textAlign: 'left', border: '1px solid var(--ska-border)', background: 'var(--ska-surface-low)',
                minHeight: 56,
              }}>
              <span style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--ska-primary-dim)', color: 'var(--ska-primary)',
              }}>
                <Ic name={a.icon} size="sm" />
              </span>
              <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
