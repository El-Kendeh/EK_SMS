import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ApiClient from '../../../api/client';
import { puHealthColor } from './principal.utils';

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

  const [dashboard,    setDashboard]    = useState(null);
  const [classPerf,    setClassPerf]    = useState({ top: [], low: [] });
  const [teacherData,  setTeacherData]  = useState({ overloaded: 0, underperforming: 0, pendingGrades: 0 });
  const [financeData,  setFinanceData]  = useState({ revenue: 0, outstanding: 0, paymentsToday: 0, transactions: [] });
  const [activityItems, setActivityItems] = useState([]);
  const [alerts,       setAlerts]       = useState([]);
  const [insights,     setInsights]     = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      ApiClient.get('/api/school/principal-users/').then(d => setRawUsers(d.principal_users || [])).catch(() => setRawUsers([])),
      ApiClient.get('/api/principal/dashboard/').then(d => setDashboard(d)).catch(() => {}),
      ApiClient.get('/api/principal/class-performance/').then(d => setClassPerf(d || { top: [], low: [] })).catch(() => {}),
      ApiClient.get('/api/principal/teacher-insights/').then(d => setTeacherData(d || {})).catch(() => {}),
      ApiClient.get('/api/principal/finance-snapshot/').then(d => setFinanceData(d || {})).catch(() => {}),
      ApiClient.get('/api/principal/activity-feed/').then(d => setActivityItems(d?.items || [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!dashboard) return;
    const d = dashboard;
    const newAlerts = [];
    if (d.totalGradeMods > 0) {
      newAlerts.push({ key: 'grades', tone: 'critical', icon: 'edit_note', title: `${d.totalGradeMods} grade modification attempt${d.totalGradeMods > 1 ? 's' : ''}`, detail: 'Audit teacher access and review change history.' });
    }
    if (d.totalAtRisk > 5) {
      newAlerts.push({ key: 'atrisk', tone: 'warning', icon: 'trending_down', title: `${d.totalAtRisk} students at academic risk`, detail: 'Convene a support meeting and assign mentors.' });
    }
    if (d.totalFinAnom > 0) {
      newAlerts.push({ key: 'finanom', tone: 'critical', icon: 'account_balance', title: 'Financial anomaly detected', detail: `${d.totalFinAnom} unusual transaction${d.totalFinAnom > 1 ? 's' : ''} in last 24h.` });
    }
    if (d.totalLowAttend > 0) {
      newAlerts.push({ key: 'lowatt', tone: 'warning', icon: 'event_busy', title: 'Low attendance classes', detail: `${d.totalLowAttend} class${d.totalLowAttend > 1 ? 'es' : ''} below 85% attendance.` });
    }
    setAlerts(newAlerts);

    const newInsights = [];
    if (d.avgAcademic < 75) newInsights.push('Consider a curriculum review for underperforming classes.');
    if (d.avgAttendance < 88) newInsights.push('Attendance dropping — schedule home visits.');
    if (d.totalAtRisk > 8) newInsights.push(`${d.totalAtRisk} students at risk — convene a support meeting.`);
    if (d.finance !== 'Stable') newInsights.push('Finance status is unstable — review collections this week.');
    if (newInsights.length === 0) newInsights.push('All key metrics within target. Keep monitoring trend lines.');
    setInsights(newInsights);
  }, [dashboard]);

  const summary = useMemo(() => {
    if (!dashboard) {
      return { totalStudents: 0, totalTeachers: 0, totalClasses: 0, avgAcademic: 0, avgAttendance: 0, finance: 'Stable', healthScore: 0 };
    }
    return dashboard;
  }, [dashboard]);

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

  const totalCount = rawUsers.length;
  const visibleUsers = rawUsers.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (statusFilter === 'active'    && !u.is_active) return false;
    if (statusFilter === 'suspended' &&  u.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${u.full_name || ''} ${u.email || ''}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const existingEmails = rawUsers.map(u => (u.email || '').trim().toLowerCase()).filter(Boolean);

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

      <StatsCards summary={summary} loading={loading} />
      <HealthScoreCard summary={summary} loading={loading} />

      <div className="pu-two-col">
        <div className="pu-two-col__left">
          <ClassPerformance data={classPerf} />
          <TeacherPanel data={teacherData}
            onManage={onNavigate ? () => onNavigate('teachers') : undefined} />
        </div>
        <div className="pu-two-col__right">
          <AlertsPanel alerts={alerts} />
          <InsightsPanel insights={insights} />
        </div>
      </div>

      <div className="pu-two-col">
        <div className="pu-two-col__left">
          <FinancePanel data={financeData} />
        </div>
        <div className="pu-two-col__right">
          <QuickActions onAction={(target) => onNavigate ? onNavigate(target) : null} />
        </div>
      </div>

      <ActivityFeed items={activityItems} />

      {showForm && (
        <AddPrincipalForm
          existingEmails={existingEmails}
          saving={saving}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)} />
      )}

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
          dashboard={dashboard}
          classPerf={classPerf}
          teacherData={teacherData}
          financeData={financeData}
          onClose={() => setDetailsUser(null)}
          onEdit={(u) => { setDetailsUser(null); handleEdit(u); }}
          onToggle={handleToggle} />
      )}
    </div>
  );
}
