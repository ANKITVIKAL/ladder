'use strict';

const express = require('express');

const authRoutes = require('./auth.routes');
const problemsRoutes = require('./problems.routes');
const progressRoutes = require('./progress.routes');
const contactRoutes = require('./contact.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'wolfout-backend' });
});

router.use('/auth', authRoutes);
router.use('/problems', problemsRoutes);
router.use('/progress', progressRoutes);
router.use('/contact', contactRoutes);

module.exports = router;
