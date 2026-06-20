import React, { useState } from 'react';
import './SASchoolScope.css';

/* ------------------------------------------------------------------ */
/*  SASchoolScope — superadmin "view as school" wrapper                 */
/*                                                                      */
/*  School-scoped pages (finance, approvals, attendance, report cards)  */
/*  resolve their tenant server-side. Superadmin tokens carry no        */
/*  school_id, so this wrapper lets the superadmin pick a school; the   */
/*  selection is stored in sessionStorage and ApiClient appends it as   */
/*  ?school_id= on /api/principal, /api/finance and /api/school calls.  */
/*  Children remount (key) whenever the selection changes.              */
/* ------------------------------------------------------------------ */

export const SA_SCHOOL_KEY = 'ek-sms-sa-school-id';

const IcSchool = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21h18M5 21V10.6M19 21V10.6M12 3L2 8h20L12 3z" />
    <rect x="9" y="13" width="6" height="8" rx="1" />
  </svg>
);
const IcChevron = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

export default function SASchoolScope({ schools = [], children, hint }) {
  const [schoolId, setSchoolId] = useState(() => {
    try { return sessionStorage.getItem(SA_SCHOOL_KEY) || ''; } catch { return ''; }
  });

  const options = schools.filter(s => s.is_approved && s.is_active !== false);
  const current = options.find(s => String(s.id) === String(schoolId));

  const handleChange = (val) => {
    setSchoolId(val);
    try {
      if (val) sessionStorage.setItem(SA_SCHOOL_KEY, val);
      else sessionStorage.removeItem(SA_SCHOOL_KEY);
    } catch { /* sessionStorage unavailable */ }
  };

  return (
    <div className="sasc-wrap">
      <div className="sasc-bar">
        <span className="sasc-bar-label">
          <IcSchool />
          <span>Viewing school</span>
        </span>
        <div className="sasc-sel-wrap">
          <select
            className="sasc-select"
            value={schoolId}
            onChange={e => handleChange(e.target.value)}
            aria-label="Select school to view"
          >
            <option value="">— select a school —</option>
            {options.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <span className="sasc-sel-chevron"><IcChevron /></span>
        </div>
        {current && (
          <span className="sasc-live">
            <span className="sasc-live-dot" />
            {current.city || current.country || 'Active'}
          </span>
        )}
      </div>

      {schoolId ? (
        <div key={schoolId} className="sasc-body">{children}</div>
      ) : (
        <div className="sasc-empty">
          <div className="sasc-empty-icon"><IcSchool /></div>
          <h3 className="sasc-empty-title">Choose a school to continue</h3>
          <p className="sasc-empty-sub">
            {hint || 'This page shows live data for one school at a time. Pick a school above to load its data.'}
          </p>
          {options.length === 0 && (
            <p className="sasc-empty-sub sasc-empty-sub--warn">
              No approved schools yet — approve a school in Applications first.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
