<script setup lang="ts">
/** Wochenauswahl für die Wochenansicht – steht neben dem Ansichts-Umschalter, nicht in der Karte. */
const weekStart = defineModel<Date>('weekStart', { required: true })

const weekLabel = computed(() => {
  const end = new Date(weekStart.value)
  end.setDate(end.getDate() + 6)
  return formatWeekRange(weekStart.value, end)
})

function shiftWeek(deltaDays: number) {
  const next = new Date(weekStart.value)
  next.setDate(next.getDate() + deltaDays)
  weekStart.value = next
}

function goToToday() {
  weekStart.value = startOfWeek(new Date())
}
</script>

<template>
  <div class="flex items-center gap-3">
    <span class="text-sm text-muted whitespace-nowrap">{{ weekLabel }}</span>

    <!-- Rahmen und Hintergrund spiegeln den Ansichts-Umschalter gegenüber. Die Pfeile bleiben
         als Paar zusammen, "Heute" springt absolut und steht deshalb daneben. Die Fokus-Outline
         des äußersten Buttons zeigt nach innen, sonst schneidet sie der Rand des Panels an. -->
    <div class="inline-flex items-center gap-0.5 rounded-lg border border-default p-0.5 bg-neutral-50 dark:bg-neutral-800/50">
      <UButton size="sm" color="neutral" variant="ghost" @click="goToToday">
        Heute
      </UButton>
      <UButton
        icon="i-lucide-chevron-left"
        size="sm"
        color="neutral"
        variant="ghost"
        aria-label="Vorherige Woche"
        @click="shiftWeek(-7)"
      />
      <UButton
        icon="i-lucide-chevron-right"
        size="sm"
        color="neutral"
        variant="ghost"
        aria-label="Nächste Woche"
        class="focus-visible:outline-offset-[-3px]"
        @click="shiftWeek(7)"
      />
    </div>
  </div>
</template>
