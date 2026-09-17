import { ref, shallowReactive, shallowRef } from 'vue'
import {
  createLocalTracks,
  DisconnectReason,
  type LocalAudioTrack,
  type LocalParticipant,
  type LocalTrack,
  type LocalTrackPublication,
  type LocalVideoTrack,
  type Participant,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
  TrackEvent,
  type TrackPublication,
  VideoQuality as LivekitVideoQuality,
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
  previewing,
  remoteParticipants,
  resetState,
  screenShareBy,
  screenShareIssue,
  screenSharing,
  status,
} from './state'
import type { CallDeviceKind } from './types'
import type { CallParticipant, DeviceIssue, RoomStatus } from './types'
import { collectVideoQuality, formatVideoQuality, type VideoQuality } from './stats'
import { SCREEN_SHARE_PUBLISH, screenShareCaptureOptions } from './quality'

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

  // Die gemerkten Geräte gelten für alles, was der Raum selbst anlegt – ohne Vorschau beim
  // Beitritt, mit ihr beim späteren Wiedereinschalten einer im Warteraum ausgeschalteten Kamera.
  if (preferredDevice.audioinput) active.options.audioCaptureDefaults!.deviceId = preferredDevice.audioinput.id
  if (preferredDevice.videoinput) active.options.videoCaptureDefaults!.deviceId = preferredDevice.videoinput.id

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

  active.on(RoomEvent.TrackPublished, trackPublishedListener)
  active.on(RoomEvent.TrackUnpublished, trackUnpublishedListener)
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
  // läuft weiter (siehe setCameraEnabled). Was im Warteraum eingerichtet wurde, gilt hier.
  const adoption = adoptPreview(active)
  adopting = adoption
  const adopted = await adoption.finally(() => {
    if (adopting === adoption) adopting = undefined
  })
  if (!adopted) {
    if (room !== active) return
    await disconnectRoom()
    status.value = 'failed'
    joinFailure.value = 'devices'
    return
  }
  await refreshDevices()
  if (room === active) await restorePreferredDevices()
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
  stopPreview()
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
// Vorschau im Warteraum
// ---------------------------------------------------------------------------
// Kamera und Mikrofon laufen schon vor dem Beitritt, damit man sich sehen, die Geräte wählen
// und den Pegel prüfen kann. Die Spuren entstehen außerhalb eines Raums und werden beim
// Beitritt veröffentlicht, nicht neu geholt: kein zweiter Freigabedialog, kein Kameralicht,
// das kurz aus- und wieder angeht, kein schwarzer Moment beim Einlass.
//
// „Aus" heißt hier: Die Spur wird gestoppt und verworfen, nicht stummgeschaltet. Das
// Kameralicht soll ausgehen, und eine gestoppte Kamera ließe sich ohnehin nicht
// veröffentlichen – LiveKit wartet dafür auf die Maße des ersten Bildes.

const previewCamera = shallowRef<LocalVideoTrack | undefined>(undefined)
const previewMicrophone = shallowRef<LocalAudioTrack | undefined>(undefined)

/**
 * Was im Warteraum eingestellt ist – die Absicht, nicht das Ergebnis. Die Kamera kann gewollt
 * und trotzdem aus sein, wenn der Browser sie verweigert; das steht dann in `camera` und
 * `cameraIssue`. Beim Beitritt zählt die Absicht: Eine verweigerte Kamera wird dort noch
 * einmal versucht, eine ausgeschaltete nicht.
 */
const wanted = { camera: true, microphone: true }

/**
 * Hochgezählt bei jedem Start und Ende der Vorschau. Eine Spur, deren Freigabedialog noch
 * offen war, als die Vorschau endete, kommt danach an und gehört niemandem mehr.
 */
let previewRun = 0

/**
 * Läuft gerade die Übernahme der Vorschau in den Raum, warten Schalter und Gerätewechsel auf
 * ihr Ende. Ein Klick in diese Lücke legte sonst eine zweite Kamera an, während die erste
 * noch veröffentlicht wird.
 */
let adopting: Promise<unknown> | undefined

/** Die Kamera- bzw. Mikrofonspur – aus der Vorschau oder aus dem Raum. */
function localTrack(source: Track.Source): LocalTrack | undefined {
  if (source === Track.Source.Camera && previewCamera.value) return previewCamera.value
  if (source === Track.Source.Microphone && previewMicrophone.value) return previewMicrophone.value
  return room?.localParticipant.getTrackPublication(source)?.track
}

/**
 * Das eigene Kamerabild, im Warteraum wie im Gespräch. Weil die Vorschauspur beim Beitritt
 * dieselbe bleibt, liefert der Stream-Cache dasselbe Objekt – das Bild läuft durch.
 */
export function localVideoStream(): MediaStream | null {
  return streamFor(previewCamera.value) ?? (localIdentity.value ? videoStreamFor(localIdentity.value) : null)
}

/** Der eigene Mikrofonton – für die Pegelanzeige, nie zum Abspielen. */
export function localAudioStream(): MediaStream | null {
  // Gelesen, damit ein Wechsel zwischen Vorschau und Raum neu ausgewertet wird.
  void previewMicrophone.value
  return streamFor(localTrack(Track.Source.Microphone))
}

/**
 * Kamera und Mikrofon für die Einrichtung im Warteraum starten.
 *
 * Nur auf Klick: Der Warteraum steht schon ab dem Tag der Buchung offen, und ein
 * Freigabedialog, den niemand angefordert hat, liest sich wie ein Übergriff.
 */
export async function startPreview(): Promise<void> {
  if (previewing.value || status.value === 'connecting' || status.value === 'connected') return

  log.info('Vorschau starten')
  previewing.value = true
  const run = ++previewRun
  // Direkt am Browser, nicht über den Raum: Den Warmlauf gibt es erst ab dem Zugangsfenster.
  navigator.mediaDevices?.addEventListener('devicechange', devicesChangedListener)

  // Vorab auf die Absicht gesetzt: Bis der Browser antwortet, stünden die Schalter sonst auf
  // „aus" und leuchteten rot, obwohl gleich beides angeht. Scheitert es, korrigiert
  // acquirePreview den Zustand samt Ursache.
  camera.value = wanted.camera
  microphone.value = wanted.microphone
  loadingCamera.value = wanted.camera
  try {
    await acquirePreview(wanted.camera, wanted.microphone, run)
  }
  finally {
    if (run === previewRun) loadingCamera.value = false
  }
  if (run !== previewRun) return
  await refreshDevices()
  await restorePreferredDevices()
}

/** Die Einrichtung beenden, ohne den Raum zu betreten. Mehrfach aufrufbar. */
export function stopPreview(): void {
  // Auch nach dem Flag: Während der Übernahme ist es schon gefallen, die Spuren sind aber
  // noch nicht beim Raum angekommen.
  if (!previewing.value && !previewCamera.value && !previewMicrophone.value) return

  log.info('Vorschau beenden')
  previewRun++
  previewing.value = false
  navigator.mediaDevices?.removeEventListener('devicechange', devicesChangedListener)
  releasePreview()
  camera.value = false
  microphone.value = false
  loadingCamera.value = false
  cameraIssue.value = null
  microphoneIssue.value = null
}

function releasePreview() {
  previewCamera.value?.stop()
  previewMicrophone.value?.stop()
  previewCamera.value = undefined
  previewMicrophone.value = undefined
}

/**
 * Die Spuren der Vorschau anfordern.
 *
 * Erst beide in einem Aufruf – so fragt der Browser einmal statt zweimal. Scheitert das,
 * einzeln: Eine verweigerte Kamera soll das Mikrofon nicht mitreißen, und nur so landet die
 * Ursache beim richtigen Gerät.
 */
async function acquirePreview(video: boolean, audio: boolean, run: number): Promise<void> {
  if (!video && !audio) return
  try {
    const tracks = await createLocalTracks({
      video: video ? captureOptions('videoinput') : false,
      audio: audio ? captureOptions('audioinput') : false,
    })
    if (run !== previewRun) {
      for (const track of tracks) track.stop()
      return
    }
    for (const track of tracks) holdPreviewTrack(track)
  }
  catch (cause) {
    if (run !== previewRun) return
    if (video && audio) {
      await acquirePreview(true, false, run)
      await acquirePreview(false, true, run)
      return
    }
    const issue = classifyDeviceError(cause)
    log.warn(video ? 'Kamera nicht verfügbar' : 'Mikrofon nicht verfügbar', { issue, cause })
    if (video) {
      cameraIssue.value = issue
      camera.value = false
    }
    else {
      microphoneIssue.value = issue
      microphone.value = false
    }
  }
}

function holdPreviewTrack(track: LocalTrack) {
  // Während der Freigabedialog offen war, wieder aus- oder schon zum zweiten Mal
  // eingeschaltet: Diese Spur kommt zu spät und gehört niemandem.
  const isCamera = track.source === Track.Source.Camera
  const held = isCamera ? previewCamera.value : previewMicrophone.value
  if (held || (isCamera ? !wanted.camera : !wanted.microphone)) {
    track.stop()
    return
  }
  track.on(TrackEvent.Restarted, bumpStreams)
  if (isCamera) {
    previewCamera.value = track as LocalVideoTrack
    camera.value = true
    cameraIssue.value = null
  }
  else {
    previewMicrophone.value = track as LocalAudioTrack
    microphone.value = true
    microphoneIssue.value = null
  }
}

async function setPreviewEnabled(source: Track.Source, enabled: boolean): Promise<boolean> {
  const isCamera = source === Track.Source.Camera
  const held = isCamera ? previewCamera : previewMicrophone
  if (isCamera) wanted.camera = enabled
  else wanted.microphone = enabled

  if (!enabled) {
    held.value?.stop()
    held.value = undefined
    if (isCamera) {
      camera.value = false
      cameraIssue.value = null
    }
    else {
      microphone.value = false
      microphoneIssue.value = null
    }
    return true
  }

  if (held.value) return true
  const run = previewRun
  if (isCamera) {
    camera.value = true
    loadingCamera.value = true
  }
  else {
    microphone.value = true
  }
  try {
    await acquirePreview(isCamera, !isCamera, run)
  }
  finally {
    if (isCamera) loadingCamera.value = false
  }
  void refreshDevices()
  return true
}

/**
 * Die Vorschau in den eben betretenen Raum übernehmen – oder, ohne Vorschau, Kamera und
 * Mikrofon einschalten wie bisher.
 *
 * Rückgabe wie bei setCameraEnabled: `false` nur, wenn etwas Unerwartetes passiert ist.
 */
async function adoptPreview(active: Room): Promise<boolean> {
  const fromPreview = previewing.value
  const want = fromPreview ? { ...wanted } : { camera: true, microphone: true }
  if (fromPreview) {
    log.info('Vorschau übernehmen', want)
    previewing.value = false
    navigator.mediaDevices?.removeEventListener('devicechange', devicesChangedListener)
  }

  const cameraOk = await adoptTrack(active, Track.Source.Camera, want.camera)
  if (room !== active) return true
  const microphoneOk = await adoptTrack(active, Track.Source.Microphone, want.microphone)
  return cameraOk && microphoneOk
}

async function adoptTrack(active: Room, source: Track.Source, want: boolean): Promise<boolean> {
  const isCamera = source === Track.Source.Camera
  const held = isCamera ? previewCamera : previewMicrophone
  const track = held.value

  if (!want) {
    track?.stop()
    held.value = undefined
    if (isCamera) camera.value = false
    else microphone.value = false
    return true
  }

  if (track?.mediaStreamTrack.readyState === 'live') {
    try {
      await active.localParticipant.publishTrack(track)
      held.value = undefined
      if (room !== active) return true
      if (isCamera) {
        registerLocalCamera(active.localParticipant)
        camera.value = true
      }
      else {
        microphone.value = true
      }
      return true
    }
    catch (cause) {
      log.warn('Vorschauspur ließ sich nicht veröffentlichen, starte neu', { source, cause })
    }
  }

  track?.stop()
  held.value = undefined
  if (room !== active) return true
  // Zurückgesetzt, damit dieselbe Ursache beim erneuten Versuch wieder als Änderung ankommt –
  // die Coach-App meldet sie über einen watch.
  if (isCamera) cameraIssue.value = null
  else microphoneIssue.value = null
  return isCamera ? enableRoomCamera(true) : enableRoomMicrophone(true)
}

// ---------------------------------------------------------------------------
// Gemerkte Geräte
// ---------------------------------------------------------------------------
// Wer einmal das Headset gewählt hat, will es beim nächsten Termin wieder. Gemerkt werden nur
// die Geräte, nicht an oder aus: Eine vor Tagen ausgeschaltete Kamera soll nicht still
// ausgeschaltet in ein Gespräch gehen.
//
// Gemerkt wird die ID *und* der Name. Die ID allein trägt nicht: Chrome vergibt sie bei jedem
// Laden neu, solange die Freigabe nicht dauerhaft erteilt ist („nur dieses Mal erlauben").
// Der Name – „AirPods Pro", „Logitech BRIO" – bleibt derselbe.

const DEVICE_STORAGE_KEY = 'hxroom:devices'

interface PreferredDevice {
  id: string
  label: string
}

const preferredDevice: Partial<Record<CallDeviceKind, PreferredDevice>> = loadPreferredDevices()

function loadPreferredDevices(): Partial<Record<CallDeviceKind, PreferredDevice>> {
  try {
    const stored = JSON.parse(globalThis.localStorage?.getItem(DEVICE_STORAGE_KEY) ?? '{}')
    const result: Partial<Record<CallDeviceKind, PreferredDevice>> = {}
    for (const kind of ['audioinput', 'videoinput'] as const) {
      const entry = stored?.[kind]
      if (typeof entry?.id === 'string' && typeof entry?.label === 'string') result[kind] = { id: entry.id, label: entry.label }
    }
    return result
  }
  catch {
    return {}
  }
}

function rememberDevice(kind: CallDeviceKind, deviceId: string) {
  const list = kind === 'audioinput' ? microphones.value : cameras.value
  preferredDevice[kind] = { id: deviceId, label: list.find(device => device.id === deviceId)?.label ?? '' }
  try {
    globalThis.localStorage?.setItem(DEVICE_STORAGE_KEY, JSON.stringify(preferredDevice))
  }
  catch {
    // Privater Modus oder volles Kontingent: Dann gilt die Wahl eben nur für diesen Besuch.
  }
}

/**
 * Läuft eine Spur nicht auf dem gemerkten Gerät, jetzt noch dorthin wechseln.
 *
 * Nötig, weil die gemerkte ID veraltet sein kann (siehe oben) – LiveKit nimmt dann nach dem
 * exakten Versuch das Standardgerät. Nach der Freigabe nennt der Browser die Geräte beim
 * Namen, das gemerkte lässt sich darüber wiederfinden, und der Wechsel gelingt ohne weiteren
 * Dialog. Die neue ID wird gemerkt. Nur für Geräte, die angeschlossen sind und senden.
 */
async function restorePreferredDevices(): Promise<void> {
  const kinds = [
    { kind: 'audioinput', source: Track.Source.Microphone, active: activeMicrophoneId, list: microphones },
    { kind: 'videoinput', source: Track.Source.Camera, active: activeCameraId, list: cameras },
  ] as const
  for (const { kind, source, active, list } of kinds) {
    const preferred = preferredDevice[kind]
    if (!preferred) continue
    const match = list.value.find(device => device.id === preferred.id)
      ?? list.value.find(device => preferred.label !== '' && device.label === preferred.label)
    if (!match || active.value === match.id) continue
    if (localTrack(source)?.mediaStreamTrack.readyState !== 'live') continue
    log.info('Gemerktes Gerät nachträglich wählen', { kind })
    await changeDevice(kind, match.id, true)
  }
}

/** Das gemerkte Gerät als String – LiveKit versucht es exakt und nimmt sonst das nächstbeste. */
function captureOptions(kind: CallDeviceKind): { deviceId: string } | true {
  const deviceId = preferredDevice[kind]?.id
  return deviceId ? { deviceId } : true
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
  await adopting
  if (previewing.value) return setPreviewEnabled(Track.Source.Camera, enabled)
  return enableRoomCamera(enabled)
}

/** Ohne das Warten auf die Übernahme – die ruft selbst hierher und wartete sonst auf sich. */
async function enableRoomCamera(enabled: boolean): Promise<boolean> {
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

  registerLocalCamera(local)
  // Erst nach der Freigabe nennt der Browser die Geräte beim Namen.
  void refreshDevices()
  return true
}

/** Die eigene Kameraspur für Bühne und Stream-Cache bekannt machen. */
function registerLocalCamera(local: LocalParticipant) {
  const publication = local.getTrackPublication(Track.Source.Camera)
  if (!publication?.track) return
  log.info('Eigene Videospur', { identity: local.identity, sid: publication.track.sid })
  videoTracks[local.identity] = publication.track
  publication.track.off(TrackEvent.Restarted, bumpStreams)
  publication.track.on(TrackEvent.Restarted, bumpStreams)
  // Aus und wieder an käme sonst in voller Auflösung zurück, mitten in einer Freigabe.
  if (screenSharing.value) setCameraBudget(true)
}

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

  const media = localTrack(source)?.mediaStreamTrack
  const settings = media?.readyState === 'live' ? media.getSettings() : undefined
  const chosen = previewing.value ? preferredDevice[kind]?.id : room?.getActiveDevice(kind) ?? preferredDevice[kind]?.id
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
  const media = localTrack(source)?.mediaStreamTrack
  if (!media || media.readyState !== 'ended') return
  if (source === Track.Source.Camera && !camera.value) return
  if (source === Track.Source.Microphone && !microphone.value) return

  const fallback = (kind === 'audioinput' ? microphones.value : cameras.value)[0]
  if (!fallback) return

  log.warn('Gerät verschwunden, weiche aus', { kind, to: fallback.id })
  await changeDevice(kind, fallback.id, false)
}

/**
 * Auf ein anderes Gerät wechseln – die laufende Spur wird mit ihm neu gestartet, das Gegenüber
 * bekommt dasselbe Bild bzw. denselben Ton ohne Unterbrechung des Gesprächs. Ist Kamera oder
 * Mikrofon gerade aus, gilt die Wahl für das nächste Einschalten.
 *
 * Die Auswahl springt sofort um, damit das Menü nicht hinter dem Klick herhinkt; scheitert der
 * Wechsel – das Gerät ist belegt oder inzwischen weg –, springt sie zurück und die Ursache
 * steht in cameraIssue bzw. microphoneIssue.
 *
 * Im Warteraum gilt dasselbe für die Vorschauspur. Die Wahl wird gemerkt, für den Beitritt
 * und für den nächsten Termin.
 */
export async function switchDevice(kind: CallDeviceKind, deviceId: string): Promise<boolean> {
  await adopting
  return changeDevice(kind, deviceId, true)
}

/**
 * Der Wechsel selbst. `remember` nur, wenn jemand gewählt hat: Weicht die Spur einem
 * abgezogenen Headset aus, soll das Headset beim nächsten Termin trotzdem wieder vorn stehen.
 */
async function changeDevice(kind: CallDeviceKind, deviceId: string, remember: boolean): Promise<boolean> {
  const active = kind === 'audioinput' ? activeMicrophoneId : activeCameraId
  const issue = kind === 'audioinput' ? microphoneIssue : cameraIssue
  const current = room
  if (!previewing.value && !current) return false
  if (active.value === deviceId) return true

  const previous = active.value
  active.value = deviceId

  try {
    const previewTrack = kind === 'audioinput' ? previewMicrophone.value : previewCamera.value
    const switched = previewing.value
      ? await (previewTrack?.setDeviceId({ exact: deviceId }) ?? true)
      : await current!.switchActiveDevice(kind, deviceId)
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

  if (remember) rememberDevice(kind, deviceId)
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

/** Mikrofon an oder aus. Rückgabe wie bei der Kamera. */
export async function setMicrophoneEnabled(enabled: boolean): Promise<boolean> {
  await adopting
  if (previewing.value) return setPreviewEnabled(Track.Source.Microphone, enabled)
  return enableRoomMicrophone(enabled)
}

async function enableRoomMicrophone(enabled: boolean): Promise<boolean> {
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
 * Wie viel Uplink die eigene Kamera beanspruchen darf.
 *
 * Wer teilt, sendet zwei Videospuren über dieselbe Leitung, und die Kamera ist in diesem
 * Moment eine Daumennagel-Kachel neben der Freigabe. Ohne diesen Griff nimmt sie sich
 * trotzdem ihre volle Bitrate – gemessen an einer echten Sitzung mehr als die Freigabe
 * selbst.
 *
 * `setPublishingQuality` schaltet die oberen Simulcast-Ebenen ab, ohne die Spur neu zu
 * veröffentlichen: Das Bild der Gegenseite wird kleiner, reißt aber nicht ab. Es greift,
 * weil die Kamera weiterhin mit Simulcast sendet – abgeschaltet ist er nur für die Freigabe
 * (siehe quality.ts), und beides sind Angaben je Spur.
 */
function setCameraBudget(sharing: boolean) {
  const track = room?.localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack
  if (!track) return
  track.setPublishingQuality(sharing ? LivekitVideoQuality.LOW : LivekitVideoQuality.HIGH)
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
    const publication = await local.setScreenShareEnabled(enabled, screenShareCaptureOptions(), SCREEN_SHARE_PUBLISH)
    if (enabled && publication === undefined) return false
    if (enabled && publication?.videoTrack) {
      screenShareVideoTrack.value = publication.videoTrack
      screenShareBy.value = local.identity
    }
    if (!enabled) clearScreenShare(local.identity)
    screenSharing.value = enabled
    setCameraBudget(enabled)
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
    setCameraBudget(false)
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

  const camera = participant.getTrackPublication(Track.Source.Camera)
  const microphone = participant.getTrackPublication(Track.Source.Microphone)
  const entry: CallParticipant = {
    id: participant.identity,
    name: participant.name || participant.identity,
    cameraMuted: camera?.isMuted ?? false,
    microphoneMuted: microphone?.isMuted ?? false,
  }
  participants.value.push(entry)
  if (!participant.isLocal) watchForMissingTracks(participant.identity)
  return entry
}

/**
 * Wer ohne Kamera beitritt – im Warteraum ausgeschaltet oder vom Browser verweigert –,
 * veröffentlicht gar keine Spur, und dann kommt auch kein „stummgeschaltet". Ohne diese
 * Prüfung stünde beim Gegenüber dauerhaft „… verbindet sich".
 *
 * Mit Schonfrist: Wer normal beitritt, veröffentlicht erst kurz nach dem Verbinden. Ohne sie
 * blitzte bei jedem Beitritt „Kamera aus" auf, bevor das Bild kommt.
 */
const MISSING_TRACK_GRACE_MS = 2500

function watchForMissingTracks(identity: string) {
  const active = room
  setTimeout(() => {
    if (room !== active) return
    const participant = active?.remoteParticipants.get(identity)
    const entry = findParticipant(identity)
    if (!participant || !entry) return
    if (!participant.getTrackPublication(Track.Source.Camera)) entry.cameraMuted = true
    if (!participant.getTrackPublication(Track.Source.Microphone)) entry.microphoneMuted = true
  }, MISSING_TRACK_GRACE_MS)
}

function trackPublishedListener(publication: RemoteTrackPublication, participant: RemoteParticipant) {
  const entry = findParticipant(participant.identity)
  if (!entry) return
  if (publication.source === Track.Source.Camera) entry.cameraMuted = publication.isMuted
  else if (publication.source === Track.Source.Microphone) entry.microphoneMuted = publication.isMuted
}

/** Eine zurückgezogene Kamera ist für das Gegenüber dasselbe wie eine ausgeschaltete. */
function trackUnpublishedListener(publication: RemoteTrackPublication, participant: RemoteParticipant) {
  const entry = findParticipant(participant.identity)
  if (!entry) return
  if (publication.source === Track.Source.Camera) entry.cameraMuted = true
  else if (publication.source === Track.Source.Microphone) entry.microphoneMuted = true
}

// ---------------------------------------------------------------------------
// Messung
// ---------------------------------------------------------------------------

/**
 * Was die Videospuren gerade wirklich übertragen – Auflösung, Bildrate, Bitrate, Codec.
 *
 * Für die Abnahme eines Sendeprofils und für den Fall, dass jemand fragt, woran ein weiches
 * Bild liegt. Zweimal hintereinander aufrufen: Die Bitrate ist eine Differenz und steht erst
 * beim zweiten Aufruf.
 */
export function videoQuality(): Promise<VideoQuality[]> {
  return collectVideoQuality(room)
}

/** Dasselbe als eine Zeile je Spur, zum Hineinschauen in der Konsole. */
export async function logVideoQuality(): Promise<void> {
  log.info('Videoqualität\n' + formatVideoQuality(await collectVideoQuality(room)))
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
    previewing,
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
    localVideoStream,
    localAudioStream,

    // Geräte
    microphones,
    cameras,
    activeMicrophoneId,
    activeCameraId,
    refreshDevices,
    switchDevice,

    // Aktionen
    startPreview,
    stopPreview,
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
