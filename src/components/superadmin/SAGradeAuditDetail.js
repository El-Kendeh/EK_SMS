import React, { useState } from 'react';

/* ---- Icons ---- */
const IcBack    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>;
const IcWarn    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcShield  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IcCheck   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcFlag    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
const IcUser    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IcMonitor = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>;
const IcGlobe   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>;
const IcFile    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IcLock    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;

/* ---- Section heading helper ---- */
function SectionHead({ children }) {
  return (
    <p style={{
      margin: '24px 0 10px',
      fontSize: '0.625rem', fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '0.12em',
      color: 'var(--sa-text-3)',
    }}>
      {children}
    </p>
  );
}

/* ---- Actor profile card ---- */
function ActorCard({ role, actor, accentColor, isExternal }) {
  return (
    <div className="sa-gi-actor" style={isExternal ? { borderColor: 'rgba(239,68,68,0.3)' } : {}}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div className="sa-gi-avatar" style={{ background: accentColor + '22', color: accentColor, border: `1px solid ${accentColor}44` }}>
          {actor.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="sa-gi-actor-label" style={{ color: accentColor, margin: '0 0 2px' }}>{role}</p>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: 'var(--sa-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{actor.name}</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--sa-text-2)' }}>{actor.role}</p>
        </div>
      </div>
      <div className="sa-gi-actor-meta">
        {[
          { label: 'IP Address', value: actor.ip,       icon: <IcGlobe />,   warn: isExternal },
          { label: 'Device',     value: actor.device,   icon: <IcMonitor />, warn: false },
          { label: 'Location',   value: actor.location, icon: <IcGlobe />,   warn: isExternal },
        ].map((row, i) => (
          <div key={i} className="sa-gi-actor-meta-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--sa-text-2)' }}>
              <span style={{ width: 12, height: 12, display: 'flex' }}>{row.icon}</span>
              <span style={{ fontSize: '0.6875rem' }}>{row.label}</span>
            </div>
            <span style={{
              fontFamily: 'Consolas, monospace',
              fontSize: '0.6875rem',
              color: row.warn ? 'var(--sa-red)' : 'var(--sa-text)',
              fontWeight: row.warn ? 700 : 400,
            }}>
              {row.value}
              {row.warn && <span style={{ marginLeft: 5, fontSize: '0.5625rem', background: 'var(--sa-red-dim)', padding: '1px 5px', borderRadius: 4 }}>External</span>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   Main: Grade Audit Detail
   ================================================================ */
export default function SAGradeAuditDetail({ request, onBack }) {
  const [flagged,    setFlagged]    = useState(false);
  const [validated,  setValidated]  = useState(false);

  if (!request) {
    return (
      <div className="sa-empty">
        <div className="sa-empty-icon" style={{ fontSize: 32 }}><IcFile /></div>
        <p className="sa-empty-title">No audit record selected</p>
        <p className="sa-empty-desc">Select a request from the list to view details</p>
      </div>
    );
  }

  const isAnomaly    = !request.hashMatch;
  const isExternal   = request.requester.ip.startsWith('45.') || request.requester.ip.startsWith('103.');
  const scoreDelta   = request.newScore - request.oldScore;
  const isLargeJump  = Math.abs(scoreDelta) >= 15;

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>

      {/* ── Back + Title ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          className="sa-btn sa-btn--ghost"
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', flexShrink: 0 }}
          aria-label="Go back to request list"
        >
          <span style={{ width: 16, height: 16, display: 'flex' }}><IcBack /></span>
          Back
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--sa-text-3)', fontFamily: 'Consolas, monospace' }}>Audit Detail</p>
            <span style={{ color: 'var(--sa-text-3)', fontSize: '0.6875rem' }}>·</span>
            <p style={{ margin: 0, fontFamily: 'Consolas, monospace', fontSize: '0.6875rem', color: 'var(--sa-text-2)' }}>#{request.id}</p>
          </div>
          <h1 className="sa-page-title" style={{ margin: 0 }}>Grade Modification</h1>
        </div>
      </div>

      {/* ── Anomaly / Clean Banner ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, marginBottom: 20,
        background: isAnomaly ? 'var(--sa-red-dim)' : 'var(--sa-green-dim)',
        border: `1px solid ${isAnomaly ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
      }} role="status">
        <span style={{ width: 16, height: 16, display: 'flex', color: isAnomaly ? 'var(--sa-red)' : 'var(--sa-green)' }}>
          {isAnomaly ? <IcWarn /> : <IcShield />}
        </span>
        <span style={{ fontWeight: 700, fontSize: '0.875rem', color: isAnomaly ? 'var(--sa-red)' : 'var(--sa-green)' }}>
          {isAnomaly ? 'Anomaly Detected — Hash Mismatch' : 'Integrity Verified — Hash Match'}
        </span>
        {isLargeJump && isAnomaly && (
          <span style={{ marginLeft: 'auto', fontSize: '0.6875rem', color: 'var(--sa-red)', fontWeight: 700 }}>
            {scoreDelta > 0 ? '+' : ''}{scoreDelta}-point jump flagged
          </span>
        )}
      </div>

      {/* ── State Comparison ── */}
      <SectionHead>State Comparison</SectionHead>
      <div className="sa-gi-state-compare" style={{ marginBottom: 4 }}>
        {/* Previous */}
        <div className="sa-gi-state-prev">
          <p style={{ margin: '0 0 4px', fontSize: '0.6875rem', color: 'var(--sa-text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Previous</p>
          <p style={{ margin: 0, fontFamily: 'Consolas, monospace', fontSize: '2rem', fontWeight: 800, color: 'var(--sa-text-3)', textDecoration: 'line-through', textDecorationColor: 'var(--sa-red)' }}>
            {request.oldScore}
            <span style={{ fontSize: '1.125rem', fontWeight: 600, marginLeft: 8 }}>({request.oldGrade})</span>
          </p>
          {request.prevHash && (
            <p style={{ margin: '6px 0 0', fontFamily: 'Consolas, monospace', fontSize: '0.625rem', color: 'var(--sa-text-3)', wordBreak: 'break-all' }}>
              h: {request.prevHash.slice(0, 16)}…
            </p>
          )}
        </div>
        {/* New */}
        <div className="sa-gi-state-new">
          <p style={{ margin: '0 0 4px', fontSize: '0.6875rem', color: 'var(--sa-text-2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>New</p>
          <p style={{ margin: 0, fontFamily: 'Consolas, monospace', fontSize: '2rem', fontWeight: 800, color: isAnomaly ? 'var(--sa-red)' : 'var(--sa-green)' }}>
            {request.newScore}
            <span style={{ fontSize: '1.125rem', fontWeight: 600, marginLeft: 8 }}>({request.newGrade})</span>
          </p>
          {request.blockHash && (
            <p style={{ margin: '6px 0 0', fontFamily: 'Consolas, monospace', fontSize: '0.625rem', color: isAnomaly ? 'var(--sa-red)' : 'var(--sa-text-3)', wordBreak: 'break-all' }}>
              h: {request.blockHash.slice(0, 16)}…
              {isAnomaly && <span style={{ marginLeft: 6, color: 'var(--sa-red)', fontWeight: 700 }}>MISMATCH</span>}
            </p>
          )}
          {!request.blockHash && (
            <p style={{ margin: '6px 0 0', fontFamily: 'Consolas, monospace', fontSize: '0.625rem', color: 'var(--sa-red)', fontWeight: 700 }}>
              No hash recorded
            </p>
          )}
        </div>
        {/* Metadata row */}
        <div className="sa-gi-state-meta">
          <div>
            <p style={{ margin: '0 0 3px', fontSize: '0.625rem', color: 'var(--sa-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Timestamp</p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text)', fontWeight: 600, fontFamily: 'Consolas, monospace' }}>{request.ts}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 3px', fontSize: '0.625rem', color: 'var(--sa-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Subject</p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text)', fontWeight: 600 }}>{request.subject}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 3px', fontSize: '0.625rem', color: 'var(--sa-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Student</p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text)', fontWeight: 600 }}>{request.student}</p>
          </div>
          <div>
            <p style={{ margin: '0 0 3px', fontSize: '0.625rem', color: 'var(--sa-text-3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>School</p>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--sa-text)', fontWeight: 600 }}>{request.school}</p>
          </div>
        </div>
      </div>

      {/* Reason box */}
      <div style={{
        background: 'var(--sa-card-bg2)', border: '1px solid var(--sa-border)',
        borderLeft: '3px solid var(--sa-accent)', borderRadius: '0 10px 10px 0',
        padding: '12px 16px', marginBottom: 4,
      }}>
        <p style={{ margin: '0 0 4px', fontSize: '0.625rem', color: 'var(--sa-text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>Stated Reason</p>
        <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--sa-text-2)', lineHeight: 1.6 }}>{request.reason}</p>
      </div>

      {/* ── Actor Profiles ── */}
      <SectionHead>Actor Profiles</SectionHead>
      <ActorCard
        role="Requester"
        actor={request.requester}
        accentColor="var(--sa-accent)"
        isExternal={isExternal}
      />
      {request.approver ? (
        <ActorCard
          role="Approver"
          actor={request.approver}
          accentColor="var(--sa-purple)"
          isExternal={false}
        />
      ) : (
        <div style={{
          background: 'var(--sa-card-bg2)', border: '1px dashed var(--sa-border)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ width: 16, height: 16, display: 'flex', color: 'var(--sa-text-3)' }}><IcUser /></span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--sa-text-3)', fontStyle: 'italic' }}>
            Awaiting approver — no administrator has reviewed this request yet.
          </span>
        </div>
      )}

      {/* ── Digital Evidence ── */}
      <SectionHead>Digital Evidence</SectionHead>
      <div className="sa-gi-evidence" style={{ marginBottom: 4 }}>
        {[
          { name: 'Exam_Scan.pdf',    size: '2.4 MB', type: 'pdf', color: 'var(--sa-red)'    },
          { name: 'Mod_Request.docx', size: '145 KB', type: 'doc', color: 'var(--sa-accent)' },
        ].map((f, i) => (
          <div key={i} className="sa-gi-evidence-card" role="button" tabIndex={0} aria-label={`Open ${f.name}`}>
            <div className="sa-gi-evidence-thumb" style={{ color: f.color }}>
              <span style={{ width: 32, height: 32, display: 'flex' }}><IcFile /></span>
            </div>
            <div className="sa-gi-evidence-meta">
              <p style={{ margin: 0, fontWeight: 700, fontSize: '0.75rem', color: 'var(--sa-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.6875rem', color: 'var(--sa-text-3)' }}>{f.size}</p>
            </div>
          </div>
        ))}
        {/* No evidence indicator for flagged */}
        {isAnomaly && (
          <div style={{
            gridColumn: '1 / -1', background: 'var(--sa-red-dim)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span style={{ width: 14, height: 14, display: 'flex', color: 'var(--sa-red)', flexShrink: 0 }}><IcWarn /></span>
            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--sa-red)', fontWeight: 600 }}>
              No supporting documentation was attached with this flagged request.
            </p>
          </div>
        )}
      </div>

      {/* ── Blockchain Ledger ── */}
      <SectionHead>Blockchain Ledger</SectionHead>
      <div className="sa-gi-ledger">
        {request.blockHash ? (
          <>
            {/* Current block */}
            <div className="sa-gi-ledger-block">
              <p style={{ margin: '0 0 4px', color: 'var(--sa-text-3)' }}>
                Block #{request.blockNum} · {request.ts} UTC
              </p>
              <p style={{ margin: '0 0 2px', color: 'var(--sa-green)', wordBreak: 'break-all' }}>
                hash: {request.blockHash}
              </p>
              <p style={{ margin: 0, color: 'var(--sa-text-2)' }}>Status: Confirmed</p>
            </div>
            {/* Previous block */}
            <div className="sa-gi-ledger-block" style={{ paddingBottom: 0 }}>
              <p style={{ margin: '0 0 4px', color: 'var(--sa-text-3)' }}>
                Prev Block #{(request.blockNum || 0) - 1}
              </p>
              <p style={{ margin: 0, color: 'var(--sa-text-2)', wordBreak: 'break-all' }}>
                hash: {request.prevHash}
              </p>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 14, height: 14, display: 'flex', color: 'var(--sa-red)' }}><IcLock /></span>
            <p style={{ margin: 0, color: 'var(--sa-red)', fontWeight: 700 }}>
              Record was not committed to the blockchain — integrity cannot be verified.
            </p>
          </div>
        )}
      </div>

      {/* ── Action Buttons ── */}
      <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
        <button
          className="sa-btn sa-btn--ghost"
          disabled={flagged}
          onClick={() => setFlagged(true)}
          style={{
            flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '13px 20px', borderRadius: 12, fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
            background: flagged ? 'var(--sa-red-dim)' : 'transparent',
            color: 'var(--sa-red)', border: '1px solid rgba(239,68,68,0.35)',
            transition: 'all 150ms',
          }}
          aria-label="Flag this modification for review"
        >
          <span style={{ width: 18, height: 18, display: 'flex' }}><IcFlag /></span>
          {flagged ? 'Flagged for Review' : 'Flag for Review'}
        </button>
        <button
          className="sa-btn sa-btn--primary"
          disabled={validated || isAnomaly}
          onClick={() => setValidated(true)}
          style={{
            flex: 1, minWidth: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: '13px 20px', borderRadius: 12, fontWeight: 700, fontSize: '0.875rem', cursor: isAnomaly ? 'not-allowed' : 'pointer',
            background: validated ? 'var(--sa-green)' : isAnomaly ? 'rgba(255,255,255,0.06)' : 'var(--sa-green)',
            color: isAnomaly ? 'var(--sa-text-3)' : '#fff',
            border: 'none', opacity: isAnomaly ? 0.5 : 1,
            transition: 'all 150ms',
          }}
          aria-label={isAnomaly ? 'Cannot validate — anomaly detected' : 'Validate this grade modification'}
          title={isAnomaly ? 'Cannot validate a record with hash mismatch' : ''}
        >
          <span style={{ width: 18, height: 18, display: 'flex' }}><IcCheck /></span>
          {validated ? 'Validated' : isAnomaly ? 'Cannot Validate' : 'Validate Record'}
        </button>
      </div>

    </div>
  );
}
