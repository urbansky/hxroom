/**
 * Tunnel für die Fehlermeldungen der Browser (Sentry-SDK, Option `tunnel`).
 *
 * Coach-App und Klientenseite schicken ihre Meldungen an die eigene API statt direkt an
 * GlitchTip: Werbeblocker erkennen das Sentry-Muster nicht, der Browser spricht nur mit
 * api.hxroom.de, und die API entfernt vor dem Weiterreichen ein zweites Mal Tokens.
 *
 * Ein Sentry-Umschlag (envelope) ist zeilenweise JSON. Die erste Zeile ist der Kopf und nennt
 * die DSN des Projekts, für das die Meldung bestimmt ist. Weitergereicht wird nur an Projekte
 * aus der eigenen Liste (SENTRY_TUNNEL_DSNS) – sonst wäre der Tunnel ein offenes Relais.
 */

export interface TunnelTarget {
  /**
   * Adresse, an die der Umschlag geht: <origin>/api/<projekt>/envelope/?sentry_key=…
   * Sentry liest die DSN aus dem Kopf des Umschlags, GlitchTip verlangt den öffentlichen
   * Schlüssel zusätzlich in der Adresse (sonst 403).
   */
  url: string;
  projectId: string;
}

interface AllowedProject {
  origin: string;
  projectId: string;
  publicKey: string;
}

/**
 * Liest die erlaubten Projekte aus einer kommagetrennten DSN-Liste. Schlüssel ist
 * „<öffentlicher Schlüssel>@<host>/<projekt>“, damit ein Umschlag nur durchkommt, wenn
 * Schlüssel, Host und Projekt zusammenpassen.
 */
export function parseAllowedDsns(list: string | undefined): Map<string, AllowedProject> {
  const allowed = new Map<string, AllowedProject>();
  for (const raw of (list ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const dsn = parseDsn(raw);
    if (dsn) allowed.set(dsn.key, { origin: dsn.origin, projectId: dsn.projectId, publicKey: dsn.publicKey });
  }
  return allowed;
}

/** Bestimmt das Ziel eines Umschlags oder `null`, wenn er nicht weitergereicht werden darf. */
export function resolveTunnelTarget(
  envelope: string,
  allowed: Map<string, AllowedProject>,
): TunnelTarget | null {
  const headerLine = envelope.split('\n', 1)[0];
  let header: unknown;
  try {
    header = JSON.parse(headerLine);
  } catch {
    return null;
  }
  if (typeof header !== 'object' || header === null) return null;
  const rawDsn = (header as Record<string, unknown>).dsn;
  if (typeof rawDsn !== 'string') return null;
  const dsn = parseDsn(rawDsn);
  if (!dsn) return null;
  const project = allowed.get(dsn.key);
  if (!project) return null;
  const query = new URLSearchParams({ sentry_key: project.publicKey, sentry_version: '7' });
  return {
    url: `${project.origin}/api/${project.projectId}/envelope/?${query}`,
    projectId: project.projectId,
  };
}

function parseDsn(raw: string): { key: string; origin: string; projectId: string; publicKey: string } | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  const projectId = url.pathname.replace(/^\/+|\/+$/g, '');
  if (!url.username || !/^\d+$/.test(projectId)) return null;
  return {
    key: `${url.username}@${url.host}/${projectId}`,
    origin: `${url.protocol}//${url.host}`,
    projectId,
    publicKey: url.username,
  };
}

/**
 * Einfache Mengenbegrenzung im Speicher: höchstens `limit` Umschläge je Schlüssel und Minute.
 * Genügt für eine einzelne API-Instanz; sie soll eine Fehlerschleife im Browser oder
 * absichtliches Fluten abfangen, keine exakte Abrechnung leisten.
 */
export class MinuteRateLimiter {
  private readonly hits = new Map<string, { windowStart: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly now: () => number = Date.now,
  ) {}

  allow(key: string): boolean {
    const now = this.now();
    const entry = this.hits.get(key);
    if (!entry || now - entry.windowStart >= 60_000) {
      this.hits.set(key, { windowStart: now, count: 1 });
      this.prune(now);
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }

  // Abgelaufene Fenster entfernen, damit die Map bei vielen Absendern nicht wächst.
  private prune(now: number) {
    if (this.hits.size < 1000) return;
    for (const [key, entry] of this.hits) {
      if (now - entry.windowStart >= 60_000) this.hits.delete(key);
    }
  }
}
