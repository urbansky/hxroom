import { onMounted, ref, watch } from 'vue';
import { apiUrl } from '../utils/api';
import type { CallChatMessageResponse, CallChatMessagesResponse, CallChatSender } from '@hxroom/shared';
import type { CallChatMessage } from '@hxroom/ui';

/**
 * Der Ereignisstrom meldet hierher, dass es neue Nachrichten gibt (B7). Ein Zähler auf
 * Modulebene statt eines Rückrufs: Der Strom liegt in CallView, der Chat in CallStage – und
 * ein zweiter EventSource wäre der falsche Preis dafür. Er zählte hier außerdem als zweite
 * Anwesenheit des Klienten.
 */
const chatSignal = ref(0);

/** Vom Ereignisstrom aufgerufen: bei einem `chat`-Ereignis und nach jedem Zustandsereignis. */
export function notifyCallChatEvent(): void {
  chatSignal.value++;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Chat einer Sitzung auf der Klientenseite (doc/videocall-umsetzungsplan.md B7) – das
 * Gegenstück zu useCallChat in der Coach-App. Unterschied ist allein der Ausweis: Hier ist es
 * der Token aus dem Mail-Link, dort die Session.
 *
 * Nachgeholt statt gepuffert: Gefragt wird stets nach „was kam nach der letzten Nachricht, die
 * ich habe?". Ein Verbindungsabbruch heilt damit von selbst.
 */
export function useCallChat(options: {
  bookingId: string;
  token: string;
  /** Wer man selbst ist – hier immer 'client'. */
  self: CallChatSender;
  canSend: () => boolean;
  visible: () => boolean;
}) {
  const draft = ref('');
  const messages = ref<CallChatMessage[]>([]);
  const loadError = ref(false);
  const unread = ref(false);
  const latestPeerText = ref<string | null>(null);

  let lastSeq = 0;
  let loading = false;
  let again = false;

  const base = `${apiUrl}/api/v1/bookings/${options.bookingId}/waiting-room/messages`;

  /**
   * Gespeicherte Nachrichten einsortieren. Die eigene, längst angezeigte Nachricht wird über
   * `clientMessageId` wiedererkannt und ersetzt – sonst stünde sie zweimal da, sobald das
   * Nachholen die Antwort auf das eigene POST überholt.
   */
  function apply(rows: CallChatMessageResponse[]): void {
    let fromPeer: string | null = null;

    for (const row of rows) {
      if (row.seq > lastSeq) lastSeq = row.seq;

      const message: CallChatMessage = {
        id: row.clientMessageId,
        from: row.sender === options.self ? 'self' : 'peer',
        text: row.text,
        time: formatTime(row.createdAt),
      };

      const index = messages.value.findIndex((known) => known.id === message.id);
      if (index >= 0) {
        messages.value[index] = message;
      } else {
        messages.value.push(message);
        if (message.from === 'peer') fromPeer = message.text;
      }
    }

    if (fromPeer !== null) {
      latestPeerText.value = fromPeer;
      if (!options.visible()) unread.value = true;
    }
  }

  async function fetchSince(): Promise<void> {
    // Nie zwei Abrufe gleichzeitig – der spätere könnte den früheren überholen.
    if (loading) {
      again = true;
      return;
    }

    loading = true;
    try {
      const query = new URLSearchParams({ token: options.token });
      if (lastSeq) query.set('after', String(lastSeq));

      const res = await fetch(`${base}?${query}`);
      if (!res.ok) throw new Error('failed');
      apply(((await res.json()) as CallChatMessagesResponse).messages);
      loadError.value = false;
    } catch {
      loadError.value = true;
    } finally {
      loading = false;
      if (again) {
        again = false;
        void fetchSince();
      }
    }
  }

  async function deliver(clientMessageId: string, text: string): Promise<void> {
    try {
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: options.token, clientMessageId, text }),
      });
      if (!res.ok) throw new Error('failed');
      apply([(await res.json()) as CallChatMessageResponse]);
    } catch {
      const index = messages.value.findIndex((known) => known.id === clientMessageId);
      // „Unterwegs" darf nicht stehen bleiben: Wer schreibt, weil der Ton fehlt, muss sehen,
      // dass seine Nachricht nicht angekommen ist.
      if (index >= 0) messages.value[index] = { ...messages.value[index]!, status: 'failed' };
    }
  }

  function send(): void {
    const text = draft.value.trim();
    if (!text || !options.canSend()) return;

    // Die Kennung entsteht hier und bleibt über einen zweiten Versuch hinweg dieselbe – die
    // API legt damit keine zweite Nachricht an.
    const clientMessageId = crypto.randomUUID();
    messages.value.push({
      id: clientMessageId,
      from: 'self',
      text,
      time: formatTime(new Date().toISOString()),
      status: 'sending',
    });
    draft.value = '';
    void deliver(clientMessageId, text);
  }

  function retry(id: string): void {
    const index = messages.value.findIndex((known) => known.id === id);
    const message = index >= 0 ? messages.value[index]! : null;
    if (!message || message.status !== 'failed') return;

    messages.value[index] = { ...message, status: 'sending' };
    void deliver(id, message.text);
  }

  watch(chatSignal, () => void fetchSince());
  watch(
    () => options.visible(),
    (visible) => {
      if (visible) unread.value = false;
    },
  );

  onMounted(() => void fetchSince());

  return { draft, messages, unread, latestPeerText, loadError, send, retry };
}
