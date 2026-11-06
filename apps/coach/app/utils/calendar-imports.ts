// Anzeige rund um den Kalenderabgleich (doc/produkt/funktionen/kalenderabgleich.md §3).

/** "gerade eben", "vor 3 Minuten", "vor 2 Stunden", "vor 3 Tagen". */
export function formatSyncAge(iso: string | null, now = Date.now()): string {
  if (!iso) return 'noch nie'
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return 'gerade eben'
  if (minutes < 60) return minutes === 1 ? 'vor 1 Minute' : `vor ${minutes} Minuten`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return hours === 1 ? 'vor 1 Stunde' : `vor ${hours} Stunden`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'vor 1 Tag' : `vor ${days} Tagen`
}

/** Anleitungen, wo die iCal-Adresse zu finden ist – je Anbieter ein paar Schritte. */
export const CALENDAR_PROVIDER_GUIDES = [
  {
    label: 'Google Kalender',
    icon: 'i-lucide-calendar',
    steps: [
      'Google Kalender im Browser öffnen, oben rechts auf das Zahnrad → Einstellungen.',
      'Links unter „Einstellungen für meine Kalender“ den Kalender auswählen.',
      'Ganz unten „Privatadresse im iCal-Format“ kopieren.',
    ],
    note: 'Die Privatadresse kann nur lesen, wer sie kennt.',
  },
  {
    label: 'Outlook / Microsoft 365',
    icon: 'i-lucide-calendar',
    steps: [
      'Outlook im Web öffnen: Einstellungen → Kalender → Freigegebene Kalender.',
      'Unter „Kalender veröffentlichen“ den Kalender und „Kann nur sehen, wann ich beschäftigt bin“ wählen, dann „Veröffentlichen“.',
      'Den ICS-Link kopieren.',
    ],
    note: 'So übermittelt Outlook nur belegte Zeiten, ohne Titel.',
  },
  {
    label: 'Apple iCloud',
    icon: 'i-lucide-calendar',
    steps: [
      'In der Kalender-App neben dem Kalender auf das Teilen-Symbol tippen (Mac: Rechtsklick → Teilen).',
      '„Öffentlicher Kalender“ einschalten und den Link kopieren.',
    ],
    note: 'Achtung: Jeder mit diesem Link kann die Termine sehen. Gib ihn nur hier ein.',
  },
]
