<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

// Steuerleiste am unteren Rand (doc/poc/videocall-v2.html, Screen 3).
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

const props = defineProps<{ clientName: string }>()
defineEmits<{ end: [] }>()

// Für das Menü reicht der Vorname – "Markus stummschalten" liest sich im Gespräch
// natürlicher als der volle Name.
const clientNameShort = computed(() => props.clientName.split(' ')[0] ?? 'Klient')

// Beispielgeräte. Mit der Anbindung liefert sie enumerateDevices().
const MIC_DEVICES = ['Standardmikrofon (MacBook Pro)', 'Externes USB-Mikrofon', 'AirPods Pro']
const CAM_DEVICES = ['Standardkamera (FaceTime HD)', 'Externe Webcam']

// Die Menüs öffnen nach oben – sie hängen an der untersten Leiste des Fensters.
const MENU_CONTENT = { align: 'start', side: 'top' } as const

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
  // Weichzeichnen gehört hierher und nicht in ein Einstellungsmenü: Es ist eine
  // Eigenschaft des Kamerabilds, und viele Klienten sitzen in Küche oder Kinderzimmer
  // (project.md §5a). Bunte Hintergründe gibt es bewusst nicht.
  [{
    label: 'Eigenen Hintergrund weichzeichnen',
    icon: 'i-lucide-aperture',
    type: 'checkbox' as const,
    checked: coachBlur.value,
    onUpdateChecked: (value: boolean) => { coachBlur.value = value },
  }],
])

const moreItems = computed<DropdownMenuItem[][]>(() => [[{
  label: `${clientNameShort.value} stummschalten`,
  icon: 'i-lucide-mic-off',
  type: 'checkbox' as const,
  checked: clientMuted.value,
  onUpdateChecked: (value: boolean) => { clientMuted.value = value },
}]])
</script>

<template>
  <div
    class="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-6 border-t border-default bg-default"
    :style="{ height: 'var(--call-ctrl-h)' }"
  >
    <!-- Mikrofon -->
    <div class="flex flex-col items-center gap-1">
      <UButtonGroup size="lg">
        <UButton
          :icon="micOn ? 'i-lucide-mic' : 'i-lucide-mic-off'"
          :color="micOn ? 'neutral' : 'error'"
          variant="subtle"
          square
          :aria-label="micOn ? 'Mikrofon ausschalten' : 'Mikrofon einschalten'"
          @click="micOn = !micOn"
        />
        <UDropdownMenu :items="micItems" :content="MENU_CONTENT">
          <UButton icon="i-lucide-chevron-down" color="neutral" variant="subtle" aria-label="Mikrofon wechseln" />
        </UDropdownMenu>
      </UButtonGroup>
      <span class="hidden sm:block text-xs text-dimmed">Mikrofon</span>
    </div>

    <!-- Kamera. Der Punkt am Knopf zeigt, dass weichgezeichnet wird – sonst müsste man
         das Menü öffnen, um es zu sehen. -->
    <div class="flex flex-col items-center gap-1">
      <UButtonGroup size="lg">
        <UChip :show="coachBlur" color="primary" size="sm">
          <UButton
            :icon="camOn ? 'i-lucide-video' : 'i-lucide-video-off'"
            :color="camOn ? 'neutral' : 'error'"
            variant="subtle"
            square
            :aria-label="camOn ? 'Kamera ausschalten' : 'Kamera einschalten'"
            @click="camOn = !camOn"
          />
        </UChip>
        <UDropdownMenu :items="camItems" :content="MENU_CONTENT">
          <UButton icon="i-lucide-chevron-down" color="neutral" variant="subtle" aria-label="Kamera wechseln" />
        </UDropdownMenu>
      </UButtonGroup>
      <span class="hidden sm:block text-xs text-dimmed">Kamera</span>
    </div>

    <!-- Teilen -->
    <div class="flex flex-col items-center gap-1">
      <UButton
        icon="i-lucide-monitor-up"
        :color="sharing ? 'primary' : 'neutral'"
        :variant="sharing ? 'solid' : 'subtle'"
        size="lg"
        square
        :aria-label="sharing ? 'Bildschirmfreigabe beenden' : 'Bildschirm teilen'"
        @click="sharing = !sharing"
      />
      <span class="hidden sm:block text-xs text-dimmed">Teilen</span>
    </div>

    <div class="w-px h-8 bg-accented mx-1 sm:mx-2" />

    <!-- Selten Gebrauchtes hinter einem Menü: Stummschalten ist für technische Notfälle
         gedacht, etwa eine Rückkopplung – nichts, was neben dem Kamera-Knopf einlädt. -->
    <div class="flex flex-col items-center gap-1">
      <UDropdownMenu :items="moreItems" :content="MENU_CONTENT">
        <UChip :show="clientMuted" color="error" size="sm">
          <UButton icon="i-lucide-ellipsis-vertical" color="neutral" variant="subtle" size="lg" square aria-label="Weitere Optionen" />
        </UChip>
      </UDropdownMenu>
      <span class="hidden sm:block text-xs text-dimmed">Mehr</span>
    </div>

    <div class="w-px h-8 bg-accented mx-1 sm:mx-2" />

    <div class="flex flex-col items-center gap-1">
      <UButton
        icon="i-lucide-phone-off"
        color="error"
        size="lg"
        square
        aria-label="Sitzung beenden"
        @click="$emit('end')"
      />
      <span class="hidden sm:block text-xs text-dimmed">Beenden</span>
    </div>
  </div>
</template>
