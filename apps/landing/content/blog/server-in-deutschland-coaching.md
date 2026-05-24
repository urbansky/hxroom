---
title: "Server in Deutschland: Warum es für Coaches zählt"
description: "Hosting in Frankfurt oder in Virginia? Was der Server-Standort konkret für dein Coaching, deine DSGVO-Pflichten und dein Vertrauenssignal bedeutet."
date: "2026-06-17"
category: "DSGVO"
draft: true
---

Es klingt nach einem technischen Detail: „Wo steht der Server?" Aber im Coaching ist es eine der wichtigsten Architektur-Entscheidungen. Sie bestimmt, wie viel DSGVO-Aufwand auf dich zukommt, wie viel Vertrauen du in einem Satz aufbauen kannst – und wie zukunftssicher dein Setup ist.

## Die kurze Antwort

**Wenn deine Klienten-Daten in Deutschland oder zumindest in der EU bleiben, sparst du dir den größten Block an DSGVO-Komplexität.** Drittland-Transfer, Schrems II, EU-US Data Privacy Framework, Standardvertragsklauseln, Transfer Impact Assessment – das alles entfällt.

Du tauschst „Ich hoffe, das Tool ist DSGVO-konform" gegen „Server in Frankfurt am Main – fertig". Das ist nicht nur rechtlich entspannter, sondern auch deutlich einfacher zu kommunizieren.

---

## Warum es überhaupt eine Rolle spielt

Die DSGVO unterscheidet sehr genau zwischen drei Welten:

1. **Innerhalb der EU/EWR:** Daten bewegen sich frei, das Schutzniveau ist überall vergleichbar.
2. **Länder mit „Angemessenheitsbeschluss":** Großbritannien, Schweiz, Japan, Südkorea u. a. – Daten dürfen dorthin fließen wie innerhalb der EU.
3. **„Drittländer ohne Angemessenheit":** Allen voran die USA – hier braucht es zusätzliche Schutzmechanismen.

Bei US-Anbietern wie Zoom, Google Meet, Microsoft Teams, Calendly liegt eine **Datenübermittlung in die USA** vor. Selbst wenn das Tool europäische Server hat, gilt der US-Mutterkonzern als datenzugriffsfähig – der **CLOUD Act** verpflichtet US-Unternehmen, auf Anfrage von US-Behörden Daten herauszugeben, **unabhängig vom physischen Speicherort**.

---

## Was Schrems II konkret heißt

Das **Schrems-II-Urteil** des EuGH (2020) hat den damaligen „Privacy Shield" gekippt – das Abkommen, das US-Transfers legitimierte. Seitdem brauchst du bei US-Tools:

- **Standardvertragsklauseln** (SCCs) im AVV
- Eine **Risiko-Bewertung** (Transfer Impact Assessment, TIA), in der du dokumentierst, dass das Risiko vertretbar ist
- Ggf. **zusätzliche Maßnahmen** (Verschlüsselung, Pseudonymisierung)

Das **EU-US Data Privacy Framework** (DPF) von 2023 hat die Lage stabilisiert: US-Unternehmen, die zertifiziert sind, gelten wieder als „angemessen". Aber:

- Das Framework ist bereits vor dem EuGH angegriffen worden („Schrems III").
- Du musst pro Anbieter prüfen, ob er **DPF-zertifiziert** ist.
- Du musst die DPF-Zertifizierung in deiner Datenschutzerklärung benennen.

Das ist machbar – aber jeder Coach, mit dem ich rede, sagt mir: „Ich verstehe das ehrlich gesagt nicht komplett." Und das ist genau der Punkt.

---

## Was ein deutscher Hosting-Standort dir konkret abnimmt

| Aufgabe | Mit US-Tool | Mit DE-Hosting |
|---|---|---|
| Standardvertragsklauseln prüfen | Pflicht | entfällt |
| Transfer Impact Assessment | empfohlen | entfällt |
| DPF-Zertifizierung des Anbieters prüfen | Pflicht | entfällt |
| Drittland-Hinweis in Datenschutzerklärung | Pflicht | entfällt |
| Aufklärung der Klienten zur Drittland-Übermittlung | empfohlen | entfällt |
| Argumentation bei Klienten-Widerspruch | nötig | entfällt |

Du gewinnst Zeit, Klarheit und ein simples Vertrauenssignal: **„Alles bleibt in Deutschland."** Das ist ein Satz, den deine Klienten sofort verstehen.

---

## „Server in der EU" reicht doch auch?

In den meisten Fällen ja. EU-Hosting (Frankfurt, Amsterdam, Stockholm, Wien) ist DSGVO-rechtlich gleichwertig. Wenn du in DACH unterwegs bist, ist **Frankfurt am Main** trotzdem die symbolisch stärkste Adresse:

- Frankfurt ist einer der zwei größten Internet-Knoten weltweit (DE-CIX).
- „Frankfurt" als Argument hat sich im deutschen Markt als Synonym für „seriöses Hosting" etabliert.
- Datenverkehr nach Wien und Zürich ist trotzdem schnell genug (< 30 ms Latenz).

Achtung bei „EU-Region eines US-Anbieters": Wenn AWS-Frankfurt zwar in Deutschland steht, aber Amazon das Unternehmen ist, hilft das **rechtlich nur bedingt** – CLOUD Act, siehe oben.

---

## Wie du den Standort eines Tools prüfst

1. **Datenschutzerklärung des Anbieters lesen** – dort muss der Speicherort genannt sein.
2. **AVV durchsuchen** – Subunternehmer-Liste und Hosting-Adresse stehen drin.
3. **Bei Zweifeln nachfragen** – per Mail an den Datenschutzbeauftragten. Antwortet keiner: schlechtes Signal.

**Praktischer Test:** Tool öffnen, im Browser DevTools → Netzwerk → IP-Adressen einer Verbindung tracen. Endet die IP in `*.amazonaws.com` (US-Region) oder `*.azurewebsites.net`? Dann steht der Server zwar im Norden Europas – aber das Unternehmen ist US-amerikanisch.

---

## Was wir bei HxRoom machen

- **Compute & Datenbank:** Hetzner Frankfurt
- **Media-Server (Audio/Video):** Hetzner Frankfurt + dezentrale Edge-Knoten innerhalb der EU für Latenz
- **Backups:** Verschlüsselt auf einem zweiten deutschen Standort
- **Subunternehmer:** vollständig offen einsehbar, ausschließlich EU
- **Keine CDN-Routing über die USA** – wir verzichten bewusst auf Cloudflare-Default und nutzen Bunny.net (EU-Routing)

Das hat einen Preis (US-Hyperscaler sind günstiger), aber es ist die Architektur, die zum Versprechen passt.

---

## Was es **nicht** löst

Server-Standort ist **eine** Schraube. Er allein macht dein Coaching nicht DSGVO-konform. Du brauchst trotzdem:

- AVVs mit allen Dienstleistern ([siehe AVV-Artikel](/blog/was-ist-ein-avv-coach))
- Eine **eigene** Datenschutzerklärung
- Einwilligungen bei Aufzeichnungen
- TOMs (technische und organisatorische Maßnahmen)
- Saubere Klienten-Aufklärung

Aber: Wenn der Hosting-Standort sauber ist, kannst du dich auf den Rest konzentrieren. Das ist der eigentliche Gewinn.

---

## FAQ

**Sind US-Tools für Coaches grundsätzlich verboten?**
Nein. Sie sind erlaubt – wenn du die Drittland-Pflichten erfüllst. Sie sind nur **mehr Aufwand und weniger zukunftssicher**.

**Was, wenn Schrems III kommt?**
Realistisch wahrscheinlich. Das EU-US Data Privacy Framework wird seit 2023 vor dem EuGH angegriffen. Wer heute auf DE-Hosting setzt, ist davon unabhängig.

**Reicht „Server in Europa" oder muss es Deutschland sein?**
EU reicht rechtlich. Deutschland ist symbolisch stärker und im DACH-Marketing das wirksamere Argument.

**Wie ist das bei KI-Tools (Otter, ChatGPT, Fireflies)?**
US-Anbieter durch und durch. Wenn du KI für Klientendaten einsetzen willst: EU-Alternativen wie Mistral, Aleph Alpha oder lokale Modelle (Ollama) prüfen.

---

*Geschrieben von Stefan Urbansky, Gründer von HxRoom. Selbst Datacenter-Bewohner – Stefan war in seinen früheren Projekten oft genug mit den Kabeln in Frankfurt unterwegs.*

**Verwandte Artikel:**

- [Der DSGVO-Leitfaden für Online-Coaches](/blog/online-coaching-dsgvo-leitfaden)
- [Was ist ein AVV und brauche ich als Coach einen?](/blog/was-ist-ein-avv-coach)
- [Die 5 größten DSGVO-Fehler in der Online-Coaching-Praxis](/blog/dsgvo-fehler-online-coaching)
