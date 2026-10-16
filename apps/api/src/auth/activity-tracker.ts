import { Inject, Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { user } from '../db/schema';

/** Wie oft `user.last_active_at` höchstens geschrieben wird. */
export const ACTIVITY_WRITE_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Hält fest, wann ein Coach zuletzt mit der API gearbeitet hat ("Zuletzt aktiv" in der
 * Coach-Liste des Betreiber-Backoffice, phase5-umsetzungsplan.md 7b).
 *
 * Nicht über die session-Tabelle: Zeilen verschwinden beim Abmelden und Ablaufen, und eine
 * Sitzung hält Tage – der letzte Login sagt über die Nutzung wenig.
 *
 * Der Zeitpunkt des letzten Schreibens liegt im Speicher, damit nicht jede Anfrage in die
 * Datenbank schreibt. Nach einem Neustart schreibt die erste Anfrage je Coach wieder; bei
 * mehreren API-Instanzen schreibt jede höchstens einmal pro Stunde. Beides ist harmlos.
 */
@Injectable()
export class ActivityTracker {
  private readonly logger = new Logger(ActivityTracker.name);
  private readonly lastWrite = new Map<string, number>();

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /**
   * Vermerkt die Aktivität, ohne die Anfrage aufzuhalten. Übernommene Sitzungen
   * (Support-Zugang des Betreibers) zählen nicht als Aktivität des Coachs.
   */
  touch(userId: string, impersonatedBy: string | null | undefined, now = Date.now()): void {
    if (impersonatedBy) return;
    const last = this.lastWrite.get(userId);
    if (last !== undefined && now - last < ACTIVITY_WRITE_INTERVAL_MS) return;
    this.lastWrite.set(userId, now);

    this.db
      .update(user)
      .set({ lastActiveAt: new Date(now) })
      .where(eq(user.id, userId))
      .catch((err: unknown) => {
        // Beim nächsten Mal erneut versuchen statt eine Stunde zu warten.
        this.lastWrite.delete(userId);
        this.logger.warn(`Failed to record activity for user ${userId}`, err instanceof Error ? err.stack : err);
      });
  }
}
