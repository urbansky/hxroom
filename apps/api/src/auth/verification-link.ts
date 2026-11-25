/** Gültigkeit des Bestätigungslinks, so wie ihn die Mails nennen („24 Stunden“). */
export const EMAIL_VERIFICATION_EXPIRES_IN_SECONDS = 24 * 60 * 60;

/**
 * Sorgt dafür, dass der Bestätigungslink nach dem Klick auf der Anmeldeseite der Coach-App
 * landet.
 *
 * Die Registrierung schickt diese Rücksprung-Adresse selbst mit. Die Anmeldung dagegen nicht:
 * Löst sie den Link neu aus (`sendOnSignIn`), setzt better-auth `callbackURL=/`, und das
 * hieße die Wurzel des API-Hosts. Ein mitgeschickter absoluter Wert bleibt unverändert.
 *
 * Sieht der Link anders aus als erwartet, bleibt er ebenfalls unverändert – bestätigen lässt
 * sich die Adresse damit trotzdem, nur der Rücksprung fehlt.
 */
export function withLoginCallback(verifyUrl: string, coachAppUrl: string): string {
  try {
    const link = new URL(verifyUrl);
    const callback = link.searchParams.get('callbackURL');
    if (callback && /^https?:\/\//i.test(callback)) return verifyUrl;

    link.searchParams.set('callbackURL', `${coachAppUrl.replace(/\/$/, '')}/auth/login?verified=true`);
    return link.toString();
  } catch {
    return verifyUrl;
  }
}
