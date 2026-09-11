// Geteilte Call-Mechanik: die Verbindung zum LiveKit-Raum, Geräte und Spuren.
//
// Das Paket enthält bewusst keine Komponenten. Die Call-Oberfläche liegt in der jeweiligen
// App und bindet an die Refs aus `useCallRoom()`; was Coach und Klient unterscheidet, sind
// dort gewöhnliche Props und Slots. Beide Konsumenten sind Bundler (Nuxt-Vite und die
// Vite-SPA `apps/bookingpage`), deshalb wird die Quelle ausgeliefert und nicht gebaut.

export { configureLivekit, prepareCall, joinCall, leaveCall } from './src/room'

export {
  setCameraEnabled,
  setMicrophoneEnabled,
  toggleCamera,
  toggleMicrophone,
  setScreenShareEnabled,
  sendCallData,
  classifyDeviceError,
} from './src/room'

export { useCallRoom } from './src/room'

export type { CallParticipant, RoomStatus, DeviceIssue, JoinFailure } from './src/types'
