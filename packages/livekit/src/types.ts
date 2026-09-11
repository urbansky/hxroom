/**
 * Ein Teilnehmer im Raum, so wie ihn die Oberfläche braucht.
 *
 * Bewusst eine Liste und kein Paar aus „ich" und „der andere": HxRoom führt 1:1-Gespräche,
 * aber ein auf zwei Personen verdrahtetes Modell müsste für jeden weiteren Teilnehmer
 * wieder aufgemacht werden. Wer der lokale ist, sagt `localIdentity`.
 */
export interface CallParticipant {
  /** LiveKit-Identität, also `coach_<userId>` oder `client_<bookingId>`. */
  id: string
  name: string
  cameraMuted: boolean
  microphoneMuted: boolean
}

/**
 * Verbindungszustand des LiveKit-Raums.
 *
 * Nicht zu verwechseln mit `CallState` aus `@hxroom/shared` – das ist der Zustand der
 * Buchung (wartet, eingelassen, beendet) und kommt von der API, nicht vom Medienserver.
 */
export type RoomStatus = 'idle' | 'connecting' | 'connected' | 'failed' | 'ended'

/**
 * Warum ein Gerät nicht zur Verfügung steht – als Ursache, nicht als Satz.
 *
 * Die Formulierungen gehören in die App: Der Coach liest andere Worte als der Klient, und
 * übersetzt werden müssen sie ohnehin dort. Die Unterscheidung selbst ist der Grund, warum
 * diese Schicht überhaupt existiert – Chrome, Safari und fehlende Hardware melden denselben
 * Fall auf drei verschiedene Arten.
 */
export type DeviceIssue =
  /** Der Nutzer oder eine Richtlinie hat die Freigabe verweigert. */
  | 'denied'
  /** Kein passendes Gerät gefunden. */
  | 'notFound'
  /** Vorhanden, aber von einem anderen Programm belegt. */
  | 'busy'
  /** Kein sicherer Kontext: Ohne HTTPS gibt der Browser die Kamera gar nicht erst her. */
  | 'insecure'
  | 'unknown'

/** Woran der Beitritt gescheitert ist, wenn `status` auf `failed` steht. */
export type JoinFailure = 'network' | 'devices'
