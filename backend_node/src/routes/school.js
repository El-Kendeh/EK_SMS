const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

const {
  getSchoolInfo,
  updateSchoolInfo,
  checkSchoolName,
} = require('../controllers/schoolController');

// Public routes
// GET /api/check-school-name/
router.get('/check-school-name/', checkSchoolName);

// Protected routes
// GET /api/school/info/
router.get('/school/info/', authenticateToken, getSchoolInfo);

// POST /api/school/update/
router.post('/school/update/', authenticateToken, updateSchoolInfo);

module.exports = router;
