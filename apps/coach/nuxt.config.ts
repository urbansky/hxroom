import { resolve } from 'node:path'
import { mediapipeAssets } from '@hxroom/livekit/vite'
import { sentryVitePlugin } from '@sentry/bundler-plugins/vite'

// Source Maps für die Fehlerüberwachung: Nur wenn die CI ein Token mitgibt, entstehen versteckte
// Source Maps des Client-Builds, werden nach GlitchTip hochgeladen und gelöscht, bevor Nitro den
// Build nach .output/public kopiert – ins Image kommen sie nie. Zuordnung über Debug-IDs.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN

export default defineNuxtConfig({
  sourcemap: { client: sentryAuthToken ? 'hidden' : false, server: false },

  hooks: {
    'vite:extendConfig'(config, { isClient }) {
      if (!isClient || !sentryAuthToken) return
      // Das Ausgabeverzeichnis des Client-Builds hängt vom buildDir ab (bei `nuxt generate`
      // node_modules/.cache/nuxt/.nuxt/dist/client) – deshalb aus der Konfiguration, nicht fest.
      const outDir = config.build?.outDir
      if (!outDir) throw new Error('Client-Build ohne outDir – Source Maps würden ins Image gelangen')
      const plugins = config.plugins as unknown[] | undefined
      if (!plugins) throw new Error('Client-Build ohne Plugin-Liste – Source Maps nicht hochladbar')
      plugins.push(sentryVitePlugin({
        url: process.env.SENTRY_URL ?? 'https://errors.hxcode.io',
        org: 'hxroom',
        project: 'hxroom-coach',
        authToken: sentryAuthToken,
        release: { name: process.env.NUXT_PUBLIC_SENTRY_RELEASE || undefined, inject: false },
        sourcemaps: { filesToDeleteAfterUpload: [`${outDir}/**/*.map`] },
        // Keine Nutzungsdaten des Plugins an Sentry
        telemetry: false,
      }))
    },
  },

  modules: [
    '@nuxt/ui',
    // Die Dateien aus mediapipeAssets() (unten unter vite.plugins) landen im Client-Build unter
    // _hxroom/. Nitro übernimmt von dort aber nur _nuxt/ in die Ausgabe – ohne diesen Eintrag
    // fehlten WASM und Modell im Build, und der Weichzeichner liefe ins Leere.
    (_options, nuxt) => {
      nuxt.hook('nitro:config', (config) => {
        config.publicAssets ??= []
        config.publicAssets.push({
          dir: resolve(nuxt.options.buildDir, 'dist/client/_hxroom'),
          baseURL: '/_hxroom',
          maxAge: 60 * 60 * 24 * 365,
        })
      })
    },
  ],

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
      // Fehlerüberwachung (plugins/monitoring.client.ts). Ohne DSN aus.
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN ?? '',
      sentryEnvironment: process.env.NUXT_PUBLIC_SENTRY_ENVIRONMENT ?? '',
      sentryRelease: process.env.NUXT_PUBLIC_SENTRY_RELEASE ?? '',
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
    // WASM und Modell des Weichzeichners von der eigenen Origin statt von jsDelivr und Google
    // (packages/livekit/vite.ts).
    plugins: [mediapipeAssets()],
  },

  ssr: false,

  compatibilityDate: '2025-05-07',
})
