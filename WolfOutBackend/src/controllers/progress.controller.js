'use strict';

const db = require('../db');
const { ApiError, asyncHandler } = require('../utils/http');
const { requireCfHandle } = require('../utils/validate');
const { fetchSolvedKeys } = require('../services/codeforces.service');

const getProblem = db.prepare('SELECT * FROM problems WHERE id = ?');
const markSolvedStmt = db.prepare(`
  INSERT INTO user_problems (user_id, problem_id, status, source)
  VALUES (@user_id, @problem_id, 'solved', @source)
  ON CONFLICT (user_id, problem_id) DO UPDATE SET
    status    = 'solved',
    source    = excluded.source,
    solved_at = datetime('now')
`);
const unmarkStmt = db.prepare('DELETE FROM user_problems WHERE user_id = ? AND problem_id = ?');

// GET /api/progress  (protected) — summary of the user's ladder progress
const getSummary = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const total = db.prepare('SELECT COUNT(*) AS c FROM problems').get().c;
  const solved = db
    .prepare('SELECT COUNT(*) AS c FROM user_problems WHERE user_id = ?')
    .get(userId).c;

  // Solved counts grouped by tag (tags are stored comma-joined per problem).
  const solvedRows = db
    .prepare(
      `SELECT p.tags FROM user_problems up
         JOIN problems p ON p.id = up.problem_id
        WHERE up.user_id = ?`
    )
    .all(userId);

  const byTag = {};
  for (const row of solvedRows) {
    for (const raw of (row.tags || '').split(',')) {
      const tag = raw.trim();
      if (tag) byTag[tag] = (byTag[tag] || 0) + 1;
    }
  }

  res.json({
    handle: req.user.cf_handle || null,
    total,
    solved,
    remaining: total - solved,
    percent: total ? Math.round((solved / total) * 1000) / 10 : 0,
    byTag,
  });
});

// POST /api/progress/:problemId/solve  (protected)
const markSolved = asyncHandler(async (req, res) => {
  const problemId = parseInt(req.params.problemId, 10);
  if (!Number.isInteger(problemId)) throw new ApiError(400, 'Invalid problem id.');
  if (!getProblem.get(problemId)) throw new ApiError(404, 'Problem not found.');

  markSolvedStmt.run({ user_id: req.user.id, problem_id: problemId, source: 'manual' });
  res.status(201).json({ ok: true, problemId, solved: true });
});

// DELETE /api/progress/:problemId/solve  (protected)
const unmarkSolved = asyncHandler(async (req, res) => {
  const problemId = parseInt(req.params.problemId, 10);
  if (!Number.isInteger(problemId)) throw new ApiError(400, 'Invalid problem id.');

  const info = unmarkStmt.run(req.user.id, problemId);
  res.json({ ok: true, problemId, solved: false, removed: info.changes > 0 });
});

// POST /api/progress/sync  (protected) — pull solved status from Codeforces
const syncFromCodeforces = asyncHandler(async (req, res) => {
  // Allow overriding the stored handle for a one-off sync.
  const rawHandle = (req.body && req.body.cfHandle) || req.user.cf_handle;
  if (!rawHandle) {
    throw new ApiError(400, 'No Codeforces handle set. Provide "cfHandle" or set it via PUT /api/auth/handle.');
  }
  // Validate format up front so a malformed handle is a clean 400, not a 502 from CF.
  const handle = requireCfHandle(rawHandle);

  const solvedKeys = await fetchSolvedKeys(handle);

  // Match CF-solved problems against the ladder's problem set.
  const ladderProblems = db.prepare('SELECT id, contest_id, problem_index FROM problems').all();

  // Snapshot already-solved problems so we can report genuinely-new marks
  // (an UPSERT reports 1 change on both insert and conflict-update).
  const alreadySolved = new Set(
    db
      .prepare('SELECT problem_id FROM user_problems WHERE user_id = ?')
      .all(req.user.id)
      .map((r) => r.problem_id)
  );

  let newlyMarked = 0;
  const matchedIds = [];
  const run = db.transaction(() => {
    for (const p of ladderProblems) {
      if (!solvedKeys.has(`${p.contest_id}-${p.problem_index}`)) continue;
      matchedIds.push(p.id);
      if (!alreadySolved.has(p.id)) newlyMarked += 1;
      markSolvedStmt.run({
        user_id: req.user.id,
        problem_id: p.id,
        source: 'codeforces',
      });
    }
  });
  run();

  const totalSolved = db
    .prepare('SELECT COUNT(*) AS c FROM user_problems WHERE user_id = ?')
    .get(req.user.id).c;

  res.json({
    ok: true,
    handle,
    matchedInLadder: matchedIds.length,
    newlySolved: newlyMarked,
    totalSolved,
  });
});

module.exports = { getSummary, markSolved, unmarkSolved, syncFromCodeforces };
