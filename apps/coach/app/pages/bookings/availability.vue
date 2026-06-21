<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const features = [
  {
    icon: 'i-lucide-calendar-days',
    title: 'Verfügbare Zeiten konfigurieren',
    description: 'Wochentage und Uhrzeiten freigeben, in denen Klienten Termine buchen können.',
  },
  {
    icon: 'i-lucide-timer',
    title: 'Pufferzeit zwischen Terminen',
    description: 'Automatische Pause zwischen zwei Buchungen, z. B. 15 Minuten zur Vorbereitung.',
  },
  {
    icon: 'i-lucide-hourglass',
    title: 'Buchungsvorlaufzeit',
    description: 'Mindestzeit vor einem Termin, die Klienten zur Buchung benötigen (z. B. 24 Stunden).',
  },
  {
    icon: 'i-lucide-layers',
    title: 'Sitzungstypen & Dauer',
    description: 'Erstgespräch (30 min, kostenlos), Standard-Sitzung (60 min) und Intensiv-Session (90 min) konfigurieren.',
  },
  {
    icon: 'i-lucide-calendar-sync',
    title: 'iCal-Feed',
    description: 'Private Feed-URL zum Abonnieren deines HxRoom-Kalenders in externen Apps (Apple Calendar, Outlook).',
  },
  {
    icon: 'i-lucide-refresh-cw',
    title: 'Google Calendar Sync',
    description: 'Bidirektionaler Echtzeit-Sync: Externe Termine blockieren automatisch Slots in HxRoom.',
  },
  {
    icon: 'i-lucide-repeat',
    title: 'Wiederkehrende Termine',
    description: 'Sitzungsserien anlegen, z. B. wöchentlich für 8 Wochen mit einem festen Klienten.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 max-w-2xl">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Verfügbarkeit</h1>
    <p class="text-muted mb-8">Konfiguriere deine buchbaren Zeiten, Pausen und Sitzungstypen.</p>

    <div class="flex flex-col gap-2">
      <UpcomingFeature
        v-for="item in features"
        :key="item.title"
        v-bind="item"
      />
    </div>
  </div>
</template>
