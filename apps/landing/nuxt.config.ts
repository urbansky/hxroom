export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxtjs/plausible'],

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
    preference: 'dark',
  },

  vite: {
    optimizeDeps: {
      exclude: ['@plausible-analytics/tracker'],
    },
  },

  nitro: {
    prerender: {
      routes: ['/404.html'],
    },
  },

  compatibilityDate: '2025-05-07',
})
