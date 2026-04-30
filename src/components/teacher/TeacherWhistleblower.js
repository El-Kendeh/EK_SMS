import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { teacherApi } from '../../api/teacherApi';
import { useAutoSave } from '../../hooks/useAutoSave';
import './TeacherWhistleblower.css';

export default function TeacherWhistleblower() {
  const [tab, setTab] = useState('submit');
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('corruption');
  const [message, setMessage, draftMeta] = useAutoSave('teacher_whistle_draft', '');
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [followKey, setFollowKey] = useState('');
  const [status, setStatus] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    teacherApi.getWhistleblowerCategories().then((c) => { setCategories(c); if (c[0]) setCategory(c[0].id); }).catch(() => {});
  }, []);

  const submit = async () => {
    if (!message.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const res = await teacherApi.submitWhistleblowerReport({ category, message });
      setSubmitted(res); setMessage(''); draftMeta.clear();
    } catch { setError('We could not deliver the report. Try again later.'); }
    finally { setSubmitting(false); }
  };

  const check = async () => {
    if (!followKey.trim()) return;
    setError(null);
    try { setStatus(await teacherApi.checkWhistleblowerStatus(followKey.trim())); }
    catch { setError('Could not look up that ticket.'); }
  };

  return (
    <div className="twb">
      <header>
        <div className="twb__icon"><span className="material-symbols-outlined">privacy_tip</span></div>
        <div>
          <h1>Safe Report</h1>
          <p>Anonymous, encrypted report to the school's compliance office. We do not log identity, IP, or device. Save your follow-up key to check progress later.</p>
        </div>
      </header>

      <nav className="twb__tabs">
        <button onClick={() => setTab('submit')} className={tab === 'submit' ? 'is-active' : ''}>Submit a report</button>
        <button onClick={() => setTab('follow')} className={tab === 'follow' ? 'is-active' : ''}>Check a ticket</button>
      </nav>

      {tab === 'submit' && (submitted ? (
        <motion.div className="twb__success" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          <h3>Report received</h3>
          <p>{submitted.note}</p>
          <code>{submitted.followUpKey}</code>
          <p className="twb__success-tip">Save this key offline. It is the only way to check progress while staying anonymous.</p>
          <button onClick={() => setSubmitted(null)} className="twb__btn twb__btn--ghost">Submit another</button>
        </motion.div>
      ) : (
        <div className="twb__form">
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
            {draftMeta.restored && message && (
              <small className="twb__draft-pill"><span className="material-symbols-outlined">save</span> Draft restored</small>
            )}
          </label>
          {error && <div className="twb__error">{error}</div>}
          <div className="twb__actions">
            <button className="twb__btn twb__btn--primary" onClick={submit} disabled={submitting || !message.trim()}>
              {submitting ? 'Sending…' : 'Submit anonymously'}
            </button>
          </div>
        </div>
      ))}

      {tab === 'follow' && (
        <div className="twb__follow">
          <label>
            <span>Follow-up key</span>
            <input value={followKey} onChange={(e) => setFollowKey(e.target.value)} placeholder="WB-XXXXXXXX" />
          </label>
          <button className="twb__btn twb__btn--primary" onClick={check}>Check status</button>
          {status && (
            <div className="twb__status">
              <h4>Ticket {status.ticketId} · {status.status}</h4>
              <ul>
                {status.updates?.map((u, i) => (
                  <li key={i}><strong>{new Date(u.at).toLocaleString()}</strong><p>{u.text}</p></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
