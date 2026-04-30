import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ApiClient from '../../../api/client';
import { fuEnrich, summariseUsers, heatSummary, generateAlerts } from './finance.utils';
import StatsCards          from './StatsCards';
import ActivityPanel       from './ActivityPanel';
import AlertsPanel         from './AlertsPanel';
import TransactionHeat     from './TransactionHeat';
import FiltersBar          from './FiltersBar';
import FinanceUserCard     from './FinanceUserCard';
import FinanceUserDetails  from './FinanceUserDetails';
import AddFinanceUserForm  from './AddFinanceUserForm';
import IntegrityPanel      from './IntegrityPanel';
import './FinanceUsers.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/* ── Inline banner for create / status messages ───────────── */
function Banner({ msg }) {
  if (!msg) return null;
  return (
    <div className={`fu-banner fu-banner--${msg.type}`}>
      <Ic name={msg.type === 'ok' ? 'check_circle' : 'error'} size="sm" />
      {msg.text}
    </div>
  );
}

/**
 * Finance Users — Financial Control Dashboard.
 * Backend logic unchanged from the previous inline implementation.
 */
export default function FinanceUsersPage({ school }) {
  const [rawUsers,       setRawUsers]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [banner,         setBanner]         = useState(null);
  const [showForm,       setShowForm]       = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [search,         setSearch]         = useState('');
  const [roleFilter,     setRoleFilter]     = useState('all');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [riskFilter,     setRiskFilter]     = useState('all');
  const [detailsUser,    setDetailsUser]    = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    ApiClient.get('/api/school/finance-users/')
      .then(d => setRawUsers(d.finance_users || []))
      .catch(() => setRawUsers([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  const users = useMemo(() => rawUsers.map(fuEnrich), [rawUsers]);
  const summary = useMemo(() => summariseUsers(users), [users]);
  const heat    = useMemo(() => heatSummary(users), [users]);
  const alerts  = useMemo(() => generateAlerts(users), [users]);

  const handleCreate = async (payload) => {
    setSaving(true);
    try {
      await ApiClient.post('/api/school/finance-users/', payload);
      setBanner({ type: 'ok', text: 'Finance user created successfully.' });
      setShowForm(false);
      load();
    } catch (err) {
      setBanner({ type: 'err', text: err?.message || 'Failed to create user.' });
    }
    setSaving(false);
  };

  const handleToggle = async (u) => {
    try {
      const res = await ApiClient.put(`/api/school/finance-users/${u.id}/`, {});
      setBanner({ type: 'ok', text: res.message || 'Status updated.' });
      load();
      if (detailsUser?.id === u.id) setDetailsUser(null);
    } catch {
      setBanner({ type: 'err', text: 'Failed to update status.' });
    }
  };

  const handleEdit = (u) =>
    setBanner({ type: 'ok', text: `Edit Role: open ${u.full_name}'s role editor (coming soon).` });

  /* ── Filtering ───────────────────────────────────────── */
  const visibleUsers = users.filter(u => {
    if (roleFilter !== 'all'   && u.role !== roleFilter) return false;
    if (statusFilter === 'active'    && !u.is_active) return false;
    if (statusFilter === 'suspended' &&  u.is_active) return false;
    if (activityFilter === 'high' && u.txToday < 10)  return false;
    if (activityFilter === 'low'  && u.txToday >= 10) return false;
    if (activityFilter === 'idle' && u.txToday !== 0) return false;
    if (riskFilter !== 'all' && u.risk !== riskFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${u.full_name || ''} ${u.email || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const existingEmails = users.map(u => (u.email || '').trim().toLowerCase()).filter(Boolean);

  return (
    <div className="ska-content fu-page">
      {/* ── Page head ── */}
      <div className="fu-page__head">
        <div>
          <h1 className="ska-page-title">Finance Users</h1>
          <p className="ska-page-sub">{school?.name} — Access control &amp; transaction authority</p>
        </div>
        <button
          className={`ska-btn ${showForm ? 'ska-btn--ghost' : 'ska-btn--primary'}`}
          onClick={() => { setShowForm(f => !f); setBanner(null); }}>
          <Ic name={showForm ? 'close' : 'person_add'} size="sm" />
          {showForm ? 'Cancel' : 'Add Finance User'}
        </button>
      </div>

      <Banner msg={banner} />

      {/* ── 1. Stats cards ── */}
      <StatsCards summary={summary} loading={loading} />

      {/* ── 2. Activity panel ── */}
      {!loading && summary.total > 0 && (
        <ActivityPanel summary={summary} />
      )}

      {/* ── 5. Transaction heat (after activity) ── */}
      {!loading && summary.total > 0 && (
        <TransactionHeat heat={heat} />
      )}

      {/* ── 4. Alerts panel ── */}
      {!loading && summary.total > 0 && (
        <AlertsPanel alerts={alerts} />
      )}

      {/* ── Add form ── */}
      {showForm && (
        <AddFinanceUserForm
          existingEmails={existingEmails}
          saving={saving}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)} />
      )}

      {/* ── 6. Filters bar ── */}
      {!loading && summary.total > 0 && (
        <FiltersBar
          search={search}             onSearch={setSearch}
          roleFilter={roleFilter}     onRole={setRoleFilter}
          statusFilter={statusFilter} onStatus={setStatusFilter}
          activityFilter={activityFilter} onActivity={setActivityFilter}
          riskFilter={riskFilter}     onRisk={setRiskFilter}
        />
      )}

      {/* ── 3. Finance user cards (or empty / loading) ── */}
      {loading ? (
        <div className="fu-empty">
          <Ic name="hourglass_empty" size="xl" style={{ color: 'var(--ska-text-3)' }} />
          <p className="fu-empty__title">Loading finance users…</p>
        </div>
      ) : summary.total === 0 ? (
        <div className="fu-empty fu-empty--cta">
          <div className="fu-empty__icon-wrap">
            <Ic name="account_balance" />
          </div>
          <p className="fu-empty__title">No finance team configured yet</p>
          <p className="fu-empty__desc">
            Add finance users to manage payments, receipts, refunds and financial operations.
          </p>
          <button className="ska-btn ska-btn--primary" onClick={() => setShowForm(true)}>
            <Ic name="person_add" size="sm" /> Add Finance User
          </button>
        </div>
      ) : visibleUsers.length === 0 ? (
        <div className="fu-empty">
          <Ic name="search_off" size="xl" style={{ color: 'var(--ska-text-3)' }} />
          <p className="fu-empty__title">No matches</p>
          <p className="fu-empty__desc">Try a different search term or clear your filters.</p>
        </div>
      ) : (
        <div className="fu-grid">
          {visibleUsers.map(u => (
            <FinanceUserCard key={u.id}
              u={u}
              onView={setDetailsUser}
              onEdit={handleEdit}
              onToggle={handleToggle} />
          ))}
        </div>
      )}

      {/* ── 7. System integrity panel (always visible) ── */}
      <IntegrityPanel summary={summary} />

      {/* ── Details modal ── */}
      {detailsUser && (
        <FinanceUserDetails
          u={detailsUser}
          onClose={() => setDetailsUser(null)}
          onEdit={(u) => { setDetailsUser(null); handleEdit(u); }}
          onToggle={handleToggle} />
      )}
    </div>
  );
}
