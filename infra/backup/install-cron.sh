#!/usr/bin/env bash
set -euo pipefail

# Installs a daily backup cron entry for the current user.
# Usage:
#   ./install-cron.sh
#   BACKUP_ROOT=/srv/workout-backups BACKUP_HOUR=3 BACKUP_MINUTE=15 ./install-cron.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup.sh"
DEFAULT_BACKUP_ROOT="${HOME}/workout-app-backups"
DEFAULT_CRON_LOG="${HOME}/.local/state/workout-app/backup-cron.log"
BACKUP_ROOT="${BACKUP_ROOT:-${DEFAULT_BACKUP_ROOT}}"
BACKUP_HOUR="${BACKUP_HOUR:-3}"
BACKUP_MINUTE="${BACKUP_MINUTE:-0}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
CRON_LOG="${CRON_LOG:-${DEFAULT_CRON_LOG}}"

mkdir -p "${BACKUP_ROOT}" "$(dirname "${CRON_LOG}")"

LINE="${BACKUP_MINUTE} ${BACKUP_HOUR} * * * BACKUP_ROOT=${BACKUP_ROOT} ${BACKUP_SCRIPT} >> ${CRON_LOG} 2>&1 && find ${BACKUP_ROOT} -mindepth 1 -maxdepth 1 -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} +"

( crontab -l 2>/dev/null | grep -v "${BACKUP_SCRIPT}"; echo "${LINE}" ) | crontab -

echo "Installed cron backup job: ${LINE}"
