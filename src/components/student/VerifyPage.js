import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import QRCode from '../common/QRCode';
import { Skeleton } from '../common/Skeleton';
import './VerifyPage.css';

// Public verification page. Reachable at /verify/:hash from a scanned QR.
// Read-only: shows whether the hash exists in the registry and the signing party.
export default function VerifyPage({ hash }) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hash) { setError('Missing verification code'); setLoading(false); return; }
    setLoading(true);
    studentApi.verifyHash(hash)
      .then(setResult)
      .catch(() => setError('Verification service unreachable. Try again later.'))
      .finally(() => setLoading(false));
  }, [hash]);

  return (
    <div className="vfy-page">
      <header className="vfy-header">
        <div className="vfy-header__brand">
          <span className="material-symbols-outlined">verified_user</span>
          EK-SMS Document Verification
        </div>
      </header>

      <main className="vfy-main">
        {loading && (
          <div className="vfy-loading">
            <Skeleton height={28} width="60%" />
            <Skeleton height={18} width="80%" style={{ marginTop: 14 }} />
            <Skeleton height={180} style={{ marginTop: 22, borderRadius: 12 }} />
          </div>
        )}

        {!loading && error && (
          <div className="vfy-card vfy-card--error">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
            <h1>Verification unavailable</h1>
            <p>{error}</p>
          </div>
        )}

        {!loading && result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`vfy-card ${result.valid ? 'vfy-card--valid' : 'vfy-card--invalid'}`}
          >
            <div className="vfy-status">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                {result.valid ? 'verified' : 'cancel'}
              </span>
              <h1>{result.valid ? 'Authentic record' : 'Not in our registry'}</h1>
              <p>
                {result.valid
                  ? 'This document was signed by the issuing institution and has not been altered.'
                  : (result.reason || 'No matching record was found.')}
              </p>
            </div>

            {result.valid && (
              <>
                <dl className="vfy-meta">
                  <div><dt>Issued by</dt><dd>{result.signedBy}</dd></div>
                  <div><dt>Issued to</dt><dd>{result.student} ({result.studentNumber})</dd></div>
                  <div><dt>Term</dt><dd>{result.term} · {result.academicYear}</dd></div>
                  <div><dt>Term Average</dt><dd>{result.average?.toFixed?.(1) ?? '—'}%</dd></div>
                  <div><dt>Signed at</dt><dd>{new Date(result.signedAt).toLocaleString()}</dd></div>
                  <div><dt>Chain position</dt><dd>#{result.chainPosition} · tip {result.chainTip}</dd></div>
                </dl>
                <div className="vfy-qr">
                  <QRCode value={`${window.location.origin}/verify/${encodeURIComponent(hash)}`} size={140} />
                  <span>Permalink to this record</span>
                </div>
              </>
            )}

            <details className="vfy-details">
              <summary>Show technical details</summary>
              <code>{hash}</code>
            </details>
          </motion.div>
        )}

        <p className="vfy-disclaimer">
          This is a public verification endpoint. No personal information is shown beyond what's necessary
          to confirm authenticity. To raise a concern, contact the issuing school's registrar.
        </p>
      </main>
    </div>
  );
}
