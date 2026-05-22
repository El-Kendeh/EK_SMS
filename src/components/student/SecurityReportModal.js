import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import './SecurityReportModal.css';

export default function SecurityReportModal({ gradeId, subjectName, onClose, onContactSchool }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [objectionOpen, setObjectionOpen] = useState(false);
  const [objectionMsg, setObjectionMsg] = useState('');
  const [copyParent, setCopyParent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);

  const handleSubmitObjection = async () => {
    if (!gradeId || !objectionMsg.trim()) return;
    setSubmitting(true);
    try {
      const res = await studentApi.submitModificationObjection(gradeId, { message: objectionMsg.trim(), copyParent });
      setSubmitted(res);
      setObjectionMsg('');
    } catch (e) {
      setError('Could not submit your objection. Try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!gradeId) return;
    setLoading(true);
    setError(null);
    studentApi.getSecurityReport(gradeId)
      .then(setReport)
      .catch(() => setError('Could not load security report.'))
      .finally(() => setLoading(false));
  }, [gradeId]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const RESTRICTED = ['Audit Logs', 'Node Trace', 'Hash Profile', 'System Health'];

  return (
    <AnimatePresence>
      {gradeId && (
        <motion.div
          className="srm-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            className="srm-panel"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            {/* Header */}
            <div className="srm-header">
              <div className="srm-header__alert">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
                Critical Security Alert
              </div>
              <button className="srm-close" onClick={onClose}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="srm-body">
              {loading && (
                <div className="srm-loading">
                  {[1,2,3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 56, borderRadius: 10, background: '#F2F4F6', marginBottom: 12 }} />
                  ))}
                </div>
              )}

              {error && <div className="srm-error">{error}</div>}

              {!loading && report && (
                <>
                  {/* Primary incident */}
                  <div className="srm-section">
                    <p className="srm-section__eyebrow">Primary Incident</p>
                    <h2 className="srm-section__title">Blocked Unauthorized Modification Attempt</h2>
                    <div className="srm-incident-grid">
                      <div className="srm-incident-tile">
                        <p className="srm-incident-tile__label">Date & Time</p>
                        <p className="srm-incident-tile__value">
                          {new Date(report.incident.detectedAt).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })} at {new Date(report.incident.detectedAt).toLocaleTimeString('en-GB', {
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <div className="srm-incident-tile">
                        <p className="srm-incident-tile__label">Target</p>
                        <p className="srm-incident-tile__value">{report.subjectName} Grade (First Term)</p>
                      </div>
                    </div>
                  </div>

                  {/* Protocol banner */}
                  <div className="srm-protocol-banner">
                    <div className="srm-protocol-banner__icon">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
                    </div>
                    <div>
                      <h3>Grade Integrity Protocol</h3>
                      <p>The attempt was immediately neutralized by our cryptographic verification layer. No institutional records were modified, and the source signature has been added to our global blacklist.</p>
                    </div>
                  </div>

                  {/* Incident origins */}
                  <div className="srm-origins">
                    <h4 className="srm-origins__title">Incident Origins</h4>
                    <div className="srm-origins__list">
                      {[
                        { icon: 'dns',       label: 'IP Address',   value: report.incident.ipAddress  },
                        { icon: 'location_on', label: 'Location',   value: report.incident.location   },
                        { icon: 'laptop_mac', label: 'Device Type', value: report.incident.deviceType },
                      ].map(({ icon, label, value }) => (
                        <div key={label} className="srm-origin-item">
                          <div className="srm-origin-item__icon">
                            <span className="material-symbols-outlined">{icon}</span>
                          </div>
                          <div>
                            <p className="srm-origin-item__label">{label}</p>
                            <p className="srm-origin-item__value">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Restricted sections */}
                  <div className="srm-restricted-grid">
                    {RESTRICTED.map((name) => (
                      <div key={name} className="srm-restricted-tile">
                        <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                        <span>{name}</span>
                        <small>Restricted</small>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="srm-actions">
                    <button className="srm-btn srm-btn--primary" onClick={onClose}>
                      <span className="material-symbols-outlined">security</span>
                      Review Account Security
                    </button>
                    <button
                      className="srm-btn srm-btn--ghost"
                      onClick={() => setObjectionOpen((v) => !v)}
                      aria-expanded={objectionOpen}
                    >
                      <span className="material-symbols-outlined">{objectionOpen ? 'close' : 'flag'}</span>
                      {objectionOpen ? 'Hide objection form' : 'File an objection'}
                    </button>
                  </div>

                  {/* Objection form */}
                  {objectionOpen && !submitted && (
                    <div className="srm-objection">
                      <h4>
                        <span className="material-symbols-outlined">flag</span>
                        Tell the registrar what you saw
                      </h4>
                      <p>
                        Your objection is recorded in the audit trail and goes to the school admin.
                        Your linked guardian can be copied if you wish.
                      </p>
                      <textarea
                        rows={4}
                        value={objectionMsg}
                        onChange={(e) => setObjectionMsg(e.target.value)}
                        placeholder="Describe what you noticed and any context (optional but helpful)…"
                        className="srm-objection__textarea"
                      />
                      <label className="srm-objection__check">
                        <input type="checkbox" checked={copyParent} onChange={(e) => setCopyParent(e.target.checked)} />
                        Send a copy to my linked guardian
                      </label>
                      <div className="srm-objection__actions">
                        <button
                          className="srm-btn srm-btn--primary"
                          disabled={submitting || !objectionMsg.trim()}
                          onClick={handleSubmitObjection}
                        >
                          {submitting ? (
                            <>
                              <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>autorenew</span>
                              Submitting…
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined">send</span>
                              Submit objection
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {submitted && (
                    <div className="srm-objection srm-objection--success">
                      <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", color: '#22c55e' }}>check_circle</span>
                      <div>
                        <strong>Objection received.</strong>
                        <p>Ticket <code>{submitted.ticketId}</code>. The registrar will respond in 1–2 school days.</p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
