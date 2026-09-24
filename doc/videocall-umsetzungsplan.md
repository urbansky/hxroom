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

**Gefunden dabei, inzwischen behoben (2026-09-08):** `apps/bookingpage` war die einzige App ohne lokale Icon-Sammlung (`@iconify-json/lucide` fehlte, anders als in `coach`, `admin` und `landing`). Nuxt UI lud die Symbole deshalb zur Laufzeit von `api.iconify.design` nach – auch im Produktions-Build, in dem der Host fest im Bundle steht. Auf der Klientenseite übertrug das die IP jedes Klienten an einen Dritten, während der Footer derselben Seite „DSGVO-konform · Server Deutschland" verspricht.

Statt der Wahl zwischen vollständiger Sammlung (556 KB) und Handauswahl kam ein dritter Weg: `clientBundle.scan` legt genau die Symbole ins Bundle, die im Quelltext stehen – 52 Stück (13 eigene plus die Defaults von Nuxt UI), rund 17 KB roh. Der Schalter sitzt in `hxroomUI()` in `packages/ui/vite.ts`, nicht in der App, damit jede künftige Vite-App ihn erbt; eine App kann eigene `icon`-Optionen setzen, ohne ihn zu verlieren. Beleg: Vor der Änderung enthielt der Produktions-Build **keine** Icon-Definition, danach 52; im Browser kontaktiert die Klientenseite nur noch `anna.hxroom.localhost` und `api.hxroom.localhost`.

### A4 · Call-Screen des Coachs (`apps/coach`) ✅ *(umgesetzt 2026-08-20)*

Route `/call/[bookingId]` hinter der better-auth Session: Platzhalter-Bühne, Anzeige „Klient wartet", Schaltfläche **Einlassen**, Schaltfläche **Sitzung beenden**. Das Ende setzt den Sitzungsstatus und leitet den Klienten auf eine Danke-Platzhalterseite. Erst damit ist der Kreis geschlossen und der Workflow eigenständig durchspielbar.

Umgesetzt als `pages/call/[bookingId].vue` mit dem Composable `composables/useCallState.ts` und der Bühne `components/CallStage.vue`. Der Screen liegt in einem eigenen, dritten Layout (`layouts/call.vue`) ohne Seitenleiste: Der Coach ist hier im Gespräch, nicht in der Verwaltung, und daneben entsteht später die Notiz-Seitenleiste.

Das Composable ist das Gegenstück zu dem der Klienten-App, mit drei Unterschieden: kein Warteraum-Eintritt (der Einstieg ist ein reiner Abruf, der aber aus demselben Grund vor dem Ereignisstrom läuft – ein `EventSource` kann den HTTP-Status nicht lesen), `withCredentials` statt Token in der Query, und die beiden Aktionen. `runtimeConfig.public.apiUrl` trägt in dieser App bereits `/api/v1`, anders als in `bookingpage`.

`clientOnline` aus A2 zahlt sich hier aus: Der Coach unterscheidet „Wartet seit 4 Min.", „Ist eingetroffen" und „War schon da, ist gerade nicht verbunden". Einlassen bleibt in allen drei Fällen möglich – die Entscheidung trifft der Coach, nicht die Oberfläche. Der Sitzungs-Timer zählt ab `admittedAt` hoch statt die gebuchte Zeit herunter und färbt sich beim Überschreiten dezent um; beendet wird eine Sitzung nur durch den Coach, nie durch eine Uhr.

Nicht übernommen: der Farbbalken der Sitzungsart aus der Agenda. `CallAccessResponse` trägt kein `offerId`, und ein zweiter Request nur für die Farbe lohnt nicht.

**Damit ist Stufe A abgeschlossen** – bis auf die Einstiegspunkte (A5). Der Kreis Warteraum → Benachrichtigung → Einlass → „Call" → Ende → Danke-Seite läuft vollständig über beide Oberflächen, ohne eine Zeile LiveKit.

### A5 · Einstiegspunkte ✅ *(umgesetzt 2026-08-20)*

Call-Link zentral bauen (analog zu den bestehenden Bestätigungs- und Absage-Links in `booking-urls.ts`), in die Bestätigungsmail des Klienten aufnehmen und im Coach-Dashboard beziehungsweise der Terminliste einen „Sitzung starten"-Einstieg ergänzen. Bewusst am Ende: Die Ziele existieren dann schon, zum Testen genügt vorher die URL von Hand.

Umgesetzt: `buildCallUrl()` in `booking-urls.ts`, ein Warteraum-Knopf in `client/booking-confirmed.tsx` samt Hinweis auf die Öffnungszeit, `URL` und `LOCATION` in der Kalenderdatei des Klienten, sowie ein „Sitzung starten"-Knopf in der Agenda-Zeile und im Termin-Slideover der Coach-App.

**Die Fenstergrenzen sind nach `packages/shared` gewandert.** Der Server entscheidet über den Zugang, das Backoffice blendet danach den Knopf ein – beide brauchen dieselbe Grenze, und eine zweite Konstante im Frontend liefe unweigerlich auseinander. `isWithinCallWindow()` kam dabei neu dazu.

Zwei Dinge, die beim Bauen auffielen:

- Der Kommentar in `booking-confirmed.tsx` verwies für den Warteraum-Zugang auf Erinnerungsmails, **die es nicht gibt** (die `reminderJobs` aus §12 sind Entwurf, keine Tabelle). Diese Mail ist damit der einzige Weg, auf dem der Klient seinen Link je erhält – der Kommentar ist entsprechend richtiggestellt.
- Die Terminliste lud mit `from: now`. Da die API auf den Beginn filtert, fiel eine **gerade laufende** Sitzung aus der Liste – ausgerechnet die, die der Coach starten will. Das Ladefenster reicht jetzt zwölf Stunden zurück, gefiltert wird clientseitig auf das Ende, wie es `upcomingBookings()` im Dashboard schon tat.

In der Agenda sitzt der Knopf **neben** der Zeile, nicht darin: Die Zeile ist ein `<button>`, ein Knopf darin wäre ungültiges HTML. Beide Stellen führen eine reaktive Jetzt-Zeit im Minutentakt mit, sonst erschiene der Knopf erst beim nächsten Laden der Seite – womöglich nie, während der Klient wartet.

**Damit ist Stufe A abgeschlossen.** Der Ablauf läuft von der Buchung bis zum Sitzungsende ohne Zutun von außen.

**Ergebnis Stufe A:** Mail → Warteraum → Benachrichtigung des Coachs → Einlassen → „Call" → Ende → Danke-Seite. Ohne eine Zeile LiveKit.

### A6 · Spontan-Termin ✅ *(umgesetzt 2026-08-24)*

Nachträglich ergänzt, aus einem Befund beim Prüfen von Stufe A: Der Ablauf ließ sich nur testen, indem man Terminzeiten per SQL ins Zugangsfenster schob und danach zurücksetzte. Für jeden Schritt der Stufe B wäre das der Dauerzustand geworden.

Der Coach wählt Klient und Angebot, die Sitzung beginnt im Moment des Aufrufs, der Klient bekommt den Zugangslink per E-Mail – und der Coach zusätzlich in die Zwischenablage, weil eine Mail für ein Gespräch in fünf Minuten oft zu langsam ist. Zugleich die halbe MVP-Funktion 2.04 aus `doc/funktionen/backoffice-coach.md`; der zweite Teil (Termin zu einem *gewählten* Zeitpunkt anlegen) teilt sich später Dienst und Dialog mit diesem hier.

`POST /bookings/ad-hoc` in `CoachBookingsService.createAdHoc()`, bewusst neben `BookingsService.create()` statt darin: Der öffentliche Buchungsweg prüft gegen einen berechneten Verfügbarkeits-Slot und endet in `pending`, bis der Klient bestätigt. Beides ergibt hier keinen Sinn – ein spontaner Termin liegt außerhalb der freigegebenen Zeiten, und auf eine Bestätigungsmail zu warten hieße, das Gespräch nicht zu führen. Die Buchung entsteht direkt als `confirmed` und zählt damit wie jede andere.

**Herkunft statt Ratespiel:** Ein Spontan-Termin entsteht als `confirmed` und wäre danach von einer regulären Buchung nicht mehr zu unterscheiden – dabei liegt er außerhalb jeder Verfügbarkeit und war nie `pending`. `bookings.origin` (`'booking_page' | 'ad_hoc'`, Default `'booking_page'`) hält das fest. Bewusst ein Enum statt eines Flags: Der zweite Teil von 2.04 kommt hier später als `'manual'` dazu. Im Backoffice erscheint die Herkunft als Badge „Spontan" in Agenda, Termin-Slideover und Sitzungshistorie; die Klientenseite bleibt unberührt, für den Klienten ist es einfach ein Termin.

**Angebot optional:** Das Gespräch, das jetzt stattfindet, ist oft keines der veröffentlichten Angebote, und ein Pseudo-Angebot dafür anzulegen bliebe in den Angebotslisten des Coachs stehen. Ohne Angebot treten `AD_HOC_OFFER_NAME` („Spontan-Termin") und `AD_HOC_DURATION_MINUTES` (60) aus `booking.constants.ts` an die Stelle des Angebots-Snapshots; `offerId` bleibt `null`, wie bei jeder Buchung ohne verknüpftes Angebot. Die Dauer ist dabei mehr als eine Anzeige – aus ihr ergibt sich die Endzeit und damit das Zugangsfenster aus A1.

**Eine bewusste Ausnahme:** `adHocBookingResponseSchema` führt als einzige Antwort die Call-URL und damit den `clientAccessToken` mit. Die Regel, dass er die API nie verlässt, zielt auf den öffentlichen Kontext, in dem sonst jeder eine Buchung selbst bestätigen könnte; hier steht die Antwort hinter dem `AuthGuard` und geht an den Eigentümer der Buchung, der den Link ohnehin weitergeben soll. Nur dort, nie in `GET /bookings`.

---

## Stufe B – Echtes Video

### B1 · LiveKit-Infrastruktur ✅ *(umgesetzt 2026-09-08)*

Server-Container mit `livekit.yaml`, Einbindung in `docker-compose.yml` und `docker-compose.dev.yml`, Schlüssel in die Umgebung, der vorhandene Caddy-Block wird endlich bedient. Isoliert prüfbar über das LiveKit-CLI, ganz ohne HxRoom-Frontend. Kein Egress, kein Redis-Cluster-State in dieser Stufe.

Umgesetzt als `livekit/livekit-server:v1.13.6` in beiden Compose-Dateien, gepinnt statt `:latest` wie `postgres:17-alpine`: Bei einem Medienserver kann ein Minor-Sprung das ICE-Verhalten ändern, und das äußert sich als „Video geht manchmal nicht", nicht als Fehlermeldung. Der Caddy-Block `livekit.hxroom.localhost` zeigte auf `host.docker.internal:7880` und trägt jetzt auf `livekit:7880`, weil der Container im selben Netz liegt; der Produktionsblock ist entkommentiert.

**Zwei Konfigurationsdateien statt einer.** `livekit.yaml` und `livekit.dev.yaml` unterscheiden sich in genau einem Punkt, und der ist der Kern dieses Schritts: Der Server annonciert dem Client eine IP als ICE-Kandidat. Auf Hetzner ist das die öffentliche (`use_external_ip: true`, per STUN ermittelt), lokal wäre das falsch – dort steht `node_ip: 127.0.0.1` und zeigt damit auf das Docker-Port-Mapping. Eine gemeinsame Datei mit Platzhaltern hätte diese Asymmetrie versteckt. Details und Begründung in `technisches-konzept.md` §8.

**Die Schlüssel bleiben aus der YAML heraus** und kommen als `LIVEKIT_KEYS` aus der Umgebung. In der Produktions-Compose-Datei muss der Wert gequotet werden – ohne Anführungszeichen liest YAML den Doppelpunkt in `key: secret` als Mapping, und LiveKit startet ohne Schlüssel.

**Die API bekommt zwei URLs, nicht eine.** `LIVEKIT_URL` (`wss://livekit.hxroom.de`) geht mit dem Access-Token an den Browser, `LIVEKIT_HOST` (`http://livekit:7880`) ist der interne Weg für RoomService und Webhooks. B2 und B6 greifen darauf zu, ohne die Konfiguration noch einmal anzufassen.

**Abnahme in drei Stufen**, jede mit einer eigenen Fehlerquelle: `curl` auf 7880 → `OK` (Prozess und Konfiguration), `lk room list` (Schlüssel greifen), zwei parallele `lk room join --publish-demo` (Medien fließen). Ergebnis: zwei Teilnehmer, zwei Publisher, im Serverlog `"connectionType": "udp"` mit dem Kandidatenpaar `127.0.0.1:7882` und ICE-Aufbau in fünf Millisekunden. Derselbe Durchlauf noch einmal über `ws://livekit.hxroom.localhost`, also über Caddy – das ist der Weg, den ab B4 der Browser nimmt.

**Nicht vergessen beim Deployment:** Die Medien laufen am Reverse Proxy vorbei. In der Hetzner-Cloud-Firewall müssen 7881/tcp und 7882/udp eingehend offen sein; fehlt die Freigabe, verbindet sich der Client und das Bild bleibt trotzdem schwarz.

### B2 · LiveKit-Token-Ausgabe in der API ✅ *(umgesetzt 2026-09-08)*

Raum `session_${bookingId}`, getrennte Identitäten `coach_${userId}` und `client_${bookingId}`, Token-Laufzeit 10 Minuten (§8). Hängt sich direkt an die Prüfung aus A1 – das Token ist nur die zusätzliche Rückgabe im Zustand „eingelassen". Klein und sicher, weil die Berechtigungslogik bereits steht und getestet ist. Die Prüfung darf hier **nicht** dupliziert werden.

Umgesetzt als `call/livekit-token.ts` (reine Funktionen mit dem `ConfigService` als Parameter, Muster `booking-urls.ts`) plus `mayJoinRoom()` in `call-access.ts`. Kein eigener Endpunkt: Das Token geht als Feld `livekit: { url, token } | null` in der bestehenden `CallAccessResponse` mit – beide Wege dorthin haben ihre Prüfung schon hinter sich, ein zweiter Endpunkt bräuchte sie ein zweites Mal.

**Der Coach bekommt sein Token früher als der Klient**, nämlich ab `open`. Der Klient erst ab `admitted` – für ihn ist der Warteraum ein Zustand, kein Raum, vorher gibt es nichts zu verbinden. Beim Coach ist es umgekehrt: Er ist derjenige, der einlässt; bekäme er sein Token erst danach, träte der Klient in einen leeren Raum und wartete auf jemanden, der sich gerade erst verbindet. Das ist der einzige Punkt, an dem die beiden Rollen unterschiedlich behandelt werden, und er steht als eine Zeile in `mayJoinRoom()`.

**Die TTL löst sich ohne Sonderweg.** Zehn Minuten Token-Laufzeit gegen bis zu 60 Minuten Wartezeit klingt nach einem Widerspruch, ist aber keiner: Da jedes SSE-Ereignis den frisch geladenen Zustand trägt (A2), entsteht das Token genau in dem Ereignis, das den Einlass meldet – und bei jedem Reconnect erneut. Es wird bei jedem Abruf neu ausgestellt, statt irgendwo zwischengelagert zu werden.

**Die userId musste erst bis zum Service kommen.** `coach_${userId}` verlangt etwas, das der Coach-Controller nicht durchreichte – er kannte nur `@CurrentOrganization()`. Alle vier Endpunkte tragen jetzt zusätzlich `@CurrentUser()`. Die organizationId als Identität wäre weniger invasiv und falsch gewesen: Im Studio-Plan teilen sich mehrere Coachs eine Organisation und würden einander mit `DUPLICATE_IDENTITY` aus dem Raum werfen.

Der Anzeigename der Gegenseite geht als `name` mit ins Token, damit die Bühne in B4/B5 Namen zeigen kann, ohne eine eigene Zuordnung zu bauen. `canPublishData` ist gleich mit vergeben – B6 will „Coach beendet die Sitzung" über den Data-Channel schicken, und ein Nachrüsten müsste die Token-Ausgabe erneut anfassen.

**Gefunden dabei:** Das Snippet in §8 zeigte `toJwt()` synchron; die Methode gibt seit dem v2-SDK ein Promise zurück. §8 ist nachgezogen.

Abnahme per HTTP gegen einen Spontan-Termin, ohne Browser: Klient vor dem Einlassen `livekit: null`, Coach im selben Moment mit Token; nach `admit` beide mit Token; nach `end` beide wieder ohne. Falscher `clientAccessToken` 401, fremde Buchung 404, jeweils ohne Token in der Antwort. Der eigentliche Beweis war der Signaling-Endpunkt von LiveKit selbst: Beide Token ergaben ein `101 Switching Protocols`, ein um ein Zeichen verändertes ein `401` – ein selbst dekodiertes JWT hätte nur bestätigt, was wir hineingeschrieben haben.

### B3 · `packages/livekit` übernehmen und entkernen ✅ *(umgesetzt 2026-09-11)*

Übernahme aus `hxmeet-core-component` (MIT, eigene Vorarbeit): Verbindungs-Composables, Geräte-Handling, browserspezifische Freigabefehler, Connect-Retry und `prepareConnection()` bleiben; Chat, Reactions, Teilnehmerliste und die Multi-Party-Layouts fallen weg (§8, `project.md` §5a). Das Paket muss sowohl von der Vite-SPA `bookingpage` als auch von Nuxt konsumierbar sein – Auto-Imports gibt es in `bookingpage` nicht. Größter Fremdcode-Block, unabhängig gegen einen Testraum prüfbar.

Der Schritt zerfiel in zwei Teile: Der Rohstand kam am 2026-09-08 ins Repo (Commit `6e0aee1`), entkernt wurde am 2026-09-11. Aus 50 Dateien wurden fünf – `index.ts`, `src/types.ts`, `src/logger.ts`, `src/state.ts`, `src/room.ts`.

**Die gesamte HxMeet-Oberfläche ist entfallen, nicht nur die Teile außerhalb des Scope.** Zwischen Übernahme und Entkernung entstand die eigene Call-UI in `apps/coach` (Bühne, Steuerleiste, Seitenleiste), die Coach und Klient tragen soll. Damit waren die 24 übernommenen SFCs nicht mehr der Ausgangspunkt, sondern eine zweite Oberfläche im Repo, von der nie eine Zeile laufen würde. Mit ihnen fielen alle 30 `@nuxt/ui`-Importe des Pakets und 24 Icon-Referenzen, von denen ohnehin keine auflösbar war (`i-fluent-*`, `i-heroicons-*`, `i-hugeicons-*` sind im Repo nicht installiert).

**Extension-Seam und Event-Bus sind ersatzlos entfallen.** Sie ergaben Sinn, solange die Oberfläche eine geschlossene Komponente aus dem Fremdpaket war. Mit eigener UI sind Rollenunterschiede gewöhnliche Props und Slots, und der Verbindungszustand ist ein Ref aus `useCallRoom()`. §8 ist nachgezogen.

**Umbenannt auf HxRoom-Begriffe**, weil das Paket null Konsumenten hatte und jede Datei ohnehin angefasst wurde: `provideLivekitConfig` → `configureLivekit`, `usePrepareLivekit` → `prepareCall`, `useEnterConference`/`useConnectLivekit` → `joinCall`, `switchCameraLivekit` → `setCameraEnabled` (der Name des SDK), `useConferenceState` + `useTrackStore` → `useCallRoom`, `HxParticipant` → `CallParticipant`, `HxMeetingStatus` → `RoomStatus`. Das `use`-Präfix trugen in HxMeet auch einmalige Aktionen; im übrigen Repo heißt es „gibt reaktiven Zustand zurück". Zwei Namen waren dabei gesperrt: `CallState` gehört `@hxroom/shared` (Buchungszustand), `useCallState` beiden Apps.

**Aufgelöster Zyklus.** `livekit.ts ↔ conferenceState.ts ↔ conferenceActions.ts` verwiesen im Kreis aufeinander und funktionierten nur, weil jeder Zugriff erst zur Laufzeit stattfand. Jetzt zeigt `room.ts` auf `state.ts` und nicht zurück; `state.ts` importiert nichts außer `vue` und den eigenen Typen.

**Gefunden dabei:** Das Paket hat seit der Übernahme **nie kompiliert**. Zwei Blocker: `conferenceState.ts` importierte `../helper/example`, eine Datei, die nie mitkopiert wurde (gebraucht nur von den Testteilnehmern, also von entfallendem Code); und über 40 Importe endeten auf `.ts`, ohne dass `allowImportingTsExtensions` gesetzt war (TS5097). Beides ist mit dem Entkernen verschwunden, `tsc --noEmit` läuft seitdem durch. Aus den fünf leeren Toast-Rümpfen in `ui.ts` wurde Zustand: `cameraIssue`/`microphoneIssue` mit `classifyDeviceError()`, das die Browserformen auseinanderhält – Chrome meldet „Permission denied", Safari `NotAllowedError`, fehlende Hardware „Requested device not found", ein unsicherer Kontext `NotSupportedError`. Die Sätze dazu gehören in die App, nicht ins Paket.

**Abnahme über ein Playground im Paket** (`packages/livekit/playground/`, `pnpm --filter @hxroom/livekit playground`), weil ein Typecheck nur die Auflösbarkeit belegt und bis B4 nichts diesen Code ausführt: Token aus `lk token create --join`, Gegenstelle aus `lk room join --publish-demo`. Ergebnis über `ws://livekit.hxroom.localhost` – also über Caddy, den Weg des Browsers ab B4: Beitritt, beide Teilnehmer in der Liste, das Demo-Video der Gegenstelle in 1280×720 im `<video>`, die eigene Spur veröffentlicht, Kamera und Mikrofon schaltbar, Verlassen räumt Zustand und Spuren ab. Ohne Gerätefreigabe verbindet sich der Raum trotzdem und vermerkt nur `cameraIssue`/`microphoneIssue` – man soll den anderen sehen können, auch wenn die eigene Kamera klemmt. Das Playground bleibt liegen; in B6 (Reconnect, `DUPLICATE_IDENTITY` mit zwei Tabs) ist es wieder das schnellste Werkzeug.

### B3b · Call-UI in die geteilte Schicht heben ✅ *(umgesetzt 2026-09-11)*

Die rollenneutralen Teile der Coach-Oberfläche (Bühne, Steuerleiste, eigenes Kamerabild, Chat) sind aus `apps/coach/app/components/` nach **`packages/ui/components/call/`** gewandert, damit die Klientenseite dieselbe Oberfläche bekommt statt einer zweiten. Rollenspezifisches – Notizen, Klientenakte, Klient stummschalten, Sitzungs-Timer, das Beenden-Modal – bleibt in der jeweiligen App und wird als Props und Slots hineingereicht.

**Nicht `packages/livekit`, obwohl §8 das ursprünglich vorsah.** Das Paket ist mit B3 komponentenfrei und ohne `@nuxt/ui`-Peer geworden; die Oberfläche dorthin zu legen nähme beides wieder zurück. `packages/ui` ist ohnehin der in `CLAUDE.md` festgeschriebene Ort für geteilte Komponenten, hat `@nuxt/ui` bereits als Peer – und `@source "../components"` in `theme/main.css` erfasst Unterverzeichnisse mit, sodass Tailwind **keinen** neuen Eintrag braucht.

**Das Gerüst hält die Mechanik, die Apps halten den Zustand.** `CallScreen` in `packages/ui` trägt Bühne, Steuerleiste, die Höhenmessung der Leiste, das Vollbild samt Fühlfläche am unteren Rand und den Slideover; die Apps reichen `local`/`remote` als `CallPeer`, die Bereiche der Seitenleiste als `panels`, deren Inhalt als Slot `#sidebar` und die Beschriftung des roten Knopfs als `endLabel` herein. Der Slot `#stage-overlay` nimmt auf, was über der Bühne liegen soll – heute die Gerätemeldung der Klientenseite, in Phase 6 das Einwilligungs-Banner. Die 16 Stellen, an denen der Text bisher die Perspektive verriet, lösen sich damit auf: sieben über `remote.name`, drei leitet die Bühne selbst aus `sharingBy === local.id` ab, der Rest sind Props.

Der Vertrag ist auf B4/B5 hin geschnitten: `CallParticipant` aus `packages/livekit` passt Feld für Feld auf `CallPeer`, `localIdentity` wird `local.id`, die Spur aus dem Track-Store wird `peer.stream`, `screenShareVideoTrack` liefert `sharingBy`. Die Anbindung soll die Props nicht noch einmal anfassen müssen.

**Drei Funde, die den Weg bestimmt haben:**

*Icons aus geteilten Komponenten fehlten im Bundle der Klientenseite.* Der Scanner von Nuxt UI globt unterhalb von `config.root` – also der App – und schließt `node_modules` aus; eine SFC in `packages/ui` sieht er nie. Ihre Symbole wären zur Laufzeit von `api.iconify.design` nachgeladen worden, genau das, was der Commit „Klientenseite: keine Drittanbieter-Requests" abgestellt hat. Der naheliegende Fix ist eine Falle: Sobald ein `../`-Muster in `globInclude` steht, lässt tinyglobby die app-eigenen Muster fallen (gemessen: 19 Dateien → 1). `hxroomUI()` scannt die geteilten Komponenten jetzt selbst und hängt das Ergebnis an `clientBundle.icons`; `scan: true` bleibt für die App. Nachgewiesen im gebauten Bundle: ohne den Zusatz fehlen `monitor-up`, `aperture` und `mic-off`, mit ihm sind sie da – und die app-eigenen `calendar-x`/`graduation-cap` weiterhin auch.

*`packages/ui` löst eine andere `@nuxt/ui`-Kopie auf als die Apps.* Deshalb gilt in geteilten Komponenten: Vue-APIs explizit importieren (Auto-Imports greifen dort nur, solange die pnpm-Symlinks auf Pfade ohne `node_modules` zeigen), U-Komponenten dagegen dem Resolver überlassen – ein direkter Import aus `@nuxt/ui` zöge die zweite Kopie samt zweitem `reka-ui` herein. `useToast` scheidet aus demselben Grund aus: Es hält seine Liste modulweit, aus dem Paket gerufen erschienen Toasts nie. Meldungen sind damit Sache der App. `scanPackages: ['@hxroom/ui']` in `hxroomUI()` sichert die Auflösung zusätzlich ab.

*`apps/bookingpage/tsconfig.app.json` schließt die generierten `auto-imports.d.ts` und `components.d.ts` nicht ein*, und die Datei mischt Pfade zweier Nuxt-UI-Versionen, von denen eine nicht mehr installiert ist. `vue-tsc` kennt die auto-importierten Composables dort also nicht. Bewusst nicht behoben – die Klientenseite zeigt ihre Gerätemeldung stattdessen im `#stage-overlay`, was ohnehin die bessere Stelle ist: Wer zum ersten Mal in einem Videocall sitzt, übersieht einen Toast, der nach fünf Sekunden verschwindet.

`clientInitials`, `firstName` und `formatDuration` liegen jetzt in `packages/shared` (Vorbild `offerColor`); `formatDuration` nimmt `Date | number` und räumt damit auf, dass die Coach-App die Jetzt-Zeit als `Date` führt und die Klienten-App als Millisekunden. `useLocalCamera` ist mitgezogen, obwohl B5 es ersetzt: Beide Seiten brauchen es jetzt, und eine zweite Kopie wäre später eine zweite Löschung.

Abnahme im Browser: `/call/prototype` des Coachs verhält sich unverändert; die Klientenseite zeigt über einen Spontan-Termin nach dem Einlassen dieselbe Bühne – mit echtem eigenem Kamerabild, ohne Uhr, mit einem statt drei Bereichen in der Seitenleiste, ohne den Menüeintrag zum Stummschalten und mit „Gespräch verlassen" statt „Sitzung beenden".

### B4 · Klientenseite real machen ✅ *(umgesetzt 2026-09-14)*

Platzhalter-Bühne durch die geteilte Komponente ersetzen, Verbindungs-Warmlauf schon im Warteraum, Kamera- und Mikrofonfreigabe samt Fehlerfällen. Der Warteraum selbst bleibt unverändert – genau dafür wurde er vorne gebaut.

Die Bühne stand schon (B3b), neu ist die Verbindung dahinter: `useCallRoom()` in `CallStage.vue`, Beitritt in dem Moment, in dem die Antwort erstmals ein Token trägt, `leaveCall()` beim Verlassen der Seite.

**Das Antwortschema musste sich ändern – eine Korrektur an B2.** `livekit` war als `{ url, token }` modelliert, „beides oder nichts". Damit fiel genau die Abkürzung aus, für die der Warteraum vorne gebaut wurde: `prepareCall()` braucht nur die URL, und die kannte der Klient vor dem Einlass nicht. Jetzt ist es `{ url, token: string | null }` – die Adresse steht ab dem offenen Fenster bereit, der Ausweis kommt später. Die Unterscheidung liegt als `mayReachRoom()` neben `mayJoinRoom()` in `call-access.ts`: Die URL des Medienservers ist keine Berechtigung, das Geheimnis ist allein der Token.

**Ton war der wichtigere Teil, nicht das Bild.** Die Bühne hatte kein `<audio>` – nur `CallCameraView` mit `<video muted>`, und `muted` ist dort Pflicht, weil kein Browser ein Video sonst von selbst anlaufen lässt. Bild und Ton in einer Spur hätten der Gegenstelle damit den Ton genommen: ein stummes Gespräch, in dem beide reden. `CallAudioOutput.vue` ist deshalb ein eigenes Element pro Spur.

Dazu die Autoplay-Sperre: Ton ohne vorherige Nutzerinteraktion wird blockiert, und `autoplay` allein meldet das nirgends – die Verweigerung steht nur in der Promise von `play()`. Der erste Versuch prüfte deshalb nur diese Promise, was eine zweite Falle öffnete: `autoplay` startet die Wiedergabe kurz darauf manchmal doch, und dann stand „Kein Ton" auf der Bühne, während der Klient längst hörte. Jetzt entscheidet der Zustand des Elements, und `@playing` räumt die Meldung ab.

**Die Track-Brücke liegt in `packages/livekit`**, nicht in den Apps: `videoStreamFor()`, `audioStreamFor()` und `screenShareStream()` machen aus einem LiveKit-`Track` einen `MediaStream`, den `packages/ui` als `CallPeer.stream` erwartet – so bleibt die Oberfläche frei von LiveKit und B5 schreibt dieselben Zeilen nicht erneut. Der Cache darin ist kein Geiz: Ein bei jedem Aufruf neu gebauter Stream wäre für Vue ein neues Objekt, `srcObject` liefe erneut und das Bild setzte bei jedem Rendern neu auf.

`CallCameraView` trägt jetzt beide Seiten und bekam dafür `mirrored` – die Selbstansicht ist gespiegelt, das Bild der Gegenstelle darf es nicht sein, sonst steht dort Schrift verkehrt.

**Kein lokales HTTPS nötig.** Der Plan vermerkte das als Voraussetzung; gemessen über `http://anna.hxroom.localhost` ist `isSecureContext` in Chromium erfüllt, `getUserMedia` und `getDisplayMedia` funktionieren, und `ws://` ist von einer `http://`-Seite kein Mixed Content. Die Falle aus §15 entsteht erst beim Umstieg auf `https://` – dann muss `livekit.hxroom.localhost` mitziehen. Für Safari bleibt es, wie dort beschrieben.

Abnahme über einen Spontan-Termin, Gegenstelle `lk room join --publish-demo --publish tone.ogg` (eine mit ffmpeg erzeugte Opus-Datei – `--publish-demo` allein sendet nur Video, Ton wäre ungeprüft geblieben): Warmlauf im Warteraum läuft und tritt **nicht** vorzeitig bei; nach dem Einlass Beitritt, Bild der Gegenstelle in 1280×720 auf der Bühne, Audiospur am `<audio>`. Beide Autoplay-Fälle gegengeprüft – mit gelockerter Policy spielt der Ton und die Meldung bleibt aus, mit der Standardpolicy ist es umgekehrt. Der Docker-Build der Klientenseite lokal gebaut, weil `packages/livekit` neu im Image liegen muss.

### B5 · Coachseite real machen ✅ *(umgesetzt 2026-09-15)*

Gleiche Ersetzung im Call-Screen, „Einlassen" wandert an die echte Token-Vergabe, Sitzungs-Timer.

Umgesetzt nach dem Muster der Klientenseite: `apps/coach/app/components/CallScreen.vue` hängt an `useCallRoom()`, Bild über `videoStreamFor()`, Ton über `CallAudioOutput`, Gerätefehler als Toast. Damit sehen und hören sich Coach und Klient zum ersten Mal gegenseitig.

**Der Coach tritt beim Einlassen bei, nicht vorher.** B2 gibt ihm sein Token schon ab `open`, damit er vor dem Klienten im Raum sein könnte. Die Coach-Seite zeigt vor dem Einlassen aber keine Bühne, sondern den Warteraum mit „Klient einlassen" – ein Beitritt dort hätte seine Kamera eingeschaltet, während er auf einen Avatar schaut, ohne es zu merken. Im Warteraum läuft deshalb nur der Warmlauf (URL, keine Kamera), der Beitritt kommt mit dem Klick. Beide Seiten verbinden sich fast gleichzeitig. Das frühe Token bleibt ungenutzt; es trägt eine spätere Variante mit eigener Vorschau im Coach-Warteraum, falls sie kommt.

**Im echten Call täuscht nichts mehr eine Funktion vor.** Das betraf beide Seiten, auch die seit B4 echte Klientenseite:

- `CallVideoSim` ist entfernt. Die Bühne zeigte eine Silhouette, sobald kein Bild ankam – im Prototyp der Zweck, im Gespräch ein vorgetäuschtes Gegenüber. Jetzt steht dort eine neutrale Kachel mit Initialen und „… verbindet sich" oder „Kamera aus". Dafür wertet `CallVideoArea` erstmals `remote.cameraOn` aus, und zwar vor der Spur: LiveKit schaltet eine ausgeschaltete Kamera nur stumm, die Spur bleibt als Objekt bestehen und stünde sonst als eingefrorenes Bild da.
- Bildschirmfreigabe und Weichzeichnen sind hinter `can-share`/`can-blur` ausgeblendet, beide im Standard aus. Die Freigabe zeigte dem Teilenden eine Attrappe, während die Gegenseite nichts sah; das Weichzeichnen war ein Häkchen ohne Wirkung. Ohne Einträge fällt das „…"-Menü samt Trenner weg – beim Klienten ist das heute der Fall. *(Die Freigabe ist inzwischen gebaut, siehe Nachtrag unten.)*
- „Klient stummschalten" wirkt jetzt: `CallAudioOutput` hat `muted`, nur auf der Seite des Coachs.

Mit der Prototyp-Seite `/call/prototype` sind `useLocalCamera()` und die `defineExpose`-Handgriffe des Coach-Screens gegangen. `CallShareSim` blieb zunächst für die Freigabe liegen und ist mit ihr entfallen (siehe Nachtrag unten).

`packages/livekit` liegt jetzt auch im Coach-Image. Offen war, ob Nuxt die TypeScript-Quelle des Pakets ohne `build.transpile` verarbeitet – es tut es, `nuxt generate` und das Image bauen.

Abnahme mit zwei echten Browser-Teilnehmern statt CLI-Gegenstelle – Coach über die Coach-App mit Anmeldung, Klient über die Klientenseite: Im Warteraum läuft der Warmlauf des Coachs, im Raum ist niemand; nach „Klient einlassen" sind beide im Raum, jede Seite empfängt das Bild der anderen in 1280×720 mit fortschreitender Wiedergabezeit, dazu je eine Audiospur. Coach schaltet die Kamera aus → beim Klienten „Kamera aus". Coach schaltet den Klienten stumm → nur sein `<audio>` ist stumm. Reload des Coachs → wieder beide im Raum. Coach beendet → Klient auf der Danke-Seite, Raum leer.

**Noch nicht echt:** Der Chat bleibt auf der eigenen Seite, `sendCallData()` liegt bereit, die Übertragung ist ein eigener Schritt (Zusammenfassung nach §5a, Zustellung beim Reconnect). Notizen werden nicht gespeichert. *(Inzwischen schon, siehe Nachtrag „Notizen im Call". Der Chat ist als B7 geplant, dort über die API statt über `sendCallData()`.)*

#### Nachtrag: Geräteliste und Gerätewechsel *(2026-09-15)*

Die Geräteliste lag zuerst in beiden Apps als eigene `loadDevices()`-Kopie und wurde beim Verbinden gelesen. Das trug im Testbrowser, dessen Freigabe sofort erteilt ist, aber nicht in einem echten Chrome: Dort kommt der Freigabedialog erst nach dem Verbinden, und vorher nennt der Browser keine Gerätenamen – die Liste blieb dauerhaft bei „Mikrofon 1, 2, 3". Sie liegt jetzt einmal in `packages/livekit` (`microphones`, `cameras`, `activeMicrophoneId`, `activeCameraId`, `switchDevice()`) und wird nach jeder Freigabe, bei jedem `devicechange` und nach jedem Wechsel neu gelesen.

Zwei Eigenheiten sind dabei behandelt: Chrome führt das Standardgerät doppelt – als `default` und unter eigenem Namen, mit derselben groupId –, der Verweis fällt deshalb weg, sobald das Gerät selbst in der Liste steht. Und welches Gerät aktiv ist, entscheidet die laufende Spur über `getSettings()`, nicht die zuletzt getroffene Wahl; zieht jemand das Headset ab, weicht der Browser still aus, und eine beendete Spur wird auf ein vorhandenes Gerät umgeschaltet.

Der Wechsel selbst ist `Room.switchActiveDevice()`: Die veröffentlichte Spur startet mit dem neuen Gerät neu, die Gegenseite empfängt ohne Unterbrechung weiter.

**Gefunden dabei, ein Fehler aus B4:** Der Stream-Cache hing am LiveKit-`Track`. LiveKit tauscht aber die `MediaStreamTrack` innerhalb desselben Track-Objekts – beim Gerätewechsel und schon beim Aus- und Wiedereinschalten der Kamera, die ausgeschaltet gestoppt wird. Die eigene Vorschau hing danach an der beendeten Spur und stand still (gemessen: `ended`). Der Cache hängt jetzt an der `MediaStreamTrack`, `TrackEvent.Restarted` stößt die Neuberechnung an.

Abnahme: Vorschau nach Kamera aus → an wieder `live`; Wechsel auf „Fake Audio Input 1" fordert per `getUserMedia` genau dessen ID an, und die neue Spur läuft darauf; eine vorgespielte Chrome-Liste mit doppeltem Standardgerät erscheint ohne Doppelung, ein eingestecktes Headset ohne Neuladen; wechselt der Coach mitten im Gespräch das Mikrofon, bleibt die Tonspur beim Klienten `live` und liefert Pegel. Die Lautsprecherwahl ist nicht dabei – die Oberfläche bietet keine an, und der Ton läuft über eigene `<audio>`-Elemente, auf die `switchActiveDevice('audiooutput')` nicht wirkt.

#### Nachtrag: Bildschirmfreigabe *(2026-09-15)*

Vorgezogen aus Phase 5/6 – `project.md` §5a nennt sie „optional zuschaltbar, für beide Seiten". Umgesetzt so: Beide Seiten können teilen, eine Freigabe zur Zeit, mit Ton.

Die Mechanik in `packages/livekit` konnte starten, hatte aber zwei Lücken. Sie hielt nicht fest, **wer** teilt – eine fremde Freigabe landete in derselben Variable wie die eigene; dafür gibt es jetzt `screenShareBy`. Und es fehlte ein `TrackUnsubscribed`-Listener: Beendete die Gegenseite ihre Freigabe, wäre ihr letztes Bild auf der Bühne stehen geblieben. Das Ende einer fremden Spur kommt nur über dieses Ereignis an.

Teilt die Gegenseite, ist der eigene Knopf gesperrt, mit Begründung im Tooltip. Die Bühne zeigt eine Freigabe, und die fremde abzulösen stünde der eigenen Seite nicht zu. Wo der Browser kein `getDisplayMedia` hat – iPhone, die meisten Android-Browser –, erscheint der Knopf gar nicht. Der Ton einer fremden Freigabe spielt über ein eigenes `CallAudioOutput`; „Klient stummschalten" trifft ihn beim Coach mit.

**Die fehlende macOS-Berechtigung bekommt eine Meldung.** Unter macOS braucht der Browser eine eigene Berechtigung zur Bildschirmaufnahme. Fehlt sie, meldet Chrome „Permission denied by system" – unter demselben Namen `NotAllowedError` wie ein Abbruch im Auswahldialog, nur mit anderer Nachricht. Ohne Unterscheidung passierte nach dem Klick schlicht nichts. Der Abbruch bleibt still, die Systemsperre nennt den Weg in die Systemeinstellungen (`screenShareIssue`).

In der Oberfläche ist `CallShareSim` entfernt; die Bühne zeigt die Freigabe über `CallCameraView` mit `fit="contain"` – ein geteilter Bildschirm darf nicht angeschnitten werden, seine Ränder sind Menüleisten und Text. Das Banner „… teilt den Bildschirm" hat einen deckenden Grund bekommen: Es war für die helle Attrappe halbtransparent angelegt und verschwand über einem echten, dunklen Bildschirm fast vollständig – ausgerechnet das Element, das verhindern soll, dass jemand teilt, ohne es zu merken.

Abnahme mit Coach und Klient; den Auswahldialog ersetzt ein animiertes Canvas mit Ton, alles danach läuft über den echten Weg. Klient teilt → Coach sieht die Freigabe in 1920×1080 laufend, hört ihren Ton, sein Knopf ist gesperrt; Beenden über das Banner räumt beide Seiten ab; dasselbe in umgekehrter Richtung; Beenden über die Browserleiste räumt ebenfalls beide Seiten ab; Abbruch im Dialog zeigt keine Meldung, die Systemsperre schon. Zum Beenden über die Browserleiste: `track.stop()` feuert kein `ended`, das tut nur der Browser, wenn die Quelle von außen endet – der erste Testlauf, der nur `stop()` rief, zeigte deshalb einen Fehler, den es nicht gibt. LiveKit hebt die Veröffentlichung bei `ended` selbst auf.

Weichzeichnen bleibt hinter `can-blur` ausgeblendet; es braucht die Personensegmentierung der Track-Processors.

#### Nachtrag: Qualität der Bildschirmfreigabe *(2026-09-16)*

Die Freigabe lief auf den Voreinstellungen von `livekit-client`. Die sind für Gesichter gemacht: 1080p, 2,5 Mbit/s, zwei Simulcast-Ebenen, VP8. Was ein Coach teilt, sind aber Folien, Tabellen und Formulare – dort entscheidet die Auflösung darüber, ob der Klient mitliest oder nachfragen muss.

Das Sendeprofil steht jetzt in `packages/livekit/src/quality.ts`, rein deklarativ wie `state.ts`: **1440p** statt 1080p (als `ideal`, also ein Deckel und kein Zwang – ein 1080p-Bildschirm liefert weiter seine native Auflösung), **8 Mbit/s** als Obergrenze bei 15 Bildern je Sekunde, und **kein Simulcast**. Die zweite, halb aufgelöste Ebene diente allein dazu, dem Empfänger etwas Schlechteres anbieten zu können; ohne sie sinkt bei Engpass die Bildrate statt der Auflösung.

**Die Kamera tritt zurück, solange geteilt wird.** Die Messung zeigte, woran es tatsächlich lag: Die Kamera sendete über drei Simulcast-Ebenen zusammen **1242 kbit/s** und damit mehr als die Freigabe mit 710 kbit/s – für eine Kachel, die neben dem geteilten Bildschirm daumennagelgroß steht. `setPublishingQuality(VideoQuality.LOW)` schaltet die oberen Ebenen ab, ohne die Spur neu zu veröffentlichen, das Bild reißt also nicht ab. Zurückgenommen wird das an drei Stellen: beim Beenden über den Knopf, beim Beenden über die Browserleiste (`localTrackUnpublishListener`) und beim Wiedereinschalten der Kamera während laufender Freigabe – sonst käme sie in voller Auflösung zurück.

**Safari bleibt ausgenommen.** WebKit-Bug 263015: Safari 17 liefert bei *jeder* Auflösungsvorgabe eine niedrig aufgelöste Aufnahme. Dort bleibt die Vorgabe weg, und der Browser gibt die native Auflösung – `livekit-client` verfährt aus demselben Grund ebenso.

**`videoQuality()` in `packages/livekit`** liest Auflösung, Bildrate, Bitrate, Codec und `qualityLimitationReason` aller Spuren aus den RTC-Statistiken. Für die Abnahme eines Sendeprofils und für die Frage, woran ein weiches Bild liegt – nicht für die Oberfläche.

Abnahme mit Coach und Klient über die Caddy-Subdomains, gemessen beim Sender und beim Empfänger:

| | vorher | nachher |
|---|---|---|
| Freigabe beim Empfänger | 1874×1062, 16 fps, 774 kbit/s | **2540×1440**, 15 fps, 1044 kbit/s |
| Gesendete Ebenen der Freigabe | 2 (voll + halb) | **1** |
| Kamera des Teilenden | 3 Ebenen, zusammen 1242 kbit/s | **1 Ebene, 142 kbit/s** |
| Uplink gesamt | ~2310 kbit/s | **~1190 kbit/s** |

Also mehr als die doppelte Pixelzahl bei etwa halbem Uplink. Nach dem Ende der Freigabe sendet die Kamera wieder auf allen drei Ebenen, das Banner beim Klienten verschwindet.

Zwei Dinge sind bewusst nicht geprüft: Das Verhalten bei knapper Leitung – über Loopback entsteht kein Engpass, `qualityLimitationReason` blieb durchweg `none` – und das Beenden über die Browserleiste, das sich nicht automatisieren lässt (siehe die Anmerkung zu `track.stop()` oben).

**`adaptiveStream` und `dynacast` bleiben aus.** Beide klingen nach der bequemeren Lösung, taugen hier aber nicht: `adaptiveStream` braucht `track.attach(element)`, um Größe und Sichtbarkeit zu kennen. HxRoom hängt Spuren nicht so an – `streamFor()` baut einen eigenen `MediaStream`, den `CallCameraView` per `srcObject` setzt, damit `packages/ui` frei von LiveKit bleibt. Ohne `attach()` bleibt `elementInfos` leer, `updateVisibility()` hält jede Spur für unsichtbar und pausiert sie. `dynacast` wiederum stoppt nur Ebenen, die niemand abonniert; ohne `adaptiveStream` fordert der einzige Abonnent im Gespräch immer die höchste an.

Offen für später: VP9 (`scalabilityMode: 'L1T3'`) ist bei Bildschirminhalten pro Bit deutlich schärfer als VP8, verlangt aber Dekodierung beim Empfänger, oft in Software. Das gehört mit eigener Abnahme auf Safari und einem älteren Gerät geprüft.

#### Nachtrag: Geräte einrichten im Warteraum *(2026-09-16)*

Vorgezogen aus dem Technik-Check (`project.md` §5a: „Geräteauswahl und Technik-Check zählen zur Zuverlässigkeits-Basis"). Klient und Coach können im Warteraum sich selbst sehen, Kamera und Mikrofon wählen und an- oder ausschalten und am Pegel prüfen, ob das richtige Mikrofon spricht. Die Oberfläche ist eine geteilte Komponente, `CallDeviceSetup` in `packages/ui`, einspaltig nach Screen 1 der Vorlage `doc/poc/videocall-v2.html`; der Pegel ist `CallMicLevel` (Web Audio API, ohne LiveKit).

**Nur auf Klick.** Der Warteraum steht ab dem Tag der Buchung offen. Die Kachel „Kamera und Mikrofon einrichten" startet die Vorschau, vorher gibt es keinen einzigen `getUserMedia`-Aufruf. Wer nichts einrichtet, tritt wie bisher mit Kamera und Mikrofon bei. Der Coach betritt den Raum weiterhin erst mit „Klient einlassen"; die Vorschau ist keine Anwesenheit im Raum.

**„Hintergrund weichzeichnen" steht da, ist aber gesperrt** und trägt „Bald verfügbar". Ein bedienbarer Schalter ohne Personensegmentierung ließe jemanden glauben, die eigene Küche sei nicht zu sehen.

**Die Vorschauspuren werden übernommen, nicht neu geholt.** `startPreview()` in `packages/livekit` legt die Spuren mit `createLocalTracks` außerhalb eines Raums an, `joinCall()` veröffentlicht sie mit `publishTrack`. Kein zweiter Freigabedialog, kein Kameralicht, das beim Einlass aus- und wieder angeht, und das eigene Bild läuft über den Stream-Cache ohne schwarzen Moment durch (`localVideoStream()`). Ein späterer Blur-Processor kann bereits an der Vorschauspur hängen. Schalter und Gerätewechsel sind dieselben Funktionen wie im Gespräch; sie verzweigen über `previewing`.

Drei Punkte, die den Weg bestimmt haben:

- *„Aus" heißt in der Vorschau: Spur stoppen und verwerfen.* LiveKit wartet beim Veröffentlichen einer Videospur auf die Maße des ersten Bildes; eine gestoppte Kamera ließe sich nicht übernehmen, und das Kameralicht soll ohnehin ausgehen. Beim Einlass wird eine ausgeschaltete Kamera nicht veröffentlicht, späteres Einschalten im Gespräch holt eine neue Spur mit dem gewählten Gerät.
- *Die Vorschau lebt nicht im Warteraum, sondern auf Seitenebene.* Beim `v-if`-Tausch baut Vue den Warteraum ab, bevor die Bühne steht; ein `onBeforeUnmount(stopPreview)` dort nähme dem Beitritt die Kamera weg. Beendet wird sie in `CallView.vue` bzw. `pages/call/[bookingId].vue` – beim Verlassen der Seite und wenn der Termin ohne Einlass endet – sowie in `leaveCall()`. Schalter, die während der Übernahme gedrückt werden, warten auf sie.
- *Gemerkt werden Gerät-ID und Name* (`localStorage['hxroom:devices']`, nur lokal). Die ID allein trägt nicht: Chrome vergibt sie bei jedem Laden neu, solange die Freigabe nicht dauerhaft erteilt ist, und die exakte Anforderung scheitert dann mit `OverconstrainedError`. LiveKit fällt auf das Standardgerät zurück; nach der Freigabe sucht `restorePreferredDevices()` das gemerkte Gerät über den Namen und wechselt ohne weiteren Dialog. An oder aus wird nicht gemerkt. Weicht eine Spur einem abgezogenen Gerät aus, bleibt die gemerkte Wahl bestehen.

**Gefunden dabei, ein Fehler aus B5:** Wer ohne Kamera beitritt – verweigert oder jetzt im Warteraum ausgeschaltet –, veröffentlicht gar keine Spur, und dann kommt auch kein „stummgeschaltet". `addParticipant()` setzte `cameraMuted: false`, beim Gegenüber stand dauerhaft „… verbindet sich". Der Zustand kommt jetzt aus den Publications, `TrackPublished`/`TrackUnpublished` werden ausgewertet, und ohne Publication gilt die Kamera nach 2,5 s Schonfrist als aus – ohne die Frist blitzte bei jedem normalen Beitritt kurz „Kamera aus" auf.

Die Gerätetexte liegen je App einmal in `utils/deviceText.ts`, der Ersatzname unbenannter Geräte („Mikrofon 1") als `namedDevices()` in `packages/ui`. Gerätemeldungen stehen im Warteraum beider Seiten inline über dem Technik-Check; im Gespräch bleibt es beim Coach der Toast.

Abnahme mit Coach und Klient über die Caddy-Subdomains, Chromium mit Fake-Geräten, `getUserMedia` gezählt:

- Warteraum offen, nichts geklickt: kein Aufruf. Nach dem Klick genau einer für Kamera und Mikrofon, Pegel schlägt aus, Weichzeichnen gesperrt.
- Wechsel auf „Fake Audio Input 2": exakt angefordert, gemerkt. Kamera aus: Spur `ended`, „Kamera aus".
- Einlass mit Kamera aus und Mikrofon an: beim Klienten kein weiterer Aufruf, die Mikrofonspur aus der Vorschau läuft weiter; beim Coach steht „Kamera aus" statt „verbindet sich". Coach mit Vorschau: dieselbe Kameraspur läuft im Gespräch weiter, der Klient empfängt sie. Kamera im Gespräch einschalten: neue Spur, der Coach sieht das Bild.
- „Einrichtung beenden": alle Spuren `ended`. Einlass ohne Einrichtung: Kamera und Mikrofon an wie bisher, das gemerkte Mikrofon über den Namen wiedergefunden, die neue ID gemerkt.

Nicht automatisiert geprüft: der echte Freigabedialog und das Kameralicht in Chrome und Firefox.

#### Nachtrag: Notizen im Call *(2026-09-17)*

Vorgezogen aus Phase 5 (`project.md` §5a, `funktionen/backoffice-coach.md` 4.01). Die Notiz-Seitenleiste des Coachs speichert jetzt, und zwar mit demselben Rich-Text-Editor wie die Angebotsbeschreibung. Dafür ist der Editor aus `pages/bookings/offers.vue` als `components/RichTextEditor.vue` herausgelöst; beide Stellen nutzen ihn.

**Gespeichert in `session_notes`, eine Notiz pro Buchung** (`technisches-konzept.md` §11). Die Notiz liegt in einer eigenen Tabelle statt in einer Spalte an `bookings`, weil Buchungen an vielen Stellen vollständig geladen werden (Mapper, Call-Zustand, Mails) – der sensibelste Inhalt liefe dort sonst still mit. Der Inhalt ist Tiptap-JSON und wird gegen dieselbe Knotenmenge geprüft wie die Angebotsbeschreibung (`richTextDoc()` in `@hxroom/shared`), nur mit höherer Längengrenze: 90 000 Zeichen JSON, knapp unter dem Body-Limit der API von 100 kB, damit ein zu langes Dokument als 400 ankommt und nicht als 413.

`GET`/`PUT /api/v1/bookings/:id/notes` im eigenen `SessionNotesModule`, nicht im `CallModule`: Das Termin-Slideover nutzt dieselben Endpunkte und später die Notizen-Chronik. Erlaubt für jede eigene Buchung unabhängig vom Zustand – Vorbereitung vor und Nachtrag nach der Sitzung gehören dazu. Weder `CallAccessResponse` noch der SSE-Strom noch `CoachBookingResponse` tragen den Inhalt.

**Automatisch speichern, nichts verlieren** (`composables/useSessionNotes.ts`):

- Eine Sekunde nach dem letzten Tastendruck, nie zwei Anfragen gleichzeitig, nach einem Fehler von selbst erneut nach fünf Sekunden. Ein Dokument ohne Buchstaben gilt als keine Notiz, sonst legte schon das Anklicken des Feldes eine Zeile an.
- Der Zustand liegt in `CallScreen.vue`, nicht im Panel: Der Tab-Wechsel der Seitenleiste baut das Panel ab.
- Kein Editor, solange geladen wird oder das Laden gescheitert ist – ein leeres Feld überschriebe sonst beim ersten Tastendruck die gespeicherte Notiz. UEditor übernimmt seinen Inhalt nur beim Mounten verlässlich (ein späteres `null` ignoriert er); beim Wechsel des Termins wird er deshalb neu gemountet.
- „Sitzung beenden" speichert zuerst. Scheitert das, bleibt das Modal offen mit „Erneut versuchen" und „Trotzdem beenden" – das Modal verspricht, dass die Notizen der Sitzung zugeordnet bleiben, und nach dem Ende ist der Screen samt Text weg. Schließen oder Neuladen mit ungespeichertem Stand löst die Nachfrage des Browsers aus.

**Im Termin-Slideover** steht die Notiz für jeden Termin zum Lesen und Bearbeiten, geladen erst beim Öffnen. Beim Schließen oder beim Wechsel des Termins wird gespeichert; scheitert das, meldet ein Toast den Verlust.

Bewusst nicht dabei: die Notizen-Chronik im Klientenprofil und die früheren Notizen im Panel „Klient" (dort weiter Beispielwerte; *inzwischen echt, siehe Nachtrag „Klient im Call"*), eine Verschlüsselung auf Anwendungsebene (offener Punkt in `technisches-konzept.md` §16). Schreiben zwei Tabs gleichzeitig, gewinnt der letzte.

Abnahme in Chromium über `app.hxroom.localhost` mit Spontan-Termin: Notiz mit Fett und Liste → „Gespeichert", Tab-Wechsel und Reload im Call behalten den Text; getippt und sofort beendet → der letzte Stand liegt in der Datenbank. PUT im Browser abgefangen → „Fehler beim Speichern" in der Seitenleiste, Fehlerzeile im Beenden-Modal, „Erneut versuchen" speichert und beendet. Slideover: Notiz der beendeten Sitzung sichtbar und nachträglich bearbeitbar, ein anderer Termin zeigt ein leeres Feld, vor Ablauf der Speicherpause geschlossen → trotzdem gespeichert. API per `curl`: fremde Buchung 404, Knotentyp `image` und `javascript:`-Link 400, zu langes Dokument 400. Die Angebotsbeschreibung funktioniert unverändert.

#### Nachtrag: Klient im Call *(2026-09-17)*

Das Panel „Klient" der Seitenleiste zeigt echte Angaben statt der Beispielwerte aus dem Prototyp: Name, E-Mail und Telefon, die wievielte Sitzung das ist, den nächsten Termin, „Klient seit", die interne Notiz des Coachs zum Klienten, was der Klient beim Buchen notiert hat, und die letzten drei gehaltenen Sitzungen mit einem Auszug ihrer Notiz. Ein Link öffnet das Klientenprofil in einem neuen Tab.

**Eigener Abruf `GET /api/v1/bookings/:id/call/client`** (`call/call-client-context.service.ts`, nur im `CoachCallController`). Die Felder stecken nicht in `CallAccessResponse`: Jene Antwortform geht auch an den Klienten, und aus seinem Zugangslink soll nicht mehr hervorgehen, als in seiner Mail steht. Der Abruf gilt für jede eigene Buchung; eine fremde ergibt 404.

- **Bezugspunkt ist der Beginn dieses Termins, nicht „jetzt"**: Die Sitzungsnummer zählt die gehaltenen Sitzungen (`HELD_SESSION_STATUSES`, dieselbe Definition wie in der Klientenliste) vor ihm, und nur sie gelten als „frühere". Wer den Call nach dem Ende noch einmal öffnet, sieht dieselben Zahlen, und die laufende Sitzung taucht nie unter „frühere" auf.
- **Notizen als Klartext** (`common/rich-text-plain.ts`): Absätze und Listeneinträge werden zu Zeilen, Formatierungen und Link-Ziele fallen weg. Die Umwandlung passiert auf dem Server, damit nicht drei vollständige Dokumente über die Leitung gehen. Im Panel ist die Notiz auf vier Zeilen gekürzt, ein Klick zeigt sie ganz.
- Geladen wird einmal in `CallScreen.vue`, wie die Notizen: Der Tab-Wechsel baut das Panel ab. Einen Abgleich über den Ereigniskanal gibt es nicht; im Gespräch ändern sich die Angaben nicht.

**Entfallen** sind „Pro Plan", „Transkription" und „Datenschutz: AVV vorhanden" samt dem Hinweis auf Beispielwerte. Pakete, Transkription und AVV gibt es noch nicht, und im echten Gespräch soll nichts eine Wirkung vortäuschen; die Zeilen kommen mit ihren Features zurück.

Abnahme in Chromium über `app.hxroom.localhost` mit Spontan-Terminen: ein Klient mit langer Historie (Sitzung 39, nächster Termin, interne Notiz, drei Kacheln mit gekürzter und aufklappbarer Notiz, eine davon „Keine Notiz") und ein Klient ohne Historie („Sitzung 1", „Keiner geplant", „Das ist die erste Sitzung"). Ein Tab-Wechsel löst keinen zweiten Abruf aus. API per `curl`: Buchungsnotiz und nächster Termin am anstehenden Seed-Termin, fremde und unbekannte Buchung 404. Die Umwandlung in Klartext ist per Spec abgedeckt.

### B6 · Robustheit und autoritatives Sitzungsende

LiveKit-Webhooks als zweite Quelle für das Sitzungsende, Reconnect-Verhalten, doppelte Tabs (`DUPLICATE_IDENTITY`), No-Show. Die Schaltfläche „Sitzung beenden" bleibt der Auslöser, der Webhook ist der Fallback.

### B7 · Chat im Call, mit geteilten Dateien *(Nachrichten umgesetzt 2026-09-24, Dateien folgen)*

Der Chat aus `project.md` §5a wird echt: Nachrichten erreichen die Gegenseite, und **Chatverlauf und geteilte Dateien werden gespeichert** und bleiben der Sitzung zugeordnet. Unabhängig von B6, kann auch davor gebaut werden.

Gebaut in zwei Teilen. **Teil 1 – Textnachrichten – steht**, siehe den Nachtrag am Ende dieses Abschnitts; der übrige Plan beschreibt weiterhin auch Teil 2 (Dateien).

**Getroffene Entscheidungen** *(2026-09-17)*

- Nachrichten laufen über die API, zugestellt wird über den SSE-Strom.
- Dateitypen: PDF, Bilder und Office ohne Makros, **je höchstens 25 MB**.
- **Auf dem Server wird Hetzner Object Storage aktiviert, lokal bleibt RustFS.** Dateien werden über Presigned URLs heruntergeladen, nicht über die API. RustFS wird dafür nicht selbst ins Internet gestellt: Diese Variante ist verworfen, weil der Wechsel zu Hetzner ohnehin ansteht (`technisches-konzept.md` §4, §10) und schneller geht.

Zweck laut §5a: der Fall, dass der Ton ausfällt („kannst du mich hören?"), und das bewusste Teilen eines Links oder Dokuments. Das bestimmt den Schnitt: Zuverlässigkeit vor Geschwindigkeit, keine Tipp-Anzeige, keine Lesebestätigungen, keine Reaktionen.

**Der Weg einer Nachricht führt über die API, nicht über den LiveKit-Datenkanal.**

- Senden ist ein `POST` an die API. Sie prüft den Zugang, speichert die Nachricht und meldet sie auf dem Ereigniskanal der Buchung. Die Gegenseite empfängt über den SSE-Strom, den beide Seiten seit A2 während des ganzen Gesprächs offen halten.
- Warum nicht `sendCallData()`: Beim Datenkanal läge die Speicherung beim Browser des Senders. Eine Nachricht, die ankommt, aber nie gespeichert wird (oder umgekehrt), wäre bei einem gespeicherten Verlauf ein Fehler. Dateien brauchen ohnehin HTTP, und LiveKit hebt nichts auf, was ein Teilnehmer während einer Unterbrechung verpasst. Genau diesen Fall soll der Chat aber abdecken.
- Die etwas höhere Laufzeit spielt für einen Notbehelf keine Rolle.
- `sendCallData()` bleibt für B6. Sein Kommentar („einen Chat gibt es in HxRoom nicht") wird korrigiert: Gemeint war der Chat aus HxMeet.

**Zustellung ohne Inhalt auf dem Ereigniskanal.**

- Der Bus trägt weiter nur die `bookingId`, dazu jetzt eine Art: Zustand oder Chat.
- Der Strom sendet für den Chat ein benanntes Ereignis `chat` ohne Nutzlast. Die Oberfläche holt daraufhin mit ihrem eigenen Ausweis alles ab, was nach der letzten bekannten Nachricht kam (`?after=<seq>`).
- Ein benanntes Ereignis erreicht `onmessage` nicht. Der Zustandsabruf läuft also nicht bei jeder Nachricht mit.
- Nachholen nach einem Abbruch geschieht von selbst: Verbindet sich der Strom neu, kommt als Erstes der vollständige Zustand, und darauf holt die Oberfläche die Nachrichten nach. Dasselbe geschieht beim Laden der Seite.

**Datenmodell** (`technisches-konzept.md` §11 wird nachgezogen):

- `session_chat_messages`: `id`, `organizationId`, `bookingId` (beide `onDelete: 'cascade'`), `seq` (fortlaufend, dient als Cursor, weil Zeitstempel bei zwei Nachrichten in derselben Millisekunde nicht eindeutig sind), `sender` (`coach` | `client`), `senderUserId` (nur beim Coach, denn im Studio-Plan teilen sich mehrere Coachs eine Organisation), `clientMessageId`, `text`, `createdAt`.
- `clientMessageId` erzeugt der Browser. Eindeutig je Buchung macht es das Senden wiederholbar: Ein Retry nach einem Netzfehler ergibt keine doppelte Nachricht.
- `session_chat_files`: `id` (= `fileId`), `messageId`, `organizationId`, `bookingId`, `fileName`, `mimeType`, `size`, `createdAt`. Eine Datei pro Nachricht, ein Begleittext ist optional.
- Wie bei den Notizen eine eigene Tabelle statt Spalten an `bookings`: Der Inhalt soll nicht still in Mapper, Call-Zustand und Mails mitlaufen.
- Der Text ist Klartext mit höchstens 2000 Zeichen. Links werden erst beim Anzeigen erkannt, und zwar nur `http`/`https`, mit `rel="noopener noreferrer"`.
- Die Markierung „geht in die Zusammenfassung" wird nicht gespeichert. Sie ist eine Regel der künftigen Mail und keine Eigenschaft der Nachricht.

**Dateien** (`s3-verzeichnisschema.md`):

- Die Datei geht als Multipart-Upload an die API, nach dem Muster des Profilbilds (`FileInterceptor` mit `limits`). Abgelegt wird sie unter `{organizationId}/sessions/{bookingId}/attachments/{fileId}`, ohne echten Dateinamen.
- Das oberste Segment ist wie beim Avatar die Organisation. Die Kontolöschung (`deletePrefix`) erfasst die Anhänge damit ohne weiteres Zutun.
- Erlaubt: PDF, JPG, PNG, WebP, DOCX, XLSX und PPTX, **je höchstens 25 MB** (`limits.fileSize` im `FileInterceptor`). Geprüft werden Endung **und** Dateisignatur, denn den `mimetype` von multer liefert der Browser. Formate mit Makros (`.docm` usw.) sind ausgeschlossen.
- Bilder werden über `sharp` ohne Metadaten abgelegt. Ein Handyfoto trägt sonst den Aufnahmeort des Klienten.
- Obergrenzen je Buchung, weil der Klient ohne Konto hochlädt: 20 Dateien und 500 Nachrichten. Eine Sitzung belegt damit höchstens 500 MB.
- **Hochladen bleibt über die API**, obwohl S3 jetzt erreichbar ist. Ein direkter Upload per Presigned PUT würde erst prüfen, wenn die Datei schon im Bucket liegt: Signatur, Makros und Metadaten dann nachträglich, samt Aufräumen abgelehnter Objekte. 25 MB im Speicher der API sind für einen Chat vertretbar.
- **Herunterladen läuft über Presigned URLs**, wie es das Zugriffskonzept in `s3-verzeichnisschema.md` vorsieht (15 Minuten).
  - Der Link in der Nachricht zeigt nicht direkt auf S3, sondern auf den Datei-Endpunkt der API. Die API prüft den Zugang in dem Moment, in dem jemand klickt, und leitet mit `302` auf eine frisch signierte URL weiter.
  - So liegt keine ablaufende URL im Verlauf, und ein Link aus dem Termin-Slideover funktioniert auch am nächsten Tag.
- Die Signatur legt die Antwort fest: `ResponseContentDisposition: attachment` mit dem ursprünglichen Dateinamen, `ResponseContentType` mit dem gespeicherten statt des mitgeschickten Typs, `ResponseCacheControl: private, no-store`. Eine hochgeladene Datei wird damit nie als Seite geöffnet. `X-Content-Type-Options: nosniff` lässt sich so nicht setzen, und davor sitzt kein eigener Proxy mehr. Das trägt die Prüfung der Dateisignatur beim Hochladen: Eine HTML-Datei kommt gar nicht erst in den Bucket.
- Signiert wird mit demselben `S3Client`, der auch schreibt. Ein zweiter Endpunkt ist nicht nötig, denn die Adresse ist auf beiden Seiten vom Browser aus erreichbar: lokal `http://localhost:9000` (RustFS, Port an `127.0.0.1` gebunden), auf dem Server der öffentliche Endpunkt von Hetzner.

#### Voraussetzung: Hetzner Object Storage statt RustFS *(im Repo umgesetzt 2026-09-24, Server steht aus)*

Vorgezogen, weil der Chat als erstes Feature Dateien von Klienten ablegt und Presigned URLs einen erreichbaren Speicher brauchen. **Ohne Datenmigration** – auf dem Server lagen nur Testdateien.

Im Repo erledigt:

- **`infra/docker-compose.yml`:** `rustfs`, `rustfs-perms` und `rustfs-createbuckets` sind entfallen, samt `depends_on` und Volume `rustfs_data`. Die sechs `S3_*`-Variablen der API kommen jetzt aus der `.env`, statt fest auf `rustfs:9000` zu zeigen. `docker-compose.dev.yml` und `apps/api/.env.example` bleiben unverändert bei RustFS – lokal ändert sich nichts.
- **`infra/.env.example`:** `RUSTFS_ACCESS_KEY`/`RUSTFS_SECRET_KEY` sind den sechs `S3_*`-Variablen gewichen, mit `fsn1` als Vorgabe.
- **Doku nachgezogen:** `technisches-konzept.md` §2, §4, §10, §13, §16 und §17 sowie `s3-verzeichnisschema.md`. Dabei zwei Dinge korrigiert: Der Standort hieß dort „EU-Frankfurt", den Hetzner für Object Storage nicht anbietet, und der zweite Grund für den Avatar-Endpunkt (RustFS nur an `127.0.0.1`) gilt nur noch lokal.
- **`S3_FORCE_PATH_STYLE=false`** in Produktion: Hetzner empfiehlt den Bucket-Namen im Hostnamen. Lokal bleibt es bei `true`.

Auf dem Server noch zu tun:

- **Bucket** `hxroom-files` anlegen, privat, ohne Versionierung, am Standort des Servers (`fsn1` Falkenstein oder `nbg1` Nürnberg). Helsinki kommt nicht in Frage, §17 sagt „ausschließlich Deutschland".
- **Schlüssel** in der Hetzner Console erzeugen und die sechs Werte in `infra/.env` eintragen. Prüfen, ob Hetzner den Schlüssel auf den Bucket beschränken kann; wenn nicht, gehört das Projekt allein HxRoom.
- **Redeploy**, danach `booking_page.avatar_updated_at` einmalig auf `NULL` setzen. Die alten Profilbilder ziehen nicht mit um; ohne diesen Schritt erwartet die Oberfläche ein Bild, das es nicht mehr gibt. Der Endpunkt selbst antwortet in dem Fall schon richtig mit 404.
- **RustFS-Volume** auf dem Server löschen (`docker volume rm hxroom_rustfs_data`), wenn der Stack ohne Fehler läuft.
- **AVV:** Prüfen, ob der bestehende AVV mit Hetzner Object Storage umfasst.
- **CORS** ist nicht nötig: Der Download ist eine Navigation, kein `fetch`.
- Nicht Teil davon: die tägliche Off-Site-Kopie in einen zweiten Bucket aus §13. Sie steht als offener Punkt in §16 – seit dem Wechsel deckt das Server-Backup die Dateien nicht mehr mit ab.

**Endpunkte**, die Paare getrennt nach dem Muster aus A1 (Coach mit `AuthGuard`, Klient über den Token):

| Coach | Klient | Zweck |
|---|---|---|
| `GET /bookings/:id/call/messages?after=` | `GET /bookings/:id/waiting-room/messages?token=&after=` | Verlauf bzw. Nachholen, samt Dateiangaben |
| `POST /bookings/:id/call/messages` | `POST /bookings/:id/waiting-room/messages` | Textnachricht (Token im Body) |
| `POST /bookings/:id/call/messages/files` | `POST /bookings/:id/waiting-room/messages/files` | Datei mit optionalem Text |
| `GET /bookings/:id/call/files/:fileId` | `GET /bookings/:id/waiting-room/files/:fileId?token=` | Zugang prüfen, `302` auf die Presigned URL |

- Service `call/call-chat.service.ts` im `CallModule`, denn dort liegen Ereigniskanal und Zugangsprüfung. Die Schemas liegen in `@hxroom/shared`.
- **Schreiben** dürfen beide nur im Zustand `admitted`. Der Chat ist Teil des Gesprächs, nicht des Warteraums.
- **Lesen** darf der Coach jederzeit bei jeder eigenen Buchung, der Klient nur, solange sein Zugang gilt (`mayReachRoom()`). Nach dem Ende landet er ohnehin auf der Danke-Seite.
- Eine fremde Buchung oder Datei ergibt 404. Der Token steht wie beim Ereignisstrom in der Query, denn ein Download-Link kann keinen Header setzen. Geloggt wird er nirgends (§17).

**Oberfläche:**

- `CallChatPanel` in `packages/ui` bekommt Anhänge: eine Büroklammer neben dem Eingabefeld, in der Blase eine Dateizeile mit Name und Größe als schlichter Link. Hochladen und Laden bleiben in den Apps; das Panel meldet nur `send` und `attach`.
- `CallChatMessage` bekommt eine Text-ID, einen Sendestatus (`sending` | `failed`, mit „Erneut senden") und optional `file`.
- Je App ein `useCallChat()` neben dem vorhandenen `useCallState()`. Die beiden unterscheiden sich wie dort nur im Ausweis (Cookie gegen Token). Der Zustand liegt in `CallScreen.vue` bzw. `CallStage.vue`, denn der Tab-Wechsel baut das Panel ab.
- Kommt eine Nachricht an, während der Chat nicht zu sehen ist, erscheint ein Punkt am Reiter und kurz ein Hinweis auf der Bühne mit dem Anfang der Nachricht. Ein Klick öffnet den Chat. Wer den Ton verloren hat, schaut auf das Bild und nicht in die Seitenleiste (Vorlage `doc/poc/videocall-v2.html`).
- **Nichts täuscht eine Wirkung vor.** Der Hinweis im Panel verspricht heute eine Zusammenfassungsmail, die es nicht gibt. Er sagt künftig nur, dass Verlauf und Dateien gespeichert werden und dass der Coach sie nach dem Gespräch einsehen kann. Aus demselben Grund entfällt das Mail-Symbol an den Nachrichten.
- Nach dem Ende ist das Eingabefeld gesperrt, mit Begründung.
- **Im Termin-Slideover** sieht der Coach den Verlauf einer Sitzung samt Dateien zum Nachlesen, wenn es einen gibt. Geladen wird er erst beim Öffnen, wie die Notiz.

**Bewusst nicht dabei:** die Zusammenfassungsmail samt Filterregel (Phase 5/6), Bearbeiten oder Löschen einzelner Nachrichten und Dateien, ein Virenscan, eine Verschlüsselung auf Anwendungsebene (gleicher offener Punkt wie bei den Notizen, `technisches-konzept.md` §16) und eine Einwilligung zur Speicherung.

Die offenen Punkte kommen in §16:

- Chat und Dateien liegen im Klartext wie die Notizen.
- Löschen durch den Coach: Ein versehentlich geteiltes Dokument bleibt sonst bis zur Kontolöschung liegen.
- Virenscan (etwa ClamAV), bevor Coachs Dateien von Klienten öffnen.
- Aufbewahrungsfristen (`legal.md`).

Ob die Speicherung eine Einwilligung braucht oder wie die Notizen unter den AVV fällt, gehört zur rechtlichen Klärung aus §5a. Hier wird es nicht entschieden.

**Abnahme** mit Coach und Klient über die Caddy-Subdomains, Spontan-Termin:

- Nachrichten in beide Richtungen. Der Hinweis auf der Bühne erscheint bei geschlossener Seitenleiste.
- Reload auf beiden Seiten: Der Verlauf ist vollständig da.
- Den Ereignisstrom einer Seite kappen und in der Zeit schreiben: Nach dem Wiederverbinden ist die Nachricht da, genau einmal.
- Ein `POST` mit derselben `clientMessageId` doppelt: eine Zeile.
- PDF und Handyfoto teilen: Beide Seiten laden herunter, das Foto hat keine EXIF-Daten mehr.
- Umbenannte `.html` als `.pdf`, 26 MB und die 21. Datei: jeweils 400. Eine Datei mit knapp 25 MB geht durch.
- Die Weiterleitung führt auf `localhost:9000`, und der Browser lädt mit dem ursprünglichen Dateinamen herunter. Dieselbe URL nach Ablauf: 403. Dieselbe URL ohne Signatur: 403.
- Auf dem Server nach dem Umstieg: Profilbilder laden über die Buchungsseite, ein Chat-Anhang lässt sich über die Weiterleitung von Hetzner herunterladen, der Bucket ist ohne Signatur nicht lesbar.
- Schreiben vor dem Einlass und nach dem Ende: abgelehnt.
- Fremde Buchung, fremde `fileId` und falscher Token: 404 bzw. 401.
- Nach dem Ende zeigt das Termin-Slideover den Verlauf mit Dateien.
- Kontolöschung einer Test-Organisation: Nachrichten und Objekte sind weg.
- Ein Upload über Caddy prüft, dass keine Obergrenze für den Request-Body dazwischen liegt.

#### Nachtrag: Teil 1 – Nachrichten *(umgesetzt 2026-09-24)*

Der Chat trägt echte Nachrichten. Sie gehen über die API, werden gespeichert und erreichen die Gegenseite über den Ereigniskanal. Dateien sind noch nicht dabei, ebenso wenig der Verlauf im Termin-Slideover.

**Tabelle `session_chat_messages`** mit `seq` als fortlaufender Nummer. Sie ist der Cursor: Gefragt wird stets „was kam nach der Nummer, die ich habe?". Ein Zeitstempel taugte dafür nicht, zwei Nachrichten in derselben Millisekunde wären nicht zu ordnen. `sender_user_id` hängt nur an Nachrichten des Coachs – im Studio-Plan teilen sich mehrere Coachs eine Organisation.

**Zustellung ohne Inhalt.** `CallEventsService` unterscheidet jetzt zwei Arten von Meldungen, und der Strom schickt für den Chat ein benanntes Ereignis `chat` ohne Nutzlast. Liefe eine Nachricht über den Zustandsweg, baute der Server für jede Zeile die vollständige Antwort samt frischem LiveKit-Token. Die Oberfläche holt sich stattdessen, was ihr fehlt.

**Nachgeholt statt gepuffert.** Ein benanntes Ereignis erreicht `onmessage` nicht; beide Apps hören zusätzlich darauf. Und weil der Strom nach einem Abbruch als Erstes den vollständigen Zustand schickt, stößt auch jedes Zustandsereignis das Nachholen an – damit heilt ein Netzaussetzer von selbst, ohne Wiedergabepuffer auf dem Server.

**Wiederholbar durch `clientMessageId`.** Die Kennung entsteht im Browser und ist je Buchung eindeutig. Ein zweiter Versuch legt deshalb keine zweite Nachricht an, sondern bekommt die vorhandene zurück. Sie geht auch in der Antwort wieder hinaus: Ohne sie stünde die eigene Nachricht doppelt auf dem Schirm, sobald das Nachholen die Antwort auf das eigene POST überholt.

**Geschrieben wird nur im laufenden Gespräch** (`admitted`), gelesen je nach Rolle: der Coach jederzeit, auch nach der Sitzung – für ihn wird gespeichert –, der Klient nur, solange sein Zugang gilt. Danach ist er ohnehin auf der Danke-Seite. Die Mandantengrenze prüft nicht der Chat, sondern weiterhin `CallService` (`findOwn`, `loadForClient`); beide Methoden sind dafür öffentlich geworden, statt die Prüfung ein zweites Mal zu schreiben (§8).

**In der Oberfläche** liegt der Zustand je App in `useCallChat()` neben `useCallState()` – dieselbe Teilung wie bei den Notizen, denn der Tab-Wechsel baut das Panel ab. Eine eigene Nachricht steht sofort da und trägt „sendet …", bis die gespeicherte Fassung sie ersetzt; scheitert das Senden, steht „Nicht gesendet" mit „Erneut senden". Eine Nachricht, von der man glaubt, sie sei angekommen, wäre im Tonausfall das Schlimmste. Kommt etwas an, während der Chat zu ist, erscheint ein Punkt am Reiter **und** ein kurzer Hinweis über der Bühne mit „Chat öffnen" – wer den Ton verloren hat, schaut auf das Bild und nicht in die Seitenleiste. Der Hinweis im Panel verspricht keine Zusammenfassungsmail mehr, und das Mail-Symbol an den Nachrichten ist weg: Beides gibt es nicht.

Abnahme in zwei Läufen. **Auf API-Ebene** mit Spontan-Termin: Schreiben vor dem Einlass und nach dem Ende je 409; nach dem Einlass Nachrichten in beide Richtungen; genau ein `chat`-Ereignis im Strom des Klienten, ohne den Text darin; derselbe `clientMessageId` zweimal ergibt eine Zeile; `after=` liefert nur das Neue; ohne Anmeldung 401, mit falschem Token 401; 2001 Zeichen, leerer Text und eine Kennung ohne UUID je 400; nach dem Ende liest der Coach weiter, der Klient nicht mehr. **Im Browser** mit Coach und Klient in zwei Kontexten: Nachricht des Coachs erscheint beim Klienten als Hinweis über der Bühne und im Chat, die Antwort beim Coach; nach einem Reload des Klienten steht der Verlauf vollständig; bei geschlossener Seitenleiste erscheinen Punkt und Hinweis. Der Fehlerfall gesondert, indem das POST im Browser abgefangen wurde: „Nicht gesendet", dann „Erneut senden" – danach genau eine gespeicherte Nachricht und genau eine auf dem Schirm.

Zwei Dinge, die beim Prüfen Zeit gekostet haben und nicht am Code lagen: Ein `reader.read()` mit Zeitlimit abzubrechen verliert das gerade anstehende SSE-Ereignis (im Hintergrund mitlesen und nur warten), und „Nicht gesendet" verschwindet schon beim zweiten Versuch – wer direkt danach die API fragt, sieht die Nachricht noch nicht.

---

## Bewusst nicht Teil dieses Plans

Einwilligungs-Banner, Aufzeichnung und Egress, Whisper-Transkription, Warteraum-Branding, konfigurierbare Danke-Seite, Erinnerungsmails. Das gehört in die Phasen 5 und 6 (§14). Die Seite `settings/waiting-room.vue` bleibt bis dahin Feature-Vorschau. Geräteauswahl, Bildschirmfreigabe, der Technik-Check (als Geräte-Einrichtung im Warteraum) und die Notiz-Seitenleiste standen ursprünglich ebenfalls hier; alle vier sind auf Wunsch vorgezogen und in den Nachträgen zu B5 beschrieben.

---

## Offene Punkte, die in Stufe A mitentschieden werden

| Thema | Stand und Vorschlag |
|---|---|
| **Zugangsfenster** | ✅ Entschieden und in A1 umgesetzt: Terminbeginn −60 Minuten bis Terminende +120 Minuten, serverseitig geprüft, mit `too_early`/`expired` und `opensAt` in der Antwort. §7 nachgezogen. |
| **HMAC vs. DB-Token** | ✅ §7 an den Code angeglichen: 256-Bit-Zufallstoken in der Datenbank mit Konstantzeit-Vergleich (`common/client-token.ts`), zusätzlich einzeln widerrufbar. |
| **Einmaligkeit des Warteraum-Links** | ✅ Verworfen und in §7 korrigiert: im Zugangsfenster mehrfach nutzbar, `clientTokenUsedAt` hält nur den ersten Eintritt fest. |
| **Sitzungsstatus `completed`** | ✅ Wird ab A1 durch das Sitzungsende gesetzt und fließt damit erstmals in Klientenliste und Betreiber-Auswertung ein. Deshalb kein Abschluss ohne vorherigen Einlass – der No-Show bekommt in B6 einen eigenen Weg. |
| **Nur `confirmed` darf warten** | ✅ Umgesetzt: `pending` meldet `expired` (die Buchung verfällt ohnehin), `cancelled` einen eigenen Zustand statt eines Fehlers. |
| **Zugangstoken im Query-String** | ✅ Geschlossen am 2026-09-08. Der Token steht in der URL (`/call/:id?token=…` und im SSE-Stream) und lief damit in jedes Zugriffslog. Geprüft: Caddy führt kein Zugriffslog, die API kein Request-Logging, OpenTelemetry ist wieder entfernt – offen war allein der nginx-Container der Klientenseite, der mit dem Standardformat `combined` Token und Referer im Klartext in die Docker-Logs schrieb. `bookingpage` und `coach` loggen jetzt mit eigenem Format nur den Pfad. Siehe `technisches-konzept.md` §17. |

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
