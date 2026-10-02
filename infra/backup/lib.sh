#!/usr/bin/env bash
# Gemeinsame Funktionen der Backup-Skripte: Logging, rclone-Zugänge, Checkly-Ping, Fehler-Mail.
# Wird per `source` eingebunden, setzt selbst keine Shell-Optionen.
#
# Logs enthalten keine Personendaten: nur Schritte, Objektnamen und Größen.

JOB="${JOB:-backup}"
ERRLOG="$(mktemp)"

log() {
  printf '%s [%s] %s\n' "$(date -Iseconds)" "$JOB" "$*"
}

require_env() {
  local missing=()
  for name in "$@"; do
    [[ -n "${!name:-}" ]] || missing+=("$name")
  done
  if (( ${#missing[@]} )); then
    log "Fehlende Umgebungsvariablen: ${missing[*]}"
    exit 2
  fi
}

# Zwei rclone-Remotes über Umgebungsvariablen statt einer Konfigurationsdatei:
#   src – der Datei-Bucket der Anwendung (S3_*, dieselben Werte wie für die API)
#   dst – der Backup-Bucket im eigenen Hetzner-Projekt (BACKUP_S3_*)
# no_check_bucket: rclone versucht sonst, einen fehlenden Bucket anzulegen. Ein Tippfehler im
# Namen soll als Fehler auffallen, nicht als neuer leerer Bucket.
setup_rclone() {
  export RCLONE_CONFIG_SRC_TYPE=s3
  export RCLONE_CONFIG_SRC_PROVIDER=Other
  export RCLONE_CONFIG_SRC_ENDPOINT="${S3_ENDPOINT:-}"
  export RCLONE_CONFIG_SRC_REGION="${S3_REGION:-}"
  export RCLONE_CONFIG_SRC_ACCESS_KEY_ID="${S3_ACCESS_KEY:-}"
  export RCLONE_CONFIG_SRC_SECRET_ACCESS_KEY="${S3_SECRET_KEY:-}"
  export RCLONE_CONFIG_SRC_FORCE_PATH_STYLE="${S3_FORCE_PATH_STYLE:-false}"
  export RCLONE_CONFIG_SRC_NO_CHECK_BUCKET=true

  export RCLONE_CONFIG_DST_TYPE=s3
  export RCLONE_CONFIG_DST_PROVIDER=Other
  export RCLONE_CONFIG_DST_ENDPOINT="${BACKUP_S3_ENDPOINT:-}"
  export RCLONE_CONFIG_DST_REGION="${BACKUP_S3_REGION:-}"
  export RCLONE_CONFIG_DST_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY:-}"
  export RCLONE_CONFIG_DST_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_KEY:-}"
  export RCLONE_CONFIG_DST_FORCE_PATH_STYLE="${BACKUP_S3_FORCE_PATH_STYLE:-false}"
  export RCLONE_CONFIG_DST_NO_CHECK_BUCKET=true
  export RCLONE_CONFIG_DST_ACL=private

  SRC="src:${S3_BUCKET:-}"
  DST="dst:${BACKUP_S3_BUCKET:-}"
}

# Postgres-Zugang für pg_dump, pg_restore und psql aus denselben Variablen wie die API.
setup_postgres() {
  export PGHOST="${POSTGRES_HOST:-postgres}"
  export PGPORT="${POSTGRES_PORT:-5432}"
  export PGUSER="${POSTGRES_USER:-}"
  export PGPASSWORD="${POSTGRES_PASSWORD:-}"
}

# Die Datumsangabe im Objektnamen (YYYY-MM-DD) entscheidet über das Alter, nicht der
# Zeitstempel im Bucket: Beim Verschieben in den Papierkorb behält rclone den ursprünglichen
# Zeitstempel, eine vor einem Jahr hochgeladene Datei wäre dort sofort „alt“.
cutoff_date() {
  date -d "-$1 days" +%F
}

# Totmannschalter: nur nach Erfolg. Bleibt der Ping aus, meldet sich Checkly nach Ablauf der
# Karenzzeit. Ein gescheiterter Ping bricht den Lauf nicht ab – das Backup ist ja da.
ping_heartbeat() {
  local url="$1"
  if [[ -z "$url" ]]; then
    log "Kein Heartbeat konfiguriert, Ping übersprungen"
    return 0
  fi
  if curl -fsS -m 10 --retry 3 -o /dev/null "$url"; then
    log "Heartbeat gesendet"
  else
    log "Heartbeat konnte nicht gesendet werden"
  fi
}

# Fehler-Mail über die Brevo-API, sofort und unabhängig von Checkly.
send_failure_mail() {
  local subject="$1" body="$2"
  if [[ -z "${BREVO_API_KEY:-}" || -z "${BACKUP_ALERT_EMAIL:-}" ]]; then
    log "Keine Fehler-Mail konfiguriert (BREVO_API_KEY/BACKUP_ALERT_EMAIL), nur geloggt"
    return 0
  fi
  if jq -n \
      --arg sender "${BREVO_SENDER_EMAIL:-noreply@hxroom.de}" \
      --arg senderName "${BREVO_SENDER_NAME:-HxRoom}" \
      --arg to "$BACKUP_ALERT_EMAIL" \
      --arg subject "$subject" \
      --arg text "$body" \
      '{sender: {email: $sender, name: $senderName}, to: [{email: $to}], subject: $subject, textContent: $text}' |
    curl -fsS -m 20 -o /dev/null -X POST https://api.brevo.com/v3/smtp/email \
      -H "api-key: ${BREVO_API_KEY}" -H "content-type: application/json" -d @-; then
    log "Fehler-Mail gesendet"
  else
    log "Fehler-Mail konnte nicht gesendet werden"
  fi
}

# Fehlerbehandlung für `trap ... ERR`. STEP benennt den Schritt, in dem es scheiterte; die
# letzten Zeilen der Fehlerausgabe kommen mit in die Mail.
on_error() {
  local status=$? line="$1"
  trap - ERR
  log "FEHLGESCHLAGEN, Schritt: ${STEP:-unbekannt} (Zeile ${line}, Status ${status})"
  [[ -n "${CLEANUP:-}" ]] && eval "$CLEANUP" || true
  send_failure_mail \
    "[HxRoom ${BACKUP_LABEL:-Backup}] ${JOB} fehlgeschlagen" \
    "$(printf 'Job: %s\nSchritt: %s\nStatus: %s\nZeitpunkt: %s\n\nLetzte Fehlerausgabe:\n%s\n' \
        "$JOB" "${STEP:-unbekannt}" "$status" "$(date -Iseconds)" "$(tail -n 20 "$ERRLOG")")"
  exit "$status"
}

# Fehlerausgabe zusätzlich mitschreiben, damit on_error sie in die Mail legen kann.
capture_stderr() {
  exec 2> >(tee -a "$ERRLOG" >&2)
}
