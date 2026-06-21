<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const features = [
  {
    icon: 'i-lucide-calendar-plus',
    title: 'E-Mail bei neuer Buchung',
    description: 'Sofortige Benachrichtigung, wenn ein Klient einen Termin bucht.',
  },
  {
    icon: 'i-lucide-calendar-x',
    title: 'E-Mail bei Stornierung',
    description: 'Benachrichtigung, wenn ein Klient einen bestehenden Termin absagt.',
  },
  {
    icon: 'i-lucide-alarm-clock',
    title: 'Erinnerung vor der Sitzung',
    description: 'Automatische E-Mail an dich 24 Stunden und 1 Stunde vor einem Termin.',
  },
  {
    icon: 'i-lucide-pencil-line',
    title: 'Erinnerungs-Texte anpassen',
    description: 'Eigene Texte für alle automatischen E-Mails an Klienten verfassen.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 max-w-2xl">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Benachrichtigungen</h1>
    <p class="text-muted mb-8">Steuere, wann und wie du per E-Mail informiert wirst.</p>

    <div class="flex flex-col gap-2">
      <UpcomingFeature
        v-for="item in features"
        :key="item.title"
        v-bind="item"
      />
    </div>
  </div>
</template>
