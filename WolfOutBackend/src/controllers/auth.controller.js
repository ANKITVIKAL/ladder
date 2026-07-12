'use strict';

const bcrypt = require('bcryptjs');
const db = require('../db');
const { ApiError, asyncHandler } = require('../utils/http');
const { requireString, requireEmail, requireCfHandle } = require('../utils/validate');
const { signToken } = require('../utils/token');

const insertUser = db.prepare(`
  INSERT INTO users (name, email, username, password_hash)
  VALUES (@name, @email, @username, @password_hash)
`);
const findByUsername = db.prepare('SELECT * FROM users WHERE username = ? COLLATE NOCASE');
const findByEmail = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE');
const findByUsernameExists = db.prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE');
const updateHandle = db.prepare('UPDATE users SET cf_handle = ? WHERE id = ?');
const getPublicUser = db.prepare(
  'SELECT id, name, email, username, cf_handle, created_at FROM users WHERE id = ?'
);

/** Shape a DB user row into the public JSON representation. */
function toPublicUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username,
    cfHandle: row.cf_handle || null,
    createdAt: row.created_at,
  };
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const name = requireString(req.body.name, 'name', { min: 1, max: 100 });
  const email = requireEmail(req.body.email);
  const username = requireString(req.body.username, 'username', { min: 3, max: 30 });
  const password = requireString(req.body.password, 'password', { min: 6, max: 200 });

  if (findByEmail.get(email)) {
    throw new ApiError(409, 'An account with this email already exists.');
  }
  if (findByUsernameExists.get(username)) {
    throw new ApiError(409, 'This username is already taken.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const info = insertUser.run({ name, email, username, password_hash: passwordHash });
  const user = getPublicUser.get(info.lastInsertRowid);
  const token = signToken(user);

  res.status(201).json({ token, user: toPublicUser(user) });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const username = requireString(req.body.username, 'username');
  const password = requireString(req.body.password, 'password');

  const user = findByUsername.get(username);
  // Compare even when the user is missing to keep timing roughly constant.
  const hash = user ? user.password_hash : '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinva';
  const ok = await bcrypt.compare(password, hash);

  if (!user || !ok) {
    throw new ApiError(401, 'Invalid username or password.');
  }

  const token = signToken(user);
  res.json({ token, user: toPublicUser(user) });
});

// GET /api/auth/me  (protected)
const me = asyncHandler(async (req, res) => {
  res.json({ user: toPublicUser(req.user) });
});

// PUT /api/auth/handle  (protected) — set/update the user's Codeforces handle
const setHandle = asyncHandler(async (req, res) => {
  const cfHandle = requireCfHandle(req.body.cfHandle);
  updateHandle.run(cfHandle, req.user.id);
  const user = getPublicUser.get(req.user.id);
  res.json({ user: toPublicUser(user) });
});

module.exports = { register, login, me, setHandle, toPublicUser };
