/**
 * Maskiert die Sonderzeichen eines LIKE-/ILIKE-Musters in einer Nutzereingabe.
 *
 * Ohne diese Behandlung wirken getippte Platzhalter als solche: Die Suche nach `%` liefert
 * alle Datensätze, `_` trifft ein beliebiges Zeichen. Das ist kein Sicherheitsproblem –
 * die Eingabe wird als Parameter gebunden, nicht ins SQL interpoliert – aber es sieht für
 * den Suchenden nach wahllosen Treffern aus.
 *
 * Der Backslash muss zuerst in der Zeichenklasse stehen, sonst würde die Maskierung von
 * `%` und `_` gleich wieder mitmaskiert. Postgres nutzt `\` als LIKE-Escape-Zeichen per
 * Default, ein explizites ESCAPE ist deshalb nicht nötig.
 */
export function escapeLikePattern(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}
