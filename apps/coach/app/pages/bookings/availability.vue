<script setup lang="ts">
import type { AvailabilitySlotResponse } from '@hxroom/shared'

definePageMeta({ middleware: 'auth' })

const { $api } = useApi()

const WEEKDAYS = [
  { value: 0, label: 'Montag', short: 'Mo' },
  { value: 1, label: 'Dienstag', short: 'Di' },
  { value: 2, label: 'Mittwoch', short: 'Mi' },
  { value: 3, label: 'Donnerstag', short: 'Do' },
  { value: 4, label: 'Freitag', short: 'Fr' },
  { value: 5, label: 'Samstag', short: 'Sa' },
  { value: 6, label: 'Sonntag', short: 'So' },
] as const

const weekdaySelectItems = WEEKDAYS.map(day => ({ label: day.label, value: day.value }))

const tabItems = [
  { label: 'Verfügbarkeit', value: 'availability' },
  { label: 'Einstellungen', value: 'settings' },
  { label: 'Kalendersync', value: 'sync' },
]
const activeTab = ref('availability')

const viewMode = ref<'list' | 'calendar'>('list')

const rows = ref<AvailabilitySlotResponse[]>([])

const groupedByWeekday = computed(() => {
  const map = new Map<number, AvailabilitySlotResponse[]>()
  for (const day of WEEKDAYS) map.set(day.value, [])
  for (const slot of rows.value) map.get(slot.weekday)?.push(slot)
  return map
})

await useFetch<AvailabilitySlotResponse[]>('/availability-slots', {
  $fetch: $api,
  onResponse({ response }) {
    rows.value = response._data as AvailabilitySlotResponse[]
  },
})

// --- Anlegen/Bearbeiten-Drawer ---
interface SlotDraft {
  id: string | null
  weekday: number
  startTime: string
  endTime: string
}

function emptyDraft(weekday = 0): SlotDraft {
  return { id: null, weekday, startTime: '09:00', endTime: '17:00' }
}

const isDrawerOpen = ref(false)
const confirmingDelete = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)
const draft = reactive<SlotDraft>(emptyDraft())

watch(isDrawerOpen, (open) => {
  if (!open) {
    confirmingDelete.value = false
    saveError.value = null
  }
})

function openCreate(weekday = 0) {
  Object.assign(draft, emptyDraft(weekday))
  isDrawerOpen.value = true
}

function openEdit(slot: AvailabilitySlotResponse) {
  Object.assign(draft, { id: slot.id, weekday: slot.weekday, startTime: slot.startTime, endTime: slot.endTime })
  isDrawerOpen.value = true
}

async function saveDraft() {
  if (!draft.startTime || !draft.endTime) return
  saveError.value = null
  saving.value = true
  const body = {
    weekday: draft.weekday,
    startTime: draft.startTime,
    endTime: draft.endTime,
  }
  try {
    if (draft.id) {
      const updated = await $api<AvailabilitySlotResponse>(`/availability-slots/${draft.id}`, { method: 'PATCH', body })
      const idx = rows.value.findIndex(r => r.id === draft.id)
      if (idx !== -1) rows.value[idx] = updated
    } else {
      const created = await $api<AvailabilitySlotResponse>('/availability-slots', { method: 'POST', body })
      rows.value.push(created)
    }
    isDrawerOpen.value = false
  } catch (err: any) {
    saveError.value = err?.statusCode === 409
      ? 'Diese Zeit überschneidet sich mit einer bestehenden Verfügbarkeit an diesem Wochentag.'
      : (err?.data?.message ?? 'Verfügbarkeit konnte nicht gespeichert werden.')
  } finally {
    saving.value = false
  }
}

async function deleteDraft() {
  if (!draft.id) return
  await $api(`/availability-slots/${draft.id}`, { method: 'DELETE' })
  rows.value = rows.value.filter(r => r.id !== draft.id)
  isDrawerOpen.value = false
}

// --- Kalenderansicht: Monatsraster (reine Projektion der wöchentlichen Regeln,
// noch keine Ausnahmen für einzelne Tage – siehe doc/funktionen/angebote-verfuegbarkeiten.md) ---
const viewDate = ref(new Date())

const monthLabel = computed(() => {
  const label = viewDate.value.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
})

function toMondayFirstWeekday(date: Date) {
  return (date.getDay() + 6) % 7
}

const monthGrid = computed(() => {
  const year = viewDate.value.getFullYear()
  const month = viewDate.value.getMonth()
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)

  const gridStart = new Date(first)
  gridStart.setDate(gridStart.getDate() - toMondayFirstWeekday(first))
  const gridEnd = new Date(last)
  gridEnd.setDate(gridEnd.getDate() + (6 - toMondayFirstWeekday(last)))

  const today = new Date()
  const days: { date: Date; inCurrentMonth: boolean; weekday: number; isToday: boolean }[] = []
  const cursor = new Date(gridStart)
  while (cursor <= gridEnd) {
    days.push({
      date: new Date(cursor),
      inCurrentMonth: cursor.getMonth() === month,
      weekday: toMondayFirstWeekday(cursor),
      isToday: cursor.toDateString() === today.toDateString(),
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return days
})

function prevMonth() {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() - 1, 1)
}
function nextMonth() {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 1)
}
function goToday() {
  viewDate.value = new Date()
}
</script>

<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto w-full">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Verfügbarkeit</h1>
    <p class="text-muted mb-6">Lege fest, an welchen Wochentagen und Uhrzeiten Klienten bei dir buchen können.</p>

    <UTabs :items="tabItems" v-model="activeTab" :content="false" class="mb-6" />

    <template v-if="activeTab === 'availability'">
      <div class="flex items-center justify-between gap-4 mb-4">
        <div class="inline-flex items-center rounded-lg border border-default p-0.5 bg-neutral-50 dark:bg-neutral-800/50">
          <button
            type="button"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
            :class="viewMode === 'list' ? 'bg-white dark:bg-neutral-900 text-highlighted shadow-sm' : 'text-muted hover:text-highlighted'"
            @click="viewMode = 'list'"
          >
            <UIcon name="i-lucide-list" class="size-4 inline-block -mt-0.5 mr-1" />
            Liste
          </button>
          <button
            type="button"
            class="px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
            :class="viewMode === 'calendar' ? 'bg-white dark:bg-neutral-900 text-highlighted shadow-sm' : 'text-muted hover:text-highlighted'"
            @click="viewMode = 'calendar'"
          >
            <UIcon name="i-lucide-calendar-days" class="size-4 inline-block -mt-0.5 mr-1" />
            Kalender
          </button>
        </div>

        <UButton icon="i-lucide-plus" size="sm" color="primary" variant="soft" @click="openCreate()">
          Neue Verfügbarkeit
        </UButton>
      </div>

      <!-- Listenansicht: pro Wochentag -->
      <div v-if="viewMode === 'list'" class="flex flex-col gap-3">
        <div
          v-for="day in WEEKDAYS"
          :key="day.value"
          class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-4 sm:p-5"
        >
          <div class="flex items-center justify-between gap-3 mb-3">
            <h3 class="font-medium text-highlighted">{{ day.label }}</h3>
            <UButton icon="i-lucide-plus" size="xs" color="neutral" variant="ghost" @click="openCreate(day.value)">
              Zeit hinzufügen
            </UButton>
          </div>

          <div v-if="groupedByWeekday.get(day.value)?.length" class="flex flex-wrap gap-2">
            <button
              v-for="slot in groupedByWeekday.get(day.value)"
              :key="slot.id"
              type="button"
              class="px-3 py-1.5 rounded-lg border border-default bg-neutral-50 dark:bg-neutral-800/50 text-sm text-highlighted hover:border-accented transition-colors cursor-pointer"
              @click="openEdit(slot)"
            >
              {{ slot.startTime }} – {{ slot.endTime }}
            </button>
          </div>
          <p v-else class="text-sm text-muted italic">Keine Zeiten</p>
        </div>
      </div>

      <!-- Kalenderansicht: Monatsraster -->
      <div v-else class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-4 sm:p-5">
        <div class="flex items-center justify-between gap-3 mb-4">
          <h3 class="font-medium text-highlighted">{{ monthLabel }}</h3>
          <div class="flex items-center gap-1">
            <UButton icon="i-lucide-chevron-left" size="xs" color="neutral" variant="ghost" @click="prevMonth" />
            <UButton size="xs" color="neutral" variant="ghost" @click="goToday">Heute</UButton>
            <UButton icon="i-lucide-chevron-right" size="xs" color="neutral" variant="ghost" @click="nextMonth" />
          </div>
        </div>

        <div class="grid grid-cols-7 gap-1.5 mb-1.5">
          <div v-for="day in WEEKDAYS" :key="day.value" class="text-center text-xs font-medium text-muted uppercase tracking-wide py-1">
            {{ day.short }}
          </div>
        </div>

        <div class="grid grid-cols-7 gap-1.5">
          <div
            v-for="cell in monthGrid"
            :key="cell.date.toISOString()"
            role="button"
            tabindex="0"
            class="min-h-[5.5rem] rounded-lg border p-1.5 flex flex-col gap-1 text-left cursor-pointer transition-colors outline-primary/25 focus-visible:outline-3"
            :class="[
              cell.inCurrentMonth ? 'border-default hover:border-accented' : 'border-transparent opacity-40',
              cell.isToday && 'ring-1 ring-primary',
            ]"
            @click="openCreate(cell.weekday)"
            @keydown.enter="openCreate(cell.weekday)"
          >
            <span class="text-xs" :class="cell.isToday ? 'font-bold text-primary' : 'text-muted'">{{ cell.date.getDate() }}</span>
            <div class="flex flex-col gap-0.5">
              <button
                v-for="slot in groupedByWeekday.get(cell.weekday)"
                :key="slot.id"
                type="button"
                class="text-[10px] leading-tight px-1 py-0.5 rounded bg-primary/10 text-primary text-left truncate hover:bg-primary/20 transition-colors cursor-pointer"
                @click.stop="openEdit(slot)"
              >
                {{ slot.startTime }}–{{ slot.endTime }}
              </button>
            </div>
          </div>
        </div>

        <p class="text-xs text-muted mt-4">
          Zeigt deine wöchentlichen Verfügbarkeiten, projiziert auf den Monat. Ausnahmen für einzelne Tage (z. B. Urlaub) sind noch nicht möglich.
        </p>
      </div>
    </template>

    <template v-else-if="activeTab === 'settings'">
      <div class="rounded-xl border border-dashed border-default p-10 flex flex-col items-center justify-center gap-2 text-center">
        <UIcon name="i-lucide-settings-2" class="size-6 text-muted" />
        <p class="text-sm text-muted">Einstellungen wie Pufferzeit und Buchungsvorlaufzeit folgen hier in einer späteren Version.</p>
      </div>
    </template>

    <template v-else-if="activeTab === 'sync'">
      <div class="rounded-xl border border-dashed border-default p-10 flex flex-col items-center justify-center gap-2 text-center">
        <UIcon name="i-lucide-refresh-cw" class="size-6 text-muted" />
        <p class="text-sm text-muted">Kalendersync (z. B. Google Calendar, iCal) folgt hier in einer späteren Version.</p>
      </div>
    </template>

    <!-- Anlegen-/Bearbeiten-Drawer -->
    <USlideover v-model:open="isDrawerOpen" :title="draft.id ? 'Verfügbarkeit bearbeiten' : 'Neue Verfügbarkeit'">
      <template #body>
        <div class="flex flex-col gap-6">
          <UFormField label="Wochentag">
            <USelect v-model="draft.weekday" :items="weekdaySelectItems" class="w-full" />
          </UFormField>

          <div class="flex items-end gap-4">
            <UFormField label="Von" class="flex-1">
              <UInput v-model="draft.startTime" type="time" class="w-full" />
            </UFormField>
            <UFormField label="Bis" class="flex-1">
              <UInput v-model="draft.endTime" type="time" class="w-full" />
            </UFormField>
          </div>

          <p v-if="saveError" class="text-sm text-error">{{ saveError }}</p>
        </div>
      </template>

      <template #footer>
        <div v-if="confirmingDelete" class="flex items-center justify-between w-full">
          <span class="text-sm text-muted">Verfügbarkeit wirklich löschen?</span>
          <div class="flex items-center gap-2">
            <UButton label="Abbrechen" color="neutral" variant="ghost" size="sm" @click="confirmingDelete = false" />
            <UButton label="Löschen" color="error" variant="solid" size="sm" @click="deleteDraft" />
          </div>
        </div>
        <div v-else class="flex items-center justify-between w-full">
          <UButton v-if="draft.id" label="Löschen" icon="i-lucide-trash-2" color="error" variant="ghost" @click="confirmingDelete = true" />
          <div v-else />
          <div class="flex items-center gap-2">
            <UButton label="Abbrechen" color="neutral" variant="ghost" @click="isDrawerOpen = false" />
            <UButton :label="draft.id ? 'Speichern' : 'Anlegen'" color="primary" :loading="saving" @click="saveDraft" />
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
