<script setup lang="ts">
import StatusPanel from '../components/StatusPanel.vue'
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center gap-6 px-6">
    <StatusPanel
      icon="i-lucide-search-x"
      title="Seite nicht gefunden"
      description="Dieser Coach-Bereich existiert nicht oder ist nicht mehr aktiv."
      tone="neutral"
    />
    <a href="https://hxroom.de" class="text-xs text-dimmed hover:text-muted transition-colors no-underline">hxroom.de</a>
  </div>
</template>
