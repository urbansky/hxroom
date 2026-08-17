/**
 * Hosts, unter denen better-auth antwortet.
 *
 * Die Coach-App spricht `api.hxroom.de` an, das Betreiber-Backoffice den eigenen Host
 * `admin-api.hxroom.de` – derselbe Container, dieselbe Instanz, dieselbe Session-Tabelle.
 * Der Grund ist allein die Cookie-Ablage: Session-Cookies sind host-gebunden, und der
 * Cookie-Name lässt sich nicht pro App ändern (`advanced.cookiePrefix` gilt instanzweit).
 * Ohne zweiten Host überschreibt ein Betreiber-Login die Coach-Session desselben Browsers.
 *
 * Der Host ist **keine** Autorisierungsgrenze – die bleibt bei AdminGuard und `user.role`.
 */
export interface AuthHosts {
  allowedHosts: string[];
  protocol: 'http' | 'https';
  fallback: string;
}

/**
 * Das Protokoll wird bewusst aus BETTER_AUTH_URL abgeleitet und nicht auf 'auto' gesetzt:
 * better-auth entscheidet daran, ob das Session-Cookie den `__Secure-`-Prefix trägt. Bei
 * 'auto' fiele diese Entscheidung auf NODE_ENV zurück – ein abweichender Wert würde den
 * Cookie-Namen ändern und damit alle bestehenden Sessions ungültig machen.
 */
export function resolveAuthHosts(authUrl: string, adminAuthUrl?: string): AuthHosts {
  const hosts = [authUrl, adminAuthUrl]
    .filter((url): url is string => Boolean(url))
    .map((url) => new URL(url).host);

  return {
    allowedHosts: [...new Set(hosts)],
    protocol: new URL(authUrl).protocol === 'https:' ? 'https' : 'http',
    // Greift nur bei Aufrufen ohne Host-Header (Skripte, interne auth.api-Aufrufe).
    // Ohne Fallback würde better-auth dort werfen statt sich wie bisher zu verhalten.
    fallback: authUrl,
  };
}
