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
  /** Meldung, die der Aufrufer zeigen soll – etwa eine Datei, die nicht durchkommt. */
  const errorMessage = ref<string | null>(null);
  const unread = ref(false);
  const latestPeerText = ref<string | null>(null);

  let lastSeq = 0;
  let loading = false;
  let again = false;
  /** Dateien, deren Nachricht noch nicht beim Server liegt – für den zweiten Versuch. */
  const pendingFiles = new Map<string, File>();

  const base = `${apiUrl}/api/v1/bookings/${options.bookingId}/waiting-room/messages`;
  const fileBase = `${apiUrl}/api/v1/bookings/${options.bookingId}/waiting-room/files`;

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
        // Der Link zeigt auf die API, nicht auf den Speicher: Sie prüft beim Klick und leitet
        // dann auf einen signierten, kurzlebigen Link weiter.
        file: row.file
          ? {
              name: row.file.name,
              size: row.file.size,
              href: `${fileBase}/${row.file.id}?token=${encodeURIComponent(options.token)}`,
            }
          : undefined,
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

  // „Unterwegs" darf nicht stehen bleiben: Wer schreibt, weil der Ton fehlt, muss sehen, dass
  // seine Nachricht nicht angekommen ist.
  function markFailed(clientMessageId: string): void {
    const index = messages.value.findIndex((known) => known.id === clientMessageId);
    if (index >= 0) messages.value[index] = { ...messages.value[index]!, status: 'failed' };
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
      markFailed(clientMessageId);
    }
  }

  /**
   * Eine Datei teilen. Sie geht über die API, nicht direkt in den Speicher: Erst dort wird
   * geprüft, was für eine Datei es wirklich ist – und ein Bild verliert seine Metadaten,
   * bevor es liegen bleibt.
   */
  async function deliverFile(clientMessageId: string, text: string, file: File): Promise<void> {
    const form = new FormData();
    form.append('token', options.token);
    form.append('clientMessageId', clientMessageId);
    if (text) form.append('text', text);
    form.append('file', file);

    try {
      const res = await fetch(`${base}/files`, { method: 'POST', body: form });
      if (!res.ok) {
        // 400 heißt: Diese Datei kommt auch beim zweiten Versuch nicht durch.
        errorMessage.value = res.status === 400
          ? 'Diese Datei lässt sich nicht teilen. Erlaubt sind PDF, Bilder und Office-Dateien bis 25 MB.'
          : 'Die Datei konnte nicht gesendet werden.';
        markFailed(clientMessageId);
        return;
      }
      pendingFiles.delete(clientMessageId);
      apply([(await res.json()) as CallChatMessageResponse]);
    } catch {
      errorMessage.value = 'Die Datei konnte nicht gesendet werden.';
      markFailed(clientMessageId);
    }
  }

  function sendFile(file: File): void {
    if (!options.canSend()) return;

    const clientMessageId = crypto.randomUUID();
    const text = draft.value.trim();
    pendingFiles.set(clientMessageId, file);
    messages.value.push({
      id: clientMessageId,
      from: 'self',
      text,
      time: formatTime(new Date().toISOString()),
      status: 'sending',
      // Ohne href: Bis die Datei liegt, gibt es nichts herunterzuladen.
      file: { name: file.name, size: file.size },
    });
    draft.value = '';
    void deliverFile(clientMessageId, text, file);
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

    // Bei einer Datei liegt der zweite Versuch nur an, solange sie noch im Speicher des
    // Browsers liegt – nach einem Reload ist sie weg, und die Nachricht auch.
    const file = pendingFiles.get(id);
    if (file) void deliverFile(id, message.text, file);
    else void deliver(id, message.text);
  }

  watch(chatSignal, () => void fetchSince());
  watch(
    () => options.visible(),
    (visible) => {
      if (visible) unread.value = false;
    },
  );

  onMounted(() => void fetchSince());

  return { draft, messages, unread, latestPeerText, loadError, errorMessage, send, sendFile, retry };
}
