import { ref, shallowReactive, shallowRef } from 'vue'
import {
  DisconnectReason,
  type LocalParticipant,
  type LocalTrackPublication,
  type Participant,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
  TrackEvent,
  type TrackPublication,
} from 'livekit-client'
import { createLogger } from './logger'
import {
  activeCameraId,
  activeMicrophoneId,
  camera,
  cameraIssue,
  cameras,
  findParticipant,
  joinFailure,
  loadingCamera,
  localIdentity,
  microphone,
  microphoneIssue,
  microphones,
  participants,
  remoteParticipants,
  resetState,
  screenShareBy,
  screenShareIssue,
  screenSharing,
  status,
} from './state'
import type { CallDeviceKind } from './types'
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

/**
 * Ein LiveKit-`Track` als `MediaStream` – die Form, die ein <video>- oder <audio>-Element
 * erwartet.
 *
 * Die Umwandlung gehört hierher und nicht in die Apps: Die Oberfläche in `packages/ui` soll
 * LiveKit nicht kennen (sie nimmt `MediaStream`), und sonst stünden dieselben drei Zeilen
 * in der Coach- und in der Klienten-App.
 *
 * Der Cache ist kein Geiz, sondern nötig: Ein bei jedem Aufruf neu gebauter Stream wäre für
 * Vue ein neues Objekt, die Zuweisung an `srcObject` liefe erneut und das Bild setzte bei
 * jedem Rendern neu auf.
 *
 * Er hängt an der `MediaStreamTrack`, nicht am `Track`. LiveKit tauscht die Spur innerhalb
 * desselben Track-Objekts aus – beim Gerätewechsel und auch, wenn die Kamera aus- und wieder
 * eingeschaltet wird (ausgeschaltet wird sie gestoppt, damit das Kameralicht erlischt). Am
 * Track-Objekt festgemacht, hing die eigene Vorschau danach an der beendeten Spur und stand
 * still. Weil sich das Track-Objekt dabei nicht ändert, bekommt Vue davon nichts mit;
 * `streamVersion` ist der Anstoß, den `TrackEvent.Restarted` gibt.
 */
const streamCache = new WeakMap<MediaStreamTrack, MediaStream>()
const streamVersion = ref(0)

function bumpStreams() {
  streamVersion.value++
}

function streamFor(track: Track | undefined): MediaStream | null {
  // Gelesen, damit jede berechnete Eigenschaft, die hierher ruft, beim Neustart einer Spur
  // neu ausgewertet wird.
  void streamVersion.value
  const media = track?.mediaStreamTrack
  if (!media) return null

  const cached = streamCache.get(media)
  if (cached) return cached

  const stream = new MediaStream([media])
  streamCache.set(media, stream)
  return stream
}

/** Das Kamerabild eines Teilnehmers, oder null solange keines ankommt. */
export function videoStreamFor(identity: string): MediaStream | null {
  return streamFor(videoTracks[identity])
}

/**
 * Der Ton eines Teilnehmers. Getrennt vom Bild, weil das <video>-Element der eigenen
 * Vorschau stumm sein muss – ein gemeinsamer Stream nähme auch der Gegenstelle den Ton.
 */
export function audioStreamFor(identity: string): MediaStream | null {
  return streamFor(audioTracks[identity])
}

/** Die laufende Bildschirmfreigabe, unabhängig davon, von wem sie kommt. */
export function screenShareStream(): MediaStream | null {
  return streamFor(screenShareVideoTrack.value)
}

/**
 * Der Ton einer fremden Freigabe – etwa ein Video, das die Gegenseite zeigt. Die eigene
 * Freigabe liefert hier nichts: Ihren Ton selbst abzuspielen, erzeugte ein Echo.
 */
export function screenShareAudioStream(): MediaStream | null {
  return streamFor(screenShareAudioTrack.value)
}

/**
 * Ob dieser Browser überhaupt einen Bildschirm teilen kann. Auf dem iPhone und den meisten
 * Android-Browsern fehlt getDisplayMedia – der Knopf soll dort gar nicht erst erscheinen.
 */
export function screenShareSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.mediaDevices?.getDisplayMedia === 'function'
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

  // Eine eigene Referenz auf den Raum, den dieser Beitritt betritt. Verlässt der Nutzer das
  // Gespräch, während wir noch verbinden – beim schnellen Wechsel von einem Call zum
  // nächsten geschieht genau das –, hängt `room` längst an einem anderen Raum. Ohne diesen
  // Vergleich schriebe der alte Beitritt seinen Erfolg in den neuen Zustand.
  const active = (room ??= new Room())
  status.value = 'connecting'
  joinFailure.value = null

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
  let attempts = 10
  while (status.value !== 'connected') {
    if (room !== active) return
    try {
      log.info('Raum betreten', { url })
      await active.connect(url, token)
      if (room !== active) {
        // Verlassen, während die Verbindung zustande kam: Sie gehört niemandem mehr.
        await active.disconnect()
        return
      }
      status.value = 'connected'
    }
    catch (cause) {
      log.error('Beitritt fehlgeschlagen', cause)
      attempts--
      if (attempts === 0) {
        if (room !== active) return
        await disconnectRoom()
        status.value = 'failed'
        joinFailure.value = 'network'
        return
      }
      await wait(500)
    }
  }
  if (room !== active) return
  log.info(`Raum "${active.name}" betreten`)

  participants.value = []
  localIdentity.value = active.localParticipant.identity
  addParticipant(active.localParticipant)

  // Wer schon da ist, samt allem, was er bereits sendet: Die Ereignisse dafür sind vor dem
  // Beitritt gelaufen und kommen nicht noch einmal.
  for (const participant of active.remoteParticipants.values()) {
    addParticipant(participant)
    for (const publication of participant.getTrackPublications()) {
      if (publication.track) trackSubscribedListener(publication.track, publication, participant)
    }
  }

  active.on(RoomEvent.TrackSubscribed, trackSubscribedListener)
  active.on(RoomEvent.TrackUnsubscribed, trackUnsubscribedListener)
  active.on(RoomEvent.TrackMuted, trackMutedListener)
  active.on(RoomEvent.TrackUnmuted, trackMutedListener)
  active.on(RoomEvent.ParticipantNameChanged, participantNameListener)
  active.on(RoomEvent.ParticipantConnected, participantConnectedListener)
  active.on(RoomEvent.ParticipantDisconnected, participantDisconnectedListener)
  active.on(RoomEvent.Disconnected, disconnectedListener)
  active.on(RoomEvent.LocalTrackUnpublished, localTrackUnpublishListener)
  active.on(RoomEvent.AudioPlaybackStatusChanged, audioPlaybackStatusListener)
  active.on(RoomEvent.MediaDevicesChanged, devicesChangedListener)
  active.on(RoomEvent.ActiveDeviceChanged, activeDeviceChangedListener)

  // Ohne Kamera lässt sich sprechen, ohne Mikrofon nicht – trotzdem gilt beides hier als
  // Fehlschlag nur dann, wenn etwas Unerwartetes passiert ist. Eine verweigerte Freigabe
  // oder fehlende Hardware wird in cameraIssue/microphoneIssue vermerkt, und das Gespräch
  // läuft weiter (siehe setCameraEnabled).
  if (!(await setCameraEnabled(true)) || !(await setMicrophoneEnabled(true))) {
    if (room !== active) return
    await disconnectRoom()
    status.value = 'failed'
    joinFailure.value = 'devices'
  }
}

/**
 * Den Raum verlassen und den Zustand zurücksetzen.
 *
 * Alles Geteilte fällt vor dem ersten `await`: Der Aufruf kommt aus `onBeforeUnmount` und
 * wird dort nicht abgewartet, das Trennen klingt also noch aus, während die nächste Ansicht
 * schon steht. Liefe das Aufräumen danach, träfe es den Raum, den der zweite Call
 * inzwischen aufgebaut hat – und der zweite Call fände eine tote Verbindung vor.
 */
export async function leaveCall(next: RoomStatus = 'ended'): Promise<void> {
  log.info('Raum verlassen')
  const leaving = room
  room = undefined
  resetTracks()
  resetState(next)
  await closeRoom(leaving)
}

async function disconnectRoom(): Promise<void> {
  const leaving = room
  room = undefined
  await closeRoom(leaving)
}

async function closeRoom(leaving: Room | undefined): Promise<void> {
  if (!leaving) return
  log.info('Verbindung trennen')
  leaving.removeAllListeners()
  await leaving.disconnect()
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
    publication.track.off(TrackEvent.Restarted, bumpStreams)
    publication.track.on(TrackEvent.Restarted, bumpStreams)
  }
  // Erst nach der Freigabe nennt der Browser die Geräte beim Namen.
  void refreshDevices()
  return true
}

/** Mikrofon an oder aus. Rückgabe wie bei der Kamera. */
// ---------------------------------------------------------------------------
// Geräte
// ---------------------------------------------------------------------------

/** Einträge, mit denen Browser auf ein anderes Gerät verweisen, statt selbst eines zu sein. */
const PSEUDO_DEVICE_IDS = new Set(['default', 'communications'])

/**
 * Die Geräteliste neu einlesen und festhalten, welches Gerät gerade sendet.
 *
 * Aufgerufen nach jeder Kamera- und Mikrofonfreigabe, bei jeder Änderung an den Geräten und
 * nach jedem Wechsel. Der erste Punkt ist der wichtige: Vor der Freigabe liefert der Browser
 * die Geräte ohne Namen. Wer die Liste nur beim Verbinden liest, hat danach dauerhaft
 * „Mikrofon 1, 2, 3" – der Freigabedialog kommt erst nach dem Verbinden.
 */
export async function refreshDevices(): Promise<void> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return

  let all: MediaDeviceInfo[]
  try {
    all = await navigator.mediaDevices.enumerateDevices()
  }
  catch (cause) {
    log.warn('Geräteliste nicht lesbar', cause)
    return
  }

  microphones.value = listDevices(all, 'audioinput')
  cameras.value = listDevices(all, 'videoinput')
  activeMicrophoneId.value = resolveActiveDevice(all, 'audioinput', Track.Source.Microphone)
  activeCameraId.value = resolveActiveDevice(all, 'videoinput', Track.Source.Camera)

  await recoverLostDevice('audioinput', Track.Source.Microphone)
  await recoverLostDevice('videoinput', Track.Source.Camera)
}

/**
 * Chrome führt das Standardgerät zweimal: als Eintrag `default` („Standard – MacBook
 * Pro-Mikrofon") und noch einmal unter eigenem Namen. Beide haben dieselbe groupId. In einer
 * Auswahlliste sähe das nach zwei Mikrofonen aus, von denen man nicht weiß, welches man hat.
 * Der Verweis fällt deshalb weg, sobald das Gerät, auf das er zeigt, selbst in der Liste steht.
 */
function listDevices(all: MediaDeviceInfo[], kind: CallDeviceKind) {
  const ofKind = all.filter(device => device.kind === kind)
  const realGroups = new Set(ofKind.filter(d => !PSEUDO_DEVICE_IDS.has(d.deviceId)).map(d => d.groupId))

  return ofKind
    .filter(device => !PSEUDO_DEVICE_IDS.has(device.deviceId) || !realGroups.has(device.groupId))
    .map(device => ({ id: device.deviceId, label: device.label }))
}

/**
 * Welches Gerät aus der Liste gerade sendet.
 *
 * Maßgeblich ist die laufende Spur selbst, nicht die Wahl, die man zuletzt getroffen hat:
 * Zieht jemand das Headset ab, weicht der Browser still auf ein anderes Gerät aus. Weil das
 * Standardgerät in der Liste unter seinem eigenen Namen steht, die Spur aber womöglich als
 * `default` läuft, wird zusätzlich über die groupId zugeordnet.
 */
function resolveActiveDevice(all: MediaDeviceInfo[], kind: CallDeviceKind, source: Track.Source): string | null {
  const list = kind === 'audioinput' ? microphones.value : cameras.value
  const inList = (id: string | undefined) => (id && list.some(device => device.id === id) ? id : null)
  const byGroup = (groupId: string | undefined) => {
    if (!groupId) return null
    return list.find(device => all.find(d => d.deviceId === device.id && d.kind === kind)?.groupId === groupId)?.id ?? null
  }

  const settings = room?.localParticipant.getTrackPublication(source)?.track?.mediaStreamTrack.readyState === 'live'
    ? room.localParticipant.getTrackPublication(source)!.track!.mediaStreamTrack.getSettings()
    : undefined
  const chosen = room?.getActiveDevice(kind)
  const chosenGroup = all.find(d => d.kind === kind && d.deviceId === chosen)?.groupId

  return inList(settings?.deviceId)
    ?? byGroup(settings?.groupId)
    ?? inList(chosen)
    ?? byGroup(chosenGroup)
    ?? list[0]?.id
    ?? null
}

/**
 * Ist das Gerät, auf dem die Spur läuft, verschwunden, auf ein vorhandenes umschalten.
 *
 * Eine Spur auf einem abgezogenen Gerät endet, und das Gegenüber hört oder sieht nichts mehr,
 * ohne dass jemand etwas geändert hätte. Gewechselt wird nur, wenn überhaupt eine Spur gesendet
 * hat – eine ausgeschaltete Kamera bleibt aus.
 */
async function recoverLostDevice(kind: CallDeviceKind, source: Track.Source): Promise<void> {
  const media = room?.localParticipant.getTrackPublication(source)?.track?.mediaStreamTrack
  if (!media || media.readyState !== 'ended') return
  if (source === Track.Source.Camera && !camera.value) return
  if (source === Track.Source.Microphone && !microphone.value) return

  const fallback = (kind === 'audioinput' ? microphones.value : cameras.value)[0]
  if (!fallback) return

  log.warn('Gerät verschwunden, weiche aus', { kind, to: fallback.id })
  await switchDevice(kind, fallback.id)
}

/**
 * Auf ein anderes Gerät wechseln – die laufende Spur wird mit ihm neu gestartet, das Gegenüber
 * bekommt dasselbe Bild bzw. denselben Ton ohne Unterbrechung des Gesprächs. Ist Kamera oder
 * Mikrofon gerade aus, gilt die Wahl für das nächste Einschalten.
 *
 * Die Auswahl springt sofort um, damit das Menü nicht hinter dem Klick herhinkt; scheitert der
 * Wechsel – das Gerät ist belegt oder inzwischen weg –, springt sie zurück und die Ursache
 * steht in cameraIssue bzw. microphoneIssue.
 */
export async function switchDevice(kind: CallDeviceKind, deviceId: string): Promise<boolean> {
  const active = kind === 'audioinput' ? activeMicrophoneId : activeCameraId
  const issue = kind === 'audioinput' ? microphoneIssue : cameraIssue
  if (!room || active.value === deviceId) return !!room

  const previous = active.value
  active.value = deviceId

  try {
    const switched = await room.switchActiveDevice(kind, deviceId)
    if (!switched) {
      active.value = previous
      log.warn('Gerätewechsel ohne Erfolg', { kind, deviceId })
      return false
    }
    issue.value = null
  }
  catch (cause) {
    active.value = previous
    issue.value = classifyDeviceError(cause)
    log.warn('Gerätewechsel fehlgeschlagen', { kind, deviceId, issue: issue.value, cause })
    return false
  }

  bumpStreams()
  await refreshDevices()
  return true
}

function devicesChangedListener() {
  void refreshDevices()
}

function activeDeviceChangedListener() {
  bumpStreams()
  void refreshDevices()
}

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
  void refreshDevices()
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
 *
 * Teilt die Gegenseite gerade, startet hier nichts. Die Bühne zeigt eine Freigabe, nicht zwei,
 * und die fremde abzulösen stünde dieser Seite nicht zu – die Oberfläche sperrt den Knopf
 * dann ohnehin; die Prüfung hier hält auch, wenn eine App das vergisst.
 */
export async function setScreenShareEnabled(enabled: boolean): Promise<boolean> {
  const local = room?.localParticipant
  if (!local) return false
  if (enabled && screenShareBy.value && screenShareBy.value !== local.identity) return false

  screenShareIssue.value = null
  try {
    log.info('Bildschirmfreigabe', enabled)
    const publication = await local.setScreenShareEnabled(enabled, { audio: true })
    if (enabled && publication === undefined) return false
    if (enabled && publication?.videoTrack) {
      screenShareVideoTrack.value = publication.videoTrack
      screenShareBy.value = local.identity
    }
    if (!enabled) clearScreenShare(local.identity)
    screenSharing.value = enabled
  }
  catch (cause) {
    screenShareIssue.value = classifyScreenShareError(cause)
    if (screenShareIssue.value) log.warn('Bildschirmfreigabe nicht gestartet', { issue: screenShareIssue.value, cause })
    else log.info('Bildschirmfreigabe abgebrochen')
    return false
  }
  return true
}

/**
 * Abbruch im Auswahldialog ist kein Fehler und liefert null. Chrome meldet ihn und die
 * fehlende Systemberechtigung unter demselben Namen `NotAllowedError` – nur die Nachricht
 * unterscheidet sich („Permission denied" gegenüber „Permission denied by system").
 */
function classifyScreenShareError(cause: unknown) {
  const name = (cause as { name?: string })?.name
  const message = (cause as { message?: string })?.message ?? ''
  if (/by system/i.test(message)) return 'system' as const
  if (name === 'NotAllowedError' || name === 'AbortError') return null
  return 'unknown' as const
}

/** Die Freigabe von `identity` abräumen – nur, wenn sie es auch ist, die gerade läuft. */
function clearScreenShare(identity: string) {
  if (screenShareBy.value !== identity) return
  screenShareBy.value = null
  screenShareVideoTrack.value = undefined
  screenShareAudioTrack.value = undefined
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
    else if (track.source === Track.Source.ScreenShare) {
      screenShareVideoTrack.value = track
      screenShareBy.value = participant.identity
    }
  }
  else if (track.kind === 'audio') {
    if (track.source === Track.Source.Microphone) audioTracks[participant.identity] = track
    else if (track.source === Track.Source.ScreenShareAudio) screenShareAudioTrack.value = track
  }
}

/**
 * Eine fremde Spur ist weg – die Gegenseite hat sie beendet.
 *
 * Fehlte dieser Listener, bliebe die Freigabe der Gegenseite nach ihrem Ende als letztes Bild
 * auf der Bühne stehen: Das Ende einer Spur kommt nur hier an, nicht als eigenes Ereignis.
 */
function trackUnsubscribedListener(track: RemoteTrack, _publication: RemoteTrackPublication, participant: RemoteParticipant) {
  log.info('Spur beendet', { kind: track.kind, source: track.source, identity: participant.identity })
  if (track.source === Track.Source.ScreenShare) clearScreenShare(participant.identity)
  else if (track.source === Track.Source.ScreenShareAudio && screenShareAudioTrack.value === track) screenShareAudioTrack.value = undefined
  else if (track.source === Track.Source.Camera && videoTracks[participant.identity] === track) delete videoTracks[participant.identity]
  else if (track.source === Track.Source.Microphone && audioTracks[participant.identity] === track) delete audioTracks[participant.identity]
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
  if (publication.source === Track.Source.ScreenShare && room) {
    clearScreenShare(room.localParticipant.identity)
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
  clearScreenShare(participant.identity)
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
    videoStreamFor,
    audioStreamFor,
    screenShareStream,
    screenShareAudioStream,
    screenShareBy,
    screenShareIssue,
    screenShareSupported,

    // Geräte
    microphones,
    cameras,
    activeMicrophoneId,
    activeCameraId,
    refreshDevices,
    switchDevice,

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
