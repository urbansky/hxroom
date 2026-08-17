<script setup lang="ts">
// Einheitlicher Seitenkopf für alle Backoffice-Seiten. Gleiche Optik wie in der Coach-App,
// dort aber in jeder Seite wiederholt – hier einmal als Komponente, damit Coach-Liste und
// die noch leeren Bereiche nicht auseinanderdriften.
defineProps<{ title: string, description?: string }>()
</script>

<template>
  <div>
    <h1 class="font-serif text-3xl text-highlighted">{{ title }}</h1>
    <p v-if="description" class="mt-1 text-sm text-muted">{{ description }}</p>
  </div>
</template>
