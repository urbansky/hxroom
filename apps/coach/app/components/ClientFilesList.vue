<script setup lang="ts">
import type { ClientFileEntry } from '@hxroom/shared'

// Alle im Chat geteilten Dateien eines Klienten über alle Sitzungen. Geöffnet wird über die
// Datei-Route der Sitzung: Die API prüft beim Klick und leitet auf einen kurzlebigen,
// signierten Link weiter (utils/chat.ts, chatFileUrl).
const { clientId, clientName } = defineProps<{ clientId: string, clientName: string }>()

const { $api } = useApi()
const { public: { apiUrl } } = useRuntimeConfig()
const files = ref<ClientFileEntry[]>([])
const loading = ref(true)
const loadError = ref(false)

async function load() {
  loading.value = true
  loadError.value = false
  try {
    files.value = await $api<ClientFileEntry[]>(`/clients/${clientId}/files`)
  } catch {
    loadError.value = true
  } finally {
    loading.value = false
  }
}
onMounted(load)

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'i-lucide-image'
  if (mimeType === 'application/pdf') return 'i-lucide-file-text'
  return 'i-lucide-file'
}

const firstName = computed(() => clientName.split(' ')[0] ?? clientName)
</script>

<template>
  <div class="flex flex-col gap-2">
    <template v-if="loading">
      <USkeleton v-for="n in 3" :key="n" class="h-16 rounded-xl" />
    </template>

    <UAlert
      v-else-if="loadError"
      icon="i-lucide-alert-circle"
      color="error"
      variant="subtle"
      description="Die Dateien konnten nicht geladen werden."
      :actions="[{ label: 'Erneut versuchen', color: 'error', variant: 'outline', onClick: load }]"
    />

    <div v-else-if="!files.length" class="rounded-xl border border-dashed border-default p-8 flex flex-col items-center gap-2 text-center">
      <UIcon name="i-lucide-paperclip" class="size-5 text-muted" />
      <p class="text-sm text-muted">In den Sitzungen wurden noch keine Dateien geteilt.</p>
    </div>

    <div
      v-for="file in files"
      v-else
      :key="file.id"
      class="flex items-center gap-3 rounded-xl border border-default bg-white dark:bg-neutral-900 p-3"
    >
      <span class="size-9 shrink-0 rounded-lg bg-elevated flex items-center justify-center">
        <UIcon :name="fileIcon(file.mimeType)" class="size-4 text-muted" />
      </span>
      <div class="flex-1 min-w-0">
        <a
          :href="chatFileUrl(apiUrl, file.bookingId, file.id)"
          target="_blank"
          rel="noopener"
          class="block text-sm font-medium text-highlighted hover:text-primary truncate"
        >{{ file.fileName }}</a>
        <p class="text-xs text-muted truncate">
          {{ formatFileSize(file.sizeBytes) }} · von {{ file.sender === 'coach' ? 'dir' : firstName }} ·
          Sitzung am {{ formatShortDate(file.bookingStart) }}
        </p>
      </div>
      <UButton
        :to="{ path: `/bookings/${file.bookingId}`, query: { tab: 'chat' } }"
        icon="i-lucide-arrow-right"
        color="neutral"
        variant="ghost"
        size="sm"
        aria-label="Zur Sitzung"
      />
    </div>
  </div>
</template>
