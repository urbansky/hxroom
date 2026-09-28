import { ref } from 'vue'
import type { LocalVideoTrack } from 'livekit-client'
import { createLogger } from './logger'

// Hintergrund weichzeichnen (doc/videocall-umsetzungsplan.md, Nachtrag „Hintergrund
// weichzeichnen"). Viele Klienten sitzen in Küche oder Kinderzimmer (project.md §5a).
//
// `@livekit/track-processors` hängt einen Prozessor an die lokale Kameraspur: MediaPipe
// trennt Person und Hintergrund, der Hintergrund wird weichgezeichnet – im Browser des
// Absenders. Das Gegenüber bekommt schon das fertige Bild; LiveKit veröffentlicht und zeigt
// über `mediaStreamTrack` von selbst die bearbeitete Spur, und `restartTrack` (Gerätewechsel,
// Kamera wieder an) startet den Prozessor mit.
//
// Der Prozessor hängt einmal an und wird dann per `switchTo` zwischen weich und `disabled`
// umgeschaltet – so empfiehlt es das Paket, weil `setProcessor`/`stopProcessor` beim Umschalten
// Bildfehler erzeugen.
//
// Bekannt und bewusst vorerst so: Das Paket lädt WASM und Modell von jsDelivr und
// storage.googleapis.com (technisches-konzept.md §16). Selbst ausliefern über `assetPaths`
// kommt als eigener Schritt.

const log = createLogger('HxRoom:Blur')

const STORAGE_KEY = 'hxroom:background-blur'
/** Stärke des Weichzeichners – der Standard des Pakets. */
const BLUR_RADIUS = 10

/**
 * Gewünscht, nicht erreicht: Ob der Hintergrund weichgezeichnet werden soll. Gemerkt je
 * Browser – wer einmal weichzeichnet, sitzt meist immer am selben Ort, und „gemerkt an" zeigt
 * nie mehr als gewollt (entschieden 2026-09-28).
 */
export const backgroundBlur = ref(readPreference())
/** Das Modell lädt beim ersten Einschalten ein, zwei Sekunden – die Oberfläche soll das zeigen. */
export const blurLoading = ref(false)

function readPreference(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === 'on'
  }
  catch {
    return false
  }
}

export function storeBlurPreference(on: boolean): void {
  backgroundBlur.value = on
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, on ? 'on' : 'off')
  }
  catch {
    // Privater Modus oder gesperrter Speicher: Dann gilt die Wahl nur für diesen Besuch.
  }
}

/**
 * Kann dieser Browser das? Nachgebildet aus `supportsBackgroundProcessors()` des Pakets
 * (0.8.1: `BackgroundProcessor.isSupported && ProcessorWrapper.isSupported`) – damit das Paket
 * nicht schon für die Frage geladen wird, ob der Schalter erscheint.
 */
export function backgroundBlurSupported(): boolean {
  if (typeof document === 'undefined') return false
  const hasTransformer = typeof OffscreenCanvas !== 'undefined'
    && typeof VideoFrame !== 'undefined'
    && typeof createImageBitmap !== 'undefined'
    && !!document.createElement('canvas').getContext('webgl2')
  const hasStreamApi = typeof (globalThis as Record<string, unknown>).MediaStreamTrackGenerator !== 'undefined'
    && typeof (globalThis as Record<string, unknown>).MediaStreamTrackProcessor !== 'undefined'
  const hasFallback = typeof HTMLCanvasElement !== 'undefined'
    && typeof VideoFrame !== 'undefined'
    && 'captureStream' in HTMLCanvasElement.prototype
  return hasTransformer && (hasStreamApi || hasFallback)
}

type Processors = typeof import('@livekit/track-processors')
type BlurProcessor = ReturnType<Processors['BackgroundProcessor']>

/** Erst beim ersten Einschalten geladen: Wer nie weichzeichnet, lädt nichts davon. */
let processorsModule: Promise<Processors> | undefined
function loadProcessors(): Promise<Processors> {
  processorsModule ??= import('@livekit/track-processors')
  return processorsModule
}

/** Nacheinander: Zwei schnelle Klicks sollen nicht zwei Prozessoren an dieselbe Spur hängen. */
let queue: Promise<unknown> = Promise.resolve()

/**
 * Die Spur auf den gewünschten Stand bringen. Ohne Prozessor und ohne Wunsch passiert nichts –
 * das Paket wird nicht geladen. Gibt `true` zurück, wenn sich die gesendete Spur geändert hat
 * (dann muss das eigene Bild neu angestoßen werden).
 */
export function applyBlur(track: LocalVideoTrack | undefined): Promise<boolean> {
  const run = queue.then(() => applyNow(track))
  queue = run.catch(() => undefined)
  return run
}

async function applyNow(track: LocalVideoTrack | undefined): Promise<boolean> {
  if (!track) return false

  const want = backgroundBlur.value
  const existing = track.getProcessor() as BlurProcessor | undefined
  if (!existing && !want) return false
  // Eine gestoppte Spur (Kamera aus) bekommt keinen neuen Prozessor – das geschieht, sobald
  // sie wieder eingeschaltet wird. Ein vorhandener überlebt das Aus und wird nur umgestellt.
  if (!existing && track.mediaStreamTrack?.readyState === 'ended') return false

  const options = want
    ? { mode: 'background-blur' as const, blurRadius: BLUR_RADIUS }
    : { mode: 'disabled' as const }
  // Schon so: etwa bei der Spur aus dem Warteraum, die beim Einlass mitsamt Prozessor in den
  // Raum wandert.
  if (existing?.mode === options.mode) return false

  blurLoading.value = want
  try {
    if (existing) {
      await existing.switchTo(options)
      return false
    }
    const { BackgroundProcessor } = await loadProcessors()
    // Erneut gelesen: Während das Paket lud, kann die Wahl schon wieder gewechselt haben.
    const processor = BackgroundProcessor(backgroundBlur.value ? options : { mode: 'disabled' })
    await track.setProcessor(processor)
    log.info('Weichzeichner angehängt', { mode: processor.mode })
    return true
  }
  catch (cause) {
    // Ein Weichzeichner, der nicht startet, darf das Bild nicht kosten – die Spur läuft ohne
    // weiter, und der Schalter geht zurück.
    log.error('Weichzeichner ließ sich nicht schalten', cause)
    storeBlurPreference(false)
    return false
  }
  finally {
    blurLoading.value = false
  }
}
