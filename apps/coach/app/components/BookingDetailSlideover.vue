<script setup lang="ts">
import { isWithinCallWindow, type CoachBookingResponse } from '@hxroom/shared'

const props = defineProps<{ booking: CoachBookingResponse | null }>()
const emit = defineEmits<{
  cancelled: [booking: CoachBookingResponse]
  updated: [booking: CoachBookingResponse]
}>()

const open = defineModel<boolean>('open', { required: true })

const { $api } = useApi()

const confirmingCancel = ref(false)
const cancelReason = ref('')
const cancelling = ref(false)
const actionError = ref<string | null>(null)
const downloading = ref(false)
const isPickerOpen = ref(false)

// Beim Schließen zurücksetzen, damit der nächste Termin nicht mit halb ausgefülltem
// Absage-Formular aufgeht.
watch(open, (isOpen) => {
  if (!isOpen) {
    confirmingCancel.value = false
    cancelReason.value = ''
    actionError.value = null
  }
})

const isCancelled = computed(() => props.booking?.status === 'cancelled')
// Altbestand hat keinen Urheber – dann bleibt es beim reinen Zeitpunkt.
const cancelledByLabel = computed(() => props.booking?.cancelledBy ? CANCELLED_BY_LABELS[props.booking.cancelledBy] : null)
// Minütlich nachgeführt: Das Slideover bleibt beim Warten offen stehen, und der
// "Sitzung starten"-Knopf soll dann von selbst erscheinen.
const now = ref(new Date())
let nowTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  nowTimer = setInterval(() => (now.value = new Date()), 60_000)
})
onUnmounted(() => clearInterval(nowTimer))

const isPast = computed(() => !!props.booking && new Date(props.booking.end) < now.value)

// Startbar ist eine bestätigte Sitzung im Zugangsfenster – dieselben Grenzen, nach denen
// der Server den Zugang gewährt (@hxroom/shared).
const canStart = computed(() =>
  !!props.booking
  && props.booking.status === 'confirmed'
  && isWithinCallWindow(new Date(props.booking.start), new Date(props.booking.end), now.value),
)

async function downloadIcs() {
  if (!props.booking) return
  downloading.value = true
  actionError.value = null
  try {
    // Bewusst über $api statt über einen <a href>: die API liegt auf einer anderen
    // Subdomain, ein reiner Link würde die Session-Cookies nicht mitschicken.
    const blob = await $api<Blob>(`/bookings/${props.booking.id}/calendar.ics`, { responseType: 'blob' })
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
  if (!props.booking) return
  actionError.value = null
  try {
    const updated = await $api<CoachBookingResponse>(`/bookings/${props.booking.id}/client`, {
      method: 'PATCH',
      body: { clientId },
    })
    emit('updated', updated)
  } catch {
    actionError.value = 'Zuordnung konnte nicht gespeichert werden.'
  }
}

async function cancelBooking() {
  if (!props.booking) return
  cancelling.value = true
  actionError.value = null
  try {
    const updated = await $api<CoachBookingResponse>(`/bookings/${props.booking.id}/cancel`, {
      method: 'POST',
      body: { reason: cancelReason.value.trim() || undefined },
    })
    emit('cancelled', updated)
    open.value = false
  } catch (err: any) {
    actionError.value = err?.statusCode === 409
      ? 'Dieser Termin ist bereits abgesagt.'
      : 'Termin konnte nicht abgesagt werden.'
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" title="Termin">
    <template #body>
      <div v-if="booking" class="flex flex-col gap-6">
        <div>
          <p class="text-xs uppercase tracking-wide text-muted mb-1">Termin</p>
          <p class="text-highlighted font-medium" :class="isCancelled && 'line-through'">
            {{ formatDayHeading(booking.start) }}, {{ formatTimeRange(booking) }}
          </p>
          <p class="text-sm text-muted mt-0.5">
            {{ booking.durationMinutes }} Min. · {{ booking.offerName }}
          </p>
        </div>

        <div class="flex items-center gap-2">
          <UBadge
            v-if="booking.status === 'confirmed'"
            :label="STATUS_LABELS.confirmed"
            color="success"
            variant="subtle"
          />
          <UBadge
            v-else-if="booking.status === 'pending'"
            :label="STATUS_LABELS.pending"
            color="warning"
            variant="subtle"
          />
          <UBadge v-else :label="STATUS_LABELS[booking.status]" color="neutral" variant="subtle" />
          <span v-if="booking.status === 'pending'" class="text-xs text-muted">
            Der Klient hat den Bestätigungslink noch nicht angeklickt.
          </span>
        </div>

        <div class="h-px bg-default" />

        <div>
          <p class="text-xs uppercase tracking-wide text-muted mb-1">Klient</p>
          <p class="text-highlighted font-medium">{{ booking.clientName }}</p>
          <div class="mt-2 flex flex-col gap-1 text-sm">
            <ULink :to="`mailto:${booking.clientEmail}`" class="text-primary">{{ booking.clientEmail }}</ULink>
            <ULink v-if="booking.clientPhone" :to="`tel:${booking.clientPhone}`" class="text-primary">{{ booking.clientPhone }}</ULink>
          </div>

          <div class="mt-3 flex items-center gap-2 flex-wrap">
            <UButton
              v-if="booking.clientId"
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

          <p v-if="!booking.clientId" class="text-xs text-muted mt-2">
            Noch keinem Klienten zugeordnet – das geschieht automatisch, sobald die Buchung bestätigt ist.
          </p>
        </div>

        <div v-if="booking.clientNote">
          <p class="text-xs uppercase tracking-wide text-muted mb-1">Nachricht</p>
          <p class="text-sm text-highlighted whitespace-pre-line border-l-2 border-primary/40 pl-3">
            {{ booking.clientNote }}
          </p>
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

        <div class="text-xs text-muted flex flex-col gap-0.5">
          <span>Gebucht am {{ formatDateTime(booking.createdAt) }}</span>
          <span v-if="booking.confirmedAt">Bestätigt am {{ formatDateTime(booking.confirmedAt) }}</span>
        </div>

        <p v-if="actionError" class="text-sm text-error">{{ actionError }}</p>
      </div>
    </template>

    <template #footer>
      <div v-if="confirmingCancel" class="flex flex-col gap-3 w-full">
        <UFormField label="Grund (optional)" description="Wird dem Klienten in der Absage-Mail mitgeteilt.">
          <UTextarea v-model="cancelReason" :rows="3" class="w-full" placeholder="z. B. Ich bin an dem Tag leider verhindert." />
        </UFormField>
        <div class="flex items-center justify-end gap-2">
          <UButton label="Zurück" color="neutral" variant="ghost" size="sm" @click="confirmingCancel = false" />
          <UButton label="Absagen und Klient informieren" color="error" size="sm" :loading="cancelling" @click="cancelBooking" />
        </div>
      </div>

      <!-- flex-wrap: Mit dem Startknopf stehen hier zeitweise drei Schaltflächen, die in
           der Breite des Slideovers nicht nebeneinander passen. -->
      <div v-else class="flex flex-wrap items-center justify-between w-full gap-2">
        <UButton
          v-if="!isCancelled && !isPast"
          label="Termin absagen"
          icon="i-lucide-calendar-x"
          color="error"
          variant="ghost"
          @click="confirmingCancel = true"
        />
        <div v-else />
        <div class="flex items-center gap-2">
        <UButton
          v-if="canStart"
          :to="`/call/${booking?.id}`"
          label="Sitzung starten"
          icon="i-lucide-video"
        />
        <UButton
          label="Kalendereintrag"
          icon="i-lucide-calendar-plus"
          color="neutral"
          variant="subtle"
          :loading="downloading"
          @click="downloadIcs"
        />
        </div>
      </div>
    </template>
  </USlideover>

  <!-- Bewusst außerhalb des USlideover: dessen Default-Slot ist der Trigger, dort
       gerendert würde der Picker als Auslöser statt als eigenes Overlay behandelt. -->
  <ClientPicker
    v-model:open="isPickerOpen"
    :current-client-id="booking?.clientId ?? null"
    @select="assignClient"
  />
</template>
