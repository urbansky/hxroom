<script setup lang="ts">
import { computed, inject, onMounted, type Ref } from 'vue'
import { useRoute } from 'vue-router'
import { COACH_KEY, getAvatarUrl, type CoachProfile } from '../composables/useCoach'
import { useCallState } from '../composables/useCallState'
import { formatDayTimeRange } from '../utils/datetime'
import StatusPanel from '../components/StatusPanel.vue'
import LoadingState from '../components/LoadingState.vue'
import WaitingRoom from '../components/WaitingRoom.vue'
import CallStage from '../components/CallStage.vue'

const props = defineProps<{ bookingId: string }>()
const route = useRoute()

// Eine Route für den ganzen Ablauf: Warteraum, Gespräch und Abschluss sind Zustände
// derselben Seite. Der Server kennt den Zustand, deshalb landet auch ein Reload mitten im
// Gespräch wieder richtig – und der Token bleibt in genau einer URL.
const token = typeof route.query.token === 'string' ? route.query.token : ''
const { phase, call, errorMessage, now, start } = useCallState(props.bookingId, token)

// Selbstabsage über denselben Token, der diese Seite geöffnet hat – der Warteraum braucht
// dafür keinen zweiten Ausweis und die API keinen neuen Endpunkt.
const cancelHref = `/cancel/${props.bookingId}?token=${encodeURIComponent(token)}`

const coachProfile = inject<Ref<CoachProfile | null>>(COACH_KEY)
const avatarUrl = computed(() => coachProfile?.value ? getAvatarUrl(coachProfile.value) : null)

// Bildschirmfüllend, kein Kopf- und Fußbereich: Wer wartet, soll nichts wegklicken können,
// und der spätere Übergang ins Gespräch bleibt bruchlos.
const inWaitingRoom = computed(() =>
  call.value?.state === 'too_early' || call.value?.state === 'open' || call.value?.state === 'waiting',
)

// Die drei Endzustände lesen sich für den Klienten unterschiedlich: abgesagt ist etwas
// anderes als abgelaufen, und ein beendetes Gespräch ist gar kein Problem.
const ending = computed(() => {
  switch (call.value?.state) {
    case 'ended':
      return {
        icon: 'i-lucide-check',
        title: 'Die Sitzung ist beendet',
        tone: 'success' as const,
        description: `Danke für dein Gespräch mit ${call.value.coachName}.`,
      }
    case 'cancelled':
      return {
        icon: 'i-lucide-calendar-x',
        title: 'Der Termin wurde abgesagt',
        tone: 'warning' as const,
        description: 'Dieser Termin findet nicht statt. Du kannst jederzeit einen neuen buchen.',
      }
    default:
      return {
        icon: 'i-lucide-clock',
        title: 'Dieser Raum ist geschlossen',
        tone: 'neutral' as const,
        description: call.value
          ? `Der Zugang galt rund um den Termin am ${formatDayTimeRange(call.value.start, call.value.end)}.`
          : 'Der Zugang zu diesem Termin ist abgelaufen.',
      }
  }
})

onMounted(start)
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center px-6 py-12">
    <LoadingState v-if="phase === 'loading'" text="Dein Raum wird geöffnet …" />

    <StatusPanel
      v-else-if="phase === 'error'"
      icon="i-lucide-triangle-alert"
      title="Raum nicht erreichbar"
      :description="errorMessage"
      tone="warning"
    >
      <UButton to="/" color="neutral" variant="subtle" size="sm" label="Zur Übersicht" />
    </StatusPanel>

    <WaitingRoom
      v-else-if="call && inWaitingRoom"
      :call="call"
      :avatar-url="avatarUrl"
      :now="now"
      :cancel-href="cancelHref"
    />

    <CallStage v-else-if="call && call.state === 'admitted'" :call="call" />

    <StatusPanel
      v-else-if="call"
      :icon="ending.icon"
      :title="ending.title"
      :description="ending.description"
      :tone="ending.tone"
    >
      <UButton to="/" color="neutral" variant="subtle" size="sm" label="Zur Buchungsseite" />
    </StatusPanel>
  </div>
</template>
