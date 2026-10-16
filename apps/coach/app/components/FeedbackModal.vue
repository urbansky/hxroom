<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import {
  FEEDBACK_CATEGORIES,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_MESSAGE_MAX_LENGTH,
  createFeedbackSchema,
  type CreateFeedbackDto,
  type FeedbackCategory,
} from '@hxroom/shared'

/**
 * Feedback-Knopf der Beta (phase5-umsetzungsplan.md, Schritt 7a). Die aktuelle Seite geht
 * ohne Query-String mit, damit der Betreiber weiß, wovon die Rede ist.
 */
const open = defineModel<boolean>('open', { required: true })

const { $api } = useApi()
const toast = useToast()
const route = useRoute()

// Nur Art und Text prüft das Formular, die Seite ergänzt onSubmit.
const formSchema = createFeedbackSchema.pick({ category: true, message: true })

const state = reactive<{ category: FeedbackCategory, message: string }>({
  category: 'other',
  message: '',
})
const pending = ref(false)
const errorMessage = ref<string | null>(null)

const categoryItems = FEEDBACK_CATEGORIES.map((value) => ({ value, label: FEEDBACK_CATEGORY_LABELS[value] }))

const messageLength = computed(() => state.message.trim().length)

watch(open, (isOpen) => {
  if (!isOpen) return
  state.category = 'other'
  state.message = ''
  errorMessage.value = null
})

async function onSubmit(event: FormSubmitEvent<Pick<CreateFeedbackDto, 'category' | 'message'>>) {
  pending.value = true
  errorMessage.value = null
  try {
    await $api('/feedback', {
      method: 'POST',
      body: { ...event.data, page: route.path },
    })
    open.value = false
    toast.add({ title: 'Danke für dein Feedback', description: 'Wir lesen jede Rückmeldung.', icon: 'i-lucide-heart', color: 'success' })
  } catch (err: any) {
    errorMessage.value = err?.statusCode === 429
      ? 'Du hast gerade sehr viel geschickt. Versuch es in einer Stunde noch einmal.'
      : 'Dein Feedback konnte nicht gesendet werden. Bitte versuch es noch einmal.'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    title="Feedback geben"
    description="Was klappt nicht, was fehlt dir, was gefällt dir? Jede Rückmeldung hilft uns."
  >
    <template #body>
      <UForm id="feedback-form" :schema="formSchema" :state="state" class="flex flex-col gap-4" @submit="onSubmit">
        <UAlert v-if="errorMessage" icon="i-lucide-circle-x" color="error" variant="soft" :description="errorMessage" />

        <UFormField label="Worum geht es?" name="category">
          <URadioGroup
            v-model="state.category"
            :items="categoryItems"
            orientation="horizontal"
            variant="table"
            :ui="{ fieldset: 'w-full', item: 'flex-1' }"
          />
        </UFormField>

        <UFormField label="Deine Nachricht" name="message" required>
          <UTextarea
            v-model="state.message"
            :rows="6"
            autoresize
            :maxrows="14"
            class="w-full"
            placeholder="Beschreib kurz, was dir aufgefallen ist."
            :ui="{ base: 'bg-white dark:bg-neutral-800' }"
          />
          <template #hint>
            <span :class="messageLength > FEEDBACK_MESSAGE_MAX_LENGTH ? 'text-error' : ''">
              {{ messageLength }} / {{ FEEDBACK_MESSAGE_MAX_LENGTH }}
            </span>
          </template>
        </UFormField>

        <p class="text-xs text-muted">
          Mitgeschickt werden die Seite, auf der du gerade bist ({{ route.path }}), und dein Browser.
        </p>
      </UForm>
    </template>

    <template #footer>
      <div class="flex gap-3 justify-end w-full">
        <UButton color="neutral" variant="outline" label="Abbrechen" @click="open = false" />
        <UButton
          type="submit"
          form="feedback-form"
          icon="i-lucide-send"
          label="Senden"
          :loading="pending"
          :disabled="messageLength === 0"
        />
      </div>
    </template>
  </UModal>
</template>
