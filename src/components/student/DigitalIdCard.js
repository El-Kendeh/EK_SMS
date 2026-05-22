import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import QRCode from '../common/QRCode';
import { Skeleton } from '../common/Skeleton';
import './DigitalIdCard.css';

export default function DigitalIdCard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    studentApi.getDigitalId()
      .then(setData)
      .catch(() => setError('Could not load your student ID.'));
  }, []);

  if (error) return <div className="did__error">{error}</div>;
  if (!data) {
    return (
      <div className="did">
        <Skeleton height={300} radius={20} />
      </div>
    );
  }

  return (
    <div className="did">
      <header>
        <h2>
          <span className="material-symbols-outlined">badge</span>
          Digital Student ID
        </h2>
        <p>Tap and hold or screenshot to share. The QR resolves to "active student" only — no grades or personal data are revealed.</p>
      </header>

      <motion.div
        className="did__card"
        style={{ '--brand': data.schoolColor }}
        initial={{ rotateY: -10, opacity: 0 }}
        animate={{ rotateY: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="did__card-front">
          <div className="did__top">
            <div className="did__brand">
              <span className="material-symbols-outlined">school</span>
              <span>{data.schoolName}</span>
            </div>
            <span className="did__valid">Valid until {new Date(data.validUntil).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
          </div>

          <div className="did__main">
            <div className="did__avatar">
              <span>{data.firstName[0]}{data.lastName[0]}</span>
            </div>
            <div className="did__name-block">
              <h3>{data.firstName} {data.lastName}</h3>
              <p>{data.classroom} · {data.academicYear}</p>
              <p className="did__num">{data.studentNumber}</p>
            </div>
          </div>

          <div className="did__bottom">
            <dl>
              <div><dt>SMS code</dt><dd>{data.smsCode}</dd></div>
              <div><dt>Blood type</dt><dd>{data.bloodGroup || '—'}</dd></div>
              <div><dt>Emergency</dt><dd>{data.emergencyContact}</dd></div>
            </dl>
            <div className="did__qr">
              <QRCode value={data.verifyUrl} size={92} ariaLabel="Verify student status" />
            </div>
          </div>

          <span className="did__serial">{data.cardSerial}</span>
        </div>
      </motion.div>

      <p className="did__hint">
        Need a printed copy? Use your browser's print/save-as-PDF feature while viewing this page.
      </p>
    </div>
  );
}
