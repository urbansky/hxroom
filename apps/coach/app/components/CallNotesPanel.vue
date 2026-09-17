<script setup lang="ts">
// Notizen zur laufenden Sitzung – nur für den Coach sichtbar (project.md §5a).
//
// Nur die Anzeige: Laden und Speichern liegen in useSessionNotes beim Call-Screen, weil der
// Tab-Wechsel der Seitenleiste dieses Panel abbaut.

defineProps<{
  status: 'saving' | 'saved' | 'error' | null
  ready: boolean
  loadError: boolean
}>()
defineEmits<{ retry: [] }>()

const notes = defineModel<any>({ required: true })
</script>

<template>
  <div class="h-full flex flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-sm font-medium text-highlighted">Notizen – diese Sitzung</h2>
      <div class="flex items-center gap-2">
        <SaveStatusHint :status="status" />
        <UBadge icon="i-lucide-lock" color="secondary" variant="subtle" size="sm" label="privat" />
      </div>
    </div>

    <RichTextEditor
      v-if="ready"
      v-model="notes"
      fill
      class="flex-1 min-h-60"
      placeholder="Gedanken, Beobachtungen, nächste Schritte …"
    />
    <UAlert
      v-else-if="loadError"
      icon="i-lucide-alert-circle"
      color="error"
      variant="subtle"
      description="Die Notizen konnten nicht geladen werden."
      :actions="[{ label: 'Erneut versuchen', color: 'error', variant: 'outline', onClick: () => $emit('retry') }]"
    />
    <USkeleton v-else class="flex-1 min-h-60 rounded-lg" />

    <!-- Der Hinweis steht hier, weil die Verwechslung teuer wäre: Was als Arbeitsnotiz
         gedacht ist, darf nicht versehentlich beim Klienten landen. -->
    <UAlert
      icon="i-lucide-info"
      color="info"
      variant="subtle"
      :ui="{ description: 'text-xs' }"
      description="Diese Notizen gehen nicht an den Klienten – anders als die optionale Zusammenfassung aus der Transkription. Einen Link oder eine Ressource teilst du über den Chat."
    />
  </div>
</template>
