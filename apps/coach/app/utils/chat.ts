import type { CallChatMessageResponse, CallChatSender } from '@hxroom/shared'
import type { CallChatFile, CallChatMessage } from '@hxroom/ui'

function formatChatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Eine gespeicherte Chatnachricht so, wie `CallChatPanel` sie zeigt – im Call (useCallChat)
 * und im Termin-Detail (useSessionChat).
 *
 * Der Link auf eine Datei zeigt auf die API, nicht auf den Speicher: Sie prüft beim Klick und
 * leitet dann auf einen signierten, kurzlebigen Link weiter. Deshalb funktioniert er auch
 * Tage nach der Sitzung noch. Ein Ausweis im Query-String ist hier nicht nötig, das Cookie
 * reicht.
 *
 * Entfernen darf der Coach jede Datei, jederzeit (`mayRemoveChatFile` in der API) – jede
 * Nachricht mit Datei ist hier also `removable`.
 */
export function toChatMessage(
  row: CallChatMessageResponse,
  options: { self: CallChatSender, bookingId: string, apiUrl: string },
): CallChatMessage {
  return {
    id:          row.clientMessageId,
    from:        row.sender === options.self ? 'self' : 'peer',
    text:        row.text,
    time:        formatChatTime(row.createdAt),
    file:        row.file ? toChatFile(row.file, chatFileUrl(options.apiUrl, options.bookingId, row.file.id)) : undefined,
    fileRemoved: row.fileRemoved ? { by: row.fileRemoved.by === options.self ? 'self' : 'peer' } : undefined,
    removable:   !!row.file,
  }
}

/** Die Adresse einer geteilten Datei bei der API – zum Öffnen und zum Entfernen. */
export function chatFileUrl(apiUrl: string, bookingId: string, fileId: string): string {
  return `${apiUrl}/bookings/${bookingId}/call/files/${fileId}`
}

/**
 * Den ganzen Verlauf übernehmen, etwa nachdem eine Datei entfernt wurde: Das Nachholen nach
 * Nummern sieht nur neue Nachrichten, keine geänderten. Eigene Nachrichten, die noch unterwegs
 * oder gescheitert sind, liegen noch nicht beim Server und bleiben am Ende stehen.
 *
 * Gibt die Nachrichten zurück, die vorher nicht bekannt waren – für den Ungelesen-Hinweis.
 */
export function mergeFullHistory(current: CallChatMessage[], loaded: CallChatMessage[]): {
  messages: CallChatMessage[]
  added: CallChatMessage[]
} {
  const known = new Set(current.map(message => message.id))
  const stored = new Set(loaded.map(message => message.id))
  const pending = current.filter(message => message.status && !stored.has(message.id))
  return {
    messages: [...loaded, ...pending],
    added:    loaded.filter(message => !known.has(message.id)),
  }
}

/** Uhrzeit für eine Nachricht, die gerade erst entsteht und noch keine vom Server hat. */
export function chatTimeNow(): string {
  return formatChatTime(new Date().toISOString())
}

function toChatFile(file: NonNullable<CallChatMessageResponse['file']>, href: string): CallChatFile {
  const kind = file.mimeType.startsWith('image/') ? 'image' : file.mimeType === 'application/pdf' ? 'pdf' : 'file'
  return {
    id:   file.id,
    name: file.name,
    size: file.size,
    kind,
    href,
    preview: file.preview
      ? { href: `${href}/preview`, width: file.preview.width, height: file.preview.height }
      : undefined,
  }
}
