<script setup lang="ts">
// Gerüst für die noch leeren Bereiche: Überschrift plus die geplanten Funktionen aus
// doc/funktionen/backoffice-betreiber.md. Ersetzt sich Seite für Seite, sobald das
// Admin-Modul der API die Daten liefert.
defineProps<{
  title: string
  description: string
  features: { icon: string, title: string, description: string }[]
}>()
</script>

<template>
  <div class="p-4 sm:p-6 flex flex-col gap-6">
    <div>
      <h1 class="font-serif text-3xl text-(--ui-text-highlighted)">{{ title }}</h1>
      <p class="mt-1 text-sm text-(--ui-text-muted)">{{ description }}</p>
    </div>

    <div class="flex flex-col gap-3">
      <UpcomingFeature
        v-for="feature in features"
        :key="feature.title"
        :icon="feature.icon"
        :title="feature.title"
        :description="feature.description"
      />
    </div>
  </div>
</template>
