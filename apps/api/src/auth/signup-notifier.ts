import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { and, ilike, isNull, or, eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { user } from '../db/schema';
import { MailService } from '../mail/mail.service';
import { renderCoachRegisteredEmail } from '../mail/templates/operator/coach-registered';
import { isAdminRole } from './roles';

const registeredAtFormatter = new Intl.DateTimeFormat('de-DE', {
  timeZone: 'Europe/Berlin',
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export interface RegisteredCoach {
  id: string;
  name: string;
  email: string;
  slug: string;
  createdAt: Date;
}

/**
 * Meldet jedem Betreiber per Mail, dass sich ein Coach registriert hat.
 *
 * Empfänger sind alle Konten mit Betreiber-Rolle (`isAdminRole`), gesperrte ausgenommen –
 * ohne eigene Liste oder Umgebungsvariable, ein neuer Betreiber über `admin:create` bekommt
 * die Mails also automatisch. Jeder Betreiber erhält eine eigene Mail, damit die Adressen
 * der anderen nicht im Empfängerfeld stehen.
 *
 * `notify` wirft nie: Die Registrierung darf an der Meldung nicht scheitern.
 */
@Injectable()
export class SignupNotifier {
  private readonly logger = new Logger(SignupNotifier.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: DrizzleDb,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async notify(coach: RegisteredCoach): Promise<void> {
    try {
      const operators = await this.findOperators();
      if (operators.length === 0) return;

      const htmlContent = await renderCoachRegisteredEmail({
        coachName: coach.name,
        coachEmail: coach.email,
        subdomain: coach.slug,
        registeredAtLabel: registeredAtFormatter.format(coach.createdAt),
        coachesUrl: `${this.adminAppUrl()}/coaches`,
      });

      const results = await Promise.allSettled(
        operators.map((operator) =>
          this.mail.send({
            kind: 'coach-registered',
            to: { email: operator.email, name: operator.name },
            replyTo: { email: coach.email, name: coach.name },
            subject: `Neuer Coach: ${coach.name}`,
            htmlContent,
          }),
        ),
      );

      const failed = results.filter((r) => r.status === 'rejected').length;
      if (failed > 0) {
        // Nur die ID des Coachs, keine Adressen (technisches-konzept.md §17).
        this.logger.error(`Signup notification failed for ${failed} of ${operators.length} operators`, {
          coachId: coach.id,
        });
      }
    } catch (err) {
      this.logger.error(
        `Signup notification failed for coach ${coach.id}`,
        err instanceof Error ? err.stack : err,
      );
    }
  }

  private async findOperators(): Promise<{ email: string; name: string }[]> {
    // Das LIKE grenzt nur vor; maßgeblich ist isAdminRole, das kommagetrennte
    // Mehrfachrollen genauso auswertet wie der AdminGuard.
    const rows = await this.db
      .select({ email: user.email, name: user.name, role: user.role })
      .from(user)
      .where(and(ilike(user.role, '%admin%'), or(isNull(user.banned), eq(user.banned, false))));

    return rows
      .filter((row) => isAdminRole(row.role))
      .map(({ email, name }) => ({ email, name }));
  }

  /** admin.<ROOT_DOMAIN>, nach demselben Muster wie buildLandingUrl. */
  private adminAppUrl(): string {
    const https = this.config.get<string>('ROOT_DOMAIN_HTTPS') === 'true';
    return `${https ? 'https' : 'http'}://admin.${this.config.getOrThrow<string>('ROOT_DOMAIN')}`;
  }
}
