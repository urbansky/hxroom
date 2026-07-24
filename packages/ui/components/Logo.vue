<script setup lang="ts">
withDefaults(defineProps<{ to?: string; collapsed?: boolean }>(), {
  to: '/',
  collapsed: false,
})
</script>

<template>
  <NuxtLink :to="to" class="flex items-center gap-2.5 py-1 overflow-hidden">
    <div class="size-9 rounded-full bg-gradient-to-br from-sage-400 to-sage-600 flex items-center justify-center shrink-0">
      <UIcon name="i-lucide-video" class="size-5 text-white/92" />
    </div>
    <span v-if="!collapsed" class="text-[22px] text-gold-700 dark:text-gold-200 tracking-wide truncate">HxRoom</span>
  </NuxtLink>
</template>
