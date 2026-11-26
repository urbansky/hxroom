import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { hxroomThemeColors } from '@hxroom/ui/colors'

const HANDBUCH_DIR = fileURLToPath(new URL('./content/handbuch', import.meta.url))

/** Adressen der Handbuchseiten aus den Dateinamen: „5.videocall/1.warteraum.md“ → „/handbuch/videocall/warteraum“. */
function handbuchPaths(): string[] {
  const strip = (name: string) => name.replace(/^\d+\./, '').replace(/\.md$/, '')
  return readdirSync(HANDBUCH_DIR, { recursive: true, encoding: 'utf8' })
    .filter(file => file.endsWith('.md'))
    .map(file => `/handbuch/${file.split('/').map(strip).join('/')}`)
}

export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/content', '@nuxtjs/plausible'],

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
      // Vorschaubild beim Teilen (Slack, LinkedIn, WhatsApp …) für alle Seiten; ein Blogartikel
      // mit eigenem `image` überschreibt og:image. Die URL muss absolut sein. Quelle:
      // media/og-image/og-image.html. JPEG statt WebP, weil nicht jeder Dienst WebP anzeigt.
      meta: [
        { property: 'og:image', content: 'https://hxroom.de/og-image.jpg' },
        { property: 'og:image:type', content: 'image/jpeg' },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: 'HxRoom – Terminbuchung und Videocall für Coaches in einem. Klienten ohne Konto, Server in Deutschland.' },
        { name: 'twitter:image', content: 'https://hxroom.de/og-image.jpg' },
      ],
    },
  },

  plausible: {
    domain: 'hxroom.de',
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
      // Ziele von „Vorführung buchen“ und „Kostenlos ausprobieren“. Die Seite wird ohne
      // Umgebungsvariablen gebaut (docker-build.yml): Der Produktions-Build zeigt deshalb
      // auf hxroom.de, `nuxt dev` auf die lokalen Caddy-Subdomains.
      rootDomain: process.env.NUXT_PUBLIC_ROOT_DOMAIN
        ?? (process.env.NODE_ENV === 'production' ? 'hxroom.de' : 'hxroom.localhost'),
      rootDomainHttps: process.env.NUXT_PUBLIC_ROOT_DOMAIN_HTTPS
        ? process.env.NUXT_PUBLIC_ROOT_DOMAIN_HTTPS === 'true'
        : process.env.NODE_ENV === 'production',
    },
  },

  // Symbole ins Bundle statt zur Laufzeit von api.iconify.design: Die statisch erzeugte
  // Seite hat keinen Server, der sie ausliefern könnte, und Besucher sollen keine
  // Anfragen an Dritte schicken.
  icon: {
    clientBundle: { scan: true },
  },

  ui: {
    theme: { colors: hxroomThemeColors },
  },

  css: ['@hxroom/ui/theme'],

  colorMode: {
    preference: 'system',
  },

  vite: {
    optimizeDeps: {
      exclude: ['@plausible-analytics/tracker'],
    },
  },

  nitro: {
    prerender: {
      // /handbuch ausdrücklich: Der Crawler folgt sonst nur Links ab „/“. Von der Übersicht
      // aus findet er alle Abschnitte und Seiten.
      routes: ['/404.html', '/blog/rss.xml', '/handbuch', '/sitemap.xml', '/llms.txt', '/llms-full.txt'],
    },
    // Die Markdown-Dateien des Handbuchs im Rohtext für llms-full.txt und die .md-Fassungen
    // (server/utils/handbuch.ts). Die Collection hält den Text nur als Syntaxbaum.
    serverAssets: [{ baseName: 'handbuch', dir: HANDBUCH_DIR }],
  },

  hooks: {
    // Die Markdown-Fassung jeder Handbuchseite (server/middleware/handbuch-markdown.ts). Auf
    // sie verlinkt nur llms.txt, und die liest der Crawler nicht aus.
    'prerender:routes'({ routes }) {
      for (const path of handbuchPaths()) routes.add(`${path}.md`)
    },
  },

  devServer: {
    host: '0.0.0.0',
    port: 5176,
  },

  compatibilityDate: '2025-05-07',
})
