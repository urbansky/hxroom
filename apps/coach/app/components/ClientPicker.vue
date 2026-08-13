<script setup lang="ts">
import type { ClientListItem } from '@hxroom/shared'

// Suche im eigenen Klientenstamm für die manuelle Zuordnung einer Buchung
// (Baustein 3 aus doc/idee-klienten-matching.md). Bewusst ohne technische Details:
// der Coach sieht Namen und E-Mail, keine IDs.
const props = defineProps<{ currentClientId: string | null }>()
const emit = defineEmits<{ select: [clientId: string | null] }>()

const open = defineModel<boolean>('open', { required: true })

const { $api } = useApi()

const clients = ref<ClientListItem[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const search = ref('')

const results = computed(() => filterClients(clients.value, search.value))

// Erst beim Öffnen laden – die Liste hängt an einem Slideover, das die meisten
// Termine nie zu sehen bekommen.
watch(open, async (isOpen) => {
  if (!isOpen) return
  search.value = ''
  loading.value = true
  loadError.value = null
  try {
    clients.value = await $api<ClientListItem[]>('/clients')
  } catch {
    loadError.value = 'Klienten konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
})

function choose(clientId: string | null) {
  emit('select', clientId)
  open.value = false
}
</script>

<template>
  <USlideover v-model:open="open" title="Klient zuordnen">
    <template #body>
      <div class="flex flex-col gap-4">
        <UInput
          v-model="search"
          placeholder="Nach Name oder E-Mail suchen"
          icon="i-lucide-search"
          class="w-full"
          :ui="{ base: 'bg-white dark:bg-neutral-800' }"
        />

        <p v-if="loadError" class="text-sm text-error">{{ loadError }}</p>

        <div v-if="loading" class="flex flex-col gap-2">
          <USkeleton v-for="n in 4" :key="n" class="h-14 rounded-lg" />
        </div>

        <div v-else-if="results.length" class="flex flex-col gap-1">
          <button
            v-for="client in results"
            :key="client.id"
            type="button"
            class="flex items-center gap-3 p-3 rounded-lg text-left transition-colors cursor-pointer hover:bg-elevated"
            :class="client.id === currentClientId && 'bg-elevated'"
            @click="choose(client.id)"
          >
            <span class="size-9 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
              {{ clientInitials(client.name) }}
            </span>
            <span class="flex-1 min-w-0">
              <span class="block text-sm font-medium text-highlighted truncate">{{ client.name }}</span>
              <span class="block text-sm text-muted truncate">{{ client.email }}</span>
            </span>
            <UIcon
              v-if="client.id === currentClientId"
              name="i-lucide-check"
              class="size-4 text-primary shrink-0"
            />
          </button>
        </div>

        <p v-else class="text-sm text-muted py-4 text-center">
          {{ search ? 'Kein Klient gefunden.' : 'Noch keine Klienten vorhanden.' }}
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between w-full gap-2">
        <UButton
          v-if="currentClientId"
          label="Zuordnung aufheben"
          icon="i-lucide-unlink"
          color="neutral"
          variant="ghost"
          size="sm"
          @click="choose(null)"
        />
        <div v-else />
        <UButton label="Abbrechen" color="neutral" variant="ghost" size="sm" @click="open = false" />
      </div>
    </template>
  </USlideover>
</template>
