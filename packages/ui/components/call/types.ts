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
  /**
   * Die vom Browser erzeugte Kennung der Nachricht (`clientMessageId`), nicht die der
   * Datenbank: Sie steht schon fest, während die Nachricht noch unterwegs ist, und bleibt
   * dieselbe, wenn die gespeicherte Fassung sie ersetzt.
   */
  id: string
  /** 'self' = ich, 'peer' = das Gegenüber. */
  from: 'self' | 'peer'
  text: string
  time: string
  /**
   * Nur für eigene Nachrichten: unterwegs oder nicht angekommen. Fehlt der Wert, liegt sie
   * beim Server. Eine Nachricht, von der man glaubt, sie sei zugestellt, ist im Tonausfall
   * das Schlimmste – deshalb steht der Zustand an der Blase.
   */
  status?: 'sending' | 'failed'
  /** Die geteilte Datei, falls die Nachricht eine trägt. */
  file?: CallChatFile
}

/**
 * Eine im Chat geteilte Datei. `href` zeigt auf die API, nicht auf den Speicher: Sie prüft
 * den Zugang beim Klick und leitet dann auf einen kurzlebigen, signierten Link weiter.
 * Fehlt `href`, ist die Datei noch unterwegs.
 */
export interface CallChatFile {
  name: string
  size: number
  href?: string
}
