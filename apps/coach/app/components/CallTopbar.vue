<script setup lang="ts">
import type { CallAccessResponse } from '@hxroom/shared'

// Kopfzeile des Call-Screens (doc/poc/videocall-v2.html, Screen 3).
//
// Sie trägt drei Dinge in drei Zonen: links wer einlädt, mittig wie es um die Verbindung
// steht und wie lange die Sitzung läuft, rechts der Zugang zur Seitenleiste. Die Mitte ist
// absolut zentriert statt per flex-Verteilung – sonst wandert der Timer, sobald der
// Coaching-Name länger oder kürzer wird.

const props = defineProps<{
  call: CallAccessResponse
  now: Date
  connection: 'live' | 'reconnecting'
  sidebarOpen: boolean
}>()

defineEmits<{ 'toggle-sidebar': [] }>()

const elapsed = computed(() =>
  props.call.admittedAt ? formatDuration(props.call.admittedAt, props.now) : '0:00',
)

// Dezenter Hinweis, sobald die gebuchte Zeit überschritten ist – ohne zu drängen. Beendet
// wird eine Sitzung nur durch den Coach, nie durch eine Uhr. Übernommen aus CallStage.
const overrun = computed(() => props.now > new Date(props.call.end))
</script>

<template>
  <header
    class="relative flex items-center justify-between gap-4 px-4 sm:px-6 border-b border-default bg-default"
    :style="{ height: 'var(--call-topbar-h)' }"
  >
    <!-- Der Name darf nie unter die zentrierte Mitte laufen, egal wie lang er ist. Auf
         schmalen Fenstern trägt die Mitte nur Punkt und Uhr, dort bleibt mehr übrig. -->
    <span class="font-serif text-lg sm:text-xl text-highlighted truncate max-w-[calc(50%-3.5rem)] sm:max-w-[max(4rem,calc(50%-7rem))]">
      {{ call.coachName }}
    </span>

    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 sm:gap-3">
      <span
        class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
        :class="connection === 'live' ? 'bg-success/10' : 'bg-warning/10'"
      >
        <span
          class="size-1.5 rounded-full animate-pulse"
          :class="connection === 'live' ? 'bg-success' : 'bg-warning'"
        />
        <span
          class="hidden sm:inline text-xs"
          :class="connection === 'live' ? 'text-success' : 'text-warning'"
        >
          {{ connection === 'live' ? 'Live' : 'Verbindung wackelt' }}
        </span>
      </span>

      <!-- lining-nums: Cormorant setzt Ziffern sonst als Minuskeln, und "12:01" liest
           sich dann wie "I2:0I". Bei einer laufenden Uhr ist das keine Frage des
           Geschmacks. -->
      <span class="font-serif text-lg tabular-nums lining-nums" :class="overrun ? 'text-warning' : 'text-toned'">
        {{ elapsed }}
      </span>
    </div>

    <UButton
      :icon="sidebarOpen ? 'i-lucide-panel-right-close' : 'i-lucide-panel-right-open'"
      color="neutral"
      :variant="sidebarOpen ? 'subtle' : 'ghost'"
      size="sm"
      :aria-label="sidebarOpen ? 'Seitenleiste ausblenden' : 'Seitenleiste einblenden'"
      @click="$emit('toggle-sidebar')"
    />
  </header>
</template>
