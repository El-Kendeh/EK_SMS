import React, { useState } from 'react';

const Ic = ({ name, size, style }) => (
  <span className={`ska-icon${size ? ` ska-icon--${size}` : ''}`} aria-hidden="true" style={style}>{name}</span>
);

/**
 * Inline post-create panel — gives the admin one-click delivery channels
 * for the temp credentials. Email is the typical channel; SMS opens the
 * device SMS handler with a prefilled body; copy uses the clipboard.
 */
export default function SendCredentials({ school, teacher, credentials, onPrintLetter }) {
  const [copied,    setCopied]    = useState(false);
  const [emailSent, setEmailSent] = useState(credentials?.email_sent || false);
  const [smsSent,   setSmsSent]   = useState(false);

  const fullName = [teacher.first_name, teacher.last_name].filter(Boolean).join(' ');
  const loginUrl = credentials?.login_url || window.location.origin;

  const body = [
    `Hi ${fullName || 'there'},`,
    ``,
    `Your teaching account at ${school?.name || 'the school'} has been created.`,
    `Login URL: ${loginUrl}`,
    `Email/Username: ${credentials?.email || teacher.email}`,
    `Temporary password: ${credentials?.password || '(see admin)'}`,
    ``,
    `You will be asked to change your password on first login.`,
  ].join('\n');

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      alert(body);
    }
  };

  const openEmail = () => {
    const subject = `Your teacher account at ${school?.name || ''}`;
    window.location.href = `mailto:${teacher.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setEmailSent(true);
  };

  const openSms = () => {
    if (!teacher.phone_number) { alert('No phone number on file.'); return; }
    /* sms: scheme — works on mobile + many desktops */
    window.location.href = `sms:${teacher.phone_number}?body=${encodeURIComponent(body)}`;
    setSmsSent(true);
  };

  return (
    <div className="tea-send">
      <h4 className="tea-send__title">
        <Ic name="forward_to_inbox" size="sm" /> Share login credentials
      </h4>

      {emailSent && credentials?.email_sent && (
        <div className="tea-send__autosent">
          <Ic name="check_circle" size="sm" /> Welcome email already sent automatically by the server.
        </div>
      )}

      <div className="tea-send__creds">
        <div><span>Email</span><strong>{credentials?.email || teacher.email}</strong></div>
        <div><span>Username</span><strong>{credentials?.login_username || '—'}</strong></div>
        <div><span>Password</span><code>{credentials?.password || '(server-generated)'}</code></div>
      </div>

      <div className="tea-send__actions">
        <button type="button" className="ska-btn ska-btn--ghost" onClick={copyAll}>
          <Ic name={copied ? 'check' : 'content_copy'} size="sm" /> {copied ? 'Copied' : 'Copy all'}
        </button>
        <button type="button" className="ska-btn ska-btn--ghost" onClick={openEmail}>
          <Ic name={emailSent ? 'mark_email_read' : 'mail'} size="sm" /> {emailSent ? 'Email opened' : 'Send by email'}
        </button>
        <button type="button" className="ska-btn ska-btn--ghost" onClick={openSms} disabled={!teacher.phone_number}>
          <Ic name={smsSent ? 'sms' : 'send'} size="sm" /> {smsSent ? 'SMS opened' : 'Send by SMS'}
        </button>
        <button type="button" className="ska-btn ska-btn--secondary" onClick={onPrintLetter}>
          <Ic name="print" size="sm" /> Print welcome letter
        </button>
      </div>
    </div>
  );
}
