<script setup lang="ts">
import type { ClientResponse } from '@hxroom/shared'

// Anlegen (Funktion 03) und Bearbeiten in einer Komponente – die Felder sind identisch,
// nur Titel, Endpunkt und HTTP-Methode unterscheiden sich.
const props = defineProps<{ client: ClientResponse | null }>()
const emit = defineEmits<{ saved: [client: ClientResponse] }>()

const open = defineModel<boolean>('open', { required: true })

const { $api } = useApi()

const inputUi = { base: 'bg-white dark:bg-neutral-800' }

interface ClientDraft {
  name: string
  email: string
  phone: string
  note: string
}

function emptyDraft(): ClientDraft {
  return { name: '', email: '', phone: '', note: '' }
}

const draft = ref<ClientDraft>(emptyDraft())
const saving = ref(false)
const saveError = ref<string | null>(null)

const isEdit = computed(() => props.client !== null)

// Beim Öffnen befüllen, damit der Slideover nie den Stand des zuvor bearbeiteten
// Klienten zeigt.
watch(open, (isOpen) => {
  if (!isOpen) {
    saveError.value = null
    return
  }
  draft.value = props.client
    ? {
        name: props.client.name,
        email: props.client.email,
        phone: props.client.phone ?? '',
        note: props.client.note ?? '',
      }
    : emptyDraft()
})

async function save() {
  const name = draft.value.name.trim()
  const email = draft.value.email.trim()

  if (!name || !email) {
    saveError.value = 'Name und E-Mail-Adresse sind erforderlich.'
    return
  }

  saving.value = true
  saveError.value = null

  const body = {
    name,
    email,
    phone: draft.value.phone.trim() || null,
    note: draft.value.note.trim() || null,
  }

  try {
    const saved = props.client
      ? await $api<ClientResponse>(`/clients/${props.client.id}`, { method: 'PATCH', body })
      : await $api<ClientResponse>('/clients', { method: 'POST', body })

    emit('saved', saved)
    open.value = false
  } catch (err: any) {
    // 409 kommt aus dem Unique-Constraint (organizationId, email) – der häufigste
    // Fehlerfall, deshalb eine eigene, konkrete Meldung statt der generischen.
    saveError.value = err?.statusCode === 409
      ? 'Ein Klient mit dieser E-Mail-Adresse existiert bereits.'
      : 'Klient konnte nicht gespeichert werden.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <USlideover v-model:open="open" :title="isEdit ? 'Klient bearbeiten' : 'Neuer Klient'">
    <template #body>
      <div class="flex flex-col gap-6">
        <UFormField label="Name">
          <UInput v-model="draft.name" placeholder="z. B. Markus Kellner" class="w-full" :ui="inputUi" />
        </UFormField>

        <UFormField
          label="E-Mail"
          description="Über die Adresse werden Online-Buchungen automatisch diesem Klienten zugeordnet."
        >
          <UInput v-model="draft.email" type="email" placeholder="markus.kellner@example.de" class="w-full" :ui="inputUi" />
        </UFormField>

        <UFormField label="Telefon" description="Optional, nur für deine Unterlagen.">
          <UInput v-model="draft.phone" type="tel" placeholder="+49 …" class="w-full" :ui="inputUi" />
        </UFormField>

        <UFormField label="Notiz" description="Nur für dich sichtbar – der Klient sieht diesen Text nie.">
          <UTextarea v-model="draft.note" :rows="4" class="w-full" placeholder="Kontext, Vorgeschichte, Besonderheiten …" :ui="inputUi" />
        </UFormField>

        <p v-if="saveError" class="text-sm text-error">{{ saveError }}</p>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-end gap-2 w-full">
        <UButton label="Abbrechen" color="neutral" variant="ghost" @click="open = false" />
        <UButton :label="isEdit ? 'Speichern' : 'Anlegen'" color="primary" :loading="saving" @click="save" />
      </div>
    </template>
  </USlideover>
</template>
