#!/usr/bin/env bash
set -euo pipefail

# Restore backup created by backup.sh
# Usage:
#   ./restore.sh /path/to/backup/20260304T110000Z

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup_dir>" >&2
  exit 1
fi

BACKUP_DIR="$1"
if [ ! -d "${BACKUP_DIR}" ]; then
  echo "Backup dir not found: ${BACKUP_DIR}" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${INFRA_DIR}/docker-compose.yml"

if docker compose -f "${COMPOSE_FILE}" ps --status running api | grep -q api; then
  echo "API container is running. Stop stack first to avoid corruption:" >&2
  echo "  cd ${INFRA_DIR} && docker compose down" >&2
  exit 1
fi

if [ ! -f "${BACKUP_DIR}/app.db" ]; then
  echo "Missing app.db in backup dir" >&2
  exit 1
fi

echo "[restore] starting minimal api container for data restore"
docker compose -f "${COMPOSE_FILE}" up -d api

cleanup() {
  docker compose -f "${COMPOSE_FILE}" stop api >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[restore] restoring database"
docker compose -f "${COMPOSE_FILE}" cp "${BACKUP_DIR}/app.db" api:/data/app.db
if [ -f "${BACKUP_DIR}/app.db-wal" ]; then
  docker compose -f "${COMPOSE_FILE}" cp "${BACKUP_DIR}/app.db-wal" api:/data/app.db-wal
fi
if [ -f "${BACKUP_DIR}/app.db-shm" ]; then
  docker compose -f "${COMPOSE_FILE}" cp "${BACKUP_DIR}/app.db-shm" api:/data/app.db-shm
fi

echo "[restore] restoring exports"
docker compose -f "${COMPOSE_FILE}" exec -T api sh -lc 'rm -rf /data/exports && mkdir -p /data/exports'
if [ -d "${BACKUP_DIR}/exports" ]; then
  tar -C "${BACKUP_DIR}/exports" -cf - . | docker compose -f "${COMPOSE_FILE}" exec -T api sh -lc 'tar -C /data/exports -xf -'
fi

echo "[restore] verifying sqlite integrity"
docker compose -f "${COMPOSE_FILE}" exec -T api python3 - <<'PY'
import sqlite3
con = sqlite3.connect('/data/app.db')
cur = con.cursor()
cur.execute('PRAGMA integrity_check;')
row = cur.fetchone()
print('integrity_check=', row[0])
if row[0] != 'ok':
    raise SystemExit(1)
cur.close()
con.close()
PY

echo "[restore] complete. start full stack with:"
echo "  cd ${INFRA_DIR} && docker compose up -d"