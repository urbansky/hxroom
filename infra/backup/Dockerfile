# Backup-Dienst: nächtlicher pg_dump und Off-Site-Kopie der Dateien.
# Ablauf und Wiederherstellung: doc/phase5-umsetzungsplan.md (Schritt 1a), technisches-konzept.md §13.
#
# postgresql17-client passend zum Server (postgres:17-alpine): pg_dump verweigert den Dump
# eines neueren Servers. supercronic statt crond, weil crond die Umgebungsvariablen des
# Containers nicht an die Jobs weiterreicht. coreutils für `date -d "-7 days"`, das kann das
# date von Busybox nicht.
FROM alpine:3.22

RUN apk add --no-cache \
      age \
      bash \
      ca-certificates \
      coreutils \
      curl \
      jq \
      postgresql17-client \
      rclone \
      supercronic \
      tzdata

# rclone nur mit Fehlern auf stderr: Die Skripte loggen selbst, und rclones Hinweise würden
# sonst in der Fehler-Mail landen. Die leere Konfigurationsdatei spart die Meldung „Config file
# not found“ – die Remotes kommen aus Umgebungsvariablen (lib.sh).
ENV TZ=Europe/Berlin \
    RCLONE_LOG_LEVEL=ERROR

COPY lib.sh backup-db.sh sync-files.sh restore-db.sh /usr/local/bin/
COPY crontab /etc/backup/crontab
RUN chmod +x /usr/local/bin/*.sh \
 && mkdir -p /root/.config/rclone \
 && touch /root/.config/rclone/rclone.conf

# Absoluter Pfad: Als PID 1 startet supercronic sich selbst neu, um verwaiste Prozesse
# einzusammeln, und findet sich mit bloßem Namen nicht („Failed to fork exec“).
CMD ["/usr/bin/supercronic", "/etc/backup/crontab"]
