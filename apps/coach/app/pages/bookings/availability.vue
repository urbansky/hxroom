<script setup lang="ts">
import type { AvailabilitySlotResponse, AvailabilitySettingsResponse } from '@hxroom/shared'

definePageMeta({ middleware: 'auth' })

const { $api } = useApi()

/** Nur noch für die Wochentagsauswahl im Drawer – das Raster selbst bringt seine Köpfe mit. */
const weekdaySelectItems = [
  { label: 'Montag', value: 0 },
  { label: 'Dienstag', value: 1 },
  { label: 'Mittwoch', value: 2 },
  { label: 'Donnerstag', value: 3 },
  { label: 'Freitag', value: 4 },
  { label: 'Samstag', value: 5 },
  { label: 'Sonntag', value: 6 },
]

// --ui-bg ist im Hauptbereich bewusst transluzent (siehe assets/main.css), macht
// aber das aufgeklappte Select-Dropdown schwer lesbar – hier deckend erzwingen.
const opaqueSelectContentUi = { content: 'bg-[#faf8f4] dark:bg-[#141814]' }

type TabValue = 'availability' | 'settings' | 'sync'

// Unterstrichene Tabs, nicht der Segmented-Control-Umschalter der Terminansicht:
// Dort wechselt man die Darstellung derselben Termine, hier den Bereich.
// "Zeiten" statt "Verfügbarkeit": Die Seitenüberschrift sagt bereits, worum es geht –
// der Tab muss sie nicht wiederholen.
const TAB_ITEMS = [
  { label: 'Zeiten', value: 'availability' },
  { label: 'Einstellungen', value: 'settings' },
  { label: 'Kalendersync', value: 'sync' },
]
const activeTab = ref<TabValue>('availability')

const rows = ref<AvailabilitySlotResponse[]>([])

await useFetch<AvailabilitySlotResponse[]>('/availability-slots', {
  $fetch: $api,
  onResponse({ response }) {
    rows.value = response._data as AvailabilitySlotResponse[]
  },
})

// --- Einstellungen-Tab: Pufferzeit, Buchungsvorlaufzeit & Buchungsfenster ---
const BUFFER_OPTIONS = [0, 5, 10, 15, 30].map(v => ({ label: v === 0 ? 'Kein Puffer' : `${v} Min.`, value: v }))
const LEAD_TIME_OPTIONS = [0, 1, 2, 4, 24, 48].map(v => ({
  label: v === 0 ? 'Sofort buchbar' : v < 24 ? `${v} Std.` : `${v / 24} Tag${v > 24 ? 'e' : ''}`,
  value: v,
}))
const BOOKING_WINDOW_OPTIONS = [1, 2, 3, 4, 6, 8].map(v => ({ label: v === 1 ? '1 Woche' : `${v} Wochen`, value: v }))

const settings = reactive({ bufferMinutes: 0, minLeadTimeHours: 0, bookingWindowWeeks: 2 })

type SettingsSaveStatus = 'saving' | 'saved' | 'error'
const settingsSaveStatus = ref<SettingsSaveStatus | null>(null)
const activeSettingsField = ref<keyof typeof settings | null>(null)
let settingsSavedTimer: ReturnType<typeof setTimeout> | null = null

function settingsFieldStatus(field: keyof typeof settings): SettingsSaveStatus | null {
  if (activeSettingsField.value !== field) return null
  return settingsSaveStatus.value
}

await useFetch<AvailabilitySettingsResponse>('/availability-settings', {
  $fetch: $api,
  onResponse({ response }) {
    Object.assign(settings, response._data)
  },
})

async function saveSettings(field: keyof typeof settings) {
  if (settingsSavedTimer) clearTimeout(settingsSavedTimer)
  activeSettingsField.value = field
  settingsSaveStatus.value = 'saving'
  try {
    await $api('/availability-settings', {
      method: 'PATCH',
      body: { bufferMinutes: settings.bufferMinutes, minLeadTimeHours: settings.minLeadTimeHours, bookingWindowWeeks: settings.bookingWindowWeeks },
    })
    settingsSaveStatus.value = 'saved'
    settingsSavedTimer = setTimeout(() => { settingsSaveStatus.value = null }, 3000)
  } catch {
    settingsSaveStatus.value = 'error'
  }
}

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
</script>

<template>
  <div class="p-4 sm:p-6 max-w-3xl mx-auto w-full">
    <h1 class="font-serif text-3xl text-highlighted mb-2">Verfügbarkeit</h1>
    <p class="text-muted mb-6">Lege fest, an welchen Wochentagen und Uhrzeiten Klienten bei dir buchen können.</p>

    <!-- Die Trennlinie trägt die ganze Zeile, nicht nur die Tabs: Sonst bricht sie unter
         dem letzten Tab ab und der Button steht ohne Bezug daneben. items-end setzt Tabs
         und Button auf dieselbe Grundlinie. -->
    <div class="flex items-end justify-between gap-4 mb-6 border-b border-default">
      <!-- Die Linie der Tabs entfällt dafür (Theme: list = "border-b -mb-px"); mb-0 hebt
           den Versatz mit auf, damit der Indikator genau auf der Linie sitzt. -->
      <UTabs
        :items="TAB_ITEMS"
        :model-value="activeTab"
        variant="link"
        :content="false"
        :ui="{ list: 'border-b-0 mb-0' }"
        @update:model-value="activeTab = $event as TabValue"
      />

      <!-- Nur im Verfügbarkeits-Tab, aber ohne Sprung beim Tabwechsel: Die Höhe der
           Zeile gibt der Umschalter vor. Gefüllt wie "Klient anlegen" in der
           Klientenliste – die einzige Aktion der Seite trägt die sonst leise Zeile. -->
      <UButton
        v-if="activeTab === 'availability'"
        icon="i-lucide-plus"
        size="sm"
        color="primary"
        class="mb-2"
        @click="openCreate()"
      >
        Zeit hinzufügen
      </UButton>
    </div>

    <template v-if="activeTab === 'availability'">
      <AvailabilityWeek :slots="rows" @select="openEdit" @create="openCreate" />
    </template>

    <template v-else-if="activeTab === 'settings'">
      <SettingsSection title="Zeitslot-Einstellungen" description="Diese Einstellungen gelten global für alle deine Angebote.">
        <div class="flex flex-col gap-5 max-w-sm my-4">
          <UFormField label="Pufferzeit zwischen Terminen" description="Z.B. für Vorbereitungen oder als Puffer, falls ein Termin länger dauert.">
            <template v-if="settingsFieldStatus('bufferMinutes')" #hint>
              <SaveStatusHint :status="settingsFieldStatus('bufferMinutes')" />
            </template>
            <USelect
              v-model="settings.bufferMinutes"
              :items="BUFFER_OPTIONS"
              :ui="opaqueSelectContentUi"
              class="w-full"
              @update:model-value="saveSettings('bufferMinutes')"
            />
          </UFormField>

          <UFormField label="Buchungsvorlaufzeit" description="Mindestabstand zwischen Buchung und Termin – verhindert zu kurzfristige Buchungen.">
            <template v-if="settingsFieldStatus('minLeadTimeHours')" #hint>
              <SaveStatusHint :status="settingsFieldStatus('minLeadTimeHours')" />
            </template>
            <USelect
              v-model="settings.minLeadTimeHours"
              :items="LEAD_TIME_OPTIONS"
              :ui="opaqueSelectContentUi"
              class="w-full"
              @update:model-value="saveSettings('minLeadTimeHours')"
            />
          </UFormField>

          <UFormField label="Buchungsfenster" description="Wie weit im Voraus können Klienten einen Termin buchen?">
            <template v-if="settingsFieldStatus('bookingWindowWeeks')" #hint>
              <SaveStatusHint :status="settingsFieldStatus('bookingWindowWeeks')" />
            </template>
            <USelect
              v-model="settings.bookingWindowWeeks"
              :items="BOOKING_WINDOW_OPTIONS"
              :ui="opaqueSelectContentUi"
              class="w-full"
              @update:model-value="saveSettings('bookingWindowWeeks')"
            />
          </UFormField>
        </div>
      </SettingsSection>
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
        <!-- Echtes form-Element, damit Enter in den Zeitfeldern speichert. Der
             Speichern-Button steht im Footer und wird über das form-Attribut zugeordnet –
             ohne ihn löst der Browser bei mehreren Feldern kein Absenden aus. -->
        <form id="availability-slot-form" class="flex flex-col gap-6" @submit.prevent="saveDraft">
          <UFormField label="Wochentag">
            <USelect v-model="draft.weekday" :items="weekdaySelectItems" :ui="opaqueSelectContentUi" class="w-full" />
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
        </form>
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
            <UButton
              :label="draft.id ? 'Speichern' : 'Anlegen'"
              type="submit"
              form="availability-slot-form"
              color="primary"
              :loading="saving"
            />
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
