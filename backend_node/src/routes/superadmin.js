const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

const {
  getAllSchools,
  handleSchoolAction,
  impersonate,
  getGradeAlerts,
  getSystemHealth,
} = require('../controllers/superadminController');

const data = require('../controllers/superadminDataController');

const brandingDir = path.join(__dirname, '../../uploads/branding');
try {
  fs.mkdirSync(brandingDir, { recursive: true });
} catch {
  /* ignore */
}

const brandingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, brandingDir);
  },
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${Date.now()}-${safe || 'upload'}`);
  },
});
const brandingUpload = multer({ storage: brandingStorage, limits: { fileSize: 2 * 1024 * 1024 } });

function isSuperadmin(req, res, next) {
  if (req.user && (req.user.is_superuser || req.user.role === 'superadmin' || req.user.role === 'admin')) {
    next();
  } else {
    return res.status(403).json({ success: false, message: 'Access denied. Superadmin only.' });
  }
}

router.use(authenticateToken);
router.use(isSuperadmin);

/* Core school / impersonation / health */
router.get('/schools/', getAllSchools);
router.post('/schools/approve/', handleSchoolAction);
router.post('/impersonate/', impersonate);
router.get('/grade-alerts/', getGradeAlerts);
router.get('/system-health/', getSystemHealth);

/* Superadmin dashboard — MySQL-backed */
router.get('/security-logs/', data.getSecurityLogs);
router.get('/security-counters/', data.getSecurityCounters);
router.get('/profile/', data.getProfile);
router.patch('/profile/', data.patchProfile);
router.post('/change-password/', data.postChangePassword);
router.get('/admin-settings/', data.getAdminSettings);
router.patch('/admin-settings/', data.patchAdminSettings);
router.get('/users/', data.getUsers);
router.get('/get-users/', data.getUsersShort);
router.post('/users/', data.postUsers);
router.get('/school-stats/', data.getSchoolStats);
router.get('/grade-stats/', data.getGradeStats);
router.get('/forensic-events/', data.getForensicEvents);
router.get('/broadcast-alerts/', data.getBroadcastAlerts);
router.post('/broadcast-alerts/', data.postBroadcastAlerts);
router.get('/system-alerts/', data.getSystemAlerts);
router.post('/system-alerts/', data.postSystemAlerts);
router.post('/sa/branding/', brandingUpload.single('file'), data.postSaBranding);
router.get('/sa/lockdown/', data.getSaLockdown);
router.post('/sa/lockdown/', data.postSaLockdown);
router.post('/sa/backup/manual/', data.postSaBackupManual);
router.get('/sa/custom-roles/', data.getSaCustomRoles);
router.post('/sa/custom-roles/', data.postSaCustomRoles);
router.get('/sa/export/', data.getSaExport);

module.exports = router;
