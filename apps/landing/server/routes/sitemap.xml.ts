// sitemap.xml für hxroom.de: Startseite und Handbuch. Ohne Blog (in robots.txt gesperrt) und
// ohne Rechtsseiten (noindex). lastmod der Handbuchseiten ist ihr Feld `updated`.
export default defineEventHandler(async (event) => {
  const sections = await loadHandbuch(event)
  const latest = (dates: (string | undefined)[]) => dates.filter(Boolean).sort().at(-1)

  const entries: { loc: string, lastmod?: string }[] = [
    { loc: `${SITE}/` },
    { loc: `${SITE}/handbuch`, lastmod: latest(sections.flatMap(s => s.pages.map(p => p.updated))) },
  ]
  for (const section of sections) {
    entries.push({ loc: `${SITE}${section.path}`, lastmod: latest(section.pages.map(p => p.updated)) })
    for (const page of section.pages) entries.push({ loc: `${SITE}${page.path}`, lastmod: page.updated })
  }

  const urls = entries.map(({ loc, lastmod }) =>
    `  <url>\n    <loc>${loc}</loc>${lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''}\n  </url>`)

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
})
