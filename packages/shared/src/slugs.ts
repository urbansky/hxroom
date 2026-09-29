/**
 * Slugs, die kein Coach bekommen darf.
 *
 * Der Slug ist die Subdomain der Buchungsseite (`[slug].hxroom.de`). Caddy leitet nur
 * Hosts ohne eigenen Block an die Buchungsseite weiter, und die Buchungsseite liest den
 * Slug aus dem ersten Label des Hostnamens. Ein Coach mit dem Slug `api` bekäme also eine
 * Adresse, unter der die API antwortet – seine Buchungsseite wäre nie erreichbar.
 *
 * Die Liste deckt drei Gruppen ab: Hosts, die heute belegt sind (Caddyfile, DNS), Namen,
 * die für Mail und Infrastruktur üblich sind, und Namen, die HxRoom absehbar selbst
 * braucht. Neue Einträge wirken nur auf künftige Vergaben; ein bereits vergebener Slug
 * bleibt, bis ihn jemand ändert.
 *
 * Hier in `@hxroom/shared`, weil drei Stellen sie brauchen: die Registrierung und der
 * better-auth-Endpunkt `/organization/update` in der API sowie `bookingPageSchema`, das
 * sowohl `PATCH /booking-page` als auch das Formular der Coach-App prüft.
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  // Heute belegt: eigene Blöcke im Caddyfile bzw. eigener DNS-Eintrag (Ionos)
  'www', 'api', 'admin-api', 'app', 'admin', 'livekit', 'autodiscover',

  // Mail und Infrastruktur
  'mail', 'smtp', 'imap', 'pop', 'pop3', 'mx', 'webmail', 'autoconfig', 'ftp', 'sftp',
  'ns', 'ns1', 'ns2', 'dns', 'vpn', 'turn', 'stun', 'whisper', 'clamav', 's3', 'storage',
  'cdn', 'static', 'assets', 'media', 'files', 'img', 'images', 'localhost',

  // Absehbar für HxRoom selbst (Studio-Subdomain: technisches-konzept.md §16 Punkt 01)
  'hxroom', 'studio', 'blog', 'help', 'hilfe', 'support', 'docs', 'status', 'auth',
  'login', 'account', 'dashboard', 'billing', 'pay', 'checkout', 'shop', 'api-docs',
  'dev', 'staging', 'test', 'demo', 'beta', 'preview', 'internal', 'intern', 'backoffice',
  'call', 'meet', 'video', 'kontakt', 'contact', 'impressum', 'datenschutz', 'legal',
]);

/** Ein gültiges DNS-Label in Kleinbuchstaben, ohne Punycode-Präfix. */
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/**
 * Taugt der Slug als Subdomain? Ohne diese Prüfung ließe sich die Sperrliste mit `API`
 * oder `api.` umgehen – der Browser normalisiert beides auf denselben Host.
 */
export function isValidSlugFormat(slug: string): boolean {
  return SLUG_PATTERN.test(slug) && !slug.startsWith('xn--');
}
