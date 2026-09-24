<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { firstName, type CallAccessResponse } from '@hxroom/shared'
import {
  audioStreamFor,
  configureLivekit,
  joinCall,
  leaveCall,
  localVideoStream,
  screenShareAudioStream,
  screenShareStream,
  screenShareSupported,
  useCallRoom,
  videoStreamFor,
} from '@hxroom/livekit'
import {
  CallScreen as CallShell,
  CallAudioOutput,
  CallChatPanel,
  namedDevices,
  type CallConnection,
  type CallPanelDef,
  type CallPeer,
} from '@hxroom/ui'
import { useCallChat } from '../composables/useCallChat'
import { deviceNotice } from '../utils/deviceText'

// Die Call-Oberfläche aus der Sicht des Klienten, seit B4 am echten LiveKit-Raum.
//
// Dieselbe Oberfläche wie beim Coach, aus derselben Quelle (@hxroom/ui). Was hier fehlt –
// Notizen, Klientenakte, Stummschalten, der Sitzungs-Timer –, fehlt, weil es dem Klienten
// nicht zusteht, und nicht, weil hier eine zweite Oberfläche gebaut würde.
//
// Der Timer bleibt aus: Für den Klienten ist er laut project.md §5a optional, und eine
// mitlaufende Uhr macht aus einem Gespräch eine Sitzung mit Restzeit.

// Der Token geht mit, weil der Chat ihn braucht (B7): Er ist der einzige Ausweis des
// Klienten, hier wie beim Betreten des Warteraums.
const props = defineProps<{ call: CallAccessResponse; now: number; token: string }>()

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
  // Jeder Zustand außer „läuft bereits" heißt: betreten. Nach einem vorangegangenen
  // Gespräch steht hier 'ended' – wer in derselben Sitzung einen zweiten Call öffnet, käme
  // sonst nie in den Raum, und die Bühne bliebe bei „verbindet sich …" stehen.
  if (status.value !== 'connecting' && status.value !== 'connected') void joinCall()
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
const micDevices = computed(() => namedDevices(microphones.value, 'Mikrofon'))
const camDevices = computed(() => namedDevices(cameras.value, 'Kamera'))

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
  // Auch während des Verbindens: Kommt die Kamera aus dem Warteraum, läuft ihr Bild durch.
  stream: localVideoStream(),
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

const deviceAlert = computed(() => deviceNotice(cameraIssue.value, microphoneIssue.value))
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

// Der Chat läuft über die API und wird gespeichert (B7). Der Ausweis ist derselbe Token, mit
// dem der Klient hereingekommen ist.
const chatVisible = () => sidebarOpen.value && activePanel.value === 'chat'
const chat = useCallChat({
  bookingId: props.call.bookingId,
  token: props.token,
  self: 'client',
  canSend: () => props.call.state === 'admitted',
  visible: chatVisible,
})
const chatHintDismissed = ref(false)
watch(() => chat.unread.value, (unread) => { if (unread) chatHintDismissed.value = false })

// Eine Datei, die nicht durchkommt, steht über der Bühne – diese App hat keine Toasts, und
// die anderen Meldungen (Ton, Geräte, Freigabe) stehen ohnehin dort.
const chatProblem = ref<string | null>(null)
watch(() => chat.errorMessage.value, (message) => {
  if (!message) return
  chatProblem.value = message
  chat.errorMessage.value = null
})

// Über der Bühne und nicht nur als Punkt am Reiter: Wer den Ton verloren hat, schaut auf das
// Bild. Genau dafür ist der Chat da.
const chatHint = computed(() =>
  chat.unread.value && !chatHintDismissed.value ? chat.latestPeerText.value : null,
)

function openChat() {
  chatHintDismissed.value = true
  activePanel.value = 'chat'
  sidebarOpen.value = true
}

const panels = computed<CallPanelDef[]>(() => [
  { value: 'chat', label: 'Chat', icon: 'i-lucide-message-square', badge: chat.unread.value },
])

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

        <UAlert
          v-if="chatProblem"
          icon="i-lucide-alert-circle"
          color="error"
          variant="subtle"
          class="max-w-md shadow-lg bg-default"
          title="Datei nicht gesendet"
          :description="chatProblem"
          :close="{ onClick: () => { chatProblem = null } }"
        />

        <UAlert
          v-if="chatHint"
          icon="i-lucide-message-square"
          color="info"
          variant="subtle"
          class="max-w-md shadow-lg bg-default"
          title="Neue Chat-Nachricht"
          :description="chatHint"
          :ui="{ description: 'line-clamp-2' }"
          :actions="[{ label: 'Chat öffnen', color: 'info', variant: 'solid', onClick: openChat }]"
          :close="{ onClick: () => { chatHintDismissed = true } }"
        />
      </div>
    </template>

    <template #sidebar>
      <CallChatPanel
        v-model:draft="chat.draft.value"
        :messages="chat.messages.value"
        :peer-name="call.coachName"
        :can-send="call.state === 'admitted'"
        disabled-reason="Schreiben ist nur im laufenden Gespräch möglich."
        class="h-full"
        @send="chat.send()"
        @retry="chat.retry"
        @attach="chat.sendFile"
        @attach-rejected="(message: string) => { chatProblem = message }"
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
