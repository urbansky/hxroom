# HxRoom – Newsletter-Setup mit Brevo

*Stand: April 2026 · Brevo API v3*

Brevo (vormals Sendinblue) übernimmt für HxRoom **den gesamten E-Mail-Versand** – Newsletter/Marketing **und** Transaktionsmails (Buchungsbestätigung, Erinnerung, Passwort-Reset). Damit gibt es nur einen Dienst, eine Domain-Authentifizierung, ein Dashboard, ein AVV.

**E-Mail-Empfang läuft separat über Ionos Mail Business**: Postfächer wie `kontakt@hxroom.de`, `noreply@hxroom.de` und `newsletter@hxroom.de` werden bei Ionos gehostet (gleicher Anbieter wie für DNS – ein Anbieter weniger zu verwalten). Eingehende Mails werden per IMAP in Apple Mail / Thunderbird abgerufen, Replys gehen über Ionos-SMTP. Brevo ist ausschließlich Versand, Ionos ausschließlich Empfang.

---

## 1. Brevo-Account vorbereiten

### 1.1 Account erstellen

Registrierung auf [brevo.com](https://www.brevo.com) mit `kontakt@hxroom.de`. Direkt im Onboarding wählen: **„Marketing"**, Branche „Software/SaaS", Sprache Deutsch. Kostenloser Tarif reicht für den Start (300 Mails/Tag, unbegrenzte Kontakte).

### 1.2 AVV abschließen

Im Brevo-Dashboard unter **Account → Compliance → DPA** den Auftragsverarbeitungsvertrag (deutsch) herunterladen, ausfüllen und gegenzeichnen. Brevo schickt das Gegenstück signiert zurück. Pflicht für DSGVO-konformen Betrieb.

### 1.3 Sender-Domain authentifizieren (SPF, DKIM, DMARC)

Unter **Senders & IP → Domains → Add a domain** die Domain `hxroom.de` anlegen. Brevo zeigt drei DNS-Records an, die bei Ionos in der Zone `hxroom.de` gesetzt werden müssen:

| Typ | Name | Wert |
|---|---|---|
| TXT | `@` (oder `hxroom.de`) | `v=spf1 include:spf.brevo.com include:_spf.ionos.de -all` |
| TXT | `mail._domainkey` | `k=rsa; p=...` (von Brevo generiert) |
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@hxroom.de` |

**Wichtig:** Es gibt zwei Versender unter `@hxroom.de` – **Brevo** für App-Mails (Buchungsbestätigung, Newsletter) und **Ionos Mail** für manuelle Replys aus Apple Mail. Beide müssen im einzigen SPF-Record per `include:` autorisiert sein. Pro DNS-Zone darf es nur **einen** SPF-TXT-Record geben – falls bereits ein anderer existiert, nicht zusätzlich anlegen, sondern den bestehenden ersetzen.

Nach dem Setzen der Records in Brevo auf **„Authenticate this domain"** klicken. Validierung dauert wenige Minuten. Erst danach versendet Brevo unter `@hxroom.de`.

### 1.3.1 Transaktions- vs. Marketing-IPs trennen (optional, aber empfohlen)

Brevo erlaubt es, dedizierte Sender für Transaktions- und Marketing-Mails einzurichten. Empfohlene Konvention für HxRoom:

| Zweck | Absender-Adresse | Brevo-Bereich |
|---|---|---|
| Transaktional | `noreply@hxroom.de` (Display: „HxRoom") | SMTP & API → Senders |
| Marketing/Newsletter | `newsletter@hxroom.de` (Display: „HxRoom") | Senders & IP → Senders |
| Antworten | `kontakt@hxroom.de` | als `replyTo` setzen |

Das schützt die Zustellbarkeit: Wenn jemand einen Newsletter als Spam markiert, leidet die Reputation der Marketing-IP, nicht die der Transaktions-IP. Buchungsbestätigungen kommen also weiter zuverlässig in der Inbox an.

### 1.4 Absender-Adresse anlegen

Unter **Senders & IP → Senders** eine Absender-Adresse hinzufügen, z.B. `newsletter@hxroom.de` mit Anzeigename „HxRoom". Bestätigungslink kommt an die Adresse – ggf. ein Postfach oder Catchall einrichten.

---

## 2. Kontaktliste & Custom Fields

### 2.1 Liste anlegen

**Contacts → Lists → Create a list**: Name `Newsletter HxRoom`, ID merken (z.B. `5`). Diese ID wird im Backend referenziert.

### 2.2 Sinnvolle Custom Fields

Unter **Contacts → Settings → Contact attributes** anlegen:

| Attribut | Typ | Zweck |
|---|---|---|
| `FIRSTNAME` | Text | Persönliche Anrede |
| `SOURCE` | Text | Eintrag-Quelle (`landing`, `coach-page`, `pricing`) |
| `SIGNUP_IP` | Text | DSGVO-Nachweis Double-Opt-In |
| `SIGNUP_AT` | Datum | Zeitpunkt Anmeldung |
| `ROLE` | Text | `coach` / `interessent` / `klient` |

Letzteres ist für HxRoom besonders wertvoll: Coachs (Kunden) und Interessenten bekommen unterschiedliche Newsletter-Strecken.

### 2.3 Double-Opt-In Template

Unter **Contacts → Forms → Create form** ein Double-Opt-In-Template erstellen (auch wenn das Formular selbst nicht eingebettet wird – es liefert das Bestätigungs-Mail-Template). Im Template-Editor:

- Betreff: „Bitte bestätige deine Newsletter-Anmeldung bei HxRoom"
- Bestätigungs-Button mit Brevo-Variable `{{ doubleoptin }}`
- Footer mit Abmelde-Link `{{ unsubscribe }}` (Pflicht)
- Impressum-Link

Die Template-ID notieren (z.B. `12`).

---

## 3. API-Key generieren

Unter **SMTP & API → API Keys → Create new key**. Namen `hxroom-api-newsletter` vergeben. Den Key **einmalig** kopieren – Brevo zeigt ihn später nicht mehr. Eintrag in `.env` der NestJS-API:

```
BREVO_API_KEY=xkeysib-...
BREVO_LIST_ID=5
BREVO_DOI_TEMPLATE_ID=12
BREVO_REDIRECT_URL=https://hxroom.de/newsletter/bestaetigt
```

Niemals in Frontend einbetten. Der Key hat Vollzugriff auf den Account.

---

## 4. NestJS-Endpoint für Newsletter-Anmeldung

Neues Modul `apps/api/src/newsletter/`:

### 4.1 DTO mit Zod-Validierung

```typescript
// apps/api/src/newsletter/dto/subscribe.dto.ts
import { z } from 'zod';

export const subscribeSchema = z.object({
  email: z.string().email('Ungültige E-Mail-Adresse').max(254),
  firstName: z.string().min(1).max(80).optional(),
  source: z.enum(['landing', 'coach-page', 'pricing']).default('landing'),
  role: z.enum(['coach', 'interessent', 'klient']).default('interessent'),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Einwilligung erforderlich' }),
  }),
});

export type SubscribeDto = z.infer<typeof subscribeSchema>;
```

### 4.2 Service

```typescript
// apps/api/src/newsletter/newsletter.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);
  private readonly apiUrl = 'https://api.brevo.com/v3';

  constructor(private readonly config: ConfigService) {}

  async subscribe(
    dto: { email: string; firstName?: string; source: string; role: string },
    ipAddress: string,
  ): Promise<void> {
    const apiKey = this.config.getOrThrow<string>('BREVO_API_KEY');
    const listId = Number(this.config.getOrThrow<string>('BREVO_LIST_ID'));
    const templateId = Number(this.config.getOrThrow<string>('BREVO_DOI_TEMPLATE_ID'));
    const redirectUrl = this.config.getOrThrow<string>('BREVO_REDIRECT_URL');

    const response = await fetch(`${this.apiUrl}/contacts/doubleOptinConfirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email: dto.email,
        attributes: {
          FIRSTNAME: dto.firstName ?? '',
          SOURCE: dto.source,
          ROLE: dto.role,
          SIGNUP_IP: ipAddress,
          SIGNUP_AT: new Date().toISOString(),
        },
        includeListIds: [listId],
        templateId,
        redirectionUrl: redirectUrl,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      // Hinweis: KEINE personenbezogenen Daten loggen – nur Status
      this.logger.error(`Brevo DOI failed: ${response.status} ${body.slice(0, 120)}`);
      throw new BadRequestException('Anmeldung fehlgeschlagen, bitte später erneut versuchen.');
    }
    // 201 = neue Anmeldung, 204 = bereits bestätigt → in beiden Fällen UI = Erfolg
  }
}
```

### 4.3 Controller mit Rate Limiting

```typescript
// apps/api/src/newsletter/newsletter.controller.ts
import { Body, Controller, Ip, Post, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { Throttle } from '@nestjs/throttler';
import { NewsletterService } from './newsletter.service';
import { subscribeSchema, SubscribeDto } from './dto/subscribe.dto';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly service: NewsletterService) {}

  @Post('subscribe')
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 Anmeldungen/IP/Minute
  @UsePipes(new ZodValidationPipe(subscribeSchema))
  async subscribe(@Body() dto: SubscribeDto, @Ip() ip: string) {
    await this.service.subscribe(dto, ip);
    return { ok: true };
  }
}
```

### 4.4 Modul registrieren

```typescript
// apps/api/src/newsletter/newsletter.module.ts
import { Module } from '@nestjs/common';
import { NewsletterController } from './newsletter.controller';
import { NewsletterService } from './newsletter.service';

@Module({
  controllers: [NewsletterController],
  providers: [NewsletterService],
})
export class NewsletterModule {}
```

In `AppModule` importieren.

---

## 5. Vue-3-Komponente für die Landing Page

Komponente `apps/landing/src/components/NewsletterForm.vue`:

```vue
<script setup lang="ts">
import { ref, reactive, computed } from 'vue';

interface Props {
  source?: 'landing' | 'coach-page' | 'pricing';
  role?: 'coach' | 'interessent' | 'klient';
}
const props = withDefaults(defineProps<Props>(), {
  source: 'landing',
  role: 'interessent',
});

type Status = 'idle' | 'loading' | 'success' | 'error';

const form = reactive({
  email: '',
  firstName: '',
  consent: false,
});
const status = ref<Status>('idle');
const errorMessage = ref('');

const isValid = computed(() => {
  // Einfache Pre-Validierung – Server validiert nochmal mit Zod
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) && form.consent;
});

async function submit() {
  if (!isValid.value || status.value === 'loading') return;
  status.value = 'loading';
  errorMessage.value = '';

  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/newsletter/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.email,
        firstName: form.firstName || undefined,
        source: props.source,
        role: props.role,
        consent: form.consent,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message ?? 'Anmeldung fehlgeschlagen');
    }
    status.value = 'success';
  } catch (e: unknown) {
    status.value = 'error';
    errorMessage.value = e instanceof Error ? e.message : 'Ein Fehler ist aufgetreten';
  }
}
</script>

<template>
  <form
    v-if="status !== 'success'"
    class="newsletter-form"
    @submit.prevent="submit"
    novalidate
  >
    <div class="row">
      <UInput
        v-model="form.firstName"
        placeholder="Vorname (optional)"
        autocomplete="given-name"
        :disabled="status === 'loading'"
      />
      <UInput
        v-model="form.email"
        type="email"
        placeholder="deine@email.de"
        autocomplete="email"
        required
        :disabled="status === 'loading'"
      />
    </div>

    <label class="consent">
      <UCheckbox v-model="form.consent" :disabled="status === 'loading'" />
      <span>
        Ich willige ein, den HxRoom-Newsletter zu erhalten. Hinweise zum
        Versanddienstleister und Widerruf in der
        <a href="/datenschutz" target="_blank" rel="noopener">Datenschutzerklärung</a>.
      </span>
    </label>

    <UButton
      type="submit"
      :loading="status === 'loading'"
      :disabled="!isValid"
      block
    >
      Anmelden
    </UButton>

    <p v-if="status === 'error'" class="error" role="alert">
      {{ errorMessage }}
    </p>
  </form>

  <div v-else class="success" role="status">
    <h3>Fast geschafft</h3>
    <p>
      Wir haben dir eine Bestätigungs-E-Mail an
      <strong>{{ form.email }}</strong> geschickt. Klicke auf den Link darin,
      um die Anmeldung abzuschließen.
    </p>
  </div>
</template>

<style scoped>
.newsletter-form { display: flex; flex-direction: column; gap: 0.75rem; }
.row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
@media (max-width: 480px) { .row { grid-template-columns: 1fr; } }
.consent { display: flex; gap: 0.5rem; align-items: flex-start; font-size: 0.85rem; line-height: 1.4; }
.consent a { text-decoration: underline; }
.error { color: #d14343; font-size: 0.85rem; }
.success { padding: 1rem; border-radius: 0.5rem; background: rgba(139, 158, 138, 0.1); }
.success h3 { margin-bottom: 0.5rem; }
</style>
```

Verwendung auf der Landing Page:

```vue
<NewsletterForm source="landing" role="interessent" />
```

Auf der Coach-Akquise-Seite mit anderem Targeting:

```vue
<NewsletterForm source="coach-page" role="coach" />
```

---

## 6. Datenschutzerklärung – Pflichttext

In `apps/landing` die Datenschutzerklärung um folgenden Abschnitt ergänzen:

> **Newsletter-Versand mit Brevo**
> Für den Versand unseres Newsletters nutzen wir den Dienst Brevo (Sendinblue GmbH, Köthener Straße 2, 10963 Berlin; Konzernmutter: Sendinblue SAS, 106 Boulevard Haussmann, 75008 Paris, Frankreich). Mit der Anmeldung willigst du ein, dass deine E-Mail-Adresse, ggf. dein Vorname sowie deine IP-Adresse und der Zeitpunkt der Anmeldung an Brevo übermittelt und dort gespeichert werden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO. Mit Brevo wurde ein Vertrag zur Auftragsverarbeitung (Art. 28 DSGVO) geschlossen. Die Speicherung der Anmeldedaten erfolgt zum Nachweis des Double-Opt-In-Verfahrens. Du kannst die Einwilligung jederzeit über den Abmelde-Link in jedem Newsletter oder per Mail an `kontakt@hxroom.de` widerrufen.

---

## 7. Welcome-Automation in Brevo

Im Brevo-Dashboard unter **Automations → Create a new workflow → Welcome message**:

1. Trigger: „A contact is added to a list" → Liste `Newsletter HxRoom`
2. Bedingung (optional): `ROLE == coach` → unterschiedliche Strecke
3. Aktion: „Send an email" → Welcome-Template

Damit bekommt jeder bestätigte Kontakt automatisch eine erste Mail mit Whitepaper / Demo-Link / o.ä. Workflows lassen sich später beliebig erweitern (Reaktivierung nach 30 Tagen Inaktivität, Geburtstagsmails etc.).

---

## 8. Test-Checkliste

- [ ] DNS-Records gesetzt, in Brevo „Authenticated"
- [ ] AVV unterzeichnet
- [ ] DOI-Template hat `{{ doubleoptin }}` und Abmelde-Link
- [ ] `BREVO_*` ENV-Variablen in API gesetzt
- [ ] Anmeldung von Test-Adresse → DOI-Mail kommt an
- [ ] Klick auf Bestätigungslink → Redirect auf `/newsletter/bestaetigt`
- [ ] Kontakt erscheint in Brevo-Liste mit allen Custom Fields
- [ ] Doppelte Anmeldung → kein Fehler, kein zweiter Eintrag
- [ ] Rate Limit greift (6. Anmeldung in 1 Min wird blockiert)
- [ ] Abmelde-Link in der Welcome-Mail funktioniert
- [ ] Mail-Test mit [mail-tester.com](https://www.mail-tester.com) → ≥ 9/10

---

## 9. E-Mail-Empfang über Ionos Mail Business

Brevo verschickt nur, empfängt nicht. Antworten von Klienten/Coachs müssen in einem klassischen Postfach landen, das man mit Apple Mail/Thunderbird abrufen kann.

### 9.1 Postfächer bei Ionos einrichten

Im Ionos Control Panel unter **Mail → Mail-Adressen** für die bereits verwaltete Domain `hxroom.de` folgende Postfächer anlegen:

| Adresse | Zweck |
|---|---|
| `kontakt@hxroom.de` | Allgemeine Anfragen, Reply-To-Ziel für alle Brevo-Versände |
| `noreply@hxroom.de` | Versender-Adresse für Transaktionsmails (eingehende Mails werden ignoriert oder per Auto-Responder beantwortet) |
| `newsletter@hxroom.de` | Versender-Adresse für Newsletter |
| `dmarc@hxroom.de` | Empfang von DMARC-Reports |

Ionos Mail Business kostet ca. 1 €/Postfach/Monat. MX-Records werden beim Buchen des Mail-Produkts automatisch in der Zone gesetzt – kein manueller DNS-Eintrag nötig.

### 9.2 Apple Mail / Thunderbird konfigurieren

IMAP-Setup für `kontakt@hxroom.de`:

| | |
|---|---|
| **IMAP-Server** | `imap.ionos.de` · Port 993 · SSL/TLS |
| **SMTP-Server** | `smtp.ionos.de` · Port 587 · STARTTLS |
| **Benutzername** | vollständige E-Mail-Adresse |
| **Passwort** | wie im Ionos Control Panel gesetzt |

### 9.3 Reply-To in Brevo-Templates

In jedem Brevo-Template – sowohl transaktional als auch Newsletter – muss **Reply-To** explizit auf `kontakt@hxroom.de` gesetzt werden, auch wenn der Versender `noreply@hxroom.de` ist. Damit landen Antworten in deinem Ionos-Postfach und nicht im Brevo-Account-Postfach.

```
From:     HxRoom <noreply@hxroom.de>
Reply-To: HxRoom <kontakt@hxroom.de>
```

### 9.4 SPF beachten

Da Replys aus Apple Mail über Ionos-SMTP gehen (und nicht über Brevo), muss der SPF-Record beide Versender umfassen:

```
v=spf1 include:spf.brevo.com include:_spf.ionos.de -all
```

Diese Konfiguration ersetzt den ursprünglichen SPF-Record aus Abschnitt 1.3.

---

## 10. Wichtige Brevo-API-Endpunkte (Cheatsheet)

| Zweck | Endpunkt | Methode |
|---|---|---|
| Double-Opt-In Anmeldung | `/v3/contacts/doubleOptinConfirmation` | POST |
| Direkte Anmeldung (kein DOI) | `/v3/contacts` | POST |
| Kontakt aktualisieren | `/v3/contacts/{email}` | PUT |
| Kontakt löschen (DSGVO) | `/v3/contacts/{email}` | DELETE |
| Liste der Kontakte | `/v3/contacts/lists/{listId}/contacts` | GET |
| Kampagne versenden | `/v3/emailCampaigns` | POST |

Für HxRoom werden im Code primär POST `doubleOptinConfirmation` und DELETE `contacts/{email}` (für DSGVO-Löschanträge) benötigt. Alles andere läuft über das Brevo-UI.
