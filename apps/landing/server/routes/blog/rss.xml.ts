import { queryCollection } from '@nuxt/content/server'

export default defineEventHandler(async (event) => {
  const articles = await queryCollection(event, 'blog')
    .order('date', 'DESC')
    .all()

  const baseUrl = 'https://hxroom.de'
  const now = new Date().toUTCString()

  const items = articles
    .map((a) => {
      const pubDate = a.date ? new Date(a.date).toUTCString() : now
      const link = `${baseUrl}${a.path}`
      return `
    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${a.description ?? ''}]]></description>
    </item>`
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>HxRoom Blog</title>
    <link>${baseUrl}/blog</link>
    <description>Einblicke rund um Coaching, DSGVO-konforme Praxissoftware und die Entstehung von HxRoom.</description>
    <language>de</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${baseUrl}/blog/rss.xml" rel="self" type="application/rss+xml" />
    ${items}
  </channel>
</rss>`

  setHeader(event, 'Content-Type', 'application/rss+xml; charset=utf-8')
  return xml
})
