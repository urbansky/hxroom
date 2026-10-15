<script setup lang="ts">
import { LegalPrivacyPolicy } from '@hxroom/ui'

definePageMeta({ layout: 'legal' })

useHead({
  title: 'Datenschutz · HxRoom',
  meta: [
    { name: 'description', content: 'Datenschutzerklärung von HxRoom – für Website, App und Buchungsseiten. Datenminimum, EU-Hosting, keine Tracker.' },
    { name: 'robots', content: 'noindex, follow' },
  ],
})
</script>

<template>
  <!-- Der Text steht in @hxroom/ui und gilt für alle Seiten von HxRoom; die Buchungsseiten
       zeigen ihn mit dem jeweiligen Coach als Verantwortlichem (doc/legal.md §4). -->
  <div class="legal-container">
    <span class="legal-eyebrow">Rechtliches</span>
    <h1 class="legal-headline">Datenschutz&shy;erklärung</h1>
    <p class="legal-sub">Deine Daten – kurz und klar erklärt. So wenig wie möglich, alles in der EU, kein Cookie-Tracking.</p>

    <LegalPrivacyPolicy />
  </div>
</template>
