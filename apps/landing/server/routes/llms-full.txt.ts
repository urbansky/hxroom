// Das ganze Handbuch als eine Markdown-Datei: Ein Abruf liefert KI-Diensten alles, was
// HxRoom kann und wie es geht (doc/marketing/handbuch.md §6.2).
export default defineEventHandler(async (event) => {
  const sections = await loadHandbuch(event)
  const parts = [
    '# HxRoom – Handbuch',
    '',
    '> HxRoom ist eine Videoplattform für Coaches: Terminbuchung und Videocall in einem, unter dem eigenen Namen, DSGVO-konform, mit Servern in Deutschland. Dieses Handbuch erklärt alle Funktionen.',
    '',
    `Quelle: ${SITE}/handbuch`,
  ]
  for (const section of sections) {
    parts.push('', '---', '', `# Abschnitt: ${section.title}`, '')
    if (section.description) parts.push(section.description, '')
    for (const page of section.pages) {
      // Eine Ebene tiefer, damit die Abschnitte oben bleiben.
      parts.push(pageMarkdown(page, section).replace(/^(#+) /gm, '#$1 '))
    }
  }
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  return `${parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()}\n`
})
