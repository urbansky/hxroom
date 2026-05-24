export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
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

  devServer: {
    port: 5173,
  },

  nitro: {
    prerender: {
      crawlLinks: false,
    },
  },

  compatibilityDate: '2025-05-07',
})
