import type { Room } from 'livekit-client'

// Was auf der Leitung wirklich ankommt.
//
// Gebaut für die Abnahme und die Fehlersuche: Ob eine Änderung am Sendeprofil das Bild
// schärfer macht, lässt sich am Auge allein nicht entscheiden – zwei Screenshots sehen im
// Zweifel gleich aus, während die Spur in Wahrheit auf halber Auflösung lief. Hier stehen die
// Zahlen, die das beantworten, dazu der Weg, den die Medien nehmen. Zu sehen sind sie in der
// Konsole (`logVideoQuality`) und im Debug-Modus der Oberfläche (`?debug=1`).
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
  /**
   * Verlorene Pakete in Prozent. Beim Empfangen seit dem vorigen Aufruf, beim Senden so, wie
   * der LiveKit-Server es zuletzt zurückgemeldet hat.
   */
  lossPercent: number | null
  /** Schwankung der Paketlaufzeit in ms – hoch heißt: ruckelndes Bild trotz ausreichender Rate. */
  jitterMs: number | null
  /** z. B. `video/VP8`. */
  codec: string | null
  /** Name des En- bzw. Decoders, verrät Hardware- oder Software-Verarbeitung. */
  implementation: string | null
  /** Warum der Encoder zurücksteckt: `none`, `bandwidth`, `cpu`. Nur beim Senden. */
  limitation: string | null
  /** Die Simulcast-Ebene (`f`, `h`, `q`), solange mehrere laufen. */
  layer: string | null
}

/** Der Weg, den die Medien gerade nehmen: das Kandidatenpaar, auf das ICE sich geeinigt hat. */
export interface ConnectionQuality {
  /**
   * Was darüber läuft. Mit einer PeerConnection – der Voreinstellung von livekit-client, sofern
   * der Server sie kann – Senden und Empfangen zusammen, mit zweien je eines.
   */
  directions: ('send' | 'receive')[]
  /** Round-Trip-Zeit zum LiveKit-Server in ms. */
  rttMs: number | null
  /** `host`, `srflx`, `prflx` oder `relay` – `relay` heißt: über TURN. */
  candidateType: string | null
  /** `udp` oder `tcp` – zum LiveKit-Server, bei `relay` zum TURN-Server. */
  protocol: string | null
  /** Nur bei `relay`: wie der Browser den TURN-Server erreicht – `udp`, `tcp` oder `tls`. */
  relayProtocol: string | null
  /** Was die Staukontrolle dem Senden gerade zutraut, in kbit/s. */
  availableSendKbps: number | null
}

export interface CallQuality {
  video: VideoQuality[]
  connections: ConnectionQuality[]
}

interface Counters {
  bytes: number | null
  lost: number | null
  received: number | null
  timestamp: number
}

/**
 * Die letzten Zählerstände je Spur und Ebene.
 *
 * Eine Bitrate ist eine Differenz, kein Messwert: `bytesSent` zählt seit Beginn der
 * Verbindung. Ohne diesen Zwischenspeicher stünde in jeder Zeile die Durchschnittsrate des
 * ganzen Gesprächs – und die verrät gerade nicht, was jetzt gerade passiert. Für verlorene
 * Pakete gilt dasselbe.
 */
const previous = new Map<string, Counters>()

function delta(key: string, now: Counters): { kbps: number | null, lossPercent: number | null } {
  const last = previous.get(key)
  previous.set(key, now)
  if (!last || now.timestamp <= last.timestamp) return { kbps: null, lossPercent: null }

  // Bytes × 8 geteilt durch Millisekunden ergibt unmittelbar kbit/s.
  const kbps = now.bytes !== null && last.bytes !== null
    ? Math.round(((now.bytes - last.bytes) * 8) / (now.timestamp - last.timestamp))
    : null

  let lossPercent: number | null = null
  if (now.lost !== null && last.lost !== null && now.received !== null && last.received !== null) {
    const lost = Math.max(0, now.lost - last.lost)
    const total = lost + Math.max(0, now.received - last.received)
    lossPercent = total > 0 ? (lost / total) * 100 : 0
  }

  return { kbps, lossPercent }
}

function num(value: unknown): number | null {
  return typeof value === 'number' ? value : null
}

function str(value: unknown): string | null {
  return typeof value === 'string' ? value : null
}

/** Sekunden, wie die Statistik sie führt, in gerundete Millisekunden. */
function ms(seconds: unknown): number | null {
  return typeof seconds === 'number' ? Math.round(seconds * 1000) : null
}

type Entry = Record<string, unknown>

interface StatsSource {
  getRTCStatsReport(): Promise<RTCStatsReport | undefined>
}

interface Collected {
  video: VideoQuality[]
  /** Nach der Kennung des Kandidatenpaars – dieselbe Verbindung meldet jede Spur darüber. */
  connections: Map<string, ConnectionQuality>
}

/**
 * Das Kandidatenpaar, über das die Medien gerade laufen.
 *
 * Chromium und Safari nennen es im `transport`-Eintrag. Firefox kennt diesen Eintrag nicht und
 * markiert das Paar selbst.
 */
function selectedPair(report: RTCStatsReport): Entry | undefined {
  const entries: Entry[] = []
  report.forEach((entry: Entry) => entries.push(entry))

  const selectedId = entries
    .map(entry => (entry.type === 'transport' ? str(entry.selectedCandidatePairId) : null))
    .find(id => id !== null)

  return entries.find(entry => entry.type === 'candidate-pair' && (selectedId
    ? entry.id === selectedId
    : entry.selected === true || (entry.nominated === true && entry.state === 'succeeded')))
}

function readConnection(report: RTCStatsReport, direction: 'send' | 'receive', into: Collected) {
  const pair = selectedPair(report)
  const pairId = str(pair?.id)
  if (!pair || !pairId) return

  const known = into.connections.get(pairId)
  if (known) {
    if (!known.directions.includes(direction)) known.directions.push(direction)
    return
  }

  const local = report.get(str(pair.localCandidateId) ?? '') as Entry | undefined
  const available = num(pair.availableOutgoingBitrate)
  into.connections.set(pairId, {
    directions: [direction],
    rttMs: ms(pair.currentRoundTripTime),
    candidateType: str(local?.candidateType),
    protocol: str(local?.protocol),
    relayProtocol: str(local?.relayProtocol),
    availableSendKbps: available === null ? null : Math.round(available / 1000),
  })
}

async function readTrack(
  track: StatsSource,
  kind: string,
  direction: 'send' | 'receive',
  source: string,
  identity: string,
  into: Collected,
) {
  const report = await track.getRTCStatsReport()
  if (!report) return

  // Auch Tonspuren: Bei ausgeschalteter Kamera sind sie die einzigen, die den Weg verraten.
  readConnection(report, direction, into)
  if (kind !== 'video') return

  // Der Codec steht in einem eigenen Eintrag, auf den die Spur nur verweist. Ebenso, was der
  // Server über eine gesendete Spur zurückmeldet (`remote-inbound-rtp`).
  const codecs = new Map<string, string>()
  const feedback = new Map<string, Entry>()
  report.forEach((entry: Entry) => {
    if (entry.type === 'codec' && typeof entry.id === 'string' && typeof entry.mimeType === 'string') {
      codecs.set(entry.id, entry.mimeType)
    }
    if (entry.type === 'remote-inbound-rtp' && typeof entry.localId === 'string') {
      feedback.set(entry.localId, entry)
    }
  })

  const wanted = direction === 'send' ? 'outbound-rtp' : 'inbound-rtp'

  report.forEach((entry: Entry) => {
    if (entry.type !== wanted || entry.kind !== 'video') return

    const codecId = str(entry.codecId)
    const timestamp = num(entry.timestamp) ?? Date.now()
    const key = `${direction}:${identity}:${source}:${str(entry.rid) ?? entry.ssrc}`
    const sending = direction === 'send'
    const remote = sending ? feedback.get(str(entry.id) ?? '') : undefined
    const fractionLost = num(remote?.fractionLost)

    const { kbps, lossPercent } = delta(key, {
      bytes: num(sending ? entry.bytesSent : entry.bytesReceived),
      lost: sending ? null : num(entry.packetsLost),
      received: sending ? null : num(entry.packetsReceived),
      timestamp,
    })

    into.video.push({
      source,
      direction,
      identity,
      width: num(entry.frameWidth),
      height: num(entry.frameHeight),
      fps: num(entry.framesPerSecond),
      kbps,
      lossPercent: sending ? (fractionLost === null ? null : fractionLost * 100) : lossPercent,
      jitterMs: ms(sending ? remote?.jitter : entry.jitter),
      codec: codecId ? codecs.get(codecId) ?? null : null,
      implementation: str(entry.encoderImplementation) ?? str(entry.decoderImplementation),
      limitation: str(entry.qualityLimitationReason),
      layer: str(entry.rid),
    })
  })
}

/**
 * Alle Videospuren des laufenden Gesprächs, gesendete wie empfangene, und die Verbindungen,
 * über die sie laufen.
 *
 * Zweimal hintereinander aufrufen: Der erste Aufruf setzt den Bezugspunkt für Bitrate und
 * Verlust, erst der zweite kann sie nennen.
 */
export async function collectCallQuality(room: Room | undefined): Promise<CallQuality> {
  const into: Collected = { video: [], connections: new Map() }
  if (!room) return { video: [], connections: [] }

  const local = room.localParticipant
  for (const publication of local.trackPublications.values()) {
    const track = publication.track
    if (!track) continue
    await readTrack(track, publication.kind, 'send', publication.source, local.identity, into)
  }

  for (const participant of room.remoteParticipants.values()) {
    for (const publication of participant.trackPublications.values()) {
      const track = publication.track
      if (!track) continue
      await readTrack(track, publication.kind, 'receive', publication.source, participant.identity, into)
    }
  }

  return { video: into.video, connections: [...into.connections.values()] }
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
      const loss = row.lossPercent ? ` loss=${row.lossPercent.toFixed(1)}%` : ''
      const codec = row.codec?.replace('video/', '') ?? '–'
      return `${row.direction === 'send' ? '↑' : '↓'} ${row.source}${layer} ${size} ${fps} ${kbps} ${codec} ${row.implementation ?? '–'}${limit}${loss}`
    })
    .join('\n')
}
