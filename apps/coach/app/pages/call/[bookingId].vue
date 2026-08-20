<script setup lang="ts">
import type { CallAccessResponse } from '@hxroom/shared'

// Eigenes Layout ohne Seitenleiste: Der Coach ist hier im Gespräch, nicht in der
// Verwaltung. Der Zustand liegt beim Server, ein Reload landet daher wieder richtig.
definePageMeta({ middleware: 'auth', layout: 'call' })

const route = useRoute()
const bookingId = route.params.bookingId as string

const { phase, call, loadError, actionError, pending, now, admit, end } = useCallState(bookingId)

const appointmentLabel = computed(() => {
  const c = call.value
  return c ? `${formatDayHeading(c.start)}, ${formatTime(c.start)} – ${formatTime(c.end)} Uhr` : ''
})

const waitingStates = ['too_early', 'open', 'waiting']
const isWaitingRoom = computed(() => call.value && waitingStates.includes(call.value.state))

/**
 * Was im Warteraum steht, hängt an zwei Angaben: ob der Klient gerade verbunden ist
 * (clientOnline) und ob er überhaupt schon einmal da war (waitingSince). Erst beides
 * zusammen unterscheidet "wartet" von "war da, ist jetzt weg".
 */
const clientStatus = computed(() => {
  const c = call.value
  if (!c) return { text: '', tone: 'muted' }

  if (c.state === 'too_early') {
    return { text: `Der Raum öffnet um ${formatTime(c.opensAt)} Uhr.`, tone: 'muted' as const }
  }
  if (c.clientOnline) {
    const waiting = c.waitingSince ? formatElapsed(c.waitingSince, now.value) : null
    return { text: waiting ? `Wartet seit ${waiting}` : 'Ist eingetroffen', tone: 'success' as const }
  }
  if (c.waitingSince) {
    return { text: 'War schon da, ist gerade nicht verbunden', tone: 'warning' as const }
  }
  return { text: 'Noch niemand da', tone: 'muted' as const }
})

// Einlassen ist bewusst auch möglich, wenn niemand wartet: Der Klient soll direkt
// hereinkommen, wenn er eintrifft, statt an einer geschlossenen Tür zu stehen.
const canAdmit = computed(() => call.value?.state === 'open' || call.value?.state === 'waiting')

const ending = computed(() => {
  switch (call.value?.state) {
    case 'ended':
      return { icon: 'i-lucide-check', title: 'Sitzung beendet', description: 'Der Termin ist als gehalten vermerkt.' }
    case 'cancelled':
      return { icon: 'i-lucide-calendar-x', title: 'Termin abgesagt', description: 'Diese Sitzung findet nicht statt.' }
    default:
      return { icon: 'i-lucide-clock', title: 'Raum geschlossen', description: 'Der Zugang zu diesem Termin ist abgelaufen.' }
  }
})

function initials(call: CallAccessResponse): string {
  return clientInitials(call.clientName)
}
</script>

<template>
  <div class="flex-1 flex flex-col">
    <header class="flex items-center justify-between gap-4 px-4 sm:px-6 py-4">
      <UButton to="/bookings" color="neutral" variant="ghost" size="sm" icon="i-lucide-arrow-left" label="Termine" />
      <span v-if="appointmentLabel" class="text-sm text-muted truncate">{{ appointmentLabel }}</span>
    </header>

    <main class="flex-1 flex flex-col items-center justify-center gap-6 px-4 sm:px-6 pb-12">
      <USkeleton v-if="phase === 'loading'" class="h-64 w-full max-w-4xl rounded-xl" />

      <div v-else-if="phase === 'error'" class="text-center flex flex-col items-center gap-4">
        <div class="size-12 rounded-full bg-elevated flex items-center justify-center">
          <UIcon name="i-lucide-triangle-alert" class="size-6 text-dimmed" />
        </div>
        <div>
          <h1 class="font-serif text-2xl text-highlighted mb-1.5">Sitzung nicht verfügbar</h1>
          <p class="text-sm text-muted">{{ loadError }}</p>
        </div>
        <UButton to="/bookings" color="neutral" variant="subtle" size="sm" label="Zu den Terminen" />
      </div>

      <!-- Warteraum: der Klient steht vor der Tür, der Coach entscheidet -->
      <div v-else-if="call && isWaitingRoom" class="w-full max-w-md flex flex-col items-center text-center gap-6">
        <span class="size-20 rounded-full bg-primary/10 text-primary font-medium text-xl flex items-center justify-center">
          {{ initials(call) }}
        </span>

        <div>
          <h1 class="font-serif text-3xl text-highlighted mb-2">{{ call.clientName }}</h1>
          <p class="text-sm text-muted">{{ call.offerName }}</p>
        </div>

        <div class="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5" :class="clientStatus.tone === 'success' ? 'bg-success/10' : 'bg-elevated'">
          <span
            v-if="clientStatus.tone === 'success'"
            class="size-1.5 rounded-full bg-success animate-pulse"
          />
          <span class="text-xs" :class="clientStatus.tone === 'success' ? 'text-success' : 'text-muted'">
            {{ clientStatus.text }}
          </span>
        </div>

        <div class="flex flex-col items-center gap-2 w-full">
          <UButton
            label="Klient einlassen"
            icon="i-lucide-door-open"
            size="lg"
            class="justify-center w-full"
            :disabled="!canAdmit"
            :loading="pending"
            @click="admit"
          />
          <p v-if="actionError" class="text-sm text-error">{{ actionError }}</p>
        </div>
      </div>

      <CallStage v-else-if="call && call.state === 'admitted'" :call="call" :now="now" @end="end" />

      <div v-else-if="call" class="text-center flex flex-col items-center gap-4">
        <div class="size-12 rounded-full bg-elevated flex items-center justify-center">
          <UIcon :name="ending.icon" class="size-6 text-dimmed" />
        </div>
        <div>
          <h1 class="font-serif text-2xl text-highlighted mb-1.5">{{ ending.title }}</h1>
          <p class="text-sm text-muted">{{ ending.description }}</p>
        </div>
        <UButton to="/bookings" color="neutral" variant="subtle" size="sm" label="Zu den Terminen" />
      </div>
    </main>
  </div>
</template>
