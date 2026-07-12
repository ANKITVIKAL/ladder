'use strict';

const config = require('../config');
const { ApiError } = require('../utils/http');

/**
 * Fetch a user's submissions from the Codeforces API and return the set of
 * problems they have solved (verdict === 'OK'), keyed as "contestId-index".
 *
 * Uses the public user.status endpoint:
 *   https://codeforces.com/api/user.status?handle=HANDLE
 *
 * @param {string} handle Codeforces handle
 * @returns {Promise<Set<string>>} set of "contestId-index" strings
 */
async function fetchSolvedKeys(handle) {
  const url = `${config.codeforcesApi}/user.status?handle=${encodeURIComponent(handle)}`;

  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
      // Codeforces can be slow; bound the wait so a hung request doesn't pile up.
      signal: AbortSignal.timeout(15000),
    });
  } catch (err) {
    throw new ApiError(502, `Could not reach the Codeforces API: ${err.message}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    throw new ApiError(502, 'Codeforces API returned an unreadable response.');
  }

  if (payload.status !== 'OK') {
    // CF sends comment like "handle: User with handle xyz not found"
    const comment = payload.comment || 'Unknown error from Codeforces.';
    const notFound = /not found/i.test(comment);
    throw new ApiError(notFound ? 404 : 502, `Codeforces API: ${comment}`);
  }

  const solved = new Set();
  for (const sub of payload.result || []) {
    if (sub.verdict !== 'OK' || !sub.problem) continue;
    const { contestId, index } = sub.problem;
    if (contestId == null || !index) continue;
    solved.add(`${contestId}-${index}`);
  }
  return solved;
}

module.exports = { fetchSolvedKeys };
