#!/usr/bin/env bash
# Nächtliche Off-Site-Kopie der Dateien:
#   Datei-Bucket der Anwendung → Backup-Bucket files/current/
#   Im Original Gelöschtes wandert nach files/deleted/<Datum>/ und bleibt dort 30 Tage.
#
# So lässt sich ein versehentliches Löschen rückgängig machen, und gewollt Gelöschtes
# (Klient entfernt eine Datei, DSGVO-Löschung) ist nach 30 Tagen auch aus der Kopie weg.
#
# Von Hand: docker compose run --rm backup sync-files.sh
set -Eeuo pipefail

JOB=sync-files
source /usr/local/bin/lib.sh
trap 'on_error $LINENO' ERR
capture_stderr

require_env S3_ENDPOINT S3_ACCESS_KEY S3_SECRET_KEY S3_BUCKET \
  BACKUP_S3_ENDPOINT BACKUP_S3_ACCESS_KEY BACKUP_S3_SECRET_KEY BACKUP_S3_BUCKET
setup_rclone

KEEP_DELETED_DAYS=30
today=$(date +%F)

STEP="Spiegeln"
log "Spiegele ${S3_BUCKET} nach files/current"
rclone sync "$SRC" "$DST/files/current" \
  --backup-dir "$DST/files/deleted/$today" \
  --fast-list \
  --stats 0 --stats-log-level NOTICE
count=$(rclone size --json --fast-list "$DST/files/current" | jq '.count')
log "Gespiegelt: ${count} Datei(en) in files/current"

STEP="Papierkorb aufräumen"
cutoff=$(cutoff_date "$KEEP_DELETED_DAYS")
removed=0
while IFS= read -r dir; do
  day="${dir%/}"
  [[ "$day" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] || continue
  if [[ "$day" < "$cutoff" ]]; then
    rclone purge "$DST/files/deleted/$day"
    removed=$((removed + 1))
  fi
done < <(rclone lsf --dirs-only "$DST/files/deleted" 2>/dev/null) # leer, solange nie etwas gelöscht wurde
log "Papierkorb: ${removed} Tagesordner entfernt (Frist ${KEEP_DELETED_DAYS} Tage)"

ping_heartbeat "${CHECKLY_HEARTBEAT_FILES:-}"
log "Fertig"
