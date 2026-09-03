#!/usr/bin/env bash
# scripts/backup-db.sh
# Production database backup script for Linux/Railway/cron
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "${BACKUP_DIR}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[ERROR] DATABASE_URL is not set."
  exit 1
fi

# Extract components from DATABASE_URL: mysql://user:password@host:port/database
# Regex extraction
PROTO="$(echo "$DATABASE_URL" | grep :// | sed -e's,^\(.*://\).*,\1,g')"
URL_NO_PROTO="$(echo "${DATABASE_URL/$PROTO/}")"
USERPASS="$(echo "$URL_NO_PROTO" | grep @ | cut -d@ -f1 || true)"
HOSTPORT_DB="$(echo "${URL_NO_PROTO/$USERPASS@/}")"
DB_NAME="$(echo "$HOSTPORT_DB" | grep / | cut -d/ -f2 | cut -d? -f1)"
HOSTPORT="$(echo "$HOSTPORT_DB" | cut -d/ -f1)"
DB_HOST="$(echo "$HOSTPORT" | cut -d: -f1)"
DB_PORT="$(echo "$HOSTPORT" | grep : | cut -d: -f2 || echo "3306")"

DB_USER="$(echo "$USERPASS" | cut -d: -f1)"
DB_PASS="$(echo "$USERPASS" | grep : | cut -d: -f2 || true)"

BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}_${TIMESTAMP}.sql.gz"

echo "=== JOGJADOELAN DATABASE BACKUP ==="
echo "Host: ${DB_HOST}:${DB_PORT}"
echo "Database: ${DB_NAME}"
echo "Target: ${BACKUP_FILE}"

# Execute mysqldump non-locking and compress
MYSQL_PWD="${DB_PASS}" mysqldump \
  -h "${DB_HOST}" \
  -P "${DB_PORT}" \
  -u "${DB_USER}" \
  --single-transaction \
  --quick \
  --routines \
  --triggers \
  --set-gtid-purged=OFF \
  "${DB_NAME}" | gzip -9 > "${BACKUP_FILE}"

echo "Backup created successfully: $(du -h "${BACKUP_FILE}")"

# Retention cleanup
echo "Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete

echo "Done."
