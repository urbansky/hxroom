<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const features = [
  {
    icon: 'i-lucide-calendar-days',
    title: 'Tages- & Wochenansicht',
    description: 'Alle gebuchten Sitzungen auf einen Blick – mit Klientenname, Dauer und direktem Raumlink.',
  },
  {
    icon: 'i-lucide-calendar-plus',
    title: 'Termin manuell anlegen',
    description: 'Termin direkt erstellen und Einladungslink per E-Mail an den Klienten schicken – ohne öffentliche Buchungsseite.',
  },
  {
    icon: 'i-lucide-calendar-x',
    title: 'Termin absagen & verschieben',
    description: 'Coach oder Klient kann stornieren – automatische Benachrichtigung und Freigabe des Slots.',
  },
  {
    icon: 'i-lucide-bell',
    title: 'Automatische Erinnerungen',
    description: 'E-Mail-Erinnerung 24h und 1h vor der Sitzung an den Klienten (und optional den Coach).',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 max-w-2xl">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Kalender</h1>
    <p class="text-muted mb-8">Übersicht und Verwaltung aller deiner Termine.</p>

    <div class="flex flex-col gap-2">
      <UpcomingFeature
        v-for="item in features"
        :key="item.title"
        v-bind="item"
      />
    </div>
  </div>
</template>
