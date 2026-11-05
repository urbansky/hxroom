import { describe, expect, it, vi } from 'vitest';
import { AppLogger, logLevelsFrom } from './app-logger';
import { currentRequestContext, runWithRequestContext, setRequestActor } from './request-context';
import { loggablePath } from './request-logging';

describe('logLevelsFrom', () => {
  it('enables the given level and everything more severe', () => {
    expect(logLevelsFrom('warn', true)).toEqual(['warn', 'error', 'fatal']);
    expect(logLevelsFrom('verbose', true)).toEqual(['verbose', 'debug', 'log', 'warn', 'error', 'fatal']);
  });

  it('defaults to log in production and debug elsewhere', () => {
    expect(logLevelsFrom(undefined, true)).toEqual(['log', 'warn', 'error', 'fatal']);
    expect(logLevelsFrom(undefined, false)).toEqual(['debug', 'log', 'warn', 'error', 'fatal']);
  });

  it('falls back to the default for unknown values and ignores case', () => {
    expect(logLevelsFrom('chatty', true)).toEqual(['log', 'warn', 'error', 'fatal']);
    expect(logLevelsFrom(' DEBUG ', true)).toEqual(['debug', 'log', 'warn', 'error', 'fatal']);
  });
});

describe('loggablePath', () => {
  it('drops query string and fragment, where access links carry their token', () => {
    expect(loggablePath('/api/v1/bookings/b1/confirm?token=secret')).toBe('/api/v1/bookings/b1/confirm');
    expect(loggablePath('/api/auth/verify-email?token=abc&callbackURL=x#top')).toBe('/api/auth/verify-email');
  });

  it('filters the token better-auth puts into the reset-password path', () => {
    expect(loggablePath('/api/auth/reset-password/abcDEF123?callbackURL=x')).toBe('/api/auth/reset-password/[Filtered]');
  });

  it('leaves ordinary paths alone', () => {
    expect(loggablePath('/api/v1/bookings/b1/call/files/f1')).toBe('/api/v1/bookings/b1/call/files/f1');
  });
});

describe('request context', () => {
  it('adds the actor to the running request and ignores empty values', () => {
    runWithRequestContext({ requestId: 'r1' }, () => {
      setRequestActor({ userId: 'u1', organizationId: undefined, impersonatedBy: null });
      expect(currentRequestContext()).toEqual({ requestId: 'r1', userId: 'u1' });
    });
  });

  it('does nothing outside a request', () => {
    expect(() => setRequestActor({ userId: 'u1' })).not.toThrow();
    expect(currentRequestContext()).toBeUndefined();
  });

  it('survives awaits inside the request', async () => {
    await runWithRequestContext({ requestId: 'r2' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      setRequestActor({ organizationId: 'o1' });
      await Promise.resolve();
      expect(currentRequestContext()).toEqual({ requestId: 'r2', organizationId: 'o1' });
    });
  });
});

describe('AppLogger', () => {
  function capture(run: (logger: AppLogger) => void): Record<string, unknown> {
    const write = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    try {
      run(new AppLogger({ json: true, flattenParams: true }));
      return JSON.parse(String(write.mock.calls[0][0]));
    } finally {
      write.mockRestore();
    }
  }

  it('adds the request fields to every line inside a request', () => {
    const line = capture((logger) =>
      runWithRequestContext({ requestId: 'r1', userId: 'u1', organizationId: 'o1' }, () =>
        logger.log('Booking requested', { bookingId: 'b1' }, 'Bookings'),
      ),
    );
    expect(line).toMatchObject({
      level: 'log',
      message: 'Booking requested',
      context: 'Bookings',
      requestId: 'r1',
      userId: 'u1',
      organizationId: 'o1',
      bookingId: 'b1',
    });
  });

  it('logs without request fields outside a request', () => {
    const line = capture((logger) => logger.log('Expired 2 unconfirmed booking(s)', 'BookingExpiry'));
    expect(line).toMatchObject({ message: 'Expired 2 unconfirmed booking(s)', context: 'BookingExpiry' });
    expect(line).not.toHaveProperty('requestId');
  });
});
