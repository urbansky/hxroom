<script setup lang="ts">
import type { AvailabilitySlotResponse, CoachBookingResponse } from '@hxroom/shared'

definePageMeta({ middleware: 'auth' })

const { $api } = useApi()
const { public: { rootDomain, rootDomainHttps } } = useRuntimeConfig()
const { activeOrganization } = useAuth()

const viewMode = ref<'agenda' | 'week'>('agenda')

type FilterValue = 'upcoming' | 'past' | 'cancelled'
const FILTER_ITEMS = [
  { label: 'Kommende Termine', value: 'upcoming' as const },
  { label: 'Vergangene Termine', value: 'past' as const },
  { label: 'Abgesagte Termine', value: 'cancelled' as const },
]
const filter = ref<FilterValue>('upcoming')

// --ui-bg ist im Hauptbereich transluzent (siehe assets/main.css) – im Dropdown deckend erzwingen.
const opaqueSelectContentUi = { content: 'bg-[#faf8f4] dark:bg-[#141814]' }

const bookings = ref<CoachBookingResponse[]>([])
const availability = ref<AvailabilitySlotResponse[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)

// Die Wochenansicht zeigt immer die volle Woche, unabhängig vom Filter – deshalb ein
// eigener Query-Bereich statt der Filter-Query.
const weekStart = ref(startOfWeek(new Date()))

function queryForFilter(): Record<string, string> {
  const now = new Date().toISOString()
  if (filter.value === 'past') return { to: now, status: 'confirmed' }
  if (filter.value === 'cancelled') return { status: 'cancelled' }
  return { from: now }
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

// Der nächste anstehende Termin wird in der Agenda hervorgehoben.
const nextBookingId = computed(() => {
  const now = Date.now()
  return bookings.value.find(b => b.status !== 'cancelled' && new Date(b.start).getTime() >= now)?.id ?? null
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
    <h1 class="font-serif text-3xl text-highlighted mb-2">Kalender</h1>
    <p class="text-muted mb-6">Alle Termine, die Klienten bei dir gebucht haben.</p>

    <div class="flex items-center justify-between gap-4 mb-4">
      <div class="inline-flex items-center rounded-lg border border-default p-0.5 bg-neutral-50 dark:bg-neutral-800/50">
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
          :class="viewMode === 'agenda' ? 'bg-white dark:bg-neutral-900 text-highlighted shadow-sm' : 'text-muted hover:text-highlighted'"
          @click="viewMode = 'agenda'"
        >
          <UIcon name="i-lucide-list" class="size-4 shrink-0" />
          Agenda
        </button>
        <button
          type="button"
          class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
          :class="viewMode === 'week' ? 'bg-white dark:bg-neutral-900 text-highlighted shadow-sm' : 'text-muted hover:text-highlighted'"
          @click="viewMode = 'week'"
        >
          <UIcon name="i-lucide-calendar-days" class="size-4 shrink-0" />
          Wochenansicht
        </button>
      </div>

      <BookingWeekNav v-if="viewMode === 'week'" v-model:week-start="weekStart" />

      <USelect
        v-else
        v-model="filter"
        :items="FILTER_ITEMS"
        :ui="opaqueSelectContentUi"
        size="sm"
        class="w-48"
      />
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
        @select="openDetail"
      />
    </template>

    <template v-else>
      <BookingAgenda
        v-if="bookings.length"
        :bookings="bookings"
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
    />
  </div>
</template>
