<script setup lang="ts">
import type { CoachBookingResponse } from '@hxroom/shared'

const props = defineProps<{
  bookings: CoachBookingResponse[]
  /** Wird hervorgehoben und mit relativer Zeitangabe versehen. */
  highlightId?: string | null
}>()

defineEmits<{ select: [booking: CoachBookingResponse] }>()

const groups = computed(() => groupByDay(props.bookings))
</script>

<template>
  <div class="flex flex-col gap-6">
    <section v-for="group in groups" :key="group.key">
      <h2 class="text-xs font-medium uppercase tracking-wide text-muted mb-2">
        {{ group.heading }}
      </h2>

      <div class="flex flex-col gap-2">
        <button
          v-for="booking in group.bookings"
          :key="booking.id"
          type="button"
          class="w-full text-left rounded-xl border p-4 transition-colors cursor-pointer outline-primary/25 focus-visible:outline-3"
          :class="[
            booking.status === 'cancelled'
              ? 'border-default border-dashed bg-transparent opacity-60'
              : booking.status === 'pending'
                ? 'border-default border-dashed bg-white dark:bg-neutral-900 hover:border-accented'
                : 'border-default bg-white dark:bg-neutral-900 hover:border-accented',
            booking.id === props.highlightId && 'ring-1 ring-primary',
          ]"
          @click="$emit('select', booking)"
        >
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
        </button>
      </div>
    </section>
  </div>
</template>
