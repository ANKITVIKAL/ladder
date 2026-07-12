'use strict';

const app = require('./app');
const config = require('./config');
const db = require('./db');
const { seedProblems } = require('./db/seed');

// On boot, seed the problems table from the CSV if it's empty.
// (Safe & idempotent — the seed uses UPSERT, this just avoids the work
//  on every restart once the table is populated.)
try {
  const count = db.prepare('SELECT COUNT(*) AS c FROM problems').get().c;
  if (count === 0) {
    const result = seedProblems();
    console.log(`[boot] Seeded ${result.processed} problems from CSV.`);
  } else {
    console.log(`[boot] ${count} problems already present — skipping seed.`);
  }
} catch (err) {
  console.error('[boot] Problem seeding failed:', err.message);
}

const server = app.listen(config.port, () => {
  console.log(`[boot] WolfOut Ladder API listening on http://localhost:${config.port} (${config.env})`);
});

// Graceful shutdown.
function shutdown(signal) {
  console.log(`\n[shutdown] Received ${signal}, closing server...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

module.exports = server;
