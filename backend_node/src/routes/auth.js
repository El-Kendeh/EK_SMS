// src/routes/auth.js
const express = require('express');
const router = express.Router();

const { login, logout, register } = require('../controllers/authController');

// POST /api/login/
router.post('/login/', login);

// POST /api/logout/
router.post('/logout/', logout);

// POST /api/register/
router.post('/register/', register);

module.exports = router;
