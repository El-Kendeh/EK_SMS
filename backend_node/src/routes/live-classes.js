const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const {
  listLiveClasses,
  createLiveClass,
  updateLiveClass,
  deleteLiveClass,
} = require('../controllers/studentController');

router.use(authenticateToken);

router.get('/', listLiveClasses);
router.post('/', createLiveClass);
router.patch('/:id/', updateLiveClass);
router.delete('/:id/', deleteLiveClass);

module.exports = router;
