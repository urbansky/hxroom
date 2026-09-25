// Pfad-Konstanten für S3-Objekte, siehe doc/s3-verzeichnisschema.md.
// Stand: Profilbild und Chat-Anhänge; das übrige im Doc beschriebene Schema
// (Klienten-Dokumente, Aufzeichnungen, Studio-Assets) ist noch geplant.

export function coachAvatarKey(organizationId: string): string {
  return `${organizationId}/profile/avatar.webp`;
}

/**
 * Im Call geteilte Datei (B7). Oberstes Segment ist die Organisation, damit die
 * Kontolöschung mit einem einzigen Prefix-Delete auch die Anhänge erfasst; der Dateiname
 * steht in der Datenbank, hier trägt das Objekt nur seine ID.
 *
 * Die Sitzung ist die Buchung – eine eigene Sitzungs-ID gibt es nicht.
 */
export function sessionAttachmentKey(
  organizationId: string,
  bookingId: string,
  fileId: string,
  extension: string,
): string {
  return `${organizationId}/sessions/${bookingId}/attachments/${fileId}.${extension}`;
}

/**
 * Das Vorschaubild eines geteilten Bildes – klein genug, um mitten im Videocall zu laden,
 * ohne dem Video die Leitung wegzunehmen. Liegt neben dem Original, damit der Prefix-Delete
 * der Kontolöschung beide erfasst.
 */
export function sessionAttachmentPreviewKey(organizationId: string, bookingId: string, fileId: string): string {
  return `${organizationId}/sessions/${bookingId}/attachments/${fileId}-preview.webp`;
}
