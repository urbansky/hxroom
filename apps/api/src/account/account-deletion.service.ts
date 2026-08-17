import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fromNodeHeaders } from 'better-auth/node';
import type { IncomingHttpHeaders } from 'node:http';
import { and, count, eq, isNull } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { AUTH, type Auth } from '../auth/auth.module';
import { coachDeletions, member, organization, user } from '../db/schema';
import { MailService } from '../mail/mail.service';
import { renderDeletionRequestedEmail } from '../mail/templates/coach/deletion-requested';
import { deletionDueAt, formatDeletionDate } from './deletion.constants';
import type { AccountDeletionStatus } from '@hxroom/shared';

/**
 * Antrag und Widerruf der Kontolöschung durch den Coach selbst.
 *
 * Bewusst ein eigener Weg statt better-auths `user.deleteUser`: das würde sofort löschen und
 * die Organisation verwaist zurücklassen (Begründung in auth.module.ts und
 * doc/technisches-konzept.md §17). Die eigentliche Löschung macht später der
 * DeletionExecutorService.
 */
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    @Inject(AUTH) private readonly auth: Auth,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async status(organizationId: string): Promise<AccountDeletionStatus> {
    const [org] = await this.db
      .select({ deletionScheduledFor: organization.deletionScheduledFor })
      .from(organization)
      .where(eq(organization.id, organizationId))
      .limit(1);

    if (!org) throw new NotFoundException('Organization not found');

    return { scheduledFor: org.deletionScheduledFor?.toISOString() ?? null };
  }

  async request(
    organizationId: string,
    userId: string,
    password: string,
    headers: IncomingHttpHeaders,
  ): Promise<AccountDeletionStatus> {
    await this.verifyPassword(password, headers);

    // Im Studio-Plan hängen mehrere Coachs an einer Organisation, und der Cascade nähme sie
    // beim Löschen mit. Heute kann der Fall nicht auftreten (der user.create.after-Hook legt
    // genau einen Owner an), die Prüfung verhindert aber einen stillen Datenverlust, sobald
    // Studio kommt.
    const [{ value: memberCount }] = await this.db
      .select({ value: count() })
      .from(member)
      .where(eq(member.organizationId, organizationId));

    if (memberCount > 1) {
      throw new ConflictException(
        'Accounts with more than one team member cannot be deleted here. Please contact support.',
      );
    }

    const requestedAt = new Date();
    const scheduledFor = deletionDueAt(requestedAt);

    await this.db.transaction(async (tx) => {
      // Nur setzen, solange keine Löschung läuft: ein doppelt abgesendetes Formular würde die
      // Frist sonst verlängern und eine zweite offene Protokollzeile erzeugen.
      const updated = await tx
        .update(organization)
        .set({ deletionScheduledFor: scheduledFor })
        .where(and(eq(organization.id, organizationId), isNull(organization.deletionScheduledFor)))
        .returning({ id: organization.id });

      if (updated.length === 0) {
        throw new ConflictException('A deletion is already scheduled for this account');
      }

      await tx.insert(coachDeletions).values({
        userId,
        organizationId,
        requestedAt,
        requestedBy: 'coach',
        scheduledFor,
      });
    });

    // Nur IDs loggen – die Löschung selbst ist personenbezogen (DSGVO).
    this.logger.log(`Deletion scheduled for organization ${organizationId} at ${scheduledFor.toISOString()}`);

    await this.sendRequestedMail(userId, scheduledFor);

    return { scheduledFor: scheduledFor.toISOString() };
  }

  /**
   * Widerruf innerhalb der Frist. Ohne Passwort: wer eine gültige Session hat, darf die
   * Löschung zurücknehmen – das ist die harmlose Richtung, und der Weg muss auch dem
   * offenstehen, der gerade erst per Passwort-Reset zurück ins Konto gekommen ist.
   */
  async revoke(organizationId: string): Promise<AccountDeletionStatus> {
    await this.db.transaction(async (tx) => {
      const updated = await tx
        .update(organization)
        .set({ deletionScheduledFor: null })
        .where(eq(organization.id, organizationId))
        .returning({ id: organization.id });

      if (updated.length === 0) throw new NotFoundException('Organization not found');

      // Nur die offene Zeile: bereits widerrufene oder ausgeführte Löschungen sind Historie
      // und dürfen nicht nachträglich umdatiert werden.
      await tx
        .update(coachDeletions)
        .set({ revokedAt: new Date() })
        .where(and(
          eq(coachDeletions.organizationId, organizationId),
          isNull(coachDeletions.revokedAt),
          isNull(coachDeletions.executedAt),
        ));
    });

    this.logger.log(`Deletion revoked for organization ${organizationId}`);

    return { scheduledFor: null };
  }

  /**
   * Prüft das aktuelle Passwort über better-auth.
   *
   * `verifyPassword` ist als `scope: 'server'` markiert – das blendet den Endpunkt nur aus der
   * Client-Typinferenz aus, über `auth.api` ist er serverseitig regulär erreichbar. Bei
   * falschem Passwort wirft er einen better-auth-`APIError`, keine Nest-HttpException; ohne die
   * Umwandlung unten käme beim Coach ein 500 statt einer verwertbaren Fehlermeldung an.
   *
   * Kein Rate-Limit: better-auths Limiter greift nur im HTTP-Handler und wird von `auth.api`
   * umgangen. Hier tragbar, weil der Aufrufer bereits eine gültige Session auf genau dieses
   * Konto besitzt – geraten wird also nichts, was nicht schon offen wäre.
   */
  private async verifyPassword(password: string, headers: IncomingHttpHeaders): Promise<void> {
    try {
      await this.auth.api.verifyPassword({
        body: { password },
        headers: fromNodeHeaders(headers),
      });
    } catch {
      throw new BadRequestException('Invalid password');
    }
  }

  /**
   * Die Mail über den gestellten Antrag ist sicherheitsrelevant: hätte jemand anders sie
   * ausgelöst, ist das der einzige Hinweis darauf. Ein Fehler beim Versand darf den Antrag
   * aber nicht scheitern lassen – die Löschung ist zu diesem Zeitpunkt schon vorgemerkt, und
   * ein Rollback würde den Coach über den Zustand seines Kontos täuschen.
   */
  private async sendRequestedMail(userId: string, scheduledFor: Date): Promise<void> {
    try {
      const [coach] = await this.db
        .select({ name: user.name, email: user.email })
        .from(user)
        .where(eq(user.id, userId))
        .limit(1);

      if (!coach) return;

      const accountUrl = `${this.config.getOrThrow<string>('COACH_APP_URL')}/settings/account`;
      const deletionDateLabel = formatDeletionDate(scheduledFor);

      await this.mail.send({
        to: { email: coach.email, name: coach.name },
        subject: `Löschung deines Kontos am ${deletionDateLabel} – HxRoom`,
        htmlContent: await renderDeletionRequestedEmail({
          name: coach.name,
          deletionDateLabel,
          accountUrl,
        }),
      });
    } catch (err) {
      this.logger.error(
        'Failed to send deletion request mail',
        err instanceof Error ? err.stack : err,
      );
    }
  }
}
