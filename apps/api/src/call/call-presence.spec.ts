import { describe, expect, it } from 'vitest';
import { presenceChange } from './call-presence';
import { bookingIdFromRoomName, callIdentity, callRoomName, roleFromIdentity } from './livekit-token';

const room = { name: callRoomName('booking-1') };
const coach = { identity: callIdentity('coach', 'user-1') };
const client = { identity: callIdentity('client', 'booking-1') };

describe('Raumname und Identität – der Rückweg der Webhooks', () => {
  it('liest die Buchung aus dem Raumnamen', () => {
    expect(bookingIdFromRoomName(callRoomName('abc-123'))).toBe('abc-123');
  });

  it('ignoriert Räume, die nicht von HxRoom stammen', () => {
    expect(bookingIdFromRoomName('lk-testraum')).toBeNull();
    expect(bookingIdFromRoomName('session_')).toBeNull();
    expect(bookingIdFromRoomName(undefined)).toBeNull();
  });

  it('erkennt die Rolle an der Identität', () => {
    expect(roleFromIdentity(coach.identity)).toBe('coach');
    expect(roleFromIdentity(client.identity)).toBe('client');
    expect(roleFromIdentity('lk-cli-publisher')).toBeNull();
  });
});

describe('presenceChange – was ein Webhook für die Sitzung bedeutet', () => {
  it('Coach verlässt den Raum: Die Nachfrist beginnt', () => {
    expect(presenceChange({ event: 'participant_left', room, participant: coach }))
      .toEqual({ bookingId: 'booking-1', change: 'coach-left' });
  });

  it('Coach kommt (wieder): Die Nachfrist ist hinfällig', () => {
    expect(presenceChange({ event: 'participant_joined', room, participant: coach }))
      .toEqual({ bookingId: 'booking-1', change: 'coach-joined' });
  });

  // Der Klient kann über seinen Link zurück; das Ende ist Sache des Coachs.
  it('Klient geht oder kommt: bedeutet nichts', () => {
    expect(presenceChange({ event: 'participant_left', room, participant: client })).toBeNull();
    expect(presenceChange({ event: 'participant_joined', room, participant: client })).toBeNull();
  });

  it('Raum geschlossen: Rückfallebene für ein verlorenes „Coach ist weg"', () => {
    expect(presenceChange({ event: 'room_finished', room }))
      .toEqual({ bookingId: 'booking-1', change: 'room-finished' });
  });

  it('andere Ereignisse und fremde Räume: nichts', () => {
    expect(presenceChange({ event: 'track_published', room, participant: coach })).toBeNull();
    expect(presenceChange({ event: 'room_started', room })).toBeNull();
    expect(presenceChange({ event: 'participant_left', room: { name: 'lk-test' }, participant: coach })).toBeNull();
  });
});
