import { describe, expect, it } from 'vitest';
import { detectCallFileType, fileExtension, safeFileName } from './call-file-type';

const pdf = Buffer.from('%PDF-1.7\n…');
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0, 0, 0, 0]), Buffer.from('WEBP')]);
const zip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0]);
const html = Buffer.from('<!doctype html><script>alert(1)</script>');

describe('detectCallFileType – Endung und Signatur müssen zusammenpassen', () => {
  it('erkennt die erlaubten Formate', () => {
    expect(detectCallFileType('Fragebogen.pdf', pdf)?.mimeType).toBe('application/pdf');
    expect(detectCallFileType('foto.PNG', png)?.mimeType).toBe('image/png');
    expect(detectCallFileType('foto.jpeg', jpeg)?.mimeType).toBe('image/jpeg');
    expect(detectCallFileType('bild.webp', webp)?.mimeType).toBe('image/webp');
    expect(detectCallFileType('notizen.docx', zip)?.extension).toBe('docx');
    expect(detectCallFileType('tabelle.xlsx', zip)?.extension).toBe('xlsx');
  });

  it('merkt sich, welche Formate Bilder sind', () => {
    expect(detectCallFileType('foto.png', png)?.isImage).toBe(true);
    expect(detectCallFileType('Fragebogen.pdf', pdf)?.isImage).toBe(false);
  });

  // Der Kern der Prüfung: Der gemeldete Typ kommt vom Browser des Absenders, auf der
  // Klientenseite von jemandem ohne Konto.
  it('weist eine umbenannte HTML-Datei ab', () => {
    expect(detectCallFileType('harmlos.pdf', html)).toBeNull();
    expect(detectCallFileType('bild.png', html)).toBeNull();
  });

  it('weist Formate außerhalb der Liste ab – auch mit passender Signatur', () => {
    expect(detectCallFileType('makro.docm', zip)).toBeNull();
    expect(detectCallFileType('archiv.zip', zip)).toBeNull();
    expect(detectCallFileType('seite.html', html)).toBeNull();
    expect(detectCallFileType('ohne-endung', pdf)).toBeNull();
  });

  it('weist ein Bild ab, dessen Endung nicht zum Inhalt passt', () => {
    expect(detectCallFileType('foto.png', jpeg)).toBeNull();
    expect(detectCallFileType('bild.webp', png)).toBeNull();
  });

  it('liest die Endung unabhängig von Groß- und Kleinschreibung', () => {
    expect(fileExtension('Datei.PDF')).toBe('pdf');
    expect(fileExtension('ohne')).toBe('');
  });
});

describe('safeFileName – der Name landet in einem Header', () => {
  it('entfernt Pfade und Anführungszeichen', () => {
    expect(safeFileName('../../etc/passwd')).toBe('passwd');
    expect(safeFileName('C:\\Users\\anna\\Plan.pdf')).toBe('Plan.pdf');
    expect(safeFileName('sag "hallo".pdf')).toBe('sag hallo .pdf');
  });

  it('entfernt Steuerzeichen, die einen Header zerlegen würden', () => {
    expect(safeFileName('datei\r\nX-Beliebig: 1.pdf')).toBe('datei X-Beliebig: 1.pdf');
  });

  it('behält Umlaute und kürzt sehr lange Namen', () => {
    expect(safeFileName('Fragebogen für Markus.pdf')).toBe('Fragebogen für Markus.pdf');
    expect(safeFileName(`${'a'.repeat(300)}.pdf`)).toHaveLength(120);
  });

  // So kommt der Name aus multer an: busboy liest ihn als Latin-1, weil das Multipart-Format
  // keine Kodierung angibt.
  it('repariert einen als Latin-1 gelesenen UTF-8-Namen', () => {
    const asMulterDelivers = Buffer.from('Fragebogen für Markus.pdf', 'utf8').toString('latin1');
    expect(safeFileName(asMulterDelivers)).toBe('Fragebogen für Markus.pdf');
    expect(safeFileName('Übung.docx')).toBe('Übung.docx');
    expect(safeFileName('Plan.pdf')).toBe('Plan.pdf');
  });

  it('fällt auf einen Namen zurück, wenn nichts übrig bleibt', () => {
    expect(safeFileName('///')).toBe('datei');
  });
});
