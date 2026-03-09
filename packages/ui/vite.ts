import ui from '@nuxt/ui/vite';

/**
 * Vorkonfiguriertes Nuxt UI Vite-Plugin mit HxRoom-Theme.
 * Nutzung in vite.config.ts: `plugins: [vue(), hxroomUI()]`
 */
export function hxroomUI() {
  return ui({
    theme: {
      colors: ['primary', 'secondary', 'sage', 'gold', 'success', 'info', 'warning', 'error'],
    },
    ui: {
      colors: {
        primary: 'sage',
        secondary: 'gold',
        neutral: 'stone',
      },
    },
  });
}
