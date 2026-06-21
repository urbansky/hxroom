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
    icon: 'i-lucide-bell',
    title: 'Benachrichtigungen',
    description: 'E-Mail-Benachrichtigungen für Buchungen und Erinnerungen konfigurieren.',
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

    <div class="flex flex-col gap-3">
      <div
        v-for="item in upcomingFeatures"
        :key="item.title"
        class="flex items-start gap-3 p-4 rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated) opacity-60"
      >
        <UIcon :name="item.icon" class="size-4 text-(--ui-text-dimmed) mt-0.5 shrink-0" />
        <div>
          <div class="text-sm text-(--ui-text-muted)">{{ item.title }}</div>
          <div class="text-xs text-(--ui-text-dimmed) mt-0.5">{{ item.description }}</div>
        </div>
        <UBadge label="Demnächst" color="neutral" variant="subtle" size="xs" class="ml-auto shrink-0" />
      </div>
    </div>
  </div>
</template>
