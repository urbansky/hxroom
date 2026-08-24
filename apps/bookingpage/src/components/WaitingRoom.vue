<script setup lang="ts">
import { computed } from 'vue';
import { formatCountdown, formatDayTimeRange, formatTime } from '../utils/datetime';
import { offerColor, type CallAccessResponse } from '@hxroom/shared';

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

// Bewusst der Beginn des Termins, nicht der des Zugangsfensters: Wann der Raum
// aufschließt, ist Technik – gemerkt hat sich der Klient seine Uhrzeit.
const title = computed(() =>
  tooEarly.value ? `Dein Termin beginnt um ${formatTime(call.start)} Uhr` : 'Du bist im Warteraum',
);

const description = computed(() =>
  tooEarly.value
    ? `Du kannst diese Seite geöffnet lassen – sie meldet sich, sobald es losgeht.`
    : `${call.coachName} weiß, dass du da bist, und lässt dich gleich herein.`,
);

const countdown = computed(() => formatCountdown(Date.parse(call.start) - now));

const durationMinutes = computed(() =>
  Math.round((Date.parse(call.end) - Date.parse(call.start)) / 60_000),
);
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

    <!-- Dieselbe Terminkachel wie in der Agenda der Coach-App (BookingAgenda.vue):
         Farbbalken des Angebots, darüber die Zeit, darunter Gegenüber und Dauer. Beide
         Seiten sehen denselben Termin – er soll auch gleich aussehen. Statt der reinen
         Uhrzeit steht hier Wochentag und Datum mit, weil dem Klienten die Tagesüberschrift
         der Agenda fehlt. -->
    <div class="w-full rounded-xl border border-default bg-white dark:bg-neutral-900 p-4 flex items-start gap-3 text-left">
      <span
        v-if="call.offerId"
        class="w-1 rounded-full shrink-0 self-stretch"
        :style="{ backgroundColor: offerColor(call.offerId) }"
      />

      <div class="flex-1 min-w-0">
        <div class="text-sm font-medium text-highlighted tabular-nums">
          {{ formatDayTimeRange(call.start, call.end) }}
        </div>
        <div class="mt-1 font-medium text-highlighted truncate">{{ call.coachName }}</div>
        <div class="mt-0.5 text-sm text-muted truncate">
          {{ durationMinutes }} Min. · {{ call.offerName }}
        </div>
      </div>
    </div>
  </div>
</template>
