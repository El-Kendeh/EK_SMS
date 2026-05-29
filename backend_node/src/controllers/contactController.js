const { Resend } = require('resend');
const rateLimit = require('express-rate-limit');

const CONTACT_TO = 'admin@elkendeh.com';

const successResponse = (data = {}, message = 'Success') => ({ success: true, message, ...data });
const errorResponse   = (message = 'Error', status = 400) => ({ success: false, message, status });

/* 5 submissions per IP per hour — prevents spam */
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: errorResponse('Too many messages sent. Please try again later.', 429),
});

async function sendContact(req, res) {
  const { name, email, subject, message } = req.body;

  if (!name?.trim())    return res.status(400).json(errorResponse('Name is required.'));
  if (!email?.trim())   return res.status(400).json(errorResponse('Email is required.'));
  if (!message?.trim()) return res.status(400).json(errorResponse('Message is required.'));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json(errorResponse('Please enter a valid email address.'));
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[contact] RESEND_API_KEY not configured');
    return res.status(500).json(errorResponse('Email service not configured.'));
  }

  const resend   = new Resend(process.env.RESEND_API_KEY);
  const fromAddr = process.env.DEFAULT_FROM_EMAIL || 'EK-SMS <noreply@elkendeh.com>';
  const subjectLabel = subject || 'General Inquiry';

  try {
    /* ── Notify the EK-SMS team ── */
    const { error: teamErr } = await resend.emails.send({
      from:    fromAddr,
      to:      [CONTACT_TO],
      replyTo: email,
      subject: `[EK-SMS Contact] ${subjectLabel} — from ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1B3FAF;padding:24px 32px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">New Contact Form Message</h2>
          </div>
          <div style="background:#f9f9f9;padding:32px;border-radius:0 0 8px 8px;border:1px solid #e5e5e5">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#555;width:100px"><strong>Name</strong></td><td style="padding:8px 0">${name}</td></tr>
              <tr><td style="padding:8px 0;color:#555"><strong>Email</strong></td><td style="padding:8px 0"><a href="mailto:${email}">${email}</a></td></tr>
              <tr><td style="padding:8px 0;color:#555"><strong>Subject</strong></td><td style="padding:8px 0">${subjectLabel}</td></tr>
            </table>
            <hr style="margin:20px 0;border:none;border-top:1px solid #ddd"/>
            <p style="color:#333;white-space:pre-wrap;line-height:1.6">${message}</p>
          </div>
          <p style="color:#aaa;font-size:12px;text-align:center;margin-top:16px">Sent via pruhsms.africa contact form</p>
        </div>
      `,
    });

    if (teamErr) {
      console.error('[contact] Resend team error:', teamErr);
      return res.status(500).json(errorResponse('Failed to send message. Please try again.'));
    }

    /* ── Auto-reply to the sender ── */
    await resend.emails.send({
      from:    fromAddr,
      to:      [email],
      subject: `We received your message — EK-SMS`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1B3FAF;padding:24px 32px;border-radius:8px 8px 0 0">
            <h2 style="color:#fff;margin:0">Thanks, ${name}!</h2>
          </div>
          <div style="background:#f9f9f9;padding:32px;border-radius:0 0 8px 8px;border:1px solid #e5e5e5">
            <p style="color:#333;line-height:1.7">
              We've received your message about <strong>${subjectLabel}</strong> and will get back to you within <strong>4 hours</strong>.
            </p>
            <p style="color:#333;line-height:1.7">
              In the meantime, you can explore our platform at <a href="https://pruhsms.africa">pruhsms.africa</a>.
            </p>
          </div>
          <p style="color:#aaa;font-size:12px;text-align:center;margin-top:16px">EK-SMS · pruhsms.africa</p>
        </div>
      `,
    });

    return res.json(successResponse({}, 'Message sent successfully.'));
  } catch (err) {
    console.error('[contact] Fatal error:', err);
    return res.status(500).json(errorResponse('Internal server error. Please try again.'));
  }
}

module.exports = { sendContact, contactLimiter };
