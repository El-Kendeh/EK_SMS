const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

const {
  getOverview, listGradeApprovals, reviewGradeChange,
  listReportCards, publishReportCard, commentReportCard,
} = require('../controllers/principalController');

router.use(authenticateToken);

router.get('/overview/', getOverview);
router.get('/grade-approvals/', listGradeApprovals);
router.post('/grade-approvals/', reviewGradeChange);
router.get('/report-cards/', listReportCards);
router.post('/report-cards/', publishReportCard);
router.post('/report-cards/comment/', commentReportCard);

module.exports = router;
