# HxRoom Admin (Betreiber-Backoffice)

Nuxt 4 im SPA-Modus (`ssr: false`) für den Plattform-Betreiber – Coach-Verwaltung, Statistiken, Systemeinstellungen. Erreichbar unter `admin.hxroom.de`, lokal unter `http://admin.hxroom.localhost`.

## Zugang

Es gibt **keine Registrierung**. Betreiber-Accounts entstehen ausschließlich über das CLI-Skript der API:

```bash
pnpm --filter @hxroom/api admin:create --email betreiber@example.com --name "Vorname Nachname"
```

Angemeldet wird sich mit der plattformweiten Rolle `admin` (better-auth admin-Plugin). Ein Coach-Account wird beim Login abgewiesen und wieder abgemeldet – Details in [`doc/technisches-konzept.md`](../../doc/technisches-konzept.md) §7, Abschnitt „Betreiber-Zugang".

## Entwicklung

```bash
pnpm --filter @hxroom/admin dev
```

Der Dev-Server lauscht auf Port **5175**; der Dev-Caddy routet `admin.hxroom.localhost` fest dorthin. Die API-Adressen kommen aus `.env` (`NUXT_PUBLIC_API_URL`, `NUXT_PUBLIC_AUTH_URL`) – Vorlage in `.env.example`.

Der Login funktioniert nur über `admin.hxroom.localhost`, nicht über `localhost:5175`: nur die Caddy-Domain steht in `CORS_ORIGINS` der API.

## Docker

Das Image wird per GitHub Actions gebaut und in die GitHub Container Registry gepusht (`ghcr.io/urbansky/hxroom/admin`).

### Lokal bauen

Der Build-Kontext ist das **Monorepo-Root** (wegen Workspace-Abhängigkeiten):

```bash
# Aus dem Repository-Root:
docker build -f apps/admin/Dockerfile -t hxroom-admin .
```

Die `NUXT_PUBLIC_*`-Werte werden zur **Build-Zeit** ins Bundle eingebettet und zeigen per Default auf `https://api.hxroom.de`. Für ein Image gegen eine andere API:

```bash
docker build -f apps/admin/Dockerfile \
  --build-arg NUXT_PUBLIC_API_URL=http://api.hxroom.localhost/api/v1 \
  --build-arg NUXT_PUBLIC_AUTH_URL=http://api.hxroom.localhost \
  -t hxroom-admin .
```

### Lokal starten

```bash
docker run --rm -p 5175:80 hxroom-admin
```

Die App ist unter `http://localhost:5175` erreichbar.

### Multi-Stage Build

| Stage | Basis | Zweck |
|---|---|---|
| `deps` | node:22-alpine | pnpm install (gecached) |
| `build` | deps | `nuxt generate` mit @hxroom/shared + @hxroom/ui → `.output/public` |
| Production | nginx:alpine | Statische Auslieferung der SPA, `X-Robots-Tag: noindex` |
