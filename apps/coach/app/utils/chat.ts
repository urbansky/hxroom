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
 */
export function toChatMessage(
  row: CallChatMessageResponse,
  options: { self: CallChatSender, bookingId: string, apiUrl: string },
): CallChatMessage {
  return {
    id:   row.clientMessageId,
    from: row.sender === options.self ? 'self' : 'peer',
    text: row.text,
    time: formatChatTime(row.createdAt),
    file: row.file ? toChatFile(row.file, `${options.apiUrl}/bookings/${options.bookingId}/call/files/${row.file.id}`) : undefined,
  }
}

/** Uhrzeit für eine Nachricht, die gerade erst entsteht und noch keine vom Server hat. */
export function chatTimeNow(): string {
  return formatChatTime(new Date().toISOString())
}

function toChatFile(file: NonNullable<CallChatMessageResponse['file']>, href: string): CallChatFile {
  const kind = file.mimeType.startsWith('image/') ? 'image' : file.mimeType === 'application/pdf' ? 'pdf' : 'file'
  return {
    name: file.name,
    size: file.size,
    kind,
    href,
    preview: file.preview
      ? { href: `${href}/preview`, width: file.preview.width, height: file.preview.height }
      : undefined,
  }
}
