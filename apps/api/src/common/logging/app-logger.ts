import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import { currentRequestContext, requestContextFields } from './request-context';

/**
 * Der Logger der API (technisches-konzept.md §17, „Logging der API“).
 *
 * Nests ConsoleLogger mit einem Zusatz: Läuft die Zeile innerhalb einer Anfrage, hängen
 * Request-ID, userId und organizationId daran. So lassen sich alle Zeilen einer Anfrage
 * finden, ohne dass jede Stelle sie selbst mitgeben muss.
 *
 * Nests Textform; die Felder stehen einzeilig hinter der Meldung (`{ requestId: '…', … }`).
 * In Produktion ohne Farben, damit keine ANSI-Codes ins Systemjournal geraten.
 *
 * Was hier hineingehört und was nicht, steht in §17: IDs, Zustände, Zahlen. Nie Namen,
 * E-Mail-Adressen, Dateinamen, Inhalte, Tokens oder Query-Strings.
 */
export class AppLogger extends ConsoleLogger {
  protected override printMessages(
    messages: unknown[],
    context?: string,
    logLevel?: LogLevel,
    writeStreamType?: 'stdout' | 'stderr',
    errorStack?: unknown,
    params?: Record<string, unknown>,
  ): void {
    const request = currentRequestContext();
    const merged = request ? { ...requestContextFields(request), ...params } : params;
    super.printMessages(messages, context, logLevel, writeStreamType, errorStack, merged);
  }
}

// Nests Stufen, von der ausführlichsten zur knappsten.
const LEVELS: LogLevel[] = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'];

/**
 * Die aktiven Stufen ab `LOG_LEVEL` aufwärts: `log` heißt log, warn, error und fatal.
 * Ohne (oder mit unbekanntem) Wert in Produktion `log`, sonst `debug`.
 */
export function logLevelsFrom(level: string | undefined, production: boolean): LogLevel[] {
  const fallback: LogLevel = production ? 'log' : 'debug';
  const index = LEVELS.indexOf((level?.trim().toLowerCase() || fallback) as LogLevel);
  return LEVELS.slice(index === -1 ? LEVELS.indexOf(fallback) : index);
}

export function createAppLogger(env: NodeJS.ProcessEnv = process.env): AppLogger {
  const production = env.NODE_ENV === 'production';
  return new AppLogger({
    colors: !production,
    logLevels: logLevelsFrom(env.LOG_LEVEL, production),
  });
}
