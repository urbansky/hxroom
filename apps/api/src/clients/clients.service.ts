import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { bookings, clients } from '../db/schema';
import { coachBookingColumns, toCoachBookingResponse } from '../bookings/coach-booking.mapper';
import { isUniqueViolation } from '../common/pg-errors';
import { normalizeEmail } from './normalize-email';
import type { ClientDetail, ClientListItem, ClientResponse, CreateClientDto, UpdateClientDto } from '@hxroom/shared';

type ClientRow = typeof clients.$inferSelect;

function toClientResponse(row: ClientRow): ClientResponse {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

// Eine Sitzung zählt als gehalten, wenn sie bestätigt (oder abgeschlossen) ist.
// Abgesagte und nie bestätigte Termine bleiben außen vor – sie haben nicht
// stattgefunden und würden die Zahl im Klientenprofil verfälschen.
const HELD_SESSION = inArray(bookings.status, ['confirmed', 'completed']);

@Injectable()
export class ClientsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /**
   * Klientenliste mit den Kennzahlen aus Funktion 01 (doc/funktionen/backoffice-coach.md):
   * Anzahl gehaltener Sitzungen, letzte und nächste Sitzung.
   *
   * Bewusst eine einzige Query mit FILTER-Aggregaten statt einer Zusatzabfrage pro
   * Klient – drei Kennzahlen mal N Klienten wären sonst 3N Roundtrips.
   */
  async list(organizationId: string): Promise<ClientListItem[]> {
    const now = new Date();
    // Als Drizzle-Bedingungen statt als rohes SQL formuliert: nur so werden die
    // Zeitpunkte korrekt als Parameter kodiert – ein `${now}` direkt im sql-Template
    // landet unkodiert beim Treiber und lässt die Query fehlschlagen.
    const heldPast = and(HELD_SESSION, lt(bookings.startTime, now));
    const upcoming = and(eq(bookings.status, 'confirmed'), gte(bookings.startTime, now));

    const rows = await this.db
      .select({
        id:        clients.id,
        name:      clients.name,
        email:     clients.email,
        phone:     clients.phone,
        note:      clients.note,
        createdAt: clients.createdAt,
        // .as() ist notwendig, damit die Ausdrücke im SQL überhaupt einen Namen
        // bekommen – ohne Alias kann das ORDER BY unten sie nicht referenzieren.
        // .mapWith(...) hängt den Decoder der jeweiligen Spalte an: rohe
        // sql-Ausdrücke haben keinen, die Werte kämen sonst als String bzw. als
        // bigint-String statt als Date bzw. number zurück.
        sessionCount:  sql<number>`count(${bookings.id}) filter (where ${heldPast})`.mapWith(Number).as('sessionCount'),
        lastSessionAt: sql<Date | null>`max(${bookings.startTime}) filter (where ${heldPast})`.mapWith(bookings.startTime).as('lastSessionAt'),
        nextSessionAt: sql<Date | null>`min(${bookings.startTime}) filter (where ${upcoming})`.mapWith(bookings.startTime).as('nextSessionAt'),
      })
      .from(clients)
      .leftJoin(bookings, eq(bookings.clientId, clients.id))
      .where(eq(clients.organizationId, organizationId))
      // clients.id ist Primärschlüssel – Postgres erlaubt die übrigen clients-Spalten
      // dank funktionaler Abhängigkeit ohne eigene Gruppierung.
      .groupBy(clients.id)
      // ORDER BY referenziert die Ausgabespalten-Aliase (Postgres-Feature), sonst
      // müssten die drei Aggregat-Ausdrücke hier wortgleich wiederholt werden.
      // Reihenfolge: wer als Nächstes ansteht zuerst, danach zuletzt gesehene Klienten.
      .orderBy(
        sql`"nextSessionAt" asc nulls last`,
        sql`"lastSessionAt" desc nulls last`,
        asc(clients.name),
      );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
      sessionCount: row.sessionCount,
      lastSessionAt: row.lastSessionAt?.toISOString() ?? null,
      nextSessionAt: row.nextSessionAt?.toISOString() ?? null,
    }));
  }

  /** Klientenprofil (Funktion 02) mit vollständiger Sitzungshistorie, neueste zuerst. */
  async findOne(organizationId: string, id: string): Promise<ClientDetail> {
    const client = await this.findOwn(organizationId, id);

    const history = await this.db
      .select(coachBookingColumns)
      .from(bookings)
      .where(and(eq(bookings.clientId, id), eq(bookings.organizationId, organizationId)))
      .orderBy(desc(bookings.startTime));

    return { ...toClientResponse(client), bookings: history.map(toCoachBookingResponse) };
  }

  /**
   * Manuelle Anlage (Funktion 03) – für Bestandsklienten aus anderen Systemen, ohne
   * dass der Klient vorher online gebucht hat.
   */
  async create(organizationId: string, dto: CreateClientDto): Promise<ClientResponse> {
    try {
      const [row] = await this.db
        .insert(clients)
        .values({
          organizationId,
          name: dto.name,
          email: normalizeEmail(dto.email),
          phone: dto.phone ?? null,
          note: dto.note ?? null,
        })
        .returning();

      return toClientResponse(row);
    } catch (err) {
      throw this.translateUniqueViolation(err);
    }
  }

  async update(organizationId: string, id: string, dto: UpdateClientDto): Promise<ClientResponse> {
    await this.findOwn(organizationId, id);

    try {
      const [row] = await this.db
        .update(clients)
        .set({
          ...(dto.name !== undefined && { name: dto.name }),
          ...(dto.email !== undefined && { email: normalizeEmail(dto.email) }),
          ...(dto.phone !== undefined && { phone: dto.phone ?? null }),
          ...(dto.note !== undefined && { note: dto.note ?? null }),
        })
        .where(eq(clients.id, id))
        .returning();

      return toClientResponse(row);
    } catch (err) {
      throw this.translateUniqueViolation(err);
    }
  }

  // Ownership über die organizationId: ein fremder Klient ist für diesen Coach schlicht
  // nicht vorhanden – 404 statt 403, damit die Existenz nicht durchsickert (gleiches
  // Muster wie CoachBookingsService.findOwn).
  private async findOwn(organizationId: string, id: string): Promise<ClientRow> {
    const [row] = await this.db
      .select()
      .from(clients)
      .where(and(eq(clients.id, id), eq(clients.organizationId, organizationId)))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Client not found');
    }

    return row;
  }

  // Der Unique-Constraint (organizationId, email) ist die eigentliche Absicherung des
  // Matching-Schlüssels. Ohne diese Übersetzung käme beim Coach ein 500 an, obwohl der
  // Fall fachlich erwartbar ist: er legt einen Klienten an, den es schon gibt.
  private translateUniqueViolation(err: unknown): unknown {
    if (isUniqueViolation(err)) {
      return new ConflictException('A client with this email already exists');
    }
    return err;
  }
}
