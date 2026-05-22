import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import ErrorBoundary from '../common/ErrorBoundary';
import { useAutoSave } from '../../hooks/useAutoSave';
import './Whistleblower.css';

function Inner() {
  const [tab, setTab] = useState('submit'); // 'submit' | 'follow'
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('corruption');
  const [message, setMessage, draft] = useAutoSave('stu_whistle_draft', '');
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [followKey, setFollowKey] = useState('');
  const [followStatus, setFollowStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    studentApi.getWhistleblowerCategories()
      .then((c) => { setCategories(c); if (c[0]) setCategory(c[0].id); })
      .catch(() => setCategories([]));
  }, []);

  const submit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await studentApi.submitWhistleblowerReport({ category, message });
      setSubmitted(res);
      setMessage('');
      draft.clear();
    } catch (e) {
      setError('We could not deliver the report. Please try again later. Your message is saved locally.');
    } finally {
      setSubmitting(false);
    }
  };

  const checkStatus = async () => {
    if (!followKey.trim()) return;
    setError(null);
    try {
      const res = await studentApi.checkWhistleblowerStatus(followKey.trim());
      setFollowStatus(res);
    } catch (e) {
      setError('Could not look up that ticket.');
    }
  };

  return (
    <div className="wb">
      <header className="wb__head">
        <div className="wb__head-icon">
          <span className="material-symbols-outlined">privacy_tip</span>
        </div>
        <div>
          <h1>Safe Report</h1>
          <p>
            Send an anonymous, encrypted report to the school's compliance office. We do not log
            identity, IP, or device. Save your follow-up key to check progress later.
          </p>
        </div>
      </header>

      <nav className="wb__tabs">
        <button onClick={() => setTab('submit')} className={tab === 'submit' ? 'is-active' : ''}>
          Submit a report
        </button>
        <button onClick={() => setTab('follow')} className={tab === 'follow' ? 'is-active' : ''}>
          Check a ticket
        </button>
      </nav>

      {tab === 'submit' && (
        submitted ? (
          <motion.div className="wb__success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
            <h3>Report received</h3>
            <p>{submitted.note}</p>
            <code>{submitted.followUpKey}</code>
            <p className="wb__success-tip">
              Save this key somewhere offline. It is the only way to check progress on your report
              while staying anonymous.
            </p>
            <button onClick={() => setSubmitted(null)} className="wb__btn wb__btn--ghost">
              Submit another report
            </button>
          </motion.div>
        ) : (
          <div className="wb__form">
            <label>
              <span>Category</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>

            <label>
              <span>What happened?</span>
              <textarea
                rows={8}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe what you saw or experienced. Include dates and people if you wish, or stay vague — both work."
              />
              {draft.restored && message && (
                <small className="wb__draft-pill">
                  <span className="material-symbols-outlined">save</span>
                  Draft restored
                </small>
              )}
            </label>

            {error && <div className="wb__error">{error}</div>}

            <div className="wb__actions">
              <button className="wb__btn wb__btn--primary" onClick={submit} disabled={submitting || !message.trim()}>
                {submitting ? (
                  <>
                    <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>autorenew</span>
                    Sending…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">send</span>
                    Submit anonymously
                  </>
                )}
              </button>
            </div>

            <p className="wb__legal">
              By submitting, you confirm the information is accurate to the best of your knowledge.
              False reports may be reviewed for misconduct.
            </p>
          </div>
        )
      )}

      {tab === 'follow' && (
        <div className="wb__follow">
          <label>
            <span>Follow-up key</span>
            <input
              value={followKey}
              onChange={(e) => setFollowKey(e.target.value)}
              placeholder="WB-XXXXXXXX"
            />
          </label>
          <button className="wb__btn wb__btn--primary" onClick={checkStatus}>
            <span className="material-symbols-outlined">manage_search</span>
            Check status
          </button>

          {followStatus && (
            <div className="wb__status">
              <h4>Ticket {followStatus.ticketId} · {followStatus.status}</h4>
              <ul>
                {followStatus.updates?.map((u, i) => (
                  <li key={i}>
                    <strong>{new Date(u.at).toLocaleString()}</strong>
                    <p>{u.text}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Whistleblower() {
  return <ErrorBoundary><Inner /></ErrorBoundary>;
}
