const { Resend } = require('resend');

const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });
const errorResponse = (message = "Error", status = 400) => ({ success: false, message, status });

async function testEmail(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json(errorResponse("Email is required"));

  if (!process.env.RESEND_API_KEY) {
    return res.status(500).json(errorResponse("RESEND_API_KEY is not configured in .env"));
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { data, error } = await resend.emails.send({
      from: process.env.DEFAULT_FROM_EMAIL || 'EK-SMS <noreply@elkendeh.com>',
      to: [email],
      subject: 'Test Email from EK-SMS Node Backend',
      html: '<p>This is a test email to verify your Resend configuration is working correctly! 🚀</p>'
    });

    if (error) {
      console.error('Resend Test Error:', error);
      return res.status(500).json(errorResponse("Resend API returned an error: " + error.message));
    }

    return res.json(successResponse({ resendId: data.id }, "Test email sent successfully! Check your inbox."));
  } catch (err) {
    console.error('Fatal Resend Error:', err);
    return res.status(500).json(errorResponse("Internal server error during email test"));
  }
}

module.exports = { testEmail };
