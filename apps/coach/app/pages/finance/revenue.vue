<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const features = [
  {
    icon: 'i-lucide-bar-chart-3',
    title: 'Monats- & Jahresübersicht',
    description: 'Gesamtumsatz pro Monat und Jahr auf einen Blick – mit Vergleich zum Vorjahreszeitraum.',
  },
  {
    icon: 'i-lucide-filter',
    title: 'Filter nach Klient und Sitzungstyp',
    description: 'Umsatz nach einzelnen Klienten oder Sitzungsarten (Erstgespräch, Standard, Intensiv) aufschlüsseln.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 max-w-2xl">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Umsatz</h1>
    <p class="text-muted mb-8">Überblick über deine Einnahmen aus abgeschlossenen Sitzungen.</p>

    <div class="flex flex-col gap-2">
      <UpcomingFeature
        v-for="item in features"
        :key="item.title"
        v-bind="item"
      />
    </div>
  </div>
</template>
