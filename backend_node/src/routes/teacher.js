const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Disk storage for teacher uploads (lesson resources, behaviour-incident evidence).
// Served statically at /uploads/teacher/ (see index.js: app.use('/uploads', static)).
const teacherUploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/teacher/');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, '_').slice(0, 40);
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});
const teacherUpload = multer({ storage: teacherUploadStorage, limits: { fileSize: 50 * 1024 * 1024 } });

const {
  getTeacherMe,
  getTeacherClasses,
  getTeacherStudents,
  getTeacherGradebook,
  saveGradeDraft,
  submitGradesForLocking,
  getGradeHistory,
  getTeacherTimetable,
  getTeacherExamDuties,
  getTeacherAttendanceStatus,
  recordClassAttendance,
  getClassAttendance,
  getTeacherAtRiskStudents,
  getTeacherModificationSummary,
  getTeacherAcademicCalendar,
  getTeacherStudentActivity,
  getTeacherNotifications,
  getFeedbackStudents,
  getFeedbackMessages,
  sendFeedback,
  getTeacherTamperCount,
  getTeacherAccessLog,
  getTeacherChannelPreferences,
  updateTeacherChannelPreferences,
  getTeacherWhistleblowerCategories,
  submitWhistleblowerReport,
  checkWhistleblowerStatus,
  getTeacherOfficeHours,
  createTeacherOfficeHour,
  deleteTeacherOfficeHour,
  getParentThreads,
  sendParentMessage,
  getStudentThreads,
  sendStudentMessage,
  getBehaviourIncidents,
  fileBehaviourIncident,
  issueSubstituteToken,
  revokeSubstituteToken,
  listSubstituteTokens,
  getLessonPlans,
  upsertLessonPlan,
  getFeedbackTemplates,
  addFeedbackTemplate,
  recommendResource,
  referToCounsellor,
  getTeacherWorkload,
  getTeacherPerformance,
  getPeerReviews,
  submitPeerReview,
  getColleagues,
  changeTeacherPassword,
  getSpotlightStudent,
  setSpotlightStudent,
  getCohortCompare,
  getVoiceDigest,
  getGradeReceipts,
  getGradeReceipt,
  getTeacherCredentials,
  updateTeacherCredentials,
  getModificationRequests,
  submitModificationRequest,
  withdrawModificationRequest,
  getClassAnalytics,
  getAssignments,
  createAssignment,
  deleteAssignment,
  getTeacherExams,
  getExamResults,
  saveExamResults,
  getAnnouncements,
  sendAnnouncement,
  getMessages,
  sendMessage,
  getStudentGradeHistory,
  getStudentReportCards,
  getResources,
  uploadResource,
  deleteResource,
  generateTimetable,
  getAcademicCalendar,
} = require('../controllers/teacherController');

router.use(authenticateToken);

async function isTeacher(req, res, next) {
  try {
    const allowedRoles = ['teacher', 'staff', 'superadmin', 'school_admin'];
    if (req.user && allowedRoles.includes(req.user.role)) {
      return next();
    }
    if (req.user && req.user.id) {
      const Teacher = require('../models/Teacher');
      const teacherLink = await Teacher.findOne({ where: { user_id: req.user.id } });
      if (teacherLink) {
        req.user.role = 'teacher';
        return next();
      }
    }
    console.warn(`[AUTH] Teacher access denied — User: ${req.user?.username}, Role: ${req.user?.role}`);
    return res.status(403).json({
      success: false,
      message: `This area is for teachers only. Your account role is "${req.user?.role || 'unknown'}".`
    });
  } catch (err) {
    console.error('isTeacher Middleware Error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error verifying role.' });
  }
}

router.use(isTeacher);

// Profile & Classes
router.get('/me/', getTeacherMe);
router.get('/classes/', getTeacherClasses);
router.get('/students/', getTeacherStudents);

// Gradebook
router.get('/gradebook/', getTeacherGradebook);
router.post('/gradebook/', saveGradeDraft);
router.post('/grades/lock/', submitGradesForLocking);
router.get('/grades/:id/history/', getGradeHistory);

// Timetable & Exam Duties
router.get('/timetable/', getTeacherTimetable);
router.get('/exam-duties/', getTeacherExamDuties);

// Attendance & Analytics
router.get('/attendance/status/', getTeacherAttendanceStatus);
router.get('/attendance/', getClassAttendance);
router.post('/attendance/', recordClassAttendance);
router.get('/at-risk-students/', getTeacherAtRiskStudents);
router.get('/analytics/', getClassAnalytics);
router.get('/modification-requests/summary/', getTeacherModificationSummary);
router.get('/academic-calendar/', getAcademicCalendar);
router.get('/student-activity/', getTeacherStudentActivity);
router.get('/notifications/', getTeacherNotifications);

// Modification Requests
router.get('/modification-requests/', getModificationRequests);
// multer so the optional evidence file (multipart) is parsed (audit #29/#44).
router.post('/modification-requests/', teacherUpload.single('evidence_file'), submitModificationRequest);
// withdraw needs the request id in the path (audit #33) — the handler reads req.params.id.
router.post('/modification-requests/:id/withdraw/', withdrawModificationRequest);

// Assignments
router.get('/assignments/', getAssignments);
router.post('/assignments/', createAssignment);
router.delete('/assignments/:id/', deleteAssignment);

// Exams
router.get('/exam-list/', getTeacherExams);
router.get('/exams/:examId/results/', getExamResults);
router.post('/exams/:examId/results/', saveExamResults);

// Announcements
router.get('/announcements/', getAnnouncements);
router.post('/announcements/', sendAnnouncement);

// Messages
router.get('/messages/', getMessages);
router.post('/messages/', sendMessage);

// Student Details
router.get('/students/:studentId/grades/', getStudentGradeHistory);
router.get('/students/:studentId/report-cards/', getStudentReportCards);

// Resources
router.get('/resources/', getResources);
router.post('/resources/', teacherUpload.single('file'), uploadResource);
router.delete('/resources/:id/', deleteResource);

// Feedback
router.get('/feedback/students/', getFeedbackStudents);
router.get('/feedback/:studentId/', getFeedbackMessages);
router.post('/feedback/:studentId/', sendFeedback);

// Security & Audit
router.get('/tamper-count/', getTeacherTamperCount);
router.get('/access-log/', getTeacherAccessLog);
router.get('/channel-preferences/', getTeacherChannelPreferences);
router.patch('/channel-preferences/', updateTeacherChannelPreferences);

// Whistleblower
router.get('/whistleblower/categories/', getTeacherWhistleblowerCategories);
router.post('/whistleblower/submit/', submitWhistleblowerReport);
router.get('/whistleblower/:key/', checkWhistleblowerStatus);

// Office Hours
router.get('/office-hours/', getTeacherOfficeHours);
router.post('/office-hours/', createTeacherOfficeHour);
router.delete('/office-hours/:slotId/', deleteTeacherOfficeHour);

// Parent & Student Threads
router.get('/parent-threads/', getParentThreads);
router.post('/parent-threads/:childId/', sendParentMessage);
router.get('/student-threads/', getStudentThreads);
router.post('/student-threads/:studentId/', sendStudentMessage);

// Behaviour
router.get('/behaviour-incidents/', getBehaviourIncidents);
router.post('/behaviour-incidents/', teacherUpload.array('evidence', 5), fileBehaviourIncident);

// Substitute Mode
router.post('/substitute-token/', issueSubstituteToken);
router.delete('/substitute-token/:token/', revokeSubstituteToken);
router.get('/substitute-token/', listSubstituteTokens);

// Lesson Plans
router.get('/lesson-plans/', getLessonPlans);
router.post('/lesson-plans/', upsertLessonPlan);
router.put('/lesson-plans/:id/', upsertLessonPlan);

// Feedback Templates
router.get('/feedback-templates/', getFeedbackTemplates);
router.post('/feedback-templates/', addFeedbackTemplate);

// Resource Recommendation
router.post('/recommend-resource/', recommendResource);

// Counsellor Referral
router.post('/counsellor-referral/', referToCounsellor);

// Workload & Performance
router.get('/workload/', getTeacherWorkload);
router.get('/performance/', getTeacherPerformance);
router.get('/peer-reviews/', getPeerReviews);
router.post('/peer-reviews/', submitPeerReview);
router.get('/colleagues/', getColleagues);
router.post('/change-password/', changeTeacherPassword);
router.get('/spotlight/', getSpotlightStudent);
router.post('/spotlight/', setSpotlightStudent);
router.get('/cohort-compare/', getCohortCompare);
router.get('/voice-digest/', getVoiceDigest);

// Grade Receipts
router.get('/grade-receipts/', getGradeReceipts);
router.get('/grade-receipts/:receiptId/', getGradeReceipt);

// Credentials
router.get('/credentials/', getTeacherCredentials);
router.patch('/credentials/', updateTeacherCredentials);

// Timetable generation
router.post('/timetable/generate/', generateTimetable);

// Grading scheme (read-only for teachers)
const { getGradingScheme } = require('../controllers/schoolController');
router.get('/grading-scheme/', getGradingScheme);

// Virtual meetings targeted at this role (read-only; scheduled by the school admin).
router.get('/virtual-meetings/', require('../controllers/virtualMeetingController').getMyMeetings);

module.exports = router;
