import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ApiClient from '../../../api/client';
import {
  puEnrich, schoolSummary, buildAlerts, buildInsights,
  classPerformance, teacherInsights, financeSnapshot, activityFeed,
} from './principal.utils';

import StatsCards       from './StatsCards';
import HealthScoreCard  from './HealthScoreCard';
import AlertsPanel      from './AlertsPanel';
import InsightsPanel    from './InsightsPanel';
import ClassPerformance from './ClassPerformance';
import TeacherPanel     from './TeacherPanel';
import FinancePanel     from './FinancePanel';
import QuickActions     from './QuickActions';
import ActivityFeed     from './ActivityFeed';
import FiltersBar       from './FiltersBar';
import PrincipalCard    from './PrincipalCard';
import PrincipalDetails from './PrincipalDetails';
import AddPrincipalForm from './AddPrincipalForm';
import './Principal.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

function Banner({ msg }) {
  if (!msg) return null;
  return (
    <div className={`pu-banner pu-banner--${msg.type}`}>
      <Ic name={msg.type === 'ok' ? 'check_circle' : 'error'} size="sm" />
      {msg.text}
    </div>
  );
}

/**
 * Principal page — School Command Dashboard.
 * Backend logic untouched (same /api/school/principal-users/ endpoints).
 *
 * `onNavigate` (optional) — invoked by Quick Actions with a page key
 * (e.g. 'analytics', 'teachers'). Wire it from dashboard.js if you want
 * cross-page navigation.
 */
export default function PrincipalPage({ school, onNavigate }) {
  const [rawUsers,     setRawUsers]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [banner,       setBanner]       = useState(null);
  const [showForm,     setShowForm]     = useState(false);
  const [saving,       setSaving]       = useState(false);
  const [search,       setSearch]       = useState('');
  const [roleFilter,   setRoleFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detailsUser,  setDetailsUser]  = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    ApiClient.get('/api/school/principal-users/')
      .then(d => setRawUsers(d.principal_users || []))
      .catch(() => setRawUsers([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const users    = useMemo(() => rawUsers.map((u, i) => puEnrich(u, i)), [rawUsers]);
  const summary  = useMemo(() => schoolSummary(users, school), [users, school]);
  const alerts   = useMemo(() => buildAlerts(summary), [summary]);
  const insights = useMemo(() => buildInsights(summary), [summary]);
  const classes  = useMemo(() => classPerformance(summary, school), [summary, school]);
  const tInsight = useMemo(() => teacherInsights(summary, school), [summary, school]);
  const finance  = useMemo(() => financeSnapshot(summary, school), [summary, school]);
  const feed     = useMemo(() => activityFeed(users), [users]);

  /* CRUD handlers — backend untouched */
  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await ApiClient.post('/api/school/principal-users/', payload);
      setBanner({ type: 'ok', text: 'Principal created successfully.' });
      setShowForm(false);
      load();
    } catch (err) {
      setBanner({ type: 'err', text: err?.message || 'Failed to create principal.' });
    }
    setSaving(false);
  };
  const handleToggle = async (u) => {
    try {
      const res = await ApiClient.put(`/api/school/principal-users/${u.id}/`, {});
      setBanner({ type: 'ok', text: res.message || 'Status updated.' });
      load();
      if (detailsUser?.id === u.id) setDetailsUser(null);
    } catch {
      setBanner({ type: 'err', text: 'Failed to update status.' });
    }
  };
  const handleEdit = (u) =>
    setBanner({ type: 'ok', text: `Edit ${u.full_name}'s leadership profile (coming soon).` });

  /* Filtering */
  const totalCount = users.length;
  const visibleUsers = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter === 'active'    && !u.is_active) return false;
    if (statusFilter === 'suspended' &&  u.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${u.full_name || ''} ${u.email || ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const existingEmails = users.map(u => (u.email || '').trim().toLowerCase()).filter(Boolean);

  return (
    <div className="ska-content pu-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Principal</h1>
          <p className="ska-page-sub">{school?.name} — Leadership &amp; oversight command center</p>
        </div>
        <button
          className={`ska-btn ${showForm ? 'ska-btn--ghost' : 'ska-btn--primary'}`}
          onClick={() => { setShowForm(f => !f); setBanner(null); }}>
          <Ic name={showForm ? 'close' : 'person_add'} size="sm" />
          {showForm ? 'Cancel' : 'Add Principal'}
        </button>
      </div>

      <Banner msg={banner} />

      {/* 1. Executive KPI cards */}
      <StatsCards summary={summary} loading={loading} />

      {/* 2. School Health Score (hero) */}
      <HealthScoreCard summary={summary} loading={loading} />

      {/* 3+4. 2-column row: left academic/teacher, right alerts/insights */}
      <div className="pu-two-col">
        <div className="pu-two-col__left">
          <ClassPerformance data={classes} />
          <TeacherPanel data={tInsight}
            onManage={onNavigate ? () => onNavigate('teachers') : undefined} />
        </div>
        <div className="pu-two-col__right">
          <AlertsPanel alerts={alerts} />
          <InsightsPanel insights={insights} />
        </div>
      </div>

      {/* 5+6. Finance + Quick Actions side by side */}
      <div className="pu-two-col">
        <div className="pu-two-col__left">
          <FinancePanel data={finance} />
        </div>
        <div className="pu-two-col__right">
          <QuickActions onAction={(target) => onNavigate ? onNavigate(target) : null} />
        </div>
      </div>

      {/* 7. Activity feed */}
      <ActivityFeed items={feed} />

      {/* ── Add form ── */}
      {showForm && (
        <AddPrincipalForm
          existingEmails={existingEmails}
          saving={saving}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)} />
      )}

      {/* ── Principal Staff Management ── */}
      <div className="pu-section-divider">
        <Ic name="admin_panel_settings" size="sm" />
        <strong>Principal Staff Management</strong>
        <span>Accounts with leadership oversight</span>
      </div>

      {!loading && totalCount > 0 && (
        <FiltersBar
          search={search}             onSearch={setSearch}
          roleFilter={roleFilter}     onRole={setRoleFilter}
          statusFilter={statusFilter} onStatus={setStatusFilter} />
      )}

      {loading ? (
        <div className="pu-empty">
          <Ic name="hourglass_empty" size="xl" style={{ color: 'var(--ska-text-3)' }} />
          <p className="pu-empty__title">Loading principals…</p>
        </div>
      ) : totalCount === 0 ? (
        <div className="pu-empty pu-empty--cta">
          <div className="pu-empty__icon-wrap">
            <Ic name="workspace_premium" />
          </div>
          <p className="pu-empty__title">No principals yet</p>
          <p className="pu-empty__desc">
            Create a principal account to grant school leadership and oversight access.
          </p>
          <button className="ska-btn ska-btn--primary" onClick={() => setShowForm(true)}>
            <Ic name="person_add" size="sm" /> Add Principal
          </button>
        </div>
      ) : visibleUsers.length === 0 ? (
        <div className="pu-empty">
          <Ic name="search_off" size="xl" style={{ color: 'var(--ska-text-3)' }} />
          <p className="pu-empty__title">No matches</p>
          <p className="pu-empty__desc">Try a different search term or clear filters.</p>
        </div>
      ) : (
        <div className="pu-grid">
          {visibleUsers.map(u => (
            <PrincipalCard key={u.id}
              u={u}
              onView={setDetailsUser}
              onEdit={handleEdit}
              onToggle={handleToggle} />
          ))}
        </div>
      )}

      {detailsUser && (
        <PrincipalDetails
          u={detailsUser}
          onClose={() => setDetailsUser(null)}
          onEdit={(u) => { setDetailsUser(null); handleEdit(u); }}
          onToggle={handleToggle} />
      )}
    </div>
  );
}
