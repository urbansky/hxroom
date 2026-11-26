// Markdown-Fassung jeder Handbuchseite unter derselben Adresse mit „.md“, etwa
// /handbuch/videocall/warteraum.md. KI-Agenten holen sich gern die Rohfassung ohne Layout.
// Eine Middleware statt einer Route: Eine Server-Route unter /handbuch/ stünde vor den Seiten.
// Vorgerendert werden die Dateien über den Hook in nuxt.config.ts; im Betrieb liefert nginx
// sie als text/markdown aus.
export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0] ?? ''
  if (!path.startsWith('/handbuch/') || !path.endsWith('.md')) return

  const target = path.slice(0, -'.md'.length)
  for (const section of await loadHandbuch(event)) {
    const page = section.pages.find(p => p.path === target)
    if (page) {
      setHeader(event, 'Content-Type', 'text/markdown; charset=utf-8')
      return pageMarkdown(page, section)
    }
  }
  throw createError({ statusCode: 404, statusMessage: 'Seite nicht gefunden' })
})
