<script setup lang="ts">
import { Logo } from '@hxroom/ui'

const { public: { rootDomain } } = useRuntimeConfig()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-(--ui-bg-muted)">
    <header class="flex flex-col items-center pt-10 pb-2">
      <Logo />
    </header>

    <main class="flex flex-1 items-center justify-center px-4 pb-12">
      <slot />
    </main>

    <footer class="py-6 text-center text-xs text-(--ui-text-muted)">
      <NuxtLink :to="`https://${rootDomain}/impressum`" class="hover:underline">Impressum</NuxtLink>
      <span class="mx-1.5">·</span>
      <NuxtLink :to="`https://${rootDomain}/datenschutz`" class="hover:underline">Datenschutz</NuxtLink>
    </footer>
  </div>
</template>
