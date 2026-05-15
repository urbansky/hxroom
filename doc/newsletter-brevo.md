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
| `FIRSTNAME` | Text | Vorname – persönliche Anrede (`Hallo Anna,…`) |
| `LASTNAME` | Text | Nachname – falls vom Nutzer angegeben |
| `SOURCE` | Text | Eintrag-Quelle (`landing`, `coach-page`, `pricing`) |
| `SIGNUP_IP` | Text | DSGVO-Nachweis Double-Opt-In |
| `SIGNUP_AT` | Datum | Zeitpunkt Anmeldung |

Eine Rollen-Segmentierung (Coach vs. Klient vs. Interessent) findet auf Public-Landingpages **nicht** statt. Begründung: die Rolle wird über die `SOURCE` indirekt erschlossen (Besucher der Coach-Akquise-Landingpage sind mit hoher Wahrscheinlichkeit Coachs), und bei Bedarf kann später über Reaktivität auf Inhalte segmentiert werden. Eine harte Rollen-Pflichtfrage drückt die Conversion, ohne im Frühstadium wirklichen Mehrwert zu liefern.

### 2.2.1 Welche Felder werden im Anmeldeformular abgefragt?

**Designprinzip:** Minimaler Formularkörper, freundliches Layout, Trust-Signale sichtbar. Inspiration: das klassische zweispaltige Newsletter-Card-Pattern (Name links, Email rechts, breiter Submit-Button, darunter eine Reihe Checkmark-Trust-Items).

| Feld | Pflicht? | UI |
|---|---|---|
| Name | **ja** | Einzelnes Textfeld („Dein Name"), Placeholder z.B. `Anna Bergmann` |
| E-Mail | **ja** | Textfeld mit Mail-Icon, Placeholder `anna@beispiel.de` |
| Consent | implizit | Über Submit-Button-Label + Datenschutz-Hinweis als Fineprint unter der Card |

Der Name wird als **ein** Eingabefeld erfasst. Manche Nutzer geben nur den Vornamen ein, manche den vollen Namen. Beides ist okay.

**Mapping Name → Brevo-Attribute (serverseitig):**

Das Backend splittet den eingegebenen Namen am ersten Leerzeichen:

| Eingabe | `FIRSTNAME` | `LASTNAME` |
|---|---|---|
| `Anna` | `Anna` | `` |
| `Anna Bergmann` | `Anna` | `Bergmann` |
| `Anna Maria Bergmann` | `Anna` | `Maria Bergmann` |

Damit funktioniert die Begrüßung `Hallo {{FIRSTNAME}},…` zuverlässig, und die volle Information bleibt im Datensatz erhalten. Edge-Case mit akademischen Titeln (`Dr. Anna Bergmann` → `FIRSTNAME=Dr.`) ist akzeptiert; kann später per Heuristik verbessert werden, falls relevant.

**Trust-Signale unter dem Submit-Button (im Card-Footer):**

```
✓ Eine Mail pro Meilenstein
✓ Kein Spam, keine Werbung
✓ Jederzeit abmeldbar
```

**Begründung der Vereinfachung:** Eine ältere Variante dieses Designs hatte zusätzlich eine Rollen-Pflichtwahl (Coach / Klient / Interessent). Die wurde verworfen, weil sie (a) die wahrgenommene Formular-Schwere erhöht, (b) die Conversion gegenüber Email+Name spürbar drückt und (c) die Information nur sekundären Wert für die initiale Newsletter-Strecke hat. Sollte Segmentierung später wichtiger werden, kann sie in der Welcome-Mail nachgefragt oder über Klick-Verhalten abgeleitet werden.

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

Das Schema lebt in `packages/shared` damit die Landing-Page dasselbe Schema für clientseitige Formularvalidierung verwenden kann (siehe [Validierungs-Konvention](technisches-konzept.md#111-validierungs--und-dto-konvention)).

```typescript
// packages/shared/src/schemas/newsletter.ts
import { z } from 'zod';

export const subscribeSchema = z.object({
  // Voller eingegebener Name – wird serverseitig in FIRSTNAME + LASTNAME
  // gesplittet (siehe Abschnitt 2.2.1).
  name: z.string().trim().min(1, 'Bitte gib deinen Namen ein').max(120),
  email: z.string().email('Ungültige E-Mail-Adresse').max(254),
  source: z.enum(['landing', 'coach-page', 'pricing']).default('landing'),
});

export type SubscribeDto = z.infer<typeof subscribeSchema>;
```

Hinweis zur Consent-Bestätigung: Eine separate Checkbox ist nicht vorhanden, weil die Card sehr kompakt bleiben soll. Die Einwilligung wird durch das Abschicken des Formulars erteilt – der Button-Klick selbst ist die aktive Handlung. Der Datenschutz-Hinweis steht als Fineprint unmittelbar unter der Card und nennt den Versanddienstleister explizit. Diese Variante ist DSGVO-konform, solange (a) der Hinweis vor dem Submit sichtbar ist, (b) Double-Opt-In erfolgt und (c) der DSGVO-Nachweis (`SIGNUP_IP`, `SIGNUP_AT`) gespeichert wird. Letzteres geschieht serverseitig im NewsletterService.

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
    dto: { email: string; name: string; source: string },
    ipAddress: string,
  ): Promise<void> {
    const apiKey = this.config.getOrThrow<string>('BREVO_API_KEY');
    const listId = Number(this.config.getOrThrow<string>('BREVO_LIST_ID'));
    const templateId = Number(this.config.getOrThrow<string>('BREVO_DOI_TEMPLATE_ID'));
    const redirectUrl = this.config.getOrThrow<string>('BREVO_REDIRECT_URL');

    // Name am ersten Leerzeichen aufsplitten – Vorname für Anrede, Rest als
    // Nachname. Siehe Abschnitt 2.2.1 für die Designbegründung.
    const trimmed = dto.name.trim();
    const firstSpace = trimmed.indexOf(' ');
    const firstName = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
    const lastName  = firstSpace === -1 ? ''      : trimmed.slice(firstSpace + 1).trim();

    const response = await fetch(`${this.apiUrl}/contacts/doubleOptinConfirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        email: dto.email,
        attributes: {
          FIRSTNAME: firstName,
          LASTNAME: lastName,
          SOURCE: dto.source,
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

### 4.3 Controller

```typescript
// apps/api/src/newsletter/newsletter.controller.ts
import { Body, Controller, Ip, Post, UsePipes } from '@nestjs/common';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { NewsletterService } from './newsletter.service';
import { subscribeSchema, SubscribeDto } from '@hxroom/shared';

@Controller('newsletter')
export class NewsletterController {
  constructor(private readonly service: NewsletterService) {}

  @Post('subscribe')
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

Layout-Pattern: Zweispaltige Card mit „Dein Name" (links) und „Deine E-Mail" (rechts), breiter Submit-Button darunter, Trust-Reihe mit drei Checkmark-Items im Card-Footer. Auf Mobile stacken Name+Email vertikal, Trust-Items ebenfalls.

```vue
<script setup lang="ts">
import { ref, reactive, computed } from 'vue';

interface Props {
  source?: 'landing' | 'coach-page' | 'pricing';
  submitLabel?: string;
}
const props = withDefaults(defineProps<Props>(), {
  source: 'landing',
  submitLabel: 'Early-Access-Platz sichern',
});

type Status = 'idle' | 'loading' | 'success' | 'error';

const form = reactive({
  name: '',
  email: '',
});
const status = ref<Status>('idle');
const errorMessage = ref('');

const isValid = computed(() => {
  return (
    form.name.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)
  );
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
        name: form.name.trim(),
        email: form.email.trim(),
        source: props.source,
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
    class="newsletter-card"
    @submit.prevent="submit"
    novalidate
  >
    <div class="fields">
      <div class="field">
        <label class="label" for="nl-name">Dein Name</label>
        <div class="input-wrap">
          <UInput
            id="nl-name"
            v-model="form.name"
            type="text"
            placeholder="Anna Bergmann"
            autocomplete="name"
            required
            :disabled="status === 'loading'"
          />
        </div>
      </div>
      <div class="field">
        <label class="label" for="nl-email">Deine E-Mail</label>
        <div class="input-wrap">
          <UIcon name="i-heroicons-envelope" />
          <UInput
            id="nl-email"
            v-model="form.email"
            type="email"
            placeholder="anna@beispiel.de"
            autocomplete="email"
            required
            :disabled="status === 'loading'"
          />
        </div>
      </div>
    </div>

    <UButton
      type="submit"
      :loading="status === 'loading'"
      :disabled="!isValid"
      block
      class="submit"
    >
      {{ submitLabel }}
    </UButton>

    <div class="divider"></div>

    <div class="trust">
      <span class="trust-item">
        <UIcon name="i-heroicons-check" /> Eine Mail pro Meilenstein
      </span>
      <span class="trust-item">
        <UIcon name="i-heroicons-check" /> Kein Spam, keine Werbung
      </span>
      <span class="trust-item">
        <UIcon name="i-heroicons-check" /> Jederzeit abmeldbar
      </span>
    </div>

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

  <p class="fineprint">
    Mit dem Absenden willigst du in den Versand des Newsletters über Brevo ein.
    Details in der
    <a href="/datenschutz" target="_blank" rel="noopener">Datenschutzerklärung</a>.
    Abmeldung jederzeit per Link in jeder Mail.
  </p>
</template>

<style scoped>
.newsletter-card {
  background: var(--surface, #1E231E);
  border: 1px solid var(--border, rgba(255,255,255,0.06));
  border-radius: 18px;
  padding: 36px 36px 28px;
}
.fields { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 22px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.label { font-size: 13px; font-weight: 500; color: var(--cream); }
.input-wrap { display: flex; align-items: center; gap: 10px; }
.submit { padding: 16px 24px; border-radius: 12px; }
.divider { height: 1px; background: var(--border); margin: 24px 0 18px; }
.trust { display: flex; justify-content: space-between; gap: 18px; flex-wrap: wrap; }
.trust-item { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
.trust-item :deep(svg) { color: var(--sage); }
.fineprint { font-size: 12px; color: var(--text-muted); margin-top: 12px; text-align: center; line-height: 1.5; }
.fineprint a { color: var(--sage-light); text-decoration: underline; }
.error { color: #d14343; font-size: 0.85rem; margin-top: 10px; }
.success { padding: 1.5rem; border-radius: 14px; background: rgba(139, 158, 138, 0.1); }
.success h3 { margin-bottom: 0.5rem; }

@media (max-width: 700px) {
  .newsletter-card { padding: 26px 22px 22px; }
  .fields { grid-template-columns: 1fr; gap: 14px; }
  .trust { flex-direction: column; align-items: flex-start; gap: 10px; }
}
</style>
```

Verwendung auf der allgemeinen Landing Page:

```vue
<NewsletterForm source="landing" submit-label="Early-Access-Platz sichern" />
```

Auf der Coach-Akquise-Seite mit anderem CTA-Wording (gleiche Felder, nur Button-Text und Source-Tag ändern sich):

```vue
<NewsletterForm source="coach-page" submit-label="Als Coach dabei sein" />
```

---

## 6. Datenschutzerklärung – Pflichttext

In `apps/landing` die Datenschutzerklärung um folgenden Abschnitt ergänzen:

> **Newsletter-Versand mit Brevo**
> Für den Versand unseres Newsletters nutzen wir den Dienst Brevo (Sendinblue GmbH, Köthener Straße 2, 10963 Berlin; Konzernmutter: Sendinblue SAS, 106 Boulevard Haussmann, 75008 Paris, Frankreich). Mit der Anmeldung willigst du ein, dass dein Name, deine E-Mail-Adresse sowie deine IP-Adresse und der Zeitpunkt der Anmeldung an Brevo übermittelt und dort gespeichert werden. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO. Mit Brevo wurde ein Vertrag zur Auftragsverarbeitung (Art. 28 DSGVO) geschlossen. Die Speicherung der Anmeldedaten erfolgt zum Nachweis des Double-Opt-In-Verfahrens. Du kannst die Einwilligung jederzeit über den Abmelde-Link in jedem Newsletter oder per Mail an `kontakt@hxroom.de` widerrufen.

---

## 7. Welcome-Automation in Brevo

Im Brevo-Dashboard unter **Automations → Create a new workflow → Welcome message**:

1. Trigger: „A contact is added to a list" → Liste `Newsletter HxRoom`
2. Bedingung (optional): `SOURCE == coach-page` → eigene Coach-Strecke (z.B. mit Demo-Link statt Whitepaper)
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
