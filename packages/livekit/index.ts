// Geteilte Call-Mechanik: die Verbindung zum LiveKit-Raum, Geräte und Spuren.
//
// Das Paket enthält bewusst keine Komponenten. Die Call-Oberfläche liegt in der jeweiligen
// App und bindet an die Refs aus `useCallRoom()`; was Coach und Klient unterscheidet, sind
// dort gewöhnliche Props und Slots. Beide Konsumenten sind Bundler (Nuxt-Vite und die
// Vite-SPA `apps/bookingpage`), deshalb wird die Quelle ausgeliefert und nicht gebaut.

export { configureLivekit, prepareCall, joinCall, leaveCall } from './src/room'

// Geräte einrichten im Warteraum: Kamera und Mikrofon vor dem Beitritt, übernommen beim Einlass.
export { startPreview, stopPreview, localVideoStream, localAudioStream } from './src/room'

export {
  setCameraEnabled,
  setMicrophoneEnabled,
  toggleCamera,
  toggleMicrophone,
  setScreenShareEnabled,
  sendCallData,
  classifyDeviceError,
} from './src/room'

// Spuren in der Form, die ein <video>/<audio>-Element erwartet. Liegt hier, damit
// packages/ui frei von LiveKit bleibt und beide Apps dieselbe Umwandlung nutzen (B4).
export { videoStreamFor, audioStreamFor, screenShareStream, screenShareAudioStream, screenShareSupported } from './src/room'

// Geräte: Liste ohne Chromes Doppelung des Standardgeräts, echter Wechsel der laufenden Spur.
export { refreshDevices, switchDevice } from './src/room'

// Messung für die Abnahme von Sendeprofilen – nicht für die Oberfläche.
export { videoQuality, logVideoQuality } from './src/room'
export type { VideoQuality } from './src/stats'

export { useCallRoom } from './src/room'

export type { CallParticipant, RoomStatus, DeviceIssue, JoinFailure, CallDeviceKind, CallMediaDevice, ScreenShareIssue } from './src/types'
