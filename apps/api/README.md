# API

## Run locally
```bash
cd apps/api
python -m uvicorn app.main:app --reload --port 8080
```

## Alembic
```bash
cd apps/api
alembic revision --autogenerate -m "init"
alembic upgrade head
```
