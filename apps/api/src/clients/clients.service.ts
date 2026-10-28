import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, gte, inArray, isNotNull, lt, or, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { bookings, clientDeletions, clients, sessionChatFiles, sessionChatMessages, sessionNotes } from '../db/schema';
import { S3Service } from '../storage/s3.service';
import { coachBookingColumns, toCoachBookingResponse } from '../bookings/coach-booking.mapper';
import { HELD_SESSION_STATUSES } from '../bookings/booking.constants';
import { isUniqueViolation } from '../common/pg-errors';
import { normalizeEmail } from './normalize-email';
import type { ClientDetail, ClientFileEntry, ClientListItem, ClientNoteEntry, ClientResponse, CreateClientDto, RichTextDoc, UpdateClientDto } from '@hxroom/shared';

type ClientRow = typeof clients.$inferSelect;

function toClientResponse(row: ClientRow): ClientResponse {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    note: row.note,
    goals: row.goals,
    createdAt: row.createdAt.toISOString(),
  };
}

// Statusliste in bookings/booking.constants.ts, weil die Coach-Liste des Betreibers
// dieselbe Definition braucht (siehe Kommentar dort).
const HELD_SESSION = inArray(bookings.status, [...HELD_SESSION_STATUSES]);

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly s3: S3Service,
  ) {}

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
        goals:     clients.goals,
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
      goals: row.goals,
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
          goals: dto.goals ?? null,
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
          ...(dto.goals !== undefined && { goals: dto.goals ?? null }),
        })
        .where(eq(clients.id, id))
        .returning();

      return toClientResponse(row);
    } catch (err) {
      throw this.translateUniqueViolation(err);
    }
  }

  /**
   * Löscht einen Klienten mit allem, was zu ihm gehört (doc/funktionen/backoffice-coach.md
   * 7.04, Art. 17 DSGVO): Termine samt Notizen, Chat und geteilten Dateien.
   *
   * Termine hängen nur lose am Klienten (`client_id` mit onDelete 'set null') und tragen
   * Name und E-Mail als Kopie; unbestätigte Anfragen haben gar keine `client_id`, weil der
   * Klient erst beim Bestätigen entsteht. Deshalb zählen auch Termine derselben Organisation
   * mit derselben E-Mail-Adresse dazu.
   *
   * Anstehende Termine blockieren die Löschung: Ein Termin, der still verschwindet, ließe
   * den Klienten vor einem leeren Warteraum stehen. Der Coach sagt ihn zuerst ab – dabei
   * bekommt der Klient seine Absage-Mail.
   */
  async delete(organizationId: string, id: string, deletedBy: string): Promise<{ bookingsDeleted: number, filesDeleted: number }> {
    const client = await this.findOwn(organizationId, id);

    const belongsToClient = and(
      eq(bookings.organizationId, organizationId),
      client.email
        ? or(eq(bookings.clientId, id), sql`lower(trim(${bookings.clientEmail})) = ${client.email}`)
        : eq(bookings.clientId, id),
    );

    const [upcoming] = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(belongsToClient, inArray(bookings.status, ['pending', 'confirmed']), gte(bookings.endTime, new Date())))
      .limit(1);
    if (upcoming) {
      throw new ConflictException('Client has upcoming bookings');
    }

    const bookingIds = await this.db.transaction(async (tx) => {
      const deleted = await tx.delete(bookings).where(belongsToClient).returning({ id: bookings.id });
      await tx.delete(clients).where(eq(clients.id, id));
      return deleted.map((b) => b.id);
    });

    // Dateien erst nach dem Commit: Schlüge die Transaktion fehl, verwiesen sonst noch
    // Chatnachrichten auf gelöschte Objekte. Ein Fehler hier hinterlässt nur verwaiste
    // Objekte ohne Bezug in der Datenbank – geloggt wird ohne personenbezogene Daten.
    let filesDeleted = 0;
    for (const bookingId of bookingIds) {
      try {
        filesDeleted += await this.s3.deletePrefix(`${organizationId}/sessions/${bookingId}/`);
      } catch (err) {
        this.logger.error(`Failed to delete files of booking ${bookingId} after client deletion`, err instanceof Error ? err.stack : err);
      }
    }

    await this.db.insert(clientDeletions).values({
      organizationId,
      clientId: id,
      deletedBy,
      bookingsDeleted: bookingIds.length,
      filesDeleted,
    });

    return { bookingsDeleted: bookingIds.length, filesDeleted };
  }

  /**
   * Notizen-Chronik (Funktionsliste 4.02): die Sitzungsnotizen aller Termine dieses Klienten,
   * neueste Sitzung zuerst. Zeilen ohne Inhalt fallen weg; ob ein Dokument wirklich Text trägt,
   * prüft die Oberfläche (leere Absätze speichert der Editor gar nicht erst).
   */
  async notes(organizationId: string, id: string): Promise<ClientNoteEntry[]> {
    await this.findOwn(organizationId, id);
    const rows = await this.db
      .select({
        bookingId: bookings.id,
        start:     bookings.startTime,
        end:       bookings.endTime,
        offerName: bookings.offerName,
        status:    bookings.status,
        content:   sessionNotes.content,
        updatedAt: sessionNotes.updatedAt,
      })
      .from(sessionNotes)
      .innerJoin(bookings, eq(bookings.id, sessionNotes.bookingId))
      .where(and(
        eq(bookings.clientId, id),
        eq(bookings.organizationId, organizationId),
        isNotNull(sessionNotes.content),
      ))
      .orderBy(desc(bookings.startTime));

    return rows.map((row) => ({
      bookingId: row.bookingId,
      start:     row.start.toISOString(),
      end:       row.end.toISOString(),
      offerName: row.offerName,
      status:    row.status,
      content:   row.content as RichTextDoc,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  /** Alle im Chat geteilten Dateien dieses Klienten über alle Sitzungen, neueste zuerst. */
  async files(organizationId: string, id: string): Promise<ClientFileEntry[]> {
    await this.findOwn(organizationId, id);
    const rows = await this.db
      .select({
        id:           sessionChatFiles.id,
        bookingId:    sessionChatFiles.bookingId,
        bookingStart: bookings.startTime,
        fileName:     sessionChatFiles.fileName,
        mimeType:     sessionChatFiles.mimeType,
        sizeBytes:    sessionChatFiles.sizeBytes,
        sender:       sessionChatMessages.sender,
        createdAt:    sessionChatFiles.createdAt,
      })
      .from(sessionChatFiles)
      .innerJoin(sessionChatMessages, eq(sessionChatMessages.id, sessionChatFiles.messageId))
      .innerJoin(bookings, eq(bookings.id, sessionChatFiles.bookingId))
      .where(and(eq(bookings.clientId, id), eq(bookings.organizationId, organizationId)))
      .orderBy(desc(sessionChatFiles.createdAt));

    return rows.map((row) => ({
      ...row,
      bookingStart: row.bookingStart.toISOString(),
      createdAt:    row.createdAt.toISOString(),
    }));
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
