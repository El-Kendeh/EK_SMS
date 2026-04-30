import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import { ordinalSuffix } from '../../utils/studentUtils';
import VerificationModal from './VerificationModal';
import CertificateModal from './CertificateModal';
import QRCode from '../common/QRCode';
import './StudentReportCards.css';

function formatGeneratedDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function verifyUrl(hash) {
  return hash ? `${window.location.origin}/verify/${encodeURIComponent(hash)}` : '';
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { duration: 0.35, delay: i * 0.08 } }),
};

export default function StudentReportCards() {
  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [verifyCard, setVerifyCard] = useState(null);
  const [certCard, setCertCard] = useState(null);

  useEffect(() => {
    setLoading(true);
    studentApi.getReportCards()
      .then((data) => setReportCards(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load report cards.'))
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = useCallback(async (card) => {
    setDownloading(card.id);
    try {
      const html = await studentApi.downloadReportCard(card.id);
      if (html) {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
        }
      }
    } catch {
      // silently fail
    }
    setDownloading(null);
  }, []);

  const handleCopyHash = useCallback((card) => {
    if (!card.verificationHash) return;
    navigator.clipboard.writeText(card.verificationHash).then(() => {
      setCopiedId(card.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const shortHash = (hash) =>
    hash ? `SHA-256: ${hash.slice(0, 6)}...${hash.slice(-4)}` : 'SHA-256: N/A';

  return (
    <div className="srep">
      <div className="srep__header">
        <h1 className="srep__title">Report Cards</h1>
      </div>

      {loading && (
        <>
          {[0, 1].map((i) => (
            <div key={i} className="srep-skeleton-card">
              <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 10, background: '#F2F4F6', borderRadius: 6 }} />
              <div className="skeleton" style={{ height: 24, width: '60%', marginBottom: 18, background: '#F2F4F6', borderRadius: 6 }} />
              <div className="skeleton" style={{ height: 60, background: '#F2F4F6', borderRadius: 8 }} />
            </div>
          ))}
        </>
      )}

      {error && (
        <div style={{ padding: 20, color: '#BA1A1A', textAlign: 'center', fontSize: 14 }}>{error}</div>
      )}

      {!loading && reportCards.map((card, idx) => (
        <motion.div
          key={card.id}
          className={`srep-card ${card.status === 'archived' ? 'srep-card--archived' : ''}`}
          custom={idx}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Top */}
          <div className="srep-card__top">
            <div>
              <div className="srep-card__year-badge">{card.academicYear || 'Academic Year'}</div>
              <div className="srep-card__term-name">{card.termName || 'Term'}</div>
            </div>
            {card.status !== 'draft' && (
              <div className="srep-verified-badge">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                Verified
              </div>
            )}
          </div>

          {/* Mid */}
          <div className="srep-card__mid">
            <div className="srep-card__mid-stats">
              <div className="srep-stat">
                <div className="srep-avg-label">Term Average</div>
                <div className="srep-avg-value">
                  {card.average != null ? `${card.average.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <div className="srep-stat-divider" />
              <div className="srep-stat">
                <div className="srep-avg-label">Class Rank</div>
                <div className="srep-avg-value srep-avg-value--rank">
                  {card.classRank != null
                    ? <>{ordinalSuffix(card.classRank)}<span className="srep-rank-of"> / {card.totalStudentsInClass}</span></>
                    : 'N/A'}
                </div>
              </div>
            </div>
            <div className="srep-qr-wrap">
              <QRCode value={verifyUrl(card.verificationHash)} size={60} />
            </div>
          </div>

          {/* Generated date */}
          {card.generatedAt && (
            <div className="srep-generated-row">
              <span className="material-symbols-outlined">event_available</span>
              Issued {formatGeneratedDate(card.generatedAt)}
            </div>
          )}

          {/* Hash */}
          <div className="srep-hash-row">
            <code>{shortHash(card.verificationHash)}</code>
            <button
              className="srep-hash-copy"
              onClick={() => handleCopyHash(card)}
              title="Copy hash"
            >
              <span className="material-symbols-outlined">
                {copiedId === card.id ? 'check' : 'content_copy'}
              </span>
            </button>
          </div>

          {/* Actions */}
          {card.status === 'archived' ? (
            <div className="srep-card__actions">
              <button className="srep-btn srep-btn--archive" onClick={() => setVerifyCard(card)}>
                <span className="material-symbols-outlined">history</span>
                View Archived Records
              </button>
            </div>
          ) : (
            <div className="srep-card__actions">
              <button
                className="srep-btn srep-btn--primary"
                onClick={() => handleDownload(card)}
                disabled={downloading === card.id}
              >
                {downloading === card.id ? (
                  <>
                    <span className="material-symbols-outlined srep-spinning">autorenew</span>
                    Downloading…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">download</span>
                    Download PDF
                  </>
                )}
              </button>
              <button className="srep-btn srep-btn--ghost" onClick={() => setVerifyCard(card)}>
                <span className="material-symbols-outlined">shield_with_heart</span>
                Verify Authenticity
              </button>
              <button className="srep-btn srep-btn--cert" onClick={() => setCertCard(card)}>
                <span className="material-symbols-outlined">workspace_premium</span>
                View Certificate
              </button>
            </div>
          )}
        </motion.div>
      ))}

      {/* Upcoming placeholder */}
      {!loading && (
        <div className="srep-empty">
          <div className="srep-empty__icon-wrap">
            <span className="material-symbols-outlined">calendar_today</span>
          </div>
          <div className="srep-empty__title">Next Term</div>
          <div className="srep-empty__sub">Report card will be available after the term closes</div>
        </div>
      )}

      {/* Smart verification info */}
      {!loading && (
        <motion.div
          className="srep-info-panel"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="srep-info-panel__head">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            <span className="srep-info-panel__title">Smart Verification</span>
          </div>
          <div className="srep-info-panel__body">
            <p className="srep-info-panel__text">
              Every EK-SMS report card is cryptographically signed. The QR code allows
              universities and employers to instantly verify the authenticity of your grades
              without contacting the office.
            </p>
          </div>
        </motion.div>
      )}

      {/* Verification modal */}
      <VerificationModal reportCard={verifyCard} onClose={() => setVerifyCard(null)} />

      {/* Certificate modal */}
      {certCard && <CertificateModal reportCard={certCard} onClose={() => setCertCard(null)} />}
    </div>
  );
}
