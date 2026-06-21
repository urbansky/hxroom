<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const upcomingFeatures = [
  {
    icon: 'i-lucide-lock',
    title: 'Passwort ändern',
    description: 'Aktuelles Passwort durch ein neues ersetzen.',
  },
  {
    icon: 'i-lucide-mail',
    title: 'E-Mail-Adresse ändern',
    description: 'Anmelde-E-Mail aktualisieren und neu verifizieren.',
  },
  {
    icon: 'i-lucide-shield-check',
    title: 'Zwei-Faktor-Authentifizierung',
    description: 'Konto mit einem zweiten Faktor absichern.',
  },
  {
    icon: 'i-lucide-trash-2',
    title: 'Konto löschen',
    description: 'Konto und alle zugehörigen Daten dauerhaft entfernen.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 max-w-2xl">
    <h1 class="font-serif text-3xl text-(--ui-text-highlighted) mb-2">Account</h1>
    <p class="text-(--ui-text-muted) mb-8">Verwaltung deines Kontos und deiner Sicherheitseinstellungen.</p>

    <div class="flex flex-col gap-2">
      <UpcomingFeature
        v-for="item in upcomingFeatures"
        :key="item.title"
        v-bind="item"
      />
    </div>
  </div>
</template>
