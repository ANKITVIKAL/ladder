'use strict';

const express = require('express');
const ctrl = require('../controllers/contact.controller');

const router = express.Router();

router.post('/', ctrl.submit);

module.exports = router;
