export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

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

  compatibilityDate: '2025-05-07',
})
