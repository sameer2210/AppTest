# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

`stepwars_backend` — Node.js/Express API for Stron, a step-tracking fitness game (mobile client in the sibling `Stron-App_ReactNative` repo). ESM (`"type": "module"`), MongoDB/Mongoose, Firebase Admin (auth verification), JWT session tokens, Razorpay payments, Cloudflare R2 image storage.

## Commands

```bash
npm install
npm run build        # tsc → dist/src/** (entry: dist/src/server.js)
npm run typecheck    # tsc --noEmit + tests project
npm run dev          # tsx watch src/server.ts
npm run dev:dist     # build + nodemon dist/src/server.js
npm start            # node dist/src/server.js (runs build first via prestart)
npm test             # vitest run (tests/*.test.ts)
npm run test:watch   # vitest
```

To run a single test file: `npx vitest run tests/opinion.test.ts`.

`vitest.config.ts` uses `setupFiles: ["./tests/setup.ts"]` and resolves `.js` imports to `.ts` via `extensionAlias`.

## Environment

Copy `.env.example` to `.env`. Key vars: `MONGO_URI`, `JWT_SECRET` (required in production — server exits at boot if missing), OTP settings (`OTP_*`, via APITxT SMS provider), `SM_*` (STRON Managed Events business rules — commission %, gateway fee %, event duration limits, King-of-the-Hill group sizing, Face-Off KO threshold, settlement windows), `RAZORPAY_*`, `R2_*` (Cloudflare R2 image storage — falls back to proxying via `/api/upload/public/:key` if `R2_PUBLIC_BASE_URL` is unset).

## Architecture (Modular Monolith)

**Canonical doc:** [`.cursor/docs/modular-monolith-architecture.md`](.cursor/docs/modular-monolith-architecture.md)  
**Import rules:** [`.cursor/docs/module-import-rules.md`](.cursor/docs/module-import-rules.md)  
**Layer responsibilities:** [`docs/Stron_Backend_Modular_Monolith_Developer_Guide.md`](docs/Stron_Backend_Modular_Monolith_Developer_Guide.md)  
**PR review gate:** [`docs/Claude_Code_Review_Process.md`](docs/Claude_Code_Review_Process.md)  
**Cursor rules:** `.cursor/rules/mm-*.mdc`

Stron Backend uses a **modular monolith** — each domain is a self-contained vertical slice with strict layer separation.

### Layers (top → bottom)

| Layer | Target path | Legacy path |
|-------|-------------|-------------|
| App | `app.ts`, `server.ts`, `routes/v1.route.ts` | Same |
| Routes | `features/<domain>/routes/` | `routes/<domain>.route.ts` |
| Controllers | `features/<domain>/controllers/` | `controllers/<domain>.controller.ts` |
| Validators | `features/<domain>/validators/` | `validators/<domain>.validator.ts` |
| Services | `features/<domain>/services/` | `services/<domain>.service.ts` |
| Models | `features/<domain>/models/` | `models/<domain>.model.ts` |
| Shared | `config/`, `middleware/`, `utils/`, `types/` | Same |

### Data flow (new code)

`route → controller → service → model → MongoDB`

Controllers must not import Mongoose models. Services must not touch `req`/`res`. Cross-module access via `features/<name>/index.ts` only.

### Current layout (legacy flat)

```
src/server.ts             # entrypoint: dotenv, connectDB(), validateOtpConfig(), app.listen
src/app.ts                # Express app assembly
src/
  config/                 # db, firebase, authConfig, stronConfig, eventCatalog, remoteConfigService
  controllers/            # one file per domain — auth, user, notification, opinion, upload, razorpay, stepRace, + stron* family
  routes/                 # one file per domain, mounted under /api/* in app.ts
  middleware/             # requireAuth, requireAdmin, requireInternalToken, rateLimiter, validateRequest
  models/                 # Mongoose models (user, stronEvent, stronOrganizer, stronParticipation, ...)
  services/               # business logic + infra (razorpay, r2Upload, otp/, stronScheduler, stron* family)
  validators/             # Zod schemas per domain
  utils/                  # jwt, phone, eventTime, stronMoney, pagination, stronHttpError, ...
scripts/                  # one-off maintenance scripts — run manually, not part of app runtime
public/                   # static assets + .well-known/ (App Links), privacy-policy.html
```

Legacy flat folders remain valid until touched. New features use `src/features/<domain>/` with full module anatomy.

### Route mounting (in `src/app.js`)

- `/api/auth` (+ legacy `/auth`) — sync-user, guest sign-in, OTP send/verify/resend, token exchange/refresh, logout.
- `/api/stron` — aggregator router sub-mounting `/organizer`, `/events`, `/settlements`, `/rewards`, `/connect`. This is the STRON Managed Events feature area (create/publish/cancel Face-Off, King-of-the-Hill, Marathon, Step Challenge events).
- `/api/payment` (Razorpay), `/api/upload` (Cloudflare R2), `/api/user`, `/api/notifications`, `/api/daily-reset`, `/api/config`, `/api/step-race`, `/api/opinion`, `/api/feedback`.
- Non-`/api` routes: `/event/:key` (shared event smart-link), `/.well-known/assetlinks.json`, `/apple-app-site-association`, `/privacy-policy`, `/api/health`.
- `/sync-all-users` — internal one-off Firestore→Mongo bulk sync, gated by `requireInternalToken` (not `requireAuth`).

### Auth

`requireAuth` (`src/middleware/requireAuth.js`) reads `Authorization: Bearer <token>`, verifies via `verifyAccessToken` (`src/utils/jwt.util.js`), attaches `req.user = { uid, email }`. Applied per-route (imported into each `*.route.js`), not globally. 401 on missing/invalid/expired token, 503 if JWT isn't configured. `requireAdmin` is a separate admin-only guard delegating to `requireAdminUser` in `utils/eventOwnership.util.js`.

### Cron jobs (in-process, node-cron)

- `src/app.ts` (`registerStronCrons()` using `src/services/stronScheduler.service.ts` `scheduleCron` infra): event lifecycle sweep every 5 min (published→live→completed), daily Face-Off/King-of-the-Hill match generation just after midnight IST, King-of-the-Hill king-time reconciliation, opinion hourly IST + cycle settle UTC, gym auto-renew 00:10 IST, daily reset 00:00 IST.

## Deployment

`git push` to `develop` triggers `.github/workflows/deploy.yml`: SSHes into the VPS, `cd /root/stron-backend-dev`, `git pull --ff-only` (falls back to `git reset --hard origin/develop` if diverged), `npm install`, `npm run build`, `pm2 startOrReload ecosystem.config.cjs --only stron-dev`, health-check `http://127.0.0.1:$PORT/api/health` (30s). See [`docs/Deploy_Dev_VPS.md`](docs/Deploy_Dev_VPS.md) for one-time PM2 migration off root `server.js`.

## Knowledge graph MCP tools

This project has a knowledge graph (`code-review-graph` MCP server). Prefer it over Grep/Glob/Read for exploring code, tracing callers/impact, and code review — see the tool table surfaced in your system context. Fall back to Grep/Glob/Read only when the graph doesn't cover what's needed.
