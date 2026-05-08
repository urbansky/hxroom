<script setup lang="ts">
useHead({
  htmlAttrs: { lang: 'de' },
  title: 'HxRoom – Einfach. Professionell. Deins.',
  meta: [
    { name: 'description', content: 'HxRoom – Dein digitaler Raum für echte Gespräche. White-Label Videocall-Plattform für Coaches.' },
    // Pre-Launch: Suchmaschinen komplett fernhalten. Vor dem Launch entfernen.
    { name: 'robots', content: 'noindex, nofollow' },
  ],
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
