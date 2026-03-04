#!/usr/bin/env bash
set -euo pipefail

# Checks backup freshness and basic artifact presence.
# Exit codes:
# 0 = healthy, 1 = warning/failure

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-${SCRIPT_DIR}/out}"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-26}"

if [ ! -d "${BACKUP_ROOT}" ]; then
  echo "backup_health=fail reason=no_backup_dir path=${BACKUP_ROOT}"
  exit 1
fi

LATEST="$(find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d | sort | tail -n 1)"
if [ -z "${LATEST}" ]; then
  echo "backup_health=fail reason=no_backups path=${BACKUP_ROOT}"
  exit 1
fi

if [ ! -f "${LATEST}/app.db" ]; then
  echo "backup_health=fail reason=missing_app_db latest=${LATEST}"
  exit 1
fi

latest_mtime="$(stat -c %Y "${LATEST}")"
now="$(date +%s)"
age_hours=$(( (now - latest_mtime) / 3600 ))

if [ "${age_hours}" -gt "${MAX_AGE_HOURS}" ]; then
  echo "backup_health=warn reason=stale_backup latest=${LATEST} age_hours=${age_hours} max_age_hours=${MAX_AGE_HOURS}"
  exit 1
fi

echo "backup_health=ok latest=${LATEST} age_hours=${age_hours}"
