<script setup lang="ts">
const features = [
  { icon: 'i-lucide-trending-up', title: 'MRR & ARR', description: 'Wiederkehrender Umsatz pro Monat und Jahr samt Trend über zwölf Monate.' },
  { icon: 'i-lucide-layers', title: 'Einnahmen nach Plan', description: 'Aufschlüsselung nach Trial-Konversionen, Solo, Pro und Studio.' },
  { icon: 'i-lucide-user-plus', title: 'Neue Kunden pro Monat', description: 'Registrierungen, Trial-Starts und Upgrades im Zeitverlauf.' },
  { icon: 'i-lucide-trending-down', title: 'Churn-Rate', description: 'Gekündigte Abos pro Monat nach Anzahl und Umsatz.' },
  { icon: 'i-lucide-credit-card', title: 'Zahlungsausfälle', description: 'Fehlgeschlagene Zahlungen mit Stripe-Status und verbleibender Grace-Period.' },
]
</script>

<template>
  <SectionPlaceholder
    title="Umsatz"
    description="Einnahmen und betriebswirtschaftliche Kennzahlen der Plattform."
    :features="features"
  />
</template>
