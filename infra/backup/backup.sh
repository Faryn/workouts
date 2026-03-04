#!/usr/bin/env bash
set -euo pipefail

# SQLite-safe backup for workout-app data volume.
# Usage:
#   ./backup.sh
#   BACKUP_ROOT=/path/to/backups ./backup.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INFRA_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${INFRA_DIR}/docker-compose.yml"

BACKUP_ROOT="${BACKUP_ROOT:-${INFRA_DIR}/backup/out}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET_DIR="${BACKUP_ROOT}/${STAMP}"

mkdir -p "${TARGET_DIR}"

echo "[backup] target: ${TARGET_DIR}"

# Ensure API container exists and data volume is mounted.
docker compose -f "${COMPOSE_FILE}" ps api >/dev/null

# Copy DB using sqlite online backup API from inside the container.
docker compose -f "${COMPOSE_FILE}" exec -T api python3 - <<'PY'
import os
import sqlite3

src = '/data/app.db'
dst = '/data/app.db.backup_tmp'

if not os.path.exists(src):
    raise SystemExit(f"source database missing: {src}")

src_conn = sqlite3.connect(src)
dst_conn = sqlite3.connect(dst)
with dst_conn:
    src_conn.backup(dst_conn)
src_conn.close()
dst_conn.close()
print('sqlite backup snapshot complete')
PY

# Copy DB snapshot + WAL/SHM if present and exports.
docker compose -f "${COMPOSE_FILE}" cp api:/data/app.db.backup_tmp "${TARGET_DIR}/app.db"
docker compose -f "${COMPOSE_FILE}" exec -T api rm -f /data/app.db.backup_tmp

if docker compose -f "${COMPOSE_FILE}" exec -T api test -f /data/app.db-wal; then
  docker compose -f "${COMPOSE_FILE}" cp api:/data/app.db-wal "${TARGET_DIR}/app.db-wal"
fi
if docker compose -f "${COMPOSE_FILE}" exec -T api test -f /data/app.db-shm; then
  docker compose -f "${COMPOSE_FILE}" cp api:/data/app.db-shm "${TARGET_DIR}/app.db-shm"
fi

mkdir -p "${TARGET_DIR}/exports"
docker compose -f "${COMPOSE_FILE}" exec -T api sh -lc 'if [ -d /data/exports ]; then tar -C /data/exports -cf - .; fi' > "${TARGET_DIR}/exports.tar" || true
if [ -s "${TARGET_DIR}/exports.tar" ]; then
  tar -xf "${TARGET_DIR}/exports.tar" -C "${TARGET_DIR}/exports"
fi
rm -f "${TARGET_DIR}/exports.tar"

cat > "${TARGET_DIR}/manifest.txt" <<EOF
created_at_utc=${STAMP}
compose_file=${COMPOSE_FILE}
files=$(find "${TARGET_DIR}" -maxdepth 2 -type f | wc -l)
EOF

echo "[backup] done"
echo "[backup] files:"
find "${TARGET_DIR}" -maxdepth 2 -type f | sed 's#^# - #'