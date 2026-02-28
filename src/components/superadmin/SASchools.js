import React, { useState, useMemo } from 'react';

/* ---- Icons ---- */
const IcSearch  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IcSchool  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 21h18M5 21V10.6M19 21V10.6M12 3L2 8h20L12 3z"/><rect x="9" y="13" width="6" height="8" rx="1"/></svg>;
const IcCheck   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcClock   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>;
const IcHealth  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IcDots    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="19" r="1" fill="currentColor"/></svg>;
const IcEye     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;

/* ---- Helpers ---- */
const AVATAR_COLORS = ['#1B3FAF','#0EA5E9','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#6366F1'];
const avatarColor   = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

const PAGE_SIZE = 10;

export default function SASchools({ schools, onReview }) {
  const [search,   setSearch]   = useState('');
  const [statusF,  setStatusF]  = useState('all');
  const [page,     setPage]     = useState(1);
  const [menuOpen, setMenuOpen] = useState(null);

  const approved = useMemo(() => schools.filter(s =>  s.is_approved).length, [schools]);
  const pending  = useMemo(() => schools.filter(s => !s.is_approved).length, [schools]);

  const filtered = useMemo(() => {
    let list = [...schools];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.code?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q) ||
        s.country?.toLowerCase().includes(q) ||
        s.principal_name?.toLowerCase().includes(q)
      );
    }
    if (statusF === 'approved') list = list.filter(s =>  s.is_approved);
    if (statusF === 'pending')  list = list.filter(s => !s.is_approved);
    return list;
  }, [schools, search, statusF]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged      = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const stats = [
    { label: 'Total Schools', value: schools.length,  icon: <IcSchool />,  cls: 'sa-stat-icon--blue'  },
    { label: 'Active',        value: approved,         icon: <IcCheck />,   cls: 'sa-stat-icon--green' },
    { label: 'Pending',       value: pending,          icon: <IcClock />,   cls: 'sa-stat-icon--amber' },
    { label: 'System Health', value: '98%',            icon: <IcHealth />,  cls: 'sa-stat-icon--purple'},
  ];

  return (
    <div>
      {/* Header */}
      <div className="sa-page-head">
        <div>
          <h1 className="sa-page-title">School Management</h1>
          <p className="sa-page-sub">Manage all registered schools across the platform.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="sa-stat-grid" style={{ marginBottom: 20 }}>
        {stats.map((s, i) => (
          <div key={i} className="sa-stat-card">
            <p className="sa-stat-label">{s.label}</p>
            <div className="sa-stat-row">
              <span className="sa-stat-value">{s.value}</span>
              <span className={`sa-stat-icon ${s.cls}`}>{s.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="sa-toolbar">
        <div className="sa-search-bar sa-toolbar-search">
          <IcSearch />
          <input
            className="sa-search-input"
            placeholder="Search by name, ID, or principal…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="sa-filter-tabs">
          {[
            { key: 'all',      label: 'All'      },
            { key: 'approved', label: 'Active'   },
            { key: 'pending',  label: 'Pending'  },
          ].map(t => (
            <button
              key={t.key}
              className={`sa-filter-tab${statusF === t.key ? ' active' : ''}`}
              onClick={() => { setStatusF(t.key); setPage(1); }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {paged.length === 0 ? (
        <div className="sa-card">
          <div className="sa-empty">
            <div className="sa-empty-icon">🏫</div>
            <p className="sa-empty-title">{search ? 'No results' : 'No schools found'}</p>
            <p className="sa-empty-desc">{search ? `Nothing matches "${search}"` : 'No schools have been registered yet.'}</p>
          </div>
        </div>
      ) : (
        <>
          <div className="sa-table-wrap">
            <table className="sa-table">
              <thead>
                <tr>
                  <th>School Name</th>
                  <th>Location</th>
                  <th>Admin / Principal</th>
                  <th>Registered</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(school => {
                  const color    = avatarColor(school.name);
                  const location = [school.city, school.country].filter(Boolean).join(', ') || school.address?.split(',')[0] || '—';
                  const admin    = school.admin_full_name || school.principal_name || '—';

                  return (
                    <tr key={school.id}>
                      {/* School name + code */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 34, height: 34, borderRadius: 8, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 800, color: '#fff', flexShrink: 0, textTransform: 'uppercase' }}>
                            {school.name[0]}
                          </div>
                          <div>
                            <span className="sa-table-school-name">{school.name}</span>
                            <span className="sa-table-school-id">ID: #{school.code}</span>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td>
                        <span style={{ color: 'var(--sa-text)', fontSize: '0.875rem' }}>{location}</span>
                        {school.region && <span className="sa-table-sub">{school.region}</span>}
                      </td>

                      {/* Admin */}
                      <td>
                        <span style={{ color: 'var(--sa-text)', fontSize: '0.875rem' }}>{admin}</span>
                        <span className="sa-table-sub">{school.admin_email || school.email || ''}</span>
                      </td>

                      {/* Date */}
                      <td style={{ color: 'var(--sa-text-2)', fontSize: '0.875rem' }}>
                        {fmtDate(school.registration_date)}
                      </td>

                      {/* Status */}
                      <td>
                        {school.is_approved
                          ? <span className="sa-badge sa-badge--approved">Active</span>
                          : school.changes_requested
                          ? <span className="sa-badge sa-badge--changes">Changes Requested</span>
                          : <span className="sa-badge sa-badge--pending">Pending</span>
                        }
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button
                            className="sa-btn sa-btn--ghost sa-btn--sm"
                            style={{ padding: '6px 10px' }}
                            onClick={() => setMenuOpen(menuOpen === school.id ? null : school.id)}
                          >
                            <IcDots />
                          </button>
                          {menuOpen === school.id && (
                            <div style={{ position: 'absolute', right: 0, top: '100%', marginTop: 4, background: 'var(--sa-card-bg)', border: '1px solid var(--sa-border)', borderRadius: 'var(--sa-radius-sm)', zIndex: 50, minWidth: 140, boxShadow: '0 8px 24px rgba(0,0,0,0.4)', overflow: 'hidden' }}>
                              <button
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', color: 'var(--sa-text)', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'var(--sa-font)', textAlign: 'left' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                onClick={() => { onReview(school); setMenuOpen(null); }}
                              >
                                <IcEye /> View Details
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, color: 'var(--sa-text-2)', fontSize: '0.875rem', flexWrap: 'wrap', gap: 10 }}>
              <span>Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} schools</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="sa-btn sa-btn--ghost sa-btn--sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                <button
                  className="sa-btn sa-btn--ghost sa-btn--sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
