# Daymark frontend

React, TypeScript, and Vite frontend for the Task Management System assignment.

## Local setup

1. Install Node.js and pnpm.
2. From this directory, install packages with `pnpm install`.
3. Copy `.env.example` to `.env`. The default `VITE_API_BASE_URL=http://localhost:8080` calls the API directly so CORS and cross-site cookies match a real split deploy.
4. Start the backend by following [`../server/README.md`](../server/README.md). Use `FRONTEND_ORIGIN=http://localhost:5173`, `COOKIE_SAME_SITE=none`, and `COOKIE_SECURE=true` locally.
5. Run `pnpm dev` and open the URL printed by Vite (usually `http://localhost:5173`).

For a separately hosted API, set `VITE_API_BASE_URL` to that origin when building. The backend must allow the frontend origin with credentialed CORS and issue cookies that match the environment (`SameSite=None; Secure` when the UI and API are on different sites).

## Commands

- `pnpm dev` starts the development server.
- `pnpm build` type-checks and builds the frontend.
- `pnpm lint` checks the source with ESLint.
- `pnpm test` runs frontend tests with Vitest and React Testing Library.

Frontend tests mock HTTP responses and do not need PostgreSQL. Backend integration tests use a separate disposable PostgreSQL database; see the server README before running them.

## Frontend behavior

- `/login` and `/register` are public routes; `/tasks` requires a signed-in user.
- The app restores the session through `/me`; Axios sends the HttpOnly cookies and refreshes once after an expired access token.
- Task search, status, due-date range, and page are represented in the dashboard URL.
- Task create and edit use the same responsive form; deletion asks for confirmation.
