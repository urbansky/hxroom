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
    },
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
