# WolfOut Ladder — Backend API

REST API for the **WolfOut Ladder**, a Codeforces problem ladder. It serves the
curated problem set, handles user accounts (JWT auth), tracks each user's solved
problems, and can auto-sync solved status directly from the Codeforces API.

> Frontend lives in `../WolfOutFrontend` and is deployed at
> https://wolfoutladder.netlify.app/. This backend is a standalone service and
> is **not** wired into the frontend yet — it can be deployed and consumed
> independently.

## Tech stack

- **Node.js + Express** — HTTP API
- **SQLite** (via `better-sqlite3`) — zero-config embedded database
- **JWT** (`jsonwebtoken`) + **bcryptjs** — stateless auth & password hashing
- **csv-parse** — seeds problems from `Final_database_to_upload.csv`
- Codeforces public API — `user.status` for submission sync

## Project layout

```
WolfOutBackend/
├── data/
│   └── Final_database_to_upload.csv   # problem source (seed input)
├── src/
│   ├── config.js                      # env-driven configuration
│   ├── app.js                         # Express app assembly
│   ├── server.js                      # entry point (+ auto-seed on boot)
│   ├── db/
│   │   ├── index.js                   # connection + schema
│   │   └── seed.js                    # CSV → problems table (idempotent)
│   ├── middleware/                    # auth + error handling
│   ├── routes/                        # route definitions
│   ├── controllers/                   # request handlers
│   ├── services/
│   │   └── codeforces.service.js      # Codeforces API client
│   └── utils/                         # http/token/validation helpers
├── .env.example
└── package.json
```

## Getting started

```bash
cd WolfOutBackend
npm install

# Configure environment
cp .env.example .env
# then edit .env — set a strong JWT_SECRET:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# Seed the problems table from the CSV (optional — the server also
# auto-seeds on first boot if the table is empty)
npm run seed

# Run
npm start        # production
npm run dev      # watch mode (Node --watch)
```

Server defaults to `http://localhost:4000`.

## Environment variables

| Variable         | Default                         | Description                                   |
| ---------------- | ------------------------------- | --------------------------------------------- |
| `PORT`           | `4000`                          | HTTP port                                     |
| `NODE_ENV`       | `development`                   | `development` / `production`                  |
| `CORS_ORIGIN`    | `*`                             | `*` or comma-separated allow-list of origins  |
| `JWT_SECRET`     | *(dev fallback)*                | **Required in production**                     |
| `JWT_EXPIRES_IN` | `7d`                            | Token lifetime                                |
| `DB_PATH`        | `data/wolfout.db`               | SQLite file path                              |
| `PROBLEMS_CSV`   | `data/Final_database_to_upload.csv` | Seed CSV path                             |
| `CODEFORCES_API` | `https://codeforces.com/api`    | Codeforces API base URL                       |

## API reference

Base path: `/api`. Auth is via `Authorization: Bearer <token>`.

### Health

| Method | Path          | Auth | Description        |
| ------ | ------------- | ---- | ------------------ |
| GET    | `/api/health` | —    | Liveness check     |

### Auth

| Method | Path                | Auth | Body                                  | Description                       |
| ------ | ------------------- | ---- | ------------------------------------- | --------------------------------- |
| POST   | `/api/auth/register`| —    | `name, email, username, password`     | Create account, returns JWT       |
| POST   | `/api/auth/login`   | —    | `username, password`                  | Log in, returns JWT               |
| GET    | `/api/auth/me`      | ✅   | —                                     | Current user                      |
| PUT    | `/api/auth/handle`  | ✅   | `cfHandle`                            | Set/update Codeforces handle      |

### Problems

| Method | Path                 | Auth      | Description                                              |
| ------ | -------------------- | --------- | ------------------------------------------------------- |
| GET    | `/api/problems`      | optional  | List problems. If a token is sent, each item includes `solved`. |
| GET    | `/api/problems/tags` | —         | Distinct tags with counts                               |

`GET /api/problems` query params: `search`, `tag`, `solved` (`true`/`false`, auth
only), `sort` (`solvedCount`\|`name`\|`contest`\|`id`), `order` (`asc`\|`desc`),
`page`, `limit` (max 500).

### Progress (all require auth)

| Method | Path                              | Body                | Description                                        |
| ------ | --------------------------------- | ------------------- | -------------------------------------------------- |
| GET    | `/api/progress`                   | —                   | Progress summary (total, solved, %, by tag)        |
| POST   | `/api/progress/:problemId/solve`  | —                   | Mark a problem solved (manual)                     |
| DELETE | `/api/progress/:problemId/solve`  | —                   | Unmark a problem                                   |
| POST   | `/api/progress/sync`              | `cfHandle` (opt.)   | Sync solved problems from Codeforces               |

### Contact

| Method | Path           | Auth | Body                              | Description             |
| ------ | -------------- | ---- | --------------------------------- | ----------------------- |
| POST   | `/api/contact` | —    | `name, email, subject?, message`  | Store a contact message |

## Example requests

```bash
# Register
curl -X POST http://localhost:4000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ankit","email":"ankit@example.com","username":"ankitv","password":"secret123"}'

# List top problems
curl "http://localhost:4000/api/problems?sort=solvedCount&order=desc&limit=5"

# Sync solved problems from Codeforces (after setting a handle)
curl -X POST http://localhost:4000/api/progress/sync \
  -H "Authorization: Bearer <TOKEN>" \
  -H 'Content-Type: application/json' \
  -d '{"cfHandle":"tourist"}'
```

## Data model

- **users** — `id, name, email, username, password_hash, cf_handle, created_at`
- **problems** — `id, name, contest_id, problem_index, tags, solved_count` (unique on `contest_id, problem_index`)
- **user_problems** — join of user ↔ problem with `status`, `source` (`manual`/`codeforces`), `solved_at`
- **contact_messages** — stored contact-form submissions

## Notes

- The seed is **idempotent** (UPSERT on `contest_id, problem_index`), so re-running
  it refreshes tags/solved counts without creating duplicates.
- Passwords are hashed with bcrypt; login uses a constant-time-ish comparison
  path even for unknown users.
- `SELECT`/`ORDER BY` columns are whitelisted to avoid SQL injection.

## License

MIT
