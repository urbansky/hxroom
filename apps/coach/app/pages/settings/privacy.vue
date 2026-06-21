<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const features = [
  {
    icon: 'i-lucide-file-check',
    title: 'Auftragsverarbeitungsvertrag (AVV)',
    description: 'Automatisch erzeugter AVV zwischen dir als Coach und HxRoom – direkt abrufbar und downloadbar.',
  },
  {
    icon: 'i-lucide-trash-2',
    title: 'Datenlöschung auf Anfrage',
    description: 'Klienten können die Löschung ihrer Daten beantragen – du siehst und bearbeitest Anfragen hier.',
  },
  {
    icon: 'i-lucide-wand-sparkles',
    title: 'Datenschutztexte-Generator',
    description: 'Individuell vorgefüllte Datenschutzerklärung für deine Coaching-Website – DSGVO-konform.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 max-w-2xl">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Datenschutz</h1>
    <p class="text-muted mb-8">DSGVO-Grundlagen und Verwaltung von Klientenanfragen.</p>

    <div class="flex flex-col gap-2">
      <UpcomingFeature
        v-for="item in features"
        :key="item.title"
        v-bind="item"
      />
    </div>
  </div>
</template>
