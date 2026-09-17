import type { DeviceIssue } from '@hxroom/livekit'

// Die Ursachen aus @hxroom/livekit in Klientensprache. Bewusst ohne Fachbegriffe: Für
// viele ist das hier die erste Berührung mit einer Kamerafreigabe (project.md §5a).
// Warteraum und Gespräch sagen dasselbe mit denselben Worten.
export const DEVICE_TEXT: Record<DeviceIssue, string> = {
  denied: 'Der Browser hat den Zugriff blockiert. Über das Symbol in der Adresszeile kannst du ihn erlauben.',
  notFound: 'Es wurde kein Gerät gefunden. Prüfe, ob es angeschlossen ist.',
  busy: 'Ein anderes Programm benutzt das Gerät gerade. Schließe es und versuche es erneut.',
  insecure: 'Diese Seite ist nicht sicher genug verbunden, um auf das Gerät zuzugreifen.',
  unknown: 'Das Gerät konnte nicht gestartet werden.',
}

/** Eine Meldung, nicht zwei: Die Kamera zuerst, weil man ihr Fehlen sofort sieht. */
export function deviceNotice(camera: DeviceIssue | null, microphone: DeviceIssue | null) {
  if (camera) return { title: 'Kamera nicht verfügbar', text: DEVICE_TEXT[camera] }
  if (microphone) return { title: 'Mikrofon nicht verfügbar', text: DEVICE_TEXT[microphone] }
  return null
}
