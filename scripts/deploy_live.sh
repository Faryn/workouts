#!/usr/bin/env bash
set -euo pipefail

# Safer live deploy for workout-app.
# Default behavior:
# - abort if local repo is dirty
# - abort if server repo is dirty
# - back up live data before rollout
# - pull + rebuild on server
# - run live smoke test after deploy
#
# Required env:
#   LIVE_SSH_HOST   e.g. frank@thepowl.de
# Optional env:
#   LIVE_APP_DIR    default: /home/frank/workout-app
#   LIVE_SSH_KEY    default: /home/paul/.ssh/id_ed25519_thepowl_frank
#   ALLOW_DIRTY_SERVER=1  to override dirty-server guard
#   SKIP_PUSH=1           to skip local git push step
#   APP_URL=...           forwarded to smoke test
#
# Usage:
#   LIVE_SSH_HOST=frank@thepowl.de ./scripts/deploy_live.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
LIVE_SSH_HOST="${LIVE_SSH_HOST:?set LIVE_SSH_HOST, e.g. frank@thepowl.de}"
LIVE_APP_DIR="${LIVE_APP_DIR:-/home/frank/workout-app}"
LIVE_SSH_KEY="${LIVE_SSH_KEY:-/home/paul/.ssh/id_ed25519_thepowl_frank}"
LIVE_BACKUP_ROOT="${LIVE_BACKUP_ROOT:-/home/frank/backups/workout-app}"
APP_URL="${APP_URL:-https://workouts.thepowl.de}"
ALLOW_DIRTY_SERVER="${ALLOW_DIRTY_SERVER:-0}"
SKIP_PUSH="${SKIP_PUSH:-0}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "[deploy] missing command: $1" >&2; exit 1; }
}

require_cmd git
require_cmd ssh
require_cmd bash

cd "${ROOT_DIR}"

if [[ -n "$(git status --short)" ]]; then
  echo "[deploy] local repo is dirty; commit or stash first" >&2
  git status --short >&2
  exit 1
fi

echo "[deploy] checking server repo state"
server_status="$(ssh -i "${LIVE_SSH_KEY}" -o IdentitiesOnly=yes "${LIVE_SSH_HOST}" "cd '${LIVE_APP_DIR}' && git status --short")"
if [[ -n "${server_status}" && "${ALLOW_DIRTY_SERVER}" != "1" ]]; then
  echo "[deploy] server repo is dirty; refusing deploy" >&2
  printf '%s\n' "${server_status}" >&2
  echo "[deploy] rerun with ALLOW_DIRTY_SERVER=1 only if you have reviewed the drift" >&2
  exit 1
fi

if [[ "${SKIP_PUSH}" != "1" ]]; then
  echo "[deploy] pushing current HEAD"
  GIT_SSH_COMMAND="ssh -i /home/paul/.ssh/id_ed25519_openclaw_github -o IdentitiesOnly=yes" git push origin HEAD
fi

echo "[deploy] backing up live data"
ssh -i "${LIVE_SSH_KEY}" -o IdentitiesOnly=yes "${LIVE_SSH_HOST}" "mkdir -p '${LIVE_BACKUP_ROOT}' && cd '${LIVE_APP_DIR}/infra/backup' && BACKUP_ROOT='${LIVE_BACKUP_ROOT}' ./backup.sh"

echo "[deploy] pulling + rebuilding live stack"
ssh -i "${LIVE_SSH_KEY}" -o IdentitiesOnly=yes "${LIVE_SSH_HOST}" "set -e; cd '${LIVE_APP_DIR}' && git pull --ff-only && cd infra && docker compose up -d --build"

echo "[deploy] running smoke test"
APP_URL="${APP_URL}" ssh -i "${LIVE_SSH_KEY}" -o IdentitiesOnly=yes "${LIVE_SSH_HOST}" "cd '${LIVE_APP_DIR}' && APP_URL='${APP_URL}' ./scripts/smoke_test_live.sh"

echo "[deploy] success"
