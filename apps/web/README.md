# HxRoom Web (Coach-Backoffice)

Vue 3 SPA für Coaches – Terminverwaltung, Branding, Klienten-CRM.

## Docker

Das Image wird per GitHub Actions gebaut und in die GitHub Container Registry gepusht (`ghcr.io/hxroom/hxroom-web`).

### Lokal bauen

Der Build-Kontext ist das **Monorepo-Root** (wegen Workspace-Abhängigkeiten):

```bash
# Aus dem Repository-Root:
docker build -f apps/web/Dockerfile -t hxroom-web .
```

### Lokal starten

```bash
docker run --rm -p 5173:80 hxroom-web
```

Die App ist unter `http://localhost:5173` erreichbar.

### Multi-Stage Build

| Stage | Basis | Zweck |
|---|---|---|
| `deps` | node:22-alpine | pnpm install (gecached) |
| `build` | deps | Vite-Build mit @hxroom/shared + @hxroom/ui |
| Production | nginx:alpine | Statische Auslieferung der SPA |
