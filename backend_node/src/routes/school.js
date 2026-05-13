const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const authenticateToken = require('../middleware/auth');

const {
  getSchoolInfo,
  updateSchoolInfo,
  checkSchoolName,
} = require('../controllers/schoolController');

// Multer config for school badge uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads/badges/');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// Public routes
// GET /api/check-school-name/
router.get('/check-school-name/', checkSchoolName);

// Protected routes
// GET /api/school/info/
router.get('/school/info/', authenticateToken, getSchoolInfo);

// POST /api/school/info/ — Update school info and badge
router.post('/school/info/', authenticateToken, upload.single('badge'), updateSchoolInfo);

// POST /api/school/update/ (legacy)
router.post('/school/update/', authenticateToken, updateSchoolInfo);

module.exports = router;
