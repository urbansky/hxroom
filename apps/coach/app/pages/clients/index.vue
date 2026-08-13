<script setup lang="ts">
import type { ClientListItem, ClientResponse } from '@hxroom/shared'

definePageMeta({ middleware: 'auth' })

const { $api } = useApi()

const clients = ref<ClientListItem[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const search = ref('')

async function loadClients() {
  loading.value = true
  loadError.value = null
  try {
    clients.value = await $api<ClientListItem[]>('/clients')
  } catch {
    loadError.value = 'Klienten konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

await loadClients()

const results = computed(() => filterClients(clients.value, search.value))

const isFormOpen = ref(false)

function openCreate() {
  isFormOpen.value = true
}

// Nach dem Anlegen neu laden statt die Zeile lokal einzufügen: die Kennzahlen
// (Sitzungen, letzter/nächster Termin) und die Sortierung kommen vom Server.
async function onSaved(_client: ClientResponse) {
  await loadClients()
}
</script>

<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto w-full">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Klientenliste</h1>
    <p class="text-muted mb-6">Alle deine Klienten und deren Coaching-Verläufe.</p>

    <div class="flex items-center justify-between gap-4 mb-4">
      <UInput
        v-model="search"
        placeholder="Nach Name oder E-Mail suchen"
        icon="i-lucide-search"
        class="w-full max-w-xs"
        :ui="{ base: 'bg-white dark:bg-neutral-800' }"
      />
      <UButton
        v-if="clients.length"
        label="Klient anlegen"
        icon="i-lucide-user-round-plus"
        color="primary"
        @click="openCreate"
      />
    </div>

    <p v-if="loadError" class="text-sm text-error mb-4">{{ loadError }}</p>

    <div v-if="loading" class="flex flex-col gap-2">
      <USkeleton v-for="n in 4" :key="n" class="h-20 rounded-xl" />
    </div>

    <div v-else-if="results.length" class="flex flex-col gap-2">
      <NuxtLink
        v-for="client in results"
        :key="client.id"
        :to="`/clients/${client.id}`"
        class="flex items-center gap-4 p-4 rounded-xl border border-default bg-white dark:bg-neutral-900 transition-colors hover:border-accented"
      >
        <!-- Personen-Icon statt Initialen – Größe und Farbgebung wie beim bisherigen Avatar. -->
        <span class="size-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
          <UIcon name="i-lucide-user-round" class="size-5 text-primary" />
        </span>

        <span class="flex-1 min-w-0">
          <span class="block font-medium text-highlighted truncate">{{ client.name }}</span>
          <span class="block text-sm text-muted truncate">{{ client.email }}</span>
        </span>

        <span class="hidden sm:flex flex-col items-end shrink-0 text-sm">
          <span class="text-highlighted">{{ formatSessionCount(client.sessionCount) }}</span>
          <span v-if="client.nextSessionAt" class="text-primary">
            Nächster: {{ formatShortDate(client.nextSessionAt) }}
          </span>
          <span v-else-if="client.lastSessionAt" class="text-muted">
            Zuletzt: {{ formatShortDate(client.lastSessionAt) }}
          </span>
          <span v-else class="text-muted">Noch kein Termin</span>
        </span>

        <UIcon name="i-lucide-chevron-right" class="size-4 text-muted shrink-0" />
      </NuxtLink>
    </div>

    <div v-else class="rounded-xl border border-dashed border-default p-10 flex flex-col items-center justify-center gap-3 text-center">
      <UIcon name="i-lucide-users" class="size-6 text-muted" />
      <p class="text-sm text-muted">
        {{ search ? 'Kein Klient gefunden.' : 'Noch keine Klienten. Sie entstehen automatisch, sobald ein Klient eine Buchung bestätigt.' }}
      </p>
      <UButton
        v-if="!search"
        label="Klient anlegen"
        icon="i-lucide-user-round-plus"
        color="primary"
        variant="soft"
        size="sm"
        @click="openCreate"
      />
    </div>

    <ClientFormSlideover
      v-model:open="isFormOpen"
      :client="null"
      @saved="onSaved"
    />
  </div>
</template>
