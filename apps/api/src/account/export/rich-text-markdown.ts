/**
 * Tiptap-Dokument (Notizen, Angebotsbeschreibung) als Markdown für den Datenexport.
 *
 * Kennt genau die Knoten und Marken, die richTextDocSchema in @hxroom/shared zulässt:
 * Absatz, Überschrift (2–3), Aufzählung, nummerierte Liste, harter Umbruch, fett, kursiv,
 * Link. Unbekannte Knoten geben ihren Text aus, statt verloren zu gehen.
 */

interface RichNode {
  type?: string;
  text?: string;
  attrs?: { level?: number; href?: string };
  marks?: { type: string; attrs?: { href?: string } }[];
  content?: RichNode[];
}

/** Zeichen, die Markdown als Formatierung läse, als Text erhalten. */
function escape(text: string): string {
  return text.replace(/([\\`*_[\]#<>])/g, '\\$1');
}

function inline(nodes: RichNode[] | undefined): string {
  return (nodes ?? []).map((node) => {
    if (node.type === 'hardBreak') return '  \n';
    if (node.type !== 'text') return inline(node.content);
    let text = escape(node.text ?? '');
    const marks = node.marks ?? [];
    if (marks.some((m) => m.type === 'bold')) text = `**${text}**`;
    if (marks.some((m) => m.type === 'italic')) text = `*${text}*`;
    const link = marks.find((m) => m.type === 'link');
    if (link?.attrs?.href) text = `[${text}](${link.attrs.href})`;
    return text;
  }).join('');
}

function block(node: RichNode, indent: string): string[] {
  switch (node.type) {
    case 'heading':
      return [`${'#'.repeat(node.attrs?.level ?? 2)} ${inline(node.content)}`];
    case 'bulletList':
    case 'orderedList':
      return (node.content ?? []).flatMap((item, index) => listItem(item, indent, node.type === 'orderedList' ? `${index + 1}.` : '-'));
    case 'paragraph':
      return [`${indent}${inline(node.content)}`];
    default:
      return [`${indent}${inline(node.content ?? (node.text ? [node] : []))}`];
  }
}

function listItem(item: RichNode, indent: string, marker: string): string[] {
  const [first, ...rest] = item.content ?? [];
  const lines = [`${indent}${marker} ${first ? inline(first.content) : ''}`];
  const childIndent = `${indent}${' '.repeat(marker.length + 1)}`;
  for (const child of rest) lines.push(...block(child, childIndent));
  return lines;
}

export function richTextToMarkdown(doc: unknown): string {
  const root = doc as RichNode | null | undefined;
  if (!root?.content?.length) return '';
  const blocks = root.content.map((node) => block(node, '').join('\n'));
  return `${blocks.filter((text) => text.trim() !== '').join('\n\n')}\n`;
}
