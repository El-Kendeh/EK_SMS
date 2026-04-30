import React, { useState } from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

const CHANNELS = [
  { key: 'message',      label: 'Message',      icon: 'mail',          help: 'Direct, in-app inbox.' },
  { key: 'notification', label: 'Notification', icon: 'notifications', help: 'Push alert + bell.' },
  { key: 'sms',          label: 'SMS',          icon: 'sms',           help: 'Text to phone.' },
];

/**
 * Mode:
 *   "direct"    — sending to one parent  (parent prop)
 *   "broadcast" — sending to many        (recipientsCount prop)
 */
export default function CommunicationPanel({ mode = 'direct', parent, recipientsCount, onClose, onSent }) {
  const [channel, setChannel] = useState('message');
  const [subject, setSubject] = useState('');
  const [body,    setBody]    = useState('');
  const [busy,    setBusy]    = useState(false);
  const [ok,      setOk]      = useState('');

  const isBroadcast = mode === 'broadcast';
  const title       = isBroadcast ? 'Broadcast to Parents' : `Message ${parent?.name || 'Parent'}`;
  const audience    = isBroadcast ? `${recipientsCount} parent${recipientsCount === 1 ? '' : 's'}` : (parent?.email || '');

  const send = () => {
    if (!body.trim()) return;
    setBusy(true);
    /* Mock send — in production this would POST to /api/school/messages/ */
    setTimeout(() => {
      setOk(isBroadcast
        ? `Broadcast queued to ${recipientsCount} parent${recipientsCount === 1 ? '' : 's'}.`
        : `Message sent to ${parent?.name || 'parent'}.`);
      setBusy(false);
      onSent && onSent({ channel, subject, body, mode, parent });
      setTimeout(onClose, 900);
    }, 500);
  };

  return (
    <div className="ska-modal-overlay" onClick={onClose}>
      <div className="ska-modal ska-modal--wide" onClick={e => e.stopPropagation()}>
        <div className="ska-modal-head">
          <div>
            <h3 className="ska-modal-title">
              <Ic name={isBroadcast ? 'campaign' : 'send'} size="sm" style={{ marginRight: 6 }} />
              {title}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: 'var(--ska-text-3)' }}>
              {isBroadcast ? `Reaching ${audience} after filters` : `To: ${audience}`}
            </p>
          </div>
          <button className="ska-modal-close" onClick={onClose} aria-label="Close">
            <Ic name="close" size="sm" />
          </button>
        </div>

        <div className="ska-modal-body">
          {ok && <div className="ska-prnt-banner ska-prnt-banner--ok"><Ic name="check_circle" size="sm" /> {ok}</div>}

          <div className="ska-form-group" style={{ marginBottom: 12 }}>
            <span>Channel</span>
            <div className="ska-prnt-channel-row">
              {CHANNELS.map(c => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setChannel(c.key)}
                  className={`ska-prnt-channel-btn ${channel === c.key ? 'is-active' : ''}`}
                >
                  <Ic name={c.icon} size="sm" />
                  <div>
                    <strong>{c.label}</strong>
                    <small>{c.help}</small>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {channel !== 'sms' && (
            <div className="ska-form-group" style={{ marginBottom: 12 }}>
              <span>Subject</span>
              <input className="ska-input" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Mid-term progress update" />
            </div>
          )}

          <div className="ska-form-group">
            <span>Message</span>
            <textarea
              className="ska-input"
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder={isBroadcast ? 'Type a clear, concise broadcast…' : 'Write your message…'}
              rows={6}
              style={{ resize: 'vertical', minHeight: 120 }}
            />
            <small style={{ color: 'var(--ska-text-3)', fontSize: '0.6875rem' }}>{body.length} characters</small>
          </div>
        </div>

        <div className="ska-modal-actions">
          <button className="ska-btn ska-btn--ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="ska-btn ska-btn--primary" onClick={send} disabled={busy || !body.trim()}>
            <Ic name="send" size="sm" /> {busy ? 'Sending…' : isBroadcast ? 'Send Broadcast' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
