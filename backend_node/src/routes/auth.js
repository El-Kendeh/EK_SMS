const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const { login, logout, register, sendOtp, verifyOtp } = require('../controllers/authController');

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

// POST /api/login/
router.post('/login/', login);

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
