<script setup lang="ts">
import type { CallAccessResponse } from '@hxroom/shared'
import { configureLivekit, prepareCall, useCallRoom } from '@hxroom/livekit'
import { CallDeviceSetup, namedDevices } from '@hxroom/ui'

// Eigenes Layout ohne Seitenleiste: Der Coach ist hier im Gespräch, nicht in der
// Verwaltung. Der Zustand liegt beim Server, ein Reload landet daher wieder richtig.
definePageMeta({ middleware: 'auth', layout: 'call' })

const route = useRoute()
const bookingId = route.params.bookingId as string

const { phase, call, loadError, actionError, pending, now, admit, end, refresh, markNoShow } = useCallState(bookingId)

// Warmlauf, solange der Coach im Warteraum steht: DNS, TLS und der erste Kontakt zum
// Medienserver passieren jetzt, der Beitritt kommt mit dem Klick auf „Klient einlassen"
// (components/CallScreen.vue). Nur die URL, keine Kamera – beigetreten wird hier bewusst
// nicht, auch wenn die API das Token dafür schon herausgibt.
watch(() => call.value?.livekit?.url, (url) => {
  if (!url) return
  configureLivekit(url)
  void prepareCall()
}, { immediate: true })

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

// Nicht erschienen (B6): Hier sitzt der Coach und wartet – der naheliegende Moment für die
// Frage. Erst ab dem Beginn des Termins, vorher kann niemand zu spät sein. Den Rest prüft
// der Server (bestätigt, niemand eingelassen).
const canMarkNoShow = computed(() =>
  !!call.value && canAdmit.value && now.value >= new Date(call.value.start),
)
const noShowOpen = ref(false)
async function confirmNoShow() {
  await markNoShow()
  if (!actionError.value) noShowOpen.value = false
}

const ending = computed(() => {
  switch (call.value?.state) {
    case 'ended':
      return { icon: 'i-lucide-check', title: 'Sitzung beendet', description: 'Der Termin ist als gehalten vermerkt.' }
    case 'missed':
      return {
        icon: 'i-lucide-user-x',
        title: 'Nicht erschienen',
        description: 'Der Termin zählt nicht als gehaltene Sitzung. Im Termin-Detail lässt sich das zurücknehmen.',
      }
    case 'cancelled':
      return { icon: 'i-lucide-calendar-x', title: 'Termin abgesagt', description: 'Diese Sitzung findet nicht statt.' }
    default:
      return { icon: 'i-lucide-clock', title: 'Raum geschlossen', description: 'Der Zugang zu diesem Termin ist abgelaufen.' }
  }
})

// Geräte einrichten, bevor der Klient hereinkommt. Die Spuren übernimmt der Beitritt beim
// Einlassen (components/CallScreen.vue) – deshalb endet die Vorschau nicht mit dem Warteraum,
// sondern erst mit dieser Seite oder einem Termin, der ohne Einlass zu Ende geht. Der Coach
// betritt den Raum weiterhin erst mit dem Klick; sein frühes Token bleibt ungenutzt.
const {
  previewing,
  camera,
  microphone,
  loadingCamera,
  cameraIssue,
  microphoneIssue,
  microphones,
  cameras,
  activeMicrophoneId,
  activeCameraId,
  localVideoStream,
  localAudioStream,
  startPreview,
  stopPreview,
  toggleCamera,
  toggleMicrophone,
  switchDevice,
} = useCallRoom()

const micDevices = computed(() => namedDevices(microphones.value, 'Mikrofon'))
const camDevices = computed(() => namedDevices(cameras.value, 'Kamera'))

// Im Warteraum inline statt als Toast wie im Gespräch: Hier verdeckt eine Meldung kein
// Gesicht, und wer gerade die Kamera einrichtet, soll den Grund neben ihr lesen.
const deviceNotice = computed(() => {
  if (cameraIssue.value) return { title: 'Kamera nicht verfügbar', text: DEVICE_TEXT[cameraIssue.value] }
  if (microphoneIssue.value) return { title: 'Mikrofon nicht verfügbar', text: DEVICE_TEXT[microphoneIssue.value] }
  return null
})

watch(() => call.value?.state, (state) => {
  if (state && !waitingStates.includes(state) && state !== 'admitted') stopPreview()
})
onBeforeUnmount(stopPreview)

function initials(call: CallAccessResponse): string {
  return clientInitials(call.clientName)
}
</script>

<template>
  <!-- Nach dem Einlassen übernimmt der Call-Screen die ganze Fläche: Er bringt seine eigene
       Kopfzeile mit, und ein "Zurück zu den Terminen" neben einem laufenden Gespräch lädt
       nur zum versehentlichen Verlassen ein. -->
  <CallScreen v-if="call && call.state === 'admitted'" :call="call" :now="now" @end="end" @refresh="refresh" />

  <div v-else class="flex-1 min-h-0 flex flex-col overflow-y-auto">
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

        <CallDeviceSetup
          :started="previewing"
          :mic-on="microphone"
          :cam-on="camera"
          :mic-device-id="activeMicrophoneId ?? ''"
          :cam-device-id="activeCameraId ?? ''"
          :stream="localVideoStream()"
          :audio-stream="localAudioStream()"
          :mic-devices="micDevices"
          :cam-devices="camDevices"
          :loading-camera="loadingCamera"
          :name="call.coachName"
          @update:mic-on="toggleMicrophone()"
          @update:cam-on="toggleCamera()"
          @update:mic-device-id="(id: string) => switchDevice('audioinput', id)"
          @update:cam-device-id="(id: string) => switchDevice('videoinput', id)"
          @start="startPreview()"
          @stop="stopPreview()"
        >
          <template #notice>
            <UAlert
              v-if="deviceNotice"
              icon="i-lucide-triangle-alert"
              color="warning"
              variant="subtle"
              class="text-left"
              :title="deviceNotice.title"
              :description="deviceNotice.text"
            />
          </template>
        </CallDeviceSetup>

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
          <!-- Zurückhaltend, unter dem Einlassen: Es ist die Ausnahme, nicht der Weg. -->
          <UButton
            v-if="canMarkNoShow"
            label="Klient nicht erschienen"
            icon="i-lucide-user-x"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="noShowOpen = true"
          />
          <p v-if="actionError && !noShowOpen" class="text-sm text-error">{{ actionError }}</p>
        </div>

        <UModal
          v-model:open="noShowOpen"
          title="Als nicht erschienen vermerken?"
          :description="`Der Termin zählt dann nicht als gehaltene Sitzung. ${call.clientName} bekommt keine Nachricht. Im Termin-Detail kannst du das zurücknehmen.`"
        >
          <template #body>
            <UAlert
              v-if="call.clientOnline"
              icon="i-lucide-info"
              color="warning"
              variant="subtle"
              :description="`${call.clientName} ist gerade im Warteraum.`"
            />
            <p v-if="actionError" class="text-sm text-error" :class="call.clientOnline && 'mt-3'">{{ actionError }}</p>
          </template>
          <template #footer>
            <div class="flex gap-3 justify-end w-full">
              <UButton label="Abbrechen" color="neutral" variant="outline" @click="noShowOpen = false" />
              <UButton label="Vermerken" icon="i-lucide-user-x" color="neutral" :loading="pending" @click="confirmNoShow" />
            </div>
          </template>
        </UModal>
      </div>

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
