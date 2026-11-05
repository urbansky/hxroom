import { Logger } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { randomBytes } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { runWithRequestContext, type RequestContext } from './request-context';

const logger = new Logger('HTTP');

/** Abfragen ohne Aussage, die nur das Log füllen: Healthchecks und CORS-Preflights. */
function isQuiet(method: string, path: string): boolean {
  return method === 'OPTIONS' || path === '/api/v1/health' || path.startsWith('/api/v1/health/');
}

/**
 * Der Pfad, wie er ins Log darf: ohne Query-String und Fragment – dort tragen die Zugangslinks
 * ihr Geheimnis (`?token=…`) – und ohne den Token, den better-auth beim Passwort-Reset im Pfad
 * selbst führt (`/api/auth/reset-password/<token>`).
 */
export function loggablePath(url: string): string {
  const path = url.split(/[?#]/, 1)[0];
  return path.replace(/^(\/api\/auth\/reset-password\/)[^/]+/, '$1[Filtered]');
}

/**
 * Eine Zeile pro Anfrage (technisches-konzept.md §17, „Logging der API“): Methode, Pfad,
 * Status, Dauer, Request-ID und – sobald ein Guard die Session kennt – userId und
 * organizationId. Bewusst nicht: IP, User-Agent, Query-String, Header, Body.
 *
 * Läuft als Express-Middleware vor allem anderen, auch vor better-auth unter `/api/auth`, das
 * an Nest vorbeigeht. Der Kontext gilt für alles, was die Anfrage auslöst; der AppLogger hängt
 * ihn an jede Zeile.
 *
 * Die Request-ID geht als `X-Request-Id` zurück und als Tag `request_id` an GlitchTip – so
 * führt eine Fehlermeldung zu den Logzeilen derselben Anfrage.
 */
export function requestLogging(req: Request, res: Response, next: NextFunction): void {
  const context: RequestContext = { requestId: randomBytes(6).toString('base64url') };
  res.setHeader('X-Request-Id', context.requestId);
  Sentry.getIsolationScope().setTag('request_id', context.requestId);

  const path = loggablePath(req.originalUrl);
  if (!isQuiet(req.method, path)) {
    const started = process.hrtime.bigint();
    let logged = false;
    const write = (aborted: boolean) => {
      if (logged) return;
      logged = true;
      const durationMs = Math.round(Number(process.hrtime.bigint() - started) / 1e6);
      // 'close' ohne 'finish': Die Verbindung ging vor dem Ende der Antwort zu. Bei den
      // Ereignisströmen des Calls (SSE) ist das der Normalfall, die Dauer ist dann die
      // Verweildauer im Warteraum oder Call.
      const fields = aborted ? { status: res.statusCode, durationMs, aborted: true } : { status: res.statusCode, durationMs };
      runWithRequestContext(context, () => {
        if (res.statusCode >= 500) logger.warn(`${req.method} ${path}`, fields);
        else logger.log(`${req.method} ${path}`, fields);
      });
    };
    res.on('finish', () => write(false));
    res.on('close', () => write(!res.writableFinished));
  }

  runWithRequestContext(context, next);
}
