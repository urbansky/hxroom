<script setup lang="ts">
const items = [
  { icon: 'i-lucide-server', label: 'Server in Deutschland' },
  { icon: 'i-lucide-file-check-2', label: 'AVV inklusive' },
  { icon: 'i-lucide-user-round-check', label: 'Klienten ohne Konto' },
  { icon: 'i-lucide-link-2-off', label: 'Kein Zoom-Link' },
]
</script>

<template>
  <section class="relative z-1 px-6 lg:px-12 pb-20 max-sm:pb-14" aria-label="Das Wichtigste in Kürze">
    <ul class="max-w-[1180px] mx-auto grid grid-cols-4 max-md:grid-cols-2 gap-px rounded-[14px] overflow-hidden border border-(--ui-border) bg-(--ui-border)">
      <li
        v-for="item in items"
        :key="item.label"
        class="flex items-center justify-center gap-2.5 bg-(--ui-bg) px-4 py-4 text-[14px] text-(--ui-text) max-sm:text-[13px] max-sm:justify-start"
      >
        <UIcon :name="item.icon" class="size-[18px] shrink-0 text-sage-600 dark:text-sage-300" />
        {{ item.label }}
      </li>
    </ul>
  </section>
</template>
