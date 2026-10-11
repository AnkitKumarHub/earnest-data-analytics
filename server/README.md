# Task Management API

Express and TypeScript backend for the task management assignment. PostgreSQL is accessed through Drizzle ORM.

## Local setup

1. Install Node.js and PostgreSQL.
2. From this directory, install packages with `pnpm install`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL`, `FRONTEND_ORIGIN`, and two different random token secrets (each at least 32 characters).
4. Create the database named in `DATABASE_URL`.
5. Run `pnpm db:migrate` to apply the schema, then `pnpm dev` to start the API on the configured port.

The initial scaffold migration is followed by a reset migration that drops the test-only `users` table and recreates the clean assignment schema. **Applying that reset migration deletes existing user rows.** This is intentional for the test-only schema authorized for this assignment. Do not point it at data you need to keep.

## Environment variables

| Variable | Purpose | Default |
|---|---|---|
| `NODE_ENV` | `development`, `test`, or `production` | `development` |
| `PORT` | HTTP port | `8080` |
| `DATABASE_URL` | PostgreSQL connection URL | Required |
| `TEST_DATABASE_URL` | Disposable PostgreSQL database for integration tests | Required by tests |
| `FRONTEND_ORIGIN` | Exact origin allowed to make credentialed browser requests | `http://localhost:5173` |
| `ACCESS_TOKEN_SECRET` | Access-token signing secret | Required, 32+ characters |
| `REFRESH_TOKEN_SECRET` | Refresh-token signing secret; must differ from access secret | Required, 32+ characters |
| `ACCESS_TOKEN_TTL_SECONDS` | Access-token lifetime | `1800` (30 minutes) |
| `REFRESH_TOKEN_TTL_SECONDS` | Refresh-token lifetime | `604800` (7 days) |
| `COOKIE_SAME_SITE` | Cookie cross-site policy: `lax`, `strict`, or `none` | Local: `lax`; production: `none` |
| `COOKIE_SECURE` | Send cookies only over secure connections | Local: `false`; production: `true` |

In production, set the frontend's exact origin and serve the API over HTTPS. The default production cookie policy is `SameSite=None; Secure`, for a frontend and backend hosted on different sites. Browsers send Secure cookies only over secure connections; cross-site cookie use may also be affected by browser privacy settings.

## API

All successful JSON responses use a `data` property. All errors use an `error` property with `code`, `message`, and optional field messages.

| Method | Path | Input / behavior |
|---|---|---|
| `GET` | `/health` | Checks the API process and database connection; returns `503` if the database is unavailable. |
| `POST` | `/register` | `{ "name", "email", "password" }`; creates an account and session cookies. |
| `POST` | `/login` | `{ "email", "password" }`; creates session cookies. |
| `POST` | `/refresh` | Rotates the refresh cookie and issues a new access cookie. |
| `POST` | `/logout` | Revokes the current refresh session and clears both cookies. |
| `GET` | `/me` | Returns the signed-in user's `{ id, name, email }`. |
| `GET` | `/tasks` | Lists owned tasks. Supports `page`, `pageSize` (max 100), `status`, `dueFrom`, `dueTo`, and `search` (title substring). |
| `POST` | `/tasks` | `{ "title", "dueDate", "description?" }`; status starts as `pending`. Date format is `YYYY-MM-DD`. |
| `GET` | `/tasks/:id` | Returns one owned task. |
| `PATCH` | `/tasks/:id` | Updates a non-empty subset of `title`, `description`, `dueDate`, and `status`. |
| `DELETE` | `/tasks/:id` | Deletes an owned task. |

Task statuses are `pending`, `in_progress`, and `completed`; any status can be changed to any other status. Task descriptions are optional. A task cannot be accessed or changed by another user; unknown and non-owned IDs both return `404`.

Registration, login, and refresh requests are limited to 30 attempts per 15 minutes per client. The limit is skipped in the automated test environment.

Example paged list response:

```json
{
  "data": {
    "items": [],
    "pagination": { "page": 1, "pageSize": 10, "totalItems": 0, "totalPages": 0 }
  }
}
```

## Migrations and tests

- `pnpm db:generate` generates a migration from the Drizzle schema.
- `pnpm db:migrate` applies migrations using `DATABASE_URL`.
- `pnpm build` compiles TypeScript.
- `pnpm test` runs Vitest and applies migrations using `TEST_DATABASE_URL`.
- `pnpm test:watch` runs Vitest in watch mode.

Tests require a separate disposable PostgreSQL database. The test setup migrates that database and clears users, tasks, and refresh sessions between tests. Never set `TEST_DATABASE_URL` to the development or production database.
