<script setup lang="ts">
import type { AvailabilityExceptionResponse, CoachBookingResponse } from '@hxroom/shared'

/**
 * Ausnahme anlegen oder bearbeiten (doc/produkt/funktionen/kalenderabgleich.md §2). Wird von
 * der Seite „Verfügbarkeit“ und aus der Wochenansicht unter „Termine“ geöffnet.
 *
 * Eine Freigabe liegt an genau einem Tag und hat immer Uhrzeiten – ganztägig oder über
 * mehrere Tage ergäbe sie Slots rund um die Uhr. Sperren dürfen beides.
 */
const props = defineProps<{
  /** Zu bearbeitende Ausnahme; null legt eine neue an. */
  exception: AvailabilityExceptionResponse | null
  /** Vorbelegung beim Anlegen, z. B. „Zeit sperren“ aus der Wochenansicht. */
  preset?: { kind?: AvailabilityExceptionResponse['kind'], start?: Date } | null
}>()

const emit = defineEmits<{
  saved: [exception: AvailabilityExceptionResponse]
  deleted: [id: string]
}>()

const open = defineModel<boolean>('open', { required: true })

const { $api } = useApi()

const inputUi = { base: 'bg-white dark:bg-elevated' }

const KIND_ITEMS = [
  { label: 'Sperren', description: 'Keine Buchungen in diesem Zeitraum', value: 'blocked' },
  { label: 'Freigeben', description: 'Zusätzlich buchbar, auch außerhalb deiner Zeiten', value: 'available' },
]

interface Draft {
  kind: AvailabilityExceptionResponse['kind']
  allDay: boolean
  startDate: string
  startTime: string
  endDate: string
  endTime: string
  note: string
}

const draft = reactive<Draft>(emptyDraft())
const saving = ref(false)
const saveError = ref<string | null>(null)
const confirmingDelete = ref(false)

function pad(n: number): string {
  return String(n).padStart(2, '0')
}
function toDateInput(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
function toTimeInput(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
/** "2026-11-17" + "10:00" → Zeitpunkt in Ortszeit; ohne Offset liest der Browser lokal. */
function combine(dateValue: string, timeValue: string): Date | null {
  if (!dateValue || !timeValue) return null
  const result = new Date(`${dateValue}T${timeValue}`)
  return Number.isNaN(result.getTime()) ? null : result
}
function addDays(dateValue: string, days: number): string {
  const d = new Date(`${dateValue}T00:00`)
  d.setDate(d.getDate() + days)
  return toDateInput(d)
}

function emptyDraft(): Draft {
  const kind = props.preset?.kind ?? 'blocked'
  // Ohne Vorgabe: die nächste volle Stunde, eine Stunde lang.
  const start = props.preset?.start ? new Date(props.preset.start) : new Date()
  if (!props.preset?.start) start.setHours(start.getHours() + 1, 0, 0, 0)
  const end = new Date(start.getTime() + 60 * 60_000)
  return {
    kind,
    allDay: false,
    startDate: toDateInput(start),
    startTime: toTimeInput(start),
    endDate: toDateInput(end),
    endTime: toTimeInput(end),
    note: '',
  }
}

function fromException(e: AvailabilityExceptionResponse): Draft {
  const start = new Date(e.start)
  const end = new Date(e.end)
  return {
    kind: e.kind,
    allDay: e.allDay,
    startDate: toDateInput(start),
    startTime: e.allDay ? '09:00' : toTimeInput(start),
    endDate: e.allDay ? toDateInput(lastDayOfAllDay(e)) : toDateInput(end),
    endTime: e.allDay ? '17:00' : toTimeInput(end),
    note: e.note ?? '',
  }
}

watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(draft, props.exception ? fromException(props.exception) : emptyDraft())
  saveError.value = null
  confirmingDelete.value = false
}, { immediate: true })

// Eine Freigabe endet am selben Tag; ganztägig gibt es nur bei Sperren.
watch(() => draft.kind, (kind) => {
  if (kind === 'available') draft.allDay = false
})

/** Der Zeitraum, wie er gespeichert wird. Ganztägig: 00:00 des ersten bis 00:00 nach dem letzten Tag. */
const range = computed<{ start: Date, end: Date } | null>(() => {
  if (draft.kind === 'blocked' && draft.allDay) {
    const start = combine(draft.startDate, '00:00')
    const end = draft.endDate ? combine(addDays(draft.endDate, 1), '00:00') : null
    return start && end ? { start, end } : null
  }
  const endDate = draft.kind === 'available' ? draft.startDate : draft.endDate
  const start = combine(draft.startDate, draft.startTime)
  const end = combine(endDate, draft.endTime)
  return start && end ? { start, end } : null
})

const rangeError = computed(() => {
  if (!range.value) return null
  if (range.value.end <= range.value.start) return 'Das Ende muss nach dem Beginn liegen.'
  if (range.value.end.getTime() <= Date.now()) return 'Der Zeitraum liegt schon in der Vergangenheit.'
  return null
})

// Termine im gesperrten Zeitraum: Sie bleiben bestehen, der Coach soll es aber vorher wissen.
// Die API filtert auf den Beginn – zwölf Stunden Vorlauf fangen auch Termine, die vorher
// beginnen und hineinreichen.
const affectedBookings = ref<CoachBookingResponse[]>([])
let lookupTimer: ReturnType<typeof setTimeout> | undefined
watch([range, () => draft.kind, open], () => {
  clearTimeout(lookupTimer)
  const current = range.value
  if (!open.value || draft.kind !== 'blocked' || !current || rangeError.value) {
    affectedBookings.value = []
    return
  }
  lookupTimer = setTimeout(async () => {
    try {
      const from = new Date(current.start.getTime() - 12 * 60 * 60_000)
      const list = await $api<CoachBookingResponse[]>('/bookings', {
        query: { from: from.toISOString(), to: current.end.toISOString() },
      })
      affectedBookings.value = list.filter(b =>
        b.status !== 'cancelled'
        && new Date(b.start) < current.end
        && new Date(b.end) > current.start,
      )
    } catch {
      affectedBookings.value = []
    }
  }, 300)
}, { immediate: true })

const bookingLineFormatter = new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

async function save() {
  if (!range.value || rangeError.value) return
  saving.value = true
  saveError.value = null
  const body = {
    kind: draft.kind,
    start: range.value.start.toISOString(),
    end: range.value.end.toISOString(),
    allDay: draft.kind === 'blocked' && draft.allDay,
    note: draft.note.trim() || null,
  }
  try {
    const saved = props.exception
      ? await $api<AvailabilityExceptionResponse>(`/availability-exceptions/${props.exception.id}`, { method: 'PATCH', body })
      : await $api<AvailabilityExceptionResponse>('/availability-exceptions', { method: 'POST', body })
    emit('saved', saved)
    open.value = false
  } catch (err: any) {
    saveError.value = err?.data?.errors?.[0]?.message ?? 'Die Ausnahme konnte nicht gespeichert werden.'
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.exception) return
  try {
    await $api(`/availability-exceptions/${props.exception.id}`, { method: 'DELETE' })
    emit('deleted', props.exception.id)
    open.value = false
  } catch {
    saveError.value = 'Die Ausnahme konnte nicht gelöscht werden.'
    confirmingDelete.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" :title="exception ? 'Ausnahme bearbeiten' : 'Neue Ausnahme'">
    <template #body>
      <!-- Echtes form-Element, damit Enter speichert; der Knopf im Footer hängt über das form-Attribut daran. -->
      <form id="availability-exception-form" class="flex flex-col gap-6" @submit.prevent="save">
        <URadioGroup
          v-model="draft.kind"
          :items="KIND_ITEMS"
          orientation="horizontal"
          variant="table"
          :ui="{ fieldset: 'w-full', item: 'flex-1' }"
        />

        <USwitch v-if="draft.kind === 'blocked'" v-model="draft.allDay" label="Ganztägig" />

        <!-- Sperre, ganztägig: nur Tage -->
        <div v-if="draft.kind === 'blocked' && draft.allDay" class="flex items-end gap-4">
          <UFormField label="Von" class="flex-1">
            <UInput v-model="draft.startDate" type="date" class="w-full" :ui="inputUi" />
          </UFormField>
          <UFormField label="Bis einschließlich" class="flex-1">
            <UInput v-model="draft.endDate" type="date" class="w-full" :ui="inputUi" />
          </UFormField>
        </div>

        <!-- Sperre mit Uhrzeit: Beginn und Ende dürfen an verschiedenen Tagen liegen -->
        <template v-else-if="draft.kind === 'blocked'">
          <UFormField label="Beginn">
            <div class="flex gap-2">
              <UInput v-model="draft.startDate" type="date" class="flex-1" :ui="inputUi" />
              <UInput v-model="draft.startTime" type="time" step="900" class="w-32" :ui="inputUi" />
            </div>
          </UFormField>
          <UFormField label="Ende">
            <div class="flex gap-2">
              <UInput v-model="draft.endDate" type="date" class="flex-1" :ui="inputUi" />
              <UInput v-model="draft.endTime" type="time" step="900" class="w-32" :ui="inputUi" />
            </div>
          </UFormField>
        </template>

        <!-- Freigabe: ein Tag, von–bis -->
        <template v-else>
          <UFormField label="Datum">
            <UInput v-model="draft.startDate" type="date" class="w-full" :ui="inputUi" />
          </UFormField>
          <div class="flex items-end gap-4">
            <UFormField label="Von" class="flex-1">
              <UInput v-model="draft.startTime" type="time" step="900" class="w-full" :ui="inputUi" />
            </UFormField>
            <UFormField label="Bis" class="flex-1">
              <UInput v-model="draft.endTime" type="time" step="900" class="w-full" :ui="inputUi" />
            </UFormField>
          </div>
        </template>

        <UFormField label="Notiz" hint="Optional, nur für dich">
          <UInput
            v-model="draft.note"
            :placeholder="draft.kind === 'blocked' ? 'z. B. Urlaub' : 'z. B. Samstagstermine'"
            maxlength="200"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>

        <p v-if="rangeError" class="text-sm text-error">{{ rangeError }}</p>

        <UAlert
          v-if="affectedBookings.length > 0"
          icon="i-lucide-calendar-check"
          color="neutral"
          variant="subtle"
          :title="affectedBookings.length === 1 ? 'In diesem Zeitraum liegt ein Termin. Er bleibt bestehen.' : `In diesem Zeitraum liegen ${affectedBookings.length} Termine. Sie bleiben bestehen.`"
        >
          <template #description>
            <ul class="mt-1 flex flex-col gap-0.5">
              <li v-for="booking in affectedBookings" :key="booking.id">
                <NuxtLink :to="`/bookings/${booking.id}`" class="hover:underline">
                  {{ bookingLineFormatter.format(new Date(booking.start)) }} · {{ booking.clientName }}
                </NuxtLink>
              </li>
            </ul>
          </template>
        </UAlert>

        <UAlert v-if="saveError" icon="i-lucide-circle-x" color="error" variant="soft" :description="saveError" />
      </form>
    </template>

    <template #footer>
      <div v-if="confirmingDelete" class="flex items-center justify-between w-full">
        <span class="text-sm text-muted">Ausnahme wirklich löschen?</span>
        <div class="flex items-center gap-2">
          <UButton label="Abbrechen" color="neutral" variant="ghost" size="sm" @click="confirmingDelete = false" />
          <UButton label="Löschen" color="error" variant="solid" size="sm" @click="remove" />
        </div>
      </div>
      <div v-else class="flex items-center justify-between w-full">
        <UButton v-if="exception" label="Löschen" icon="i-lucide-trash-2" color="error" variant="ghost" @click="confirmingDelete = true" />
        <div v-else />
        <div class="flex items-center gap-2">
          <UButton label="Abbrechen" color="neutral" variant="ghost" @click="open = false" />
          <UButton
            :label="exception ? 'Speichern' : 'Anlegen'"
            type="submit"
            form="availability-exception-form"
            color="primary"
            :loading="saving"
            :disabled="!range || !!rangeError"
          />
        </div>
      </div>
    </template>
  </USlideover>
</template>
