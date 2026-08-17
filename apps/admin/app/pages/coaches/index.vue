<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CoachListItem, CoachStatus, ListCoachesQuery } from '@hxroom/shared'

// Coach-Liste (Funktion 01, doc/funktionen/backoffice-betreiber.md).
//
// Die im Fachdokument genannte Plan-Spalte fehlt bewusst: Es gibt im Datenmodell weder
// Subscription-Tabelle noch Trial-Feld, sie käme mit der Billing-Phase. Der Status hier ist
// deshalb reiner Kontostatus (aktiv / unbestätigt / gesperrt), keine Plan-Aussage.

const { $api } = useApi()

const coaches = ref<CoachListItem[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)

const search = ref('')
const status = ref<CoachStatus | 'all'>('all')
const sort = ref<ListCoachesQuery['sort']>('registeredAt')
const order = ref<ListCoachesQuery['order']>('desc')

const statusItems = [
  { label: 'Alle Status', value: 'all' },
  { label: 'Aktiv', value: 'active' },
  { label: 'Unbestätigt', value: 'pending' },
  { label: 'Gesperrt', value: 'suspended' },
]

const STATUS_LABELS: Record<CoachStatus, string> = {
  active: 'Aktiv',
  pending: 'Unbestätigt',
  suspended: 'Gesperrt',
}

const STATUS_COLORS: Record<CoachStatus, 'success' | 'warning' | 'error'> = {
  active: 'success',
  pending: 'warning',
  suspended: 'error',
}

async function loadCoaches() {
  loading.value = true
  loadError.value = null
  try {
    coaches.value = await $api<CoachListItem[]>('/admin/coaches', {
      query: {
        q: search.value || undefined,
        status: status.value === 'all' ? undefined : status.value,
        sort: sort.value,
        order: order.value,
      },
    })
  } catch {
    loadError.value = 'Coachs konnten nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

await loadCoaches()

// Handgerollt statt useDebounceFn: VueUse ist nur eine transitive Abhängigkeit von
// @nuxt/ui und in der package.json dieser App nicht deklariert – darauf darf sich
// App-Code nicht verlassen.
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(search, () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(loadCoaches, 300)
})
onBeforeUnmount(() => clearTimeout(searchTimer))

// Status, Sortierung und Richtung wirken sofort – sie entstehen durch einen Klick,
// nicht durch Tippen.
watch([status, sort, order], loadCoaches)

// Sortierung serverseitig: Ein Client-Sort ordnete nur das, was `limit` gerade
// durchgelassen hat, und wäre bei wachsender Coach-Zahl stillschweigend falsch.
function toggleSort(column: ListCoachesQuery['sort']) {
  if (sort.value === column) {
    order.value = order.value === 'asc' ? 'desc' : 'asc'
    return
  }
  sort.value = column
  // Namen liest man von A an, Zahlen und Daten interessieren am oberen Ende zuerst.
  order.value = column === 'name' || column === 'email' ? 'asc' : 'desc'
}

function sortIcon(column: ListCoachesQuery['sort']) {
  if (sort.value !== column) return 'i-lucide-chevrons-up-down'
  return order.value === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
}

const dateFormatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso))
}

const { public: { rootDomain } } = useRuntimeConfig()

const hasFilter = computed(() => Boolean(search.value) || status.value !== 'all')

const columns: TableColumn<CoachListItem>[] = [
  { accessorKey: 'name', header: 'Coach' },
  { accessorKey: 'subdomain', header: 'Subdomain' },
  { accessorKey: 'registeredAt', header: 'Registriert' },
  { accessorKey: 'clientCount', header: 'Klienten' },
  { accessorKey: 'sessionCount', header: 'Sitzungen' },
  { accessorKey: 'status', header: 'Status' },
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      title="Coachs"
      description="Alle registrierten Coachs der Plattform."
    />

    <div>
      <div class="flex items-center justify-between gap-4 mb-4">
        <div class="flex items-center gap-3">
          <UInput
            v-model="search"
            placeholder="Name, E-Mail oder Subdomain"
            icon="i-lucide-search"
            class="w-full max-w-xs"
            :ui="{ base: 'bg-white dark:bg-neutral-800' }"
          />
          <USelect
            v-model="status"
            :items="statusItems"
            value-key="value"
            class="w-44"
            :ui="{ base: 'bg-white dark:bg-neutral-800' }"
          />
        </div>
        <p v-if="!loading" class="text-sm text-muted shrink-0">
          {{ coaches.length }} {{ coaches.length === 1 ? 'Coach' : 'Coachs' }}
        </p>
      </div>

      <p v-if="loadError" class="text-sm text-error mb-4">{{ loadError }}</p>

      <div class="rounded-xl border border-default bg-white dark:bg-neutral-900 overflow-hidden">
        <UTable
          :data="coaches"
          :columns="columns"
          :loading="loading"
        >
          <template #name-header>
            <UButton
              label="Coach"
              :trailing-icon="sortIcon('name')"
              color="neutral"
              variant="ghost"
              size="xs"
              class="-mx-2"
              @click="toggleSort('name')"
            />
          </template>

          <template #registeredAt-header>
            <UButton
              label="Registriert"
              :trailing-icon="sortIcon('registeredAt')"
              color="neutral"
              variant="ghost"
              size="xs"
              class="-mx-2"
              @click="toggleSort('registeredAt')"
            />
          </template>

          <template #sessionCount-header>
            <UButton
              label="Sitzungen"
              :trailing-icon="sortIcon('sessionCount')"
              color="neutral"
              variant="ghost"
              size="xs"
              class="-mx-2"
              @click="toggleSort('sessionCount')"
            />
          </template>

          <!-- Name und E-Mail in einer Zelle: spart eine Spalte, ohne dass die
               Adresse verloren geht – sie ist die Kennung, nach der gesucht wird. -->
          <template #name-cell="{ row }">
            <div class="flex flex-col">
              <span class="font-medium text-highlighted">{{ row.original.name }}</span>
              <span class="text-sm text-muted">{{ row.original.email }}</span>
            </div>
          </template>

          <template #subdomain-cell="{ row }">
            <span v-if="row.original.subdomain" class="text-sm text-muted">
              {{ row.original.subdomain }}.{{ rootDomain }}
            </span>
            <span v-else class="text-sm text-dimmed">—</span>
          </template>

          <template #registeredAt-cell="{ row }">
            <span class="text-sm">{{ formatDate(row.original.registeredAt) }}</span>
          </template>

          <template #clientCount-cell="{ row }">
            <span class="tabular-nums">{{ row.original.clientCount }}</span>
          </template>

          <template #sessionCount-cell="{ row }">
            <span class="tabular-nums">{{ row.original.sessionCount }}</span>
          </template>

          <template #status-cell="{ row }">
            <UBadge
              :color="STATUS_COLORS[row.original.status]"
              variant="subtle"
            >
              {{ STATUS_LABELS[row.original.status] }}
            </UBadge>
          </template>

          <template #empty>
            <div class="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <UIcon name="i-lucide-users" class="size-6 text-muted" />
              <p class="text-sm text-muted">
                {{ hasFilter ? 'Kein Coach gefunden.' : 'Noch keine Coachs registriert.' }}
              </p>
            </div>
          </template>
        </UTable>
      </div>
    </div>
  </div>
</template>
