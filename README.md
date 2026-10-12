<div align="center">

<img src="web/public/favicon.svg" width="96" alt="Daymark mark" />

# Daymark

**Personal tasks, from signup to your dashboard.**

A full-stack take-home: a **React + TypeScript** web app and an **Express** API. Users register with email and password, stay signed in through rotating refresh sessions, and manage only their own tasks — search, filter, edit, and mark them complete.

**Live app:** [task-manager-nine-sigma-49.vercel.app](https://task-manager-nine-sigma-49.vercel.app/login) · **API:** [task-manager-300v.onrender.com](https://task-manager-300v.onrender.com)

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://docs.docker.com/compose/)

</div>

---

## Table of contents

- [Reviewer quick start](#reviewer-quick-start)
- [Overview](#overview)
- [Product scope](#product-scope)
- [Key features](#key-features)
- [How it works](#how-it-works)
- [Try the app](#try-the-app)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [API](#api)
- [Testing and quality](#testing-and-quality)
- [Project structure](#project-structure)
- [Documentation map](#documentation-map)

---

## Reviewer quick start

**Goal:** open the live app, sign in with the demo account, and walk the task list. Local setup is in [Getting started](#getting-started).

| | |
| --- | --- |
| **Web** | <https://task-manager-nine-sigma-49.vercel.app/login> |
| **API** | <https://task-manager-300v.onrender.com> |
| **Health** | <https://task-manager-300v.onrender.com/health> |

Sign in with the [demo account](#demo-account) below. The API on Render may take a few seconds to wake up on the first request.

### Demo account

Sign in on the live app with this account. The tasks below are on that user.

| Field | Value |
| --- | --- |
| **Name** | Demo User |
| **Email** | <Demo@user.com> |
| **Password** | demouser123 |

**Run it locally** (optional):

| Step | Action |
| --- | --- |
| 1 | Install [Node.js 22+](https://nodejs.org/), [pnpm](https://pnpm.io/) 11+, and PostgreSQL 16. Create the development database (see [Getting started](#getting-started)) |
| 2 | Copy `server/.env.example` to `server/.env`. Set `DATABASE_URL`, `FRONTEND_ORIGIN`, and two **different** secrets (`ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET`), each at least 32 characters |
| 3 | For the split local ports below, set `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true` |
| 4 | From `server/`: `pnpm install`, `pnpm db:migrate`, `pnpm dev` — API on `http://localhost:8080` |
| 5 | Copy `web/.env.example` to `web/.env` (`VITE_API_BASE_URL=http://localhost:8080`) |
| 6 | From `web/`: `pnpm install`, `pnpm dev` — open the Vite URL, normally `http://localhost:5173` |
| 7 | Register a new email, land on **My tasks**, add a task, mark it completed, refresh the page (still signed in), then sign out |

Detailed steps: [server/README.md](./server/README.md) | [web/README.md](./web/README.md).

---

## Overview

Daymark is a personal task list. The first journey is account creation, a cookie session, and a dashboard that lists, filters, and updates only the signed-in user’s tasks. The web app is **React** (Vite, React Router). The API is **validated with Zod**, backed by **PostgreSQL** through **Drizzle ORM**, and keeps access and refresh tokens in **HttpOnly cookies**.

```text
  Register  -->  Cookie session  -->  My tasks  -->  Create / edit / complete / delete
```

| | |
| --- | --- |
| **Web** | React 19, TypeScript, Vite, Tailwind CSS, React Router |
| **API** | Express 5, Zod validation, JWT access + refresh cookies, Drizzle ORM |
| **Data** | PostgreSQL 16 |
| **Session** | `accessToken` (30 minutes) and `refreshToken` (7 days), both HttpOnly |

A shared [demo account](#demo-account) is on the live app. Passwords are stored only as bcrypt hashes. You can also register a new email on `/register`.

---

## Product scope

These diagrams are the assignment scope this repository implements.

### Frontend — React + TypeScript

<img src="web/public/Frontend.png" alt="Frontend scope: authentication with registration and login, and a task dashboard that lists, adds, edits, deletes, and completes tasks" width="720" />

| Area | In the app |
| --- | --- |
| **Authentication** | `/register` and `/login`. A signed-in user is sent to `/tasks`. A signed-out user who opens `/tasks` is sent to `/login`. |
| **Task dashboard** | List of owned tasks, add, edit, delete (with confirmation), and mark a task pending, in progress, or completed. |
| **Also on the dashboard** | Title search, status tabs, due-date range, pagination, empty and error states, light and dark theme. |

### Backend — Node.js + Express + TypeScript

<img src="server/assets/Backend.png" alt="Backend scope: JWT authentication with login, registration, refresh, and me, plus task CRUD" width="720" />

| Area | Routes |
| --- | --- |
| **Authentication** | `POST /register`, `POST /login`, `POST /refresh`, `POST /logout`, `GET /me` |
| **Tasks** | `GET /tasks`, `POST /tasks`, `GET /tasks/:id`, `PATCH /tasks/:id`, `DELETE /tasks/:id` |
| **Health** | `GET /health` checks the API process and the database |

Tokens are JWTs. The browser never reads them: both are set as HttpOnly cookies. `GET /me` returns `{ id, name, email }` and is how the web app restores a session on load.

### Database

<img src="server/assets/Database.png" alt="Database diagram: users, tasks, and refresh_sessions with user_id foreign keys" width="720" />

| Table | Role |
| --- | --- |
| **users** | `id`, `name`, unique `email`, `password_hash`, timestamps |
| **tasks** | Owned by `user_id`. `title`, optional `description`, `status` (`pending`, `in_progress`, `completed`), required `due_date`, timestamps |
| **refresh_sessions** | One row per refresh session: hashed token, expiry, optional `revoked_at`. Logout and rotation update this row |

Deleting a user cascades to that user’s tasks and refresh sessions. Task queries are always scoped by the authenticated user id. Another user’s task id returns `404`.

---

## Key features

### Authentication

- Register with name, email, and password (minimum 8 characters, at most 72 UTF-8 bytes). Email is trimmed and stored lowercase.
- Login checks the bcrypt hash and sets both session cookies.
- `POST /refresh` rotates the refresh token and replaces the stored hash. The previous refresh token stops working.
- `POST /logout` revokes the current refresh session and clears both cookies.
- Registration, login, and refresh are limited to **30 requests per 15 minutes** per client. The limit is skipped when `NODE_ENV=test`.
- The web app restores the user with `GET /me`. If the access token is expired, one in-flight refresh runs and the original request is retried once.

### Task dashboard

- Lists the signed-in user’s tasks, 10 per page, sorted by due date ascending and then newest creation first.
- Status tabs: all, to do (`pending`), in progress, done (`completed`). Any status can change to any other status.
- Search matches the title (case-insensitive). Due-date from/to filters the calendar date.
- Search, status, date range, and page live in the dashboard URL, so a filtered view can be reloaded or shared on the same browser session.
- Create and edit share one form. Title and due date are required. Description is optional.
- Delete asks for confirmation. Overdue, due today, and due tomorrow are labeled on each card.
- Press `/` to focus search. Light and dark theme is stored in `localStorage` under `daymark-theme`.

### Platform

| Capability | Detail |
| --- | --- |
| **Secure session** | JWTs in HttpOnly cookies (`accessToken`, `refreshToken`). JavaScript stores only the public user summary in memory. |
| **Cross-origin local dev** | Vite on `:5173`, API on `:8080`, credentialed CORS for `FRONTEND_ORIGIN` only. |
| **Cookies for that split** | `COOKIE_SAME_SITE=none` and `COOKIE_SECURE=true`. Chrome and Edge treat `http://localhost` as a secure context. |
| **Contract** | Success bodies use `{ "data": ... }`. Errors use `{ "error": { "code", "message", "fields?" } }`. |
| **Migrations** | Drizzle Kit. The schema reset migration recreates `users`, `tasks`, and `refresh_sessions`. Applying it **deletes existing rows**. Use it on a local database you can recreate. |

---

## How it works

```mermaid
sequenceDiagram
    participant Browser as Web app
    participant API as Express API
    participant DB as PostgreSQL

    Browser->>API: POST /register or POST /login
    API->>DB: User row and refresh session (hashed token)
    API-->>Browser: HttpOnly access and refresh cookies
    Browser->>API: GET /me
    API-->>Browser: id, name, email
    Browser->>API: GET /tasks?page&status&search&dueFrom&dueTo
    Browser->>API: POST /tasks, PATCH /tasks/:id, DELETE /tasks/:id
    Note over Browser,API: On 401, POST /refresh once, then retry
    Browser->>API: POST /logout
    API->>DB: Revoke refresh session
```

**Happy path:** Register → **My tasks** → add a task → filter or search → mark it completed → reload the page (still signed in) → sign out → `/login`.

**Expired access token:** The next API call returns `401`. The Axios client calls `POST /refresh` once, stores the new cookies, and retries the original request. If refresh fails, the app returns to the login screen.

---

## Try the app

| Surface | URL |
| --- | --- |
| **Live web app** | <https://task-manager-nine-sigma-49.vercel.app/login> |
| **Live API** | <https://task-manager-300v.onrender.com> |
| **Live health** | <https://task-manager-300v.onrender.com/health> |
| **Local web app** | <http://localhost:5173> (after `pnpm dev` in `web/`) |
| **Local API** | <http://localhost:8080> |

### What to click

1. Open the [live login page](https://task-manager-nine-sigma-49.vercel.app/login) and sign in as **<Demo@user.com>** with password **demouser123**.
2. You should land on **My tasks** and see the five tasks above.
3. Filter by status, search for “demo”, and narrow the due-date range. The URL query updates with the filter.
4. **Add task**, edit one title, mark a pending task completed, then delete a task you added and confirm.
5. Reload the page. You should still be signed in.
6. Sign out. `/tasks` should send you back to `/login`.

---

## Architecture

```text
+------------------+       HTTP + cookies      +---------------------------+
|  Vite / React    |  --------------------->   |  Express API  :8080       |
|  React Router    |   credentialed CORS       |  Zod + JWT + modules      |
|  Axios           |                           +-------------+-------------+
+------------------+                                         |
        :5173                                                v
                                               +-------------+-------------+
                                               |  PostgreSQL 16            |
                                               |  users, tasks, sessions   |
                                               +---------------------------+
```

The browser calls the API on the host. `VITE_API_BASE_URL` defaults to `http://localhost:8080`, which exercises the same cross-origin cookie path as a split deploy. Set `VITE_API_BASE_URL=/api` only if you want the optional Vite proxy instead.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| **Web** | React 19, TypeScript, Vite 8, React Router 7, Tailwind CSS 4 |
| **Web UI** | Radix / Base UI primitives, Lucide icons, light and dark theme |
| **Web data** | Axios with `withCredentials`, one shared refresh for concurrent `401`s |
| **API** | Node.js, Express 5, TypeScript, Zod |
| **Data** | PostgreSQL 16, Drizzle ORM, `drizzle-kit` migrations |
| **Auth** | bcrypt passwords, `jose` JWTs, hashed refresh sessions |
| **Limits** | `express-rate-limit` on register, login, and refresh |
| **Tests** | Vitest, React Testing Library, Supertest |
| **Docker** | Compose, used only to run PostgreSQL for tests |

---

## Getting started

### Prerequisites

- PostgreSQL 16
- [Node.js 22+](https://nodejs.org/)
- [pnpm](https://pnpm.io/) 11+

### 1. Create the database

Use your local PostgreSQL 16 server. Create a development database (for example `task_manager`) and point `DATABASE_URL` at it. Backend tests need a second, disposable database in `TEST_DATABASE_URL`.

### 2. Configure and run the API

```bash
cd server
cp .env.example .env
pnpm install
pnpm db:migrate
pnpm dev
```

`server/.env` for this local split (replace the two secrets with your own, and keep them different):

```env
NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/task_manager
TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/task_manager_test
FRONTEND_ORIGIN=http://localhost:5173
ACCESS_TOKEN_SECRET=replace-with-a-random-string-at-least-32-characters
REFRESH_TOKEN_SECRET=replace-with-a-different-random-string-32-chars
ACCESS_TOKEN_TTL_SECONDS=1800
REFRESH_TOKEN_TTL_SECONDS=604800
COOKIE_SAME_SITE=none
COOKIE_SECURE=true
```

The API listens on `http://localhost:8080`. `GET /health` returns `{ "data": { "server": "ok", "database": "ok" } }` when Postgres is reachable.

| Variable | Purpose | Default |
| --- | --- | --- |
| `NODE_ENV` | `development`, `test`, or `production` | `development` |
| `PORT` | HTTP port | `8080` |
| `DATABASE_URL` | PostgreSQL URL for the API | Required |
| `TEST_DATABASE_URL` | Disposable database for `pnpm test` | Required by tests |
| `FRONTEND_ORIGIN` | Exact browser origin allowed to send cookies | `http://localhost:5173` |
| `ACCESS_TOKEN_SECRET` | Access-token signing secret, 32+ characters | Required |
| `REFRESH_TOKEN_SECRET` | Refresh-token signing secret; must differ from the access secret | Required |
| `ACCESS_TOKEN_TTL_SECONDS` | Access-token lifetime | `1800` (30 minutes) |
| `REFRESH_TOKEN_TTL_SECONDS` | Refresh-token lifetime | `604800` (7 days) |
| `COOKIE_SAME_SITE` | `lax`, `strict`, or `none` | `lax` in development, `none` in production if unset |
| `COOKIE_SECURE` | Send cookies only on secure connections | `false` in development, `true` in production if unset |

`COOKIE_SAME_SITE=none` requires `COOKIE_SECURE=true`. For this localhost setup, set both explicitly as in the sample above. In production, set `FRONTEND_ORIGIN` to the real web origin and serve the API over HTTPS.

Startup refuses to boot if a required variable is missing, if a secret is shorter than 32 characters, or if the two secrets are the same.

### 3. Configure and run the web app

In a second terminal:

```bash
cd web
cp .env.example .env
pnpm install
pnpm dev
```

`web/.env`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

Open the URL Vite prints, normally `http://localhost:5173`.

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | API origin the browser calls. Default in `.env.example` is `http://localhost:8080`. |

For a hosted API, set `VITE_API_BASE_URL` to that origin at build time. The API must allow that frontend origin with credentialed CORS and must issue `SameSite=None; Secure` cookies when the UI and API are on different sites.

---

## API

All successful JSON responses use a `data` property. All errors use an `error` property with `code`, `message`, and optional `fields`. Validation failures return `400`. Unauthenticated task calls return `401`. Unknown and non-owned task ids both return `404`.

| Method | Path | Auth | Behavior |
| --- | --- | --- | --- |
| `GET` | `/health` | No | API and database check. `503` when the database is down. |
| `POST` | `/register` | No | `{ "name", "email", "password" }`. Creates the user and session cookies. `201`. |
| `POST` | `/login` | No | `{ "email", "password" }`. Sets session cookies. |
| `POST` | `/refresh` | Refresh cookie | Rotates the refresh session and sets new cookies. |
| `POST` | `/logout` | Refresh cookie | Revokes the session and clears both cookies. `204`. |
| `GET` | `/me` | Access cookie | `{ "data": { "user": { "id", "name", "email" } } }`. |
| `GET` | `/tasks` | Access cookie | Owned tasks. Query: `page`, `pageSize` (max 100), `status`, `dueFrom`, `dueTo`, `search`. |
| `POST` | `/tasks` | Access cookie | `{ "title", "dueDate", "description?" }`. Status starts as `pending`. `201`. |
| `GET` | `/tasks/:id` | Access cookie | One owned task. |
| `PATCH` | `/tasks/:id` | Access cookie | Non-empty subset of `title`, `description`, `dueDate`, `status`. |
| `DELETE` | `/tasks/:id` | Access cookie | Deletes an owned task. `204`. |

Dates are calendar dates, `YYYY-MM-DD`. Status values are `pending`, `in_progress`, and `completed`.

Example list:

```json
{
  "data": {
    "items": [],
    "pagination": { "page": 1, "pageSize": 10, "totalItems": 0, "totalPages": 0 }
  }
}
```

Example error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Check the highlighted fields.",
    "fields": { "title": "Title is required." }
  }
}
```

Example filtered list:

`GET /tasks?page=1&pageSize=10&status=in_progress&dueFrom=2026-10-01&dueTo=2026-10-31&search=report`

---

## Testing and quality

Frontend tests mock HTTP and do not need PostgreSQL. Backend tests apply migrations to `TEST_DATABASE_URL` and clear users, tasks, and refresh sessions between cases. **Never point `TEST_DATABASE_URL` at the development database.**

```bash
cd web && pnpm install && pnpm exec tsc -b --pretty false && pnpm run lint && pnpm test
cd server && pnpm install && pnpm run build && pnpm test
```

| Check | Command | Where |
| --- | --- | --- |
| Web typecheck and production build | `pnpm build` | `web/` |
| Web lint | `pnpm lint` | `web/` |
| Web tests | `pnpm test` | `web/` |
| API compile | `pnpm build` | `server/` |
| API tests | `pnpm test` | `server/` |
| API tests in watch mode | `pnpm test:watch` | `server/` |
| Generate a migration | `pnpm db:generate` | `server/` |
| Apply migrations | `pnpm db:migrate` | `server/` |

Web tests cover registration and login validation, session restore, dashboard loading and empty states, create / edit / delete / status changes, filters and pagination, and API error display.

API tests cover registration and login, cookie issuance, refresh rotation, logout, `/me`, task CRUD, required-field validation, unauthenticated requests, and cross-user ownership.

---

## Project structure

```text
earnest-data-analytics/
├── web/                         # React app (Daymark)
│   ├── public/
│   │   ├── favicon.svg
│   │   └── Frontend.png         # Frontend scope diagram
│   ├── src/
│   │   ├── auth/                # AuthProvider, session restore
│   │   ├── components/          # Routes, theme, form and dashboard UI
│   │   ├── lib/                 # Axios client, task and auth API, types
│   │   ├── pages/               # Login, register, dashboard, task dialog
│   │   └── test/                # Vitest setup
│   ├── .env.example
│   └── README.md
├── server/                      # Express API
│   ├── src/
│   │   ├── app/
│   │   │   ├── auth/            # Register, login, refresh, logout, /me
│   │   │   ├── tasks/           # Task CRUD
│   │   │   ├── errors/          # Error envelope
│   │   │   └── validation/      # Zod parse helper
│   │   ├── db/                  # Drizzle client and schema
│   │   └── server.ts            # Process entry
│   ├── drizzle/                 # SQL migrations
│   ├── assets/
│   │   ├── Backend.png          # API scope diagram
│   │   └── Database.png         # Schema diagram
│   ├── .env.example
│   └── README.md
├── docker-compose.yml           # PostgreSQL for tests only
└── README.md                    # This file
```

### Web routes

| Path | Who can open it |
| --- | --- |
| `/` | Redirects to `/tasks` when signed in, otherwise `/login` |
| `/login`, `/register` | Signed-out visitors. Signed-in visitors go to `/tasks` |
| `/tasks` | Signed-in users. Query: `page`, `status`, `dueFrom`, `dueTo`, `search` |

---

## Documentation map

| Document | Use when |
| --- | --- |
| [README.md](./README.md) | Run the full app, read the API, and see the scope diagrams |
| [server/README.md](./server/README.md) | Environment variables, migrations, and API details |
| [web/README.md](./web/README.md) | Vite, `VITE_API_BASE_URL`, routes, and frontend tests |
| `GET /health` | Confirm the API and database after `pnpm dev` |

---

<div align="center">

<img src="web/public/favicon.svg" width="48" alt="Daymark" />

**Daymark** — React, Express, and PostgreSQL for a personal task list.

</div>
