<script setup lang="ts">
const features = [
  { icon: 'i-lucide-user-check', title: 'Aktive Coachs', description: 'Anmeldungen und durchgeführte Sitzungen pro Tag, Woche und Monat.' },
  { icon: 'i-lucide-video', title: 'Sitzungen gesamt', description: 'Anzahl der Videocalls – täglich, monatlich und kumuliert.' },
  { icon: 'i-lucide-percent', title: 'Trial-zu-Paid-Conversion', description: 'Anteil der Testkonten, die in einen bezahlten Plan wechseln.' },
]
</script>

<template>
  <SectionPlaceholder
    title="Metriken"
    description="Nutzung und Conversion der Plattform."
    :features="features"
  />
</template>
