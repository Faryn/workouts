# Deployment & Operations (v1)

## Runtime assumptions
- Docker Compose deployment (`infra/docker-compose.yml`)
- External reverse proxy terminates TLS
- API runs as single instance against SQLite

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
./restore.sh ./out/<timestamp>
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
