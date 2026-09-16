import type { Room } from 'livekit-client'

// Was auf der Leitung wirklich ankommt.
//
// Gebaut für die Abnahme, nicht für die Oberfläche: Ob eine Änderung am Sendeprofil das Bild
// schärfer macht, lässt sich am Auge allein nicht entscheiden – zwei Screenshots sehen im
// Zweifel gleich aus, während die Spur in Wahrheit auf halber Auflösung lief. Hier stehen die
// Zahlen, die das beantworten.
//
// Keine Abhängigkeit auf den Modul-Zustand: Der Raum kommt als Parameter herein, damit diese
// Datei nichts über den Lebenszyklus wissen muss (dieselbe Trennung wie in state.ts).

/** Eine sendende oder empfangende Videospur, wie der Browser sie gerade fährt. */
export interface VideoQuality {
  /** `camera` oder `screen_share` – die LiveKit-Quelle der Spur. */
  source: string
  direction: 'send' | 'receive'
  identity: string
  width: number | null
  height: number | null
  fps: number | null
  /** kbit/s seit dem vorigen Aufruf. Beim ersten Aufruf null – eine Rate braucht zwei Punkte. */
  kbps: number | null
  /** z. B. `video/VP8`. */
  codec: string | null
  /** Name des En- bzw. Decoders, verrät Hardware- oder Software-Verarbeitung. */
  implementation: string | null
  /** Warum der Encoder zurücksteckt: `none`, `bandwidth`, `cpu`. Nur beim Senden. */
  limitation: string | null
  /** Die Simulcast-Ebene (`f`, `h`, `q`), solange mehrere laufen. */
  layer: string | null
}

/**
 * Die letzten Bytestände je Spur und Ebene.
 *
 * Eine Bitrate ist eine Differenz, kein Messwert: `bytesSent` zählt seit Beginn der
 * Verbindung. Ohne diesen Zwischenspeicher stünde in jeder Zeile die Durchschnittsrate des
 * ganzen Gesprächs – und die verrät gerade nicht, was jetzt gerade passiert.
 */
const previous = new Map<string, { bytes: number, timestamp: number }>()

function rate(key: string, bytes: unknown, timestamp: number): number | null {
  if (typeof bytes !== 'number') return null
  const last = previous.get(key)
  previous.set(key, { bytes, timestamp })
  if (!last || timestamp <= last.timestamp) return null
  // Bytes × 8 geteilt durch Millisekunden ergibt unmittelbar kbit/s.
  return Math.round(((bytes - last.bytes) * 8) / (timestamp - last.timestamp))
}

function num(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

interface StatsSource {
  getRTCStatsReport(): Promise<RTCStatsReport | undefined>
}

async function readTrack(
  track: StatsSource,
  direction: 'send' | 'receive',
  source: string,
  identity: string,
): Promise<VideoQuality[]> {
  const report = await track.getRTCStatsReport()
  if (!report) return []

  // Der Codec steht in einem eigenen Eintrag, auf den die Spur nur verweist.
  const codecs = new Map<string, string>()
  report.forEach((entry: Record<string, unknown>) => {
    if (entry.type === 'codec' && typeof entry.id === 'string' && typeof entry.mimeType === 'string') {
      codecs.set(entry.id, entry.mimeType)
    }
  })

  const wanted = direction === 'send' ? 'outbound-rtp' : 'inbound-rtp'
  const rows: VideoQuality[] = []

  report.forEach((entry: Record<string, unknown>) => {
    if (entry.type !== wanted || entry.kind !== 'video') return

    const codecId = str(entry.codecId)
    const timestamp = num(entry.timestamp) ?? Date.now()
    const key = `${direction}:${identity}:${source}:${str(entry.rid) ?? entry.ssrc}`

    rows.push({
      source,
      direction,
      identity,
      width: num(entry.frameWidth),
      height: num(entry.frameHeight),
      fps: num(entry.framesPerSecond),
      kbps: rate(key, direction === 'send' ? entry.bytesSent : entry.bytesReceived, timestamp),
      codec: codecId ? codecs.get(codecId) ?? null : null,
      implementation: str(entry.encoderImplementation) ?? str(entry.decoderImplementation),
      limitation: str(entry.qualityLimitationReason),
      layer: str(entry.rid),
    })
  })

  return rows
}

/**
 * Alle Videospuren des laufenden Gesprächs, gesendete wie empfangene.
 *
 * Zweimal hintereinander aufrufen: Der erste Aufruf setzt den Bezugspunkt für die Bitrate,
 * erst der zweite kann sie nennen.
 */
export async function collectVideoQuality(room: Room | undefined): Promise<VideoQuality[]> {
  if (!room) return []
  const rows: VideoQuality[] = []

  for (const publication of room.localParticipant.videoTrackPublications.values()) {
    const track = publication.videoTrack
    if (!track) continue
    rows.push(...await readTrack(track, 'send', publication.source, room.localParticipant.identity))
  }

  for (const participant of room.remoteParticipants.values()) {
    for (const publication of participant.videoTrackPublications.values()) {
      const track = publication.videoTrack
      if (!track) continue
      rows.push(...await readTrack(track, 'receive', publication.source, participant.identity))
    }
  }

  return rows
}

/** Eine Zeile je Spur, kurz genug für die Konsole. */
export function formatVideoQuality(rows: VideoQuality[]): string {
  if (rows.length === 0) return 'keine Videospuren'
  return rows
    .map((row) => {
      const size = row.width && row.height ? `${row.width}×${row.height}` : '–'
      const fps = row.fps === null ? '–' : `${Math.round(row.fps)} fps`
      const kbps = row.kbps === null ? '–' : `${row.kbps} kbit/s`
      const layer = row.layer ? ` [${row.layer}]` : ''
      const limit = row.limitation && row.limitation !== 'none' ? ` limit=${row.limitation}` : ''
      const codec = row.codec?.replace('video/', '') ?? '–'
      return `${row.direction === 'send' ? '↑' : '↓'} ${row.source}${layer} ${size} ${fps} ${kbps} ${codec} ${row.implementation ?? '–'}${limit}`
    })
    .join('\n')
}
