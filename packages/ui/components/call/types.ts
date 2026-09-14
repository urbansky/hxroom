// Der Vertrag der geteilten Call-Oberfläche.
//
// Rollenfrei formuliert: Es gibt „local" und „remote", nicht Coach und Klient. Wer wo steht,
// entscheidet die App, die die Komponenten einbindet – so trägt dieselbe Oberfläche beide
// Seiten des Gesprächs (technisches-konzept.md §8).
//
// Die Typen liegen in einer eigenen TS-Datei und nicht in einem <script setup>: Ein
// `export type` aus einer .vue über den Barrel weiterzureichen ist in zwei Toolchains
// (Nuxt und vue-tsc) unnötig störanfällig.

/**
 * Eine Person auf der Bühne – das, was die Oberfläche von einem Teilnehmer wissen muss.
 *
 * `id` ist ab B4/B5 die LiveKit-Identität aus `CallParticipant`; bis dahin genügen die
 * Platzhalter 'local' und 'remote'.
 */
export interface CallPeer {
  id: string
  /** Voller Anzeigename. Für den lokalen Teilnehmer setzt die Bühne selbst „Du". */
  name: string
  cameraOn: boolean
  micOn: boolean
  /** Hintergrund weichgezeichnet – die Entscheidung dieser Person, hier nur Anzeige. */
  blurred: boolean
  /** Nur auf dieser Seite stummgeschaltet, nie an die Gegenseite gemeldet. */
  mutedLocally?: boolean
  /**
   * Das Bild, wenn es eines gibt; sonst zeigt die Bühne die Andeutung.
   * B4/B5 reichen hier die Spur aus dem LiveKit-Raum herein – der Vertrag bleibt derselbe.
   */
  stream?: MediaStream | null
}

/** Ein Bereich der Seitenleiste. Welche es gibt, sagt die App. */
export interface CallPanelDef {
  value: string
  label: string
  icon: string
  /** Punkt am Knopf – eine ungelesene Nachricht etwa. */
  badge?: boolean
}

/** Ein wählbares Gerät. Passt ohne Umbau auf MediaDeviceInfo (deviceId/label). */
export interface CallDevice {
  id: string
  label: string
}

/**
 * Verbindungszustand, wie ihn die Steuerleiste zeigt.
 *
 * Bewusst nicht `RoomStatus` aus @hxroom/livekit: Ob ein Fehlschlag als „Verbindung
 * wackelt" oder als Abbruch zu lesen ist, entscheidet die App. So bleibt dieses Paket frei
 * von der Mechanik, wie die Mechanik frei von Komponenten bleibt.
 */
export type CallConnection = 'connecting' | 'live' | 'reconnecting' | 'lost'

export interface CallChatMessage {
  id: number
  /** 'self' = ich, 'peer' = das Gegenüber. */
  from: 'self' | 'peer'
  text: string
  time: string
  /** Nachrichten mit Link oder Anhang gehen in die Zusammenfassung (project.md §5a). */
  inSummary?: boolean
}
