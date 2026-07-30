// Pfad-Konstanten für S3-Objekte, siehe doc/s3-verzeichnisschema.md.
// Stand: nur coachAvatarKey ist implementiert; das übrige im Doc beschriebene
// Schema (Klienten-Dokumente, Sitzungs-Assets, Studio-Assets) ist noch geplant.

export function coachAvatarKey(organizationId: string): string {
  return `${organizationId}/profile/avatar.webp`;
}
