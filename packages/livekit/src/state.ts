import { ref } from 'vue'
import type { CallParticipant, DeviceIssue, JoinFailure, RoomStatus } from './types'

/**
 * Der Zustand des laufenden Calls – reine Refs, ohne Kenntnis von LiveKit.
 *
 * Diese Datei importiert nichts außer `vue` und den eigenen Typen. Das ist Absicht: Vorher
 * verwiesen Zustand, Verbindung und Aktionen im Kreis aufeinander, was nur deshalb
 * funktionierte, weil alle Zugriffe erst zur Laufzeit stattfanden. Jetzt zeigt `room.ts`
 * hierher und nicht umgekehrt.
 *
 * Modulweite Refs, also ein Call pro Browser-Tab. Für `apps/coach` (`ssr: false`) und die
 * SPA `apps/bookingpage` ist das richtig. Würde eine der beiden je serverseitig gerendert,
 * wäre dieser Zustand auf dem Server zwischen allen Nutzern geteilt.
 */

export const status = ref<RoomStatus>('idle')
/** Gesetzt, solange `status` auf `failed` steht. */
export const joinFailure = ref<JoinFailure | null>(null)

export const participants = ref<CallParticipant[]>([])
/** Die eigene LiveKit-Identität, sobald der Raum steht. */
export const localIdentity = ref<string | null>(null)

/** Ob die eigene Kamera bzw. das eigene Mikrofon gerade sendet. */
export const camera = ref(false)
export const microphone = ref(false)
/** Die Kamera braucht spürbar Zeit zum Anlaufen – die Oberfläche soll das zeigen können. */
export const loadingCamera = ref(false)
export const cameraIssue = ref<DeviceIssue | null>(null)
export const microphoneIssue = ref<DeviceIssue | null>(null)

/** Ob die eigene Bildschirmfreigabe läuft. */
export const screenSharing = ref(false)

export function findParticipant(id: string): CallParticipant | undefined {
  return participants.value.find(participant => participant.id === id)
}

/** Alle außer einem selbst. Bei 1:1 ist das genau einer – aber eben nicht per Annahme. */
export function remoteParticipants(): CallParticipant[] {
  return participants.value.filter(participant => participant.id !== localIdentity.value)
}

export function resetState(next: RoomStatus = 'idle') {
  status.value = next
  joinFailure.value = null
  participants.value = []
  localIdentity.value = null
  camera.value = false
  microphone.value = false
  loadingCamera.value = false
  cameraIssue.value = null
  microphoneIssue.value = null
  screenSharing.value = false
}
