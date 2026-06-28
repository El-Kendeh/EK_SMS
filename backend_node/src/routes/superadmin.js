const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const schoolScope = require('../middleware/schoolScope');
const requireRole = require('../middleware/requireRole');
const requireActiveAccount = require('../middleware/requireActiveAccount');

const {
  getAllSchools,
  handleSchoolAction,
  impersonate,
  endImpersonation,
  getGradeAlerts,
  getSystemHealth,
  resetUserPassword,
  getDashboard
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

/* Student upload directories */
const studentDir = path.join(__dirname, '../../uploads/students');
const parentDir = path.join(__dirname, '../../uploads/parents');
const docDir = path.join(__dirname, '../../uploads/documents');
try { fs.mkdirSync(studentDir, { recursive: true }); } catch {}
try { fs.mkdirSync(parentDir, { recursive: true }); } catch {}
try { fs.mkdirSync(docDir, { recursive: true }); } catch {}

const studentStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, studentDir); },
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${Date.now()}-${safe || 'upload'}`);
  },
});
const parentStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, parentDir); },
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${Date.now()}-${safe || 'upload'}`);
  },
});
const docStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, docDir); },
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${Date.now()}-${safe || 'upload'}`);
  },
});
const studentUpload = multer({ storage: studentStorage, limits: { fileSize: 5 * 1024 * 1024 } });
const parentUpload = multer({ storage: parentStorage, limits: { fileSize: 5 * 1024 * 1024 } });
const docUpload = multer({ storage: docStorage, limits: { fileSize: 10 * 1024 * 1024 } });

/* Teacher upload directory */
const teacherDir = path.join(__dirname, '../../uploads/teachers');
try { fs.mkdirSync(teacherDir, { recursive: true }); } catch {}
const teacherStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, teacherDir); },
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${Date.now()}-${safe || 'upload'}`);
  },
});
const teacherUpload = multer({ storage: teacherStorage, limits: { fileSize: 5 * 1024 * 1024 } });

/* Public reference data endpoints (no auth required — used by registration form & other public pages) */
router.get('/institution-types/', data.getInstitutionTypes);
router.get('/countries/', data.getCountries);
router.get('/regions/', data.getRegions);
router.get('/cities/', data.getCities);
router.get('/academic-systems/', data.getAcademicSystems);
router.get('/grading-systems/', data.getGradingSystems);

router.use(authenticateToken);
router.use(schoolScope);

/* ── Shared routes (accessible by multiple roles) ── */
/* Shared (NOT superadmin-gated): the caller holds a school_admin impersonation
   token here, so closing the session can't sit behind requireRole(['superadmin']). */
router.post('/impersonate/end/', endImpersonation);
router.get('/profile/', data.getProfile);
router.patch('/profile/', data.patchProfile);
router.post('/change-password/', data.postChangePassword);

/* ── Superadmin-only routes ── */
const sa = express.Router();
sa.use(requireRole(['superadmin']));

/* Operator-only platform reads/writes. These were previously mounted on the
   shared router above, which let ANY authenticated user (incl. an impersonating
   school_admin) read global platform counts (/dashboard/), read cross-school
   grade-modification alerts (/grade-alerts/), and read AND WRITE the single
   global settings row (/admin-settings/ — branding, maintenance_mode,
   lockdown_state, custom_roles…). Gated to superadmin here. */
sa.get('/dashboard/', getDashboard);
sa.get('/grade-alerts/', getGradeAlerts);
sa.get('/admin-settings/', data.getAdminSettings);
sa.patch('/admin-settings/', data.patchAdminSettings);

sa.get('/schools/', getAllSchools);
sa.post('/schools/approve/', handleSchoolAction);
sa.post('/impersonate/', impersonate);
sa.get('/system-health/', getSystemHealth);
sa.post('/reset-user-password/', resetUserPassword);
sa.get('/security-logs/', data.getSecurityLogs);
sa.get('/security-counters/', data.getSecurityCounters);
sa.get('/forensic-events/', data.getForensicEvents);
sa.get('/broadcast-alerts/', data.getBroadcastAlerts);
sa.post('/broadcast-alerts/', data.postBroadcastAlerts);
sa.get('/system-alerts/', data.getSystemAlerts);
sa.post('/system-alerts/', data.postSystemAlerts);
sa.post('/sa/branding/', brandingUpload.single('file'), data.postSaBranding);
sa.get('/sa/lockdown/', data.getSaLockdown);
sa.post('/sa/lockdown/', data.postSaLockdown);
sa.post('/sa/backup/manual/', data.postSaBackupManual);
sa.get('/sa/custom-roles/', data.getSaCustomRoles);
sa.post('/sa/custom-roles/', data.postSaCustomRoles);
sa.get('/sa/export/', data.getSaExport);
sa.get('/academic-years/', data.getAcademicYears);
sa.post('/academic-years/', data.createAcademicYear);
sa.put('/academic-years/:id/', data.updateAcademicYear);
sa.delete('/academic-years/:id/', data.deleteAcademicYear);
sa.patch('/academic-years/:id/toggle/', data.toggleAcademicYearStatus);
sa.post('/academic-years/:id/rollout/', data.rolloutAcademicYear);
sa.get('/academic-years/:id/rollout-preview/', data.getRolloutPreview);
sa.post('/academic-years/:id/restore/', data.restoreAcademicYear);
sa.post('/academic-years/:id/clone/', data.cloneAcademicYear);
sa.post('/academic-years/:id/close/', data.closeAcademicYear);
sa.get('/academic-years/:id/adoption/', data.getAcademicYearAdoption);
sa.get('/academic-years/:id/history/', data.getAcademicYearHistory);
sa.get('/system-terms/', data.getSystemTerms);
sa.post('/system-terms/', data.createSystemTerm);
sa.put('/system-terms/:id/', data.updateSystemTerm);
sa.delete('/system-terms/:id/', data.deleteSystemTerm);
sa.patch('/system-terms/:id/toggle/', data.toggleSystemTermStatus);
sa.post('/system-terms/:id/rollout/', data.rolloutTerm);
sa.get('/institution-types/', data.getInstitutionTypes);
sa.post('/institution-types/', data.createInstitutionType);
sa.put('/institution-types/:id/', data.updateInstitutionType);
sa.delete('/institution-types/:id/', data.deleteInstitutionType);
sa.patch('/institution-types/:id/toggle/', data.toggleInstitutionTypeStatus);
sa.get('/lesson-plan-types/', data.getLessonPlanTypes);
sa.post('/lesson-plan-types/', data.createLessonPlanType);
sa.put('/lesson-plan-types/:id/', data.updateLessonPlanType);
sa.delete('/lesson-plan-types/:id/', data.deleteLessonPlanType);
sa.patch('/lesson-plan-types/:id/toggle/', data.toggleLessonPlanTypeStatus);
sa.get('/capacity-categories/', data.getCapacityCategories);
sa.post('/capacity-categories/', data.createCapacityCategory);
sa.put('/capacity-categories/:id/', data.updateCapacityCategory);
sa.delete('/capacity-categories/:id/', data.deleteCapacityCategory);
sa.patch('/capacity-categories/:id/toggle/', data.toggleCapacityCategoryStatus);
sa.get('/school-capacities/', data.getSchoolCapacities);
sa.post('/school-capacities/', data.createSchoolCapacity);
sa.put('/school-capacities/:id/', data.updateSchoolCapacity);
sa.delete('/school-capacities/:id/', data.deleteSchoolCapacity);
sa.patch('/school-capacities/:id/toggle/', data.toggleSchoolCapacityStatus);
sa.get('/countries/', data.getCountries);
sa.post('/countries/', data.createCountry);
sa.put('/countries/:id/', data.updateCountry);
sa.delete('/countries/:id/', data.deleteCountry);
sa.patch('/countries/:id/toggle/', data.toggleCountryStatus);
sa.get('/regions/', data.getRegions);
sa.post('/regions/', data.createRegion);
sa.put('/regions/:id/', data.updateRegion);
sa.delete('/regions/:id/', data.deleteRegion);
sa.patch('/regions/:id/toggle/', data.toggleRegionStatus);
sa.get('/cities/', data.getCities);
sa.post('/cities/', data.createCity);
sa.put('/cities/:id/', data.updateCity);
sa.delete('/cities/:id/', data.deleteCity);
sa.patch('/cities/:id/toggle/', data.toggleCityStatus);
sa.get('/school-types/', data.getSchoolTypes);
sa.post('/school-types/', data.createSchoolType);
sa.put('/school-types/:id/', data.updateSchoolType);
sa.delete('/school-types/:id/', data.deleteSchoolType);
sa.patch('/school-types/:id/toggle/', data.toggleSchoolTypeStatus);
sa.get('/syllabus-types/', data.getSyllabusTypes);
sa.post('/syllabus-types/', data.createSyllabusType);
sa.put('/syllabus-types/:id/', data.updateSyllabusType);
sa.delete('/syllabus-types/:id/', data.deleteSyllabusType);
sa.patch('/syllabus-types/:id/toggle/', data.toggleSyllabusTypeStatus);
sa.get('/class-subtypes/', data.getClassSubtypes);
sa.post('/class-subtypes/', data.createClassSubtype);
sa.put('/class-subtypes/:id/', data.updateClassSubtype);
sa.delete('/class-subtypes/:id/', data.deleteClassSubtype);
sa.patch('/class-subtypes/:id/toggle/', data.toggleClassSubtypeStatus);
sa.get('/academic-systems/', data.getAcademicSystems);
sa.post('/academic-systems/', data.createAcademicSystem);
sa.put('/academic-systems/:id/', data.updateAcademicSystem);
sa.delete('/academic-systems/:id/', data.deleteAcademicSystem);
sa.patch('/academic-systems/:id/toggle/', data.toggleAcademicSystemStatus);
sa.get('/grading-systems/', data.getGradingSystems);
sa.post('/grading-systems/', data.createGradingSystem);
sa.put('/grading-systems/:id/', data.updateGradingSystem);
sa.delete('/grading-systems/:id/', data.deleteGradingSystem);
sa.patch('/grading-systems/:id/toggle/', data.toggleGradingSystemStatus);
sa.get('/grade-stats/', data.getGradeStats);
sa.get('/school-stats/', data.getSchoolStats);
sa.get('/users/', data.getUsers);
sa.get('/get-users/', data.getUsersShort);
sa.post('/users/', data.postUsers);

/* NOTE: the superadmin-only `sa` sub-router is mounted at the END of this file
   (see `router.use(sa)` before module.exports). It carries a blanket
   requireRole(['superadmin']) gate, so it MUST come after the school-level
   routes below — otherwise it would 403 school_admins before they reach the
   shared `sla` routes (e.g. creating principals/bursars/students). */

/* ── School-level routes (accessible by superadmin + school_admin) ── */
// Phase 1: re-check approval/is_active per request for the shared school routes.
// Superadmin bypasses requireActiveAccount; a suspended/rejected school_admin is
// blocked immediately even with a still-valid token.
const sla = [requireActiveAccount, requireRole(['superadmin', 'school_admin'])];

/* Classes CRUD */
router.get('/classes/', sla, data.getSuperClasses);
router.post('/classes/', sla, data.createSuperClass);
router.put('/classes/:id/', sla, data.updateSuperClass);
router.delete('/classes/:id/', sla, data.deleteSuperClass);
router.patch('/classes/:id/toggle/', sla, data.toggleSuperClassStatus);

/* Class Subtypes — READ-only for school_admin so the SAClasses "Class Subtype"
   dropdown populates (it was 403-ing on the superadmin-only sa route → empty).
   Management (create/update/delete/toggle) stays superadmin-only on `sa` below. */
router.get('/class-subtypes/', sla, data.getClassSubtypes);

/* Subjects CRUD */
router.get('/subjects/', sla, data.getSuperSubjects);
router.post('/subjects/', sla, data.createSuperSubject);
router.put('/subjects/:id/', sla, data.updateSuperSubject);
router.delete('/subjects/:id/', sla, data.deleteSuperSubject);
router.patch('/subjects/:id/toggle/', sla, data.toggleSuperSubjectStatus);

/* Class Assignment Routes */
router.get('/classes/:id/students/', sla, data.getClassStudents);
router.get('/classes/:id/available-students/', sla, data.getAvailableStudents);
router.post('/classes/:id/assign-students/', sla, data.assignClassStudents);
router.get('/classes/:id/subjects/', sla, data.getClassAssignedSubjects);
router.get('/classes/:id/available-subjects/', sla, data.getAvailableSubjectsForClass);
router.post('/classes/:id/assign-subjects/', sla, data.assignClassSubjects);
router.post('/classes/:id/assign-teacher/', sla, data.assignClassTeacher);
router.get('/classes/:id/teachers/', sla, data.getClassTeachers);
router.post('/classes/:id/assign-multiple-teachers/', sla, data.assignClassMultipleTeachers);
router.get('/classes/:id/available-teachers/', sla, data.getAvailableTeachersForClass);

/* Subject Assignment Routes */
router.get('/subjects/:id/classes/', sla, data.getSubjectAssignedClasses);
router.get('/subjects/:id/available-classes/', sla, data.getAvailableClassesForSubject);
router.post('/subjects/:id/assign-classes/', sla, data.assignSubjectClasses);
router.get('/subjects/:id/teachers/', sla, data.getTeachersForSubject);
router.post('/subjects/:id/assign-teacher/', sla, data.assignSubjectTeacher);

/* Student CRUD */
router.get('/students/', sla, data.getSuperStudents);
router.post('/students/', sla, studentUpload.single('passport_photo'), data.createSuperStudent);
router.put('/students/:id/', sla, studentUpload.single('passport_photo'), data.updateSuperStudent);
router.delete('/students/:id/', sla, data.deleteSuperStudent);
router.patch('/students/:id/toggle/', sla, data.toggleSuperStudentStatus);
router.patch('/students/:id/block/', sla, data.blockSuperStudent);
router.get('/students/:id/parents/', sla, data.getStudentParents);

/* Student documents */
router.get('/students/:id/documents/', sla, data.getStudentDocuments);
router.post('/students/:id/documents/', sla, docUpload.single('file'), data.uploadStudentDocument);
router.delete('/students/:id/documents/:docId/', sla, data.deleteStudentDocument);

/* Parent CRUD */
router.get('/parents/', sla, data.getSuperParents);
router.post('/parents/', sla, parentUpload.single('passport_photo'), data.createSuperParent);
router.put('/parents/:id/', sla, parentUpload.single('passport_photo'), data.updateSuperParent);
router.delete('/parents/:id/', sla, data.deleteSuperParent);
router.patch('/parents/:id/toggle/', sla, data.toggleSuperParentStatus);
router.patch('/parents/:id/block/', sla, data.blockSuperParent);

/* Student-Parent linking */
router.post('/link-parent/', sla, data.linkParentToStudent);
router.post('/unlink-parent/', sla, data.unlinkParentFromStudent);

/* Teacher CRUD */
router.get('/teachers/', sla, data.getSuperTeachers);
router.post('/teachers/', sla, teacherUpload.single('profile_picture'), data.createSuperTeacher);
router.put('/teachers/:id/', sla, teacherUpload.single('profile_picture'), data.updateSuperTeacher);
router.delete('/teachers/:id/', sla, data.deleteSuperTeacher);
router.patch('/teachers/:id/toggle/', sla, data.toggleSuperTeacherStatus);
router.patch('/teachers/:id/block/', sla, data.blockSuperTeacher);

/* Bursar upload directory */
const bursarDir = path.join(__dirname, '../../uploads/bursars');
try { fs.mkdirSync(bursarDir, { recursive: true }); } catch {}
const bursarStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, bursarDir); },
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${Date.now()}-${safe || 'upload'}`);
  },
});
const bursarUpload = multer({ storage: bursarStorage, limits: { fileSize: 5 * 1024 * 1024 } });

/* Bursar CRUD */
router.get('/bursars/', sla, data.getSuperBursars);
router.post('/bursars/', sla, bursarUpload.single('profile_picture'), data.createSuperBursar);
router.put('/bursars/:id/', sla, bursarUpload.single('profile_picture'), data.updateSuperBursar);
router.delete('/bursars/:id/', sla, data.deleteSuperBursar);
router.patch('/bursars/:id/toggle/', sla, data.toggleSuperBursarStatus);
router.patch('/bursars/:id/block/', sla, data.blockSuperBursar);

/* Principal upload directory */
const principalDir = path.join(__dirname, '../../uploads/principals');
try { fs.mkdirSync(principalDir, { recursive: true }); } catch {}
const principalStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, principalDir); },
  filename: (req, file, cb) => {
    const safe = (file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '');
    cb(null, `${Date.now()}-${safe || 'upload'}`);
  },
});
const principalUpload = multer({ storage: principalStorage, limits: { fileSize: 5 * 1024 * 1024 } });

/* Virtual Meetings CRUD (superadmin + school_admin) */
router.get('/virtual-meetings/', sla, data.getVirtualMeetings);
router.post('/virtual-meetings/', sla, data.createVirtualMeeting);
router.put('/virtual-meetings/:id/', sla, data.updateVirtualMeeting);
router.delete('/virtual-meetings/:id/', sla, data.deleteVirtualMeeting);

/* Principal CRUD */
router.get('/principals/', sla, data.getSuperPrincipals);
router.post('/principals/', sla, principalUpload.single('profile_picture'), data.createSuperPrincipal);
router.put('/principals/:id/', sla, principalUpload.single('profile_picture'), data.updateSuperPrincipal);
router.delete('/principals/:id/', sla, data.deleteSuperPrincipal);
router.patch('/principals/:id/toggle/', sla, data.toggleSuperPrincipalStatus);
router.patch('/principals/:id/block/', sla, data.blockSuperPrincipal);

/* Superadmin-only routes — mounted LAST so the school-level routes above
   (shared with school_admin) are matched first. */
router.use(sa);

module.exports = router;
