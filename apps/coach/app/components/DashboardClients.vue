<script setup lang="ts">
import type { ClientListItem } from '@hxroom/shared'

const props = defineProps<{ clients: ClientListItem[] }>()
const emit = defineEmits<{ createClient: [] }>()

const rows = computed(() => recentClients(props.clients))
</script>

<template>
  <SettingsSection title="Klienten">
    <template #actions>
      <UButton to="/clients" label="Alle anzeigen" trailing-icon="i-lucide-arrow-right" color="neutral" variant="link" size="sm" class="-my-1" />
    </template>

    <div v-if="rows.length" class="flex flex-col gap-1 -my-2">
      <NuxtLink
        v-for="client in rows"
        :key="client.id"
        :to="`/clients/${client.id}`"
        class="flex items-center gap-3 -mx-2 px-2 py-2 rounded-lg transition-colors hover:bg-elevated"
      >
        <span class="size-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
          <UIcon name="i-lucide-user-round" class="size-4 text-primary" />
        </span>

        <span class="flex-1 min-w-0">
          <span class="block text-sm font-medium text-highlighted truncate">{{ client.name }}</span>
          <span v-if="client.nextSessionAt" class="block text-sm text-primary truncate">
            Nächster: {{ formatShortDate(client.nextSessionAt) }}
          </span>
          <span v-else-if="client.lastSessionAt" class="block text-sm text-muted truncate">
            Zuletzt: {{ formatShortDate(client.lastSessionAt) }}
          </span>
          <span v-else class="block text-sm text-muted truncate">Noch kein Termin</span>
        </span>

        <span class="hidden sm:block text-sm text-muted shrink-0 tabular-nums">
          {{ formatSessionCount(client.sessionCount) }}
        </span>
      </NuxtLink>
    </div>

    <div v-else class="flex flex-col items-center gap-3 py-4 text-center">
      <p class="text-sm text-muted">
        Noch keine Klienten. Sie entstehen automatisch, sobald ein Klient eine Buchung bestätigt.
      </p>
      <UButton
        label="Klient anlegen"
        icon="i-lucide-user-round-plus"
        color="primary"
        variant="soft"
        size="sm"
        @click="emit('createClient')"
      />
    </div>
  </SettingsSection>
</template>
