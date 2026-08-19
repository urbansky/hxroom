import { generateHTML } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'

// `description` bindet an UEditor (Tiptap) und wird serverseitig gegen
// richTextDocSchema (@hxroom/shared) validiert – hier bewusst locker typisiert,
// da Tiptaps eigener Content-Typ nicht mit unserem Zod-Typ deckungsgleich ist.
// `as any`: @tiptap/starter-kit wird an anderer Stelle im Workspace gegen eine
// andere @tiptap/pm-Peer-Version aufgelöst, wodurch pnpm zwei strukturell
// unterschiedliche @tiptap/core-Typinstanzen erzeugt – rein ein TS-Artefakt,
// zur Laufzeit dieselbe Bibliothek.
const descriptionExtensions = [StarterKit.configure({ heading: { levels: [2, 3] } })] as any

// Rendert die gespeicherte Beschreibung mit Tiptaps eigenem generateHTML – mit
// derselben eingeschränkten Extension-Konfiguration wie im UEditor. generateHTML
// baut den ProseMirror-Dokumentbaum aus dem JSON über dieses Schema auf;
// Textinhalte werden dabei automatisch escaped, es gibt keinen Pfad für rohes
// HTML/Skript aus den gespeicherten Daten.
export function renderDescription(doc: any): string {
  if (!doc?.content) return ''
  try {
    return generateHTML(doc, descriptionExtensions)
  } catch {
    return ''
  }
}

export const descriptionProseClasses = 'text-sm leading-6 [&_p]:my-0 [&_p]:leading-6 [&_ul]:my-0 [&_ul]:pl-4 [&_ul]:list-disc [&_ol]:my-0 [&_ol]:pl-4 [&_ol]:list-decimal [&_li]:my-0 [&_li]:leading-6 [&_h2]:font-bold [&_h2]:text-base [&_h2]:leading-7 [&_h3]:font-bold [&_h3]:text-sm [&_h3]:leading-6 [&_strong]:font-bold [&_strong]:text-highlighted [&_a]:text-primary [&_a]:underline'

// Die Farbableitung liegt in @hxroom/shared, weil die Termin-Mails (apps/api) dieselbe
// Farbe brauchen: Coach-Dashboard und Mail zeigen so beim gleichen Angebot denselben
// Balken. Der Re-Export hält den gewohnten Auto-Import über `~/utils/offers`.
export { offerColor } from '@hxroom/shared'

export function formatPrice(priceCents: number | null): string {
  if (priceCents == null) return 'Kostenlos'
  return `${(priceCents / 100).toFixed(2).replace('.', ',')} €`
}

export function descriptionPreview(doc: any): string {
  if (!doc?.content) return ''
  const parts: string[] = []
  const walk = (nodes: any[]) => {
    for (const node of nodes) {
      if (node.type === 'text' && node.text) parts.push(node.text)
      if (node.content) walk(node.content)
    }
  }
  walk(doc.content)
  return parts.join(' ')
}
