#!/usr/bin/env bash
# Spielt einen Datenbankstand aus dem Backup-Bucket in eine Datenbank ein.
#
#   restore-db.sh <stand> <ziel-datenbank>
#
#   <stand>  „latest“ (jüngster Tagesstand) oder ein Pfad relativ zu db/,
#            z. B. daily/hxroom_2026-10-02_030000.dump.age
#
# Die Zieldatenbank wird angelegt. Existiert sie schon, muss sie leer sein – ein Einspielen
# über bestehende Daten verweigert das Skript. Auf einem frisch aufgesetzten Server ist die
# von Postgres angelegte, leere Datenbank deshalb ein gültiges Ziel.
#
# Braucht den geheimen age-Schlüssel als Datei (BACKUP_AGE_IDENTITY). Der gehört nicht dauerhaft
# auf den Produktivserver, sondern wird nur für die Wiederherstellung bereitgestellt.
# Anleitung: technisches-konzept.md §13, Abschnitt „Wiederherstellen“.
set -euo pipefail

JOB=restore-db
source /usr/local/bin/lib.sh

if (( $# != 2 )); then
  echo "Aufruf: restore-db.sh <latest|daily/…|weekly/…|monthly/…> <ziel-datenbank>" >&2
  exit 2
fi
stand="$1"
target_db="$2"

require_env POSTGRES_USER POSTGRES_PASSWORD BACKUP_AGE_IDENTITY \
  BACKUP_S3_ENDPOINT BACKUP_S3_ACCESS_KEY BACKUP_S3_SECRET_KEY BACKUP_S3_BUCKET
[[ -r "$BACKUP_AGE_IDENTITY" ]] || { log "Schlüsseldatei nicht lesbar: $BACKUP_AGE_IDENTITY"; exit 2; }
setup_postgres
setup_rclone

if [[ "$stand" == latest ]]; then
  file=$(rclone lsf --files-only "$DST/db/daily" | grep '^hxroom_' | sort | tail -n 1)
  [[ -n "$file" ]] || { log "Kein Tagesstand im Backup-Bucket gefunden"; exit 1; }
  stand="daily/$file"
fi
log "Stand: db/${stand}"

# Ziel anlegen oder prüfen, dass es leer ist. psql verbindet sich dafür mit der
# Standarddatenbank `postgres`.
exists=$(psql -d postgres -Atc "select 1 from pg_database where datname = '${target_db//\'/\'\'}'")
if [[ "$exists" == 1 ]]; then
  tables=$(psql -d "$target_db" -Atc "select count(*) from information_schema.tables where table_schema = 'public'")
  if (( tables > 0 )); then
    log "Zieldatenbank ${target_db} ist nicht leer (${tables} Tabellen) – Abbruch"
    exit 1
  fi
  log "Zieldatenbank ${target_db} existiert und ist leer"
else
  createdb "$target_db"
  log "Zieldatenbank ${target_db} angelegt"
fi

log "Spiele ein …"
rclone cat "$DST/db/$stand" |
  age -d -i "$BACKUP_AGE_IDENTITY" |
  pg_restore --no-owner --no-privileges --exit-on-error --dbname="$target_db"

# Zeilen je Tabelle – zum Vergleich mit der Quelle bei der Abnahme.
log "Eingespielt. Zeilen je Tabelle:"
psql -d "$target_db" -Atc "select table_name from information_schema.tables
  where table_schema = 'public' and table_type = 'BASE TABLE' order by 1" |
while IFS= read -r table; do
  printf '  %-36s %s\n' "$table" "$(psql -d "$target_db" -Atc "select count(*) from \"${table}\"")"
done
log "Fertig"
