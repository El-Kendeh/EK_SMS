const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.DEFAULT_FROM_EMAIL || 'EK-SMS <noreply@pruhsms.africa>';

/**
 * Send welcome email to a new teacher with their credentials
 */
async function sendTeacherWelcomeEmail(teacherEmail, teacherName, username, password, schoolName) {
  if (!resend) {
    console.warn('Email skipped: RESEND_API_KEY not configured.');
    return;
  }

  const dashboardUrl = 'https://pruhsms.africa/login';

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [teacherEmail],
      subject: `Welcome to ${schoolName} - Your Teacher Account Credentials`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2d3436;">Welcome to the Team, ${teacherName}!</h2>
          <p>You have been registered as a teacher at <strong>${schoolName}</strong> on the EK-SMS platform.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold; color: #636e72;">Your Login Credentials:</p>
            <p style="margin: 10px 0 5px 0;"><strong>Username:</strong> ${username}</p>
            <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
          </div>

          <p>Please use the button below to access your dashboard and change your password upon your first login.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background-color: #0984e3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Access Teacher Dashboard</a>
          </div>

          <p style="font-size: 0.9em; color: #636e72;">If the button doesn't work, copy and paste this link: <br/> ${dashboardUrl}</p>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.8em; color: #b2bec3; text-align: center;">&copy; 2026 EK-SMS. All rights reserved.</p>
        </div>
      `
    });

    if (error) {
      console.error('Email Send Error:', error);
    } else {
      console.log('Welcome email sent to:', teacherEmail, 'ResendID:', data.id);
    }
  } catch (err) {
    console.error('Fatal Email Error:', err);
  }
}

/**
 * Send password reset email with new credentials
 */
async function sendPasswordResetEmail(userEmail, userName, role, newPassword) {
  if (!resend) {
    console.warn('Email skipped: RESEND_API_KEY not configured.');
    return;
  }

  const dashboardUrl = 'https://pruhsms.africa/login';
  const displayRole = role.replace('_', ' ').toUpperCase();

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [userEmail],
      subject: `Password Reset - EK-SMS Account`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
          <h2 style="color: #2d3436;">Password Reset Notification</h2>
          <p>Hello <strong>${userName}</strong>,</p>
          <p>The Superadmin has reset your password for your <strong>${displayRole}</strong> account on the EK-SMS platform.</p>
          
          <div style="background-color: #fff9db; padding: 15px; border-radius: 5px; margin: 20px 0; border: 1px solid #ffe066;">
            <p style="margin: 0; font-weight: bold; color: #f08c00;">Your New Login Credentials:</p>
            <p style="margin: 10px 0 5px 0;"><strong>Username:</strong> ${userEmail}</p>
            <p style="margin: 0;"><strong>New Password:</strong> ${newPassword}</p>
          </div>

          <p>Please use the link below to sign in and change your password immediately for security reasons.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="background-color: #0984e3; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Login to Your Dashboard</a>
          </div>

          <p style="font-size: 0.9em; color: #636e72;">If you did not request this change, please contact your school administration or the system superadmin immediately.</p>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 0.8em; color: #b2bec3; text-align: center;">&copy; 2026 EK-SMS. All rights reserved.</p>
        </div>
      `
    });

    if (error) {
      console.error('Password Reset Email Error:', error);
    } else {
      console.log('Password reset email sent to:', userEmail, 'ResendID:', data.id);
    }
  } catch (err) {
    console.error('Fatal Email Error:', err);
  }
}

module.exports = {
  sendTeacherWelcomeEmail,
  sendPasswordResetEmail
};
