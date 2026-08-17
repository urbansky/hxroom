import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lt, lte, or, sql, type SQL } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDb } from '../db/db.module';
import { bookings, clients, member, organization, user } from '../db/schema';
import { HELD_SESSION_STATUSES } from '../bookings/booking.constants';
import { ADMIN_ROLES } from '../auth/roles';
import { escapeLikePattern } from '../common/sql-like';
import { deriveCoachStatus } from './coach-status';
import type { CoachListItem, ListCoachesQuery } from '@hxroom/shared';

/**
 * SQL-Spiegel von isAdminRole() (auth/roles.ts).
 *
 * Zwei Fallstricke, die ein einfaches `ne(user.role, 'admin')` beide verfehlt:
 *  - NULL: `role <> 'admin'` ist bei NULL selbst NULL und wirkt in WHERE wie false.
 *    Bestandsaccounts ohne gesetzte Rolle – laut Schema-Kommentar alle aus der Zeit vor
 *    dem admin-Plugin – fielen damit kommentarlos aus der Liste.
 *  - Mehrfachrollen: Das Plugin legt sie kommasepariert in einem Feld ab. 'user,admin'
 *    wäre ein Betreiber, käme über einen Gleichheitsvergleich aber als Coach durch.
 *
 * `&&` ist der Array-Overlap-Operator; eine spätere Erweiterung von ADMIN_ROLES um etwa
 * 'support' greift hier automatisch.
 *
 * Das Array wird als `array[$1, $2, …]` aus einzeln gebundenen Werten zusammengesetzt.
 * Ein JS-Array direkt in die Template-Lücke zu geben scheitert: postgres.js bindet es als
 * einzelnen Skalar, Postgres bekommt 'admin' statt '{admin}' und wirft
 * „malformed array literal".
 */
const ADMIN_ROLE_ARRAY = sql`array[${sql.join(ADMIN_ROLES.map((role) => sql`${role}`), sql`, `)}]::text[]`;

const NOT_ADMIN = or(
  isNull(user.role),
  sql`not (string_to_array(replace(${user.role}, ' ', ''), ',') && ${ADMIN_ROLE_ARRAY})`,
);

// Whitelist statt dynamischem Spaltennamen: Der Query-Parameter darf nie in die
// SQL-Struktur durchschlagen. Die beiden Aggregate werden über ihren Ausgabe-Alias
// referenziert (Postgres-Feature, gleicher Kniff wie in ClientsService.list) – sonst
// müssten die Ausdrücke hier wortgleich wiederholt werden.
const SORT_COLUMNS = {
  registeredAt: user.createdAt,
  name:         user.name,
  email:        user.email,
  sessionCount: sql`"sessionCount"`,
  clientCount:  sql`"clientCount"`,
} as const;

type CoachRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  banned: boolean | null;
  banExpires: Date | null;
  registeredAt: Date;
  organizationId: string;
  organizationName: string;
  subdomain: string | null;
  clientCount: number;
  sessionCount: number;
};

function toCoachListItem(row: CoachRow, now: Date): CoachListItem {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    registeredAt: row.registeredAt.toISOString(),
    status: deriveCoachStatus(row, now),
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    subdomain: row.subdomain,
    clientCount: row.clientCount,
    sessionCount: row.sessionCount,
  };
}

@Injectable()
export class AdminCoachesService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDb) {}

  /**
   * Coach-Liste des Betreibers (Funktion 01, doc/funktionen/backoffice-betreiber.md).
   *
   * Nicht über das better-auth admin-Plugin: `listUsers` kennt nur die user-Tabelle,
   * hier werden aber Subdomain und die Kennzahlen aus clients/bookings mitgeliefert.
   *
   * Ohne Pagination – bei erwarteten <100 Coachs wäre ein Offset-Envelope spekulativ.
   * `limit` ist reine Sicherheitsklammer.
   */
  async list(query: ListCoachesQuery): Promise<CoachListItem[]> {
    const now = new Date();

    // Zwei getrennt vorgruppierte Subqueries statt zweier direkter LEFT JOINs: clients und
    // bookings hängen beide an derselben organizationId, ein gemeinsamer Join erzeugte
    // deshalb ein Kreuzprodukt (C×B Zeilen je Organisation) und count() lieferte C·B statt
    // C. Mit `distinct` wäre das Ergebnis zwar richtig, die Zwischenzeilen entstünden aber
    // trotzdem. So wird jede Kind-Tabelle genau einmal aggregiert.
    const clientCounts = this.db
      .select({
        organizationId: clients.organizationId,
        clientCount:    count().as('client_count'),
      })
      .from(clients)
      .groupBy(clients.organizationId)
      .as('client_counts');

    const sessionCounts = this.db
      .select({
        organizationId: bookings.organizationId,
        sessionCount:   count().as('session_count'),
      })
      .from(bookings)
      // Gehalten heißt: bestätigt/abgeschlossen UND in der Vergangenheit – gleiche
      // Semantik wie in der Klientenliste des Coachs.
      .where(and(inArray(bookings.status, [...HELD_SESSION_STATUSES]), lt(bookings.startTime, now)))
      .groupBy(bookings.organizationId)
      .as('session_counts');

    const rows = await this.db
      .select({
        id:               user.id,
        name:             user.name,
        email:            user.email,
        emailVerified:    user.emailVerified,
        banned:           user.banned,
        banExpires:       user.banExpires,
        registeredAt:     user.createdAt,
        organizationId:   organization.id,
        organizationName: organization.name,
        subdomain:        organization.slug,
        // coalesce, weil der LEFT JOIN für Coachs ohne Klienten/Sitzungen NULL liefert.
        // .mapWith(Number): count() kommt aus Postgres als bigint-String zurück.
        clientCount:  sql<number>`coalesce(${clientCounts.clientCount}, 0)`.mapWith(Number).as('clientCount'),
        sessionCount: sql<number>`coalesce(${sessionCounts.sessionCount}, 0)`.mapWith(Number).as('sessionCount'),
      })
      .from(user)
      // Der eigentliche Coach-Filter: Ein Betreiber ist Mitglied keiner Organisation, der
      // INNER JOIN schließt ihn schon strukturell aus. Angenommen wird genau eine
      // Owner-Mitgliedschaft pro User – der user.create-Hook legt genau eine an (gleiche
      // Annahme wie OrganizationService.findOwnerContact). Bewusst kein DISTINCT ON: das
      // erzwänge user.id als erstes Sortierkriterium und machte die Sortierung unbrauchbar.
      .innerJoin(member, and(eq(member.userId, user.id), eq(member.role, 'owner')))
      .innerJoin(organization, eq(organization.id, member.organizationId))
      .leftJoin(clientCounts, eq(clientCounts.organizationId, organization.id))
      .leftJoin(sessionCounts, eq(sessionCounts.organizationId, organization.id))
      // NOT_ADMIN ist die zweite Verteidigungslinie: Bekommt ein bestehender Coach
      // nachträglich die Admin-Rolle, bleibt seine member-Zeile bestehen.
      .where(and(NOT_ADMIN, ...buildFilters(query)))
      // user.id als zweites Kriterium: Ohne stabilen Tiebreaker tauschen Coachs mit
      // gleichem Wert (etwa zwei am selben Tag registrierte) zwischen zwei Aufrufen die
      // Plätze – die Liste flackerte beim Neuladen.
      .orderBy(orderExpression(query), asc(user.id))
      .limit(query.limit);

    const items = rows.map((row) => toCoachListItem(row, now));

    // Der Statusfilter läuft bewusst hier und nicht als SQL-CASE: Sonst existierte die
    // Statusregel zweimal und liefe bei der nächsten Änderung auseinander.
    // deriveCoachStatus bleibt die einzige Definition. Dass `limit` davor greift, ist bei
    // der erwarteten Größenordnung unerheblich.
    return query.status ? items.filter((coach) => coach.status === query.status) : items;
  }
}

function buildFilters(query: ListCoachesQuery): SQL[] {
  const filters: SQL[] = [];

  if (query.q) {
    // Escaping, damit ein getipptes % nicht als Platzhalter wirkt und scheinbar
    // wahllose Treffer liefert.
    const pattern = `%${escapeLikePattern(query.q)}%`;
    filters.push(
      or(
        ilike(user.name, pattern),
        ilike(user.email, pattern),
        ilike(organization.slug, pattern),
      )!,
    );
  }

  if (query.registeredFrom) filters.push(gte(user.createdAt, new Date(query.registeredFrom)));
  if (query.registeredTo) filters.push(lte(user.createdAt, new Date(query.registeredTo)));

  return filters;
}

function orderExpression(query: ListCoachesQuery) {
  const column = SORT_COLUMNS[query.sort];
  return query.order === 'asc' ? asc(column) : desc(column);
}
