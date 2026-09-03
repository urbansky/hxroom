import type { Span } from '@opentelemetry/api';
// Über den Namespace von sdk-node statt direkt aus sdk-trace-base: Das Paket steht so
// oder so nur als dessen Abhängigkeit im Baum, und die Versionen bleiben gekoppelt.
import type { tracing } from '@opentelemetry/sdk-node';

/**
 * Redaction sensibler Query-Parameter für OpenTelemetry-Traces.
 *
 * Der Klienten-Zugang läuft über einen Token in der URL: `/bookings/:id/waiting-room`,
 * `/bookings/:id/waiting-room/events` (SSE) und `/bookings/:id/cancellation` tragen ihn
 * als `?token=…`, weil sie aus einem Mail-Link heraus ohne Session aufgerufen werden.
 * Die Auto-Instrumentierung schreibt die vollständige URL in die Span-Attribute, und von
 * dort geht sie an den Collector und weiter an SigNoz. Ein Token, das im Trace-Backend
 * landet, ist ein Schlüssel zum Warteraum in einem System, das nie dafür gedacht war,
 * Schlüssel aufzubewahren.
 *
 * Bewusst als SpanProcessor statt als Hook einer einzelnen Instrumentierung: Die URL
 * steht nicht nur im HTTP-Server-Span. `instrumentation-nestjs-core` legt für jeden
 * Controller-Aufruf einen eigenen Span an und schreibt `http.url` selbst hinein – ein
 * Hook an der HTTP-Instrumentierung hätte genau diesen Span übersehen. Der Processor
 * fasst jeden Span an, egal wer ihn erzeugt hat.
 *
 * Zweite Verteidigungslinie ist derselbe Ersetzungsvorgang im Collector
 * (infra/otel/config.yaml) – er greift auch für Daten, die nicht aus diesem Prozess
 * stammen.
 */

/**
 * Query-Parameter, deren Wert nie in einen Trace gehört. Neben dem eigenen
 * `clientAccessToken` auch die Namen, die better-auth in Mail-Links verwendet
 * (Passwort-Reset, E-Mail-Bestätigung) – beide sind Einmal-Zugänge zu einem Konto.
 */
export const SENSITIVE_QUERY_PARAMS = [
  'token',
  'access_token',
  'refresh_token',
  'code',
  'secret',
  'key',
  'password',
  'sig',
  'signature',
] as const;

/**
 * Für ausgehende Requests bringt die HTTP-Instrumentierung eine eigene Redaction mit,
 * die case-sensitiv arbeitet und deren Vorgabewerte von der Konfiguration *ersetzt*
 * statt ergänzt werden. Deshalb stehen die Vorgabenamen (Signaturen von S3 & Co.) hier
 * ausdrücklich mit drin, sonst fielen sie stillschweigend weg.
 */
export const OUTGOING_REDACTED_QUERY_PARAMS = [
  ...SENSITIVE_QUERY_PARAMS,
  'Signature',
  'AWSAccessKeyId',
  'X-Goog-Signature',
] as const;

/** Gleicher Platzhalter wie in der HTTP-Instrumentierung, damit Traces einheitlich lesbar bleiben. */
export const REDACTED = 'REDACTED';

/**
 * Attribute, die eine ganze URL oder Request-Zeile tragen – in beiden
 * Semconv-Generationen und über die drei Instrumentierungen hinweg, die sie setzen.
 * Ein Attribut zu prüfen, das gar nicht gesetzt ist, kostet nichts; eines zu übersehen,
 * wäre das Leck.
 */
const URL_ATTRIBUTES = ['http.url', 'http.target', 'url.full'] as const;

/** Attribute, die nur den Query-Teil tragen (ohne führendes `?`). */
const QUERY_ATTRIBUTES = ['url.query'] as const;

// Das `?` gehört mit in die vordere Gruppe: Die undici-Instrumentierung schreibt in
// `url.query` den Query-String **mit** führendem Fragezeichen, die HTTP-Instrumentierung
// ohne – und in einer vollständigen URL trennt es ohnehin Pfad und Query.
const SENSITIVE_PARAM_PATTERN = new RegExp(
  `(^|[?&])(${SENSITIVE_QUERY_PARAMS.join('|')})=[^&]*`,
  'gi',
);

/**
 * Ersetzt die Werte sensibler Parameter in einem Query-String (`a=1&token=x`).
 * `null`, wenn nichts zu ersetzen war – der Aufrufer soll das Attribut dann in Ruhe lassen.
 *
 * Bewusst eine Ersetzung auf dem rohen String statt über URLSearchParams: Letzteres
 * normalisiert die übrigen Parameter (Leerzeichen werden zu `+`), und ein Trace soll
 * zeigen, was tatsächlich ankam.
 */
export function redactQueryString(query: string): string | null {
  SENSITIVE_PARAM_PATTERN.lastIndex = 0;
  if (!SENSITIVE_PARAM_PATTERN.test(query)) return null;

  SENSITIVE_PARAM_PATTERN.lastIndex = 0;
  return query.replace(SENSITIVE_PARAM_PATTERN, `$1$2=${REDACTED}`);
}

/**
 * Dasselbe für alles mit einem Query-Anteil: absolute URL, Request-Zeile, Pfad.
 * `null`, wenn kein Query da ist oder darin nichts Sensibles steht.
 */
export function redactUrl(url: string): string | null {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return null;

  const redactedQuery = redactQueryString(url.slice(queryStart + 1));
  if (redactedQuery === null) return null;

  return `${url.slice(0, queryStart)}?${redactedQuery}`;
}

/** Redigiert die URL-Attribute eines Attribut-Objekts. Gibt zurück, was sich geändert hat. */
export function redactedAttributes(
  attributes: Record<string, unknown>,
): Record<string, string> {
  const changed: Record<string, string> = {};

  for (const key of URL_ATTRIBUTES) {
    const value = attributes[key];
    if (typeof value !== 'string') continue;
    const redacted = redactUrl(value);
    if (redacted !== null) changed[key] = redacted;
  }

  for (const key of QUERY_ATTRIBUTES) {
    const value = attributes[key];
    if (typeof value !== 'string') continue;
    const redacted = redactQueryString(value);
    if (redacted !== null) changed[key] = redacted;
  }

  return changed;
}

/**
 * Hängt sich vor den exportierenden Processor und räumt jeden Span auf, sobald er
 * beginnt. Beim Start deshalb, weil sowohl die HTTP- als auch die Nest-Instrumentierung
 * ihre URL-Attribute dort setzen – später kommt nichts mehr dazu, was einen Token
 * enthielte.
 */
export class QueryTokenRedactionSpanProcessor implements tracing.SpanProcessor {
  onStart(span: Span): void {
    // Der laufende Span ist zugleich ReadableSpan – anders käme man an die bereits
    // gesetzten Attribute nicht heran, und ohne sie ließe sich nichts redigieren.
    const attributes = (span as unknown as tracing.ReadableSpan).attributes as Record<string, unknown>;

    for (const [key, value] of Object.entries(redactedAttributes(attributes))) {
      span.setAttribute(key, value);
    }
  }

  onEnd(): void {}

  async forceFlush(): Promise<void> {}

  async shutdown(): Promise<void> {}
}
