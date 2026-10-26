/**
 * CSV für den Datenexport, so gebaut, dass Excel es ohne Import-Dialog richtig öffnet:
 * UTF-8 mit BOM (sonst zerfallen Umlaute) und Semikolon als Trenner (deutsche Excel-
 * Einstellung). Zeilenende CRLF wie in RFC 4180.
 */

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

const BOM = '﻿';
const SEPARATOR = ';';

/**
 * Ein Feld, das mit =, +, - oder @ beginnt, führte Excel als Formel aus („CSV-Injection“).
 * Ein vorangestelltes Apostroph macht es zu Text. Zahlen bleiben unberührt, damit negative
 * Werte rechenbar bleiben.
 */
function neutralize(value: string): string {
  // Telefonnummern („+49 151 …“) als Textformel: Excel zeigt sie so ohne sichtbares
  // Apostroph. Das Muster lässt nur Ziffern und Trennzeichen zu, und Anführungszeichen
  // werden ohnehin verdoppelt – aus dem String kommt nichts heraus.
  if (/^\+[\d\s()/.-]{3,30}$/.test(value)) return `="${value}"`;
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return String(value);
  const text = neutralize(value);
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [
    columns.map((column) => cell(column.header)).join(SEPARATOR),
    ...rows.map((row) => columns.map((column) => cell(column.value(row))).join(SEPARATOR)),
  ];
  return `${BOM}${lines.join('\r\n')}\r\n`;
}
