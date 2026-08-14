<script setup lang="ts">
const features = [
  { icon: 'i-lucide-list', title: 'Coach-Liste', description: 'Alle Coachs mit Registrierungsdatum, Plan und Status (Trial, aktiv, gesperrt).' },
  { icon: 'i-lucide-id-card', title: 'Detailansicht', description: 'Kontaktdaten, Subdomain, Branding sowie Anzahl Klienten und Sitzungen.' },
  { icon: 'i-lucide-search', title: 'Suchen & filtern', description: 'Volltextsuche über Name und E-Mail, Filter nach Plan, Status und Zeitraum.' },
  { icon: 'i-lucide-user-plus', title: 'Coach anlegen', description: 'Account direkt erstellen – für Beta-Kunden und Direktverträge.' },
  { icon: 'i-lucide-ban', title: 'Sperren & entsperren', description: 'Account bei Zahlungsausfall oder Missbrauch vorübergehend deaktivieren.' },
  { icon: 'i-lucide-trash-2', title: 'Löschen nach DSGVO', description: 'Vollständige Löschung inklusive Klienten- und Sitzungsdaten mit Protokoll.' },
]
</script>

<template>
  <SectionPlaceholder
    title="Coachs"
    description="Alle registrierten Coachs der Plattform verwalten."
    :features="features"
  />
</template>
