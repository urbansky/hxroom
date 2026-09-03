<script setup lang="ts">
import type { AvailabilitySlotResponse, CoachBookingResponse } from '@hxroom/shared'

const props = defineProps<{
  bookings: CoachBookingResponse[]
  /** Wöchentliche Verfügbarkeitsregeln – als Hintergrundraster hinter den Buchungen. */
  availability: AvailabilitySlotResponse[]
  /** Montag der angezeigten Woche. Gewechselt wird über BookingWeekNav. */
  weekStart: Date
}>()

defineEmits<{ select: [booking: CoachBookingResponse] }>()

const PIXELS_PER_MINUTE = 1.3
/** Reicht für Zeitspanne + Klientenname (2 Zeilen à 15px + py-1) auch bei 15-Minuten-Terminen. */
const MIN_BLOCK_HEIGHT = 40
const WEEKDAYS = [
  { value: 0, short: 'Mo', long: 'Montag' },
  { value: 1, short: 'Di', long: 'Dienstag' },
  { value: 2, short: 'Mi', long: 'Mittwoch' },
  { value: 3, short: 'Do', long: 'Donnerstag' },
  { value: 4, short: 'Fr', long: 'Freitag' },
  { value: 5, short: 'Sa', long: 'Samstag' },
  { value: 6, short: 'So', long: 'Sonntag' },
]

// Für die Vergangenheits-Markierung: minütlich nachgeführt, damit ein Termin nicht bis zum
// Neuladen der Seite als "kommend" stehen bleibt.
const now = ref(new Date())
let nowTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  nowTimer = setInterval(() => (now.value = new Date()), 60_000)
})
onUnmounted(() => clearInterval(nowTimer))

const days = computed(() =>
  WEEKDAYS.map((day) => {
    const date = new Date(props.weekStart)
    date.setDate(date.getDate() + day.value)
    const today = startOfDay(now.value)
    return {
      ...day,
      date,
      isToday: date.getTime() === today.getTime(),
      isPast: date < today,
    }
  }),
)

/** Termine der angezeigten Woche, nach Wochentag sortiert. Abgesagte werden ausgeblendet. */
const bookingsByWeekday = computed(() => {
  const map = new Map<number, CoachBookingResponse[]>()
  for (const day of WEEKDAYS) map.set(day.value, [])

  const weekEnd = new Date(props.weekStart)
  weekEnd.setDate(weekEnd.getDate() + 7)

  for (const booking of props.bookings) {
    if (booking.status === 'cancelled') continue
    const start = new Date(booking.start)
    if (start < props.weekStart || start >= weekEnd) continue
    map.get(toMondayFirstWeekday(start))?.push(booking)
  }
  return map
})

// Sichtbarer Zeitbereich: umschließt Verfügbarkeiten und Termine der Woche, mindestens 8–18 Uhr.
const timeRange = computed(() => {
  let min = 8 * 60
  let max = 18 * 60

  for (const slot of props.availability) {
    min = Math.min(min, parseTimeToMinutes(slot.startTime))
    max = Math.max(max, parseTimeToMinutes(slot.endTime))
  }
  for (const list of bookingsByWeekday.value.values()) {
    for (const booking of list) {
      min = Math.min(min, minutesSinceMidnight(booking.start))
      max = Math.max(max, minutesSinceMidnight(booking.end))
    }
  }

  // Auf volle Stunden runden, damit die Achsenbeschriftung aufgeht.
  return { start: Math.floor(min / 60) * 60, end: Math.ceil(max / 60) * 60 }
})

// Puffer unter der letzten Stunde: ein kurzer Termin am Ende des Zeitbereichs wird durch
// MIN_BLOCK_HEIGHT höher gezeichnet als seine Dauer und ragte sonst aus dem Raster.
const gridHeight = computed(
  () => (timeRange.value.end - timeRange.value.start) * PIXELS_PER_MINUTE + MIN_BLOCK_HEIGHT,
)

const hourMarks = computed(() => {
  const marks: { minutes: number; label: string }[] = []
  for (let m = timeRange.value.start; m <= timeRange.value.end; m += 60) {
    marks.push({ minutes: m, label: `${String(Math.floor(m / 60)).padStart(2, '0')}:00` })
  }
  return marks
})

function offsetTop(minutes: number): number {
  return (minutes - timeRange.value.start) * PIXELS_PER_MINUTE
}

function availabilityBlocks(weekday: number) {
  return props.availability
    .filter(slot => slot.weekday === weekday)
    .map(slot => ({
      id: slot.id,
      top: offsetTop(parseTimeToMinutes(slot.startTime)),
      height: (parseTimeToMinutes(slot.endTime) - parseTimeToMinutes(slot.startTime)) * PIXELS_PER_MINUTE,
    }))
}

/**
 * Ein Terminblock verwendet dieselben Bausteine wie die Terminkachel in
 * BookingAgenda.vue: weiße Fläche, dünner Rahmen, Sitzungsfarbe als Pille links,
 * darunter Klientenname und Angebot. Dadurch erkennt man in beiden Ansichten
 * dasselbe Objekt wieder.
 *
 * Bewusst nicht übernommen wurde die frühere Vollfläche in der Primärfarbe: Sie war
 * eine eigene Formensprache, und mit der aufgehellten Sitzungspalette (L 50–67) trägt
 * eine gefüllte Fläche ohnehin keinen weißen Text mehr (nur rund 2,5:1).
 *
 * Vergangenes bekommt eine gefüllte Fläche (bg-elevated) statt reduzierter Deckkraft.
 * opacity nahm Rahmen und Sitzungsfarbe gleich mit zurück – auf dem Verfügbarkeitsband
 * lösten sich die Blöcke dadurch fast auf. Die gefüllte Fläche bleibt scharf und liest
 * sich trotzdem als abgeschlossen, weil sie dunkler ist als die offene weiße Karte.
 */
function toneFor(booking: CoachBookingResponse, isPast: boolean) {
  return {
    container: [
      // Unbestätigt: gestrichelt wie in der Kachel. Ein Badge wie dort passt in einen
      // Rasterblock nicht, deshalb trägt zusätzlich der Rahmen die Warnfarbe.
      booking.status === 'pending' ? 'border border-dashed border-warning/60' : 'border border-default',
      // Der Schatten hebt kommende Termine vom Raster ab. Ohne ihn war der Kreis um das
      // heutige Datum das kräftigste Element der Ansicht – kräftiger als der Inhalt.
      isPast
        ? 'bg-elevated hover:border-accented'
        : 'bg-white dark:bg-neutral-900 shadow-sm hover:border-accented',
    ].join(' '),
    // Die Uhrzeit ist hier zurückgenommen, anders als in der Kachel: Im Raster sagt
    // schon die Position, wann der Termin liegt – der Name ist die eigentliche Nachricht.
    time: isPast ? 'text-dimmed' : 'text-muted',
    name: isPast ? 'text-muted' : 'text-highlighted',
    offer: isPast ? 'text-dimmed' : 'text-muted',
  }
}

function bookingBlocks(weekday: number) {
  return (bookingsByWeekday.value.get(weekday) ?? []).map((booking) => {
    const height = Math.max(booking.durationMinutes * PIXELS_PER_MINUTE, MIN_BLOCK_HEIGHT)
    // Vergangen ist ein Termin erst, wenn er zu Ende ist – ein laufender bleibt hervorgehoben.
    const isPast = new Date(booking.end) < now.value
    return {
      booking,
      top: offsetTop(minutesSinceMidnight(booking.start)),
      height,
      // Der Angebotsname ist die dritte Zeile – nur bei genug Höhe, sonst würde er abschneiden.
      showOffer: height >= 60,
      tone: toneFor(booking, isPast),
    }
  })
}
</script>

<template>
  <div class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-4 sm:p-5">
    <!-- Durchgehendes Gitter: Kopfzeile und Raster teilen sich dieselben Spalten, die
         Trennlinien laufen ohne Lücke durch. -->
    <div class="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
      <!-- Kopfzeile: Wochentage -->
      <div class="border-b border-default" />
      <div
        v-for="day in days"
        :key="`head-${day.value}`"
        class="flex flex-col items-center gap-1 py-2 border-l border-b border-default"
      >
        <span :class="day.isPast ? 'text-xs text-dimmed' : 'text-xs text-muted'">
          <span class="hidden lg:inline">{{ day.long }}</span>
          <span class="lg:hidden">{{ day.short }}</span>
        </span>
        <span
          class="text-base tabular-nums size-7 inline-flex items-center justify-center rounded-full"
          :class="day.isToday
            ? 'bg-primary text-inverted font-medium'
            : (day.isPast ? 'text-dimmed' : 'text-highlighted')"
        >
          {{ day.date.getDate() }}
        </span>
      </div>

      <!-- Zeitachse -->
      <div class="relative" :style="{ height: `${gridHeight}px` }">
        <span
          v-for="mark in hourMarks"
          :key="mark.minutes"
          class="absolute right-2 -translate-y-1/2 text-xs text-dimmed tabular-nums"
          :style="{ top: `${offsetTop(mark.minutes)}px` }"
        >
          {{ mark.label }}
        </span>
      </div>

      <!-- Tagesspalten -->
      <div
        v-for="day in days"
        :key="day.value"
        class="relative border-l border-default"
        :class="day.isPast ? 'bg-elevated/40' : ''"
        :style="{ height: `${gridHeight}px` }"
      >
        <!-- Stundenlinien – ohne Spalten-Gap ergeben sie eine durchgehende Linie über die Woche. -->
        <div
          v-for="mark in hourMarks"
          :key="mark.minutes"
          class="absolute inset-x-0 border-t border-default/50"
          :style="{ top: `${offsetTop(mark.minutes)}px` }"
        />

        <!-- Verfügbarkeit als Hintergrund -->
        <div
          v-for="block in availabilityBlocks(day.value)"
          :key="block.id"
          class="absolute inset-x-0 bg-primary/5"
          :style="{ top: `${block.top}px`, height: `${block.height}px` }"
        />

        <!-- Buchungen -->
        <button
          v-for="block in bookingBlocks(day.value)"
          :key="block.booking.id"
          type="button"
          class="absolute inset-x-1 flex items-stretch gap-1.5 rounded-lg px-1.5 py-1 text-left overflow-hidden transition-colors cursor-pointer outline-primary/25 focus-visible:outline-3"
          :class="block.tone.container"
          :style="{ top: `${block.top}px`, height: `${block.height}px` }"
          @click="$emit('select', block.booking)"
        >
          <!-- Sitzungsfarbe, identisch zur Terminkachel (offerColor in utils/offers.ts).
               Ohne offerId bleibt die Spalte leer, statt eine Farbe zu erfinden, die zu
               keinem Angebot gehört. -->
          <span
            v-if="block.booking.offerId"
            class="w-1 rounded-full shrink-0"
            :style="{ backgroundColor: offerColor(block.booking.offerId) }"
          />

          <span class="flex-1 min-w-0">
            <span class="block text-xs leading-tight tabular-nums truncate" :class="block.tone.time">
              {{ formatTimeRange(block.booking) }}
            </span>
            <span class="block text-xs leading-tight font-medium truncate" :class="block.tone.name">
              {{ block.booking.clientName }}
            </span>
            <span
              v-if="block.showOffer"
              class="block text-xs leading-tight truncate"
              :class="block.tone.offer"
            >
              {{ offerLineLabel(block.booking) }}
            </span>
          </span>
        </button>
      </div>
    </div>

    <p class="text-xs text-muted mt-4">
      Der helle Hintergrund zeigt deine Verfügbarkeit, die Blöcke deine Termine. Abgesagte Termine werden hier ausgeblendet.
    </p>
  </div>
</template>
