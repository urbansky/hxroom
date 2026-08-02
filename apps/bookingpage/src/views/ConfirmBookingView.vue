<script setup lang="ts">
import { inject, computed, onMounted, ref, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { COACH_KEY, getAvatarUrl, type CoachProfile } from '../composables/useCoach'
import type { BookingResponse } from '@hxroom/shared'

const props = defineProps<{ bookingId: string }>()
const route = useRoute()

const coachProfile = inject<Ref<CoachProfile | null>>(COACH_KEY)
const avatarUrl = computed(() => coachProfile?.value ? getAvatarUrl(coachProfile.value) : null)
const coachName = computed(() => coachProfile?.value?.name ?? 'Coach')

const TIME_ZONE = 'Europe/Berlin'
const dayDateFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' })
const timeFormatter = new Intl.DateTimeFormat('de-DE', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' })

const status = ref<'loading' | 'success' | 'error'>('loading')
const booking = ref<BookingResponse | null>(null)
const errorMessage = ref('')

const dayTimeLabel = computed(() => {
  if (!booking.value) return ''
  const start = new Date(booking.value.start)
  const end = new Date(booking.value.end)
  return `${dayDateFormatter.format(start)}, ${timeFormatter.format(start)} – ${timeFormatter.format(end)} Uhr`
})

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
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://api.hxroom.localhost'
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
  <div class="glow-top" />
  <div class="glow-bottom" />

  <UHeader
    :title="coachName"
    :ui="{
      root: 'bg-(--ui-bg)/75 backdrop-blur-xl border-b border-(--ui-border)',
      container: 'max-w-[900px] px-6 lg:px-10',
    }"
  >
    <template #left>
      <RouterLink to="/" class="flex items-center gap-2.5 no-underline">
        <div class="size-[34px] rounded-[9px] overflow-hidden bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center font-serif text-[17px] text-white/92 font-semibold shrink-0">
          <img v-if="avatarUrl" :src="avatarUrl" class="size-full object-cover" alt="">
          <template v-else>{{ coachName.charAt(0) }}</template>
        </div>
        <span class="font-serif text-xl font-semibold text-gold-700 dark:text-gold-200 tracking-wide">{{ coachName }}</span>
      </RouterLink>
    </template>
  </UHeader>

  <section class="relative z-1 max-w-[720px] mx-auto px-6 pb-20" style="padding-top: 160px;">
    <div class="bg-(--ui-bg-elevated) border border-(--ui-border) rounded-2xl p-8">
      <div v-if="status === 'loading'" class="flex flex-col items-center gap-3 py-10">
        <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-(--ui-text-dimmed)" />
        <p class="text-sm text-(--ui-text-muted)">Dein Termin wird bestätigt …</p>
      </div>

      <div v-else-if="status === 'success'" class="flex flex-col items-center text-center gap-4">
        <div class="size-[52px] rounded-full bg-sage-400/10 border border-sage-400/25 flex items-center justify-center">
          <UIcon name="i-lucide-check" class="size-6 text-sage-500" />
        </div>
        <div>
          <h1 class="font-serif text-2xl font-light text-sage-950 dark:text-cream mb-1.5">Termin bestätigt</h1>
          <p class="text-sm text-(--ui-text-muted)">Dein Termin ist jetzt fest reserviert.</p>
        </div>

        <div class="w-full bg-(--ui-bg-accented)/50 border border-(--ui-border) rounded-xl p-5 flex flex-col gap-2 text-left">
          <div class="flex items-center justify-between text-[13px]">
            <span class="text-(--ui-text-dimmed)">Angebot</span>
            <span class="text-(--ui-text)">{{ booking?.offerName }}</span>
          </div>
          <div class="flex items-center justify-between text-[13px]">
            <span class="text-(--ui-text-dimmed)">Termin</span>
            <span class="text-(--ui-text)">{{ dayTimeLabel }}</span>
          </div>
          <div class="flex items-center justify-between text-[13px]">
            <span class="text-(--ui-text-dimmed)">Coach</span>
            <span class="text-(--ui-text)">{{ coachName }}</span>
          </div>
        </div>

        <RouterLink to="/" class="text-xs bg-(--ui-bg-accented) border border-(--ui-border) rounded-lg px-4 py-2 text-(--ui-text) hover:bg-(--ui-bg-elevated) transition-colors no-underline">
          Zur Übersicht
        </RouterLink>
      </div>

      <div v-else class="flex flex-col items-center text-center gap-4 py-4">
        <div class="size-[52px] rounded-full bg-gold-400/10 border border-gold-400/25 flex items-center justify-center">
          <UIcon name="i-lucide-triangle-alert" class="size-6 text-gold-600 dark:text-gold-300" />
        </div>
        <div>
          <h1 class="font-serif text-2xl font-light text-sage-950 dark:text-cream mb-1.5">Bestätigung nicht möglich</h1>
          <p class="text-sm text-(--ui-text-muted)">{{ errorMessage }}</p>
        </div>
        <RouterLink to="/" class="text-xs bg-(--ui-bg-accented) border border-(--ui-border) rounded-lg px-4 py-2 text-(--ui-text) hover:bg-(--ui-bg-elevated) transition-colors no-underline">
          Zur Übersicht
        </RouterLink>
      </div>
    </div>
  </section>

  <UFooter>
    <template #left>
      <span class="text-xs text-(--ui-text-dimmed)">
        Gebrandeter HxRoom von
        <a href="https://hxroom.io" target="_blank" class="text-sage-400/70 hover:text-sage-400 transition-colors no-underline">hxroom.io</a>
        &nbsp;·&nbsp;DSGVO-konform&nbsp;·&nbsp;Server Deutschland
      </span>
    </template>
  </UFooter>
</template>

<style scoped>
.glow-top {
  position: fixed;
  top: -200px;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  height: 600px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(92, 110, 91, 0.07) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

.glow-bottom {
  position: fixed;
  bottom: -300px;
  right: -200px;
  width: 700px;
  height: 700px;
  border-radius: 50%;
  background: radial-gradient(ellipse, rgba(181, 147, 90, 0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
</style>
