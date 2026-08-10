<script setup lang="ts">
import type { AvailabilitySlotResponse, CoachBookingResponse } from '@hxroom/shared'

const props = defineProps<{
  bookings: CoachBookingResponse[]
  /** Wöchentliche Verfügbarkeitsregeln – als Hintergrundraster hinter den Buchungen. */
  availability: AvailabilitySlotResponse[]
}>()

defineEmits<{ select: [booking: CoachBookingResponse] }>()

/** Montag der angezeigten Woche. */
const weekStart = defineModel<Date>('weekStart', { required: true })

const PIXELS_PER_MINUTE = 0.8
const WEEKDAYS = [
  { value: 0, short: 'Mo' },
  { value: 1, short: 'Di' },
  { value: 2, short: 'Mi' },
  { value: 3, short: 'Do' },
  { value: 4, short: 'Fr' },
  { value: 5, short: 'Sa' },
  { value: 6, short: 'So' },
]

const days = computed(() =>
  WEEKDAYS.map((day) => {
    const date = new Date(weekStart.value)
    date.setDate(date.getDate() + day.value)
    return { ...day, date, isToday: date.toDateString() === new Date().toDateString() }
  }),
)

const weekLabel = computed(() => {
  const end = new Date(weekStart.value)
  end.setDate(end.getDate() + 6)
  return `${formatShortDate(weekStart.value.toISOString())} – ${formatShortDate(end.toISOString())}`
})

/** Termine der angezeigten Woche, nach Wochentag sortiert. Abgesagte werden ausgeblendet. */
const bookingsByWeekday = computed(() => {
  const map = new Map<number, CoachBookingResponse[]>()
  for (const day of WEEKDAYS) map.set(day.value, [])

  const weekEnd = new Date(weekStart.value)
  weekEnd.setDate(weekEnd.getDate() + 7)

  for (const booking of props.bookings) {
    if (booking.status === 'cancelled') continue
    const start = new Date(booking.start)
    if (start < weekStart.value || start >= weekEnd) continue
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

const gridHeight = computed(() => (timeRange.value.end - timeRange.value.start) * PIXELS_PER_MINUTE)

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

function bookingBlocks(weekday: number) {
  return (bookingsByWeekday.value.get(weekday) ?? []).map(booking => ({
    booking,
    top: offsetTop(minutesSinceMidnight(booking.start)),
    // Mindesthöhe, damit auch eine 15-Minuten-Sitzung lesbar bleibt.
    height: Math.max(booking.durationMinutes * PIXELS_PER_MINUTE, 28),
  }))
}

function shiftWeek(deltaDays: number) {
  const next = new Date(weekStart.value)
  next.setDate(next.getDate() + deltaDays)
  weekStart.value = next
}
</script>

<template>
  <div class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-4 sm:p-5">
    <div class="flex items-center justify-between gap-3 mb-4">
      <h3 class="font-medium text-highlighted">{{ weekLabel }}</h3>
      <div class="flex items-center gap-1">
        <UButton icon="i-lucide-chevron-left" size="xs" color="neutral" variant="ghost" @click="shiftWeek(-7)" />
        <UButton size="xs" color="neutral" variant="ghost" @click="weekStart = startOfWeek(new Date())">Heute</UButton>
        <UButton icon="i-lucide-chevron-right" size="xs" color="neutral" variant="ghost" @click="shiftWeek(7)" />
      </div>
    </div>

    <div class="overflow-x-auto">
      <div class="min-w-[44rem]">
        <!-- Kopfzeile: Wochentage -->
        <div class="grid grid-cols-[3rem_repeat(7,1fr)] gap-1 mb-1">
          <div />
          <div
            v-for="day in days"
            :key="day.value"
            class="text-center text-xs font-medium uppercase tracking-wide py-1"
            :class="day.isToday ? 'text-primary' : 'text-muted'"
          >
            {{ day.short }} {{ day.date.getDate() }}
          </div>
        </div>

        <!-- Raster: Zeitachse + 7 Tagesspalten -->
        <div class="grid grid-cols-[3rem_repeat(7,1fr)] gap-1">
          <div class="relative" :style="{ height: `${gridHeight}px` }">
            <span
              v-for="mark in hourMarks"
              :key="mark.minutes"
              class="absolute right-1 -translate-y-1/2 text-[10px] text-dimmed tabular-nums"
              :style="{ top: `${offsetTop(mark.minutes)}px` }"
            >
              {{ mark.label }}
            </span>
          </div>

          <div
            v-for="day in days"
            :key="day.value"
            class="relative rounded-lg border"
            :class="day.isToday ? 'border-primary/40' : 'border-default'"
            :style="{ height: `${gridHeight}px` }"
          >
            <!-- Stundenlinien -->
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
              class="absolute inset-x-0.5 rounded bg-primary/5"
              :style="{ top: `${block.top}px`, height: `${block.height}px` }"
            />

            <!-- Buchungen -->
            <button
              v-for="block in bookingBlocks(day.value)"
              :key="block.booking.id"
              type="button"
              class="absolute inset-x-0.5 rounded px-1.5 py-1 text-left overflow-hidden transition-colors cursor-pointer outline-primary/25 focus-visible:outline-3"
              :class="block.booking.status === 'pending'
                ? 'border border-dashed border-warning/60 bg-warning/10 hover:bg-warning/20'
                : 'bg-primary/85 hover:bg-primary text-inverted'"
              :style="{ top: `${block.top}px`, height: `${block.height}px` }"
              @click="$emit('select', block.booking)"
            >
              <span class="block text-[10px] leading-tight tabular-nums" :class="block.booking.status === 'pending' ? 'text-warning' : ''">
                {{ formatTime(block.booking.start) }}
              </span>
              <span class="block text-[11px] leading-tight font-medium truncate" :class="block.booking.status === 'pending' ? 'text-highlighted' : ''">
                {{ block.booking.clientName }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <p class="text-xs text-muted mt-4">
      Der helle Hintergrund zeigt deine Verfügbarkeit, die Blöcke deine Termine. Abgesagte Termine werden hier ausgeblendet.
    </p>
  </div>
</template>
