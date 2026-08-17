import { describe, expect, it } from 'vitest';
import { resolveAuthHosts } from './auth-hosts';

describe('resolveAuthHosts', () => {
  it('nimmt beide Hosts auf', () => {
    const { allowedHosts } = resolveAuthHosts('https://api.hxroom.de', 'https://admin-api.hxroom.de');
    expect(allowedHosts).toEqual(['api.hxroom.de', 'admin-api.hxroom.de']);
  });

  // Ohne ADMIN_AUTH_URL bleibt das Verhalten wie vor der Trennung.
  it('kommt ohne Admin-Host aus', () => {
    const { allowedHosts } = resolveAuthHosts('https://api.hxroom.de');
    expect(allowedHosts).toEqual(['api.hxroom.de']);
  });

  it('entfernt Duplikate', () => {
    const { allowedHosts } = resolveAuthHosts('https://api.hxroom.de', 'https://api.hxroom.de');
    expect(allowedHosts).toEqual(['api.hxroom.de']);
  });

  it('behält den Port', () => {
    const { allowedHosts } = resolveAuthHosts('http://localhost:3000');
    expect(allowedHosts).toEqual(['localhost:3000']);
  });

  // Der wichtigste Fall: das Protokoll steuert den __Secure-Prefix des Session-Cookies.
  // Eine falsche Ableitung würde jede bestehende Session ungültig machen.
  it('leitet das Protokoll aus der Auth-URL ab', () => {
    expect(resolveAuthHosts('https://api.hxroom.de').protocol).toBe('https');
    expect(resolveAuthHosts('http://api.hxroom.localhost').protocol).toBe('http');
  });

  // Der Admin-Host darf das Protokoll nicht beeinflussen – sonst hinge der Cookie-Name
  // an einer Variable, die für den Coach-Login gar nicht gilt.
  it('ignoriert das Protokoll des Admin-Hosts', () => {
    expect(resolveAuthHosts('https://api.hxroom.de', 'http://admin-api.test').protocol).toBe('https');
  });

  it('fällt auf die Auth-URL zurück', () => {
    expect(resolveAuthHosts('https://api.hxroom.de', 'https://admin-api.hxroom.de').fallback)
      .toBe('https://api.hxroom.de');
  });
});
