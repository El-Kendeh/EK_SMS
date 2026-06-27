const express = require('express');
const router = express.Router();
const { verifyToken } = require('../utils/jwt');
const {
  getCategories,
  submitReport,
  checkStatus,
} = require('../controllers/whistleblowerController');

// Optional auth: a whistleblower report is anonymous, so submit must work WITHOUT a
// token (the request then carries no identity — audit #85). If a token IS present we
// decode it for convenience (school_id, used by student/parent callers), but never
// require it or store the actor. Anonymous callers pass school_id explicitly.
router.use((req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = null;
  if (authHeader) {
    if (authHeader.startsWith('Token ')) token = authHeader.substring(6);
    else if (authHeader.startsWith('Bearer ')) token = authHeader.substring(7);
    else token = authHeader;
  }
  if (token) {
    const verified = verifyToken(token);
    if (verified) req.user = verified;
  }
  next();
});

router.get('/categories/', getCategories);
router.post('/submit/', submitReport);
router.get('/:key/', checkStatus);

module.exports = router;
