<script setup lang="ts">
const features = [
  { icon: 'i-lucide-globe', title: 'Subdomain-Übersicht', description: 'Alle vergebenen [slug].hxroom.de-Adressen mit zugehörigem Coach.' },
  { icon: 'i-lucide-git-fork', title: 'Slug-Konflikte lösen', description: 'Doppelt angeforderte Slugs anzeigen und manuell zuweisen.' },
  { icon: 'i-lucide-link', title: 'Custom-Domains (Pro)', description: 'CNAME-Einträge der Pro-Coachs samt DNS-Status.' },
]
</script>

<template>
  <SectionPlaceholder
    title="Domains"
    description="Subdomains, Slugs und Custom-Domains der Coachs."
    :features="features"
  />
</template>
