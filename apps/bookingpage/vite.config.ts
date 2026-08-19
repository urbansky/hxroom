import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { hxroomUI } from '@hxroom/ui/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(),
    // colorMode: false – die Klientenseite erscheint bewusst immer hell (kein Umschalter,
    // kein OS-Abgleich), damit sie dieselbe Fläche zeigt wie das Coach-Backoffice.
    hxroomUI({ colorMode: false }),
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
