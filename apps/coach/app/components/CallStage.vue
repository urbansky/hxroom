<script setup lang="ts">
import type { CallAccessResponse } from '@hxroom/shared'

// Platzhalter für die Videobühne des Coachs. Sie wird in Schritt B5 durch die geteilte
// LiveKit-Schicht (packages/livekit) ersetzt; bis dahin zeigt sie, dass der Einlass
// funktioniert hat, und trägt den Sitzungs-Timer.
const props = defineProps<{ call: CallAccessResponse; now: Date }>()

defineEmits<{ end: [] }>()

const elapsed = computed(() =>
  props.call.admittedAt ? formatDuration(props.call.admittedAt, props.now) : '0:00',
)

// Dezenter Hinweis, sobald die gebuchte Zeit überschritten ist – ohne zu drängen. Beendet
// wird eine Sitzung nur durch den Coach, nie durch eine Uhr.
const overrun = computed(() => props.now > new Date(props.call.end))
</script>

<template>
  <div class="w-full max-w-4xl flex flex-col gap-4">
    <div class="aspect-video w-full rounded-xl bg-elevated border border-default flex flex-col items-center justify-center gap-3 text-center px-6">
      <UIcon name="i-lucide-video" class="size-8 text-dimmed" />
      <div>
        <p class="font-serif text-xl text-highlighted mb-1">Sitzung mit {{ call.clientName }} läuft</p>
        <p class="text-sm text-muted">Die Videoübertragung wird gerade eingebaut.</p>
      </div>
    </div>

    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <span class="size-1.5 rounded-full bg-success animate-pulse" />
        <span class="text-sm tabular-nums" :class="overrun ? 'text-warning' : 'text-muted'">{{ elapsed }}</span>
        <span v-if="overrun" class="text-xs text-muted">über der gebuchten Zeit</span>
      </div>

      <UButton label="Sitzung beenden" color="neutral" variant="subtle" icon="i-lucide-phone-off" @click="$emit('end')" />
    </div>
  </div>
</template>
