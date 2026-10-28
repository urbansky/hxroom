<script setup lang="ts">
import type { CoachBookingResponse } from '@hxroom/shared'

// Kurzansicht eines Termins in Kalender, Dashboard und Klientenprofil. Alles Ausführliche –
// Notizen im großen Editor, Chat und Dateien, Details – steht auf der Terminseite
// /bookings/:id (phase5-umsetzungsplan.md, Schritt 8a).
const props = defineProps<{ booking: CoachBookingResponse | null }>()
const emit = defineEmits<{
  cancelled: [booking: CoachBookingResponse]
  updated: [booking: CoachBookingResponse]
}>()

const open = defineModel<boolean>('open', { required: true })

const route = useRoute()
const isPickerOpen = ref(false)

const actions = useBookingActions(() => props.booking, {
  onUpdated: booking => emit('updated', booking),
  onCancelled: (booking) => {
    emit('cancelled', booking)
    open.value = false
  },
})
const { actionError, markingNoShow, isCancelled } = actions

// Beim Schließen zurücksetzen, damit der nächste Termin nicht mit halb ausgefülltem
// Absage-Formular aufgeht.
watch(open, (isOpen) => {
  if (!isOpen) actions.reset()
})

// Sitzungsnotizen – dieselben wie im Call, hier vor und nach der Sitzung bearbeitbar
// (funktionen/backoffice-coach.md 4.01). Geladen erst beim Öffnen, nicht für jede Buchung
// der Liste; beim Schließen oder beim Wechsel des Termins wird gespeichert.
const notes = useSessionNotes(() => (open.value ? props.booking?.id ?? null : null))
const { content: notesContent, ready: notesReady, loadError: notesLoadError, status: notesStatus } = notes

// Chat der Sitzung (B7): hier nur als Zeile mit Sprung auf die Terminseite. Geschrieben wird
// nur im laufenden Gespräch – ohne Einlass gibt es also keinen Verlauf, und für diese
// Termine, die allermeisten, wird gar nicht erst gefragt.
const chat = useSessionChat(() => (open.value && props.booking?.admittedAt ? props.booking.id : null))
const { messages: chatMessages, fileCount: chatFileCount, loadError: chatLoadError } = chat
const chatSummary = computed(() => formatChatSummary(chatMessages.value.length, chatFileCount.value))

// Im Klientenprofil selbst führte „Klientenprofil öffnen“ nur auf die Seite, auf der man
// schon steht.
const isOnClientProfile = computed(() =>
  !!props.booking?.clientId && route.path === `/clients/${props.booking.clientId}`,
)

// Altbestand hat keinen Urheber – dann bleibt es beim reinen Zeitpunkt.
const cancelledByLabel = computed(() => props.booking?.cancelledBy ? CANCELLED_BY_LABELS[props.booking.cancelledBy] : null)
</script>

<template>
  <USlideover v-model:open="open" title="Termin">
    <template #body>
      <div v-if="booking" class="flex flex-col gap-6">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-xs uppercase tracking-wide text-muted mb-1">Termin</p>
            <p class="text-highlighted font-medium" :class="isCancelled && 'line-through'">
              {{ formatDayHeading(booking.start) }}, {{ formatTimeRange(booking) }}
            </p>
            <p class="text-sm text-muted mt-0.5">
              {{ booking.durationMinutes }} Min. · {{ booking.offerName }}
            </p>
          </div>
          <UButton
            :to="`/bookings/${booking.id}`"
            label="Als Seite öffnen"
            icon="i-lucide-maximize-2"
            color="neutral"
            variant="subtle"
            size="xs"
            class="shrink-0"
          />
        </div>

        <BookingStatusBadges :booking="booking" />

        <div class="h-px bg-default" />

        <div>
          <p class="text-xs uppercase tracking-wide text-muted mb-1">Klient</p>
          <p class="text-highlighted font-medium">{{ booking.clientName }}</p>
          <div class="mt-2 flex flex-col gap-1 text-sm">
            <ULink :to="`mailto:${booking.clientEmail}`" class="text-primary">{{ booking.clientEmail }}</ULink>
            <ULink v-if="booking.clientPhone" :to="`tel:${booking.clientPhone}`" class="text-primary">{{ booking.clientPhone }}</ULink>
          </div>

          <!-- Probe-Sitzung: Der Coach ist selbst der Klient, eine Zuordnung ergäbe keinen Sinn. -->
          <p v-if="isTestSession(booking)" class="text-xs text-muted mt-2">
            Deine Probe-Sitzung mit dir selbst. Sie zählt in keiner Kennzahl und wird 24 Stunden nach dem Ende gelöscht.
          </p>

          <div v-if="!isTestSession(booking)" class="mt-3 flex items-center gap-2 flex-wrap">
            <UButton
              v-if="booking.clientId && !isOnClientProfile"
              :to="`/clients/${booking.clientId}`"
              label="Klientenprofil öffnen"
              icon="i-lucide-user-round"
              color="neutral"
              variant="subtle"
              size="xs"
            />
            <UButton
              :label="booking.clientId ? 'Anderem Klienten zuordnen' : 'Klient zuordnen'"
              icon="i-lucide-link"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="isPickerOpen = true"
            />
          </div>

          <p v-if="!booking.clientId && !isTestSession(booking)" class="text-xs text-muted mt-2">
            Noch keinem Klienten zugeordnet – das geschieht automatisch, sobald die Buchung bestätigt ist.
          </p>
        </div>

        <div v-if="booking.clientNote">
          <p class="text-xs uppercase tracking-wide text-muted mb-1">Nachricht</p>
          <p class="text-sm text-highlighted whitespace-pre-line border-l-2 border-primary/40 pl-3">
            {{ booking.clientNote }}
          </p>
        </div>

        <div v-if="booking.status === 'no_show'">
          <p class="text-xs uppercase tracking-wide text-muted mb-1">Nicht erschienen</p>
          <p class="text-sm text-muted">
            Dieser Termin zählt nicht als gehaltene Sitzung. Der Klient hat keine Nachricht bekommen.
          </p>
          <UButton
            class="mt-2"
            label="Doch erschienen"
            icon="i-lucide-undo-2"
            color="neutral"
            variant="subtle"
            size="xs"
            :loading="markingNoShow"
            @click="actions.setNoShow(false)"
          />
        </div>

        <div v-if="booking.cancelledAt">
          <p class="text-xs uppercase tracking-wide text-muted mb-1">Absage</p>
          <p class="text-sm text-highlighted">
            {{ formatDateTime(booking.cancelledAt) }}<template v-if="cancelledByLabel">, {{ cancelledByLabel }}</template>
          </p>
          <p
            v-if="booking.cancellationReason"
            class="text-sm text-highlighted whitespace-pre-line border-l-2 border-primary/40 pl-3 mt-2"
          >
            {{ booking.cancellationReason }}
          </p>
        </div>

        <div>
          <div class="flex items-center justify-between gap-2 mb-2">
            <p class="text-xs uppercase tracking-wide text-muted">Notizen</p>
            <div class="flex items-center gap-2">
              <SaveStatusHint :status="notesStatus" />
              <UBadge icon="i-lucide-lock" color="secondary" variant="subtle" size="sm" label="privat" />
            </div>
          </div>
          <RichTextEditor
            v-if="notesReady"
            :key="booking.id"
            v-model="notesContent"
            placeholder="Vorbereitung, Beobachtungen, nächste Schritte – nur für dich."
          />
          <UAlert
            v-else-if="notesLoadError"
            icon="i-lucide-alert-circle"
            color="error"
            variant="subtle"
            description="Die Notizen konnten nicht geladen werden."
            :actions="[{ label: 'Erneut versuchen', color: 'error', variant: 'outline', onClick: () => notes.reload() }]"
          />
          <USkeleton v-else class="h-44 rounded-lg" />
        </div>

        <!-- Erst sichtbar, wenn es einen Verlauf gibt: Eine Zeile während des Ladens stünde
             bei jeder Sitzung ohne Chat kurz da und verschwände wieder. Lesen und Dateien
             öffnen auf der Terminseite. -->
        <NuxtLink
          v-if="chatMessages.length"
          :to="{ path: `/bookings/${booking.id}`, query: { tab: 'chat' } }"
          class="flex items-center justify-between gap-2 rounded-md -mx-1 px-1 py-0.5 hover:bg-elevated focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span class="text-xs uppercase tracking-wide text-muted">Chat</span>
          <span class="flex items-center gap-1.5 text-xs text-muted">
            {{ chatSummary }}
            <UIcon name="i-lucide-arrow-right" class="size-4" />
          </span>
        </NuxtLink>
        <UAlert
          v-else-if="chatLoadError"
          icon="i-lucide-alert-circle"
          color="error"
          variant="subtle"
          description="Der Chat dieser Sitzung konnte nicht geladen werden."
          :actions="[{ label: 'Erneut versuchen', color: 'error', variant: 'outline', onClick: () => chat.reload() }]"
        />

        <div class="text-xs text-muted flex flex-col gap-0.5">
          <span>Gebucht am {{ formatDateTime(booking.createdAt) }}</span>
          <span v-if="booking.confirmedAt">Bestätigt am {{ formatDateTime(booking.confirmedAt) }}</span>
        </div>

        <p v-if="actionError" class="text-sm text-error">{{ actionError }}</p>
      </div>
    </template>

    <template #footer>
      <BookingActionBar v-if="booking" :booking="booking" :actions="actions" />
    </template>
  </USlideover>

  <!-- Bewusst außerhalb des USlideover: dessen Default-Slot ist der Trigger, dort
       gerendert würde der Picker als Auslöser statt als eigenes Overlay behandelt. -->
  <ClientPicker
    v-model:open="isPickerOpen"
    :current-client-id="booking?.clientId ?? null"
    @select="actions.assignClient"
  />
</template>
