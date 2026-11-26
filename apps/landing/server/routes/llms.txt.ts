// llms.txt (https://llmstxt.org): der feste Kopf aus server/assets/llms.md – Beschreibung,
// Funktionen, häufige Fragen, Seiten –, darunter das Handbuch Seite für Seite mit Kurzantwort.
// Jede Seite verlinkt ihre Markdown-Fassung, die KI-Dienste ohne Layout lesen.
export default defineEventHandler(async (event) => {
  const head = await useStorage('assets:server').getItem<string>('llms.md')
  const sections = await loadHandbuch(event)

  const handbuch = sections.map(section => [
    `## Handbuch: ${section.title}`,
    '',
    ...(section.description ? [section.description, ''] : []),
    ...section.pages.map(page => `- [${page.title}](${SITE}${page.path}.md): ${page.description}`),
  ].join('\n'))

  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return `${[String(head ?? '').trim(), ...handbuch].join('\n\n')}\n`
})
