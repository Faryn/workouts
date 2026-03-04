# Workout App

Strength-focused workout app (athlete + trainer), API-first.

## Current status
Implemented slices include:
- Auth (login + me) with optional athlete-scoped trainer/admin API tokens
- Admin user management (list/create/update users + password reset)
- Exercise CRUD with visibility/ownership filtering
- Template CRUD with ordered template exercises, role-aware `can_manage`, and `exercise_name` fallback
- Scheduling (create/move/copy/skip/delete + recurring patterns)
- Calendar feed (strength + cardio merged) and compact weekly calendar UI
- Session flow (start, log sets, autosave, finish, history, latest in-progress)
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
```

Then open:
- Web: `http://<server-ip>:8088`
- API docs: `http://<server-ip>:8080/docs` (via api container exposure/proxy setup)

Stop:
```bash
cd infra
docker compose down
```

## Backup / restore (SQLite + exports)
```bash
cd infra/backup
./backup.sh
./restore.sh ./out/<timestamp>
```

See `docs/admin/deployment.md` for guardrails and restore verification.

## Top-level structure
- `apps/api` – FastAPI backend
- `apps/web` – React web app
- `docs` – implementation and developer docs
- `infra` – docker-compose and runtime container config
- `.github/workflows` – CI
