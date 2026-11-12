#!/bin/sh
set -eu

export PGHOST="${PGHOST:-db}" PGUSER="$POSTGRES_USER" PGPASSWORD="$POSTGRES_PASSWORD" PGDATABASE="$POSTGRES_DB"
backups="${BACKUPS_DIR:-/backups}"

counts() {
  psql -d "$1" -tA -v ON_ERROR_STOP=1 -c "
    select tablename || ' ' || (xpath('/row/rows/text()', query_to_xml(format('select count(*) as rows from %I', tablename), false, true, '')))[1]
    from pg_tables where schemaname = 'public' order by tablename"
}

backup() {
  file="$backups/$PGDATABASE-$(date -u +%Y-%m-%dT%H%M).dump"
  pg_dump -Fc -f "$file.part"
  counts "$PGDATABASE" > "$file.counts"
  mv "$file.part" "$file"
  find "$backups" -name '*.dump*' -mtime +"${BACKUP_KEEP_DAYS:-14}" -delete
  if [ -n "${BACKUP_REMOTE:-}" ]; then
    rclone copy "$backups" "$BACKUP_REMOTE/db"
    rclone sync "${PHOTOS_DIR:-/photos}" "$BACKUP_REMOTE/photos"
  fi
  echo "backup ok: $file"
}

check() {
  latest=$(ls -1 "$backups"/*.dump | tail -n 1)
  copy="${PGDATABASE}_restore_check"
  dropdb --if-exists "$copy"
  createdb "$copy"
  pg_restore --no-owner --exit-on-error -d "$copy" "$latest"
  counts "$copy" > "$backups/restored.counts"
  dropdb "$copy"
  if ! diff "$latest.counts" "$backups/restored.counts"; then
    echo "restore check failed: $latest does not bring back the same rows" >&2
    exit 1
  fi
  echo "restore check ok: $latest brings back $(wc -l < "$latest.counts") tables with every row"
}

report() {
  if [ -n "${BACKUP_PING_URL:-}" ]; then
    curl -fsS -m 10 --retry 3 "$BACKUP_PING_URL$1" > /dev/null || true
  fi
}

case "${1:-daily}" in
  now) backup ;;
  check) check ;;
  restore) pg_restore --clean --if-exists --no-owner --exit-on-error -d "$PGDATABASE" "${2:?usage: backup restore <file>}" ;;
  daily)
    while true; do
      now=$(date -u +%s)
      next=$(date -u -d "today ${BACKUP_AT:-08:00}" +%s)
      [ "$next" -gt "$now" ] || next=$(date -u -d "tomorrow ${BACKUP_AT:-08:00}" +%s)
      sleep $((next - now))
      if "$0" now; then report ""; else report /fail; fi
    done
    ;;
  *)
    echo "usage: backup [daily|now|check|restore <file>]" >&2
    exit 2
    ;;
esac
