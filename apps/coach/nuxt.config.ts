export default defineNuxtConfig({
  modules: ['@nuxt/ui'],

  app: {
    head: {
      title: 'HxRoom - Verwaltung',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
    },
  },

  runtimeConfig: {
    public: {
      apiUrl: process.env.NUXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1',
      authUrl: process.env.NUXT_PUBLIC_AUTH_URL ?? 'http://localhost:3000',
      rootDomain: process.env.NUXT_PUBLIC_ROOT_DOMAIN ?? 'hxroom.de',
      rootDomainHttps: process.env.NUXT_PUBLIC_ROOT_DOMAIN_HTTPS !== 'false',
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

  devServer: {
    host: '0.0.0.0',
    port: 5173,
  },

  // Tiptap nicht vorbündeln – nur im Dev-Betrieb von Belang, der Build bündelt ohnehin einmal.
  //
  // utils/offers.ts importiert @tiptap/core und @tiptap/starter-kit direkt (generateHTML für
  // die Angebotsbeschreibung). Vite bündelt beide deshalb vor, samt einer eigenen Kopie von
  // ProseMirror. Der UEditor von Nuxt UI wird nicht vorgebündelt und lädt Tiptap roh aus
  // node_modules. Zwei Kopien in einem Editor enden mit „Adding different instances of a
  // keyed plugin": Das Notizfeld stand nicht, und die Seitenleiste des Calls hing danach.
  //
  // Ob es auftritt, hängt davon ab, in welcher Reihenfolge Vite die Abhängigkeiten entdeckt –
  // es lag lange still und kam mit einem neu aufgebauten Cache nach einer Lockfile-Änderung.
  vite: {
    optimizeDeps: {
      exclude: ['@tiptap/core', '@tiptap/starter-kit', '@tiptap/pm'],
    },
  },

  ssr: false,

  compatibilityDate: '2025-05-07',
})
