#!/usr/bin/env bash
# Redeploy des Produktivstacks auf dem Hetzner-Server.
#
# Holt die zuletzt von der CI gebauten Images (ghcr.io/urbansky/hxroom/*:latest) und die
# übrigen Images neu, baut caddy und backup und startet nur die Dienste neu, an denen sich
# etwas geändert hat (Image, Compose-Konfiguration, .env oder eingebundene Konfigurations-
# datei). Alles andere läuft weiter – ein Frontend-Update unterbricht so kein laufendes
# Gespräch. Danach werden dangling Images (alte :latest-Layer) aufgeräumt, damit der
# Server-Datenträger nicht vollläuft.
#
# Ausführen auf dem Server im infra/-Verzeichnis (dort liegt docker-compose.yml), nach
# einem `git pull`:
#
#   ./redeploy.sh
#
# Voraussetzung: Der Server ist bereits per "docker login ghcr.io" gegen die
# GitHub Container Registry authentifiziert.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

green=$'\033[32m'; reset=$'\033[0m'
step() { printf '%s==>%s %s\n' "$green" "$reset" "$*"; }

# Compose v2 (Plugin, "docker compose") bevorzugen, sonst v1 ("docker-compose")
if docker compose version >/dev/null 2>&1; then
    compose=(docker compose)
else
    compose=(docker-compose)
fi

# Als einzelne Datei eingebundene Konfiguration, je Dienst. Änderungen daran sieht Compose
# nicht, und ein laufender Container sieht sie auch nicht: Git ersetzt eine geänderte Datei
# durch eine neue, die Einbindung zeigt weiter auf die alte. Erst ein Neustart des
# Containers bindet die neue ein – deshalb merkt sich das Skript die Prüfsummen.
declare -A config_files=(
    [caddy]=caddy/Caddyfile
    [livekit]=livekit/livekit.yaml
)
state_dir=.redeploy-state
mkdir -p "$state_dir"

checksum() { sha256sum "$1" | cut -d' ' -f1; }

step "Hole aktuelle Images"
"${compose[@]}" pull

# Caddy und Backup werden hier gebaut, nicht in der CI. `pull` erneuert sie nicht, und
# `up -d --build` würde auch alle Apps aus dem Quelltext neu bauen (sie haben ebenfalls einen
# build-Abschnitt) statt die Images aus der CI zu nehmen – deshalb gezielt nur diese beiden.
# Ohne Änderung kommt aus dem Cache dasselbe Image heraus, der Dienst gilt dann als unverändert.
step "Baue lokale Images (caddy, backup)"
"${compose[@]}" build caddy backup

# Kein `down` vorher: `up -d` erstellt nur Container neu, deren Image oder Konfiguration sich
# geändert hat. --remove-orphans räumt Dienste ab, die aus der Compose-Datei entfernt wurden.
step "Starte geänderte Dienste neu"
"${compose[@]}" up -d --remove-orphans

for service in "${!config_files[@]}"; do
    file=${config_files[$service]}
    current=$(checksum "$file")
    saved=$(cat "$state_dir/$service.sha256" 2>/dev/null || true)
    # Ohne gespeicherte Prüfsumme (erster Lauf) lieber einmal zu oft neu starten als eine
    # Änderung zu verpassen.
    if [[ "$current" != "$saved" ]]; then
        step "Konfiguration von $service geändert ($file), starte $service neu"
        "${compose[@]}" restart "$service"
        echo "$current" > "$state_dir/$service.sha256"
    fi
done

step "Räume alte, ungenutzte Images auf"
docker image prune -f

step "Status"
"${compose[@]}" ps

echo
printf '%sRedeploy abgeschlossen.%s Logs prüfen mit:\n' "$green" "$reset"
echo "  ${compose[*]} logs -f api"
