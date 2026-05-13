const express = require('express');
const router = express.Router();

const {
  getSchoolInfo,
  updateSchoolInfo,
  checkSchoolName,
} = require('../controllers/schoolController');

// Public routes
// GET /api/check-school-name/
router.get('/check-school-name/', checkSchoolName);

// Protected routes (TODO: Add auth middleware)
// GET /api/school/info/
router.get('/school/info/', getSchoolInfo);

// POST /api/school/update/
router.post('/school/update/', updateSchoolInfo);

module.exports = router;
