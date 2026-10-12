# Task Management System

Assignment project with a React and TypeScript frontend and an Express, TypeScript, and PostgreSQL backend.

## Run locally

### Backend

1. Follow [`server/README.md`](server/README.md) to configure PostgreSQL, copy the backend `.env.example`, and apply migrations.
2. In a terminal, run:

   ```powershell
   cd server
   pnpm install
   pnpm dev
   ```

The API listens on `http://localhost:8080` by default.

### Frontend

1. Copy `web/.env.example` to `web/.env`.
2. In a second terminal, run:

   ```powershell
   cd web
   pnpm install
   pnpm dev
   ```

Open the local URL printed by Vite, normally `http://localhost:5173`. By default the browser calls `http://localhost:8080` directly (cross-origin), so local CORS and `SameSite=None; Secure` cookies behave like a split frontend/API deploy.

Match the backend `.env` to that setup: `FRONTEND_ORIGIN=http://localhost:5173`, `COOKIE_SAME_SITE=none`, and `COOKIE_SECURE=true`. For production, set `VITE_API_BASE_URL` to the hosted API origin and keep the backend origin/cookie settings aligned with the deployed frontend.

## Checks

- Frontend: from `web/`, run `pnpm lint`, `pnpm build`, or `pnpm test`.
- Backend: from `server/`, run `pnpm build` or `pnpm test`. Backend tests require a separate disposable PostgreSQL test database; see `server/README.md`.

Deployment is outside the current assignment scope.
