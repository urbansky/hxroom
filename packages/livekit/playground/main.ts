import { watchEffect } from 'vue'
import {
  configureLivekit,
  joinCall,
  leaveCall,
  prepareCall,
  setScreenShareEnabled,
  toggleCamera,
  toggleMicrophone,
  useCallRoom,
} from '../index'

// Prüfstand für die Call-Schicht – ohne App, ohne Anmeldung, ohne API.
//
// Solange keine App das Paket einbindet, führt nichts diesen Code aus; ein grüner Typecheck
// sagt nur, dass sich alles auflösen lässt. Hier lässt sich in einem Durchlauf sehen, ob
// Warmlauf, Beitritt, Spuren, Geräte und das Aufräumen tun, was sie sollen.
//
// Das Token kommt aus dem LiveKit-CLI, die Gegenstelle aus `lk room join --publish-demo`:
//
//   lk token create --api-key devkey --api-secret <secret> \
//     --room probe --identity coach_probe --join --valid-for 30m
//   lk room join --publish-demo --room probe --identity client_probe --url ws://localhost:7880
//
// Kamerafälle in Chrome prüfen: getUserMedia() verlangt einen sicheren Kontext, und Safari
// zählt *.localhost nicht dazu (technisches-konzept.md §15).

const call = useCallRoom()

const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T
const urlInput = el<HTMLInputElement>('url')
const tokenInput = el<HTMLInputElement>('token')
const localVideo = el<HTMLVideoElement>('local')
const remoteVideo = el<HTMLVideoElement>('remote')
const stateBox = el<HTMLPreElement>('state')

function configure() {
  configureLivekit(urlInput.value.trim(), tokenInput.value.trim() || undefined)
}

el('prepare').onclick = () => { configure(); void prepareCall() }
el('join').onclick = () => { configure(); void joinCall() }
el('camera').onclick = () => { void toggleCamera() }
el('microphone').onclick = () => { void toggleMicrophone() }
el('share').onclick = () => { void setScreenShareEnabled(!call.screenSharing.value) }
el('leave').onclick = () => { void leaveCall() }

// Die eigene Spur und die der Gegenstelle an je ein <video> hängen. Die Bildschirmfreigabe
// hat Vorrang im rechten Bild – so ist gleich zu sehen, ob sie ankommt.
watchEffect(() => {
  const identity = call.localIdentity.value
  const own = identity ? call.videoTracks[identity] : undefined
  attach(localVideo, own?.mediaStreamTrack)

  const other = call.remoteParticipants().find(participant => call.videoTracks[participant.id])
  const remote = call.screenShareVideoTrack.value ?? (other ? call.videoTracks[other.id] : undefined)
  attach(remoteVideo, remote?.mediaStreamTrack)
})

function attach(video: HTMLVideoElement, track: MediaStreamTrack | undefined) {
  if (!track) {
    video.srcObject = null
    return
  }
  const current = video.srcObject as MediaStream | null
  if (current?.getVideoTracks()[0] === track) return
  video.srcObject = new MediaStream([track])
}

watchEffect(() => {
  stateBox.textContent = JSON.stringify({
    status: call.status.value,
    joinFailure: call.joinFailure.value,
    localIdentity: call.localIdentity.value,
    camera: call.camera.value,
    cameraIssue: call.cameraIssue.value,
    microphone: call.microphone.value,
    microphoneIssue: call.microphoneIssue.value,
    screenSharing: call.screenSharing.value,
    participants: call.participants.value,
    videoTracks: Object.keys(call.videoTracks),
    audioTracks: Object.keys(call.audioTracks),
  }, null, 2)
})
