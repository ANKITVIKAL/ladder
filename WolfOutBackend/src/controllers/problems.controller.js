'use strict';

const db = require('../db');
const { asyncHandler } = require('../utils/http');

/** Build the Codeforces problemset URL for a problem row. */
function problemUrl(contestId, index) {
  return `https://codeforces.com/problemset/problem/${contestId}/${index}`;
}

/** Shape a joined problem row for the API. `solved` present only for authed requests. */
function toPublicProblem(row, authed) {
  const base = {
    id: row.id,
    name: row.name,
    contestId: row.contest_id,
    index: row.problem_index,
    tags: row.tags ? row.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    solvedCount: row.solved_count,
    url: problemUrl(row.contest_id, row.problem_index),
  };
  if (authed) base.solved = row.solved === 1;
  return base;
}

// GET /api/problems
// Query params: search, tag, solved (true|false, auth only), sort, order, page, limit
const listProblems = asyncHandler(async (req, res) => {
  const authed = Boolean(req.user);
  const userId = authed ? req.user.id : -1;

  const search = (req.query.search || '').trim();
  const tag = (req.query.tag || '').trim();
  const solvedFilter = authed ? (req.query.solved || '').trim().toLowerCase() : '';

  // Whitelist sortable columns to avoid SQL injection via ORDER BY.
  const sortMap = {
    solvedCount: 'p.solved_count',
    name: 'p.name',
    contest: 'p.contest_id',
    id: 'p.id',
  };
  const sortCol = sortMap[req.query.sort] || 'p.solved_count';
  const order = (req.query.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  let page = parseInt(req.query.page, 10) || 1;
  let limit = parseInt(req.query.limit, 10) || 100;
  if (page < 1) page = 1;
  if (limit < 1) limit = 1;
  if (limit > 500) limit = 500;
  const offset = (page - 1) * limit;

  const where = [];
  const params = { userId };

  if (search) {
    where.push('p.name LIKE @search');
    params.search = `%${search}%`;
  }
  if (tag) {
    where.push('p.tags LIKE @tag');
    params.tag = `%${tag}%`;
  }
  if (solvedFilter === 'true') {
    where.push('up.problem_id IS NOT NULL');
  } else if (solvedFilter === 'false') {
    where.push('up.problem_id IS NULL');
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const rows = db
    .prepare(
      `SELECT p.*, CASE WHEN up.problem_id IS NOT NULL THEN 1 ELSE 0 END AS solved
         FROM problems p
         LEFT JOIN user_problems up
           ON up.problem_id = p.id AND up.user_id = @userId
         ${whereSql}
         ORDER BY ${sortCol} ${order}, p.id ASC
         LIMIT @limit OFFSET @offset`
    )
    .all({ ...params, limit, offset });

  const total = db
    .prepare(
      `SELECT COUNT(*) AS c
         FROM problems p
         LEFT JOIN user_problems up
           ON up.problem_id = p.id AND up.user_id = @userId
         ${whereSql}`
    )
    .get(params).c;

  res.json({
    problems: rows.map((r) => toPublicProblem(r, authed)),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});

// GET /api/problems/tags — distinct tags with counts
const listTags = asyncHandler(async (req, res) => {
  const rows = db.prepare('SELECT tags FROM problems').all();
  const counts = new Map();
  for (const row of rows) {
    for (const raw of (row.tags || '').split(',')) {
      const tag = raw.trim();
      if (tag) counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  const tags = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  res.json({ tags });
});

module.exports = { listProblems, listTags, toPublicProblem, problemUrl };
