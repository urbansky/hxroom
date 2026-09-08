import { describe, expect, it } from 'vitest';
import type { ConfigService } from '@nestjs/config';
import { callIdentity, callRoomName, createCallToken, livekitUrl } from './livekit-token';

const CONFIG = {
  LIVEKIT_URL: 'ws://livekit.hxroom.localhost',
  LIVEKIT_API_KEY: 'hxroom_test',
  LIVEKIT_API_SECRET: 'test_secret_with_at_least_32_characters',
};

// Reicht für reine Funktionen, die nur lesen – ein Testing-Modul aufzubauen brächte hier
// nichts als Laufzeit.
const config = {
  getOrThrow: (key: keyof typeof CONFIG) => CONFIG[key],
} as unknown as ConfigService;

// Der Payload interessiert uns, nicht die Signatur: Ob LiveKit den Token akzeptiert, sagt
// ohnehin nur der echte Server (siehe Abnahme in doc/videocall-umsetzungsplan.md B2).
function payload(jwt: string): Record<string, any> {
  return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
}

describe('callRoomName', () => {
  it('leitet den Raum deterministisch aus der Booking-ID ab', () => {
    expect(callRoomName('abc-123')).toBe('session_abc-123');
  });
});

describe('callIdentity', () => {
  // Rollengetrennt, damit sich Coach und Klient nicht gegenseitig mit DUPLICATE_IDENTITY
  // aus dem Raum werfen können.
  it('trennt Coach und Klient', () => {
    expect(callIdentity('coach', 'user-1')).toBe('coach_user-1');
    expect(callIdentity('client', 'booking-1')).toBe('client_booking-1');
  });
});

describe('createCallToken', () => {
  const args = { room: 'session_b1', identity: 'coach_user-1', displayName: 'Anna Bergmann' };

  it('trägt Identität, Anzeigename und Raum', async () => {
    const claims = payload(await createCallToken(config, args));

    expect(claims.sub).toBe('coach_user-1');
    expect(claims.name).toBe('Anna Bergmann');
    expect(claims.video.room).toBe('session_b1');
    expect(claims.video.roomJoin).toBe(true);
  });

  it('erlaubt Senden, Empfangen und den Data-Channel', async () => {
    const claims = payload(await createCallToken(config, args));

    expect(claims.video.canPublish).toBe(true);
    expect(claims.video.canSubscribe).toBe(true);
    // Für "Coach beendet die Sitzung" in B6.
    expect(claims.video.canPublishData).toBe(true);
  });

  // roomCreate wäre ein Admin-Grant für die RoomService-API. Den Raum legt LiveKit beim
  // ersten Join selbst an – in einem Token, das an den Browser geht, hat er nichts zu
  // suchen.
  it('vergibt keine Administrationsrechte', async () => {
    const claims = payload(await createCallToken(config, args));

    expect(claims.video.roomCreate).toBeFalsy();
    expect(claims.video.roomAdmin).toBeFalsy();
    expect(claims.video.roomList).toBeFalsy();
  });

  // Zehn Minuten begrenzen nur das Fenster zum Verbinden, nicht die Gesprächsdauer
  // (technisches-konzept.md §8). Das SDK setzt nbf statt iat – die TTL liegt zwischen
  // diesen beiden.
  it('läuft nach zehn Minuten ab', async () => {
    const claims = payload(await createCallToken(config, args));

    expect(claims.exp - claims.nbf).toBe(600);
  });

  it('ist auf den Schlüssel der Umgebung ausgestellt', async () => {
    const claims = payload(await createCallToken(config, args));

    expect(claims.iss).toBe('hxroom_test');
  });
});

describe('livekitUrl', () => {
  // Geht mit der Antwort an den Browser, weil sie sich zwischen lokal und Betrieb
  // unterscheidet – eine zweite Konstante im Frontend liefe auseinander.
  it('kommt aus der Umgebung', () => {
    expect(livekitUrl(config)).toBe('ws://livekit.hxroom.localhost');
  });
});
