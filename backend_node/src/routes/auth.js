const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');

const { login, logout, register, sendOtp, verifyOtp } = require('../controllers/authController');

/* Brute-force guard for the login surface (SA-46). The /login/ POST is also
   the 2FA-verify step — a 6-digit TOTP is only ~1e6 wide and codes rotate
   every 30s, so an attacker who already has the password could otherwise
   grind the second factor online. Cap attempts per IP; generous enough for a
   fumbling human / small office behind NAT, tight enough to make guessing the
   TOTP or a recovery code infeasible. Failed-auth responses are also audited
   in authController. */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                  // 20 attempts / IP / window (password + 2FA combined)
  standardHeaders: true,
  legacyHeaders: false,
  // Successful logins shouldn't burn the budget — only count rejected attempts.
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many login attempts. Please wait 15 minutes and try again.', status: 429 },
});

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
    // Strip any path component + unsafe chars: file.originalname is attacker-
    // controlled on the public /register/ endpoint, and a raw `../` here would
    // let multer write outside badgeDir (path.join normalises `..`).
    const safe = path.basename(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${Date.now()}-${safe || 'upload'}`);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Invalid file type. Please upload a valid image file.'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// POST /api/login/
router.post('/login/', loginLimiter, login);

// POST /api/logout/
router.post('/logout/', logout);

// POST /api/register/
// Matches 'schoolBadge' field in Register.js
router.post('/register/', upload.single('schoolBadge'), register);

// POST /api/send-otp/
router.post('/send-otp/', sendOtp);

// POST /api/resend-otp/  (frontend "Resend Code" button — same handler + cooldown as send)
router.post('/resend-otp/', sendOtp);

// POST /api/verify-otp/
router.post('/verify-otp/', verifyOtp);

module.exports = router;
