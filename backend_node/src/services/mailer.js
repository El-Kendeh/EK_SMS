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

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Send registration confirmation email
 */
async function sendRegistrationConfirmationEmail({ toEmail, schoolName, adminName }) {
  if (!toEmail || !String(toEmail).trim()) {
    console.warn('[mailer] No recipient email; skipping registration confirmation');
    return { skipped: true, reason: 'no_email' };
  }

  const resend = getResend();
  const base = publicAppUrl();

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
    <h1 style="color:#1B3FAF;font-size:1.25rem;margin:0 0 12px;">Registration Received</h1>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
      Hi ${escapeHtml(adminName)},
      <br><br>
      Thank you for registering <strong>${escapeHtml(schoolName)}</strong> on <strong>PruhSMS</strong>. Your application has been received and is currently under review by our team.
    </p>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0;color:#78350f;font-weight:600;">⏳ Status: Awaiting Admin Approval</p>
      <p style="margin:8px 0 0;font-size:0.875rem;color:#92400e;">You will receive an email once our team has reviewed and approved your school registration.</p>
    </div>
    <p style="color:#374151;font-size:0.875rem;margin:16px 0;">
      If you have any questions, please contact our support team at <a href="mailto:support@pruhsms.africa">support@pruhsms.africa</a>
    </p>
  </div>`;

  if (!resend) {
    console.warn('[mailer] RESEND_API_KEY missing; registration email not sent to', toEmail);
    return { skipped: true, reason: 'no_resend' };
  }

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: [String(toEmail).trim()],
    subject: `Registration Received: ${schoolName}`,
    html,
  });

  if (error) {
    console.error('[mailer] Resend send error:', error);
    throw new Error(typeof error === 'string' ? error : error.message || 'Email send failed');
  }
  return { sent: true };
}

/**
 * Send school approval notification
 */
async function sendSchoolApprovedEmail({ toEmail, schoolName, adminName }) {
  if (!toEmail || !String(toEmail).trim()) {
    console.warn('[mailer] No recipient email; skipping approval notice');
    return { skipped: true, reason: 'no_email' };
  }

  const resend = getResend();
  const base = publicAppUrl();
  const loginUrl = `${base}/login`;

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
    <div style="width:60px;height:60px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;">✅</div>
    <h1 style="color:#1B3FAF;font-size:1.25rem;margin:0 0 12px;text-align:center;">School Approved!</h1>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;text-align:center;">
      Hi ${escapeHtml(adminName)},
      <br><br>
      Congratulations! <strong>${escapeHtml(schoolName)}</strong> has been approved and is now live on <strong>PruhSMS</strong>. You can now sign in and access your school's dashboard.
    </p>
    <div style="background:#f0f9ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:0.875rem;color:#1e40af;font-weight:600;">Your login details:</p>
      <p style="margin:4px 0;color:#1e40af;"><strong>Role:</strong> School Administrator</p>
      <p style="margin:4px 0;color:#1e40af;"><strong>Username:</strong> <code style="background:#e0e7ff;padding:2px 6px;border-radius:4px;">${escapeHtml(adminName)}</code></p>
    </div>
    <p style="margin:20px 0;text-align:center;">
      <a href="${loginUrl}" style="display:inline-block;background:#1B3FAF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Sign In to Dashboard</a>
    </p>
    <p style="font-size:0.8125rem;color:#6b7280;margin:16px 0 0;text-align:center;">
      Dashboard: <a href="${loginUrl}">${escapeHtml(loginUrl)}</a>
    </p>
  </div>`;

  if (!resend) {
    console.warn('[mailer] RESEND_API_KEY missing; approval email not sent to', toEmail);
    return { skipped: true, reason: 'no_resend' };
  }

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: [String(toEmail).trim()],
    subject: `✅ Approved: ${schoolName} — PruhSMS Access Ready`,
    html,
  });

  if (error) {
    console.error('[mailer] Resend send error:', error);
    throw new Error(typeof error === 'string' ? error : error.message || 'Email send failed');
  }
  return { sent: true };
}

/**
 * Send school rejection notification with reason
 */
async function sendSchoolRejectedEmail({ toEmail, schoolName, adminName, reason }) {
  if (!toEmail || !String(toEmail).trim()) {
    console.warn('[mailer] No recipient email; skipping rejection notice');
    return { skipped: true, reason: 'no_email' };
  }

  const resend = getResend();
  const supportEmail = 'support@pruhsms.africa';

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
    <div style="width:60px;height:60px;background:#fee2e2;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;">⚠️</div>
    <h1 style="color:#dc2626;font-size:1.25rem;margin:0 0 12px;text-align:center;">Registration Not Approved</h1>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
      Hi ${escapeHtml(adminName)},
      <br><br>
      After reviewing your application, we regret to inform you that <strong>${escapeHtml(schoolName)}</strong> registration was not approved at this time.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:0.875rem;color:#7f1d1d;font-weight:600;">Reason:</p>
      <p style="margin:0;color:#7f1d1d;">${escapeHtml(reason)}</p>
    </div>
    <p style="color:#374151;line-height:1.6;margin:16px 0;">
      If you believe this was sent in error or have questions about the decision, please contact our support team at <a href="mailto:${supportEmail}">${supportEmail}</a>. We're here to help.
    </p>
    <p style="font-size:0.8125rem;color:#6b7280;margin:16px 0 0;">
      Support contact: <a href="mailto:${supportEmail}">${supportEmail}</a>
    </p>
  </div>`;

  if (!resend) {
    console.warn('[mailer] RESEND_API_KEY missing; rejection email not sent to', toEmail);
    return { skipped: true, reason: 'no_resend' };
  }

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: [String(toEmail).trim()],
    subject: `Registration Update: ${schoolName}`,
    html,
  });

  if (error) {
    console.error('[mailer] Resend send error:', error);
    throw new Error(typeof error === 'string' ? error : error.message || 'Email send failed');
  }
  return { sent: true };
}

/**
 * Send change request notification to school admin
 */
async function sendSchoolChangeRequestEmail({ toEmail, schoolName, adminName, note }) {
  if (!toEmail || !String(toEmail).trim()) {
    console.warn('[mailer] No recipient email; skipping change request notice');
    return { skipped: true, reason: 'no_email' };
  }

  const resend = getResend();
  const supportEmail = 'support@pruhsms.africa';

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
    <div style="width:60px;height:60px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;">📝</div>
    <h1 style="color:#d97706;font-size:1.25rem;margin:0 0 12px;text-align:center;">Changes Requested</h1>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
      Hi ${escapeHtml(adminName)},
      <br><br>
      The superadmin has reviewed your application for <strong>${escapeHtml(schoolName)}</strong> and has requested the following changes:
    </p>
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:0.875rem;color:#78350f;font-weight:600;">Changes Required:</p>
      <p style="margin:0;color:#78350f;">${escapeHtml(note)}</p>
    </div>
    <p style="color:#374151;line-height:1.6;margin:16px 0;">
      Please log in to your account, make the requested changes, and re-submit your application for review.
    </p>
    <p style="font-size:0.8125rem;color:#6b7280;margin:16px 0 0;">
      If you have any questions, contact our support team at <a href="mailto:${supportEmail}">${supportEmail}</a>
    </p>
  </div>`;

  if (!resend) {
    console.warn('[mailer] RESEND_API_KEY missing; change request email not sent to', toEmail);
    return { skipped: true, reason: 'no_resend' };
  }

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: [String(toEmail).trim()],
    subject: `Changes Requested: ${schoolName} — Action Required`,
    html,
  });

  if (error) {
    console.error('[mailer] Resend send error:', error);
    throw new Error(typeof error === 'string' ? error : error.message || 'Email send failed');
  }
  return { sent: true };
}

/**
 * Send notification to superadmin when school admin submits changes
 */
async function sendSchoolChangesSubmittedEmail({ toEmail, schoolName }) {
  if (!toEmail || !String(toEmail).trim()) {
    console.warn('[mailer] No recipient email; skipping changes submitted notice');
    return { skipped: true, reason: 'no_email' };
  }

  const resend = getResend();
  const base = publicAppUrl();

  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;background:#fafafa;">
    <div style="width:60px;height:60px;background:#dbeafe;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:32px;">🔄</div>
    <h1 style="color:#1B3FAF;font-size:1.25rem;margin:0 0 12px;text-align:center;">Changes Resubmitted</h1>
    <p style="color:#374151;line-height:1.6;margin:0 0 16px;">
      <strong>${escapeHtml(schoolName)}</strong> has responded to the change request and re-submitted their application.
    </p>
    <p style="margin:20px 0;text-align:center;">
      <a href="${base}/superadmin/applications" style="display:inline-block;background:#1B3FAF;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">Review Application</a>
    </p>
    <p style="font-size:0.8125rem;color:#6b7280;margin:16px 0 0;text-align:center;">
      Dashboard: <a href="${base}/superadmin">${escapeHtml(base)}/superadmin</a>
    </p>
  </div>`;

  if (!resend) {
    console.warn('[mailer] RESEND_API_KEY missing; changes submitted email not sent to', toEmail);
    return { skipped: true, reason: 'no_resend' };
  }

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: [String(toEmail).trim()],
    subject: `Changes Resubmitted: ${schoolName} — Ready for Review`,
    html,
  });

  if (error) {
    console.error('[mailer] Resend send error:', error);
    throw new Error(typeof error === 'string' ? error : error.message || 'Email send failed');
  }
  return { sent: true };
}

module.exports = {
  sendRegistrationConfirmationEmail,
  sendSchoolApprovedEmail,
  sendSchoolRejectedEmail,
  sendSchoolChangeRequestEmail,
  sendSchoolChangesSubmittedEmail,
  publicAppUrl,
};
