set shell := ["bash", "-lc"]

api_dir := "apps/api"
web_dir := "apps/web"

setup-api:
  cd {{api_dir}} && python3 -m venv .venv && .venv/bin/python -m pip install --upgrade pip && .venv/bin/pip install fastapi uvicorn[standard] sqlalchemy alembic pydantic pydantic-settings python-jose[cryptography] passlib pytest httpx email-validator ruff mypy pytest-xdist

migrate:
  cd {{api_dir}} && PYTHONPATH=. .venv/bin/alembic upgrade head

seed-dev:
  cd {{api_dir}} && PYTHONPATH=. .venv/bin/python -m app.scripts.seed_dev

dev-api:
  cd {{api_dir}} && PYTHONPATH=. .venv/bin/uvicorn app.main:app --reload --port 8080

dev-web:
  cd {{web_dir}} && npm install && npm run dev

test-api:
  cd {{api_dir}} && PYTHONPATH=. .venv/bin/pytest

lint-api:
  cd {{api_dir}} && PYTHONPATH=. .venv/bin/ruff check app

typecheck-api:
  cd {{api_dir}} && PYTHONPATH=. .venv/bin/mypy --explicit-package-bases app
