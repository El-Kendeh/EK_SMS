import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { teacherApi } from '../../api/teacherApi';
import { useAutoSave } from '../../hooks/useAutoSave';
import { Skeleton } from '../common/Skeleton';
import './TeacherStudentThreads.css';

// 2-way upgrade of FeedbackScreen — student replies are now shown.
export default function TeacherStudentThreads() {
  const [threads, setThreads] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft, draftMeta] = useAutoSave(`tstu_${activeId || 'none'}`, '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const bottomRef = useRef(null);

  const refresh = () => {
    teacherApi.getStudentThreads().then((list) => {
      setThreads(list);
      if (!activeId && list[0]) setActiveId(list[0].studentId);
    }).catch(() => setError('Could not load threads.'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    teacherApi.getFeedbackTemplates().then(setTemplates).catch(() => {});
  }, []);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [activeId, threads]);

  const active = threads?.find((t) => t.studentId === activeId);

  const send = async (text = draft) => {
    const t = (text || '').trim();
    if (!t || !activeId || sending) return;
    setSending(true); setError(null);
    try {
      const m = await teacherApi.sendStudentMessage(activeId, t);
      setThreads((cur) => cur.map((th) => th.studentId === activeId
        ? { ...th, messages: [...th.messages, m], unread: 0 }
        : th
      ));
      setDraft(''); draftMeta.clear();
    } catch { setError('Could not send.'); }
    finally { setSending(false); }
  };

  return (
    <div className="tst">
      <header>
        <h2><span className="material-symbols-outlined">forum</span> Student feedback</h2>
        <p>Two-way thread per student. Quick-insert from your saved templates.</p>
      </header>

      {error && <p className="tst__error">{error}</p>}
      {!threads && <Skeleton height={420} radius={14} />}

      {threads && (
        <div className="tst__pane">
          <aside className="tst__list">
            {threads.map((t) => (
              <button
                key={t.studentId}
                onClick={() => setActiveId(t.studentId)}
                className={`tst__item ${activeId === t.studentId ? 'is-active' : ''}`}
              >
                <strong>{t.studentName}</strong>
                <span>{t.classroom}</span>
                {t.unread > 0 && <em>{t.unread} new</em>}
              </button>
            ))}
          </aside>
          <div className="tst__chat">
            {active && (
              <>
                <div className="tst__chat-head">
                  <strong>{active.studentName}</strong>
                  <span>{active.classroom}</span>
                </div>

                {templates.length > 0 && (
                  <div className="tst__templates" role="toolbar" aria-label="Quick replies">
                    {templates.slice(0, 6).map((tpl) => (
                      <button key={tpl.id} type="button" onClick={() => send(tpl.text)} title={tpl.text}>
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="tst__messages">
                  <AnimatePresence>
                    {active.messages.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`tst__msg tst__msg--${m.sender}`}
                      >
                        <p>{m.text}</p>
                        <small>{new Date(m.sentAt).toLocaleString()}</small>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {active.messages.length === 0 && <p className="tst__msg-empty">No messages yet.</p>}
                  <div ref={bottomRef} />
                </div>

                <footer>
                  <textarea
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder={`Message ${active.studentName}…`}
                  />
                  <button onClick={() => send()} disabled={sending || !draft.trim()}>
                    {sending ? '…' : 'Send'}
                  </button>
                </footer>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
