import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useActiveChild } from '../../context/ChildContext';
import { fetchTeacherThreads, sendTeacherMessage } from '../../api/parentApi';
import { useAutoSave } from '../../hooks/useAutoSave';
import { Skeleton } from '../common/Skeleton';
import './ParentMessages.css';

// Per-child × per-subject message threads with the teacher.
export default function ParentMessages() {
  const { activeChild } = useActiveChild();
  const [threads, setThreads] = useState(null);
  const [activeKey, setActiveKey] = useState(null);
  const [draft, setDraft, draftMeta] = useAutoSave(`pmsg_${activeChild?.id || 'none'}_${activeKey || 'none'}`, '');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    setThreads(null);
    setActiveKey(null);
    if (!activeChild?.id) return;
    fetchTeacherThreads(activeChild.id).then((list) => {
      setThreads(list);
      if (list.length) setActiveKey(list[0].key);
    }).catch(() => setError('Could not load message threads.'));
  }, [activeChild?.id]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [activeKey, threads]);

  const active = threads?.find((t) => t.key === activeKey);

  const send = async () => {
    if (!draft.trim() || !activeChild?.id || !active || sending) return;
    setSending(true);
    setError(null);
    const text = draft.trim();
    try {
      const msg = await sendTeacherMessage(activeChild.id, active.subjectId, text);
      setThreads((cur) => cur.map((t) => t.key === activeKey
        ? { ...t, messages: [...t.messages, msg] }
        : t
      ));
      setDraft(''); draftMeta.clear();
    } catch (e) {
      setError('Could not send. Your draft is kept.');
    } finally {
      setSending(false);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (!activeChild) {
    return <div className="pmsg__empty"><p>Select a child to see message threads.</p></div>;
  }

  return (
    <div className="pmsg">
      <header>
        <h2><span className="material-symbols-outlined">forum</span> Messages with teachers</h2>
        <p>Threads scoped to <strong>{activeChild.fullName}</strong>. One per subject.</p>
      </header>

      {error && <p className="pmsg__error">{error}</p>}

      {!threads && (
        <div className="pmsg__skeleton">
          <Skeleton height={400} radius={14} />
        </div>
      )}

      {threads && threads.length === 0 && (
        <div className="pmsg__empty"><p>No active threads. A new thread starts when you message a teacher from the Grades page.</p></div>
      )}

      {threads && threads.length > 0 && (
        <div className="pmsg__pane">
          <aside className="pmsg__list">
            {threads.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveKey(t.key)}
                className={`pmsg__list-item ${activeKey === t.key ? 'is-active' : ''}`}
              >
                <strong>{t.teacherName}</strong>
                <span>{t.teacherRole}</span>
                {t.unread > 0 && <em>{t.unread} new</em>}
              </button>
            ))}
          </aside>
          <div className="pmsg__chat">
            {active && (
              <>
                <div className="pmsg__chat-head">
                  <div>
                    <strong>{active.teacherName}</strong>
                    <span>{active.teacherRole}</span>
                  </div>
                </div>
                <div className="pmsg__messages">
                  <AnimatePresence>
                    {active.messages.map((m) => (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`pmsg__msg pmsg__msg--${m.sender}`}
                      >
                        <p>{m.text}</p>
                        <small>{new Date(m.sentAt).toLocaleString()}</small>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {active.messages.length === 0 && (
                    <p className="pmsg__msg-empty">No messages yet — send the first one.</p>
                  )}
                  <div ref={bottomRef} />
                </div>
                <footer>
                  <textarea
                    rows={2}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={onKey}
                    placeholder={`Message ${active.teacherName}…`}
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
