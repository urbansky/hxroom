<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const features = [
  {
    icon: 'i-lucide-badge-check',
    title: 'Aktuellen Plan einsehen',
    description: 'Zeigt deinen aktiven Plan, Laufzeit und enthaltene Features auf einen Blick.',
  },
  {
    icon: 'i-lucide-arrow-up-circle',
    title: 'Plan upgraden',
    description: 'Wechsel zu Basic, Pro oder Studio – mit optionalem Jahresabo zum vergünstigten Preis.',
  },
  {
    icon: 'i-lucide-credit-card',
    title: 'Zahlungsmethode verwalten',
    description: 'Kreditkarte hinterlegen oder ändern über das sichere Stripe Billing Portal.',
  },
  {
    icon: 'i-lucide-receipt',
    title: 'Rechnungshistorie',
    description: 'Alle bisherigen Zahlungen als PDF herunterladen – für Buchhaltung und Steuerberater.',
  },
  {
    icon: 'i-lucide-x-circle',
    title: 'Abo kündigen',
    description: 'Kündigung zum Ende der Laufzeit, Daten bleiben bis dahin vollständig erhalten.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 max-w-2xl">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Plan & Abrechnung</h1>
    <p class="text-muted mb-8">Verwalte dein Abonnement und deine Zahlungsmethode.</p>

    <div class="flex flex-col gap-2">
      <UpcomingFeature
        v-for="item in features"
        :key="item.title"
        v-bind="item"
      />
    </div>
  </div>
</template>
