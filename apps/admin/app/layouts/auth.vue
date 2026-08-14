<script setup lang="ts">
import { Logo } from '@hxroom/ui'
</script>

<template>
  <div class="min-h-screen flex flex-col bg-(--ui-bg-muted)">
    <header class="flex flex-col items-center pt-10 pb-2">
      <Logo />
    </header>

    <main class="flex flex-1 items-center justify-center px-4 pb-12">
      <slot />
    </main>

    <!-- Keine Impressum-/Datenschutz-Links wie im Coach-Layout: admin.hxroom.de ist ein
         interner Zugang ohne öffentliche Anbieterkennzeichnung (doc/legal.md, Abschnitt 1). -->
    <footer class="py-6 text-center text-xs text-(--ui-text-muted)">
      Interner Bereich · nur für Betreiber
    </footer>
  </div>
</template>
