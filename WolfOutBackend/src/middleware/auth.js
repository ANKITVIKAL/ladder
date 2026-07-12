'use strict';

const db = require('../db');
const { verifyToken } = require('../utils/token');
const { ApiError } = require('../utils/http');

const getUserById = db.prepare(
  'SELECT id, name, email, username, cf_handle, created_at FROM users WHERE id = ?'
);

/**
 * Extract a Bearer token from the Authorization header and resolve it
 * to a user. Attaches `req.user` (safe fields only) on success.
 */
function loadUserFromRequest(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    return null;
  }

  const user = getUserById.get(payload.sub);
  return user || null;
}

/** Hard auth: 401 if no valid token / user. */
function requireAuth(req, res, next) {
  const user = loadUserFromRequest(req);
  if (!user) {
    return next(new ApiError(401, 'Authentication required. Provide a valid Bearer token.'));
  }
  req.user = user;
  next();
}

/** Soft auth: attaches req.user if present, but never blocks the request. */
function optionalAuth(req, res, next) {
  req.user = loadUserFromRequest(req) || null;
  next();
}

module.exports = { requireAuth, optionalAuth };
