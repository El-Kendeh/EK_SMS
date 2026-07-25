const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { ROLE_GATES } = require('../config/permissions');
const {
  listLiveClasses,
  createLiveClass,
  updateLiveClass,
  deleteLiveClass,
} = require('../controllers/studentController');

router.use(authenticateToken);

router.get('/', listLiveClasses);
router.post('/', requireRole(ROLE_GATES.CAN_MANAGE_LIVE_CLASS), createLiveClass);
router.patch('/:id/', requireRole(ROLE_GATES.CAN_MANAGE_LIVE_CLASS), updateLiveClass);
router.delete('/:id/', requireRole(ROLE_GATES.CAN_MANAGE_LIVE_CLASS), deleteLiveClass);

module.exports = router;
