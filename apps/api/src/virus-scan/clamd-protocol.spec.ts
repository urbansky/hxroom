import { describe, expect, it } from 'vitest';
import { instreamFrames, parseClamdReply } from './clamd-protocol';

describe('instreamFrames', () => {
  it('schickt Befehl, Blöcke mit Längenpräfix und einen leeren Abschluss', () => {
    const frames = instreamFrames(Buffer.from('abcdefg'), 3);

    expect(frames[0]!.toString()).toBe('zINSTREAM\0');
    // 3 + 3 + 1 Byte, jeweils mit 4 Byte Länge davor
    expect(frames.slice(1, -1).map((frame) => frame.toString('hex'))).toEqual([
      '00000003', Buffer.from('abc').toString('hex'),
      '00000003', Buffer.from('def').toString('hex'),
      '00000001', Buffer.from('g').toString('hex'),
    ]);
    expect(frames.at(-1)!.toString('hex')).toBe('00000000');
  });

  it('kommt mit einer leeren Datei aus', () => {
    const frames = instreamFrames(Buffer.alloc(0));
    expect(frames).toHaveLength(2);
    expect(frames[1]!.toString('hex')).toBe('00000000');
  });

  it('überträgt die Datei vollständig', () => {
    const data = Buffer.from(Array.from({ length: 200_000 }, (_, i) => i % 251));
    const payload = instreamFrames(data).slice(1, -1).filter((_, i) => i % 2 === 1);
    expect(Buffer.concat(payload).equals(data)).toBe(true);
  });
});

describe('parseClamdReply', () => {
  it('erkennt ein sauberes Ergebnis', () => {
    expect(parseClamdReply('stream: OK\0')).toEqual({ status: 'clean' });
  });

  it('erkennt einen Fund samt Signatur', () => {
    expect(parseClamdReply('stream: Eicar-Test-Signature FOUND\0')).toEqual({
      status: 'infected',
      signature: 'Eicar-Test-Signature',
    });
  });

  // Ein Fehler ist kein „sauber": Die Datei wurde nicht (vollständig) geprüft.
  it('wertet Fehler nicht als sauber', () => {
    expect(parseClamdReply('INSTREAM size limit exceeded. ERROR\0')).toEqual({
      status: 'error',
      reply: 'INSTREAM size limit exceeded. ERROR',
    });
    expect(parseClamdReply('')).toMatchObject({ status: 'error' });
    expect(parseClamdReply('stream: OK but not really')).toMatchObject({ status: 'error' });
  });
});
