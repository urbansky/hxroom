import { describe, expect, it } from 'vitest';
import { describeAuthEvent } from './auth-events';

const apiError = (code: string, statusCode = 401) => ({ statusCode, status: 'UNAUTHORIZED', body: { code, message: 'x' } });

describe('describeAuthEvent', () => {
  it('logs a successful sign-in with the user id', () => {
    expect(describeAuthEvent({ path: '/sign-in/email', returned: { user: { id: 'u1' } }, newSessionUserId: 'u1' }))
      .toEqual({ level: 'log', message: 'Sign-in', fields: { userId: 'u1' } });
  });

  it('logs a failed sign-in with the error code, never the submitted email', () => {
    const event = describeAuthEvent({
      path: '/sign-in/email',
      returned: apiError('INVALID_EMAIL_OR_PASSWORD'),
      body: { email: 'jane@example.com', password: 'secret' },
    });
    expect(event).toEqual({ level: 'warn', message: 'Sign-in failed', fields: { code: 'INVALID_EMAIL_OR_PASSWORD' } });
    expect(JSON.stringify(event)).not.toContain('example.com');
  });

  it('logs sign-up with the id of the new user', () => {
    expect(describeAuthEvent({ path: '/sign-up/email', returned: { token: null, user: { id: 'u2', email: 'a@b.de' } } }))
      .toEqual({ level: 'log', message: 'Sign-up', fields: { userId: 'u2' } });
  });

  it('logs impersonation start and stop with operator and coach', () => {
    expect(describeAuthEvent({
      path: '/admin/impersonate-user',
      returned: { session: {}, user: { id: 'coach1' } },
      sessionUserId: 'op1',
      body: { userId: 'coach1' },
    })).toEqual({ level: 'log', message: 'Impersonation started', fields: { operatorId: 'op1', targetUserId: 'coach1' } });

    expect(describeAuthEvent({
      path: '/admin/stop-impersonating',
      returned: { session: {}, user: { id: 'op1' } },
      sessionUserId: 'coach1',
      impersonatedBy: 'op1',
    })).toEqual({ level: 'log', message: 'Impersonation stopped', fields: { operatorId: 'op1', targetUserId: 'coach1' } });
  });

  it('logs operator actions with the target, the role for set-role, but not the ban reason', () => {
    expect(describeAuthEvent({
      path: '/admin/ban-user',
      returned: { user: {} },
      sessionUserId: 'op1',
      body: { userId: 'coach1', banReason: 'Beschwerde von Frau Müller' },
    })).toEqual({ level: 'log', message: 'Operator action', fields: { action: 'ban-user', operatorId: 'op1', targetUserId: 'coach1' } });

    expect(describeAuthEvent({
      path: '/admin/set-role',
      returned: { user: {} },
      sessionUserId: 'op1',
      body: { userId: 'coach1', role: 'admin' },
    })?.fields).toEqual({ action: 'set-role', operatorId: 'op1', targetUserId: 'coach1', role: 'admin' });
  });

  it('logs failed operator actions as warnings', () => {
    expect(describeAuthEvent({
      path: '/admin/remove-user',
      returned: apiError('FORBIDDEN', 403),
      sessionUserId: 'op1',
      body: { userId: 'coach1' },
    })).toEqual({
      level: 'warn',
      message: 'Operator action failed',
      fields: { action: 'remove-user', operatorId: 'op1', targetUserId: 'coach1', code: 'FORBIDDEN' },
    });
  });

  it('logs password and email changes', () => {
    expect(describeAuthEvent({ path: '/request-password-reset', returned: { status: true } }))
      .toEqual({ level: 'log', message: 'Password reset requested', fields: {} });
    expect(describeAuthEvent({ path: '/change-password', returned: { token: 't' }, sessionUserId: 'u1' }))
      .toEqual({ level: 'log', message: 'Password changed', fields: { userId: 'u1' } });
    expect(describeAuthEvent({ path: '/reset-password', returned: apiError('INVALID_TOKEN', 400) }))
      .toEqual({ level: 'warn', message: 'Password reset failed', fields: { code: 'INVALID_TOKEN' } });
  });

  it('ignores routine calls such as get-session', () => {
    expect(describeAuthEvent({ path: '/get-session', returned: { session: {}, user: { id: 'u1' } } })).toBeNull();
    expect(describeAuthEvent({ path: '/admin/list-users', returned: { users: [] }, sessionUserId: 'op1' })).toBeNull();
  });
});
