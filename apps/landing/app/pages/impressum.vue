<script setup lang="ts">
import { LegalOperatorImprint } from '@hxroom/ui'

definePageMeta({ layout: 'legal' })

useHead({
  title: 'Impressum · HxRoom',
  meta: [
    { name: 'description', content: 'Impressum nach § 5 DDG für HxRoom – Anbieter, Kontakt, Verantwortlichkeiten.' },
    { name: 'robots', content: 'noindex, follow' },
  ],
})
</script>

<template>
  <!-- Die Angaben selbst stehen in @hxroom/ui: Dieselben erscheinen als Block „Technischer
       Betrieb“ im Impressum jeder Buchungsseite. Stile aus @hxroom/ui/theme (legal.css). -->
  <div class="legal-container">
    <span class="legal-eyebrow">Rechtliches</span>
    <h1 class="legal-headline">Impressum</h1>
    <p class="legal-sub">Angaben gemäß § 5 DDG. Wer hinter HxRoom steht und wie du mich erreichst.</p>

    <LegalOperatorImprint />

    <p class="legal-updated">Stand: 15. Oktober 2026</p>
  </div>
</template>
