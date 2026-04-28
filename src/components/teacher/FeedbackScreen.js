import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { teacherApi } from '../../api/teacherApi';
import { formatRelativeTime } from '../../utils/teacherUtils';
import './FeedbackScreen.css';

const MOCK_STUDENTS = [
  { id: 1, name: 'Amara Koroma',    className: 'Form 3A', subject: 'Mathematics', unreadCount: 2 },
  { id: 2, name: 'Ibrahim Sesay',   className: 'Form 3A', subject: 'Mathematics', unreadCount: 0 },
  { id: 3, name: 'Fatima Bangura',  className: 'Form 4B', subject: 'Mathematics', unreadCount: 1 },
  { id: 4, name: 'Mohamed Conteh',  className: 'Form 4B', subject: 'Mathematics', unreadCount: 0 },
  { id: 5, name: 'Aminata Kamara',  className: 'Form 3A', subject: 'Mathematics', unreadCount: 0 },
];

const MOCK_MESSAGES = (studentId) => [
  { id: 1, message: `Good progress this term — keep it up!`, sender: 'teacher', created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 2, message: `Thank you, sir/madam! I will work harder.`, sender: 'student', created_at: new Date(Date.now() - 1.5 * 3600000).toISOString() },
  { id: 3, message: `Focus on your calculation speed for the final exam. Try timed exercises.`, sender: 'teacher', created_at: new Date(Date.now() - 30 * 60000).toISOString() },
];

export default function FeedbackScreen({ navigateTo }) {
  const { assignedClasses } = useTeacher();
  const [students, setStudents]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [filterClass, setFilterClass]   = useState('');
  const [search, setSearch]             = useState('');
  const [selected, setSelected]         = useState(null);
  const [messages, setMessages]         = useState([]);
  const [loadingMsgs, setLoadingMsgs]   = useState(false);
  const [newMsg, setNewMsg]             = useState('');
  const [sending, setSending]           = useState(false);
  const [sendError, setSendError]       = useState('');
  const [mobileView, setMobileView]     = useState('list'); // 'list' | 'thread'
  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);

  useEffect(() => {
    setLoading(true);
    teacherApi.getFeedbackStudents()
      .then(data => {
        const list = data.students || [];
        setStudents(list.length > 0 ? list : MOCK_STUDENTS);
      })
      .catch(() => setStudents(MOCK_STUDENTS))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoadingMsgs(true);
    setMessages([]);
    teacherApi.getFeedbackMessages(selected.id)
      .then(data => {
        const list = data.messages || [];
        setMessages(list.length > 0 ? list : MOCK_MESSAGES(selected.id));
      })
      .catch(() => setMessages(MOCK_MESSAGES(selected.id)))
      .finally(() => setLoadingMsgs(false));
  }, [selected]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectStudent = (s) => {
    setSelected(s);
    setNewMsg('');
    setSendError('');
    setMobileView('thread');
    setStudents(prev => prev.map(st => st.id === s.id ? { ...st, unreadCount: 0 } : st));
  };

  const handleSend = async () => {
    const text = newMsg.trim();
    if (!text || !selected) return;
    setSendError('');
    setSending(true);
    const optimistic = { id: Date.now(), message: text, sender: 'teacher', created_at: new Date().toISOString() };
    setMessages(prev => [...prev, optimistic]);
    setNewMsg('');
    try {
      const res = await teacherApi.sendFeedback(selected.id, text);
      if (!res.success && !res.id) {
        setSendError('Message failed to send. Please retry.');
        setMessages(prev => prev.filter(m => m.id !== optimistic.id));
        setNewMsg(text);
      }
    } catch {
      setSendError('Network error — message not sent.');
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setNewMsg(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredStudents = students.filter(s => {
    if (filterClass && String(s.class_id) !== String(filterClass) &&
        !s.className?.includes(assignedClasses.find(c => String(c.id) === filterClass)?.name || '')) return false;
    if (search && !s.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalUnread = students.reduce((acc, s) => acc + (s.unreadCount || 0), 0);

  return (
    <div className="fb-root">
      {/* Page header */}
      <div className="fb-page-header">
        <div>
          <h1 className="tch-page-title" style={{ margin: 0 }}>Student Feedback</h1>
          <p className="tch-page-sub" style={{ margin: '2px 0 0' }}>
            Individual feedback threads with your students
          </p>
        </div>
        {totalUnread > 0 && (
          <span className="fb-unread-total">
            <span className="material-symbols-outlined">mark_unread_chat_alt</span>
            {totalUnread} unread
          </span>
        )}
      </div>

      <div className="fb-layout">

        {/* ── Student list panel ──────────────────────────────────── */}
        <div className={`fb-list-panel ${mobileView === 'thread' ? 'fb-list-panel--hidden' : ''}`}>

          {/* List filters */}
          <div className="fb-list-filters">
            <div className="fb-search-wrap">
              <span className="material-symbols-outlined fb-search-icon">search</span>
              <input className="fb-search-input" placeholder="Search students…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="tch-select fb-class-select" value={filterClass}
              onChange={e => setFilterClass(e.target.value)}>
              <option value="">All Classes</option>
              {assignedClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Student list */}
          {loading ? (
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0,1,2,3].map(i => <div key={i} className="tch-skeleton" style={{ height: 60 }} />)}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="fb-list-empty">
              <span className="material-symbols-outlined">group_off</span>
              <p>{students.length === 0 ? 'No students assigned yet' : 'No students match search'}</p>
            </div>
          ) : (
            <div className="fb-student-list">
              {filteredStudents.map((s, i) => (
                <motion.button
                  key={s.id}
                  className={`fb-student-row ${selected?.id === s.id ? 'fb-student-row--active' : ''}`}
                  onClick={() => handleSelectStudent(s)}
                  initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <div className="fb-student-avatar">
                    {(s.name || 'S')[0].toUpperCase()}
                  </div>
                  <div className="fb-student-info">
                    <p className="fb-student-name">{s.name}</p>
                    <p className="fb-student-class">{s.className || s.class_name}</p>
                  </div>
                  {s.unreadCount > 0 && (
                    <span className="fb-unread-badge">{s.unreadCount}</span>
                  )}
                  <span className="material-symbols-outlined fb-student-chevron">chevron_right</span>
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* ── Thread panel ────────────────────────────────────────── */}
        <div className={`fb-thread-panel ${mobileView === 'list' ? 'fb-thread-panel--hidden' : ''}`}>

          {!selected ? (
            <div className="fb-thread-empty">
              <span className="material-symbols-outlined fb-thread-empty__icon">forum</span>
              <p className="fb-thread-empty__title">Select a student</p>
              <p className="fb-thread-empty__sub">Choose a student from the list to view or start a feedback thread.</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="fb-thread-header">
                <button className="fb-back-btn tch-btn tch-btn--ghost tch-btn--sm" onClick={() => setMobileView('list')}>
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="fb-thread-avatar">{(selected.name || 'S')[0].toUpperCase()}</div>
                <div className="fb-thread-student-info">
                  <p className="fb-thread-student-name">{selected.name}</p>
                  <p className="fb-thread-student-class">{selected.className || selected.class_name}</p>
                </div>
                <div className="fb-thread-header-actions">
                  <button className="tch-btn tch-btn--ghost tch-btn--sm"
                    onClick={() => navigateTo('students')} title="View student profile">
                    <span className="material-symbols-outlined">person</span>
                  </button>
                </div>
              </div>

              {/* Messages area */}
              <div className="fb-messages-area">
                {loadingMsgs ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 20 }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ display: 'flex', justifyContent: i % 2 === 0 ? 'flex-end' : 'flex-start' }}>
                        <div className="tch-skeleton" style={{ height: 52, width: '60%', borderRadius: 12 }} />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="fb-no-messages">
                    <span className="material-symbols-outlined">chat_bubble_outline</span>
                    <p>No messages yet — start the conversation below</p>
                  </div>
                ) : (
                  <>
                    {messages.map((m, i) => {
                      const isTeacher = m.sender === 'teacher';
                      return (
                        <motion.div key={m.id}
                          className={`fb-message-wrap ${isTeacher ? 'fb-message-wrap--sent' : 'fb-message-wrap--received'}`}
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.03 }}>
                          {!isTeacher && (
                            <div className="fb-msg-avatar">{(selected.name || 'S')[0].toUpperCase()}</div>
                          )}
                          <div className={`fb-message ${isTeacher ? 'fb-message--sent' : 'fb-message--received'}`}>
                            <p className="fb-message__text">{m.message}</p>
                            <p className="fb-message__time">{formatRelativeTime(m.created_at)}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Send error */}
              <AnimatePresence>
                {sendError && (
                  <motion.p className="fb-send-error"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <span className="material-symbols-outlined">error</span>{sendError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Send bar */}
              <div className="fb-send-bar">
                <textarea
                  ref={textareaRef}
                  className="fb-send-input"
                  placeholder="Write feedback… (Enter to send, Shift+Enter for new line)"
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={2}
                  maxLength={1000}
                />
                <button
                  className={`fb-send-btn ${!newMsg.trim() || sending ? 'fb-send-btn--disabled' : ''}`}
                  onClick={handleSend}
                  disabled={!newMsg.trim() || sending}
                  title="Send feedback">
                  <span className="material-symbols-outlined">{sending ? 'sync' : 'send'}</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
