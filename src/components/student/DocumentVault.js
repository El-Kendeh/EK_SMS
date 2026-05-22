import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import { Skeleton } from '../common/Skeleton';
import './DocumentVault.css';

const TYPE_LABEL = {
  identity: 'Identity', medical: 'Medical', appeal: 'Appeal evidence', other: 'Other',
};

function fmtSize(bytes) {
  if (!bytes) return '—';
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes > 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

export default function DocumentVault() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('uploads');

  // upload form
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('other');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // transcript form
  const [purpose, setPurpose] = useState('');
  const [address, setAddress] = useState('');
  const [delivery, setDelivery] = useState('digital');
  const [requesting, setRequesting] = useState(false);

  const fileRef = useRef(null);

  const refresh = () => studentApi.getDocumentVault().then(setData).catch(() => setError('Could not load your vault.'));
  useEffect(() => { refresh(); }, []);

  const upload = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    try {
      await studentApi.uploadDocument({ title, type: docType, file });
      setTitle(''); setFile(null); setDocType('other');
      if (fileRef.current) fileRef.current.value = '';
      refresh();
    } finally {
      setUploading(false);
    }
  };

  const requestTranscript = async (e) => {
    e.preventDefault();
    if (!purpose) return;
    setRequesting(true);
    try {
      await studentApi.requestTranscript({ purpose, address, deliveryMethod: delivery });
      setPurpose(''); setAddress('');
      refresh();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="dv">
      <header>
        <h2>
          <span className="material-symbols-outlined">folder_special</span>
          Document Vault
        </h2>
        <p>Upload medical certificates, leave letters, appeal evidence — and request official transcripts.</p>
      </header>

      <nav className="dv__tabs">
        <button onClick={() => setTab('uploads')} className={tab === 'uploads' ? 'is-active' : ''}>My uploads</button>
        <button onClick={() => setTab('transcript')} className={tab === 'transcript' ? 'is-active' : ''}>Transcripts</button>
      </nav>

      {!data && !error && <Skeleton height={220} radius={14} />}
      {error && <p className="dv__error">{error}</p>}

      {data && tab === 'uploads' && (
        <>
          <form className="dv__upload" onSubmit={upload}>
            <h3>Upload a new document</h3>
            <div className="dv__upload-grid">
              <input
                placeholder="Title (e.g. medical certificate)"
                value={title} onChange={(e) => setTitle(e.target.value)}
              />
              <select value={docType} onChange={(e) => setDocType(e.target.value)}>
                <option value="medical">Medical</option>
                <option value="identity">Identity</option>
                <option value="appeal">Appeal evidence</option>
                <option value="other">Other</option>
              </select>
              <input
                ref={fileRef}
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <button type="submit" disabled={uploading || !file}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </form>

          <ul className="dv__list">
            {data.uploads.map((d) => (
              <motion.li
                key={d.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`dv__row dv__row--${d.status}`}
              >
                <span className="material-symbols-outlined">description</span>
                <div className="dv__row-body">
                  <strong>{d.title}</strong>
                  <span>{TYPE_LABEL[d.type] || d.type} · {fmtSize(d.size)}</span>
                </div>
                <span className={`dv__pill dv__pill--${d.status}`}>{d.status}</span>
                <small>{new Date(d.uploadedAt).toLocaleDateString()}</small>
              </motion.li>
            ))}
          </ul>
        </>
      )}

      {data && tab === 'transcript' && (
        <>
          <form className="dv__upload" onSubmit={requestTranscript}>
            <h3>Request an official transcript</h3>
            <div className="dv__upload-grid">
              <input
                placeholder="Purpose (university, scholarship, etc.)"
                value={purpose} onChange={(e) => setPurpose(e.target.value)}
              />
              <select value={delivery} onChange={(e) => setDelivery(e.target.value)}>
                <option value="digital">Digital (verifiable PDF)</option>
                <option value="postal">Postal copy</option>
              </select>
              {delivery === 'postal' && (
                <input
                  placeholder="Postal address"
                  value={address} onChange={(e) => setAddress(e.target.value)}
                />
              )}
              <button type="submit" disabled={requesting || !purpose}>
                {requesting ? 'Submitting…' : 'Submit request'}
              </button>
            </div>
          </form>

          <ul className="dv__list">
            {data.transcriptRequests.length === 0 && <p className="dv__empty">No transcript requests yet.</p>}
            {data.transcriptRequests.map((r) => (
              <li key={r.id} className={`dv__row dv__row--${r.status}`}>
                <span className="material-symbols-outlined">receipt_long</span>
                <div className="dv__row-body">
                  <strong>{r.purpose}</strong>
                  <span>Requested {new Date(r.requestedAt).toLocaleDateString()}</span>
                  {r.verificationHash && (
                    <small>Verification: <code>{r.verificationHash}</code></small>
                  )}
                </div>
                <span className={`dv__pill dv__pill--${r.status}`}>{r.status}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
