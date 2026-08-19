<script setup lang="ts">
// Die drei Fakten, die der Klient vor jeder Entscheidung sehen muss – auf der
// Angebotsseite, in der Bestätigung und vor der Absage identisch.
defineProps<{ offer: string; appointment: string; coach: string }>();
</script>

<template>
  <div class="w-full rounded-lg border border-default bg-muted dark:bg-neutral-800/50 p-4 flex flex-col gap-2 text-left">
    <div class="flex items-center justify-between gap-4 text-sm">
      <span class="text-muted shrink-0">Angebot</span>
      <span class="text-highlighted text-right">{{ offer }}</span>
    </div>
    <div class="flex items-center justify-between gap-4 text-sm">
      <span class="text-muted shrink-0">Termin</span>
      <span class="text-highlighted text-right">{{ appointment }}</span>
    </div>
    <div class="flex items-center justify-between gap-4 text-sm">
      <span class="text-muted shrink-0">Coach</span>
      <span class="text-highlighted text-right">{{ coach }}</span>
    </div>
  </div>
</template>
