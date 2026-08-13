<script setup lang="ts">
import type { AvailabilitySlotResponse } from '@hxroom/shared'

/**
 * Wochenraster der Verfügbarkeiten – dasselbe Gitter wie BookingWeek.vue in der
 * Terminansicht, aber ohne Datumsbezug: Verfügbarkeiten sind wöchentliche Regeln,
 * keine Termine an einem bestimmten Tag. Deshalb tragen die Spaltenköpfe nur den
 * Wochentag und es gibt keine Wochennavigation – jede Woche sieht gleich aus,
 * solange es keine Ausnahmen für einzelne Tage gibt
 * (siehe doc/funktionen/angebote-verfuegbarkeiten.md).
 */
const props = defineProps<{ slots: AvailabilitySlotResponse[] }>()

defineEmits<{ select: [slot: AvailabilitySlotResponse]; create: [weekday: number] }>()

const PIXELS_PER_MINUTE = 1.3
/** Reicht für eine Zeile Uhrzeit (15px) plus py-1 – kürzere Slots bleiben lesbar. */
const MIN_BLOCK_HEIGHT = 32
/** Ab dieser Höhe stehen Beginn und Ende an den Kanten des Blocks statt als Bereich in einer Zeile. */
const SPLIT_TIME_HEIGHT = 56

const WEEKDAYS = [
  { value: 0, short: 'Mo', long: 'Montag' },
  { value: 1, short: 'Di', long: 'Dienstag' },
  { value: 2, short: 'Mi', long: 'Mittwoch' },
  { value: 3, short: 'Do', long: 'Donnerstag' },
  { value: 4, short: 'Fr', long: 'Freitag' },
  { value: 5, short: 'Sa', long: 'Samstag' },
  { value: 6, short: 'So', long: 'Sonntag' },
]

// Nur zur Orientierung im Raster. Ein Tageswechsel bei offener Seite ändert hier nichts
// Fachliches, deshalb ohne nachgeführten Timer (anders als in BookingWeek.vue, wo davon
// die Vergangenheits-Markierung abhängt).
const todayWeekday = toMondayFirstWeekday(new Date())

// Sichtbarer Zeitbereich: umschließt alle Verfügbarkeiten, mindestens 8–18 Uhr.
const timeRange = computed(() => {
  let min = 8 * 60
  let max = 18 * 60

  for (const slot of props.slots) {
    min = Math.min(min, parseTimeToMinutes(slot.startTime))
    max = Math.max(max, parseTimeToMinutes(slot.endTime))
  }

  // Auf volle Stunden runden, damit die Achsenbeschriftung aufgeht.
  return { start: Math.floor(min / 60) * 60, end: Math.ceil(max / 60) * 60 }
})

// Puffer unter der letzten Stunde: ein kurzer Slot am Ende des Zeitbereichs wird durch
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

function slotBlocks(weekday: number) {
  return props.slots
    .filter(slot => slot.weekday === weekday)
    .map((slot) => {
      const minutes = parseTimeToMinutes(slot.endTime) - parseTimeToMinutes(slot.startTime)
      const height = Math.max(minutes * PIXELS_PER_MINUTE, MIN_BLOCK_HEIGHT)
      return {
        slot,
        top: offsetTop(parseTimeToMinutes(slot.startTime)),
        height,
        splitTimes: height >= SPLIT_TIME_HEIGHT,
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
        v-for="day in WEEKDAYS"
        :key="`head-${day.value}`"
        class="py-2 text-center border-l border-b border-default text-sm"
        :class="day.value === todayWeekday ? 'text-primary font-medium' : 'text-highlighted'"
      >
        <span class="hidden lg:inline">{{ day.long }}</span>
        <span class="lg:hidden">{{ day.short }}</span>
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

      <!-- Tagesspalten. Die freie Fläche legt eine neue Verfügbarkeit für diesen Wochentag
           an – dasselbe Verhalten wie beim Klick auf eine Zelle im Monatsraster. -->
      <div
        v-for="day in WEEKDAYS"
        :key="day.value"
        role="button"
        tabindex="0"
        :aria-label="`Verfügbarkeit am ${day.long} hinzufügen`"
        class="relative border-l border-default cursor-pointer outline-primary/25 focus-visible:outline-3 -outline-offset-2"
        :style="{ height: `${gridHeight}px` }"
        @click="$emit('create', day.value)"
        @keydown.enter="$emit('create', day.value)"
      >
        <!-- Stundenlinien – ohne Spalten-Gap ergeben sie eine durchgehende Linie über die Woche. -->
        <div
          v-for="mark in hourMarks"
          :key="mark.minutes"
          class="absolute inset-x-0 border-t border-default/50"
          :style="{ top: `${offsetTop(mark.minutes)}px` }"
        />

        <!-- Verfügbarkeiten. Feste Palettenstufe statt bg-primary/xx: primary ist
             sage-700 (#4a5a49) und so entsättigt, dass eine Alpha-Mischung mit Weiß nur
             Grau ergibt (bei /20: #dbdeda, drei Punkte Grünüberhang). sage-100 ist
             heller und trotzdem sichtbar grün, weil die Palette die Sättigung in den
             hellen Stufen hält. -->
        <button
          v-for="block in slotBlocks(day.value)"
          :key="block.slot.id"
          type="button"
          class="absolute inset-x-1 flex flex-col rounded-lg border border-sage-200 dark:border-sage-800 bg-sage-100 hover:bg-sage-200 dark:bg-sage-900 dark:hover:bg-sage-800 px-1.5 py-1 text-left overflow-hidden transition-colors cursor-pointer outline-primary/25 focus-visible:outline-3"
          :class="block.splitTimes ? 'justify-between' : 'justify-center'"
          :style="{ top: `${block.top}px`, height: `${block.height}px` }"
          @click.stop="$emit('select', block.slot)"
        >
          <!-- Hohe Blöcke tragen Beginn und Ende an ihren Kanten: Dort steht die Uhrzeit
               genau da, wo das Raster sie ohnehin zeigt. Für flache Blöcke ist dafür kein
               Platz, sie bekommen den Bereich in einer Zeile. -->
          <!-- Textfarben ebenfalls aus der Palette: text-primary wäre im Dark Mode
               sage-500 auf sage-900 und läge mit 3,4:1 unter der Lesbarkeitsschwelle. -->
          <template v-if="block.splitTimes">
            <span class="block text-xs leading-tight tabular-nums text-sage-800 dark:text-sage-200 truncate">
              {{ block.slot.startTime }}
            </span>
            <span class="block text-xs leading-tight tabular-nums text-sage-600 dark:text-sage-300 truncate">
              {{ block.slot.endTime }}
            </span>
          </template>
          <span v-else class="block text-xs leading-tight tabular-nums text-sage-800 dark:text-sage-200 truncate">
            {{ block.slot.startTime }}–{{ block.slot.endTime }}
          </span>
        </button>
      </div>
    </div>

    <p class="text-xs text-muted mt-4">
      Deine wöchentlichen Verfügbarkeiten als Raster – jede Woche gleich. Klick auf einen Block bearbeitet ihn, Klick auf eine freie Spalte legt eine neue Zeit an diesem Wochentag an. Ausnahmen für einzelne Tage (z. B. Urlaub) sind noch nicht möglich.
    </p>
  </div>
</template>
