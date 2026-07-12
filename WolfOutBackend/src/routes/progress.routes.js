'use strict';

const express = require('express');
const ctrl = require('../controllers/progress.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Everything here is per-user, so require authentication.
router.use(requireAuth);

router.get('/', ctrl.getSummary);
router.post('/sync', ctrl.syncFromCodeforces);
router.post('/:problemId/solve', ctrl.markSolved);
router.delete('/:problemId/solve', ctrl.unmarkSolved);

module.exports = router;
