import { describe, expect, it } from 'vitest';
import { richTextToMarkdown } from './rich-text-markdown';

const text = (value: string, marks?: unknown[]) => ({ type: 'text', text: value, ...(marks && { marks }) });
const paragraph = (...content: unknown[]) => ({ type: 'paragraph', content });

describe('richTextToMarkdown', () => {
  it('gibt für leere Dokumente einen leeren Text zurück', () => {
    expect(richTextToMarkdown(null)).toBe('');
    expect(richTextToMarkdown({ type: 'doc' })).toBe('');
  });

  it('wandelt Überschriften, Absätze und Marken um', () => {
    const md = richTextToMarkdown({
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [text('Ziele')] },
        paragraph(text('Das ist '), text('wichtig', [{ type: 'bold' }]), text(' und '), text('leise', [{ type: 'italic' }]), text('.')),
        paragraph(text('Mehr dazu', [{ type: 'link', attrs: { href: 'https://hxroom.de' } }])),
      ],
    });
    expect(md).toBe('## Ziele\n\nDas ist **wichtig** und *leise*.\n\n[Mehr dazu](https://hxroom.de)\n');
  });

  it('wandelt Listen um, auch verschachtelt', () => {
    const md = richTextToMarkdown({
      type: 'doc',
      content: [
        { type: 'bulletList', content: [
          { type: 'listItem', content: [paragraph(text('erstens'))] },
          { type: 'listItem', content: [
            paragraph(text('zweitens')),
            { type: 'orderedList', content: [{ type: 'listItem', content: [paragraph(text('a'))] }] },
          ] },
        ] },
      ],
    });
    expect(md).toBe('- erstens\n- zweitens\n  1. a\n');
  });

  it('erhält Sonderzeichen als Text und harte Umbrüche', () => {
    const md = richTextToMarkdown({
      type: 'doc',
      content: [paragraph(text('# kein Titel * kein Stern'), { type: 'hardBreak' }, text('zweite Zeile'))],
    });
    expect(md).toBe('\\# kein Titel \\* kein Stern  \nzweite Zeile\n');
  });
});
