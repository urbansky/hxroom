import { Inject, Injectable, Logger } from '@nestjs/common';
import { and, count, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import {
  bookings,
  clients,
  coachDeletions,
  member,
  offers,
  organization,
  user,
  type DeletedCounts,
} from '../db/schema';
import { MailService } from '../mail/mail.service';
import { S3Service } from '../storage/s3.service';
import { renderBookingCancelledEmail } from '../mail/templates/client/booking-cancelled';
import { renderDeletionExecutedEmail } from '../mail/templates/coach/deletion-executed';
import { formatDayTimeLabel } from '../bookings/booking-formatting';

// Transaktionshandle von Drizzle. Alle Schritte einer Löschung laufen darauf, damit ein
// Fehler auf halbem Weg die ganze Löschung zurückrollt statt ein halb gelöschtes Konto zu
// hinterlassen.
type Tx = Parameters<Parameters<DrizzleDb['transaction']>[0]>[0];

interface Owner {
  id:    string;
  name:  string;
  email: string;
}

/**
 * Vollzieht eine fällige Kontolöschung: Termine absagen, Dateien entfernen, Organisation und
 * Coach löschen, Protokoll schreiben.
 *
 * Eigener Service statt Logik im Cron, weil derselbe Ablauf auch für die noch fehlende
 * Löschung durch den Betreiber gebraucht wird (doc/funktionen/backoffice-betreiber.md 1.06);
 * `coach_deletions.requestedBy` ist dafür schon vorgesehen.
 *
 * Einstiegspunkt ist immer die Organisation, nicht der Coach – siehe
 * doc/technisches-konzept.md §17: sämtliche Fachdaten hängen an `organizationId`, und
 * `organization` hat keinen Fremdschlüssel auf `user`.
 */
@Injectable()
export class DeletionExecutorService {
  private readonly logger = new Logger(DeletionExecutorService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly mail: MailService,
    private readonly s3: S3Service,
  ) {}

  /**
   * Löscht alle fälligen Konten und gibt die Anzahl der ausgeführten Löschungen zurück.
   *
   * Jede Löschung läuft in ihrer eigenen Transaktion: schlägt eine fehl, sind die anderen
   * unberührt und der nächste Lauf holt die gescheiterte nach.
   */
  async executeDueDeletions(): Promise<number> {
    const due = await this.db
      .select({ id: organization.id })
      .from(organization)
      // Grenze in SQL statt in JS, damit die DB-Zeit zählt und nicht die des App-Containers
      // (gleiche Begründung wie in BookingExpiryService).
      .where(sql`${organization.deletionScheduledFor} <= now()`);

    let executed = 0;
    for (const org of due) {
      try {
        if (await this.execute(org.id)) executed++;
      } catch (err) {
        this.logger.error(
          `Failed to execute deletion for organization ${org.id}`,
          err instanceof Error ? err.stack : err,
        );
      }
    }
    return executed;
  }

  /**
   * Löscht eine Organisation samt Coach. Gibt `false` zurück, wenn die Löschung inzwischen
   * widerrufen wurde oder ein parallel laufender Prozess sie bereits in Arbeit hat.
   *
   * Alles in einer Transaktion – auch der Mailversand. Das hält die Transaktion länger offen
   * als nötig, ist hier aber der Preis für zwei wichtigere Eigenschaften: der Row-Lock gilt
   * nur innerhalb der Transaktion, und ein Fehler auf halbem Weg rollt die komplette Löschung
   * zurück, statt ein Konto ohne Klienten oder ein Protokoll ohne Löschung zu hinterlassen.
   */
  async execute(organizationId: string): Promise<boolean> {
    return this.db.transaction(async (tx) => {
      // Sperre gegen Doppelausführung. Anders als beim Buchungsverfall (siehe Kommentar in
      // app.module.ts) ist dieser Ablauf nicht idempotent: zwei parallele Läufe würden Storno-
      // und Löschmails doppelt verschicken. Bei mehreren API-Instanzen sind die Crons
      // unkoordiniert, deshalb SKIP LOCKED – die zweite Instanz überspringt die Zeile,
      // statt auf sie zu warten.
      const [locked] = await tx
        .select({ id: organization.id, name: organization.name })
        .from(organization)
        .where(and(
          eq(organization.id, organizationId),
          sql`${organization.deletionScheduledFor} is not null`,
          sql`${organization.deletionScheduledFor} <= now()`,
        ))
        .for('update', { skipLocked: true })
        .limit(1);

      if (!locked) return false;

      const owner = await this.findOwner(tx, organizationId);
      const counts = await this.collectCounts(tx, organizationId);

      // Vor dem Löschen: offene Termine absagen und die Klienten informieren. Ohne diesen
      // Schritt verschwinden bestätigte Termine still im Cascade, und der Klient stünde zur
      // vereinbarten Zeit vor einer Nicht-gefunden-Seite.
      const cancelled = await this.cancelUpcomingBookings(
        tx,
        organizationId,
        owner?.name ?? locked.name,
      );

      // Ebenfalls vorher: der Coach soll seinen Löschnachweis bekommen, danach ist seine
      // Adresse nicht mehr bekannt.
      if (owner) await this.sendExecutedMail(owner, counts);

      // S3 vor dem DB-Delete: danach wäre die organizationId weg und die Objekte für immer
      // unauffindbar. Rollt die Transaktion später zurück, sind die Dateien zwar schon fort –
      // sie waren zur Löschung freigegeben, und der Wiederholungslauf findet ein leeres
      // Prefix, was harmlos ist.
      const deletedObjects = await this.s3.deletePrefix(`${organizationId}/`);

      // Cascade räumt member, booking_page, offers, clients, bookings, availability_slots und
      // availability_settings mit.
      await tx.delete(organization).where(eq(organization.id, organizationId));
      // Der Coach hängt nicht am Cascade der Organisation und muss separat weg; mit ihm gehen
      // session, account und invitation.
      if (owner) await tx.delete(user).where(eq(user.id, owner.id));

      await tx
        .update(coachDeletions)
        .set({ executedAt: new Date(), deletedCounts: counts })
        .where(and(
          eq(coachDeletions.organizationId, organizationId),
          isNull(coachDeletions.executedAt),
          isNull(coachDeletions.revokedAt),
        ));

      // Nur IDs und Zahlen – Namen und Adressen gehören nicht in Application Logs.
      this.logger.log(
        `Deleted organization ${organizationId}: ${counts.clients} client(s), ` +
        `${counts.bookings} booking(s), ${counts.offers} offer(s), ${cancelled} cancelled, ` +
        `${deletedObjects} file(s)`,
      );

      return true;
    });
  }

  private async findOwner(tx: Tx, organizationId: string): Promise<Owner | null> {
    const [owner] = await tx
      .select({ id: user.id, name: user.name, email: user.email })
      .from(member)
      .innerJoin(user, eq(user.id, member.userId))
      .where(and(eq(member.organizationId, organizationId), eq(member.role, 'owner')))
      .limit(1);

    if (!owner) {
      // Kein Abbruch: eine Organisation ohne Owner ist ein Datenfehler, aber ihre
      // Klientendaten müssen trotzdem verschwinden.
      this.logger.warn(`Organization ${organizationId} has no owner member – deleting anyway`);
      return null;
    }
    return owner;
  }

  private async collectCounts(tx: Tx, organizationId: string): Promise<DeletedCounts> {
    const [[clientRow], [bookingRow], [offerRow]] = await Promise.all([
      tx.select({ value: count() }).from(clients).where(eq(clients.organizationId, organizationId)),
      tx.select({ value: count() }).from(bookings).where(eq(bookings.organizationId, organizationId)),
      tx.select({ value: count() }).from(offers).where(eq(offers.organizationId, organizationId)),
    ]);

    return { clients: clientRow.value, bookings: bookingRow.value, offers: offerRow.value };
  }

  /** Sagt alle noch bevorstehenden Termine ab und gibt deren Anzahl zurück. */
  private async cancelUpcomingBookings(
    tx: Tx,
    organizationId: string,
    coachDisplayName: string,
  ): Promise<number> {
    const upcoming = await tx
      // Urheber ist der Coach: die Löschung seines Kontos ist seine Entscheidung, nicht
      // ein automatischer Verfall.
      .update(bookings)
      .set({ status: 'cancelled', cancelledAt: new Date(), cancelledBy: 'coach' })
      .where(and(
        eq(bookings.organizationId, organizationId),
        inArray(bookings.status, ['pending', 'confirmed']),
        gte(bookings.startTime, new Date()),
      ))
      .returning({
        id:          bookings.id,
        clientName:  bookings.clientName,
        clientEmail: bookings.clientEmail,
        offerName:   bookings.offerName,
        startTime:   bookings.startTime,
        endTime:     bookings.endTime,
      });

    for (const booking of upcoming) {
      // Pro Termin abgesichert: eine unzustellbare Adresse darf weder die übrigen Absagen
      // noch die Löschung aufhalten.
      try {
        await this.mail.send({
          to: { email: booking.clientEmail, name: booking.clientName },
          subject: 'Dein Termin wurde abgesagt – HxRoom',
          htmlContent: await renderBookingCancelledEmail({
            clientName: booking.clientName,
            coachName: coachDisplayName,
            offerName: booking.offerName,
            dayTimeLabel: formatDayTimeLabel(booking),
            cancelledBy: 'coach',
            reason: null,
            // Kein Link: die Buchungsseite verschwindet mit dem Konto.
            bookingPageUrl: null,
          }),
        });
      } catch (err) {
        this.logger.error(
          `Failed to send cancellation mail for booking ${booking.id}`,
          err instanceof Error ? err.stack : err,
        );
      }
    }

    return upcoming.length;
  }

  private async sendExecutedMail(owner: Owner, counts: DeletedCounts): Promise<void> {
    try {
      await this.mail.send({
        to: { email: owner.email, name: owner.name },
        subject: 'Dein HxRoom-Konto wurde gelöscht',
        htmlContent: await renderDeletionExecutedEmail({
          name: owner.name,
          clientCount: counts.clients,
          bookingCount: counts.bookings,
        }),
      });
    } catch (err) {
      // Die Löschung ist beantragt und fällig – ein Mail-Fehler darf sie nicht verhindern.
      this.logger.error(
        'Failed to send deletion confirmation mail',
        err instanceof Error ? err.stack : err,
      );
    }
  }
}
