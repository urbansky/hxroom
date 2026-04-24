# HxRoom – S3-Verzeichnisschema
*Version 1.1 · Stand: April 2026 · S3-kompatibel; primär Hetzner Object Storage, alternativ MinIO self-hosted*

---

## Designprinzipien

- **Top-Level = `coachId`** – beim Löschen eines Coachs genügt ein einziger Bucket-Prefix-Delete, um alle zugehörigen Daten zu entfernen (DSGVO-Löschpflicht)
- **Studios haben einen eigenen Prefix `studios/{studioId}/`** – Studio-Assets (Branding der Studioseite) sind von einzelnen Coaches entkoppelt; ein Wechsel des Studiobetreibers erfordert keine Datenmigration
- **Keine echten Dateinamen** – Dateien werden unter einer `fileId` (UUID) gespeichert; der ursprüngliche Dateiname und Mime-Type leben in der PostgreSQL-Datenbank
- **Feste Pfadstruktur** – Pfade werden im Code als Konstanten definiert, nie aus User-Input zusammengesetzt
- **Sitzungen (Sessions) gehören zum Coach** – die Coach-Klient-Zuordnung liegt in der DB, nicht im Pfad; so bleibt das Löschen simpel
- **Klientenübergabe = explizite S3-Migration** – bei einer Übergabe werden Klienten-Dateien aktiv von `{coachA}/clients/` nach `{coachB}/clients/` kopiert und anschließend gelöscht; kein dauerhafter Cross-Coach-Zugriff auf Dateiebene

---

## Vollständige Verzeichnisstruktur

### Solo-Coach (Trial / Basic / Pro)

```
{coachId}/
├── profile/
│   ├── avatar.{ext}                        # Profilbild des Coachs
│   └── logo.{ext}                          # Branding-Logo (White-Label-Ansicht)
│
├── clients/
│   └── {clientId}/
│       ├── avatar.{ext}                    # Profilbild des Klienten
│       └── documents/
│           └── {fileId}.{ext}             # Dateien im Klienten-Profil (Fragebögen, Verträge …)
│
├── sessions/
│   └── {sessionId}/
│       ├── recording.{ext}                 # Video-/Audio-Aufzeichnung (LiveKit Egress)
│       ├── transcript.txt                  # Whisper-Transkription (Plaintext)
│       └── attachments/
│           └── {fileId}.{ext}             # Während der Sitzung geteilte Dateien
│
└── resources/
    └── {fileId}.{ext}                      # Coach-eigene Vorlagen & Materialien
```

### Studio-Plan (zusätzlich)

```
studios/{studioId}/
└── profile/
    ├── logo.{ext}                          # Studio-Logo für die Studioseite
    └── cover.{ext}                         # Titelbild der Studioseite (Header-Banner)
```

Jeder Coach im Studio behält seinen eigenen `{coachId}/`-Prefix – unverändert. Die Studio-Struktur enthält ausschließlich geteilte, studiospezifische Assets. Klienten- und Sitzungsdaten verbleiben beim zuständigen Coach.

---

## Erläuterungen je Bereich

### `{coachId}/profile/`
Enthält die öffentlich sichtbaren Assets des Coachs. Wird beim Anlegen des Coach-Accounts angelegt.

| Datei | Beschreibung | Zugriff |
|---|---|---|
| `avatar.{ext}` | Rundes Profilbild (jpg/webp) | Presigned URL (lesend) |
| `logo.{ext}` | Logo für White-Label-Header | Presigned URL (lesend) |

Ein Überschreiben ersetzt die Datei unter demselben Pfad – kein Versioning nötig.

---

### `studios/{studioId}/profile/`
Enthält die geteilten Assets der Studioseite – unabhängig davon, welcher Coach der aktuelle Studiobetreiber ist.

| Datei | Beschreibung | Zugriff |
|---|---|---|
| `logo.{ext}` | Studio-Logo (erscheint auf der Studioseite und in E-Mails) | Presigned URL (lesend), alle Studio-Coaches |
| `cover.{ext}` | Titelbild / Header-Banner der Studioseite | Presigned URL (lesend), alle Studio-Coaches |

> **Entkopplung vom Betreiber:** Wechselt der Studiobetreiber (z. B. weil ein Coach die Rolle übernimmt), bleiben alle Studio-Assets unter demselben `studioId`-Prefix erhalten. Keine Datenmigration nötig.

---

### `{coachId}/clients/{clientId}/`
Klienten-Daten leben **unter dem Coach**, nicht eigenständig. Wird ein Coach gelöscht, verschwinden alle Klienten-Dateien automatisch mit dem Parent-Prefix.

| Pfad | Beschreibung |
|---|---|
| `avatar.{ext}` | Profilbild des Klienten |
| `documents/{fileId}.{ext}` | Vom Coach oder Klienten hochgeladene Dokumente (Anamnese, Hausaufgaben, Feedbackbögen) |

> **Hinweis:** Ein Klient kann theoretisch bei mehreren Coachs registriert sein. Seine Dateien liegen dann je Coach-Kontext separat – gewollt, da ein Coach keinen Zugriff auf den Kontext eines anderen Coachs haben darf.

---

### `{coachId}/sessions/{sessionId}/`
Sitzungs-Assets. Die Zuordnung `sessionId → clientId` erfolgt ausschließlich in der DB.

| Pfad | Beschreibung | Erzeugt durch |
|---|---|---|
| `recording.{ext}` | Video/Audio (mp4/webm) | LiveKit Egress → BullMQ-Job |
| `transcript.txt` | Transkription (UTF-8 Plaintext) | Whisper-Dienst → BullMQ-Job |
| `attachments/{fileId}.{ext}` | Im Videocall geteilte Dateien | Upload während der Sitzung |

> Aufzeichnungen und Transkripte werden **nicht sofort** angelegt – sie entstehen asynchron nach Sitzungsende über die Job-Queue.

---

### `{coachId}/resources/`
Flaches Verzeichnis für Coach-eigene Materialien (Vorlagen, Übungsblätter, Präsentationen). Kategorisierung und Metadaten (Name, Tags, Mime-Type) liegen in der DB.

---

## Klientenübergabe (Studio-Plan)

Wenn ein Klient innerhalb eines Studios von Coach A zu Coach B übergeben wird, müssen alle zugehörigen S3-Objekte migriert werden. Dies ist ein **asynchroner BullMQ-Job**, der nach Bestätigung der Übergabe (inkl. Klienten-Einwilligung in der DB) gestartet wird.

### Ablauf

```
1. DB: Übergabe-Einwilligung des Klienten gespeichert
2. BullMQ-Job "client-handover" gestartet
3. S3: Alle Objekte unter {coachAId}/clients/{clientId}/ auflisten
4. S3: Objekte nach {coachBId}/clients/{clientId}/ kopieren (copyObject)
5. S3: Originale unter {coachAId}/clients/{clientId}/ löschen
6. DB: Coach-Zuordnung des Klienten auf coachB aktualisiert
7. Job abgeschlossen – kein Cross-Coach-Zugriff mehr nötig
```

### Fehlerbehandlung

- Job ist **idempotent**: bei Abbruch kann er neu gestartet werden (bereits kopierte Dateien werden übersprungen, da Ziel-Key bereits existiert)
- Bis zur vollständigen Migration hat **Coach A lesenden Zugriff** auf die noch nicht migrierten Objekte (DB-gesteuert, nicht S3-seitig)
- Nach erfolgreichem Job: ausschließlich Coach B hat Zugriff

> **DSGVO-Hinweis:** Die Übergabe erfordert eine explizite, protokollierte Einwilligung des Klienten. Ohne diese Einwilligung darf der Job nicht gestartet werden. Die Einwilligungs-ID wird im Job-Payload mitgeführt und im Audit-Log gespeichert.

---

## Pfad-Konstanten im Code (NestJS)

```typescript
// libs/storage/paths.ts

export const StoragePaths = {
  // Coach-Assets
  coachAvatar:        (coachId: string, ext: string) =>
    `${coachId}/profile/avatar.${ext}`,

  coachLogo:          (coachId: string, ext: string) =>
    `${coachId}/profile/logo.${ext}`,

  // Klienten-Assets
  clientAvatar:       (coachId: string, clientId: string, ext: string) =>
    `${coachId}/clients/${clientId}/avatar.${ext}`,

  clientDocument:     (coachId: string, clientId: string, fileId: string, ext: string) =>
    `${coachId}/clients/${clientId}/documents/${fileId}.${ext}`,

  clientPrefix:       (coachId: string, clientId: string) =>
    `${coachId}/clients/${clientId}/`,   // für Klientenübergabe-Migration

  // Sitzungs-Assets
  sessionRecording:   (coachId: string, sessionId: string, ext: string) =>
    `${coachId}/sessions/${sessionId}/recording.${ext}`,

  sessionTranscript:  (coachId: string, sessionId: string) =>
    `${coachId}/sessions/${sessionId}/transcript.txt`,

  sessionAttachment:  (coachId: string, sessionId: string, fileId: string, ext: string) =>
    `${coachId}/sessions/${sessionId}/attachments/${fileId}.${ext}`,

  // Coach-Ressourcen
  coachResource:      (coachId: string, fileId: string, ext: string) =>
    `${coachId}/resources/${fileId}.${ext}`,

  // Studio-Assets (neu: Studio-Plan)
  studioLogo:         (studioId: string, ext: string) =>
    `studios/${studioId}/profile/logo.${ext}`,

  studioCover:        (studioId: string, ext: string) =>
    `studios/${studioId}/profile/cover.${ext}`,

  studioPrefix:       (studioId: string) =>
    `studios/${studioId}/`,              // für Studio-Löschung
} as const;
```

---

## Löschung (DSGVO)

### Coach-Löschung
Beim Löschen eines einzelnen Coachs reicht ein einziger API-Aufruf:

```typescript
await minioClient.removeObjects(
  BUCKET_NAME,
  listObjectsStream(`${coachId}/`)
);
```

### Studio-Auflösung
Bei Auflösung eines Studios werden zwei separate Löschvorgänge ausgeführt:

```typescript
// 1. Studio-eigene Assets löschen
await minioClient.removeObjects(
  BUCKET_NAME,
  listObjectsStream(`studios/${studioId}/`)
);

// 2. Jeden Coach des Studios einzeln löschen
for (const coachId of studioCoachIds) {
  await minioClient.removeObjects(
    BUCKET_NAME,
    listObjectsStream(`${coachId}/`)
  );
}
```

> Coach-Prefixes und Studio-Prefix sind bewusst getrennt – so können Coaches im Rahmen eines Studio-Exits auch einzeln gelöscht oder in einen Solo-Plan überführt werden, ohne andere Studio-Daten zu berühren.

---

## Zugriffskonzept

Alle Dateien sind **nicht öffentlich**. Zugriff erfolgt ausschließlich über **Presigned URLs**, die das NestJS-Backend auf Anfrage ausstellt.

| Dateityp | URL-Gültigkeit | Berechtigung |
|---|---|---|
| Coach-Profilbilder | 1 Stunde | Coach + zugeordneter Klient |
| Klienten-Dokumente | 1 Stunde | zuständiger Coach + Klient selbst |
| Sitzungs-Anhänge | 15 Minuten | Coach + zugeordneter Klient |
| Aufzeichnungen / Transkripte | 1 Stunde | Coach only (Klient nur wenn Coach freigegeben) |
| Coach-Ressourcen | 1 Stunde | Coach only |
| Studio-Assets (Logo, Cover) | 1 Stunde | alle Coaches des Studios (lesend) |
| Klienten-Dateien während Übergabe | 15 Minuten | Coach A (lesend, bis Migration abgeschlossen) |

---

## Bucket-Konfiguration (MinIO)

- **Ein Bucket** für alle Daten: `hxroom-files`
- Bucket-Policy: **private** (kein öffentlicher Lesezugriff)
- Versioning: **deaktiviert** (Überschreiben bei Profilbildern gewünscht)
- Lifecycle-Regeln: noch offen – ggf. automatisches Löschen alter Aufzeichnungen nach X Monaten
