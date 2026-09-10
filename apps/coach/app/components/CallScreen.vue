<script setup lang="ts">
import type { CallAccessResponse } from '@hxroom/shared'
import type { CallChatMessage } from './CallChatPanel.vue'
import type { CallSidebarTab } from './CallSidebar.vue'

// Die Call-Oberfläche des Coachs (doc/poc/videocall-v2.html, Screen 3).
//
// **Funktionsloser Prototyp.** Es besteht keine LiveKit-Verbindung, kein Schalter wirkt
// nach außen, nichts wird gespeichert. Alle Zustände liegen als refs in dieser Komponente,
// damit sich das Zielbild beurteilen lässt, bevor B4/B5 die Mechanik dahinterlegen.
//
// Einzige Ausnahme: "Sitzung beenden" reicht das Ereignis nach oben – im echten Ablauf
// hängt dort die vorhandene end()-Aktion aus useCallState.

defineProps<{ call: CallAccessResponse; now: Date }>()
const emit = defineEmits<{ end: [] }>()

// ---------------------------------------------------------------------------
// Zustand des Prototyps
// ---------------------------------------------------------------------------
const micOn = ref(true)
const camOn = ref(true)
const coachBlur = ref(false)
/** Ob der Klient seinen Hintergrund weichzeichnet – seine Entscheidung, hier nur Anzeige. */
const clientBlur = ref(true)
const sharing = ref(false)
const clientMuted = ref(false)
const connection = ref<'live' | 'reconnecting'>('live')
const selectedMic = ref('Standardmikrofon (MacBook Pro)')
const selectedCam = ref('Standardkamera (FaceTime HD)')

const activeTab = ref<CallSidebarTab>('notes')
const notes = ref('')
const chatDraft = ref('')
const chatUnread = ref(false)
const chatMessages = ref<CallChatMessage[]>([])
const endModalOpen = ref(false)

// ---------------------------------------------------------------------------
// Seitenleiste: neben der Bühne, auf schmalen Fenstern darüber
// ---------------------------------------------------------------------------
// Auf dem Telefon ist für zwei Spalten kein Platz, und §5a nennt den mobilen Zugang
// ausdrücklich als Core-Punkt. Statt eines eigenen Drawers übernimmt dort USlideover –
// dasselbe Muster wie in der Klienten- und Terminverwaltung.
const sidebarOpen = ref(true)
const isCompact = ref(false)

onMounted(() => {
  const query = window.matchMedia('(max-width: 767px)')
  const apply = (matches: boolean) => {
    isCompact.value = matches
    // Beim Wechsel auf schmal fährt die Leiste ein, statt die Bühne zu verdecken.
    if (matches) sidebarOpen.value = false
  }
  apply(query.matches)

  const onChange = (event: MediaQueryListEvent) => apply(event.matches)
  query.addEventListener('change', onChange)
  onUnmounted(() => query.removeEventListener('change', onChange))
})

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------
const toast = useToast()

function currentTime(): string {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function sendChatMessage() {
  const text = chatDraft.value.trim()
  if (!text) return

  chatMessages.value.push({
    id: Date.now(),
    from: 'coach',
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
  chatMessages.value.push({ id: Date.now(), from: 'client', text, time: currentTime() })

  if (activeTab.value === 'chat' && sidebarOpen.value) return

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
  activeTab.value = 'chat'
  sidebarOpen.value = true
}

// Gelesen ist, was offen vor einem liegt.
watch([activeTab, sidebarOpen], ([tab, open]) => {
  if (tab === 'chat' && open) chatUnread.value = false
})

function confirmEnd() {
  endModalOpen.value = false
  emit('end')
}

// Die Demo-Route steuert den Prototyp über diese Handgriffe.
defineExpose({
  micOn, camOn, coachBlur, clientBlur, sharing, clientMuted, connection,
  sidebarOpen, activeTab, receiveChatMessage,
})
</script>

<template>
  <div
    class="h-full flex flex-col bg-default"
    :style="{ '--call-topbar-h': '3.5rem', '--call-ctrl-h': '5rem' }"
  >
    <CallTopbar
      :call="call"
      :now="now"
      :connection="connection"
      :sidebar-open="sidebarOpen"
      @toggle-sidebar="sidebarOpen = !sidebarOpen"
    />

    <div class="flex-1 min-h-0 flex">
      <div class="flex-1 min-w-0 flex flex-col">
        <div class="flex-1 min-h-0">
          <CallVideoArea
            :call="call"
            :cam-on="camOn"
            :mic-on="micOn"
            :coach-blur="coachBlur"
            :client-blur="clientBlur"
            :sharing="sharing"
            :client-muted="clientMuted"
            @stop-sharing="sharing = false"
          />
        </div>

        <CallControls
          v-model:mic-on="micOn"
          v-model:cam-on="camOn"
          v-model:coach-blur="coachBlur"
          v-model:sharing="sharing"
          v-model:client-muted="clientMuted"
          v-model:selected-mic="selectedMic"
          v-model:selected-cam="selectedCam"
          :client-name="call.clientName"
          @end="endModalOpen = true"
        />
      </div>

      <aside
        v-if="!isCompact && sidebarOpen"
        class="w-80 shrink-0 border-l border-default bg-elevated/40"
      >
        <CallSidebar
          v-model:active-tab="activeTab"
          v-model:notes="notes"
          v-model:chat-draft="chatDraft"
          :call="call"
          :messages="chatMessages"
          :chat-unread="chatUnread"
          @send="sendChatMessage"
        />
      </aside>
    </div>

    <USlideover v-if="isCompact" v-model:open="sidebarOpen" title="Sitzung" :ui="{ content: 'bg-default', body: 'p-0 sm:p-0' }">
      <template #body>
        <CallSidebar
          v-model:active-tab="activeTab"
          v-model:notes="notes"
          v-model:chat-draft="chatDraft"
          :call="call"
          :messages="chatMessages"
          :chat-unread="chatUnread"
          class="h-full bg-default"
          @send="sendChatMessage"
        />
      </template>
    </USlideover>

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
  </div>
</template>
