<script setup lang="ts">
import type { AvailabilityExceptionResponse, AvailabilitySlotResponse, CalendarBusyTimeResponse, CoachBookingResponse } from '@hxroom/shared'

const props = defineProps<{
  bookings: CoachBookingResponse[]
  /** Wöchentliche Verfügbarkeitsregeln – als Hintergrundraster hinter den Buchungen. */
  availability: AvailabilitySlotResponse[]
  /**
   * Ausnahmen, die die Woche berühren (kalenderabgleich.md §2): Freigaben erscheinen im
   * selben Band wie die Wochenzeiten, Sperren als graue Fläche hinter den Terminen.
   */
  exceptions: AvailabilityExceptionResponse[]
  /** Belegte Zeiten aus externen Kalendern (kalenderabgleich.md §3) – wie Sperren, aber nicht anklickbar. */
  busyTimes: CalendarBusyTimeResponse[]
  /** Montag der angezeigten Woche. Gewechselt wird über BookingWeekNav. */
  weekStart: Date
}>()

const emit = defineEmits<{
  select: [booking: CoachBookingResponse]
  /** Klick auf eine Sperre: zum Bearbeiten öffnen. */
  selectException: [exception: AvailabilityExceptionResponse]
  /** Klick auf eine freie Stelle: Termin anlegen, auf die Viertelstunde abgerundet. */
  create: [start: Date]
}>()

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

/**
 * Zeiträume je Tag, auf den Kalendertag zugeschnitten und in Minuten seit Mitternacht.
 * Ein mehrtägiger Zeitraum erscheint so an jedem seiner Tage.
 */
function splitByWeekday<T extends { start: string, end: string }>(items: T[]) {
  const map = new Map<number, { item: T, startMinutes: number, endMinutes: number }[]>()
  for (const day of days.value) {
    const dayStart = day.date.getTime()
    const nextDay = new Date(day.date)
    nextDay.setDate(nextDay.getDate() + 1)
    const dayEnd = nextDay.getTime()
    const list = []
    for (const item of items) {
      const start = Math.max(new Date(item.start).getTime(), dayStart)
      const end = Math.min(new Date(item.end).getTime(), dayEnd)
      if (start >= end) continue
      // Minuten über die Wanduhr statt über die Differenz: an Tagen mit Zeitumstellung
      // hat der Tag nicht 1440 Minuten.
      const endMinutes = end === dayEnd ? 24 * 60 : minutesSinceMidnight(new Date(end).toISOString())
      list.push({ item, startMinutes: minutesSinceMidnight(new Date(start).toISOString()), endMinutes })
    }
    map.set(day.value, list)
  }
  return map
}

const exceptionsByWeekday = computed(() => splitByWeekday(props.exceptions))
const busyByWeekday = computed(() => splitByWeekday(props.busyTimes))

// Sichtbarer Zeitbereich: umschließt Verfügbarkeiten, Freigaben und Termine der Woche,
// mindestens 8–18 Uhr. Sperren erweitern ihn nicht – eine ganztägige Sperre zöge das
// Raster sonst auf 0–24 Uhr auf.
const timeRange = computed(() => {
  let min = 8 * 60
  let max = 18 * 60

  for (const slot of props.availability) {
    min = Math.min(min, parseTimeToMinutes(slot.startTime))
    max = Math.max(max, parseTimeToMinutes(slot.endTime))
  }
  for (const list of exceptionsByWeekday.value.values()) {
    for (const item of list) {
      if (item.item.kind !== 'available') continue
      min = Math.min(min, item.startMinutes)
      max = Math.max(max, item.endMinutes)
    }
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

// Termin anlegen per Klick in den Kalender (doc/produkt/funktionen/manuelle-termine.md §2). Ein Klick
// auf einen Termin öffnet weiter dessen Detail; Vergangenes bleibt ohne Wirkung.
function onColumnClick(event: MouseEvent, date: Date) {
  if ((event.target as HTMLElement).closest('button')) return
  const column = event.currentTarget as HTMLElement
  const y = event.clientY - column.getBoundingClientRect().top
  const minutes = Math.floor((timeRange.value.start + y / PIXELS_PER_MINUTE) / 15) * 15
  const start = new Date(date)
  start.setHours(0, minutes, 0, 0)
  if (start.getTime() < Date.now()) return
  emit('create', start)
}

function availabilityBlocks(weekday: number) {
  const fromRules = props.availability
    .filter(slot => slot.weekday === weekday)
    .map(slot => ({
      id: slot.id,
      top: offsetTop(parseTimeToMinutes(slot.startTime)),
      height: (parseTimeToMinutes(slot.endTime) - parseTimeToMinutes(slot.startTime)) * PIXELS_PER_MINUTE,
    }))
  // Freigaben sind für die Buchbarkeit nichts anderes als Wochenzeiten und sehen deshalb
  // genauso aus. Überlappen sie sich, verdoppelt sich die Tönung leicht – das ist gewollt
  // unauffällig.
  const fromExceptions = (exceptionsByWeekday.value.get(weekday) ?? [])
    .filter(item => item.item.kind === 'available')
    .map(item => ({
      id: item.item.id,
      top: offsetTop(item.startMinutes),
      height: (item.endMinutes - item.startMinutes) * PIXELS_PER_MINUTE,
    }))
  return [...fromRules, ...fromExceptions]
}

/** Sperren als Fläche hinter den Terminen, auf den sichtbaren Zeitbereich zugeschnitten. */
function blockedBlocks(weekday: number) {
  return (exceptionsByWeekday.value.get(weekday) ?? [])
    .filter(item => item.item.kind === 'blocked')
    .map((item) => {
      const start = Math.max(item.startMinutes, timeRange.value.start)
      const end = Math.min(item.endMinutes, timeRange.value.end)
      return {
        exception: item.item,
        top: offsetTop(start),
        height: (end - start) * PIXELS_PER_MINUTE,
        label: exceptionLabel(item.item),
        title: `${exceptionLabel(item.item)} · ${formatExceptionRange(item.item)}`,
      }
    })
    .filter(block => block.height > 0)
}

const busyTimeFormatter = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' })

/**
 * Belegte Zeiten aus externen Kalendern: dieselbe graue Fläche wie Sperren, beschriftet mit
 * dem Kalendernamen. Nicht anklickbar – ändern lassen sie sich nur im Kalender selbst.
 * Überschneiden sich Zeiten mehrerer Kalender, liegen die Flächen übereinander.
 */
function busyBlocks(weekday: number) {
  return (busyByWeekday.value.get(weekday) ?? [])
    .map((entry) => {
      const start = Math.max(entry.startMinutes, timeRange.value.start)
      const end = Math.min(entry.endMinutes, timeRange.value.end)
      const range = `${busyTimeFormatter.format(new Date(entry.item.start))} – ${busyTimeFormatter.format(new Date(entry.item.end))}`
      return {
        key: `${entry.item.calendarImportId}-${entry.item.start}`,
        top: offsetTop(start),
        height: (end - start) * PIXELS_PER_MINUTE,
        label: `Belegt · ${entry.item.calendarName}`,
        title: `Belegt · ${entry.item.calendarName} · ${range}`,
      }
    })
    .filter(block => block.height > 0)
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
 *
 * Der Hover ist hier kräftiger als bei der Kachel in BookingAgenda.vue (dort nur
 * hover:border-accented): Ein Rasterblock ist klein und liegt auf dem getönten
 * Verfügbarkeitsband, ein etwas dunklerer Rahmen ginge darin unter. Er zeigt deshalb
 * den Rahmen in der Primärfarbe, dazu einen feinen Ring in derselben Farbe wie der
 * Fokusrahmen und einen größeren Schatten – der Block ist anklickbar und öffnet die
 * Termin-Seitenleiste. Der Ring bleibt bei 1px: Zwischen zwei nebeneinanderliegenden
 * Terminen sind nur 2px Luft, ein breiterer Ring liefe in den Nachbarn.
 *
 * Unbestätigte Termine tragen eine diagonale Schraffur (Klasse .booking-pending, in
 * assets/main.css – dieselbe Klasse nutzen die Terminkacheln der Agenda und der
 * Klientenakte), wie der vorgeschlagene Eintrag im macOS-Kalender. Zuvor stand dafür ein gelb
 * gestrichelter Rahmen: Der zog im Raster mehr Aufmerksamkeit auf sich als der
 * bestätigte Termin daneben, obwohl er nichts Dringendes meldet – ein Termin, auf
 * dessen Bestätigung der Coach selbst sitzt. Die Schraffur sagt dasselbe über die
 * Fläche statt über eine Signalfarbe: noch nicht fest.
 */
function toneFor(booking: CoachBookingResponse, isPast: boolean) {
  return {
    container: [
      'border border-default hover:border-primary hover:ring-1 hover:ring-primary/25',
      booking.status === 'pending' ? 'booking-pending' : '',
      // Der Schatten hebt kommende Termine vom Raster ab. Ohne ihn war der Kreis um das
      // heutige Datum das kräftigste Element der Ansicht – kräftiger als der Inhalt.
      // Beim Hover wächst er. Die Fläche bleibt in beiden Fällen unangetastet: Sie sagt,
      // ob ein Termin vorbei ist, und diese Aussage darf der Mauszeiger nicht umschreiben.
      // Dass der Block anklickbar ist, trägt allein der Rahmen.
      isPast ? 'bg-elevated' : 'bg-white dark:bg-muted shadow-sm hover:shadow-md',
    ].join(' '),
    // Die Uhrzeit ist hier zurückgenommen, anders als in der Kachel: Im Raster sagt
    // schon die Position, wann der Termin liegt – der Name ist die eigentliche Nachricht.
    time: isPast ? 'text-dimmed' : 'text-muted',
    name: isPast ? 'text-muted' : 'text-highlighted',
    offer: isPast ? 'text-dimmed' : 'text-muted',
  }
}

/**
 * Verteilt Termine, die sich überschneiden, nebeneinander auf Spalten – wie in
 * gängigen Kalendern. Ohne das lagen gleichzeitige Termine deckungsgleich
 * übereinander und verdeckten einander bis zur Unlesbarkeit.
 *
 * Gerechnet wird mit der gezeichneten Ausdehnung (top/height) statt mit der reinen
 * Uhrzeit: Ein 15-Minuten-Termin wird durch MIN_BLOCK_HEIGHT höher dargestellt als
 * seine Dauer und würde sonst den folgenden Termin überdecken, obwohl die Zeiten
 * sich nicht schneiden.
 *
 * Erst werden zusammenhängende Gruppen gebildet (jeder Block überlappt mindestens
 * einen anderen der Gruppe), dann bekommt jeder Block innerhalb seiner Gruppe die
 * erste freie Spalte. Alle Blöcke einer Gruppe teilen sich die Spaltenbreite, damit
 * die Kanten übereinanderliegender Termine bündig sind.
 */
function assignColumns<T extends { top: number; height: number }>(blocks: T[]) {
  const sorted = [...blocks].sort((a, b) => a.top - b.top || b.height - a.height)
  const placed: (T & { column: number; columnCount: number })[] = []

  let group: (T & { column: number; columnCount: number })[] = []
  // Untere Kante je Spalte innerhalb der laufenden Gruppe.
  let columnEnds: number[] = []

  const closeGroup = () => {
    for (const block of group) block.columnCount = columnEnds.length
    placed.push(...group)
    group = []
    columnEnds = []
  }

  for (const block of sorted) {
    // Beginnt der Block unterhalb aller offenen Spalten, startet eine neue Gruppe.
    if (columnEnds.length > 0 && columnEnds.every(end => end <= block.top)) closeGroup()

    let column = columnEnds.findIndex(end => end <= block.top)
    if (column === -1) column = columnEnds.length

    columnEnds[column] = block.top + block.height
    group.push({ ...block, column, columnCount: 0 })
  }
  if (group.length > 0) closeGroup()

  return placed
}

/** Seitlicher Rand der Blöcke in der Tagesspalte bzw. Abstand zwischen zwei Spalten, in Pixeln. */
const BLOCK_GUTTER = 4
const BLOCK_GAP = 2

/** Verfügbare Breite einer Gruppe, aufgeteilt auf `count` Spalten. */
function columnWidth(count: number): string {
  return `calc((100% - ${2 * BLOCK_GUTTER + (count - 1) * BLOCK_GAP}px) / ${count})`
}

function bookingBlocks(weekday: number) {
  const blocks = (bookingsByWeekday.value.get(weekday) ?? []).map((booking) => {
    const height = Math.max(booking.durationMinutes * PIXELS_PER_MINUTE, MIN_BLOCK_HEIGHT)
    // Vergangen ist ein Termin erst, wenn er zu Ende ist – ein laufender bleibt hervorgehoben.
    // Ein vermerkter No-Show (B6) ist vorbei, sobald er vermerkt ist.
    const isPast = booking.status === 'no_show' || new Date(booking.end) < now.value
    return {
      booking,
      top: offsetTop(minutesSinceMidnight(booking.start)),
      height,
      tone: toneFor(booking, isPast),
    }
  })

  return assignColumns(blocks).map((block) => {
    // Ab drei Spalten nebeneinander bleibt vom Text ohnehin nur noch ein Rest – dann
    // trägt der Block nur den Klientennamen, und die Uhrzeit steht im Titel-Tooltip.
    const narrow = block.columnCount >= 3
    return {
      ...block,
      narrow,
      showTime: !narrow,
      // Der Angebotsname ist die dritte Zeile – nur bei genug Höhe und voller Breite,
      // sonst würde er abschneiden.
      showOffer: block.height >= 60 && block.columnCount === 1,
      title: [
        formatTimeRange(block.booking),
        block.booking.clientName,
        block.booking.status === 'pending' ? 'noch nicht bestätigt' : '',
        block.booking.status === 'no_show' ? STATUS_LABELS.no_show : '',
      ].filter(Boolean).join(' · '),
      width: columnWidth(block.columnCount),
      left: `calc(${BLOCK_GUTTER}px + (${columnWidth(block.columnCount)} + ${BLOCK_GAP}px) * ${block.column})`,
    }
  })
}
</script>

<template>
  <div class="rounded-xl border border-default bg-white dark:bg-muted p-4 sm:p-5">
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
        :class="day.isPast ? 'bg-elevated/40' : 'cursor-pointer'"
        :style="{ height: `${gridHeight}px` }"
        @click="onColumnClick($event, day.date)"
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

        <!-- Sperren: graue Fläche hinter den Terminen, ohne Schraffur – die steht hier für
             „unbestätigt“. Anklickbar zum Bearbeiten; Termine liegen darüber. -->
        <button
          v-for="block in blockedBlocks(day.value)"
          :key="`blocked-${block.exception.id}`"
          type="button"
          class="absolute inset-x-0 flex items-start bg-accented/60 hover:bg-accented border-y border-default/60 text-left px-1.5 py-1 overflow-hidden cursor-pointer transition-colors outline-primary/25 focus-visible:outline-3"
          :title="block.title"
          :style="{ top: `${block.top}px`, height: `${block.height}px` }"
          @click="$emit('selectException', block.exception)"
        >
          <span class="block text-xs leading-tight text-muted truncate">
            <UIcon name="i-lucide-lock" class="size-3 align-[-2px] mr-0.5" />
            {{ block.label }}
          </span>
        </button>

        <!-- Belegte Zeiten aus externen Kalendern: wie Sperren, aber kein Knopf. Ein Klick
             darauf landet in der Tagesspalte und legt dort einen Termin an – der Coach
             entscheidet selbst, ob er neben einem privaten Termin noch etwas einträgt. -->
        <div
          v-for="block in busyBlocks(day.value)"
          :key="`busy-${block.key}`"
          class="absolute inset-x-0 flex items-start bg-accented/60 border-y border-default/60 px-1.5 py-1 overflow-hidden"
          :title="block.title"
          :style="{ top: `${block.top}px`, height: `${block.height}px` }"
        >
          <span class="block text-xs leading-tight text-muted truncate">
            <UIcon name="i-lucide-calendar" class="size-3 align-[-2px] mr-0.5" />
            {{ block.label }}
          </span>
        </div>

        <!-- Buchungen -->
        <button
          v-for="block in bookingBlocks(day.value)"
          :key="block.booking.id"
          type="button"
          class="absolute flex items-stretch rounded-lg py-1 text-left overflow-hidden transition duration-150 cursor-pointer outline-primary/25 focus-visible:outline-3 hover:z-10 focus-visible:z-10"
          :class="[block.tone.container, block.narrow ? 'gap-1 px-1' : 'gap-1.5 px-1.5']"
          :title="block.title"
          :style="{
            top: `${block.top}px`,
            height: `${block.height}px`,
            left: block.left,
            width: block.width,
          }"
          @click="$emit('select', block.booking)"
        >
          <!-- Sitzungsfarbe, identisch zur Terminkachel (offerColor in utils/offers.ts).
               Ohne offerId neutral grau statt einer erfundenen Angebotsfarbe – die Linie
               bleibt, damit der Text aller Blöcke bündig steht. -->
          <span
            class="w-1 rounded-full shrink-0"
            :class="!block.booking.offerId && 'bg-accented'"
            :style="block.booking.offerId ? { backgroundColor: offerColor(block.booking.offerId) } : undefined"
          />

          <span class="flex-1 min-w-0">
            <span
              v-if="block.showTime"
              class="block text-xs leading-tight tabular-nums truncate"
              :class="block.tone.time"
            >
              {{ formatTimeRange(block.booking) }}
            </span>
            <span class="block text-xs leading-tight font-medium truncate" :class="block.tone.name">
              <UIcon
                v-if="block.booking.status === 'no_show'"
                name="i-lucide-user-x"
                class="size-3 align-[-2px] mr-0.5 text-warning"
              />
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
      Der helle Hintergrund zeigt deine Verfügbarkeit samt Freigaben, graue Flächen gesperrte Zeiträume und Termine aus deinen Kalendern, die Blöcke deine Termine. Schraffierte Blöcke sind noch nicht bestätigt, abgesagte Termine werden hier ausgeblendet. Ein Klick auf eine freie Stelle legt dort einen Termin an.
    </p>
  </div>
</template>
