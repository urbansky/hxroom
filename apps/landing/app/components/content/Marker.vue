<script setup lang="ts">
// Nummer einer Markierung, im Bild (Screenshot.vue) wie im Text: `:marker{n="1"}`.
// Im Text liest ein Screenreader die Zahl in Klammern; im Bild ist sie Schmuck.
const props = defineProps<{ n: number | string, inImage?: boolean }>()
</script>

<template>
  <span
    class="inline-flex items-center justify-center size-[1.4em] rounded-full bg-primary text-inverted text-[0.75em] font-semibold tabular-nums align-[0.1em] shadow-sm"
    :class="inImage ? 'ring-2 ring-(--ui-bg)' : 'mx-0.5'"
    :aria-hidden="inImage ? 'true' : undefined"
  >
    <span v-if="!inImage" class="sr-only">(</span>{{ props.n }}<span v-if="!inImage" class="sr-only">)</span>
  </span>
</template>
