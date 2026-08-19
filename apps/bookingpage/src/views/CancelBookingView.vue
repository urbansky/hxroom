<script setup lang="ts">
import { inject, computed, onMounted, ref, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { COACH_KEY, type CoachProfile } from '../composables/useCoach'
import { apiUrl } from '../utils/api'
import { formatDayTimeRange } from '../utils/datetime'
import SiteHeader from '../components/SiteHeader.vue'
import SiteFooter from '../components/SiteFooter.vue'
import ContentCard from '../components/ContentCard.vue'
import StatusPanel from '../components/StatusPanel.vue'
import AppointmentSummary from '../components/AppointmentSummary.vue'
import LoadingState from '../components/LoadingState.vue'
import type { ClientBookingView } from '@hxroom/shared'

const props = defineProps<{ bookingId: string }>()
const route = useRoute()

const coachProfile = inject<Ref<CoachProfile | null>>(COACH_KEY)
const coachName = computed(() => coachProfile?.value?.name ?? 'Coach')

// 'form' zeigt den Termin vor der Absage: der Klient soll sehen, was er trifft, bevor er
// storniert – bei mehreren offenen Terminen beim selben Coach ist das entscheidend.
const status = ref<'loading' | 'form' | 'success' | 'error'>('loading')
const booking = ref<ClientBookingView | null>(null)
const reason = ref('')
const cancelling = ref(false)
const errorMessage = ref('')

const token = computed(() => typeof route.query.token === 'string' ? route.query.token : '')

const dayTimeLabel = computed(() =>
  booking.value ? formatDayTimeRange(booking.value.start, booking.value.end) : '',
)

function mapCancelError(message: string | undefined): string {
  switch (message) {
    case 'Invalid access token':
      return 'Dieser Absage-Link ist ungültig.'
    case 'Booking not found':
      return 'Diese Buchung wurde nicht gefunden.'
    case 'Booking is already cancelled':
      return 'Dieser Termin wurde bereits abgesagt.'
    case 'Booking can no longer be cancelled':
      return 'Dieser Termin lässt sich nicht mehr online absagen. Bitte wende dich direkt an deinen Coach.'
    default:
      return 'Der Termin konnte nicht abgesagt werden.'
  }
}

onMounted(async () => {
  if (!token.value) {
    status.value = 'error'
    errorMessage.value = 'Dieser Absage-Link ist unvollständig.'
    return
  }

  try {
    const res = await fetch(`${apiUrl}/api/v1/bookings/${props.bookingId}/cancellation?token=${encodeURIComponent(token.value)}`)
    const body = await res.json().catch(() => null)

    if (!res.ok) {
      status.value = 'error'
      errorMessage.value = mapCancelError(body?.message)
      return
    }

    booking.value = body
    // Ein bereits abgesagter oder vergangener Termin bekommt gar kein Formular: sonst
    // klickt der Klient auf "Absagen" und läuft in einen Fehler, den er vorher sehen konnte.
    if (!body.cancellable) {
      status.value = 'error'
      errorMessage.value = body.status === 'cancelled'
        ? 'Dieser Termin wurde bereits abgesagt.'
        : 'Dieser Termin lässt sich nicht mehr online absagen. Bitte wende dich direkt an deinen Coach.'
      return
    }

    status.value = 'form'
  } catch {
    status.value = 'error'
    errorMessage.value = 'Der Termin konnte nicht geladen werden. Bitte versuche es erneut.'
  }
})

async function cancelBooking() {
  cancelling.value = true
  errorMessage.value = ''

  try {
    const res = await fetch(`${apiUrl}/api/v1/bookings/${props.bookingId}/cancellation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.value, reason: reason.value.trim() || undefined }),
    })
    const body = await res.json().catch(() => null)

    if (!res.ok) {
      status.value = 'error'
      errorMessage.value = mapCancelError(body?.message)
      return
    }

    status.value = 'success'
  } catch {
    errorMessage.value = 'Der Termin konnte nicht abgesagt werden. Bitte versuche es erneut.'
  } finally {
    cancelling.value = false
  }
}
</script>

<template>
  <SiteHeader />

  <section class="max-w-[720px] mx-auto px-6 pt-16 pb-20">
    <ContentCard>
      <LoadingState v-if="status === 'loading'" text="Dein Termin wird geladen …" />

      <div v-else-if="status === 'form'" class="flex flex-col gap-5">
        <div class="text-center">
          <h1 class="font-serif text-2xl text-highlighted mb-1.5">Termin absagen</h1>
          <p class="text-sm text-muted">Möchtest du diesen Termin wirklich absagen?</p>
        </div>

        <AppointmentSummary
          :offer="booking?.offerName ?? ''"
          :appointment="dayTimeLabel"
          :coach="booking?.coachName ?? coachName"
        />

        <UFormField
          label="Grund"
          hint="optional"
          :description="`Wird ${booking?.coachName ?? coachName} in der Benachrichtigung mitgeteilt.`"
        >
          <UTextarea
            v-model="reason"
            :rows="3"
            :maxlength="500"
            class="w-full"
            placeholder="z. B. Ich bin an dem Tag leider krank geworden."
          />
        </UFormField>

        <p v-if="errorMessage" class="text-sm text-error">{{ errorMessage }}</p>

        <div class="flex items-center justify-end gap-3">
          <UButton to="/" color="neutral" variant="ghost" size="sm" label="Doch nicht absagen" />
          <UButton
            label="Termin absagen"
            color="error"
            :loading="cancelling"
            @click="cancelBooking"
          />
        </div>
      </div>

      <StatusPanel
        v-else-if="status === 'success'"
        icon="i-lucide-calendar-x"
        title="Termin abgesagt"
        :description="`${booking?.coachName ?? coachName} wurde informiert. Du bekommst gleich eine Bestätigung per E-Mail.`"
      >
        <UButton to="/" color="neutral" variant="subtle" size="sm" label="Neuen Termin buchen" />
      </StatusPanel>

      <StatusPanel
        v-else
        icon="i-lucide-triangle-alert"
        title="Absage nicht möglich"
        :description="errorMessage"
        tone="warning"
      >
        <UButton to="/" color="neutral" variant="subtle" size="sm" label="Zur Übersicht" />
      </StatusPanel>
    </ContentCard>
  </section>

  <SiteFooter />
</template>
