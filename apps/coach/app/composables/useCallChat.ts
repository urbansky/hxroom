import type { CallChatMessageResponse, CallChatMessagesResponse, CallChatSender } from '@hxroom/shared'
import type { CallChatMessage } from '@hxroom/ui'

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

  const draft = ref('')
  const messages = ref<CallChatMessage[]>([])
  const loadError = ref(false)
  /** Neue Nachricht, während der Chat nicht zu sehen war. */
  const unread = ref(false)
  /** Text der letzten fremden Nachricht – für den kurzen Hinweis über der Bühne. */
  const latestPeerText = ref<string | null>(null)

  /** Höchste bekannte Nummer; 0 heißt „noch nichts geladen". */
  let lastSeq = 0
  let loading = false
  let again = false

  /**
   * Gespeicherte Nachrichten einsortieren. Die eigene, längst angezeigte Nachricht wird über
   * `clientMessageId` wiedererkannt und ersetzt – ohne sie stünde sie zweimal da, sobald das
   * Nachholen die Antwort auf das eigene POST überholt.
   */
  function apply(rows: CallChatMessageResponse[]): void {
    let fromPeer: string | null = null

    for (const row of rows) {
      if (row.seq > lastSeq) lastSeq = row.seq

      const message: CallChatMessage = {
        id:   row.clientMessageId,
        from: row.sender === options.self ? 'self' : 'peer',
        text: row.text,
        time: formatTime(row.createdAt),
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
      apply(res.messages)
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

  async function deliver(clientMessageId: string, text: string): Promise<void> {
    try {
      const saved = await $api<CallChatMessageResponse>(`/bookings/${options.bookingId}/call/messages`, {
        method: 'POST',
        body: { clientMessageId, text },
      })
      apply([saved])
    } catch {
      const index = messages.value.findIndex(known => known.id === clientMessageId)
      // „Unterwegs" darf nicht stehen bleiben: Wer im Tonausfall schreibt, muss sehen, dass
      // seine Nachricht nicht angekommen ist.
      if (index >= 0) messages.value[index] = { ...messages.value[index]!, status: 'failed' }
    }
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
    void deliver(id, message.text)
  }

  watch(chatSignal, () => void fetchSince())
  watch(() => options.visible(), (visible) => {
    if (visible) unread.value = false
  })

  onMounted(() => void fetchSince())

  return { draft, messages, unread, latestPeerText, loadError, send, retry }
}
