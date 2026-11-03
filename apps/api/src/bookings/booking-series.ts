import { and, eq, inArray, ne } from 'drizzle-orm';
import type { CoachBookingResponse } from '@hxroom/shared';
import type { DrizzleDb } from '../db/db.module';
import { bookings } from '../db/schema';
import { toCoachBookingResponse, type CoachBookingRow } from './coach-booking.mapper';

type SeriesMember = { id: string; seriesId: string; startTime: Date };

/**
 * „Termin 2 von 5“ (doc/konzept-manuelle-termine.md §5): Stelle jedes Termins in seiner
 * Serie, gezählt über die nicht abgesagten Termine in zeitlicher Folge. Eine abgesagte
 * Sitzung zählt nicht mit – sonst bliebe „Termin 3 von 5“ stehen, obwohl nur noch vier
 * stattfinden.
 *
 * Reine Funktion, damit Zählung und Reihenfolge ohne Datenbank testbar sind.
 */
export function seriesPositions(members: SeriesMember[]): Map<string, { position: number; count: number }> {
  const bySeries = new Map<string, SeriesMember[]>();
  for (const member of members) {
    const list = bySeries.get(member.seriesId) ?? [];
    list.push(member);
    bySeries.set(member.seriesId, list);
  }

  const positions = new Map<string, { position: number; count: number }>();
  for (const list of bySeries.values()) {
    list.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    list.forEach((member, index) => positions.set(member.id, { position: index + 1, count: list.length }));
  }
  return positions;
}

/**
 * Wandelt Buchungszeilen in die Coach-Antwort um, samt Stelle in der Serie. Lädt dafür
 * die übrigen Termine aller beteiligten Serien in einer Abfrage nach – nur, wenn überhaupt
 * eine Zeile zu einer Serie gehört.
 */
export async function withSeries(db: DrizzleDb, organizationId: string, rows: CoachBookingRow[]): Promise<CoachBookingResponse[]> {
  const seriesIds = [...new Set(rows.map((row) => row.seriesId).filter((id): id is string => id !== null))];
  if (!seriesIds.length) return rows.map((row) => toCoachBookingResponse(row));

  const members = await db
    .select({ id: bookings.id, seriesId: bookings.seriesId, startTime: bookings.startTime })
    .from(bookings)
    .where(and(
      eq(bookings.organizationId, organizationId),
      inArray(bookings.seriesId, seriesIds),
      ne(bookings.status, 'cancelled'),
    ));

  const positions = seriesPositions(members as SeriesMember[]);
  return rows.map((row) => toCoachBookingResponse(row, positions.get(row.id) ?? null));
}
