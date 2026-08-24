<script setup lang="ts">
import { computed } from 'vue';
import { formatCountdown, formatDayTimeRange, formatTime } from '../utils/datetime';
import { offerColor, type CallAccessResponse } from '@hxroom/shared';

// Eine Ansicht für die ganze Wartezeit – vom Tag der Buchung bis zum Einlass. Die Grenze
// des Zugangsfensters (60 Minuten vor Beginn) ist unsere, nicht die des Klienten: Dort
// erfährt der Coach nichts, einlassen kann niemand, vorzubereiten gibt es nichts. Ein
// Szenenwechsel an dieser Stelle verspräche "gleich", während es noch eine Stunde dauert.
// In der API bleibt sie bestehen – sie entscheidet über Zugang, Anwesenheit und später
// den LiveKit-Token.
const { call, avatarUrl, now, cancelHref } = defineProps<{
  call: CallAccessResponse;
  avatarUrl: string | null;
  /** Reaktive Jetzt-Zeit aus useCallState; ohne sie stünde der Countdown still. */
  now: number;
  /** Selbstabsage mit demselben Token, der diese Seite geöffnet hat. */
  cancelHref: string;
}>();

// Bewusst der Beginn des Termins, nicht der des Zugangsfensters: Wann der Raum
// aufschließt, ist Technik – gemerkt hat sich der Klient seine Uhrzeit.
const startsAt = computed(() => Date.parse(call.start));
const beforeStart = computed(() => now < startsAt.value);

// Die Kapsel trägt als Einzige die Bewegung. Ihre einzige Verzweigung hängt am
// Terminbeginn – einem Zeitpunkt, den der Klient kennt.
const status = computed(() =>
  beforeStart.value ? formatCountdown(startsAt.value - now) : 'Es geht gleich los',
);

// Absagen kann der Klient bis zum Terminbeginn – dieselbe Grenze, nach der der Server
// entscheidet (canClientCancel in booking.constants.ts). Danach führte der Link nur auf
// eine Absage, die abgelehnt wird.
const canCancel = computed(() => beforeStart.value);

const durationMinutes = computed(() =>
  Math.round((Date.parse(call.end) - startsAt.value) / 60_000),
);
</script>

<template>
  <div class="flex flex-col items-center text-center gap-6 max-w-[420px]">
    <div class="size-24 rounded-full overflow-hidden bg-primary flex items-center justify-center shrink-0">
      <img v-if="avatarUrl" :src="avatarUrl" :alt="call.coachName" class="size-full object-cover">
      <span v-else class="font-serif text-4xl text-inverted">{{ call.coachName.charAt(0) }}</span>
    </div>

    <div>
      <h1 class="font-serif text-3xl text-highlighted mb-2">
        Dein Termin beginnt um {{ formatTime(call.start) }} Uhr
      </h1>
      <p class="text-sm text-muted leading-relaxed">
        {{ call.coachName }} holt dich zum Termin herein. Du kannst diese Seite so lange geöffnet
        lassen – sie meldet sich, sobald es losgeht.
      </p>
    </div>

    <!-- Der pulsierende Punkt als Zeichen, dass die Seite lebt und niemand etwas tun muss. -->
    <div class="inline-flex items-center gap-2 bg-primary/10 rounded-full px-3.5 py-1.5">
      <span class="size-1.5 rounded-full bg-primary animate-pulse" />
      <span class="text-xs text-muted">{{ status }}</span>
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

    <p v-if="canCancel" class="text-xs text-muted">
      Du kannst den Termin nicht wahrnehmen?
      <RouterLink :to="cancelHref" class="text-primary underline underline-offset-2">Termin absagen</RouterLink>
    </p>
  </div>
</template>
