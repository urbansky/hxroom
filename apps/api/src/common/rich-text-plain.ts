/**
 * Klartext aus einem Tiptap-Dokument (`richTextDoc()` in @hxroom/shared), etwa für einen
 * Auszug der Sitzungsnotiz. Formatierungen und Link-Ziele fallen weg; Absätze, Überschriften
 * und Zeilenumbrüche werden zu Zeilen, Listeneinträge bekommen ein „– “ vorangestellt.
 *
 * Gibt null zurück, wenn kein sichtbarer Text übrig bleibt – ein leerer Editor liefert ein
 * Dokument mit leerem Absatz, und das ist keine Notiz.
 */
export function richTextToPlain(doc: unknown): string | null {
  const lines = blockLines(doc);
  return lines.length ? lines.join('\n') : null;
}

function children(node: any): any[] {
  return Array.isArray(node?.content) ? node.content : [];
}

function inlineText(node: any): string {
  if (node?.type === 'text') return typeof node.text === 'string' ? node.text : '';
  if (node?.type === 'hardBreak') return '\n';
  return children(node).map(inlineText).join('');
}

function blockLines(node: any): string[] {
  if (!node || typeof node !== 'object') return [];

  switch (node.type) {
    case 'paragraph':
    case 'heading':
      return inlineText(node).split('\n').map(line => line.trim()).filter(Boolean);
    case 'listItem': {
      const lines = children(node).flatMap(blockLines);
      if (lines.length) lines[0] = `– ${lines[0]}`;
      return lines;
    }
    default:
      // doc, bulletList, orderedList – und was die Knotenmenge später noch dazubekommt
      return children(node).flatMap(blockLines);
  }
}
