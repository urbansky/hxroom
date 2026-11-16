import type { BetterAuthOptions } from 'better-auth';

// Schutz gegen das Durchprobieren von Passwörtern (technisches-konzept.md §7, „Rate-Limit“).
// Die Werte entsprechen den Voreinstellungen von better-auth 1.7, stehen aber ausdrücklich
// hier: better-auth schaltet den Limiter von sich aus nur bei NODE_ENV=production ein, und
// eine neue Version könnte ihre Voreinstellungen ändern, ohne dass es jemand merkt.

const SENSITIVE = { window: 10, max: 3 };
const SENDS_MAIL = { window: 60, max: 3 };

export const AUTH_RATE_LIMIT = {
  // Auch in der Entwicklung an: Dann fällt ein Fehler im Umgang mit 429 schon lokal auf.
  enabled: true,
  // Eine API-Instanz; nach einem Neustart beginnen die Zähler von vorn.
  storage: 'memory',
  // Alle übrigen Endpunkte unter /api/auth.
  window: 10,
  max: 100,
  // Gezählt wird je Client-IP und Pfad. Eine eigene Regel ersetzt die eingebaute.
  customRules: {
    '/sign-in/*': SENSITIVE,
    '/sign-up/*': SENSITIVE,
    '/change-password': SENSITIVE,
    '/change-email': SENSITIVE,
    '/request-password-reset': SENDS_MAIL,
    '/send-verification-email': SENDS_MAIL,
  },
} satisfies NonNullable<BetterAuthOptions['rateLimit']>;

/**
 * Woher die Client-IP kommt. Caddy setzt `X-Forwarded-For` auf genau die Adresse, von der
 * die Anfrage kam, und verwirft einen mitgeschickten Wert – fälschen lässt sie sich so nicht.
 * Steht vor Caddy einmal ein weiterer Proxy (CDN, Load Balancer), trägt der Header zwei
 * Einträge; better-auth findet dann keine IP mehr und zählt alle Clients gemeinsam. Dann
 * gehört dessen Adressbereich nach `trustedProxies`.
 */
export const AUTH_IP_ADDRESS = {
  ipAddressHeaders: ['x-forwarded-for'],
} satisfies NonNullable<NonNullable<BetterAuthOptions['advanced']>['ipAddress']>;
