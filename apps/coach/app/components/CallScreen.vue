<script setup lang="ts">
import type { CallAccessResponse } from '@hxroom/shared'
import {
  CallScreen as CallShell,
  CallChatPanel,
  useLocalCamera,
  type CallChatMessage,
  type CallDevice,
  type CallPanelDef,
  type CallPeer,
} from '@hxroom/ui'

// Die Call-Oberfläche aus der Sicht des Coachs.
//
// Die Oberfläche selbst liegt in @hxroom/ui und trägt beide Seiten des Gesprächs; hier steht
// nur, was den Coach ausmacht: Notizen, Klientenakte, das Recht den Klienten stummzuschalten,
// der Sitzungs-Timer und ein Ende, das die Sitzung wirklich beendet.
//
// **Funktionsloser Prototyp.** Es besteht keine LiveKit-Verbindung, kein Schalter wirkt nach
// außen, nichts wird gespeichert – mit einer Ausnahme: Das eigene Kamerabild ist echt.
// Alle Zustände liegen als refs in dieser Komponente, damit sich das Zielbild beurteilen
// lässt, bevor B4/B5 die Mechanik dahinterlegen.
//
// Zweite Ausnahme: "Sitzung beenden" reicht das Ereignis nach oben – im echten Ablauf hängt
// dort die vorhandene end()-Aktion aus useCallState.

const props = defineProps<{ call: CallAccessResponse; now: Date }>()
const emit = defineEmits<{ end: [] }>()

const toast = useToast()

// ---------------------------------------------------------------------------
// Zustand des Prototyps
// ---------------------------------------------------------------------------
const micOn = ref(true)
const camOn = ref(true)
const selfBlur = ref(false)
/** Ob der Klient seinen Hintergrund weichzeichnet – seine Entscheidung, hier nur Anzeige. */
const remoteBlur = ref(true)
const sharing = ref(false)
const remoteMutedLocally = ref(false)
const connection = ref<'connecting' | 'live' | 'reconnecting' | 'lost'>('live')

// Beispielgeräte. Mit der Anbindung (B5) liefert sie enumerateDevices().
const MIC_DEVICES: CallDevice[] = [
  { id: 'default', label: 'Standardmikrofon (MacBook Pro)' },
  { id: 'usb', label: 'Externes USB-Mikrofon' },
  { id: 'airpods', label: 'AirPods Pro' },
]
const CAM_DEVICES: CallDevice[] = [
  { id: 'default', label: 'Standardkamera (FaceTime HD)' },
  { id: 'external', label: 'Externe Webcam' },
]
const micDeviceId = ref(MIC_DEVICES[0]!.id)
const camDeviceId = ref(CAM_DEVICES[0]!.id)

// ---------------------------------------------------------------------------
// Die eigene Kamera – der eine Teil, der nicht mehr Prototyp ist
// ---------------------------------------------------------------------------
// Das Vorschaubild kommt aus der echten Kamera. Übertragen wird nichts: Der Strom endet im
// <video> dieser Seite. Das Bild des Klienten bleibt bis B4/B5 eine Andeutung.
const { stream: cameraStream, error: cameraError } = useLocalCamera(camOn)

// Scheitert die Freigabe, steht der Schalter sonst auf "an", während nichts kommt.
watch(cameraError, (message) => {
  if (!message) return
  camOn.value = false
  toast.add({
    title: 'Kamera nicht verfügbar',
    description: message,
    icon: 'i-lucide-video-off',
    color: 'warning',
  })
})

// ---------------------------------------------------------------------------
// Die beiden Seiten der Bühne
// ---------------------------------------------------------------------------
const local = computed<CallPeer>(() => ({
  id: 'local',
  name: props.call.coachName,
  cameraOn: camOn.value,
  micOn: micOn.value,
  blurred: selfBlur.value,
  stream: cameraStream.value,
}))

const remote = computed<CallPeer>(() => ({
  id: 'remote',
  name: props.call.clientName,
  cameraOn: true,
  micOn: true,
  blurred: remoteBlur.value,
  mutedLocally: remoteMutedLocally.value,
}))

// Im Prototyp teilt nur der Coach – mit der Anbindung sagt die Herkunft der Spur, wer es ist.
const sharingBy = computed(() => (sharing.value ? 'local' : null))

// ---------------------------------------------------------------------------
// Seitenleiste
// ---------------------------------------------------------------------------
// Geschlossen zu Beginn: Die ersten Minuten gehören dem Ankommen, nicht dem Notizfeld.
// Wer mitschreiben will, hat die drei Knöpfe in der Steuerleiste.
const sidebarOpen = ref(false)
const activePanel = ref('notes')
const notes = ref('')
const chatDraft = ref('')
const chatUnread = ref(false)
const chatMessages = ref<CallChatMessage[]>([])
const endModalOpen = ref(false)

const panels = computed<CallPanelDef[]>(() => [
  { value: 'notes', label: 'Notizen', icon: 'i-lucide-notebook-pen' },
  { value: 'client', label: 'Klient', icon: 'i-lucide-contact-round' },
  { value: 'chat', label: 'Chat', icon: 'i-lucide-message-square', badge: chatUnread.value },
])

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------
function currentTime(): string {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function sendChatMessage() {
  const text = chatDraft.value.trim()
  if (!text) return

  chatMessages.value.push({
    id: Date.now(),
    from: 'self',
    text,
    time: currentTime(),
    // Grobe Vorschau der Regel aus §5a: In die Zusammenfassung geht nur, was einen Link trägt.
    inSummary: /https?:\/\/|\w+\.\w{2,}\//.test(text),
  })
  chatDraft.value = ''
}

/**
 * Eine eingehende Nachricht. Im Prototyp löst die Demo-Leiste sie aus; später kommt sie
 * über den Data-Channel. Sichtbar wird sie als Hinweis, nicht als aufspringendes Fenster –
 * der Chat soll nicht mit dem Gesicht des Gegenübers konkurrieren.
 */
function receiveChatMessage(text: string) {
  chatMessages.value.push({ id: Date.now(), from: 'peer', text, time: currentTime() })

  if (activePanel.value === 'chat' && sidebarOpen.value) return

  chatUnread.value = true
  toast.add({
    title: 'Neue Chat-Nachricht',
    description: text,
    icon: 'i-lucide-message-square',
    color: 'info',
    actions: [{
      label: 'Öffnen',
      color: 'neutral',
      variant: 'outline',
      onClick: () => openChat(),
    }],
  })
}

function openChat() {
  activePanel.value = 'chat'
  sidebarOpen.value = true
}

// Gelesen ist, was offen vor einem liegt.
watch([activePanel, sidebarOpen], ([panel, open]) => {
  if (panel === 'chat' && open) chatUnread.value = false
})

function confirmEnd() {
  endModalOpen.value = false
  emit('end')
}

// Die Demo-Route steuert den Prototyp über diese Handgriffe.
defineExpose({
  micOn, camOn, selfBlur, remoteBlur, sharing, remoteMutedLocally, connection,
  sidebarOpen, activePanel, receiveChatMessage,
})
</script>

<template>
  <CallShell
    v-model:mic-on="micOn"
    v-model:cam-on="camOn"
    v-model:self-blur="selfBlur"
    v-model:sharing="sharing"
    v-model:remote-muted-locally="remoteMutedLocally"
    v-model:mic-device-id="micDeviceId"
    v-model:cam-device-id="camDeviceId"
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
    :mic-devices="MIC_DEVICES"
    :cam-devices="CAM_DEVICES"
    :sharing-by="sharingBy"
    can-mute-remote
    end-label="Sitzung beenden"
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
