<script setup lang="ts">
import type { CoachBookingResponse } from '@hxroom/shared'
import type { BookingActions } from '~/composables/useBookingActions'

// Die Knöpfe eines Termins samt Absage-Formular – im Fuß des Slideovers und im Kopf der
// Terminseite (phase5-umsetzungsplan.md, Schritt 8a). Die Logik liegt in useBookingActions;
// die Leiste zeigt nur, was davon gerade möglich ist.
const props = defineProps<{
  booking: CoachBookingResponse
  actions: BookingActions
}>()

const confirmingCancel = computed({
  get: () => props.actions.confirmingCancel.value,
  set: (value: boolean) => (props.actions.confirmingCancel.value = value),
})
const cancelReason = computed({
  get: () => props.actions.cancelReason.value,
  set: (value: string) => (props.actions.cancelReason.value = value),
})
</script>

<template>
  <div v-if="confirmingCancel" class="flex flex-col gap-3 w-full">
    <UFormField label="Grund (optional)" description="Wird dem Klienten in der Absage-Mail mitgeteilt.">
      <UTextarea v-model="cancelReason" :rows="3" class="w-full" placeholder="z. B. Ich bin an dem Tag leider verhindert." />
    </UFormField>
    <div class="flex items-center justify-end gap-2">
      <UButton label="Zurück" color="neutral" variant="ghost" size="sm" @click="confirmingCancel = false" />
      <UButton label="Absagen und Klient informieren" color="error" size="sm" :loading="actions.cancelling.value" @click="actions.cancelBooking()" />
    </div>
  </div>

  <!-- flex-wrap: Mit dem Startknopf stehen hier zeitweise drei Schaltflächen, die in
       der Breite des Slideovers nicht nebeneinander passen. -->
  <div v-else class="flex flex-wrap items-center justify-between w-full gap-2">
    <div class="flex flex-wrap items-center gap-2">
      <UButton
        v-if="actions.canCancel.value"
        label="Termin absagen"
        icon="i-lucide-calendar-x"
        color="error"
        variant="ghost"
        @click="confirmingCancel = true"
      />
      <UButton
        v-if="actions.canMarkNoShow.value"
        label="Nicht erschienen"
        icon="i-lucide-user-x"
        color="neutral"
        variant="ghost"
        :loading="actions.markingNoShow.value"
        @click="actions.setNoShow(true)"
      />
    </div>
    <div class="flex items-center gap-2">
      <UButton
        v-if="actions.canStart.value"
        :to="`/call/${booking.id}`"
        label="Sitzung starten"
        icon="i-lucide-video"
      />
      <UButton
        label="Kalendereintrag"
        icon="i-lucide-calendar-plus"
        color="neutral"
        variant="subtle"
        :loading="actions.downloading.value"
        @click="actions.downloadIcs()"
      />
    </div>
  </div>
</template>
