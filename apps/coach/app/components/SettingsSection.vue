<script setup lang="ts">
defineProps<{
  title?: string
}>()

const slots = useSlots()
</script>

<template>
  <section class="flex flex-col gap-5 my-4">
    <div v-if="title || slots.header || slots.actions" class="flex flex-col gap-1">
      <div class="flex items-center justify-between gap-2">
        <slot name="header">
          <h2 class="font-bold">{{ title }}</h2>
        </slot>
        <slot name="actions" />
      </div>
      <hr class="border-t border-default" />
    </div>
    <slot />
  </section>
</template>
