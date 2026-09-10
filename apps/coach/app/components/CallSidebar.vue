<script setup lang="ts">
import type { CallAccessResponse } from '@hxroom/shared'
import type { TabsItem } from '@nuxt/ui'
import type { CallChatMessage } from './CallChatPanel.vue'

// Inhalt der Seitenleiste. Ob sie als Spalte neben der Bühne steht oder mobil über sie
// fährt, entscheidet CallScreen – hier steht nur, was drinsteht, damit es den Aufbau nicht
// zweimal gibt.

export type CallSidebarTab = 'notes' | 'client' | 'chat'

defineProps<{
  call: CallAccessResponse
  messages: CallChatMessage[]
  chatUnread: boolean
}>()

defineEmits<{ send: [] }>()

const activeTab = defineModel<CallSidebarTab>('activeTab', { required: true })
const notes = defineModel<string>('notes', { required: true })
const chatDraft = defineModel<string>('chatDraft', { required: true })

const TAB_ITEMS: TabsItem[] = [
  { label: 'Notizen', value: 'notes' },
  { label: 'Klient', value: 'client' },
  { label: 'Chat', value: 'chat' },
]
</script>

<template>
  <div class="flex flex-col h-full min-h-0">
    <div class="border-b border-default px-2 shrink-0">
      <UTabs
        :items="TAB_ITEMS"
        :model-value="activeTab"
        variant="link"
        :content="false"
        :ui="{ list: 'border-b-0 mb-0', trigger: 'grow' }"
        @update:model-value="activeTab = $event as CallSidebarTab"
      >
        <template #default="{ item }">
          <span class="flex items-center gap-1.5">
            {{ item.label }}
            <!-- Ungelesenes muss auch dann auffallen, wenn gerade ein anderer Reiter offen
                 ist – der Chat ist die Rückfallebene bei Tonproblemen. -->
            <span v-if="item.value === 'chat' && chatUnread" class="size-1.5 rounded-full bg-primary" />
          </span>
        </template>
      </UTabs>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto p-4">
      <CallNotesPanel v-if="activeTab === 'notes'" v-model="notes" />
      <CallClientPanel v-else-if="activeTab === 'client'" :call="call" />
      <CallChatPanel
        v-else
        v-model:draft="chatDraft"
        :messages="messages"
        :client-name="call.clientName"
        class="h-full"
        @send="$emit('send')"
      />
    </div>
  </div>
</template>
