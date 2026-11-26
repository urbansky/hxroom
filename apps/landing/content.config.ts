import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    blog: defineCollection({
      type: 'page',
      source: 'blog/**/*.md',
      schema: z.object({
        title: z.string(),
        description: z.string(),
        date: z.string(),
        category: z.string().optional(),
        image: z.string().optional(),
        draft: z.boolean().optional().default(false),
        // Passende Handbuchseiten, relativ zu /handbuch – unter dem Artikel „So geht es in HxRoom“
        handbuch: z.array(z.string()).optional(),
      }),
    }),
    // Handbuch (doc/marketing/handbuch.md). Zahlen vor Ordnern und Dateien legen die
    // Reihenfolge fest und fallen aus der Adresse heraus. Die `.navigation.yml` je Ordner
    // (Titel, Symbol) gehören mit zur Quelle, deshalb sind hier alle Felder optional.
    handbuch: defineCollection({
      type: 'page',
      source: 'handbuch/**/*',
      schema: z.object({
        // <title>, 50–60 Zeichen; ohne Angabe „{title} – HxRoom Handbuch“
        seoTitle: z.string().optional(),
        audience: z.enum(['coach', 'klient']).optional(),
        // Weg in der Coach-App, z. B. „Termine › Sitzung starten“
        menu: z.string().optional(),
        updated: z.string().optional(),
        faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
        // Pfade relativ zu /handbuch, z. B. „videocall/im-gespraech“
        related: z.array(z.string()).optional(),
      }),
    }),
  },
})
