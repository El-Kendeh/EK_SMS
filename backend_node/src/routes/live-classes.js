const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

const {
  listLiveClasses,
} = require('../controllers/studentController');

router.use(authenticateToken);

router.get('/', listLiveClasses);
router.post('/', (req, res) => res.json({ success: true, message: 'Live class created' }));
router.patch('/:id/', (req, res) => res.json({ success: true, message: 'Live class updated' }));
router.delete('/:id/', (req, res) => res.json({ success: true, message: 'Live class deleted' }));

module.exports = router;
