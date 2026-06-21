<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const features = [
  {
    icon: 'i-lucide-users',
    title: 'Klientenübersicht',
    description: 'Tabellarische Liste mit letzter Sitzung, Anzahl der Termine und nächstem geplanten Termin.',
  },
  {
    icon: 'i-lucide-user-round-plus',
    title: 'Klient manuell anlegen',
    description: 'Neuen Klienten direkt anlegen und mit einem Einladungslink zum ersten Termin einladen.',
  },
  {
    icon: 'i-lucide-notebook-tabs',
    title: 'Klientenprofil',
    description: 'Notiz-Historie, Sitzungshistorie und persönliche Informationen auf einer Seite.',
  },
  {
    icon: 'i-lucide-target',
    title: 'Coaching-Ziele & Themen',
    description: 'Definierte Ziele und Schwerpunkte für jeden Klienten – sichtbar vor und nach der Sitzung.',
  },
  {
    icon: 'i-lucide-archive',
    title: 'Klient archivieren',
    description: 'Abgeschlossene Klienten aus der aktiven Liste entfernen, Daten bleiben erhalten.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 max-w-2xl">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Klientenliste</h1>
    <p class="text-muted mb-8">Verwalte alle deine Klienten und deren Coaching-Verläufe.</p>

    <div class="flex flex-col gap-2">
      <UpcomingFeature
        v-for="item in features"
        :key="item.title"
        v-bind="item"
      />
    </div>
  </div>
</template>
