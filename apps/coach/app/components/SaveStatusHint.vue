<script setup lang="ts">
defineProps<{
  status: 'saving' | 'saved' | 'error' | null
}>()
</script>

<template>
  <span v-if="status" class="flex items-center gap-1 text-xs">
    <UIcon v-if="status === 'saving'" name="i-lucide-loader" class="animate-spin text-muted" />
    <UIcon v-else-if="status === 'saved'" name="i-lucide-check" class="text-success" />
    <UIcon v-else name="i-lucide-alert-circle" class="text-error" />
    <span :class="status === 'error' ? 'text-error' : 'text-muted'">
      {{ status === 'saving' ? 'Wird gespeichert…' : status === 'saved' ? 'Gespeichert' : 'Fehler beim Speichern' }}
    </span>
  </span>
</template>
