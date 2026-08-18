<script setup lang="ts">
import type { AvailabilitySlotResponse, ClientListItem, ClientResponse, CoachBookingResponse, OfferResponse } from '@hxroom/shared'

definePageMeta({ middleware: 'auth' })

const { $api } = useApi()
const { session } = useAuth()
const { public: { rootDomain, rootDomainHttps } } = useRuntimeConfig()

/** Mehr Termine passen nicht in eine Übersicht – der Rest steht im Kalender. */
const AGENDA_LIMIT = 6

const bookings = ref<CoachBookingResponse[]>([])
const clients = ref<ClientListItem[]>([])
const offers = ref<OfferResponse[]>([])
const slots = ref<AvailabilitySlotResponse[]>([])
const bookingPage = ref<OnboardingBookingPage | null>(null)
const hasAnyBooking = ref(false)

const loading = ref(true)
const loadError = ref<string | null>(null)

async function loadDashboard() {
  loading.value = true
  loadError.value = null
  try {
    const [windowBookings, firstBooking, clientList, offerList, slotList, page] = await Promise.all([
      // Ein Request für Agenda und Wochenkennzahl – der Zeitraum deckt beides ab.
      $api<CoachBookingResponse[]>('/bookings', { query: dashboardBookingsQuery() }),
      // Separat und ohne Zeitfenster, nur für die Checkliste: eine Erstbuchung, die
      // länger zurückliegt, wäre in der Abfrage darüber unsichtbar.
      $api<CoachBookingResponse[]>('/bookings', { query: { limit: '1' } }),
      $api<ClientListItem[]>('/clients'),
      $api<OfferResponse[]>('/offers'),
      $api<AvailabilitySlotResponse[]>('/availability-slots'),
      $api<OnboardingBookingPage>('/booking-page'),
    ])

    bookings.value = windowBookings
    hasAnyBooking.value = firstBooking.length > 0
    clients.value = clientList
    offers.value = offerList
    slots.value = slotList
    bookingPage.value = page
  } catch {
    loadError.value = 'Das Dashboard konnte nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

await loadDashboard()

const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })

const agenda = computed(() => upcomingBookings(bookings.value))
const visibleAgenda = computed(() => agenda.value.slice(0, AGENDA_LIMIT))
const hiddenCount = computed(() => Math.max(0, agenda.value.length - AGENDA_LIMIT))
// Nur noch für die Hervorhebung in der Agenda – als eigene Kachel stand der nächste
// Termin dreimal auf der Seite (Kachel, Agenda, Klientenliste).
const nextBooking = computed(() => agenda.value[0] ?? null)

const weekCount = computed(() => countThisWeek(bookings.value))
const clientsWithNext = computed(() => clients.value.filter(c => c.nextSessionAt).length)

const steps = computed(() => onboardingSteps({
  bookingPage: bookingPage.value,
  offers: offers.value,
  slots: slots.value,
  hasBooking: hasAnyBooking.value,
}))

// Die Buchungsseite läuft auf der eigenen Subdomain – identisch zum Slug der Organisation,
// den /booking-page mitliefert.
const bookingPageUrl = computed(() => {
  const subdomain = bookingPage.value?.subdomain
  if (!subdomain) return null
  return `${rootDomainHttps ? 'https' : 'http'}://${subdomain}.${rootDomain}`
})

const selectedBooking = ref<CoachBookingResponse | null>(null)
const isDetailOpen = ref(false)

function openDetail(booking: CoachBookingResponse) {
  selectedBooking.value = booking
  isDetailOpen.value = true
}

// Ein Handler für beide Fälle: die Agenda filtert abgesagte Termine selbst heraus,
// eine Absage verschwindet damit allein durch das Ersetzen des Eintrags.
function applyBooking(updated: CoachBookingResponse) {
  const idx = bookings.value.findIndex(b => b.id === updated.id)
  if (idx !== -1) bookings.value[idx] = updated
  if (selectedBooking.value?.id === updated.id) selectedBooking.value = updated
}

const isClientFormOpen = ref(false)

// Nach dem Anlegen neu laden statt lokal einzufügen – die Kennzahlen der Liste
// (Sitzungen, nächster Termin) und die Sortierung kommen vom Server.
async function onClientSaved(_client: ClientResponse) {
  clients.value = await $api<ClientListItem[]>('/clients')
}
</script>

<template>
  <div class="p-4 sm:p-6 mx-auto w-full max-w-6xl flex flex-col gap-6">
    <div>
      <h1 class="font-serif text-3xl text-highlighted">
        Hallo, {{ session.data?.user?.name ?? '…' }}
      </h1>
      <p class="mt-1 text-muted">{{ today }}</p>
    </div>

    <p v-if="loadError" class="text-sm text-error">{{ loadError }}</p>

    <div v-if="loading" class="flex flex-col gap-6">
      <div class="grid gap-4 sm:grid-cols-2">
        <USkeleton v-for="n in 2" :key="n" class="h-20 rounded-xl" />
      </div>
      <div class="grid gap-4 lg:grid-cols-3">
        <USkeleton class="h-80 rounded-xl lg:col-span-2" />
        <USkeleton class="h-80 rounded-xl" />
      </div>
    </div>

    <template v-else-if="!loadError">
      <DashboardOnboarding :steps="steps" />

      <div class="grid gap-4 sm:grid-cols-2">
        <StatCard
          icon="i-lucide-calendar-days"
          label="Diese Woche"
          :value="weekCount === 1 ? '1 Termin' : `${weekCount} Termine`"
          to="/bookings"
        />
        <StatCard
          icon="i-lucide-users"
          label="Klienten"
          :value="clients.length === 1 ? '1 Klient' : `${clients.length} Klienten`"
          :hint="clientsWithNext ? `${clientsWithNext} mit anstehendem Termin` : null"
          to="/clients"
        />
      </div>

      <div class="grid gap-4 lg:grid-cols-3 items-start">
        <SettingsSection title="Nächste Termine" class="lg:col-span-2">
          <!-- Zwei Ziele statt eines "Kalender"-Links: der Auszug hier ist eine gekürzte
               Agenda, und beide Ansichten des Kalenders sind von hier aus gleich weit
               entfernt. Die Icons sind dieselben wie im Umschalter dort. -->
          <template #actions>
            <div class="flex items-center gap-1 shrink-0">
              <UButton to="/bookings" label="Ganze Agenda" icon="i-lucide-list" color="neutral" variant="link" size="sm" class="-my-1" />
              <UButton to="/bookings?view=week" label="Wochenansicht" icon="i-lucide-calendar-days" color="neutral" variant="link" size="sm" class="-my-1" />
            </div>
          </template>

          <template v-if="visibleAgenda.length">
            <BookingAgenda
              :bookings="visibleAgenda"
              :highlight-id="nextBooking?.id"
              variant="flat"
              @select="openDetail"
            />

            <UButton
              v-if="hiddenCount"
              to="/bookings"
              :label="hiddenCount === 1 ? 'Ein weiterer Termin im Kalender' : `${hiddenCount} weitere Termine im Kalender`"
              trailing-icon="i-lucide-arrow-right"
              color="neutral"
              variant="link"
              size="sm"
              class="self-center"
            />
          </template>

          <div v-else class="flex flex-col items-center gap-3 py-6 text-center">
            <UIcon name="i-lucide-calendar-days" class="size-6 text-muted" />
            <p class="text-sm text-muted">In den nächsten sieben Tagen ist kein Termin gebucht.</p>
            <UButton
              v-if="bookingPageUrl"
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
        </SettingsSection>

        <div class="flex flex-col gap-4">
          <DashboardQuickActions
            :booking-page-url="bookingPageUrl"
            @create-client="isClientFormOpen = true"
          />
          <DashboardClients
            :clients="clients"
            @create-client="isClientFormOpen = true"
          />
        </div>
      </div>
    </template>

    <BookingDetailSlideover
      v-model:open="isDetailOpen"
      :booking="selectedBooking"
      @cancelled="applyBooking"
      @updated="applyBooking"
    />

    <ClientFormSlideover
      v-model:open="isClientFormOpen"
      :client="null"
      @saved="onClientSaved"
    />
  </div>
</template>
