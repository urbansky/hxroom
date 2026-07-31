import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import type { RichTextDoc } from '@hxroom/shared';

// Dieselbe eingeschränkte Extension-Konfiguration wie im Coach-Editor (UEditor/Tiptap),
// damit gespeicherte Beschreibungen identisch gerendert werden. `as any`: siehe
// apps/coach/app/utils/offers.ts – Peer-Version-Artefakt, zur Laufzeit dieselbe Bibliothek.
// Gilt auch für den `doc`-Parameter unten: Tiptaps JSONContent-Typ deckt sich nicht
// mit unserem Zod-Typ RichTextDoc, obwohl beide zur Laufzeit dasselbe Format sind.
const descriptionExtensions = [StarterKit.configure({ heading: { levels: [2, 3] } })] as any;

// generateHTML escaped Textinhalte automatisch – kein Pfad für rohes HTML/Skript aus den gespeicherten Daten.
export function renderDescription(doc: RichTextDoc): string {
  if (!doc?.content) return '';
  try {
    return generateHTML(doc as any, descriptionExtensions);
  } catch {
    return '';
  }
}

export const descriptionProseClasses = 'text-[15px] text-(--ui-text-muted) leading-[1.8] [&_p]:my-0 [&_p+p]:mt-4 [&_ul]:my-0 [&_ul]:pl-5 [&_ul]:list-disc [&_ol]:my-0 [&_ol]:pl-5 [&_ol]:list-decimal [&_li]:my-0 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:font-normal [&_h2]:text-(--ui-text) [&_h3]:font-serif [&_h3]:text-lg [&_h3]:font-normal [&_h3]:text-(--ui-text) [&_strong]:font-medium [&_strong]:text-(--ui-text) [&_a]:text-primary [&_a]:underline';

export function formatOfferPrice(cents: number | null): string {
  if (cents === null) return 'Kostenlos';
  return (cents / 100).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
