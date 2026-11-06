import { BadRequestException, ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, randomUUID } from 'crypto';
import { and, asc, desc, eq, gt, gte, inArray, lt, lte, ne, type SQL } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { availabilitySettings, availabilitySlots, bookings, clients, offers } from '../db/schema';
import { OrganizationService } from '../organization/organization.service';
import { MailService } from '../mail/mail.service';
import { buildBookingIcs, buildBookingsIcs } from '../mail/ics';
import { isUniqueViolation } from '../common/pg-errors';
import { AD_HOC_DURATION_MINUTES, AD_HOC_OFFER_NAME, MANUAL_OFFER_NAME, TEST_SESSION_DURATION_MINUTES, TEST_SESSION_NAME, canMarkNoShow } from './booking.constants';
import { renderBookingCancelledEmail } from '../mail/templates/client/booking-cancelled';
import { renderSessionInvitationEmail } from '../mail/templates/client/session-invitation';
import { renderAppointmentScheduledEmail } from '../mail/templates/client/appointment-scheduled';
import { greetingName, toAppointmentInfo } from './booking-formatting';
import { normalizeEmail } from '../clients/normalize-email';
import { buildBookingPageUrl, buildCallUrl, buildCancelUrl, buildLegalLinks } from './booking-urls';
import { coachBookingColumns, toCoachBookingResponse, type CoachBookingRow } from './coach-booking.mapper';
import { withSeries } from './booking-series';
import { isWithinAvailability } from '../availability/slot-calculation';
import { AvailabilityExceptionsService } from '../availability/availability-exceptions.service';
import { CallEventsService } from '../call/call-events.service';
import { CALL_OPENS_MINUTES_BEFORE_START } from '@hxroom/shared';
import type { AdHocBookingResponse, AssignBookingClientDto, CancelBookingDto, CheckManualBookingDto, CoachBookingResponse, CreateAdHocBookingDto, CreateManualBookingDto, ListCoachBookingsQuery, ManualBookingCheckResponse, ManualBookingResponse } from '@hxroom/shared';

/**
 * Coach-seitiger Zugriff auf die eigenen Buchungen (Kalender im Backoffice).
 * Bewusst getrennt von BookingsService, der den Klienten-Lifecycle (Buchen, Bestätigen)
 * abbildet – hier geht es ausschließlich um die authentifizierte Sicht des Coachs.
 */
@Injectable()
export class CoachBookingsService {
  private readonly logger = new Logger(CoachBookingsService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly organizationService: OrganizationService,
    private readonly mailService: MailService,
    private readonly config: ConfigService,
    private readonly callEvents: CallEventsService,
    private readonly exceptionsService: AvailabilityExceptionsService,
  ) {}

  // `from`/`to` begrenzen den Beginn, nicht das Ende – ob ein Termin schon vorbei ist,
  // entscheidet die Oberfläche (pages/bookings/index.vue).
  async list(organizationId: string, query: ListCoachBookingsQuery): Promise<CoachBookingResponse[]> {
    const filters: SQL[] = [eq(bookings.organizationId, organizationId)];
    if (query.from) filters.push(gte(bookings.startTime, new Date(query.from)));
    if (query.to) filters.push(lte(bookings.startTime, new Date(query.to)));
    if (query.status) filters.push(inArray(bookings.status, query.status));
    if (query.origin) filters.push(inArray(bookings.origin, query.origin));

    const rows = await this.db
      .select(coachBookingColumns)
      .from(bookings)
      .where(and(...filters))
      .orderBy(query.order === 'desc' ? desc(bookings.startTime) : asc(bookings.startTime))
      .limit(query.limit);

    return withSeries(this.db, organizationId, rows);
  }

  /** Ein Termin für die Terminseite (technisches-konzept.md §5, „Terminseite“). */
  async findOne(organizationId: string, bookingId: string): Promise<CoachBookingResponse> {
    return this.respond(organizationId, await this.findOwn(organizationId, bookingId));
  }

  async cancel(organizationId: string, bookingId: string, dto: CancelBookingDto): Promise<CoachBookingResponse> {
    const booking = await this.findOwn(organizationId, bookingId);

    if (booking.status === 'cancelled') {
      throw new ConflictException('Booking is already cancelled');
    }

    const [cancelled] = await this.db
      .update(bookings)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: 'coach',
        cancellationReason: dto.reason ?? null,
      })
      .where(eq(bookings.id, bookingId))
      .returning(coachBookingColumns);
    this.logger.log('Booking cancelled by coach', { bookingId, origin: cancelled.origin });

    // Sitzt der Klient in diesem Moment im Warteraum, soll er die Absage sofort sehen und
    // nicht auf einen Coach warten, der nicht mehr kommt (A2). Die anderen Wege in den
    // Status 'cancelled' brauchen das nicht: Bei der Selbstabsage ist der Klient selbst der
    // Handelnde, der Verfall-Cron trifft nur nie bestätigte Buchungen, und die
    // Kontolöschung hat dreißig Tage Vorlauf.
    this.callEvents.notifyChanged(bookingId);

    // Wie beim übrigen Mailversand: nach dem Update, in try/catch. Die Absage steht
    // bereits in der DB und der Slot ist frei – ein Mail-Fehler darf daran nichts ändern.
    // Bei einer Probe-Sitzung ist der Coach selbst der Klient: keine Mail an sich selbst.
    if (cancelled.origin !== 'test') {
      try {
        await this.sendCancellationMail(organizationId, cancelled, dto.reason);
      } catch (err) {
        this.logger.error(`Failed to send cancellation email for booking ${bookingId}`, err instanceof Error ? err.stack : err);
      }
    }

    return toCoachBookingResponse(cancelled);
  }

  /**
   * Vermerkt, dass der Klient nicht erschienen ist (B6). Aus dem Warteraum des Calls oder
   * aus dem Termin-Detail – viele Coachs öffnen den Call gar nicht erst, wenn niemand kommt.
   *
   * Unter der Sperre der Buchungszeile, wie der Einlass (CallService.transition): Lässt der
   * Coach in einem zweiten Tab gerade ein, darf der Vermerk ihn nicht überholen – und
   * umgekehrt. Kein Mailversand: Der Vermerk ist ein Eintrag für den Coach, keine Nachricht
   * an den Klienten. Öffnet der Klient den Link doch noch, sieht er einen neutralen Satz.
   */
  async markNoShow(organizationId: string, bookingId: string): Promise<CoachBookingResponse> {
    const row = await this.db.transaction(async (tx) => {
      const [booking] = await tx
        .select()
        .from(bookings)
        .where(and(eq(bookings.id, bookingId), eq(bookings.organizationId, organizationId)))
        .for('update');

      if (!booking) throw new NotFoundException('Booking not found');
      if (!canMarkNoShow(booking, new Date())) {
        throw new ConflictException('Booking cannot be marked as no-show');
      }

      const [updated] = await tx
        .update(bookings)
        .set({ status: 'no_show' })
        .where(eq(bookings.id, bookingId))
        .returning(coachBookingColumns);
      return updated;
    });
    this.logger.log('Booking marked as no-show', { bookingId });

    // Sitzt der Klient doch im Warteraum, verlässt er ihn mit dem passenden Hinweis.
    this.callEvents.notifyChanged(bookingId);
    return this.respond(organizationId, row);
  }

  /** „Doch erschienen": Der Vermerk war ein Versehen. Der Termin zählt wieder als gehalten. */
  async undoNoShow(organizationId: string, bookingId: string): Promise<CoachBookingResponse> {
    const booking = await this.findOwn(organizationId, bookingId);
    if (booking.status !== 'no_show') {
      throw new ConflictException('Booking is not marked as no-show');
    }

    const [updated] = await this.db
      .update(bookings)
      .set({ status: 'confirmed' })
      .where(and(eq(bookings.id, bookingId), eq(bookings.status, 'no_show')))
      .returning(coachBookingColumns);
    this.logger.log('No-show mark removed', { bookingId });

    this.callEvents.notifyChanged(bookingId);
    return this.respond(organizationId, updated);
  }

  /**
   * Ordnet eine Buchung manuell einem Klienten zu (doc/technik/technisches-konzept.md §11,
   * „Klienten-Matching“). Korrigiert ein falsches automatisches
   * E-Mail-Matching und verknüpft manuell angelegte Termine – der Coach hat das
   * letzte Wort über die Zuordnung. `null` löst die Verknüpfung wieder.
   *
   * Die Snapshot-Felder clientName/clientEmail/clientPhone der Buchung bleiben
   * bewusst unverändert: sie dokumentieren, was der Klient beim Buchen eingegeben
   * hat, und sind Beleg des Vorgangs – nicht der aktuelle Stammdatensatz. Wer sie
   * hier mitzöge, würde die Buchungshistorie nachträglich umschreiben.
   *
   * Kein Mailversand: die Zuordnung ist eine reine Verwaltungsoperation ohne
   * Außenwirkung für den Klienten.
   */
  async assignClient(organizationId: string, bookingId: string, dto: AssignBookingClientDto): Promise<CoachBookingResponse> {
    await this.findOwn(organizationId, bookingId);

    // Mandantentrennung (doc/technik/technisches-konzept.md §11): ein Klient gehört exklusiv
    // einer Organisation. Ohne diese Prüfung könnte eine fremde clientId an die eigene
    // Buchung geraten und Klientendaten organisationsübergreifend zusammenführen.
    if (dto.clientId !== null) {
      const [client] = await this.db
        .select({ id: clients.id })
        .from(clients)
        .where(and(eq(clients.id, dto.clientId), eq(clients.organizationId, organizationId)))
        .limit(1);

      if (!client) {
        throw new NotFoundException('Client not found');
      }
    }

    const [updated] = await this.db
      .update(bookings)
      .set({ clientId: dto.clientId })
      .where(eq(bookings.id, bookingId))
      .returning(coachBookingColumns);
    this.logger.log('Booking assigned to client', { bookingId, clientId: dto.clientId });

    return this.respond(organizationId, updated);
  }

  /**
   * Spontan-Termin: eine Sitzung, die jetzt beginnt (doc/produkt/funktionen/backoffice-coach.md 2.04).
   *
   * Bewusst ein eigener Weg neben BookingsService.create(): Dort prüft der öffentliche
   * Buchungsweg gegen einen berechneten Verfügbarkeits-Slot und endet in 'pending', bis
   * der Klient bestätigt. Beides ergibt hier keinen Sinn – ein spontaner Termin liegt
   * naturgemäß außerhalb der freigegebenen Zeiten, und auf eine Bestätigungsmail zu
   * warten hieße, das Gespräch nicht zu führen. Der Coach ist authentifiziert und lädt
   * selbst ein; die Buchung entsteht deshalb direkt als 'confirmed'.
   *
   * Eingeladen wird ein bestehender Klient oder eine E-Mail-Adresse (UX-04). Gehört die
   * Adresse schon einem Klienten, hängt der Termin ohne Rückfrage an ihm – dieselbe Regel
   * wie bei der Bestätigung auf der Buchungsseite. Sonst entsteht nur auf Wunsch ein
   * Klient; ohne ihn bleibt `clientId` leer, und der Coach kann später zuordnen.
   *
   * Keine Kollisionsprüfung gegen andere Termine: Wer spontan startet, weiß, was er
   * gerade tut – der Kalender ist Vorschlag, nicht Vorschrift.
   *
   * Das Angebot ist optional. Fehlt es, treten AD_HOC_OFFER_NAME und
   * AD_HOC_DURATION_MINUTES an die Stelle des Snapshots – ein spontanes Gespräch ist
   * oft keines der veröffentlichten Angebote, und ein Pseudo-Angebot anzulegen wäre ein
   * Umweg, der in den Angebotslisten des Coachs stehenbliebe.
   */
  async createAdHoc(organizationId: string, dto: CreateAdHocBookingDto): Promise<AdHocBookingResponse> {
    const org = await this.organizationService.findById(organizationId);
    if (!org.slug) {
      // Ohne Slug gibt es keine Klienten-Subdomain und damit keine Adresse für den
      // Warteraum – ein Termin ohne Zugangslink wäre hier wertlos.
      throw new ConflictException('Organization has no booking page yet');
    }

    const offer = await this.findOwnOffer(organizationId, dto.offerId);
    const offerName = offer?.name ?? AD_HOC_OFFER_NAME;
    const durationMinutes = offer?.durationMinutes ?? AD_HOC_DURATION_MINUTES;

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + durationMinutes * 60_000);
    // Selbst erzeugt statt aus der Rückgabe gelesen: coachBookingColumns führt den Token
    // bewusst nicht, und er wird gleich für den Zugangslink gebraucht.
    const clientAccessToken = randomBytes(32).toString('hex');

    let booking: CoachBookingRow;
    try {
      // Klient und Termin in einer Transaktion: Scheitert der Termin (Doppelklick, siehe
      // unten), bleibt kein frisch angelegter Klient ohne Termin zurück.
      booking = await this.db.transaction(async (tx) => {
        const { client, attendee } = await this.resolveInvitee(tx, organizationId, dto);

        const [row] = await tx
          .insert(bookings)
          .values({
            organizationId,
            clientId:        client?.id ?? null,
            offerId:         offer?.id ?? null,
            // Snapshots wie im öffentlichen Buchungsweg: Was hier steht, gilt für diesen
            // Termin, auch wenn Angebot oder Klient sich später ändern.
            offerName,
            durationMinutes,
            startTime,
            endTime,
            clientName:      attendee.name,
            clientEmail:     attendee.email,
            clientPhone:     attendee.phone,
            status:          'confirmed',
            origin:          'ad_hoc',
            confirmedAt:     startTime,
            clientAccessToken,
          })
          .returning(coachBookingColumns);
        return row;
      });
    } catch (err) {
      // bookings_org_start_active_unique greift, wenn zwei Anlagen in dieselbe Sekunde
      // fallen – etwa bei einem Doppelklick. Die Startzeit dafür zu verschieben hieße,
      // aus einem versehentlichen zweiten Klick einen zweiten Termin zu machen.
      if (isUniqueViolation(err)) {
        throw new ConflictException('A session already starts at this time');
      }
      throw err;
    }
    this.logger.log('Ad-hoc session created', { bookingId: booking.id, clientId: booking.clientId });

    const callUrl = buildCallUrl(this.config, org.slug, booking.id, clientAccessToken);

    // Nach dem Commit und in try/catch wie überall sonst: Der Termin steht, und der Coach
    // hat den Link ohnehin in der Antwort – ein Mail-Fehler darf den Aufruf nicht kippen.
    try {
      const coach = await this.organizationService.findOwnerContact(organizationId);
      const coachDisplayName = coach?.name ?? org.name;

      const clientName = greetingName(booking);

      await this.mailService.send({
        kind: 'session-invitation',
        to: { email: booking.clientEmail, name: clientName ?? undefined },
        subject: `${coachDisplayName} möchte jetzt mit dir sprechen – HxRoom`,
        replyTo: coach ? { email: coach.email, name: coach.name } : undefined,
        htmlContent: await renderSessionInvitationEmail({
          clientName,
          coachName: coachDisplayName,
          appointment: toAppointmentInfo(booking),
          callUrl,
          legalLinks: buildLegalLinks(this.config, org.slug),
        }),
      });
    } catch (err) {
      this.logger.error(`Failed to send session invitation for booking ${booking.id}`, err instanceof Error ? err.stack : err);
    }

    return { ...toCoachBookingResponse(booking), callUrl };
  }

  /**
   * Manuell angelegte Termine (doc/produkt/funktionen/manuelle-termine.md): ein oder mehrere Termine
   * zu gewählten Zeitpunkten, abgesprochen mit dem Klienten und deshalb sofort 'confirmed'.
   *
   * Mehrere Startzeiten ergeben eine Serie mit gemeinsamer series_id. Jeder Termin ist
   * trotzdem vollständig für sich: eigener Token, eigene Erinnerungen, eigene Absage.
   * Angelegt wird alles oder nichts – ein halb angelegter Rhythmus wäre schwerer zu
   * überblicken als ein Fehler, nach dem der Coach eine Zeile anpasst.
   *
   * Überschneidungen und Verfügbarkeit prüft checkManual() vorher als Hinweis; hier hindert
   * nur dieselbe Startzeit wie ein bestehender Termin (bookings_org_start_active_unique).
   */
  async createManual(organizationId: string, dto: CreateManualBookingDto): Promise<ManualBookingResponse> {
    const org = await this.organizationService.findById(organizationId);
    if (!org.slug) {
      // Wie beim Spontan-Termin: ohne Klienten-Subdomain kein Warteraum und kein Absagelink.
      throw new ConflictException('Organization has no booking page yet');
    }

    const now = new Date();
    const starts = dto.starts.map((start) => new Date(start)).sort((a, b) => a.getTime() - b.getTime());
    if (starts.some((start) => start <= now)) {
      throw new BadRequestException('Start time must be in the future');
    }
    if (new Set(starts.map((start) => start.getTime())).size !== starts.length) {
      throw new BadRequestException('Start times must be distinct');
    }

    const offer = await this.findOwnOffer(organizationId, dto.offerId);
    const offerName = offer?.name ?? MANUAL_OFFER_NAME;
    // Das Schema verlangt Angebot oder Dauer; das Angebot hat Vorrang.
    const durationMinutes = offer?.durationMinutes ?? dto.durationMinutes!;
    const seriesId = starts.length > 1 ? randomUUID() : null;

    let created: { row: CoachBookingRow; token: string }[];
    try {
      created = await this.db.transaction(async (tx) => {
        const { client, attendee } = await this.resolveInvitee(tx, organizationId, dto);

        // Selbst erzeugt statt aus der Rückgabe gelesen: coachBookingColumns führt den
        // Token bewusst nicht, und er wird gleich für Links und Mail gebraucht.
        const values = starts.map((startTime) => ({
          organizationId,
          clientId:        client?.id ?? null,
          offerId:         offer?.id ?? null,
          offerName,
          durationMinutes,
          startTime,
          endTime:         new Date(startTime.getTime() + durationMinutes * 60_000),
          clientName:      attendee.name,
          clientEmail:     attendee.email,
          clientPhone:     attendee.phone,
          status:          'confirmed' as const,
          origin:          'manual' as const,
          seriesId,
          // Bestätigt im Moment des Anlegens: Daran misst die Erinnerungsregel, ob eine
          // Erinnerung noch Sinn ergibt (booking-reminders.ts).
          confirmedAt:     now,
          clientAccessToken: randomBytes(32).toString('hex'),
        }));

        const rows = await tx.insert(bookings).values(values).returning(coachBookingColumns);
        // Die Rückgabe folgt der Reihenfolge der Werte; die Startzeit ordnet sie trotzdem
        // eindeutig zu, denn innerhalb des Vorgangs ist sie verschieden.
        return values.map((value) => ({
          row: rows.find((row) => row.startTime.getTime() === value.startTime.getTime())!,
          token: value.clientAccessToken,
        }));
      });
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('A session already starts at one of these times');
      }
      throw err;
    }
    this.logger.log('Manual bookings created', {
      bookingIds: created.map(({ row }) => row.id),
      seriesId,
      clientId: created[0].row.clientId,
    });

    // Nach dem Commit und in try/catch wie überall sonst: Die Termine stehen, und der
    // Coach hat die Links in der Antwort – ein Mail-Fehler darf den Aufruf nicht kippen.
    try {
      await this.sendAppointmentScheduledMail(org.slug, organizationId, created);
    } catch (err) {
      this.logger.error(`Failed to send appointment mail for booking ${created[0].row.id}`, err instanceof Error ? err.stack : err);
    }

    const responses = await withSeries(this.db, organizationId, created.map(({ row }) => row));
    return responses.map((response, index) => ({
      ...response,
      callUrl: buildCallUrl(this.config, org.slug!, response.id, created[index].token),
    }));
  }

  /**
   * Hinweise vor dem manuellen Anlegen (doc/produkt/funktionen/manuelle-termine.md §2): je Startzeit
   * die anderen Termine des Coachs, die den Zeitraum samt Puffer berühren, und ob er
   * außerhalb der freigegebenen Zeiten liegt. Beides hindert nicht am Anlegen.
   */
  async checkManual(organizationId: string, dto: CheckManualBookingDto): Promise<ManualBookingCheckResponse> {
    const offer = await this.findOwnOffer(organizationId, dto.offerId);
    const durationMinutes = offer?.durationMinutes ?? dto.durationMinutes!;

    const [settings] = await this.db
      .select({ bufferMinutes: availabilitySettings.bufferMinutes })
      .from(availabilitySettings)
      .where(eq(availabilitySettings.organizationId, organizationId))
      .limit(1);
    const bufferMs = (settings?.bufferMinutes ?? 0) * 60_000;

    const rules = await this.db
      .select({ weekday: availabilitySlots.weekday, startTime: availabilitySlots.startTime, endTime: availabilitySlots.endTime })
      .from(availabilitySlots)
      .where(eq(availabilitySlots.organizationId, organizationId));

    const ranges = dto.starts.map((start) => {
      const startTime = new Date(start);
      return { start, startTime, endTime: new Date(startTime.getTime() + durationMinutes * 60_000) };
    });
    const earliest = new Date(Math.min(...ranges.map((r) => r.startTime.getTime())) - bufferMs);
    const latest = new Date(Math.max(...ranges.map((r) => r.endTime.getTime())) + bufferMs);

    // Eine Abfrage für alle Zeilen: die Termine im Gesamtzeitraum, zugeordnet wird unten.
    const others = await this.db
      .select({ clientName: bookings.clientName, startTime: bookings.startTime, endTime: bookings.endTime })
      .from(bookings)
      .where(and(
        eq(bookings.organizationId, organizationId),
        ne(bookings.status, 'cancelled'),
        lt(bookings.startTime, latest),
        gt(bookings.endTime, earliest),
      ))
      .orderBy(asc(bookings.startTime));

    // Ausnahmen (kalenderabgleich.md §2): Eine Sperre wird als Hinweis genannt, eine Freigabe
    // zählt als freigegebene Zeit. Ohne Puffer – die Sperre gilt genau für ihren Zeitraum.
    const exceptions = await this.exceptionsService.loadForSlots(organizationId, { start: earliest, end: latest });

    return ranges.map(({ start, startTime, endTime }) => {
      const from = startTime.getTime() - bufferMs;
      const to = endTime.getTime() + bufferMs;
      const blocked = exceptions.blocked.find((e) => e.startTime < endTime && e.endTime > startTime);
      return {
        start,
        conflicts: others
          .filter((other) => other.startTime.getTime() < to && other.endTime.getTime() > from)
          .map((other) => ({ clientName: other.clientName, start: other.startTime.toISOString(), end: other.endTime.toISOString() })),
        blockedBy: blocked
          ? { note: blocked.note, start: blocked.startTime.toISOString(), end: blocked.endTime.toISOString(), allDay: blocked.allDay }
          : null,
        outsideAvailability: !isWithinAvailability({ start: startTime, end: endTime }, rules, 'Europe/Berlin', exceptions.available),
      };
    });
  }

  /**
   * Probe-Sitzung des Coachs mit sich selbst (technisches-konzept.md §5, „Probe-Sitzung“): ein
   * Spontan-Termin ohne Klient und ohne Mail. Name und E-Mail des Coachs stehen nur am Termin,
   * in der Klientenliste entsteht kein Eintrag. Den Link zum Warteraum öffnet der Coach per
   * QR-Code auf dem Handy und lässt sich am Rechner selbst ein.
   *
   * Herkunft 'test': zählt in keiner Kennzahl, bekommt keine Erinnerung und wird
   * TEST_SESSION_RETENTION_HOURS nach dem Ende gelöscht (TestSessionCleanupService).
   */
  async createTestSession(organizationId: string, coach: { name: string; email: string }): Promise<AdHocBookingResponse> {
    const org = await this.organizationService.findById(organizationId);
    if (!org.slug) {
      throw new ConflictException('Organization has no booking page yet');
    }

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + TEST_SESSION_DURATION_MINUTES * 60_000);
    const clientAccessToken = randomBytes(32).toString('hex');

    let booking: CoachBookingRow;
    try {
      [booking] = await this.db
        .insert(bookings)
        .values({
          organizationId,
          clientId:        null,
          offerId:         null,
          offerName:       TEST_SESSION_NAME,
          durationMinutes: TEST_SESSION_DURATION_MINUTES,
          startTime,
          endTime,
          clientName:      coach.name,
          clientEmail:     coach.email,
          status:          'confirmed',
          origin:          'test',
          confirmedAt:     startTime,
          clientAccessToken,
        })
        .returning(coachBookingColumns);
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new ConflictException('A session already starts at this time');
      }
      throw err;
    }
    this.logger.log('Test session created', { bookingId: booking.id });

    return { ...toCoachBookingResponse(booking), callUrl: buildCallUrl(this.config, org.slug, booking.id, clientAccessToken) };
  }

  /** iCalendar-Datei für einen einzelnen Termin – zum Import in den Kalender des Coachs. */
  async buildIcs(organizationId: string, bookingId: string): Promise<string> {
    const booking = await this.findOwn(organizationId, bookingId);
    const coach = await this.organizationService.findOwnerContact(organizationId);

    return buildBookingIcs({
      uid: booking.id,
      start: booking.startTime,
      end: booking.endTime,
      summary: `${booking.offerName} mit ${booking.clientName}`,
      organizer: coach ? { name: coach.name, email: coach.email } : undefined,
      attendee: { name: booking.clientName, email: booking.clientEmail },
      description: booking.clientNote ?? undefined,
    });
  }

  // Ownership-Prüfung über die organizationId: eine fremde Buchung ist für diesen Coach
  // schlicht nicht vorhanden – 404 statt 403, damit die Existenz nicht durchsickert.
  /** Coach-Antwort für eine einzelne Zeile, samt Stelle in der Serie. */
  private async respond(organizationId: string, row: CoachBookingRow): Promise<CoachBookingResponse> {
    const [response] = await withSeries(this.db, organizationId, [row]);
    return response;
  }

  // Mandantentrennung wie in assignClient(): Das Angebot muss dieser Organisation gehören,
  // sonst ließe sich mit einer fremden Id ein Termin erzeugen.
  private async findOwnOffer(organizationId: string, offerId: string | undefined) {
    if (!offerId) return undefined;

    const [offer] = await this.db
      .select({ id: offers.id, name: offers.name, durationMinutes: offers.durationMinutes })
      .from(offers)
      .where(and(eq(offers.id, offerId), eq(offers.organizationId, organizationId)))
      .limit(1);

    if (!offer) throw new NotFoundException('Offer not found');
    return offer;
  }

  /**
   * Wer eingeladen wird – Spontan-Termin und manueller Termin teilen sich die Regel (UX-04):
   * ein bestehender Klient, oder eine E-Mail-Adresse. Gehört die Adresse schon einem
   * Klienten, hängt der Termin ohne Rückfrage an ihm. Sonst entsteht nur auf Wunsch ein
   * Klient; ohne ihn bleibt `client` leer, und der Coach kann später zuordnen.
   *
   * Läuft in der Transaktion des Termins: Scheitert der Termin, bleibt kein frisch
   * angelegter Klient ohne Termin zurück.
   */
  private async resolveInvitee(
    tx: Parameters<Parameters<DrizzleDb['transaction']>[0]>[0],
    organizationId: string,
    dto: { clientId: string } | { email: string; name?: string; createClient: boolean },
  ) {
    const clientColumns = { id: clients.id, name: clients.name, email: clients.email, phone: clients.phone };
    let client: { id: string; name: string; email: string; phone: string | null } | undefined;

    if ('clientId' in dto) {
      [client] = await tx
        .select(clientColumns)
        .from(clients)
        .where(and(eq(clients.id, dto.clientId), eq(clients.organizationId, organizationId)))
        .limit(1);

      if (!client) throw new NotFoundException('Client not found');
      return { client, attendee: client };
    }

    const email = normalizeEmail(dto.email);
    const name = dto.name || null;

    [client] = await tx
      .select(clientColumns)
      .from(clients)
      .where(and(eq(clients.organizationId, organizationId), eq(clients.email, email)))
      .limit(1);

    if (!client && dto.createClient && name) {
      // onConflictDoNothing statt Fehler: Legt eine zweite Anfrage dieselbe Adresse
      // gleichzeitig an, gewinnt deren Klient – sonst landete der Wettlauf bei der
      // Meldung "A session already starts at this time" des Aufrufers.
      [client] = await tx
        .insert(clients)
        .values({ organizationId, name, email })
        .onConflictDoNothing()
        .returning(clientColumns);

      client ??= (await tx
        .select(clientColumns)
        .from(clients)
        .where(and(eq(clients.organizationId, organizationId), eq(clients.email, email)))
        .limit(1))[0];
    }

    // Ohne Klient: Am Termin steht der eingegebene Name, sonst die Adresse selbst –
    // client_name ist Pflicht, und die Oberfläche braucht etwas zum Anzeigen.
    return { client, attendee: client ?? { name: name ?? email, email, phone: null } };
  }

  // Eine Mail für den ganzen Vorgang, mit einem Kalendereintrag je Termin
  // (doc/produkt/funktionen/manuelle-termine.md §4).
  private async sendAppointmentScheduledMail(slug: string, organizationId: string, created: { row: CoachBookingRow; token: string }[]): Promise<void> {
    const org = await this.organizationService.findById(organizationId);
    const coach = await this.organizationService.findOwnerContact(organizationId);
    const coachDisplayName = coach?.name ?? org.name;
    const [first] = created;
    const now = Date.now();

    const appointments = created.map(({ row, token }) => ({
      row,
      callUrl: buildCallUrl(this.config, slug, row.id, token),
      cancelUrl: buildCancelUrl(this.config, slug, row.id, token),
    }));

    const ics = buildBookingsIcs(appointments.map(({ row, callUrl }) => ({
      uid: row.id,
      start: row.startTime,
      end: row.endTime,
      summary: `${row.offerName} mit ${coachDisplayName}`,
      organizer: coach ? { name: coach.name, email: coach.email } : undefined,
      attendee: { name: row.clientName, email: row.clientEmail },
      url: callUrl,
    })));

    await this.mailService.send({
      kind: 'appointment-scheduled',
      to: { email: first.row.clientEmail, name: greetingName(first.row) ?? undefined },
      subject: created.length === 1
        ? `Dein Termin bei ${coachDisplayName} – HxRoom`
        : `Deine Termine bei ${coachDisplayName} – HxRoom`,
      replyTo: coach ? { email: coach.email, name: coach.name } : undefined,
      htmlContent: await renderAppointmentScheduledEmail({
        clientName: greetingName(first.row),
        coachName: coachDisplayName,
        appointments: appointments.map(({ row, callUrl, cancelUrl }) => ({
          appointment: toAppointmentInfo(row),
          callUrl,
          cancelUrl,
          roomAlreadyOpen: row.startTime.getTime() - now <= CALL_OPENS_MINUTES_BEFORE_START * 60_000,
        })),
        callOpensMinutesBefore: CALL_OPENS_MINUTES_BEFORE_START,
        legalLinks: buildLegalLinks(this.config, slug),
      }),
      attachment: [{ name: created.length === 1 ? 'termin.ics' : 'termine.ics', content: Buffer.from(ics, 'utf8').toString('base64') }],
    });
  }

  private async findOwn(organizationId: string, bookingId: string): Promise<CoachBookingRow> {
    const [booking] = await this.db
      .select(coachBookingColumns)
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.organizationId, organizationId)))
      .limit(1);

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  private async sendCancellationMail(organizationId: string, booking: CoachBookingRow, reason?: string): Promise<void> {
    const org = await this.organizationService.findById(organizationId);
    if (!org.slug) {
      this.logger.warn(`Organization ${organizationId} has no slug – skipped cancellation email for booking ${booking.id}`);
      return;
    }

    const coach = await this.organizationService.findOwnerContact(organizationId);
    const coachDisplayName = coach?.name ?? org.name;

    // Ein Spontan-Termin an eine bloße E-Mail-Adresse hat keinen Namen für die Anrede.
    const clientName = greetingName(booking);

    await this.mailService.send({
      kind: 'coach-cancellation',
      to: { email: booking.clientEmail, name: clientName ?? undefined },
      subject: 'Dein Termin wurde abgesagt – HxRoom',
      replyTo: coach ? { email: coach.email, name: coach.name } : undefined,
      htmlContent: await renderBookingCancelledEmail({
        clientName,
        coachName: coachDisplayName,
        appointment: toAppointmentInfo(booking),
        cancelledBy: 'coach',
        reason: reason ?? null,
        bookingPageUrl: buildBookingPageUrl(this.config, org.slug),
        legalLinks: buildLegalLinks(this.config, org.slug),
      }),
    });
  }
}
