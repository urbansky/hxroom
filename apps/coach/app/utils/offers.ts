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

/**
 * Farbe je Sitzungsart – POC, aktuell nur auf der Angebotsseite im Einsatz.
 *
 * Die Farbe wird deterministisch aus der Angebots-ID abgeleitet und nirgends gespeichert:
 * Kein Schema-Eingriff, und dasselbe Angebot bekommt bei jedem Rendern dieselbe Farbe.
 * Wenn der Coach Farben später selbst wählen soll, tritt eine Spalte an `offers` an die
 * Stelle dieser Ableitung – dann bleibt `offerColor()` nur noch der Fallback für Angebote
 * ohne gesetzte Farbe.
 *
 * Die Palette bleibt im warmen HxRoom-Farbklima (Sage und Gold zuerst) und meidet reines
 * Rot – das ist für Fehlerzustände reserviert. Die Farbtöne sind über den Kreis verteilt,
 * damit benachbarte Angebote in der Liste nicht verwechselt werden; der engste Abstand
 * liegt bei 26° zwischen Terrakotta und Gold.
 *
 * Die Werte sind bewusst hell und gesättigt (L ≈ 50–67). Das ist eine Festlegung auf den
 * Einsatz als Farbfläche ohne Text: Weißer Text darauf käme nur auf ~2,5:1. Wer die Farbe
 * später als gefüllten Block mit Beschriftung nutzen will (etwa in der Wochenansicht),
 * braucht dafür abgedunkelte Varianten.
 */
const OFFER_COLORS = [
  '#7FB07C', // Sage
  '#D2A24C', // Gold
  '#5FAEB5', // Petrol
  '#D9785C', // Terrakotta
  '#A886BC', // Pflaume
  '#A3B14F', // Olive
  '#7EA1CC', // Blaugrau
  '#D2839A', // Altrosa
] as const

// djb2 – klein und ohne Abhängigkeit. Es geht nicht um Streuqualität, sondern darum,
// dass dieselbe ID immer denselben Index trifft.
function hashString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

/** Farbe der Sitzungsart als Hex-Wert, abgeleitet aus der Angebots-ID. */
export function offerColor(offerId: string): string {
  return OFFER_COLORS[hashString(offerId) % OFFER_COLORS.length]!
}

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
