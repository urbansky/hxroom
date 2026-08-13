/**
 * Normalisiert eine E-Mail-Adresse für das Klienten-Matching (Baustein 1 aus
 * doc/idee-klienten-matching.md): lowercase und getrimmt.
 *
 * Muss vor jedem Lookup und jedem Insert auf `clients.email` laufen. Der
 * Unique-Constraint (organizationId, email) ist case-sensitive und würde
 * "Anna@Firma.de" und "anna@firma.de" sonst als zwei verschiedene Klienten führen.
 *
 * Bewusst eine gemeinsame Funktion für beide Entstehungswege eines Klienten – den
 * automatischen (BookingsService.confirm) und den manuellen (ClientsService.create).
 * Zwei Kopien dieser Regel würden über die Zeit auseinanderlaufen und genau das
 * Duplikat erzeugen, das die Normalisierung verhindern soll.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
