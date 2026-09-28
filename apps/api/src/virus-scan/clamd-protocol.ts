/**
 * Das Nötigste des clamd-Protokolls, als reine Funktionen (doc/videocall-umsetzungsplan.md,
 * Nachtrag „Virenscan geteilter Dateien").
 *
 * Kein npm-Paket dafür: Das Protokoll ist ein paar Zeilen, und eine zusätzliche
 * Laufzeit-Abhängigkeit ist genau das, was im Produktions-Image schon einmal gefehlt hat.
 *
 * `z`-Präfix heißt: Befehl und Antwort enden mit einem Nullbyte statt einem Zeilenumbruch.
 */

/** Blockgröße beim Senden. clamd nimmt größere, aber so bleibt jeder Schreibvorgang klein. */
export const INSTREAM_CHUNK_BYTES = 64 * 1024;

export const PING_COMMAND = Buffer.from('zPING\0');

/**
 * `INSTREAM`: der Befehl, dann die Datei in Blöcken – jeder mit seiner Länge als 4 Byte Big
 * Endian davor –, zum Schluss ein Block der Länge 0.
 */
export function instreamFrames(data: Buffer, chunkBytes = INSTREAM_CHUNK_BYTES): Buffer[] {
  const frames: Buffer[] = [Buffer.from('zINSTREAM\0')];
  for (let offset = 0; offset < data.length; offset += chunkBytes) {
    const chunk = data.subarray(offset, offset + chunkBytes);
    const length = Buffer.alloc(4);
    length.writeUInt32BE(chunk.length, 0);
    frames.push(length, chunk);
  }
  frames.push(Buffer.alloc(4)); // Länge 0: Ende der Datei
  return frames;
}

export type ClamdVerdict =
  | { status: 'clean' }
  | { status: 'infected'; signature: string }
  | { status: 'error'; reply: string };

/**
 * Die Antwort auf `INSTREAM`:
 * - `stream: OK` – nichts gefunden
 * - `stream: Eicar-Test-Signature FOUND` – befallen, mit dem Namen der Signatur
 * - alles andere – ein Fehler, etwa `INSTREAM size limit exceeded. ERROR`. Das ist **kein**
 *   sauberes Ergebnis: Die Datei wurde nicht (vollständig) geprüft.
 */
export function parseClamdReply(raw: string): ClamdVerdict {
  const reply = raw.replace(/\0/g, '').trim();

  if (/^stream: OK$/.test(reply)) return { status: 'clean' };

  const found = /^stream: (.+) FOUND$/.exec(reply);
  if (found) return { status: 'infected', signature: found[1]! };

  return { status: 'error', reply };
}
