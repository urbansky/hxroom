#!/usr/bin/env bash
# Redeploy des Produktivstacks auf dem Hetzner-Server.
#
# Stoppt den laufenden Compose-Stack, holt die zuletzt von der CI gebauten
# Images (ghcr.io/urbansky/hxroom/*:latest) sowie postgres neu und startet
# den Stack wieder. Danach werden dangling Images (alte :latest-Layer)
# aufgeräumt, damit der Server-Datenträger nicht vollläuft.
#
# Ausführen auf dem Server im infra/-Verzeichnis (dort liegt docker-compose.yml):
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

step "Stoppe laufenden Stack"
"${compose[@]}" down

step "Hole aktuelle Images"
"${compose[@]}" pull

step "Starte Stack neu"
"${compose[@]}" up -d

step "Räume alte, ungenutzte Images auf"
docker image prune -f

step "Status"
"${compose[@]}" ps

echo
printf '%sRedeploy abgeschlossen.%s Logs prüfen mit:\n' "$green" "$reset"
echo "  ${compose[*]} logs -f api"
