const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const {
  listLiveClasses,
  createLiveClass,
  updateLiveClass,
  deleteLiveClass,
} = require('../controllers/studentController');

// Only staff may schedule/modify a live class. Reads stay open to any
// authenticated user so students/parents can see their upcoming classes.
const CAN_MANAGE_LIVE_CLASS = ['superadmin', 'school_admin', 'principal', 'teacher'];

router.use(authenticateToken);

router.get('/', listLiveClasses);
router.post('/', requireRole(CAN_MANAGE_LIVE_CLASS), createLiveClass);
router.patch('/:id/', requireRole(CAN_MANAGE_LIVE_CLASS), updateLiveClass);
router.delete('/:id/', requireRole(CAN_MANAGE_LIVE_CLASS), deleteLiveClass);

module.exports = router;
