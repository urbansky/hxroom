<script setup lang="ts">
const colorMode = useColorMode()
colorMode.preference = 'dark'

useHead({
  htmlAttrs: { lang: 'de', class: 'dark' },
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
