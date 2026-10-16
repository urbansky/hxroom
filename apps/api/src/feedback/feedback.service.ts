import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, count, eq, gte } from 'drizzle-orm';
import { FEEDBACK_CATEGORY_LABELS, type CreateFeedbackDto } from '@hxroom/shared';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { feedback, organization } from '../db/schema';
import { MailService } from '../mail/mail.service';
import { renderFeedbackReceivedEmail } from '../mail/templates/operator/feedback-received';

/** Höchstens so viele Einsendungen pro Coach und Stunde, darüber 429. */
export const FEEDBACK_HOURLY_LIMIT = 20;

const receivedAtFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

interface FeedbackAuthor {
  id: string;
  name: string;
  email: string;
}

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  /**
   * Speichert das Feedback und meldet es dem Betreiber per Mail. Erst speichern, dann
   * senden: Scheitert die Mail, ist das Feedback trotzdem da und im Betreiber-Backoffice
   * zu sehen. Ohne FEEDBACK_EMAIL wird nur gespeichert.
   */
  async create(
    organizationId: string,
    author: FeedbackAuthor,
    dto: CreateFeedbackDto,
    userAgent: string | null,
  ): Promise<void> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const [{ value: recent }] = await this.db
      .select({ value: count() })
      .from(feedback)
      .where(and(eq(feedback.userId, author.id), gte(feedback.createdAt, since)));
    if (recent >= FEEDBACK_HOURLY_LIMIT) {
      throw new HttpException('Too many feedback submissions, please try again later', HttpStatus.TOO_MANY_REQUESTS);
    }

    const [row] = await this.db
      .insert(feedback)
      .values({
        organizationId,
        userId: author.id,
        category: dto.category,
        message: dto.message,
        page: dto.page,
        userAgent: userAgent?.slice(0, 500) || null,
      })
      .returning({ id: feedback.id, createdAt: feedback.createdAt });

    const to = this.config.get<string>('FEEDBACK_EMAIL');
    if (!to) return;

    try {
      const [org] = await this.db
        .select({ slug: organization.slug })
        .from(organization)
        .where(eq(organization.id, organizationId))
        .limit(1);
      const categoryLabel = FEEDBACK_CATEGORY_LABELS[dto.category];

      await this.mail.send({
        to: { email: to },
        replyTo: { email: author.email, name: author.name },
        subject: `Feedback (${categoryLabel}): ${author.name}`,
        htmlContent: await renderFeedbackReceivedEmail({
          categoryLabel,
          coachName: author.name,
          coachEmail: author.email,
          subdomain: org?.slug ?? null,
          message: dto.message,
          page: dto.page,
          userAgent: userAgent || null,
          receivedAtLabel: receivedAtFormatter.format(row.createdAt),
        }),
      });
    } catch (err) {
      // Nur die ID: Text und Absender des Feedbacks gehören nicht ins Log.
      this.logger.error(`Failed to send feedback mail for feedback ${row.id}`, err instanceof Error ? err.stack : err);
    }
  }
}
