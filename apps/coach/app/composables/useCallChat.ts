import type { CallChatMessageResponse, CallChatMessagesResponse, CallChatSender } from '@hxroom/shared'
import type { CallChatFile, CallChatMessage } from '@hxroom/ui'

/**
 * Der Ereignisstrom meldet hierher, dass es neue Nachrichten gibt (B7). Ein Zähler auf
 * Modulebene statt eines Rückrufs: Strom und Chat liegen in verschiedenen Komponenten – der
 * Strom in der Seite, der Chat in der Seitenleiste –, und ein zweiter EventSource wäre der
 * falsche Preis dafür.
 */
const chatSignal = ref(0)

/** Vom Ereignisstrom aufgerufen: bei einem `chat`-Ereignis und nach jedem Zustandsereignis. */
export function notifyCallChatEvent(): void {
  chatSignal.value++
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Was der Chat aus einer Datei macht. `href` und die Vorschau zeigen auf die API; `query`
 * hängt den Ausweis an, wo einer nötig ist (hier: keiner, das Cookie reicht).
 */
function chatFile(
  file: NonNullable<CallChatMessageResponse['file']>,
  href: string,
  query: string,
): CallChatFile {
  const kind = file.mimeType.startsWith('image/') ? 'image' : file.mimeType === 'application/pdf' ? 'pdf' : 'file'
  return {
    name: file.name,
    size: file.size,
    kind,
    href: `${href}${query}`,
    preview: file.preview
      ? { href: `${href}/preview${query}`, width: file.preview.width, height: file.preview.height }
      : undefined,
  }
}

/**
 * Chat einer Sitzung – Verlauf, Senden und Nachholen (doc/videocall-umsetzungsplan.md B7).
 * Gegenstück zu useCallChat in der Klienten-App; dort ist der Ausweis der Token, hier die
 * Session.
 *
 * Der Zustand gehört dem Aufrufer und nicht dem Panel: Der Tab-Wechsel der Seitenleiste baut
 * es ab, und der Verlauf soll das überleben – wie bei useSessionNotes.
 *
 * Nachgeholt statt gepuffert: Jede Nachricht trägt eine fortlaufende Nummer, und gefragt wird
 * stets nach „was kam nach der letzten, die ich habe?". Damit heilt ein Verbindungsabbruch von
 * selbst, sobald der Strom wieder etwas meldet.
 */
export function useCallChat(options: {
  bookingId: string
  /** Wer man selbst ist – hier immer 'coach'. Entscheidet, welche Blase links und rechts steht. */
  self: CallChatSender
  /** Darf gerade geschrieben werden? Nur im laufenden Gespräch. */
  canSend: () => boolean
  /** Ist der Chat gerade zu sehen? Wenn nicht, wird eine neue Nachricht als ungelesen vermerkt. */
  visible: () => boolean
}) {
  const { $api } = useApi()
  const { public: { apiUrl } } = useRuntimeConfig()

  const draft = ref('')
  const messages = ref<CallChatMessage[]>([])
  const loadError = ref(false)
  /** Meldung, die der Aufrufer zeigen soll – etwa eine Datei, die nicht durchkommt. */
  const errorMessage = ref<string | null>(null)
  /** Neue Nachricht, während der Chat nicht zu sehen war. */
  const unread = ref(false)
  /** Text der letzten fremden Nachricht – für den kurzen Hinweis über der Bühne. */
  const latestPeerText = ref<string | null>(null)

  /** Höchste bekannte Nummer; 0 heißt „noch nichts geladen". */
  let lastSeq = 0
  let loading = false
  let again = false
  /** Dateien, deren Nachricht noch nicht beim Server liegt – für den zweiten Versuch. */
  const pendingFiles = new Map<string, File>()

  /**
   * Gespeicherte Nachrichten einsortieren. Die eigene, längst angezeigte Nachricht wird über
   * `clientMessageId` wiedererkannt und ersetzt – ohne sie stünde sie zweimal da, sobald das
   * Nachholen die Antwort auf das eigene POST überholt.
   *
   * Den Zeiger bewegt nur das Nachholen, nie die Antwort auf das eigene Senden. Sonst
   * spränge er über eine Nachricht der Gegenseite hinweg, die kurz davor gespeichert, aber
   * noch nicht abgeholt wurde – und die käme erst mit dem nächsten Neuladen.
   */
  function apply(rows: CallChatMessageResponse[], source: 'fetch' | 'own'): void {
    let fromPeer: string | null = null

    for (const row of rows) {
      if (source === 'fetch' && row.seq > lastSeq) lastSeq = row.seq

      const message: CallChatMessage = {
        id:   row.clientMessageId,
        from: row.sender === options.self ? 'self' : 'peer',
        text: row.text,
        time: formatTime(row.createdAt),
        // Der Link zeigt auf die API, nicht auf den Speicher: Sie prüft beim Klick und leitet
        // dann auf einen signierten, kurzlebigen Link weiter.
        file: row.file ? chatFile(row.file, `${apiUrl}/bookings/${options.bookingId}/call/files/${row.file.id}`, '') : undefined,
      }

      const index = messages.value.findIndex(known => known.id === message.id)
      if (index >= 0) {
        messages.value[index] = message
      } else {
        messages.value.push(message)
        if (message.from === 'peer') fromPeer = message.text
      }
    }

    if (fromPeer !== null) {
      latestPeerText.value = fromPeer
      if (!options.visible()) unread.value = true
    }
  }

  async function fetchSince(): Promise<void> {
    // Nie zwei Abrufe gleichzeitig: Der spätere könnte den früheren überholen, und dann wäre
    // lastSeq weiter als der Verlauf auf dem Schirm.
    if (loading) {
      again = true
      return
    }

    loading = true
    try {
      const res = await $api<CallChatMessagesResponse>(`/bookings/${options.bookingId}/call/messages`, {
        query: lastSeq ? { after: lastSeq } : undefined,
      })
      apply(res.messages, 'fetch')
      loadError.value = false
    } catch {
      loadError.value = true
    } finally {
      loading = false
      if (again) {
        again = false
        void fetchSince()
      }
    }
  }

  // „Unterwegs" darf nicht stehen bleiben: Wer im Tonausfall schreibt, muss sehen, dass seine
  // Nachricht nicht angekommen ist.
  function markFailed(clientMessageId: string): void {
    const index = messages.value.findIndex(known => known.id === clientMessageId)
    if (index >= 0) messages.value[index] = { ...messages.value[index]!, status: 'failed' }
  }

  async function deliver(clientMessageId: string, text: string): Promise<void> {
    try {
      const saved = await $api<CallChatMessageResponse>(`/bookings/${options.bookingId}/call/messages`, {
        method: 'POST',
        body: { clientMessageId, text },
      })
      apply([saved], 'own')
    } catch {
      markFailed(clientMessageId)
    }
  }

  /**
   * Eine Datei teilen. Sie geht über die API, nicht direkt in den Speicher: Erst dort wird
   * geprüft, was für eine Datei es wirklich ist – und ein Bild verliert seine Metadaten,
   * bevor es liegen bleibt.
   */
  async function deliverFile(clientMessageId: string, text: string, file: File): Promise<void> {
    const form = new FormData()
    form.append('clientMessageId', clientMessageId)
    if (text) form.append('text', text)
    form.append('file', file)

    try {
      const saved = await $api<CallChatMessageResponse>(`/bookings/${options.bookingId}/call/messages/files`, {
        method: 'POST',
        body: form,
      })
      pendingFiles.delete(clientMessageId)
      apply([saved], 'own')
    } catch (err) {
      const status = (err as { statusCode?: number })?.statusCode
      // 400 heißt: Diese Datei kommt auch beim zweiten Versuch nicht durch. Das gehört gesagt,
      // sonst klickt jemand „Erneut senden", bis er aufgibt.
      errorMessage.value = status === 400
        ? 'Diese Datei lässt sich nicht teilen. Erlaubt sind PDF, Bilder und Office-Dateien bis 25 MB.'
        : 'Die Datei konnte nicht gesendet werden.'
      markFailed(clientMessageId)
    }
  }

  function sendFile(file: File): void {
    if (!options.canSend()) return

    const clientMessageId = crypto.randomUUID()
    const text = draft.value.trim()
    pendingFiles.set(clientMessageId, file)
    messages.value.push({
      id:     clientMessageId,
      from:   'self',
      text,
      time:   formatTime(new Date().toISOString()),
      status: 'sending',
      // Ohne href: Bis die Datei liegt, gibt es nichts herunterzuladen.
      file:   { name: file.name, size: file.size, kind: 'file' },
    })
    draft.value = ''
    void deliverFile(clientMessageId, text, file)
  }

  function send(): void {
    const text = draft.value.trim()
    if (!text || !options.canSend()) return

    // Die Kennung entsteht hier und bleibt dieselbe, auch über einen zweiten Versuch hinweg –
    // die API legt damit keine zweite Nachricht an.
    const clientMessageId = crypto.randomUUID()
    messages.value.push({
      id:     clientMessageId,
      from:   'self',
      text,
      time:   formatTime(new Date().toISOString()),
      status: 'sending',
    })
    draft.value = ''
    void deliver(clientMessageId, text)
  }

  function retry(id: string): void {
    const index = messages.value.findIndex(known => known.id === id)
    const message = index >= 0 ? messages.value[index]! : null
    if (!message || message.status !== 'failed') return

    messages.value[index] = { ...message, status: 'sending' }

    // Bei einer Datei liegt der zweite Versuch nur an, solange die Datei noch im Speicher des
    // Browsers liegt – nach einem Reload ist sie weg, und die Nachricht auch.
    const file = pendingFiles.get(id)
    if (file) void deliverFile(id, message.text, file)
    else void deliver(id, message.text)
  }

  watch(chatSignal, () => void fetchSince())
  watch(() => options.visible(), (visible) => {
    if (visible) unread.value = false
  })

  onMounted(() => void fetchSince())

  return { draft, messages, unread, latestPeerText, loadError, errorMessage, send, sendFile, retry }
}
