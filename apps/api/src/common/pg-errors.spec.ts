import { describe, expect, it } from 'vitest';
import { isUniqueViolation } from './pg-errors';

describe('isUniqueViolation', () => {
  it('erkennt den Fehler direkt am Objekt', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
  });

  // Der Regressionsfall: Drizzle reicht den PostgresError seit 0.45 nur noch über
  // `cause` durch. Ein Check auf err.code allein lieferte hier fälschlich false und
  // ließ den Fehler als 500 statt als 409 beim Client ankommen.
  it('erkennt den Fehler auch verpackt in cause', () => {
    const wrapped = Object.assign(new Error('Failed query'), { cause: { code: '23505' } });
    expect(isUniqueViolation(wrapped)).toBe(true);
  });

  it('lässt andere Postgres-Fehler durch', () => {
    expect(isUniqueViolation({ code: '42703' })).toBe(false);
    expect(isUniqueViolation(Object.assign(new Error('x'), { cause: { code: '42703' } }))).toBe(false);
  });

  it('kommt mit fehlenden Feldern und Nicht-Objekten klar', () => {
    expect(isUniqueViolation(new Error('irgendwas'))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
  });
});
