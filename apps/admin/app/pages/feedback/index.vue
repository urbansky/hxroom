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
            <p class="text-sm whitespace-pre-line min-w-72 max-w-xl">{{ row.original.message }}</p>
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
  </div>
</template>
