<script setup lang="ts">
import { de } from '@nuxt/ui/locale'

useHead({
  htmlAttrs: { lang: 'de' },
})
</script>

<template>
  <!-- Deutsche Texte der Nuxt-UI-Komponenten („Auf dieser Seite“, Suche) -->
  <UApp :locale="de">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
