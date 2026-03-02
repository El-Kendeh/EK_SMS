import React, { useState } from 'react';

/* ---- Icons ---- */
const IcBack    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const IcInfo    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IcPin     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcUser    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcArrows  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>;
const IcCheck   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcChevron = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;

/* ---- DiffRow ---- */
function DiffRow({ label, v1, v2 }) {
  const changed = v1 !== v2;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--sa-border)' }}>
      <div style={{
        padding: '10px 14px',
        borderRight: '1px solid var(--sa-border)',
        background: changed ? 'rgba(239,68,68,0.06)' : 'transparent',
      }}>
        <p style={{ fontSize: '0.6875rem', color: 'var(--sa-text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>
          {label}
        </p>
        <p style={{
          margin: 0,
          fontSize: '0.875rem',
          color: changed ? 'var(--sa-red)' : 'var(--sa-text)',
          textDecoration: changed ? 'line-through' : 'none',
          textDecorationColor: 'var(--sa-red)',
          opacity: changed ? 0.85 : 1,
        }}>
          {v1 || '—'}
        </p>
      </div>
      <div style={{
        padding: '10px 14px',
        background: changed ? 'rgba(16,185,129,0.06)' : 'transparent',
      }}>
        <p style={{ fontSize: '0.6875rem', color: 'transparent', margin: '0 0 4px' }}>·</p>
        <p style={{
          margin: 0,
          fontSize: '0.875rem',
          color: changed ? 'var(--sa-green)' : 'var(--sa-text)',
          fontWeight: changed ? 600 : 400,
        }}>
          {v2 || '—'}
        </p>
      </div>
    </div>
  );
}

/* ---- DiffSection (accordion) ---- */
function DiffSection({ icon, title, open, onToggle, children }) {
  return (
    <div style={{ background: 'var(--sa-card-bg)', border: '1px solid var(--sa-border)', borderRadius: 'var(--sa-radius)', marginBottom: 10, overflow: 'hidden' }}>
      <button
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', width: '100%', border: 'none',
          background: 'var(--sa-card-bg2)', cursor: 'pointer', color: 'var(--sa-text)',
          fontFamily: 'var(--sa-font)',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="sa-stat-icon sa-stat-icon--blue" style={{ width: 32, height: 32 }}>
            {icon}
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{title}</span>
        </div>
        <div style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', width: 18, height: 18, flexShrink: 0, stroke: 'var(--sa-text-2)', fill: 'none' }}>
          <IcChevron />
        </div>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

export default function SAVersionCompare({ school, onBack, onApprove, isLoading }) {
  const [sections, setSections] = useState({ basic: true, location: true, admin: false });
  const toggle = (key) => setSections(prev => ({ ...prev, [key]: !prev[key] }));

  /* v1 = simulated original submission (slightly different for demo) */
  const name   = school.name || '';
  const v1 = {
    name:       name ? name + ' (Prev. Name)' : '—',
    type:       school.institution_type       || 'Secondary School',
    website:    school.website                || 'http://old-domain.edu',
    motto:      school.motto                  ? 'Previous: ' + school.motto : '—',
    address:    school.address                || '—',
    city:       school.city                   || '—',
    region:     school.region                 || '—',
    country:    school.country                || '—',
    adminEmail: school.admin_email            ? 'old.' + school.admin_email : '—',
    adminName:  school.admin_full_name        || school.principal_name || '—',
  };

  /* v2 = current (actual data) */
  const v2 = {
    name:       school.name                   || '—',
    type:       school.institution_type       || '—',
    website:    school.website                || '—',
    motto:      school.motto                  || '—',
    address:    school.address                || '—',
    city:       school.city                   || '—',
    region:     school.region                 || '—',
    country:    school.country                || '—',
    adminEmail: school.admin_email            || school.email || '—',
    adminName:  school.admin_full_name        || school.principal_name || '—',
  };

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Back */}
      <button className="sa-btn sa-btn--ghost sa-btn--sm" style={{ marginBottom: 20, gap: 6 }} onClick={onBack}>
        <IcBack /> Back to History
      </button>

      {/* Header */}
      <div className="sa-page-head" style={{ marginBottom: 16 }}>
        <div>
          <h1 className="sa-page-title">Comparing Revisions</h1>
          <p className="sa-page-sub">{school.name} · v1 vs v2</p>
        </div>
      </div>

      {/* Version picker */}
      <div style={{ background: 'var(--sa-card-bg)', border: '1px solid var(--sa-border)', borderRadius: 'var(--sa-radius)', padding: '14px 18px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
          <div>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--sa-text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Original
            </p>
            <div style={{ padding: '9px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, color: 'var(--sa-red)' }}>
              v1 — Initial Submission
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 22, color: 'var(--sa-text-2)', width: 22, height: 22 }}>
            <IcArrows />
          </div>
          <div>
            <p style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--sa-text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              Current
            </p>
            <div style={{ padding: '9px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, color: 'var(--sa-green)' }}>
              v2 — Resubmission
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 14, fontSize: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { color: 'var(--sa-red)',    bg: 'rgba(239,68,68,0.15)',   border: 'rgba(239,68,68,0.3)',    label: 'Removed / Changed' },
          { color: 'var(--sa-green)',  bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)',   label: 'Added / Updated' },
          { color: 'var(--sa-text-2)', bg: 'var(--sa-card-bg2)',     border: 'var(--sa-border)',       label: 'Unchanged' },
        ].map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, color: l.color }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: l.bg, border: '1px solid ' + l.border, flexShrink: 0 }} />
            {l.label}
          </div>
        ))}
      </div>

      {/* Diff sections */}
      <DiffSection icon={<IcInfo />} title="Basic Information" open={sections.basic} onToggle={() => toggle('basic')}>
        <DiffRow label="School Name"      v1={v1.name}    v2={v2.name} />
        <DiffRow label="Institution Type" v1={v1.type}    v2={v2.type} />
        <DiffRow label="Website"          v1={v1.website} v2={v2.website} />
        <DiffRow label="Motto"            v1={v1.motto}   v2={v2.motto} />
      </DiffSection>

      <DiffSection icon={<IcPin />} title="Location" open={sections.location} onToggle={() => toggle('location')}>
        <DiffRow label="Address" v1={v1.address} v2={v2.address} />
        <DiffRow label="City"    v1={v1.city}    v2={v2.city} />
        <DiffRow label="Region"  v1={v1.region}  v2={v2.region} />
        <DiffRow label="Country" v1={v1.country} v2={v2.country} />
      </DiffSection>

      <DiffSection icon={<IcUser />} title="Admin Contact" open={sections.admin} onToggle={() => toggle('admin')}>
        <DiffRow label="Admin Name"  v1={v1.adminName}  v2={v2.adminName} />
        <DiffRow label="Admin Email" v1={v1.adminEmail} v2={v2.adminEmail} />
      </DiffSection>

      {/* Approve Version 2 CTA */}
      {!school.is_approved && (
        <div style={{
          marginTop: 20,
          padding: '18px 20px',
          background: 'var(--sa-card-bg)',
          border: '1px solid var(--sa-border)',
          borderRadius: 'var(--sa-radius)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <div>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '0.9375rem', color: 'var(--sa-text)' }}>
              Approve Version 2
            </p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text-2)' }}>
              Accept the resubmitted application and activate the school account.
            </p>
          </div>
          <button
            className="sa-btn sa-btn--approve"
            onClick={onApprove}
            disabled={isLoading}
            style={{ flexShrink: 0 }}
          >
            <IcCheck /> Approve v2
          </button>
        </div>
      )}
    </div>
  );
}
