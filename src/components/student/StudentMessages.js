import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { studentApi } from '../../api/studentApi';
import { formatRelativeTime } from '../../utils/studentUtils';
import './StudentMessages.css';

function ConversationItem({ conv, isActive, onClick }) {
  const last = conv.messages[conv.messages.length - 1];
  return (
    <button
      className={`smsg-conv ${isActive ? 'smsg-conv--active' : ''}`}
      onClick={onClick}
    >
      <div
        className="smsg-conv__avatar"
        style={{ background: conv.teacher.color }}
      >
        {conv.teacher.initials}
      </div>
      <div className="smsg-conv__body">
        <div className="smsg-conv__top">
          <span className="smsg-conv__name">{conv.teacher.name}</span>
          {last && <span className="smsg-conv__time">{formatRelativeTime(last.sentAt)}</span>}
        </div>
        <div className="smsg-conv__subject">{conv.teacher.subject}</div>
        {last && (
          <div className="smsg-conv__preview">
            {last.sender === 'student' ? 'You: ' : ''}{last.text}
          </div>
        )}
      </div>
      {conv.unread > 0 && (
        <span className="smsg-conv__badge">{conv.unread}</span>
      )}
    </button>
  );
}

function ChatBubble({ msg }) {
  const isMine = msg.sender === 'student';
  return (
    <motion.div
      className={`smsg-bubble-wrap ${isMine ? 'smsg-bubble-wrap--mine' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className={`smsg-bubble ${isMine ? 'smsg-bubble--mine' : 'smsg-bubble--theirs'}`}>
        {msg.text}
      </div>
      <div className="smsg-bubble__time">{formatRelativeTime(msg.sentAt)}</div>
    </motion.div>
  );
}

export default function StudentMessages() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeConvId, setActiveConvId] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'chat'
  const bottomRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await studentApi.getConversations();
      setConversations(data);
      if (data.length > 0) setActiveConvId(data[0].id);
    } catch {
      // show empty state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Scroll to bottom when messages change
  const activeConv = conversations.find((c) => c.id === activeConvId);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConv?.messages?.length]);

  // Mark conv as read on open
  useEffect(() => {
    if (!activeConvId) return;
    setConversations((prev) =>
      prev.map((c) => c.id === activeConvId ? { ...c, unread: 0 } : c)
    );
  }, [activeConvId]);

  const handleSend = async () => {
    if (!draft.trim() || !activeConvId || sending) return;
    const text = draft.trim();
    setDraft('');
    setSending(true);
    try {
      const newMsg = await studentApi.sendMessage(activeConvId, text);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConvId
            ? { ...c, messages: [...c.messages, newMsg] }
            : c
        )
      );
    } catch {
      setDraft(text);
    } finally {
      setSending(false);
    }
  };

  const openConv = (id) => {
    setActiveConvId(id);
    setMobileView('chat');
  };

  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  return (
    <div className="smsg">
      {/* Header */}
      <div className="smsg__header">
        {mobileView === 'chat' && (
          <button className="smsg__back" onClick={() => setMobileView('list')}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        )}
        <div>
          <h1 className="smsg__title">Messages</h1>
          <p className="smsg__sub">
            {loading ? 'Loading…' : `${conversations.length} conversation${conversations.length !== 1 ? 's' : ''}${totalUnread > 0 ? ` · ${totalUnread} unread` : ''}`}
          </p>
        </div>
      </div>

      <div className="smsg__layout">
        {/* Conversation list */}
        <div className={`smsg__sidebar ${mobileView === 'chat' ? 'smsg__sidebar--hidden' : ''}`}>
          {loading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="smsg-conv smsg-conv--skeleton">
                <div className="skeleton" style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div className="skeleton" style={{ height: 13, width: '60%', marginBottom: 7 }} />
                  <div className="skeleton" style={{ height: 11, width: '80%' }} />
                </div>
              </div>
            ))
          ) : conversations.length === 0 ? (
            <div className="smsg__empty">
              <span className="material-symbols-outlined">chat_bubble_outline</span>
              <p>No messages yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <ConversationItem
                key={conv.id}
                conv={conv}
                isActive={conv.id === activeConvId}
                onClick={() => openConv(conv.id)}
              />
            ))
          )}
        </div>

        {/* Chat area */}
        <div className={`smsg__chat ${mobileView === 'list' ? 'smsg__chat--hidden' : ''}`}>
          {!activeConv ? (
            <div className="smsg__chat-empty">
              <span className="material-symbols-outlined">forum</span>
              <p>Select a conversation to view messages</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="smsg__chat-head">
                <div className="smsg__chat-avatar" style={{ background: activeConv.teacher.color }}>
                  {activeConv.teacher.initials}
                </div>
                <div>
                  <div className="smsg__chat-name">{activeConv.teacher.name}</div>
                  <div className="smsg__chat-subject">{activeConv.teacher.subject}</div>
                </div>
              </div>

              {/* Messages */}
              <div className="smsg__messages">
                <AnimatePresence>
                  {activeConv.messages.map((msg) => (
                    <ChatBubble key={msg.id} msg={msg} />
                  ))}
                </AnimatePresence>
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="smsg__input-row">
                <input
                  className="smsg__input"
                  type="text"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  disabled={sending}
                />
                <button
                  className="smsg__send"
                  onClick={handleSend}
                  disabled={!draft.trim() || sending}
                  aria-label="Send message"
                >
                  {sending ? (
                    <span className="smsg-spin" />
                  ) : (
                    <span className="material-symbols-outlined">send</span>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
