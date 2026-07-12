'use strict';

const express = require('express');
const ctrl = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.get('/me', requireAuth, ctrl.me);
router.put('/handle', requireAuth, ctrl.setHandle);

module.exports = router;
