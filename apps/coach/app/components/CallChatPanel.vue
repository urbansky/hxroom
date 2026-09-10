<script setup lang="ts">
export interface CallChatMessage {
  id: number
  from: 'coach' | 'client'
  text: string
  time: string
  /** Nachrichten mit Link oder Anhang gehen in die Zusammenfassungsmail (project.md §5a). */
  inSummary?: boolean
}

// Chat als Rückfallebene, nicht als Plauderkanal (project.md §5a): für den Fall, dass der
// Ton ausfällt, und zum bewussten Teilen von Link oder Dokument. Deshalb liegt er in einem
// Reiter der Seitenleiste und nicht als dauerhaftes Fenster neben dem Gesicht.
//
// Prototyp: Gesendetes bleibt lokal, es geht nichts über die Leitung.

const draft = defineModel<string>('draft', { required: true })

defineProps<{ messages: CallChatMessage[]; clientName: string }>()
defineEmits<{ send: [] }>()

const inputUi = { base: 'bg-white dark:bg-neutral-800' }
</script>

<template>
  <div class="flex flex-col h-full gap-3">
    <UAlert
      icon="i-lucide-info"
      color="info"
      variant="subtle"
      :ui="{ description: 'text-xs' }"
      description="Für Links und Dokumente, oder wenn der Ton streikt. Wird gespeichert; automatisch in die Zusammenfassungsmail geht nur, was einen Link oder Anhang enthält."
    />

    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pr-0.5">
      <div
        v-for="message in messages"
        :key="message.id"
        class="flex flex-col gap-1"
        :class="message.from === 'coach' ? 'items-end' : 'items-start'"
      >
        <div
          class="max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed"
          :class="message.from === 'coach'
            ? 'bg-primary/10 text-toned'
            : 'border border-default bg-white dark:bg-neutral-900 text-toned'"
        >
          {{ message.text }}
        </div>
        <div class="flex items-center gap-1.5 text-[0.625rem] text-dimmed">
          <UIcon v-if="message.inSummary" name="i-lucide-mail" class="size-3" />
          <span v-if="message.inSummary">geht in die Zusammenfassung ·</span>
          <span>{{ message.from === 'coach' ? 'Du' : clientName.split(' ')[0] }} · {{ message.time }}</span>
        </div>
      </div>

      <p v-if="!messages.length" class="text-xs text-dimmed text-center py-6">
        Noch keine Nachrichten.
      </p>
    </div>

    <div class="flex gap-2">
      <UInput
        v-model="draft"
        class="flex-1"
        :ui="inputUi"
        placeholder="Nachricht oder Link …"
        @keydown.enter="$emit('send')"
      />
      <UButton
        icon="i-lucide-send"
        color="neutral"
        variant="subtle"
        :disabled="!draft.trim()"
        aria-label="Nachricht senden"
        @click="$emit('send')"
      />
    </div>
  </div>
</template>
