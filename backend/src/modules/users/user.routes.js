const express = require('express');
const router = express.Router();
const { getMe, register, login, logout, changePassword } = require('./user.controller');

router.get('/me', getMe);
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/change-password', changePassword);

module.exports = router;
