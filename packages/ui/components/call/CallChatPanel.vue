<script setup lang="ts">
import { computed } from 'vue'
import { firstName } from '@hxroom/shared'
import type { CallChatMessage } from './types'

// Chat als Rückfallebene, nicht als Plauderkanal (project.md §5a): für den Fall, dass der
// Ton ausfällt, und zum bewussten Teilen von Link oder Dokument. Deshalb liegt er in einem
// Reiter der Seitenleiste und nicht als dauerhaftes Fenster neben dem Gesicht.
//
// Die Nachrichten liegen in der App (B7): Sie gehen über die API und werden gespeichert.
// Dieses Panel zeigt nur und meldet, was der Benutzer will.

const draft = defineModel<string>('draft', { required: true })

const props = defineProps<{
  messages: CallChatMessage[]
  /** Name des Gegenübers – beim Coach der Klient, beim Klienten der Coach. */
  peerName: string
  /**
   * Darf gerade geschrieben werden? Nur im laufenden Gespräch – davor gibt es den
   * Warteraum, danach ist die Sitzung abgeschlossen.
   */
  canSend?: boolean
  /** Warum nicht, falls gesperrt. Ein gesperrtes Feld ohne Grund ist ein Rätsel. */
  disabledReason?: string
}>()
defineEmits<{ send: [], retry: [id: string] }>()

const peerShort = computed(() => firstName(props.peerName, 'Gegenüber'))

const inputUi = { base: 'bg-white dark:bg-neutral-800' }
</script>

<template>
  <div class="flex flex-col h-full gap-3">
    <UAlert
      icon="i-lucide-info"
      color="info"
      variant="subtle"
      :ui="{ description: 'text-xs' }"
      description="Für Links, oder wenn der Ton streikt. Der Verlauf wird gespeichert und bleibt dieser Sitzung zugeordnet."
    />

    <div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pr-0.5">
      <div
        v-for="message in messages"
        :key="message.id"
        class="flex flex-col gap-1"
        :class="message.from === 'self' ? 'items-end' : 'items-start'"
      >
        <div
          class="max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words"
          :class="[
            message.from === 'self'
              ? 'bg-primary/10 text-toned'
              : 'border border-default bg-white dark:bg-neutral-900 text-toned',
            message.status === 'sending' ? 'opacity-60' : '',
          ]"
        >
          {{ message.text }}
        </div>
        <div class="flex items-center gap-1.5 text-[0.625rem] text-dimmed">
          <template v-if="message.status === 'failed'">
            <UIcon name="i-lucide-alert-circle" class="size-3 text-error" />
            <span class="text-error">Nicht gesendet</span>
            <UButton
              size="xs"
              variant="link"
              color="error"
              class="p-0 text-[0.625rem]"
              label="Erneut senden"
              @click="$emit('retry', message.id)"
            />
          </template>
          <template v-else>
            <span>{{ message.from === 'self' ? 'Du' : peerShort }} · {{ message.status === 'sending' ? 'sendet …' : message.time }}</span>
          </template>
        </div>
      </div>

      <p v-if="!messages.length" class="text-xs text-dimmed text-center py-6">
        Noch keine Nachrichten.
      </p>
    </div>

    <div>
      <div class="flex gap-2">
        <UInput
          v-model="draft"
          class="flex-1"
          :ui="inputUi"
          :disabled="canSend === false"
          placeholder="Nachricht oder Link …"
          @keydown.enter="$emit('send')"
        />
        <UButton
          icon="i-lucide-send"
          color="neutral"
          variant="subtle"
          :disabled="canSend === false || !draft.trim()"
          aria-label="Nachricht senden"
          @click="$emit('send')"
        />
      </div>
      <p v-if="canSend === false && disabledReason" class="mt-1.5 text-[0.625rem] text-dimmed">
        {{ disabledReason }}
      </p>
    </div>
  </div>
</template>
