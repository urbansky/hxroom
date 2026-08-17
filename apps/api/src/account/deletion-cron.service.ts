import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { coachDeletions, user } from '../db/schema';
import { MailService } from '../mail/mail.service';
import { renderDeletionReminderEmail } from '../mail/templates/coach/deletion-reminder';
import { DeletionExecutorService } from './deletion-executor.service';
import {
  DELETION_REMINDER_DAYS_BEFORE,
  daysUntilDeletion,
  formatDeletionDate,
} from './deletion.constants';

/**
 * Periodische Läufe der Kontolöschung: Erinnerung vor Ablauf der Frist, danach Ausführung.
 *
 * Beide bewusst nachts und nur einmal täglich – bei einer Frist von 30 Tagen ist eine
 * Genauigkeit von Stunden bedeutungslos, und der Ausführungslauf verschickt Mails.
 */
@Injectable()
export class DeletionCronService {
  private readonly logger = new Logger(DeletionCronService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly executor: DeletionExecutorService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  @Cron('0 3 * * *')
  async executeDueDeletions(): Promise<void> {
    try {
      const executed = await this.executor.executeDueDeletions();
      if (executed > 0) this.logger.log(`Executed ${executed} account deletion(s)`);
    } catch (err) {
      // Ein Fehler hier darf den Scheduler nicht abwürgen; der nächste Lauf holt es nach.
      this.logger.error('Failed to execute due deletions', err instanceof Error ? err.stack : err);
    }
  }

  /**
   * Letzte Erinnerung vor der endgültigen Löschung.
   *
   * Läuft eine Stunde vor dem Ausführungslauf, damit eine am selben Tag fällige Löschung nicht
   * ohne vorherige Erinnerung durchgeht, falls der Reminder-Lauf zuvor ausgefallen war.
   */
  @Cron('0 2 * * *')
  async sendReminders(): Promise<void> {
    try {
      const dueForReminder = await this.db
        .select({
          id:            coachDeletions.id,
          userId:        coachDeletions.userId,
          scheduledFor:  coachDeletions.scheduledFor,
        })
        .from(coachDeletions)
        .where(and(
          isNull(coachDeletions.revokedAt),
          isNull(coachDeletions.executedAt),
          isNull(coachDeletions.reminderSentAt),
          // Grenze in SQL, damit die DB-Zeit zählt. Der Vorlauf steht als Konstante daneben
          // (isReminderDue) und ist dort mit seinen Grenzfällen getestet.
          sql`${coachDeletions.scheduledFor} - make_interval(days => ${DELETION_REMINDER_DAYS_BEFORE}) <= now()`,
        ));

      for (const deletion of dueForReminder) {
        try {
          await this.sendReminder(deletion.id, deletion.userId, deletion.scheduledFor);
        } catch (err) {
          this.logger.error(
            `Failed to send deletion reminder ${deletion.id}`,
            err instanceof Error ? err.stack : err,
          );
        }
      }
    } catch (err) {
      this.logger.error('Failed to send deletion reminders', err instanceof Error ? err.stack : err);
    }
  }

  private async sendReminder(deletionId: string, userId: string, scheduledFor: Date): Promise<void> {
    const [coach] = await this.db
      .select({ name: user.name, email: user.email })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    // Kein Coach mehr: der Datensatz ist bereits weg, eine Erinnerung wäre sinnlos. Trotzdem
    // markieren, damit der Lauf die Zeile nicht jeden Tag erneut aufgreift.
    if (!coach) {
      await this.markReminderSent(deletionId);
      return;
    }

    const deletionDateLabel = formatDeletionDate(scheduledFor);

    await this.mail.send({
      to: { email: coach.email, name: coach.name },
      subject: `Erinnerung: Dein Konto wird am ${deletionDateLabel} gelöscht – HxRoom`,
      htmlContent: await renderDeletionReminderEmail({
        name: coach.name,
        deletionDateLabel,
        daysLeft: daysUntilDeletion(scheduledFor, new Date()),
        accountUrl: `${this.config.getOrThrow<string>('COACH_APP_URL')}/settings/account`,
      }),
    });

    // Erst nach erfolgreichem Versand markieren: schlägt Brevo fehl, versucht es der nächste
    // Lauf erneut, statt die Erinnerung stillschweigend zu verschlucken.
    await this.markReminderSent(deletionId);

    this.logger.log(`Sent deletion reminder for ${deletionId}`);
  }

  private async markReminderSent(deletionId: string): Promise<void> {
    await this.db
      .update(coachDeletions)
      .set({ reminderSentAt: new Date() })
      .where(eq(coachDeletions.id, deletionId));
  }
}
