import { CALL_FILE_TYPES } from '@hxroom/shared';

/**
 * Was für eine Datei ist das wirklich (doc/videocall-umsetzungsplan.md B7)?
 *
 * Der `mimetype` aus dem Upload kommt vom Browser und damit vom Absender – auf der
 * Klientenseite von jemandem ohne Konto. Geprüft werden deshalb Endung **und** Signatur, und
 * gespeichert wird der hier ermittelte Typ. Er bestimmt später die Antwort beim Download; eine
 * als PDF benannte HTML-Datei käme so gar nicht erst in den Speicher.
 *
 * Bewusst ohne Bibliothek: Es geht um acht Formate mit kurzen, stabilen Signaturen.
 */

type Matcher = (buffer: Buffer) => boolean;

const startsWith = (...bytes: number[]): Matcher =>
  (buffer) => bytes.every((byte, index) => buffer[index] === byte);

// '%PDF-' – laut Spezifikation am Dateianfang.
const isPdf = startsWith(0x25, 0x50, 0x44, 0x46, 0x2d);
const isPng = startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const isJpeg = startsWith(0xff, 0xd8, 0xff);
// RIFF....WEBP
const isWebp: Matcher = (buffer) =>
  startsWith(0x52, 0x49, 0x46, 0x46)(buffer) && buffer.subarray(8, 12).toString('latin1') === 'WEBP';

/**
 * docx, xlsx und pptx sind ZIP-Archive und an der Signatur nicht voneinander zu
 * unterscheiden. Die Endung entscheidet also, welches der drei es ist – geprüft ist damit,
 * dass es überhaupt ein Office-Dokument ist und keine umbenannte HTML- oder Skriptdatei.
 * Makro-Formate (`.docm` und Verwandte) stehen nicht auf der Liste und fallen mit ihrer
 * Endung durch; Word führt Makros in einer `.docx` nicht aus.
 */
const isZip: Matcher = (buffer) =>
  startsWith(0x50, 0x4b, 0x03, 0x04)(buffer)
  || startsWith(0x50, 0x4b, 0x05, 0x06)(buffer)
  || startsWith(0x50, 0x4b, 0x07, 0x08)(buffer);

const SIGNATURES: Record<string, Matcher> = {
  pdf:  isPdf,
  jpg:  isJpeg,
  jpeg: isJpeg,
  png:  isPng,
  webp: isWebp,
  docx: isZip,
  xlsx: isZip,
  pptx: isZip,
};

export interface CallFileType {
  extension: string;
  mimeType: string;
  /** Bilder werden vor dem Ablegen neu kodiert – ein Handyfoto trägt sonst den Aufnahmeort. */
  isImage: boolean;
}

/** Die Endung in Kleinbuchstaben, ohne Punkt. Leer, wenn der Name keine trägt. */
export function fileExtension(fileName: string): string {
  const match = /\.([A-Za-z0-9]+)$/.exec(fileName.trim());
  return match ? match[1]!.toLowerCase() : '';
}

/**
 * Gibt den erlaubten Typ zurück – oder null, wenn Endung und Inhalt nicht zusammenpassen
 * oder das Format nicht auf der Liste steht.
 */
export function detectCallFileType(fileName: string, buffer: Buffer): CallFileType | null {
  const extension = fileExtension(fileName);
  const allowed = CALL_FILE_TYPES.find((type) => type.extension === extension);
  if (!allowed) return null;

  const matches = SIGNATURES[extension];
  if (!matches || !matches(buffer)) return null;

  return {
    extension,
    mimeType: allowed.mimeType,
    isImage: allowed.mimeType.startsWith('image/'),
  };
}

/**
 * Der Name, unter dem die Datei wieder herunterkommt. Pfadtrenner und Steuerzeichen fliegen
 * raus – der Name steht später in einem Content-Disposition-Header, und der Speicher kennt
 * ihn ohnehin nicht (dort liegt die Datei unter ihrer ID).
 */
/**
 * Den Namen aus dem Upload richtig lesen.
 *
 * busboy – und damit multer – dekodiert den Dateinamen eines Multipart-Feldes als Latin-1,
 * weil das Format keine Angabe zur Kodierung vorsieht. Ein „Fragebogen für Markus.pdf" käme
 * sonst als „Fragebogen fÃ¼r Markus.pdf" in der Datenbank an. Die Bytes zurück und als UTF-8
 * gelesen stellt den Namen wieder her; ergibt das Ersatzzeichen, war er tatsächlich Latin-1
 * und bleibt, wie er war.
 */
function decodeUploadName(fileName: string): string {
  const utf8 = Buffer.from(fileName, 'latin1').toString('utf8');
  return utf8.includes('�') ? fileName : utf8;
}

export function safeFileName(fileName: string): string {
  // Erst der letzte Pfadabschnitt, dann putzen: Andersherum würde aus „../../etc/passwd"
  // ein Name mit Leerzeichen statt des reinen „passwd".
  const withoutPath = decodeUploadName(fileName).split(/[/\\]/).pop() ?? '';
  const cleaned = withoutPath
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f"]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return (cleaned || 'datei').slice(0, 120);
}
