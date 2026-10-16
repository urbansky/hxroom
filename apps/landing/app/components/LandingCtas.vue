<script setup lang="ts">
// Die beiden Aktionen der Seite: Vorführung buchen (Hauptaktion) und selbst ausprobieren.
// Plausible zählt die Klicks, damit sich vergleichen lässt, welcher Weg genommen wird.
withDefaults(defineProps<{
  align?: 'start' | 'center'
  size?: 'lg' | 'xl'
}>(), { align: 'start', size: 'xl' })

const { demoUrl, registerUrl } = useLandingLinks()
</script>

<template>
  <div
    class="flex flex-wrap gap-3 max-sm:flex-col max-sm:items-stretch"
    :class="align === 'center' ? 'justify-center' : 'justify-start'"
  >
    <UButton
      :to="demoUrl"
      :size="size"
      color="primary"
      icon="i-lucide-calendar-heart"
      label="Vorführung buchen"
      class="justify-center"
      @click="useTrackEvent('demo_click')"
    />
    <UButton
      :to="registerUrl"
      :size="size"
      color="neutral"
      variant="outline"
      trailing-icon="i-lucide-arrow-right"
      label="Kostenlos ausprobieren"
      class="justify-center bg-(--ui-bg)/60"
      @click="useTrackEvent('register_click')"
    />
  </div>
</template>
