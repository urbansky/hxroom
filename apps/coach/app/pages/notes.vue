<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const features = [
  {
    icon: 'i-lucide-scroll-text',
    title: 'Sitzungsnotizen-Chronik',
    description: 'Globale Übersicht aller Notizen über alle Klienten hinweg, chronologisch sortiert.',
  },
  {
    icon: 'i-lucide-sparkles',
    title: 'KI-Sitzungszusammenfassung',
    description: 'Nach jeder Sitzung wird automatisch eine Zusammenfassung aus dem Transkript erstellt.',
  },
  {
    icon: 'i-lucide-pencil',
    title: 'Notiz manuell verfassen',
    description: 'Eigene Gesprächsnotizen direkt nach der Sitzung erfassen und dem Klientenprofil zuordnen.',
  },
  {
    icon: 'i-lucide-file-down',
    title: 'Notizen als PDF exportieren',
    description: 'Alle Sitzungsnotizen eines Klienten als strukturiertes PDF für den Eigengebrauch herunterladen.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 max-w-2xl">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Notizen</h1>
    <p class="text-muted mb-8">Sitzungsnotizen und KI-Zusammenfassungen aller Klienten.</p>

    <div class="flex flex-col gap-2">
      <UpcomingFeature
        v-for="item in features"
        :key="item.title"
        v-bind="item"
      />
    </div>
  </div>
</template>
