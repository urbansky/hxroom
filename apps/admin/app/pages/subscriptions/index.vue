<script setup lang="ts">
const features = [
  { icon: 'i-lucide-list', title: 'Subscription-Liste', description: 'Aktive, auslaufende und gekündigte Abos mit Start und nächster Verlängerung.' },
  { icon: 'i-lucide-arrow-up-down', title: 'Plan ändern', description: 'Plan eines Coachs hoch- oder herunterstufen, etwa aus Kulanz.' },
  { icon: 'i-lucide-calendar-plus', title: 'Trial verlängern', description: 'Testphase manuell verlängern, zum Beispiel für Beta-Feedback.' },
  { icon: 'i-lucide-user-minus', title: 'Kündigungen & Churn', description: 'Coachs im Kündigungs- oder Grace-Period-Status.' },
  { icon: 'i-lucide-external-link', title: 'Stripe-Verknüpfung', description: 'Direktlink ins Stripe-Kundenprofil für Rückerstattungen und Gutschriften.' },
]
</script>

<template>
  <SectionPlaceholder
    title="Subscriptions"
    description="Abonnements, Pläne und Kündigungen aller Coachs."
    :features="features"
  />
</template>
