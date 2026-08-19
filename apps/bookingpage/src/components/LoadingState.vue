<script setup lang="ts">
const { text } = defineProps<{ text?: string }>();
</script>

<template>
  <div class="flex flex-col items-center gap-3 py-10">
    <UIcon name="i-lucide-loader-2" class="size-6 animate-spin text-dimmed" />
    <p v-if="text" class="text-sm text-muted">{{ text }}</p>
  </div>
</template>
