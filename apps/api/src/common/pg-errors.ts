/** Postgres-Fehlercode für die Verletzung eines Unique-Constraints. */
const UNIQUE_VIOLATION = '23505';

/**
 * Erkennt eine Unique-Constraint-Verletzung.
 *
 * Drizzle verpackt Treiberfehler seit 0.45 in einen `DrizzleQueryError` und hängt den
 * ursprünglichen `PostgresError` an `cause`. Ein `err.code`-Vergleich allein greift
 * deshalb nicht mehr – der Fehler rutscht dann als 500 durch, obwohl er fachlich
 * erwartbar ist. Beide Ebenen werden geprüft, damit die Erkennung unabhängig davon
 * funktioniert, ob der Fehler verpackt ankommt oder nicht.
 */
export function isUniqueViolation(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  const causeCode = (err as { cause?: { code?: string } | null } | null)?.cause?.code;
  return code === UNIQUE_VIOLATION || causeCode === UNIQUE_VIOLATION;
}
