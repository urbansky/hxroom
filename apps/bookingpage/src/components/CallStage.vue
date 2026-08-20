<script setup lang="ts">
import { formatTimeRange } from '../utils/datetime';
import type { CallAccessResponse } from '@hxroom/shared';

// Platzhalter für die Videobühne. Sie wird in Schritt B4 durch die geteilte LiveKit-Schicht
// (packages/livekit) ersetzt; bis dahin zeigt sie, dass der Einlass funktioniert hat.
defineProps<{ call: CallAccessResponse }>();
</script>

<template>
  <div class="w-full max-w-[960px] flex flex-col gap-4">
    <div class="aspect-video w-full rounded-xl bg-elevated border border-default flex flex-col items-center justify-center gap-3 text-center px-6">
      <UIcon name="i-lucide-video" class="size-8 text-dimmed" />
      <div>
        <p class="font-serif text-xl text-highlighted mb-1">Du bist im Gespräch mit {{ call.coachName }}</p>
        <p class="text-sm text-muted">Die Videoübertragung wird gerade eingebaut.</p>
      </div>
    </div>

    <div class="flex items-center justify-between gap-4 text-sm">
      <span class="text-muted">{{ call.offerName }}</span>
      <span class="text-dimmed">{{ formatTimeRange(call.start, call.end) }} Uhr</span>
    </div>
  </div>
</template>
