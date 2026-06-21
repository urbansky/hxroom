<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const features = [
  {
    icon: 'i-lucide-message-square',
    title: 'Willkommensnachricht',
    description: 'Freitext, den der Klient im Warteraum sieht, solange er auf den Einlass wartet.',
  },
  {
    icon: 'i-lucide-image',
    title: 'Profilfoto im Warteraum',
    description: 'Dein Foto wird dem Klienten im Warteraum angezeigt, um eine persönliche Atmosphäre zu schaffen.',
  },
  {
    icon: 'i-lucide-hand-heart',
    title: 'Danke-Seite nach der Sitzung',
    description: 'Individuelle Abschlussseite mit Dankestext, Link zur nächsten Buchung oder externer URL.',
  },
  {
    icon: 'i-lucide-clipboard-list',
    title: 'Klienten-Fragebogen (Intake)',
    description: 'Optionales Formular vor der ersten Sitzung. Antworten werden automatisch im Klientenprofil gespeichert.',
  },
  {
    icon: 'i-lucide-monitor-check',
    title: 'Technik-Check für Klienten',
    description: 'Kamera und Mikrofon werden beim ersten Betreten des Warteraums automatisch geprüft.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 max-w-2xl">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Warteraum</h1>
    <p class="text-muted mb-8">Gestalte den digitalen Empfang für deine Klienten.</p>

    <div class="flex flex-col gap-2">
      <UpcomingFeature
        v-for="item in features"
        :key="item.title"
        v-bind="item"
      />
    </div>
  </div>
</template>
