import React, { useCallback, useEffect, useState } from 'react';
import ApiClient from '../../../api/client';
import FiltersBar          from './FiltersBar';
import FinanceUserCard     from './FinanceUserCard';
import FinanceUserDetails  from './FinanceUserDetails';
import AddFinanceUserForm  from './AddFinanceUserForm';
import './FinanceUsers.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

function Banner({ msg }) {
  if (!msg) return null;
  return (
    <div className={`fu-banner fu-banner--${msg.type}`}>
      <Ic name={msg.type === 'ok' ? 'check_circle' : 'error'} size="sm" />
      {msg.text}
    </div>
  );
}

export default function FinanceUsersPage({ school }) {
  const [rawUsers,       setRawUsers]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [banner,         setBanner]         = useState(null);
  const [showForm,       setShowForm]       = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [search,         setSearch]         = useState('');
  const [roleFilter,     setRoleFilter]     = useState('all');
  const [statusFilter,   setStatusFilter]   = useState('all');
  const [detailsUser,    setDetailsUser]    = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    ApiClient.get('/api/school/finance-users/')
      .then(d => setRawUsers(d.finance_users || []))
      .catch(() => setRawUsers([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);

  // Real count from the backend. The previous "summary" aggregates (transactions
  // today, volume, risk levels, transaction heat, alerts) were derived from fields
  // the backend never returns, so those dashboards were removed rather than shown
  // as fabricated zeros. Restore them only once the API computes real figures.
  const total = rawUsers.length;

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

  const visibleUsers = rawUsers.filter(u => {
    if (roleFilter !== 'all'   && u.role !== roleFilter) return false;
    if (statusFilter === 'active'    && !u.is_active) return false;
    if (statusFilter === 'suspended' &&  u.is_active) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${u.full_name || ''} ${u.email || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const existingEmails = rawUsers.map(u => (u.email || '').trim().toLowerCase()).filter(Boolean);

  return (
    <div className="ska-content fu-page">
      <div className="fu-page__head">
        <div>
          <h1 className="ska-page-title">Finance Users</h1>
          <p className="ska-page-sub">{school?.name} — Access control</p>
        </div>
        <button
          className={`ska-btn ${showForm ? 'ska-btn--ghost' : 'ska-btn--primary'}`}
          onClick={() => { setShowForm(f => !f); setBanner(null); }}>
          <Ic name={showForm ? 'close' : 'person_add'} size="sm" />
          {showForm ? 'Cancel' : 'Add Finance User'}
        </button>
      </div>

      <Banner msg={banner} />

      {showForm && (
        <AddFinanceUserForm
          existingEmails={existingEmails}
          saving={saving}
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)} />
      )}

      {!loading && total > 0 && (
        <FiltersBar
          search={search}             onSearch={setSearch}
          roleFilter={roleFilter}     onRole={setRoleFilter}
          statusFilter={statusFilter} onStatus={setStatusFilter}
        />
      )}

      {loading ? (
        <div className="fu-empty">
          <Ic name="hourglass_empty" size="xl" style={{ color: 'var(--ska-text-3)' }} />
          <p className="fu-empty__title">Loading finance users…</p>
        </div>
      ) : total === 0 ? (
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
