<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import type { CoachBookingResponse } from '@hxroom/shared'
import type { BookingActions } from '~/composables/useBookingActions'

// Die Aktionen im Kopf der Terminseite, nach dem Muster der Klientenseite (UX-01): oben
// rechts die Hauptaktion, wenn es eine gibt, alles Übrige im Drei-Punkte-Menü, die Absage
// als Endgültiges ganz unten. Das Slideover behält die BookingActionBar in seinem Fuß;
// Logik und Regeln teilen sich beide über useBookingActions.
const props = defineProps<{
  booking: CoachBookingResponse
  actions: BookingActions
}>()

const emit = defineEmits<{ assign: [], followUp: [] }>()

const confirmingCancel = computed({
  get: () => props.actions.confirmingCancel.value,
  set: (value: boolean) => (props.actions.confirmingCancel.value = value),
})
const cancelReason = computed({
  get: () => props.actions.cancelReason.value,
  set: (value: string) => (props.actions.cancelReason.value = value),
})

const menuItems = computed<DropdownMenuItem[][]>(() => {
  const common: DropdownMenuItem[] = []
  // Folgetermin (doc/produkt/funktionen/manuelle-termine.md §2) – nur mit Klient: Er bekommt die
  // Einladung, und eine Probe-Sitzung hat keinen.
  if (props.booking.clientId && !isTestSession(props.booking)) {
    common.push({
      label: 'Folgetermin anlegen',
      icon: 'i-lucide-calendar-plus',
      onSelect: () => emit('followUp'),
    })
  }
  common.push({
    label: 'Kalendereintrag',
    icon: 'i-lucide-calendar-arrow-down',
    onSelect: () => props.actions.downloadIcs(),
  })
  // Probe-Sitzung: Der Coach ist selbst der Klient, eine Zuordnung ergäbe keinen Sinn.
  if (!isTestSession(props.booking)) {
    common.push({
      label: props.booking.clientId ? 'Anderem Klienten zuordnen' : 'Klient zuordnen',
      icon: 'i-lucide-link',
      onSelect: () => emit('assign'),
    })
  }
  if (props.actions.canMarkNoShow.value) {
    common.push({
      label: 'Nicht erschienen',
      icon: 'i-lucide-user-x',
      onSelect: () => props.actions.setNoShow(true),
    })
  }

  const groups = [common]
  if (props.actions.canCancel.value) {
    groups.push([{
      label: 'Termin absagen',
      icon: 'i-lucide-calendar-x',
      color: 'error',
      onSelect: () => (confirmingCancel.value = true),
    }])
  }
  return groups
})
</script>

<template>
  <div class="flex items-center gap-2">
    <UButton
      v-if="actions.canStart.value"
      :to="`/call/${booking.id}`"
      label="Sitzung starten"
      icon="i-lucide-video"
      size="sm"
    />
    <UDropdownMenu :items="menuItems" :content="{ align: 'end' }">
      <UButton
        icon="i-lucide-ellipsis"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Weitere Aktionen"
        :loading="actions.downloading.value || actions.markingNoShow.value"
      />
    </UDropdownMenu>

    <UModal
      v-model:open="confirmingCancel"
      title="Termin absagen"
      :description="`${formatDayHeading(booking.start)}, ${formatTimeRange(booking)} mit ${booking.clientName}`"
    >
      <template #body>
        <UFormField label="Grund (optional)" description="Wird dem Klienten in der Absage-Mail mitgeteilt.">
          <UTextarea
            v-model="cancelReason"
            :rows="3"
            autoresize
            class="w-full"
            placeholder="z. B. Ich bin an dem Tag leider verhindert."
            :ui="{ base: 'bg-white dark:bg-elevated' }"
          />
        </UFormField>
        <p v-if="actions.actionError.value" class="mt-3 text-sm text-error">{{ actions.actionError.value }}</p>
      </template>
      <template #footer>
        <div class="flex gap-3 justify-end w-full">
          <UButton label="Zurück" color="neutral" variant="outline" @click="confirmingCancel = false" />
          <UButton
            label="Absagen und Klient informieren"
            color="error"
            :loading="actions.cancelling.value"
            @click="actions.cancelBooking()"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
