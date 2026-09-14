<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
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

// Die Call-Oberfläche aus der Sicht des Klienten.
//
// Dieselbe Oberfläche wie beim Coach, aus derselben Quelle (@hxroom/ui). Was hier fehlt –
// Notizen, Klientenakte, Stummschalten, der Sitzungs-Timer –, fehlt, weil es dem Klienten
// nicht zusteht, und nicht, weil hier eine zweite Oberfläche gebaut würde.
//
// Der Timer bleibt aus: Für den Klienten ist er laut project.md §5a optional, und eine
// mitlaufende Uhr macht aus einem Gespräch eine Sitzung mit Restzeit.
//
// **Noch ohne LiveKit.** Das Bild des Coachs ist eine Andeutung; das eigene kommt aus der
// echten Kamera und endet im <video> dieser Seite. B4 hängt die Verbindung dahinter.

const props = defineProps<{ call: CallAccessResponse; now: number }>()

const router = useRouter()

const micOn = ref(true)
const camOn = ref(true)
const selfBlur = ref(false)
const sharing = ref(false)
/** Der Klient schaltet niemanden stumm – das Modell verlangt den Wert trotzdem. */
const remoteMutedLocally = ref(false)
const sidebarOpen = ref(false)
const activePanel = ref('chat')
const leaveModalOpen = ref(false)

// Beispielgeräte wie beim Coach. Mit B5 liefert enumerateDevices() die echten.
const MIC_DEVICES: CallDevice[] = [
  { id: 'default', label: 'Standardmikrofon' },
  { id: 'headset', label: 'Headset' },
]
const CAM_DEVICES: CallDevice[] = [
  { id: 'default', label: 'Standardkamera' },
]
const micDeviceId = ref(MIC_DEVICES[0]!.id)
const camDeviceId = ref(CAM_DEVICES[0]!.id)

const { stream: cameraStream, error: cameraError } = useLocalCamera(camOn)

// Für viele Klienten ist das hier die erste Berührung mit der Kamerafreigabe des Browsers
// (project.md §5a). Scheitert sie, springt der Schalter zurück und der Grund bleibt über der
// Bühne stehen – anders als beim Coach kein Toast: Wer zum ersten Mal in einem Videocall
// sitzt, übersieht eine Meldung, die nach fünf Sekunden von selbst verschwindet.
watch(cameraError, (message) => {
  if (message) camOn.value = false
})

const local = computed<CallPeer>(() => ({
  id: 'local',
  name: props.call.clientName,
  cameraOn: camOn.value,
  micOn: micOn.value,
  blurred: selfBlur.value,
  stream: cameraStream.value,
}))

const remote = computed<CallPeer>(() => ({
  id: 'remote',
  name: props.call.coachName,
  cameraOn: true,
  micOn: true,
  blurred: false,
}))

const sharingBy = computed(() => (sharing.value ? 'local' : null))

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
function leave() {
  leaveModalOpen.value = false
  router.push('/')
}
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
    connection="live"
    :now="now"
    :elapsed-since="null"
    :warn-after="null"
    :panels="panels"
    :mic-devices="MIC_DEVICES"
    :cam-devices="CAM_DEVICES"
    :sharing-by="sharingBy"
    end-label="Gespräch verlassen"
    @end="leaveModalOpen = true"
  >
    <template #stage-overlay>
      <div v-if="cameraError" class="absolute inset-x-0 top-4 z-20 flex justify-center px-4">
        <UAlert
          icon="i-lucide-video-off"
          color="warning"
          variant="subtle"
          class="max-w-md shadow-sm"
          title="Kamera nicht verfügbar"
          :description="cameraError"
          :close="{ onClick: () => { cameraError = null } }"
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
