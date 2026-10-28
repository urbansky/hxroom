<script setup lang="ts">
import { isWithinCallWindow, type ClientDetail, type ClientResponse, type CoachBookingResponse, type OfferResponse } from '@hxroom/shared'
import type { DropdownMenuItem } from '@nuxt/ui'

definePageMeta({ middleware: 'auth' })

// Klientenseite (zeitplan.md, Phase 5, „Breitere Klientenseite“): Kopf mit Kennzahlen über
// die volle Breite, links Reiter für Termine, Notizen-Chronik und Dateien, rechts nächster
// Termin, Coaching-Ziele und interne Notiz. Auf dem Handy steht die rechte Spalte als
// eigener Reiter „Profil“.

const route = useRoute()
const router = useRouter()
const { $api } = useApi()

const clientId = computed(() => route.params.id as string)

const client = ref<ClientDetail | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

async function loadClient() {
  loading.value = true
  loadError.value = null
  try {
    client.value = await $api<ClientDetail>(`/clients/${clientId.value}`)
  } catch (err: any) {
    loadError.value = err?.statusCode === 404
      ? 'Dieser Klient existiert nicht.'
      : 'Klient konnte nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

await loadClient()

// Spontan-Termin: Die Angebote bestimmen Bezeichnung und Dauer. Sie werden hier
// mitgeladen, damit das Modal beim Öffnen sofort auswählbar ist.
const offers = ref<OfferResponse[]>([])
const adHocOpen = ref(false)

async function openAdHoc() {
  if (!offers.value.length) {
    try {
      offers.value = await $api<OfferResponse[]>('/offers')
    } catch {
      offers.value = []
    }
  }
  adHocOpen.value = true
}

// Minütlich nachgeführt: „Sitzung starten“ am nächsten Termin soll von selbst erscheinen.
const now = ref(new Date())
let nowTimer: ReturnType<typeof setInterval> | undefined
onMounted(() => { nowTimer = setInterval(() => (now.value = new Date()), 60_000) })
onUnmounted(() => clearInterval(nowTimer))

// Die API liefert die Historie absteigend – für die Anzeige wird sie in anstehende
// und vergangene Termine getrennt. Abgesagte Termine gelten als vergangen, egal wann
// sie stattgefunden hätten: sie stehen niemandem mehr bevor.
const upcoming = computed<CoachBookingResponse[]>(() => {
  const t = now.value.getTime()
  return (client.value?.bookings ?? [])
    .filter(b => b.status !== 'cancelled' && new Date(b.start).getTime() >= t)
    .slice()
    .reverse()
})

const past = computed<CoachBookingResponse[]>(() => {
  const t = now.value.getTime()
  return (client.value?.bookings ?? [])
    .filter(b => b.status === 'cancelled' || new Date(b.start).getTime() < t)
})

const stats = computed(() => clientStats(client.value?.bookings ?? [], now.value))

// Nächster Termin für die rechte Spalte: der früheste offene oder bestätigte.
const nextBooking = computed(() => upcoming.value.find(b => b.status === 'pending' || b.status === 'confirmed') ?? null)
const nextBookingId = computed(() => nextBooking.value?.id ?? null)
const canStartNext = computed(() =>
  !!nextBooking.value
  && nextBooking.value.status === 'confirmed'
  && isWithinCallWindow(new Date(nextBooking.value.start), new Date(nextBooking.value.end), now.value),
)

// Reiter in der URL, damit Zurück aus einer Terminseite wieder beim selben Reiter landet.
// „Profil“ gibt es nur auf schmalen Fenstern; dort ersetzt er die rechte Spalte.
type TabValue = 'sessions' | 'notes' | 'files' | 'profile'
const desktopQuery = window.matchMedia('(min-width: 1024px)')
const isDesktop = ref(desktopQuery.matches)
function onViewportChange() { isDesktop.value = desktopQuery.matches }
onMounted(() => desktopQuery.addEventListener('change', onViewportChange))
onUnmounted(() => desktopQuery.removeEventListener('change', onViewportChange))

// Auf dem Handy ohne Symbole: Vier Reiter mit Symbol passen in 390 px nicht nebeneinander.
const tabItems = computed(() => {
  const items = [
    { label: 'Termine', value: 'sessions', icon: 'i-lucide-calendar-days' },
    { label: 'Notizen', value: 'notes', icon: 'i-lucide-notebook-pen' },
    { label: 'Dateien', value: 'files', icon: 'i-lucide-paperclip' },
  ]
  return isDesktop.value
    ? items
    : [...items, { label: 'Profil', value: 'profile', icon: '' }].map(({ icon: _icon, ...item }) => item)
})
const activeTab = computed<TabValue>({
  get: () => {
    const tab = route.query.tab
    if (tab === 'notes' || tab === 'files') return tab
    if (tab === 'profile' && !isDesktop.value) return 'profile'
    return 'sessions'
  },
  set: tab => router.replace({ query: { ...route.query, tab: tab === 'sessions' ? undefined : tab } }),
})
const showAside = computed(() => isDesktop.value || activeTab.value === 'profile')

// Notizen und Dateien laden beim ersten Öffnen ihres Reiters und bleiben danach stehen: Ein
// Neuladen bei jedem Wechsel ließe erst einen Platzhalter und dann den Inhalt aufblitzen, und
// die Seite spränge in der Höhe zweimal.
const visitedTabs = reactive(new Set<TabValue>())
watch(activeTab, tab => visitedTabs.add(tab), { immediate: true })

// Termin-Detail wie im Kalender (pages/bookings/index.vue): dasselbe Slideover mit
// Absage, Klientenzuordnung, Kalendereintrag und den Sitzungsnotizen.
const selectedBooking = ref<CoachBookingResponse | null>(null)
const isDetailOpen = ref(false)

function openDetail(booking: CoachBookingResponse) {
  selectedBooking.value = booking
  isDetailOpen.value = true
}

// Absage oder neue Klientenzuordnung: Zeile ersetzen. Gehört der Termin danach zu einem
// anderen Klienten, verschwindet er aus diesem Profil – das Slideover bleibt offen, damit
// der Coach das Ergebnis seiner Änderung sieht.
function applyBookingChange(updated: CoachBookingResponse) {
  if (!client.value) return
  const bookings = updated.clientId === client.value.id
    ? client.value.bookings.map(b => (b.id === updated.id ? updated : b))
    : client.value.bookings.filter(b => b.id !== updated.id)
  client.value = { ...client.value, bookings }
  if (selectedBooking.value?.id === updated.id) selectedBooking.value = updated
}

const isFormOpen = ref(false)

function onSaved(saved: ClientResponse) {
  if (!client.value) return
  // Nur die Stammdaten ersetzen – die Sitzungshistorie ändert sich beim Bearbeiten nicht.
  client.value = { ...client.value, ...saved }
}

// Löschen auf Anfrage (doc/funktionen/backoffice-coach.md 7.04, Art. 17 DSGVO). Anstehende
// Termine sperren die Löschung – die API prüft das ebenso; hier wird es vorab erklärt.
const deleteOpen = ref(false)
const deleting = ref(false)
const deleteError = ref<string | null>(null)
const hasOpenBookings = computed(() => upcoming.value.some(b => b.status === 'pending' || b.status === 'confirmed'))
const toast = useToast()

async function deleteClient() {
  if (!client.value) return
  deleting.value = true
  deleteError.value = null
  try {
    await $api(`/clients/${client.value.id}`, { method: 'DELETE' })
    toast.add({ title: `${client.value.name} wurde gelöscht`, color: 'success', icon: 'i-lucide-check' })
    await navigateTo('/clients')
  } catch (err: any) {
    deleteError.value = err?.statusCode === 409
      ? 'Für diesen Klienten stehen noch Termine an. Sage sie zuerst ab.'
      : 'Löschen fehlgeschlagen. Bitte versuche es noch einmal.'
  } finally {
    deleting.value = false
  }
}

// Seltenes in das Drei-Punkte-Menü, damit der Kopf bei den häufigen Aktionen bleibt.
const moreItems = computed<DropdownMenuItem[][]>(() => [[
  {
    label: 'Klient löschen',
    icon: 'i-lucide-trash-2',
    color: 'error',
    onSelect: () => { deleteError.value = null; deleteOpen.value = true },
  },
]])
</script>

<template>
  <div class="p-4 sm:p-6 max-w-6xl mx-auto w-full">
    <UButton
      to="/clients"
      label="Klientenliste"
      icon="i-lucide-chevron-left"
      color="neutral"
      variant="ghost"
      size="sm"
      class="-ml-2 mb-4"
    />

    <div v-if="loading" class="flex flex-col gap-4">
      <USkeleton class="h-24 rounded-xl" />
      <USkeleton class="h-40 rounded-xl" />
    </div>

    <p v-else-if="loadError" class="text-sm text-error">{{ loadError }}</p>

    <template v-else-if="client">
      <!-- Kopf über die volle Breite. Auf dem Handy rutschen die Knöpfe unter die Stammdaten,
           sonst bleibt dem Namen keine Breite und er bricht Buchstabe für Buchstabe um. -->
      <header class="flex flex-col gap-4 mb-6">
        <div class="flex flex-wrap items-start gap-4">
          <span class="size-14 shrink-0 rounded-full bg-primary/10 text-primary font-medium flex items-center justify-center">
            {{ clientInitials(client.name) }}
          </span>
          <div class="flex-1 min-w-0">
            <h1 class="font-serif text-3xl text-highlighted mb-1 break-words">{{ client.name }}</h1>
            <div class="flex flex-wrap gap-x-4 gap-y-0.5 text-sm">
              <ULink :to="`mailto:${client.email}`" class="text-primary break-all">{{ client.email }}</ULink>
              <ULink v-if="client.phone" :to="`tel:${client.phone}`" class="text-primary">{{ client.phone }}</ULink>
            </div>
            <!-- Auf dem Handy statt der Karte „Klient seit“ -->
            <p class="sm:hidden text-xs text-muted mt-1.5">
              Klient seit {{ formatShortDate(client.createdAt) }} · {{ formatClientSince(client.createdAt, now) }}
            </p>
          </div>
          <div class="flex items-center gap-2 max-sm:w-full">
            <UButton label="Spontan-Termin" icon="i-lucide-video" size="sm" @click="openAdHoc" />
            <UButton label="Bearbeiten" icon="i-lucide-pencil" color="neutral" variant="subtle" size="sm" @click="isFormOpen = true" />
            <UDropdownMenu :items="moreItems" :content="{ align: 'end' }">
              <UButton icon="i-lucide-ellipsis" color="neutral" variant="ghost" size="sm" aria-label="Weitere Aktionen" />
            </UDropdownMenu>
          </div>
        </div>

        <!-- Kennzahlen in den Karten des Dashboards (StatCard). Der nächste Termin steht nicht
             hier, sondern mit Einstieg in den Call in der rechten Spalte. -->
        <div class="hidden sm:grid grid-cols-3 gap-4">
          <StatCard
            icon="i-lucide-calendar-check"
            label="Gehaltene Sitzungen"
            :value="String(stats.heldCount)"
            :hint="stats.lastHeldAt ? `zuletzt am ${formatShortDate(stats.lastHeldAt)}` : 'noch keine'"
          />
          <StatCard
            icon="i-lucide-user-x"
            label="Nicht erschienen"
            :value="stats.noShowCount ? `${stats.noShowCount}-mal` : 'nie'"
          />
          <StatCard
            icon="i-lucide-user-round"
            label="Klient seit"
            :value="formatShortDate(client.createdAt)"
            :hint="formatClientSince(client.createdAt, now)"
          />
        </div>

        <!-- Auf dem Handy kompakt: zwei kleine Karten nebeneinander, ohne Symbol. Drei große
             Karten untereinander schöben die Reiter fast einen Bildschirm tief. -->
        <dl class="sm:hidden grid grid-cols-2 gap-2">
          <div class="rounded-xl border border-default bg-white dark:bg-neutral-900 px-3 py-2.5">
            <dt class="text-xs text-muted">Gehaltene Sitzungen</dt>
            <dd class="font-medium text-highlighted">{{ stats.heldCount }}</dd>
            <dd v-if="stats.lastHeldAt" class="text-xs text-muted">zuletzt {{ formatShortDate(stats.lastHeldAt) }}</dd>
          </div>
          <div class="rounded-xl border border-default bg-white dark:bg-neutral-900 px-3 py-2.5">
            <dt class="text-xs text-muted">Nicht erschienen</dt>
            <dd class="font-medium text-highlighted">{{ stats.noShowCount ? `${stats.noShowCount}-mal` : 'nie' }}</dd>
          </div>
        </dl>
      </header>

      <AdHocSessionModal
        v-model:open="adHocOpen"
        :client="{ id: client.id, name: client.name }"
        :offers="offers"
      />

      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-6 lg:gap-8 items-start">
        <!-- Linke Spalte: Reiter -->
        <section class="min-w-0 flex flex-col gap-4 min-h-96">
          <UTabs v-model="activeTab" :items="tabItems" :content="false" variant="link" size="sm" />

          <div v-show="activeTab === 'sessions'" class="flex flex-col gap-4">
            <div v-if="!client.bookings.length" class="rounded-xl border border-dashed border-default p-8 flex flex-col items-center gap-2 text-center">
              <UIcon name="i-lucide-calendar-days" class="size-5 text-muted" />
              <p class="text-sm text-muted">Für diesen Klienten ist noch kein Termin erfasst.</p>
            </div>

            <!-- Kachel-Aufbau bewusst identisch zu BookingAgenda.vue (Kalender/Agenda):
                 gleiche Rahmen-/Hintergrundlogik je Status, gleiche dreizeilige Hierarchie.
                 Statt der Uhrzeit allein steht hier das Datum mit davor, weil es auf dieser
                 Seite keine Tagesgruppierung gibt. Der Klientenname entfällt – wir sind
                 bereits in seinem Profil. Ein Klick öffnet wie dort das Termin-Detail. -->
            <template v-else>
              <div v-if="upcoming.length">
                <p class="text-xs font-medium uppercase tracking-wide text-muted mb-2">Anstehend</p>
                <div class="flex flex-col gap-2">
                  <button
                    v-for="booking in upcoming"
                    :key="booking.id"
                    type="button"
                    class="w-full text-left flex items-start gap-3 rounded-xl border p-4 border-default bg-white dark:bg-neutral-900 hover:border-accented transition-colors cursor-pointer outline-primary/25 focus-visible:outline-3"
                    :class="booking.status === 'pending' && 'booking-pending'"
                    @click="openDetail(booking)"
                  >
                    <span
                      v-if="booking.offerId"
                      class="w-1 rounded-full shrink-0 self-stretch"
                      :style="{ backgroundColor: offerColor(booking.offerId) }"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-baseline justify-between gap-3">
                        <span class="text-base font-medium tabular-nums text-highlighted">
                          {{ formatDayHeading(booking.start) }}, {{ formatTimeRange(booking) }}
                        </span>
                        <span
                          v-if="booking.id === nextBookingId && formatRelativeToStart(booking.start)"
                          class="text-xs text-primary shrink-0"
                        >
                          {{ formatRelativeToStart(booking.start) }}
                        </span>
                      </div>
                      <div v-if="isAdHoc(booking) || booking.status === 'pending'" class="mt-1 flex items-center gap-2">
                        <UBadge v-if="isAdHoc(booking)" :label="AD_HOC_LABEL" color="info" variant="subtle" size="sm" />
                        <UBadge v-if="booking.status === 'pending'" :label="STATUS_LABELS.pending" color="warning" variant="subtle" size="sm" />
                      </div>
                      <div class="mt-0.5 flex items-center gap-2 text-sm text-muted min-w-0">
                        <span class="truncate">{{ booking.durationMinutes }} Min. · {{ booking.offerName }}</span>
                        <UIcon v-if="booking.clientNote" name="i-lucide-message-square-text" class="size-4 shrink-0" />
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div v-if="past.length">
                <p class="text-xs font-medium uppercase tracking-wide text-muted mb-2">Vergangen</p>
                <div class="flex flex-col gap-2">
                  <button
                    v-for="booking in past"
                    :key="booking.id"
                    type="button"
                    class="w-full text-left flex items-start gap-3 rounded-xl border p-4 transition-colors cursor-pointer outline-primary/25 focus-visible:outline-3"
                    :class="booking.status === 'cancelled'
                      ? 'border-default border-dashed bg-transparent opacity-60'
                      : 'border-default bg-white dark:bg-neutral-900 hover:border-accented'"
                    @click="openDetail(booking)"
                  >
                    <span
                      v-if="booking.offerId"
                      class="w-1 rounded-full shrink-0 self-stretch"
                      :style="{ backgroundColor: offerColor(booking.offerId) }"
                    />
                    <div class="flex-1 min-w-0">
                      <div class="flex items-baseline justify-between gap-3">
                        <span
                          class="text-base font-medium tabular-nums"
                          :class="booking.status === 'cancelled' ? 'text-muted line-through' : 'text-highlighted'"
                        >
                          {{ formatShortDate(booking.start) }}, {{ formatTimeRange(booking) }}
                        </span>
                      </div>
                      <div v-if="isAdHoc(booking) || booking.status === 'cancelled' || booking.status === 'no_show'" class="mt-1 flex items-center gap-2">
                        <UBadge v-if="isAdHoc(booking)" :label="AD_HOC_LABEL" color="info" variant="subtle" size="sm" />
                        <UBadge v-if="booking.status === 'cancelled'" :label="STATUS_LABELS.cancelled" color="neutral" variant="subtle" size="sm" />
                        <UBadge v-if="booking.status === 'no_show'" :label="STATUS_LABELS.no_show" icon="i-lucide-user-x" color="warning" variant="subtle" size="sm" />
                      </div>
                      <div class="mt-0.5 flex items-center gap-2 text-sm text-muted min-w-0">
                        <span class="truncate">{{ booking.durationMinutes }} Min. · {{ booking.offerName }}</span>
                        <UIcon v-if="booking.clientNote" name="i-lucide-message-square-text" class="size-4 shrink-0" />
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </template>
          </div>

          <ClientNotesTimeline v-if="visitedTabs.has('notes')" v-show="activeTab === 'notes'" :client-id="client.id" />
          <ClientFilesList v-if="visitedTabs.has('files')" v-show="activeTab === 'files'" :client-id="client.id" :client-name="client.name" />
        </section>

        <!-- Rechte Spalte: bleibt beim Scrollen stehen. Auf dem Handy der Reiter „Profil“. -->
        <!-- Zwei gleich gebaute Karten: Symbol und Titel oben, darunter der Inhalt zum Lesen. -->
        <aside v-if="showAside" class="flex flex-col gap-4 lg:sticky lg:top-0">
          <div class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-4 flex flex-col gap-3">
            <h2 class="flex items-center gap-2 text-sm font-medium text-highlighted">
              <UIcon name="i-lucide-calendar-clock" class="size-4 text-primary" />
              Nächster Termin
            </h2>
            <template v-if="nextBooking">
              <div>
                <p class="font-medium text-highlighted tabular-nums">
                  {{ formatDayHeading(nextBooking.start) }}, {{ formatTimeRange(nextBooking) }}
                </p>
                <p class="text-sm text-muted">{{ nextBooking.durationMinutes }} Min. · {{ nextBooking.offerName }}</p>
                <p v-if="formatRelativeToStart(nextBooking.start)" class="text-xs text-primary mt-0.5">{{ formatRelativeToStart(nextBooking.start) }}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <UButton v-if="canStartNext" :to="`/call/${nextBooking.id}`" label="Sitzung starten" icon="i-lucide-video" size="sm" />
                <UButton label="Termin öffnen" color="neutral" variant="subtle" size="sm" @click="openDetail(nextBooking)" />
              </div>
            </template>
            <p v-else class="text-sm text-muted">Kein Termin geplant.</p>
          </div>

          <ClientPrivateCard :client="client" @saved="onSaved" />
        </aside>
      </div>

      <UModal v-model:open="deleteOpen" :title="`${client.name} löschen?`">
        <template #body>
          <div class="flex flex-col gap-3 text-sm">
            <template v-if="hasOpenBookings">
              <UAlert
                icon="i-lucide-calendar-clock"
                color="warning"
                variant="soft"
                title="Es stehen noch Termine an"
                description="Sage sie zuerst ab – dann bekommt der Klient seine Absage-Mail. Danach kannst du ihn löschen."
              />
            </template>
            <template v-else>
              <p>Gelöscht werden die Kontaktdaten, alle Termine samt Notizen, Chatverlauf und geteilten Dateien. Das lässt sich nicht rückgängig machen.</p>
              <p class="text-muted">Aus den Datensicherungen verschwinden die Daten nach rund vier Monaten. HxRoom vermerkt die Löschung ohne Namen oder Adresse.</p>
            </template>
            <UAlert v-if="deleteError" icon="i-lucide-circle-x" color="error" variant="soft" :description="deleteError" />
          </div>
        </template>
        <template #footer>
          <div class="flex justify-end gap-2 w-full">
            <UButton label="Abbrechen" color="neutral" variant="outline" @click="deleteOpen = false" />
            <UButton
              v-if="!hasOpenBookings"
              label="Endgültig löschen"
              color="error"
              icon="i-lucide-trash-2"
              :loading="deleting"
              @click="deleteClient"
            />
          </div>
        </template>
      </UModal>

      <BookingDetailSlideover
        v-model:open="isDetailOpen"
        :booking="selectedBooking"
        @cancelled="applyBookingChange"
        @updated="applyBookingChange"
      />

      <ClientFormSlideover
        v-model:open="isFormOpen"
        :client="client"
        @saved="onSaved"
      />
    </template>
  </div>
</template>
