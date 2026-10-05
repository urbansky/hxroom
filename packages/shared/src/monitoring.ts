/**
 * Bereinigung von Fehlermeldungen, bevor sie die Anwendung verlassen (GlitchTip, Sentry-SDK).
 *
 * Die Zugangslinks der Klienten tragen ihr Geheimnis im Query-String (`/call/:id?token=…`,
 * `/confirm`, `/cancel`, Passwort-Reset), die Download-Links geteilter Dateien ihre Signatur
 * (`X-Amz-Signature`, `X-Amz-Credential`). Beides darf in keiner Fehlermeldung landen – weder in
 * der URL des Requests noch in einer Breadcrumb oder im Text einer Exception.
 *
 * Genutzt an drei Stellen mit derselben Regel: im `beforeSend` der SDKs (API, Coach-App,
 * Klientenseite) und im Tunnel der API, der die Meldungen der Browser weiterreicht.
 */

const FILTERED = '[Filtered]';

// Jeder Query-Parameter, dessen Name auf „token“ endet (token, access_token,
// X-Amz-Security-Token …), dazu Signatur und Credential signierter S3-Links. Auch am Anfang
// eines Textes, denn ein Query-String steht in Events ohne führendes „?“.
const SENSITIVE_PARAM = /((?:^|[?&])(?:[a-z0-9_-]*token|x-amz-signature|x-amz-credential)=)[^&#\s"'\\]*/gi;

/** Ersetzt die Werte sensibler Query-Parameter in einem beliebigen Text. */
export function scrubSensitiveText(text: string): string {
  return text.replace(SENSITIVE_PARAM, `$1${FILTERED}`);
}

/**
 * Wendet `scrubSensitiveText` auf jeden String in einer verschachtelten Struktur an
 * (Sentry-Event, Breadcrumb). Gibt eine Kopie zurück, das Original bleibt unverändert.
 */
export function scrubSensitiveData<T>(value: T): T {
  return scrub(value, new WeakSet()) as T;
}

/**
 * Standard-Integrationen des Browser-SDKs, die in HxRoom aus bleiben:
 * - `Console`: Konsolenausgaben als Breadcrumbs – was die App loggt, soll nicht mitreisen
 * - `BrowserSession`: eine Sitzungsmeldung bei jedem Seitenaufruf – Nutzungsstatistik, kein Fehler
 * - `ConversationId`: für KI-Funktionen des SDKs, hier ohne Zweck
 */
export const MONITORING_EXCLUDED_INTEGRATIONS: readonly string[] = ['Console', 'BrowserSession', 'ConversationId'];

interface MonitoringRequest {
  method?: string;
  url?: string;
  query_string?: unknown;
  headers?: Record<string, string> | undefined;
}

/**
 * `beforeSend` für alle SDKs: Vom Request bleiben Methode, URL, Query und User-Agent – Body,
 * Cookies und die übrigen Header können Zugangsdaten, Notizen oder Chat-Inhalte tragen. Der
 * Benutzer fällt weg, alle Texte werden bereinigt. Bewusst ohne Sentry-Typen, damit das Paket
 * keine Abhängigkeit auf das SDK bekommt.
 */
export function sanitizeMonitoringEvent<T extends { request?: MonitoringRequest; user?: unknown }>(event: T): T {
  const copy = { ...event };
  if (copy.request) {
    const userAgent = copy.request.headers?.['user-agent'] ?? copy.request.headers?.['User-Agent'];
    copy.request = {
      method: copy.request.method,
      url: copy.request.url,
      query_string: copy.request.query_string,
      headers: userAgent ? { 'user-agent': userAgent } : undefined,
    };
  }
  delete copy.user;
  return scrubSensitiveData(copy);
}

function scrub(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return scrubSensitiveText(value);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => scrub(item, seen));
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) out[key] = scrub(item, seen);
  return out;
}
