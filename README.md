# SplitEase 💰

A production-grade Splitwise-style expense-splitting backend, built to demonstrate real-world backend engineering: authentication, algorithmic problem-solving, caching, containerization, and CI/CD — not just CRUD.

**Live API:** https://splitease-api-4q6k.onrender.com
**Live Demo (frontend):** https://splitwease.onrender.com

> ⚠️ Hosted on Render's free tier — the API may take up to 50 seconds to respond on the first request after a period of inactivity while it spins back up.

---

## Features

- **Authentication** — JWT access + refresh tokens with rotation, Google OAuth 2.0 (Passport.js), bcrypt password hashing
- **Groups & Expenses** — create groups, add members, log expenses with flexible splitting (equal / percentage / exact amount), all wrapped in DB transactions
- **Debt Simplification** — a greedy algorithm that computes the minimum set of transactions needed to settle a group, instead of naively tracking every individual debt
- **Redis Caching** — cache-aside pattern with invalidation for settlement calculations; Redis-backed rate limiting on auth endpoints
- **Settlement History** — an immutable ledger recording real payments between members
- **Group Invitations** — email-based invites with secure, expiring tokens
- **Recurring Expenses** — automatically generated on a schedule (daily/weekly/monthly) via a cron job
- **Multi-Currency Support** — expenses in any currency, converted to a base currency using live exchange rates (cached in Redis)
- **Minimal Frontend** — login/signup (with Google Sign-In), dashboard, and group detail pages for demoing the full flow

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js, Express.js |
| Database | PostgreSQL |
| Caching / Rate Limiting | Redis |
| Auth | JWT, Passport.js, Google OAuth 2.0, bcrypt |
| Scheduling | node-cron |
| Testing | Jest |
| Containerization | Docker, Docker Compose |
| CI/CD | GitHub Actions |
| Deployment | Render |

---

## Architecture

The backend follows a strict **layered architecture** to keep concerns separated and the codebase testable:

- **Controllers** handle HTTP concerns only (parsing requests, shaping responses)
- **Services** contain all business logic (validation, calculations, orchestration) and have no knowledge of HTTP or SQL
- **Repositories** are the only layer that talks to the database

This separation means the Service layer can be unit tested with mocked repositories — no real database connection required, which keeps the test suite fast and makes CI reliable.


---

## The Debt Simplification Algorithm

Instead of tracking every individual expense split as a separate debt, SplitEase computes each member's **net balance** (total paid − total owed), then uses a **greedy algorithm** to settle the group with the minimum practical number of transactions:

1. Separate members into creditors (net balance > 0) and debtors (net balance < 0)
2. Repeatedly match the largest creditor with the largest debtor
3. Settle the smaller of the two amounts, guaranteeing at least one person is fully settled per transaction
4. Repeat until everyone is at zero

This is `O(n log n)` and produces results very close to the mathematical optimum in practice — the true minimum-transaction problem is NP-hard in the general case (related to subset-sum partitioning), so a greedy heuristic is what real-world apps like Splitwise use.

---

## Local Setup

### Prerequisites
- Node.js 20+
- PostgreSQL
- Redis (or Memurai on Windows)

### Steps

```bash
git clone https://github.com/Piyusssshhh/SplitwEase.git
cd SplitwEase
npm install
```

Copy `.env.example` to `.env` and fill in your local database URL, JWT secret, and (optionally) Google OAuth credentials:

```bash
cp .env.example .env
```

Run the migrations in order against your database:

```bash
psql -U postgres -d splitease -f sql/001_users.sql
psql -U postgres -d splitease -f sql/002_groups_expenses.sql
psql -U postgres -d splitease -f sql/003_settlements.sql
psql -U postgres -d splitease -f sql/004_invitations.sql
psql -U postgres -d splitease -f sql/005_recurring_expenses.sql
psql -U postgres -d splitease -f sql/006_multi_currency.sql
```

Start the server:

```bash
npm run dev
```

The API will be available at `http://localhost:5000`.

### Running with Docker

```bash
docker compose up --build
```

This spins up the app, PostgreSQL, and Redis as separate containers, with migrations applied automatically on first startup.

### Running Tests

```bash
npm test
```

---

## API Overview

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create an account |
| POST | `/api/auth/login` | Log in |
| GET | `/api/auth/google` | Start Google OAuth flow |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/groups` | Create a group |
| GET | `/api/groups` | List your groups |
| GET | `/api/groups/:id` | Group detail + members |
| POST | `/api/groups/:id/members` | Add a member by email |
| POST | `/api/groups/:id/expenses` | Add an expense |
| GET | `/api/groups/:id/balances` | Net balances per member |
| GET | `/api/groups/:id/settlements` | Suggested minimal settlements |
| POST | `/api/groups/:id/settlements` | Record a real payment |
| GET | `/api/groups/:id/settlements/history` | Settlement history |
| POST | `/api/groups/:id/invite` | Send an email invitation |
| POST | `/api/groups/:id/recurring-expenses` | Create a recurring expense template |

---

## CI/CD

Every push to `main` triggers a GitHub Actions workflow that:
1. Installs dependencies and runs the full Jest test suite
2. Builds the Docker image to verify it builds cleanly

See `.github/workflows/ci.yml`.

---

## What This Project Demonstrates

- Layered architecture and separation of concerns
- Stateless auth with a secure token revocation strategy
- Algorithmic thinking applied to a real product problem
- Caching strategy and cache invalidation correctness
- Containerization and CI/CD, not just "code that runs on my machine"
- End-to-end deployment with a real, working live URL

---

## Author

**Piyush Kumar Singh**
[GitHub](https://github.com/Piyusssshhh)
