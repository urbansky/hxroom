# HxRoom – LinkedIn

*Unternehmensseite „HxRoom“: Felder, Texte, Bilder, erster Beitrag*

---

## 1. Rolle der Seite

Auf LinkedIn erreicht HxRoom Coachs vor allem über Stefans persönliches Profil: Direktansprache, Posts und Artikel ([marketing.md](marketing.md), Abschnitt 2). Die Unternehmensseite liefert dazu:

- das Logo am Erfahrungseintrag „Gründer · HxRoom“ in Stefans Profil
- eine Adresse, auf die Posts und Nachrichten verweisen
- die Voraussetzung für LinkedIn-Ads und für eine spätere Produktseite (Abschnitt 6)

Gepflegt wird sie mit wenig Aufwand. Stefan veröffentlicht dort selten eigene Beiträge und teilt vor allem die seines Profils. Es gelten dieselben Leitplanken wie überall im Marketing: Du-Ansprache, konkret statt Floskeln ([marketing.md](marketing.md), Abschnitt 0). Die Seite nennt nur Funktionen, die es heute gibt. Die Landingpage (`apps/landing`) ist dafür der Maßstab.

---

## 2. Seite anlegen: Felder

LinkedIn → „Für Unternehmen“ → „Unternehmensseite erstellen“ → „Unternehmen“.

| Feld | Eintrag |
|---|---|
| Name | HxRoom |
| LinkedIn-URL | `linkedin.com/company/hxroom` (falls vergeben: `hxroom-de`) |
| Website | `https://hxroom.de` |
| Branche | Softwareentwicklung |
| Unternehmensgröße | 0–1 Beschäftigte |
| Unternehmenstyp | Einzelunternehmen |
| Logo | `media/linkedin/hxroom-logo.png` (Abschnitt 4) |
| Slogan | siehe Abschnitt 3.1 |

Danach in der Adminansicht unter „Seite bearbeiten“:

| Feld | Eintrag |
|---|---|
| Beschreibung | siehe Abschnitt 3.2 |
| Titelbild | `media/linkedin/hxroom-titelbild.png` (Abschnitt 4) |
| Hauptsitz | Deutschland, 01728 Bannewitz (Straße frei lassen) |
| Gründungsjahr | 2026 |
| Telefon | frei lassen |
| Spezialgebiete | siehe Abschnitt 3.3 |
| Button | „Mehr erfahren“ → `https://demo.hxroom.de` |
| Verbundene Seiten | HxCode (`linkedin.com/company/hxcode`), auf beiden Seiten eintragen |

LinkedIn bietet Produktseiten nur für bestimmte Branchen an, darunter Software. Die Branche „Softwareentwicklung“ hält diesen Weg offen.

---

## 3. Texte

### 3.1 Slogan (höchstens 120 Zeichen)

```
Terminbuchung und Videocall für Coaches – in einem. Klienten ohne Konto, Server in Deutschland.
```

### 3.2 Beschreibung (höchstens 2.000 Zeichen)

```
HxRoom ist die Videoplattform für Solo-Coaches im DACH-Raum: Terminbuchung und Videocall in einem.

Statt Calendly und Zoom buchen deine Klienten auf deiner eigenen Seite, bekommen Bestätigung und Erinnerung per Mail und kommen per Link direkt in deinen Warteraum. Ohne Konto, ohne Download, im Browser – auch auf dem Handy. Du lässt sie herein, wenn du bereit bist.

Was HxRoom heute kann:
• Buchungsseite unter deinname.hxroom.de – mit Foto, Texten, Angeboten und Impressum
• Kalender und Verfügbarkeiten, alle Termine in einer Wochenansicht
• Erinnerungen 24 Stunden und eine Stunde vor dem Termin, automatisch
• Warteraum und Videogespräch unter deinem Namen
• Notizen, Chat und Dateien direkt im Gespräch
• Klientenübersicht mit Terminen und Notizen, Datenexport mit einem Klick
• Probe-Sitzung mit dir selbst: am Rechner als Coach, auf dem Handy als Klient

Server in Deutschland, AVV inklusive, keine Weitergabe an US-Dienste.

HxRoom ist bewusst kein Allzweck-Werkzeug: Einzelgespräche statt Gruppen, ein ruhiger Raum statt Reactions und Aufnahmeknopf. Für Konzern-Meetings und Webinare gibt es andere Tools.

HxRoom ist in der Beta und läuft mit echten Klienten. Die Teilnahme ist kostenlos. Lass dir HxRoom in 20 Minuten zeigen auf demo.hxroom.de – oder leg direkt los auf hxroom.de.

Hinter HxRoom steht Stefan Urbansky, Softwareentwickler aus Dresden mit langjähriger Erfahrung in Videokonferenz-Software. Wenn du schreibst, antwortet Stefan selbst.
```

### 3.3 Spezialgebiete (höchstens 20)

```
Videoplattform für Coaches, Online-Coaching, Terminbuchung, Buchungsseite, Videocall, Digitaler Warteraum, Klientenverwaltung, DSGVO-konforme Videokonferenz, Server in Deutschland, Coaching-Software, Life Coaching, Business Coaching, Systemisches Coaching, Software as a Service
```

---

## 4. Bilder

| Bild | Datei | Größe | Quelle |
|---|---|---|---|
| Logo | `media/linkedin/hxroom-logo.png` | 800 × 800 (LinkedIn: mind. 400 × 400) | `media/linkedin/logo.html` |
| Titelbild | `media/linkedin/hxroom-titelbild.png` | 2256 × 382 (LinkedIn: 1128 × 191) | `media/linkedin/banner.html` |

Das Logo zeigt dasselbe Motiv wie `Logo.vue` in `packages/ui`: einen Kreis im Salbei-Verlauf mit Kamera-Icon auf Creme. Das Titelbild nutzt Schriften und Farben des Themes (`packages/ui/theme`). Links unten legt LinkedIn das Seitenlogo über das Titelbild und verdeckt dabei etwa das erste Viertel. Von der Mitte des Logos laufen feine Salbei-Ringe nach rechts aus und betten es ein; der Text steht rechtsbündig mit 72 px Rand.

Die HTML-Dateien öffnen die Schriften relativ aus `packages/ui/theme/fonts`. Neu gerendert wird mit Playwright im Faktor 2: das Element `.tile` bzw. `.banner` als Screenshot.

---

## 5. Nach dem Anlegen

1. **Profil verknüpfen:** In Stefans Profil unter „Erfahrung“ die Position „Gründer“ bei HxRoom hinzufügen und die Unternehmensseite auswählen. Erst dann erscheint das Logo.
2. **Erster Beitrag** auf der Unternehmensseite (Abschnitt 5.1), mit dem Hero-Video der Landingpage (`apps/landing/public/video/hxroom-buchung-bis-videocall.mp4`).
3. **Teilen aus dem Profil** mit eigenen Worten (Abschnitt 5.2). Erst der Repost bringt Reichweite, die Seite selbst startet ohne Follower.
4. **Kontakte einladen:** Über „Kontakte zum Folgen einladen“ nur Kontakte aus dem Coaching-Umfeld einladen, nicht pauschal alle.

### 5.1 Erster Beitrag der Unternehmensseite

```
Deine Klienten verdienen mehr als einen Zoom-Link.

HxRoom ist die Videoplattform für Coaches: Deine Klienten buchen auf deiner Seite, bekommen Bestätigung und Erinnerung und kommen per Link direkt in deinen Videocall – ohne Konto, ohne Download. Alles unter deinem Namen, Server in Deutschland.

Im Video siehst du den ganzen Weg: Buchung, Bestätigungsmail, Warteraum, Gespräch.

HxRoom ist in der Beta und kostenlos. Lass es dir in 20 Minuten zeigen: https://demo.hxroom.de

#Coaching #OnlineCoaching #Coach
```

### 5.2 Repost aus Stefans Profil

```
Ich habe mal einen Coach gefragt, wie er seine Online-Sitzungen macht.
„Ich schicke einen Zoom-Link“, sagte er.

Sein Klient muss sich anmelden, vielleicht eine App laden – und landet in einem Raum, der aussieht wie ein Firmen-Meeting. Dabei verkaufen Coachs vor allem eins: Vertrauen.

Deshalb baue ich HxRoom. Buchung, Erinnerung, Warteraum und Videogespräch laufen unter dem Namen des Coachs, Klienten brauchen nur einen Link. Die Server stehen in Deutschland.

HxRoom ist jetzt in der Beta und läuft mit echten Klienten. Wenn du Coach bist oder jemanden kennst, der so arbeitet: Ich zeige es dir gern in 20 Minuten.
```

---

## 6. Produktseite (später)

Eine Produktseite hängt an der Unternehmensseite und zeigt Bewertungen, Screenshots und einen eigenen Button. Weil Produkt und Unternehmen gleich heißen, wird es eine Flagship-Produktseite. Sinnvoll ist sie, sobald Beta-Coachs HxRoom dort bewerten können.

Anlegen: Adminansicht → „Erstellen“ → „Produkt hinzufügen“. LinkedIn prüft die Seite vor der Veröffentlichung.

| Feld | Eintrag |
|---|---|
| Produktname | HxRoom |
| Kategorie | aus der Liste von LinkedIn, möglichst Terminplanungs- oder Videokonferenz-Software |
| Beschreibung | erster Absatz und Funktionsliste aus Abschnitt 3.2 |
| Website | `https://hxroom.de` |
| Button | „Demo anfragen“ → `https://demo.hxroom.de` |
| Medien | Hero-Video und Screenshots aus `apps/landing/public/screens/` (`booking-page`, `waiting-room`, `call`, `dashboard`, `confirmation-mail`) |
| Kunden | Beta-Coachs, nur mit deren Einverständnis |
