<script setup lang="ts">
import type { CallAccessResponse } from '@hxroom/shared'
import type { CallChatMessage } from './CallChatPanel.vue'
import type { CallPanel } from './CallControls.vue'

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

const toast = useToast()

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

// ---------------------------------------------------------------------------
// Die eigene Kamera – der eine Teil, der nicht mehr Prototyp ist
// ---------------------------------------------------------------------------
// Das Vorschaubild kommt aus der echten Kamera, damit sich die Oberfläche über einem
// bewegten Bild beurteilen lässt und der Weg durch die Browser-Freigabe einmal gegangen
// ist. Übertragen wird nichts: Der Strom endet im <video> dieser Seite. Das Bild des
// Klienten bleibt bis B4/B5 die Andeutung aus CallVideoSim.
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
// Vollbild der Bildschirmfreigabe
// ---------------------------------------------------------------------------
// Zeigt nur den geteilten Bildschirm: ohne die beiden Videos, ohne Steuerleiste.
//
// Die Leiste ist damit aber nicht fort. Stummschalten muss in einem Gespräch jederzeit
// gehen, und "Sitzung beenden" erst recht – deshalb fährt sie wieder aus, sobald der Zeiger
// den unteren Rand berührt, und bleibt, solange er über ihr steht. Auf dem Tablet, wo es
// kein Überfahren gibt, führt der Knopf oben rechts im Bild aus dem Vollbild heraus.
const shareFullscreen = ref(false)
const controlsPeek = ref(false)
const controlsHidden = computed(() => shareFullscreen.value && !controlsPeek.value)

// Die Steuerleiste steht immer außerhalb des Flusses, und die Bühne hält ihren Platz als
// Polster frei. Lag sie im Fluss, sprang die Bühne beim Wechsel ins Vollbild um die ganze
// Leistenhöhe auf – das Videobild rückte im selben Moment nach unten, in dem es breiter
// wurde, und die Bewegung geriet ins Stocken. Als Polster lässt sich derselbe Platz weich
// abbauen. Die Höhe wird gemessen, weil die Leiste auf schmalen Fenstern zweizeilig wird.
const controlsBox = useTemplateRef<HTMLElement>('controlsBox')
const controlsHeight = ref(80)

onMounted(() => {
  const el = controlsBox.value
  if (!el) return

  const observer = new ResizeObserver(([entry]) => {
    const height = entry?.contentRect.height
    if (height) controlsHeight.value = height
  })
  observer.observe(el)
  onUnmounted(() => observer.disconnect())
})

// Ohne Freigabe gibt es nichts, wofür sich das Verstecken lohnte.
watch(sharing, (value) => {
  if (!value) shareFullscreen.value = false
})
const selectedMic = ref('Standardmikrofon (MacBook Pro)')
const selectedCam = ref('Standardkamera (FaceTime HD)')

const activePanel = ref<CallPanel>('notes')
const notes = ref('')
const chatDraft = ref('')
const chatUnread = ref(false)
const chatMessages = ref<CallChatMessage[]>([])
const endModalOpen = ref(false)

// ---------------------------------------------------------------------------
// Seitenleiste: ein Slideover, das über der Bühne liegt
// ---------------------------------------------------------------------------
// USlideover statt einer eigenen Spalte – dasselbe Muster wie in der Klienten- und
// Terminverwaltung, und §5a nennt den mobilen Zugang ausdrücklich als Core-Punkt.
//
// Drei Abweichungen vom Standardverhalten, alle aus demselben Grund: Der Call läuft
// weiter, während die Leiste offen ist.
//   overlay="false"    – die Bühne bleibt sichtbar statt abgedunkelt
//   modal="false"      – ohne das legt der Dialog die Seite dahinter still, und Mikrofon
//                        und Kamera wären nicht mehr zu bedienen
//   dismissible="false" – sonst schlösse jeder Griff zur Steuerleiste die Leiste gleich mit
//   z-30               – ohne eigenen Rang liegt der Dialog bei z-auto, und die Schalter
//                        im Videobild (z-20) lägen über ihm. Die Ordnung der Ebenen:
//                        Bild und seine Schalter 20, Seitenleiste 30, Steuerleiste 40.
// inset gibt ihr einen Rand ringsum, sodass sie als Karte über der Bühne liegt.
//
// Oben und unten endet sie auf der Höhe der Bildfläche, statt bis an den Fensterrand zu
// reichen: So steht sie neben dem Bild statt davor, und die Steuerleiste bleibt frei. Die
// Maße kommen aus CallVideoArea und meinen die Fläche, die dem Bild zur Verfügung steht –
// nicht das Bild selbst, das in hohen Fenstern kleiner ausfällt. Sonst änderte die Leiste
// ihre Höhe bei jeder Größenänderung mit. portal="false" hält den Dialog im eigenen Baum,
// sonst hinge er am body und sähe die Variablen gar nicht.
// Geschlossen zu Beginn: Die ersten Minuten gehören dem Ankommen, nicht dem Notizfeld.
// Wer mitschreiben will, hat die drei Knöpfe in der Steuerleiste.
const sidebarOpen = ref(false)

/** Abstand der Bildfläche zum oberen und unteren Fensterrand, in px – siehe oben. */
const stageBounds = ref({ top: 0, bottom: 0 })

// ---------------------------------------------------------------------------
// Breite der Seitenleiste
// ---------------------------------------------------------------------------
// Wie viel Platz die Notizen brauchen, weiß nur der Coach: Der eine tippt Stichworte, der
// nächste schreibt mit. Deshalb ist die Leiste am linken Rand zu ziehen.
//
// Die Grenzen: Unter 320 px wird die Klienten-Übersicht mit ihren zwei Spalten unleserlich,
// über 720 px bleibt vom Gespräch zu wenig übrig. Auf schmalen Fenstern greift ohnehin die
// Vorgabe des Slideovers (Fensterbreite minus Rand), und der Griff ist dort ausgeblendet.
const SIDEBAR_MIN = 320
const SIDEBAR_MAX = 720
/** Startwert: die Vorgabe von Nuxt UI für einen Slideover (max-w-md). */
const sidebarWidth = ref(448)
const resizing = ref(false)

function clampWidth(width: number): number {
  // Das Videobild soll nicht auf einen Streifen zusammenschrumpfen.
  const max = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, window.innerWidth - 320))
  return Math.min(Math.max(width, SIDEBAR_MIN), max)
}

function startResize(event: PointerEvent) {
  event.preventDefault()
  const handle = event.currentTarget as HTMLElement
  const startX = event.clientX
  const startWidth = sidebarWidth.value
  resizing.value = true
  handle.setPointerCapture(event.pointerId)

  // Nach links ziehen macht breiter – die Leiste hängt am rechten Rand.
  const onMove = (move: PointerEvent) => {
    sidebarWidth.value = clampWidth(startWidth + startX - move.clientX)
  }

  const onUp = () => {
    resizing.value = false
    handle.releasePointerCapture(event.pointerId)
    handle.removeEventListener('pointermove', onMove)
    handle.removeEventListener('pointerup', onUp)
    handle.removeEventListener('pointercancel', onUp)
  }

  handle.addEventListener('pointermove', onMove)
  handle.addEventListener('pointerup', onUp)
  handle.addEventListener('pointercancel', onUp)
}

/** Mit der Maus ziehen ist nicht für jeden ein Weg – die Pfeiltasten tun dasselbe. */
function resizeByKey(event: KeyboardEvent) {
  const step = event.shiftKey ? 64 : 16
  if (event.key === 'ArrowLeft') sidebarWidth.value = clampWidth(sidebarWidth.value + step)
  else if (event.key === 'ArrowRight') sidebarWidth.value = clampWidth(sidebarWidth.value - step)
  else return
  event.preventDefault()
}

const panelTitle = computed(() => ({
  notes: 'Notizen',
  client: 'Klient',
  chat: 'Chat',
}[activePanel.value]))

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
  micOn, camOn, coachBlur, clientBlur, sharing, clientMuted, connection,
  sidebarOpen, activePanel, receiveChatMessage,
})
</script>

<template>
  <div
    class="h-full flex flex-col bg-default"
    :style="{
      '--call-stage-top': `${stageBounds.top}px`,
      '--call-stage-bottom': `${stageBounds.bottom}px`,
      '--call-sidebar-w': `${sidebarWidth}px`,
    }"
  >
    <!-- bg-muted liegt auf diesem Kasten und nicht allein auf der Bühne, damit derselbe
         Grund auch hinter der Steuerleiste steht – die ist selbst durchsichtig. -->
    <div class="flex-1 min-h-0 relative flex flex-col bg-muted">
      <div
        class="flex-1 min-h-0 transition-[padding] duration-[250ms] ease-out motion-reduce:transition-none"
        :style="{ paddingBottom: shareFullscreen ? '0px' : `${controlsHeight}px` }"
      >
        <CallVideoArea
          v-model:fullscreen="shareFullscreen"
          :call="call"
          :cam-on="camOn"
          :camera-stream="cameraStream"
          :mic-on="micOn"
          :coach-blur="coachBlur"
          :client-blur="clientBlur"
          :sharing="sharing"
          :client-muted="clientMuted"
          @stop-sharing="sharing = false"
          @bounds="stageBounds = $event"
        />
      </div>

      <!-- Fühlfläche: Im Vollbild holt ein Zeiger am unteren Rand die Leiste zurück. -->
      <div
        v-if="shareFullscreen"
        class="absolute inset-x-0 bottom-0 h-16 z-20"
        @mouseenter="controlsPeek = true"
      />

      <!-- pointer-events-none an der eingefahrenen Leiste ist nicht Kosmetik: Sonst fängt
           sie die Zeigerbewegung ab, die Fühlfläche darunter bekommt nichts mit, und die
           Leiste ließe sich nicht mehr hervorholen. -->
      <div
        ref="controlsBox"
        class="absolute inset-x-0 bottom-0 z-40 bg-muted transition-all duration-[250ms] ease-out motion-reduce:transition-none"
        :class="controlsHidden ? 'translate-y-full opacity-0 pointer-events-none' : ''"
        @mouseleave="controlsPeek = false"
      >
        <CallControls
          v-model:mic-on="micOn"
          v-model:cam-on="camOn"
          v-model:coach-blur="coachBlur"
          v-model:sharing="sharing"
          v-model:client-muted="clientMuted"
          v-model:selected-mic="selectedMic"
          v-model:selected-cam="selectedCam"
          v-model:sidebar-open="sidebarOpen"
          v-model:active-panel="activePanel"
          :call="call"
          :now="now"
          :connection="connection"
          :client-name="call.clientName"
          :chat-unread="chatUnread"
          @end="endModalOpen = true"
        />
      </div>
    </div>

    <!-- Der Titel nennt den offenen Bereich; die Reiter dafür sitzen in der Steuerleiste. -->
    <USlideover
      v-model:open="sidebarOpen"
      :title="panelTitle"
      inset
      :overlay="false"
      :modal="false"
      :dismissible="false"
      :portal="false"
      :ui="{ content: 'z-30 top-[var(--call-stage-top,1rem)] bottom-[var(--call-stage-bottom,5rem)] right-3 sm:right-5 max-w-[var(--call-sidebar-w,28rem)]' }"
    >
      <!-- Der Ziehgriff steht im actions-Slot, weil der innerhalb der Kopfzeile liegt und
           damit innerhalb des positionierten Dialogs: So lässt er sich über die ganze Höhe
           an den linken Rand legen, ohne Kopfzeile und Schließen-Knopf nachzubauen. -->
      <template #actions>
        <div
          class="hidden sm:block absolute inset-y-0 -left-1.5 w-3 cursor-col-resize touch-none group focus:outline-none"
          role="separator"
          aria-orientation="vertical"
          aria-label="Breite der Seitenleiste"
          :aria-valuenow="sidebarWidth"
          :aria-valuemin="SIDEBAR_MIN"
          :aria-valuemax="SIDEBAR_MAX"
          tabindex="0"
          @pointerdown="startResize"
          @keydown="resizeByKey"
        >
          <div
            class="mx-auto h-full w-1 rounded-full transition-colors group-hover:bg-primary/40 group-focus-visible:bg-primary/40"
            :class="resizing ? 'bg-primary' : 'bg-transparent'"
          />
        </div>
      </template>

      <template #body>
        <CallNotesPanel v-if="activePanel === 'notes'" v-model="notes" />
        <CallClientPanel v-else-if="activePanel === 'client'" :call="call" />
        <CallChatPanel
          v-else
          v-model:draft="chatDraft"
          :messages="chatMessages"
          :client-name="call.clientName"
          class="h-full"
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
