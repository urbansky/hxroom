<script setup lang="ts">
import type { CoachBookingResponse } from '@hxroom/shared'

// Status eines Termins samt Herkunft – im Slideover und im Kopf der Terminseite gleich.
defineProps<{ booking: CoachBookingResponse }>()
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <UBadge v-if="isAdHoc(booking)" :label="AD_HOC_LABEL" color="info" variant="subtle" />
    <UBadge v-if="isTestSession(booking)" :label="TEST_SESSION_LABEL" icon="i-lucide-flask-conical" color="neutral" variant="subtle" />
    <UBadge
      v-if="booking.status === 'confirmed'"
      :label="STATUS_LABELS.confirmed"
      color="success"
      variant="subtle"
    />
    <UBadge
      v-else-if="booking.status === 'pending'"
      :label="STATUS_LABELS.pending"
      color="warning"
      variant="subtle"
    />
    <UBadge
      v-else-if="booking.status === 'no_show'"
      :label="STATUS_LABELS.no_show"
      color="warning"
      variant="subtle"
      icon="i-lucide-user-x"
    />
    <UBadge v-else :label="STATUS_LABELS[booking.status]" color="neutral" variant="subtle" />
    <span v-if="booking.status === 'pending'" class="text-xs text-muted">
      Der Klient hat den Bestätigungslink noch nicht angeklickt.
    </span>
  </div>
</template>
