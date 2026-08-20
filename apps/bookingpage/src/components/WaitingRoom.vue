<script setup lang="ts">
import { computed } from 'vue';
import { formatCountdown, formatDayTimeRange, formatTime } from '../utils/datetime';
import AppointmentSummary from './AppointmentSummary.vue';
import type { CallAccessResponse } from '@hxroom/shared';

// Der Warteraum deckt drei Zustände ab: zu früh (mit Countdown), Fenster offen und
// wartend. Sie unterscheiden sich nur im Text – dieselbe ruhige Fläche zu behalten ist
// wichtiger, als drei getrennte Ansichten zu bauen.
const { call, avatarUrl, now } = defineProps<{
  call: CallAccessResponse;
  avatarUrl: string | null;
  /** Reaktive Jetzt-Zeit aus useCallState; ohne sie stünde der Countdown still. */
  now: number;
}>();

const tooEarly = computed(() => call.state === 'too_early');

const title = computed(() =>
  tooEarly.value ? `Der Raum öffnet um ${formatTime(call.opensAt)} Uhr` : 'Du bist im Warteraum',
);

const description = computed(() =>
  tooEarly.value
    ? `Du kannst diese Seite geöffnet lassen – sie meldet sich, sobald es losgeht.`
    : `${call.coachName} weiß, dass du da bist, und lässt dich gleich herein.`,
);

const countdown = computed(() => formatCountdown(Date.parse(call.opensAt) - now));
</script>

<template>
  <div class="flex flex-col items-center text-center gap-6 max-w-[420px]">
    <div class="size-24 rounded-full overflow-hidden bg-primary flex items-center justify-center shrink-0">
      <img v-if="avatarUrl" :src="avatarUrl" :alt="call.coachName" class="size-full object-cover">
      <span v-else class="font-serif text-4xl text-inverted">{{ call.coachName.charAt(0) }}</span>
    </div>

    <div>
      <h1 class="font-serif text-3xl text-highlighted mb-2">{{ title }}</h1>
      <p class="text-sm text-muted leading-relaxed">{{ description }}</p>
    </div>

    <!-- Zu früh: die verbleibende Zeit. Sonst der pulsierende Punkt als Zeichen, dass die
         Seite lebt und niemand etwas tun muss. -->
    <div class="inline-flex items-center gap-2 bg-primary/10 rounded-full px-3.5 py-1.5">
      <span class="size-1.5 rounded-full bg-primary" :class="{ 'animate-pulse': !tooEarly }" />
      <span class="text-xs text-muted">{{ tooEarly ? countdown : 'Verbunden' }}</span>
    </div>

    <AppointmentSummary
      :offer="call.offerName"
      :appointment="formatDayTimeRange(call.start, call.end)"
      :coach="call.coachName"
    />
  </div>
</template>
