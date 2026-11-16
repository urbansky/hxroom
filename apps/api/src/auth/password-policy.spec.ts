import { describe, expect, it } from 'vitest';
import { newPasswordSchema, passwordResemblesEmail } from '@hxroom/shared';
import { checkPasswordPolicy } from './password-policy';

describe('checkPasswordPolicy', () => {
  it('lässt ein ausgedachtes Passwort und einen Satz durch', () => {
    expect(checkPasswordPolicy('Kaffee-um-acht-ist-kalt')).toBeNull();
    expect(checkPasswordPolicy('Mein Kaffee ist um acht kalt', 'anna@example.com')).toBeNull();
  });

  // Das Seed-Passwort muss die Richtlinie bestehen, sonst scheitern Demo und lokale Tests.
  it('lässt das Seed-Passwort durch', () => {
    expect(checkPasswordPolicy('hxroom1234', 'anna@hxroom.test')).toBeNull();
  });

  it('weist eintönige Passwörter ab', () => {
    expect(checkPasswordPolicy('aaaaaaaaaa')?.code).toBe('PASSWORD_TOO_SIMPLE');
    expect(checkPasswordPolicy('1212121212')?.code).toBe('PASSWORD_TOO_SIMPLE');
    expect(checkPasswordPolicy('AaAaAaAaAa')?.code).toBe('PASSWORD_TOO_SIMPLE');
  });

  it('weist verbreitete Passwörter ab, auch in anderer Schreibweise', () => {
    expect(checkPasswordPolicy('1234567890')?.code).toBe('PASSWORD_TOO_COMMON');
    expect(checkPasswordPolicy('Password123')?.code).toBe('PASSWORD_TOO_COMMON');
    expect(checkPasswordPolicy('Passwort123')?.code).toBe('PASSWORD_TOO_COMMON');
  });

  it('weist die E-Mail-Adresse als Passwort ab', () => {
    expect(checkPasswordPolicy('martina.berg@example.com', 'martina.berg@example.com')?.code)
      .toBe('PASSWORD_RESEMBLES_EMAIL');
    expect(checkPasswordPolicy('Martina.Berg2026!', 'martina.berg@example.com')?.code)
      .toBe('PASSWORD_RESEMBLES_EMAIL');
  });
});

describe('passwordResemblesEmail', () => {
  it('erlaubt den Namen als Teil eines Satzes', () => {
    expect(passwordResemblesEmail('anna trinkt gern kaffee', 'anna@example.com')).toBe(false);
  });

  it('ignoriert sehr kurze Adressteile', () => {
    expect(passwordResemblesEmail('ab-1234567', 'ab@example.com')).toBe(false);
  });
});

describe('newPasswordSchema', () => {
  it('verlangt 10 Zeichen und 4 verschiedene', () => {
    expect(newPasswordSchema.safeParse('kurz123').success).toBe(false);
    expect(newPasswordSchema.safeParse('xxxxxxxxxx').success).toBe(false);
    expect(newPasswordSchema.safeParse('Sonnenaufgang').success).toBe(true);
  });

  it('verlangt keine Zeichenklassen', () => {
    expect(newPasswordSchema.safeParse('nur kleinbuchstaben').success).toBe(true);
  });
});
