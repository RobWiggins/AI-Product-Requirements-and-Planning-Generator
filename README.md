# StoryFlow

**Live:** [https://storyflow-gamma.vercel.app/](https://storyflow-gamma.vercel.app/)

An AI-powered product planning app. A visitor describes an idea in plain language; the server asks Claude for a structured **ProjectBlueprint** (PRD, epics, user stories, Gherkin, tasks, priorities). Guests and signed-in users can edit that plan in the browser and persist it to PostgreSQL.

This repository is an npm workspace:

| Package | Role | Default URL |
| --- | --- | --- |
| `client/` | React 19 + Vite + Redux Toolkit UI | `http://localhost:3000` |
| `server/` | Express API, Prisma, Anthropic, OAuth | `http://localhost:3001` |

Production today: static client on **Vercel**, API on **Heroku**, Postgres from **Heroku Postgres**. The browser always talks to `/api` on the client origin. Vite proxies that path in development; `client/vercel.json` rewrites it to the Heroku app in production so the `sf_session` cookie stays first-party.

---

## Contents

1. [Quick start](#quick-start)
2. [Architecture](#architecture)
3. [Environment](#environment)
4. [Database](#database)
5. [Auth](#auth)
6. [HTTP API](#http-api)
7. [Generation](#generation)
8. [Client](#client)
9. [Tests](#tests)
10. [Deploy](#deploy)
11. [Security](#security)
12. [Product and UX](#product-and-ux)
13. [Accessibility](#accessibility)
14. [Performance](#performance)
15. [Observability](#observability)
16. [Operations notes](#operations-notes)
17. [Contributing](#contributing)

---

## Quick start

Prerequisites: Node 20+, npm 10+, PostgreSQL 14+ (local role and database named `storyflow` by default), an Anthropic API key.

```bash
git clone <this-repo>
cd AI-Product-Requirements-and-Planning-Generator
npm install
cp server/.env.example server/.env   # fill PG* and ANTHROPIC_API_KEY
createdb storyflow                   # or create via psql
npm run prisma:deploy --workspace=server
```

Run API and UI in two terminals:

```bash
npm run dev:server    # http://localhost:3001
npm run dev:client    # http://localhost:3000  (proxies /api → :3001)
```

Open `http://localhost:3000`. Continue as Guest needs no extra config. Google/GitHub stay disabled until their client id and secret are set.

```bash
npm test
```

---

## Architecture

```
Browser (Vite / Vercel)
  └─ fetch("/api/...", { credentials: "include" })
        │
        ├─ local:  Vite proxy  →  Express :3001
        └─ prod:   Vercel rewrite → Heroku web dyno
                        │
                        ├─ cookie session → users / sessions / auth_identities
                        ├─ CRUD           → projects and child tables
                        └─ POST /search   → in-memory job + Anthropic Claude
```

Important constraints:

- The client never holds an Anthropic key. Generation is server-side.
- Session is an **httpOnly** cookie (`sf_session`). Paths are relative (`/api/...`) so the cookie is same-origin.
- `CLIENT_URL` is where OAuth redirects the browser after sign-in. `API_PUBLIC_URL` is the origin Google/GitHub call back into. Locally both are `http://localhost:3000` so the callback hits the Vite proxy and the cookie is set on the UI origin.
- Prisma 7 talks to Postgres through `@prisma/adapter-pg`. Heroku requires TLS; the adapter enables `ssl` when `DATABASE_URL` is set.

Data model (simplified):

```
users ─1:N─ projects ─1:1─ product_requirements_documents
                       ├─1:N─ epics ─1:N─ user_stories ─1:N─ gherkin_scenarios
                       │                              └─1:N─ tasks
                       └─1:N─ priorities
users ─1:N─ auth_identities, sessions
```

Guests are real `users` rows with `is_guest = true` and no identity. Linking Google/GitHub later upgrades that same UUID so their projects stay theirs.

---

## Environment

Never commit `.env` files. `server/.env.example` is the source of truth.

| Variable | Where | Purpose |
| --- | --- | --- |
| `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` | server | Local Postgres. Used when `DATABASE_URL` is absent. |
| `DATABASE_URL` | server / Heroku | Takes precedence. Heroku Postgres sets this. |
| `PORT` | server | Listen port. Heroku injects this; do not pin it in production config. |
| `NODE_ENV` | server | `production` enables `trust proxy` and `Secure` cookies. |
| `ANTHROPIC_API_KEY` | server | Claude. Required for `/api/search`. |
| `CLIENT_URL` | server | Browser origin. OAuth success/error redirects here. |
| `API_PUBLIC_URL` | server | Public API origin used to build OAuth redirect URIs. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | server | Optional. Blank → Google shown as unavailable. |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | server | Optional. |
| `SESSION_COOKIE_NAME` | server | Default `sf_session`. |
| `SESSION_TTL_DAYS` | server | Default `30`. |
| `CONFIG_API_TARGET` | client (Vite only) | Dev proxy target. Default `http://localhost:3001`. |

OAuth redirect URIs (exact match, no trailing slash):

```
${API_PUBLIC_URL}/api/auth/google/callback
${API_PUBLIC_URL}/api/auth/github/callback
```

In production that is the **Vercel origin**, not the Heroku hostname, because the browser and cookie live on Vercel.

---

## Database

Migrations live in `server/prisma/migrations`. Schema is `server/prisma/schema.prisma`. Generated client is `server/src/generated/prisma` (gitignored; rebuilt by `postinstall` / `prisma generate`).

```bash
npm run prisma:generate --workspace=server   # regenerate client
npm run prisma:validate --workspace=server
npm run prisma:migrate --workspace=server    # local: create/apply
npm run prisma:deploy --workspace=server     # prod: apply committed SQL
npm run prisma:rollback --workspace=server   # latest down.sql
npm run prisma:rollback:all --workspace=server
npm run prisma:studio --workspace=server
```

On Heroku, quote npm scripts so the CLI does not swallow `run`:

```bash
heroku run "npm run prisma:deploy" --app <app>
```

`GRANT … TO storyflow` in older migrations is wrapped so it only runs when that role exists. Heroku’s role is the addon user, not `storyflow`.

Do not edit applied migration SQL after it has run in production unless you also repair `_prisma_migrations` checksums. Prefer a new migration.

---

## Auth

| Method | Route | Notes |
| --- | --- | --- |
| Guest | `POST /api/auth/guest` | Creates a user + session. Idempotent if already signed in. |
| Google | `GET /api/auth/google` | Browser navigation. CSRF state in an httpOnly cookie. |
| GitHub | `GET /api/auth/github` | Same pattern. |
| Session | `GET /api/auth/me` | 401 when signed out. Guests count as authenticated. |
| Logout | `POST /api/auth/logout` | Revokes the server session and clears the cookie. |
| Providers | `GET /api/auth/providers` | `{ guest, google, github }` booleans for the login screen. |

Cookie flags: `httpOnly`, `SameSite=Lax`, `Secure` in production, `path=/`. The raw token is never stored; only its SHA-256 hash is in `sessions`.

`GET /api/auth/me` returning 401 on first paint is expected. The UI then offers Guest / Google / GitHub.

---

## HTTP API

All JSON. Authenticated routes use `requireAuth` (401 + `{ error }`). Another user’s project is **404**, not 403, to avoid leaking ids.

**Health**

- `GET /api/health` — `{ status, db }` (503 if Postgres is down)

**Auth** — see above.

**Projects** (`/api/projects`, all require a session)

- `GET /` — summaries, newest first
- `POST /` — body is a stored blueprint → 201
- `GET /:id` — full blueprint
- `PUT /:id` — replace (autosave)
- `DELETE /:id` — 204

**Generation**

- `POST /api/search` `{ "description": "..." }` → **202** `{ jobId }`
- `GET /api/search/:jobId` → `{ status: "pending" \| "complete" \| "error", projectBlueprint?, error? }`

Validation errors return 400 with Zod `issues` when the body is a blueprint. Unexpected exceptions go through `errorHandler` (500, message hidden).

---

## Generation

`POST /api/search` returns immediately so Vercel’s rewrite (and Heroku’s 30s router timeout on a single held request) does not kill the call. Claude runs in the background on the web dyno. The client polls every 1.5s for up to 3 minutes (`client/src/lib/api.ts`).

Jobs are an **in-memory `Map`** (`server/src/generation.ts`), scoped to the requesting user, TTL 15 minutes. Consequences:

- One web dyno: fine.
- Dyno restart or a second dyno: in-flight polls 404. Treat as “try again”.
- `ts-node-dev` restarts wipe the map locally. Do not save server files while a draft is running.

The model is `claude-opus-4-7` with JSON-schema structured output. Connection errors to Anthropic are retried. Typical wall-clock for a full blueprint has been on the order of **50–90s**.

Do not generate without a session. The route is behind `requireAuth` because each call costs money.

---

## Client

- React 19, Vite 6, Tailwind 4, Redux Toolkit, Motion, Lucide.
- Entry: `client/src/main.tsx` → `App.tsx` (auth gate) → `LoginScreen` or `Workspace`.
- State: `auth`, `projects`, `blueprint` slices. Autosave of edits is debounced in `Workspace`.
- Tweaks (accent hue, serif) are local React state, not persisted.

Always send `credentials: "include"`. Never call Anthropic from the bundle.

If you add a second API host, you must also change cookie `Domain` / `SameSite` and CORS. `vercel.app` and `herokuapp.com` cannot share cookies.

---

## Tests

Jest runs two projects (`jest.config.ts`): Node + Supertest against the real local `storyflow` database, and jsdom for the UI.

```bash
npm test
npm run test:watch
npm run test:coverage
```

Server tests create guest users and delete them in `afterAll`. Point them at a disposable database, not production.

UI tests mock `fetch` with a tiny method+path router. New endpoints need a mock in `tests/client/App.test.tsx` (and related files) or they 404 in jsdom.

---

## Deploy

### Client (Vercel)

- Root directory: `client`
- Build: `npm run build` (`tsc && vite build`)
- `client/vercel.json` rewrites `/api/:path*` to the Heroku app URL
- After changing the rewrite destination or the poll/generation client, redeploy Vercel

### API (Heroku)

```bash
# once
heroku git:remote -a <app> --remote heroku-server   # or git remote add heroku-server https://git.heroku.com/<app>.git

# each release (from repo root, after commit)
git subtree push --prefix server heroku-server main
```

`prisma` is a **devDependency**. The Node buildpack prunes those after compile. One-off `heroku run "npm run prisma:deploy"` still works if `prisma` remains on the slug from `postinstall` / cache; if `prisma` is missing on the dyno, run deploy from CI before prune or move `prisma` to `dependencies`.

Set at least:

```
NODE_ENV=production
CLIENT_URL=https://<vercel-app>.vercel.app
API_PUBLIC_URL=https://<vercel-app>.vercel.app
DATABASE_URL=<from heroku-postgresql>
ANTHROPIC_API_KEY=...
GOOGLE_* / GITHUB_*   # if you want those buttons
```

Do not set `PORT` yourself on Heroku.

Google Cloud Console / GitHub OAuth app: authorized redirect URI must be the Vercel callback, not `*.herokuapp.com`.

### Timeouts

| Hop | Limit | What we do |
| --- | --- | --- |
| Heroku router | 30s to first byte, then idle | POST `/search` returns 202 immediately |
| Vercel rewrite | ~30–60s (plan-dependent) | Same: short POST + short polls, not one 90s GET |
| Client poll | 3 minutes | Surfaces `504` if the job never completes |

Holding a single HTTP request open for Claude will 503 in production even if the dyno later finishes.

---

## Security

Practices this app follows or that a site like this should keep:

- **Secrets** — API keys and OAuth secrets only on the server and in the host’s config. Never in the Vite bundle, README, screenshots, or git history. Rotate anything that was ever pasted into chat or a ticket.
- **Cookies** — httpOnly, Secure in production, SameSite=Lax. Store hashes, not raw session tokens.
- **CORS** — allowlist `CLIENT_URL` with `credentials: true`. Do not use `origin: *` with cookies.
- **CSRF** — OAuth uses a state cookie. Cookie + SameSite=Lax covers the JSON API for typical browser use. If you add a public non-browser client, add CSRF tokens or switch to bearer tokens.
- **Authorization** — every project query is `WHERE user_id = req.user.id`. Missing rows are 404.
- **Input** — Zod on persisted blueprints and on Claude’s JSON. Treat model output as untrusted.
- **Prompt injection** — user descriptions are model input. Do not give Claude tools that can mutate other users’ data. Keep generation read-only besides writing the caller’s new project.
- **Rate limits** — generation is expensive. Add per-user quotas and IP rate limits before opening the app publicly. The route is already session-gated.
- **TLS** — terminate TLS at Heroku/Vercel; `trust proxy` so Secure cookies work.
- **Headers** — consider `Content-Security-Policy`, `Referrer-Policy`, `X-Content-Type-Options` (not yet set on Express). Vercel can add some of these on the static origin.
- **Dependencies** — `npm audit` on a schedule. Pin engines.node in each `package.json` so Heroku/Vercel do not jump major Node versions silently.
- **PII** — emails and names from OAuth live in `users` / `auth_identities`. Have a delete-account path before collecting real users (logout exists; full erasure is `DELETE` on the user row with cascades).

---

## Product and UX

- **Empty, loading, error** — login splash while `auth.status === "loading"`; drafting overlay while a job is pending; footer surfaces save failures. Keep those three states if you add pages.
- **Guest first** — let people try the product without an OAuth app. Upgrade in place so work is not lost.
- **Idempotent guest** — a second Guest click must not create a second user.
- **Autosave** — edits debounce to `PUT /api/projects/:id`. Show save state; never block typing on the network.
- **Examples** — seed the goal field so the first generation is one click.
- **Cost** — show that generation takes ~1 minute. Polling plus the overlay is better than a spinner that looks stuck.
- **Copy** — errors from the API (`err.message`) beat generic “something went wrong” when the message is already client-safe.
- **Theming** — accent hue and font are local tweaks. If you persist them, key them per user, not in a global cookie that leaks across accounts on a shared computer.

---

## Accessibility

- Prefer semantic buttons/headings already used (`role="status"` on loaders, named menus).
- Keyboard: login actions and the account menu should remain reachable without a pointer.
- Do not convey state with color alone (`PriorityChip` should keep a text label).
- Generation overlay should use `aria-busy` / `aria-live` so screen readers hear progress.
- Contrast: accent CSS variables are hue-based; check wash vs ink when adding hues.
- Motion: honor `prefers-reduced-motion` for Motion animations (add this if you have not).

---

## Performance

- Keep the Anthropic round-trip off the user’s HTTP request (already true).
- Cap `max_tokens` and epic/story counts in the system prompt so payloads stay bounded.
- Autosave should send diffs or full documents consistently; the current replace-by-id is simple and fine at this scale.
- Prisma: one shared client. Enable SSL only for `DATABASE_URL`.
- Client bundle: generation schemas live in `client/src/lib/ai.ts` for typing only — do not import the Anthropic SDK there.
- Caching: `/api/search` and `/api/projects` are user-specific; `Cache-Control: private, no-store` is appropriate if you add it.

---

## Observability

- Log Anthropic and Prisma failures on the server (already `console.error` in generation and auth).
- Heroku: `heroku logs --tail --app <app>`. Router `H12` means the **held request** exceeded 30s; it is not a missing route.
- Do not log session tokens, `DATABASE_URL`, or API keys (`heroku config` prints values — avoid pasting that output).
- Add a request id (`X-Request-Id`) if you debug proxy hops between Vercel and Heroku.
- Track generation duration, success/error, and token usage per user before the bill surprises you.

---

## Operations notes

These bit production once; they are easy to hit again.

1. **`heroku run npm run …`** — unquoted, CLI 11.8 prepends an extra `run` and bash prints `run: command not found`. Use `heroku run "npm run prisma:deploy" --app <app>`.
2. **No Postgres addon** — the API boots but Prisma fails. `heroku addons:create heroku-postgresql:essential-0 --app <app>` then `heroku pg:wait`.
3. **Prisma without SSL** — `P1010` / “User was denied access” on Heroku. The adapter must pass `ssl` when `DATABASE_URL` is set.
4. **`redirect_uri_mismatch`** — Google’s authorized URI must equal `${API_PUBLIC_URL}/api/auth/google/callback` on the Vercel host.
5. **Subtree** — `git push heroku-server` from the monorepo root deploys the whole repo and breaks `prisma generate`. Always `git subtree push --prefix server heroku-server main`.
6. **In-memory jobs** — not a queue. If you need multiple dynos or survive restart, persist jobs (Redis or a `generation_jobs` table) and run workers.

---

## Contributing

1. Branch from `main`. Keep server and client changes that must ship together in one PR, or note the deploy order (API first vs client first). Generation contract changes (`POST` + poll) need **both** Heroku and Vercel.
2. Match existing style: TypeScript `strict`, Zod at the boundary, `asyncHandler` for async routes.
3. New migrations: add `migration.sql` and `down.sql`.
4. Do not commit `server/.env`, `client/.env`, or `server/src/generated/`.
5. Run `npm test` and the workspace `tsc` (`npm run build:server`, `npm run build:client`) before asking for review.

Useful paths:

| Path | What |
| --- | --- |
| `server/src/app.ts` | Middleware and route mounts |
| `server/src/generation.ts` | Claude job runner |
| `server/src/auth/` | Session, OAuth, guests |
| `server/prisma/` | Schema and SQL |
| `client/src/lib/api.ts` | Fetch wrapper and poller |
| `client/src/components/Workspace.tsx` | Signed-in editor |
| `client/vercel.json` | Production `/api` rewrite |
| `tests/` | Jest suites |

License: MIT License
