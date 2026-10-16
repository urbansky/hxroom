<script setup lang="ts">
// Kleine Überschrift über den Abschnitten („Das Problem“, „Für wen“ …).
withDefaults(defineProps<{ inverted?: boolean }>(), { inverted: false })
</script>

<template>
  <div
    class="flex items-center gap-2.5 mb-[18px] text-[11px] tracking-[0.14em] uppercase"
    :class="inverted ? 'text-sage-200' : 'text-sage-600 dark:text-sage-200'"
  >
    <span class="w-6 h-px shrink-0" :class="inverted ? 'bg-sage-300' : 'bg-sage-400'" />
    <slot />
  </div>
</template>
