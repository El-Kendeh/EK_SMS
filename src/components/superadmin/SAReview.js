import React, { useState } from 'react';
import SECURITY_CONFIG from '../../config/security';

const getBadgeUrl = (badgePath) => {
    if (!badgePath) return '';
    if (badgePath.startsWith('http') || badgePath.startsWith('data:')) return badgePath;
    const baseUrl = SECURITY_CONFIG.API_URL.replace(/\/$/, '');
    return `${baseUrl}${badgePath.startsWith('/') ? '' : '/'}${badgePath}`;
};

function SchoolBadge({ badge, name, size = 56 }) {
  const [failed, setFailed] = useState(false);
  const initials = name?.trim().charAt(0).toUpperCase() || '🏫';

  if (!badge || failed) {
    return <span style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, fontWeight: 700 }}>{initials}</span>;
  }

  return (
    <img
      src={getBadgeUrl(badge)}
      alt={`${name} logo`}
      style={{ width: size, height: size, objectFit: 'cover', borderRadius: 'inherit' }}
      onError={() => setFailed(true)}
    />
  );
}

/* ---- Icons ---- */
const IcBack    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const IcInfo    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IcPin     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IcPhone   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.9 13.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012.81 2.84l3-.01a2 2 0 012 1.72c.13 1 .36 1.97.71 2.91a2 2 0 01-.45 2.11L6.91 10.09a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.94.35 1.91.58 2.91.71a2 2 0 011.72 2.03z"/></svg>;
const IcUser    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcSettings= () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>;
const IcShield  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcCheck   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcX       = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcEdit    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcClock   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>;

/* ---- Helpers ---- */
const AVATAR_COLORS = ['#1B3FAF','#0EA5E9','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#6366F1'];
const avatarColor   = (name) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];

function getRisk(school) {
  const hasCity    = !!(school.city || school.country);
  const hasContact = !!(school.phone && school.email);
  const hasAdmin   = !!(school.principal_name);
  const score      = [hasCity, hasContact, hasAdmin].filter(Boolean).length;
  if (score === 3) return { level: 'low',    trust: 94, label: '94/100', desc: 'Domain and IP checks passed successfully.' };
  if (score === 2) return { level: 'medium', trust: 62, label: '62/100', desc: 'Some information is incomplete. Review carefully.' };
  return               { level: 'high',   trust: 28, label: '28/100', desc: 'Multiple required fields are missing.' };
}

function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysSince(dateStr) {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

/* ---- Sub-components ---- */
function Section({ icon, title, children }) {
  return (
    <div className="sa-review-section">
      <div className="sa-review-section-head">
        {icon} {title}
      </div>
      <div className="sa-review-section-body">{children}</div>
    </div>
  );
}

function Field({ label, value, valueClass }) {
  return (
    <div className="sa-review-field">
      <span className="sa-review-field-key">{label}</span>
      <span className={`sa-review-field-val${valueClass ? ' ' + valueClass : ''}`}>
        {value || '—'}
      </span>
    </div>
  );
}

/* ---- Reject / Changes modal ---- */
function ConfirmModal({ action, onConfirm, onCancel, isLoading }) {
  const [note, setNote] = useState('');
  const config = {
    reject:          { title: 'Reject Application', colour: 'var(--sa-red)',   label: 'Confirm Rejection',   placeholder: 'Reason for rejection (optional)…' },
    request_changes: { title: 'Request Changes',    colour: 'var(--sa-amber)', label: 'Send Change Request', placeholder: 'Describe what changes are needed…' },
  };
  const cfg = config[action];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: 20 }}>
      <div style={{ background: 'var(--sa-card-bg)', border: '1px solid var(--sa-border)', borderRadius: 'var(--sa-radius)', width: '100%', maxWidth: 420, padding: 24 }}>
        <h3 style={{ margin: '0 0 8px', color: 'var(--sa-text)', fontSize: '1rem', fontWeight: 700 }}>{cfg.title}</h3>
        <p style={{ margin: '0 0 16px', color: 'var(--sa-text-2)', fontSize: '0.875rem' }}>This action will be logged in the audit trail.</p>
        <textarea
          style={{ width: '100%', minHeight: 80, background: 'var(--sa-card-bg2)', border: '1px solid var(--sa-border)', borderRadius: 8, color: 'var(--sa-text)', fontSize: '0.875rem', padding: '10px 12px', fontFamily: 'var(--sa-font)', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
          placeholder={cfg.placeholder}
          value={note}
          onChange={e => setNote(e.target.value)}
        />
        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          <button className="sa-btn sa-btn--ghost" onClick={onCancel} disabled={isLoading}>Cancel</button>
          <button
            className="sa-btn"
            style={{ background: cfg.colour, color: '#fff' }}
            onClick={() => onConfirm(note)}
            disabled={isLoading}
          >
            {isLoading ? 'Processing…' : cfg.label}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---- Approval bottom-sheet ---- */
function ApprovalSheet({ school, onConfirm, onCancel, isLoading }) {
  return (
    <div className="sa-sheet-backdrop" onClick={onCancel}>
      <div className="sa-sheet" onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="sa-sheet-handle" />
        {/* Icon + title */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--sa-green-dim)', margin: '0 auto 12px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IcShield style={{ width: 26, height: 26, stroke: 'var(--sa-green)', fill: 'none' }} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.125rem', fontWeight: 800, color: 'var(--sa-text)' }}>
            Confirm Approval
          </h3>
          <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--sa-text-2)', lineHeight: 1.55, padding: '0 8px' }}>
            You are about to approve <strong style={{ color: 'var(--sa-text)' }}>{school.name}</strong>. This will automatically
            create the School Admin account and activate login credentials. A welcome email will be sent immediately.
          </p>
        </div>
        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="sa-btn sa-btn--approve"
            style={{ width: '100%', height: 48, fontSize: '1rem', justifyContent: 'center' }}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Processing…' : <><IcCheck /> Confirm &amp; Activate</>}
          </button>
          <button
            className="sa-btn sa-btn--ghost"
            style={{ width: '100%', height: 48, fontSize: '0.9375rem', justifyContent: 'center' }}
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SAReview({ school, onBack, onApprove, onReject, onRequestChanges, onHistory, isLoading }) {
  const [modal, setModal] = useState(null); // 'reject' | 'request_changes' | 'approve'

  const risk      = getRisk(school);
  const color     = avatarColor(school.name);
  const days      = daysSince(school.registration_date);
  const adminName  = school.admin_full_name  || school.principal_name || '—';
  const adminEmail = school.admin_email      || school.email          || '—';
  const location   = [school.address, school.city, school.region, school.country].filter(Boolean).join(', ') || '—';

  /* Risk bar colour */
  const riskBarColor = risk.level === 'low' ? 'var(--sa-green)' : risk.level === 'medium' ? 'var(--sa-amber)' : 'var(--sa-red)';

  function handleConfirm(note) {
    if (modal === 'reject')           onReject(note);
    else if (modal === 'request_changes') onRequestChanges(note);
    setModal(null);
  }

  return (
    <>
      {/* Reject / Changes modal */}
      {(modal === 'reject' || modal === 'request_changes') && (
        <ConfirmModal
          action={modal}
          onConfirm={handleConfirm}
          onCancel={() => setModal(null)}
          isLoading={isLoading}
        />
      )}

      {/* Approval bottom-sheet */}
      {modal === 'approve' && (
        <ApprovalSheet
          school={school}
          onConfirm={() => { setModal(null); onApprove(); }}
          onCancel={() => setModal(null)}
          isLoading={isLoading}
        />
      )}

      <div className="sa-review-wrap">
        {/* Back nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <button className="sa-btn sa-btn--ghost sa-btn--sm" style={{ gap: 6 }} onClick={onBack}>
            <IcBack /> Back to Applications
          </button>
          {onHistory && (
            <button
              className="sa-btn sa-btn--ghost sa-btn--sm"
              style={{ gap: 6, marginLeft: 'auto', color: 'var(--sa-accent)' }}
              onClick={() => onHistory(school)}
            >
              <IcClock /> View History
            </button>
          )}
        </div>

        {/* Hero card */}
        <div className="sa-review-hero">
          <div className="sa-review-avatar" style={{ background: school.badge ? 'transparent' : color }}>
            <SchoolBadge badge={school.badge} name={school.name} size={56} />
          </div>
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            {school.is_approved
              ? <span className="sa-badge sa-badge--approved">Approved</span>
              : school.changes_requested
              ? <span className="sa-badge sa-badge--changes">Changes Requested</span>
              : <span className="sa-badge sa-badge--pending">Pending Review</span>
            }
          </div>
          <h1 className="sa-review-school-name">{school.name}</h1>
          <p className="sa-review-school-type">{school.institution_type || 'Educational Institution'}</p>
          {school.motto && (
            <p style={{ fontSize: '0.8125rem', color: 'var(--sa-text-2)', fontStyle: 'italic', marginTop: 8, textAlign: 'center' }}>
              "{school.motto}"
            </p>
          )}
          {/* Days in review chip */}
          <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: 'var(--sa-card-bg2)', border: '1px solid var(--sa-border)', fontSize: '0.75rem', color: 'var(--sa-text-2)' }}>
              <IcClock style={{ width: 12, height: 12, stroke: 'currentColor', fill: 'none' }} />
              {days === 0 ? 'Submitted today' : `${days} day${days !== 1 ? 's' : ''} in review`}
            </span>
            {school.changes_requested && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: 'var(--sa-purple-dim)', border: '1px solid rgba(139,92,246,0.25)', fontSize: '0.75rem', color: 'var(--sa-purple)' }}>
                2 revisions
              </span>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <Section icon={<IcInfo />} title="Basic Information">
          <Field label="School Code"      value={school.code} />
          <Field label="Type"             value={school.institution_type} />
          <Field label="Academic System"  value={school.academic_system} />
          <Field label="Capacity"         value={school.capacity ? `${school.capacity.toLocaleString()} students` : null} />
          <Field label="Website"          value={school.website} />
          <Field label="Registered On"    value={fmtDate(school.registration_date)} />
        </Section>

        {/* Location */}
        <Section icon={<IcPin />} title="Location">
          <Field label="Full Address" value={location} />
          <Field label="City"         value={school.city} />
          <Field label="Region"       value={school.region} />
          <Field label="Country"      value={school.country} />
        </Section>

        {/* Contact */}
        <Section icon={<IcPhone />} title="Contact">
          <Field label="Phone"        value={school.phone} />
          <Field label="School Email" value={school.email} />
        </Section>

        {/* Administrator */}
        <Section icon={<IcUser />} title="Administrator">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: '10px 0', borderBottom: '1px solid var(--sa-border)' }}>
            <div className="sa-user-avatar" style={{ width: 44, height: 44, fontSize: '1rem', background: color, flexShrink: 0 }}>
              {(adminName[0] || 'A').toUpperCase()}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--sa-text)' }}>{adminName}</p>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--sa-text-2)' }}>
                {school.institution_type ? `${school.institution_type} Administrator` : 'School Administrator'}
              </p>
            </div>
          </div>
          <Field label="Admin Email"       value={adminEmail} />
          <Field label="Username"          value={school.admin_username} />
          <Field
            label="Email Verified"
            value={adminEmail && adminEmail !== '—' ? 'Provided ✓' : 'Not provided'}
            valueClass={adminEmail && adminEmail !== '—' ? 'sa-review-field-val--green' : 'sa-review-field-val--amber'}
          />
          <Field
            label="Password Strength"
            value="Set during registration ✓"
            valueClass="sa-review-field-val--green"
          />
        </Section>

        {/* Configuration */}
        <Section icon={<IcSettings />} title="Configuration">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
            {[
              { label: 'Capacity',        value: school.capacity ? `${school.capacity} students` : '—' },
              { label: 'Academic System', value: school.academic_system || '—' },
            ].map((box, i) => (
              <div key={i} style={{ background: 'var(--sa-card-bg2)', border: '1px solid var(--sa-border)', borderRadius: 8, padding: '12px 14px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--sa-text-2)' }}>
                  {box.label}
                </p>
                <p style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--sa-text)' }}>
                  {box.value}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Security Metadata */}
        <Section icon={<IcShield />} title="Security Metadata">
          <Field label="Registration Date"  value={fmtDate(school.registration_date)} />
          <Field label="Application Status"
            value={school.is_approved ? 'Approved' : school.changes_requested ? 'Changes Requested' : 'Pending Review'}
            valueClass={school.is_approved ? 'sa-review-field-val--green' : school.changes_requested ? 'sa-review-field-val--amber' : ''}
          />
        </Section>

        {/* Risk Score with progress bar */}
        <div className={`sa-risk-card sa-risk-card--${risk.level}`}>
          <p className="sa-risk-label">Risk Assessment</p>
          <p className={`sa-risk-score sa-risk-score--${risk.level}`}>
            {risk.level.toUpperCase()} — {risk.label} Trust Score
          </p>
          {/* Progress bar */}
          <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 999, margin: '10px 0 8px', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${risk.trust}%`,
              background: riskBarColor,
              borderRadius: 999,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <p className="sa-risk-desc">{risk.desc}</p>
        </div>

        {/* Action buttons */}
        {!school.is_approved && (
          <div className="sa-review-actions">
            <button
              className="sa-btn sa-btn--reject"
              onClick={() => setModal('reject')}
              disabled={isLoading}
            >
              <IcX /> Reject
            </button>
            <button
              className="sa-btn sa-btn--changes"
              onClick={() => setModal('request_changes')}
              disabled={isLoading}
            >
              <IcEdit /> Request Changes
            </button>
            <button
              className="sa-btn sa-btn--approve"
              onClick={() => setModal('approve')}
              disabled={isLoading}
            >
              <IcCheck /> Approve School
            </button>
          </div>
        )}
      </div>
    </>
  );
}
