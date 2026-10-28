<script setup lang="ts">
import type { CoachBookingResponse } from '@hxroom/shared'
import { CallChatPanel } from '@hxroom/ui'

definePageMeta({ middleware: 'auth' })

// Terminseite (phase5-umsetzungsplan.md, Schritt 8a): alles zu einer Sitzung an einem Ort.
// Das Slideover bleibt die Kurzansicht; hierher führen „Als Seite öffnen“, die Chat-Zeile
// des Slideovers und die Abschlusskarte nach dem Call.

const route = useRoute()
const router = useRouter()
const { $api } = useApi()

const bookingId = computed(() => route.params.id as string)

const booking = ref<CoachBookingResponse | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

async function loadBooking() {
  loading.value = true
  loadError.value = null
  try {
    booking.value = await $api<CoachBookingResponse>(`/bookings/${bookingId.value}`)
  } catch (err: any) {
    // Fremde Termine meldet die API als 404, damit ihre Existenz nicht durchsickert.
    loadError.value = err?.statusCode === 404
      ? 'Diesen Termin gibt es nicht.'
      : 'Der Termin konnte nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

await loadBooking()

const isPickerOpen = ref(false)
const actions = useBookingActions(booking, {
  onUpdated: updated => (booking.value = updated),
  // Nach der Absage bleibt der Coach hier und sieht den Termin als abgesagt.
  onCancelled: updated => (booking.value = updated),
})
const { actionError, markingNoShow, isCancelled } = actions

const notes = useSessionNotes(() => booking.value?.id ?? null)
const { content: notesContent, ready: notesReady, loadError: notesLoadError, status: notesStatus } = notes

// Ohne Einlass gibt es keinen Verlauf – geschrieben wird nur im laufenden Gespräch.
const chat = useSessionChat(() => (booking.value?.admittedAt ? booking.value.id : null))
const { messages: chatMessages, fileCount: chatFileCount, loading: chatLoading, loadError: chatLoadError, removeError: chatRemoveError } = chat
const chatSummary = computed(() => formatChatSummary(chatMessages.value.length, chatFileCount.value))

// Der Reiter steht in der URL, damit die Chat-Zeile des Slideovers direkt dorthin springt.
type TabValue = 'chat' | 'details'
const TAB_ITEMS = [
  { label: 'Chat & Dateien', value: 'chat', icon: 'i-lucide-message-square' },
  { label: 'Details', value: 'details', icon: 'i-lucide-info' },
]
const activeTab = computed<TabValue>({
  get: () => (route.query.tab === 'details' ? 'details' : route.query.tab === 'chat' ? 'chat' : (booking.value?.admittedAt ? 'chat' : 'details')),
  set: tab => router.replace({ query: { ...route.query, tab } }),
})

// Zurück dorthin, woher der Coach kam – Kalender, Dashboard, Klientenprofil oder der Call.
// Ohne Vorgeschichte (Link geöffnet, neu geladen) auf den Kalender.
function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/bookings')
}

const cancelledByLabel = computed(() => booking.value?.cancelledBy ? CANCELLED_BY_LABELS[booking.value.cancelledBy] : null)
const callDuration = computed(() => (booking.value ? formatCallDuration(booking.value) : null))
const originLabel = computed(() => {
  if (!booking.value) return null
  if (isTestSession(booking.value)) return 'Probe-Sitzung'
  if (isAdHoc(booking.value)) return 'Spontan-Termin'
  return 'Buchungsseite'
})
</script>

<template>
  <div class="p-4 sm:p-6 max-w-6xl mx-auto w-full flex flex-col gap-6">
    <UButton
      label="Zurück"
      icon="i-lucide-chevron-left"
      color="neutral"
      variant="ghost"
      size="sm"
      class="-ml-2 self-start"
      @click="goBack"
    />

    <div v-if="loading" class="flex flex-col gap-4">
      <USkeleton class="h-28 rounded-xl" />
      <USkeleton class="h-96 rounded-xl" />
    </div>

    <div v-else-if="loadError" class="flex flex-col items-start gap-3">
      <h1 class="font-serif text-2xl text-highlighted">Termin nicht gefunden</h1>
      <p class="text-sm text-muted">{{ loadError }}</p>
      <UButton to="/bookings" label="Zu den Terminen" color="neutral" variant="subtle" size="sm" />
    </div>

    <template v-else-if="booking">
      <!-- Kopf: wann, mit wem, was – und was sich damit tun lässt -->
      <header class="flex flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="min-w-0">
            <h1 class="font-serif text-3xl text-highlighted" :class="isCancelled && 'line-through'">
              {{ formatDayHeading(booking.start) }}, {{ formatTimeRange(booking) }}
            </h1>
            <p class="mt-1 text-muted">
              <NuxtLink
                v-if="booking.clientId"
                :to="`/clients/${booking.clientId}`"
                class="text-primary font-medium hover:underline"
              >{{ booking.clientName }}</NuxtLink>
              <span v-else class="text-highlighted font-medium">{{ booking.clientName }}</span>
              · {{ booking.durationMinutes }} Min. · {{ booking.offerName }}
            </p>
          </div>
          <UButton
            v-if="!isTestSession(booking)"
            :label="booking.clientId ? 'Anderem Klienten zuordnen' : 'Klient zuordnen'"
            icon="i-lucide-link"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="isPickerOpen = true"
          />
        </div>

        <BookingStatusBadges :booking="booking" />

        <UAlert
          v-if="booking.status === 'no_show'"
          icon="i-lucide-user-x"
          color="warning"
          variant="soft"
          title="Nicht erschienen"
          description="Dieser Termin zählt nicht als gehaltene Sitzung. Der Klient hat keine Nachricht bekommen."
          :actions="[{ label: 'Doch erschienen', icon: 'i-lucide-undo-2', color: 'warning', variant: 'outline', loading: markingNoShow, onClick: () => actions.setNoShow(false) }]"
        />

        <BookingActionBar :booking="booking" :actions="actions" />
        <p v-if="actionError" class="text-sm text-error">{{ actionError }}</p>
      </header>

      <!-- Notizen links, Chat und Details rechts; auf dem Handy untereinander, Notizen zuerst -->
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-start">
        <section class="flex flex-col gap-2 min-w-0">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-xs uppercase tracking-wide text-muted">Notizen</h2>
            <div class="flex items-center gap-2">
              <SaveStatusHint :status="notesStatus" />
              <UBadge icon="i-lucide-lock" color="secondary" variant="subtle" size="sm" label="privat" />
            </div>
          </div>
          <div v-if="notesReady" class="h-[28rem] lg:h-[36rem]">
            <RichTextEditor
              :key="booking.id"
              v-model="notesContent"
              fill
              class="h-full"
              placeholder="Vorbereitung, Beobachtungen, nächste Schritte – nur für dich."
            />
          </div>
          <UAlert
            v-else-if="notesLoadError"
            icon="i-lucide-alert-circle"
            color="error"
            variant="subtle"
            description="Die Notizen konnten nicht geladen werden."
            :actions="[{ label: 'Erneut versuchen', color: 'error', variant: 'outline', onClick: () => notes.reload() }]"
          />
          <USkeleton v-else class="h-[28rem] lg:h-[36rem] rounded-lg" />
        </section>

        <section class="flex flex-col gap-3 min-w-0">
          <UTabs v-model="activeTab" :items="TAB_ITEMS" :content="false" variant="link" size="sm" />

          <!-- Chat & Dateien: der Verlauf zum Nachlesen. Entfernen darf der Coach eine Datei
               auch nach der Sitzung, etwa auf einen Löschwunsch des Klienten hin. -->
          <div v-if="activeTab === 'chat'">
            <p v-if="!booking.admittedAt" class="text-sm text-muted">Zu diesem Termin gab es noch kein Gespräch.</p>
            <UAlert
              v-else-if="chatLoadError"
              icon="i-lucide-alert-circle"
              color="error"
              variant="subtle"
              description="Der Chat dieser Sitzung konnte nicht geladen werden."
              :actions="[{ label: 'Erneut versuchen', color: 'error', variant: 'outline', onClick: () => chat.reload() }]"
            />
            <USkeleton v-else-if="chatLoading && !chatMessages.length" class="h-[28rem] lg:h-[32rem] rounded-lg" />
            <p v-else-if="!chatMessages.length" class="text-sm text-muted">Im Gespräch wurde nichts geschrieben.</p>
            <template v-else>
              <p class="text-xs text-muted mb-2">{{ chatSummary }}</p>
              <div class="h-[28rem] lg:h-[32rem] rounded-lg border border-default bg-elevated/40 p-3">
                <CallChatPanel :messages="chatMessages" :peer-name="booking.clientName" readonly @remove="chat.remove" />
              </div>
              <p v-if="chatRemoveError" class="mt-2 text-sm text-error">Die Datei konnte nicht entfernt werden.</p>
            </template>
          </div>

          <!-- Details: was zur Buchung gehört, aber nicht in den Kopf -->
          <dl v-else class="flex flex-col gap-4 text-sm">
            <div v-if="booking.clientNote">
              <dt class="text-xs uppercase tracking-wide text-muted mb-1">Nachricht des Klienten</dt>
              <dd class="text-highlighted whitespace-pre-line border-l-2 border-primary/40 pl-3">{{ booking.clientNote }}</dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-muted mb-1">Kontakt</dt>
              <dd class="flex flex-col gap-0.5">
                <ULink :to="`mailto:${booking.clientEmail}`" class="text-primary">{{ booking.clientEmail }}</ULink>
                <ULink v-if="booking.clientPhone" :to="`tel:${booking.clientPhone}`" class="text-primary">{{ booking.clientPhone }}</ULink>
              </dd>
            </div>
            <div v-if="booking.admittedAt">
              <dt class="text-xs uppercase tracking-wide text-muted mb-1">Gespräch</dt>
              <dd class="text-highlighted">
                {{ formatTime(booking.admittedAt) }}<template v-if="booking.callEndedAt"> – {{ formatTime(booking.callEndedAt) }} Uhr</template><template v-else> Uhr, noch nicht beendet</template>
                <span v-if="callDuration" class="text-muted"> · {{ callDuration }}</span>
              </dd>
            </div>
            <div v-if="booking.cancelledAt">
              <dt class="text-xs uppercase tracking-wide text-muted mb-1">Absage</dt>
              <dd class="text-highlighted">
                {{ formatDateTime(booking.cancelledAt) }}<template v-if="cancelledByLabel">, {{ cancelledByLabel }}</template>
                <p v-if="booking.cancellationReason" class="whitespace-pre-line border-l-2 border-primary/40 pl-3 mt-2">
                  {{ booking.cancellationReason }}
                </p>
              </dd>
            </div>
            <div>
              <dt class="text-xs uppercase tracking-wide text-muted mb-1">Buchung</dt>
              <dd class="text-muted flex flex-col gap-0.5">
                <span>Über: {{ originLabel }}</span>
                <span>Gebucht am {{ formatDateTime(booking.createdAt) }}</span>
                <span v-if="booking.confirmedAt">Bestätigt am {{ formatDateTime(booking.confirmedAt) }}</span>
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </template>

    <ClientPicker
      v-model:open="isPickerOpen"
      :current-client-id="booking?.clientId ?? null"
      @select="actions.assignClient"
    />
  </div>
</template>
