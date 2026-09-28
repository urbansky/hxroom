import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { apiUrl } from '../utils/api';
import type { CallChatMessageResponse, CallChatMessagesResponse, CallChatSender } from '@hxroom/shared';
import type { CallChatFile, CallChatMessage } from '@hxroom/ui';

/**
 * Der Ereignisstrom meldet hierher, dass es neue Nachrichten gibt (B7). Ein Zähler auf
 * Modulebene statt eines Rückrufs: Der Strom liegt in CallView, der Chat in CallStage – und
 * ein zweiter EventSource wäre der falsche Preis dafür. Er zählte hier außerdem als zweite
 * Anwesenheit des Klienten.
 */
/** Nach einem gescheiterten Abruf des Verlaufs erneut versuchen. */
const FETCH_RETRY_MS = 4000;

const chatSignal = ref(0);
/** Wie chatSignal, aber für „lade den Verlauf ganz". */
const chatResetSignal = ref(0);

/** Vom Ereignisstrom aufgerufen: bei einem `chat`-Ereignis und nach jedem Zustandsereignis. */
export function notifyCallChatEvent(): void {
  chatSignal.value++;
}

/**
 * Vom Ereignisstrom aufgerufen, wenn sich eine vorhandene Nachricht geändert hat
 * (`chat-changed`, etwa eine entfernte Datei) und bei jedem Wiederverbinden: Was in einer
 * Lücke geändert wurde, sieht das Nachholen nach Nummern nicht.
 */
export function notifyCallChatChanged(): void {
  chatResetSignal.value++;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Was der Chat aus einer Datei macht. `href` und die Vorschau zeigen auf die API; `query`
 * hängt den Token an – weder ein Link noch ein `<img>` kann Kopfzeilen setzen.
 */
function chatFile(
  file: NonNullable<CallChatMessageResponse['file']>,
  href: string,
  query: string,
): CallChatFile {
  const kind = file.mimeType.startsWith('image/') ? 'image' : file.mimeType === 'application/pdf' ? 'pdf' : 'file';
  return {
    id: file.id,
    name: file.name,
    size: file.size,
    kind,
    href: `${href}${query}`,
    preview: file.preview
      ? { href: `${href}/preview${query}`, width: file.preview.width, height: file.preview.height }
      : undefined,
  };
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
  /** Beim nächsten Abruf den ganzen Verlauf holen statt nur das Neue. */
  let fullPending = false;
  /** Dateien, deren Nachricht noch nicht beim Server liegt – für den zweiten Versuch. */
  const pendingFiles = new Map<string, File>();

  const base = `${apiUrl}/api/v1/bookings/${options.bookingId}/waiting-room/messages`;
  const fileBase = `${apiUrl}/api/v1/bookings/${options.bookingId}/waiting-room/files`;

  /**
   * Gespeicherte Nachrichten einsortieren. Die eigene, längst angezeigte Nachricht wird über
   * `clientMessageId` wiedererkannt und ersetzt – sonst stünde sie zweimal da, sobald das
   * Nachholen die Antwort auf das eigene POST überholt.
   *
   * Den Zeiger bewegt nur das Nachholen, nie die Antwort auf das eigene Senden. Sonst
   * spränge er über eine Nachricht der Gegenseite hinweg, die kurz davor gespeichert, aber
   * noch nicht abgeholt wurde – und die käme erst mit dem nächsten Neuladen.
   */
  /**
   * Eine gespeicherte Nachricht so, wie das Panel sie zeigt. Entfernen darf der Klient nur
   * seine eigenen Dateien und nur im laufenden Gespräch – außerhalb davon sieht er den Chat
   * gar nicht, die Prüfung auf den Zustand liegt deshalb beim Server.
   */
  function toMessage(row: CallChatMessageResponse): CallChatMessage {
    return {
      id: row.clientMessageId,
      from: row.sender === options.self ? 'self' : 'peer',
      text: row.text,
      time: formatTime(row.createdAt),
      // Der Link zeigt auf die API, nicht auf den Speicher: Sie prüft beim Klick und leitet
      // dann auf einen signierten, kurzlebigen Link weiter.
      file: row.file
        ? chatFile(row.file, `${fileBase}/${row.file.id}`, `?token=${encodeURIComponent(options.token)}`)
        : undefined,
      fileRemoved: row.fileRemoved ? { by: row.fileRemoved.by === options.self ? 'self' : 'peer' } : undefined,
      removable: !!row.file && row.sender === options.self,
    };
  }

  function apply(rows: CallChatMessageResponse[], source: 'fetch' | 'own'): void {
    let fromPeer: string | null = null;

    for (const row of rows) {
      if (source === 'fetch' && row.seq > lastSeq) lastSeq = row.seq;

      const message = toMessage(row);

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

  /**
   * Den ganzen Verlauf übernehmen, etwa nachdem eine Datei entfernt wurde – das Nachholen nach
   * Nummern sieht nur neue Nachrichten, keine geänderten. Eigene Nachrichten, die noch
   * unterwegs oder gescheitert sind, liegen noch nicht beim Server und bleiben am Ende stehen.
   * Gegenstück zu mergeFullHistory in der Coach-App.
   */
  function replaceAll(rows: CallChatMessageResponse[]): void {
    const known = new Set(messages.value.map((message) => message.id));
    const stored = new Set(rows.map((row) => row.clientMessageId));
    const pending = messages.value.filter((message) => message.status && !stored.has(message.id));

    messages.value = [...rows.map(toMessage), ...pending];
    lastSeq = rows.reduce((max, row) => Math.max(max, row.seq), lastSeq);

    const added = rows.filter((row) => row.sender !== options.self && !known.has(row.clientMessageId));
    const fromPeer = added[added.length - 1];
    if (fromPeer) {
      latestPeerText.value = fromPeer.text;
      if (!options.visible()) unread.value = true;
    }
  }

  async function fetchSince(full = false): Promise<void> {
    if (full) fullPending = true;

    // Nie zwei Abrufe gleichzeitig – der spätere könnte den früheren überholen.
    if (loading) {
      again = true;
      return;
    }

    loading = true;
    const loadAll = fullPending || !lastSeq;
    fullPending = false;
    try {
      const query = new URLSearchParams({ token: options.token });
      if (!loadAll) query.set('after', String(lastSeq));

      const res = await fetch(`${base}?${query}`);
      if (!res.ok) throw new Error('failed');
      const rows = ((await res.json()) as CallChatMessagesResponse).messages;
      if (loadAll) replaceAll(rows);
      else apply(rows, 'fetch');
      loadError.value = false;
    } catch {
      loadError.value = true;
      // Nicht aufgeben: Ein Ereignis, das ankam, während der Abruf danach scheiterte (das Netz
      // war kurz weg), käme sonst nie nach – bei einer entfernten Datei heilt es auch keine
      // spätere Nachricht. Die Bitte, ganz zu laden, bleibt dabei stehen.
      if (loadAll) fullPending = true;
      scheduleRetry();
    } finally {
      loading = false;
      if (again) {
        again = false;
        void fetchSince();
      }
    }
  }

  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  function scheduleRetry(): void {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => void fetchSince(), FETCH_RETRY_MS);
  }
  onBeforeUnmount(() => clearTimeout(retryTimer));

  /**
   * Eigene Datei entfernen. Der Token steht im Body wie beim Senden. Ist die Datei schon weg
   * (404), hat das der Coach erledigt – dann nur den Verlauf auffrischen.
   */
  async function remove(id: string): Promise<void> {
    const fileId = messages.value.find((message) => message.id === id)?.file?.id;
    if (!fileId) return;

    try {
      const res = await fetch(`${fileBase}/${fileId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: options.token }),
      });
      if (res.status === 404) {
        void fetchSince(true);
        return;
      }
      if (!res.ok) throw new Error('failed');
      apply([(await res.json()) as CallChatMessageResponse], 'own');
    } catch {
      errorMessage.value = 'Die Datei konnte nicht entfernt werden.';
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
      apply([(await res.json()) as CallChatMessageResponse], 'own');
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
        // 422: Der Virenscan hat angeschlagen – ebenso endgültig.
        errorMessage.value = res.status === 422
          ? 'Diese Datei wurde beim Virenscan als schädlich erkannt und nicht geteilt.'
          : res.status === 400
            ? 'Diese Datei lässt sich nicht teilen. Erlaubt sind PDF, Bilder und Office-Dateien bis 25 MB.'
            : 'Die Datei konnte nicht gesendet werden.';
        markFailed(clientMessageId);
        return;
      }
      pendingFiles.delete(clientMessageId);
      apply([(await res.json()) as CallChatMessageResponse], 'own');
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
      file: { name: file.name, size: file.size, kind: 'file' },
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
  watch(chatResetSignal, () => void fetchSince(true));
  watch(
    () => options.visible(),
    (visible) => {
      if (visible) unread.value = false;
    },
  );

  onMounted(() => void fetchSince());

  return { draft, messages, unread, latestPeerText, loadError, errorMessage, send, sendFile, retry, remove };
}
