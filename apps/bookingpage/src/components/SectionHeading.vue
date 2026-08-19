<script setup lang="ts">
const { title, hint, size = 'section' } = defineProps<{
  title: string;
  /** Dezenter Zusatz rechts der Überschrift, z. B. "Schritt 1 · Angebot wählen". */
  hint?: string;
  size?: 'section' | 'card';
}>();
</script>

<template>
  <!-- Genau ein Root-Element, damit id-Attribute (Sprungmarken) durchfallen. -->
  <div class="flex items-baseline gap-4">
    <h2 class="font-serif text-highlighted" :class="size === 'section' ? 'text-3xl' : 'text-2xl'">{{ title }}</h2>
    <span v-if="hint" class="text-xs text-dimmed tracking-wide">{{ hint }}</span>
  </div>
</template>
