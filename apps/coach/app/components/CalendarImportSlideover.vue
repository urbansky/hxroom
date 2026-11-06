<script setup lang="ts">
import { CALENDAR_IMPORT_ERROR_TEXTS, type CalendarImportError, type CalendarImportResponse } from '@hxroom/shared'

/**
 * Externen Kalender hinzufügen oder bearbeiten (doc/produkt/funktionen/kalenderabgleich.md §3.1).
 * Beim Hinzufügen ruft die API die Adresse sofort ab und speichert nur bei Erfolg. Die Adresse
 * lässt sich danach nicht mehr ändern – sie ist ein Zugangsdatum und wird nur gekürzt gezeigt.
 */
const props = defineProps<{
  calendar: CalendarImportResponse | null
}>()

const emit = defineEmits<{
  saved: [calendar: CalendarImportResponse, created: boolean]
  deleted: [id: string]
}>()

const open = defineModel<boolean>('open', { required: true })

const { $api } = useApi()

const inputUi = { base: 'bg-white dark:bg-elevated' }

const draft = reactive({ name: '', url: '', isActive: true, blockAllDay: false })
const saving = ref(false)
const saveError = ref<string | null>(null)
const confirmingDelete = ref(false)

watch(open, (isOpen) => {
  if (!isOpen) return
  Object.assign(draft, props.calendar
    ? { name: props.calendar.name, url: '', isActive: props.calendar.isActive, blockAllDay: props.calendar.blockAllDay }
    : { name: '', url: '', isActive: true, blockAllDay: false })
  saveError.value = null
  confirmingDelete.value = false
}, { immediate: true })

const canSave = computed(() => draft.name.trim().length > 0 && (props.calendar || draft.url.trim().length > 0))

function errorText(err: any): string {
  const code = err?.data?.code as CalendarImportError | undefined
  if (code && CALENDAR_IMPORT_ERROR_TEXTS[code]) return CALENDAR_IMPORT_ERROR_TEXTS[code]
  return err?.data?.errors?.[0]?.message ?? 'Der Kalender konnte nicht gespeichert werden.'
}

async function save() {
  if (!canSave.value) return
  saving.value = true
  saveError.value = null
  try {
    if (props.calendar) {
      const saved = await $api<CalendarImportResponse>(`/calendar-imports/${props.calendar.id}`, {
        method: 'PATCH',
        body: { name: draft.name.trim(), isActive: draft.isActive, blockAllDay: draft.blockAllDay },
      })
      emit('saved', saved, false)
    } else {
      const saved = await $api<CalendarImportResponse>('/calendar-imports', {
        method: 'POST',
        body: { name: draft.name.trim(), url: draft.url.trim(), blockAllDay: draft.blockAllDay },
      })
      emit('saved', saved, true)
    }
    open.value = false
  } catch (err) {
    saveError.value = errorText(err)
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.calendar) return
  try {
    await $api(`/calendar-imports/${props.calendar.id}`, { method: 'DELETE' })
    emit('deleted', props.calendar.id)
    open.value = false
  } catch {
    saveError.value = 'Der Kalender konnte nicht entfernt werden.'
    confirmingDelete.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" :title="calendar ? 'Kalender bearbeiten' : 'Kalender hinzufügen'">
    <template #body>
      <form id="calendar-import-form" class="flex flex-col gap-6" @submit.prevent="save">
        <UFormField label="Name" description="Nur für dich, z. B. „Privat“ oder „Praxis“.">
          <UInput v-model="draft.name" placeholder="Privat" maxlength="60" class="w-full" :ui="inputUi" />
        </UFormField>

        <UFormField v-if="!calendar" label="iCal-Adresse" description="Beginnt mit https:// oder webcal://">
          <UInput
            v-model="draft.url"
            placeholder="https://calendar.google.com/calendar/ical/…/basic.ics"
            autocomplete="off"
            spellcheck="false"
            class="w-full"
            :ui="inputUi"
          />
        </UFormField>
        <UFormField v-else label="iCal-Adresse" description="Zum Ändern den Kalender entfernen und neu hinzufügen.">
          <p class="text-sm text-muted font-mono">{{ calendar.urlHint }}</p>
        </UFormField>

        <USwitch v-if="calendar" v-model="draft.isActive" label="Aktiv" description="Pausiert blockiert der Kalender keine Zeiten." />
        <USwitch
          v-model="draft.blockAllDay"
          label="Ganztägige Termine blockieren immer"
          description="Auch wenn sie als „frei“ markiert sind – z. B. Urlaub, den du als ganztägigen Termin einträgst."
        />

        <div v-if="!calendar">
          <p class="text-sm font-medium text-highlighted mb-2">Wo finde ich die Adresse?</p>
          <UAccordion :items="CALENDAR_PROVIDER_GUIDES" type="single" :ui="{ trigger: 'text-sm' }">
            <template #body="{ item }">
              <ol class="list-decimal pl-5 text-sm text-muted flex flex-col gap-1">
                <li v-for="step in item.steps" :key="step">{{ step }}</li>
              </ol>
              <p class="text-sm mt-2" :class="item.label === 'Apple iCloud' ? 'text-warning' : 'text-muted'">{{ item.note }}</p>
            </template>
          </UAccordion>
        </div>

        <UAlert v-if="saveError" icon="i-lucide-circle-x" color="error" variant="soft" :description="saveError" />
      </form>
    </template>

    <template #footer>
      <div v-if="confirmingDelete" class="flex items-center justify-between w-full">
        <span class="text-sm text-muted">Kalender wirklich entfernen?</span>
        <div class="flex items-center gap-2">
          <UButton label="Abbrechen" color="neutral" variant="ghost" size="sm" @click="confirmingDelete = false" />
          <UButton label="Entfernen" color="error" variant="solid" size="sm" @click="remove" />
        </div>
      </div>
      <div v-else class="flex items-center justify-between w-full">
        <UButton v-if="calendar" label="Entfernen" icon="i-lucide-trash-2" color="error" variant="ghost" @click="confirmingDelete = true" />
        <div v-else />
        <div class="flex items-center gap-2">
          <UButton label="Abbrechen" color="neutral" variant="ghost" @click="open = false" />
          <UButton
            :label="calendar ? 'Speichern' : (saving ? 'Wird abgerufen …' : 'Hinzufügen')"
            type="submit"
            form="calendar-import-form"
            color="primary"
            :loading="saving"
            :disabled="!canSave"
          />
        </div>
      </div>
    </template>
  </USlideover>
</template>
