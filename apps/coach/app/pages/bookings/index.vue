<script setup lang="ts">
import type { AvailabilityExceptionResponse, AvailabilitySlotResponse, CalendarBusyTimeResponse, ClientListItem, CoachBookingResponse, OfferResponse } from '@hxroom/shared'

definePageMeta({ middleware: 'auth' })

const { $api } = useApi()
const { public: { rootDomain, rootDomainHttps } } = useRuntimeConfig()
const { activeOrganization } = useAuth()
const route = useRoute()
const router = useRouter()

// Ansicht und Filter stehen in der URL: nur so kann das Dashboard gezielt auf die
// Wochenansicht verlinken, und ein Reload oder der Zurück-Knopf aus dem Klientenprofil
// landet wieder dort, wo der Coach war. Die Standardwerte (Agenda, Kommend) bleiben ohne
// Query-Parameter.
const viewMode = ref<'agenda' | 'week'>(route.query.view === 'week' ? 'week' : 'agenda')

// Auf dem Handy (unter sm) gibt es nur die Agenda: Sieben Spalten sind dort gut 30 px breit,
// die Termine wären Streifen ohne lesbaren Text (technisches-konzept.md §5, „Navigation“).
// Den Umschalter blendet das Template aus; hier wird auch ein Link mit ?view=week umgelenkt.
const phoneQuery = import.meta.client ? window.matchMedia('(max-width: 639.98px)') : null
function enforceAgendaOnPhone() {
  if (phoneQuery?.matches) viewMode.value = 'agenda'
}
onMounted(() => {
  enforceAgendaOnPhone()
  phoneQuery?.addEventListener('change', enforceAgendaOnPhone)
})
onBeforeUnmount(() => phoneQuery?.removeEventListener('change', enforceAgendaOnPhone))

type FilterValue = 'upcoming' | 'past' | 'cancelled'
// Drei Schalter statt eines Auswahlfelds: Der Wechsel zwischen kommenden und vergangenen
// Terminen ist die häufigste Bewegung auf dieser Seite und soll einen Klick kosten, nicht zwei.
const FILTER_ITEMS: { label: string, value: FilterValue }[] = [
  { label: 'Kommend', value: 'upcoming' },
  { label: 'Vergangen', value: 'past' },
  { label: 'Abgesagt', value: 'cancelled' },
]
const filter = ref<FilterValue>(
  route.query.filter === 'past' || route.query.filter === 'cancelled' ? route.query.filter : 'upcoming',
)

watch([viewMode, filter], ([mode, value]) => {
  // replace statt push: Umschalten ist kein Navigationsschritt, der Zurück-Knopf soll auf
  // die vorherige Seite führen. Der Filter gilt nur für die Agenda – die Wochenansicht
  // zeigt immer die volle Woche.
  const query: Record<string, string> = {}
  if (mode === 'week') query.view = 'week'
  else if (value !== 'upcoming') query.filter = value
  router.replace({ query })
})

const bookings = ref<CoachBookingResponse[]>([])
const availability = ref<AvailabilitySlotResponse[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)

// Die Wochenansicht zeigt immer die volle Woche, unabhängig vom Filter – deshalb ein
// eigener Query-Bereich statt der Filter-Query.
const weekStart = ref(startOfWeek(new Date()))

function queryForFilter(): Record<string, string> {
  const now = new Date()
  // Vergangen heißt: gehalten und vorbei. 'completed' gehört dazu – so steht jede Sitzung da,
  // die über „Sitzung beenden“ abgeschlossen wurde. Absteigend, damit das Limit der API die
  // ältesten Termine abschneidet und nicht die jüngsten.
  //
  // 'no_show' ebenfalls (B6): nicht gehalten, aber vorbei – und hier sucht der Coach, wenn
  // er einen Vermerk zurücknehmen will. Das Badge unterscheidet es.
  if (filter.value === 'past') return { to: now.toISOString(), status: 'confirmed,completed,no_show', order: 'desc' }
  if (filter.value === 'cancelled') return { status: 'cancelled' }

  // Das Ladefenster reicht bewusst in die Vergangenheit: Die API filtert auf den Beginn,
  // eine gerade laufende Sitzung fiele mit `from: now` also aus der Liste – ausgerechnet
  // die, deren Sitzung der Coach starten will. Gefiltert wird deshalb clientseitig auf das
  // Ende, wie es upcomingBookings() im Dashboard schon tut. Die Spanne deckt die längste
  // denkbare Sitzung samt Nachlauf des Zugangsfensters ab.
  const from = new Date(now.getTime() - 12 * 60 * 60_000)
  return { from: from.toISOString() }
}

function queryForWeek(): Record<string, string> {
  const end = new Date(weekStart.value)
  end.setDate(end.getDate() + 7)
  return { from: weekStart.value.toISOString(), to: end.toISOString() }
}

async function loadBookings() {
  loading.value = true
  loadError.value = null
  try {
    bookings.value = await $api<CoachBookingResponse[]>('/bookings', {
      query: viewMode.value === 'week' ? queryForWeek() : queryForFilter(),
    })
  } catch {
    loadError.value = 'Termine konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

await loadBookings()

// Verfügbarkeiten nur für das Hintergrundraster der Wochenansicht – einmalig geladen.
await useFetch<AvailabilitySlotResponse[]>('/availability-slots', {
  $fetch: $api,
  onResponse({ response }) {
    availability.value = response._data as AvailabilitySlotResponse[]
  },
})

watch([viewMode, filter, weekStart], loadBookings)

// Ausnahmen der angezeigten Woche (kalenderabgleich.md §2) – nur für die Wochenansicht.
const exceptions = ref<AvailabilityExceptionResponse[]>([])

async function loadExceptions() {
  if (viewMode.value !== 'week') return
  try {
    exceptions.value = await $api<AvailabilityExceptionResponse[]>('/availability-exceptions', { query: queryForWeek() })
  } catch {
    // Ohne Ausnahmen bleibt die Woche benutzbar; die Termine sind das Wesentliche.
    exceptions.value = []
  }
}

await loadExceptions()
watch([viewMode, weekStart], loadExceptions)

// Belegte Zeiten aus externen Kalendern (kalenderabgleich.md §3) – ebenfalls nur für die Woche.
// Nach jedem Abgleich (Aktivität im Layout oder Knopf hier) neu laden.
const calendarSync = useCalendarSync()
const { active: activeCalendars, oldestSuccessAt, syncing: calendarSyncing } = calendarSync
const busyTimes = ref<CalendarBusyTimeResponse[]>([])

async function loadBusyTimes() {
  if (viewMode.value !== 'week') return
  try {
    busyTimes.value = await $api<CalendarBusyTimeResponse[]>('/calendar-imports/busy-times', { query: queryForWeek() })
  } catch {
    busyTimes.value = []
  }
}

await loadBusyTimes()
watch([viewMode, weekStart, () => calendarSync.imports.value], loadBusyTimes)

async function syncCalendarsNow() {
  try {
    await calendarSync.syncManual()
  } catch {
    toast.add({ title: 'Abgleich fehlgeschlagen', description: 'Bitte versuche es gleich noch einmal.', color: 'error', icon: 'i-lucide-circle-x' })
  }
}

const isExceptionOpen = ref(false)
const editedException = ref<AvailabilityExceptionResponse | null>(null)

function openBlockCreate() {
  editedException.value = null
  isExceptionOpen.value = true
}

function openExceptionEdit(exception: AvailabilityExceptionResponse) {
  editedException.value = exception
  isExceptionOpen.value = true
}

const toast = useToast()

// In der Agenda ist eine neue Sperre nicht zu sehen – die Rückmeldung kommt deshalb als Toast.
function onExceptionSaved(saved: AvailabilityExceptionResponse) {
  loadExceptions()
  toast.add({
    title: `${EXCEPTION_KIND_LABELS[saved.kind]}: ${formatExceptionRange(saved)}`,
    description: 'Alle Ausnahmen findest du unter Verfügbarkeit.',
    icon: saved.kind === 'blocked' ? 'i-lucide-calendar-off' : 'i-lucide-calendar-plus',
    color: 'success',
  })
}

// Kommend und vergangen trennt das Ende des Termins, nicht sein Beginn: Ein Termin, der
// gerade läuft, gehört zu den kommenden (siehe queryForFilter) und steht deshalb nicht
// zugleich in der Vergangenheit, obwohl er dort über `to: now` mitgeladen wird.
//
// Ausnahme: Ein vermerkter No-Show (B6) ist vorbei, sobald er vermerkt ist – er bliebe
// sonst bis zu seinem geplanten Ende unter „Kommend" stehen.
const visibleBookings = computed(() => {
  if (viewMode.value === 'week' || filter.value === 'cancelled') return bookings.value
  const now = Date.now()
  const isOver = (b: CoachBookingResponse) => b.status === 'no_show' || new Date(b.end).getTime() < now
  return filter.value === 'upcoming'
    ? bookings.value.filter(b => !isOver(b))
    : bookings.value.filter(isOver)
})

// Der nächste anstehende Termin wird in der Agenda hervorgehoben.
const nextBookingId = computed(() => {
  const now = Date.now()
  return bookings.value.find(b => b.status !== 'cancelled' && b.status !== 'no_show' && new Date(b.start).getTime() >= now)?.id ?? null
})

const bookingPageUrl = computed(() => {
  const slug = activeOrganization.value?.data?.slug
  if (!slug) return null
  return `${rootDomainHttps ? 'https' : 'http'}://${slug}.${rootDomain}`
})

const selectedBooking = ref<CoachBookingResponse | null>(null)
const isDetailOpen = ref(false)

function openDetail(booking: CoachBookingResponse) {
  selectedBooking.value = booking
  isDetailOpen.value = true
}

// Nach einer geänderten Klientenzuordnung: Zeile an Ort und Stelle ersetzen, die
// Buchung bleibt in jedem Filter sichtbar, weil sich weder Status noch Zeit ändern.
function applyUpdated(updated: CoachBookingResponse) {
  const idx = bookings.value.findIndex(b => b.id === updated.id)
  if (idx === -1) return
  bookings.value[idx] = updated
  if (selectedBooking.value?.id === updated.id) {
    selectedBooking.value = updated
  }
}

function applyCancelled(updated: CoachBookingResponse) {
  const idx = bookings.value.findIndex(b => b.id === updated.id)
  if (idx === -1) return
  // Im Filter "Kommende" gehört ein abgesagter Termin nicht mehr in die Liste.
  if (filter.value === 'upcoming' && viewMode.value === 'agenda') {
    bookings.value.splice(idx, 1)
  } else {
    bookings.value[idx] = updated
  }
}

// Termin anlegen (doc/produkt/funktionen/manuelle-termine.md): aus dem Kopf oder per Klick auf eine
// freie Stelle der Wochenansicht. Klienten und Angebote erst beim Öffnen.
const manualOpen = ref(false)
const manualClients = ref<ClientListItem[]>([])
const manualOffers = ref<OfferResponse[]>([])
const manualPreset = ref<{ start: Date } | null>(null)

async function openManual(start: Date | null = null) {
  manualPreset.value = start ? { start } : null
  try {
    [manualClients.value, manualOffers.value] = await Promise.all([
      $api<ClientListItem[]>('/clients'),
      $api<OfferResponse[]>('/offers'),
    ])
  } catch {
    // Ohne Liste bleibt die Einladung per E-Mail-Adresse.
  }
  manualOpen.value = true
}

// Still nachladen statt loadBookings(): Das Skelett ließe die Termine hinter dem Modal flackern.
async function refreshBookings() {
  try {
    bookings.value = await $api<CoachBookingResponse[]>('/bookings', {
      query: viewMode.value === 'week' ? queryForWeek() : queryForFilter(),
    })
  } catch {
    // Die neuen Termine erscheinen spätestens beim nächsten Wechsel der Ansicht.
  }
}

const emptyStateText = computed(() => {
  if (filter.value === 'past') return 'Noch keine vergangenen Termine.'
  if (filter.value === 'cancelled') return 'Keine abgesagten Termine.'
  return 'Noch keine gebuchten Termine.'
})
</script>

<template>
  <div
    class="p-4 sm:p-6 mx-auto w-full transition-[max-width] duration-200"
    :class="viewMode === 'week' ? 'max-w-[100rem]' : 'max-w-3xl'"
  >
    <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 mb-6">
      <div>
        <h1 class="font-serif text-3xl text-highlighted mb-2">Termine</h1>
        <p class="text-muted">Alle Termine – von Klienten gebucht oder von dir angelegt.</p>
      </div>
      <!-- „Zeit sperren“ leiser als „Termin anlegen“: Termine anlegen ist die häufigere Handlung. -->
      <div class="flex items-center gap-2">
        <UButton label="Zeit sperren" icon="i-lucide-calendar-off" size="sm" color="neutral" variant="outline" @click="openBlockCreate()" />
        <UButton label="Termin anlegen" icon="i-lucide-calendar-plus" size="sm" @click="openManual()" />
      </div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-4">
      <div class="inline-flex max-sm:hidden items-center rounded-lg border border-default p-0.5 bg-neutral-50 dark:bg-elevated/50">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
          :class="viewMode === 'week' ? 'bg-white dark:bg-muted text-highlighted shadow-sm' : 'text-muted hover:text-highlighted'"
          @click="viewMode = 'week'"
        >
          <UIcon name="i-lucide-calendar-days" class="size-4 shrink-0" />
          Wochenansicht
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
          :class="viewMode === 'agenda' ? 'bg-white dark:bg-muted text-highlighted shadow-sm' : 'text-muted hover:text-highlighted'"
          @click="viewMode = 'agenda'"
        >
          <UIcon name="i-lucide-list" class="size-4 shrink-0" />
          Agenda
        </button>
      </div>

      <div v-if="viewMode === 'week'" class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <!-- Stand des Kalenderabgleichs (kalenderabgleich.md §3.3): der älteste Stand aller
             aktiven Kalender, daneben der Knopf. Ohne verbundenen Kalender nichts. -->
        <div v-if="activeCalendars.length > 0" class="flex items-center gap-1 text-xs text-muted">
          <span>Kalender abgeglichen {{ formatSyncAge(oldestSuccessAt) }}</span>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="xs"
            aria-label="Kalender jetzt abgleichen"
            :loading="calendarSyncing"
            @click="syncCalendarsNow()"
          />
        </div>
        <BookingWeekNav v-model:week-start="weekStart" />
      </div>

      <!-- Bewusst leiser als der Umschalter der Ansicht links – ohne Rahmen und Icons –, damit
           die beiden Leisten nicht wie zwei gleichrangige Hauptauswahlen nebeneinanderstehen. -->
      <div v-else role="group" aria-label="Termine filtern" class="flex items-center gap-1">
        <button
          v-for="item in FILTER_ITEMS"
          :key="item.value"
          type="button"
          class="px-2.5 py-1.5 rounded-md text-sm transition-colors cursor-pointer outline-primary/25 focus-visible:outline-3"
          :class="filter === item.value ? 'bg-elevated text-highlighted font-medium' : 'text-muted hover:text-highlighted'"
          :aria-pressed="filter === item.value"
          @click="filter = item.value"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <p v-if="loadError" class="text-sm text-error mb-4">{{ loadError }}</p>

    <div v-if="loading" class="flex flex-col gap-2">
      <USkeleton v-for="n in 3" :key="n" class="h-24 rounded-xl" />
    </div>

    <template v-else-if="viewMode === 'week'">
      <BookingWeek
        :week-start="weekStart"
        :bookings="bookings"
        :availability="availability"
        :exceptions="exceptions"
        :busy-times="busyTimes"
        @select="openDetail"
        @select-exception="openExceptionEdit"
        @create="openManual"
      />
    </template>

    <template v-else>
      <BookingAgenda
        v-if="visibleBookings.length"
        :bookings="visibleBookings"
        :highlight-id="nextBookingId"
        @select="openDetail"
      />

      <div v-else class="rounded-xl border border-dashed border-default p-10 flex flex-col items-center justify-center gap-3 text-center">
        <UIcon name="i-lucide-calendar-days" class="size-6 text-muted" />
        <p class="text-sm text-muted">{{ emptyStateText }}</p>
        <UButton
          v-if="filter === 'upcoming' && bookingPageUrl"
          :to="bookingPageUrl"
          target="_blank"
          trailing-icon="i-lucide-external-link"
          color="primary"
          variant="soft"
          size="sm"
        >
          Buchungsseite teilen
        </UButton>
      </div>
    </template>

    <BookingDetailSlideover
      v-model:open="isDetailOpen"
      :booking="selectedBooking"
      @cancelled="applyCancelled"
      @updated="applyUpdated"
    />

    <ManualBookingModal
      v-model:open="manualOpen"
      :clients="manualClients"
      :offers="manualOffers"
      :preset="manualPreset"
      @created="refreshBookings"
    />

    <AvailabilityExceptionSlideover
      v-model:open="isExceptionOpen"
      :exception="editedException"
      :preset="{ kind: 'blocked' }"
      @saved="onExceptionSaved"
      @deleted="loadExceptions"
    />
  </div>
</template>
