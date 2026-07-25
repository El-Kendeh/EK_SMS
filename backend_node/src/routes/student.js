const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

const {
  getProfile, changePassword, changeUsername,
  getCurrentTerm, getAllTerms,
  getGrades, getGradesSummary, getGradeHistory,
  getPeerReview, getFeedbackThread, sendFeedbackMessage,
  getRemedialPlan, confirmRemedialSession,
  getSecurityReport,
  getAttendance,
  getNotifications, markNotificationRead,
  getTimetable,
  getAssignments, submitAssignment,
  getConversations, sendMessage,
  getResources,
  getFinancials,
  getEvents,
  getGradeInsights,
  getSecurityHealth, revokeDevice,
  get2FASetup, enable2FA, disable2FA,
  getReportCards, downloadReportCard,
  getTranscript, downloadTranscript,
  verifyHash,
  getTamperCount,
  getWhoSawMyData, getParentalAccessLog,
  submitModificationObjection,
  getChannelPreferences, updateChannelPreferences,
  getWhistleblowerCategories, submitWhistleblowerReport, checkWhistleblowerStatus,
  getGoals, setGoal,
  getOfficeHourSlots, claimOfficeHourSlot, cancelOfficeHourSlot,
  getCounsellorThread, sendCounsellorMessage,
  getStudyGroups, joinStudyGroup, leaveStudyGroup,
  getStreaks,
  getDigitalId,
  getDocuments, uploadDocument, requestTranscript,
  getStudyPlan, saveStudyPlan,
  getResourceLastVisit, markResourceVisited,
  getVoiceSummary,
  getSubjectDeepDive,
  listLiveClasses,
  downloadReceipt,
} = require('../controllers/studentController');

router.use(authenticateToken);

router.get('/me/', getProfile);
router.post('/change-password/', changePassword);
router.post('/change-username/', changeUsername);

router.get('/terms/current/', getCurrentTerm);
router.get('/terms/', getAllTerms);

router.get('/grades/', getGrades);
router.get('/grades/summary/', getGradesSummary);
router.get('/grades/:gradeId/history/', getGradeHistory);
router.get('/grades/:gradeId/peer-review/', getPeerReview);
router.get('/grades/:gradeId/feedback/', getFeedbackThread);
router.post('/grades/:gradeId/feedback/', sendFeedbackMessage);
router.get('/grades/:gradeId/remedial-plan/', getRemedialPlan);
router.post('/grades/:gradeId/remedial-plan/confirm/', confirmRemedialSession);
router.get('/grades/:gradeId/security-report/', getSecurityReport);
router.post('/grades/:gradeId/objection/', submitModificationObjection);

router.get('/attendance/', getAttendance);

router.get('/notifications/', getNotifications);
router.post('/notifications/', markNotificationRead);

router.get('/timetable/', getTimetable);

router.get('/assignments/', getAssignments);
router.post('/assignments/:id/submit/', submitAssignment);

router.get('/messages/', getConversations);
router.post('/messages/:conversationId/', sendMessage);

router.get('/resources/', getResources);
router.get('/resources/last-visit/', getResourceLastVisit);
router.post('/resources/:id/visit/', markResourceVisited);

router.get('/financials/', getFinancials);
router.get('/receipts/:id/download/', downloadReceipt);

router.get('/events/', getEvents);
router.get('/grade-insights/', getGradeInsights);

router.get('/security-health/', getSecurityHealth);
router.delete('/devices/:id/', revokeDevice);

router.get('/2fa/setup/', get2FASetup);
router.post('/2fa/setup/', enable2FA);
router.post('/2fa/disable/', disable2FA);

router.get('/report-cards/', getReportCards);
router.get('/report-cards/:id/download/', downloadReportCard);

router.get('/transcript/', getTranscript);
router.get('/transcript/download/', downloadTranscript);
router.post('/transcript/request/', requestTranscript);

router.get('/verify/:hash/', verifyHash);

router.get('/tamper-count/', getTamperCount);
router.get('/access-log/', getWhoSawMyData);
router.get('/parental-access-log/', getParentalAccessLog);

router.get('/channel-preferences/', getChannelPreferences);
router.patch('/channel-preferences/', updateChannelPreferences);

router.get('/whistleblower/categories/', getWhistleblowerCategories);
router.post('/whistleblower/submit/', submitWhistleblowerReport);
router.get('/whistleblower/:key/', checkWhistleblowerStatus);

router.get('/goals/', getGoals);
router.put('/goals/', setGoal);

router.get('/office-hours/', getOfficeHourSlots);
router.post('/office-hours/:slotId/claim/', claimOfficeHourSlot);
router.delete('/office-hours/:slotId/claim/', cancelOfficeHourSlot);

router.get('/counsellor/', getCounsellorThread);
router.post('/counsellor/', sendCounsellorMessage);

router.get('/study-groups/', getStudyGroups);
router.post('/study-groups/:id/join/', joinStudyGroup);
router.post('/study-groups/:id/leave/', leaveStudyGroup);

router.get('/streaks/', getStreaks);

router.get('/digital-id/', getDigitalId);

router.get('/documents/', getDocuments);
router.post('/documents/', uploadDocument);

router.get('/study-plan/', getStudyPlan);
router.put('/study-plan/', saveStudyPlan);

router.get('/voice-summary/', getVoiceSummary);

router.get('/subjects/:subjectId/deep-dive/', getSubjectDeepDive);

router.get('/live-classes/', listLiveClasses);

// Virtual meetings targeted at this role (read-only; scheduled by the school admin).
router.get('/virtual-meetings/', require('../controllers/virtualMeetingController').getMyMeetings);

module.exports = router;
