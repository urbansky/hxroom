<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { CallAccessResponse } from '@hxroom/shared'

// Steuerleiste am unteren Rand (doc/poc/videocall-v2.html, Screen 3).
//
// Sie trägt alles, was nicht ins Bild gehört: links wer einlädt, wie es um die Verbindung
// steht und wie lange die Sitzung läuft, mittig die Schalter. Eine eigene Kopfzeile gibt es
// nicht mehr – sie nahm dem Videobild Höhe, um dieselben drei Dinge zu zeigen.
//
// Notizen, Klient und Chat werden hier ausgewählt, nicht in der Seitenleiste selbst: Die
// Leiste liegt als Slideover über der Bühne, und ein Reiter in einer Fläche, die man erst
// öffnen muss, ist kein Weg dorthin. Sie stehen rechts, auf der Seite, auf der die Leiste
// aufgeht. Ein Druck auf den bereits offenen Bereich schließt sie wieder – einen eigenen
// Knopf dafür braucht es damit nicht.
//
// Drei Spalten als Grid (1fr auto 1fr) und nicht als flex-Verteilung: Die Schalter stehen
// damit in der Fenstermitte, gleich wie lang der Name links wird. Auf dem Telefon reicht
// eine Zeile nicht – dort rücken die Schalter in eine zweite, sonst schiebt die Gruppe
// Titel und Uhr aus dem Bild. Die Leiste ist deshalb so hoch, wie ihr Inhalt es verlangt.
//
// Mikrofon und Kamera sind geteilte Schaltflächen: der große Teil schaltet um, der schmale
// öffnet die Geräteauswahl. Das erspart den Weg über eine Einstellungsseite, wenn mitten im
// Gespräch das Headset gewechselt wird (project.md §5a, Geräteauswahl).
//
// Prototyp: Keiner dieser Schalter wirkt auf eine echte Verbindung.

const micOn = defineModel<boolean>('micOn', { required: true })
const camOn = defineModel<boolean>('camOn', { required: true })
const coachBlur = defineModel<boolean>('coachBlur', { required: true })
const sharing = defineModel<boolean>('sharing', { required: true })
const clientMuted = defineModel<boolean>('clientMuted', { required: true })
const selectedMic = defineModel<string>('selectedMic', { required: true })
const selectedCam = defineModel<string>('selectedCam', { required: true })

/** Die Bereiche der Seitenleiste. Ausgewählt wird hier, angezeigt werden sie im Slideover. */
export type CallPanel = 'notes' | 'client' | 'chat'

const props = defineProps<{
  call: CallAccessResponse
  now: Date
  connection: 'live' | 'reconnecting'
  clientName: string
  /** Ungelesene Chat-Nachricht – als Punkt am Chat-Knopf. */
  chatUnread: boolean
}>()

defineEmits<{ end: [] }>()

const sidebarOpen = defineModel<boolean>('sidebarOpen', { required: true })
const activePanel = defineModel<CallPanel>('activePanel', { required: true })

const PANELS: { value: CallPanel, label: string, icon: string }[] = [
  { value: 'notes', label: 'Notizen', icon: 'i-lucide-notebook-pen' },
  { value: 'client', label: 'Klient', icon: 'i-lucide-contact-round' },
  { value: 'chat', label: 'Chat', icon: 'i-lucide-message-square' },
]

/** Hervorgehoben ist ein Bereich nur, solange die Leiste ihn auch zeigt. */
function panelShown(panel: CallPanel): boolean {
  return sidebarOpen.value && activePanel.value === panel
}

function selectPanel(panel: CallPanel) {
  if (panelShown(panel)) {
    sidebarOpen.value = false
    return
  }
  activePanel.value = panel
  sidebarOpen.value = true
}

const elapsed = computed(() =>
  props.call.admittedAt ? formatDuration(props.call.admittedAt, props.now) : '0:00',
)

// Dezenter Hinweis, sobald die gebuchte Zeit überschritten ist – ohne zu drängen. Beendet
// wird eine Sitzung nur durch den Coach, nie durch eine Uhr.
const overrun = computed(() => props.now > new Date(props.call.end))

// Für das Menü reicht der Vorname – "Markus stummschalten" liest sich im Gespräch
// natürlicher als der volle Name.
const clientNameShort = computed(() => props.clientName.split(' ')[0] ?? 'Klient')

// Beispielgeräte. Mit der Anbindung liefert sie enumerateDevices().
const MIC_DEVICES = ['Standardmikrofon (MacBook Pro)', 'Externes USB-Mikrofon', 'AirPods Pro']
const CAM_DEVICES = ['Standardkamera (FaceTime HD)', 'Externe Webcam']

// Die Menüs öffnen nach oben – sie hängen an der untersten Leiste des Fensters.
const MENU_CONTENT = { align: 'start', side: 'top' } as const

// Die Leiste selbst hat weder Fläche noch Rand: Der Grund der Bühne läuft unter ihr
// durch, die Knöpfe stehen darauf.
//
// Alle Schaltflächen der Leiste sind rund und tragen nur ein Symbol – benannt sind sie
// allein über aria-label. Die einzelnen messen 44 px, dieselbe Höhe wie die geteilten
// Schaltflächen und zugleich die übliche Mindestgröße für ein Tippziel. Auf dem Telefon
// eine Stufe kleiner, sonst passt die Reihe dort nicht mehr in eine Zeile. Die Größenklasse
// ersetzt das Innenabstands-Quadrat von `square`, deshalb zentriert justify-center das
// Symbol selbst.
const ROUND_BTN = 'rounded-full size-9 sm:size-11 justify-center'
// Die Pille selbst ist der Schalter: Ihre Fläche trägt das Symbol und schaltet das Gerät,
// nur der Pfeil daneben ist ein eigener Knopf für die Geräteauswahl. Zwei gleich große
// Kreise nebeneinander lasen sich wie zwei gleichrangige Schalter – umgeschaltet wird aber
// hundertmal häufiger als das Gerät gewechselt. Technisch bleiben es zwei Schaltflächen,
// denn ein Knopf im Knopf ist kein gültiges HTML.
//
// Ist das Gerät aus, färbt sich die ganze Pille rot – auch der Teil mit der Geräteauswahl.
// Ein rotes Symbol in einer neutralen Pille war zu leise für den Zustand, in dem das
// Gegenüber einen nicht hört.
// Die Pille reagiert als Ganzes, wenn der Zeiger über ihrer Fläche steht (has-[...]), statt
// dass der Schalter einen eigenen Fleck darin aufleuchten lässt – sonst sähe man doch wieder
// zwei Knöpfe. Nur der Pfeil hebt sich für sich hervor.
const SPLIT_SHELL = 'inline-flex items-center gap-0.5 p-1 rounded-full ring ring-inset transition-colors'
const SPLIT_SHELL_ON = 'bg-elevated ring-accented has-[.call-toggle:hover]:bg-accented'
const SPLIT_SHELL_OFF = 'bg-error ring-error has-[.call-toggle:hover]:bg-error/80'
// Die Schaltfläche des Geräts füllt die Pille links vom Pfeil und bleibt selbst farblos:
// Sowohl hover als auch active müssen aus dem Ghost-Stil genommen werden, sonst zeichnet
// sich doch wieder ein runder Knopf in der Pille ab.
const SPLIT_TOGGLE = 'call-toggle rounded-full h-8 sm:h-9 ps-2.5 pe-0.5 justify-center hover:bg-transparent active:bg-transparent'
const TOGGLE_OFF = 'text-inverted'
/** Der Pfeil: rund und erkennbar für sich, damit die Geräteauswahl nicht aus Versehen kommt. */
const SPLIT_MENU = 'rounded-full size-8 sm:size-9 justify-center'
const MENU_ON = 'hover:bg-accented'
const MENU_OFF = 'text-inverted hover:bg-white/15'

const micItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: 'Mikrofon wählen', type: 'label' }],
  MIC_DEVICES.map(device => ({
    label: device,
    type: 'checkbox' as const,
    checked: selectedMic.value === device,
    onUpdateChecked: () => { selectedMic.value = device },
  })),
])

const camItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: 'Kamera wählen', type: 'label' }],
  CAM_DEVICES.map(device => ({
    label: device,
    type: 'checkbox' as const,
    checked: selectedCam.value === device,
    onUpdateChecked: () => { selectedCam.value = device },
  })),
])

const moreItems = computed<DropdownMenuItem[][]>(() => [
  // Weichzeichnen: viele Klienten sitzen in Küche oder Kinderzimmer (project.md §5a).
  // Bunte Hintergründe gibt es bewusst nicht.
  [{
    label: 'Eigenen Hintergrund weichzeichnen',
    icon: 'i-lucide-aperture',
    type: 'checkbox' as const,
    checked: coachBlur.value,
    onUpdateChecked: (value: boolean) => { coachBlur.value = value },
  }],
  [{
    label: `${clientNameShort.value} stummschalten`,
    icon: 'i-lucide-mic-off',
    type: 'checkbox' as const,
    checked: clientMuted.value,
    onUpdateChecked: (value: boolean) => { clientMuted.value = value },
  }],
])
</script>

<template>
  <div class="grid grid-cols-2 sm:grid-cols-[1fr_auto_1fr] items-center gap-x-2 gap-y-3 px-3 sm:px-6 py-3">
    <!-- Wer einlädt, wie die Verbindung steht, wie lange es läuft. Der Name weicht auf
         schmalen Fenstern, die Uhr nie: Sie ist der Grund, warum hier überhaupt jemand
         hinsieht. -->
    <div class="min-w-0 flex flex-col gap-0.5 col-start-1 row-start-1">
      <span class="hidden sm:block font-serif text-base lg:text-lg text-highlighted truncate leading-tight">
        {{ call.coachName }}
      </span>

      <div class="flex items-center gap-2 min-w-0">
        <span
          class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 shrink-0"
          :class="connection === 'live' ? 'bg-success/10' : 'bg-warning/10'"
        >
          <span
            class="size-1.5 rounded-full animate-pulse"
            :class="connection === 'live' ? 'bg-success' : 'bg-warning'"
          />
          <span
            class="hidden lg:inline text-xs"
            :class="connection === 'live' ? 'text-success' : 'text-warning'"
          >
            {{ connection === 'live' ? 'Live' : 'Verbindung wackelt' }}
          </span>
        </span>

        <!-- lining-nums: Cormorant setzt Ziffern sonst als Minuskeln, und "12:01" liest
             sich dann wie "I2:0I". Bei einer laufenden Uhr ist das keine Frage des
             Geschmacks. -->
        <span class="font-serif text-base sm:text-lg tabular-nums lining-nums" :class="overrun ? 'text-warning' : 'text-toned'">
          {{ elapsed }}
        </span>
      </div>
    </div>

    <!-- Die Schalter, mittig im Fenster -->
    <div class="flex flex-wrap items-center justify-center gap-1 sm:gap-2 col-span-2 row-start-2 sm:col-span-1 sm:col-start-2 sm:row-start-1">
      <!-- Mikrofon -->
      <div :class="[SPLIT_SHELL, micOn ? SPLIT_SHELL_ON : SPLIT_SHELL_OFF]">
        <UButton
          :icon="micOn ? 'i-lucide-mic' : 'i-lucide-mic-off'"
          color="neutral"
          variant="ghost"
          size="lg"
          :class="[SPLIT_TOGGLE, micOn ? '' : TOGGLE_OFF]"
          :aria-label="micOn ? 'Mikrofon ausschalten' : 'Mikrofon einschalten'"
          @click="micOn = !micOn"
        />
        <UDropdownMenu :items="micItems" :content="MENU_CONTENT">
          <UButton
            icon="i-lucide-chevron-down"
            color="neutral"
            variant="ghost"
            size="lg"
            :class="[SPLIT_MENU, micOn ? MENU_ON : MENU_OFF]"
            aria-label="Mikrofon wechseln"
          />
        </UDropdownMenu>
      </div>

      <!-- Kamera. Dass weichgezeichnet wird, zeigt das eigene Vorschaubild im Videobereich;
           ein zweites Abzeichen am Knopf wäre dieselbe Aussage an zwei Stellen. -->
      <div :class="[SPLIT_SHELL, camOn ? SPLIT_SHELL_ON : SPLIT_SHELL_OFF]">
        <UButton
          :icon="camOn ? 'i-lucide-video' : 'i-lucide-video-off'"
          color="neutral"
          variant="ghost"
          size="lg"
          :class="[SPLIT_TOGGLE, camOn ? '' : TOGGLE_OFF]"
          :aria-label="camOn ? 'Kamera ausschalten' : 'Kamera einschalten'"
          @click="camOn = !camOn"
        />
        <UDropdownMenu :items="camItems" :content="MENU_CONTENT">
          <UButton
            icon="i-lucide-chevron-down"
            color="neutral"
            variant="ghost"
            size="lg"
            :class="[SPLIT_MENU, camOn ? MENU_ON : MENU_OFF]"
            aria-label="Kamera wechseln"
          />
        </UDropdownMenu>
      </div>

      <!-- Teilen -->
      <UButton
        icon="i-lucide-monitor-up"
        :color="sharing ? 'primary' : 'neutral'"
        :variant="sharing ? 'solid' : 'subtle'"
        size="lg"
        :class="ROUND_BTN"
        :aria-label="sharing ? 'Bildschirmfreigabe beenden' : 'Bildschirm teilen'"
        @click="sharing = !sharing"
      />

      <div class="hidden sm:block w-px h-8 bg-accented mx-1 sm:mx-2" />

      <!-- Selten Gebrauchtes hinter einem Menü: Der Weichzeichner wird einmal zu Beginn
           gesetzt, und Stummschalten ist für technische Notfälle gedacht, etwa eine
           Rückkopplung – nichts, was neben dem Kamera-Knopf einladen soll. -->
      <UDropdownMenu :items="moreItems" :content="MENU_CONTENT">
        <UChip :show="clientMuted" color="error" size="sm" inset>
          <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="subtle" size="lg" :class="ROUND_BTN" aria-label="Weitere Optionen" />
        </UChip>
      </UDropdownMenu>

      <div class="hidden sm:block w-px h-8 bg-accented mx-1 sm:mx-2" />

      <UButton
        icon="i-lucide-phone-off"
        color="error"
        size="lg"
        :class="ROUND_BTN"
        aria-label="Sitzung beenden"
        @click="$emit('end')"
      />
    </div>

    <!-- Notizen, Klient, Chat – auf der Seite, auf der die Leiste aufgeht. Genau einer ist
         hervorgehoben, und nur solange die Seitenleiste ihn auch zeigt. -->
    <div class="flex items-center justify-end gap-1 sm:gap-2 col-start-2 row-start-1 sm:col-start-3">
      <UChip
        v-for="panel in PANELS"
        :key="panel.value"
        :show="panel.value === 'chat' && chatUnread"
        color="primary"
        size="sm"
        inset
      >
        <UButton
          :icon="panel.icon"
          :color="panelShown(panel.value) ? 'primary' : 'neutral'"
          :variant="panelShown(panel.value) ? 'solid' : 'subtle'"
          size="lg"
          :class="ROUND_BTN"
          :aria-label="panelShown(panel.value) ? `${panel.label} schließen` : `${panel.label} öffnen`"
          :aria-pressed="panelShown(panel.value)"
          @click="selectPanel(panel.value)"
        />
      </UChip>
    </div>
  </div>
</template>
