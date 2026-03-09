import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { hxroomUI } from '@hxroom/ui/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(),
    hxroomUI(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5175,
  },
});
