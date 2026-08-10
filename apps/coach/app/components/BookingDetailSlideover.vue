<script setup lang="ts">
import type { CoachBookingResponse } from '@hxroom/shared'

const props = defineProps<{ booking: CoachBookingResponse | null }>()
const emit = defineEmits<{ cancelled: [booking: CoachBookingResponse] }>()

const open = defineModel<boolean>('open', { required: true })

const { $api } = useApi()

const confirmingCancel = ref(false)
const cancelReason = ref('')
const cancelling = ref(false)
const actionError = ref<string | null>(null)
const downloading = ref(false)

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
const isPast = computed(() => !!props.booking && new Date(props.booking.end) < new Date())

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
        </div>

        <div v-if="booking.clientNote">
          <p class="text-xs uppercase tracking-wide text-muted mb-1">Nachricht</p>
          <p class="text-sm text-highlighted whitespace-pre-line border-l-2 border-primary/40 pl-3">
            {{ booking.clientNote }}
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

      <div v-else class="flex items-center justify-between w-full gap-2">
        <UButton
          v-if="!isCancelled && !isPast"
          label="Termin absagen"
          icon="i-lucide-calendar-x"
          color="error"
          variant="ghost"
          @click="confirmingCancel = true"
        />
        <div v-else />
        <UButton
          label="Kalendereintrag"
          icon="i-lucide-calendar-plus"
          color="neutral"
          variant="subtle"
          :loading="downloading"
          @click="downloadIcs"
        />
      </div>
    </template>
  </USlideover>
</template>
