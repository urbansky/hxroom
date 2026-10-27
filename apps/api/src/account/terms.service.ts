import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { termsAcceptances } from '../db/schema';
import { TERMS_VERSION, type TermsStatus } from '@hxroom/shared';

/**
 * Zustimmung zu AGB und AVV (phase5-umsetzungsplan.md, 5a). Bei der Registrierung schreibt
 * sie der better-auth-Hook in auth.module.ts; hier stimmen Konten zu, die ohne Registrierung
 * entstanden sind oder älter sind als die Checkbox.
 */
@Injectable()
export class TermsService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  async status(userId: string, impersonated: boolean): Promise<TermsStatus> {
    const [latest] = await this.db
      .select({ version: termsAcceptances.version, acceptedAt: termsAcceptances.acceptedAt })
      .from(termsAcceptances)
      .where(eq(termsAcceptances.userId, userId))
      .orderBy(desc(termsAcceptances.acceptedAt))
      .limit(1);
    return {
      currentVersion: TERMS_VERSION,
      acceptedVersion: latest?.version ?? null,
      acceptedAt: latest?.acceptedAt.toISOString() ?? null,
      impersonated,
    };
  }

  async accept(userId: string, impersonated: boolean): Promise<TermsStatus> {
    if (impersonated) {
      throw new ForbiddenException('Terms cannot be accepted on behalf of a coach');
    }
    await this.db
      .insert(termsAcceptances)
      .values({ userId, version: TERMS_VERSION })
      .onConflictDoNothing();
    return this.status(userId, false);
  }
}
