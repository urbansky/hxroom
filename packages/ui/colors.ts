/**
 * Die Farbzuordnung von HxRoom – eine Quelle für alle Apps.
 *
 * Die Nuxt-Apps lesen sie in `app/app.config.ts` (Laufzeit) und `nuxt.config.ts` (welche
 * Farben Nuxt UI als Varianten erzeugt), die Buchungsseite über `hxroomUI()` in vite.ts.
 * Eigene Einstellungen einer App, etwa Voreinstellungen einzelner Komponenten, gehören
 * daneben in deren `app.config.ts`, die Farben nicht.
 */

/** Welche Palette hinter den semantischen Namen steht. */
export const hxroomColors = {
  primary: 'sage',
  secondary: 'gold',
  neutral: 'stone',
};

/** Die Farben, für die Nuxt UI Varianten erzeugt. */
export const hxroomThemeColors = ['primary', 'secondary', 'sage', 'gold', 'success', 'info', 'warning', 'error'];
