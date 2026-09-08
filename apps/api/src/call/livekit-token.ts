import type { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';
import type { CallRole } from './call-access';

// Ausgabe der LiveKit-Access-Tokens (doc/videocall-umsetzungsplan.md B2, §8).
//
// Reine Funktionen mit dem ConfigService als Parameter, wie booking-urls.ts: Der Aufbau
// eines Tokens ist keine Zuständigkeit, die eine eigene Klasse rechtfertigt, und so bleibt
// er ohne Nest-DI testbar. Wer den Token bekommen darf, entscheidet mayJoinRoom in
// call-access.ts – hier steht nur, wie er aussieht.

/**
 * Laufzeit des Tokens. Nicht zu verwechseln mit dem Zugangsfenster aus §7: Diese Frist
 * begrenzt allein das Zeitfenster, in dem der Token zum *Verbinden* taugt, nicht die
 * Dauer des Gesprächs – eine bestehende Verbindung bleibt darüber hinaus bestehen.
 * Zehn Minuten reichen deshalb und halten einen abgefangenen Token kurz gültig.
 */
const TOKEN_TTL = '10m';

/**
 * Der Raum einer Sitzung. Deterministisch aus der Booking-ID, damit Coach und Klient
 * denselben treffen, ohne ihn irgendwo abzulegen.
 *
 * Er ist damit ratbar und **keine** Sicherheitsgrenze (§8) – die liegt allein in der
 * Zugangsprüfung des CallService.
 */
export function callRoomName(bookingId: string): string {
  return `session_${bookingId}`;
}

/**
 * Die Teilnehmer-Identität. Muss im Raum eindeutig sein: Verbinden sich zwei Clients mit
 * derselben, trennt LiveKit den ersten mit DUPLICATE_IDENTITY.
 *
 * Beim Coach die userId und nicht die organizationId – im späteren Studio-Plan teilen
 * sich mehrere Coachs eine Organisation, und zwei von ihnen würden einander aus dem Raum
 * werfen. Beim Klienten die bookingId: Er hat kein Konto, und mehr als eine Identität
 * braucht er pro Sitzung nicht.
 */
export function callIdentity(role: CallRole, id: string): string {
  return role === 'coach' ? `coach_${id}` : `client_${id}`;
}

/** Die URL, die der Browser für die Verbindung braucht – lokal ws://, im Betrieb wss://. */
export function livekitUrl(config: ConfigService): string {
  return config.getOrThrow<string>('LIVEKIT_URL');
}

export async function createCallToken(
  config: ConfigService,
  args: { room: string; identity: string; displayName: string },
): Promise<string> {
  const token = new AccessToken(
    config.getOrThrow<string>('LIVEKIT_API_KEY'),
    config.getOrThrow<string>('LIVEKIT_API_SECRET'),
    { identity: args.identity, name: args.displayName, ttl: TOKEN_TTL },
  );

  token.addGrant({
    room: args.room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    // Für die Signale *während* der Sitzung – etwa "Coach beendet die Sitzung" (B6).
    // Gleich mitgegeben, weil ein Nachrüsten die Token-Ausgabe erneut anfassen müsste.
    canPublishData: true,
  });

  // Kein roomCreate: Den Raum legt LiveKit beim ersten Join selbst an (room_auto_create).
  // roomCreate wäre ein Admin-Grant für die RoomService-API und gehört nicht in ein Token,
  // das an den Browser geht.
  return token.toJwt();
}
