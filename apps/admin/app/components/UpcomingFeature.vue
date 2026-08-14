<script setup lang="ts">
defineProps<{
  icon: string
  title: string
  description: string
}>()
</script>

<template>
  <div class="flex items-center gap-4 p-4 rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated)">
    <div class="size-9 rounded-lg bg-(--ui-bg-accented) border border-(--ui-border) flex items-center justify-center shrink-0">
      <UIcon :name="icon" class="size-4 text-highlighted" />
    </div>
    <div class="flex-1 min-w-0">
      <div class="text-sm font-medium text-highlighted">{{ title }}</div>
      <div class="text-sm text-muted mt-0.5">{{ description }}</div>
    </div>
    <UBadge label="Demnächst" color="info" variant="subtle" size="md" class="shrink-0" />
  </div>
</template>
