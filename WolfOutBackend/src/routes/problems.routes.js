'use strict';

const express = require('express');
const ctrl = require('../controllers/problems.controller');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public, but if a token is supplied each problem is annotated with `solved`.
router.get('/', optionalAuth, ctrl.listProblems);
router.get('/tags', ctrl.listTags);

module.exports = router;
