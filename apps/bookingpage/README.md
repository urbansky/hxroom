# HxRoom Bookingpage (Klienten-Subdomain)

Vue 3 SPA für Klienten – gebrandete Buchungsseite, Buchung, Warteraum und Videocall (LiveKit). Läuft unter `[slug].hxroom.de`.

## Docker

Das Image wird per GitHub Actions gebaut und in die GitHub Container Registry gepusht (`ghcr.io/urbansky/hxroom/bookingpage`).

### Lokal bauen

Der Build-Kontext ist das **Monorepo-Root** (wegen Workspace-Abhängigkeiten):

```bash
# Aus dem Repository-Root:
docker build -f apps/bookingpage/Dockerfile -t hxroom-bookingpage .
```

### Lokal starten

```bash
docker run --rm -p 5174:80 hxroom-bookingpage
```

Die App ist unter `http://localhost:5174` erreichbar.

### Multi-Stage Build

| Stage | Basis | Zweck |
|---|---|---|
| `deps` | node:22-alpine | pnpm install (gecached) |
| `build` | deps | Vite-Build mit @hxroom/shared + @hxroom/ui |
| Production | nginx:alpine | Statische Auslieferung der SPA |
