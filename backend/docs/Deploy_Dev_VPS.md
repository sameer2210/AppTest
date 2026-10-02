# Dev VPS deploy — TypeScript build + PM2

After the JS→TS migration scaffold, **dev deploys compile to `dist/`** and PM2 must **not** run the repo-root `server.js`.

## Local validation

```bash
npm install
npm run build    # emits dist/src/server.js + dist/src/**
npm start        # node dist/src/server.js
curl http://localhost:5000/api/health
```

During incremental `.js` → `.ts` renames, `npm run build` may report TypeScript errors until each subtask is fixed. While `allowJs` is enabled, existing `.js` sources still compile.

Optional strict check without emit:

```bash
npm run typecheck
```

## GitHub Actions (develop)

`.github/workflows/deploy.yml` on push to `develop`:

1. SSH → `/root/stron-backend-dev`
2. `git pull --ff-only origin develop` (reset hard if diverged)
3. `npm install`
4. `npm run build`
5. `pm2 delete stron-dev` then `pm2 start ecosystem.config.cjs --only stron-dev` (reload alone keeps a stale root `server.js` path)
6. Read `PORT` from `.env` (grep only — do not bash-source `.env` under `set -u`)
7. Poll `http://127.0.0.1:$PORT/api/health` for up to 30s

Success: workflow green, PM2 log shows `✅ Server running on port …` within 30s.

> **Note:** Failed deploys that print `./.env: line N: …: unbound variable` are **not** a TypeScript/`tsc` failure. `npm run build` already succeeded; the health-check step was sourcing `.env` and bash expanded `$…` inside a secret.

## One-time PM2 change on the dev VPS

If `stron-dev` still points at root `server.js`, update it once:

```bash
cd /root/stron-backend-dev
git pull origin develop
npm install
npm run build

# Replace legacy process (root server.js) with dist entry
pm2 delete stron-dev 2>/dev/null || true
pm2 start ecosystem.config.cjs --only stron-dev
pm2 save
```

Verify:

```bash
pm2 describe stron-dev | grep -E 'script path|exec cwd'
# script path → …/stron-backend-dev/dist/src/server.js

curl -sf http://127.0.0.1:5000/api/health
# StepWars Backend Alive Final Production🚀
```

### Alternative: npm start

`ecosystem.config.cjs` uses `dist/src/server.js` directly (preferred — fewer shell layers). Equivalent:

```javascript
{
  name: "stron-dev",
  script: "npm",
  args: "start",
  cwd: "/root/stron-backend-dev",
}
```

`package.json` `"start"` is `node dist/src/server.js`.

## Rollback

If a deploy fails health check, the workflow exits non-zero. On the server:

```bash
cd /root/stron-backend-dev
git reset --hard HEAD~1
npm install && npm run build
pm2 restart stron-dev
```

## Public health URL

Dev API base (from `.env.example`): `https://apidev.stron.in/api/health`
