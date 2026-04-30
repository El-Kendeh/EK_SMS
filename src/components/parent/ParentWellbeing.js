import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchCounsellor, sendCounsellorMessage } from '../../api/parentApi';
import { useAutoSave } from '../../hooks/useAutoSave';
import './ParentWellbeing.css';

export default function ParentWellbeing() {
  const [data, setData] = useState(null);
  const [draft, setDraft, draftMeta] = useAutoSave('parent_wellbeing_draft', '');
  const [anonymous, setAnonymous] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetchCounsellor().then(setData).catch(() => setError('Could not load the counsellor channel.'));
  }, []);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [data]);

  const send = async () => {
    if (!draft.trim() || sending) return;
    setSending(true); setError(null);
    try {
      const m = await sendCounsellorMessage(draft.trim(), { anonymous });
      setData((cur) => ({ ...cur, thread: [...(cur?.thread || []), m] }));
      setDraft(''); draftMeta.clear();
    } catch { setError('Could not send.'); }
    finally { setSending(false); }
  };

  return (
    <div className="pwell">
      <header>
        <div className="pwell__icon"><span className="material-symbols-outlined">favorite</span></div>
        <div>
          <h2>Wellbeing room</h2>
          <p>{data ? `${data.counsellorName} · ${data.availability}` : 'Private channel with the school counsellor.'}</p>
        </div>
      </header>

      <div className="pwell__thread">
        {error && <p className="pwell__error">{error}</p>}
        {data?.thread?.map((m) => (
          <motion.div
            key={m.id}
            className={`pwell-msg pwell-msg--${m.sender}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p>{m.text}</p>
            <small>{new Date(m.sentAt).toLocaleString()}</small>
          </motion.div>
        ))}
        <div ref={bottomRef} />
      </div>

      <footer className="pwell__footer">
        <textarea
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Whatever's on your mind. Share as little or as much as you want."
        />
        <div className="pwell__send-row">
          <label>
            <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            Send anonymously
          </label>
          <button onClick={send} disabled={!draft.trim() || sending}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      </footer>
    </div>
  );
}
