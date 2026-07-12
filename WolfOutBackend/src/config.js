'use strict';

const path = require('path');
require('dotenv').config();

const ROOT = path.resolve(__dirname, '..');

function resolveFromRoot(p, fallback) {
  return path.resolve(ROOT, p || fallback);
}

const config = {
  root: ROOT,
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,

  // CORS: '*' allows any origin, otherwise a comma-separated allow-list.
  corsOrigin: (process.env.CORS_ORIGIN || '*').trim(),

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  db: {
    path: resolveFromRoot(process.env.DB_PATH, 'data/wolfout.db'),
  },

  problemsCsv: resolveFromRoot(process.env.PROBLEMS_CSV, 'data/Final_database_to_upload.csv'),

  codeforcesApi: (process.env.CODEFORCES_API || 'https://codeforces.com/api').replace(/\/$/, ''),
};

if (config.env === 'production' && config.jwt.secret === 'dev-insecure-secret-change-me') {
  // Fail loud in production rather than silently issuing tokens signed with a known secret.
  throw new Error('JWT_SECRET must be set to a strong value in production.');
}

module.exports = config;
