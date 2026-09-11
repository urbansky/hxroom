import { shallowReactive, shallowRef } from 'vue'
import {
  DisconnectReason,
  type LocalParticipant,
  type LocalTrackPublication,
  type Participant,
  type RemoteParticipant,
  Room,
  RoomEvent,
  Track,
  type TrackPublication,
} from 'livekit-client'
import { createLogger } from './logger'
import {
  camera,
  cameraIssue,
  findParticipant,
  joinFailure,
  loadingCamera,
  localIdentity,
  microphone,
  microphoneIssue,
  participants,
  remoteParticipants,
  resetState,
  screenSharing,
  status,
} from './state'
import type { CallParticipant, DeviceIssue, RoomStatus } from './types'

// Die Verbindung zum LiveKit-Raum.
//
// Herkunft: HxMeet (`hxmeet-core-component`, MIT, eigene Vorarbeit). Übernommen wurde die
// erprobte Mechanik – der Warmlauf über prepareConnection(), der Verbindungsversuch mit
// Wiederholung, die browserspezifische Behandlung verweigerter Freigaben und die Auswertung
// der DisconnectReason. Die Oberfläche von HxMeet ist entfallen; sie liegt in HxRoom in der
// jeweiligen App und bindet an die Refs aus useCallRoom().
//
// Ein Raum pro Tab: `room` ist Modul-Zustand und bewusst nicht reaktiv – ein Room-Objekt ist
// eine lebende Verbindung, kein Datensatz zum Nachverfolgen. Siehe die Anmerkung zu SSR in
// state.ts.

const log = createLogger('HxRoom:Call')

let room: Room | undefined

/** Spuren nach Teilnehmer-Identität. shallowReactive: Die Tracks selbst sind keine Daten. */
const audioTracks = shallowReactive<Record<string, Track>>({})
const videoTracks = shallowReactive<Record<string, Track>>({})
const screenShareVideoTrack = shallowRef<Track | undefined>(undefined)
const screenShareAudioTrack = shallowRef<Track | undefined>(undefined)

function resetTracks() {
  for (const key of Object.keys(audioTracks)) delete audioTracks[key]
  for (const key of Object.keys(videoTracks)) delete videoTracks[key]
  screenShareVideoTrack.value = undefined
  screenShareAudioTrack.value = undefined
}

// ---------------------------------------------------------------------------
// Konfiguration
// ---------------------------------------------------------------------------
// URL und Token kommen aus der `CallAccessResponse` der API (Feld `livekit`). Das Token hat
// zehn Minuten Laufzeit und wird bei jedem Abruf neu ausgestellt; die URL steht schon vorher
// fest. Deshalb ist das Token optional: Der Warmlauf im Warteraum braucht nur die URL.

let livekitUrl: string | undefined
let livekitToken: string | undefined

export function configureLivekit(url: string, token?: string) {
  livekitUrl = url
  if (token !== undefined) livekitToken = token
}

function requireUrl(): string {
  if (!livekitUrl) throw new Error('LiveKit URL not configured – call configureLivekit() first')
  return livekitUrl
}

function requireToken(): string {
  if (!livekitToken) throw new Error('LiveKit token not configured – call configureLivekit() first')
  return livekitToken
}

// ---------------------------------------------------------------------------
// Lebenszyklus
// ---------------------------------------------------------------------------

/**
 * Warmlauf: DNS, TLS und der erste Signaling-Kontakt passieren schon, während der Klient
 * noch im Warteraum sitzt. Das spart beim Einlass die Sekunden, in denen sonst beide auf ein
 * schwarzes Bild schauen. Braucht kein Token.
 */
export async function prepareCall(): Promise<void> {
  if (room !== undefined) return
  const url = requireUrl()

  room = new Room()
  try {
    log.info('Verbindung vorbereiten', url)
    await room.prepareConnection(url)
    log.info('Verbindung vorbereitet')
  }
  catch (cause) {
    // Ein gescheiterter Warmlauf ist kein Fehler, nur eine verpasste Abkürzung.
    log.warn('Warmlauf fehlgeschlagen', cause)
  }
}

/**
 * Den Raum betreten und Kamera und Mikrofon veröffentlichen.
 *
 * Die Wiederholung deckt den Fall ab, dass der Medienserver im Moment des Einlasses noch
 * nicht erreichbar ist – bei einem Neustart des Containers oder einem kurzen Netzaussetzer
 * auf dem Weg dorthin.
 */
export async function joinCall(): Promise<void> {
  const url = requireUrl()
  const token = requireToken()

  room ??= new Room()
  status.value = 'connecting'
  joinFailure.value = null

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  let attempts = 10
  while (status.value !== 'connected') {
    try {
      log.info('Raum betreten', { url })
      await room.connect(url, token)
      status.value = 'connected'
    }
    catch (cause) {
      log.error('Beitritt fehlgeschlagen', cause)
      attempts--
      if (attempts === 0) {
        await disconnectRoom()
        status.value = 'failed'
        joinFailure.value = 'network'
        return
      }
      await wait(500)
    }
  }
  log.info(`Raum "${room.name}" betreten`)

  participants.value = []
  localIdentity.value = room.localParticipant.identity
  addParticipant(room.localParticipant)

  // Wer schon da ist, samt allem, was er bereits sendet: Die Ereignisse dafür sind vor dem
  // Beitritt gelaufen und kommen nicht noch einmal.
  for (const participant of room.remoteParticipants.values()) {
    addParticipant(participant)
    for (const publication of participant.getTrackPublications()) {
      if (publication.track) trackSubscribedListener(publication.track, publication, participant)
    }
  }

  room.on(RoomEvent.TrackSubscribed, trackSubscribedListener)
  room.on(RoomEvent.TrackMuted, trackMutedListener)
  room.on(RoomEvent.TrackUnmuted, trackMutedListener)
  room.on(RoomEvent.ParticipantNameChanged, participantNameListener)
  room.on(RoomEvent.ParticipantConnected, participantConnectedListener)
  room.on(RoomEvent.ParticipantDisconnected, participantDisconnectedListener)
  room.on(RoomEvent.Disconnected, disconnectedListener)
  room.on(RoomEvent.LocalTrackUnpublished, localTrackUnpublishListener)
  room.on(RoomEvent.AudioPlaybackStatusChanged, audioPlaybackStatusListener)

  // Ohne Kamera lässt sich sprechen, ohne Mikrofon nicht – trotzdem gilt beides hier als
  // Fehlschlag nur dann, wenn etwas Unerwartetes passiert ist. Eine verweigerte Freigabe
  // oder fehlende Hardware wird in cameraIssue/microphoneIssue vermerkt, und das Gespräch
  // läuft weiter (siehe setCameraEnabled).
  if (!(await setCameraEnabled(true)) || !(await setMicrophoneEnabled(true))) {
    await disconnectRoom()
    status.value = 'failed'
    joinFailure.value = 'devices'
  }
}

/** Den Raum verlassen und den Zustand zurücksetzen. */
export async function leaveCall(next: RoomStatus = 'ended'): Promise<void> {
  log.info('Raum verlassen')
  await disconnectRoom()
  resetTracks()
  resetState(next)
}

async function disconnectRoom(): Promise<void> {
  if (!room) return
  log.info('Verbindung trennen')
  room.removeAllListeners()
  await room.disconnect()
  room = undefined
}

// ---------------------------------------------------------------------------
// Geräte
// ---------------------------------------------------------------------------

/**
 * Warum ein Gerät nicht zur Verfügung steht.
 *
 * Derselbe Fall meldet sich je nach Browser verschieden: Chrome schickt bei verweigerter
 * Freigabe die Meldung „Permission denied", Safari den Namen `NotAllowedError`, und fehlende
 * Hardware kommt als „Requested device not found" herein. Genau diese Unterscheidung ist der
 * Grund, warum diese Schicht aus HxMeet übernommen wurde – sie wurde dort erarbeitet.
 */
export function classifyDeviceError(cause: unknown): DeviceIssue {
  const error = cause as DOMException | undefined
  const name = error?.name
  const message = error?.message

  if (message === 'Requested device not found' || name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'notFound'
  }
  if (message === 'Permission denied' || name === 'NotAllowedError' || name === 'SecurityError') {
    return 'denied'
  }
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy'
  // Ohne sicheren Kontext gibt es die Geräte gar nicht erst. Chrome und Firefox zählen
  // *.localhost dazu, Safari nicht (technisches-konzept.md §15) – in der Entwicklung ist das
  // der wahrscheinlichste Grund, im Betrieb ein Fehler in der Auslieferung.
  if (name === 'NotSupportedError' || !globalThis.isSecureContext) return 'insecure'
  return 'unknown'
}

/**
 * Kamera an oder aus.
 *
 * Rückgabe `false` heißt: etwas Unerwartetes ist passiert. Eine verweigerte Freigabe,
 * fehlende oder belegte Hardware zählt nicht dazu – das sind Alltagsfälle, die als
 * `cameraIssue` sichtbar werden, ohne das Gespräch zu beenden.
 */
export async function setCameraEnabled(enabled: boolean): Promise<boolean> {
  const local = room?.localParticipant
  if (!local) return false

  try {
    loadingCamera.value = true
    await local.setCameraEnabled(enabled)
    cameraIssue.value = null
    camera.value = enabled
  }
  catch (cause) {
    const issue = classifyDeviceError(cause)
    cameraIssue.value = issue
    camera.value = false
    if (issue === 'unknown') {
      log.error('Kamera ließ sich nicht schalten', cause)
      return false
    }
    log.warn('Kamera nicht verfügbar', { issue, cause })
  }
  finally {
    loadingCamera.value = false
  }

  const publication = local.getTrackPublication(Track.Source.Camera)
  if (publication?.track) {
    log.info('Eigene Videospur', { identity: local.identity, sid: publication.track.sid })
    videoTracks[local.identity] = publication.track
  }
  return true
}

/** Mikrofon an oder aus. Rückgabe wie bei der Kamera. */
export async function setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
  const local = room?.localParticipant
  if (!local) return false

  try {
    await local.setMicrophoneEnabled(enabled)
    microphoneIssue.value = null
    microphone.value = enabled
  }
  catch (cause) {
    const issue = classifyDeviceError(cause)
    microphoneIssue.value = issue
    microphone.value = false
    if (issue === 'unknown') {
      log.error('Mikrofon ließ sich nicht schalten', cause)
      return false
    }
    log.warn('Mikrofon nicht verfügbar', { issue, cause })
  }
  return true
}

export async function toggleCamera(): Promise<boolean> {
  return setCameraEnabled(!camera.value)
}

export async function toggleMicrophone(): Promise<boolean> {
  return setMicrophoneEnabled(!microphone.value)
}

/**
 * Bildschirmfreigabe starten oder beenden.
 *
 * Mit Ton: Wer einen Film oder eine Aufnahme zeigt, will nicht danebenreden müssen.
 */
export async function setScreenShareEnabled(enabled: boolean): Promise<boolean> {
  const local = room?.localParticipant
  if (!local) return false

  try {
    log.info('Bildschirmfreigabe', enabled)
    const publication = await local.setScreenShareEnabled(enabled, { audio: true })
    if (enabled && publication === undefined) return false
    if (publication?.videoTrack) screenShareVideoTrack.value = publication.videoTrack
    if (!enabled) screenShareVideoTrack.value = undefined
    screenSharing.value = enabled
  }
  catch (cause) {
    // Der übliche Fall ist kein Fehler: Der Browser fragt, welches Fenster geteilt werden
    // soll, und der Coach bricht ab.
    log.warn('Bildschirmfreigabe nicht gestartet', cause)
    return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Datenkanal
// ---------------------------------------------------------------------------

/**
 * Eine Nachricht an die Gegenseite, am Medienstrom entlang statt über die API.
 *
 * Bisher nur die Senderichtung: Das Token trägt `canPublishData` seit B2, und B6 will hier
 * „Coach beendet die Sitzung" durchreichen. Die Empfangsseite entsteht dort, mit einem
 * konkreten Kommando – die vier Kommandos aus HxMeet (Chat, Reaktion, Layout,
 * Testteilnehmer) gibt es in HxRoom alle nicht.
 */
export async function sendCallData(command: string, data: Record<string, unknown> = {}): Promise<void> {
  if (!room) return
  log.info('Daten senden', { command, data })
  const payload = new TextEncoder().encode(JSON.stringify({ command, data }))
  await room.localParticipant.publishData(payload, { reliable: true })
}

// ---------------------------------------------------------------------------
// Ereignisse des Raums
// ---------------------------------------------------------------------------

function trackSubscribedListener(track: Track, _publication: TrackPublication, participant: RemoteParticipant) {
  log.info('Spur abonniert', { kind: track.kind, source: track.source, identity: participant.identity })
  if (track.kind === 'video') {
    if (track.source === Track.Source.Camera) videoTracks[participant.identity] = track
    else if (track.source === Track.Source.ScreenShare) screenShareVideoTrack.value = track
  }
  else if (track.kind === 'audio') {
    if (track.source === Track.Source.Microphone) audioTracks[participant.identity] = track
    else if (track.source === Track.Source.ScreenShareAudio) screenShareAudioTrack.value = track
  }
}

/**
 * Eine eigene Spur ist nicht mehr veröffentlicht.
 *
 * Der Fall, für den dieser Listener da ist: Der Browser blendet bei einer Bildschirmfreigabe
 * eine eigene Leiste mit „Freigabe beenden" ein. Wer die benutzt, drückt nie den Knopf in
 * der Anwendung – ohne diesen Weg bliebe die Oberfläche in der Freigabe stehen.
 */
function localTrackUnpublishListener(publication: LocalTrackPublication) {
  log.info('Eigene Spur beendet', { kind: publication.kind, source: publication.source })
  if (publication.source === Track.Source.ScreenShare) {
    screenShareVideoTrack.value = undefined
    screenSharing.value = false
  }
}

function participantConnectedListener(participant: RemoteParticipant) {
  log.info('Teilnehmer verbunden', participant.identity)
  addParticipant(participant)
}

function participantDisconnectedListener(participant: RemoteParticipant) {
  log.info('Teilnehmer getrennt', participant.identity)
  const index = participants.value.findIndex(entry => entry.id === participant.identity)
  if (index !== -1) participants.value.splice(index, 1)
  delete audioTracks[participant.identity]
  delete videoTracks[participant.identity]
}

function participantNameListener(name: string | undefined, participant: LocalParticipant | RemoteParticipant) {
  const entry = findParticipant(participant.identity)
  if (entry) entry.name = name ?? entry.id
}

function trackMutedListener(publication: TrackPublication, participant: Participant) {
  const entry = findParticipant(participant.identity)
  if (!entry) return
  if (publication.kind === 'audio') entry.microphoneMuted = publication.isMuted
  else if (publication.kind === 'video') entry.cameraMuted = publication.isMuted
}

function audioPlaybackStatusListener(playing: boolean) {
  // Browser lassen Ton ohne Zutun des Nutzers nicht immer laufen. Sichtbar gemacht wird das
  // erst mit der Anbindung (B4/B5) – bis dahin steht es wenigstens im Protokoll.
  log.info('Tonwiedergabe', { playing, canPlaybackAudio: room?.canPlaybackAudio })
}

/**
 * Gründe, nach denen die Sitzung nicht von selbst zurückkommt.
 *
 * Alles andere – ein Reconnect, eine Migration, ein vom Client selbst ausgelöstes Trennen –
 * ist entweder vorübergehend oder gewollt. Ohne Angabe eines Grundes gilt die Verbindung
 * ebenfalls als endgültig verloren.
 */
const TERMINAL_REASONS: DisconnectReason[] = [
  DisconnectReason.SERVER_SHUTDOWN,
  DisconnectReason.ROOM_DELETED,
]

async function disconnectedListener(reason?: DisconnectReason) {
  const terminal = reason === undefined || TERMINAL_REASONS.includes(reason)
  log.info('Vom Raum getrennt', { reason: reason === undefined ? 'ohne Angabe' : DisconnectReason[reason], terminal })

  if (terminal) {
    await disconnectRoom()
    resetTracks()
    resetState('failed')
  }
}

function addParticipant(participant: LocalParticipant | RemoteParticipant): CallParticipant {
  const existing = findParticipant(participant.identity)
  if (existing) return existing

  const entry: CallParticipant = {
    id: participant.identity,
    name: participant.name || participant.identity,
    cameraMuted: false,
    microphoneMuted: false,
  }
  participants.value.push(entry)
  return entry
}

// ---------------------------------------------------------------------------
// Das Tor für die Oberfläche
// ---------------------------------------------------------------------------

/**
 * Zustand und Aktionen des Calls in einem Aufruf.
 *
 * Absichtlich nicht `useCallState`: Den Namen tragen in beiden Apps bereits die Composables,
 * die den Zustand der Buchung von der API holen. In der Call-Oberfläche stehen beide
 * nebeneinander.
 */
export function useCallRoom() {
  return {
    // Zustand
    status,
    joinFailure,
    participants,
    localIdentity,
    remoteParticipants,
    findParticipant,
    camera,
    microphone,
    loadingCamera,
    cameraIssue,
    microphoneIssue,
    screenSharing,

    // Spuren
    audioTracks,
    videoTracks,
    screenShareVideoTrack,
    screenShareAudioTrack,

    // Aktionen
    prepareCall,
    joinCall,
    leaveCall,
    setCameraEnabled,
    setMicrophoneEnabled,
    toggleCamera,
    toggleMicrophone,
    setScreenShareEnabled,
    sendCallData,
  }
}
