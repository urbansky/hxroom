# HxRoom Client

Vue 3 SPA für Klienten – Coach-Landingpage, Buchung, Videocall.

## Docker

Das Image wird per GitHub Actions gebaut und in die GitHub Container Registry gepusht (`ghcr.io/hxroom/hxroom-client`).

### Lokal bauen

Der Build-Kontext ist das **Monorepo-Root** (wegen Workspace-Abhängigkeiten):

```bash
# Aus dem Repository-Root:
docker build -f apps/client/Dockerfile -t hxroom-client .
```

### Lokal starten

```bash
docker run --rm -p 5174:80 hxroom-client
```

Die App ist unter `http://localhost:5174` erreichbar.

### Multi-Stage Build

| Stage | Basis | Zweck |
|---|---|---|
| `deps` | node:22-alpine | pnpm install (gecached) |
| `build` | deps | Vite-Build mit @hxroom/shared + @hxroom/ui |
| Production | nginx:alpine | Statische Auslieferung der SPA |
