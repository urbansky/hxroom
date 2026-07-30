---
name: newsletter-reimplementation
description: Referenz-Datenmodell für eine serverseitige Re-Implementierung des Newsletter-Subscriber-Formulars (Double-Opt-In, eigene Subscriber-Liste, Audit-Trail). Nur relevant, wenn genau diese Aufgabe ansteht.
---

# Newsletter-Subscriber-Datenmodell (Referenz)

Aktuell postet das Early-Access-Newsletter-Formular der Landing-Page direkt zu Brevo (kein eigener API-Endpunkt mehr, kein Persistieren in der HxRoom-Datenbank). Wenn das später wieder serverseitig laufen soll – z. B. eigenes Double-Opt-In, eigene Subscriber-Liste in `apps/api`, Audit-Trail, Auswertung der Quelle – ist **dies** die verbindliche Datenstruktur. Neu angelegter Validierungs- oder Persistenz-Code muss exakt dieser Shape entsprechen:

```ts
// packages/shared/src/schemas/newsletter.ts (geplant, bei Re-Implementierung anlegen)
import { z } from 'zod';

export const subscribeSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse').max(254),
  name: z.string().min(1).max(160).optional(),
  source: z.enum(['landing', 'coach-page', 'pricing']).default('landing'),
});

export type SubscribeDto = z.infer<typeof subscribeSchema>;
```

Begleitende Punkte für die Re-Implementierung:
- DSGVO: zusätzlich `signupIp` und `signupAt` (sowie ggf. `confirmedAt`) **serverseitig** beim Empfang erfassen – **nicht** über das DTO entgegennehmen (Nachweispflicht der Einwilligung gem. Art. 7 DSGVO).
- `source` ist die einzige Stelle, die Quellen-Erweiterungen reflektiert; neue Einbauorte (z. B. `'blog'`, `'pricing-page'`) hier ergänzen.
- `name` ist bewusst optional, weil das Formular niedrigschwellig sein soll. `email` ist Pflicht.
- Der API-Endpunkt für die Subscription wurde zugunsten der direkten Brevo-Anbindung im Frontend entfernt. Wer ihn wieder einführt, sollte ihn unter `POST /api/v1/newsletter/subscribe` mit `ZodValidationPipe(subscribeSchema)` aufsetzen und den Re-Export aus `packages/shared/src/index.ts` wieder hinzufügen.
