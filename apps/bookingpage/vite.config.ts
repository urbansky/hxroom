import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { hxroomUI } from '@hxroom/ui/vite';
import { mediapipeAssets } from '@hxroom/livekit/vite';
import { sentryVitePlugin } from '@sentry/bundler-plugins/vite';
import { resolve } from 'path';

// Source Maps für die Fehlerüberwachung: Nur wenn die CI ein Token mitgibt, entstehen versteckte
// Source Maps, werden nach GlitchTip hochgeladen und danach gelöscht – ins Image kommen sie nie.
// Zugeordnet wird über Debug-IDs, die das Plugin in Bundle und Map schreibt.
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN;

export default defineConfig({
  build: {
    sourcemap: sentryAuthToken ? 'hidden' : false,
  },
  plugins: [
    vue(),
    // colorMode: false – die Klientenseite erscheint bewusst immer hell (kein Umschalter,
    // kein OS-Abgleich), damit sie dieselbe Fläche zeigt wie das Coach-Backoffice.
    hxroomUI({ colorMode: false }),
    // WASM und Modell des Weichzeichners von der eigenen Origin statt von jsDelivr und Google
    // (packages/livekit/vite.ts).
    mediapipeAssets(),
    ...(sentryAuthToken
      ? [sentryVitePlugin({
          url: process.env.SENTRY_URL ?? 'https://errors.hxcode.io',
          org: 'hxroom',
          project: 'hxroom-bookingpage',
          authToken: sentryAuthToken,
          release: { name: process.env.VITE_SENTRY_RELEASE || undefined, inject: false },
          sourcemaps: { filesToDeleteAfterUpload: ['./dist/**/*.map'] },
          // Keine Nutzungsdaten des Plugins an Sentry
          telemetry: false,
        })]
      : []),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5174,
    host: true,
  },
});
