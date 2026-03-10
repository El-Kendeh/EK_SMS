import React, { useState, useMemo } from 'react';

/* ================================================================
   Mock data
   ================================================================ */
const ROLES = [
  { id: 'superadmin', name: 'Super Admin',      desc: 'Full system oversight with unrestricted access to all modules and configuration settings.', users: 4,  isProtected: true,  isCustom: false },
  { id: 'principal',  name: 'School Principal', desc: 'Manage school-level operations, view reports, and manage staff accounts.',                  users: 12, isProtected: false, isCustom: false },
  { id: 'teacher',    name: 'Teacher',          desc: 'Access to assigned courses, student grading, and attendance tracking only.',                users: 84, isProtected: false, isCustom: false },
  { id: 'registrar',  name: 'Registrar',        desc: 'Admissions management and student record keeping access.',                                  users: 4,  isProtected: false, isCustom: true  },
];

const PERM_COLS = ['view', 'create', 'edit', 'delete', 'approve'];

const MODULES = [
  {
    id: 'grades', name: 'Grade Management',
    perms: [
      { id: 'grade_entry',    name: 'Grade Entry',          desc: 'Input student grades',                  sensitive: false, disabledCols: [] },
      { id: 'modify_locked',  name: 'Modify Locked Grades', desc: 'High-risk action. Requires audit trail.', sensitive: true,  disabledCols: ['create', 'delete'] },
    ],
  },
  {
    id: 'students', name: 'Student Records',
    perms: [
      { id: 'demographics',  name: 'Demographics',      desc: 'PII Data Access',      sensitive: false, disabledCols: ['approve'] },
      { id: 'bulk_delete',   name: 'Bulk Delete Students', desc: 'Irreversible action.', sensitive: true,  disabledCols: ['view', 'create', 'edit', 'approve'] },
    ],
  },
  { id: 'financials', name: 'Financials', perms: [], collapsed: true },
];

const DEFAULT_PERMS = {
  superadmin: { grade_entry: {view:true,  create:true,  edit:true,  delete:true,  approve:true  }, modify_locked: {view:true,  create:true,  edit:true,  delete:true,  approve:true  }, demographics: {view:true,  create:true,  edit:true,  delete:true,  approve:true  }, bulk_delete: {view:true,  create:false, edit:false, delete:true,  approve:false} },
  principal:  { grade_entry: {view:true,  create:false, edit:false, delete:false, approve:true  }, modify_locked: {view:true,  create:false, edit:false, delete:false, approve:false }, demographics: {view:true,  create:true,  edit:true,  delete:false, approve:false }, bulk_delete: {view:false, create:false, edit:false, delete:false, approve:false} },
  teacher:    { grade_entry: {view:true,  create:true,  edit:true,  delete:false, approve:false }, modify_locked: {view:true,  create:false, edit:false, delete:false, approve:false }, demographics: {view:true,  create:false, edit:false, delete:false, approve:false }, bulk_delete: {view:false, create:false, edit:false, delete:false, approve:false} },
  registrar:  { grade_entry: {view:true,  create:false, edit:false, delete:false, approve:false }, modify_locked: {view:true,  create:false, edit:false, delete:false, approve:false }, demographics: {view:true,  create:true,  edit:true,  delete:false, approve:false }, bulk_delete: {view:false, create:false, edit:false, delete:false, approve:false} },
};

/* ================================================================
   SVG Icons
   ================================================================ */
const IcShield    = ({size=22}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcSchool    = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V10.6M19 21V10.6M12 3L2 8h20L12 3z"/><rect x="9" y="13" width="6" height="8" rx="1"/></svg>;
const IcPerson    = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.58-7 8-7s8 3 8 7"/></svg>;
const IcBadge     = () => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L9 4H5v4l-2 2 2 2v4h4l3 2 3-2h4v-4l2-2-2-2V4h-4l-3-2z"/><circle cx="12" cy="12" r="2"/></svg>;
const IcSearch    = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcCopy      = ({size=18}) => <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
const IcSave      = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const IcAdd       = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcBack      = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const IcWarn      = () => <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcDanger    = () => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IcChevron   = ({up}) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points={up ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}/></svg>;

const ROLE_ICONS = { superadmin: <IcShield />, principal: <IcSchool />, teacher: <IcPerson />, registrar: <IcBadge /> };

/* ================================================================
   PermissionEditor
   ================================================================ */
function PermissionEditor({ role, perms, onPermsChange, onBack, onSave }) {
  const [collapsed,    setCollapsed]    = useState({ financials: true });
  const [showConfirm,  setShowConfirm]  = useState(false);

  const togglePerm = (permId, col) => {
    onPermsChange(prev => ({
      ...prev,
      [permId]: { ...prev[permId], [col]: !prev[permId]?.[col] },
    }));
  };

  const toggleAll = (mod) => {
    const allOn = PERM_COLS.every(col => mod.perms.every(p => p.disabledCols?.includes(col) || perms[p.id]?.[col]));
    onPermsChange(prev => {
      const next = { ...prev };
      mod.perms.forEach(p => {
        next[p.id] = { ...prev[p.id] };
        PERM_COLS.forEach(col => {
          if (!p.disabledCols?.includes(col)) next[p.id][col] = !allOn;
        });
      });
      return next;
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--sa-border)' }}>
        <button className="sa-role-icon-btn" onClick={onBack} aria-label="Back to roles"><IcBack /></button>
        <div>
          <p style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--sa-text)' }}>Edit Role: {role.name}</p>
          <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>EK-SMS Administration</p>
        </div>
      </div>

      {/* Warning banner */}
      <div className="sa-gov-warning">
        <IcWarn />
        <div>
          <p className="sa-gov-warning-title">Sensitive Role</p>
          <p className="sa-gov-warning-sub">Changes made here affect {role.users} active users immediately.</p>
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {MODULES.map(mod => (
          <div key={mod.id} className="sa-perm-module">
            <div className="sa-perm-module-header">
              <h3 className="sa-perm-module-title">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {mod.id === 'grades'    && <><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></>}
                  {mod.id === 'students'  && <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></>}
                  {mod.id === 'financials'&& <><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>}
                </svg>
                {mod.name}
              </h3>
              {mod.perms.length === 0 ? (
                <button className="sa-role-icon-btn" onClick={() => setCollapsed(c => ({ ...c, [mod.id]: !c[mod.id] }))} aria-label="Toggle section">
                  <IcChevron up={!collapsed[mod.id]} />
                </button>
              ) : (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.6875rem', color: 'var(--sa-text-2)', cursor: 'pointer' }}>
                  All
                  <input type="checkbox" style={{ accentColor: 'var(--sa-accent)', width: 14, height: 14 }}
                    checked={PERM_COLS.every(col => mod.perms.every(p => p.disabledCols?.includes(col) || perms[p.id]?.[col]))}
                    onChange={() => toggleAll(mod)}
                  />
                </label>
              )}
            </div>

            {mod.perms.length === 0
              ? collapsed[mod.id]
                ? <div className="sa-perm-module-collapsed" />
                : <div className="sa-perm-module-body"><div style={{ padding: '16px', textAlign: 'center', color: 'var(--sa-text-3)', fontSize: '0.75rem' }}>No permissions configured.</div></div>
              : (
                <div className="sa-perm-module-body">
                  {mod.perms.map(perm => (
                    <div key={perm.id} className={`sa-perm-item${perm.sensitive ? ' sa-perm-item--sensitive' : ''}`}>
                      <div className="sa-perm-item-header">
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          {perm.sensitive && <span className="sa-perm-sensitive-icon"><IcDanger /></span>}
                          <div>
                            <p className="sa-perm-item-name">{perm.name}</p>
                            <p className={`sa-perm-item-desc${perm.sensitive ? ' sa-perm-item-desc--danger' : ''}`}>{perm.desc}</p>
                          </div>
                        </div>
                      </div>
                      <div className="sa-perm-matrix">
                        {PERM_COLS.map(col => {
                          const disabled = perm.disabledCols?.includes(col);
                          const checked  = perms[perm.id]?.[col] ?? false;
                          return (
                            <div key={col} className="sa-perm-matrix-col">
                              <span className="sa-perm-col-label">{col.charAt(0).toUpperCase() + col.slice(1)}</span>
                              <input type="checkbox" className="sa-perm-checkbox"
                                checked={checked} disabled={disabled}
                                onChange={() => !disabled && togglePerm(perm.id, col)}
                                aria-label={`${col} permission for ${perm.name}`}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="sa-gov-footer">
        <button className="sa-gov-cancel-btn" onClick={onBack}>Cancel</button>
        <button className="sa-gov-save-btn" onClick={() => setShowConfirm(true)}>
          <IcSave /> Review &amp; Save
        </button>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="sa-gov-modal-overlay" onClick={() => setShowConfirm(false)}>
          <div className="sa-gov-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--sa-text)', marginBottom: 8 }}>Confirm Permission Changes</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', marginBottom: 20, lineHeight: 1.55 }}>
              You are about to update permissions for <strong style={{ color: 'var(--sa-text)' }}>{role.name}</strong>.
              This will affect <strong style={{ color: 'var(--sa-amber)' }}>{role.users} active users</strong> immediately.
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="sa-gov-cancel-btn" style={{ flex: 1 }} onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="sa-gov-save-btn"   style={{ flex: 1 }} onClick={() => { setShowConfirm(false); onSave(); }}>Confirm Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   SAGovernance — Role list
   ================================================================ */
export default function SAGovernance() {
  const [view,         setView]         = useState('list');
  const [selectedRole, setSelectedRole] = useState(null);
  const [search,       setSearch]       = useState('');
  const [perms,        setPerms]        = useState(DEFAULT_PERMS);
  const [savedToast,   setSavedToast]   = useState(false);

  const filteredRoles = useMemo(
    () => ROLES.filter(r => r.name.toLowerCase().includes(search.toLowerCase())),
    [search],
  );

  const handleEditRole = (role) => { setSelectedRole(role); setView('editor'); };

  const handleSave = () => {
    setView('list');
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 3000);
  };

  if (view === 'editor' && selectedRole) {
    return (
      <PermissionEditor
        role={selectedRole}
        perms={perms[selectedRole.id] || {}}
        onPermsChange={(updater) => setPerms(prev => ({
          ...prev,
          [selectedRole.id]: typeof updater === 'function' ? updater(prev[selectedRole.id] || {}) : updater,
        }))}
        onBack={() => setView('list')}
        onSave={handleSave}
      />
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {savedToast && <div className="sa-toast sa-toast--success">Permissions saved successfully</div>}

      {/* Page head */}
      <div className="sa-page-head">
        <div>
          <h1 className="sa-page-title">Role-Based Access</h1>
          <p className="sa-page-sub">Manage roles, permissions, and access controls</p>
        </div>
        <button className="sa-gov-fab" aria-label="Create new role"><IcAdd /></button>
      </div>

      {/* Stats */}
      <div className="sa-gov-stats">
        <div className="sa-gov-stat">
          <div className="sa-gov-stat-icon">
            <div className="sa-gov-stat-icon-wrap sa-gov-stat-icon-wrap--blue"><IcShield size={18} /></div>
            <span className="sa-gov-stat-label">Security</span>
          </div>
          <div>
            <span className="sa-gov-stat-value">142</span>
            <p className="sa-gov-stat-sub">Total Permissions Defined</p>
          </div>
        </div>
        <div className="sa-gov-stat">
          <div className="sa-gov-stat-icon">
            <div className="sa-gov-stat-icon-wrap sa-gov-stat-icon-wrap--amber">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <span className="sa-gov-stat-label">Critical</span>
          </div>
          <div>
            <span className="sa-gov-stat-value">3</span>
            <p className="sa-gov-stat-sub">Roles with Elevated Access</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="sa-gov-search-wrap">
        <span className="sa-gov-search-icon"><IcSearch /></span>
        <input type="text" className="sa-gov-search" placeholder="Search roles..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Role cards */}
      {filteredRoles.map(role => (
        <div key={role.id} className="sa-role-card">
          {role.isProtected && <span className="sa-role-badge sa-role-badge--protected">System Protected</span>}
          {role.isCustom    && <span className="sa-role-badge sa-role-badge--custom">Custom Role</span>}

          <div className="sa-role-card-top">
            <div className={`sa-role-avatar${role.id === 'superadmin' ? ' sa-role-avatar--gradient' : ''}`}>
              {ROLE_ICONS[role.id]}
            </div>
            <div style={{ minWidth: 0, paddingRight: (role.isProtected || role.isCustom) ? 110 : 0 }}>
              <h3 className="sa-role-name">{role.name}</h3>
              <p className="sa-role-desc">{role.desc}</p>
            </div>
          </div>

          <div className="sa-role-footer">
            <div className="sa-role-users">
              <strong>{role.users}</strong>&nbsp;Active Users
            </div>
            <div className="sa-role-btn-row">
              <button className="sa-role-icon-btn" aria-label="Clone role"><IcCopy size={16} /></button>
              <button
                className="sa-role-edit-btn"
                onClick={() => handleEditRole(role)}
                disabled={role.isProtected}
                style={{ opacity: role.isProtected ? 0.45 : 1, cursor: role.isProtected ? 'not-allowed' : 'pointer' }}
              >
                {role.isProtected ? 'View Only' : 'Edit Role'}
              </button>
            </div>
          </div>
        </div>
      ))}

      {filteredRoles.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--sa-text-2)', fontSize: '0.875rem' }}>
          No roles match "{search}"
        </div>
      )}
    </div>
  );
}
