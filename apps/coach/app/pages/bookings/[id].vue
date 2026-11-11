<script setup lang="ts">
import type { CoachBookingResponse } from '@hxroom/shared'
import { CallChatPanel } from '@hxroom/ui'

definePageMeta({ middleware: 'auth' })

// Terminseite (technisches-konzept.md §5, „Terminseite“): alles zu einer Sitzung an einem Ort.
// Das Slideover bleibt die Kurzansicht; hierher führen „Als Seite öffnen“, die Chat-Zeile
// des Slideovers und die Abschlusskarte nach dem Call.

const route = useRoute()
const router = useRouter()
const { $api } = useApi()
const toast = useToast()

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
const followUpOpen = ref(false)
const actions = useBookingActions(booking, {
  onUpdated: updated => (booking.value = updated),
  // Nach der Absage bleibt der Coach hier und sieht den Termin als abgesagt.
  onCancelled: updated => (booking.value = updated),
  // Nach dem Löschen gibt es hier nichts mehr zu sehen – zurück in die Terminübersicht.
  onDeleted: async () => {
    notes.discard()
    toast.add({ title: 'Termin gelöscht', icon: 'i-lucide-check', color: 'success' })
    await navigateTo('/bookings')
  },
})
const { actionError, markingNoShow, isCancelled } = actions

const notes = useSessionNotes(() => booking.value?.id ?? null)
const { content: notesContent, ready: notesReady, loadError: notesLoadError, status: notesStatus } = notes

// Ohne Einlass gibt es keinen Verlauf – geschrieben wird nur im laufenden Gespräch.
const chat = useSessionChat(() => (booking.value?.admittedAt ? booking.value.id : null))
const { messages: chatMessages, fileCount: chatFileCount, loading: chatLoading, loadError: chatLoadError, removeError: chatRemoveError } = chat
const chatSummary = computed(() => formatChatSummary(chatMessages.value.length, chatFileCount.value))

// Der Reiter steht in der URL, damit die Chat-Zeile des Slideovers direkt dorthin springt.
// Reiter gibt es erst nach dem Einlass: Vorher hätte „Chat & Dateien“ nichts zu zeigen.
type TabValue = 'chat' | 'details'
const TAB_ITEMS = [
  { label: 'Details', value: 'details', icon: 'i-lucide-info' },
  { label: 'Chat & Dateien', value: 'chat', icon: 'i-lucide-message-square' },
]
const activeTab = computed<TabValue>({
  get: () => (route.query.tab === 'chat' && booking.value?.admittedAt ? 'chat' : 'details'),
  set: tab => router.replace({ query: { ...route.query, tab } }),
})

// Zurück dorthin, woher der Coach kam – Termine, Dashboard, Klientenprofil oder der Call.
// Ohne Vorgeschichte (Link geöffnet, neu geladen) auf die Termine.
function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/bookings')
}

// Nur für Bevorstehendes; was begonnen hat, steht mit Uhrzeit im Titel.
const relativeStart = computed(() => (booking.value && !isCancelled.value ? formatRelativeToStart(booking.value.start) : null))

// Verlauf: was mit dem Termin bisher geschehen ist, in zeitlicher Folge. Ein offener
// Schritt (Bestätigung steht aus) ist hohl gezeichnet. „Nicht erschienen“ fehlt hier
// bewusst – das steht samt „Doch erschienen“ im Kopf.
const CREATED_LABELS: Record<CoachBookingResponse['origin'], string> = {
  booking_page: 'Gebucht über die Buchungsseite',
  ad_hoc: 'Als Spontan-Termin angelegt',
  test: 'Probe-Sitzung angelegt',
  manual: 'Von dir angelegt',
}

interface HistoryEntry {
  key: string
  label: string
  time?: string
  detail?: string | null
  quote?: string | null
  tone: 'done' | 'open' | 'cancelled'
}
const historyEntries = computed<HistoryEntry[]>(() => {
  const b = booking.value
  if (!b) return []
  const entries: HistoryEntry[] = [{
    key: 'created',
    label: CREATED_LABELS[b.origin],
    time: formatDateTime(b.createdAt),
    tone: 'done',
  }]
  // Vom Coach angelegte Termine waren nie offen, eine Bestätigung gibt es dort nicht.
  if (b.origin === 'booking_page') {
    if (b.confirmedAt) {
      entries.push({ key: 'confirmed', label: 'Bestätigt', time: formatDateTime(b.confirmedAt), tone: 'done' })
    } else if (b.status === 'pending') {
      entries.push({ key: 'confirmed', label: 'Bestätigung steht aus', detail: 'Der Klient hat den Bestätigungslink noch nicht angeklickt.', tone: 'open' })
    }
  }
  if (b.admittedAt) {
    entries.push({
      key: 'call',
      label: 'Gespräch',
      time: b.callEndedAt
        ? `${formatTime(b.admittedAt)} – ${formatTime(b.callEndedAt)} Uhr`
        : `seit ${formatTime(b.admittedAt)} Uhr, noch nicht beendet`,
      detail: formatCallDuration(b),
      tone: 'done',
    })
  }
  if (b.cancelledAt) {
    const by = b.cancelledBy ? CANCELLED_BY_LABELS[b.cancelledBy] : null
    entries.push({
      key: 'cancelled',
      label: by ? `Abgesagt, ${by}` : 'Abgesagt',
      time: formatDateTime(b.cancelledAt),
      quote: b.cancellationReason,
      tone: 'cancelled',
    })
  }
  return entries
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
      <!-- Kopf: wann, mit wem, was – rechts die Aktionen wie auf der Klientenseite (UX-01).
           Auf dem Handy rutschen die Knöpfe unter den Titel. -->
      <header class="flex flex-col gap-4">
        <div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div class="min-w-0 flex-1">
            <!-- Auf dem Handy steht die Uhrzeit in einer eigenen Zeile, statt mitten im
                 Zeitraum umzubrechen. -->
            <h1 class="font-serif text-2xl sm:text-3xl text-highlighted" :class="isCancelled && 'line-through'">
              {{ formatDayHeading(booking.start) }}<span class="max-sm:block whitespace-nowrap"><span class="max-sm:hidden"> · </span>{{ formatTimeRange(booking) }}</span>
            </h1>
            <!-- Kurzangaben als fließender Text: Das geschützte Leerzeichen hält jeden Punkt am
                 Ende der Zeile, sodass keine Zeile mit „·“ beginnt. Die Angebotsfarbe als
                 Punkt, wie die Linie der Terminkacheln; ohne Angebot entfällt sie. -->
            <div class="mt-2 text-muted leading-7">
              <NuxtLink
                v-if="booking.clientId"
                :to="`/clients/${booking.clientId}`"
                class="text-primary font-medium hover:underline"
              >{{ booking.clientName }}</NuxtLink>
              <span v-else class="text-highlighted font-medium">{{ booking.clientName }}</span>&nbsp;·
              <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
                <span
                  v-if="booking.offerId"
                  class="size-2 rounded-full shrink-0"
                  :style="{ backgroundColor: offerColor(booking.offerId) }"
                />
                {{ booking.offerName }}
              </span>&nbsp;·
              <span class="whitespace-nowrap">{{ formatBookingDuration(booking) }}</span>
              <template v-if="booking.series">&nbsp;·
                <span class="whitespace-nowrap">Termin {{ booking.series.position }} von {{ booking.series.count }}</span>
              </template>
              <div class="inline-flex items-center gap-2 align-middle ml-1">
                <BookingStatusBadges :booking="booking" hide-hint />
                <span v-if="relativeStart" class="text-sm text-primary whitespace-nowrap">{{ relativeStart }}</span>
              </div>
            </div>
          </div>
          <BookingHeaderActions
            :booking="booking"
            :actions="actions"
            @assign="isPickerOpen = true"
            @follow-up="followUpOpen = true"
          />
        </div>

        <UAlert
          v-if="booking.status === 'no_show'"
          icon="i-lucide-user-x"
          color="warning"
          variant="soft"
          title="Nicht erschienen"
          description="Dieser Termin zählt nicht als gehaltene Sitzung. Der Klient hat keine Nachricht bekommen."
          :actions="[{ label: 'Doch erschienen', icon: 'i-lucide-undo-2', color: 'warning', variant: 'outline', loading: markingNoShow, onClick: () => actions.setNoShow(false) }]"
        />

        <p v-if="actionError && !actions.confirmingCancel.value" class="text-sm text-error">{{ actionError }}</p>
      </header>

      <!-- Notizen links, Details und Chat rechts; auf dem Handy untereinander, Notizen zuerst -->
      <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6 items-start">
        <!-- Beide Spalten gleich gebaut (UX-02): eine Kopfzeile in Höhe der Reiter, darunter
             eine Karte. Dass die Notizen privat sind, sagt das Schloss im Kopf. -->
        <section class="flex flex-col gap-3 min-w-0">
          <div class="flex items-center justify-between gap-2 h-10 border-b border-default">
            <h2 class="flex items-center gap-1.5 text-sm font-medium text-highlighted">
              <UIcon name="i-lucide-lock" class="size-4 text-muted" />
              Notizen
            </h2>
            <SaveStatusHint :status="notesStatus" />
          </div>
          <!-- Tiptap übernimmt den Platzhalter nur beim Anlegen; der Absagezustand im key
               baut den Editor nach einer Absage neu auf, damit der passende dasteht. -->
          <RichTextEditor
            v-if="notesReady"
            :key="`${booking.id}-${isCancelled}`"
            v-model="notesContent"
            card
            :placeholder="notesPlaceholder(booking)"
          />
          <UAlert
            v-else-if="notesLoadError"
            icon="i-lucide-alert-circle"
            color="error"
            variant="subtle"
            description="Die Notizen konnten nicht geladen werden."
            :actions="[{ label: 'Erneut versuchen', color: 'error', variant: 'outline', onClick: () => notes.reload() }]"
          />
          <USkeleton v-else class="h-80 rounded-xl" />
        </section>

        <section class="flex flex-col gap-3 min-w-0">
          <UTabs
            v-if="booking.admittedAt"
            v-model="activeTab"
            :items="TAB_ITEMS"
            :content="false"
            variant="link"
            size="sm"
            :ui="{ list: 'h-10' }"
          />
          <div v-else class="flex items-center h-10 border-b border-default">
            <h2 class="flex items-center gap-1.5 text-sm font-medium text-highlighted">
              <UIcon name="i-lucide-info" class="size-4 text-muted" />
              Details
            </h2>
          </div>

          <!-- Chat & Dateien: der Verlauf zum Nachlesen. Entfernen darf der Coach eine Datei
               auch nach der Sitzung, etwa auf einen Löschwunsch des Klienten hin. -->
          <div v-if="activeTab === 'chat'" class="rounded-xl border border-default bg-white dark:bg-muted p-4">
            <UAlert
              v-if="chatLoadError"
              icon="i-lucide-alert-circle"
              color="error"
              variant="subtle"
              description="Der Chat dieser Sitzung konnte nicht geladen werden."
              :actions="[{ label: 'Erneut versuchen', color: 'error', variant: 'outline', onClick: () => chat.reload() }]"
            />
            <USkeleton v-else-if="chatLoading && !chatMessages.length" class="h-[28rem] lg:h-[32rem] rounded-lg" />
            <p v-else-if="!chatMessages.length" class="text-sm text-muted">Im Gespräch wurde nichts geschrieben.</p>
            <template v-else>
              <p class="text-xs text-muted mb-3">{{ chatSummary }}</p>
              <div class="h-[28rem] lg:h-[32rem] rounded-lg bg-elevated/40 p-3">
                <CallChatPanel :messages="chatMessages" :peer-name="booking.clientName" readonly @remove="chat.remove" />
              </div>
              <p v-if="chatRemoveError" class="mt-2 text-sm text-error">Die Datei konnte nicht entfernt werden.</p>
            </template>
          </div>

          <!-- Details: was zur Buchung gehört, aber nicht in den Kopf -->
          <dl v-else class="rounded-xl border border-default bg-white dark:bg-muted p-4 flex flex-col gap-5 text-sm">
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
            <div>
              <dt class="text-xs uppercase tracking-wide text-muted mb-2">Verlauf</dt>
              <dd>
                <ol class="flex flex-col">
                  <li
                    v-for="(entry, index) in historyEntries"
                    :key="entry.key"
                    class="relative flex gap-3"
                    :class="index < historyEntries.length - 1 && 'pb-4'"
                  >
                    <!-- Verbindungslinie zum nächsten Punkt, mittig unter dem Punkt -->
                    <span
                      v-if="index < historyEntries.length - 1"
                      class="absolute left-[4.5px] top-4 bottom-0 w-px bg-accented"
                      aria-hidden="true"
                    />
                    <span
                      class="mt-1.5 size-2.5 rounded-full shrink-0"
                      :class="{
                        'bg-primary': entry.tone === 'done',
                        'border-2 border-accented bg-default': entry.tone === 'open',
                        'bg-error/70': entry.tone === 'cancelled',
                      }"
                      aria-hidden="true"
                    />
                    <div class="min-w-0">
                      <p class="text-highlighted">{{ entry.label }}</p>
                      <p v-if="entry.time || entry.detail" class="text-xs text-muted">
                        {{ [entry.time, entry.detail].filter(Boolean).join(' · ') }}
                      </p>
                      <p v-if="entry.quote" class="text-highlighted whitespace-pre-line border-l-2 border-primary/40 pl-3 mt-2">
                        {{ entry.quote }}
                      </p>
                    </div>
                  </li>
                </ol>
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

    <FollowUpBookingModal v-if="booking" v-model:open="followUpOpen" :booking="booking" />
  </div>
</template>
