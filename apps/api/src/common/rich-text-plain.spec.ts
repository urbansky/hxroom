import { describe, expect, it } from 'vitest';
import { richTextToPlain } from './rich-text-plain';

const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks && { marks }) });
const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content });
const doc = (...content: unknown[]) => ({ type: 'doc', content });

describe('richTextToPlain', () => {
  it('macht aus Absätzen und Überschriften je eine Zeile', () => {
    const input = doc(
      { type: 'heading', attrs: { level: 2 }, content: [text('Thema')] },
      paragraph(text('Beruflicher '), text('Neustart', [{ type: 'bold' }])),
      paragraph(text('Übung: Journaling')),
    );
    expect(richTextToPlain(input)).toBe('Thema\nBeruflicher Neustart\nÜbung: Journaling');
  });

  it('stellt Listeneinträgen einen Spiegelstrich voran', () => {
    const input = doc(
      { type: 'bulletList', content: [
        { type: 'listItem', content: [paragraph(text('Selbstvertrauen'))] },
        { type: 'listItem', content: [paragraph(text('Work-Life-Balance'))] },
      ] },
      { type: 'orderedList', content: [
        { type: 'listItem', content: [paragraph(text('Erster Schritt'))] },
      ] },
    );
    expect(richTextToPlain(input)).toBe('– Selbstvertrauen\n– Work-Life-Balance\n– Erster Schritt');
  });

  it('übernimmt Linktexte ohne Ziel', () => {
    const input = doc(paragraph(text('Siehe '), text('Artikel', [{ type: 'link', attrs: { href: 'https://example.de' } }])));
    expect(richTextToPlain(input)).toBe('Siehe Artikel');
  });

  it('macht aus einem Zeilenumbruch eine neue Zeile', () => {
    const input = doc(paragraph(text('Eins'), { type: 'hardBreak' }, text('Zwei')));
    expect(richTextToPlain(input)).toBe('Eins\nZwei');
  });

  it('lässt leere Absätze und leere Listeneinträge weg', () => {
    const input = doc(
      paragraph(),
      paragraph(text('Inhalt')),
      { type: 'bulletList', content: [{ type: 'listItem', content: [paragraph()] }] },
    );
    expect(richTextToPlain(input)).toBe('Inhalt');
  });

  it('gibt für ein leeres Dokument null zurück', () => {
    expect(richTextToPlain(null)).toBeNull();
    expect(richTextToPlain(doc())).toBeNull();
    expect(richTextToPlain(doc(paragraph()))).toBeNull();
    expect(richTextToPlain(doc(paragraph(text('   '))))).toBeNull();
  });
});
