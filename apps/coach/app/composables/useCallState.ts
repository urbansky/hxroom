import type { CallAccessResponse, CallState } from '@hxroom/shared'

/** Zustände, nach denen nichts mehr kommt – dort wird der Ereignisstrom geschlossen. */
const FINAL_STATES: CallState[] = ['ended', 'cancelled', 'expired']

/** Sekundentakt für Wartezeit, Sitzungsdauer und das Erkennen von Fensterwechseln. */
const TICK_MS = 1000

function isFinal(state: CallState): boolean {
  return FINAL_STATES.includes(state)
}

/**
 * Zustand des Videocalls für den Coach – das Gegenstück zu useCallState in der
 * Klienten-App (apps/bookingpage), mit drei Unterschieden:
 *
 * 1. Kein Eintritt: Der Coach betritt keinen Warteraum, sein Einstieg ist ein reiner
 *    Abruf. Er läuft trotzdem vor dem Ereignisstrom, und zwar aus demselben Grund wie
 *    dort – ein EventSource kann den HTTP-Status nicht lesen und verbände bei fehlender
 *    Berechtigung endlos neu, statt den Fehler zu zeigen.
 * 2. Session statt Token: Das Cookie liegt auf dem API-Host, deshalb withCredentials.
 * 3. Zwei Aktionen: Einlassen und Beenden.
 */
export function useCallState(bookingId: string) {
  const { $api } = useApi()
  const { public: { apiUrl } } = useRuntimeConfig()

  const phase = ref<'loading' | 'ready' | 'error'>('loading')
  const call = ref<CallAccessResponse | null>(null)
  const loadError = ref('')
  const actionError = ref('')
  const pending = ref(false)
  /** Reaktive Jetzt-Zeit; ohne sie stünden Wartezeit und Sitzungstimer still. */
  const now = ref(new Date())

  let source: EventSource | null = null
  let ticker: ReturnType<typeof setInterval> | undefined

  function closeStream() {
    source?.close()
    source = null
  }

  function openStream() {
    if (source) return

    // apiUrl trägt in dieser App bereits /api/v1 – anders als in der Klienten-App.
    source = new EventSource(`${apiUrl}/bookings/${bookingId}/call/events`, { withCredentials: true })

    source.onmessage = (event) => {
      const next = JSON.parse(event.data) as CallAccessResponse
      call.value = next
      if (isFinal(next.state)) closeStream()
    }

    // Der Browser verbindet von sich aus neu, und jedes Ereignis trägt den vollständigen
    // Zustand – ein währenddessen verpasster Wechsel heilt beim nächsten.
    source.onerror = () => {}
  }

  async function load(): Promise<void> {
    try {
      call.value = await $api<CallAccessResponse>(`/bookings/${bookingId}/call`)
      phase.value = 'ready'

      if (isFinal(call.value.state)) closeStream()
      else openStream()
    } catch (err) {
      phase.value = 'error'
      // 404 auch bei fremder Organisation – die API verrät bewusst nicht, ob es die
      // Buchung gibt (apps/api/src/call/call.service.ts).
      loadError.value = (err as { statusCode?: number })?.statusCode === 404
        ? 'Diese Sitzung gehört nicht zu deinem Konto oder existiert nicht.'
        : 'Die Sitzung konnte nicht geladen werden.'
    }
  }

  // Beide Aktionen antworten mit dem neuen Zustand; das Ereignis kommt zusätzlich und
  // trägt dasselbe. Sie können sich deshalb nicht widersprechen.
  async function act(action: 'admit' | 'end', conflictMessage: string): Promise<void> {
    pending.value = true
    actionError.value = ''
    try {
      call.value = await $api<CallAccessResponse>(`/bookings/${bookingId}/call/${action}`, { method: 'POST' })
      if (isFinal(call.value.state)) closeStream()
    } catch (err) {
      // 409 heißt: Die Anzeige war veraltet. Der frische Zustand steht schon im Strom,
      // der Hinweis erklärt nur, warum der Klick nichts bewirkt hat.
      actionError.value = (err as { statusCode?: number })?.statusCode === 409
        ? conflictMessage
        : 'Die Aktion konnte nicht ausgeführt werden.'
    } finally {
      pending.value = false
    }
  }

  const admit = () => act('admit', 'Die Sitzung lässt sich gerade nicht öffnen.')
  const end = () => act('end', 'Diese Sitzung läuft nicht mehr.')

  /**
   * Prüft, ob allein durch das Verstreichen von Zeit ein anderer Zustand gilt. Die API
   * meldet das nicht, weil dabei nichts geschrieben wird – die Grenzen des Zugangsfensters
   * stehen dafür in jeder Antwort.
   */
  function checkWindow(): void {
    const current = call.value
    if (!current || phase.value !== 'ready') return

    const openedNow = current.state === 'too_early' && now.value >= new Date(current.opensAt)
    const closedNow = !isFinal(current.state) && now.value > new Date(current.closesAt)
    if (openedNow || closedNow) void load()
  }

  onMounted(() => {
    void load()
    ticker = setInterval(() => {
      now.value = new Date()
      checkWindow()
    }, TICK_MS)
  })

  onUnmounted(() => {
    closeStream()
    if (ticker) clearInterval(ticker)
  })

  return { phase, call, loadError, actionError, pending, now, admit, end }
}
