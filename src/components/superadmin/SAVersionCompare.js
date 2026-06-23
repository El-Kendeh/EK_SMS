import React from 'react';

/* ---- Icons ---- */
const IcBack  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const IcInfo  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IcCheck = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

/* ---- Field row ---- */
function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '11px 16px', borderBottom: '1px solid var(--sa-border)' }}>
      <span style={{ fontSize: '0.6875rem', color: 'var(--sa-text-3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: 'var(--sa-text)', textAlign: 'right', wordBreak: 'break-word' }}>{value || '—'}</span>
    </div>
  );
}

/* SAVersionCompare — formerly a fabricated v1-vs-v2 diff. EK-SMS does not store
   prior revisions of a registration, so there is no real "original" to diff
   against; the old code synthesised v1 from the current data and rendered fake
   red/green changes above a live Approve button. This is now an honest read-only
   review of the single submission on record. */
export default function SAVersionCompare({ school, onBack, onApprove, isLoading }) {
  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <button className="sa-btn sa-btn--ghost sa-btn--sm" style={{ marginBottom: 20, gap: 6 }} onClick={onBack}>
        <IcBack /> Back
      </button>

      <div className="sa-page-head" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="sa-page-title">Application Review</h1>
          <p className="sa-page-sub">{school.name}</p>
        </div>
      </div>

      {/* Honest note — no prior revision is stored */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 16, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
        <span style={{ flexShrink: 0, color: 'var(--sa-amber)', display: 'flex', width: 16, height: 16 }}><IcInfo /></span>
        <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--sa-text-2)', lineHeight: 1.5 }}>
          EK-SMS does not store prior revisions of a registration, so there is no earlier version to compare. The current submission on record is shown below for review.
        </p>
      </div>

      {/* Current submission (single source of truth) */}
      <div className="sa-card" style={{ marginBottom: 16 }}>
        <div className="sa-card-head"><p className="sa-card-title">Current Submission</p></div>
        <div className="sa-card-body" style={{ padding: 0 }}>
          <Field label="School Name"      value={school.name} />
          <Field label="Institution Type" value={school.institution_type} />
          <Field label="Website"          value={school.website} />
          <Field label="Motto"            value={school.motto} />
          <Field label="Address"          value={school.address} />
          <Field label="City"             value={school.city} />
          <Field label="Region"           value={school.region} />
          <Field label="Country"          value={school.country} />
          <Field label="Admin Name"       value={school.admin_full_name || school.principal_name} />
          <Field label="Admin Email"      value={school.admin_email || school.email} />
        </div>
      </div>

      {/* Approve CTA — approves the real submission above */}
      {!school.is_approved && (
        <div style={{ marginTop: 20, padding: '18px 20px', background: 'var(--sa-card-bg)', border: '1px solid var(--sa-border)', borderRadius: 'var(--sa-radius)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--sa-text)' }}>Approve Application</p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text-2)' }}>Accept this submission and activate the school account.</p>
          </div>
          <button className="sa-btn sa-btn--approve" onClick={onApprove} disabled={isLoading} style={{ flexShrink: 0 }}>
            <IcCheck /> Approve
          </button>
        </div>
      )}
    </div>
  );
}
