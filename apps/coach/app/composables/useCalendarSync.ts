import type { CalendarImportResponse } from '@hxroom/shared'

/**
 * Stand der externen Kalender (doc/produkt/funktionen/kalenderabgleich.md §3.3), geteilt
 * zwischen Layout (Aktivität, Fehler-Banner), Verfügbarkeit (Reiter „Kalender“) und
 * Wochenansicht (Stand mit Knopf).
 *
 * `syncActivity` meldet Aktivität im Backoffice. Die API gleicht nur ab, was älter als fünf
 * Minuten ist; hier wird zusätzlich höchstens einmal pro Minute gefragt, damit Tab-Wechsel
 * und Navigation keine Anfragewelle auslösen.
 */
const ACTIVITY_THROTTLE_MS = 60_000
/** Ein Kalender gilt erst als gestört, wenn er so lange fehlschlägt – ein Aussetzer flackert nicht. */
const FAILING_BANNER_AFTER_MS = 30 * 60_000

export function useCalendarSync() {
  const { $api } = useApi()
  const imports = useState<CalendarImportResponse[] | null>('calendar-imports', () => null)
  const syncing = useState('calendar-syncing', () => false)
  const lastActivity = useState('calendar-last-activity', () => 0)

  async function load() {
    try {
      imports.value = await $api<CalendarImportResponse[]>('/calendar-imports')
    } catch {
      // Ohne Stand fehlen nur Hinweise; die Seite bleibt benutzbar.
    }
  }

  async function syncActivity() {
    if (Date.now() - lastActivity.value < ACTIVITY_THROTTLE_MS) return
    lastActivity.value = Date.now()
    try {
      imports.value = await $api<CalendarImportResponse[]>('/calendar-imports/sync', { method: 'POST', body: { trigger: 'activity' } })
    } catch {
      // Hintergrund – kein Fehler für den Coach
    }
  }

  async function syncManual() {
    syncing.value = true
    try {
      imports.value = await $api<CalendarImportResponse[]>('/calendar-imports/sync', { method: 'POST', body: { trigger: 'manual' } })
    } finally {
      syncing.value = false
    }
  }

  const active = computed(() => (imports.value ?? []).filter(item => item.isActive))

  /** Ältester erfolgreicher Abgleich der aktiven Kalender – der Stand, auf den sich alles verlassen kann. */
  const oldestSuccessAt = computed(() => {
    const times = active.value.map(item => item.lastSuccessAt).filter((t): t is string => !!t)
    if (times.length === 0) return null
    return times.reduce((a, b) => (a < b ? a : b))
  })

  const failing = computed(() => active.value.filter(item =>
    item.failingSince && Date.now() - new Date(item.failingSince).getTime() >= FAILING_BANNER_AFTER_MS,
  ))

  return { imports, active, syncing, oldestSuccessAt, failing, load, syncActivity, syncManual }
}
