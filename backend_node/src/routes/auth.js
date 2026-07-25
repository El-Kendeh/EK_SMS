const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const { login, logout, register, sendOtp, verifyOtp } = require('../controllers/authController');
const { validateBody } = require('../middleware/validate');
const { rules } = require('../utils/validate');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.', status: 429 },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
});

const otpLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Try again in 5 minutes.', status: 429 },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginSchema = {
  email: [rules.required, rules.isEmail],
  password: [rules.required, rules.minLength(1)],
};

const registerSchema = {
  schoolName: [rules.required],
  adminEmail: [rules.required, rules.isEmail],
  adminPassword: [rules.required, rules.minLength(8)],
};

const otpSchema = {
  email: [rules.required, rules.isEmail],
};

// Multer config for school badge uploads.
// Save into EK_SMS/uploads/badges — the SAME root index.js serves at /uploads
// (path.join(__dirname,'../../uploads')). The old cwd-relative `'uploads/badges/'`
// wrote under backend_node/uploads, which is never served → broken badge images.
const badgeDir = path.join(__dirname, '../../../uploads/badges/');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try { fs.mkdirSync(badgeDir, { recursive: true }); } catch { /* already exists */ }
    cb(null, badgeDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

router.post('/login/', loginLimiter, validateBody(loginSchema), login);
router.post('/logout/', logout);

router.post('/register/', upload.single('schoolBadge'), validateBody(registerSchema), register);

router.post('/send-otp/', otpLimiter, validateBody(otpSchema), sendOtp);
router.post('/resend-otp/', otpLimiter, validateBody(otpSchema), sendOtp);
router.post('/verify-otp/', validateBody({ email: [rules.required, rules.isEmail], otp: [rules.required] }), verifyOtp);

module.exports = router;
