import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import VerificationModal from './VerificationModal';
import CertificateModal from './CertificateModal';
import './StudentReportCards.css';

function MiniQR({ hash, size = 60 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = size;
    canvas.height = size;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);

    const seed = hash || 'placeholder';
    const cell = 5;
    const cols = Math.floor(size / cell);

    const drawFinder = (x, y, s) => {
      ctx.fillStyle = '#101C2E';
      ctx.fillRect(x, y, s, s);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x + cell, y + cell, s - cell * 2, s - cell * 2);
      ctx.fillStyle = '#101C2E';
      ctx.fillRect(x + cell * 2, y + cell * 2, s - cell * 4, s - cell * 4);
    };
    const f = cell * 5;
    drawFinder(0, 0, f);
    drawFinder(size - f, 0, f);
    drawFinder(0, size - f, f);

    ctx.fillStyle = '#101C2E';
    for (let r = 0; r < cols; r++) {
      for (let c = 0; c < cols; c++) {
        const inTL = r < 6 && c < 6;
        const inTR = r < 6 && c >= cols - 6;
        const inBL = r >= cols - 6 && c < 6;
        if (inTL || inTR || inBL) continue;
        const idx = (r * cols + c) % seed.length;
        if (seed.charCodeAt(idx) % 3 !== 0) {
          ctx.fillRect(c * cell, r * cell, cell - 1, cell - 1);
        }
      }
    }
  }, [hash, size]);

  return <canvas ref={canvasRef} />;
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
      const blob = await studentApi.downloadReportCard(card.id);
      if (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-card-${card.termName || card.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
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
            <div>
              <div className="srep-avg-label">Term Average</div>
              <div className="srep-avg-value">
                {card.average != null ? `${card.average.toFixed(1)}%` : 'N/A'}
              </div>
            </div>
            <div className="srep-qr-wrap">
              <MiniQR hash={card.verificationHash} size={60} />
            </div>
          </div>

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
