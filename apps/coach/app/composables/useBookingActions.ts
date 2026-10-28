import { isWithinCallWindow, type CoachBookingResponse } from '@hxroom/shared'

/**
 * Was der Coach mit einem Termin tun kann – absagen, Klient zuordnen, nicht erschienen,
 * Kalenderdatei, Sitzung starten. Slideover und Terminseite (phase5-umsetzungsplan.md,
 * Schritt 8a) teilen sich diese Logik, damit Regeln und Fehlertexte nicht auseinanderlaufen.
 *
 * Der geänderte Termin geht über `onUpdated` an die Aufrufer zurück; wer ihn anzeigt,
 * entscheidet selbst, wie er ihn übernimmt.
 */
export function useBookingActions(
  booking: MaybeRefOrGetter<CoachBookingResponse | null | undefined>,
  handlers: {
    onUpdated?: (booking: CoachBookingResponse) => void
    onCancelled?: (booking: CoachBookingResponse) => void
  } = {},
) {
  const { $api } = useApi()

  const confirmingCancel = ref(false)
  const cancelReason = ref('')
  const cancelling = ref(false)
  const actionError = ref<string | null>(null)
  const downloading = ref(false)
  const markingNoShow = ref(false)

  /** Für den nächsten Termin: kein halb ausgefülltes Absage-Formular, keine alte Meldung. */
  function reset() {
    confirmingCancel.value = false
    cancelReason.value = ''
    actionError.value = null
  }

  // Minütlich nachgeführt: Slideover und Seite bleiben beim Warten offen stehen, und der
  // "Sitzung starten"-Knopf soll dann von selbst erscheinen.
  const now = ref(new Date())
  let nowTimer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    nowTimer = setInterval(() => (now.value = new Date()), 60_000)
  })
  onUnmounted(() => clearInterval(nowTimer))

  const current = computed(() => toValue(booking) ?? null)
  const isCancelled = computed(() => current.value?.status === 'cancelled')
  const isPast = computed(() => !!current.value && new Date(current.value.end) < now.value)

  // Startbar ist eine bestätigte Sitzung im Zugangsfenster – dieselben Grenzen, nach denen
  // der Server den Zugang gewährt (@hxroom/shared).
  const canStart = computed(() =>
    !!current.value
    && current.value.status === 'confirmed'
    && isWithinCallWindow(new Date(current.value.start), new Date(current.value.end), now.value),
  )

  // Nur was noch bevorsteht: offen oder bestätigt und nicht vorbei. Ein vorzeitig beendetes
  // Gespräch ist abgeschlossen, obwohl sein geplantes Ende noch in der Zukunft liegt.
  const canCancel = computed(() =>
    !!current.value
    && (current.value.status === 'pending' || current.value.status === 'confirmed')
    && !isPast.value,
  )

  // Nicht erschienen (B6). Dieselbe Regel wie auf dem Server (canMarkNoShow): bestätigt,
  // begonnen, niemand eingelassen – wer eingelassen wurde, war da.
  const canMarkNoShow = computed(() =>
    !!current.value
    && current.value.status === 'confirmed'
    && !current.value.admittedAt
    && new Date(current.value.start) <= now.value,
  )

  async function downloadIcs() {
    if (!current.value) return
    downloading.value = true
    actionError.value = null
    try {
      // Bewusst über $api statt über einen <a href>: die API liegt auf einer anderen
      // Subdomain, ein reiner Link würde die Session-Cookies nicht mitschicken.
      const blob = await $api<Blob>(`/bookings/${current.value.id}/calendar.ics`, { responseType: 'blob' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'termin.ics'
      link.click()
      URL.revokeObjectURL(url)
    } catch {
      actionError.value = 'Kalendereintrag konnte nicht geladen werden.'
    } finally {
      downloading.value = false
    }
  }

  // Manuelle Zuordnung zum Klientenstamm (Baustein 3 aus doc/idee-klienten-matching.md).
  // Die Kontaktdaten der Buchung bleiben dabei unverändert – sie halten fest, was der
  // Klient beim Buchen eingegeben hat.
  async function assignClient(clientId: string | null) {
    if (!current.value) return
    actionError.value = null
    try {
      const updated = await $api<CoachBookingResponse>(`/bookings/${current.value.id}/client`, {
        method: 'PATCH',
        body: { clientId },
      })
      handlers.onUpdated?.(updated)
    } catch {
      actionError.value = 'Zuordnung konnte nicht gespeichert werden.'
    }
  }

  // Ohne Rückfrage: Der Vermerk lässt sich mit „Doch erschienen" jederzeit zurücknehmen, und
  // er geht an niemanden hinaus.
  async function setNoShow(noShow: boolean) {
    if (!current.value) return
    markingNoShow.value = true
    actionError.value = null
    try {
      const updated = await $api<CoachBookingResponse>(`/bookings/${current.value.id}/no-show`, {
        method: noShow ? 'POST' : 'DELETE',
      })
      handlers.onUpdated?.(updated)
    } catch {
      actionError.value = noShow
        ? 'Der Vermerk konnte nicht gespeichert werden.'
        : 'Der Vermerk konnte nicht zurückgenommen werden.'
    } finally {
      markingNoShow.value = false
    }
  }

  async function cancelBooking() {
    if (!current.value) return
    cancelling.value = true
    actionError.value = null
    try {
      const updated = await $api<CoachBookingResponse>(`/bookings/${current.value.id}/cancel`, {
        method: 'POST',
        body: { reason: cancelReason.value.trim() || undefined },
      })
      confirmingCancel.value = false
      cancelReason.value = ''
      handlers.onCancelled?.(updated)
    } catch (err: any) {
      actionError.value = err?.statusCode === 409
        ? 'Dieser Termin ist bereits abgesagt.'
        : 'Termin konnte nicht abgesagt werden.'
    } finally {
      cancelling.value = false
    }
  }

  return {
    confirmingCancel,
    cancelReason,
    cancelling,
    actionError,
    downloading,
    markingNoShow,
    isCancelled,
    isPast,
    canStart,
    canCancel,
    canMarkNoShow,
    reset,
    downloadIcs,
    assignClient,
    setNoShow,
    cancelBooking,
  }
}

export type BookingActions = ReturnType<typeof useBookingActions>
