<script setup lang="ts">
import type { ClientResponse } from '@hxroom/shared'

// Was der Coach für sich über den Klienten festhält: Coaching-Ziele & Themen (Funktionsliste
// 3.05) und die interne Notiz. Eine Karte mit einem Hinweis „Nur für dich“ statt zwei
// Abzeichen. Beide Felder stehen als Text da und werden über den Stift auf dieselbe Weise
// bearbeitet – lesen ist hier der häufige Fall, ein dauerhaft offenes Eingabefeld ließe die
// Spalte wie ein Formular aussehen.
const props = defineProps<{ client: ClientResponse }>()
const emit = defineEmits<{ saved: [client: ClientResponse] }>()

type Field = 'goals' | 'note'

const FIELDS: { key: Field, title: string, empty: string, placeholder: string, maxlength: number }[] = [
  {
    key: 'goals',
    title: 'Coaching-Ziele & Themen',
    empty: 'Noch keine Ziele festgehalten.',
    placeholder: 'Worum geht es in diesem Coaching? Ziele, Themen, was sich verändern soll …',
    maxlength: 4000,
  },
  {
    key: 'note',
    title: 'Interne Notiz',
    empty: 'Noch keine Notiz hinterlegt.',
    placeholder: 'Kontext, Vorgeschichte, Besonderheiten …',
    maxlength: 2000,
  },
]

const { $api } = useApi()
const editing = ref<Field | null>(null)
const draft = ref('')
const saving = ref(false)
const saveError = ref<string | null>(null)

function startEdit(field: Field) {
  editing.value = field
  draft.value = props.client[field] ?? ''
  saveError.value = null
}

function cancelEdit() {
  editing.value = null
  saveError.value = null
}

async function save(field: Field) {
  saving.value = true
  saveError.value = null
  try {
    const saved = await $api<ClientResponse>(`/clients/${props.client.id}`, {
      method: 'PATCH',
      body: { [field]: draft.value.trim() || null },
    })
    emit('saved', saved)
    editing.value = null
  } catch {
    saveError.value = 'Konnte nicht gespeichert werden. Bitte versuch es noch einmal.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="rounded-xl border border-default bg-white dark:bg-neutral-900 p-4 flex flex-col gap-4">
    <div class="flex items-center gap-2 text-sm font-medium text-highlighted">
      <UIcon name="i-lucide-lock" class="size-4 text-primary" />
      Nur für dich
    </div>

    <template v-for="(field, index) in FIELDS" :key="field.key">
      <div v-if="index > 0" class="h-px bg-default" />
      <section class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between gap-2">
          <h3 class="text-sm text-muted">{{ field.title }}</h3>
          <UButton
            v-if="editing !== field.key"
            icon="i-lucide-pencil"
            color="neutral"
            variant="ghost"
            size="xs"
            class="-my-1 -mr-1"
            :aria-label="`${field.title} bearbeiten`"
            @click="startEdit(field.key)"
          />
        </div>

        <template v-if="editing === field.key">
          <UTextarea
            v-model="draft"
            :rows="4"
            autoresize
            :maxrows="14"
            :maxlength="field.maxlength"
            autofocus
            class="w-full"
            :placeholder="field.placeholder"
            @keydown.esc="cancelEdit"
          />
          <div class="flex items-center justify-end gap-2">
            <span v-if="saveError" class="text-xs text-error mr-auto">{{ saveError }}</span>
            <UButton label="Abbrechen" color="neutral" variant="ghost" size="xs" @click="cancelEdit" />
            <UButton label="Speichern" size="xs" :loading="saving" @click="save(field.key)" />
          </div>
        </template>

        <p v-else-if="client[field.key]" class="text-sm text-highlighted whitespace-pre-line break-words">{{ client[field.key] }}</p>
        <button
          v-else
          type="button"
          class="self-start text-sm text-muted hover:text-highlighted cursor-pointer"
          @click="startEdit(field.key)"
        >
          {{ field.empty }} <span class="text-primary">Hinzufügen</span>
        </button>
      </section>
    </template>
  </div>
</template>
