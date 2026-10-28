<script setup lang="ts">
import type { ClientNoteEntry } from '@hxroom/shared'

// Notizen-Chronik (Funktionsliste 4.02): alle Sitzungsnotizen eines Klienten hintereinander,
// neueste Sitzung zuerst. Zum Lesen vor der nächsten Sitzung – bearbeitet wird auf der
// Terminseite, auf die jeder Eintrag führt. Gerendert mit derselben eingeschränkten
// Extension-Konfiguration wie der Editor (renderDescription in utils/offers.ts).
const { clientId } = defineProps<{ clientId: string }>()

const { $api } = useApi()
const entries = ref<ClientNoteEntry[]>([])
const loading = ref(true)
const loadError = ref(false)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    const rows = await $api<ClientNoteEntry[]>(`/clients/${clientId}/notes`)
    entries.value = rows.filter(entry => richTextHasText(entry.content))
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)
</script>

<template>
  <div class="flex flex-col gap-4">
    <template v-if="loading">
      <USkeleton v-for="n in 2" :key="n" class="h-32 rounded-xl" />
    </template>

    <UAlert
      v-else-if="loadError"
      icon="i-lucide-alert-circle"
      color="error"
      variant="subtle"
      description="Die Notizen konnten nicht geladen werden."
      :actions="[{ label: 'Erneut versuchen', color: 'error', variant: 'outline', onClick: load }]"
    />

    <div v-else-if="!entries.length" class="rounded-xl border border-dashed border-default p-8 flex flex-col items-center gap-2 text-center">
      <UIcon name="i-lucide-notebook-pen" class="size-5 text-muted" />
      <p class="text-sm text-muted">Zu diesem Klienten gibt es noch keine Notizen.</p>
    </div>

    <article
      v-for="entry in entries"
      v-else
      :key="entry.bookingId"
      class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-4"
    >
      <header class="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-3">
        <div class="min-w-0">
          <span class="font-medium text-highlighted tabular-nums">{{ formatShortDate(entry.start) }}</span>
          <span class="text-sm text-muted"> · {{ entry.offerName }}</span>
          <UBadge v-if="entry.status === 'no_show'" :label="STATUS_LABELS.no_show" color="warning" variant="subtle" size="sm" class="ml-2" />
        </div>
        <UButton
          :to="`/bookings/${entry.bookingId}`"
          label="Zum Termin"
          trailing-icon="i-lucide-arrow-right"
          color="primary"
          variant="link"
          size="xs"
          class="-my-1"
        />
      </header>
      <!-- eslint-disable-next-line vue/no-v-html -- generateHTML mit der festen Extension-Liste des Editors, die API prüft das Dokument gegen richTextDocSchema -->
      <div class="text-highlighted" :class="descriptionProseClasses" v-html="renderDescription(entry.content)" />
    </article>
  </div>
</template>
