import { useState } from 'react';
import { motion } from 'framer-motion';
import './ParentVerification.css';

const STEPS = [
  { num: 1, title: 'Snapshotting', desc: "The moment a record is created, a digital fingerprint (hash) is generated. This fingerprint is unique to that specific data." },
  { num: 2, title: 'Distributed Trust', desc: "This hash is broadcast to multiple secure nodes across our institutional network. No single person can change the history." },
  { num: 3, title: 'The Chain Effect', desc: "Each new record refers back to the one before it. Breaking one record would require breaking the entire chain — computationally impossible." },
];

const MOCK_RECORD = {
  blockNumber: '#8,492,102',
  txHash: '0x7f8e9a2b1c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f',
  timestamp: '2026-03-20T10:32:01.442Z',
  authority: 'School Principal',
  authorityKey: 'RSA-4096',
  entryType: 'Report Card',
  status: 'Finalized',
  nodes: 12,
};

export default function ParentVerification() {
  const [copied, setCopied] = useState(false);

  const copyHash = () => {
    navigator.clipboard?.writeText(MOCK_RECORD.txHash).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="par-verify">
      {/* Hero verification state */}
      <motion.section
        className="par-verify__hero par-card par-card--pad"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}>
        <span className="material-symbols-outlined par-verify__hero-bg"
          style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
        <div className="par-verify__hero-inner">
          <div className="par-verify__hero-chip">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 14 }}>shield</span>
            Verification Successful
          </div>
          <h2 className="par-verify__hero-title">
            AUTHENTIC<br />
            <span className="par-verify__hero-accent">LEDGER RECORD</span>
          </h2>
          <p className="par-verify__hero-sub">
            This receipt represents an immutable entry in the EK-SMS ledger. It has been cryptographically
            signed and sealed against further modification.
          </p>
        </div>
      </motion.section>

      {/* Two-column layout */}
      <div className="par-verify__grid">
        {/* Left: Technical metadata */}
        <div className="par-verify__left">
          <div className="par-card par-card--pad par-verify__metadata">
            <h3 className="par-verify__section-title">
              <span className="material-symbols-outlined">data_object</span>
              Technical Metadata
            </h3>

            <div className="par-verify__fields">
              <div className="par-verify__field">
                <span className="par-verify__field-label">Block Number</span>
                <div className="par-verify__field-val par-verify__field-val--mono">
                  <span>{MOCK_RECORD.blockNumber}</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--par-text-secondary)' }}>lock</span>
                </div>
              </div>

              <div className="par-verify__field">
                <span className="par-verify__field-label">Transaction Hash</span>
                <div className="par-verify__field-val par-verify__field-val--mono par-verify__field-val--copy">
                  <span className="par-verify__hash">{MOCK_RECORD.txHash}</span>
                  <button className="par-verify__copy-btn" onClick={copyHash}>
                    <span className="material-symbols-outlined">
                      {copied ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="par-verify__field">
                <span className="par-verify__field-label">Timestamp (ISO 8601)</span>
                <div className="par-verify__field-val par-verify__field-val--mono">
                  {MOCK_RECORD.timestamp}
                </div>
              </div>

              <div className="par-verify__field">
                <span className="par-verify__field-label">Signing Authority</span>
                <div className="par-verify__authority">
                  <div className="par-verify__authority-icon">
                    <span className="material-symbols-outlined" style={{ color: 'var(--par-primary)', fontSize: 28 }}>draw</span>
                  </div>
                  <div>
                    <p className="par-verify__authority-name">School Principal</p>
                    <p className="par-verify__authority-key">{MOCK_RECORD.authorityKey} Bit Signature</p>
                    <div className="par-verify__authority-chip">
                      <span className="material-symbols-outlined" style={{ fontSize: 10, fontVariationSettings: "'FILL' 1" }}>verified</span>
                      IDENTITY VERIFIED
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payload summary */}
          <div className="par-verify__payload par-card par-card--pad">
            <h3 className="par-verify__section-title" style={{ marginBottom: 14 }}>Payload Summary</h3>
            <div className="par-verify__payload-grid">
              <div className="par-verify__payload-item">
                <span className="par-verify__field-label">Entry Type</span>
                <span className="par-verify__payload-val">{MOCK_RECORD.entryType}</span>
              </div>
              <div className="par-verify__payload-item">
                <span className="par-verify__field-label">Status</span>
                <span className="par-verify__payload-val par-verify__payload-val--active">
                  <span className="par-verify__status-dot" />
                  {MOCK_RECORD.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: How it works */}
        <div className="par-verify__right">
          <div className="par-verify__how par-card par-card--pad">
            <div className="par-verify__how-icon">
              <span className="material-symbols-outlined">auto_awesome</span>
            </div>
            <h3 className="par-verify__how-title">How the Digital Archive Works</h3>
            <div className="par-verify__steps">
              {STEPS.map((step) => (
                <div key={step.num} className="par-verify__step">
                  <div className="par-verify__step-num">{step.num}</div>
                  <div>
                    <h4 className="par-verify__step-title">{step.title}</h4>
                    <p className="par-verify__step-desc">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="par-verify__qr-hint">
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: 'var(--par-border)' }}>qr_code_2</span>
              <p>Scan to verify this record on any independent Ledger Node.</p>
            </div>
          </div>

          {/* Network nodes card */}
          <div className="par-verify__nodes par-card par-card--pad">
            <div className="par-verify__nodes-inner">
              <div>
                <p className="par-verify__field-label">Active Validator Nodes</p>
                <p className="par-verify__nodes-count">{MOCK_RECORD.nodes}</p>
              </div>
              <div className="par-verify__nodes-grid">
                {Array.from({ length: MOCK_RECORD.nodes }).map((_, i) => (
                  <div key={i} className="par-verify__node" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
            <p className="par-verify__nodes-sub">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>hub</span>
              {MOCK_RECORD.nodes} Active Institutional Validators
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
