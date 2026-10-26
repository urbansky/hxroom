// Fragen und Antworten der Startseite. Eine Quelle für die sichtbare FAQ und das
// FAQPage-JSON-LD in pages/index.vue, damit beide nicht auseinanderlaufen.
export const FAQ_ITEMS = [
  {
    q: 'Kann ich HxRoom schon nutzen?',
    a: 'Ja. HxRoom ist in der Beta und läuft mit echten Klienten. Du kannst dich kostenlos registrieren und sofort loslegen – oder dir HxRoom vorher in einer Vorführung zeigen lassen.',
  },
  {
    q: 'Was kostet HxRoom?',
    a: 'In der Beta nichts. Die regulären Preise stehen zum offiziellen Start fest, als grobe Orientierung ab etwa 19 € im Monat. Wer in der Beta dabei ist, bekommt einen vergünstigten Einführungspreis.',
  },
  {
    q: 'Wie läuft eine Vorführung ab?',
    a: 'Du buchst auf demo.hxroom.de einen Termin: 20 Minuten, kostenlos. Dabei erlebst du HxRoom so, wie deine Klienten es erleben – Buchung, Bestätigungsmail, Warteraum und Gespräch. Ich zeige dir das Backoffice und beantworte deine Fragen.',
  },
  {
    q: 'Kann ich meinen Zoom behalten?',
    a: 'Natürlich. Viele Coaches nutzen HxRoom zuerst mit einzelnen Klienten und wechseln dann Schritt für Schritt. Einen harten Schnitt braucht es nicht.',
  },
  {
    q: 'Brauchen meine Klienten einen Account?',
    a: 'Nein. Deine Klienten klicken auf einen Link und landen direkt in deinem Warteraum. Kein Download, keine Registrierung, kein Passwort.',
  },
  {
    q: 'Wo liegen die Daten?',
    a: 'Auf Servern in Deutschland (Hetzner). Der AVV ist Bestandteil deines Vertrags, Subdienstleister sind transparent aufgeführt. Keine Weitergabe an US-Dienste.',
  },
  {
    q: 'Was passiert mit meinen Daten, wenn ich aufhöre?',
    // Setzt den Datenexport aus phase5-umsetzungsplan.md, Schritt 10, voraus.
    a: 'Deine Klienten, Termine und Notizen exportierst du jederzeit mit einem Klick. Dein Konto löschst du selbst; nach 30 Tagen Bedenkzeit sind alle Daten weg – Klienten, Termine, Notizen und Dateien.',
  },
] as const
