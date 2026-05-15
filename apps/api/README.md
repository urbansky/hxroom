# HxRoom API

NestJS Backend-Server mit PostgreSQL, Drizzle ORM und better-auth.

## Lokale Entwicklung

### 1. PostgreSQL starten

Port 5432 ist auf diesem Rechner belegt – die Dev-Instanz läuft auf **5433**:

```bash
docker run --rm -d \
  --name hxroom-postgres \
  -e POSTGRES_USER=hxroom \
  -e POSTGRES_PASSWORD=hxroom \
  -e POSTGRES_DB=hxroom \
  -p 5433:5432 \
  postgres:16-alpine
```

Stoppen (Container wird dabei gelöscht, Daten gehen verloren):

```bash
docker stop hxroom-postgres
```

### 2. Umgebungsvariablen setzen

Datei `apps/api/.env` anlegen (wird von Drizzle und NestJS gelesen):

```
DATABASE_URL=postgresql://hxroom:hxroom@localhost:5433/hxroom

# Brevo – Newsletter
BREVO_API_KEY=xkeysib-...
BREVO_LIST_ID=5
BREVO_DOI_TEMPLATE_ID=12
BREVO_REDIRECT_URL=https://hxroom.de/newsletter/bestaetigt
```

### 3. Schema migrieren

```bash
# Aus dem Monorepo-Root:
pnpm --filter @hxroom/api db:generate   # SQL-Migrations erzeugen (nur bei Schema-Änderungen)
pnpm --filter @hxroom/api db:migrate    # Migrations auf die DB anwenden
```

### 4. API starten

```bash
pnpm --filter @hxroom/api dev
```

Der Server läuft auf **http://localhost:3000**. Endpunkt prüfen:

```bash
curl http://localhost:3000/api/v1/health
# → {"status":"ok"}
```

---

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
