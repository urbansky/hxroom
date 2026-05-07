export default defineNuxtConfig({
  srcDir: '.',
  modules: ['@nuxt/ui'],

  ui: {
    theme: {
      colors: ['primary', 'secondary', 'sage', 'gold', 'success', 'info', 'warning', 'error'],
    },
  },

  css: ['@hxroom/ui/theme'],

  colorMode: {
    preference: 'dark',
  },

  devServer: {
    port: 5176,
  },

  experimental: {
    viteEnvironmentApi: true,
  },

  compatibilityDate: '2025-05-07',
})
