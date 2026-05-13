const bcrypt = require('bcryptjs');
const User = require('../models/User');
const School = require('../models/School');
const SchoolAdmin = require('../models/SchoolAdmin');
const sequelize = require('../config/db');

// Example response helpers
const successResponse = (data = {}, message = "Success") => ({ success: true, message, ...data });
const errorResponse = (message = "Error", status = 400) => ({ success: false, message, status });

// POST /api/login/
async function login(req, res) {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ where: { username } });
    if (!user) return res.status(401).json(errorResponse("Invalid credentials", 401));

    // NOTE: Django uses PBKDF2 by default. For now, we check bcrypt for new users.
    // In a real migration, we would use a pbkdf2-sha256 library to check Django hashes.
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json(errorResponse("Invalid credentials", 401));

    // Issue token (TODO: sign a real JWT)
    return res.json(successResponse({ token: "TODO_REAL_JWT_TOKEN", user: { username: user.username, email: user.email } }));
  } catch (err) {
    console.error(err);
    return res.status(500).json(errorResponse("Internal server error", 500));
  }
}

// POST /api/logout/
async function logout(req, res) {
  return res.json(successResponse({}, "Logout successful"));
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
      capacity,
      brand_colors: brandColors,
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
    console.error(err);
    return res.status(400).json(errorResponse(err.message || "Registration failed"));
  }
}

// POST /api/send-otp/
async function sendOtp(req, res) {
  const { email } = req.body;
  console.log(`Sending OTP to ${email}`);
  // TODO: Generate OTP, store in Redis/DB, send via Resend API
  return res.json(successResponse({}, "OTP sent successfully (placeholder)"));
}

// POST /api/verify-otp/
async function verifyOtp(req, res) {
  const { email, otp } = req.body;
  console.log(`Verifying OTP ${otp} for ${email}`);
  // TODO: Verify against stored OTP
  return res.json(successResponse({}, "OTP verified (placeholder)"));
}

module.exports = { login, logout, register, sendOtp, verifyOtp };
