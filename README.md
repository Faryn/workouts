# Workout App

Strength training workout app (2 athletes, trainer portal, API-first).

## Repo status
Initial scaffold created with API baseline, initial DB migration, and integration tests for currently implemented endpoints.

## API quickstart
```bash
cd apps/api
python3 -m venv .venv
. .venv/bin/activate
pip install fastapi uvicorn[standard] sqlalchemy alembic pydantic pydantic-settings python-jose[cryptography] passlib pytest httpx email-validator
PYTHONPATH=. alembic upgrade head
PYTHONPATH=. uvicorn app.main:app --reload --port 8080
```

## Test quickstart
```bash
cd apps/api
. .venv/bin/activate
PYTHONPATH=. pytest
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

Other useful commands:
```bash
just test-api
just lint-api
just typecheck-api
```

## Top-level structure
- `apps/api` – FastAPI backend
- `apps/web` – web app (trainer + management)
- `apps/mobile` – mobile app (workout execution)
- `docs` – user/admin/developer/api docs
- `infra` – docker-compose, nginx example, backup scripts
