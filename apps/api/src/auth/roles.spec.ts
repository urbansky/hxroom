import { describe, expect, it } from 'vitest';
import { isAdminRole } from './roles';

describe('isAdminRole', () => {
  it('erkennt die Betreiber-Rolle', () => {
    expect(isAdminRole('admin')).toBe(true);
  });

  it('weist Coachs ab', () => {
    expect(isAdminRole('user')).toBe(false);
  });

  // Accounts aus der Zeit vor dem admin-Plugin haben kein gesetztes Feld.
  it('behandelt NULL wie die Standardrolle', () => {
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole('')).toBe(false);
  });

  // Das Plugin legt mehrere Rollen kommasepariert in einem einzigen Feld ab.
  it('findet die Rolle auch in einer Liste', () => {
    expect(isAdminRole('user,admin')).toBe(true);
    expect(isAdminRole('user, admin')).toBe(true);
    expect(isAdminRole('user,support')).toBe(false);
  });

  // Sonst würde eine Rolle namens 'administrator' oder 'readonly-admin' mitgreifen.
  it('vergleicht ganze Rollennamen', () => {
    expect(isAdminRole('administrator')).toBe(false);
    expect(isAdminRole('readonly-admin')).toBe(false);
  });
});
