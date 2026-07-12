'use strict';

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const config = require('../config');
const db = require('./index');

/**
 * Load problems from the CSV into the `problems` table.
 * Idempotent: uses UPSERT on (contest_id, problem_index) so re-running
 * refreshes tags/solved_count without creating duplicates.
 *
 * Expected CSV columns: Problem, Contest, Index, Tags, solvedCount
 */
function seedProblems() {
  if (!fs.existsSync(config.problemsCsv)) {
    throw new Error(`Problems CSV not found at ${config.problemsCsv}`);
  }

  const raw = fs.readFileSync(config.problemsCsv, 'utf8');
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  const upsert = db.prepare(`
    INSERT INTO problems (name, contest_id, problem_index, tags, solved_count)
    VALUES (@name, @contest_id, @problem_index, @tags, @solved_count)
    ON CONFLICT (contest_id, problem_index) DO UPDATE SET
      name         = excluded.name,
      tags         = excluded.tags,
      solved_count = excluded.solved_count
  `);

  let inserted = 0;
  let skipped = 0;

  const run = db.transaction((rows) => {
    for (const row of rows) {
      const contestId = parseInt(row.Contest, 10);
      const problemIndex = (row.Index || '').trim();
      const name = (row.Problem || '').trim();

      // Skip rows that can't form a valid Codeforces problem reference.
      if (!Number.isInteger(contestId) || !problemIndex || !name) {
        skipped += 1;
        continue;
      }

      upsert.run({
        name,
        contest_id: contestId,
        problem_index: problemIndex,
        // Normalise tag list: split, trim, drop empties, re-join.
        tags: (row.Tags || '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
          .join(', '),
        solved_count: parseInt(row.solvedCount, 10) || 0,
      });
      inserted += 1;
    }
  });

  run(records);

  const total = db.prepare('SELECT COUNT(*) AS c FROM problems').get().c;
  return { processed: inserted, skipped, totalInDb: total };
}

module.exports = { seedProblems };

// Allow running directly:  node src/db/seed.js  (or npm run seed)
if (require.main === module) {
  try {
    const result = seedProblems();
    console.log(
      `[seed] Loaded problems from CSV — processed ${result.processed}, ` +
        `skipped ${result.skipped}, total in DB ${result.totalInDb}.`
    );
    process.exit(0);
  } catch (err) {
    console.error('[seed] Failed:', err.message);
    process.exit(1);
  }
}
