import { useState } from 'react';
import { adminApi } from '../../api/adminApi';

/**
 * Small inline button — pass `userId` (the User PK behind a teacher / student / parent / staff).
 * Confirms before sending, shows a 4-second status pill in place.
 */
export default function ResendCredentialsButton({ userId, label = 'Resend Credentials',
                                                  size = 'sm', confirmLabel,
                                                  onSent }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleClick = async () => {
    if (!userId) return;
    const ok = window.confirm(
      confirmLabel ||
      'This will reset the password and email new credentials to the user. Continue?'
    );
    if (!ok) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await adminApi.resendCredentials(userId);
      if (res.success) {
        setMsg({ type: 'ok',
                 text: res.email_sent ? 'Sent' : 'Reset (email failed)' });
        if (onSent) onSent(res);
      } else {
        setMsg({ type: 'err', text: res.message || 'Failed' });
      }
    } catch (err) {
      setMsg({ type: 'err', text: err.message || 'Network error' });
    }
    setBusy(false);
    setTimeout(() => setMsg(null), 4000);
  };

  if (msg) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: size === 'sm' ? '4px 8px' : '6px 10px',
        borderRadius: 8, fontSize: size === 'sm' ? '0.75rem' : '0.85rem',
        fontWeight: 600,
        background: msg.type === 'ok' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
        color:      msg.type === 'ok' ? '#059669' : '#dc2626',
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
          {msg.type === 'ok' ? 'mark_email_read' : 'error'}
        </span>
        {msg.text}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy || !userId}
      title="Reset password and email credentials to the user"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: size === 'sm' ? '4px 8px' : '6px 10px',
        borderRadius: 8, border: '1px solid #1B3FAF',
        background: 'transparent', color: '#1B3FAF', cursor: 'pointer',
        fontSize: size === 'sm' ? '0.75rem' : '0.85rem', fontWeight: 600,
        opacity: busy ? 0.6 : 1,
      }}
    >
      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
        {busy ? 'autorenew' : 'forward_to_inbox'}
      </span>
      {busy ? 'Sending…' : label}
    </button>
  );
}
