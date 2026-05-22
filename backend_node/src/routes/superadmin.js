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
  resetUserPassword
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
router.post('/reset-user-password/', resetUserPassword);

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

/* Academic years CRUD */
router.get('/academic-years/', data.getAcademicYears);
router.post('/academic-years/', data.createAcademicYear);
router.put('/academic-years/:id/', data.updateAcademicYear);
router.delete('/academic-years/:id/', data.deleteAcademicYear);
router.patch('/academic-years/:id/toggle/', data.toggleAcademicYearStatus);
router.post('/academic-years/:id/rollout/', data.rolloutAcademicYear);

/* System terms CRUD */
router.get('/system-terms/', data.getSystemTerms);
router.post('/system-terms/', data.createSystemTerm);
router.put('/system-terms/:id/', data.updateSystemTerm);
router.delete('/system-terms/:id/', data.deleteSystemTerm);
router.patch('/system-terms/:id/toggle/', data.toggleSystemTermStatus);
router.post('/system-terms/:id/rollout/', data.rolloutTerm);

/* Institution types CRUD */
router.get('/institution-types/', data.getInstitutionTypes);
router.post('/institution-types/', data.createInstitutionType);
router.put('/institution-types/:id/', data.updateInstitutionType);
router.delete('/institution-types/:id/', data.deleteInstitutionType);
router.patch('/institution-types/:id/toggle/', data.toggleInstitutionTypeStatus);

/* Capacity categories CRUD */
router.get('/capacity-categories/', data.getCapacityCategories);
router.post('/capacity-categories/', data.createCapacityCategory);
router.put('/capacity-categories/:id/', data.updateCapacityCategory);
router.delete('/capacity-categories/:id/', data.deleteCapacityCategory);
router.patch('/capacity-categories/:id/toggle/', data.toggleCapacityCategoryStatus);

/* School capacity CRUD */
router.get('/school-capacities/', data.getSchoolCapacities);
router.post('/school-capacities/', data.createSchoolCapacity);
router.put('/school-capacities/:id/', data.updateSchoolCapacity);
router.delete('/school-capacities/:id/', data.deleteSchoolCapacity);
router.patch('/school-capacities/:id/toggle/', data.toggleSchoolCapacityStatus);

/* Countries CRUD */
router.get('/countries/', data.getCountries);
router.post('/countries/', data.createCountry);
router.put('/countries/:id/', data.updateCountry);
router.delete('/countries/:id/', data.deleteCountry);
router.patch('/countries/:id/toggle/', data.toggleCountryStatus);

/* Regions CRUD */
router.get('/regions/', data.getRegions);
router.post('/regions/', data.createRegion);
router.put('/regions/:id/', data.updateRegion);
router.delete('/regions/:id/', data.deleteRegion);
router.patch('/regions/:id/toggle/', data.toggleRegionStatus);

/* Cities CRUD */
router.get('/cities/', data.getCities);
router.post('/cities/', data.createCity);
router.put('/cities/:id/', data.updateCity);
router.delete('/cities/:id/', data.deleteCity);
router.patch('/cities/:id/toggle/', data.toggleCityStatus);

/* School Types CRUD */
router.get('/school-types/', data.getSchoolTypes);
router.post('/school-types/', data.createSchoolType);
router.put('/school-types/:id/', data.updateSchoolType);
router.delete('/school-types/:id/', data.deleteSchoolType);
router.patch('/school-types/:id/toggle/', data.toggleSchoolTypeStatus);

/* Syllabus Types CRUD */
router.get('/syllabus-types/', data.getSyllabusTypes);
router.post('/syllabus-types/', data.createSyllabusType);
router.put('/syllabus-types/:id/', data.updateSyllabusType);
router.delete('/syllabus-types/:id/', data.deleteSyllabusType);
router.patch('/syllabus-types/:id/toggle/', data.toggleSyllabusTypeStatus);

module.exports = router;
