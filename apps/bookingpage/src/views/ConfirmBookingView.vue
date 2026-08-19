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
import type { BookingResponse } from '@hxroom/shared'

const props = defineProps<{ bookingId: string }>()
const route = useRoute()

const coachProfile = inject<Ref<CoachProfile | null>>(COACH_KEY)
const coachName = computed(() => coachProfile?.value?.name ?? 'Coach')

const status = ref<'loading' | 'success' | 'error'>('loading')
const booking = ref<BookingResponse | null>(null)
const errorMessage = ref('')

const dayTimeLabel = computed(() =>
  booking.value ? formatDayTimeRange(booking.value.start, booking.value.end) : '',
)

function mapConfirmError(message: string | undefined): string {
  switch (message) {
    case 'Invalid confirmation token':
      return 'Dieser Bestätigungslink ist ungültig.'
    case 'Booking not found':
      return 'Diese Buchung wurde nicht gefunden.'
    case 'Confirmation window has expired':
      return 'Der Bestätigungslink ist abgelaufen. Der Termin wurde automatisch wieder freigegeben.'
    case 'Booking is not awaiting confirmation':
      return 'Dieser Termin wurde bereits bestätigt oder storniert.'
    default:
      return 'Der Termin konnte nicht bestätigt werden.'
  }
}

onMounted(async () => {
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  if (!token) {
    status.value = 'error'
    errorMessage.value = 'Dieser Bestätigungslink ist unvollständig.'
    return
  }

  try {
    const res = await fetch(`${apiUrl}/api/v1/bookings/${props.bookingId}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    const body = await res.json().catch(() => null)

    if (!res.ok) {
      status.value = 'error'
      errorMessage.value = mapConfirmError(body?.message)
      return
    }

    booking.value = body
    status.value = 'success'
  } catch {
    status.value = 'error'
    errorMessage.value = 'Der Termin konnte nicht bestätigt werden. Bitte versuche es erneut.'
  }
})
</script>

<template>
  <SiteHeader />

  <section class="max-w-[720px] mx-auto px-6 pt-16 pb-20">
    <ContentCard>
      <LoadingState v-if="status === 'loading'" text="Dein Termin wird bestätigt …" />

      <StatusPanel
        v-else-if="status === 'success'"
        icon="i-lucide-check"
        title="Termin bestätigt"
        description="Dein Termin ist jetzt fest reserviert."
      >
        <AppointmentSummary
          :offer="booking?.offerName ?? ''"
          :appointment="dayTimeLabel"
          :coach="coachName"
        />
        <UButton to="/" color="neutral" variant="subtle" size="sm" label="Zur Übersicht" />
      </StatusPanel>

      <StatusPanel
        v-else
        icon="i-lucide-triangle-alert"
        title="Bestätigung nicht möglich"
        :description="errorMessage"
        tone="warning"
      >
        <UButton to="/" color="neutral" variant="subtle" size="sm" label="Zur Übersicht" />
      </StatusPanel>
    </ContentCard>
  </section>

  <SiteFooter />
</template>
