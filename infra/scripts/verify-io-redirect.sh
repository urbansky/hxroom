#!/usr/bin/env bash
# Verifiziert, dass hxroom.io pfadgenau per genau einem 301-Hop auf hxroom.de
# weiterleitet. Ausführen nach einem Deploy, z.B. als Smoke-Test:
#
#   ./infra/scripts/verify-io-redirect.sh
#
# Exit-Code 0 bei Erfolg, 1 sobald ein Check fehlschlägt.

set -u

fail=0
green=$'\033[32m'; red=$'\033[31m'; dim=$'\033[2m'; reset=$'\033[0m'
ok()  { printf '  %s✓%s %s\n' "$green" "$reset" "$*"; }
err() { printf '  %s✗%s %s\n' "$red" "$reset" "$*"; fail=1; }

# check <desc> <src-url> <expected-location> [verify-chain: true|false]
#
# verify-chain=false überspringt den Folge-Request und prüft nur Status+Location.
# Sinnvoll für Subdomains, deren .de-Pendant aktuell (noch) nicht deployt ist –
# ein scheiternder Follow sagt dann nichts über die Redirect-Config aus.
check() {
    local desc="$1" src="$2" want="$3" verify="${4:-true}"
    local head status location

    if ! head=$(curl -sI --max-time 10 "$src" 2>/dev/null); then
        err "$desc – Request gescheitert: $src"
        return
    fi

    status=$(printf '%s' "$head" | awk 'NR==1 {print $2}')
    location=$(printf '%s' "$head" \
        | grep -i '^location:' \
        | head -n1 \
        | sed -E 's/^[Ll]ocation:[[:space:]]*//; s/\r$//')

    if [ "$status" != "301" ]; then
        err "$desc – Status '$status' (erwartet 301) bei $src"
        return
    fi
    if [ "$location" != "$want" ]; then
        err "$desc – Location '$location' ≠ '$want'"
        return
    fi

    if [ "$verify" = "true" ]; then
        local hops
        hops=$(curl -sIL -o /dev/null -w '%{num_redirects}' --max-time 10 "$src" 2>/dev/null)
        if [ "$hops" != "1" ]; then
            err "$desc – $hops Hops (Redirect-Kette)"
            return
        fi
        ok "$desc  ${dim}[$src → $location, 1 Hop]${reset}"
    else
        ok "$desc  ${dim}[$src → $location, Chain-Check übersprungen]${reset}"
    fi
}

echo "Redirect-Check hxroom.io → hxroom.de"
echo

# Apex (.de-Landing ist live → inkl. Chain-Check)
check "HTTP Apex"                 "http://hxroom.io/"                   "https://hxroom.de/"
check "HTTPS Apex + Pfad"         "https://hxroom.io/pricing"           "https://hxroom.de/pricing"
check "Pfad + Query-String"       "https://hxroom.io/foo?bar=1&baz=2"   "https://hxroom.de/foo?bar=1&baz=2"
check "www wird auf Apex gestrippt" "https://www.hxroom.io/"            "https://hxroom.de/"

# Wildcard: *.hxroom.de → client ist live, also auch hier Chain-Check
check "Klienten-Subdomain (Slug)" "https://anna.hxroom.io/booking/42"   "https://anna.hxroom.de/booking/42"

# Subdomains, deren .de-Pendant aktuell (noch) nicht deployt ist → nur Header-Check.
# Sobald app/admin/api.hxroom.de live sind, die false-Flags entfernen.
check "app-Subdomain"             "https://app.hxroom.io/login"         "https://app.hxroom.de/login"   false
check "admin-Subdomain"           "https://admin.hxroom.io/"            "https://admin.hxroom.de/"      false
check "api-Subdomain"             "https://api.hxroom.io/v1/health"     "https://api.hxroom.de/v1/health" false

echo
if [ "$fail" -eq 0 ]; then
    printf '%sAlle Checks OK.%s\n' "$green" "$reset"
    exit 0
fi
printf '%sMindestens ein Check fehlgeschlagen.%s\n' "$red" "$reset"
exit 1
