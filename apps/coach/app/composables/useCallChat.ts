import type { CallChatMessageResponse, CallChatMessagesResponse, CallChatSender } from '@hxroom/shared'
import type { CallChatMessage } from '@hxroom/ui'

/**
 * Der Ereignisstrom meldet hierher, dass es neue Nachrichten gibt (B7). Ein Zähler auf
 * Modulebene statt eines Rückrufs: Strom und Chat liegen in verschiedenen Komponenten – der
 * Strom in der Seite, der Chat in der Seitenleiste –, und ein zweiter EventSource wäre der
 * falsche Preis dafür.
 */
/** Nach einem gescheiterten Abruf des Verlaufs erneut versuchen. */
const FETCH_RETRY_MS = 4000

const chatSignal = ref(0)
/** Wie chatSignal, aber für „lade den Verlauf ganz". */
const chatResetSignal = ref(0)

/** Vom Ereignisstrom aufgerufen: bei einem `chat`-Ereignis und nach jedem Zustandsereignis. */
export function notifyCallChatEvent(): void {
  chatSignal.value++
}

/**
 * Vom Ereignisstrom aufgerufen, wenn sich eine vorhandene Nachricht geändert hat
 * (`chat-changed`, etwa eine entfernte Datei) und bei jedem (Wieder-)Verbinden: Was in einer
 * Lücke geändert wurde, sieht das Nachholen nach Nummern nicht.
 */
export function notifyCallChatChanged(): void {
  chatResetSignal.value++
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
  /** Zählt gescheiterte Versuche, eine Datei zu entfernen – der Aufrufer meldet sie. */
  const removeFailed = ref(0)
  /** Neue Nachricht, während der Chat nicht zu sehen war. */
  const unread = ref(false)
  /** Text der letzten fremden Nachricht – für den kurzen Hinweis über der Bühne. */
  const latestPeerText = ref<string | null>(null)

  /** Höchste bekannte Nummer; 0 heißt „noch nichts geladen". */
  let lastSeq = 0
  let loading = false
  let again = false
  /** Beim nächsten Abruf den ganzen Verlauf holen statt nur das Neue. */
  let fullPending = false
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

      const message = toChatMessage(row, { self: options.self, bookingId: options.bookingId, apiUrl })

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

  /** Den ganzen Verlauf übernehmen – siehe mergeFullHistory. */
  function replaceAll(rows: CallChatMessageResponse[]): void {
    const loaded = rows.map(row => toChatMessage(row, { self: options.self, bookingId: options.bookingId, apiUrl }))
    const { messages: merged, added } = mergeFullHistory(messages.value, loaded)
    messages.value = merged
    lastSeq = rows.reduce((max, row) => Math.max(max, row.seq), lastSeq)

    const fromPeer = added.filter(message => message.from === 'peer').at(-1)
    if (fromPeer) {
      latestPeerText.value = fromPeer.text
      if (!options.visible()) unread.value = true
    }
  }

  async function fetchSince(full = false): Promise<void> {
    if (full) fullPending = true

    // Nie zwei Abrufe gleichzeitig: Der spätere könnte den früheren überholen, und dann wäre
    // lastSeq weiter als der Verlauf auf dem Schirm.
    if (loading) {
      again = true
      return
    }

    loading = true
    const loadAll = fullPending || !lastSeq
    fullPending = false
    try {
      const res = await $api<CallChatMessagesResponse>(`/bookings/${options.bookingId}/call/messages`, {
        query: loadAll ? undefined : { after: lastSeq },
      })
      if (loadAll) replaceAll(res.messages)
      else apply(res.messages, 'fetch')
      loadError.value = false
    } catch {
      loadError.value = true
      // Nicht aufgeben: Ein Ereignis, das ankam, während der Abruf danach scheiterte (das Netz
      // war kurz weg), käme sonst nie nach – bei einer entfernten Datei heilt es auch keine
      // spätere Nachricht. Die Bitte, ganz zu laden, bleibt dabei stehen.
      if (loadAll) fullPending = true
      scheduleRetry()
    } finally {
      loading = false
      if (again) {
        again = false
        void fetchSince()
      }
    }
  }

  let retryTimer: ReturnType<typeof setTimeout> | undefined
  function scheduleRetry(): void {
    clearTimeout(retryTimer)
    retryTimer = setTimeout(() => void fetchSince(), FETCH_RETRY_MS)
  }
  onBeforeUnmount(() => clearTimeout(retryTimer))

  /**
   * Die Datei einer Nachricht entfernen. Die Antwort ist die Nachricht mit ihrem Platzhalter;
   * das Gegenüber erfährt es über den Ereigniskanal. Ist die Datei schon weg (404), hat das
   * jemand anderes erledigt – dann nur den Verlauf auffrischen.
   */
  async function remove(id: string): Promise<void> {
    const fileId = messages.value.find(message => message.id === id)?.file?.id
    if (!fileId) return

    try {
      const saved = await $api<CallChatMessageResponse>(`/bookings/${options.bookingId}/call/files/${fileId}`, {
        method: 'DELETE',
      })
      apply([saved], 'own')
    } catch (err) {
      if ((err as { statusCode?: number })?.statusCode === 404) void fetchSince(true)
      else removeFailed.value++
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
      // 422: Der Virenscan hat angeschlagen – ebenso endgültig.
      errorMessage.value = status === 422
        ? 'Diese Datei wurde beim Virenscan als schädlich erkannt und nicht geteilt.'
        : status === 400
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
      time:   chatTimeNow(),
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
      time:   chatTimeNow(),
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
  watch(chatResetSignal, () => void fetchSince(true))
  watch(() => options.visible(), (visible) => {
    if (visible) unread.value = false
  })

  onMounted(() => void fetchSince())

  return { draft, messages, unread, latestPeerText, loadError, errorMessage, removeFailed, send, sendFile, retry, remove }
}
