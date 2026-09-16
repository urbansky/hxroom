import type { ScreenShareCaptureOptions, TrackPublishOptions } from 'livekit-client'

// Wie die Bildschirmfreigabe aufgenommen und gesendet wird.
//
// Die Voreinstellungen von livekit-client sind für Gesichter gemacht: 1080p, 2,5 Mbit/s, zwei
// Simulcast-Ebenen. Was ein Coach teilt, sind aber Folien, Tabellen und Formulare – dort
// entscheidet jeder Pixel darüber, ob der Klient mitliest oder nachfragen muss. Deshalb hier
// ein eigenes Profil: mehr Auflösung, mehr Bits je Bild, dafür weniger Bilder je Sekunde.
//
// Rein deklarativ, wie state.ts: Diese Datei kennt weder Raum noch Lebenszyklus.

/**
 * Aufnahme in 1440p statt der 1080p aus dem SDK-Default.
 *
 * `ideal`, also kein Zwang: Ein 1080p-Bildschirm liefert weiter seine native Auflösung, ein
 * Retina-Display gibt mehr her. Nach oben ist es ein Deckel – eine 5K-Quelle nativ zu
 * kodieren, überfordert den Encoder und bringt auf der Gegenseite nichts, was ein Auge sähe.
 */
const SHARE_RESOLUTION = { width: 2560, height: 1440, frameRate: 15 }

/**
 * Safari 17 liefert bei *jeder* Auflösungsvorgabe eine niedrig aufgelöste Aufnahme
 * (WebKit-Bug 263015) – gemeint als Deckel, gewirkt als Fessel. Dort bleibt die Vorgabe
 * deshalb weg; livekit-client setzt für Safari aus demselben Grund ebenfalls keine, und der
 * Browser gibt dann die native Auflösung des Bildschirms.
 *
 * Eine Abfrage am User-Agent ist die falsche Art, Fähigkeiten zu erkennen – hier geht es
 * aber nicht um eine Fähigkeit, sondern um einen benannten Fehler einer Browserfamilie.
 */
function affectedBySafariResolutionBug(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  return /Safari/.test(ua) && !/Chrome|Chromium|Android|CriOS|FxiOS|Edg/.test(ua)
}

/** Mit Ton: Wer einen Film oder eine Aufnahme zeigt, will nicht danebenreden müssen. */
export function screenShareCaptureOptions(): ScreenShareCaptureOptions {
  return {
    audio: true,
    resolution: affectedBySafariResolutionBug() ? undefined : SHARE_RESOLUTION,
  }
}

export const SCREEN_SHARE_PUBLISH: TrackPublishOptions = {
  // Ein Gespräch, ein Gegenüber: Eine zweite, halb aufgelöste Ebene kostet Encoder und
  // Uplink und dient allein dazu, dem Empfänger etwas Schlechteres anbieten zu können. Ohne
  // sie gibt es bei Engpass keinen Sprung auf die halbe Auflösung mehr, sondern eine
  // sinkende Bildrate bei stehendem Bild.
  simulcast: false,

  // Eine Obergrenze, kein Sollwert: WebRTC regelt darunter von selbst herunter, wenn die
  // Leitung es nicht trägt, und ein stehendes Bild braucht ohnehin kaum etwas. 15 statt 30
  // Bilder je Sekunde, weil jedes einzelne mehr Bits bekommen soll – bei Text zählt die
  // Schärfe eines Bildes, nicht die Zahl der Bilder.
  screenShareEncoding: { maxBitrate: 8_000_000, maxFramerate: 15, priority: 'high' },

  // Lieber Bilder auslassen als Auflösung verlieren. Ist für Freigaben bereits die
  // Voreinstellung des SDK; hier steht es, weil das Profil sonst nur zur Hälfte erklärt, was
  // es bewirkt.
  degradationPreference: 'maintain-resolution',
}
