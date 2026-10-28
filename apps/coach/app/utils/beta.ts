// Was in der Beta ausgeblendet ist (phase5-umsetzungsplan.md, Schritt 6c): Seiten, die nur
// ankündigen, und die Kacheln „Geplante Features“. Beta-Coaches sollen sehen, was geht,
// nicht was kommt – Wünsche kommen über den Feedback-Knopf.
//
// Kommt eine Funktion, nimmt man ihre Seite hier heraus. Die Seiten selbst bleiben im Code.

/** Seiten ohne Funktion: nicht im Menü, ein Aufruf leitet aufs Dashboard (middleware/beta.global.ts). */
export const BETA_HIDDEN_ROUTES: readonly string[] = [
  '/finance/revenue',
  '/finance/invoices',
  '/settings/waiting-room',
  '/settings/notifications',
  '/settings/billing',
]

/** Kacheln „Geplante Features“ in den übrigen Seiten (UpcomingFeature). */
export const SHOW_UPCOMING_FEATURES = false

export function isBetaHidden(path: string): boolean {
  return BETA_HIDDEN_ROUTES.some(route => path === route || path.startsWith(`${route}/`))
}
