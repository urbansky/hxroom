<script setup lang="ts">
// Vue-APIs explizit, U-Komponenten beim Resolver – siehe Kommentar in CallVideoArea.
import { computed, onMounted, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import CallControls from './CallControls.vue'
import CallVideoArea from './CallVideoArea.vue'
import type { CallConnection, CallDevice, CallPanelDef, CallPeer } from './types'

// Das Gerüst der Call-Oberfläche: Bühne, Steuerleiste und die Mechanik dazwischen.
//
// Rollenfrei. Was Coach und Klient unterscheidet, kommt von außen – die Namen als `local`
// und `remote`, die Bereiche der Seitenleiste als `panels`, ihr Inhalt als Slot, die
// Beschriftung des roten Knopfs als `endLabel`. Was danach passiert, entscheidet ebenfalls
// die App: Das Gerüst meldet nur `end` und öffnet keinen Dialog.
//
// Nicht hier drin: Toasts. `useToast` hält seine Liste modulweit in der @nuxt/ui-Kopie des
// aufrufenden Pakets; aus diesem Paket gerufen landeten sie in einem zweiten Speicher und
// erschienen nie. Meldungen sind ohnehin Sache der App, die den Zustand hält.

const props = defineProps<{
  /** Man selbst. */
  local: CallPeer
  /** Das Gegenüber, oder null, solange niemand sonst da ist. */
  remote: CallPeer | null
  /** Links in der Steuerleiste: wer einlädt. Auf beiden Seiten die Marke des Coachs. */
  title: string
  connection: CallConnection
  /** Jetzt-Zeit in Millisekunden. */
  now: number
  /** Beginn der Sitzung (ISO) für die Uhr; null blendet sie aus. */
  elapsedSince: string | null
  /** Ab wann die Uhr warnend färbt (ISO); null = nie. */
  warnAfter: string | null
  panels: CallPanelDef[]
  micDevices: CallDevice[]
  camDevices: CallDevice[]
  /** Wer gerade den Bildschirm teilt – Teilnehmer-ID oder null. */
  sharingBy?: string | null
  canMuteRemote?: boolean
  /** Bildschirmfreigabe anbieten – aus, bis sie gebaut ist (siehe CallControls). */
  canShare?: boolean
  /** Weichzeichnen anbieten – aus, bis es wirkt (siehe CallControls). */
  canBlur?: boolean
  endLabel: string
}>()

const micOn = defineModel<boolean>('micOn', { required: true })
const camOn = defineModel<boolean>('camOn', { required: true })
const selfBlur = defineModel<boolean>('selfBlur', { required: true })
const sharing = defineModel<boolean>('sharing', { required: true })
const remoteMutedLocally = defineModel<boolean>('remoteMutedLocally', { required: true })
const micDeviceId = defineModel<string>('micDeviceId', { required: true })
const camDeviceId = defineModel<string>('camDeviceId', { required: true })
const sidebarOpen = defineModel<boolean>('sidebarOpen', { required: true })
const activePanel = defineModel<string>('activePanel', { required: true })

defineEmits<{ end: [] }>()

// ---------------------------------------------------------------------------
// Vollbild der Bildschirmfreigabe
// ---------------------------------------------------------------------------
// Zeigt nur den geteilten Bildschirm: ohne die beiden Videos, ohne Steuerleiste.
//
// Die Leiste ist damit aber nicht fort. Stummschalten muss in einem Gespräch jederzeit
// gehen, und Auflegen erst recht – deshalb fährt sie wieder aus, sobald der Zeiger den
// unteren Rand berührt, und bleibt, solange er über ihr steht. Auf dem Tablet, wo es kein
// Überfahren gibt, führt der Knopf oben rechts im Bild aus dem Vollbild heraus.
const shareFullscreen = ref(false)
const controlsPeek = ref(false)
const controlsHidden = computed(() => shareFullscreen.value && !controlsPeek.value)

// Ohne Freigabe gibt es nichts, wofür sich das Verstecken lohnte.
const anySharing = computed(() => props.sharingBy != null)
watch(anySharing, (value) => {
  if (!value) shareFullscreen.value = false
})

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

// ---------------------------------------------------------------------------
// Seitenleiste: ein Slideover, das über der Bühne liegt
// ---------------------------------------------------------------------------
// USlideover statt einer eigenen Spalte – dasselbe Muster wie im übrigen Backoffice, und
// §5a nennt den mobilen Zugang ausdrücklich als Core-Punkt.
//
// Drei Abweichungen vom Standardverhalten, alle aus demselben Grund: Der Call läuft
// weiter, während die Leiste offen ist.
//   overlay="false"     – die Bühne bleibt sichtbar statt abgedunkelt
//   modal="false"       – ohne das legt der Dialog die Seite dahinter still, und Mikrofon
//                         und Kamera wären nicht mehr zu bedienen
//   dismissible="false" – sonst schlösse jeder Griff zur Steuerleiste die Leiste gleich mit
//   z-30                – ohne eigenen Rang liegt der Dialog bei z-auto, und die Schalter
//                         im Videobild (z-20) lägen über ihm. Die Ordnung der Ebenen:
//                         Bild und seine Schalter 20, Seitenleiste 30, Steuerleiste 40.
// inset gibt ihr einen Rand ringsum, sodass sie als Karte über der Bühne liegt.
//
// Oben und unten endet sie auf der Höhe der Bildfläche, statt bis an den Fensterrand zu
// reichen: So steht sie neben dem Bild statt davor, und die Steuerleiste bleibt frei. Die
// Maße kommen aus CallVideoArea und meinen die Fläche, die dem Bild zur Verfügung steht –
// nicht das Bild selbst, das in hohen Fenstern kleiner ausfällt. Sonst änderte die Leiste
// ihre Höhe bei jeder Größenänderung mit. portal="false" hält den Dialog im eigenen Baum,
// sonst hinge er am body und sähe die Variablen gar nicht.

/** Abstand der Bildfläche zum oberen und unteren Fensterrand, in px – siehe oben. */
const stageBounds = ref({ top: 0, bottom: 0 })

const panelTitle = computed(() =>
  props.panels.find(panel => panel.value === activePanel.value)?.label ?? '',
)

// ---------------------------------------------------------------------------
// Breite der Seitenleiste
// ---------------------------------------------------------------------------
// Wie viel Platz der Inhalt braucht, weiß nur der Mensch davor: Der eine tippt Stichworte,
// der nächste schreibt mit. Deshalb ist die Leiste am linken Rand zu ziehen.
//
// Die Grenzen: Unter 320 px werden zweispaltige Inhalte unleserlich, über 720 px bleibt vom
// Gespräch zu wenig übrig. Auf schmalen Fenstern greift ohnehin die Vorgabe des Slideovers
// (Fensterbreite minus Rand), und der Griff ist dort ausgeblendet.
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
</script>

<template>
  <div
    class="call-enter h-full flex flex-col bg-default"
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
          :local="local"
          :remote="remote"
          :sharing-by="sharingBy"
          @stop-sharing="sharing = false"
          @bounds="stageBounds = $event"
        />
      </div>

      <!-- Was die App zusätzlich über die Bühne legen will: ein Hinweis, dass die
           Gegenseite noch fehlt, ein Einwilligungs-Banner, eine Gerätemeldung. -->
      <slot name="stage-overlay" />

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
          class="call-enter-controls"
          v-model:mic-on="micOn"
          v-model:cam-on="camOn"
          v-model:self-blur="selfBlur"
          v-model:sharing="sharing"
          v-model:remote-muted-locally="remoteMutedLocally"
          v-model:mic-device-id="micDeviceId"
          v-model:cam-device-id="camDeviceId"
          v-model:sidebar-open="sidebarOpen"
          v-model:active-panel="activePanel"
          :title="title"
          :connection="connection"
          :now="now"
          :elapsed-since="elapsedSince"
          :warn-after="warnAfter"
          :peer-name="remote?.name ?? ''"
          :panels="panels"
          :mic-devices="micDevices"
          :cam-devices="camDevices"
          :can-mute-remote="canMuteRemote"
          :can-share="canShare"
          :can-blur="canBlur"
          :end-label="endLabel"
          @end="$emit('end')"
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
        <slot name="sidebar" :panel="activePanel" />
      </template>
    </USlideover>
  </div>
</template>

<style scoped>
/* Der Einstieg in den Call, zusammen mit der Bühne in CallVideoArea.vue. Der Wechsel dorthin
   ist in beiden Apps ein v-if auf den Zustand „eingelassen" – ohne Bewegung wäre er ein
   harter Schnitt vom Warteraum auf eine volle Bühne.

   Die Fläche selbst blendet nur ein, sie bewegt sich nicht: Sie ist ein Vorfahre der
   gemessenen Bühne, und nur die Deckkraft lässt getBoundingClientRect unberührt.

   Die Leiste fährt einen Hauch nach der Bühne herauf. Bewegt wird CallControls und nicht der
   umgebende Kasten – der trägt bereits translate-y-full für das Vollbild, und eine Animation
   auf derselben Eigenschaft liefe dagegen. Seine Höhe misst ein ResizeObserver, und den
   lässt ein Transform ohnehin kalt. */
.call-enter {
  animation: call-enter-fade 200ms var(--ease-out, ease-out) backwards;
}

.call-enter-controls {
  animation: call-enter-controls 350ms var(--ease-out, ease-out) 120ms backwards;
}

@keyframes call-enter-fade {
  from {
    opacity: 0;
  }
}

@keyframes call-enter-controls {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .call-enter,
  .call-enter-controls {
    animation: none;
  }
}
</style>
