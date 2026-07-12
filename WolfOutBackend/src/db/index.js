'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');

// Ensure the directory for the DB file exists before opening it.
fs.mkdirSync(path.dirname(config.db.path), { recursive: true });

const db = new Database(config.db.path);

// Pragmas: WAL for better concurrent read performance, foreign keys on.
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/**
 * Create tables if they do not already exist. Safe to call on every boot.
 */
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      username      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT    NOT NULL,
      cf_handle     TEXT,
      created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS problems (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      contest_id    INTEGER NOT NULL,
      problem_index TEXT    NOT NULL,
      tags          TEXT    NOT NULL DEFAULT '',
      solved_count  INTEGER NOT NULL DEFAULT 0,
      UNIQUE (contest_id, problem_index)
    );

    CREATE TABLE IF NOT EXISTS user_problems (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      problem_id INTEGER NOT NULL,
      status     TEXT    NOT NULL DEFAULT 'solved',
      source     TEXT    NOT NULL DEFAULT 'manual',
      solved_at  TEXT    NOT NULL DEFAULT (datetime('now')),
      UNIQUE (user_id, problem_id),
      FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
      FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contact_messages (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      subject    TEXT,
      message    TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_user_problems_user ON user_problems(user_id);
    CREATE INDEX IF NOT EXISTS idx_problems_contest   ON problems(contest_id, problem_index);
  `);
}

initSchema();

module.exports = db;
