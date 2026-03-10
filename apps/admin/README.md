# HxRoom Admin (Betreiber-Backoffice)

Vue 3 SPA für den Plattform-Betreiber – Coach-Verwaltung, Statistiken, Systemeinstellungen.

## Docker

Das Image wird per GitHub Actions gebaut und in die GitHub Container Registry gepusht (`ghcr.io/hxroom/hxroom-admin`).

### Lokal bauen

Der Build-Kontext ist das **Monorepo-Root** (wegen Workspace-Abhängigkeiten):

```bash
# Aus dem Repository-Root:
docker build -f apps/admin/Dockerfile -t hxroom-admin .
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
| `build` | deps | Vite-Build mit @hxroom/shared + @hxroom/ui |
| Production | nginx:alpine | Statische Auslieferung der SPA |
