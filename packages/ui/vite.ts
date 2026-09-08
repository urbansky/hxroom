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
    // Alle im Quelltext gefundenen Symbole wandern zur Build-Zeit ins Bundle. Ohne das holt
    // Nuxt UI sie zur Laufzeit von api.iconify.design nach – auf der Klientenseite hieße das,
    // die IP jedes Klienten an einen Dritten zu geben. Setzt eine App eigene `icon`-Optionen,
    // gewinnen die; nur der Default für `clientBundle` kommt von hier.
    icon: { clientBundle: { scan: true }, ...options.icon },
  });
}
