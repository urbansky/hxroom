export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  app: {
    head: {
      title: 'HxRoom – Betreiber',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
      authUrl: process.env.NUXT_PUBLIC_AUTH_URL ?? 'http://localhost:3000',
    },
  },

  ui: {
    theme: {
      colors: ['primary', 'secondary', 'sage', 'gold', 'success', 'info', 'warning', 'error'],
    },
  },

  css: ['@hxroom/ui/theme', '~/assets/main.css'],

  colorMode: {
    preference: 'system',
  },

  // Der Dev-Caddy routet admin.hxroom.localhost fest auf 5175 – Port nicht ändern.
  devServer: {
    host: '0.0.0.0',
    port: 5175,
  },

  ssr: false,

  compatibilityDate: '2025-05-07',
})
