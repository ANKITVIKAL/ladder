'use strict';

const db = require('../db');
const { asyncHandler } = require('../utils/http');
const { requireString, requireEmail } = require('../utils/validate');

const insertMessage = db.prepare(`
  INSERT INTO contact_messages (name, email, subject, message)
  VALUES (@name, @email, @subject, @message)
`);

// POST /api/contact — store a contact-form submission
const submit = asyncHandler(async (req, res) => {
  const name = requireString(req.body.name, 'name', { min: 1, max: 100 });
  const email = requireEmail(req.body.email);
  const subject = req.body.subject
    ? requireString(req.body.subject, 'subject', { min: 1, max: 200 })
    : null;
  const message = requireString(req.body.message, 'message', { min: 1, max: 5000 });

  const info = insertMessage.run({ name, email, subject, message });

  res.status(201).json({
    ok: true,
    id: info.lastInsertRowid,
    message: 'Thanks for reaching out — your message has been received.',
  });
});

module.exports = { submit };
