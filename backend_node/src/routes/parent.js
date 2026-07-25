const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const requireActiveAccount = require('../middleware/requireActiveAccount');
const { ROLES } = require('../config/permissions');
const parent = require('../controllers/parentController');

router.use(authenticateToken);
router.use(requireActiveAccount);
router.use(requireRole([ROLES.PARENT]));

router.get('/children/', parent.getChildren);

router.get('/children/:childId/grades/', parent.getChildGrades);
router.get('/children/:childId/grades/:gradeId/history/', parent.getChildGradeHistory);
router.post('/children/:childId/grades/:gradeId/objection/', parent.submitModificationObjection);

router.get('/children/:childId/report-cards/', parent.getChildReportCards);
router.get('/children/:childId/report-cards/:reportCardId/download/', parent.downloadChildReportCard);
router.post('/children/:childId/end-of-term-pack/', parent.getEndOfTermPack);

router.get('/notifications/', parent.getParentNotifications);
router.post('/notifications/', parent.markParentNotificationRead);

router.get('/profile/', parent.getParentProfile);
router.patch('/profile/', parent.updateParentProfile);

// 2FA is not implemented yet — both endpoints honestly report available:false
// (the old handler crashed on req.user.update and the "disable" action was
// unrouted, so disabling actually enabled).
router.get('/2fa/setup/', parent.get2FASetup);
router.post('/2fa/setup/', parent.set2FA);

router.get('/children/:childId/timetable/', parent.getChildTimetable);
router.get('/children/:childId/attendance/', parent.getChildAttendance);
router.get('/children/:childId/behavior/', parent.getChildBehavior);
router.get('/children/:childId/fees/', parent.getChildFees);

router.get('/payment-channels/', parent.getPaymentChannels);
router.post('/payments/start/', parent.startPayment);
router.get('/receipts/', parent.getReceipts);
router.get('/receipts/:id/download/', parent.downloadReceipt);

router.get('/verify/:hash/', parent.verifyHash);
router.get('/children/:childId/tamper-count/', parent.getTamperCount);
router.get('/access-log/', parent.getAccessLog);

router.get('/channel-preferences/', parent.getChannelPreferences);
router.patch('/channel-preferences/', parent.updateChannelPreferences);

router.get('/whistleblower/categories/', parent.getWhistleblowerCategories);
router.post('/whistleblower/submit/', parent.submitWhistleblowerReport);
router.get('/whistleblower/:key/', parent.checkWhistleblowerStatus);

router.get('/conferences/', parent.getConferenceSlots);
router.post('/conferences/:slotId/claim/', parent.claimConferenceSlot);
router.delete('/conferences/:slotId/claim/', parent.cancelConferenceSlot);

router.get('/counsellor/', parent.getCounsellor);
router.post('/counsellor/', parent.sendCounsellorMessage);

router.get('/children/:childId/teacher-threads/', parent.getTeacherThreads);
// Threads are keyed by TEACHER (user id), not subject — the controller also
// accepts body.teacher_id.
router.post('/children/:childId/teacher-threads/:teacherId/', parent.sendTeacherMessage);

router.get('/co-guardians/', parent.getCoGuardians);
router.post('/co-guardians/', parent.inviteCoGuardian);
router.delete('/co-guardians/:id/', parent.removeCoGuardian);

router.get('/pickup/', parent.getPickupAllowList);
router.post('/pickup/', parent.addPickup);
router.delete('/pickup/:id/', parent.removePickup);

router.get('/permission-slips/', parent.getPermissionSlips);
router.post('/permission-slips/:id/sign/', parent.signPermissionSlip);

router.post('/acknowledgments/', parent.acknowledgeRecord);
router.get('/acknowledgments/', parent.getAcknowledgments);

router.get('/events/', parent.getParentEvents);
router.get('/donations/', parent.getDonations);
router.post('/donations/', parent.donateToCampaign);

router.get('/weekly-digest/', parent.getWeeklyDigest);
router.get('/voice-digest/', parent.getVoiceDigest);
router.get('/family-activity/', parent.getFamilyActivity);

// Virtual meetings targeted at parents (read-only; scheduled by the school admin).
router.get('/virtual-meetings/', require('../controllers/virtualMeetingController').getMyMeetings);

module.exports = router;
