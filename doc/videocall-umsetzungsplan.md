# Videocall – Umsetzungsplan (Phase 4)

*Stand: 2026-08-20. Grober Schnitt der Umsetzung, bewusst ohne Implementierungsdetails. Fachliche und architektonische Grundlage ist `technisches-konzept.md` §6, §7 und §8; die Feature-Abgrenzung steht in `project.md` §5a.*

## Ausgangslage

Phase 4 aus `technisches-konzept.md` §14 ist die nächste ungebaute Phase. Buchung, Token-Lifecycle, Mailversand und Coach-Dashboard stehen; für den Videocall existierte zu Beginn dieses Plans keine Zeile Code: kein `packages/livekit`, kein LiveKit-Modul in der API, keine `/call`-Routen, `infra/livekit/` enthält nur `.gitkeep`. Der Caddy-Block für `livekit.hxroom.localhost` ist bereits aktiv und zeigt derzeit ins Leere. Inzwischen umgesetzt ist A1 (Sitzungszustand und Call-Zugang in der API); der Rest steht noch aus.

## Leitgedanke des Schnitts

Zuerst entsteht nicht der Call, sondern ein belastbarer **Lifecycle**: Der Klient kommt über den Mail-Link in den Warteraum, der Coach sieht ihn warten, lässt ihn ein, die Sitzung endet definiert. Die Video-Bühne bleibt in dieser Stufe eine Platzhalterfläche.

Der Grund für diese Trennung liegt in §8: Die Token-Ausgabe ist die einzige Mandantengrenze des Videocalls – „die eine Stelle dieser Architektur, an der ein Fehler teuer wird". Sie lässt sich vollständig prüfen, solange keine Medienschicht daneben liegt. Umgekehrt braucht die LiveKit-Integration lokales TLS und Kamerazugriff und ist damit deutlich mühsamer zu testen. Erst wenn der Kreis geschlossen ist, wird LiveKit dahinter gehängt.

**Getroffene Entscheidungen**

- Stufe A setzt den Workflow echt um (API, Zustand, Einlassen); nur die Video-Bühne ist Platzhalter.
- Das Wartesignal läuft von Anfang an über **Server-Sent Events**, nicht über Polling – kein späterer Umbau.
- Der Zugangslink des Klienten ist im Zeitfenster **mehrfach nutzbar**. Reload, Netzabbruch oder Gerätewechsel dürfen niemanden aussperren. Das weicht bewusst von „einmalig verwendbar" in §7 ab, siehe *Offene Punkte*.

---

## Stufe A – Platzhalter-Workflow

### A1 · Sitzungszustand und Call-Zugang in der API ✅ *(umgesetzt 2026-08-20)*

Der Warteraum ist ein Zustand, kein Raum. `bookings` bekommt die fehlenden Zeitstempel (Warteraum betreten, eingelassen, beendet); `clientTokenUsedAt` wird endlich beschrieben. Dazu **eine** zentrale Zugangsprüfung: beim Coach, dass die Buchung zu seiner Organisation gehört; beim Klienten, dass der Token zu genau dieser Buchung passt, der Status `confirmed` ist und der Zeitpunkt im Zugangsfenster liegt. Ein gemeinsames Zustands-Objekt (`zu früh` | `wartet` | `eingelassen` | `beendet` | `abgelehnt`) in `@hxroom/shared` trägt später unverändert auch das SSE-Ereignis und den LiveKit-Token.

Der Zustand muss persistent sein, nicht im Speicher liegen – sonst wirft ein Reload des Coachs den bereits eingelassenen Klienten zurück in den Warteraum. Vollständig per HTTP testbar, ohne UI.

Umgesetzt in `apps/api/src/call/`: `call-access.ts` trägt die gesamte fachliche Entscheidung als reine Funktion (`resolveCallState`, `canAdmit`, `canEnd`) und ist in `call-access.spec.ts` ohne Datenbank abgedeckt; `call.service.ts` hält die Mandantengrenze, die beiden Controller trennen Klient (`/bookings/:id/waiting-room`, Token) und Coach (`/bookings/:id/call` mit `/admit` und `/end`, Session). Zustände: `too_early`, `open`, `waiting`, `admitted`, `ended`, `cancelled`, `expired` – `open` steht für das offene Fenster, in dem der Klient noch nicht eingetroffen ist, und ist die Lage, die der Coach vor Sitzungsbeginn sieht.

Zwei Festlegungen aus der Umsetzung: Das Zugangsfenster gilt auch für einen bereits eingelassenen Klienten – sonst bliebe ein alter Mail-Link dauerhaft ein Türöffner. Und `end` verlangt eine zuvor eingelassene Sitzung, weil `completed` als gehaltene Sitzung in die Kennzahlen des Coachs einfließt; der No-Show bekommt in B6 einen eigenen Weg.

### A2 · SSE-Kanal „Klient wartet" ✅ *(umgesetzt 2026-08-20)*

Ereigniskanal in der API, der den Zustand aus A1 pusht – je ein Kanal pro Buchung für den Call-Screen des Coachs und den Warteraum des Klienten. Der app-weite Kanal für eine Benachrichtigung überall im Backoffice ist bewusst verschoben, bis es die zugehörige Oberfläche gibt. Eigener Schritt, weil hier eigene Fallstricke hängen (Cookie-Authentifizierung ohne Header, Proxy-Buffering in Caddy und nginx, Reconnect, Heartbeat) und sie mit der Zugriffslogik nichts zu tun haben.

Umgesetzt als `call/call-events.service.ts`: ein rxjs-Subject, das **nur die bookingId** transportiert – wer etwas ändert, muss deshalb keine Antwort bauen können, und der Stream lädt den frischen Stand selbst. Genau das erlaubt es, auch die Absage durch den Coach (`CoachBookingsService`) anzuschließen, damit ein wartender Klient nicht auf jemanden wartet, der nicht mehr kommt. Streams: `GET /bookings/:id/waiting-room/events?token=…` und `GET /bookings/:id/call/events`, beide mit derselben Zugangsprüfung wie A1.

Der Fallstrick „Proxy-Buffering" hat sich weitgehend erledigt: Die nginx-Container liefern nur statische Dateien und proxyen keine API-Requests, Caddy flusht `text/event-stream` von sich aus. Geblieben ist ein Heartbeat alle 25 Sekunden gegen unbekannte Zwischenstationen.

Zwei Punkte, die den Ausschlag gaben: Die idempotenten Pfade aus A1 dürfen **nicht** melden – sonst käme jeder Reload des Klienten als „wartet"-Meldung beim Coach an. Und das Verstreichen von Zeit (`too_early → open`, Ablauf des Fensters) erzeugt keinen Schreibvorgang und damit kein Ereignis; da jede Nachricht `opensAt`, `start` und `end` mitliefert, rechnet die Oberfläche das in A3/A4 selbst aus.

Neu in der Antwortform: `clientOnline` – ob der Klient gerade eine Verbindung hält. Damit beantwortet A2 die Frage, die A1 offenlassen musste, und der Coach unterscheidet „wartet seit 10:02" von „war da, ist jetzt weg". Grenze: Bus und Präsenzregistry leben im Prozess; bei mehreren API-Instanzen bräuchte es einen geteilten Kanal (kein Redis im Betrieb, eine Instanz im Deployment).

### A3 · Warteraum des Klienten (`apps/bookingpage`) ✅ *(umgesetzt 2026-08-20)*

Route `/call/:bookingId` mit dem Token aus der URL: Warteraum-Ansicht mit Coach-Kontext, eigene Statusmeldungen für die Fehlerfälle (zu früh, abgesagt, Link ungültig, Termin vorbei) und nach dem Einlassen eine leere Platzhalter-Bühne. Der SPA-Fallback ist vorhanden, es braucht keine Infra-Änderung (§6).

Umgesetzt als `views/CallView.vue` mit `composables/useCallState.ts` sowie den Komponenten `WaitingRoom.vue` und `CallStage.vue`. Alle Zustände liegen auf einer Route – der Server kennt den Stand, ein Reload mitten im Gespräch landet daher wieder auf der Bühne.

Die Reihenfolge beim Öffnen ist entscheidend: erst `POST …/waiting-room`, dann der `EventSource`. Ein `EventSource` kann den HTTP-Status nicht lesen; bei ungültigem Token bekäme er nur ein anonymes `onerror` und verbände endlos neu, ohne dass der Klient je erführe, warum nichts passiert. Der POST liefert 401 und 404 sauber aus und ist zugleich der Warteraum-Eintritt.

Der Ereignisstrom bleibt über die gesamte Wartezeit offen – daran hängt die Präsenzanzeige des Coachs aus A2 – und schließt bei den Endzuständen und beim Verlassen der Seite. Zeit läuft lokal: Ein Sekundentakt speist den Countdown, und beim Erreichen von `opensAt` tritt die Seite selbsttätig erneut ein. Dafür trägt die Antwort seit A3 neben `opensAt` auch `closesAt`, damit die Oberfläche beide Fenstergrenzen kennt, ohne die serverseitigen Konstanten zu duplizieren.

**Gefunden dabei, nicht behoben:** `apps/bookingpage` ist die einzige App ohne lokale Icon-Sammlung (`@iconify-json/lucide` fehlt, anders als in `coach`, `admin` und `landing`). Nuxt UI lädt die Symbole deshalb zur Laufzeit von `api.iconify.design` nach – auch im Produktions-Build, in dem der Host fest im Bundle steht. Auf der Klientenseite überträgt das die IP jedes Klienten an einen Dritten, während der Footer derselben Seite „DSGVO-konform · Server Deutschland" verspricht. Die Dependency allein genügt nicht: Der Nuxt-UI-Vite-Plugin bündelt in dieser SPA nicht automatisch, es braucht eine bewusste Entscheidung zwischen der vollständigen Sammlung (556 KB) und einer Handauswahl der benutzten Symbole.

### A4 · Call-Screen des Coachs (`apps/coach`) ✅ *(umgesetzt 2026-08-20)*

Route `/call/[bookingId]` hinter der better-auth Session: Platzhalter-Bühne, Anzeige „Klient wartet", Schaltfläche **Einlassen**, Schaltfläche **Sitzung beenden**. Das Ende setzt den Sitzungsstatus und leitet den Klienten auf eine Danke-Platzhalterseite. Erst damit ist der Kreis geschlossen und der Workflow eigenständig durchspielbar.

Umgesetzt als `pages/call/[bookingId].vue` mit dem Composable `composables/useCallState.ts` und der Bühne `components/CallStage.vue`. Der Screen liegt in einem eigenen, dritten Layout (`layouts/call.vue`) ohne Seitenleiste: Der Coach ist hier im Gespräch, nicht in der Verwaltung, und daneben entsteht später die Notiz-Seitenleiste.

Das Composable ist das Gegenstück zu dem der Klienten-App, mit drei Unterschieden: kein Warteraum-Eintritt (der Einstieg ist ein reiner Abruf, der aber aus demselben Grund vor dem Ereignisstrom läuft – ein `EventSource` kann den HTTP-Status nicht lesen), `withCredentials` statt Token in der Query, und die beiden Aktionen. `runtimeConfig.public.apiUrl` trägt in dieser App bereits `/api/v1`, anders als in `bookingpage`.

`clientOnline` aus A2 zahlt sich hier aus: Der Coach unterscheidet „Wartet seit 4 Min.", „Ist eingetroffen" und „War schon da, ist gerade nicht verbunden". Einlassen bleibt in allen drei Fällen möglich – die Entscheidung trifft der Coach, nicht die Oberfläche. Der Sitzungs-Timer zählt ab `admittedAt` hoch statt die gebuchte Zeit herunter und färbt sich beim Überschreiten dezent um; beendet wird eine Sitzung nur durch den Coach, nie durch eine Uhr.

Nicht übernommen: der Farbbalken der Sitzungsart aus der Agenda. `CallAccessResponse` trägt kein `offerId`, und ein zweiter Request nur für die Farbe lohnt nicht.

**Damit ist Stufe A abgeschlossen** – bis auf die Einstiegspunkte (A5). Der Kreis Warteraum → Benachrichtigung → Einlass → „Call" → Ende → Danke-Seite läuft vollständig über beide Oberflächen, ohne eine Zeile LiveKit.

### A5 · Einstiegspunkte

Call-Link zentral bauen (analog zu den bestehenden Bestätigungs- und Absage-Links in `booking-urls.ts`), in die Bestätigungsmail des Klienten aufnehmen und im Coach-Dashboard beziehungsweise der Terminliste einen „Sitzung starten"-Einstieg ergänzen. Bewusst am Ende: Die Ziele existieren dann schon, zum Testen genügt vorher die URL von Hand.

**Ergebnis Stufe A:** Mail → Warteraum → Benachrichtigung des Coachs → Einlassen → „Call" → Ende → Danke-Seite. Ohne eine Zeile LiveKit.

---

## Stufe B – Echtes Video

### B1 · LiveKit-Infrastruktur

Server-Container mit `livekit.yaml`, Einbindung in `docker-compose.yml` und `docker-compose.dev.yml`, Schlüssel in die Umgebung, der vorhandene Caddy-Block wird endlich bedient. Isoliert prüfbar über das LiveKit-CLI, ganz ohne HxRoom-Frontend. Kein Egress, kein Redis-Cluster-State in dieser Stufe.

### B2 · LiveKit-Token-Ausgabe in der API

Raum `session_${bookingId}`, getrennte Identitäten `coach_${userId}` und `client_${bookingId}`, Token-Laufzeit 10 Minuten (§8). Hängt sich direkt an die Prüfung aus A1 – das Token ist nur die zusätzliche Rückgabe im Zustand „eingelassen". Klein und sicher, weil die Berechtigungslogik bereits steht und getestet ist. Die Prüfung darf hier **nicht** dupliziert werden.

### B3 · `packages/livekit` übernehmen und entkernen

Übernahme aus `hxmeet-core-component` (MIT, eigene Vorarbeit): Verbindungs-Composables, Geräte-Handling, browserspezifische Freigabefehler, Connect-Retry, `prepareConnection()` und der Extension-Seam bleiben; Chat, Reactions, Teilnehmerliste und die Multi-Party-Layouts fallen weg (§8, `project.md` §5a). Nuxt UI v3 → v4 nachziehen. Das Paket muss sowohl von der Vite-SPA `bookingpage` als auch von Nuxt konsumierbar sein – Auto-Imports gibt es in `bookingpage` nicht. Größter Fremdcode-Block, unabhängig gegen einen Testraum prüfbar.

### B4 · Klientenseite real machen

Platzhalter-Bühne durch die geteilte Komponente ersetzen, Verbindungs-Warmlauf schon im Warteraum, Kamera- und Mikrofonfreigabe samt Fehlerfällen. Der Warteraum selbst bleibt unverändert – genau dafür wurde er vorne gebaut. Ab hier wird lokales HTTPS relevant: Safari behandelt `*.localhost` nicht als sicheren Kontext (§15).

### B5 · Coachseite real machen

Gleiche Ersetzung im Call-Screen, „Einlassen" wandert an die echte Token-Vergabe, Sitzungs-Timer.

### B6 · Robustheit und autoritatives Sitzungsende

LiveKit-Webhooks als zweite Quelle für das Sitzungsende, Reconnect-Verhalten, doppelte Tabs (`DUPLICATE_IDENTITY`), No-Show. Die Schaltfläche „Sitzung beenden" bleibt der Auslöser, der Webhook ist der Fallback.

---

## Bewusst nicht Teil dieses Plans

Notiz-Seitenleiste, Einwilligungs-Banner, Aufzeichnung und Egress, Whisper-Transkription, Technik-Check, Warteraum-Branding, konfigurierbare Danke-Seite, Geräteauswahl, Screensharing, Erinnerungsmails. Das gehört in die Phasen 5 und 6 (§14). Die Seite `settings/waiting-room.vue` bleibt bis dahin Feature-Vorschau.

---

## Offene Punkte, die in Stufe A mitentschieden werden

| Thema | Stand und Vorschlag |
|---|---|
| **Zugangsfenster** | ✅ Entschieden und in A1 umgesetzt: Terminbeginn −60 Minuten bis Terminende +120 Minuten, serverseitig geprüft, mit `too_early`/`expired` und `opensAt` in der Antwort. §7 nachgezogen. |
| **HMAC vs. DB-Token** | ✅ §7 an den Code angeglichen: 256-Bit-Zufallstoken in der Datenbank mit Konstantzeit-Vergleich (`common/client-token.ts`), zusätzlich einzeln widerrufbar. |
| **Einmaligkeit des Warteraum-Links** | ✅ Verworfen und in §7 korrigiert: im Zugangsfenster mehrfach nutzbar, `clientTokenUsedAt` hält nur den ersten Eintritt fest. |
| **Sitzungsstatus `completed`** | ✅ Wird ab A1 durch das Sitzungsende gesetzt und fließt damit erstmals in Klientenliste und Betreiber-Auswertung ein. Deshalb kein Abschluss ohne vorherigen Einlass – der No-Show bekommt in B6 einen eigenen Weg. |
| **Nur `confirmed` darf warten** | ✅ Umgesetzt: `pending` meldet `expired` (die Buchung verfällt ohnehin), `cancelled` einen eigenen Zustand statt eines Fehlers. |

---

## Abnahme der Stufe A

Lokale Umgebung über Caddy (`app.hxroom.localhost` und `[slug].hxroom.localhost`), Coach und Klient in **zwei Browser-Profilen** – das Session-Cookie hängt am API-Host, nicht am Frontend.

1. Termin buchen und bestätigen, Bestätigungsmail auf den Call-Link prüfen.
2. Call-Link vor dem Zugangsfenster öffnen → „zu früh" mit Terminzeit.
3. Im Fenster öffnen → Warteraum; das Coach-Backoffice zeigt die Benachrichtigung ohne Reload.
4. Coach öffnet den Call-Screen und klickt „Einlassen" → der Klient wechselt selbsttätig auf die Platzhalter-Bühne.
5. Beide Seiten neu laden → der Zustand bleibt „eingelassen".
6. Coach beendet die Sitzung → der Klient landet auf der Danke-Seite, die Buchung zählt als gehalten.
7. Fremde Organisation und abgesagte Buchung → jeweils abgelehnt, mit unterscheidbarer Meldung.

Dazu Unit- und e2e-Tests für die Zugangsprüfung (Fenstergrenzen, falscher Token, fremde Organisation, unzulässiger Status) nach dem Muster der bestehenden Bookings-Tests.
