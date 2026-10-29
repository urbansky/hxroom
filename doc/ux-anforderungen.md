# UX-Anforderungen an HxRoom

*Was die Plattform in der Nutzererfahrung erfüllen muss – Maßstab für jeden Plan und jede Abnahme.*

## Zweck und Gebrauch

Dieses Dokument sammelt die Anforderungen an Bedienung und Gestaltung von HxRoom. Es gilt für alle Oberflächen: Coach-App, Buchungsseite mit Warteraum und Call, Betreiber-Backoffice und Landingpage.

- **Bei jedem Umsetzungsplan:** Der Plan nennt, welche Anforderungen er berührt, und hält die Kriterien ein.
- **Bei jeder Abnahme im Browser:** Die betroffenen Kriterien werden mitgeprüft, auf Desktop und Handy.
- **Neue Anforderungen** bekommen die nächste freie Nummer. Nummern werden nicht neu vergeben.
- **„Heute“** beschreibt den Stand, an dem sich die Anforderung misst. Er wird nachgezogen, wenn sich etwas ändert.

Begriffe wie im übrigen `doc/`: **Coach** ist der Kunde des Betreibers, **Klient** der Kunde des Coachs.

---

## UX-01 · Einheitliche Benutzerführung

**Anforderung:** Wer eine Stelle der Plattform bedienen kann, kann alle bedienen. Gleiches sieht gleich aus, heißt gleich und sitzt an derselben Stelle.

**Kriterien:**
- **Kurzansicht und Seite:** Einzelne Datensätze öffnen sich zuerst als Kurzansicht im Slideover. Alles Ausführliche steht auf einer eigenen Seite, erreichbar über „Als Seite öffnen“. Vorbild: Termin-Slideover und Terminseite.
- **Aktionen:** Die Hauptaktion eines Bereichs steht oben rechts im Kopf. Seltenes und Endgültiges, etwa Löschen, liegt im Drei-Punkte-Menü. Dieselbe Aktion trägt überall denselben Namen und dasselbe Symbol.
- **Karten:** Inhaltsflächen sind weiße Karten mit Rahmen und abgerundeten Ecken (`bg-white`/`dark:bg-neutral-900`, `border-default`, `rounded-xl`). Kennzahlen stehen in `StatCard`, Einstellungen in `SettingsSection`.
- **Lesen vor Bearbeiten:** Gespeicherte Texte stehen als Text da und werden über einen Stift bearbeitet. Dauerhaft offene Eingabefelder gibt es nur, wo man vor allem schreibt, etwa bei den Sitzungsnotizen.
- **Speichern:** Wo automatisch gespeichert wird, zeigt ein Speicherstand das an („Gespeichert“). Wo ausdrücklich gespeichert wird, gibt es „Speichern“ und „Abbrechen“ nebeneinander. Je Art von Inhalt gilt überall derselbe Weg.
- **Leere Zustände:** Ein Satz, was hier stehen wird, und, wo möglich, die Aktion dazu. Kein leerer Kasten, kein leeres Formularfeld.
- **Fehler:** Deutsch, konkret, mit Ausweg, etwa „Erneut versuchen“. Nie ein technischer Text.
- **Zurück:** Führt dorthin, woher der Coach kam: Kalender, Dashboard, Klientenprofil. Reiter und Filter stehen in der URL und überstehen Neuladen und Zurück.
- **Nur, was funktioniert:** Funktionen, die es noch nicht gibt, sind ausgeblendet, nicht als „Kommt bald“ angekündigt. Im Call täuscht nichts eine Wirkung vor.
- **Handy:** Dieselben Funktionen wie am Rechner, die Navigation über den Menüknopf. Ausnahme ist die Wochenansicht des Kalenders.

**Heute:** Die Muster oben sind in Coach-App und Buchungsseite umgesetzt und in `technisches-konzept.md` beschrieben. Offen: Das Betreiber-Backoffice ist daraufhin nicht geprüft.

---

## UX-02 · Attraktive Oberfläche

**Anforderung:** HxRoom wirkt ruhig, hochwertig und eigenständig, nicht wie ein Standard-Dashboard. Coachs zeigen die Buchungsseite und den Warteraum ihren Klienten, beides trägt deren Namen.

**Kriterien:**
- **Gestaltungsmittel:** Schriften Cormorant Garamond für Überschriften und DM Sans für Text, Farben Salbei, Gold und Sand aus `@hxroom/ui`. Farben nur über die semantischen Namen (`primary`, `neutral`, `success`, …), nie direkte Tailwind-Farben.
- **Heller und dunkler Modus:** Jede Ansicht funktioniert in beiden.
- **Ruhe:** Je Bereich höchstens eine hervorgehobene Aktion. Abzeichen sparsam: Ein Hinweis, der für einen ganzen Bereich gilt, steht einmal im Kopf statt an jedem Feld.
- **Weißraum:** Inhalte bekommen Abstand. Gedrängte Kacheln und Zeilen werden lieber auf weniger Inhalt gekürzt als enger gesetzt.
- **Gleichmäßigkeit:** Nebeneinanderliegende Bereiche sind gleich gebaut, mit gleicher Kopfzeile, gleichen Abständen und gleicher Kartenform.
- **Echte Inhalte:** Keine Beispieltexte im Produkt. Was der Coach nicht gepflegt hat, fehlt, statt durch Platzhalter ersetzt zu werden.

**Heute:** Gestaltungsmittel und Modi sind umgesetzt. Neue Ansichten werden bei der Abnahme anhand von Screenshots in beiden Breiten geprüft.

---

## UX-03 · Die Oberfläche fühlt sich schnell an

**Anforderung:** Jede Aktion antwortet sofort sichtbar, nichts springt oder flackert, und niemand wartet auf einen leeren Bildschirm.

**Kriterien:**
- **Sofortige Rückmeldung:** Ein Klick zeigt innerhalb von 100 ms eine Wirkung: Ladezustand am Knopf, geöffnetes Slideover, gewechselter Reiter.
- **Laden:** Beim Laden stehen Skelette in der Form des späteren Inhalts, keine Drehkreisel auf leerer Fläche. Übliche Ansichten sind innerhalb einer Sekunde gefüllt.
- **Keine Sprünge:** Kein seitliches Rücken beim Ein- und Ausblenden der Scrollleiste (`scrollbar-gutter: stable`) und kein Nachrutschen durch nachladende Bilder (feste Maße).
- **Nichts doppelt laden:** Einmal geladene Reiter bleiben stehen. Wechsel zwischen Ansichten laden nur, was sich geändert haben kann.
- **Speichern im Hintergrund:** Notizen speichern selbst. Der Coach muss nicht auf das Speichern warten, um weiterzuarbeiten.
- **Live statt Neuladen:** Was sich von außen ändert, erscheint ohne Neuladen: Klient im Warteraum, Chat, Einlass.
- **Call:** Die Verbindung zum Medienserver wärmt sich schon im Warteraum auf. Nach dem Einlass steht das Bild ohne schwarze Pause.

**Heute:** Skelette, Autosave, Warmlauf im Warteraum, Ereigniskanal (SSE) und freigehaltene Scrollleiste sind umgesetzt. Offen: Die Ladezeiten sind nicht gemessen. Eine erste Messung der wichtigsten Seiten in der Produktion (Dashboard, Kalender, Klientenseite, Terminseite) gibt den Ausgangswert.

---

## UX-04 · Schnell in einen Call – mit bekannten Klienten und mit Fremden

**Anforderung:** Der Coach kommt mit wenigen Klicks in ein Gespräch, ohne vorher einen Termin über die Buchungsseite anzulegen. Das gilt für Klienten, die er schon hat, und für Personen, die HxRoom noch nicht kennt.

**Kriterien:**
- **Bekannter Klient:** Vom Dashboard, aus der Klientenliste und von der Klientenseite aus höchstens zwei Klicks bis zum Zugangslink, also Klient wählen und starten. Das Angebot ist vorausgewählt.
- **Unbekannte Person:** Name genügt, die E-Mail-Adresse ist freiwillig. Kein Klientendatensatz vorab nötig. Nach dem Gespräch kann der Coach die Person als Klient übernehmen oder es lassen.
- **Zugangslink:** Steht sofort zum Kopieren bereit, mit QR-Code für das Handy. Mit E-Mail-Adresse geht er zusätzlich per Mail hinaus.
- **Einlass:** Der Coach landet direkt auf der Call-Seite und sieht, wann die Person im Warteraum ankommt.
- **Ohne Umwege:** Kein Pflichtfeld, das für ein spontanes Gespräch keine Bedeutung hat.

**Heute:** Der Spontan-Termin geht vom Dashboard (Klient und Angebot wählen) und von der Klientenseite (Angebot wählen) aus und liefert den Zugangslink zum Kopieren. Er verlangt einen bestehenden Klienten (`createAdHocBookingSchema`, `clientId` Pflicht). Mit einer unbekannten Person ist er nicht möglich, ohne sie vorher als Klient anzulegen. Die Probe-Sitzung (der Coach mit sich selbst) ist davon unabhängig.

---

## UX-05 · Laufende Calls sind im Backoffice gut erkennbar

**Anforderung:** Der Coach sieht von jeder Seite des Backoffice aus, ob gerade jemand im Warteraum steht oder ein Gespräch läuft, und kommt mit einem Klick dorthin.

**Kriterien:**
- **Überall sichtbar:** Ein Hinweis in der Seitenleiste oder im Kopf, auf jeder Seite und auf dem Handy: „Claudia wartet seit 10:02“ oder „Gespräch mit Claudia läuft seit 10:05“, mit dem Knopf „Zum Gespräch“.
- **Im Kalender und auf dem Dashboard:** Der betreffende Termin ist hervorgehoben, mit Zustand „wartet“ oder „läuft“ und der Dauer.
- **Live:** Ankunft im Warteraum, Einlass und Ende erscheinen ohne Neuladen.
- **Unterscheidbar:** „Wartet“ fällt stärker auf als „läuft“, denn dort wartet ein Mensch auf den Coach.
- **Ohne Missverständnis:** Hat der Coach die Call-Seite geschlossen, während das Gespräch formal noch läuft, sagt der Hinweis das und bietet Zurückkehren oder Beenden an.

**Heute:** Außerhalb der Call-Seite zeigt das Backoffice nur den Knopf „Sitzung starten“, sobald ein bestätigter Termin im Zugangsfenster liegt (Agenda, Dashboard, Slideover, Klientenseite). Ob ein Klient wartet oder ein Gespräch läuft, ist dort nicht zu sehen. Die Daten gibt es: `CallAccessResponse` kennt `state`, `waitingSince`, `admittedAt` und `clientOnline`, der Ereigniskanal meldet Änderungen. Sie werden aber nur auf der Call-Seite genutzt.
