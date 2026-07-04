import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useChildReportCards } from '../../hooks/useChildReportCards';
import { useActiveChild } from '../../context/ChildContext';
import { downloadChildReportCard, verifyHash, acknowledgeRecord } from '../../api/parentApi';
import { getGradeLetterColor, formatDate } from '../../utils/parentUtils';
import QRCode from '../common/QRCode';
import { Skeleton } from '../common/Skeleton';
import './ParentReportCards.css';

function verifyUrlFor(hash) {
  return hash ? `${window.location.origin}/verify/${encodeURIComponent(hash)}` : '';
}

function VerifyModal({ reportCard, onClose }) {
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const url = verifyUrlFor(reportCard.verificationHash);

  const onVerify = async () => {
    setVerifying(true);
    try {
      const r = await verifyHash(reportCard.verificationHash);
      setResult(r);
    } catch {
      setResult({ valid: false, reason: 'Verification service unreachable.' });
    } finally {
      setVerifying(false);
    }
  };

  const copy = () => {
    navigator.clipboard.writeText(reportCard.verificationHash || '').then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="par-qr-overlay" onClick={onClose}>
      <motion.div
        className="par-qr-modal"
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
      >
        <div className="par-qr-modal__header">
          <h3>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            {' '}Verify report card
          </h3>
          <button onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="par-qr-modal__body">
          {result && (
            <div className={`par-qr-status ${result.valid ? 'is-valid' : 'is-invalid'}`}>
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                {result.valid ? 'verified' : 'cancel'}
              </span>
              <p>
                {result.valid
                  ? `Authentic — signed by ${result.signedBy}, chain #${result.chainPosition}.`
                  : (result.reason || 'Not authentic.')}
              </p>
            </div>
          )}

          <div className="par-qr-modal__qr-box">
            <QRCode value={url} size={180} ariaLabel="Scan to verify report card" />
          </div>
          <p className="par-qr-modal__desc">
            Scan with any phone camera, or open <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>.
            The page is public — anyone can confirm authenticity without an account.
          </p>

          <div className="par-qr-modal__hash">
            <code>SHA-256: {reportCard.verificationHash || 'N/A'}</code>
            <button onClick={copy}>
              <span className="material-symbols-outlined">{copied ? 'check' : 'content_copy'}</span>
            </button>
          </div>

          <div className="par-qr-modal__actions">
            <button
              className="par-qr-btn par-qr-btn--primary"
              onClick={onVerify}
              disabled={verifying}
            >
              {verifying ? (
                <><span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>autorenew</span> Verifying…</>
              ) : (
                <><span className="material-symbols-outlined">shield_with_heart</span> Verify now</>
              )}
            </button>
            <button className="par-qr-btn par-qr-btn--ghost" onClick={onClose}>Close</button>
          </div>

          <p className="par-qr-modal__meta">
            Verified on {reportCard.verifiedAt ? formatDate(reportCard.verifiedAt) : '—'} · Cryptographically signed.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default function ParentReportCards() {
  const { activeChild } = useActiveChild();
  const [verifyCard, setVerifyCard] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [ackedIds, setAckedIds] = useState({});

  const { reportCards = [], loading } = useChildReportCards(activeChild?.id || null);

  const [downloadError, setDownloadError] = useState(null);

  const handleDownload = async (card) => {
    if (!activeChild) return;
    setDownloadingId(card.id);
    setDownloadError(null);
    try {
      const blob = await downloadChildReportCard(activeChild.id, card.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const slug = (s) => String(s || '').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
      a.download = `report-card-${slug(activeChild.fullName)}-${slug(card.term)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setDownloadError(err?.message || 'Download failed — please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleAck = async (card) => {
    setAckedIds((m) => ({ ...m, [card.id]: true }));
    try { await acknowledgeRecord({ kind: 'report_card', id: card.id }); } catch {}
  };

  return (
    <div className="par-reports">
      <div className="par-reports__top">
        <div>
          <h1 className="par-page-header__title">Report Cards</h1>
          <p className="par-page-header__sub">
            The Digital Archive · viewing for <strong>{activeChild?.fullName || '—'}</strong>
          </p>
        </div>
      </div>

      {downloadError && (
        <div className="par-empty" role="alert" style={{ padding: '12px 16px' }}>
          <span className="material-symbols-outlined">error</span>
          <p>{downloadError}</p>
        </div>
      )}

      {loading && (
        <div>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={140} radius={16} style={{ marginBottom: 16 }} />
          ))}
        </div>
      )}

      {!loading && reportCards.length === 0 && (
        <div className="par-empty">
          <span className="material-symbols-outlined">description</span>
          <p>No report cards available yet for {activeChild?.fullName || 'this child'}.</p>
        </div>
      )}

      {!loading && reportCards.map((card, idx) => {
        const letterColor = getGradeLetterColor(card.grade);
        const acked = ackedIds[card.id];
        return (
          <motion.div
            key={card.id}
            className="par-report-card"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.26, delay: idx * 0.06 }}
          >
            <div className="par-report-card__left">
              <div className="par-report-card__icon">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1", fontSize: 28, color: 'var(--par-primary)' }}>
                  description
                </span>
              </div>
              <div className="par-report-card__info">
                <h3 className="par-report-card__term">{[card.term, card.academicYear].filter(Boolean).join(' · ')}</h3>
                <div className="par-report-card__meta-row">
                  <span>{activeChild?.classroom || 'Grade'}</span>
                  {card.position != null && (
                    <>
                      <span className="par-report-card__sep">·</span>
                      <span>Position {card.position}{card.totalStudents != null ? ` of ${card.totalStudents}` : ''}</span>
                    </>
                  )}
                  {card.average != null && (
                    <>
                      <span className="par-report-card__sep">·</span>
                      <span>Average: {card.average}%</span>
                    </>
                  )}
                  {card.subjects?.length > 0 && (
                    <>
                      <span className="par-report-card__sep">·</span>
                      <span>{card.subjects.length} subject{card.subjects.length === 1 ? '' : 's'}</span>
                    </>
                  )}
                </div>
                <div className="par-report-card__badges">
                  {card.isVerified && (
                    <span className="par-report-card__verified-badge">
                      <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>verified</span>
                      Verified
                    </span>
                  )}
                  {card.grade && (
                    <span className="par-report-card__grade-badge" style={{ color: letterColor }}>
                      Grade {card.grade}
                    </span>
                  )}
                  {acked && (
                    <span className="par-report-card__acked-badge">
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>check_circle</span>
                      Acknowledged
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="par-report-card__actions">
              {card.verificationHash && (
                <button className="par-report-card__btn par-report-card__btn--qr" onClick={() => setVerifyCard(card)}>
                  <span className="material-symbols-outlined">qr_code_2</span>
                  Verify
                </button>
              )}
              <button
                className="par-report-card__btn par-report-card__btn--download"
                onClick={() => handleDownload(card)}
                disabled={downloadingId === card.id}
              >
                {downloadingId === card.id ? (
                  <><span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>autorenew</span> …</>
                ) : (
                  <><span className="material-symbols-outlined">download</span> Download PDF</>
                )}
              </button>
              {!acked && (
                <button className="par-report-card__btn par-report-card__btn--ack" onClick={() => handleAck(card)}>
                  <span className="material-symbols-outlined">how_to_reg</span>
                  Acknowledge
                </button>
              )}
            </div>
          </motion.div>
        );
      })}

      <AnimatePresence>
        {verifyCard && <VerifyModal reportCard={verifyCard} onClose={() => setVerifyCard(null)} />}
      </AnimatePresence>
    </div>
  );
}
