import type { DeviceIssue } from '@hxroom/livekit'

// Die Ursachen aus @hxroom/livekit in den Worten des Coachs – knapper als beim Klienten, der
// Coach kennt seine Technik. Im Warteraum und im Gespräch dieselben Sätze.
export const DEVICE_TEXT: Record<DeviceIssue, string> = {
  denied: 'Der Browser hat den Zugriff blockiert – freigeben lässt er sich über das Symbol in der Adresszeile.',
  notFound: 'Kein Gerät gefunden.',
  busy: 'Das Gerät wird gerade von einem anderen Programm benutzt.',
  insecure: 'Die Seite ist nicht sicher genug verbunden, um auf das Gerät zuzugreifen.',
  unknown: 'Das Gerät ließ sich nicht starten.',
}
