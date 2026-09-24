<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { CALL_FILE_ACCEPT, CALL_FILE_MAX_BYTES, firstName } from '@hxroom/shared'
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
const emit = defineEmits<{
  send: []
  retry: [id: string]
  attach: [file: File]
  /** Die Datei passt nicht – zu groß oder ein Format, das nicht geteilt werden kann. */
  attachRejected: [reason: string]
}>()

const peerShort = computed(() => firstName(props.peerName, 'Gegenüber'))

const inputUi = { base: 'bg-white dark:bg-neutral-800' }

const fileField = ref<HTMLInputElement | null>(null)

/**
 * Die Datei wird hier nur grob geprüft, damit niemand 25 MB hochlädt, um dann ein „geht
 * nicht" zu lesen. Die eigentliche Prüfung – Endung *und* Signatur – macht der Server; der
 * Typ, den der Browser meldet, ist nichts, worauf man sich verlassen kann.
 */
function pickFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (file.size > CALL_FILE_MAX_BYTES) {
    emit('attachRejected', `„${file.name}" ist größer als ${Math.round(CALL_FILE_MAX_BYTES / 1024 / 1024)} MB.`)
    return
  }

  const extension = file.name.includes('.') ? `.${file.name.split('.').pop()!.toLowerCase()}` : ''
  if (!CALL_FILE_ACCEPT.split(',').includes(extension)) {
    emit('attachRejected', `„${file.name}" lässt sich nicht teilen. Erlaubt sind PDF, Bilder und Office-Dateien.`)
    return
  }

  emit('attach', file)
}

// Der Verlauf steht unten – die neueste Nachricht ist die, um die es geht.
//
// Mitgescrollt wird nur, wer ohnehin unten steht: Wer nach oben gescrollt hat, liest dort
// etwas und soll nicht weggerissen werden. Eine eigene Nachricht holt die Ansicht immer
// zurück, denn wer schreibt, will sehen, dass sie da ist.
const list = ref<HTMLElement | null>(null)
const NEAR_BOTTOM_PX = 80
let stickToBottom = true

function onListScroll() {
  const element = list.value
  if (!element) return
  stickToBottom = element.scrollHeight - element.scrollTop - element.clientHeight < NEAR_BOTTOM_PX
}

function scrollToEnd(behavior: ScrollBehavior = 'smooth') {
  const element = list.value
  if (!element) return
  element.scrollTo({ top: element.scrollHeight, behavior })
}

watch(() => props.messages.length, async (count, previous) => {
  const own = props.messages[count - 1]?.from === 'self'
  if (!stickToBottom && !own) return
  // Erst rendern lassen: Vorher kennt der Rahmen seine neue Höhe nicht.
  await nextTick()
  scrollToEnd(previous ? 'smooth' : 'auto')
  stickToBottom = true
})

// Beim Öffnen des Reiters ohne Bewegung ans Ende – der Tab-Wechsel baut dieses Panel jedes
// Mal neu auf, und ein Verlauf, der oben beginnt, wäre jedes Mal ein Rätsel.
onMounted(() => scrollToEnd('auto'))

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}

// Links anklickbar machen – einer der beiden Zwecke des Chats (project.md §5a).
//
// Erkannt werden `http(s)://…` und `www.…`; ein nacktes „hxroom.de" bleibt Text, weil sich
// eine Domain nicht zuverlässig von „z.B." oder „Mo.-Fr." unterscheiden lässt.
const LINK_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
// Satzzeichen am Ende gehören zum Satz, nicht zur Adresse; eine schließende Klammer nur
// dann, wenn die URL keine öffnende enthält (Wikipedia-Adressen tragen beide).
const TRAILING = /[.,;:!?"'»]+$/

interface MessagePart {
  text: string
  href?: string
}

function splitLinks(text: string): MessagePart[] {
  const parts: MessagePart[] = []
  let index = 0

  for (const match of text.matchAll(LINK_PATTERN)) {
    let found = match[0]
    let trailing = ''

    const trimmed = found.replace(TRAILING, '')
    trailing = found.slice(trimmed.length)
    found = trimmed

    if (found.endsWith(')') && !found.includes('(')) {
      found = found.slice(0, -1)
      trailing = `)${trailing}`
    }

    if (match.index > index) parts.push({ text: text.slice(index, match.index) })
    // Nur http und https werden zu einem Link – `javascript:` und Konsorten kommen hier
    // nicht durch, weil das Muster sie gar nicht erst erfasst.
    parts.push({ text: found, href: found.startsWith('www.') ? `https://${found}` : found })
    if (trailing) parts.push({ text: trailing })

    index = match.index + match[0].length
  }

  if (index < text.length) parts.push({ text: text.slice(index) })
  return parts
}
</script>

<template>
  <div class="flex flex-col h-full gap-3">
    <div
      ref="list"
      class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pr-0.5"
      @scroll.passive="onListScroll"
    >
      <div
        v-for="message in messages"
        :key="message.id"
        class="flex flex-col gap-1"
        :class="message.from === 'self' ? 'items-end' : 'items-start'"
      >
        <div
          v-if="message.text"
          class="max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words"
          :class="[
            message.from === 'self'
              ? 'bg-primary/10 text-toned'
              : 'border border-default bg-white dark:bg-neutral-900 text-toned',
            message.status === 'sending' ? 'opacity-60' : '',
          ]"
        ><!-- Ohne v-html: Die Teile stehen als Text im Baum, eine Nachricht kann also kein
             Markup einschleusen. Die Auszeichnung hier eng gesetzt, damit in der Blase mit
             whitespace-pre-wrap keine zusätzlichen Leerzeichen entstehen. --><template
          v-for="(part, index) in splitLinks(message.text)"
          :key="index"
        ><a
          v-if="part.href"
          :href="part.href"
          target="_blank"
          rel="noopener noreferrer"
          class="underline underline-offset-2 break-all hover:text-primary"
        >{{ part.text }}</a><template v-else>{{ part.text }}</template></template></div>

        <!-- Die Datei als eigene Zeile unter dem Text: Sie ist das, worauf geklickt wird. -->
        <!-- `target="_blank"` ist hier keine Geschmacksfrage: Ein Klick im selben Tab löst in
             Chrome `beforeunload`/`pagehide` aus, noch bevor die Antwort als Download erkannt
             ist. livekit-client hängt daran (`disconnectOnPageLeave`) und trennt den Raum –
             das Gespräch wäre nach jedem Herunterladen tot, während die Seite stehen bleibt.
             Den Dateinamen trägt ohnehin der Content-Disposition-Header; das `download`-
             Attribut wirkt bei einer fremden Herkunft nicht. -->
        <component
          :is="message.file.href ? 'a' : 'div'"
          v-if="message.file"
          :href="message.file.href"
          :target="message.file.href ? '_blank' : undefined"
          :rel="message.file.href ? 'noopener noreferrer' : undefined"
          class="max-w-[85%] flex items-center gap-2 rounded-lg border border-default px-3 py-2 bg-white dark:bg-neutral-900"
          :class="[
            message.file.href ? 'hover:border-primary hover:bg-elevated cursor-pointer' : 'opacity-60',
            message.status === 'sending' ? 'opacity-60' : '',
          ]"
        >
          <UIcon :name="message.status === 'sending' ? 'i-lucide-loader-circle' : 'i-lucide-paperclip'" class="size-4 text-dimmed shrink-0" :class="message.status === 'sending' ? 'animate-spin' : ''" />
          <span class="min-w-0">
            <span class="block text-xs text-toned truncate">{{ message.file.name }}</span>
            <span class="block text-[0.625rem] text-dimmed">{{ fileSize(message.file.size) }}</span>
          </span>
        </component>

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
        <!-- Das Feld bleibt unsichtbar; bedient wird es über die Büroklammer, damit die
             Leiste nicht aussieht wie ein Formular. -->
        <input
          ref="fileField"
          type="file"
          class="hidden"
          :accept="CALL_FILE_ACCEPT"
          @change="pickFile"
        >
        <UButton
          icon="i-lucide-paperclip"
          color="neutral"
          variant="subtle"
          :disabled="canSend === false"
          aria-label="Datei anhängen"
          @click="fileField?.click()"
        />
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
