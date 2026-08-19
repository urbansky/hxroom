import ui from '@nuxt/ui/vite';

type UIOptions = Parameters<typeof ui>[0];

/**
 * Vorkonfiguriertes Nuxt UI Vite-Plugin mit HxRoom-Theme.
 * Nutzung in vite.config.ts: `plugins: [vue(), hxroomUI()]`
 *
 * `options` wird an das Nuxt-UI-Plugin durchgereicht – die Buchungsseite nutzt das für
 * `colorMode: false`, weil sie bewusst nur hell erscheint.
 */
export function hxroomUI(options: UIOptions = {}) {
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
    ...options,
  });
}
