# Sitzraum · Betreiber-Backoffice – Feature-Liste

> **URL:** `admin.sitzraum.de` · Zugang intern, nur für Sitzraum-Betreiber  
> Das Betreiber-Backoffice ist das Steuerungszentrum der gesamten Plattform – unsichtbar für Coaches und Klienten, unverzichtbar für den Betrieb.

---

## 1. Coach-Verwaltung

*Übersicht und Kontrolle über alle registrierten Coaches auf der Plattform*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **Coach-Liste** | Tabellarische Übersicht aller Coaches mit Name, E-Mail, Registrierungsdatum, aktivem Plan und Status (Trial / aktiv / gesperrt). | MVP |
| 02 | **Coach-Detailansicht** | Vollständiges Profil: Kontaktdaten, Sub-Domain, Branding-Setup, Anzahl Klienten, Anzahl Sitzungen gesamt. | MVP |
| 03 | **Coach suchen & filtern** | Volltextsuche nach Name/E-Mail, Filter nach Plan (Trial, Solo, Pro, Studio), Status und Registrierungszeitraum. | MVP |
| 04 | **Coach manuell anlegen** | Betreiber kann Coach-Account direkt erstellen – z.B. für Beta-Kunden oder Direktverträge. | MVP |
| 05 | **Coach sperren / entsperren** | Account temporär deaktivieren bei Zahlungsausfall, Missbrauch oder auf eigenen Wunsch. | MVP |
| 06 | **Coach löschen (DSGVO)** | Vollständige Datenlöschung inkl. Klienten- und Sitzungsdaten, automatisches Löschprotokoll. | MVP |
| 07 | **Impersonation / Support-Zugang** | Betreiber kann sich temporär als Coach einloggen, um Support-Anfragen nachzuvollziehen. | Später |

---

## 2. Subscription & Plan-Verwaltung

*Übersicht und Steuerung aller Abonnements und Plan-Zustände*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **Subscription-Liste** | Alle aktiven, auslaufenden und gekündigten Abos in einer Übersicht: Coach, Plan, Startdatum, nächste Verlängerung, Status. | MVP |
| 02 | **Plan manuell ändern** | Plan eines Coaches direkt hochstufen oder herunterstufen – z.B. für Kulanz oder Sonderkondition. | MVP |
| 03 | **Trial verlängern** | Trial-Periode eines Coaches manuell verlängern (z.B. +7 Tage für Beta-Feedback-Geber). | MVP |
| 04 | **Kündigungen & Churns** | Liste aller Coaches, die ihr Abo gekündigt haben oder im Grace-Period-Status sind. | MVP |
| 05 | **Stripe-Link pro Coach** | Direktlink zum Stripe-Kundenprofil des jeweiligen Coaches für manuelle Eingriffe (Rückerstattung, Gutschrift). | MVP |
| 06 | **Gutschein-Codes erstellen** | Rabattcodes (% oder € Betrag) für Rabattaktionen oder Partnerprogramme generieren und verwalten. | Später |
| 07 | **Jahresabo-Übersicht** | Welche Coaches zahlen jährlich vs. monatlich – relevant für Cashflow-Planung. | Später |

---

## 3. Umsatz & Finanzen

*Plattformweite Einnahmen und betriebswirtschaftliche Übersicht*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **MRR / ARR Dashboard** | Monthly Recurring Revenue und Annualized Recurring Revenue auf einen Blick, inkl. Trend der letzten 12 Monate. | MVP |
| 02 | **Einnahmen nach Plan** | Aufschlüsselung der Gesamteinnahmen nach Trial-Konversionen, Solo, Pro und Studio. | MVP |
| 03 | **Neue Kunden pro Monat** | Anzahl neu registrierter Coaches, Trial-Starts und Plan-Upgrades im Zeitverlauf. | MVP |
| 04 | **Churn-Rate** | Gekündigte Abos pro Monat in Anzahl und Umsatz, visuell als Trend. | MVP |
| 05 | **Zahlungsausfälle** | Liste der Coaches mit fehlgeschlagener Zahlung inkl. Stripe-Status und verbleibendem Grace-Period. | MVP |
| 06 | **Umsatzexport (CSV)** | Alle Zahlungen als CSV exportieren – für Buchhaltung, Steuerberater, Jahresabschluss. | Später |

---

## 4. Plattform-Metriken & Nutzungsstatistiken

*Technische und operative KPIs des Gesamtsystems*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **Aktive Coaches (heute / Woche / Monat)** | Wie viele Coaches haben sich eingeloggt oder eine Sitzung durchgeführt? | MVP |
| 02 | **Sitzungen gesamt** | Anzahl abgehaltener Videocalls auf der Plattform – täglich, monatlich, kumuliert. | MVP |
| 03 | **Sitzungsminuten** | Gesamt-Gesprächsminuten als Indikator für LiveKit-Serverauslastung und Nutzungstiefe. | Später |
| 04 | **Onboarding-Completion-Rate** | Wie viele Coaches schließen die Onboarding-Checkliste ab? Wo brechen sie ab? | Später |
| 05 | **Trial-zu-Paid-Conversion** | Anteil der Trial-Coaches, die in einen bezahlten Plan wechseln – aufgeschlüsselt nach Woche und Quelle. | MVP |
| 06 | **Feature-Nutzung** | Welche Features werden am häufigsten genutzt (Kalender-Sync, KI-Zusammenfassung, Stripe-Zahlung)? | Später |

---

## 5. Domain & Infrastruktur

*Verwaltung von Sub-Domains, CNAME-Einträgen und technischen Konfigurationen*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **Sub-Domain-Übersicht** | Liste aller vergebenen `[slug].sitzraum.de`-Subdomains mit zugehörigem Coach. | MVP |
| 02 | **CNAME-Einträge verwalten** | Übersicht aller aktiven Custom-Domains (Pro-Feature) mit Status (aktiv / fehlerhafter DNS-Eintrag). | Pro |
| 03 | **Slug-Konflikte lösen** | Anzeige doppelt angeforderter Slugs und manuelle Zuweisung bei Konflikten. | MVP |
| 04 | **Infrastruktur-Status** | Echtzeit-Statusanzeige von API, LiveKit, Redis und Datenbank – mit Alarmierung bei Ausfällen. | Später |

---

## 6. Kommunikation & Support

*Direktkommunikation mit Coaches und interne Notizen*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **System-E-Mail an alle Coaches** | Broadcast-E-Mail an alle (oder gefilterte) Coaches schicken – z.B. für Ankündigungen oder Updates. | Später |
| 02 | **E-Mail an einzelnen Coach** | Direkt aus dem Admin-Bereich eine E-Mail an einen Coach schicken, ohne externes E-Mail-Programm. | Später |
| 03 | **Interne Notizen pro Coach** | Support-Notizen hinterlegen, die nur für Betreiber sichtbar sind – z.B. „auf Kulanz verlängert am 01.03." | Später |
| 04 | **Support-Ticket-Übersicht** | Wenn ein Ticketsystem integriert ist: offene Anfragen direkt im Admin sehen. | Später |

---

## 7. Einstellungen & Plattform-Konfiguration

*Globale Schalter und Konfigurationen für die gesamte Plattform*

| # | Funktion | Detail | Prio |
|---|---|---|---|
| 01 | **Plan-Preise & Features konfigurieren** | Trial-Laufzeit, Preise für Solo / Pro / Studio und enthaltene Features ohne Code-Deployment anpassen. | Später |
| 02 | **Feature-Flags** | Einzelne Features plattformweit oder für bestimmte Coaches aktivieren / deaktivieren – z.B. für Beta-Tests. | Später |
| 03 | **Systemweite Wartungsmeldung** | Banner oder Maintenance-Mode für alle Coach-Dashboards aktivieren bei geplanten Updates. | Später |
| 04 | **Admin-Nutzer-Verwaltung** | Weitere interne Nutzer zum Admin-Bereich hinzufügen (z.B. für Support-Mitarbeiter) mit eingeschränkten Rechten. | Später |

---

## Legende

| Prio | Bedeutung |
|---|---|
| **MVP** | Sofort nötig – für den operativen Betrieb der Plattform |
| **Pro** | Wird relevant, sobald Pro-Plan-Coaches CNAME nutzen |
| **Später** | Wichtig, aber nicht vom ersten Tag an |