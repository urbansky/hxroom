<script setup lang="ts">
// Vue-APIs und Geschwisterkomponenten explizit, U-Komponenten beim Resolver – siehe
// Kommentar in CallVideoArea.
import { computed } from 'vue'
import { initials } from '@hxroom/shared'
import CallCameraView from './CallCameraView.vue'
import CallMicLevel from './CallMicLevel.vue'
import type { CallDevice } from './types'

// Geräte einrichten im Warteraum (doc/poc/videocall-v2.html, Screen 1): sich selbst sehen,
// Kamera und Mikrofon wählen und an- oder ausschalten, am Pegel hören, ob das Mikrofon das
// richtige ist. Was hier eingestellt wird, gilt beim Einlass.
//
// Für viele Klienten ist das die erste Berührung mit einer Kamerafreigabe im Browser
// (project.md §5a). Scheitert sie im Gespräch, ist das der Moment, in dem zu Zoom gewechselt
// wird – hier, vor dem Termin, ist Zeit, es zu lösen.
//
// Die Einrichtung beginnt erst auf Klick. Der Warteraum steht schon ab dem Tag der Buchung
// offen, und ein Freigabedialog, den niemand angefordert hat, liest sich wie ein Übergriff.
//
// „Hintergrund weichzeichnen" steht schon an seinem Platz, ist aber gesperrt: Die
// Personensegmentierung fehlt noch, und ein Schalter ohne Wirkung ließe jemanden glauben,
// die eigene Küche sei nicht zu sehen.
//
// Rollenfrei: Coach und Klient binden dieselbe Komponente ein. Die Mechanik liegt in
// @hxroom/livekit, Gerätemeldungen formuliert die App im Slot #notice.

const micOn = defineModel<boolean>('micOn', { required: true })
const camOn = defineModel<boolean>('camOn', { required: true })
const micDeviceId = defineModel<string>('micDeviceId', { required: true })
const camDeviceId = defineModel<string>('camDeviceId', { required: true })

const props = defineProps<{
  /** Ob die Einrichtung läuft – vorher steht nur die Kachel zum Starten. */
  started: boolean
  /** Das eigene Kamerabild. */
  stream: MediaStream | null
  /** Der eigene Mikrofonton, nur für den Pegel. */
  audioStream: MediaStream | null
  micDevices: CallDevice[]
  camDevices: CallDevice[]
  loadingCamera?: boolean
  /** Eigener Name, für die Initialen bei ausgeschalteter Kamera. */
  name: string
}>()

defineEmits<{
  start: []
  stop: []
}>()

const selfInitials = computed(() => initials(props.name))

const ROUND_BTN = 'rounded-full size-11 justify-center'
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <button
      v-if="!started"
      type="button"
      class="w-full rounded-xl border border-dashed border-accented bg-default hover:bg-elevated transition-colors px-5 py-6 flex flex-col items-center gap-2 text-center cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
      @click="$emit('start')"
    >
      <span class="size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center">
        <UIcon name="i-lucide-video" class="size-5" />
      </span>
      <span class="text-sm font-medium text-highlighted">Kamera und Mikrofon einrichten</span>
      <span class="text-xs text-muted leading-relaxed">
        Sieh dich vorab, wähle deine Geräte und prüfe den Ton. Dein Browser fragt dafür um Erlaubnis.
      </span>
    </button>

    <template v-else>
      <!-- Die Vorschau im selben Format wie die Kacheln im Gespräch. -->
      <div class="relative aspect-video w-full rounded-xl overflow-hidden ring-1 ring-accented bg-elevated shadow-sm">
        <CallCameraView v-if="camOn || loadingCamera" :stream="camOn ? stream : null" />
        <div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span class="size-14 rounded-full bg-primary/10 text-primary font-medium text-lg flex items-center justify-center">
            {{ selfInitials }}
          </span>
          <span class="text-xs text-muted">Kamera aus</span>
        </div>
      </div>

      <div class="flex items-center justify-center gap-3">
        <UButton
          :icon="micOn ? 'i-lucide-mic' : 'i-lucide-mic-off'"
          :color="micOn ? 'neutral' : 'error'"
          :variant="micOn ? 'subtle' : 'solid'"
          size="lg"
          :class="ROUND_BTN"
          :aria-label="micOn ? 'Mikrofon ausschalten' : 'Mikrofon einschalten'"
          :aria-pressed="!micOn"
          @click="micOn = !micOn"
        />
        <UButton
          :icon="camOn ? 'i-lucide-video' : 'i-lucide-video-off'"
          :color="camOn ? 'neutral' : 'error'"
          :variant="camOn ? 'subtle' : 'solid'"
          size="lg"
          :class="ROUND_BTN"
          :loading="loadingCamera"
          :aria-label="camOn ? 'Kamera ausschalten' : 'Kamera einschalten'"
          :aria-pressed="!camOn"
          @click="camOn = !camOn"
        />
      </div>

      <slot name="notice" />

      <div class="rounded-xl border border-default bg-default p-4 flex flex-col gap-3 text-left">
        <div class="text-xs font-medium text-muted">Technik-Check</div>

        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-mic" class="size-4 text-muted shrink-0" />
          <USelect
            v-model="micDeviceId"
            :items="micDevices"
            value-key="id"
            label-key="label"
            :disabled="!micDevices.length"
            placeholder="Kein Mikrofon gefunden"
            aria-label="Mikrofon wählen"
            class="flex-1 min-w-0"
          />
          <CallMicLevel :stream="micOn ? audioStream : null" class="shrink-0" />
        </div>

        <div class="flex items-center gap-3">
          <UIcon name="i-lucide-video" class="size-4 text-muted shrink-0" />
          <USelect
            v-model="camDeviceId"
            :items="camDevices"
            value-key="id"
            label-key="label"
            :disabled="!camDevices.length"
            placeholder="Keine Kamera gefunden"
            aria-label="Kamera wählen"
            class="flex-1 min-w-0"
          />
        </div>

        <div class="flex items-center gap-3 pt-3 border-t border-default">
          <UIcon name="i-lucide-aperture" class="size-4 text-dimmed shrink-0" />
          <span class="flex-1 min-w-0 text-sm text-muted">Hintergrund weichzeichnen</span>
          <UBadge label="Bald verfügbar" color="neutral" variant="subtle" size="sm" class="shrink-0" />
          <USwitch :model-value="false" disabled aria-label="Hintergrund weichzeichnen – bald verfügbar" />
        </div>
      </div>

      <UButton
        label="Einrichtung beenden"
        color="neutral"
        variant="ghost"
        size="sm"
        class="self-center"
        @click="$emit('stop')"
      />
    </template>
  </div>
</template>
