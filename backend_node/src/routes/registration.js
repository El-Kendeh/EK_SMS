/**
 * Registration Routes
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { registerSchoolAdmin, getRegistrationStatus, checkMySchoolStatus } = require('../controllers/registrationController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../../uploads/badges/'),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, WebP allowed.'));
    }
  },
});

/**
 * POST /api/registration/register-school-admin
 * Register a new school with admin account
 */
router.post('/register-school-admin', upload.single('schoolBadge'), registerSchoolAdmin);

/**
 * GET /api/registration/status/:schoolId
 * Get school approval status (public)
 */
router.get('/status/:schoolId', getRegistrationStatus);

/**
 * GET /api/registration/check-status
 * Get current user's school approval status (requires auth)
 */
router.get('/check-status', authenticate, checkMySchoolStatus);

module.exports = router;
