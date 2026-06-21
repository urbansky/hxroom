<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const features = [
  {
    icon: 'i-lucide-file-plus',
    title: 'Automatische Rechnungsstellung',
    description: 'Rechnung wird nach jeder abgeschlossenen Sitzung automatisch erstellt und per E-Mail versandt.',
  },
  {
    icon: 'i-lucide-list-ordered',
    title: 'Rechnungshistorie',
    description: 'Alle ausgestellten Rechnungen mit Status (bezahlt, offen, storniert) auf einen Blick.',
  },
  {
    icon: 'i-lucide-package-open',
    title: 'ZIP/PDF-Export',
    description: 'Alle Rechnungen eines Zeitraums als ZIP-Archiv herunterladen – für Steuerberater und Jahresabschluss.',
  },
  {
    icon: 'i-lucide-x-circle',
    title: 'Stornierung & Rückerstattung',
    description: 'Regeln für Stornierungen und Rückerstattungen konfigurieren und im Buchungsprozess kommunizieren.',
  },
]
</script>

<template>
  <div class="p-4 sm:p-6 max-w-2xl">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Rechnungen</h1>
    <p class="text-muted mb-8">Automatische Rechnungsstellung und Übersicht aller Belege.</p>

    <div class="flex flex-col gap-2">
      <UpcomingFeature
        v-for="item in features"
        :key="item.title"
        v-bind="item"
      />
    </div>
  </div>
</template>
