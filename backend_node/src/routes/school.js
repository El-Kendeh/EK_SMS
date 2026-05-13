// src/routes/school.js
const express = require('express');
const router = express.Router();

const {
  getSchoolInfo,
  updateSchoolInfo,
  getNextAdmissionNumber,
  checkStudentDuplicate,
} = require('../controllers/schoolController');

// GET /api/school/info/
router.get('/school/info/', getSchoolInfo);

// POST /api/school/update/
router.post('/school/update/', updateSchoolInfo);

// GET /api/school/students/next-admission-number/
router.get('/school/students/next-admission-number/', getNextAdmissionNumber);

// POST /api/school/students/check-duplicate/
router.post('/school/students/check-duplicate/', checkStudentDuplicate);

module.exports = router;
