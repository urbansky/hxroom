<script setup lang="ts">
import type { CoachBookingResponse } from '@hxroom/shared'

const props = defineProps<{
  bookings: CoachBookingResponse[]
  /** Wird hervorgehoben und mit relativer Zeitangabe versehen. */
  highlightId?: string | null
  /**
   * 'card' (Standard): eigenständige Kacheln auf dem Seitenhintergrund – so steht die
   * Agenda im Kalender.
   * 'flat': Zeilen ohne eigenen Rahmen, für die Einbettung in eine Karte. Dort trüge
   * jede Kachel sonst einen zweiten Rahmen in derselben Farbe wie die Karte um sie
   * herum, und der weiße Kachelgrund verschwände ohnehin im weißen Kartengrund.
   */
  variant?: 'card' | 'flat'
}>()

defineEmits<{ select: [booking: CoachBookingResponse] }>()

const groups = computed(() => groupByDay(props.bookings))
const isFlat = computed(() => props.variant === 'flat')

// Der Rahmen unterscheidet in der Kachel-Variante die Status; flach übernimmt das
// allein die Deckkraft. Die Statusangabe selbst geht nicht verloren, sie steht in
// beiden Varianten als Badge neben dem Namen.
function rowClass(booking: CoachBookingResponse): string {
  if (isFlat.value) {
    const base = 'rounded-lg p-3 -mx-3 hover:bg-elevated'
    return booking.status === 'cancelled' ? `${base} opacity-60` : base
  }
  if (booking.status === 'cancelled') return 'rounded-xl border p-4 border-default border-dashed bg-transparent opacity-60'
  if (booking.status === 'pending') return 'rounded-xl border p-4 border-default border-dashed bg-white dark:bg-neutral-900 hover:border-accented'
  return 'rounded-xl border p-4 border-default bg-white dark:bg-neutral-900 hover:border-accented'
}
</script>

<template>
  <div class="flex flex-col" :class="isFlat ? 'gap-5' : 'gap-8'">
    <section v-for="group in groups" :key="group.key">
      <!-- Die Überschrift trägt den Tag, deshalb steht in der Kachel nur die Uhrzeit.
           Sie ist bewusst kräftiger gesetzt als eine reine Beschriftung: Sie soll die
           Termine darunter als Tagesblock zusammenfassen, sonst wirkt sie bei nur einem
           Termin wie ein Etikett für eine einzelne Kachel.
           In einer Karte tritt sie zurück: dort steht der Kartentitel darüber, und zwei
           gleich kräftige Überschriften kurz hintereinander lesen sich als Konkurrenz.
           Ganz entfallen darf sie auch dort nicht – sie ist die einzige Stelle, an der
           das Datum steht. -->
      <div class="flex items-baseline gap-3" :class="isFlat ? 'mb-1' : 'mb-3'">
        <h2
          class="text-sm shrink-0"
          :class="[
            isFlat ? 'font-normal' : 'font-medium',
            group.isToday ? 'text-primary' : isFlat ? 'text-muted' : 'text-highlighted',
          ]"
        >
          {{ group.heading }}
        </h2>
        <span class="text-xs text-muted shrink-0 tabular-nums">
          {{ group.bookings.length }} {{ group.bookings.length === 1 ? 'Termin' : 'Termine' }}
        </span>
        <!-- bg-(--ui-border), nicht bg-default: Letzteres ist der Seitenhintergrund
             (--ui-bg), die Linie wäre damit unsichtbar. -->
        <span v-if="!isFlat" class="h-px flex-1 bg-(--ui-border)" />
      </div>

      <!-- Der nächste Termin wird allein über die relative Zeitangabe rechts oben
           ("in 22 Std.") gekennzeichnet. Ein zusätzlicher Ring in ring-primary stand hier
           einmal: Sage-700 liest sich bei 1 px nicht als Farbe, sondern als zweite dunkle
           Kontur neben dem Rahmen – und mit der Sitzungsfarbe links kamen so drei Ränder
           an einer Kachel zusammen. -->
      <div class="flex flex-col" :class="isFlat ? 'gap-0.5' : 'gap-2'">
        <button
          v-for="booking in group.bookings"
          :key="booking.id"
          type="button"
          class="w-full text-left flex items-start gap-3 transition-colors cursor-pointer outline-primary/25 focus-visible:outline-3"
          :class="rowClass(booking)"
          @click="$emit('select', booking)"
        >
          <!-- Farbe der Sitzungsart, identisch zur Angebotsliste (offerColor in
               utils/offers.ts) – dieselbe Farbe steht dort für dasselbe Angebot, die
               Angebotsseite dient damit als Legende. `self-stretch`: die Pille nimmt die
               Höhe des Inhalts an. Bei abgesagten Terminen verblasst sie über das
               opacity-60 der Kachel mit, ein Sonderfall ist dafür nicht nötig.
               Ohne offerId (manuell angelegter Termin) bleibt die Spalte leer, statt eine
               Farbe zu erfinden, die zu keinem Angebot gehört. -->
          <span
            v-if="booking.offerId"
            class="w-1 rounded-full shrink-0 self-stretch"
            :style="{ backgroundColor: offerColor(booking.offerId) }"
          />

          <div class="flex-1 min-w-0">
            <div class="flex items-baseline justify-between gap-3">
              <span
                class="text-sm font-medium tabular-nums"
                :class="booking.status === 'cancelled' ? 'text-muted line-through' : 'text-highlighted'"
              >
                {{ formatTimeRange(booking) }}
              </span>

              <span v-if="booking.id === props.highlightId && formatRelativeToStart(booking.start)" class="text-xs text-primary shrink-0">
                {{ formatRelativeToStart(booking.start) }}
              </span>
            </div>

            <div class="mt-1 flex items-center gap-2 min-w-0">
              <span class="font-medium truncate" :class="booking.status === 'cancelled' ? 'text-muted' : 'text-highlighted'">
                {{ booking.clientName }}
              </span>
              <UBadge v-if="booking.status === 'pending'" :label="STATUS_LABELS.pending" color="warning" variant="subtle" size="sm" class="shrink-0" />
              <UBadge v-else-if="booking.status === 'cancelled'" :label="STATUS_LABELS.cancelled" color="neutral" variant="subtle" size="sm" class="shrink-0" />
            </div>

            <div class="mt-0.5 flex items-center gap-2 text-sm text-muted min-w-0">
              <span class="truncate">{{ booking.durationMinutes }} Min. · {{ booking.offerName }}</span>
              <UIcon v-if="booking.clientNote" name="i-lucide-message-square-text" class="size-4 shrink-0" />
            </div>
          </div>
        </button>
      </div>
    </section>
  </div>
</template>
