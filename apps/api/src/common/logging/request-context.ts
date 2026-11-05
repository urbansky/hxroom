import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Was jede Logzeile einer Anfrage mitträgt (technisches-konzept.md §17, „Logging der API“).
 * Nur IDs: Die Request-ID verbindet die Zeilen einer Anfrage, die übrigen sagen, wer handelt.
 */
export interface RequestContext {
  requestId: string;
  userId?: string;
  organizationId?: string;
  /** Betreiber, der die Sitzung eines Coachs übernommen hat. */
  impersonatedBy?: string;
}

export type RequestActor = Partial<Omit<RequestContext, 'requestId'>>;

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithRequestContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function currentRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/**
 * Ergänzt die laufende Anfrage um den angemeldeten Benutzer – aufgerufen von den Guards, sobald
 * die Session feststeht. Außerhalb einer Anfrage (Cron, Start) ohne Wirkung.
 */
export function setRequestActor(actor: { [K in keyof RequestActor]?: string | null }): void {
  const store = storage.getStore();
  if (!store) return;
  for (const [key, value] of Object.entries(actor)) {
    if (value) store[key as keyof RequestActor] = value;
  }
}

/** Die Felder für eine Logzeile, ohne leere Werte. */
export function requestContextFields(context: RequestContext): Record<string, string> {
  const fields: Record<string, string> = { requestId: context.requestId };
  if (context.userId) fields.userId = context.userId;
  if (context.organizationId) fields.organizationId = context.organizationId;
  if (context.impersonatedBy) fields.impersonatedBy = context.impersonatedBy;
  return fields;
}
