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
  /**
   * LiveKit hört von diesem Teilnehmer gerade nichts – seine Verbindung ist abgerissen und
   * wird womöglich gleich wiederhergestellt (B6). Sein Bild steht dann eingefroren da; die
   * Oberfläche soll sagen, warum.
   */
  connectionLost: boolean
}

/**
 * Verbindungszustand des LiveKit-Raums.
 *
 * Nicht zu verwechseln mit `CallState` aus `@hxroom/shared` – das ist der Zustand der
 * Buchung (wartet, eingelassen, beendet) und kommt von der API, nicht vom Medienserver.
 */
export type RoomStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'failed' | 'ended'

/**
 * Warum eine bestehende Verbindung weg ist, wenn `status` nach einem Gespräch auf `failed`
 * steht (B6). Die Unterscheidung bestimmt, was die Oberfläche anbietet:
 *
 * - `network`: Die Leitung ist abgerissen, und LiveKit hat das Wiederverbinden aufgegeben.
 *   Sobald das Netz zurück ist, darf die App von selbst neu beitreten.
 * - `elsewhere`: Dieselbe Person ist in einem anderen Tab beigetreten (DUPLICATE_IDENTITY).
 *   Hier darf nichts von selbst neu verbinden – sonst werfen sich zwei Tabs gegenseitig
 *   hinaus. Zurück geht es nur auf ausdrücklichen Wunsch.
 */
export type ConnectionLoss = 'network' | 'elsewhere'

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

/**
 * Warum eine Bildschirmfreigabe nicht zustande kam – nur die Fälle, die jemandem etwas sagen.
 * Wer im Auswahldialog des Browsers abbricht, hat nichts falsch gemacht; dafür gibt es keinen
 * Wert.
 *
 * `system` ist der Fall, für den es diese Unterscheidung überhaupt gibt: Unter macOS braucht
 * der Browser eine eigene Berechtigung zur Bildschirmaufnahme. Fehlt sie, meldet Chrome
 * „Permission denied by system", und ohne Hinweis passiert nach dem Klick schlicht nichts.
 */
export type ScreenShareIssue = 'system' | 'unknown'

/** Welche Art Eingabegerät – die Namen des Browsers, damit sie ohne Übersetzung durchgehen. */
export type CallDeviceKind = 'audioinput' | 'videoinput'

/**
 * Ein wählbares Eingabegerät.
 *
 * `label` kommt roh vom Browser und kann leer sein: Vor der ersten Freigabe verrät er keine
 * Gerätenamen. Den Ersatztext setzt die App – Formulierungen gehören dorthin, siehe
 * DeviceIssue.
 */
export interface CallMediaDevice {
  id: string
  label: string
}
