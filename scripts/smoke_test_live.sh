#!/usr/bin/env bash
set -euo pipefail

# Live smoke test for workout-app deployment.
# Verifies:
# - compose env is wired from .env (not fallback placeholders)
# - API container can see DB and expected user rows
# - server-side admin JWT works against live API
#
# Usage:
#   ./scripts/smoke_test_live.sh
#   APP_URL=https://workouts.thepowl.de EXPECTED_USER_EMAILS='admin@example.com,mail@paulgod.de,saskiagod@gmail.com' ./scripts/smoke_test_live.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
INFRA_DIR="${ROOT_DIR}/infra"
COMPOSE_FILE="${INFRA_DIR}/docker-compose.yml"
APP_URL="${APP_URL:-https://workouts.thepowl.de}"
EXPECTED_USER_EMAILS="${EXPECTED_USER_EMAILS:-admin@example.com,mail@paulgod.de,saskiagod@gmail.com}"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "[smoke] missing command: $1" >&2; exit 1; }
}

require_cmd docker
require_cmd python3

cd "${INFRA_DIR}"

echo "[smoke] checking api container env"
api_env="$(docker compose -f "${COMPOSE_FILE}" exec -T api env)"

grep -q '^DATABASE_URL=sqlite:////data/app.db$' <<<"${api_env}" || {
  echo "[smoke] unexpected DATABASE_URL in api container" >&2
  exit 1
}

grep -q '^API_TOKEN_SECRET=' <<<"${api_env}" || {
  echo "[smoke] API_TOKEN_SECRET missing in api container" >&2
  exit 1
}

if grep -q '^API_TOKEN_SECRET=change-me$' <<<"${api_env}"; then
  echo "[smoke] API_TOKEN_SECRET is still the fallback placeholder" >&2
  exit 1
fi

echo "[smoke] checking server-side admin jwt"
admin_jwt="$(docker compose -f "${COMPOSE_FILE}" exec -T api sh -lc 'for f in /data/frank.jwt /data/frank-admin.jwt; do if [ -f "$f" ]; then cat "$f"; exit 0; fi; done; exit 1')"
if [[ -z "${admin_jwt}" ]]; then
  echo "[smoke] could not read admin jwt from api container" >&2
  exit 1
fi

echo "[smoke] checking live db users"
docker compose -f "${COMPOSE_FILE}" exec -T api python3 - <<'PY'
import sqlite3
conn = sqlite3.connect('/data/app.db')
conn.row_factory = sqlite3.Row
rows = [dict(r) for r in conn.execute('select email, role, active from users order by role, email')]
print(rows)
if len(rows) < 3:
    raise SystemExit('expected at least 3 users in live db')
if not any(r['email'] == 'admin@example.com' and r['active'] for r in rows):
    raise SystemExit('expected active admin@example.com in live db')
PY

echo "[smoke] checking expected emails via api token"
ADMIN_JWT="${admin_jwt}" APP_URL="${APP_URL}" EXPECTED_USER_EMAILS="${EXPECTED_USER_EMAILS}" python3 - <<'PY'
import json
import os
import sys
import urllib.request

base = os.environ['APP_URL'].rstrip('/')
token = os.environ['ADMIN_JWT']
expected = [x.strip() for x in os.environ['EXPECTED_USER_EMAILS'].split(',') if x.strip()]

req = urllib.request.Request(
    base + '/api/v1/auth/assigned-athletes',
    headers={'Authorization': f'Bearer {token}'},
)
try:
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = resp.read().decode('utf-8')
        status = resp.status
except Exception as exc:
    raise SystemExit(f'api token smoke test failed: {exc}')

if status != 200:
    raise SystemExit(f'unexpected status from assigned-athletes: {status} {body}')

rows = json.loads(body)
emails = {'admin@example.com', *[row['email'] for row in rows]}
missing = [email for email in expected if email not in emails]
if missing:
    raise SystemExit(f'missing expected emails from live api view: {missing}; got {sorted(emails)}')

print({'api_status': status, 'emails_seen': sorted(emails)})
PY

echo "[smoke] ok"
