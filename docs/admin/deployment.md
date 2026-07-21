# Deployment & Operations (v1)

## Runtime assumptions
- Docker Compose deployment (`infra/docker-compose.yml`)
- External reverse proxy terminates TLS
- API runs as single instance against SQLite
- The web container binds only to `127.0.0.1:8088`; the external proxy is the
  sole public entrypoint. Do not widen this bind without equivalent firewall
  and proxy-header controls.

## Proxy headers and login throttling
The public reverse proxy must overwrite—not append—`X-Forwarded-For` with its
actual peer address, as shown in `infra/nginx-example.conf`. This prevents a
caller from choosing the IP identity used by the login throttle. The web
container forwards the sanitized address to the API.

## SQLite guardrails
The API enables these pragmas on connect (see `apps/api/app/core/db.py`):
- `PRAGMA journal_mode=WAL;`
- `PRAGMA busy_timeout=5000;`

Operational guidance:
- Keep one API replica when using SQLite.
- Keep transactions short.
- Use online backup flow (below), not raw file copy of a live DB.

## Backup
Scripts live in `infra/backup/`.

Default runtime backup paths (outside the repo):
- backups: `~/backups/workout-app`
- cron log: `~/.local/state/workout-app/backup-cron.log`

Create backup:
```bash
cd infra/backup
./backup.sh
# optional custom output root
BACKUP_ROOT=/srv/workout-backups ./backup.sh
```

Output example:
- `app.db`
- `app.db-wal` (if present)
- `app.db-shm` (if present)
- `exports/` (CSV exports)
- `manifest.txt`

Notes:
- `backup.sh` uses SQLite online backup API from inside `api` container for a consistent snapshot.

## Restore
```bash
cd infra/backup
./restore.sh ~/backups/workout-app/<timestamp>
```

Safety behavior:
- Restore refuses to run if API is already running.
- Script starts/stops minimal API container to copy data.
- Runs `PRAGMA integrity_check` post-restore.

After successful restore:
```bash
cd infra
docker compose up -d
```

## Safer live deploy flow
Use the checked-in scripts from repo root:

```bash
# run smoke checks against the current live stack
APP_URL=https://workouts.thepowl.de ./scripts/smoke_test_live.sh

# guarded deploy to the live host
LIVE_SSH_HOST=frank@thepowl.de \
LIVE_SSH_KEY=/home/paul/.ssh/id_ed25519_thepowl_frank \
APP_URL=https://workouts.thepowl.de \
./scripts/deploy_live.sh
```

### What the guarded deploy does
1. Fails if the local repo is dirty.
2. Fails if the server repo is dirty (unless `ALLOW_DIRTY_SERVER=1` is set intentionally).
3. Runs `infra/backup/backup.sh` on the live host before rollout, writing to `/home/frank/backups/workout-app` by default.
4. Pulls latest code with `git pull --ff-only`.
5. Rebuilds/restarts with Docker Compose.
6. Runs a smoke test that verifies:
   - `DATABASE_URL` points to `/data/app.db`
   - `API_TOKEN_SECRET` is present and not the fallback placeholder
   - the live DB contains expected user rows
   - the server-side admin JWT can still authenticate against the live API

### Override knobs
- `ALLOW_DIRTY_SERVER=1` — allow deploy even if the server checkout has local changes.
- `SKIP_PUSH=1` — skip `git push origin HEAD` inside the deploy script.
- `LIVE_BACKUP_ROOT=...` — override the live backup destination root.
- `EXPECTED_USER_EMAILS=...` — override which live users the smoke test must see.

### Why this exists
This prevents the exact class of failure where a deploy accidentally starts the API with fallback config values (for example `API_TOKEN_SECRET=change-me`) even though the data volume is intact.

## Web deploy cache behavior
- Frontend service worker cache name is build-versioned (`/sw.js?v=<build-version>`), so normal rebuild/redeploy should rotate cache automatically.
- Service worker must **not cache `/api/*` responses**; the current app/runtime also forces API reads to `no-store` and clears older `workout-web-*` caches on startup to reduce ghost-state/stale-session issues.
- If a client still shows stale UI after deploy, do a hard refresh and, if needed, unregister the service worker once in browser DevTools.

## Scheduled backups + retention
Install daily cron backup for current user:
```bash
cd infra/backup
./install-cron.sh
```

Optional schedule/retention overrides:
```bash
BACKUP_HOUR=2 BACKUP_MINUTE=30 RETENTION_DAYS=21 BACKUP_ROOT=/srv/workout-backups ./install-cron.sh
```

Backup health + restore drill checks:
```bash
cd infra/backup
./backup-health.sh        # stale/missing backup alert
./restore-drill.sh        # integrity-check latest backup file
```
