#!/usr/bin/env bash
set -euo pipefail

# Verifies latest backup can pass SQLite integrity check (without mutating runtime DB).

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-${SCRIPT_DIR}/out}"
LATEST="$(find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d | sort | tail -n 1)"

if [ -z "${LATEST}" ] || [ ! -f "${LATEST}/app.db" ]; then
  echo "restore_drill=fail reason=no_valid_backup"
  exit 1
fi

python3 - <<PY
import sqlite3
db = r'''${LATEST}/app.db'''
con = sqlite3.connect(db)
cur = con.cursor()
cur.execute('PRAGMA integrity_check;')
row = cur.fetchone()
cur.close(); con.close()
if not row or row[0] != 'ok':
    print('restore_drill=fail reason=integrity_check path=' + db)
    raise SystemExit(1)
print('restore_drill=ok path=' + db)
PY
