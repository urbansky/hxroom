# HxRoom Landing

Vue 3 SPA – Landingpage unter hxroom.io.

## Docker

Das Image wird per GitHub Actions gebaut und in die GitHub Container Registry gepusht (`ghcr.io/hxroom/hxroom-landing`).

### Lokal bauen

Der Build-Kontext ist das **Monorepo-Root** (wegen Workspace-Abhängigkeiten):

```bash
# Aus dem Repository-Root:
docker build -f apps/landing/Dockerfile -t hxroom-landing .
```

### Lokal starten

```bash
docker run --rm -p 5176:80 hxroom-landing
```

Die App ist unter `http://localhost:5176` erreichbar.

### Multi-Stage Build

| Stage | Basis | Zweck |
|---|---|---|
| `deps` | node:22-alpine | pnpm install (gecached) |
| `build` | deps | Vite-Build mit @hxroom/ui |
| Production | nginx:alpine | Statische Auslieferung der SPA |
