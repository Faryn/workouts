# Workout App

Strength-focused workout app (athlete + trainer), API-first.

Current live deployment: `https://workouts.thepowl.de`

## Current status
Implemented slices include:
- Auth (login + me) with optional athlete-scoped trainer/admin API tokens
- Admin user management (list/create/update users + password reset)
- Exercise CRUD with a single shared **global exercise pool** (no per-user exercise records)
- Program CRUD (template-backed) with ordered exercises, role-aware `can_manage`, and `exercise_name` fallback
- Scheduling (create/move/copy/skip/delete + recurring patterns)
- Slice-by-slice backend refactor toward thin routers plus domain-local service/policy/serializer modules (completed so far for templates, exercises, auth/assignment, scheduling, and session-query handling)
- Dashboard-centered schedule/calendar flow (upcoming workouts, calendar, selected-day details, quick add, advanced scheduling tools)
- Session flow (start, resume, navigate sets, log sets, autosave, finish, history, latest in-progress)
- Session reliability hardening:
  - optimistic concurrency via `version` + `updated_at`
  - stale-write protection on set logs / autosave / finish
  - duplicate in-progress session protection
  - resumable active session UX with local backup + server-truth reconciliation on load
  - smarter autosave: event-driven first (done/skip/finish/leave + debounced notes), slower periodic safety backup, and no version bump for no-op autosaves
- UI refinements across Dashboard / Programs / Train:
  - consistent action labels
  - relative-date upcoming cards
  - icon-enhanced actions
  - accessibility/focus improvements
  - Train page hierarchy centered on resume / today’s workout first
  - passive autosave status inside the in-progress workout header
  - active workout UI centered on the **current set** with a quieter workout map below
  - pending sets prefilled with their planned reps and weight while preserving logged actual values
  - previous/next set navigation, save-and-exit flow, and auto-finish when the final remaining set is done/skipped
  - rest timer upgraded with stronger cues including a **3-2-1 countdown** and final ready/go cue
  - mobile top bar with current section label + left-side slide-out navigation menu
  - tighter calendar header alignment and more compact month-view day cells
- Cardio logging
- Weights-over-time stats
- CSV exports (sessions, exercise history, cardio)

## API quickstart
```bash
cd apps/api
python3 -m venv .venv
. .venv/bin/activate
pip install fastapi uvicorn[standard] sqlalchemy alembic pydantic pydantic-settings python-jose[cryptography] passlib pytest httpx email-validator ruff mypy
PYTHONPATH=. alembic upgrade head
PYTHONPATH=. uvicorn app.main:app --reload --port 8080
```

## Web quickstart
```bash
cd apps/web
npm install
npm run dev
```

## Validation commands
```bash
just test-api
just lint-api
just typecheck-api
cd apps/web && npm run build
cd apps/web && npm run test:e2e
```

## Dev flow shortcuts (just)
```bash
just setup-api
just migrate
just seed-dev
just dev-api
# in second terminal
just dev-web
```

## Release safety checks
```bash
just release-check
# backup-specific checks
just backup-health
just restore-drill
```

## LAN deployment (Docker Compose)
```bash
cd infra
docker compose up -d --build
docker compose exec -T api bash -lc "cd /app && alembic stamp c7b6c3b1d2e4"
```

Then open:
- Web: `http://<server-ip>:8088`
- API docs: `http://<server-ip>:8080/docs` (via api container exposure/proxy setup)

Notes:
- The API container now includes `alembic.ini` + `alembic/` and uses `DATABASE_URL` for Alembic.
- The current live SQLite database predates Alembic tracking, so rollout uses `alembic stamp` to mark the existing schema at the current revision instead of replaying initial migrations.

Stop:
```bash
cd infra
docker compose down
```

## Backup / restore (SQLite + exports)
Backups default to a subdirectory in the server user's home, outside the repo:
- backups: `~/backups/workout-app`
- cron log: `~/.local/state/workout-app/backup-cron.log`

```bash
cd infra/backup
./backup.sh
./restore.sh ~/backups/workout-app/<timestamp>
# optional override
BACKUP_ROOT=/some/other/path ./backup.sh
```

## Safer live deploy flow
```bash
# dry safety checks / smoke test on live host
just smoke-live

# full guarded deploy (requires LIVE_SSH_HOST)
LIVE_SSH_HOST=frank@thepowl.de just deploy-live
```

What `deploy-live` does:
- refuses deploy if local repo is dirty
- refuses deploy if server repo is dirty (unless explicitly overridden)
- runs a live backup before rollout (default: `~/backups/workout-app` on the server)
- pulls and rebuilds on the server
- runs a post-deploy smoke test that checks env wiring, DB visibility, server JWT auth, and expected users

Current deploy note:
- the final token-based smoke probe can occasionally hit a brief startup-window `502 Bad Gateway` immediately after API container restart even when the app becomes healthy seconds later; if that happens, verify `/api/v1/health` again after a short wait before treating the deploy as failed.

See `docs/admin/deployment.md` for guardrails and restore verification.

## Working UI conventions
- Primary web navigation is **Dashboard / Programs / Train**.
- The Train page should prioritize **resume / today’s workout first**, then secondary/manual start flows.
- The in-progress workout screen should emphasize the **current set** first; navigation and the full workout map are secondary.
- Done/Skip operate on the set directly; the timer is a cue, not a gate.
- Resume should default to the **first unfinished set**, while still allowing free movement across sets/exercises.
- On mobile, keep the current section visible and expose nav through the left-side drawer toggle.
- Calendar month views should favor compact scanning over oversized tap targets.

## Top-level structure
- `apps/api` – FastAPI backend
- `apps/web` – React web app
- `docs` – implementation and developer docs
- `infra` – docker-compose and runtime container config
- `.github/workflows` – CI
