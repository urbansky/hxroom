<script setup lang="ts">
// Browserrahmen um einen Screenshot. Ohne `src` zeigt er einen Platzhalter im selben
// Seitenverhältnis, bis die echten Bilder da sind (phase5-umsetzungsplan.md, 9b).
withDefaults(defineProps<{
  src?: string
  alt: string
  address?: string
  width?: number
  height?: number
  eager?: boolean
}>(), { width: 1440, height: 900, eager: false })
</script>

<template>
  <figure class="rounded-[14px] border border-(--ui-border) bg-(--ui-bg) shadow-[0_24px_60px_-28px_rgba(46,58,45,0.35)] overflow-hidden">
    <div class="flex items-center gap-3 px-4 h-9 border-b border-(--ui-border) bg-(--ui-bg-muted)">
      <div class="flex gap-1.5 shrink-0" aria-hidden="true">
        <span class="size-2.5 rounded-full bg-(--ui-bg-accented)" />
        <span class="size-2.5 rounded-full bg-(--ui-bg-accented)" />
        <span class="size-2.5 rounded-full bg-(--ui-bg-accented)" />
      </div>
      <div v-if="address" class="flex-1 min-w-0 flex justify-center">
        <span class="truncate text-[11px] text-(--ui-text-dimmed) bg-(--ui-bg) border border-(--ui-border) rounded-md px-3 py-0.5 max-w-[280px]">
          {{ address }}
        </span>
      </div>
    </div>

    <img
      v-if="src"
      :src="src"
      :alt="alt"
      :width="width"
      :height="height"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      class="block w-full h-auto"
    >
    <div
      v-else
      class="flex items-center justify-center bg-linear-to-br from-sage-100/70 to-gold-100/50 dark:from-sage-900/40 dark:to-gold-900/20"
      :style="{ aspectRatio: `${width} / ${height}` }"
      role="img"
      :aria-label="alt"
    >
      <span class="text-[12px] tracking-[0.12em] uppercase text-sage-600/70 dark:text-sage-200/60">Screenshot · {{ alt }}</span>
    </div>
  </figure>
</template>
