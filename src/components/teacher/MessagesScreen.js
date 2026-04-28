import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { teacherApi } from '../../api/teacherApi';
import { formatRelativeTime } from '../../utils/teacherUtils';
import './MessagesScreen.css';

const MOCK_THREADS = [
  {
    id: 1,
    recipientName: "Amara Koroma's Parent",
    studentName: 'Amara Koroma',
    className: 'Form 3A',
    lastMessage: "Thank you for the update on Amara's recent progress.",
    timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
    unread: 0,
    messages: [
      { id: 1, sender: 'teacher', text: 'Good morning. I wanted to inform you that Amara has shown great improvement in Mathematics this term.', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
      { id: 2, sender: 'parent', text: "Thank you for the update on Amara's recent progress.", timestamp: new Date(Date.now() - 20 * 60000).toISOString() },
    ],
  },
  {
    id: 2,
    recipientName: "Ibrahim Sesay's Parent",
    studentName: 'Ibrahim Sesay',
    className: 'Form 3A',
    lastMessage: 'Ibrahim has been absent for 3 days. Could you please provide a medical certificate?',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    unread: 1,
    messages: [
      { id: 1, sender: 'teacher', text: 'Ibrahim has been absent for 3 days. Could you please provide a medical certificate?', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
    ],
  },
  {
    id: 3,
    recipientName: "Fatima Bangura's Parent",
    studentName: 'Fatima Bangura',
    className: 'Form 4B',
    lastMessage: 'Fatima has been selected for the inter-school Science competition.',
    timestamp: new Date(Date.now() - 24 * 3600000).toISOString(),
    unread: 0,
    messages: [
      { id: 1, sender: 'teacher', text: 'Fatima has been selected for the inter-school Science competition. Kindly confirm her participation by Friday.', timestamp: new Date(Date.now() - 24 * 3600000).toISOString() },
      { id: 2, sender: 'parent', text: 'That is wonderful news! She will participate.', timestamp: new Date(Date.now() - 20 * 3600000).toISOString() },
    ],
  },
];

function threadInitials(name = '') {
  return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function threadColor(name = '') {
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#14b8a6'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}

export default function MessagesScreen({ navigateTo }) {
  const { assignedClasses } = useTeacher();
  const [threads, setThreads] = useState(MOCK_THREADS);
  const [activeThread, setActiveThread] = useState(null);
  const [compose, setCompose] = useState('');
  const [sending, setSending] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newRecipient, setNewRecipient] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newClass, setNewClass] = useState('');
  const [creatingThread, setCreatingThread] = useState(false);
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    teacherApi.getMessages()
      .then(data => { if (data.threads?.length > 0) setThreads(data.threads); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeThread?.messages?.length]);

  const openThread = (thread) => {
    setActiveThread(thread);
    setMobileShowThread(true);
    // Mark as read locally
    setThreads(prev => prev.map(t => t.id === thread.id ? { ...t, unread: 0 } : t));
  };

  const handleSend = async () => {
    if (!compose.trim() || !activeThread) return;
    const text = compose.trim();
    setCompose('');
    setSending(true);
    const newMsg = { id: Date.now(), sender: 'teacher', text, timestamp: new Date().toISOString() };
    setThreads(prev => prev.map(t => t.id === activeThread.id
      ? { ...t, messages: [...t.messages, newMsg], lastMessage: text, timestamp: newMsg.timestamp }
      : t
    ));
    setActiveThread(prev => ({ ...prev, messages: [...prev.messages, newMsg], lastMessage: text }));
    try {
      await teacherApi.sendMessage({ thread_id: activeThread.id, text });
    } catch {}
    setSending(false);
  };

  const handleNewThread = async () => {
    if (!newRecipient.trim() || !newMessage.trim()) return;
    setCreatingThread(true);
    const newThread = {
      id: Date.now(),
      recipientName: newRecipient,
      studentName: '',
      className: newClass,
      lastMessage: newMessage,
      timestamp: new Date().toISOString(),
      unread: 0,
      messages: [{ id: 1, sender: 'teacher', text: newMessage, timestamp: new Date().toISOString() }],
    };
    try {
      await teacherApi.sendMessage({ recipient: newRecipient, text: newMessage, class_id: newClass });
    } catch {}
    setThreads(prev => [newThread, ...prev]);
    setActiveThread(newThread);
    setShowNew(false);
    setNewRecipient('');
    setNewMessage('');
    setNewClass('');
    setMobileShowThread(true);
    setCreatingThread(false);
  };

  const totalUnread = threads.reduce((a, t) => a + (t.unread || 0), 0);

  return (
    <div className="msg-root">
      {/* Left: Threads sidebar */}
      <div className={`msg-sidebar ${mobileShowThread ? 'msg-sidebar--hidden-mobile' : ''}`}>
        <div className="msg-sidebar__header">
          <div>
            <p className="msg-sidebar__title">Messages</p>
            {totalUnread > 0 && (
              <span className="tch-badge tch-badge--amber" style={{ marginLeft: 8 }}>{totalUnread} unread</span>
            )}
          </div>
          <button
            className="tch-btn tch-btn--primary tch-btn--sm"
            onClick={() => { setShowNew(true); setMobileShowThread(true); setActiveThread(null); }}
          >
            <span className="material-symbols-outlined">edit</span>
            New
          </button>
        </div>

        <div className="msg-thread-list">
          {threads.length === 0 ? (
            <div className="tch-empty" style={{ padding: '40px 20px' }}>
              <span className="material-symbols-outlined">chat</span>
              <p>No messages yet</p>
            </div>
          ) : threads.map(thread => (
            <button
              key={thread.id}
              className={`msg-thread-item ${activeThread?.id === thread.id ? 'msg-thread-item--active' : ''} ${thread.unread > 0 ? 'msg-thread-item--unread' : ''}`}
              onClick={() => openThread(thread)}
            >
              <div className="msg-thread-avatar" style={{ background: threadColor(thread.recipientName) }}>
                {threadInitials(thread.recipientName)}
              </div>
              <div className="msg-thread-info">
                <div className="msg-thread-name-row">
                  <span className="msg-thread-name">{thread.recipientName}</span>
                  <span className="msg-thread-time">{formatRelativeTime(thread.timestamp)}</span>
                </div>
                {thread.className && (
                  <span className="msg-thread-class">{thread.className}</span>
                )}
                <p className="msg-thread-preview">{thread.lastMessage}</p>
              </div>
              {thread.unread > 0 && (
                <span className="msg-unread-dot" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right: Thread view */}
      <div className={`msg-thread-pane ${!mobileShowThread ? 'msg-thread-pane--hidden-mobile' : ''}`}>
        {/* Mobile back */}
        <button
          className="msg-back-btn"
          onClick={() => { setMobileShowThread(false); setShowNew(false); }}
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Back
        </button>

        {/* New message compose */}
        <AnimatePresence>
          {showNew && (
            <motion.div
              className="msg-new-panel"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="msg-new-header">
                <p className="msg-new-title">New Message</p>
                <button className="tch-btn tch-btn--ghost tch-btn--sm" onClick={() => setShowNew(false)}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="tch-label">Recipient (parent or student name)</label>
                  <input
                    className="tch-input"
                    value={newRecipient}
                    onChange={e => setNewRecipient(e.target.value)}
                    placeholder="e.g. Amara Koroma's Parent"
                  />
                </div>
                <div>
                  <label className="tch-label">Class (optional)</label>
                  <select className="tch-select" value={newClass} onChange={e => setNewClass(e.target.value)}>
                    <option value="">— Select class —</option>
                    {assignedClasses.map(cls => (
                      <option key={cls.id} value={cls.name}>{cls.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="tch-label">Message</label>
                  <textarea
                    className="tch-textarea"
                    rows={3}
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Write your message..."
                    maxLength={500}
                  />
                </div>
                <button
                  className="tch-btn tch-btn--primary"
                  disabled={!newRecipient.trim() || !newMessage.trim() || creatingThread}
                  onClick={handleNewThread}
                >
                  <span className="material-symbols-outlined">{creatingThread ? 'sync' : 'send'}</span>
                  {creatingThread ? 'Sending…' : 'Send Message'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Thread messages */}
        {!showNew && activeThread ? (
          <div className="msg-thread-view">
            <div className="msg-thread-view__header">
              <div className="msg-thread-avatar" style={{ background: threadColor(activeThread.recipientName) }}>
                {threadInitials(activeThread.recipientName)}
              </div>
              <div>
                <p className="msg-thread-view__name">{activeThread.recipientName}</p>
                {activeThread.className && (
                  <p className="msg-thread-view__class">{activeThread.className}</p>
                )}
              </div>
            </div>

            <div className="msg-messages-list">
              {activeThread.messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  className={`msg-bubble-wrap ${msg.sender === 'teacher' ? 'msg-bubble-wrap--teacher' : ''}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className={`msg-bubble ${msg.sender === 'teacher' ? 'msg-bubble--teacher' : 'msg-bubble--parent'}`}>
                    {msg.text}
                  </div>
                  <p className="msg-bubble-time">{formatRelativeTime(msg.timestamp)}</p>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="msg-compose">
              <textarea
                className="tch-textarea msg-compose-input"
                rows={2}
                value={compose}
                onChange={e => setCompose(e.target.value)}
                placeholder="Write a message..."
                maxLength={500}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
              />
              <button
                className="tch-btn tch-btn--primary msg-send-btn"
                onClick={handleSend}
                disabled={!compose.trim() || sending}
              >
                <span className="material-symbols-outlined">{sending ? 'sync' : 'send'}</span>
              </button>
            </div>
          </div>
        ) : !showNew && (
          <div className="msg-empty-pane">
            <span className="material-symbols-outlined">chat_bubble_outline</span>
            <p>Select a conversation or start a new message</p>
            <button className="tch-btn tch-btn--primary" onClick={() => setShowNew(true)}>
              <span className="material-symbols-outlined">edit</span>
              New Message
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
