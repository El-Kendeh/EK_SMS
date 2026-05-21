/**
 * Registration Routes
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const registrationController = require('../controllers/registrationController');
const authenticateToken = require('../middleware/auth');

if (!registrationController || typeof registrationController !== 'object') {
  throw new Error('Registration controller failed to load');
}
if (typeof registrationController.registerSchoolAdmin !== 'function') {
  throw new Error('Missing registerSchoolAdmin export in registrationController');
}
if (typeof registrationController.getRegistrationStatus !== 'function') {
  throw new Error('Missing getRegistrationStatus export in registrationController');
}
if (typeof registrationController.checkMySchoolStatus !== 'function') {
  throw new Error('Missing checkMySchoolStatus export in registrationController');
}
if (typeof authenticateToken !== 'function') {
  throw new Error('Missing authenticateToken export in auth middleware');
}

const router = express.Router();

function assertHandler(fn, name) {
  if (typeof fn !== 'function') {
    throw new Error(`Route handler "${name}" is not defined or not a function`);
  }
  return fn;
}

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
router.post(
  '/register-school-admin',
  upload.single('schoolBadge'),
  assertHandler(registrationController.registerSchoolAdmin, 'registerSchoolAdmin')
);

/**
 * GET /api/registration/status/:schoolId
 * Get school approval status (public)
 */
router.get(
  '/status/:schoolId',
  assertHandler(registrationController.getRegistrationStatus, 'getRegistrationStatus')
);

/**
 * GET /api/registration/check-status
 * Get current user's school approval status (requires auth)
 */
router.get(
  '/check-status',
  assertHandler(authenticateToken, 'authenticateToken'),
  assertHandler(registrationController.checkMySchoolStatus, 'checkMySchoolStatus')
);

module.exports = router;
