import { describe, expect, it } from 'vitest';
// Die Bereinigung liegt in @hxroom/shared (ohne eigene Tests) und wird hier mitgeprüft.
import { sanitizeMonitoringEvent, scrubSensitiveData, scrubSensitiveText } from '@hxroom/shared';
import { MinuteRateLimiter, parseAllowedDsns, resolveTunnelTarget } from './monitoring-tunnel';

const COACH_DSN = 'https://51c38b40c50f4d83b6f63fb8e3d7dbce@errors.hxcode.io/2';
const BOOKING_DSN = 'https://d71d2cfa9aea4bb0adeeb808e102d47a@errors.hxcode.io/3';

const envelope = (dsn: string) =>
  `${JSON.stringify({ event_id: 'abc', dsn })}\n{"type":"event"}\n{"message":"x"}`;

describe('scrubSensitiveText', () => {
  it('entfernt den Zugangstoken aus Call-, Bestätigungs- und Absage-Links', () => {
    expect(scrubSensitiveText('https://anna.hxroom.de/call/b-1?token=geheim123'))
      .toBe('https://anna.hxroom.de/call/b-1?token=[Filtered]');
    expect(scrubSensitiveText('/confirm/b-1?token=abc&x=1')).toBe('/confirm/b-1?token=[Filtered]&x=1');
    expect(scrubSensitiveText('/events?a=1&token=abc#frag')).toBe('/events?a=1&token=[Filtered]#frag');
  });

  it('entfernt Signatur und Credential signierter Download-Links', () => {
    const url = 'https://s3/x.pdf?X-Amz-Algorithm=AWS4&X-Amz-Credential=AKIA%2F20261002&X-Amz-Signature=deadbeef';
    expect(scrubSensitiveText(url)).toBe(
      'https://s3/x.pdf?X-Amz-Algorithm=AWS4&X-Amz-Credential=[Filtered]&X-Amz-Signature=[Filtered]',
    );
  });

  it('erfasst jeden Parameter, der auf token endet', () => {
    expect(scrubSensitiveText('?access_token=a&X-Amz-Security-Token=b')).toBe(
      '?access_token=[Filtered]&X-Amz-Security-Token=[Filtered]',
    );
  });

  // In einem Umschlag stehen URLs als JSON-Strings – das Anführungszeichen beendet den Wert.
  it('bricht am Ende eines JSON-Strings ab', () => {
    expect(scrubSensitiveText('{"url":"/call/1?token=abc","x":1}')).toBe('{"url":"/call/1?token=[Filtered]","x":1}');
  });

  it('erfasst einen Query-String ohne führendes Fragezeichen', () => {
    expect(scrubSensitiveText('token=abc&week=40')).toBe('token=[Filtered]&week=40');
  });

  it('lässt harmlose Parameter stehen', () => {
    expect(scrubSensitiveText('/bookings?week=2026-W40&debug=1')).toBe('/bookings?week=2026-W40&debug=1');
  });
});

describe('scrubSensitiveData', () => {
  it('bereinigt verschachtelte Strings und lässt das Original unverändert', () => {
    const event = { request: { url: '/call/1?token=abc' }, breadcrumbs: [{ data: { url: '?token=x' } }], level: 'error' };
    const result = scrubSensitiveData(event);
    expect(result.request.url).toBe('/call/1?token=[Filtered]');
    expect(result.breadcrumbs[0].data.url).toBe('?token=[Filtered]');
    expect(event.request.url).toBe('/call/1?token=abc');
  });

  it('übersteht zyklische Strukturen', () => {
    const a: Record<string, unknown> = { url: '?token=x' };
    a.self = a;
    expect(() => scrubSensitiveData(a)).not.toThrow();
  });
});

describe('sanitizeMonitoringEvent', () => {
  it('kürzt den Request auf Methode, URL, Query und User-Agent und entfernt den Benutzer', () => {
    const result = sanitizeMonitoringEvent({
      message: 'x',
      user: { id: 'u-1', email: 'anna@example.com', ip_address: '1.2.3.4' },
      request: {
        method: 'POST',
        url: '/call/1?token=abc',
        query_string: 'token=abc',
        headers: { 'user-agent': 'Firefox', cookie: 'session=geheim', authorization: 'Bearer x' },
        data: '{"notes":"vertraulich"}',
        cookies: { session: 'geheim' },
      } as never,
    });
    expect(result.user).toBeUndefined();
    expect(result.request).toEqual({
      method: 'POST',
      url: '/call/1?token=[Filtered]',
      query_string: 'token=[Filtered]',
      headers: { 'user-agent': 'Firefox' },
    });
  });
});

describe('resolveTunnelTarget', () => {
  const allowed = parseAllowedDsns(`${COACH_DSN}, ${BOOKING_DSN}`);

  it('reicht Umschläge bekannter Projekte an deren Envelope-Adresse weiter', () => {
    expect(resolveTunnelTarget(envelope(COACH_DSN), allowed)).toEqual({
      url: 'https://errors.hxcode.io/api/2/envelope/?sentry_key=51c38b40c50f4d83b6f63fb8e3d7dbce&sentry_version=7',
      projectId: '2',
    });
  });

  it('weist fremde Projekte, fremde Hosts und falsche Schlüssel ab', () => {
    expect(resolveTunnelTarget(envelope('https://51c38b40c50f4d83b6f63fb8e3d7dbce@errors.hxcode.io/9'), allowed)).toBeNull();
    expect(resolveTunnelTarget(envelope('https://51c38b40c50f4d83b6f63fb8e3d7dbce@evil.example/2'), allowed)).toBeNull();
    expect(resolveTunnelTarget(envelope('https://00000000000000000000000000000000@errors.hxcode.io/2'), allowed)).toBeNull();
  });

  it('weist kaputte Umschläge ab', () => {
    expect(resolveTunnelTarget('kein json', allowed)).toBeNull();
    expect(resolveTunnelTarget('{"event_id":"x"}\n{}', allowed)).toBeNull();
    expect(resolveTunnelTarget('null', allowed)).toBeNull();
  });

  it('lässt ohne konfigurierte Liste nichts durch', () => {
    expect(resolveTunnelTarget(envelope(COACH_DSN), parseAllowedDsns(undefined))).toBeNull();
  });
});

describe('MinuteRateLimiter', () => {
  it('lässt je Schlüssel und Minute nur das Limit durch und öffnet nach Ablauf wieder', () => {
    let now = 0;
    const limiter = new MinuteRateLimiter(2, () => now);
    expect([limiter.allow('a'), limiter.allow('a'), limiter.allow('a')]).toEqual([true, true, false]);
    expect(limiter.allow('b')).toBe(true);
    now = 60_000;
    expect(limiter.allow('a')).toBe(true);
  });
});
