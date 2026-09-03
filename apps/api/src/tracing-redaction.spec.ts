import { describe, expect, it } from 'vitest';
import { redactQueryString, redactUrl, redactedAttributes } from './tracing-redaction';

describe('redactUrl', () => {
  it('ersetzt den Klienten-Token im Warteraum-Aufruf', () => {
    expect(redactUrl('/api/v1/bookings/abc/waiting-room?token=deadbeef'))
      .toBe('/api/v1/bookings/abc/waiting-room?token=REDACTED');
  });

  it('lässt unverfängliche Parameter stehen', () => {
    expect(redactUrl('/api/v1/bookings?from=2026-09-01&token=secret&limit=50'))
      .toBe('/api/v1/bookings?from=2026-09-01&token=REDACTED&limit=50');
  });

  // Der SSE-Stream ist der langlebigste Span überhaupt und trägt denselben Token.
  it('greift auch beim SSE-Stream', () => {
    expect(redactUrl('/api/v1/bookings/abc/waiting-room/events?token=x.y-z'))
      .toBe('/api/v1/bookings/abc/waiting-room/events?token=REDACTED');
  });

  it('ist unabhängig von der Schreibweise des Parameters', () => {
    expect(redactUrl('/x?Token=abc')).toBe('/x?Token=REDACTED');
  });

  it('erwischt jeden sensiblen Parameter, nicht nur den ersten', () => {
    expect(redactUrl('/x?token=a&code=b&harmlos=c'))
      .toBe('/x?token=REDACTED&code=REDACTED&harmlos=c');
  });

  // Ein Parameter, der zufällig auf einen sensiblen Namen endet, ist keiner.
  it('trifft nur ganze Parameternamen', () => {
    expect(redactUrl('/x?csrf_token_present=1')).toBeNull();
  });

  it('gibt null zurück, wenn nichts zu redigieren ist', () => {
    expect(redactUrl('/api/v1/health')).toBeNull();
    expect(redactUrl('/api/v1/bookings?limit=50')).toBeNull();
  });

  it('behandelt einen leeren Tokenwert wie einen gesetzten', () => {
    expect(redactUrl('/x?token=')).toBe('/x?token=REDACTED');
  });
});

describe('redactQueryString', () => {
  // url.query trägt nur den Query-Teil – bei der HTTP-Instrumentierung ohne führendes '?'.
  it('redigiert einen reinen Query-String', () => {
    expect(redactQueryString('token=deadbeef&foo=1')).toBe('token=REDACTED&foo=1');
  });

  // Die undici-Instrumentierung schreibt dasselbe Attribut mit Fragezeichen.
  it('redigiert auch mit führendem Fragezeichen', () => {
    expect(redactQueryString('?token=deadbeef&foo=1')).toBe('?token=REDACTED&foo=1');
  });

  it('gibt null zurück, wenn nichts Sensibles drinsteht', () => {
    expect(redactQueryString('limit=50&from=2026-09-01')).toBeNull();
  });
});

describe('redactedAttributes', () => {
  // Der Span der Nest-Instrumentierung trägt die URL relativ, der HTTP-Span absolut –
  // beide müssen erwischt werden.
  it('erwischt jedes URL-Attribut, egal welche Instrumentierung es gesetzt hat', () => {
    expect(redactedAttributes({
      'http.url': 'https://api.hxroom.de/api/v1/bookings/abc/cancellation?token=geheim',
      'http.target': '/api/v1/bookings/abc/waiting-room?token=geheim',
      'url.full': '/api/v1/bookings/abc/waiting-room/events?token=geheim',
      'url.query': 'token=geheim',
    })).toEqual({
      'http.url': 'https://api.hxroom.de/api/v1/bookings/abc/cancellation?token=REDACTED',
      'http.target': '/api/v1/bookings/abc/waiting-room?token=REDACTED',
      'url.full': '/api/v1/bookings/abc/waiting-room/events?token=REDACTED',
      'url.query': 'token=REDACTED',
    });
  });

  // Ohne sensiblen Parameter bleibt das Attribut der Instrumentierung unangetastet –
  // ein selbst gebauter Wert wäre dort nur eine zweite Fehlerquelle.
  it('liefert nichts für unverfängliche Spans', () => {
    expect(redactedAttributes({
      'http.url': 'https://api.hxroom.de/api/v1/health',
      'url.path': '/api/v1/bookings/abc/waiting-room',
      'http.method': 'GET',
    })).toEqual({});
  });

  it('ignoriert Attribute, die keine Strings sind', () => {
    expect(redactedAttributes({ 'http.url': 42, 'url.query': null })).toEqual({});
  });
});
