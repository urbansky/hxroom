import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ui from '@nuxt/ui/vite';

type UIOptions = Parameters<typeof ui>[0];

const COMPONENTS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'components');

/** Die Sammlungen, die die Apps installiert haben (@iconify-json/lucide, /tabler). */
const ICON_RE = /\bi-(lucide|tabler)-([a-z0-9-]+)\b/g;

/**
 * Die Symbole der geteilten Komponenten – eingesammelt, bevor das Plugin startet.
 *
 * Der Scanner von Nuxt UI findet sie nicht: Er sucht unterhalb von `config.root`, und das
 * ist immer die App. Ein zusätzliches `../`-Muster in `globInclude` ist kein Ausweg –
 * tinyglobby lässt dann die app-eigenen Muster fallen, und plötzlich fehlen *alle* Symbole.
 * Deshalb hier ein eigener, winziger Durchlauf, dessen Ergebnis an `clientBundle.icons`
 * angehängt wird. Die Liste pflegt sich damit von selbst: Eine neue geteilte Komponente
 * bringt ihre Symbole mit.
 *
 * Zwei Grenzen, die auch der Scanner von Nuxt UI hat: Zusammengesetzte Namen
 * (`'i-lucide-' + x`) findet er nicht, und im Dev braucht ein *neues* Symbol in einer
 * geteilten Komponente einen Neustart des Servers – die Hot-Update-Behandlung des Plugins
 * steigt bei Pfaden außerhalb der App aus. Im Build stimmt es immer.
 */
function sharedIcons(dir = COMPONENTS_DIR, found = new Set<string>()): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sharedIcons(path, found);
    else if (entry.name.endsWith('.vue')) {
      for (const [, collection, name] of readFileSync(path, 'utf8').matchAll(ICON_RE)) {
        found.add(`${collection}:${name}`);
      }
    }
  }
  return [...found];
}

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
    // Nimmt dieses Paket vom node_modules-Ausschluss des Komponenten-Resolvers aus. Heute
    // trägt die Auflösung ohnehin, weil pnpm-Symlinks auf Realpfade ohne node_modules
    // zeigen; das hier hält sie auch dann, wenn sich daran etwas ändert.
    scanPackages: ['@hxroom/ui'],
    ...options,
    // Alle im Quelltext gefundenen Symbole wandern zur Build-Zeit ins Bundle. Ohne das holt
    // Nuxt UI sie zur Laufzeit von api.iconify.design nach – auf der Klientenseite hieße das,
    // die IP jedes Klienten an einen Dritten zu geben. `scan` deckt die App ab, `icons` die
    // geteilten Komponenten (siehe sharedIcons). Setzt eine App eigene `icon`-Optionen,
    // gewinnen die; nur der Default kommt von hier.
    icon: {
      ...options.icon,
      clientBundle: options.icon?.clientBundle === false
        ? false
        : {
            scan: true,
            ...options.icon?.clientBundle,
            icons: [...sharedIcons(), ...(options.icon?.clientBundle?.icons ?? [])],
          },
    },
  });
}
