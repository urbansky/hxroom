<script setup lang="ts">
// Leiser Verweis von der Startseite ins Handbuch: „Im Handbuch: Warteraum und Einlass →“.
// Für Leser, die es genau wissen wollen, und für die interne Verlinkung (doc/marketing/handbuch.md §7).
defineProps<{ to: string, label: string }>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="group inline-flex items-center gap-1.5 text-[14px] text-sage-700 dark:text-sage-300 hover:text-(--ui-text-highlighted) transition-colors no-underline"
  >
    <UIcon name="i-lucide-book-open" class="size-3.5 shrink-0" />
    <span>Im Handbuch: {{ label }}</span>
    <UIcon name="i-lucide-arrow-right" class="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
  </NuxtLink>
</template>
