<script setup lang="ts">
import type { CallAccessResponse } from '@hxroom/shared'
import {
  audioStreamFor,
  configureLivekit,
  joinCall,
  leaveCall,
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

// Die Call-Oberfläche aus der Sicht des Coachs, seit B5 am echten LiveKit-Raum.
//
// Die Oberfläche selbst liegt in @hxroom/ui und trägt beide Seiten des Gesprächs; hier steht
// nur, was den Coach ausmacht: Notizen, Klientenakte, das Recht den Klienten stummzuschalten,
// der Sitzungs-Timer und ein Ende, das die Sitzung wirklich beendet.

const props = defineProps<{ call: CallAccessResponse; now: Date }>()
const emit = defineEmits<{ end: [] }>()

const toast = useToast()

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
} = useCallRoom()

// ---------------------------------------------------------------------------
// Verbindung
// ---------------------------------------------------------------------------
// Beitreten, sobald diese Komponente steht – also mit dem Wechsel auf „eingelassen" nach
// dem Klick auf „Klient einlassen". Der Warmlauf ist im Warteraum schon gelaufen
// (pages/call/[bookingId].vue), die Verbindung steht deshalb fast unmittelbar.
//
// Der Coach bekäme sein Token schon vor dem Einlass (B2). Genutzt wird es erst hier: Ein
// Beitritt im Warteraum schaltete seine Kamera ein, während er auf einen Avatar schaut –
// ohne dass er es merkt.
//
// Der Token wird bei jedem Abruf neu ausgestellt; configureLivekit() nimmt ihn jedes Mal
// entgegen, damit ein Reconnect nach längerem Gespräch nicht auf einen abgelaufenen trifft.
watch(() => props.call.livekit, (livekit) => {
  if (!livekit?.token) return
  configureLivekit(livekit.url, livekit.token)
  if (status.value === 'idle' || status.value === 'failed') void joinCall()
}, { immediate: true })

// Ob durch „Sitzung beenden", einen Reload oder das Schließen des Tabs: Wer die Seite
// verlässt, verlässt den Raum. Der Klient folgt über sein SSE-Ereignis.
onBeforeUnmount(() => { void leaveCall() })

const selfBlur = ref(false)
const sharing = ref(false)
/** Nur hier still, nie an den Klienten gemeldet – für technische Notfälle. */
const remoteMutedLocally = ref(false)

// Die Geräte des Browsers aus @hxroom/livekit – dort wird die Liste nach jeder Freigabe und
// bei jeder Änderung neu gelesen, und ein Wechsel startet die laufende Spur mit dem neuen
// Gerät neu. Hier steht nur der Ersatzname für Geräte, die der Browser (noch) nicht nennt.
const micDevices = computed<CallDevice[]>(() =>
  microphones.value.map((device, i) => ({ id: device.id, label: device.label || `Mikrofon ${i + 1}` })),
)
const camDevices = computed<CallDevice[]>(() =>
  cameras.value.map((device, i) => ({ id: device.id, label: device.label || `Kamera ${i + 1}` })),
)

// Die Ursachen aus @hxroom/livekit in den Worten des Coachs. Anders als beim Klienten als
// Toast: Der Coach kennt seine Technik, eine Meldung über der Bühne verdeckte ihm das
// Gesicht des Klienten.
const DEVICE_TEXT: Record<DeviceIssue, string> = {
  denied: 'Der Browser hat den Zugriff blockiert – freigeben lässt er sich über das Symbol in der Adresszeile.',
  notFound: 'Kein Gerät gefunden.',
  busy: 'Das Gerät wird gerade von einem anderen Programm benutzt.',
  insecure: 'Die Seite ist nicht sicher genug verbunden, um auf das Gerät zuzugreifen.',
  unknown: 'Das Gerät ließ sich nicht starten.',
}

watch(cameraIssue, (issue) => {
  if (!issue) return
  toast.add({ title: 'Kamera nicht verfügbar', description: DEVICE_TEXT[issue], icon: 'i-lucide-video-off', color: 'warning' })
})
watch(microphoneIssue, (issue) => {
  if (!issue) return
  toast.add({ title: 'Mikrofon nicht verfügbar', description: DEVICE_TEXT[issue], icon: 'i-lucide-mic-off', color: 'warning' })
})

// ---------------------------------------------------------------------------
// Die beiden Seiten der Bühne
// ---------------------------------------------------------------------------
// Ein Gespräch, ein Gegenüber – dieselbe Annahme wie auf der Klientenseite.
const remotePeer = computed(() =>
  participants.value.find(p => p.id !== localIdentity.value) ?? null,
)

const local = computed<CallPeer>(() => ({
  id: localIdentity.value ?? 'local',
  name: props.call.coachName,
  cameraOn: camera.value,
  micOn: microphone.value,
  blurred: selfBlur.value,
  stream: localIdentity.value ? videoStreamFor(localIdentity.value) : null,
}))

const remote = computed<CallPeer>(() => ({
  id: remotePeer.value?.id ?? 'remote',
  name: props.call.clientName,
  // Solange der Klient noch nicht im Raum ist, gilt seine Kamera nicht als aus – die Bühne
  // zeigt dann „verbindet sich …".
  cameraOn: remotePeer.value ? !remotePeer.value.cameraMuted : true,
  micOn: remotePeer.value ? !remotePeer.value.microphoneMuted : true,
  blurred: false,
  mutedLocally: remoteMutedLocally.value,
  stream: remotePeer.value ? videoStreamFor(remotePeer.value.id) : null,
}))

const remoteAudio = computed(() =>
  remotePeer.value ? audioStreamFor(remotePeer.value.id) : null,
)

// Kein Ton, obwohl der Klient spricht – beim Coach wie beim Klienten der ärgerlichste Fehler.
const audioOut = ref<{ blocked: boolean } | null>(null)
watch(() => audioOut.value?.blocked, (blocked) => {
  if (!blocked) return
  toast.add({
    title: 'Kein Ton',
    description: 'Der Browser hat die Wiedergabe blockiert. Ein Klick auf die Seite gibt sie frei.',
    icon: 'i-lucide-volume-x',
    color: 'warning',
  })
})

const connection = computed<CallConnection>(() => {
  switch (status.value) {
    case 'connected': return 'live'
    case 'failed': return 'lost'
    default: return 'connecting'
  }
})

const sharingBy = computed(() => (sharing.value ? local.value.id : null))

// ---------------------------------------------------------------------------
// Seitenleiste
// ---------------------------------------------------------------------------
// Geschlossen zu Beginn: Die ersten Minuten gehören dem Ankommen, nicht dem Notizfeld.
const sidebarOpen = ref(false)
const activePanel = ref('notes')
const notes = ref('')
const chatDraft = ref('')
const chatMessages = ref<CallChatMessage[]>([])
const endModalOpen = ref(false)

const panels = computed<CallPanelDef[]>(() => [
  { value: 'notes', label: 'Notizen', icon: 'i-lucide-notebook-pen' },
  { value: 'client', label: 'Klient', icon: 'i-lucide-contact-round' },
  { value: 'chat', label: 'Chat', icon: 'i-lucide-message-square' },
])

// Der Chat bleibt vorerst auf dieser Seite: Die Übertragung über den Data-Channel ist ein
// eigener Schritt (Zusammenfassung nach §5a, Zustellung beim Reconnect).
function sendChatMessage() {
  const text = chatDraft.value.trim()
  if (!text) return

  chatMessages.value.push({
    id: Date.now(),
    from: 'self',
    text,
    time: new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }),
    // Grobe Vorschau der Regel aus §5a: In die Zusammenfassung geht nur, was einen Link trägt.
    inSummary: /https?:\/\/|\w+\.\w{2,}\//.test(text),
  })
  chatDraft.value = ''
}

function confirmEnd() {
  endModalOpen.value = false
  emit('end')
}
</script>

<template>
  <CallShell
    :mic-on="microphone"
    :cam-on="camera"
    v-model:self-blur="selfBlur"
    v-model:sharing="sharing"
    v-model:remote-muted-locally="remoteMutedLocally"
    :mic-device-id="activeMicrophoneId ?? ''"
    :cam-device-id="activeCameraId ?? ''"
    v-model:sidebar-open="sidebarOpen"
    v-model:active-panel="activePanel"
    :local="local"
    :remote="remote"
    :title="call.coachName"
    :connection="connection"
    :now="now.getTime()"
    :elapsed-since="call.admittedAt"
    :warn-after="call.end"
    :panels="panels"
    :mic-devices="micDevices"
    :cam-devices="camDevices"
    :sharing-by="sharingBy"
    can-mute-remote
    end-label="Sitzung beenden"
    @update:mic-on="toggleMicrophone()"
    @update:cam-on="toggleCamera()"
    @update:mic-device-id="(id: string) => switchDevice('audioinput', id)"
    @update:cam-device-id="(id: string) => switchDevice('videoinput', id)"
    @end="endModalOpen = true"
  >
    <template #sidebar="{ panel }">
      <CallNotesPanel v-if="panel === 'notes'" v-model="notes" />
      <CallClientPanel v-else-if="panel === 'client'" :call="call" />
      <CallChatPanel
        v-else
        v-model:draft="chatDraft"
        :messages="chatMessages"
        :peer-name="call.clientName"
        class="h-full"
        @send="sendChatMessage"
      />
    </template>
  </CallShell>

  <!-- Außerhalb der Bühne, damit der Ton beim Wechsel ins Vollbild nicht abreißt. -->
  <CallAudioOutput ref="audioOut" :stream="remoteAudio" :muted="remoteMutedLocally" />

  <!-- Ein Gespräch endet nicht durch einen Fehlklick: Der Klient wird weitergeleitet und
       der Termin gilt als gehalten (project.md §5a, "definiertes Ende"). -->
  <UModal
    v-model:open="endModalOpen"
    title="Sitzung beenden?"
    :description="`${call.clientName} wird automatisch weitergeleitet. Deine Notizen bleiben der Sitzung zugeordnet.`"
  >
    <template #footer>
      <div class="flex gap-3 justify-end w-full">
        <UButton color="neutral" variant="outline" label="Abbrechen" @click="endModalOpen = false" />
        <UButton color="error" icon="i-lucide-phone-off" label="Sitzung beenden" @click="confirmEnd" />
      </div>
    </template>
  </UModal>
</template>
