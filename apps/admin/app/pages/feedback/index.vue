<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { FEEDBACK_CATEGORIES, FEEDBACK_CATEGORY_LABELS, type FeedbackCategory, type FeedbackItem } from '@hxroom/shared'

// Rückmeldungen über den Feedback-Knopf der Coach-App (phase5-umsetzungsplan.md, 7a).
// Jede Einsendung geht zusätzlich per Mail an FEEDBACK_EMAIL. Hier geht keine verloren.

const { $api } = useApi()

const items = ref<FeedbackItem[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const category = ref<FeedbackCategory | 'all'>('all')

const categoryItems = [
  { label: 'Alle Arten', value: 'all' },
  ...FEEDBACK_CATEGORIES.map((value) => ({ label: FEEDBACK_CATEGORY_LABELS[value], value })),
]

const CATEGORY_COLORS: Record<FeedbackCategory, 'error' | 'info' | 'neutral'> = {
  problem: 'error',
  idea: 'info',
  other: 'neutral',
}

async function loadFeedback() {
  loading.value = true
  loadError.value = null
  try {
    items.value = await $api<FeedbackItem[]>('/admin/feedback', {
      query: { category: category.value === 'all' ? undefined : category.value },
    })
  } catch {
    loadError.value = 'Feedback konnte nicht geladen werden.'
  } finally {
    loading.value = false
  }
}

await loadFeedback()
watch(category, loadFeedback)

// Volltext im Fenster: In der Tabelle steht die Nachricht auf drei Zeilen gekürzt.
const selected = ref<FeedbackItem | null>(null)
const detailOpen = ref(false)

function openDetail(item: FeedbackItem) {
  selected.value = item
  detailOpen.value = true
}

// Löschen ist endgültig, deshalb immer mit Rückfrage – aus der Zeile wie aus dem Fenster.
const toast = useToast()
const deleteTarget = ref<FeedbackItem | null>(null)
const confirmOpen = ref(false)
const deleting = ref(false)

function askDelete(item: FeedbackItem) {
  deleteTarget.value = item
  confirmOpen.value = true
}

async function confirmDelete() {
  const target = deleteTarget.value
  if (!target) return
  deleting.value = true
  try {
    await $api(`/admin/feedback/${target.id}`, { method: 'DELETE' })
    items.value = items.value.filter((item) => item.id !== target.id)
    confirmOpen.value = false
    if (selected.value?.id === target.id) detailOpen.value = false
    toast.add({ title: 'Feedback gelöscht', icon: 'i-lucide-check', color: 'success' })
  } catch {
    toast.add({ title: 'Löschen fehlgeschlagen', description: 'Bitte versuch es noch einmal.', color: 'error' })
  } finally {
    deleting.value = false
  }
}

const dateFormatter = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
})
function formatDate(iso: string) {
  return dateFormatter.format(new Date(iso))
}

const columns: TableColumn<FeedbackItem>[] = [
  { accessorKey: 'createdAt', header: 'Eingegangen' },
  { accessorKey: 'coachName', header: 'Coach' },
  { accessorKey: 'category', header: 'Art' },
  { accessorKey: 'page', header: 'Seite' },
  { accessorKey: 'message', header: 'Nachricht' },
  { id: 'actions', header: '' },
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <PageHeader
      title="Feedback"
      description="Rückmeldungen der Coachs über den Feedback-Knopf, neueste zuerst."
    />

    <div>
      <div class="flex items-center justify-between gap-4 mb-4">
        <USelect
          v-model="category"
          :items="categoryItems"
          value-key="value"
          class="w-44"
          :ui="{ base: 'bg-white dark:bg-neutral-800' }"
        />
        <p v-if="!loading" class="text-sm text-muted shrink-0">
          {{ items.length }} {{ items.length === 1 ? 'Eintrag' : 'Einträge' }}
        </p>
      </div>

      <p v-if="loadError" class="text-sm text-error mb-4">{{ loadError }}</p>

      <div class="rounded-xl border border-default bg-white dark:bg-neutral-900 overflow-hidden">
        <UTable :data="items" :columns="columns" :loading="loading">
          <template #createdAt-cell="{ row }">
            <span class="text-sm whitespace-nowrap tabular-nums">{{ formatDate(row.original.createdAt) }}</span>
          </template>

          <template #coachName-cell="{ row }">
            <div class="flex flex-col">
              <span class="font-medium text-highlighted">{{ row.original.coachName }}</span>
              <ULink :to="`mailto:${row.original.coachEmail}`" class="text-sm text-muted hover:text-primary">
                {{ row.original.coachEmail }}
              </ULink>
            </div>
          </template>

          <template #category-cell="{ row }">
            <UBadge :color="CATEGORY_COLORS[row.original.category]" variant="subtle">
              {{ FEEDBACK_CATEGORY_LABELS[row.original.category] }}
            </UBadge>
          </template>

          <template #page-cell="{ row }">
            <UTooltip :text="row.original.userAgent ?? 'Browser unbekannt'">
              <code class="text-xs text-muted">{{ row.original.page }}</code>
            </UTooltip>
          </template>

          <template #message-cell="{ row }">
            <button
              type="button"
              class="block text-left min-w-72 max-w-xl rounded-md -mx-1.5 px-1.5 py-1 hover:bg-elevated transition-colors cursor-pointer"
              :aria-label="`Feedback von ${row.original.coachName} ganz lesen`"
              @click="openDetail(row.original)"
            >
              <span class="text-sm whitespace-pre-line line-clamp-3">{{ row.original.message }}</span>
            </button>
          </template>

          <template #actions-cell="{ row }">
            <div class="flex justify-end">
              <UTooltip text="Löschen">
                <UButton
                  icon="i-lucide-trash-2"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  :aria-label="`Feedback von ${row.original.coachName} löschen`"
                  @click="askDelete(row.original)"
                />
              </UTooltip>
            </div>
          </template>

          <template #empty>
            <div class="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <UIcon name="i-lucide-message-square-heart" class="size-6 text-muted" />
              <p class="text-sm text-muted">Noch kein Feedback eingegangen.</p>
            </div>
          </template>
        </UTable>
      </div>
    </div>

    <UModal
      v-model:open="detailOpen"
      :title="selected ? `Feedback von ${selected.coachName}` : 'Feedback'"
      :description="selected ? formatDate(selected.createdAt) : undefined"
      :ui="{ content: 'sm:max-w-2xl' }"
    >
      <template #body>
        <div v-if="selected" class="flex flex-col gap-5">
          <UBadge :color="CATEGORY_COLORS[selected.category]" variant="subtle" class="self-start">
            {{ FEEDBACK_CATEGORY_LABELS[selected.category] }}
          </UBadge>

          <p class="text-sm text-highlighted whitespace-pre-line break-words">{{ selected.message }}</p>

          <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm border-t border-default pt-4">
            <dt class="text-muted">Coach</dt>
            <dd>
              {{ selected.coachName }} ·
              <ULink :to="`mailto:${selected.coachEmail}`" class="hover:text-primary">{{ selected.coachEmail }}</ULink>
            </dd>
            <dt class="text-muted">Seite</dt>
            <dd><code class="text-xs">{{ selected.page }}</code></dd>
            <dt class="text-muted">Browser</dt>
            <dd class="text-xs text-muted break-all">{{ selected.userAgent ?? 'unbekannt' }}</dd>
          </dl>
        </div>
      </template>

      <template #footer>
        <div class="flex gap-3 justify-between w-full">
          <UButton
            icon="i-lucide-trash-2"
            color="error"
            variant="ghost"
            label="Löschen"
            @click="selected && askDelete(selected)"
          />
          <UButton color="neutral" variant="outline" label="Schließen" @click="detailOpen = false" />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="confirmOpen"
      title="Feedback löschen?"
      :description="deleteTarget ? `Das Feedback von ${deleteTarget.coachName} wird endgültig gelöscht.` : undefined"
    >
      <template #footer>
        <div class="flex gap-3 justify-end w-full">
          <UButton color="neutral" variant="outline" label="Abbrechen" @click="confirmOpen = false" />
          <UButton color="error" icon="i-lucide-trash-2" label="Löschen" :loading="deleting" @click="confirmDelete" />
        </div>
      </template>
    </UModal>
  </div>
</template>
