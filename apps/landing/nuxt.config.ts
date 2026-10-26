export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/content', '@nuxtjs/plausible'],

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
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
    theme: {
      colors: ['primary', 'secondary', 'sage', 'gold', 'success', 'info', 'warning', 'error'],
    },
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
      routes: ['/404.html', '/blog/rss.xml'],
    },
  },

  devServer: {
    host: '0.0.0.0',
    port: 5176,
  },

  compatibilityDate: '2025-05-07',
})
