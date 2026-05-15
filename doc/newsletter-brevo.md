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

## 3. Embedded Form bei Brevo anlegen (Newsletter-Signup)

Der Newsletter-Signup auf der Landing Page läuft **ohne eigenen API-Endpunkt** – die Vue-Komponente postet direkt an Brevos Embedded-Form-Endpoint. Vorteil: kein API-Key im Frontend, kein eigener Backend-Code für den Anmelde-Pfad, Brevo übernimmt Double-Opt-In, Bot-Schutz auf Server-Seite und Erfolgsmessung.

### 3.1 Form anlegen

Im Brevo-Dashboard unter **Marketing → Forms → New form** ein Form für die in 2.1 angelegte Liste erstellen. Brevo bietet zwei Embed-Modi:

- **Iframe** – HTML-Snippet mit `<iframe src="…sibforms.com/serve/…">`. Geht, aber das Iframe ist styling-resistent und passt nicht zum Look der Landing Page.
- **Native form** – HTML-Snippet mit einer rohen `<form action="https://<account>.sibforms.com/serve/<token>">`. Genau das brauchen wir: wir kopieren die `action`-URL und bauen das Form-Markup selbst, mit unserem CSS.

Nach dem Anlegen das Form-Snippet kopieren und die `action`-URL extrahieren. Beispiel:

```
https://3c8e304e.sibforms.com/serve/MUIFAL……==
```

Diese URL ist **Public-by-Design** (Brevo erwartet sie im Markup), enthält keinen API-Key und kein admin-relevantes Geheimnis. Sie taucht im Klartext im Frontend auf.

### 3.2 Felder + Double-Opt-In

Im Form-Editor:

- Pflichtfelder: **EMAIL**, **VORNAME** (genau diese Brevo-Attribut-Namen verwenden, damit `FormData` matcht)
- Double-Opt-In aktivieren und das in 2.3 angelegte Confirmation-Template auswählen
- Erfolgsverhalten: „Show success message" – wir zeigen unsere eigene Inline-Erfolg-Card, der eigentliche Klick auf den Confirm-Link erfolgt aus der Bestätigungsmail.

### 3.3 CORS / Origin-Allowlist

Brevos Form-Endpoint spiegelt den Request-`Origin` reflektiv im `Access-Control-Allow-Origin`-Header zurück (geprüft mit `curl` von `localhost:5176` und `hxroom.de` – beide Origins werden akzeptiert). Kein zusätzliches Setup nötig.

---

## 4. API-Key für Transaktionsmails (`MailService`)

Der Newsletter-Signup braucht **keinen** API-Key. Für **Transaktionsmails** (Buchungsbestätigung, Erinnerung, Passwort-Reset, später Coach-Notifications) liefert das NestJS-Backend einen generischen `MailService`, der über `POST /v3/smtp/email` an Brevo geht. Dafür ist ein API-Key nötig.

### 4.1 API-Key anlegen

Im Brevo-Dashboard unter **SMTP & API → API Keys → Create new key**. Namen z. B. `hxroom-api-transactional`. Key **einmalig** kopieren – Brevo zeigt ihn nicht erneut.

### 4.2 `.env`-Einträge

```env
# Brevo – Transaktionsmails (POST /smtp/email)
BREVO_API_KEY=xkeysib-…
BREVO_SENDER_EMAIL=noreply@hxroom.de
BREVO_SENDER_NAME=HxRoom
```

Niemals ins Frontend einbetten. Der Key hat Vollzugriff auf den Brevo-Account.

### 4.3 `MailModule` und `MailService`

- `apps/api/src/mail/mail.module.ts` – exportiert `MailService`, **kein Controller**. Andere Module importieren `MailModule`, um `MailService` per DI zu nutzen.
- `apps/api/src/mail/mail.service.ts` – `send(options)`-Methode, unterstützt `htmlContent` / `textContent` / `templateId` + `params`, Default-Sender aus den `.env`-Variablen, Per-Call-Override über `options.sender`. Bei 4xx/5xx wird `InternalServerErrorException` geworfen, das Log enthält nur Status + abgeschnittene Brevo-Antwort, **keine PII** (kein `to`, kein `subject`, kein Body-Content).
- Tests in `apps/api/src/mail/mail.service.spec.ts` decken Request-Form, Sender-Handling, optionale Felder, Fehler-Pfad und das DSGVO-Logging-Verhalten ab (Vitest, läuft im PR-CI über `.github/workflows/test.yml`).

---

## 5. Frontend-Komponente `NewsletterCard.vue`

Datei: `apps/landing/app/components/NewsletterCard.vue` (Verwendung in `HeroSection.vue` und `FinalCtaSection.vue`).

### 5.1 Layout-Pattern

Zweispaltige Card: links „Dein Name", rechts „Deine E-Mail", DSGVO-Hinweis als Block darunter, breiter Submit-Button, Trust-Row mit drei Checkmark-Items im Card-Footer. Auf Mobile (`max-width: 640px`) stacken Name + Email vertikal, Trust-Items ebenfalls.

### 5.2 Submit-Logik (Kurzfassung – der ausgeschriebene Code lebt in der Datei)

```ts
const body = new FormData()
body.set('VORNAME', name.value)
body.set('EMAIL', email.value)
body.set('email_address_check', '')   // Brevo-Honeypot-Feldname im Body
body.set('locale', 'de')

const res = await fetch(`${BREVO_ACTION}?isAjax=1`, { method: 'POST', body })
const data: BrevoAjaxResponse = await res.json()
//   { success: boolean, message?: string, redirect?: string|null, errors?: Record<string,string> }
```

States: `idle → loading → success | error`. Bei `success` wird die ganze Card durch eine „Fast geschafft / Bestätigungs-Mail unterwegs"-Variante ersetzt. Bei `error` bleibt das Form sichtbar und ein roter Banner zeigt entweder `data.message`, den ersten Eintrag aus `data.errors` oder einen generischen Netzfehler-Text.

### 5.3 Bot-Schutz

Zusätzlich zum serverseitigen Brevo-Schutz und dem `email_address_check`-Body-Feld hängt die Komponente einen **Honeypot-Input** ins Form, der per `display: none` ausgeblendet ist und einen neutralen Namen (`b_company_url`, **nicht** `email_address_check`) trägt – sonst füllt Chrome-Autofill ihn fälschlich aus, weil der Name das Wort „email" enthält. Ist das Feld nach Submit nicht leer, schalten wir lautlos auf den Erfolgs-State um, ohne Brevo zu kontaktieren.

### 5.4 Mehrfach-Einbindung pro Seite

Die Komponente ist über `useId()` so gebaut, dass Input-`id`s und `label[for]`-Verknüpfungen pro Instanz eindeutig sind (`nl-name-<uid>`, `nl-email-<uid>`). Hero- **und** Final-CTA-Form auf derselben Seite verhalten sich unabhängig; ein Klick auf den Submit-Button der zweiten Karte submittet auch nur die zweite Karte.

### 5.5 Verwendung

```vue
<NewsletterCard cta="Early-Access-Platz sichern" />
```

`cta` ist optional (Default „Early-Access-Platz sichern"). Es gibt **keinen** `source`-Prop mehr – Quellen-Tracking läuft komplett über Brevos eigene Form-Statistik (welches Form geklickt → welcher Account-Bereich); wenn wir später per Subdomain-Karten differenzieren wollen, ist der bessere Weg, **mehrere Brevo-Forms** mit eigener Action-URL anzulegen statt das Quellfeld im Submit-Body zu manipulieren.

### 5.6 Wenn doch wieder ein eigener API-Endpunkt nötig wird

Die alte API-Proxy-Variante (eigener `POST /api/v1/newsletter/subscribe`, der die Brevo-`/contacts/doubleOptinConfirmation`-Route nutzt) ist im PR-Verlauf entfernt worden. Falls sie wiederkommt – etwa für eigenen Audit-Trail, eigene Liste in der HxRoom-DB oder serverseitiges Pre-Filtering – gilt das in `CLAUDE.md` festgehaltene `subscribeSchema` (`email`, `name?`, `source`) als verbindliche Datenstruktur, und die Brevo-Anbindung kann sich am `MailService` (Abschnitt 4.3) orientieren statt als eigenständige Logik daneben zu wachsen.

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
