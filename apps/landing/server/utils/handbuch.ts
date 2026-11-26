import type { H3Event } from 'h3'
import { queryCollection, queryCollectionNavigation } from '@nuxt/content/server'

// Das Handbuch als Text für KI-Dienste und Suchmaschinen (doc/marketing/handbuch.md §6.2):
// Grundlage für llms.txt, llms-full.txt, die Markdown-Fassung je Seite und sitemap.xml.
//
// Titel, Kurzantwort und Fragen kommen aus der Collection, der Fließtext aus den Markdown-
// Dateien selbst (Server-Assets `handbuch`, nuxt.config.ts) – die Collection hält ihn nur als
// Syntaxbaum. Die Bausteine der Seiten werden dabei zu einfachem Markdown: ein Screenshot zu
// seiner Beschreibung, eine Markierung zur Nummer in Klammern, ein Hinweis zum Zitat.

export const SITE = 'https://hxroom.de'

export interface HandbuchPage {
  path: string
  title: string
  description: string
  updated?: string
  faq: { q: string, a: string }[]
  /** Text der Seite ohne Frontmatter, als einfaches Markdown mit absoluten Links. */
  body: string
}

export interface HandbuchSection {
  path: string
  title: string
  description?: string
  pages: HandbuchPage[]
}

/** Alle Abschnitte mit ihren Seiten, in der Reihenfolge der Navigation. */
export async function loadHandbuch(event: H3Event): Promise<HandbuchSection[]> {
  const [tree, items] = await Promise.all([
    queryCollectionNavigation(event, 'handbuch', ['description']),
    queryCollection(event, 'handbuch').where('extension', '=', 'md').all(),
  ])
  const byPath = new Map(items.map(item => [item.path, item]))
  const storage = useStorage('assets:handbuch')
  const root = tree.find(node => node.path === '/handbuch')?.children ?? []

  return Promise.all(root.map(async section => ({
    path: section.path,
    title: section.title,
    description: section.description as string | undefined,
    pages: await Promise.all((section.children ?? []).map(async (node) => {
      const item = byPath.get(node.path)
      if (!item) throw createError({ statusCode: 500, statusMessage: `Handbuchseite ${node.path} fehlt` })
      // stem „handbuch/5.videocall/1.warteraum“ → Asset „5.videocall:1.warteraum.md“
      const key = `${item.stem.replace(/^handbuch\//, '').replaceAll('/', ':')}.md`
      const raw = await storage.getItem<string>(key)
      if (typeof raw !== 'string') throw createError({ statusCode: 500, statusMessage: `Handbuchdatei ${key} fehlt` })
      return {
        path: item.path,
        title: item.title,
        description: item.description,
        updated: item.updated,
        faq: item.faq ?? [],
        body: toPlainMarkdown(raw),
      }
    })),
  })))
}

/** Eine Seite als eigenständiges Markdown-Dokument, mit Titel, Kurzantwort und Fragen. */
export function pageMarkdown(page: HandbuchPage, section?: HandbuchSection): string {
  const parts = [
    `# ${page.title}`,
    '',
    `> ${page.description}`,
    '',
    `Quelle: ${SITE}${page.path}${section ? ` · Abschnitt „${section.title}“` : ''}${page.updated ? ` · Stand ${page.updated}` : ''}`,
    '',
    page.body,
  ]
  if (page.faq.length) {
    parts.push('', '## Häufige Fragen', '')
    for (const { q, a } of page.faq) parts.push(`### ${q}`, '', a, '')
  }
  return `${parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
}

function toPlainMarkdown(raw: string): string {
  return raw
    // Frontmatter
    .replace(/^---\n[\s\S]*?\n---\n/, '')
    // ::screenshot mit YAML-Block → Beschreibung des Bildes
    .replace(/::screenshot\s*\n---\n([\s\S]*?)\n---\n::/g, (_, yaml: string) => {
      const field = (name: string) => new RegExp(`^${name}:\\s*(.+)$`, 'm').exec(yaml)?.[1]?.trim()
      const alt = field('alt')
      const caption = field('caption')
      return `*Bild: ${[alt, caption].filter(Boolean).join('. ')}*`
    })
    // ::callout{…} … :: → Zitat
    .replace(/::callout(?:\{[^}]*\})?\s*\n([\s\S]*?)\n::/g, (_, text: string) =>
      text.trim().split('\n').map(line => `> ${line}`).join('\n'))
    // :marker{n="1"} → (1)
    .replace(/:marker\{n="(\d+)"\}/g, '($1)')
    // Links ins Handbuch und auf die Website absolut
    .replace(/\]\((\/[^)]*)\)/g, (_, href: string) => `](${SITE}${href})`)
    .trim()
}
