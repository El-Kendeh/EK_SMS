const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const User = require('../models/User');
const School = require('../models/School');
const SchoolAdmin = require('../models/SchoolAdmin');
const OTP = require('../models/OTP');
const sequelize = require('../config/db');
const { Resend } = require('resend');
const { generateToken } = require('../utils/jwt');

let resend;
if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== '') {
  try {
    resend = new Resend(process.env.RESEND_API_KEY.trim());
  } catch (err) {
    console.error('❌ Resend initialization failed:', err.message);
  }
} else {
  console.warn('⚠️ RESEND_API_KEY is empty or missing. Email features will be disabled.');
}

// Example response helpers
const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });
const errorResponse = (message = "Error", status = 400) => ({ success: false, message, status });

// POST /api/login/
async function login(req, res) {
  const { username, password } = req.body;
  try {
    const identifier = (username || '').trim();
    if (!identifier || !password) {
      return res.status(400).json(errorResponse("Username or email and password are required."));
    }

    const user = await User.findOne({
      where: { [Op.or]: [{ username: identifier }, { email: identifier }] },
    });
    if (!user) return res.status(401).json(errorResponse("Invalid credentials", 401));

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json(errorResponse("Invalid credentials", 401));

    // School admins (and other non-superusers) stay gated until superadmin approval.
    // Superadmin accounts must always be able to sign in even if is_active is false in DB (e.g. legacy import).
    if (!user.is_active && !user.is_superuser) {
      return res.status(403).json(errorResponse("Your account is pending approval by the Superadmin.", 403));
    }

    const schoolAdminLink = await SchoolAdmin.findOne({ where: { user_id: user.id } });
    let role = 'user';
    if (user.is_superuser) {
      role = 'superadmin';
    } else if (schoolAdminLink) {
      role = 'school_admin';
    } else if (user.is_staff) {
      role = 'staff';
    }

    const must_change_password = !!(schoolAdminLink && schoolAdminLink.must_change_password);

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      is_staff: user.is_staff,
      is_superuser: user.is_superuser,
      role,
    });

    return res.json(successResponse({
      token,
      must_change_password,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        is_staff: user.is_staff,
        is_superuser: user.is_superuser,
        role,
        must_change_password,
      },
    }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse("Internal server error", 500));
  }
}

// POST /api/logout/
async function logout(req, res) {
  return res.json(successResponse({}, "Logout successful"));
}

/** Store brand_colors as TEXT: Sequelize rejects arrays/objects on STRING/TEXT fields. */
function normalizeBrandColorsForDb(raw) {
  if (raw == null || raw === '') return null;
  if (Array.isArray(raw)) return JSON.stringify(raw);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch (_) {
      /* plain string e.g. comma-separated hex list */
    }
    return raw;
  }
  return String(raw);
}

// POST /api/register/
async function register(req, res) {
  const transaction = await sequelize.transaction();
  try {
    const {
      institutionName, institutionType, address, city, country, phone, email,
      firstName, lastName, adminUsername, adminEmail, adminPhone, password, capacity, brandColors
    } = req.body;

    const schoolBadge = req.file ? req.file.path : null;
    const brandColorsText = normalizeBrandColorsForDb(brandColors);
    const capacityInt = capacity === '' || capacity == null ? null : parseInt(capacity, 10);

    // 1. Create User (Admin)
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: adminUsername,
      password: hashedPassword,
      email: adminEmail,
      first_name: firstName,
      last_name: lastName,
      is_active: false, // Wait for approval
    }, { transaction });

    // 2. Create School
    const school = await School.create({
      name: institutionName,
      institution_type: institutionType,
      address,
      city,
      country,
      phone,
      email,
      capacity: Number.isFinite(capacityInt) ? capacityInt : null,
      brand_colors: brandColorsText,
      badge_path: schoolBadge,
      is_approved: false,
    }, { transaction });

    // 3. Link Admin to School
    await SchoolAdmin.create({
      user_id: user.id,
      school_id: school.id,
    }, { transaction });

    await transaction.commit();
    return res.json(successResponse({}, "Registration successful! Your application is under review."));
  } catch (err) {
    await transaction.rollback();
    console.error("Registration error:", err);
    let errorMessage = "Registration failed";
    
    if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
      errorMessage = Array.isArray(err.errors) && err.errors.length
        ? err.errors.map((e) => e.message).join(', ')
        : (err.message || errorMessage);
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    return res.status(400).json(errorResponse(errorMessage));
  }
}

// POST /api/send-otp/
async function sendOtp(req, res) {
  const { email } = req.body;
  if (!email) return res.status(400).json(errorResponse("Email is required"));

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  try {
    // 1. Store in DB
    await OTP.create({ email, code, expires_at: expiresAt });

    // 2. Send via Resend
    if (resend) {
      const { data, error } = await resend.emails.send({
        from: process.env.DEFAULT_FROM_EMAIL || 'EK-SMS <noreply@elkendeh.com>',
        to: [email],
        subject: 'Your Verification Code - EK-SMS',
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4f46e5;">Verification Code</h2>
            <p>Your verification code for EK-SMS registration is:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #111827; padding: 10px 0;">${code}</div>
            <p style="color: #6b7280; font-size: 14px;">This code will expire in 10 minutes.</p>
          </div>
        `,
      });

      if (error) {
        console.error('Resend Error:', error);
        return res.status(500).json(errorResponse("Failed to send email"));
      }
    } else {
      console.log(`[DEV MODE] OTP for ${email}: ${code}`);
    }

    return res.json(successResponse({}, "OTP sent successfully"));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse("Internal server error"));
  }
}

// POST /api/verify-otp/
async function verifyOtp(req, res) {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json(errorResponse("Email and OTP are required"));

  try {
    const record = await OTP.findOne({
      where: { email, code: otp, is_used: false },
      order: [['created_at', 'DESC']]
    });

    if (!record) return res.status(400).json(errorResponse("Invalid or expired code"));

    if (new Date() > record.expires_at) {
      return res.status(400).json(errorResponse("Code has expired"));
    }

    // Mark as used
    record.is_used = true;
    await record.save();

    return res.json(successResponse({}, "OTP verified successfully"));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse("Internal server error"));
  }
}

module.exports = { login, logout, register, sendOtp, verifyOtp };
