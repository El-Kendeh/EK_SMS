const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

const {
  getWhistleblowerCategories,
  submitWhistleblowerReport,
  checkWhistleblowerStatus,
} = require('../controllers/studentController');

router.use(authenticateToken);

router.get('/categories/', getWhistleblowerCategories);
router.post('/submit/', submitWhistleblowerReport);
router.get('/:key/', checkWhistleblowerStatus);

module.exports = router;
