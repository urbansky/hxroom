import { describe, expect, it } from 'vitest';
import { toCsv } from './csv';

interface Row { name: string; note: string | null; count: number }

const columns = [
  { header: 'Name', value: (r: Row) => r.name },
  { header: 'Notiz', value: (r: Row) => r.note },
  { header: 'Anzahl', value: (r: Row) => r.count },
];

describe('toCsv', () => {
  it('beginnt mit BOM, trennt mit Semikolon und endet Zeilen mit CRLF', () => {
    const csv = toCsv([{ name: 'Jörg Müller', note: null, count: 3 }], columns);
    expect(csv.startsWith('﻿Name;Notiz;Anzahl\r\n')).toBe(true);
    expect(csv).toContain('Jörg Müller;;3\r\n');
  });

  it('setzt Felder mit Trenner, Anführungszeichen oder Zeilenumbruch in Anführungszeichen', () => {
    const csv = toCsv([{ name: 'A; B', note: 'Sagte "hallo"\nzweite Zeile', count: 1 }], columns);
    expect(csv).toContain('"A; B";"Sagte ""hallo""\nzweite Zeile";1');
  });

  it('entschärft Felder, die Excel als Formel ausführen würde', () => {
    const csv = toCsv([
      { name: '=1+1', note: '+cmd|calc', count: -2 },
      { name: '@SUMME(A1)', note: '-x', count: 0 },
    ], columns);
    expect(csv).toContain("'=1+1;'+cmd|calc;-2");
    expect(csv).toContain("'@SUMME(A1);'-x;0");
  });

  it('gibt Telefonnummern als Textformel aus, damit Excel kein Apostroph zeigt', () => {
    const csv = toCsv([{ name: 'A', note: '+49 170 1234567', count: 1 }], columns);
    expect(csv).toContain('A;"=""+49 170 1234567""";1');
  });
});
