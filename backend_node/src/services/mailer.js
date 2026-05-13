const { Resend } = require('resend');

function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key || !String(key).trim()) return null;
  try {
    return new Resend(String(key).trim());
  } catch (e) {
    console.error('[mailer] Resend init failed:', e.message);
    return null;
  }
}

function fromAddress() {
  return process.env.DEFAULT_FROM_EMAIL || 'PruhSMS <noreply@elkendeh.com>';
}

function publicAppUrl() {
  const raw = process.env.FRONTEND_APP_URL || process.env.APP_PUBLIC_URL || 'https://pruhsms.africa';
  return String(raw).replace(/\/$/, '');
}

/**
 * Notify school admin that their institution was approved (Resend).
 */
async function sendSchoolApprovedEmail({ toEmail, schoolName, adminUsername }) {
  if (!toEmail || !String(toEmail).trim()) {
    console.warn('[mailer] No recipient email; skipping approval notice');
    return { skipped: true, reason: 'no_email' };
  }

  const resend = getResend();
  const base = publicAppUrl();
  const loginUrl = `${base}/login`;

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
    <h1 style="color:#1B3FAF;font-size:1.25rem;margin:0 0 12px;">Your school is approved</h1>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
      <strong>${escapeHtml(schoolName)}</strong> has been approved on <strong>PruhSMS</strong>. You can now sign in and use the <strong>School Administrator</strong> dashboard.
    </p>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:0.875rem;color:#6b7280;">Your access</p>
      <p style="margin:4px 0;"><strong>Role:</strong> School Administrator</p>
      <p style="margin:4px 0;"><strong>Username:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${escapeHtml(adminUsername)}</code></p>
      <p style="margin:4px 0;"><strong>Password:</strong> Use the same password you chose when you registered this institution.</p>
    </div>
    <p style="margin:16px 0;">
      <a href="${loginUrl}" style="display:inline-block;background:#1B3FAF;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">Open PruhSMS sign-in</a>
    </p>
    <p style="font-size:0.8125rem;color:#6b7280;margin:16px 0 0;">Sign-in page: <a href="${loginUrl}">${escapeHtml(loginUrl)}</a></p>
  </div>`;

  if (!resend) {
    console.warn('[mailer] RESEND_API_KEY missing; approval email not sent to', toEmail);
    return { skipped: true, reason: 'no_resend' };
  }

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: [String(toEmail).trim()],
    subject: `Approved: ${schoolName} — PruhSMS access ready`,
    html,
  });

  if (error) {
    console.error('[mailer] Resend send error:', error);
    throw new Error(typeof error === 'string' ? error : error.message || 'Email send failed');
  }
  return { sent: true };
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = { sendSchoolApprovedEmail, publicAppUrl };
