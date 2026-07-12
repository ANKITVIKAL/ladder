'use strict';

const { ApiError } = require('./http');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Codeforces handles: 3–24 chars, letters/digits/underscore/dot/hyphen.
const CF_HANDLE_RE = /^[A-Za-z0-9_.-]{3,24}$/;

function requireString(value, field, { min = 1, max = 255 } = {}) {
  if (typeof value !== 'string' || value.trim().length < min) {
    throw new ApiError(400, `"${field}" is required and must be at least ${min} character(s).`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new ApiError(400, `"${field}" must be at most ${max} characters.`);
  }
  return trimmed;
}

function requireEmail(value, field = 'email') {
  const email = requireString(value, field);
  if (!EMAIL_RE.test(email)) {
    throw new ApiError(400, `"${field}" must be a valid email address.`);
  }
  return email.toLowerCase();
}

function requireCfHandle(value, field = 'cfHandle') {
  const handle = requireString(value, field);
  if (!CF_HANDLE_RE.test(handle)) {
    throw new ApiError(400, `"${field}" must be a valid Codeforces handle (3-24 letters, digits, . _ -).`);
  }
  return handle;
}

module.exports = { requireString, requireEmail, requireCfHandle, EMAIL_RE, CF_HANDLE_RE };
