import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import { useAutoSave } from '../../hooks/useAutoSave';
import './FeedbackThreadPanel.css';

export default function FeedbackThreadPanel({ grade, onClose }) {
  const [thread, setThread] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [input, setInput, draftMeta] = useAutoSave(`stu_fbk_${grade?.id || 'none'}`, '');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!grade) return;
    setLoading(true);
    setError(null);
    studentApi.getFeedbackThread(grade.id)
      .then(setThread)
      .catch(() => setError('Could not load feedback thread.'))
      .finally(() => setLoading(false));
  }, [grade]);

  useEffect(() => {
    if (thread) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    }
  }, [thread]);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const msg = await studentApi.sendFeedbackMessage(grade.id, input.trim());
      setThread((prev) => ({ ...prev, messages: [...prev.messages, msg] }));
      setInput('');
      draftMeta.clear();
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
    } catch (err) {
      setError('Could not send your message. Your draft has been kept.');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      {grade && (
        <>
          <motion.div
            className="ftp-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="ftp-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="ftp-header">
              <div className="ftp-header__verified">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                Verified Conversation
              </div>
              <div className="ftp-header__info">
                <h3>{grade.subject?.name}</h3>
                {thread && <p>{thread.teacherName} · {thread.teacherRole}</p>}
              </div>
              <button className="ftp-close" onClick={onClose}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Body */}
            <div className="ftp-body">
              {loading && (
                <div className="ftp-loading">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 12, background: '#F2F4F6' }} />
                  ))}
                </div>
              )}
              {error && <div className="ftp-error">{error}</div>}

              {!loading && thread && (
                <div className="ftp-messages">
                  {thread.messages.map((msg, idx) => {
                    const isStudent = msg.sender === 'student';
                    return (
                      <motion.div
                        key={msg.id}
                        className={`ftp-msg-row ${isStudent ? 'ftp-msg-row--student' : 'ftp-msg-row--teacher'}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.04 }}
                      >
                        {!isStudent && (
                          <div className="ftp-avatar ftp-avatar--teacher">
                            <span className="material-symbols-outlined">person</span>
                          </div>
                        )}
                        <div className="ftp-msg-content">
                          <div className={`ftp-bubble ${isStudent ? 'ftp-bubble--student' : 'ftp-bubble--teacher'}`}>
                            {msg.text}
                            {msg.attachment && (
                              <div className="ftp-attachment">
                                <span className="material-symbols-outlined">description</span>
                                <div>
                                  <p className="ftp-attachment__name">{msg.attachment.name}</p>
                                  <p className="ftp-attachment__desc">{msg.attachment.desc}</p>
                                </div>
                                <span className="material-symbols-outlined ftp-attachment__dl">download</span>
                              </div>
                            )}
                          </div>
                          <div className={`ftp-msg-meta ${isStudent ? 'ftp-msg-meta--right' : ''}`}>
                            <span>{isStudent ? 'You' : thread.teacherName} · {formatTime(msg.sentAt)}</span>
                            {isStudent && (
                              <span className="material-symbols-outlined ftp-read-icon" style={{ fontVariationSettings: msg.isRead ? "'FILL' 1" : "'FILL' 0" }}>check_circle</span>
                            )}
                          </div>
                        </div>
                        {isStudent && (
                          <div className="ftp-avatar ftp-avatar--student">
                            <span className="material-symbols-outlined">person</span>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="ftp-input-bar">
              <div className="ftp-input-wrap">
                <input
                  className="ftp-input"
                  type="text"
                  placeholder={`Reply to ${thread?.teacherName || 'teacher'}…`}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!thread || sending}
                />
              </div>
              <button
                className="ftp-send-btn"
                onClick={handleSend}
                disabled={!input.trim() || sending}
              >
                <span className="material-symbols-outlined">{sending ? 'hourglass_empty' : 'send'}</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
