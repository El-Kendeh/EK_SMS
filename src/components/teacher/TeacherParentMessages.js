import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { teacherApi } from '../../api/teacherApi';
import { useAutoSave } from '../../hooks/useAutoSave';
import { Skeleton } from '../common/Skeleton';
import './TeacherParentMessages.css';

// 1:1 thread per child × parent. Mirror of the Parent dashboard's TeacherMessages.
export default function TeacherParentMessages() {
  const [threads, setThreads] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [draft, setDraft, draftMeta] = useAutoSave(`tparent_${activeId || 'none'}`, '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  const refresh = () => {
    teacherApi.getParentThreads().then((list) => {
      setThreads(list);
      if (!activeId && list[0]) setActiveId(list[0].childId);
    }).catch(() => setError('Could not load threads.'));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [activeId, threads]);

  const active = threads?.find((t) => t.childId === activeId);

  const send = async () => {
    if (!draft.trim() || !activeId || sending) return;
    setSending(true); setError(null);
    try {
      const m = await teacherApi.sendParentMessage(activeId, draft.trim());
      setThreads((cur) => cur.map((t) => t.childId === activeId
        ? { ...t, messages: [...t.messages, m], unread: 0 }
        : t
      ));
      setDraft(''); draftMeta.clear();
    } catch { setError('Could not send.'); }
    finally { setSending(false); }
  };

  return (
    <div className="tpm">
      <header>
        <h2><span className="material-symbols-outlined">forum</span> Parent messages</h2>
        <p>1:1 thread per linked guardian. Each thread is logged in the audit trail.</p>
      </header>

      {error && <p className="tpm__error">{error}</p>}

      {!threads && <Skeleton height={420} radius={14} />}

      {threads && threads.length === 0 && (
        <div className="tpm__empty"><p>No active parent threads. Threads start when a parent reaches out.</p></div>
      )}

      {threads && threads.length > 0 && (
        <div className="tpm__pane">
          <aside className="tpm__list">
            {threads.map((t) => (
              <button
                key={t.childId}
                onClick={() => setActiveId(t.childId)}
                className={`tpm__item ${activeId === t.childId ? 'is-active' : ''}`}
              >
                <strong>{t.parentName}</strong>
                <span>{t.relationship}</span>
                <small>re: {t.childName}</small>
                {t.unread > 0 && <em>{t.unread} new</em>}
              </button>
            ))}
          </aside>
          <div className="tpm__chat">
            {active && (
              <>
                <div className="tpm__chat-head">
                  <strong>{active.parentName}</strong>
                  <span>{active.relationship} · re: {active.childName}</span>
                </div>
                <div className="tpm__messages">
                  <AnimatePresence>
                    {active.messages.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`tpm__msg tpm__msg--${m.sender}`}
                      >
                        <p>{m.text}</p>
                        <small>{new Date(m.sentAt).toLocaleString()}</small>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {active.messages.length === 0 && <p className="tpm__msg-empty">No messages yet.</p>}
                  <div ref={bottomRef} />
                </div>
                <footer>
                  <textarea
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder={`Reply to ${active.parentName}…`}
                  />
                  <button onClick={send} disabled={sending || !draft.trim()}>
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
