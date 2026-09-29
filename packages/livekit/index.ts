// Geteilte Call-Mechanik: die Verbindung zum LiveKit-Raum, Geräte und Spuren.
//
// Das Paket enthält bewusst keine Komponenten. Die Call-Oberfläche liegt in der jeweiligen
// App und bindet an die Refs aus `useCallRoom()`; was Coach und Klient unterscheidet, sind
// dort gewöhnliche Props und Slots. Beide Konsumenten sind Bundler (Nuxt-Vite und die
// Vite-SPA `apps/bookingpage`), deshalb wird die Quelle ausgeliefert und nicht gebaut.

export { configureLivekit, prepareCall, joinCall, leaveCall, clearConnectionLoss } from './src/room'

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

// Hintergrund weichzeichnen – im Warteraum wie im Gespräch, je Browser gemerkt.
export { setBackgroundBlur, backgroundBlurSupported } from './src/room'
export { backgroundBlur, blurLoading } from './src/blur'

// Geräte: Liste ohne Chromes Doppelung des Standardgeräts, echter Wechsel der laufenden Spur.
export { refreshDevices, switchDevice } from './src/room'

// Messung für die Abnahme von Sendeprofilen und die Fehlersuche – in der Oberfläche nur im
// Debug-Modus (`?debug=1`).
export { callQuality, logVideoQuality } from './src/room'
export type { CallQuality, ConnectionQuality, VideoQuality } from './src/stats'

export { useCallRoom } from './src/room'

export type { CallParticipant, RoomStatus, ConnectionLoss, DeviceIssue, JoinFailure, CallDeviceKind, CallMediaDevice, ScreenShareIssue } from './src/types'
