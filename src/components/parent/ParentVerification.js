import { useState } from 'react';
import { motion } from 'framer-motion';
import { verifyHash } from '../../api/parentApi';
import './ParentVerification.css';

/* Honest explainer — EK-SMS records really are hash-chained (SHA-256, each
   grade event referencing the previous one). No invented validators/blocks. */
const STEPS = [
  { num: 1, title: 'Fingerprinting', desc: 'When a record is published, a SHA-256 fingerprint (hash) of its exact content is generated and stored. The code printed on the document is derived from that fingerprint.' },
  { num: 2, title: 'Chained history', desc: 'Every grade change is appended to a hash chain — each event references the one before it, so silently rewriting history breaks the chain and becomes detectable.' },
  { num: 3, title: 'Anyone can check', desc: 'The verification code resolves publicly, without a login. If the published grades ever stop matching the printed document, the code stops verifying.' },
];

export default function ParentVerification() {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // null | {valid, ...} | {error}

  const check = async (e) => {
    e?.preventDefault();
    const hash = code.trim();
    if (!hash || checking) return;
    setChecking(true);
    setResult(null);
    try {
      const res = await verifyHash(hash);
      setResult(res);
    } catch (err) {
      setResult({ error: err?.message || 'Verification service unavailable — please try again.' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="par-verify">
      {/* Hero — explains the tool; never claims success before a real check */}
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
            Document Verification
          </div>
          <h2 className="par-verify__hero-title">
            VERIFY A<br />
            <span className="par-verify__hero-accent">SCHOOL DOCUMENT</span>
          </h2>
          <p className="par-verify__hero-sub">
            Every report card and grade receipt issued by EK-SMS carries a verification
            code (printed under the QR). Paste it below to confirm the document still
            matches the school's records.
          </p>
        </div>
      </motion.section>

      <div className="par-verify__grid">
        {/* Left: the actual verification tool */}
        <div className="par-verify__left">
          <div className="par-card par-card--pad par-verify__metadata">
            <h3 className="par-verify__section-title">
              <span className="material-symbols-outlined">qr_code_scanner</span>
              Check a verification code
            </h3>

            <form className="par-verify__form" onSubmit={check}>
              <label className="par-verify__field" style={{ width: '100%' }}>
                <span className="par-verify__field-label">Verification code</span>
                <input
                  className="par-verify__input"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Paste the code from the document (64 characters)"
                  spellCheck="false"
                  autoComplete="off"
                />
              </label>
              <button type="submit" className="par-verify__submit" disabled={checking || !code.trim()}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                  {checking ? 'hourglass_top' : 'search_check'}
                </span>
                {checking ? 'Checking…' : 'Verify'}
              </button>
            </form>

            {result?.error && (
              <div className="par-verify__result par-verify__result--error" role="alert">
                <span className="material-symbols-outlined">cloud_off</span>
                <p>{result.error}</p>
              </div>
            )}

            {result && !result.error && result.valid === false && (
              <div className="par-verify__result par-verify__result--error" role="alert">
                <span className="material-symbols-outlined">gpp_bad</span>
                <div>
                  <p className="par-verify__result-title">Not verified</p>
                  <p>{result.reason || 'No matching record was found in the ledger.'}</p>
                </div>
              </div>
            )}

            {result && !result.error && result.valid === true && (
              <div className="par-verify__result par-verify__result--ok" role="status">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                <div>
                  <p className="par-verify__result-title">
                    {result.type === 'report_card' ? 'Report card verified' : 'Record verified'}
                  </p>
                  <div className="par-verify__fields" style={{ marginTop: 8 }}>
                    {result.signedBy && (
                      <div className="par-verify__field">
                        <span className="par-verify__field-label">Issued by</span>
                        <div className="par-verify__field-val">{result.signedBy}</div>
                      </div>
                    )}
                    {result.student && (
                      <div className="par-verify__field">
                        <span className="par-verify__field-label">Record</span>
                        <div className="par-verify__field-val">{result.student}</div>
                      </div>
                    )}
                    {result.term && result.term !== '—' && (
                      <div className="par-verify__field">
                        <span className="par-verify__field-label">Term</span>
                        <div className="par-verify__field-val">{result.term}</div>
                      </div>
                    )}
                    {result.signedAt && (
                      <div className="par-verify__field">
                        <span className="par-verify__field-label">Issued</span>
                        <div className="par-verify__field-val par-verify__field-val--mono">
                          {new Date(result.signedAt).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                  {result.note && <p className="par-verify__result-note">{result.note}</p>}
                </div>
              </div>
            )}

            {!result && !checking && (
              <p className="par-verify__idle-hint">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>info</span>
                You can also scan the QR on the document — it opens this check automatically.
              </p>
            )}
          </div>
        </div>

        {/* Right: honest how-it-works */}
        <div className="par-verify__right">
          <div className="par-verify__how par-card par-card--pad">
            <div className="par-verify__how-icon">
              <span className="material-symbols-outlined">auto_awesome</span>
            </div>
            <h3 className="par-verify__how-title">How the Digital Archive works</h3>
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
              <p>The QR on every report card and receipt encodes its verification link.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
