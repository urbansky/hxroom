<script setup lang="ts">
import { firstName, type CallAccessResponse, type CallClientContext } from '@hxroom/shared'
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
  screenSharing,
  screenShareBy,
  screenShareIssue,
  setScreenShareEnabled,
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
  // Jeder Zustand außer „läuft bereits" heißt: betreten. Nach einem vorangegangenen
  // Gespräch steht hier 'ended' – wer in derselben Sitzung einen zweiten Call öffnet, käme
  // sonst nie in den Raum, und die Bühne bliebe bei „verbindet sich …" stehen.
  if (status.value !== 'connecting' && status.value !== 'connected') void joinCall()
}, { immediate: true })

// Ob durch „Sitzung beenden", einen Reload oder das Schließen des Tabs: Wer die Seite
// verlässt, verlässt den Raum. Der Klient folgt über sein SSE-Ereignis.
onBeforeUnmount(() => { void leaveCall() })

const selfBlur = ref(false)
/** Nur hier still, nie an den Klienten gemeldet – für technische Notfälle. */
const remoteMutedLocally = ref(false)

// Die Geräte des Browsers aus @hxroom/livekit – dort wird die Liste nach jeder Freigabe und
// bei jeder Änderung neu gelesen, und ein Wechsel startet die laufende Spur mit dem neuen
// Gerät neu. Hier steht nur der Ersatzname für Geräte, die der Browser (noch) nicht nennt.
const micDevices = computed(() => namedDevices(microphones.value, 'Mikrofon'))
const camDevices = computed(() => namedDevices(cameras.value, 'Kamera'))

// Gerätemeldungen (DEVICE_TEXT aus utils/deviceText.ts) anders als beim Klienten als Toast:
// Der Coach kennt seine Technik, eine Meldung über der Bühne verdeckte ihm das Gesicht des
// Klienten.

watch(cameraIssue, (issue) => {
  if (!issue) return
  toast.add({ title: 'Kamera nicht verfügbar', description: DEVICE_TEXT[issue], icon: 'i-lucide-video-off', color: 'warning' })
})
watch(screenShareIssue, (issue) => {
  if (!issue) return
  toast.add({
    title: 'Bildschirm lässt sich nicht teilen',
    description: issue === 'system'
      ? 'Dein System erlaubt dem Browser keine Bildschirmaufnahme. Unter macOS: Systemeinstellungen → Datenschutz & Sicherheit → Bildschirm- & Systemaudioaufnahme, dort den Browser erlauben und ihn neu starten.'
      : 'Die Freigabe konnte nicht gestartet werden.',
    icon: 'i-lucide-monitor-x',
    color: 'warning',
  })
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
  // Auch während des Verbindens: Kommt die Kamera aus dem Warteraum, läuft ihr Bild durch.
  stream: localVideoStream(),
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
const audioOut = ref<{ blocked: boolean, resume: () => void } | null>(null)
watch(() => audioOut.value?.blocked, (blocked) => {
  if (!blocked) {
    toast.remove('call-audio-blocked')
    return
  }
  toast.add({
    // Feste id: Hakt der Ton mehrfach, soll nicht ein Stapel gleicher Meldungen wachsen.
    id: 'call-audio-blocked',
    title: 'Kein Ton',
    description: 'Der Browser hat die Wiedergabe blockiert.',
    icon: 'i-lucide-volume-x',
    color: 'warning',
    duration: 0,
    actions: [{
      label: 'Ton einschalten',
      color: 'warning',
      variant: 'solid',
      onClick: () => audioOut.value?.resume(),
    }],
  })
})

const connection = computed<CallConnection>(() => {
  switch (status.value) {
    case 'connected': return 'live'
    case 'failed': return 'lost'
    default: return 'connecting'
  }
})

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
    ? `${firstName(props.call.clientName, 'Dein Gegenüber')} teilt gerade den Bildschirm`
    : null,
)

// ---------------------------------------------------------------------------
// Seitenleiste
// ---------------------------------------------------------------------------
// Geschlossen zu Beginn: Die ersten Minuten gehören dem Ankommen, nicht dem Notizfeld.
const sidebarOpen = ref(false)
const activePanel = ref('notes')
// Geladen wird sofort, nicht erst beim Öffnen der Seitenleiste: Wer mitten im Gespräch
// hineinklickt, soll nicht auf den Text warten.
const notes = useSessionNotes(() => props.call.bookingId)
const { content: notesContent, ready: notesReady, loadError: notesLoadError, status: notesStatus } = notes
// Die Angaben zum Klienten ebenso: einmal beim Betreten, ohne Abgleich über den
// Ereigniskanal – im Gespräch ändern sie sich nicht.
const { $api } = useApi()
const clientContext = ref<CallClientContext | null>(null)
const clientContextError = ref(false)

async function loadClientContext() {
  clientContextError.value = false
  try {
    clientContext.value = await $api<CallClientContext>(`/bookings/${props.call.bookingId}/call/client`)
  } catch {
    clientContextError.value = true
  }
}
void loadClientContext()

const endModalOpen = ref(false)

// Der Chat läuft über die API und wird gespeichert (B7). Geschrieben wird nur im laufenden
// Gespräch; gelesen werden darf immer, auch danach.
const chatVisible = () => sidebarOpen.value && activePanel.value === 'chat'
const chat = useCallChat({
  bookingId: props.call.bookingId,
  self: 'coach',
  canSend: () => props.call.state === 'admitted',
  visible: chatVisible,
})
const chatHintDismissed = ref(false)
watch(() => chat.unread.value, (unread) => { if (unread) chatHintDismissed.value = false })

// Wer den Ton verloren hat, schaut auf das Bild und nicht in die Seitenleiste – deshalb steht
// eine neue Nachricht kurz über der Bühne und nicht nur als Punkt am Reiter.
const chatHint = computed(() =>
  chat.unread.value && !chatHintDismissed.value ? chat.latestPeerText.value : null,
)

function openChat() {
  chatHintDismissed.value = true
  activePanel.value = 'chat'
  sidebarOpen.value = true
}

const panels = computed<CallPanelDef[]>(() => [
  { value: 'notes', label: 'Notizen', icon: 'i-lucide-notebook-pen' },
  { value: 'client', label: 'Klient', icon: 'i-lucide-contact-round' },
  { value: 'chat', label: 'Chat', icon: 'i-lucide-message-square', badge: chat.unread.value },
])

// Das Modal verspricht, dass die Notizen der Sitzung zugeordnet bleiben. Nach dem Ende wird
// dieser Screen abgebaut – was bis dahin nicht beim Server liegt, wäre weg. Deshalb erst
// speichern und bei einem Fehler fragen, statt still zu beenden.
const endSaving = ref(false)
const endSaveFailed = ref(false)
watch(endModalOpen, (open) => { if (open) endSaveFailed.value = false })

async function confirmEnd(force = false) {
  if (!force) {
    endSaving.value = true
    const saved = await notes.flush()
    endSaving.value = false
    if (!saved) {
      endSaveFailed.value = true
      return
    }
  }
  endModalOpen.value = false
  emit('end')
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
    :now="now.getTime()"
    :elapsed-since="call.admittedAt"
    :warn-after="call.end"
    :panels="panels"
    :mic-devices="micDevices"
    :cam-devices="camDevices"
    :sharing-by="screenShareBy"
    :share-stream="shareStream"
    :can-share="shareSupported"
    :share-disabled-reason="shareDisabledReason"
    can-mute-remote
    end-label="Sitzung beenden"
    @update:mic-on="toggleMicrophone()"
    @update:cam-on="toggleCamera()"
    @update:sharing="(on: boolean) => setScreenShareEnabled(on)"
    @update:mic-device-id="(id: string) => switchDevice('audioinput', id)"
    @update:cam-device-id="(id: string) => switchDevice('videoinput', id)"
    @end="endModalOpen = true"
  >
    <template #sidebar="{ panel }">
      <CallNotesPanel
        v-if="panel === 'notes'"
        v-model="notesContent"
        :status="notesStatus"
        :ready="notesReady"
        :load-error="notesLoadError"
        @retry="notes.reload()"
      />
      <CallClientPanel
        v-else-if="panel === 'client'"
        :call="call"
        :context="clientContext"
        :load-error="clientContextError"
        @retry="loadClientContext()"
      />
      <CallChatPanel
        v-else
        v-model:draft="chat.draft.value"
        :messages="chat.messages.value"
        :peer-name="call.clientName"
        :can-send="call.state === 'admitted'"
        disabled-reason="Schreiben ist nur im laufenden Gespräch möglich."
        class="h-full"
        @send="chat.send()"
        @retry="chat.retry"
      />
    </template>

    <!-- Der Slot bringt keine Positionierung mit – der Rahmen hier legt den Hinweis über die
         Bühne, wie auf der Klientenseite. -->
    <template #stage-overlay>
      <div v-if="chatHint" class="absolute inset-x-0 top-4 z-20 flex justify-center px-4">
        <UAlert
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
  </CallShell>

  <!-- Außerhalb der Bühne, damit der Ton beim Wechsel ins Vollbild nicht abreißt. -->
  <CallAudioOutput ref="audioOut" :stream="remoteAudio" :muted="remoteMutedLocally" />
  <!-- Der Ton einer Freigabe des Klienten. Stummschalten trifft ihn mit: Auch das ist Ton
       vom Klienten, und der Knopf ist für Rückkopplungen gedacht. -->
  <CallAudioOutput :stream="shareAudio" :muted="remoteMutedLocally" />

  <!-- Ein Gespräch endet nicht durch einen Fehlklick: Der Klient wird weitergeleitet und
       der Termin gilt als gehalten (project.md §5a, "definiertes Ende"). -->
  <UModal
    v-model:open="endModalOpen"
    title="Sitzung beenden?"
    :description="`${call.clientName} wird automatisch weitergeleitet. Deine Notizen bleiben der Sitzung zugeordnet.`"
  >
    <template #footer>
      <div v-if="endSaveFailed" class="flex flex-col gap-3 w-full">
        <p class="text-sm text-error">Deine Notizen konnten nicht gespeichert werden.</p>
        <div class="flex flex-wrap gap-3 justify-end">
          <UButton color="neutral" variant="outline" label="Erneut versuchen" :loading="endSaving" @click="confirmEnd()" />
          <UButton color="error" variant="subtle" icon="i-lucide-phone-off" label="Trotzdem beenden" @click="confirmEnd(true)" />
        </div>
      </div>
      <div v-else class="flex gap-3 justify-end w-full">
        <UButton color="neutral" variant="outline" label="Abbrechen" @click="endModalOpen = false" />
        <UButton color="error" icon="i-lucide-phone-off" label="Sitzung beenden" :loading="endSaving" @click="confirmEnd()" />
      </div>
    </template>
  </UModal>
</template>
