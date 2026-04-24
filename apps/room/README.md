# HxRoom Room (Klienten-Subdomain)

Vue 3 SPA für Klienten – gebrandete Coach-Landingpage, Buchung, Warteraum und Videocall (LiveKit). Läuft unter `[slug].hxroom.de`.

## Docker

Das Image wird per GitHub Actions gebaut und in die GitHub Container Registry gepusht (`ghcr.io/urbansky/hxroom/room`).

### Lokal bauen

Der Build-Kontext ist das **Monorepo-Root** (wegen Workspace-Abhängigkeiten):

```bash
# Aus dem Repository-Root:
docker build -f apps/room/Dockerfile -t hxroom-room .
```

### Lokal starten

```bash
docker run --rm -p 5174:80 hxroom-room
```

Die App ist unter `http://localhost:5174` erreichbar.

### Multi-Stage Build

| Stage | Basis | Zweck |
|---|---|---|
| `deps` | node:22-alpine | pnpm install (gecached) |
| `build` | deps | Vite-Build mit @hxroom/shared + @hxroom/ui |
| Production | nginx:alpine | Statische Auslieferung der SPA |
