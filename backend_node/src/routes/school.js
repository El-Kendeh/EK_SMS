const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const authenticateToken = require('../middleware/auth');
const schoolScope = require('../middleware/schoolScope');
const {
  // School info
  getSchoolInfo, updateSchoolInfo, checkSchoolName,
  // Students
  getStudents, createStudent, updateStudent, getNextAdmissionNumber, getStudentStats,
  // Teachers
  getTeachers, createTeacher, updateTeacher, getTeacherStats,
  // Classes
  getClasses, getClassById, createClass, updateClass, deleteClass, bulkCreateClasses,
  assignStudentsToClass, assignSubjectsToClass,
  // Subjects
  getSubjects, createSubject, updateSubject, deleteSubject,
  assignClassesToSubject, assignTeachersToSubject,
  // Academic
  getAcademicYears, createAcademicYear, getTerms, createTerm, updateTerm, deleteTerm, getSchoolContext,
  // Syllabus
  getSyllabusTopics, createSyllabusTopic, updateSyllabusTopic, deleteSyllabusTopic, getSyllabusStats,
  // Grades
  getGrades, saveGrades,
  // Attendance
  recordAttendance,
  // Grading scheme
  getGradingScheme, setGradingScheme,
  // Rooms
  getRooms, createRoom,
  // Exams
  getExams, createExam,
  // Notifications
  getNotifications, createNotification,
  // Analytics
  getAnalytics,
  // Finance
  getFinanceStats, getFinanceFees, recordExpense, getExpenses,
  // Teacher assignments
  getTeacherAssignments, createTeacherAssignment,
  // Exam officers
  getExamOfficers, assignExamOfficer,
  // Messages
  getMessages, sendMessage, recordClassAttendance,
  // Parent
  createParent,
  // Timetable
  generateTimetable, deleteTimetable,
  // Modification requests
  reviewModificationRequest,
} = require('../controllers/schoolController');
const {
  getPrincipalUsers, createPrincipalUser, updatePrincipalUser,
} = require('../controllers/principalController');
const {
  getFinanceUsers, createFinanceUser, updateFinanceUser,
} = require('../controllers/financeController');
const { generateSyllabusFromDocument } = require('../controllers/syllabusGenerator');

// Multer config for badge/file uploads
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
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Please upload a valid image file.'), false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

function teacherUpload(req, res, next) {
  const handler = upload.any();

  handler(req, res, (err) => {
    if (err) {
      console.error('Teacher upload error:', err);
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded file is too large. Maximum size is 50 MB.'
        : err.message || 'File upload failed. Please upload a valid image file.';
      return res.status(400).json({ success: false, message });
    }

    if (Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files.find((file) => file.fieldname === 'photo')
        || req.files.find((file) => file.fieldname === 'profile_picture')
        || req.files[0];
    }
    next();
  });
}

function studentUpload(req, res, next) {
  const handler = upload.any();

  handler(req, res, (err) => {
    if (err) {
      console.error('Student upload error:', err);
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Uploaded file is too large. Maximum size is 50 MB.'
        : err.message || 'File upload failed. Please upload a valid image file.';
      return res.status(400).json({ success: false, message });
    }

    if (Array.isArray(req.files) && req.files.length > 0) {
      req.file = req.files.find((file) => file.fieldname === 'profile_photo')
        || req.files.find((file) => file.fieldname === 'photo')
        || req.files.find((file) => file.fieldname === 'passport_picture');
    }
    next();
  });
}

// Public routes
router.get('/check-school-name/', checkSchoolName);

// Protected routes - all require authentication + school scope
const applyAuth = [authenticateToken, schoolScope];

// ==================== SCHOOL INFO ====================
router.get('/school/info/', applyAuth, getSchoolInfo);
router.post('/school/info/', applyAuth, upload.single('badge'), updateSchoolInfo);

// ==================== STUDENTS ====================
router.get('/school/students/', applyAuth, getStudents);
router.post('/school/students/', applyAuth, studentUpload, createStudent);
router.put('/school/students/:id/', applyAuth, studentUpload, updateStudent);
router.get('/school/students/next-admission-number/', applyAuth, getNextAdmissionNumber);
router.get('/school/student-stats/', applyAuth, getStudentStats);

// ==================== TEACHERS ====================
router.get('/school/teachers/', applyAuth, getTeachers);
router.post('/school/teachers/', applyAuth, teacherUpload, createTeacher);
router.put('/school/teachers/:id/', applyAuth, updateTeacher);
router.get('/school/teacher-stats/', applyAuth, getTeacherStats);

// ==================== CLASSES ====================
router.get('/school/classes/', applyAuth, getClasses);
router.get('/school/classes/:id/', applyAuth, getClassById);
router.post('/school/classes/', applyAuth, createClass);
router.put('/school/classes/:id/', applyAuth, updateClass);
router.delete('/school/classes/:id/', applyAuth, deleteClass);
router.post('/school/classes/bulk-create/', applyAuth, bulkCreateClasses);
router.post('/school/classes/:id/assign-students/', applyAuth, assignStudentsToClass);
router.post('/school/classes/:id/assign-subjects/', applyAuth, assignSubjectsToClass);

// ==================== SUBJECTS ====================
router.get('/school/subjects/', applyAuth, getSubjects);
router.post('/school/subjects/', applyAuth, createSubject);
router.put('/school/subjects/:id/', applyAuth, updateSubject);
router.delete('/school/subjects/:id/', applyAuth, deleteSubject);
router.post('/school/subjects/:id/assign-classes/', applyAuth, assignClassesToSubject);
router.post('/school/subjects/:id/assign-teachers/', applyAuth, assignTeachersToSubject);

// ==================== ACADEMIC YEARS & TERMS ====================
router.get('/school/context/', applyAuth, getSchoolContext);
router.get('/school/academic-years/', applyAuth, getAcademicYears);
router.post('/school/academic-years/', applyAuth, createAcademicYear);
router.get('/school/terms/', applyAuth, getTerms);
router.post('/school/terms/', applyAuth, createTerm);
router.put('/school/terms/:id/', applyAuth, updateTerm);
router.delete('/school/terms/:id/', applyAuth, deleteTerm);

// ==================== SYLLABUS ====================
router.get('/school/syllabus-topics/', applyAuth, getSyllabusTopics);
router.post('/school/syllabus-topics/', applyAuth, createSyllabusTopic);
router.put('/school/syllabus-topics/:id/', applyAuth, updateSyllabusTopic);
router.delete('/school/syllabus-topics/:id/', applyAuth, deleteSyllabusTopic);
router.get('/school/syllabus-stats/', applyAuth, getSyllabusStats);

// Syllabus generation from document upload
const syllabusUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../../uploads/syllabus-docs/');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `syllabus-${Date.now()}${ext}`);
  },
});
const syllabusUpload = multer({
  storage: syllabusUploadStorage,
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOCX, and TXT files are allowed.'), false);
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});
router.post('/school/syllabus/generate/', applyAuth, syllabusUpload.single('document'), generateSyllabusFromDocument);

// ==================== GRADES ====================
router.get('/school/grades/', applyAuth, getGrades);
router.post('/school/grades/', applyAuth, saveGrades);

// ==================== ATTENDANCE ====================
router.post('/school/attendance/', applyAuth, recordAttendance);

// ==================== GRADING SCHEME ====================
router.get('/school/grading-scheme/', applyAuth, getGradingScheme);
router.post('/school/grading-scheme/', applyAuth, setGradingScheme);

// ==================== ROOMS ====================
router.get('/school/rooms/', applyAuth, getRooms);
router.post('/school/rooms/', applyAuth, createRoom);

// ==================== EXAMS ====================
router.get('/school/exams/', applyAuth, getExams);
router.post('/school/exams/', applyAuth, createExam);

// ==================== NOTIFICATIONS ====================
router.get('/school/notifications/', applyAuth, getNotifications);
router.post('/school/notifications/', applyAuth, createNotification);

// ==================== ANALYTICS ====================
router.get('/school/analytics/', applyAuth, getAnalytics);

// ==================== FINANCE ====================
router.get('/school/finance/stats/', applyAuth, getFinanceStats);
router.get('/school/finance/fees/', applyAuth, getFinanceFees);
router.post('/school/finance/expenses/', applyAuth, recordExpense);
router.get('/school/finance/expenses/', applyAuth, getExpenses);

// ==================== TEACHER ASSIGNMENTS ====================
router.get('/school/teacher-assignments/', applyAuth, getTeacherAssignments);
router.post('/school/teacher-assignments/', applyAuth, createTeacherAssignment);

// ==================== EXAM OFFICERS ====================
router.get('/school/exam-officers/', applyAuth, getExamOfficers);
router.post('/school/exam-officers/', applyAuth, assignExamOfficer);

// ==================== MESSAGES ====================
router.get('/school/messages/', applyAuth, getMessages);
router.post('/school/messages/', applyAuth, sendMessage);
router.post('/school/attendance/class/', applyAuth, recordClassAttendance);

// ==================== PARENTS ====================
router.post('/school/parents/', applyAuth, createParent);

// ==================== PRINCIPAL USERS ====================
router.get('/school/principal-users/', applyAuth, getPrincipalUsers);
router.post('/school/principal-users/', applyAuth, createPrincipalUser);
router.put('/school/principal-users/:id/', applyAuth, updatePrincipalUser);

// ==================== FINANCE USERS ====================
router.get('/school/finance-users/', applyAuth, getFinanceUsers);
router.post('/school/finance-users/', applyAuth, createFinanceUser);
router.put('/school/finance-users/:id/', applyAuth, updateFinanceUser);

// ==================== TIMETABLE ====================
router.post('/school/timetable/generate/', applyAuth, generateTimetable);
router.delete('/school/timetable/', applyAuth, deleteTimetable);

// ==================== MODIFICATION REQUESTS ====================
router.post('/school/modification-requests/review/', applyAuth, reviewModificationRequest);

module.exports = router;
