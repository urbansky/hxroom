<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { CALL_FILE_ACCEPT, CALL_FILE_MAX_BYTES, firstName } from '@hxroom/shared'
import CallImageViewer from './CallImageViewer.vue'
import type { CallChatFile, CallChatMessage, CallViewerImage } from './types'

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

// resize-none: Die Höhe regelt autoresize – ein Ziehgriff in der Ecke wäre ein zweiter,
// widersprüchlicher Weg dazu.
const inputUi = { base: 'bg-white dark:bg-neutral-800 resize-none' }

/**
 * Enter sendet, Umschalt+Enter macht eine neue Zeile – wie in jedem Chat.
 *
 * `.exact` am Listener lässt Umschalt+Enter gar nicht erst hierher. `isComposing` schützt
 * die Eingabe über einen IME (etwa beim Tippen japanischer Zeichen oder bei manchen
 * Diktierfunktionen): Dort bestätigt Enter die Auswahl und darf nicht senden.
 */
function onEnter(event: KeyboardEvent) {
  if (event.isComposing) return
  event.preventDefault()
  emit('send')
}

const fileField = ref<HTMLInputElement | null>(null)

/**
 * Die Datei wird hier nur grob geprüft, damit niemand 25 MB hochlädt, um dann ein „geht
 * nicht" zu lesen. Die eigentliche Prüfung – Endung *und* Signatur – macht der Server; der
 * Typ, den der Browser meldet, ist nichts, worauf man sich verlassen kann.
 *
 * Gemeinsamer Weg für die Büroklammer und das Ablegen per Drag'n Drop.
 */
function offerFile(file: File) {
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

function pickFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) offerFile(file)
}

// Drag'n Drop auf das ganze Panel. Reagiert wird nur auf Dateien – wer Text oder einen Link
// hineinzieht, meint das Eingabefeld, nicht den Anhang.
//
// Der Zähler statt eines einfachen Schalters: dragenter und dragleave feuern bei jedem
// Kindelement, über das der Zeiger wandert. Mit einem Schalter flackerte die Fläche, sobald
// man über eine Blase fährt.
const dragDepth = ref(0)
const dragging = computed(() => dragDepth.value > 0)

function carriesFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files')
}

function onDragEnter(event: DragEvent) {
  if (!carriesFiles(event)) return
  event.preventDefault()
  dragDepth.value++
}

function onDragOver(event: DragEvent) {
  if (!carriesFiles(event)) return
  // Ohne preventDefault gilt die Fläche nicht als Ablageziel, und der Browser öffnet die
  // Datei selbst – im selben Tab, was das Gespräch beenden würde.
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = props.canSend === false ? 'none' : 'copy'
}

function onDragLeave(event: DragEvent) {
  if (!carriesFiles(event)) return
  dragDepth.value = Math.max(0, dragDepth.value - 1)
}

/**
 * Mehrere Dateien werden zu mehreren Nachrichten – eine Datei je Nachricht ist die Regel des
 * Servers. Ein bereits getippter Text wird Begleittext der ersten.
 */
function onDrop(event: DragEvent) {
  if (!carriesFiles(event)) return
  event.preventDefault()
  dragDepth.value = 0
  if (props.canSend === false) return

  for (const file of Array.from(event.dataTransfer?.files ?? [])) offerFile(file)
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
  // Wer in der Dateiübersicht schreibt oder eine Datei hineinzieht, will seine Nachricht
  // sehen – also zurück zum Verlauf, ans Ende.
  if (own && view.value === 'files') {
    stickToBottom = true
    await showHistory()
    return
  }
  if (!stickToBottom && !own) return
  // Erst rendern lassen: Vorher kennt der Rahmen seine neue Höhe nicht.
  await nextTick()
  scrollToEnd(previous ? 'smooth' : 'auto')
  stickToBottom = true
})

// Beim Öffnen des Reiters ohne Bewegung ans Ende – der Tab-Wechsel baut dieses Panel jedes
// Mal neu auf, und ein Verlauf, der oben beginnt, wäre jedes Mal ein Rätsel.
onMounted(() => scrollToEnd('auto'))

function fileIcon(kind: CallChatFile['kind']): string {
  if (kind === 'pdf') return 'i-lucide-file-text'
  if (kind === 'image') return 'i-lucide-image'
  return 'i-lucide-paperclip'
}

/** Anzeigegröße des Vorschaubilds im Chat: höchstens 240 breit und 200 hoch, nie größer als es ist. */
function previewBox(preview: { width: number; height: number }): { width: number } {
  const scale = Math.min(1, 240 / preview.width, 200 / preview.height)
  return { width: Math.round(preview.width * scale) }
}

// Die Großansicht zeigt alle Bilder der Sitzung, in der Reihenfolge des Verlaufs – geöffnet
// beim angeklickten.
const viewerImages = computed<CallViewerImage[]>(() =>
  props.messages
    .filter(message => message.file?.kind === 'image' && message.file.preview && message.file.href)
    .map(message => ({ id: message.id, name: message.file!.name, href: message.file!.href! })),
)
const viewerOpen = ref(false)
const viewerIndex = ref(0)

function openViewer(messageId: string) {
  viewerIndex.value = Math.max(0, viewerImages.value.findIndex(image => image.id === messageId))
  viewerOpen.value = true
}

// ---------------------------------------------------------------------------
// Übersicht der geteilten Dateien
// ---------------------------------------------------------------------------
// In einem längeren Verlauf sind Dateien schnell weggescrollt – dabei sind sie das, was vom
// Chat bleibt. Sobald die erste geteilt ist, steht oben eine Zeile, die zur Übersicht führt:
// Bilder als Raster (ein Klick öffnet die Großansicht), Dokumente als Liste.
//
// Im Panel und nicht in der Titelzeile: Die gehört dem rollenfreien Gerüst des Calls und
// trägt ebenso „Notizen" und „Klient". Und kein eigener Reiter: Beim Klienten gibt es nur den
// Chat, und ein zweiter Knopf in der Steuerleiste kostet auf dem Handy Platz.

/** Nur, was beim Server liegt – eine Datei, die noch unterwegs ist, lässt sich nicht öffnen. */
const sharedFiles = computed(() => props.messages.filter(message => message.file?.href && !message.status))
const sharedImages = computed(() => sharedFiles.value.filter(message => message.file!.kind === 'image' && message.file!.preview))
const sharedDocuments = computed(() => sharedFiles.value.filter(message => !(message.file!.kind === 'image' && message.file!.preview)))

const view = ref<'history' | 'files'>('history')
let savedScrollTop = 0

function showFiles() {
  savedScrollTop = list.value?.scrollTop ?? 0
  view.value = 'files'
}

/** Kurz hervorgehoben, damit man die angesprungene Nachricht im Verlauf auch findet. */
const highlighted = ref<string | null>(null)
let highlightTimer: ReturnType<typeof setTimeout> | undefined

/**
 * Zurück zum Verlauf – entweder dorthin, wo man war, oder zu einer bestimmten Nachricht.
 * Wer vorher unten stand, landet wieder unten: Inzwischen kann dort Neues angekommen sein.
 */
async function showHistory(messageId?: string) {
  view.value = 'history'
  await nextTick()
  const element = list.value
  if (!element) return

  if (messageId) {
    const target = element.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(messageId)}"]`)
    target?.scrollIntoView({ block: 'center' })
    highlighted.value = messageId
    clearTimeout(highlightTimer)
    highlightTimer = setTimeout(() => { highlighted.value = null }, 1600)
    onListScroll()
    return
  }

  if (stickToBottom) scrollToEnd('auto')
  else element.scrollTop = savedScrollTop
}

// Verschwindet die letzte Datei – heute nicht möglich, aber der Verlauf kann neu geladen
// werden –, soll niemand in einer leeren Übersicht stehen bleiben.
watch(() => sharedFiles.value.length, (count) => { if (!count && view.value === 'files') void showHistory() })

function senderLabel(message: CallChatMessage): string {
  return `${message.from === 'self' ? 'Du' : peerShort.value} · ${message.time}`
}

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
  <div
    class="relative flex flex-col h-full gap-3"
    @dragenter="onDragEnter"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <!-- Ablagefläche über dem ganzen Panel. pointer-events-none, damit die Drag-Ereignisse
         weiter am Panel ankommen und nicht an dieser Fläche hängen bleiben. -->
    <div
      v-if="dragging"
      class="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed text-center px-6"
      :class="canSend === false
        ? 'border-default bg-elevated/90 text-dimmed'
        : 'border-primary bg-primary/10 text-primary backdrop-blur-[1px]'"
    >
      <UIcon :name="canSend === false ? 'i-lucide-ban' : 'i-lucide-upload'" class="size-7" />
      <p class="text-sm font-medium">
        {{ canSend === false ? 'Dateien nur im laufenden Gespräch' : 'Datei hier ablegen' }}
      </p>
      <p v-if="canSend !== false" class="text-xs text-muted">
        PDF, Bilder oder Office-Dateien bis {{ Math.round(CALL_FILE_MAX_BYTES / 1024 / 1024) }} MB
      </p>
    </div>

    <!-- Die Zeile zur Übersicht – erst, wenn es etwas zu zeigen gibt. -->
    <button
      v-if="sharedFiles.length"
      type="button"
      class="-mt-1 flex items-center gap-2 rounded-md border border-default bg-elevated/60 px-3 py-1.5 text-xs text-toned hover:bg-elevated hover:border-accented focus-visible:outline-2 focus-visible:outline-primary"
      :aria-expanded="view === 'files'"
      @click="view === 'files' ? showHistory() : showFiles()"
    >
      <template v-if="view === 'history'">
        <UIcon name="i-lucide-paperclip" class="size-3.5 text-dimmed" />
        <span class="font-medium">{{ sharedFiles.length }} {{ sharedFiles.length === 1 ? 'Datei' : 'Dateien' }}</span>
        <span class="text-dimmed">geteilt</span>
        <UIcon name="i-lucide-chevron-right" class="size-3.5 ml-auto text-dimmed" />
      </template>
      <template v-else>
        <UIcon name="i-lucide-arrow-left" class="size-3.5 text-dimmed" />
        <span class="font-medium">Zurück zum Verlauf</span>
      </template>
    </button>

    <!-- Übersicht der geteilten Dateien -->
    <div v-if="view === 'files'" class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-5 pr-0.5">
      <section v-if="sharedImages.length" class="flex flex-col gap-2">
        <h3 class="text-[0.6875rem] font-medium uppercase tracking-wide text-dimmed">
          Bilder · {{ sharedImages.length }}
        </h3>
        <div class="grid grid-cols-3 gap-2">
          <!-- Quadratisch beschnitten – im Raster zählt das Wiedererkennen, das ganze Bild
               zeigt die Großansicht. -->
          <button
            v-for="message in sharedImages"
            :key="message.id"
            type="button"
            class="aspect-square overflow-hidden rounded-md border border-default bg-elevated hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
            :aria-label="`${message.file!.name} groß anzeigen`"
            :title="`${message.file!.name} · ${senderLabel(message)}`"
            @click="openViewer(message.id)"
          >
            <img
              :src="message.file!.preview!.href"
              :alt="message.file!.name"
              loading="lazy"
              class="block w-full h-full object-cover"
            >
          </button>
        </div>
      </section>

      <section v-if="sharedDocuments.length" class="flex flex-col gap-2">
        <h3 class="text-[0.6875rem] font-medium uppercase tracking-wide text-dimmed">
          Dokumente · {{ sharedDocuments.length }}
        </h3>
        <ul class="flex flex-col gap-1.5">
          <li
            v-for="message in sharedDocuments"
            :key="message.id"
            class="flex items-center gap-1 rounded-lg border border-default bg-white dark:bg-neutral-900"
          >
            <!-- Neuer Tab aus demselben Grund wie im Verlauf: Im selben Tab endete das
                 Gespräch (livekit-client trennt bei beforeunload). -->
            <a
              :href="message.file!.href"
              target="_blank"
              rel="noopener noreferrer"
              class="flex flex-1 min-w-0 items-center gap-2 px-3 py-2 rounded-l-lg hover:bg-elevated"
            >
              <UIcon :name="fileIcon(message.file!.kind)" class="size-4 text-dimmed shrink-0" />
              <span class="min-w-0">
                <span class="block text-xs text-toned truncate">{{ message.file!.name }}</span>
                <span class="block text-[0.625rem] text-dimmed">
                  {{ fileSize(message.file!.size) }} · {{ senderLabel(message) }}
                </span>
              </span>
            </a>
            <UButton
              icon="i-lucide-message-square-text"
              color="neutral"
              variant="ghost"
              size="xs"
              class="mr-1.5 shrink-0"
              aria-label="Im Verlauf zeigen"
              title="Im Verlauf zeigen"
              @click="showHistory(message.id)"
            />
          </li>
        </ul>
      </section>
    </div>

    <!-- v-show statt v-if: Der Verlauf bleibt aufgebaut, während die Übersicht offen ist –
         sonst begänne er beim Zurückkehren wieder oben, und das Mitscrollen verlöre seinen
         Stand. -->
    <div
      v-show="view === 'history'"
      ref="list"
      class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pr-0.5"
      @scroll.passive="onListScroll"
    >
      <div
        v-for="message in messages"
        :key="message.id"
        :data-message-id="message.id"
        class="flex flex-col gap-1 rounded-lg transition-colors duration-500"
        :class="[
          message.from === 'self' ? 'items-end' : 'items-start',
          highlighted === message.id ? 'bg-primary/10 ring-2 ring-primary/40 ring-offset-2 ring-offset-default' : '',
        ]"
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

        <!-- Ein Bild mit Vorschau steht als Bild da und öffnet die Großansicht. Breite und
             Höhe stehen vorab fest, damit das nachladende Bild den Verlauf nicht verschiebt –
             sonst liefe das Mitscrollen ans Ende ins Leere. -->
        <button
          v-if="message.file?.kind === 'image' && message.file.preview && message.file.href"
          type="button"
          class="block overflow-hidden rounded-lg border border-default bg-elevated hover:border-primary focus-visible:outline-2 focus-visible:outline-primary"
          :style="{ width: `${previewBox(message.file.preview).width}px`, aspectRatio: `${message.file.preview.width} / ${message.file.preview.height}` }"
          :aria-label="`${message.file.name} groß anzeigen`"
          @click="openViewer(message.id)"
        >
          <img
            :src="message.file.preview.href"
            :alt="message.file.name"
            :width="message.file.preview.width"
            :height="message.file.preview.height"
            loading="lazy"
            class="block w-full h-full object-cover"
          >
        </button>

        <!-- Sonst als Zeile unter dem Text. PDFs zeigt der Viewer des Browsers, alles andere
             wird heruntergeladen – beides in einem neuen Tab.

             `target="_blank"` ist hier keine Geschmacksfrage: Ein Klick im selben Tab löst in
             Chrome `beforeunload`/`pagehide` aus, noch bevor die Antwort als Download erkannt
             ist. livekit-client hängt daran (`disconnectOnPageLeave`) und trennt den Raum –
             das Gespräch wäre danach tot, während die Seite stehen bleibt. Den Dateinamen
             trägt ohnehin der Content-Disposition-Header; das `download`-Attribut wirkt bei
             einer fremden Herkunft nicht. -->
        <component
          :is="message.file.href ? 'a' : 'div'"
          v-else-if="message.file"
          :href="message.file.href"
          :target="message.file.href ? '_blank' : undefined"
          :rel="message.file.href ? 'noopener noreferrer' : undefined"
          class="max-w-[85%] flex items-center gap-2 rounded-lg border border-default px-3 py-2 bg-white dark:bg-neutral-900"
          :class="[
            message.file.href ? 'hover:border-primary hover:bg-elevated cursor-pointer' : 'opacity-60',
            message.status === 'sending' ? 'opacity-60' : '',
          ]"
        >
          <UIcon :name="message.status === 'sending' ? 'i-lucide-loader-circle' : fileIcon(message.file.kind)" class="size-4 text-dimmed shrink-0" :class="message.status === 'sending' ? 'animate-spin' : ''" />
          <span class="min-w-0">
            <span class="block text-xs text-toned truncate">{{ message.file.name }}</span>
            <span class="block text-[0.625rem] text-dimmed">
              {{ fileSize(message.file.size) }}<template v-if="message.file.href"> · {{ message.file.kind === 'file' ? 'herunterladen' : 'öffnen' }}</template>
            </span>
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

    <CallImageViewer v-model:open="viewerOpen" v-model:index="viewerIndex" :images="viewerImages" />

    <div>
      <!-- items-end: Wächst das Feld, bleiben Büroklammer und Senden unten an der letzten
           Zeile – dort, wo getippt wird. -->
      <div class="flex items-end gap-2">
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
        <!-- Wächst mit dem Text bis sechs Zeilen, danach scrollt es innen. Mehr Höhe nähme
             dem Verlauf den Platz, und um lange Texte geht es in diesem Chat nicht. -->
        <UTextarea
          v-model="draft"
          class="flex-1"
          :ui="inputUi"
          :rows="1"
          :maxrows="6"
          autoresize
          :disabled="canSend === false"
          placeholder="Nachricht oder Link …"
          @keydown.enter.exact="onEnter"
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
