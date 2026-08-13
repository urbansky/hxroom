<script setup lang="ts">
import type { ClientDetail, ClientResponse, CoachBookingResponse } from '@hxroom/shared'

definePageMeta({ middleware: 'auth' })

const route = useRoute()
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

// Die API liefert die Historie absteigend – für die Anzeige wird sie in anstehende
// und vergangene Termine getrennt. Abgesagte Termine gelten als vergangen, egal wann
// sie stattgefunden hätten: sie stehen niemandem mehr bevor.
const upcoming = computed<CoachBookingResponse[]>(() => {
  const now = Date.now()
  return (client.value?.bookings ?? [])
    .filter(b => b.status !== 'cancelled' && new Date(b.start).getTime() >= now)
    .slice()
    .reverse()
})

const past = computed<CoachBookingResponse[]>(() => {
  const now = Date.now()
  return (client.value?.bookings ?? [])
    .filter(b => b.status === 'cancelled' || new Date(b.start).getTime() < now)
})

// Nächster anstehender Termin – wird wie in der Agenda hervorgehoben und mit
// relativer Zeitangabe versehen.
const nextBookingId = computed(() => upcoming.value[0]?.id ?? null)

const isFormOpen = ref(false)

function onSaved(saved: ClientResponse) {
  if (!client.value) return
  // Nur die Stammdaten ersetzen – die Sitzungshistorie ändert sich beim Bearbeiten nicht.
  client.value = { ...client.value, ...saved }
}
</script>

<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto w-full">
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
      <!-- Stammdaten -->
      <div class="flex items-start gap-4 mb-8">
        <span class="size-14 shrink-0 rounded-full bg-primary/10 text-primary font-medium flex items-center justify-center">
          {{ clientInitials(client.name) }}
        </span>
        <div class="flex-1 min-w-0">
          <h1 class="font-serif text-3xl text-highlighted mb-1 break-words">{{ client.name }}</h1>
          <div class="flex flex-col gap-0.5 text-sm">
            <ULink :to="`mailto:${client.email}`" class="text-primary break-all">{{ client.email }}</ULink>
            <ULink v-if="client.phone" :to="`tel:${client.phone}`" class="text-primary">{{ client.phone }}</ULink>
          </div>
          <p class="text-xs text-muted mt-2">Klient seit {{ formatShortDate(client.createdAt) }}</p>
        </div>
        <UButton
          label="Bearbeiten"
          icon="i-lucide-pencil"
          color="neutral"
          variant="subtle"
          size="sm"
          class="shrink-0"
          @click="isFormOpen = true"
        />
      </div>

      <!-- Interne Notiz -->
      <div class="mb-8">
        <div class="flex items-center gap-2 mb-2">
          <h2 class="text-sm font-medium text-highlighted">Notiz</h2>
          <UBadge label="Nur für dich sichtbar" color="neutral" variant="subtle" size="sm" />
        </div>
        <p v-if="client.note" class="text-sm text-highlighted whitespace-pre-line border-l-2 border-primary/40 pl-3">
          {{ client.note }}
        </p>
        <p v-else class="text-sm text-muted">
          Noch keine Notiz hinterlegt.
        </p>
      </div>

      <!-- Sitzungshistorie -->
      <h2 class="text-sm font-medium text-highlighted mb-3">Sitzungen</h2>

      <div v-if="!client.bookings.length" class="rounded-xl border border-dashed border-default p-8 flex flex-col items-center gap-2 text-center">
        <UIcon name="i-lucide-calendar-days" class="size-5 text-muted" />
        <p class="text-sm text-muted">Für diesen Klienten ist noch kein Termin erfasst.</p>
      </div>

      <!-- Kachel-Aufbau bewusst identisch zu BookingAgenda.vue (Kalender/Agenda):
           gleiche Rahmen-/Hintergrundlogik je Status, gleiche dreizeilige Hierarchie.
           Statt der Uhrzeit allein steht hier das Datum mit davor, weil es auf dieser
           Seite keine Tagesgruppierung gibt. Der Klientenname entfällt – wir sind
           bereits in seinem Profil. Die Kacheln sind bewusst nicht klickbar: auf dieser
           Seite gibt es keine Termin-Detailansicht. -->
      <template v-else>
        <template v-if="upcoming.length">
          <p class="text-xs font-medium uppercase tracking-wide text-muted mb-2">Anstehend</p>
          <div class="flex flex-col gap-2 mb-6">
            <div
              v-for="booking in upcoming"
              :key="booking.id"
              class="flex items-start gap-3 rounded-xl border p-4"
              :class="booking.status === 'pending'
                ? 'border-default border-dashed bg-white dark:bg-neutral-900'
                : 'border-default bg-white dark:bg-neutral-900'"
            >
              <span
                v-if="booking.offerId"
                class="w-1 rounded-full shrink-0 self-stretch"
                :style="{ backgroundColor: offerColor(booking.offerId) }"
              />

              <div class="flex-1 min-w-0">
                <div class="flex items-baseline justify-between gap-3">
                  <!-- text-base statt text-sm: Diese Zeile ist hier der Anker der Kachel –
                       das Gegenstück zum Klientennamen in BookingAgenda.vue, der dort
                       ebenfalls in der geerbten Basisgröße steht. Der Name entfällt im
                       Profil, sonst hätte die Kachel keine Zeile in dieser Größe. -->
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

                <div v-if="booking.status === 'pending'" class="mt-1">
                  <UBadge :label="STATUS_LABELS.pending" color="warning" variant="subtle" size="sm" />
                </div>

                <div class="mt-0.5 flex items-center gap-2 text-sm text-muted min-w-0">
                  <span class="truncate">{{ booking.durationMinutes }} Min. · {{ booking.offerName }}</span>
                  <UIcon v-if="booking.clientNote" name="i-lucide-message-square-text" class="size-4 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </template>

        <template v-if="past.length">
          <p class="text-xs font-medium uppercase tracking-wide text-muted mb-2">Vergangen</p>
          <div class="flex flex-col gap-2">
            <div
              v-for="booking in past"
              :key="booking.id"
              class="flex items-start gap-3 rounded-xl border p-4"
              :class="booking.status === 'cancelled'
                ? 'border-default border-dashed bg-transparent opacity-60'
                : 'border-default bg-white dark:bg-neutral-900'"
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

                <div v-if="booking.status === 'cancelled'" class="mt-1">
                  <UBadge :label="STATUS_LABELS.cancelled" color="neutral" variant="subtle" size="sm" />
                </div>

                <div class="mt-0.5 flex items-center gap-2 text-sm text-muted min-w-0">
                  <span class="truncate">{{ booking.durationMinutes }} Min. · {{ booking.offerName }}</span>
                  <UIcon v-if="booking.clientNote" name="i-lucide-message-square-text" class="size-4 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </template>
      </template>

      <!-- Angekündigt, siehe doc/funktionen/backoffice-coach.md Funktion 05 -->
      <div class="mt-8">
        <UpcomingFeature
          icon="i-lucide-target"
          title="Coaching-Ziele & Themen"
          description="Strukturierte Felder für Ziele, Schwerpunkte und persönliche Hintergründe."
        />
      </div>

      <ClientFormSlideover
        v-model:open="isFormOpen"
        :client="client"
        @saved="onSaved"
      />
    </template>
  </div>
</template>
