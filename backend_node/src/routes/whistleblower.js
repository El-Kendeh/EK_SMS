const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const {
  getCategories,
  submitReport,
  checkStatus,
} = require('../controllers/whistleblowerController');

router.use(authenticateToken);

router.get('/categories/', getCategories);
router.post('/submit/', submitReport);
router.get('/:key/', checkStatus);

module.exports = router;
