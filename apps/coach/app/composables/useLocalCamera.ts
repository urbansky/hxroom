/**
 * Das eigene Kamerabild – der erste Schritt aus dem Prototyp heraus.
 *
 * **POC.** Hier steht nur `getUserMedia()`, keine LiveKit-Verbindung: Das Bild bleibt im
 * Browser des Coachs und wird nirgendwohin übertragen. Der Zweck ist der Blick auf die
 * eigene Kamera – wie die Oberfläche über einem wirklich bewegten Bild wirkt und ob die
 * Freigabe im Alltag glatt durchläuft. Mit B4/B5 wandert die Spur in den LiveKit-Room, und
 * der Aufruf hier wird durch das Geräte-Handling aus `packages/livekit` ersetzt.
 *
 * Der Strom hängt an einem Schalter (`active`) statt an einem `start()` im Aufrufer: Die
 * Kamera-Leuchte muss ausgehen, sobald der Coach die Kamera ausschaltet, und sie muss
 * ausgehen, wenn die Seite verlassen wird. Beides ist hier eine Stelle, keine zwei.
 */
export function useLocalCamera(active: Ref<boolean>) {
  /** shallowRef: Ein MediaStream ist ein lebendes Objekt, kein Datensatz zum Nachverfolgen. */
  const stream = shallowRef<MediaStream | null>(null)
  /** Gesetzt, sobald die Freigabe scheitert – als fertiger Satz für den Coach. */
  const error = ref<string | null>(null)

  // Wer schnell zweimal schaltet, hat zwei Anfragen in der Luft. Die Nummer entscheidet,
  // welche ihr Ergebnis noch setzen darf; die überholte gibt ihre Spuren sofort wieder frei,
  // sonst bliebe die Kamera-Leuchte an, ohne dass ein Bild zu sehen wäre.
  let generation = 0

  function release(media: MediaStream) {
    for (const track of media.getTracks()) track.stop()
  }

  async function start() {
    const mine = ++generation
    error.value = null

    // Kamera gibt es nur im sicheren Kontext. Chrome und Firefox zählen *.localhost dazu,
    // Safari nicht (technisches-konzept.md §15) – dort fehlt `mediaDevices` schlicht.
    if (!navigator.mediaDevices?.getUserMedia) {
      error.value = 'Die Kamera braucht eine sichere Verbindung (HTTPS). In diesem Browser steht sie hier nicht zur Verfügung.'
      return
    }

    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })

      if (mine !== generation) {
        release(media)
        return
      }
      stream.value = media
    }
    catch (cause) {
      if (mine !== generation) return
      error.value = describeCameraError(cause)
    }
  }

  function stop() {
    generation++
    if (!stream.value) return
    release(stream.value)
    stream.value = null
  }

  watch(active, (on) => { on ? start() : stop() }, { immediate: true })

  // Auch bei einem Routenwechsel mitten im Gespräch: Ohne das bliebe die Kamera an.
  onScopeDispose(stop)

  return { stream, error }
}

/**
 * Warum es nicht geklappt hat – in der Sprache des Coachs, nicht in der des Browsers.
 * Die Namen sind genormt, die Meldungen dahinter nicht: Chrome, Safari und Firefox
 * formulieren denselben Fall verschieden, und "NotReadableError" hilft niemandem weiter.
 */
function describeCameraError(cause: unknown): string {
  const name = cause instanceof DOMException ? cause.name : ''

  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Der Zugriff auf die Kamera ist blockiert. Du kannst ihn links in der Adresszeile wieder erlauben.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Es wurde keine Kamera gefunden.'
    case 'NotReadableError':
      return 'Die Kamera ist gerade von einem anderen Programm belegt.'
    default:
      return 'Die Kamera ließ sich nicht starten.'
  }
}
