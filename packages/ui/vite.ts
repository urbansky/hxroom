import ui from '@nuxt/ui/vite';

/**
 * Vorkonfiguriertes Nuxt UI Vite-Plugin mit Sitzraum-Theme.
 * Nutzung in vite.config.ts: `plugins: [vue(), sitzraumUI()]`
 */
export function sitzraumUI() {
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
