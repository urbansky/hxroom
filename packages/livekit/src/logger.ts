/**
 * Schlanker Logger für die Call-Schicht.
 *
 * - Vier Stufen: debug, info, warn, error
 * - Ein Kennzeichen (z. B. `HxRoom:Call`) vor jeder Ausgabe, farbig hinterlegt
 * - `console`-Methoden werden gebunden statt umschlossen, damit in der Konsole die
 *   ursprüngliche Aufrufzeile stehen bleibt und nicht diese Datei
 * - Nur in der Entwicklung aktiv; im Bündel für die Produktion fällt alles auf `noop`
 *
 * `import.meta.env.DEV` statt `process.env.NODE_ENV`: `process` gibt es im Browser nur,
 * solange ein Bundler es ersetzt – beide Konsumenten sind Vite, und dort ist
 * `import.meta.env` die vorgesehene und getypte Variante.
 */

const isDev = import.meta.env?.DEV ?? false

const style = `
  background: #7f8c8d;
  border-radius: 0.5em;
  color: white;
  padding: 2px 0.5em;
`

function noop(..._args: unknown[]) {}

export function createLogger(tag: string) {
  const prefix = `%c${tag}%c`
  return {
    debug: isDev ? console.debug.bind(console, prefix, style, '') : noop,
    info: isDev ? console.info.bind(console, prefix, style, '') : noop,
    warn: isDev ? console.warn.bind(console, prefix, style, '') : noop,
    // Auch Fehler bleiben in der Produktion still. Ein Fehlerbericht an den Server ist eine
    // eigene Entscheidung mit eigenen DSGVO-Fragen, kein Nebenprodukt des Loggers.
    error: isDev ? console.error.bind(console, prefix, style, '') : noop,
  }
}

export const log = createLogger('HxRoom:Call')
