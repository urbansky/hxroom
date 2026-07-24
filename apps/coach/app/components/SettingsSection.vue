<script setup lang="ts">
defineProps<{
  title?: string
  description?: string
}>()

const slots = useSlots()
</script>

<template>
  <section class="flex flex-col gap-5 p-6 sm:p-7 rounded-xl border border-default bg-white dark:bg-neutral-900">
    <div v-if="title || description || slots.header || slots.actions" class="flex flex-col gap-1">
      <div class="flex items-center justify-between gap-2">
        <slot name="header">
          <h2 class="font-bold">{{ title }}</h2>
        </slot>
        <slot name="actions" />
      </div>
      <p v-if="description" class="text-sm text-muted">{{ description }}</p>
    </div>
    <slot />
  </section>
</template>
