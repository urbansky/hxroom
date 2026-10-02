#!/usr/bin/env bash
# Nächtliches Datenbank-Backup:
#   pg_dump (Custom-Format, komprimiert) → age-verschlüsselt → Backup-Bucket db/daily/
#   sonntags zusätzlich db/weekly/, am Monatsersten db/monthly/
#   Aufbewahrung: 7 Tage, 4 Wochen, 3 Monate
#
# Von Hand: docker compose run --rm backup backup-db.sh
set -Eeuo pipefail

JOB=backup-db
source /usr/local/bin/lib.sh
trap 'on_error $LINENO' ERR
capture_stderr

require_env POSTGRES_DB POSTGRES_USER POSTGRES_PASSWORD \
  BACKUP_S3_ENDPOINT BACKUP_S3_ACCESS_KEY BACKUP_S3_SECRET_KEY BACKUP_S3_BUCKET \
  BACKUP_AGE_RECIPIENTS
setup_postgres
setup_rclone

# Mehrere Empfänger möglich (Leerzeichen oder Komma), z. B. der Backup-Schlüssel und ein
# zweiter im Passwortmanager – jeder davon kann den Stand allein entschlüsseln.
recipients=()
for r in ${BACKUP_AGE_RECIPIENTS//,/ }; do
  recipients+=(-r "$r")
done

name="hxroom_$(date +%Y-%m-%d_%H%M%S).dump.age"
target="$DST/db/daily/$name"

STEP="pg_dump und Upload"
log "Starte Dump von ${POSTGRES_DB}"
# Scheitert der Dump mittendrin, liegt sonst ein halbes Objekt im Bucket, das wie ein
# gültiges Backup aussieht.
CLEANUP="rclone deletefile '$target' >/dev/null 2>&1"
pg_dump --format=custom --no-owner --no-privileges --dbname="$POSTGRES_DB" |
  age "${recipients[@]}" |
  rclone rcat "$target"

STEP="Größe prüfen"
size=$(rclone lsjson "$target" | jq '.[0].Size')
# Ein leerer Dump einer laufenden Datenbank hat schon einige Kilobyte Schema. Weniger heißt:
# Hier ist etwas schiefgegangen, ohne dass ein Befehl einen Fehler gemeldet hat.
if (( size < 4096 )); then
  echo "Dump unerwartet klein: ${size} Bytes" >&2
  false
fi
CLEANUP=""
log "Gesichert: db/daily/${name} (${size} Bytes)"

STEP="Wochen- und Monatskopie"
if [[ "$(date +%u)" == 7 ]]; then
  rclone copyto "$target" "$DST/db/weekly/$name"
  log "Wochenkopie angelegt"
fi
if [[ "$(date +%d)" == 01 ]]; then
  rclone copyto "$target" "$DST/db/monthly/$name"
  log "Monatskopie angelegt"
fi

STEP="Aufräumen"
# Löscht Stände, deren Datum im Namen älter ist als die Frist.
prune() {
  local dir="$1" keep_days="$2" cutoff file day removed=0
  cutoff=$(cutoff_date "$((keep_days - 1))")
  while IFS= read -r file; do
    [[ "$file" =~ ^hxroom_([0-9]{4}-[0-9]{2}-[0-9]{2})_ ]] || continue
    day="${BASH_REMATCH[1]}"
    if [[ "$day" < "$cutoff" ]]; then
      rclone deletefile "$DST/$dir/$file"
      removed=$((removed + 1))
    fi
  # Ein noch nie befüllter Ordner (db/monthly vor dem ersten Monatsersten) meldet „directory
  # not found“ – hier heißt das nur: nichts aufzuräumen.
  done < <(rclone lsf --files-only "$DST/$dir" 2>/dev/null)
  log "Aufgeräumt: ${dir}, ${removed} Stand/Stände entfernt (Frist ${keep_days} Tage)"
}
prune db/daily 7
prune db/weekly 28
prune db/monthly 92

ping_heartbeat "${CHECKLY_HEARTBEAT_DB:-}"
log "Fertig"
