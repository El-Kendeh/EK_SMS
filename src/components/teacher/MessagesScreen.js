import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTeacher } from '../../context/TeacherContext';
import { teacherApi } from '../../api/teacherApi';
import { formatRelativeTime } from '../../utils/teacherUtils';
import './MessagesScreen.css';

const AUDIENCE_OPTIONS = [
  { value: 'parents',  label: 'Parents',       icon: 'family_restroom' },
  { value: 'students', label: 'Students',       icon: 'groups' },
  { value: 'all',      label: 'Everyone',       icon: 'public' },
  { value: 'staff',    label: 'Staff',          icon: 'badge' },
];

const AUDIENCE_META = {
  parents:  { cls: 'tch-badge--blue',    icon: 'family_restroom' },
  students: { cls: 'tch-badge--primary', icon: 'groups' },
  all:      { cls: 'tch-badge--green',   icon: 'public' },
  staff:    { cls: 'tch-badge--amber',   icon: 'badge' },
};

const BLANK_FORM = { subject: '', body: '', recipient_role: 'parents' };

export default function MessagesScreen({ navigateTo }) {
  useTeacher();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sentFlash, setSentFlash] = useState(false);

  useEffect(() => {
    setLoading(true);
    teacherApi.getAnnouncements()
      .then(data => setAnnouncements(data.announcements || []))
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) { setSendError('Subject is required.'); return; }
    if (!form.body.trim()) { setSendError('Message body is required.'); return; }
    setSendError('');
    setSending(true);
    try {
      const res = await teacherApi.sendAnnouncement({
        subject: form.subject.trim(),
        body: form.body.trim(),
        recipient_role: form.recipient_role,
      });
      if (res.success) {
        setAnnouncements(prev => [{
          id: res.id,
          subject: form.subject.trim(),
          body: form.body.trim(),
          recipient_role: form.recipient_role,
          is_broadcast: true,
          created_at: new Date().toISOString(),
        }, ...prev]);
        setForm(BLANK_FORM);
        setShowCompose(false);
        setSentFlash(true);
        setTimeout(() => setSentFlash(false), 3000);
      } else {
        setSendError(res.message || 'Failed to send announcement.');
      }
    } catch {
      setSendError('Network error — please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ann-root">
      {/* Header */}
      <div className="ann-top-bar">
        <div>
          <h1 className="tch-page-title" style={{ margin: 0 }}>Announcements</h1>
          <p className="tch-page-sub" style={{ margin: '2px 0 0' }}>
            Broadcast messages to parents, students, or staff
          </p>
        </div>
        <button className="tch-btn tch-btn--primary" onClick={() => setShowCompose(true)}>
          <span className="material-symbols-outlined">campaign</span>
          New Announcement
        </button>
      </div>

      {/* Sent flash */}
      <AnimatePresence>
        {sentFlash && (
          <motion.div
            className="ann-sent-flash"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <span className="material-symbols-outlined">check_circle</span>
            Announcement sent successfully.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compose panel */}
      <AnimatePresence>
        {showCompose && (
          <motion.div
            className="tch-card tch-card--pad ann-compose"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <div className="ann-compose-header">
              <p className="ann-section-label">New Announcement</p>
              <button
                className="tch-btn tch-btn--ghost tch-btn--sm"
                onClick={() => { setShowCompose(false); setForm(BLANK_FORM); setSendError(''); }}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSend} className="ann-compose-fields">
              <div>
                <label className="tch-label">Audience</label>
                <div className="ann-audience-grid">
                  {AUDIENCE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`ann-audience-btn ${form.recipient_role === opt.value ? 'ann-audience-btn--active' : ''}`}
                      onClick={() => setForm(p => ({ ...p, recipient_role: opt.value }))}
                    >
                      <span className="material-symbols-outlined">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="tch-label">Subject *</label>
                <input
                  className="tch-input"
                  value={form.subject}
                  onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                  placeholder="e.g. Mid-term exam reminder"
                  maxLength={200}
                />
              </div>

              <div>
                <label className="tch-label">Message *</label>
                <textarea
                  className="tch-textarea"
                  rows={4}
                  value={form.body}
                  onChange={e => setForm(p => ({ ...p, body: e.target.value }))}
                  placeholder="Write your announcement here..."
                  maxLength={1000}
                />
                <p style={{ fontSize: 11, color: 'var(--tch-text-secondary)', marginTop: 4 }}>
                  {form.body.length}/1000
                </p>
              </div>

              {sendError && (
                <p style={{ color: 'var(--tch-error)', fontSize: 13, margin: 0 }}>{sendError}</p>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="tch-btn tch-btn--ghost"
                  onClick={() => { setShowCompose(false); setForm(BLANK_FORM); setSendError(''); }}
                >
                  Cancel
                </button>
                <button type="submit" className="tch-btn tch-btn--primary" disabled={sending}>
                  <span className="material-symbols-outlined">{sending ? 'sync' : 'send'}</span>
                  {sending ? 'Sending…' : 'Send Announcement'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Announcement list */}
      <div className="ann-info-note">
        <span className="material-symbols-outlined">info</span>
        Announcements are broadcast to all recipients in the selected role across your school.
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
          {[0,1,2].map(i => <div key={i} className="tch-skeleton" style={{ height: 80 }} />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="tch-empty">
          <span className="material-symbols-outlined">campaign</span>
          <p>No announcements sent yet</p>
          <button className="tch-btn tch-btn--primary" onClick={() => setShowCompose(true)}>
            Send Your First Announcement
          </button>
        </div>
      ) : (
        <div className="ann-list">
          {announcements.map((a, i) => {
            const meta = AUDIENCE_META[a.recipient_role] || AUDIENCE_META.all;
            return (
              <motion.div
                key={a.id}
                className="tch-card ann-item"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="ann-item__header">
                  <div className="ann-item__icon">
                    <span className="material-symbols-outlined">campaign</span>
                  </div>
                  <div className="ann-item__main">
                    <p className="ann-item__subject">{a.subject || '(No subject)'}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      <span className={`tch-badge ${meta.cls}`}>
                        <span className="material-symbols-outlined">{meta.icon}</span>
                        {AUDIENCE_OPTIONS.find(o => o.value === a.recipient_role)?.label || a.recipient_role}
                      </span>
                      <span className="ann-item__time">{formatRelativeTime(a.created_at)}</span>
                    </div>
                  </div>
                </div>
                <p className="ann-item__body">{a.body}</p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
