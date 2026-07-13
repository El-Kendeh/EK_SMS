import React, { useState, useEffect, useCallback } from 'react';
import { principalApi } from '../../api/adminApi';
import Modal from './Modal';
import { timeAgo } from '../schooladmin/Principal/principal.utils';
import '../schooladmin/SchoolAdmin.css';
import '../schooladmin/Principal/Principal.css'; // defines the .pu-* classes this page renders
import './GradeApprovals.css';                   // ga-banner / ga-btn / ga-modal / ga-textarea
import './Announcements.css';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const TITLE_MAX = 191;
const MESSAGE_MAX = 2000;

const AUDIENCES = [
  { value: 'all',      label: 'Whole school', icon: 'groups' },
  { value: 'teachers', label: 'Teachers',     icon: 'school' },
  { value: 'parents',  label: 'Parents',      icon: 'family_restroom' },
  { value: 'students', label: 'Students',     icon: 'backpack' },
];
const AUD_LABEL = Object.fromEntries(AUDIENCES.map(a => [a.value, a.label.toLowerCase()]));

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    principalApi.listAnnouncements()
      .then(res => {
        if (res?.success === false) { setError(res.message || 'Failed to load announcements'); return; }
        setAnnouncements(res.announcements || []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(t);
  }, [feedback]);

  const canSend = title.trim().length > 0 && message.trim().length > 0 && !sending;

  const send = async () => {
    setSending(true);
    try {
      const res = await principalApi.postAnnouncement({ title: title.trim(), message: message.trim(), audience });
      if (res?.success === false) {
        setFeedback({ type: 'error', msg: res.message || 'Failed to send announcement' });
      } else {
        const who = audience === 'all' ? 'the whole school' : `${res.delivered ?? 0} ${AUD_LABEL[audience]}`;
        setFeedback({ type: 'success', msg: `Announcement sent to ${who}` });
        setTitle('');
        setMessage('');
        setAudience('all');
        load();
      }
    } catch (err) {
      setFeedback({ type: 'error', msg: err.message || 'Failed to send announcement' });
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="pu-page pan-page">
      <div className="pu-page__head">
        <div>
          <h1 className="ska-page-title">Announcements</h1>
          <p className="ska-page-sub">Send a notice to everyone at your school</p>
        </div>
      </div>

      {feedback && (
        <div className={`ga-banner ga-banner--${feedback.type}`}>
          <Ic name={feedback.type === 'success' ? 'check_circle' : 'error'} size="sm" />
          {feedback.msg}
        </div>
      )}

      {/* Composer */}
      <div className="pu-card pan-composer">
        <div className="pu-card__head">
          <div className="pu-card__title"><Ic name="campaign" size="sm" /><strong>New Announcement</strong></div>
        </div>
        <div className="pan-field" role="radiogroup" aria-label="Audience">
          <span className="pan-field__label">Audience</span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {AUDIENCES.map(a => (
              <button
                key={a.value}
                type="button"
                role="radio"
                aria-checked={audience === a.value}
                className={`ga-btn ${audience === a.value ? 'ga-btn--primary' : 'ga-btn--ghost'}`}
                style={{ minHeight: 40 }}
                onClick={() => setAudience(a.value)}
              >
                <Ic name={a.icon} size="sm" /> {a.label}
              </button>
            ))}
          </div>
          <span className="pan-field__count">
            {audience === 'all'
              ? 'One school-wide notice, visible in every portal.'
              : `Delivered individually to each ${AUD_LABEL[audience].replace(/s$/, '')} at this school.`}
          </span>
        </div>
        <label className="pan-field">
          <span className="pan-field__label">Title</span>
          <input
            type="text"
            className="pan-input"
            value={title}
            maxLength={TITLE_MAX}
            placeholder="e.g. Mid-term break starts Friday"
            onChange={e => setTitle(e.target.value)}
          />
          <span className="pan-field__count">{title.length}/{TITLE_MAX}</span>
        </label>
        <label className="pan-field">
          <span className="pan-field__label">Message</span>
          <textarea
            className="ga-textarea"
            rows={4}
            value={message}
            maxLength={MESSAGE_MAX}
            placeholder="Write the announcement…"
            onChange={e => setMessage(e.target.value)}
          />
          <span className="pan-field__count">{message.length}/{MESSAGE_MAX}</span>
        </label>
        <div className="pan-composer__actions">
          <button type="button" className="ga-btn ga-btn--primary pan-send-btn"
            disabled={!canSend} onClick={() => setConfirmOpen(true)}>
            <Ic name="send" size="sm" /> Send announcement
          </button>
        </div>
      </div>

      {confirmOpen && (
        <Modal title={audience === 'all' ? 'Send to everyone at this school?' : `Send to all ${AUD_LABEL[audience]}?`} onClose={() => setConfirmOpen(false)}>
          <p className="ga-modal__sub">
            "{title.trim()}" will be visible to {audience === 'all' ? 'all staff, students and parents of this school' : `every ${AUD_LABEL[audience].replace(/s$/, '')} at this school`}. Announcements cannot be edited after sending.
          </p>
          <div className="ga-modal__actions">
            <button type="button" className="ga-btn ga-btn--ghost" onClick={() => setConfirmOpen(false)}>Cancel</button>
            <button type="button" className="ga-btn ga-btn--primary" disabled={sending} onClick={send}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </Modal>
      )}

      {/* Sent list */}
      <div className="pu-card">
        <div className="pu-card__head">
          <div className="pu-card__title"><Ic name="history" size="sm" /><strong>Sent Announcements</strong></div>
          <span className="pu-card__sub">Latest 100</span>
        </div>

        {error && (
          <div className="pu-empty">
            <Ic name="error" size="xl" />
            <p className="pu-empty__title">Couldn't load announcements</p>
            <p className="pu-empty__desc">{error}</p>
          </div>
        )}

        {!error && loading && (
          <div className="pu-empty">
            <Ic name="hourglass_empty" size="xl" />
            <p className="pu-empty__title">Loading…</p>
          </div>
        )}

        {!error && !loading && announcements.length === 0 && (
          <div className="pu-empty">
            <Ic name="campaign" size="xl" />
            <p className="pu-empty__title">No announcements yet</p>
            <p className="pu-empty__desc">Announcements you send appear here.</p>
          </div>
        )}

        {!error && !loading && announcements.length > 0 && (
          <div className="pan-list">
            {announcements.map(a => (
              <div key={a.id} className="pan-item">
                <span className="pan-item__icon"><Ic name="campaign" size="sm" /></span>
                <div className="pan-item__body">
                  <strong className="pan-item__title">{a.title}</strong>
                  <p className="pan-item__msg">{a.message}</p>
                </div>
                <span className="pan-item__time" title={a.created_at ? new Date(a.created_at).toLocaleString() : ''}>
                  {timeAgo(a.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
