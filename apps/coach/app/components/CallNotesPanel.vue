<script setup lang="ts">
// Notizen zur laufenden Sitzung – nur für den Coach sichtbar (project.md §5a).
//
// Prototyp: Der Text wird nirgends gespeichert und ist nach einem Reload weg.

const notes = defineModel<string>({ required: true })

const inputUi = { base: 'bg-white dark:bg-neutral-800' }
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-sm font-medium text-highlighted">Notizen – diese Sitzung</h2>
      <UBadge icon="i-lucide-lock" color="secondary" variant="subtle" size="sm" label="privat" />
    </div>

    <UTextarea
      v-model="notes"
      :rows="10"
      class="w-full"
      :ui="inputUi"
      placeholder="Gedanken, Beobachtungen, nächste Schritte …"
    />

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
