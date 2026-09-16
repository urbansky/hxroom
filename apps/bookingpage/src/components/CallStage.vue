<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { firstName, type CallAccessResponse } from '@hxroom/shared'
import {
  audioStreamFor,
  configureLivekit,
  joinCall,
  leaveCall,
  screenShareAudioStream,
  screenShareStream,
  screenShareSupported,
  useCallRoom,
  videoStreamFor,
  type DeviceIssue,
} from '@hxroom/livekit'
import {
  CallScreen as CallShell,
  CallAudioOutput,
  CallChatPanel,
  type CallChatMessage,
  type CallConnection,
  type CallDevice,
  type CallPanelDef,
  type CallPeer,
} from '@hxroom/ui'

// Die Call-Oberfläche aus der Sicht des Klienten, seit B4 am echten LiveKit-Raum.
//
// Dieselbe Oberfläche wie beim Coach, aus derselben Quelle (@hxroom/ui). Was hier fehlt –
// Notizen, Klientenakte, Stummschalten, der Sitzungs-Timer –, fehlt, weil es dem Klienten
// nicht zusteht, und nicht, weil hier eine zweite Oberfläche gebaut würde.
//
// Der Timer bleibt aus: Für den Klienten ist er laut project.md §5a optional, und eine
// mitlaufende Uhr macht aus einem Gespräch eine Sitzung mit Restzeit.

const props = defineProps<{ call: CallAccessResponse; now: number }>()

const router = useRouter()

const {
  status,
  participants,
  localIdentity,
  camera,
  microphone,
  cameraIssue,
  microphoneIssue,
  toggleCamera,
  toggleMicrophone,
  microphones,
  cameras,
  activeMicrophoneId,
  activeCameraId,
  switchDevice,
  screenSharing,
  screenShareBy,
  screenShareIssue,
  setScreenShareEnabled,
} = useCallRoom()

// Beitreten, sobald der Coach eingelassen hat – das ist der Moment, in dem die Antwort
// erstmals ein Token trägt. Der Warmlauf ist da längst gelaufen (WaitingRoom.vue), die
// Verbindung steht deshalb fast unmittelbar.
//
// Der Token wird bei jedem Abruf neu ausgestellt; configureLivekit() nimmt ihn jedes Mal
// entgegen, damit ein Reconnect nach längerem Gespräch nicht auf einen abgelaufenen trifft.
watch(() => props.call.livekit, (livekit) => {
  if (!livekit?.token) return
  configureLivekit(livekit.url, livekit.token)
  if (status.value === 'idle' || status.value === 'failed') void joinCall()
}, { immediate: true })

// Verlässt der Klient die Seite, endet auch die Verbindung – sonst bliebe ein Teilnehmer
// im Raum stehen, den der Coach sieht, ohne dass jemand da ist.
onBeforeUnmount(() => { void leaveCall() })

const selfBlur = ref(false)
/** Der Klient schaltet niemanden stumm – das Modell verlangt den Wert trotzdem. */
const remoteMutedLocally = ref(false)
const sidebarOpen = ref(false)
const activePanel = ref('chat')
const leaveModalOpen = ref(false)

// Die Geräte des Browsers aus @hxroom/livekit – dort wird die Liste nach jeder Freigabe und
// bei jeder Änderung neu gelesen, und ein Wechsel startet die laufende Spur mit dem neuen
// Gerät neu. Hier steht nur der Ersatzname für Geräte, die der Browser (noch) nicht nennt.
const micDevices = computed<CallDevice[]>(() =>
  microphones.value.map((device, i) => ({ id: device.id, label: device.label || `Mikrofon ${i + 1}` })),
)
const camDevices = computed<CallDevice[]>(() =>
  cameras.value.map((device, i) => ({ id: device.id, label: device.label || `Kamera ${i + 1}` })),
)

// Ein Gespräch, ein Gegenüber. `remoteParticipants()` wäre allgemeiner, aber die Bühne
// zeigt genau eine Gegenstelle – wer mehr will, ändert hier und in CallVideoArea.
const remotePeer = computed(() =>
  participants.value.find(p => p.id !== localIdentity.value) ?? null,
)

const local = computed<CallPeer>(() => ({
  id: localIdentity.value ?? 'local',
  name: props.call.clientName,
  cameraOn: camera.value,
  micOn: microphone.value,
  blurred: selfBlur.value,
  stream: localIdentity.value ? videoStreamFor(localIdentity.value) : null,
}))

const remote = computed<CallPeer>(() => ({
  id: remotePeer.value?.id ?? 'remote',
  name: remotePeer.value?.name || props.call.coachName,
  // Ist der Coach noch nicht im Raum, gilt seine Kamera nicht als aus: Die Bühne zeigt
  // dann „verbindet sich …" und nicht „Kamera aus" – das eine kommt gleich, das andere nicht.
  cameraOn: remotePeer.value ? !remotePeer.value.cameraMuted : true,
  micOn: remotePeer.value ? !remotePeer.value.microphoneMuted : true,
  blurred: false,
  stream: remotePeer.value ? videoStreamFor(remotePeer.value.id) : null,
}))

const remoteAudio = computed(() =>
  remotePeer.value ? audioStreamFor(remotePeer.value.id) : null,
)

// Der Verbindungszustand des Raums, übersetzt in das, was die Steuerleiste zeigt. Die
// Zuordnung liegt bewusst hier: Ob ein Fehlschlag „wackelt" oder „weg" heißt, entscheidet
// die App (siehe CallConnection in @hxroom/ui).
const connection = computed<CallConnection>(() => {
  switch (status.value) {
    case 'connected': return 'live'
    case 'connecting': return 'connecting'
    case 'failed': return 'lost'
    default: return 'connecting'
  }
})

// Die Ursachen aus @hxroom/livekit in Klientensprache. Bewusst ohne Fachbegriffe: Für
// viele ist das hier die erste Berührung mit einer Kamerafreigabe (project.md §5a).
const DEVICE_TEXT: Record<DeviceIssue, string> = {
  denied: 'Der Browser hat den Zugriff blockiert. Über das Symbol in der Adresszeile kannst du ihn erlauben.',
  notFound: 'Es wurde kein Gerät gefunden. Prüfe, ob es angeschlossen ist.',
  busy: 'Ein anderes Programm benutzt das Gerät gerade. Schließe es und versuche es erneut.',
  insecure: 'Diese Seite ist nicht sicher genug verbunden, um auf das Gerät zuzugreifen.',
  unknown: 'Das Gerät konnte nicht gestartet werden.',
}

const deviceAlert = computed(() => {
  if (cameraIssue.value) return { title: 'Kamera nicht verfügbar', text: DEVICE_TEXT[cameraIssue.value] }
  if (microphoneIssue.value) return { title: 'Mikrofon nicht verfügbar', text: DEVICE_TEXT[microphoneIssue.value] }
  return null
})
const deviceAlertDismissed = ref(false)
const shareAlertDismissed = ref(false)
watch(screenShareIssue, () => { shareAlertDismissed.value = false })
watch(deviceAlert, () => { deviceAlertDismissed.value = false })

// Kein Ton, obwohl beide reden, ist der ärgerlichste Fehler dieses Produkts – deshalb steht
// er über der Bühne und nicht in der Konsole. Wegklicken darf der Klient ihn trotzdem:
// Ein Hinweis, der nicht weicht, verdeckt irgendwann das Gespräch, um das es geht.
const audioOut = ref<{ blocked: boolean, resume: () => void } | null>(null)
const audioAlertDismissed = ref(false)
watch(() => audioOut.value?.blocked, (blocked) => { if (blocked) audioAlertDismissed.value = false })

// Bildschirmfreigabe – beide Seiten dürfen teilen (project.md §5a), eine Freigabe zur Zeit.
// Wer teilt, sagt die Mechanik; teilt die Gegenseite, ist der eigene Knopf gesperrt.
const shareSupported = screenShareSupported()
const shareStream = computed(() => (screenShareBy.value ? screenShareStream() : null))
// Nur der Ton einer fremden Freigabe wird abgespielt – den eigenen zu hören, gäbe ein Echo.
const shareAudio = computed(() =>
  screenShareBy.value && screenShareBy.value !== localIdentity.value ? screenShareAudioStream() : null,
)
const shareDisabledReason = computed(() =>
  screenShareBy.value && screenShareBy.value !== localIdentity.value
    ? `${firstName(props.call.coachName, 'Dein Gegenüber')} teilt gerade den Bildschirm`
    : null,
)

const chatDraft = ref('')
const chatUnread = ref(false)
const chatMessages = ref<CallChatMessage[]>([])

const panels = computed<CallPanelDef[]>(() => [
  { value: 'chat', label: 'Chat', icon: 'i-lucide-message-square', badge: chatUnread.value },
])

function sendChatMessage() {
  const text = chatDraft.value.trim()
  if (!text) return
  chatMessages.value.push({
    id: Date.now(),
    from: 'self',
    text,
    time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
  })
  chatDraft.value = ''
}

// Der Klient beendet keine Sitzung, er verlässt sie: Solange der Coach nicht beendet hat,
// führt derselbe Link wieder herein.
async function leave() {
  leaveModalOpen.value = false
  await leaveCall()
  router.push('/')
}
</script>

<template>
  <CallShell
    :mic-on="microphone"
    :cam-on="camera"
    v-model:self-blur="selfBlur"
    :sharing="screenSharing"
    v-model:remote-muted-locally="remoteMutedLocally"
    :mic-device-id="activeMicrophoneId ?? ''"
    :cam-device-id="activeCameraId ?? ''"
    v-model:sidebar-open="sidebarOpen"
    v-model:active-panel="activePanel"
    :local="local"
    :remote="remote"
    :title="call.coachName"
    :connection="connection"
    :now="now"
    :elapsed-since="null"
    :warn-after="null"
    :panels="panels"
    :mic-devices="micDevices"
    :cam-devices="camDevices"
    :sharing-by="screenShareBy"
    :share-stream="shareStream"
    :can-share="shareSupported"
    :share-disabled-reason="shareDisabledReason"
    end-label="Gespräch verlassen"
    @update:mic-on="toggleMicrophone()"
    @update:cam-on="toggleCamera()"
    @update:sharing="(on: boolean) => setScreenShareEnabled(on)"
    @update:mic-device-id="(id: string) => switchDevice('audioinput', id)"
    @update:cam-device-id="(id: string) => switchDevice('videoinput', id)"
    @end="leaveModalOpen = true"
  >
    <template #stage-overlay>
      <div class="absolute inset-x-0 top-4 z-20 flex flex-col items-center gap-2 px-4">
        <UAlert
          v-if="audioOut?.blocked && !audioAlertDismissed"
          icon="i-lucide-volume-x"
          color="warning"
          variant="subtle"
          class="max-w-md shadow-lg bg-default"
          title="Kein Ton"
          description="Der Browser hat die Wiedergabe blockiert."
          :actions="[{ label: 'Ton einschalten', color: 'warning', variant: 'solid', onClick: () => audioOut?.resume() }]"
          :close="{ onClick: () => { audioAlertDismissed = true } }"
        />

        <UAlert
          v-if="screenShareIssue && !shareAlertDismissed"
          icon="i-lucide-monitor-x"
          color="warning"
          variant="subtle"
          class="max-w-md shadow-lg bg-default"
          title="Bildschirm lässt sich nicht teilen"
          :description="screenShareIssue === 'system'
            ? 'Dein System erlaubt dem Browser keine Bildschirmaufnahme. Auf dem Mac: Systemeinstellungen → Datenschutz & Sicherheit → Bildschirm- & Systemaudioaufnahme, dort den Browser erlauben.'
            : 'Die Freigabe konnte nicht gestartet werden.'"
          :close="{ onClick: () => { shareAlertDismissed = true } }"
        />

        <UAlert
          v-if="deviceAlert && !deviceAlertDismissed"
          icon="i-lucide-video-off"
          color="warning"
          variant="subtle"
          class="max-w-md shadow-lg bg-default"
          :title="deviceAlert.title"
          :description="deviceAlert.text"
          :close="{ onClick: () => { deviceAlertDismissed = true } }"
        />
      </div>
    </template>

    <template #sidebar>
      <CallChatPanel
        v-model:draft="chatDraft"
        :messages="chatMessages"
        :peer-name="call.coachName"
        class="h-full"
        @send="sendChatMessage"
      />
    </template>
  </CallShell>

  <!-- Liegt außerhalb der Bühne: Das Element soll weder ein- noch ausgeblendet werden,
       wenn der Klient ins Vollbild wechselt – der Ton darf dabei nicht abreißen. -->
  <CallAudioOutput ref="audioOut" :stream="remoteAudio" />
  <!-- Der Ton einer Freigabe des Coachs – etwa ein Video, das er zeigt. -->
  <CallAudioOutput :stream="shareAudio" />

  <UModal
    v-model:open="leaveModalOpen"
    title="Gespräch verlassen?"
    description="Solange die Sitzung läuft, kommst du über denselben Link wieder herein."
  >
    <template #footer>
      <div class="flex gap-3 justify-end w-full">
        <UButton color="neutral" variant="outline" label="Abbrechen" @click="leaveModalOpen = false" />
        <UButton color="error" icon="i-lucide-phone-off" label="Verlassen" @click="leave" />
      </div>
    </template>
  </UModal>
</template>
