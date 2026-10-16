import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import type { FeedbackItem, ListFeedbackQuery } from '@hxroom/shared';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { feedback, organization, user } from '../db/schema';

@Injectable()
export class AdminFeedbackService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /** Feedback aller Coachs, neueste zuerst. Ohne Pagination, wie die Coach-Liste. */
  async list(query: ListFeedbackQuery): Promise<FeedbackItem[]> {
    const rows = await this.db
      .select({
        id:         feedback.id,
        createdAt:  feedback.createdAt,
        category:   feedback.category,
        message:    feedback.message,
        page:       feedback.page,
        userAgent:  feedback.userAgent,
        coachName:  user.name,
        coachEmail: user.email,
        subdomain:  organization.slug,
      })
      .from(feedback)
      .innerJoin(user, eq(user.id, feedback.userId))
      .innerJoin(organization, eq(organization.id, feedback.organizationId))
      .where(query.category ? eq(feedback.category, query.category) : undefined)
      .orderBy(desc(feedback.createdAt), desc(feedback.id))
      .limit(query.limit);

    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  }

  /** Endgültig, ohne Protokoll: Feedback ist kein Nachweis, nur Arbeitsmaterial. */
  async remove(id: string): Promise<void> {
    const deleted = await this.db.delete(feedback).where(eq(feedback.id, id)).returning({ id: feedback.id });
    if (deleted.length === 0) throw new NotFoundException('Feedback not found');
  }
}
