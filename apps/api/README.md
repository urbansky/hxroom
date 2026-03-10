# HxRoom API

NestJS Backend-Server mit PostgreSQL, Drizzle ORM und better-auth.

## Docker

Das Image wird per GitHub Actions gebaut und in die GitHub Container Registry gepusht (`ghcr.io/hxroom/hxroom-api`).

### Lokal bauen

Der Build-Kontext ist das **Monorepo-Root** (wegen Workspace-Abhängigkeiten):

```bash
# Aus dem Repository-Root:
docker build -f apps/api/Dockerfile -t hxroom-api .
```

### Lokal starten

```bash
docker run --rm -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/hxroom" \
  hxroom-api
```

Der Server läuft auf Port **3000**.

### Multi-Stage Build

| Stage | Basis | Zweck |
|---|---|---|
| `deps` | node:22-alpine | pnpm install (gecached) |
| `build` | deps | Kompiliert @hxroom/shared + API |
| `production` | node:22-alpine | Nur Prod-Dependencies + dist/ |
